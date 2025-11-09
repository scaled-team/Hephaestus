#!/usr/bin/env python3
"""
Update tasks to remove mentions of running dev servers.
Replace with instructions to verify builds and document how to test.
"""

import requests
import re

BASE_URL = "http://localhost:8000"

# Task IDs to update
TASK_IDS = [
    "task-47a51c6e-4b42-40a8-9ff5-2bad6d75375d",
    "task-1263c9bb-cb48-45e8-a8f1-e34fceb0dc69",
    "task-a28fa79a-dac5-455c-b892-d5982fd91970",
    "task-755a94b6-7e2a-4859-8e6b-88b96fe83ddc",
    "task-99be4264-eb40-4e7f-9360-55e16ba4e034",
    "task-30701fb6-3dd5-4652-bbb9-67f21921aa0e",
]

def update_task_description(task_id: str, old_desc: str) -> str:
    """
    Update task description to remove dev server requirements.
    """
    new_desc = old_desc
    
    # Replace "Verify that the dev server runs on port 3000" with build verification
    new_desc = re.sub(
        r'Verify that the dev server runs on \*\*port 3000\*\*[^.]*\.',
        'Verify that the production build succeeds with **no errors or warnings**.',
        new_desc,
        flags=re.IGNORECASE
    )
    
    new_desc = re.sub(
        r'Verify that:\s*-\s*The dev server runs on \*\*port 3000\*\*[^.]*\.',
        'Verify that:\n- The production build succeeds with **no errors or warnings**.',
        new_desc,
        flags=re.IGNORECASE
    )
    
    # Replace "start the dev server" with "document how to start the server"
    new_desc = re.sub(
        r'start the dev server',
        'document how to start the dev server (in test instructions for Phase 3)',
        new_desc,
        flags=re.IGNORECASE
    )
    
    # Replace "run the server" with "document how to run the server"
    new_desc = re.sub(
        r'run the server',
        'document how to run the server (in test instructions for Phase 3)',
        new_desc,
        flags=re.IGNORECASE
    )
    
    # Replace "starts the dev server" with "documents how to start the dev server"
    new_desc = re.sub(
        r'starts the dev server',
        'documents how to start the dev server (for Phase 3 validation)',
        new_desc,
        flags=re.IGNORECASE
    )
    
    # Replace npm scripts list to remove 'dev' and 'start'
    new_desc = re.sub(
        r'npm scripts \(`dev`, `build`, `start`,',
        'npm scripts (`build`,',
        new_desc,
        flags=re.IGNORECASE
    )
    
    new_desc = re.sub(
        r'npm scripts for `dev`, `build`, `start`,',
        'npm scripts for `build`,',
        new_desc,
        flags=re.IGNORECASE
    )
    
    # Add clarification about not running servers
    if "🚫 DO NOT RUN DEV SERVERS" not in new_desc:
        # Add at the end before "All work must" or "All steps must"
        insertion_point = re.search(r'\n\n(All work must|All steps must|All actions must)', new_desc)
        if insertion_point:
            pos = insertion_point.start()
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
    
    return new_desc


def main():
    print("Updating tasks to remove dev server requirements...\n")
    
    for task_id in TASK_IDS:
        print(f"Processing {task_id}...")
        
        # Get current task
        response = requests.get(f"{BASE_URL}/api/tasks/{task_id}")
        if response.status_code != 200:
            print(f"  ❌ Failed to fetch task: {response.status_code}")
            continue
        
        task = response.json()
        old_desc = task.get("description", "")
        
        # Update description
        new_desc = update_task_description(task_id, old_desc)
        
        if new_desc == old_desc:
            print(f"  ℹ️  No changes needed")
            continue
        
        # Update task via API
        update_response = requests.put(
            f"{BASE_URL}/api/tasks/{task_id}",
            json={"description": new_desc}
        )
        
        if update_response.status_code == 200:
            print(f"  ✅ Updated successfully")
        else:
            print(f"  ❌ Failed to update: {update_response.status_code}")
            print(f"     {update_response.text}")
    
    print("\n✅ Task update complete!")


if __name__ == "__main__":
    main()

