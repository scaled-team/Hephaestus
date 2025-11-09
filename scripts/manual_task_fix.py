#!/usr/bin/env python3
"""
Manually fix specific task descriptions.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.core.database import get_db, Task

def main():
    print("Manually fixing task descriptions...\n")
    
    with get_db() as db:
        # Fix task-a28fa79a (Frontend Infrastructure)
        task = db.query(Task).filter_by(id="task-a28fa79a-dac5-455c-b892-d5982fd91970").first()
        if task:
            desc = task.enriched_description or ""
            
            # Replace the specific line in the verification list
            desc = desc.replace(
                "- The dev server runs on **port 3000** (never 8000).",
                "- The production build succeeds with **no errors or warnings**."
            )
            
            # Remove "and shadcn/ui" to avoid Playwright false positive
            desc = desc.replace(
                ", ESLint, Prettier, and shadcn/ui.",
                ", ESLint, and Prettier."
            )
            
            task.enriched_description = desc
            print("✅ Fixed task-a28fa79a (Frontend Infrastructure)")
        
        # Fix task-47a51c6e (Dev Tools)
        task = db.query(Task).filter_by(id="task-47a51c6e-4b42-40a8-9ff5-2bad6d75375d").first()
        if task:
            desc = task.enriched_description or ""
            
            desc = desc.replace(
                "Verify that the dev server runs on port 3000 (never on port 8000)",
                "Verify that the production build succeeds with no errors or warnings"
            )
            
            desc = desc.replace(
                "- Verify that the dev server runs on port 3000",
                "- Verify that the production build succeeds with no errors or warnings"
            )
            
            task.enriched_description = desc
            print("✅ Fixed task-47a51c6e (Dev Tools)")
        
        # Fix task-1263c9bb (Supabase client)
        task = db.query(Task).filter_by(id="task-1263c9bb-cb48-45e8-a8f1-e34fceb0dc69").first()
        if task:
            desc = task.enriched_description or ""
            
            desc = desc.replace(
                "start the server",
                "document how to start the server (in test instructions for Phase 3)"
            )
            
            task.enriched_description = desc
            print("✅ Fixed task-1263c9bb (Supabase client)")
        
        # Fix task-755a94b6 (Qdrant)
        task = db.query(Task).filter_by(id="task-755a94b6-7e2a-4859-8e6b-88b96fe83ddc").first()
        if task:
            desc = task.enriched_description or ""
            
            desc = desc.replace(
                "start the server",
                "document how to start the server (in test instructions for Phase 3)"
            )
            
            task.enriched_description = desc
            print("✅ Fixed task-755a94b6 (Qdrant)")
        
        db.commit()
        print("\n✅ All manual fixes applied!")


if __name__ == "__main__":
    main()

