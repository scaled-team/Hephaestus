#!/usr/bin/env python3
"""
Script to identify and clean up duplicate tickets in the database.

This script:
1. Finds all tickets with high similarity (>= 0.90)
2. Groups them by similarity
3. For each group, keeps the oldest ticket and marks others as duplicates
4. Optionally merges comments and history to the kept ticket
"""

import asyncio
import sys
import os
from datetime import datetime
from typing import List, Dict, Any, Set
import logging

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.core.database import get_db, Ticket, TicketComment, TicketHistory
from src.services.ticket_search_service import TicketSearchService

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)


async def find_duplicate_groups(workflow_id: str, similarity_threshold: float = 0.90) -> List[List[Dict[str, Any]]]:
    """
    Find groups of duplicate tickets.
    
    Args:
        workflow_id: Workflow to search in
        similarity_threshold: Minimum similarity to consider duplicates (default 0.90)
    
    Returns:
        List of duplicate groups, each group is a list of ticket dicts
    """
    logger.info(f"🔍 Searching for duplicate tickets (similarity >= {similarity_threshold:.0%})...")
    
    # Get all tickets in workflow
    with get_db() as db:
        tickets = db.query(Ticket).filter_by(workflow_id=workflow_id).all()
        logger.info(f"   Found {len(tickets)} total tickets in workflow")
    
    # Track which tickets we've already grouped
    processed_ticket_ids: Set[str] = set()
    duplicate_groups: List[List[Dict[str, Any]]] = []
    
    # For each ticket, find similar tickets
    for ticket in tickets:
        if ticket.id in processed_ticket_ids:
            continue
        
        # Find similar tickets
        similar_tickets = await TicketSearchService.find_related_tickets(
            ticket_id=ticket.id,
            limit=10
        )
        
        # Filter for high similarity (duplicates)
        duplicates = [
            t for t in similar_tickets 
            if t["similarity_score"] >= similarity_threshold
        ]
        
        if duplicates:
            # Create group with this ticket + its duplicates
            group = [{
                "ticket_id": ticket.id,
                "title": ticket.title,
                "status": ticket.status,
                "created_at": ticket.created_at,
                "similarity_score": 1.0  # Self-similarity
            }]
            
            for dup in duplicates:
                if dup["ticket_id"] not in processed_ticket_ids:
                    group.append(dup)
                    processed_ticket_ids.add(dup["ticket_id"])
            
            if len(group) > 1:
                duplicate_groups.append(group)
                processed_ticket_ids.add(ticket.id)
                logger.info(f"   Found duplicate group: {len(group)} tickets similar to '{ticket.title[:50]}...'")
    
    logger.info(f"\n✅ Found {len(duplicate_groups)} duplicate groups")
    return duplicate_groups


