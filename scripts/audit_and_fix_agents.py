#!/usr/bin/env python3
"""
Audit and fix stale agent records in the database.

This script:
1. Identifies agents marked as 'working' but with missing tmux sessions
2. Updates their status to 'terminated'
3. Kills orphaned tmux sessions for terminated agents
4. Logs all changes for review
"""

import sys
import os
from datetime import datetime
from typing import List, Tuple

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.core.database import DatabaseManager, Agent
from src.agents.manager import AgentManager
import libtmux


def get_active_tmux_sessions() -> set:
    """Get all active tmux session names."""
    try:
        server = libtmux.Server()
        sessions = server.list_sessions()
        return {session.name for session in sessions}
    except Exception as e:
        print(f"Error getting tmux sessions: {e}")
        return set()


def audit_agents(db_manager: DatabaseManager) -> Tuple[List[Agent], List[Agent]]:
    """
    Audit agents and identify stale records.

    Returns:
        Tuple of (stale_agents, valid_agents)
    """
    session = db_manager.get_session()
    try:
        # IMPORTANT: Expire all cached objects to force fresh query
        session.expire_all()

        # Get all agents that are not terminated
        active_agents = session.query(Agent).filter(
            Agent.status.in_(['working', 'idle', 'pending', 'assigned'])
        ).all()

        print(f"\n{'='*60}")
        print(f"AGENT AUDIT REPORT")
        print(f"{'='*60}\n")
        print(f"Total non-terminated agents in database (SQLAlchemy): {len(active_agents)}")

        # Also check with raw SQL to compare
        import sqlite3
        conn = sqlite3.connect('/app/data/hephaestus.db')
        cursor = conn.cursor()
        cursor.execute("""
            SELECT COUNT(*) FROM agents
            WHERE status IN ('working', 'idle', 'pending', 'assigned')
        """)
        raw_count = cursor.fetchone()[0]
        conn.close()
        print(f"Total non-terminated agents in database (Raw SQL): {raw_count}")

        if raw_count != len(active_agents):
            print(f"⚠️  WARNING: SQLAlchemy and raw SQL counts don't match!")
            print(f"   This indicates a session isolation issue.")
            print(f"   Using raw SQL to get accurate data...\n")

            # Get agents using raw SQL
            conn = sqlite3.connect('/app/data/hephaestus.db')
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, status, tmux_session_name, agent_type, created_at, current_task_id
                FROM agents
                WHERE status IN ('working', 'idle', 'pending', 'assigned')
            """)
            rows = cursor.fetchall()
            conn.close()

            # Convert to Agent-like objects for processing
            active_agents = []
            for row in rows:
                agent_id, status, tmux, agent_type, created_at, task_id = row
                # Create a minimal agent object
                agent = type('Agent', (), {
                    'id': agent_id,
                    'status': status,
                    'tmux_session_name': tmux,
                    'agent_type': agent_type,
                    'created_at': datetime.fromisoformat(created_at),
                    'current_task_id': task_id
                })()
                active_agents.append(agent)
        
        # Get active tmux sessions
        tmux_sessions = get_active_tmux_sessions()
        print(f"Active tmux sessions: {len(tmux_sessions)}")
        print(f"  Sessions: {sorted(tmux_sessions)}\n")
        
        # Categorize agents
        stale_agents = []
        valid_agents = []
        
        for agent in active_agents:
            if agent.tmux_session_name:
                if agent.tmux_session_name in tmux_sessions:
                    valid_agents.append(agent)
                else:
                    stale_agents.append(agent)
            else:
                # Agent without tmux session name is also stale
                stale_agents.append(agent)
        
        print(f"{'='*60}")
        print(f"AUDIT RESULTS")
        print(f"{'='*60}\n")
        print(f"✅ Valid agents (tmux session exists): {len(valid_agents)}")
        print(f"❌ Stale agents (tmux session missing): {len(stale_agents)}\n")
        
        if valid_agents:
            print(f"Valid Agents:")
            for agent in valid_agents:
                age = datetime.utcnow() - agent.created_at
                print(f"  - {agent.id[:8]}... ({agent.agent_type})")
                print(f"    Status: {agent.status}")
                print(f"    Tmux: {agent.tmux_session_name}")
                print(f"    Age: {age.total_seconds() / 3600:.1f}h")
                print(f"    Task: {agent.current_task_id[:8] if agent.current_task_id else 'None'}...")
                print()
        
        if stale_agents:
            print(f"Stale Agents (need cleanup):")
            for agent in stale_agents:
                age = datetime.utcnow() - agent.created_at
                print(f"  - {agent.id[:8]}... ({agent.agent_type})")
                print(f"    Status: {agent.status} ← STALE")
                print(f"    Tmux: {agent.tmux_session_name or 'None'}")
                print(f"    Age: {age.total_seconds() / 3600:.1f}h")
                print(f"    Task: {agent.current_task_id[:8] if agent.current_task_id else 'None'}...")
                print()
        
        return stale_agents, valid_agents
        
    finally:
        session.close()


def fix_stale_agents(db_manager: DatabaseManager, stale_agents: List[Agent], dry_run: bool = True):
    """
    Fix stale agent records by updating their status to 'terminated'.

    Args:
        db_manager: Database manager
        stale_agents: List of stale agents to fix
        dry_run: If True, only show what would be done without making changes
    """
    if not stale_agents:
        print("No stale agents to fix.")
        return

    print(f"\n{'='*60}")
    print(f"FIXING STALE AGENTS")
    print(f"{'='*60}\n")

    if dry_run:
        print("🔍 DRY RUN MODE - No changes will be made\n")
    else:
        print("⚠️  LIVE MODE - Changes will be committed to database\n")

    if not dry_run:
        # Use raw SQL to update agents (to avoid SQLAlchemy session issues)
        import sqlite3
        conn = sqlite3.connect('/app/data/hephaestus.db')
        cursor = conn.cursor()

        try:
            for agent in stale_agents:
                print(f"Agent {agent.id[:8]}... ({agent.agent_type})")
                print(f"  Current status: {agent.status}")
                print(f"  Tmux session: {agent.tmux_session_name or 'None'}")

                # Update using raw SQL
                cursor.execute("""
                    UPDATE agents
                    SET status = 'terminated'
                    WHERE id = ?
                """, (agent.id,))

                if cursor.rowcount > 0:
                    print(f"  ✅ Updated to: terminated")
                else:
                    print(f"  ❌ Agent not found in database")
                print()

            conn.commit()
            print(f"✅ Successfully updated {len(stale_agents)} agents to 'terminated' status")

        except Exception as e:
            conn.rollback()
            print(f"❌ Error fixing agents: {e}")
            raise
        finally:
            conn.close()
    else:
        # Dry run - just show what would be done
        for agent in stale_agents:
            print(f"Agent {agent.id[:8]}... ({agent.agent_type})")
            print(f"  Current status: {agent.status}")
            print(f"  Tmux session: {agent.tmux_session_name or 'None'}")
            print(f"  Would update to: terminated")
            print()

        print(f"ℹ️  Would update {len(stale_agents)} agents (dry run)")


def cleanup_orphaned_tmux_sessions(db_manager: DatabaseManager, dry_run: bool = True):
    """
    Clean up orphaned tmux sessions for terminated agents.

    Args:
        db_manager: Database manager
        dry_run: If True, only show what would be done without making changes
    """
    print(f"\n{'='*60}")
    print(f"CLEANING UP ORPHANED TMUX SESSIONS")
    print(f"{'='*60}\n")

    if dry_run:
        print("🔍 DRY RUN MODE - No changes will be made\n")
    else:
        print("⚠️  LIVE MODE - Tmux sessions will be killed\n")

    try:
        import libtmux
        import sqlite3

        # Get all tmux sessions
        try:
            server = libtmux.Server()
            sessions = server.list_sessions()
            tmux_sessions = {s.name: s for s in sessions}
        except Exception as e:
            print(f"❌ Failed to get tmux sessions: {e}")
            return

        # Get terminated agents with tmux sessions
        conn = sqlite3.connect('/app/data/hephaestus.db')
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, tmux_session_name, agent_type
            FROM agents
            WHERE status = 'terminated' AND tmux_session_name IS NOT NULL
        """)
        terminated_agents = cursor.fetchall()
        conn.close()

        orphaned_count = 0
        for agent_id, tmux_name, agent_type in terminated_agents:
            if tmux_name in tmux_sessions and tmux_name != 'hephaestus_keepalive':
                print(f"Orphaned session: {tmux_name}")
                print(f"  Agent: {agent_id[:8]}... ({agent_type})")
                print(f"  Status: terminated (but tmux session still exists)")

                if not dry_run:
                    try:
                        session = tmux_sessions[tmux_name]
                        session.kill_session()
                        print(f"  ✅ Killed tmux session")
                        orphaned_count += 1
                    except Exception as e:
                        print(f"  ❌ Failed to kill session: {e}")
                else:
                    print(f"  Would kill tmux session")
                    orphaned_count += 1
                print()

        if orphaned_count > 0:
            if not dry_run:
                print(f"✅ Killed {orphaned_count} orphaned tmux session(s)")
            else:
                print(f"ℹ️  Would kill {orphaned_count} orphaned tmux session(s)")
        else:
            print("No orphaned tmux sessions found.")

    except Exception as e:
        print(f"❌ Error cleaning up orphaned tmux sessions: {e}")


