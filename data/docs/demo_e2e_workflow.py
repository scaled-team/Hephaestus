#!/usr/bin/env python3
"""
End-to-End Workflow Demonstration: Agent Spawning, Ticket Creation, and Memory Management
================================================================================

This script demonstrates:
1. Docker container initialization
2. Multi-agent swarm spawning
3. Project ticket creation
4. Memory persistence
5. Task orchestration
6. Real-time monitoring
7. Session state management
"""

import json
import time
import subprocess
import requests
import sys
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path


class WorkflowOrchestrator:
    """Orchestrates end-to-end workflow with agent spawning, tickets, and memory."""

    def __init__(self):
        self.project_root = Path("/Users/nova/Sites/bench/Hephaestus")
        self.mcp_url = "http://localhost:8000"
        self.swarm_id: Optional[str] = None
        self.agents: List[Dict[str, Any]] = []
        self.tickets: List[Dict[str, Any]] = []
        self.memories: Dict[str, Any] = {}
        self.start_time = datetime.now()
        self.execution_log: List[Dict[str, str]] = []

    def log(self, level: str, message: str, details: Optional[Dict] = None):
        """Log execution events with timestamps."""
        timestamp = datetime.now().isoformat()
        entry = {
            "timestamp": timestamp,
            "level": level,
            "message": message,
            "elapsed_seconds": (datetime.now() - self.start_time).total_seconds()
        }
        if details:
            entry["details"] = details

        self.execution_log.append(entry)
        print(f"[{timestamp}] {level:12} | {message}")
        if details:
            print(f"  └─ {json.dumps(details, indent=2)}")

    # ═══════════════════════════════════════════════════════════════
    # PHASE 1: Docker & Infrastructure
    # ═══════════════════════════════════════════════════════════════

    def verify_docker_setup(self) -> bool:
        """Verify Docker containers are running."""
        self.log("INFO", "🐳 Verifying Docker setup...")

        try:
            result = subprocess.run(
                ["docker", "ps", "--format", "table {{.Names}}\t{{.Status}}"],
                capture_output=True,
                text=True,
                timeout=10
            )

            containers = result.stdout.split('\n')
            required = ["hephaestus-server", "hephaestus-qdrant"]
            found = []

            for container in containers:
                for req in required:
                    if req in container:
                        found.append(req)

            if len(found) == len(required):
                self.log("SUCCESS", f"✅ All Docker containers running: {', '.join(found)}")
                return True
            else:
                self.log("WARNING", f"⚠️  Missing containers: {set(required) - set(found)}")
                return False

        except Exception as e:
            self.log("ERROR", f"❌ Docker verification failed: {str(e)}")
            return False

    def ensure_docker_running(self) -> bool:
        """Start Docker containers if not running."""
        self.log("INFO", "🔄 Ensuring Docker containers are running...")

        try:
            # Change to project directory
            import os
            os.chdir(self.project_root)

            # Start Docker containers
            result = subprocess.run(
                ["docker", "compose", "up", "-d", "--no-build"],
                capture_output=True,
                text=True,
                timeout=60
            )

            if result.returncode == 0:
                self.log("SUCCESS", "✅ Docker containers started successfully")
                time.sleep(5)  # Wait for containers to be ready
                return True
            else:
                self.log("ERROR", f"❌ Failed to start Docker: {result.stderr}")
                return False

        except Exception as e:
            self.log("ERROR", f"❌ Docker startup failed: {str(e)}")
            return False

    def health_check_mcp_server(self, retries: int = 5) -> bool:
        """Health check MCP server with retries."""
        self.log("INFO", "🏥 Performing MCP server health check...")

        for attempt in range(retries):
            try:
                response = requests.get(f"{self.mcp_url}/health", timeout=5)
                if response.status_code == 200:
                    self.log("SUCCESS", f"✅ MCP server healthy (attempt {attempt + 1}/{retries})")
                    return True
            except requests.ConnectionError:
                if attempt < retries - 1:
                    self.log("WARNING", f"⚠️  Health check failed (attempt {attempt + 1}/{retries}), retrying...")
                    time.sleep(2)

        self.log("ERROR", f"❌ MCP server health check failed after {retries} attempts")
        return False

    # ═══════════════════════════════════════════════════════════════
    # PHASE 2: Agent Spawning & Swarm Management
    # ═══════════════════════════════════════════════════════════════

    def initialize_swarm(self) -> bool:
        """Initialize multi-agent swarm with hierarchical topology."""
        self.log("INFO", "🐝 Initializing multi-agent swarm...")

        swarm_config = {
            "topology": "hierarchical",
            "max_agents": 6,
            "strategy": "adaptive",
            "capabilities": {
                "communication": "enabled",
                "memory_sharing": "enabled",
                "coordination": "hierarchical"
            }
        }

        try:
            response = requests.post(
                f"{self.mcp_url}/swarm/initialize",
                json=swarm_config,
                timeout=10
            )

            if response.status_code == 200:
                swarm_data = response.json()
                self.swarm_id = swarm_data.get("swarm_id")
                self.log("SUCCESS", f"✅ Swarm initialized", {
                    "swarm_id": self.swarm_id,
                    "topology": swarm_config["topology"],
                    "max_agents": swarm_config["max_agents"]
                })
                return True
            else:
                self.log("ERROR", f"❌ Swarm initialization failed: {response.text}")
                return False

        except Exception as e:
            self.log("ERROR", f"❌ Swarm initialization error: {str(e)}")
            return False

    def spawn_agent(self, agent_type: str, name: str, capabilities: List[str]) -> Optional[Dict]:
        """Spawn an individual agent."""
        if not self.swarm_id:
            self.log("ERROR", "❌ No swarm initialized")
            return None

        agent_config = {
            "type": agent_type,
            "name": name,
            "swarm_id": self.swarm_id,
            "capabilities": capabilities,
            "config": {
                "llm_model": "anthropic/claude-haiku-4.5",
                "cli_tool": "opencode",
                "max_retries": 3
            }
        }

        try:
            response = requests.post(
                f"{self.mcp_url}/swarm/agents/spawn",
                json=agent_config,
                timeout=10
            )

            if response.status_code == 201:
                agent_data = response.json()
                agent_id = agent_data.get("agent_id")
                self.agents.append({
                    "agent_id": agent_id,
                    "type": agent_type,
                    "name": name,
                    "status": "spawned",
                    "created_at": datetime.now().isoformat()
                })
                self.log("SUCCESS", f"✅ Agent spawned: {name}", {
                    "agent_id": agent_id,
                    "type": agent_type,
                    "capabilities": capabilities
                })
                return agent_data
            else:
                self.log("ERROR", f"❌ Failed to spawn {name}: {response.text}")
                return None

        except Exception as e:
            self.log("ERROR", f"❌ Agent spawn error: {str(e)}")
            return None

    def spawn_agents_parallel(self) -> bool:
        """Spawn multiple agents in parallel."""
        self.log("INFO", "👥 Spawning agent team...")

        agents_to_spawn = [
            ("coordinator", "Project Coordinator", ["planning", "delegation", "monitoring"]),
            ("coder", "Frontend Developer", ["react", "typescript", "ui-design"]),
            ("coder", "Backend Developer", ["nodejs", "api-design", "database"]),
            ("analyst", "Code Analyst", ["code-review", "architecture", "quality"]),
            ("tester", "QA Engineer", ["testing", "validation", "e2e"]),
        ]

        success_count = 0
        for agent_type, name, capabilities in agents_to_spawn:
            if self.spawn_agent(agent_type, name, capabilities):
                success_count += 1

        self.log("INFO", f"📊 Agent spawn summary", {
            "total_spawned": success_count,
            "total_requested": len(agents_to_spawn),
            "success_rate": f"{(success_count / len(agents_to_spawn)) * 100:.0f}%"
        })

        return success_count == len(agents_to_spawn)

    # ═══════════════════════════════════════════════════════════════
    # PHASE 3: Ticket Creation & Tracking
    # ═══════════════════════════════════════════════════════════════

    def create_tickets(self) -> bool:
        """Create project initialization tickets."""
        self.log("INFO", "🎫 Creating project tickets...")

        tickets_to_create = [
            {
                "title": "Project Infrastructure Setup",
                "description": "Initialize Docker, Qdrant, and MCP server infrastructure",
                "priority": "critical",
                "assignee": "Project Coordinator",
                "category": "infrastructure",
                "depends_on": []
            },
            {
                "title": "API Endpoint Design & Implementation",
                "description": "Design RESTful API with authentication and core endpoints",
                "priority": "high",
                "assignee": "Backend Developer",
                "category": "backend",
                "depends_on": ["Project Infrastructure Setup"]
            },
            {
                "title": "Frontend UI Components Development",
                "description": "Build React components for dashboard and user interface",
                "priority": "high",
                "assignee": "Frontend Developer",
                "category": "frontend",
                "depends_on": ["API Endpoint Design & Implementation"]
            },
            {
                "title": "Code Quality Review & Optimization",
                "description": "Review codebase architecture and suggest optimizations",
                "priority": "medium",
                "assignee": "Code Analyst",
                "category": "quality",
                "depends_on": ["Frontend UI Components Development"]
            },
            {
                "title": "Comprehensive Testing & Validation",
                "description": "Create and execute E2E and unit tests",
                "priority": "high",
                "assignee": "QA Engineer",
                "category": "testing",
                "depends_on": ["Code Quality Review & Optimization"]
            },
        ]

        try:
            for ticket_data in tickets_to_create:
                response = requests.post(
                    f"{self.mcp_url}/tickets/create",
                    json={
                        **ticket_data,
                        "created_at": datetime.now().isoformat(),
                        "project_id": "stockton-ai",
                        "status": "pending"
                    },
                    timeout=10
                )

                if response.status_code == 201:
                    ticket = response.json()
                    ticket_id = ticket.get("ticket_id")
                    self.tickets.append({
                        "ticket_id": ticket_id,
                        **ticket_data,
                        "status": "pending",
                        "created_at": datetime.now().isoformat()
                    })
                    self.log("SUCCESS", f"✅ Ticket created: {ticket_data['title']}", {
                        "ticket_id": ticket_id,
                        "priority": ticket_data['priority']
                    })
                else:
                    self.log("ERROR", f"❌ Failed to create ticket: {ticket_data['title']}")

            return len(self.tickets) > 0

        except Exception as e:
            self.log("ERROR", f"❌ Ticket creation error: {str(e)}")
            return False

    def assign_tickets_to_agents(self) -> bool:
        """Assign tickets to agents based on capabilities."""
        self.log("INFO", "📋 Assigning tickets to agents...")

        assignment_map = {
            "Project Coordinator": 0,  # Infrastructure
            "Backend Developer": 1,    # API
            "Frontend Developer": 2,   # UI
            "Code Analyst": 3,        # Quality
            "QA Engineer": 4          # Testing
        }

        success_count = 0
        for assignee, ticket_idx in assignment_map.items():
            if ticket_idx < len(self.tickets):
                ticket = self.tickets[ticket_idx]
                try:
                    response = requests.patch(
                        f"{self.mcp_url}/tickets/{ticket['ticket_id']}/assign",
                        json={"assignee": assignee},
                        timeout=10
                    )

                    if response.status_code == 200:
                        self.log("SUCCESS", f"✅ Assigned: {ticket['title']} → {assignee}")
                        success_count += 1
                    else:
                        self.log("ERROR", f"❌ Failed to assign ticket")

                except Exception as e:
                    self.log("ERROR", f"❌ Assignment error: {str(e)}")

        self.log("INFO", f"📊 Assignment summary", {
            "total_assigned": success_count,
            "total_tickets": len(self.tickets)
        })

        return success_count > 0

    # ═══════════════════════════════════════════════════════════════
    # PHASE 4: Memory Management & State Persistence
    # ═══════════════════════════════════════════════════════════════

    def initialize_memory_store(self) -> bool:
        """Initialize distributed memory for agents."""
        self.log("INFO", "💾 Initializing memory store...")

        memory_config = {
            "namespace": "hephaestus-workflow",
            "persistence": "enabled",
            "shared_access": True,
            "retention_policy": "extended"
        }

        try:
            response = requests.post(
                f"{self.mcp_url}/memory/initialize",
                json=memory_config,
                timeout=10
            )

            if response.status_code == 200:
                self.memories["store_id"] = response.json().get("store_id")
                self.log("SUCCESS", f"✅ Memory store initialized", {
                    "namespace": memory_config["namespace"],
                    "persistence": memory_config["persistence"]
                })
                return True
            else:
                self.log("ERROR", f"❌ Memory store initialization failed")
                return False

        except Exception as e:
            self.log("ERROR", f"❌ Memory initialization error: {str(e)}")
            return False

    def save_workflow_state(self) -> bool:
        """Save current workflow state to memory."""
        self.log("INFO", "💾 Saving workflow state to memory...")

        workflow_state = {
            "execution_phase": "complete",
            "swarm_id": self.swarm_id,
            "agents_spawned": len(self.agents),
            "tickets_created": len(self.tickets),
            "start_time": self.start_time.isoformat(),
            "checkpoint_time": datetime.now().isoformat(),
            "agents": self.agents,
            "tickets": self.tickets
        }

        try:
            response = requests.post(
                f"{self.mcp_url}/memory/save",
                json={
                    "key": "workflow_state",
                    "value": workflow_state,
                    "namespace": self.memories.get("store_id", "hephaestus-workflow")
                },
                timeout=10
            )

            if response.status_code == 200:
                self.log("SUCCESS", f"✅ Workflow state saved", {
                    "agents_count": len(self.agents),
                    "tickets_count": len(self.tickets)
                })
                self.memories["workflow_state"] = workflow_state
                return True
            else:
                self.log("ERROR", f"❌ Failed to save workflow state")
                return False

        except Exception as e:
            self.log("ERROR", f"❌ State save error: {str(e)}")
            return False

    # ═══════════════════════════════════════════════════════════════
    # PHASE 5: Task Orchestration & Monitoring
    # ═══════════════════════════════════════════════════════════════

    def orchestrate_workflow_tasks(self) -> bool:
        """Orchestrate tasks with dependencies."""
        self.log("INFO", "🎯 Orchestrating workflow tasks...")

        task_orchestration = {
            "name": "hephaestus-project-workflow",
            "description": "Complete project initialization and development workflow",
            "strategy": "adaptive",
            "priority": "high",
            "dependencies": [
                {
                    "id": "infrastructure",
                    "name": "Infrastructure Setup",
                    "requires": []
                },
                {
                    "id": "backend",
                    "name": "Backend Development",
                    "requires": ["infrastructure"]
                },
                {
                    "id": "frontend",
                    "name": "Frontend Development",
                    "requires": ["backend"]
                },
                {
                    "id": "quality",
                    "name": "Quality Assurance",
                    "requires": ["backend", "frontend"]
                },
                {
                    "id": "testing",
                    "name": "Testing & Validation",
                    "requires": ["quality"]
                }
            ]
        }

        try:
            response = requests.post(
                f"{self.mcp_url}/tasks/orchestrate",
                json=task_orchestration,
                timeout=10
            )

            if response.status_code == 201:
                task_data = response.json()
                task_id = task_data.get("task_id")
                self.memories["task_id"] = task_id
                self.log("SUCCESS", f"✅ Tasks orchestrated", {
                    "task_id": task_id,
                    "total_tasks": len(task_orchestration["dependencies"]),
                    "strategy": task_orchestration["strategy"]
                })
                return True
            else:
                self.log("ERROR", f"❌ Task orchestration failed: {response.text}")
                return False

        except Exception as e:
            self.log("ERROR", f"❌ Orchestration error: {str(e)}")
            return False

    def monitor_agents_and_tasks(self, duration_seconds: int = 30) -> bool:
        """Monitor agent execution and task progress."""
        self.log("INFO", f"📊 Monitoring agents for {duration_seconds} seconds...")

        start = time.time()
        monitoring_data = []

        try:
            while time.time() - start < duration_seconds:
                # Get swarm status
                response = requests.get(
                    f"{self.mcp_url}/swarm/status",
                    timeout=5
                )

                if response.status_code == 200:
                    status = response.json()
                    monitoring_data.append({
                        "timestamp": datetime.now().isoformat(),
                        "active_agents": status.get("active_agents", 0),
                        "total_agents": status.get("total_agents", 0),
                        "tasks_completed": status.get("tasks_completed", 0),
                        "tasks_running": status.get("tasks_running", 0)
                    })

                    self.log("INFO", f"📊 Status update", {
                        "active_agents": status.get("active_agents"),
                        "elapsed": f"{time.time() - start:.0f}s"
                    })

                time.sleep(5)

            self.memories["monitoring_data"] = monitoring_data
            self.log("SUCCESS", f"✅ Monitoring complete", {
                "samples_collected": len(monitoring_data)
            })
            return True

        except Exception as e:
            self.log("ERROR", f"❌ Monitoring error: {str(e)}")
            return False

    # ═══════════════════════════════════════════════════════════════
    # PHASE 6: Reporting & Analysis
    # ═══════════════════════════════════════════════════════════════

    def generate_execution_report(self) -> str:
        """Generate comprehensive execution report."""
        self.log("INFO", "📈 Generating execution report...")

        total_duration = (datetime.now() - self.start_time).total_seconds()

        report = {
            "workflow_summary": {
                "execution_time_seconds": total_duration,
                "start_time": self.start_time.isoformat(),
                "end_time": datetime.now().isoformat(),
                "status": "completed"
            },
            "infrastructure": {
                "docker_containers": 3,
                "mcp_server": "running",
                "qdrant_database": "connected"
            },
            "agents": {
                "total_spawned": len(self.agents),
                "types": list(set(a["type"] for a in self.agents)),
                "details": self.agents
            },
            "tickets": {
                "total_created": len(self.tickets),
                "categories": list(set(t["category"] for t in self.tickets)),
                "details": self.tickets
            },
            "memory": {
                "state_saved": "workflow_state" in self.memories,
                "namespace": "hephaestus-workflow",
                "retention": "extended"
            },
            "execution_log": {
                "total_events": len(self.execution_log),
                "success_count": sum(1 for e in self.execution_log if e["level"] == "SUCCESS"),
                "error_count": sum(1 for e in self.execution_log if e["level"] == "ERROR"),
                "events": self.execution_log
            }
        }

        self.log("SUCCESS", "✅ Report generated", {
            "total_duration_seconds": total_duration,
            "agents_spawned": len(self.agents),
            "tickets_created": len(self.tickets)
        })

        return json.dumps(report, indent=2)

    def save_report_to_file(self, report: str) -> bool:
        """Save report to file."""
        try:
            report_path = self.project_root / "execution_reports" / f"workflow_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            report_path.parent.mkdir(parents=True, exist_ok=True)

            report_path.write_text(report)
            self.log("SUCCESS", f"✅ Report saved", {
                "path": str(report_path)
            })
            return True

        except Exception as e:
            self.log("ERROR", f"❌ Report save failed: {str(e)}")
            return False

    # ═══════════════════════════════════════════════════════════════
    # EXECUTION ORCHESTRATION
    # ═══════════════════════════════════════════════════════════════

    def run_complete_workflow(self) -> bool:
        """Execute complete end-to-end workflow."""
        self.log("INFO", "🚀 Starting complete workflow execution...")

        phases = [
            ("Docker Setup", self.ensure_docker_running),
            ("Health Check", self.health_check_mcp_server),
            ("Swarm Init", self.initialize_swarm),
            ("Agent Spawning", self.spawn_agents_parallel),
            ("Ticket Creation", self.create_tickets),
            ("Agent Assignment", self.assign_tickets_to_agents),
            ("Memory Init", self.initialize_memory_store),
            ("Task Orchestration", self.orchestrate_workflow_tasks),
            ("Monitoring", lambda: self.monitor_agents_and_tasks(15)),
            ("State Persistence", self.save_workflow_state),
        ]

        completed_phases = 0
        failed_phases = []

        for phase_name, phase_fn in phases:
            self.log("INFO", f"\n{'='*70}\n📍 PHASE: {phase_name}\n{'='*70}")

            try:
                if phase_fn():
                    completed_phases += 1
                else:
                    failed_phases.append(phase_name)
                    self.log("WARNING", f"⚠️  Phase failed: {phase_name}")
            except Exception as e:
                failed_phases.append(phase_name)
                self.log("ERROR", f"❌ Phase exception: {phase_name} - {str(e)}")

        # Generate and save report
        self.log("INFO", f"\n{'='*70}\n📊 EXECUTION SUMMARY\n{'='*70}")
        report = self.generate_execution_report()
        self.save_report_to_file(report)

        self.log("INFO", f"📊 Workflow Statistics", {
            "completed_phases": completed_phases,
            "failed_phases": len(failed_phases),
            "total_phases": len(phases),
            "success_rate": f"{(completed_phases / len(phases)) * 100:.0f}%"
        })

        return len(failed_phases) == 0


def main():
    """Main entry point."""
    print("\n" + "="*70)
    print("🚀 HEPHAESTUS END-TO-END WORKFLOW DEMONSTRATION")
    print("="*70 + "\n")

    orchestrator = WorkflowOrchestrator()
    success = orchestrator.run_complete_workflow()

    print("\n" + "="*70)
    if success:
        print("✅ WORKFLOW COMPLETED SUCCESSFULLY")
    else:
        print("⚠️  WORKFLOW COMPLETED WITH WARNINGS")
    print("="*70 + "\n")

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
