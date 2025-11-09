#!/usr/bin/env python3
"""
Move resolved tickets to the "done" column.

This script finds all tickets that are marked as resolved (is_resolved=True)
but are not in the "done" status column, and moves them to "done".
"""

import sys
from datetime import datetime
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.core.database import DatabaseManager, Ticket, TicketHistory, Workflow
from src.phases.phase_manager import PhaseManager


def move_resolved_tickets():
    """Move all resolved tickets to the done column."""
    
    db = DatabaseManager('/app/data/hephaestus.db')
    phase_manager = PhaseManager(db)
    session = db.get_session()
    
    try:
        # Find all resolved tickets that are not in "done" status
        resolved_tickets = session.query(Ticket).filter(
            Ticket.is_resolved == True,
            Ticket.status != 'done'
        ).all()
        
        print(f"🔍 Found {len(resolved_tickets)} resolved tickets not in 'done' status\n")
        
        if not resolved_tickets:
            print("✅ All resolved tickets are already in 'done' status!")
            return
        
        # Group by workflow to get board config
        tickets_by_workflow = {}
        for ticket in resolved_tickets:
            if ticket.workflow_id not in tickets_by_workflow:
                tickets_by_workflow[ticket.workflow_id] = []
            tickets_by_workflow[ticket.workflow_id].append(ticket)
        
        # Ask for confirmation
        print("The following tickets will be moved to 'done':")
        for workflow_id, tickets in tickets_by_workflow.items():
            workflow = session.query(Workflow).filter_by(id=workflow_id).first()
            print(f"\n  Workflow: {workflow.name if workflow else workflow_id}")
            for ticket in tickets:
                print(f"    • {ticket.id[:30]}... - {ticket.title[:50]}...")
                print(f"      Current status: {ticket.status} → Will move to: done")
        
        print(f"\n⚠️  This will move {len(resolved_tickets)} tickets to 'done' status.")
        response = input("Continue? (yes/no): ")
        
        if response.lower() not in ['yes', 'y']:
            print("❌ Operation cancelled")
            return
        
        # Move each ticket
        moved_count = 0
        failed_count = 0
        
        for workflow_id, tickets in tickets_by_workflow.items():
            # Get the done status for this workflow
            done_status = "done"  # Default
            try:
                workflow_config = phase_manager.get_workflow_config(workflow_id)
                if workflow_config and workflow_config.board_config:
                    columns = workflow_config.board_config.get("columns", [])
                    if columns:
                        last_column = max(columns, key=lambda c: c.get("order", 0))
                        done_status = last_column.get("id", "done")
            except Exception as e:
                print(f"  ⚠️  Warning: Could not get board config for workflow {workflow_id}, using 'done': {e}")
            
            for ticket in tickets:
                try:
                    print(f"\n🔧 Moving ticket {ticket.id[:30]}... to '{done_status}'")
                    
                    old_status = ticket.status
                    ticket.status = done_status
                    ticket.updated_at = datetime.utcnow()
                    
                    # Record status change in history
                    history_entry = TicketHistory(
                        ticket_id=ticket.id,
                        agent_id='system',
                        change_type="status_changed",
                        field_name="status",
                        old_value=old_status,
                        new_value=done_status,
                        change_description=f"Moved resolved ticket from {old_status} to {done_status}",
                        changed_at=datetime.utcnow(),
                    )
                    session.add(history_entry)
                    
                    moved_count += 1
                    print(f"  ✅ Moved from '{old_status}' to '{done_status}'")
                    
                except Exception as e:
                    failed_count += 1
                    print(f"  ❌ Failed: {e}")
        
        # Commit all changes
        session.commit()
        
        print(f"\n{'='*60}")
        print(f"📊 Operation Complete!")
        print(f"{'='*60}")
        print(f"  ✅ Moved: {moved_count}")
        print(f"  ❌ Failed: {failed_count}")
        print(f"  📝 Total: {len(resolved_tickets)}")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    move_resolved_tickets()

