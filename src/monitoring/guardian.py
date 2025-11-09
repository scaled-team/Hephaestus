"""Guardian monitoring system with trajectory thinking for individual agents."""

import asyncio
import logging
import json
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from enum import Enum

from src.core.database import DatabaseManager, Agent, Task, AgentLog
from src.agents.manager import AgentManager
from src.interfaces import LLMProviderInterface

logger = logging.getLogger(__name__)


class SteeringType(Enum):
    """Types of steering interventions."""
    STUCK = "stuck"
    DRIFTING = "drifting"
    VIOLATING_CONSTRAINTS = "violating_constraints"
    OVER_ENGINEERING = "over_engineering"
    CONFUSED = "confused"
    OFF_TRACK = "off_track"


class TrajectoryPhase(Enum):
    """Agent work phases."""
    EXPLORATION = "exploration"
    INFORMATION_GATHERING = "information_gathering"
    PLANNING = "planning"
    IMPLEMENTATION = "implementation"
    VERIFICATION = "verification"
    EXPLANATION = "explanation"
    COMPLETED = "completed"


class Guardian:
    """
    Guardian system that monitors individual agents using trajectory thinking.

    This replaces the old nudge system with intelligent monitoring that:
    - Builds accumulated context from entire agent session
    - Tracks persistent constraints and goals
    - Detects trajectory drift and violations
    - Provides targeted steering interventions
    """

    def __init__(
        self,
        db_manager: DatabaseManager,
        agent_manager: AgentManager,
        llm_provider: LLMProviderInterface,
    ):
        """Initialize Guardian.

        Args:
            db_manager: Database manager
            agent_manager: Agent manager for tmux operations
            llm_provider: LLM provider for trajectory analysis
        """
        self.db_manager = db_manager
        self.agent_manager = agent_manager
        self.llm_provider = llm_provider

        # Cache for agent trajectories to avoid recomputing
        self.trajectory_cache: Dict[str, Dict[str, Any]] = {}

        # Track steering history to avoid over-messaging
        self.steering_history: Dict[str, List[Dict[str, Any]]] = {}

    async def analyze_agent_with_trajectory(
        self,
        agent: Agent,
        tmux_output: str,
        past_summaries: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Analyze agent using GPT-5 with trajectory thinking.

        This method calls GPT-5 to apply trajectory thinking and understand:
        - Where the agent is in its overall journey
        - What constraints and goals persist
        - Whether the agent is on track
        - If steering intervention is needed

        Args:
            agent: Agent to analyze
            tmux_output: Current tmux output (last N lines)
            past_summaries: Previous Guardian summaries for this agent

        Returns:
            GPT-5 analysis with trajectory-aware summary and steering decision
        """
        logger.info(f"Guardian GPT-5 analyzing agent {agent.id} with trajectory thinking")

        try:
            # Build accumulated context from entire session
            accumulated_context = await self._build_accumulated_context(
                agent, past_summaries
            )

            # Get task details for context
            task = await self._get_agent_task(agent)
            if not task:
                logger.error(f"No task found for agent {agent.id}")
                return self._get_default_analysis(agent)

            # Get Phase context if task has a phase
            phase_info = None
            if task.phase_id and task.workflow_id:
                phase_info = await self._get_phase_context(task.phase_id, task.workflow_id)
                if phase_info:
                    logger.info(f"📋 Loaded Phase context: {phase_info['workflow_context']['current_position']} - {phase_info['phase_name']}")

            # Call GPT-5 to analyze trajectory
            # This is the CORE - GPT-5 does the trajectory thinking, not static checks

            # Extract last message marker from most recent summary
            last_message_marker = None
            if past_summaries:
                # Get the most recent summary's marker
                last_message_marker = past_summaries[-1].get('last_claude_message_marker')

            # Log summary of what we're sending to GPT-5
            logger.info("=" * 60)
            logger.info(f"🤖 GUARDIAN GPT-5 ANALYSIS for agent {agent.id}")
            logger.info("=" * 60)
            logger.info(f"Overall Goal: {accumulated_context.get('overall_goal', 'Unknown')[:100]}...")
            logger.info(f"Past Summaries Count: {len(past_summaries)}")
            logger.info(f"Last Message Marker: {last_message_marker or 'None (first analysis)'}")
            logger.info(f"Task ID: {task.id}")
            logger.info(f"Phase Info: {'Present' if phase_info else 'None'}")
            logger.info("=" * 60)

            analysis = await self.llm_provider.analyze_agent_trajectory(
                agent_output=tmux_output,
                accumulated_context=accumulated_context,
                past_summaries=past_summaries,
                task_info={
                    "description": task.enriched_description or task.raw_description,
                    "done_definition": task.done_definition,
                    "task_id": task.id,
                    "agent_id": agent.id,
                    "phase_info": phase_info,  # NEW: Pass phase information
                },
                last_message_marker=last_message_marker,
            )

            # Log what we got back from GPT-5
            logger.info("=" * 60)
            logger.info(f"✅ GUARDIAN GPT-5 RESPONSE for agent {agent.id}")
            logger.info("=" * 60)
            logger.info(f"Full Response: {analysis}")
            logger.info("=" * 60)

            # GPT-5 returns the complete trajectory analysis
            # Extract and enhance the results
            result = {
                "agent_id": agent.id,
                "agent_type": agent.agent_type,  # Include agent type for Conductor
                "trajectory_summary": analysis.get("trajectory_summary", "No summary"),  # Use consistent key name
                "current_phase": analysis.get("current_phase", "unknown"),
                "trajectory_aligned": analysis.get("trajectory_aligned", True),
                "alignment_score": analysis.get("alignment_score", 0.5),
                "alignment_issues": analysis.get("alignment_issues", []),
                "needs_steering": analysis.get("needs_steering", False),
                "steering_type": analysis.get("steering_type"),
                "steering_message": analysis.get("steering_recommendation"),  # Map from LLM response key
                "accumulated_goal": accumulated_context["overall_goal"],
                "active_constraints": accumulated_context["constraints"],
                # Remove progress_percentage as requested
            }

            # Post-process: Ensure needs_steering is set appropriately
            # If LLM didn't set it but we have clear indicators, set it
            if not result["needs_steering"]:
                # Check for misalignment with low score
                if not result["trajectory_aligned"] and result["alignment_score"] < 0.5:
                    result["needs_steering"] = True
                    result["steering_type"] = result.get("steering_type") or "misaligned"

                    # Generate steering message if LLM didn't provide one
                    if not result["steering_message"]:
                        issues = result["alignment_issues"]
                        if issues:
                            issue_list = '\n'.join(f"  - {issue}" for issue in issues[:3])
                            result["steering_message"] = (
                                f"Your trajectory is misaligned (score: {result['alignment_score']:.2f}). "
                                f"Please address these issues:\n{issue_list}\n\n"
                                f"Review the task requirements and adjust your approach."
                            )
                        else:
                            result["steering_message"] = (
                                f"Your trajectory is misaligned (score: {result['alignment_score']:.2f}). "
                                f"Please review the task requirements and ensure you're on track."
                            )

                    logger.info(f"[GUARDIAN POST-PROCESS] Setting needs_steering=True for agent {agent.id[:8]}... (misaligned, score={result['alignment_score']:.2f})")

                # Check for idle phase with significant alignment issues
                elif result["current_phase"] == "idle" and len(result["alignment_issues"]) > 0:
                    result["needs_steering"] = True
                    result["steering_type"] = result.get("steering_type") or "idle"

                    if not result["steering_message"]:
                        result["steering_message"] = (
                            f"You appear to be idle. Please start working on the task. "
                            f"Begin by reading the ticket using get_ticket and reviewing the requirements."
                        )

                    logger.info(f"[GUARDIAN POST-PROCESS] Setting needs_steering=True for agent {agent.id[:8]}... (idle with issues)")

            # Cache for Conductor
            self.trajectory_cache[agent.id] = {
                "analysis": result,
                "accumulated_context": accumulated_context,
                "timestamp": datetime.utcnow(),
            }

            # Log the GPT-5 analysis
            logger.info(
                f"GPT-5 Guardian analysis for {agent.id}: "
                f"phase={result['current_phase']}, "
                f"aligned={result['trajectory_aligned']}, "
                f"needs_steering={result['needs_steering']}"
            )

            return result

        except Exception as e:
            logger.error(f"GPT-5 Guardian analysis failed for agent {agent.id}: {e}")
            return self._get_default_analysis(agent)

    async def _build_accumulated_context(
        self,
        agent: Agent,
        past_summaries: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Build accumulated context from entire agent session.

        This implements the core trajectory thinking concept:
        - Extract overall goals from entire conversation
        - Track constraints that persist until lifted
        - Resolve references like "this/that"
        - Understand the complete journey
        """
        logger.debug(f"Building accumulated context for agent {agent.id}")

        # Get all agent logs to understand full conversation
        session = self.db_manager.get_session()
        try:
            logs = session.query(AgentLog).filter_by(
                agent_id=agent.id
            ).order_by(AgentLog.created_at).all()

            # Extract conversation history
            conversation_history = []
            for log in logs:
                if log.log_type in ["input", "output", "message"]:
                    conversation_history.append({
                        "type": log.log_type,
                        "content": log.message,
                        "timestamp": log.created_at,
                    })

            # Get task for initial context
            task = session.query(Task).filter_by(id=agent.current_task_id).first()

            # Build accumulated context
            context = {
                "overall_goal": task.enriched_description if task else "Unknown",
                "done_definition": task.done_definition if task else "Unknown",
                "constraints": [],
                "lifted_constraints": [],
                "references": {},  # Resolved "this/that" references
                "standing_instructions": [],
                "conversation_length": len(conversation_history),
                "session_start": logs[0].created_at if logs else datetime.utcnow(),
            }

            # Extract constraints and goals from summaries
            for summary in past_summaries:
                if "constraints" in summary:
                    for constraint in summary["constraints"]:
                        if constraint not in context["lifted_constraints"]:
                            if constraint not in context["constraints"]:
                                context["constraints"].append(constraint)

                if "lifted_constraints" in summary:
                    for lifted in summary["lifted_constraints"]:
                        if lifted in context["constraints"]:
                            context["constraints"].remove(lifted)
                        context["lifted_constraints"].append(lifted)

                # Update goal if it evolved
                if "evolved_goal" in summary:
                    context["overall_goal"] = summary["evolved_goal"]

            return context

        finally:
            session.close()

    async def steer_agent(
        self,
        agent: Agent,
        steering_type: str,
        message: str,
        guardian_analysis_id: Optional[int] = None,
        max_retries: int = 2,
    ):
        """
        Send steering message to agent with delivery verification and retry logic.

        Messages are targeted and helpful, not generic nudges.

        Checks for queued messages to avoid spamming agent with unread messages.
        Also checks cooldown to avoid over-messaging.

        Uses the /api/send_message endpoint for cross-container communication
        instead of direct tmux access.

        Args:
            agent: Agent to send message to
            steering_type: Type of steering (nudge, direct, urgent)
            message: Message content
            guardian_analysis_id: Optional ID of guardian analysis that triggered this
            max_retries: Maximum number of retry attempts if delivery fails (default: 2)
        """
        logger.info(f"[GUARDIAN STEER] Agent {agent.id[:8]}... - Type: {steering_type}")

        # Check cooldown - don't steer too frequently
        if not self._should_steer_agent(agent.id):
            logger.info(
                f"[GUARDIAN STEER] ⏱️  Skipping steering for agent {agent.id[:8]}... - "
                f"cooldown active (max 1 steering per 1 minute). "
                f"Type: {steering_type}, Message preview: {message[:100]}..."
            )
            return

        # Check if there's already a queued message (not yet read by Claude)
        tmux_output = self.agent_manager.get_agent_output(agent.id, lines=50)
        if "Press up to edit queued messages" in tmux_output:
            logger.info(
                f"[GUARDIAN STEER] 💬 Discarding steering message for agent {agent.id[:8]}... - "
                f"previous message still queued (not yet read by Claude). "
                f"Type: {steering_type}, Message preview: {message[:100]}..."
            )
            # Record that we attempted to steer but held back
            self._record_steering(
                agent.id,
                f"{steering_type}_DISCARDED",
                f"Message held (queued message detected): {message[:200]}..."
            )
            return

        # Format message with Guardian identifier
        formatted_message = f"\n[GUARDIAN GUIDANCE - {steering_type.upper()}]: {message}\n"

        # Try sending with retries
        delivery_verified = False
        last_error = None

        for attempt in range(max_retries + 1):
            try:
                import httpx
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "http://hephaestus-server:8000/api/send_message",
                        json={
                            "recipient_agent_id": agent.id,
                            "message": formatted_message,
                        },
                        headers={
                            "X-Agent-ID": "guardian-monitor",  # Identify as Guardian
                        },
                        timeout=10.0,
                    )

                    if response.status_code == 200:
                        result = response.json()
                        if result.get("success"):
                            # Verify delivery by checking tmux output
                            import asyncio
                            await asyncio.sleep(2)  # Wait for message to appear

                            output = self.agent_manager.get_agent_output(agent.id, lines=100)
                            if "[GUARDIAN GUIDANCE" in output and steering_type.upper() in output:
                                delivery_verified = True
                                logger.info(
                                    f"[GUARDIAN STEER] ✅ Verified message delivery to agent {agent.id[:8]}... "
                                    f"(attempt {attempt + 1}/{max_retries + 1}) - "
                                    f"Type: {steering_type}, Message: {message[:150]}..."
                                )
                                break
                            else:
                                last_error = "Message not found in agent output"
                                logger.warning(
                                    f"[GUARDIAN STEER] ⚠️  Message sent but NOT verified in output "
                                    f"for agent {agent.id[:8]}... (attempt {attempt + 1}/{max_retries + 1})"
                                )
                        else:
                            last_error = f"API returned success=False: {result.get('message')}"
                            logger.warning(
                                f"[GUARDIAN STEER] ⚠️  Failed to send message to agent {agent.id[:8]}... - "
                                f"{last_error} (attempt {attempt + 1}/{max_retries + 1})"
                            )
                    else:
                        last_error = f"HTTP {response.status_code}: {response.text[:200]}"
                        logger.error(
                            f"[GUARDIAN STEER] ❌ Failed to send message to agent {agent.id[:8]}... - "
                            f"{last_error} (attempt {attempt + 1}/{max_retries + 1})"
                        )

            except Exception as e:
                last_error = str(e)
                logger.error(
                    f"[GUARDIAN STEER] ❌ Exception sending message to agent {agent.id[:8]}... - "
                    f"Error: {e} (attempt {attempt + 1}/{max_retries + 1})"
                )

            # If not verified and we have retries left, wait before retry
            if not delivery_verified and attempt < max_retries:
                import asyncio
                await asyncio.sleep(1)  # Brief delay before retry

        # If all retries failed, log final failure
        if not delivery_verified:
            logger.error(
                f"[GUARDIAN STEER] ❌ Failed to verify message delivery to agent {agent.id[:8]}... "
                f"after {max_retries + 1} attempts. Last error: {last_error}"
            )

        # Log the steering attempt
        self._record_steering(agent.id, steering_type, message)

        # Save to database
        session = self.db_manager.get_session()
        try:
            # Save AgentLog for detailed tracking
            log_entry = AgentLog(
                agent_id=agent.id,
                log_type="steering",
                message=f"Guardian steering: {steering_type}",
                details={
                    "type": steering_type,
                    "message": message,
                    "timestamp": datetime.utcnow().isoformat(),
                    "delivery_verified": delivery_verified,
                    "last_error": last_error if not delivery_verified else None,
                }
            )
            session.add(log_entry)

            # Save SteeringIntervention for frontend display
            steering_intervention = SteeringIntervention(
                agent_id=agent.id,
                guardian_analysis_id=guardian_analysis_id,
                steering_type=steering_type,
                message=message,
                timestamp=datetime.utcnow(),
                was_successful=delivery_verified,  # Now based on actual verification
            )
            session.add(steering_intervention)

            session.commit()

            if delivery_verified:
                logger.info(
                    f"[GUARDIAN STEER] ✅ Steering message verified and saved for agent {agent.id[:8]}... - "
                    f"Type: {steering_type}"
                )
            else:
                logger.warning(
                    f"[GUARDIAN STEER] ⚠️  Steering message failed verification for agent {agent.id[:8]}... - "
                    f"Type: {steering_type}, Error: {last_error}"
                )
        except Exception as e:
            logger.error(
                f"[GUARDIAN STEER] ❌ Failed to save steering record for agent {agent.id[:8]}... - "
                f"Error: {e}"
            )
        finally:
            session.close()

    async def nudge_agent_with_phase_guidance(
        self,
        agent: Agent,
        task: Optional[Task],
        phase_info: Optional[Dict[str, Any]],
        time_elapsed_minutes: int,
        alignment_score: float,
        alignment_issues: List[str],
    ) -> Optional[str]:
        """
        Provide intelligent, phase-aware nudging to keep agent on track.

        This method:
        1. Analyzes agent's current phase and position
        2. Identifies specific next steps they should take
        3. Provides targeted guidance based on alignment issues
        4. Escalates intervention based on time elapsed

        Args:
            agent: Agent to nudge
            task: Agent's current task
            phase_info: Phase context information
            time_elapsed_minutes: Minutes since task started
            alignment_score: Agent's alignment score (0-1)
            alignment_issues: List of identified misalignment issues

        Returns:
            Nudge message if intervention needed, None otherwise
        """
        if not task or not phase_info:
            logger.debug(f"[GUARDIAN] Skipping nudge for agent {agent.id}: missing context")
            return None

        # Determine intervention level based on time and alignment
        intervention_level = self._determine_intervention_level(
            time_elapsed_minutes, alignment_score, alignment_issues
        )

        if intervention_level == "none":
            logger.debug(f"[GUARDIAN] Agent {agent.id}: No intervention needed (aligned, recent)")
            return None

        # Build phase-aware guidance
        phase_name = phase_info.get("phase_name", "Unknown Phase")
        phase_description = phase_info.get("phase_description", "")
        done_definitions = phase_info.get("done_definitions", [])
        additional_notes = phase_info.get("additional_notes", "")

        # Extract specific step guidance from phase notes
        step_guidance = self._extract_step_guidance(
            additional_notes, agent.current_task_id or ""
        )

        # Build targeted message based on intervention level and issues
        message = self._build_nudge_message(
            agent=agent,
            phase_name=phase_name,
            intervention_level=intervention_level,
            alignment_issues=alignment_issues,
            step_guidance=step_guidance,
            done_definitions=done_definitions,
            time_elapsed_minutes=time_elapsed_minutes,
        )

        # Log the nudge attempt
        logger.info(
            f"[GUARDIAN NUDGE] Agent {agent.id[:8]}... ({phase_name}) "
            f"Level={intervention_level}, Score={alignment_score:.2f}, "
            f"Time={time_elapsed_minutes}min, Issues={len(alignment_issues)}"
        )

        # Record steering for history
        self._record_steering(agent.id, f"nudge_{intervention_level}", message[:100])

        return message

    def _determine_intervention_level(
        self,
        time_elapsed_minutes: int,
        alignment_score: float,
        alignment_issues: List[str],
    ) -> str:
        """
        Determine escalating intervention level.

        Levels:
        - "none": No intervention needed
        - "gentle": Gentle reminder of what to do next
        - "direct": Direct guidance on specific issues
        - "urgent": Agent appears stuck or severely misaligned

        Args:
            time_elapsed_minutes: Minutes since task started
            alignment_score: Agent's alignment score (0-1)
            alignment_issues: List of identified issues

        Returns:
            Intervention level string
        """
        # Severely misaligned always needs intervention
        if alignment_score < 0.3:
            return "urgent"

        # Long-running with issues needs escalation
        if time_elapsed_minutes > 120 and alignment_issues:  # >2 hours
            return "urgent"

        # Moderate issues and some time elapsed
        if time_elapsed_minutes > 60 and alignment_issues:  # >1 hour
            return "direct"

        # Recent work with minor issues
        if time_elapsed_minutes > 20 and alignment_issues:  # >20 min
            return "gentle"

        # Well-aligned and recent - no intervention
        if alignment_score > 0.75 and time_elapsed_minutes < 30:
            return "none"

        # Default: gentle if any issues
        if alignment_issues:
            return "gentle"

        return "none"

    def _extract_step_guidance(self, phase_notes: str, task_id: str) -> Optional[str]:
        """
        Extract specific step guidance from phase additional_notes.

        Looks for STEP definitions in the notes and returns the current
        or next step that agent should be working on.

        Args:
            phase_notes: Phase's additional_notes field
            task_id: Task ID for context

        Returns:
            Specific step guidance or None
        """
        if not phase_notes:
            return None

        # Extract STEP definitions from phase notes
        # Format: "STEP 1: ...", "STEP 2: ...", etc.
        import re

        steps = re.findall(r"^(STEP \d+[^:]*:.*?)(?=^STEP|\Z)", phase_notes, re.MULTILINE | re.DOTALL)

        if steps:
            # Return first 2 steps as guidance
            return "\n\n".join(steps[:2])[:500]

        return None

    def _build_nudge_message(
        self,
        agent: Agent,
        phase_name: str,
        intervention_level: str,
        alignment_issues: List[str],
        step_guidance: Optional[str],
        done_definitions: List[str],
        time_elapsed_minutes: int,
    ) -> str:
        """
        Build targeted nudge message for agent.

        Message structure:
        1. Context (what phase, how long)
        2. Current issues (if any)
        3. Specific next steps (from phase guidance)
        4. Encouragement

        Args:
            agent: Agent being nudged
            phase_name: Name of current phase
            intervention_level: gentle/direct/urgent
            alignment_issues: List of issues identified
            step_guidance: Specific step guidance from phase
            done_definitions: Phase done definitions
            time_elapsed_minutes: Time elapsed since start

        Returns:
            Formatted nudge message
        """
        lines = []

        # Header
        if intervention_level == "urgent":
            lines.append(
                f"🚨 **Guardian Urgent Intervention** - {phase_name} Phase"
            )
            lines.append(
                f"You've been working on this task for {time_elapsed_minutes} minutes. "
                f"Let's get you back on track!"
            )
        elif intervention_level == "direct":
            lines.append(
                f"⚡ **Guardian Guidance** - {phase_name} Phase"
            )
            lines.append(
                f"You've been working for {time_elapsed_minutes} minutes. Here's how to proceed:"
            )
        else:  # gentle
            lines.append(
                f"💡 **Guardian Tip** - {phase_name} Phase"
            )
            lines.append("Here's what you should focus on next:")

        lines.append("")

        # Issues section
        if alignment_issues:
            lines.append("**Current Issues Detected:**")
            for i, issue in enumerate(alignment_issues[:3], 1):
                lines.append(f"{i}. {issue}")
            lines.append("")

        actionable_playbook = self._build_alignment_playbook(alignment_issues)
        if actionable_playbook:
            lines.append("**Immediate Fixes:**")
            for action in actionable_playbook[:4]:
                lines.append(f"- {action}")
            lines.append("")

        # Specific guidance
        if step_guidance:
            lines.append("**Your Next Steps (from phase guide):**")
            lines.append(step_guidance)
            lines.append("")
        elif done_definitions:
            lines.append("**What You're Working Toward:**")
            for i, definition in enumerate(done_definitions[:3], 1):
                lines.append(f"- {definition}")
            lines.append("")

        # Encouragement
        if intervention_level == "urgent":
            lines.append(
                "🎯 Focus on ONE specific thing: Read the phase instructions, "
                "understand the current step, then execute it. "
                "You've got this!"
            )
        else:
            lines.append(
                "You're making progress! Keep focused on the specific step, "
                "and don't hesitate to read the phase guidelines for clarity."
            )

        if time_elapsed_minutes >= 120:
            lines.append("")
            lines.append(
                "⏰ You've been on this ticket for more than two hours. "
                "Capture your current progress, run the required tests, and call `update_task_status` "
                "with status='done' (or 'failed' with blockers) so we can advance the Kanban board."
            )

        return "\n".join(lines)

    def _build_alignment_playbook(self, alignment_issues: List[str]) -> List[str]:
        """Translate common alignment issues into actionable guidance."""
        if not alignment_issues:
            return []

        normalized = [issue.lower() for issue in alignment_issues]
        actions: List[str] = []

        if any("ticket" in issue or "get_ticket" in issue for issue in normalized):
            actions.append("Use `get_ticket` right now and restate the ticket requirements before writing more code.")

        if any("test" in issue or "pytest" in issue or "no tests" in issue for issue in normalized):
            actions.append("Run the required test suite (e.g., `pytest -q`) and paste the results into your next turn.")

        if any("doc" in issue or "documentation" in issue or "phase 3" in issue for issue in normalized):
            actions.append("Complete the Phase 3 documentation deliverables before calling `update_task_status`.")

        if any("update_task_status" in issue or "status" in issue for issue in normalized):
            actions.append("Call `update_task_status` with a summary once you meet (or cannot meet) the done definition.")

        if any("typescript" in issue for issue in normalized):
            actions.append("Stop editing TypeScript files—stay within the Python/CLI scope defined by the ticket.")

        if any("schema" in issue or "database" in issue for issue in normalized):
            actions.append("Design the PostgreSQL schema first (ERD + models) before writing additional code.")

        if any("build" in issue or "killed" in issue for issue in normalized):
            actions.append("Inspect the failed build logs, resolve the error, and rerun the build so we can proceed.")

        return actions

    def _should_steer_agent(self, agent_id: str) -> bool:
        """Check if we should steer agent (avoid over-messaging)."""
        if agent_id not in self.steering_history:
            self.steering_history[agent_id] = []
            return True

        # Check recent steering
        recent_steerings = [
            s for s in self.steering_history[agent_id]
            if datetime.fromisoformat(s["timestamp"]) > datetime.utcnow() - timedelta(minutes=1)
        ]

        # Max 1 steering per 1 minute
        return len(recent_steerings) == 0

    def _record_steering(self, agent_id: str, steering_type: str, message: str):
        """Record steering in history."""
        if agent_id not in self.steering_history:
            self.steering_history[agent_id] = []

        self.steering_history[agent_id].append({
            "type": steering_type,
            "message": message,
            "timestamp": datetime.utcnow().isoformat(),
        })

        # Keep only last 10 steerings
        self.steering_history[agent_id] = self.steering_history[agent_id][-10:]

    def _extract_last_error(self, tmux_output: str) -> str:
        """Extract last error message from output."""
        lines = tmux_output.split('\n')
        for i in range(len(lines) - 1, -1, -1):
            if 'error' in lines[i].lower():
                # Get error and next 2 lines for context
                error_context = lines[i:min(i+3, len(lines))]
                return ' '.join(error_context)[:200]
        return "The error details are not clear from the output."

    async def _get_agent_task(self, agent: Agent) -> Optional[Task]:
        """Get task for agent."""
        session = self.db_manager.get_session()
        try:
            task = session.query(Task).filter_by(id=agent.current_task_id).first()
            return task
        finally:
            session.close()

    async def _get_phase_context(self, phase_id: str, workflow_id: str) -> Optional[Dict[str, Any]]:
        """Get phase context for Guardian analysis.

        Args:
            phase_id: Phase ID
            workflow_id: Workflow ID

        Returns:
            Phase context dictionary or None
        """
        session = self.db_manager.get_session()
        try:
            from src.core.database import Phase, Workflow

            # Get the phase
            phase = session.query(Phase).filter_by(id=phase_id).first()
            if not phase:
                return None

            # Get workflow for context
            workflow = session.query(Workflow).filter_by(id=workflow_id).first()

            # Get all phases in workflow for position context
            all_phases = session.query(Phase).filter_by(
                workflow_id=workflow_id
            ).order_by(Phase.order).all()

            return {
                "phase_id": phase.id,
                "phase_number": phase.order,
                "phase_name": phase.name,
                "phase_description": phase.description,
                "done_definitions": phase.done_definitions or [],
                "additional_notes": phase.additional_notes,
                "outputs": phase.outputs,
                "next_steps": phase.next_steps,
                "working_directory": phase.working_directory,
                "workflow_context": {
                    "workflow_id": workflow_id,
                    "workflow_name": workflow.name if workflow else "Unknown",
                    "total_phases": len(all_phases),
                    "current_position": f"Phase {phase.order} of {len(all_phases)}",
                    "all_phase_names": [p.name for p in all_phases],
                }
            }
        finally:
            session.close()

    def _get_default_analysis(self, agent: Agent) -> Dict[str, Any]:
        """Get default analysis when LLM analysis fails."""
        return {
            "agent_id": agent.id,
            "agent_type": agent.agent_type,  # Include agent type for Conductor
            "trajectory_summary": "LLM analysis unavailable - using default",  # Use consistent key name
            "current_phase": "unknown",
            "trajectory_aligned": True,
            "alignment_score": 0.5,
            "alignment_issues": [],
            "needs_steering": False,
            "steering_type": None,
            "steering_message": None,  # Keep consistent field name
            "accumulated_goal": "Unknown",
            "active_constraints": [],
        }

    def get_cached_trajectory(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Get cached trajectory for agent (used by Conductor)."""
        return self.trajectory_cache.get(agent_id)

    def clear_agent_cache(self, agent_id: str):
        """Clear cached data for agent."""
        if agent_id in self.trajectory_cache:
            del self.trajectory_cache[agent_id]
        if agent_id in self.steering_history:
            del self.steering_history[agent_id]
