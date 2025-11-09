"""Agent management system for Hephaestus."""

import uuid
import asyncio
import logging
import subprocess
import traceback
import time
import re
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
import libtmux

from src.core.database import DatabaseManager, Agent, Task, AgentLog, BoardConfig, AgentWorktree, get_db
from src.interfaces import get_cli_agent, LLMProviderInterface, CLIAgentInterface
from src.core.simple_config import get_config
from src.core.worktree_manager import WorktreeManager

logger = logging.getLogger(__name__)


class AgentManager:
    """Manages agent lifecycle and tmux sessions."""

    def __init__(self, db_manager: DatabaseManager, llm_provider: LLMProviderInterface, phase_manager=None):
        """Initialize agent manager.

        Args:
            db_manager: Database manager instance
            llm_provider: LLM provider for generating prompts
            phase_manager: Phase manager instance (optional)
        """
        self.db_manager = db_manager
        self.llm_provider = llm_provider
        self.phase_manager = phase_manager
        self.config = get_config()

        # Use shared tmux socket for cross-container access
        # This allows the monitor container to access agent sessions
        self.socket_path = Path(self.config.tmux_socket_path).expanduser()
        self._ensure_tmux_socket_directory()
        self.tmux_server = libtmux.Server(socket_path=str(self.socket_path))

        # Initialize worktree manager for agent isolation
        self.worktree_manager = WorktreeManager(db_manager)

        # ✅ OPTIMIZATION: Cache CLI agent interfaces to avoid re-instantiation
        # Each agent interface is stateless so can be safely reused per type
        self._cli_agent_cache = {}  # Maps cli_type -> cli_agent instance

    def _get_cached_cli_agent(self, cli_type: str):
        """Get a cached CLI agent interface, creating if needed.

        ✅ OPTIMIZATION: Reuse stateless CLI agent instances to avoid
        re-instantiation overhead on every message.

        Args:
            cli_type: Type of CLI agent (opencode, claude, etc.)

        Returns:
            CLI agent interface instance
        """
        if cli_type not in self._cli_agent_cache:
            self._cli_agent_cache[cli_type] = get_cli_agent(cli_type)
            logger.debug(f"Cached CLI agent: {cli_type}")
        return self._cli_agent_cache[cli_type]

    def _ensure_tmux_socket_directory(self) -> None:
        """Ensure the tmux socket directory exists before launching sessions."""
        try:
            socket_dir = self.socket_path.parent
            socket_dir.mkdir(parents=True, exist_ok=True)

            # Make directory world-writable so both server and monitor containers can access it
            import os
            import stat

            os.chmod(socket_dir, stat.S_IRWXU | stat.S_IRWXG | stat.S_IRWXO)
        except Exception as e:
            logger.warning(f"Failed to prepare tmux socket directory at {self.socket_path}: {e}")

    def _tmux_has_session(self, session_name: str) -> bool:
        """Check if tmux session exists using subprocess (bypasses libtmux bug).

        libtmux has a bug where it silently catches all exceptions in the sessions
        property, returning an empty list even when sessions exist. This method
        uses subprocess to directly call tmux and properly handle errors.

        Args:
            session_name: Name of the tmux session to check

        Returns:
            True if session exists, False otherwise
        """
        try:
            result = subprocess.run(
                ["tmux", "-S", str(self.socket_path), "has-session", "-t", session_name],
                capture_output=True,
                text=True,
                timeout=5
            )
            return result.returncode == 0
        except Exception as e:
            logger.warning(f"Error checking tmux session {session_name}: {e}")
            return False

    def _tmux_capture_pane(self, session_name: str, lines: Optional[int] = None) -> str:
        """Capture pane output from tmux session using subprocess.

        Args:
            session_name: Name of the tmux session
            lines: Number of lines to capture (None = all)

        Returns:
            Captured output as string
        """
        try:
            cmd = ["tmux", "-S", str(self.socket_path), "capture-pane", "-t", session_name, "-p"]
            if lines and lines > 0:
                cmd.extend(["-S", f"-{lines}"])

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=10
            )

            if result.returncode == 0:
                return result.stdout
            else:
                logger.warning(f"Failed to capture pane for {session_name}: {result.stderr}")
                return ""
        except Exception as e:
            logger.warning(f"Error capturing pane for {session_name}: {e}")
            return ""

    def has_tmux_session(self, session_name: Optional[str]) -> bool:
        """Public wrapper to safely check for tmux sessions using subprocess."""
        if not session_name:
            return False
        return self._tmux_has_session(session_name)

    def list_tmux_sessions(self) -> List[str]:
        """List tmux sessions via subprocess to avoid libtmux session cache issues."""
        try:
            result = subprocess.run(
                ["tmux", "-S", str(self.socket_path), "list-sessions", "-F", "#{session_name}"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode != 0:
                logger.warning(f"Failed to list tmux sessions: {result.stderr.strip()}")
                return []
            return [line.strip() for line in result.stdout.splitlines() if line.strip()]
        except Exception as e:
            logger.warning(f"Error listing tmux sessions: {e}")
            return []

    def kill_tmux_session(self, session_name: str) -> bool:
        """Kill a tmux session using subprocess (safe across containers)."""
        if not session_name:
            return False
        try:
            result = subprocess.run(
                ["tmux", "-S", str(self.socket_path), "kill-session", "-t", session_name],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode != 0:
                logger.warning(f"Failed to kill tmux session {session_name}: {result.stderr.strip()}")
                return False
            return True
        except Exception as e:
            logger.warning(f"Error killing tmux session {session_name}: {e}")
            return False

    def _paste_text_to_pane(self, pane: libtmux.Pane, text: str) -> bool:
        """Inject text into a tmux pane via buffer/paste to avoid slow key simulation."""
        if not text:
            return True

        pane_id = getattr(pane, "pane_id", None)
        if not pane_id:
            logger.warning("Cannot paste text: pane has no pane_id")
            return False

        buffer_name = f"hep_buf_{uuid.uuid4().hex[:8]}"
        try:
            load_cmd = ["tmux", "-S", str(self.socket_path), "load-buffer", "-b", buffer_name, "-"]
            subprocess.run(load_cmd, input=text, text=True, check=True)

            paste_cmd = ["tmux", "-S", str(self.socket_path), "paste-buffer", "-t", pane_id, "-b", buffer_name]
            subprocess.run(paste_cmd, check=True)

            delete_cmd = ["tmux", "-S", str(self.socket_path), "delete-buffer", "-b", buffer_name]
            subprocess.run(delete_cmd, check=True)

            logger.debug(f"Pasted {len(text)} characters into pane {pane_id} via tmux buffer")
            return True
        except Exception as e:
            logger.warning(f"Failed to paste text via tmux buffer: {e}")
            return False

    async def _deliver_message_to_cli(
        self,
        pane: libtmux.Pane,
        message: str,
        *,
        chunk_size: int = 2000,
        log_prefix: Optional[str] = None,
        submit: bool = True,
        submit_delay: float = 0.2,
    ) -> None:
        """Deliver a (potentially large) message to a CLI pane efficiently."""
        if not message:
            return

        label = log_prefix or "CLI message"
        if self._paste_text_to_pane(pane, message):
            logger.info(f"{label}: delivered via tmux paste-buffer ({len(message)} chars)")
        else:
            logger.warning(f"{label}: paste-buffer failed, falling back to chunked send_keys")
            for i in range(0, len(message), chunk_size):
                chunk = message[i:i + chunk_size]
                pane.send_keys(chunk, enter=False)
                await asyncio.sleep(0.05)

        if submit:
            await asyncio.sleep(submit_delay)
            pane.send_keys('', enter=True)

    async def _wait_for_cli_ready(
        self,
        cli_agent: CLIAgentInterface,
        session_name: str,
        *,
        timeout_seconds: Optional[int] = None,
        poll_interval: float = 2.0,
    ) -> bool:
        """Wait until the CLI displays its ready prompt (or timeout)."""
        timeout_seconds = timeout_seconds or getattr(self.config, "cli_ready_timeout_seconds", 60)
        poll_interval = max(poll_interval, 0.5)

        try:
            readiness_pattern = cli_agent.get_health_check_pattern()
        except Exception as exc:
            logger.warning(f"Could not get health check pattern: {exc}")
            readiness_pattern = None

        if not readiness_pattern:
            logger.info("No readiness pattern provided; using static wait")
            await asyncio.sleep(min(timeout_seconds, 5))
            return True

        deadline = time.monotonic() + timeout_seconds
        await asyncio.sleep(min(poll_interval, 1.0))

        while time.monotonic() < deadline:
            output = self._tmux_capture_pane(session_name, lines=400)
            if output and re.search(readiness_pattern, output, re.MULTILINE | re.IGNORECASE):
                logger.info(f"Detected CLI readiness for session {session_name}")
                return True
            await asyncio.sleep(poll_interval)

        logger.warning(f"Timed out waiting for CLI readiness in session {session_name}")
        return False

    async def create_agent_for_task(
        self,
        task: Task,
        enriched_data: Dict[str, Any],
        memories: List[Dict[str, Any]],
        project_context: str,
        cli_type: Optional[str] = None,
        working_directory: Optional[str] = None,
        agent_type: str = "phase",
        use_existing_worktree: bool = False,
        commit_sha: Optional[str] = None,
    ) -> Agent:
        """Create an agent for a specific task.

        Args:
            task: Task to assign to agent
            enriched_data: Enriched task data from LLM
            memories: Relevant memories from RAG
            project_context: Current project context
            cli_type: Type of CLI agent to use
            working_directory: Working directory for the agent
            agent_type: Type of agent (phase, validator, result_validator, monitor)
            use_existing_worktree: If True, use working_directory as-is without creating new worktree
            commit_sha: Specific commit to create worktree from (for validators)

        Returns:
            Created agent
        """
        agent_id = str(uuid.uuid4())
        cli_type = cli_type or self.config.default_cli_tool

        logger.info(f"Creating {cli_type} agent {agent_id} for task {task.id}")

        try:
            # 1. Handle worktree based on agent type
            if use_existing_worktree and working_directory:
                # For validators: use existing worktree (read-only access)
                worktree_path = working_directory
                logger.info(f"Using existing worktree for {agent_type} agent {agent_id} at {worktree_path}")
            elif commit_sha and agent_type in ["validator", "result_validator"]:
                # For validators with commit: create worktree from specific commit
                worktree_info = self.worktree_manager.create_agent_worktree(
                    agent_id=agent_id,
                    parent_agent_id=None,
                    base_commit_sha=commit_sha
                )
                worktree_path = worktree_info["working_directory"]
                logger.info(f"Created worktree from commit {commit_sha} for {agent_type} agent {agent_id} at {worktree_path}")
            else:
                # Normal agents: create new worktree with parent inheritance
                parent_agent_id = getattr(task, 'created_by_agent_id', None)
                logger.info(f"[AGENT_MANAGER] Creating worktree for normal agent")
                logger.info(f"[AGENT_MANAGER] Task ID: {task.id}")
                logger.info(f"[AGENT_MANAGER] Task created_by_agent_id: {parent_agent_id}")
                logger.info(f"[AGENT_MANAGER] Will create worktree with parent_agent_id={parent_agent_id}")

                worktree_info = self.worktree_manager.create_agent_worktree(
                    agent_id=agent_id,
                    parent_agent_id=parent_agent_id
                )
                worktree_path = worktree_info["working_directory"]
                logger.info(f"[AGENT_MANAGER] Created worktree for agent {agent_id} at {worktree_path}")

                # Merge main into the agent's branch to ensure it has latest changes
                logger.info(f"[AGENT_MANAGER] Merging main branch into agent's branch")
                try:
                    merge_result = self.worktree_manager.merge_main_into_branch(
                        agent_id=agent_id,
                        worktree_path=worktree_path,
                        branch_name=worktree_info["branch_name"]
                    )
                    logger.info(
                        f"[AGENT_MANAGER] Main merge completed: {merge_result['status']}, "
                        f"{merge_result['total_conflicts']} conflicts resolved"
                    )
                except Exception as e:
                    logger.error(f"[AGENT_MANAGER] Failed to merge main into agent branch: {e}")
                    # Continue anyway - agent will work from parent commit
                    # This shouldn't fail agent creation

            # 2. Generate system prompt
            system_prompt = await self.llm_provider.generate_agent_prompt(
                task={
                    "id": task.id,
                    "description": task.raw_description,
                    "enriched_description": task.enriched_description,
                    "done_definition": task.done_definition,
                    "agent_id": agent_id,
                },
                memories=memories,
                project_context=project_context,
            )

            # 3. Prepare environment variables for GLM if needed
            env_vars = None
            model = getattr(self.config, 'cli_model', 'sonnet')
            if 'GLM' in model.upper():
                import os
                token_env_var = getattr(self.config, 'glm_api_token_env', 'GLM_API_TOKEN')
                token = os.getenv(token_env_var)

                if token:
                    env_vars = {
                        'ANTHROPIC_BASE_URL': 'https://api.z.ai/api/anthropic',
                        'ANTHROPIC_AUTH_TOKEN': token,
                        'ANTHROPIC_DEFAULT_SONNET_MODEL': 'GLM-4.6',
                        'ANTHROPIC_DEFAULT_OPUS_MODEL': 'GLM-4.6',
                        'ANTHROPIC_DEFAULT_HAIKU_MODEL': 'GLM-4.6',
                    }
                    logger.info(f"Setting up GLM-4.6 environment variables for agent {agent_id}")
                else:
                    logger.warning(f"GLM model configured but {token_env_var} not found, using standard Claude")

            # 3.5. Set MCP_TOOL_TIMEOUT if workflow has human approval enabled
            # This only applies to Claude Code agents
            # NOTE: task.workflow_id might be None at creation time, so check active workflow or board configs
            if cli_type == 'claude':
                try:
                    # Try to get workflow_id from multiple sources
                    workflow_id = None

                    # Source 1: task.workflow_id (might be None at creation time)
                    if task.workflow_id:
                        workflow_id = task.workflow_id
                    # Source 2: active workflow from phase manager
                    elif hasattr(self, 'phase_manager') and self.phase_manager and hasattr(self.phase_manager, 'workflow_id'):
                        workflow_id = self.phase_manager.workflow_id
                    # Source 3: check if there's any active workflow with human review enabled
                    else:
                        with get_db() as db:
                            # Get first board config with human review enabled
                            board_config = db.query(BoardConfig).filter_by(ticket_human_review=True).first()
                            if board_config:
                                workflow_id = board_config.workflow_id

                    if workflow_id:
                        with get_db() as db:
                            board_config = db.query(BoardConfig).filter_by(workflow_id=workflow_id).first()

                            if board_config and board_config.ticket_human_review:
                                # Get timeout in seconds, default to 1800 (30 minutes)
                                timeout_seconds = board_config.approval_timeout_seconds or 1800
                                # Convert to milliseconds for Claude Code
                                timeout_ms = timeout_seconds * 1000

                                # Initialize env_vars if not already set
                                if env_vars is None:
                                    env_vars = {}

                                env_vars['MCP_TOOL_TIMEOUT'] = str(timeout_ms)
                                logger.info(
                                    f"Human approval enabled for workflow {workflow_id}: "
                                    f"Setting MCP_TOOL_TIMEOUT={timeout_ms}ms ({timeout_seconds}s)"
                                )
                except Exception as e:
                    logger.warning(f"Failed to check board config for MCP_TOOL_TIMEOUT: {e}")
                    # Don't fail agent creation if this check fails

            # 4. Create tmux session IN THE WORKTREE with env vars
            # Use agent_id for unique session names (not task_id which can be reused on restarts)
            session_name = f"{self.config.tmux_session_prefix}_{agent_id[:8]}"
            tmux_session = self._create_tmux_session(session_name, working_directory=worktree_path, env_vars=env_vars)

            # 5. Launch CLI agent
            cli_agent = get_cli_agent(cli_type)
            launch_command = cli_agent.get_launch_command(
                system_prompt=system_prompt,
                task_id=task.id,
                worktree_path=worktree_path,  # ✅ Pass worktree path so agent knows where to write
            )

            # Send launch command to tmux
            pane = tmux_session.attached_window.attached_pane

            # If using GLM, export env vars in the shell first
            if env_vars:
                logger.info(f"Exporting GLM environment variables in shell for agent {agent_id}")
                for key, value in env_vars.items():
                    pane.send_keys(f'export {key}="{value}"', enter=True)
                # Brief pause to ensure exports complete
                await asyncio.sleep(0.5)

            # Now send the claude launch command
            pane.send_keys(launch_command, enter=True)  # enter=True sends Enter key after command

            # 6. Register agent in database
            session = self.db_manager.get_session()
            try:
                if agent_type == "phase":
                    active_statuses = ("working", "pending", "assigned", "idle")
                    duplicate = session.query(Agent).filter(
                        Agent.current_task_id == task.id,
                        Agent.status.in_(active_statuses)
                    ).first()
                    if duplicate:
                        raise Exception(
                            f"Task {task.id[:8]} already has active agent {duplicate.id[:8]} "
                            f"(status={duplicate.status})"
                        )
            except:
                session.close()
                raise
            agent = Agent(
                id=agent_id,
                system_prompt=system_prompt,
                status="working",
                cli_type=cli_type,
                tmux_session_name=session_name,
                current_task_id=task.id,
                last_activity=datetime.utcnow(),
                health_check_failures=0,
                agent_type=agent_type,  # Set the agent type
            )
            session.add(agent)

            # Log agent creation
            log_entry = AgentLog(
                agent_id=agent_id,
                log_type="created",
                message=f"Agent created for task: {task.enriched_description[:100]}",
                details={"cli_type": cli_type, "task_id": task.id},
            )
            session.add(log_entry)

            session.commit()

            # Store the agent ID before closing session (to avoid detached instance issues)
            agent_id_to_return = agent.id

            session.close()

            # 7. Send initial task instructions with verification and retry
            logger.info(f"=== INITIAL PROMPT DELIVERY for agent {agent_id} ===")
            logger.info(f"CLI type: {cli_type}")
            logger.info(f"Tmux session: {session_name}")

            # Get the initial message with worktree path and cli_type
            initial_message = self._format_initial_message(task, agent_id, worktree_path, agent_type, enriched_data, cli_type)
            logger.info(f"Initial message length: {len(initial_message)} characters")

            # Save the full prompt to /tmp for debugging
            debug_prompt_path = f"/tmp/hephaestus_debug_prompt_{agent_id}.txt"
            with open(debug_prompt_path, 'w') as f:
                f.write(f"=== FULL INITIAL MESSAGE DEBUG ===\n")
                f.write(f"Agent ID: {agent_id}\n")
                f.write(f"Task ID: {task.id}\n")
                f.write(f"Message length: {len(initial_message)} characters\n")
                f.write(f"Timestamp: {datetime.utcnow()}\n")
                f.write(f"{'='*50}\n\n")
                f.write(initial_message)
            logger.info(f"🔍 DEBUG: Full initial message saved to: {debug_prompt_path}")

            ready_timeout = getattr(self.config, "cli_ready_timeout_seconds", 60)
            logger.info(
                f"Waiting up to {ready_timeout} seconds for {cli_type} agent {agent_id} "
                f"to reach its prompt..."
            )
            ready = await self._wait_for_cli_ready(
                cli_agent,
                session_name,
                timeout_seconds=ready_timeout,
                poll_interval=1.0,
            )
            if not ready:
                logger.warning(
                    f"{cli_type} agent {agent_id} did not confirm readiness within "
                    f"{ready_timeout}s; proceeding with prompt delivery anyway."
                )

            if not self.has_tmux_session(session_name):
                logger.error(f"Tmux session {session_name} died during initialization wait!")
                raise Exception("Tmux session died during initialization wait")

            # Send initial prompt (or just Enter for OpenCode)
            # ✅ FIX: Disable verification for all agents
            # OpenCode doesn't echo prompts to terminal (loads via -p flag)
            # Other agents may also have issues with verification

            await self._send_initial_prompt_with_retry(
                pane=pane,
                cli_agent=cli_agent,
                cli_type=cli_type,
                initial_message=initial_message,
                agent_id=agent_id,
                task_id=task.id,
                max_retries=3,
                verify_delivery=False  # ✅ DISABLED - verification causes false positives
            )

            logger.info(f"=== END INITIAL PROMPT DELIVERY for agent {agent_id} ===")

            # Return a simple object with just the ID to avoid session issues
            class AgentInfo:
                def __init__(self, id):
                    self.id = id

            return AgentInfo(agent_id_to_return)

        except Exception as e:
            # Log full error with traceback
            error_traceback = traceback.format_exc()
            logger.error(f"Failed to create agent for task {task.id}: {e}", exc_info=True)

            # Clean up on failure
            try:
                # Kill tmux session if it exists
                if 'tmux_session' in locals():
                    tmux_session.kill_session()
                    logger.info(f"Killed tmux session {session_name}")
            except Exception as cleanup_error:
                logger.error(f"Failed to kill tmux session during cleanup: {cleanup_error}")

            # Mark agent as terminated and task as failed in database
            try:
                cleanup_session = self.db_manager.get_session()
                try:
                    # Mark agent as terminated if it was created
                    if 'agent_id' in locals():
                        agent_record = cleanup_session.query(Agent).filter_by(id=agent_id).first()
                        if agent_record:
                            agent_record.status = "terminated"
                            logger.info(f"Marked agent {agent_id} as terminated")

                    # Mark task as failed with full error details
                    task_record = cleanup_session.query(Task).filter_by(id=task.id).first()
                    if task_record:
                        task_record.status = "failed"
                        task_record.failure_reason = f"Agent creation failed: {str(e)}"
                        # Store full traceback if task model supports it
                        if hasattr(task_record, 'error_details'):
                            task_record.error_details = error_traceback
                        task_record.completed_at = datetime.utcnow()
                        logger.info(f"Marked task {task.id} as failed with error: {str(e)}")

                    cleanup_session.commit()
                except Exception as db_error:
                    logger.error(f"Failed to update database during cleanup: {db_error}")
                    cleanup_session.rollback()
                finally:
                    cleanup_session.close()
            except Exception as session_error:
                logger.error(f"Failed to get database session during cleanup: {session_error}")

            raise

    def _create_tmux_session(self, session_name: str, working_directory: Optional[str] = None, env_vars: Optional[Dict[str, str]] = None) -> libtmux.Session:
        """Create a new tmux session.

        Args:
            session_name: Name for the tmux session
            working_directory: Working directory for the session (should be a worktree path)
            env_vars: Optional dictionary of environment variables to set on the session

        Returns:
            Created tmux session
        """
        # Ensure tmux socket path is ready on every session creation attempt
        self._ensure_tmux_socket_directory()

        # Ensure tmux server is running by checking for sessions
        # If no sessions exist, create a temporary one to start the server
        try:
            session_count = len(self.tmux_server.sessions)
            if session_count == 0:
                logger.info("No tmux sessions found - starting tmux server with keepalive session")
                # Create keepalive session to start the server
                self.tmux_server.new_session(
                    session_name="hephaestus_keepalive",
                    window_name="keepalive",
                    attach=False,
                    start_directory="/app"
                )
                # Send keepalive command
                keepalive = self.tmux_server.sessions[0]
                keepalive.attached_window.attached_pane.send_keys("tail -f /dev/null", enter=True)
                logger.info("Tmux server started with keepalive session")
        except Exception as e:
            logger.warning(f"Error checking/starting tmux server: {e}")
            # Continue anyway - tmux will auto-start on new_session

        # Check if session already exists
        if self.has_tmux_session(session_name):
            logger.warning(f"Session {session_name} already exists, killing it")
            if not self.kill_tmux_session(session_name):
                logger.warning(f"Failed to kill existing session {session_name}; continuing anyway")

        # Create new session with working directory (should be worktree path)
        session_kwargs = {
            "session_name": session_name,
            "window_name": "agent",
            "attach": False,
        }
        # Use provided working directory (which should be a worktree path)
        # Fallback to project root from config if not provided
        if not working_directory:
            working_directory = str(self.config.project_root)
            logger.warning(f"No working directory provided, using project root: {working_directory}")
        session_kwargs["start_directory"] = working_directory

        session = self.tmux_server.new_session(**session_kwargs)

        # Fix socket permissions for cross-container access
        # Make the socket readable/writable by all (needed for monitor in different container)
        import os
        import stat
        socket_path = self.tmux_server.socket_path
        if socket_path and os.path.exists(socket_path):
            try:
                # Set permissions to 666 (rw-rw-rw-)
                os.chmod(socket_path, stat.S_IRUSR | stat.S_IWUSR | stat.S_IRGRP | stat.S_IWGRP | stat.S_IROTH | stat.S_IWOTH)
                logger.debug(f"Set socket permissions for cross-container access: {socket_path}")
            except Exception as e:
                logger.warning(f"Failed to set socket permissions: {e}")

        # Note: env_vars are exported in the shell before launching the agent
        # (see create_agent_for_task and restart_agent methods)

        logger.debug(f"Created tmux session: {session_name}")
        return session

    def _format_initial_message(self, task: Task, agent_id: str, worktree_path: str = None, agent_type: str = "phase", enriched_data: dict = None, cli_type: str = "opencode") -> str:
        """Format the initial message to send to the agent.

        Args:
            task: Task to work on
            agent_id: Agent's ID
            worktree_path: Path to the agent's worktree
            agent_type: Type of agent (phase, validator, result_validator)
            enriched_data: Optional enriched task data with specialized prompts
            cli_type: Type of CLI tool being used (opencode, claude, etc.)

        Returns:
            Formatted initial message
        """
        logger.info(f"🔍 PROMPT SIZE DEBUG: Starting to format initial message for {agent_type} agent {agent_id}")

        # For validators and diagnostic agents, use specialized prompts from enriched_data
        if agent_type in ["result_validator", "validator", "diagnostic"]:
            logger.info(f"Using specialized prompt for {agent_type} agent {agent_id}")

            # The validation prompt should be passed in enriched_data by validator_agent.py
            if enriched_data and 'validation_prompt' in enriched_data:
                validation_prompt = enriched_data['validation_prompt']
                logger.info(f"Found validation prompt in enriched_data for agent {agent_id}")
                return validation_prompt
            else:
                logger.warning(f"No specialized prompt found in enriched_data for {agent_type} agent {agent_id}")
                # Fallback message
                if agent_type == "result_validator":
                    return "You are a result validator agent. Please check the task details for validation instructions."
                elif agent_type == "diagnostic":
                    return "You are a diagnostic agent. Please analyze the workflow state and create tasks to progress toward the goal."
                else:
                    return "You are a task validator agent. Please check the task details for validation instructions."

        # Use the actual worktree path for the agent
        cwd_info = f"Working Directory: {worktree_path}" if worktree_path else ""

        base_message = f"""
=== TASK ASSIGNMENT ===
🔑 Your Agent ID: {agent_id}
   ⚠️  CRITICAL: Use this EXACT ID when calling MCP tools (update_task_status, create_task, etc.)
   ⚠️  DO NOT use 'agent-mcp' or any other placeholder - it will fail authorization!

Task ID: {task.id}
{cwd_info}

🚨🚨🚨 CRITICAL REMINDER - READ THIS FIRST! 🚨🚨🚨
═══════════════════════════════════════════════════════════════════════
⚠️  WHEN YOU FINISH YOUR TASK, YOU **MUST** CALL update_task_status! ⚠️

WITHOUT THIS CALL, THE SYSTEM WILL NOT KNOW YOU ARE DONE!
YOU WILL BE STUCK RUNNING FOREVER!

**MANDATORY FINAL STEP:**
```python
mcp__hephaestus__update_task_status({{
    "task_id": "{task.id}",
    "agent_id": "{agent_id}",
    "status": "done",
    "summary": "Brief summary of what you accomplished"
}})
```

**DO NOT FORGET THIS STEP - IT IS NOT OPTIONAL!**
═══════════════════════════════════════════════════════════════════════
"""

        logger.info(f"🔍 PROMPT SIZE DEBUG: Base message length: {len(base_message)} chars")

        # Add phase information if available
        phase_context_section = ""
        if hasattr(task, 'phase_id') and task.phase_id:
            base_message += f"\nPhase ID: {task.phase_id}"
            logger.info(f"=== PHASE CONTEXT DEBUG for task {task.id} ===")
            logger.info(f"Task has phase_id: {task.phase_id}")

            # Try to get phase context if phase manager is available
            if hasattr(self, 'phase_manager') and self.phase_manager:
                logger.info(f"Phase manager exists: {self.phase_manager}")
                logger.info(f"Phase manager workflow_id: {getattr(self.phase_manager, 'workflow_id', 'NOT SET')}")
                logger.debug(f"Phase manager active_workflow: {getattr(self.phase_manager, 'active_workflow', 'NOT SET')}")

                try:
                    logger.info(f"Calling get_phase_context with phase_id: {task.phase_id}")
                    phase_ctx = self.phase_manager.get_phase_context(task.phase_id)
                    logger.debug(f"get_phase_context returned: {phase_ctx}")

                    if phase_ctx:
                        logger.info(f"Phase context found! Phase name: {phase_ctx.phase_definition.name}")
                        logger.info(f"Phase context all_phases count: {len(phase_ctx.all_phases)}")
                        phase_context_section = "\n" + phase_ctx.to_prompt_context()
                        logger.info(f"🔍 PROMPT SIZE DEBUG: Generated phase context section length: {len(phase_context_section)}")
                        logger.info(f"Phase context section preview: {phase_context_section[:200]}...")
                    else:
                        logger.warning(f"Phase context is None for phase_id: {task.phase_id}")

                except Exception as e:
                    logger.error(f"Exception getting phase context for phase_id {task.phase_id}: {e}")
                    import traceback
                    logger.error(f"Full traceback: {traceback.format_exc()}")
            else:
                logger.warning(f"Phase manager not available or is None: hasattr={hasattr(self, 'phase_manager')}, value={getattr(self, 'phase_manager', 'MISSING')}")

            logger.info(f"🔍 PROMPT SIZE DEBUG: Final phase_context_section length: {len(phase_context_section)}")
            logger.info(f"=== END PHASE CONTEXT DEBUG ===")
        else:
            logger.info(f"Task {task.id} has no phase_id: {getattr(task, 'phase_id', 'NO ATTRIBUTE')}")

        # For OpenCode agents, prepend explicit curl usage instructions to task description
        task_description = task.enriched_description or task.raw_description
        if cli_type == "opencode":
            task_description = f"""⚠️  IMPORTANT: This task requires interacting with the Hephaestus server.
You MUST use the HTTP REST API curl commands provided below (not file operations).

REQUIRED ACTIONS (use curl commands for all of these):
- To create tickets: Use the "Create a Ticket" curl command below
- To create sub-tasks: Use the "Create Sub-Tasks" curl command below
- To mark task as done: Use the "Mark Your Task as Done" curl command below
- To save discoveries: Use the "Save Learnings/Discoveries" curl command below

ORIGINAL TASK:
{task_description}"""

        base_message += f"""

TASK DESCRIPTION:
{task_description}

COMPLETION CRITERIA:
{task.done_definition}"""

        # Add workflow result criteria if available
        result_criteria_section = ""
        if hasattr(task, 'workflow_id') and task.workflow_id and self.phase_manager:
            try:
                workflow_config = self.phase_manager.get_workflow_config(task.workflow_id)
                if workflow_config and hasattr(workflow_config, 'result_criteria') and workflow_config.result_criteria:
                    result_criteria_section = f"""

**WORKFLOW-LEVEL GOAL** (Ultimate objective for all phases):
{workflow_config.result_criteria}

This is the final deliverable this entire workflow is working toward. All phases and tasks should contribute to achieving this goal.

NOTE: Having a workflow-level goal does NOT mean you skip update_task_status. You must still mark your individual task as done when you complete it. The workflow result submission is ONLY for when someone achieves the final goal."""
            except Exception as e:
                logger.warning(f"Could not get workflow result criteria: {e}")

        base_message += result_criteria_section

        base_message += f"""

IMPORTANT INSTRUCTIONS:
1. Complete all the requirements listed in the COMPLETION CRITERIA above

2. 🚫 NEVER RUN DEV SERVERS OR LONG-RUNNING PROCESSES! 🚫
   - ❌ DO NOT run `npm run dev`, `npm start`, `python manage.py runserver`, or any dev server
   - ❌ DO NOT run any long-running processes that block your terminal
   - ❌ DO NOT start servers to "verify they work" - this will HANG your agent!
   - ✅ DO verify builds work: `npm run build`, `npm run type-check`, `npm run lint`
   - ✅ DO run tests: `npm test`, `pytest`, etc. (tests should exit when done)
   - ✅ DO check that server CAN start by verifying config files exist, not by running it
   - **WHY**: Dev servers never exit and will block you from completing the task
   - **INSTEAD**: Document in test instructions how to verify the server works

3. """

        # Get workflow_id for API calls
        workflow_id = task.workflow_id or "UNKNOWN"

        # Add CLI-specific tool instructions
        if cli_type == "opencode":
            base_message += f"""You have access to the Hephaestus server via HTTP REST API. Use these curl commands:

   🔑 CRITICAL: Always include these headers in every request:
   - Content-Type: application/json
   - X-Agent-ID: {agent_id}

   **Available API Endpoints** (use curl from your terminal):

   📋 **Create a Ticket** (for infrastructure/documentation tasks):
   ```bash
   curl -X POST http://hephaestus-server:8000/api/tickets/create \\
     -H "Content-Type: application/json" \\
     -H "X-Agent-ID: {agent_id}" \\
     -d '{{"title":"Your ticket title", "description":"Detailed description", "component":"infrastructure", "workflow_id":"{workflow_id}"}}'
   ```

   NOTE: Your workflow_id is: {workflow_id}

   ✅ **Mark Your Task as Done** (REQUIRED when you complete your work):
   ```bash
   curl -X POST http://hephaestus-server:8000/update_task_status \\
     -H "Content-Type: application/json" \\
     -H "X-Agent-ID: {agent_id}" \\
     -d '{{"task_id":"{task.id}", "status":"done", "completion_notes":"Summary of what you accomplished"}}'
   ```

   💾 **Save Learnings/Discoveries** (use liberally - see Memory Guidelines below):
   ```bash
   curl -X POST http://hephaestus-server:8000/save_memory \\
     -H "Content-Type: application/json" \\
     -H "X-Agent-ID: {agent_id}" \\
     -d '{{"memory_type":"discovery", "content":"What you learned", "tags":["tag1","tag2"], "related_files":["path/to/file.py"]}}'
   ```

   🔍 **Search Past Memories** (when you need information):
   ```bash
   curl -X POST http://hephaestus-server:8000/search_memories \\
     -H "Content-Type: application/json" \\
     -H "X-Agent-ID: {agent_id}" \\
     -d '{{"query":"what you're looking for", "limit":5}}'
   ```

   📋 **Create Sub-Tasks** (if you need to break down complex work):
   ```bash
   curl -X POST http://hephaestus-server:8000/create_task \\
     -H "Content-Type: application/json" \\
     -H "X-Agent-ID: {agent_id}" \\
     -d '{{"task_description":"Sub-task description", "done_definition":"When is it done", "priority":"medium"}}'
   ```

   💡 **TIPS**:
   - All curl commands run inside your Docker container, so use http://hephaestus-server:8000 (not localhost)
   - Always check curl exit codes: $? (0 = success, non-zero = error)
   - Use `curl -v` for debugging if you get errors
   - JSON must be properly escaped - use single quotes around the -d argument
   - The API will return JSON responses with status and data"""
        else:
            # Claude Code or other CLI with MCP support
            base_message += f"""You have access to the Hephaestus MCP server tools. Use them to:

   🔑 REMEMBER: When calling these tools, always use agent_id="{agent_id}"

   - update_task_status: Mark your task as done when completed (with task_id: {task.id})
   - save_memory: Save discoveries for other agents (USE THIS LIBERALLY - see Memory Guidelines below)
   - create_task: Create sub-tasks if you need to break down complex work
   - qdrant-find: Search past memories when you need specific information (see Memory Search below)"""

        # Add phase-specific instructions if in a workflow
        if hasattr(task, 'phase_id') and task.phase_id:
            base_message += f"""
   - When creating tasks, specify the phase number (1, 2, 3...) for the phase you want
   - Example: create_task(description="...", done_definition="...", phase=1) for Planning phase
   - Example: create_task(description="...", done_definition="...", phase=2) for Implementation phase"""

        base_message += f"""
   - get_tasks: Check the status of other tasks in the system
   - broadcast_message: Send a message to ALL active agents in the system
   - send_message: Send a direct message to a SPECIFIC agent

**Agent Communication**:
You can communicate with other agents working in the system using these tools:

- **broadcast_message(message, sender_agent_id)**: Use when you have information ALL agents should know,
  or when asking for help but don't know who to ask specifically.
  Examples:
  • "I found a critical bug in module X that affects everyone"
  • "Does anyone have information about how authentication works?"
  • "I've completed the database schema - all agents can now use it"

- **send_message(message, sender_agent_id, recipient_agent_id)**: Use when you want to communicate
  with a specific agent. First use get_agent_status() to see active agents and their tasks.
  Examples:
  • "I need the API specs you were working on"
  • "Your task conflicts with mine - can we coordinate?"
  • "I found the answer to your earlier question"

Messages you receive from other agents will appear with prefixes:
- [AGENT xxx BROADCAST]: Message sent to all agents
- [AGENT xxx TO AGENT yyy]: Direct message to you specifically

When another agent sends you a message, consider responding if you have helpful information or can assist.

3. **CRITICAL - TASK COMPLETION**: When you complete YOUR ASSIGNED TASK:
   - You MUST ALWAYS use update_task_status to mark your task as "done"
   - Set status to "done"
   - Include a summary of what you accomplished
   - Your task_id is: {task.id}
   - Your agent_id is: {agent_id}
   - This is REQUIRED for every task, regardless of workflow type

4. **OPTIONAL - WORKFLOW RESULT SUBMISSION**: Only if you have achieved the ENTIRE workflow's final goal:
   - Use submit_result ONLY when you have the complete solution for the ENTIRE WORKFLOW
   - This is SEPARATE from task completion - you still need to mark your task as done first
   - submit_result(markdown_file_path="path/to/result.md", agent_id="{agent_id}",
                     explanation="Brief description", evidence=["proof1", "proof2"])
   - This is for the final workflow deliverable (e.g., the cracked password, the complete report, etc.)
   - Do NOT use this for intermediate task results
   - The result will be automatically validated before workflow completion

5. If you encounter issues you cannot resolve:
   - Use update_task_status with status "failed"
   - Include a clear failure_reason explaining what went wrong
   - Your task_id is: {task.id}
   - Your agent_id is: {agent_id}

6. **MEMORY GUIDELINES** - Sharing Knowledge with Other Agents:

   **When to SAVE memories (save_memory):**
   Save memories LIBERALLY throughout your work - don't wait until the end! Other agents benefit from:
   • Error solutions: Fixed a bug? Save it immediately (type: error_fix)
   • Discoveries: Found how something works? Save it (type: discovery)
   • Decisions: Made a design choice? Document why (type: decision)
   • Learnings: Learned something non-obvious? Share it (type: learning)
   • Warnings: Hit an edge case or gotcha? Warn others (type: warning)
   • Code insights: Understand code structure? Document it (type: codebase_knowledge)

   Examples of what to save:
   - "Fixed 'ModuleNotFoundError' by adding src/ to PYTHONPATH"
   - "Authentication uses JWT with HS256, 24h expiry, stored in cookie"
   - "Chose Redis over Memcached for pub/sub support in notifications"
   - "Always call db.commit() before db.close() or changes are lost"
   - "Don't use os.fork() with SQLite - causes 'database locked' errors"
   - "API routes defined in src/api/routes/, grouped by resource type"

   **When to SEARCH memories (qdrant-find):**
   Use qdrant-find when you need specific information not in your initial context:
   • Encountering an unfamiliar error? Search: "qdrant-find 'NameError when importing'"
   • Need implementation details? Search: "qdrant-find 'how database migrations work'"
   • Looking for patterns? Search: "qdrant-find 'API authentication setup'"
   • Finding related work? Search: "qdrant-find 'previous rate limiting implementations'"

   Pro tips:
   - Save memories AS YOU GO, not just at task completion
   - Be specific in memory content (include error messages, file paths, exact solutions)
   - Use qdrant-find before reinventing the wheel
   - Include tags and related_files in save_memory for better searchability"""

        # Add phase transition instructions if available
        if hasattr(task, 'phase_id') and task.phase_id:
            base_message += f"""

7. Phase-Aware Task Creation:
   - Always specify the phase number when creating tasks: phase=1, phase=2, etc.
   - You can create tasks for ANY phase based on what you discover
   - Phase 1 tasks: Planning, architecture, design decisions
   - Phase 2 tasks: Implementation, coding, building features
   - Use your judgment to assign tasks to the appropriate phase"""

        base_message += f"""
{phase_context_section}

═══════════════════════════════════════════════════════════════════════
🚨🚨🚨 FINAL REMINDER BEFORE YOU START 🚨🚨🚨
═══════════════════════════════════════════════════════════════════════

**THE #1 MOST COMMON MISTAKE: FORGETTING TO CALL update_task_status!**

When you finish your work, you MUST call:

```python
mcp__hephaestus__update_task_status({{
    "task_id": "{task.id}",
    "agent_id": "{agent_id}",
    "status": "done",
    "summary": "What you accomplished"
}})
```

**WITHOUT THIS CALL:**
- ❌ The system will NOT know you are done
- ❌ You will be stuck running forever
- ❌ Your work will NOT be recognized
- ❌ The workflow will be blocked

**THIS IS NOT OPTIONAL - IT IS MANDATORY!**

═══════════════════════════════════════════════════════════════════════

Begin working on your task now.

REMEMBER:
- When you complete YOUR TASK → use update_task_status(status="done")
- Only if you solve the ENTIRE WORKFLOW → also use submit_result()
- These are TWO SEPARATE actions - task completion is always required!
"""

        logger.info(f"🔍 PROMPT SIZE DEBUG: Message before adding phase context: {len(base_message)} chars")

        # Phase context was already added earlier in the message building process, so don't add it again
        logger.info(f"🔍 PROMPT SIZE DEBUG: Skipping duplicate phase context addition")

        logger.info(f"🔍 PROMPT SIZE DEBUG: FINAL MESSAGE LENGTH: {len(base_message)} characters")
        logger.info(f"🔍 PROMPT SIZE DEBUG: Phase context contributed: {len(phase_context_section)} chars ({len(phase_context_section)/len(base_message)*100:.1f}% of total if only added once)")

        # 🔧 CRITICAL FIX: Replace ALL [workflow_id] placeholders from phase templates
        # The phase context includes templates with [workflow_id] placeholders that need to be substituted
        if workflow_id and workflow_id != "UNKNOWN":
            placeholder_count = base_message.count("[workflow_id]")
            if placeholder_count > 0:
                logger.info(f"🔧 Replacing {placeholder_count} [workflow_id] placeholders with actual workflow_id: {workflow_id}")
                base_message = base_message.replace("[workflow_id]", workflow_id)
            else:
                logger.debug(f"No [workflow_id] placeholders found in prompt (workflow_id={workflow_id})")
        else:
            logger.warning(f"workflow_id is UNKNOWN or None, skipping placeholder replacement")

        return base_message

    async def _verify_prompt_delivery(
        self,
        pane,
        verification_string: str,
        wait_seconds: int = 10
    ) -> bool:
        """Verify that a prompt was delivered to the agent.

        Args:
            pane: tmux pane object
            verification_string: String to look for in output
            wait_seconds: Seconds to wait before checking

        Returns:
            True if verification string found, False otherwise
        """
        await asyncio.sleep(wait_seconds)
        output = pane.cmd("capture-pane", "-p", "-S", "-1000").stdout
        output_text = "\n".join(output) if output else ""
        return verification_string in output_text

    async def _send_initial_prompt_with_retry(
        self,
        pane,
        cli_agent,
        cli_type: str,
        initial_message: str,
        agent_id: str,
        task_id: str,
        max_retries: int = 3,
        verify_delivery: bool = False
    ) -> None:
        """Send initial prompt with optional verification and retry.

        Args:
            pane: tmux pane object
            cli_agent: CLI agent interface instance
            cli_type: Type of CLI agent (claude, opencode, etc.)
            initial_message: The initial message to send
            agent_id: Agent ID for logging
            task_id: Task ID for verification
            max_retries: Maximum number of retry attempts (only used if verify_delivery=True)
            verify_delivery: Whether to verify delivery and retry on failure (default: False)

        Raises:
            Exception: If verify_delivery=True and all retries fail
        """
        # Use Task ID as verification string (always present in initial message)
        verification_string = f"Task ID: {task_id}"

        # Check if this is OpenCode (prompt already loaded via -p flag)
        is_opencode = cli_type == "opencode"

        # Check if this is a Claude agent (needs chunking)
        from src.interfaces.cli_interface import ClaudeCodeAgent, DroidAgent
        is_claude = isinstance(cli_agent, ClaudeCodeAgent)

        # Check if this is a Droid agent (needs chunking like Claude)
        is_droid = isinstance(cli_agent, DroidAgent)

        # If verification is disabled, just send once and return
        if not verify_delivery:
            if is_opencode:
                # OpenCode: Prompt already loaded via -p flag, just send Enter after 2 seconds
                logger.info(f"OpenCode agent: Prompt loaded via -p flag, waiting 2 seconds then sending Enter")
                await asyncio.sleep(1)
                pane.send_keys('', enter=True)  # Send Enter to submit the prompt
                logger.info(f"OpenCode: Enter sent to agent {agent_id}")
            elif is_claude or is_droid:
                # ✅ ATOMIC DELIVERY: Use paste-buffer instead of chunked send_keys
                # This avoids character loss and newline interpretation issues
                agent_name = "Claude" if is_claude else "Droid"
                logger.info(f"Sending initial prompt to {agent_name} agent {agent_id} (atomic delivery, verification disabled)")
                formatted_message = cli_agent.format_message(initial_message)

                await self._deliver_message_to_cli(
                    pane,
                    formatted_message,
                    chunk_size=2500,
                    log_prefix=f"{agent_name} agent initial prompt (no verification) [{agent_id[:8]}]",
                )
                logger.info(f"Initial prompt sent to {agent_name} agent {agent_id}")
            else:
                # Other agents: Send entire prompt in one go
                logger.info(f"Sending initial prompt to agent {agent_id} (verification disabled)")
                formatted_message = cli_agent.format_message(initial_message)
                await self._deliver_message_to_cli(
                    pane,
                    formatted_message,
                    chunk_size=2500,
                    log_prefix=f"{cli_type} initial prompt (no verification) [{agent_id[:8]}]",
                )
                logger.info(f"Initial prompt sent to agent {agent_id}")

            return

        # Verification enabled - retry loop
        for attempt in range(1, max_retries + 1):
            logger.info(f"Sending initial prompt to agent {agent_id} (attempt {attempt}/{max_retries})")

            if is_opencode:
                # OpenCode: Prompt already loaded via -p flag, just send Enter after 2 seconds
                logger.info(f"OpenCode agent: Prompt loaded via -p flag, waiting 2 seconds then sending Enter")
                await asyncio.sleep(.2)
                pane.send_keys('', enter=True)  # Send Enter to submit the prompt
            elif is_claude or is_droid:
                # ✅ ATOMIC DELIVERY: Use paste-buffer instead of chunked send_keys
                agent_name = "Claude" if is_claude else "Droid"
                formatted_message = cli_agent.format_message(initial_message)
                log_prefix = (
                    f"{agent_name} agent initial prompt attempt {attempt}/{max_retries} "
                    f"(verification enabled) [{agent_id[:8]}]"
                )
                await self._deliver_message_to_cli(
                    pane,
                    formatted_message,
                    chunk_size=2000,
                    log_prefix=log_prefix,
                )
            else:
                # Other agents: Send entire prompt in one go
                formatted_message = cli_agent.format_message(initial_message)
                await self._deliver_message_to_cli(
                    pane,
                    formatted_message,
                    chunk_size=2000,
                    log_prefix=(
                        f"{cli_type} initial prompt attempt {attempt}/{max_retries} "
                        f"(verification enabled) [{agent_id[:8]}]"
                    ),
                )

            # Verify delivery
            if await self._verify_prompt_delivery(pane, verification_string, wait_seconds=10):
                logger.info(f"✓ Initial prompt verified for agent {agent_id} on attempt {attempt}")
                return

            logger.warning(f"✗ Initial prompt NOT verified for agent {agent_id} on attempt {attempt}")

            if attempt < max_retries:
                logger.info(f"Retrying prompt delivery for agent {agent_id}...")
                await asyncio.sleep(.5)  # Brief pause before retry

        # All retries failed
        error_msg = f"Failed to deliver initial prompt to agent {agent_id} after {max_retries} attempts"
        logger.error(error_msg)
        raise Exception(error_msg)

    async def terminate_agent(self, agent_id: str):
        """Terminate an agent and clean up resources.

        Args:
            agent_id: ID of agent to terminate
        """
        logger.info(f"Terminating agent {agent_id}")

        session = self.db_manager.get_session()
        try:
            agent = session.query(Agent).filter_by(id=agent_id).first()
            if not agent:
                logger.warning(f"Agent {agent_id} not found")
                return

            # Capture final output before killing tmux session
            final_output = ""
            if agent.tmux_session_name:
                try:
                    if self.has_tmux_session(agent.tmux_session_name):
                        # Find session by iteration (avoid deprecated get_by_id)
                        tmux_session = None
                        for tmux_sess in self.tmux_server.sessions:
                            if tmux_sess.name == agent.tmux_session_name:
                                tmux_session = tmux_sess
                                break

                        if tmux_session:
                            # Capture the final output before killing the session
                            try:
                                pane = tmux_session.attached_window.attached_pane
                                # Capture all available output (up to 10000 lines)
                                output_lines = pane.cmd("capture-pane", "-p", "-S", "-10000").stdout
                                final_output = "\n".join(output_lines) if output_lines else ""
                                logger.info(f"Captured {len(output_lines)} lines of final output for agent {agent_id}")
                            except Exception as e:
                                logger.error(f"Failed to capture final output: {e}")

                            # Now kill the session
                            tmux_session.kill_session()
                            logger.debug(f"Killed tmux session: {agent.tmux_session_name}")
                except Exception as e:
                    logger.error(f"Failed to kill tmux session: {e}")

            # Update agent status
            agent.status = "terminated"

            # Log termination with final output
            log_entry = AgentLog(
                agent_id=agent_id,
                log_type="terminated",
                message="Agent terminated after task completion",
                details={
                    "final_output": final_output,
                    "output_lines": len(final_output.split('\n')) if final_output else 0,
                    "captured_at": datetime.utcnow().isoformat()
                }
            )
            session.add(log_entry)

            session.commit()
            logger.info(f"Agent {agent_id} terminated successfully with output captured")

        except Exception as e:
            logger.error(f"Failed to terminate agent {agent_id}: {e}")
            session.rollback()
        finally:
            session.close()

    async def restart_agent(self, agent_id: str, reason: str = ""):
        """Restart a stuck agent.

        Args:
            agent_id: ID of agent to restart
            reason: Reason for restart
        """
        logger.info(f"Restarting agent {agent_id}: {reason}")

        session = self.db_manager.get_session()
        try:
            agent = session.query(Agent).filter_by(id=agent_id).first()
            if not agent:
                logger.warning(f"Agent {agent_id} not found")
                return

            # Get task info
            task = session.query(Task).filter_by(id=agent.current_task_id).first()
            if not task:
                logger.error(f"Task {agent.current_task_id} not found")
                return

            worktree_path = None
            worktree_record = session.query(AgentWorktree).filter_by(agent_id=agent_id).first()
            if worktree_record:
                worktree_path = worktree_record.worktree_path
            else:
                logger.warning(f"No worktree record found for agent {agent_id} during restart")

            # Kill existing tmux session
            if agent.tmux_session_name:
                try:
                    if self.has_tmux_session(agent.tmux_session_name):
                        # Find session by iteration (avoid deprecated get_by_id)
                        tmux_session = None
                        for tmux_sess in self.tmux_server.sessions:
                            if tmux_sess.name == agent.tmux_session_name:
                                tmux_session = tmux_sess
                                break

                        if tmux_session:
                            tmux_session.kill_session()
                except Exception as e:
                    logger.debug(f"Error killing tmux session: {e}")

            # Prepare environment variables for GLM if needed
            env_vars = None
            model = getattr(self.config, 'cli_model', 'sonnet')
            if 'GLM' in model.upper():
                import os
                token_env_var = getattr(self.config, 'glm_api_token_env', 'GLM_API_TOKEN')
                token = os.getenv(token_env_var)

                if token:
                    env_vars = {
                        'ANTHROPIC_BASE_URL': 'https://api.z.ai/api/anthropic',
                        'ANTHROPIC_AUTH_TOKEN': token,
                        'ANTHROPIC_DEFAULT_SONNET_MODEL': 'GLM-4.6',
                        'ANTHROPIC_DEFAULT_OPUS_MODEL': 'GLM-4.6',
                        'ANTHROPIC_DEFAULT_HAIKU_MODEL': 'GLM-4.6',
                    }
                    logger.info(f"Setting up GLM-4.6 environment variables for restarted agent {agent_id}")

            # Set MCP_TOOL_TIMEOUT if workflow has human approval enabled
            # This only applies to Claude Code agents
            # NOTE: task.workflow_id might be None at creation time, so check active workflow or board configs
            if agent.cli_type == 'claude':
                try:
                    # Try to get workflow_id from multiple sources
                    workflow_id = None

                    # Source 1: task.workflow_id (might be None at creation time)
                    if task.workflow_id:
                        workflow_id = task.workflow_id
                    # Source 2: active workflow from phase manager
                    elif hasattr(self, 'phase_manager') and self.phase_manager and hasattr(self.phase_manager, 'workflow_id'):
                        workflow_id = self.phase_manager.workflow_id
                    # Source 3: check if there's any active workflow with human review enabled
                    else:
                        # Get first board config with human review enabled
                        board_config = session.query(BoardConfig).filter_by(ticket_human_review=True).first()
                        if board_config:
                            workflow_id = board_config.workflow_id

                    if workflow_id:
                        board_config = session.query(BoardConfig).filter_by(workflow_id=workflow_id).first()

                        if board_config and board_config.ticket_human_review:
                            # Get timeout in seconds, default to 1800 (30 minutes)
                            timeout_seconds = board_config.approval_timeout_seconds or 1800
                            # Convert to milliseconds for Claude Code
                            timeout_ms = timeout_seconds * 1000

                            # Initialize env_vars if not already set
                            if env_vars is None:
                                env_vars = {}

                            env_vars['MCP_TOOL_TIMEOUT'] = str(timeout_ms)
                            logger.info(
                                f"Human approval enabled for workflow {workflow_id}: "
                                f"Setting MCP_TOOL_TIMEOUT={timeout_ms}ms for restarted agent"
                            )
                except Exception as e:
                    logger.warning(f"Failed to check board config for MCP_TOOL_TIMEOUT on restart: {e}")
                    # Don't fail agent restart if this check fails

            # Create new tmux session with env vars
            # Use agent_id for unique session names (not task_id which can be reused on restarts)
            new_session_name = f"{self.config.tmux_session_prefix}_{agent_id[:8]}_r"
            tmux_session = self._create_tmux_session(
                new_session_name,
                working_directory=worktree_path,
                env_vars=env_vars
            )

            # Relaunch agent
            cli_agent = get_cli_agent(agent.cli_type)
            launch_command = cli_agent.get_launch_command(
                system_prompt=agent.system_prompt,
                task_id=task.id,
                worktree_path=worktree_path,
            )

            pane = tmux_session.attached_window.attached_pane

            # 🔍 DEBUG: Log the launch command
            logger.info(f"🔍 RESTART DEBUG: Launch command for {agent.cli_type} agent {agent_id[:8]}:")
            logger.info(f"🔍 Command length: {len(launch_command)} chars")
            logger.info(f"🔍 First 200 chars: {launch_command[:200]}")
            logger.info(f"🔍 Last 200 chars: {launch_command[-200:]}")

            # If using GLM, export env vars in the shell first
            if env_vars:
                logger.info(f"Exporting GLM environment variables in shell for restarted agent {agent_id}")
                for key, value in env_vars.items():
                    pane.send_keys(f'export {key}="{value}"', enter=True)
                # Brief pause to ensure exports complete
                await asyncio.sleep(0.5)

            # Now send the launch command
            logger.info(f"🔍 RESTART DEBUG: Sending launch command to tmux pane...")
            pane.send_keys(launch_command, enter=True)
            logger.info(f"🔍 RESTART DEBUG: Launch command sent, waiting for CLI to be ready...")

            ready_timeout = getattr(self.config, "cli_ready_timeout_seconds", 60)
            logger.info(
                f"Waiting up to {ready_timeout} seconds for restarted {agent.cli_type} agent "
                f"{agent_id} to reach its prompt..."
            )
            ready = await self._wait_for_cli_ready(
                cli_agent,
                new_session_name,
                timeout_seconds=ready_timeout,
                poll_interval=1.0,
            )
            if not ready:
                logger.warning(
                    f"Restarted {agent.cli_type} agent {agent_id} did not confirm readiness "
                    f"within {ready_timeout}s; continuing anyway."
                )

            # Update agent record
            agent.tmux_session_name = new_session_name
            agent.status = "working"
            agent.health_check_failures = 0
            agent.last_activity = datetime.utcnow()

            # Log restart
            log_entry = AgentLog(
                agent_id=agent_id,
                log_type="restarted",
                message=f"Agent restarted: {reason}",
                details={"new_session": new_session_name},
            )
            session.add(log_entry)

            session.commit()

            # Send task reminder after restart
            reminder = f"You were restarted. Continue working on task {task.id}: {task.enriched_description[:200]}"
            await self._deliver_message_to_cli(
                pane,
                cli_agent.format_message(reminder),
                chunk_size=800,
                log_prefix=f"Restart reminder for agent {agent_id[:8]}",
            )

            logger.info(f"Agent {agent_id} restarted successfully")

        except Exception as e:
            logger.error(f"Failed to restart agent {agent_id}: {e}")
            session.rollback()
        finally:
            session.close()

    def get_agent_output(self, agent_id: str, lines: int = 200) -> str:
        """Get recent output from agent's tmux session or stored output for terminated agents.

        Args:
            agent_id: Agent ID
            lines: Number of lines to retrieve

        Returns:
            Recent output text
        """
        session = self.db_manager.get_session()
        try:
            agent = session.query(Agent).filter_by(id=agent_id).first()
            if not agent:
                logger.warning(f"Agent {agent_id} not found")
                return ""

            # Check if agent is terminated - if so, retrieve from AgentLog
            if agent.status == "terminated":
                logger.debug(f"Agent {agent_id} is terminated, retrieving stored output")

                # Get the most recent termination log with output
                termination_log = session.query(AgentLog).filter_by(
                    agent_id=agent_id,
                    log_type="terminated"
                ).order_by(AgentLog.timestamp.desc()).first()

                if termination_log and termination_log.details:
                    final_output = termination_log.details.get("final_output", "")
                    if final_output:
                        logger.debug(f"Retrieved stored output for terminated agent {agent_id}")
                        # If lines parameter is specified, return only the last N lines
                        if lines and lines > 0:
                            output_lines = final_output.split('\n')
                            return '\n'.join(output_lines[-lines:])
                        return final_output

                logger.warning(f"No stored output found for terminated agent {agent_id}")
                return "Agent terminated - no output was captured"

            # For non-terminated agents, get output from tmux session
            if not agent.tmux_session_name:
                logger.warning(f"Agent {agent_id} has no tmux session name")
                return ""

            logger.debug(f"Attempting to access tmux session: {agent.tmux_session_name}")

            # Use subprocess-based method to bypass libtmux bug
            # libtmux silently catches all exceptions in sessions property, returning empty list
            if not self._tmux_has_session(agent.tmux_session_name):
                logger.warning(f"Tmux session {agent.tmux_session_name} not found")
                return ""

            logger.debug(f"Session exists, capturing pane output")
            output = self._tmux_capture_pane(agent.tmux_session_name, lines)

            return output

        except Exception as e:
            logger.error(f"Failed to get agent output for {agent_id}: {e}")
            return ""
        finally:
            session.close()

    async def send_message_to_agent(self, agent_id: str, message: str, verify_delivery: bool = True) -> bool:
        """Send a message to an agent's tmux session with optional delivery verification.

        Args:
            agent_id: Agent ID
            message: Message to send
            verify_delivery: If True, verify message appeared in tmux output (default: True)

        Returns:
            True if message was sent successfully (and verified if requested), False otherwise
        """
        session = self.db_manager.get_session()
        try:
            agent = session.query(Agent).filter_by(id=agent_id).first()
            if not agent or not agent.tmux_session_name:
                logger.warning(f"Agent {agent_id} not found or no tmux session")
                return False

            logger.debug(f"Sending message to tmux session: {agent.tmux_session_name}")

            has_session = self.has_tmux_session(agent.tmux_session_name)
            logger.debug(f"has_session({agent.tmux_session_name}) = {has_session}")
            if not has_session:
                logger.warning(f"Tmux session {agent.tmux_session_name} not found")
                return False

            logger.debug(f"Finding session by iteration for message: {agent.tmux_session_name}")
            tmux_session = None
            for tmux_sess in self.tmux_server.sessions:
                if tmux_sess.name == agent.tmux_session_name:
                    tmux_session = tmux_sess
                    break

            logger.debug(f"Session iteration result for message: {tmux_session}")
            if not tmux_session:
                logger.warning(f"Could not get tmux session {agent.tmux_session_name}")
                return False

            # ✅ OPTIMIZATION: Use cached CLI agent interface
            cli_agent = self._get_cached_cli_agent(agent.cli_type)
            formatted_message = cli_agent.format_message(message)

            # Send message
            pane = tmux_session.attached_window.attached_pane

            # ✅ FIX: Only send trailing Enter for OpenCode (which needs it)
            # Claude/Droid interpret embedded newlines as submit, creating empty turns
            # Other agents handle submission differently
            if agent.cli_type == "opencode":
                # OpenCode: Send message with trailing Enter
                pane.send_keys(formatted_message, enter=True)
                logger.debug(f"Sent message to OpenCode agent {agent_id} with trailing Enter")
            else:
                # Claude/Droid/others: Send message without trailing Enter
                # The agent will handle submission via its own prompt mechanism
                pane.send_keys(formatted_message, enter=False)
                await asyncio.sleep(0.2)
                pane.send_keys('', enter=True)  # Single explicit Enter
                logger.debug(f"Sent message to {agent.cli_type} agent {agent_id} without embedded newline")

            # Update last activity
            agent.last_activity = datetime.utcnow()
            session.commit()

            logger.debug(f"Sent message to agent {agent_id}")

            # Verify delivery if requested
            if verify_delivery:
                logger.debug(f"Verifying message delivery to agent {agent_id}")
                await asyncio.sleep(2)  # Wait for message to appear in terminal

                # Read back tmux output
                output = self.get_agent_output(agent_id, lines=100)

                # Check if message appears in output
                # Look for a unique part of the message that should appear
                if message in output:
                    logger.info(f"✅ Verified message delivery to agent {agent_id[:8]}...")
                    return True
                else:
                    logger.warning(
                        f"⚠️  Message NOT found in agent {agent_id[:8]}... output after sending. "
                        f"Message may have been lost or agent terminal may be unresponsive."
                    )
                    return False

            # If verification disabled, assume success
            return True

        except Exception as e:
            logger.error(f"Failed to send message to agent: {e}")
            session.rollback()
            return False
        finally:
            session.close()

    async def broadcast_message_to_all_agents(self, sender_agent_id: str, message: str) -> int:
        """Broadcast a message to all active agents except the sender.

        Args:
            sender_agent_id: ID of the agent sending the message
            message: Message content to broadcast

        Returns:
            Number of agents the message was sent to
        """
        logger.info(f"Broadcasting message from agent {sender_agent_id}")

        session = self.db_manager.get_session()
        try:
            # Get all active agents except the sender
            active_agents = session.query(Agent).filter(
                Agent.status != "terminated",
                Agent.id != sender_agent_id
            ).all()

            if not active_agents:
                logger.info(f"No active agents to broadcast to (excluding sender {sender_agent_id})")
                return 0

            # Format message with broadcast prefix
            formatted_message = f"\n[AGENT {sender_agent_id[:8]} BROADCAST]: {message}\n"

            # Send to all active agents
            recipient_count = 0
            for agent in active_agents:
                try:
                    await self.send_message_to_agent(agent.id, formatted_message)
                    recipient_count += 1

                    # Log the broadcast
                    log_entry = AgentLog(
                        agent_id=agent.id,
                        log_type="agent_communication",
                        message=f"Received broadcast from agent {sender_agent_id[:8]}",
                        details={
                            "sender_id": sender_agent_id,
                            "recipient_id": agent.id,
                            "message_type": "broadcast",
                            "message_content": message[:200],  # Truncate for storage
                            "timestamp": datetime.utcnow().isoformat(),
                        }
                    )
                    session.add(log_entry)
                except Exception as e:
                    logger.error(f"Failed to send broadcast to agent {agent.id}: {e}")

            session.commit()
            logger.info(f"Broadcast from {sender_agent_id[:8]} sent to {recipient_count} agents")
            return recipient_count

        except Exception as e:
            logger.error(f"Failed to broadcast message: {e}")
            session.rollback()
            return 0
        finally:
            session.close()

    async def send_direct_message(self, sender_agent_id: str, recipient_agent_id: str, message: str) -> bool:
        """Send a direct message from one agent to another.

        Args:
            sender_agent_id: ID of the agent sending the message
            recipient_agent_id: ID of the agent receiving the message
            message: Message content

        Returns:
            True if message was sent successfully, False otherwise
        """
        logger.info(f"Sending message from agent {sender_agent_id[:8]} to {recipient_agent_id[:8]}")

        session = self.db_manager.get_session()
        try:
            # Verify recipient exists and is active
            recipient = session.query(Agent).filter_by(id=recipient_agent_id).first()
            if not recipient:
                logger.warning(f"Recipient agent {recipient_agent_id} not found")
                return False

            if recipient.status == "terminated":
                logger.warning(f"Recipient agent {recipient_agent_id} is terminated")
                return False

            # Format message with direct message prefix
            formatted_message = f"\n[AGENT {sender_agent_id[:8]} TO AGENT {recipient_agent_id[:8]}]: {message}\n"

            # Send the message with verification
            delivery_verified = await self.send_message_to_agent(
                recipient_agent_id,
                formatted_message,
                verify_delivery=True
            )

            if not delivery_verified:
                logger.warning(
                    f"Failed to verify message delivery from {sender_agent_id[:8]} to {recipient_agent_id[:8]}"
                )
                return False

            # Log the communication
            log_entry = AgentLog(
                agent_id=recipient_agent_id,
                log_type="agent_communication",
                message=f"Received direct message from agent {sender_agent_id[:8]}",
                details={
                    "sender_id": sender_agent_id,
                    "recipient_id": recipient_agent_id,
                    "message_type": "direct",
                    "message_content": message[:200],  # Truncate for storage
                    "timestamp": datetime.utcnow().isoformat(),
                    "delivery_verified": delivery_verified,
                }
            )
            session.add(log_entry)
            session.commit()

            logger.info(f"✅ Direct message sent and verified from {sender_agent_id[:8]} to {recipient_agent_id[:8]}")
            return True

        except Exception as e:
            logger.error(f"Failed to send direct message: {e}")
            session.rollback()
            return False
        finally:
            session.close()

    async def get_project_context(self) -> str:
        """Get current project context for task enrichment.

        Returns:
            Formatted project context string
        """
        session = self.db_manager.get_session()
        try:
            # Get active tasks
            active_tasks = session.query(Task).filter(
                Task.status.in_(["pending", "assigned", "in_progress"])
            ).all()

            # Get recent completions
            recent_tasks = session.query(Task).filter(
                Task.status == "done"
            ).order_by(Task.completed_at.desc()).limit(5).all()

            # Get active agents
            active_agents = session.query(Agent).filter(
                Agent.status != "terminated"
            ).all()

            # Format context
            context = f"""
## PROJECT STATUS
- Active Tasks: {len(active_tasks)}
- Active Agents: {len(active_agents)}
- Recent Completions: {len(recent_tasks)}

## ACTIVE TASKS
"""
            for task in active_tasks[:10]:
                context += f"- {task.id[:8]}: {(task.enriched_description or task.raw_description)[:100]}...\n"

            if recent_tasks:
                context += "\n## RECENT COMPLETIONS\n"
                for task in recent_tasks:
                    context += f"- {(task.enriched_description or task.raw_description)[:100]}...\n"

            return context

        except Exception as e:
            logger.error(f"Failed to get project context: {e}")
            return "Project context unavailable"
        finally:
            session.close()

    def get_active_agents(self) -> List[Agent]:
        """Get all active agents.

        Returns:
            List of active agents
        """
        session = self.db_manager.get_session()
        try:
            # Expire all cached objects to ensure we get fresh data from database
            # This is critical for seeing changes made by other processes or raw SQL
            session.expire_all()

            agents = session.query(Agent).filter(
                Agent.status != "terminated"
            ).all()
            return agents
        finally:
            session.close()