def main():
    """Main function."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Audit and fix stale agent records')
    parser.add_argument('--fix', action='store_true', help='Fix stale agents (default is dry-run)')
    parser.add_argument('--force', action='store_true', help='Skip confirmation prompt')
    args = parser.parse_args()
    
    db_manager = DatabaseManager()
    
    # Audit agents
    stale_agents, valid_agents = audit_agents(db_manager)

    # Fix stale agents if requested
    if args.fix:
        if stale_agents:
            if not args.force:
                print(f"\n⚠️  You are about to update {len(stale_agents)} agents to 'terminated' status.")
                response = input("Continue? (yes/no): ")
                if response.lower() not in ['yes', 'y']:
                    print("Aborted.")
                    return

            fix_stale_agents(db_manager, stale_agents, dry_run=False)
        else:
            print("\nNo stale agents to fix.")

        # Also clean up orphaned tmux sessions
        cleanup_orphaned_tmux_sessions(db_manager, dry_run=False)
    else:
        # Dry run
        fix_stale_agents(db_manager, stale_agents, dry_run=True)
        if stale_agents:
            print(f"\nℹ️  To fix these agents, run: python scripts/audit_and_fix_agents.py --fix")

        # Show what orphaned tmux sessions would be cleaned
        cleanup_orphaned_tmux_sessions(db_manager, dry_run=True)

    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'='*60}")
    print(f"Valid agents: {len(valid_agents)}")
    print(f"Stale agents: {len(stale_agents)}")
    print(f"Total: {len(valid_agents) + len(stale_agents)}")
    print()


if __name__ == '__main__':
    main()

