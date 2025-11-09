#!/usr/bin/env python3
"""
Sync ticket status with completed tasks.

This script finds all completed tasks that have associated tickets which
are not yet resolved, and resolves them retroactively.
"""

import asyncio
import sys
from datetime import datetime
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.core.database import DatabaseManager, Task, Ticket
from src.services.ticket_service import TicketService


async def sync_tickets():
    """Sync ticket status with completed tasks."""
    
    db = DatabaseManager('/app/data/hephaestus.db')
    session = db.get_session()
    
    try:
        # Find all completed tasks with tickets that aren't resolved
        completed_tasks = session.query(Task).filter(
            Task.status == 'done',
            Task.ticket_id.isnot(None)
        ).all()
        
        print(f"🔍 Found {len(completed_tasks)} completed tasks with tickets\n")
        
        unresolved_tickets = []
        for task in completed_tasks:
            ticket = session.query(Ticket).filter_by(id=task.ticket_id).first()
            if ticket and not ticket.is_resolved:
                unresolved_tickets.append({
                    'task': task,
                    'ticket': ticket
                })
        
        print(f"📋 Found {len(unresolved_tickets)} tickets that need to be resolved\n")
        
        if not unresolved_tickets:
            print("✅ All tickets are already in sync!")
            return
        
        # Ask for confirmation
        print("The following tickets will be resolved:")
        for item in unresolved_tickets:
            task = item['task']
            ticket = item['ticket']
            print(f"  • Task {task.id[:8]} → Ticket {ticket.id[:30]}...")
            print(f"    Completed: {task.completed_at}")
            print(f"    Current status: {ticket.status}")
        
        print(f"\n⚠️  This will resolve {len(unresolved_tickets)} tickets.")
        response = input("Continue? (yes/no): ")
        
        if response.lower() not in ['yes', 'y']:
            print("❌ Sync cancelled")
            return
        
        # Resolve each ticket
        resolved_count = 0
        failed_count = 0
        
        for item in unresolved_tickets:
            task = item['task']
            ticket = item['ticket']
            
            try:
                print(f"\n🔧 Resolving ticket {ticket.id[:30]}... for task {task.id[:8]}")
                
                # Use the agent that completed the task, or 'system' if not available
                agent_id = task.assigned_agent_id or 'system'
                
                # Resolve the ticket
                result = await TicketService.resolve_ticket(
                    ticket_id=ticket.id,
                    agent_id=agent_id,
                    resolution_comment=f"[RETROACTIVE SYNC] Task {task.id} was completed at {task.completed_at}. {task.completion_notes or 'Task completed successfully.'}",
                    commit_sha=None  # No commit SHA for retroactive sync
                )
                
                resolved_count += 1
                print(f"  ✅ Resolved! Unblocked {len(result.get('unblocked_tickets', []))} tickets")
                
                if result.get('unblocked_tickets'):
                    print(f"     Unblocked: {result['unblocked_tickets']}")
                
            except Exception as e:
                failed_count += 1
                print(f"  ❌ Failed: {e}")
        
        print(f"\n{'='*60}")
        print(f"📊 Sync Complete!")
        print(f"{'='*60}")
        print(f"  ✅ Resolved: {resolved_count}")
        print(f"  ❌ Failed: {failed_count}")
        print(f"  📝 Total: {len(unresolved_tickets)}")
        
    finally:
        session.close()


if __name__ == "__main__":
    asyncio.run(sync_tickets())

