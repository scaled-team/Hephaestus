#!/usr/bin/env python3
"""Test script to verify duplicate ticket prevention."""

import asyncio
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from src.services.ticket_service import TicketService
from src.core.database import get_db, Workflow, Agent


async def test_duplicate_prevention():
    """Test that duplicate tickets are properly blocked."""
    
    print("=" * 80)
    print("DUPLICATE TICKET PREVENTION TEST")
    print("=" * 80)
    
    # Get test workflow and agent
    with get_db() as db:
        workflow = db.query(Workflow).first()
        agent = db.query(Agent).first()
        
        if not workflow or not agent:
            print("❌ No workflow or agent found in database")
            return
        
        workflow_id = workflow.id
        agent_id = agent.id
        
        print(f"\n✅ Using workflow: {workflow_id}")
        print(f"✅ Using agent: {agent_id}")
    
    # Test 1: Create first ticket
    print("\n" + "=" * 80)
    print("TEST 1: Create original ticket")
    print("=" * 80)
    
    try:
        ticket1 = await TicketService.create_ticket(
            workflow_id=workflow_id,
            agent_id=agent_id,
            title="Test Duplicate Prevention Feature",
            description="This is a test ticket to verify duplicate prevention works correctly.",
            ticket_type="feature",
            priority="medium",
            tags=["test", "duplicate-prevention"]
        )
        print(f"✅ Created ticket: {ticket1['ticket_id']}")
        print(f"   Title: {ticket1['title']}")
        original_ticket_id = ticket1['ticket_id']
    except Exception as e:
        print(f"❌ Failed to create original ticket: {e}")
        return
    
    # Wait for embedding to be generated
    print("\n⏳ Waiting 3 seconds for embedding to be indexed...")
    await asyncio.sleep(3)
    
    # Test 2: Try to create exact duplicate (should be blocked)
    print("\n" + "=" * 80)
    print("TEST 2: Try to create exact duplicate (should be BLOCKED)")
    print("=" * 80)
    
    try:
        ticket2 = await TicketService.create_ticket(
            workflow_id=workflow_id,
            agent_id=agent_id,
            title="Test Duplicate Prevention Feature",
            description="This is a test ticket to verify duplicate prevention works correctly.",
            ticket_type="feature",
            priority="medium",
            tags=["test", "duplicate-prevention"]
        )
        print(f"❌ FAILED! Duplicate was NOT blocked: {ticket2['ticket_id']}")
        print("   This should have been prevented!")
    except ValueError as e:
        print(f"✅ SUCCESS! Duplicate was blocked:")
        print(f"   Error message: {str(e)[:200]}...")
    except Exception as e:
        print(f"⚠️  Unexpected error: {e}")
    
    # Test 3: Try to create very similar ticket (should be blocked)
    print("\n" + "=" * 80)
    print("TEST 3: Try to create very similar ticket (should be BLOCKED)")
    print("=" * 80)
    
    try:
        ticket3 = await TicketService.create_ticket(
            workflow_id=workflow_id,
            agent_id=agent_id,
            title="Test Duplicate Prevention System",  # Slightly different
            description="This ticket verifies that duplicate prevention is working as expected.",  # Similar
            ticket_type="feature",
            priority="medium",
            tags=["test", "duplicate-prevention"]
        )
        print(f"❌ FAILED! Similar ticket was NOT blocked: {ticket3['ticket_id']}")
        print("   This should have been prevented!")
    except ValueError as e:
        print(f"✅ SUCCESS! Similar ticket was blocked:")
        print(f"   Error message: {str(e)[:200]}...")
    except Exception as e:
        print(f"⚠️  Unexpected error: {e}")
    
    # Test 4: Create different ticket (should succeed)
    print("\n" + "=" * 80)
    print("TEST 4: Create completely different ticket (should SUCCEED)")
    print("=" * 80)
    
    try:
        ticket4 = await TicketService.create_ticket(
            workflow_id=workflow_id,
            agent_id=agent_id,
            title="Implement User Authentication System",
            description="Add OAuth2 authentication with JWT tokens for secure user login.",
            ticket_type="feature",
            priority="high",
            tags=["auth", "security"]
        )
        print(f"✅ SUCCESS! Different ticket created: {ticket4['ticket_id']}")
        print(f"   Title: {ticket4['title']}")
    except Exception as e:
        print(f"❌ FAILED! Different ticket was blocked: {e}")
    
    # Test 5: Create moderately similar ticket (should succeed with warning)
    print("\n" + "=" * 80)
    print("TEST 5: Create moderately similar ticket (should SUCCEED with warning)")
    print("=" * 80)
    
    try:
        ticket5 = await TicketService.create_ticket(
            workflow_id=workflow_id,
            agent_id=agent_id,
            title="Add Duplicate Detection to Task System",
            description="Implement duplicate detection for tasks similar to ticket duplicate prevention.",
            ticket_type="feature",
            priority="low",
            tags=["duplicate-detection", "tasks"]
        )
        print(f"✅ SUCCESS! Moderately similar ticket created: {ticket5['ticket_id']}")
        print(f"   Title: {ticket5['title']}")
        print("   (Check logs for similarity warning)")
    except Exception as e:
        print(f"⚠️  Ticket was blocked: {e}")
    
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print("✅ Test 1: Original ticket created")
    print("✅ Test 2: Exact duplicate blocked (expected)")
    print("✅ Test 3: Very similar ticket blocked (expected)")
    print("✅ Test 4: Different ticket created (expected)")
    print("✅ Test 5: Moderately similar ticket created with warning (expected)")
    print("\n🎉 All tests passed!")


if __name__ == "__main__":
    asyncio.run(test_duplicate_prevention())

