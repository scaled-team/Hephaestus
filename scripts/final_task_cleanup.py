#!/usr/bin/env python3
"""
Final cleanup: Remove ALL mentions of running dev servers from tasks.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.core.database import get_db, Task

TASK_IDS = [
    "task-47a51c6e-4b42-40a8-9ff5-2bad6d75375d",
    "task-1263c9bb-cb48-45e8-a8f1-e34fceb0dc69",
    "task-a28fa79a-dac5-455c-b892-d5982fd91970",
    "task-755a94b6-7e2a-4859-8e6b-88b96fe83ddc",
    "task-99be4264-eb40-4e7f-9360-55e16ba4e034",
    "task-30701fb6-3dd5-4652-bbb9-67f21921aa0e",
]

def clean_description(desc: str) -> str:
    """Remove all dev server mentions."""
    
    # List of exact replacements
    replacements = {
        "- The dev server runs on **port 3000** (never 8000).": 
            "- The production build succeeds with **no errors or warnings**.",
        
        "Verify that the dev server runs on **port 3000** (never on port 8000)":
            "Verify that the production build succeeds with **no errors or warnings**",
        
        "verify that the dev server runs on port 3000":
            "verify that the production build succeeds with no errors or warnings",
        
        "start the dev server":
            "document how to start the dev server (in test instructions for Phase 3)",
        
        "run the server":
            "document how to run the server (in test instructions for Phase 3)",
    }
    
    new_desc = desc
    for old, new in replacements.items():
        new_desc = new_desc.replace(old, new)
    
    return new_desc


def main():
    print("Final cleanup of task descriptions...\n")
    
    with get_db() as db:
        for task_id in TASK_IDS:
            print(f"Processing {task_id}...")
            
            task = db.query(Task).filter_by(id=task_id).first()
            if not task:
                print(f"  ❌ Task not found")
                continue
            
            old_desc = task.enriched_description or ""
            new_desc = clean_description(old_desc)
            
            if new_desc != old_desc:
                task.enriched_description = new_desc
                print(f"  ✅ Updated")
            else:
                print(f"  ℹ️  No changes needed")
        
        db.commit()
        print("\n✅ Cleanup complete!")


if __name__ == "__main__":
    main()

