#!/usr/bin/env python3
"""
Update tasks in database to remove mentions of running dev servers.
"""

import sys
import os
import re

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.core.database import get_db, Task

# Task IDs to update
TASK_IDS = [
    "task-47a51c6e-4b42-40a8-9ff5-2bad6d75375d",
    "task-1263c9bb-cb48-45e8-a8f1-e34fceb0dc69",
    "task-a28fa79a-dac5-455c-b892-d5982fd91970",
    "task-755a94b6-7e2a-4859-8e6b-88b96fe83ddc",
    "task-99be4264-eb40-4e7f-9360-55e16ba4e034",
    "task-30701fb6-3dd5-4652-bbb9-67f21921aa0e",
]

def update_description(old_desc: str) -> str:
    """Update task description to remove dev server requirements."""
    new_desc = old_desc

    # Replace specific phrases about running dev servers
    replacements = [
        # "- The dev server runs on **port 3000** (never 8000)."
        (r'-\s*The dev server runs on \*\*port 3000\*\* \(never 8000\)\.',
         '- The production build succeeds with **no errors or warnings**.'),

        # "Verify that the dev server runs on port 3000"
        (r'Verify that the dev server runs on port 3000',
         'Verify that the production build succeeds with no errors or warnings'),

        # "verify that the dev server runs on **port 3000**"
        (r'verify that the dev server runs on \*\*port 3000\*\*',
         'verify that the production build succeeds with **no errors or warnings**'),

        # "The dev server runs on **port 3000**"
        (r'The dev server runs on \*\*port 3000\*\*[^.]*\.',
         'The production build succeeds with **no errors or warnings**.'),

        # "start the dev server"
        (r'start the dev server',
         'document how to start the dev server (in test instructions for Phase 3)'),

        # "run the server"
        (r'run the server',
         'document how to run the server (in test instructions for Phase 3)'),

        # "starts the dev server"
        (r'starts the dev server',
         'documents how to start the dev server (for Phase 3 validation)'),

        # npm scripts with dev and start
        (r'npm scripts \(`dev`, `build`, `start`,',
         'npm scripts (`build`,'),

        (r'npm scripts for `dev`, `build`, `start`,',
         'npm scripts for `build`,'),

        (r'scripts: `dev`, `build`, `start`,',
         'scripts: `build`,'),

        # Remove Playwright
        (r'and Playwright[^.]*\.',
         '.'),

        (r', Playwright,',
         ','),
    ]

    for pattern, replacement in replacements:
        new_desc = re.sub(pattern, replacement, new_desc, flags=re.IGNORECASE)

    # Add critical warning if not present
    if "🚫 DO NOT RUN DEV SERVERS" not in new_desc and "🚫 CRITICAL: DO NOT RUN" not in new_desc:
        # Find insertion point - look for "All work must" or similar
        insertion_patterns = [
            r'\n\nAll work must',
            r'\n\nAll steps must',
            r'\n\nAll actions must',
            r'\n\n\*\*All work',
            r'\n\n\*\*Key constraints',
        ]

        for pattern in insertion_patterns:
            match = re.search(pattern, new_desc)
            if match:
                pos = match.start()
                new_desc = (
                    new_desc[:pos] +
                    "\n\n**🚫 CRITICAL: DO NOT RUN DEV SERVERS OR LONG-RUNNING PROCESSES! 🚫**\n"
                    "- ❌ DO NOT run `npm run dev`, `npm start`, or any dev server\n"
                    "- ❌ DO NOT run Playwright tests or any tests that start servers\n"
                    "- ✅ DO verify builds work: `npm run build`, `npm run type-check`, `npm run lint`\n"
                    "- ✅ DO run unit tests that exit when complete: `npm test` (Jest unit tests only)\n"
                    "- ✅ DO document in test instructions HOW to start the server (for Phase 3 to verify)\n"
                    "- **WHY**: Dev servers never exit and will block your agent from completing the task\n" +
                    new_desc[pos:]
                )
                break

    return new_desc


def main():
    print("Updating tasks in database to remove dev server requirements...\n")
    
    with get_db() as db:
        for task_id in TASK_IDS:
            print(f"Processing {task_id}...")
            
            task = db.query(Task).filter_by(id=task_id).first()
            if not task:
                print(f"  ❌ Task not found")
                continue

            # Use enriched_description which has the full details
            old_desc = task.enriched_description or task.raw_description or ""
            new_desc = update_description(old_desc)

            if new_desc == old_desc:
                print(f"  ℹ️  No changes needed")
                continue

            # Update enriched_description (the full description)
            task.enriched_description = new_desc

            print(f"  ✅ Updated")
        
        db.commit()
        print("\n✅ All tasks updated successfully!")


if __name__ == "__main__":
    main()