async def cleanup_duplicates(
    workflow_id: str,
    similarity_threshold: float = 0.90,
    dry_run: bool = True,
    merge_comments: bool = True
):
    """
    Clean up duplicate tickets.
    
    Args:
        workflow_id: Workflow to clean up
        similarity_threshold: Minimum similarity to consider duplicates
        dry_run: If True, only show what would be done without making changes
        merge_comments: If True, merge comments from duplicates to kept ticket
    """
    logger.info("=" * 80)
    logger.info("DUPLICATE TICKET CLEANUP")
    logger.info("=" * 80)
    logger.info(f"Workflow: {workflow_id}")
    logger.info(f"Similarity threshold: {similarity_threshold:.0%}")
    logger.info(f"Mode: {'DRY RUN (no changes)' if dry_run else 'LIVE (will make changes)'}")
    logger.info(f"Merge comments: {merge_comments}")
    logger.info("=" * 80)
    
    # Find duplicate groups
    duplicate_groups = await find_duplicate_groups(workflow_id, similarity_threshold)
    
    if not duplicate_groups:
        logger.info("\n✅ No duplicate tickets found!")
        return
    
    # Process each group
    total_to_remove = 0
    
    for i, group in enumerate(duplicate_groups, 1):
        logger.info(f"\n{'=' * 80}")
        logger.info(f"GROUP {i}/{len(duplicate_groups)}")
        logger.info(f"{'=' * 80}")
        
        # Sort by created_at to keep the oldest
        group_sorted = sorted(group, key=lambda x: x.get("created_at", datetime.max))
        
        kept_ticket = group_sorted[0]
        duplicate_tickets = group_sorted[1:]
        
        logger.info(f"\n✅ KEEP: {kept_ticket['ticket_id']}")
        logger.info(f"   Title: {kept_ticket['title']}")
        logger.info(f"   Created: {kept_ticket.get('created_at', 'unknown')}")
        logger.info(f"   Status: {kept_ticket['status']}")
        
        logger.info(f"\n❌ REMOVE ({len(duplicate_tickets)} duplicates):")
        for dup in duplicate_tickets:
            logger.info(f"   • {dup['ticket_id']}")
            logger.info(f"     Similarity: {dup['similarity_score']:.0%}")
            logger.info(f"     Created: {dup.get('created_at', 'unknown')}")
            total_to_remove += 1
        
        if not dry_run:
            # Actually perform cleanup
            with get_db() as db:
                for dup in duplicate_tickets:
                    dup_ticket = db.query(Ticket).filter_by(id=dup['ticket_id']).first()
                    if not dup_ticket:
                        continue
                    
                    # Merge comments if requested
                    if merge_comments:
                        comments = db.query(TicketComment).filter_by(ticket_id=dup['ticket_id']).all()
                        if comments:
                            logger.info(f"      Merging {len(comments)} comments to kept ticket...")
                            for comment in comments:
                                # Add note that this was from a duplicate
                                comment.content = f"[Merged from duplicate ticket {dup['ticket_id']}]\n\n{comment.content}"
                                comment.ticket_id = kept_ticket['ticket_id']
                    
                    # Update ticket to mark as duplicate
                    dup_ticket.status = "duplicate"
                    dup_ticket.description = (
                        f"[DUPLICATE] This ticket is a duplicate of {kept_ticket['ticket_id']}\n\n"
                        f"Original description:\n{dup_ticket.description}"
                    )
                    dup_ticket.updated_at = datetime.utcnow()
                
                db.commit()
                logger.info(f"      ✅ Marked as duplicate and merged data")
    
    # Summary
    logger.info(f"\n{'=' * 80}")
    logger.info("SUMMARY")
    logger.info(f"{'=' * 80}")
    logger.info(f"Duplicate groups found: {len(duplicate_groups)}")
    logger.info(f"Tickets to keep: {len(duplicate_groups)}")
    logger.info(f"Tickets to mark as duplicate: {total_to_remove}")
    
    if dry_run:
        logger.info(f"\n⚠️  DRY RUN - No changes were made")
        logger.info(f"   Run with --live to actually clean up duplicates")
    else:
        logger.info(f"\n✅ Cleanup complete!")


async def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Clean up duplicate tickets")
    parser.add_argument(
        "--workflow-id",
        help="Workflow ID to clean up (default: first workflow in DB)"
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.90,
        help="Similarity threshold for duplicates (default: 0.90)"
    )
    parser.add_argument(
        "--live",
        action="store_true",
        help="Actually perform cleanup (default is dry-run)"
    )
    parser.add_argument(
        "--no-merge-comments",
        action="store_true",
        help="Don't merge comments from duplicates"
    )
    
    args = parser.parse_args()
    
    # Get workflow ID
    workflow_id = args.workflow_id
    if not workflow_id:
        with get_db() as db:
            from src.core.database import Workflow
            workflow = db.query(Workflow).first()
            if not workflow:
                logger.error("❌ No workflow found in database")
                return
            workflow_id = workflow.id
            logger.info(f"Using first workflow: {workflow_id}")
    
    # Run cleanup
    await cleanup_duplicates(
        workflow_id=workflow_id,
        similarity_threshold=args.threshold,
        dry_run=not args.live,
        merge_comments=not args.no_merge_comments
    )


if __name__ == "__main__":
    asyncio.run(main())

