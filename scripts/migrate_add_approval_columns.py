#!/usr/bin/env python3
"""
Migration script to add approval-related columns to tickets table.

This adds the human approval workflow columns that were missing from the initial schema.
"""

import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import create_engine, text
from datetime import datetime

def migrate_database():
    """Add approval columns to tickets table."""

    # Get database path
    database_path = os.getenv("DATABASE_PATH", "./data/hephaestus.db")

    # Create engine
    engine = create_engine(
        f"sqlite:///{database_path}",
        connect_args={"check_same_thread": False}
    )

    print(f"🔧 Migrating database: {database_path}")

    with engine.connect() as conn:
        # Check if columns already exist
        result = conn.execute(text("PRAGMA table_info(tickets)"))
        columns = [row[1] for row in result]

        print(f"📋 Existing columns: {len(columns)}")

        # Columns to add
        migrations = [
            ("approval_status", "ALTER TABLE tickets ADD COLUMN approval_status VARCHAR(20) DEFAULT 'auto_approved' NOT NULL"),
            ("approval_requested_at", "ALTER TABLE tickets ADD COLUMN approval_requested_at DATETIME"),
            ("approval_decided_at", "ALTER TABLE tickets ADD COLUMN approval_decided_at DATETIME"),
            ("approval_decided_by", "ALTER TABLE tickets ADD COLUMN approval_decided_by VARCHAR(255)"),
            ("rejection_reason", "ALTER TABLE tickets ADD COLUMN rejection_reason TEXT"),
        ]

        added_count = 0
        skipped_count = 0

        for column_name, sql in migrations:
            if column_name in columns:
                print(f"  ⏭️  Skipping {column_name} (already exists)")
                skipped_count += 1
            else:
                try:
                    conn.execute(text(sql))
                    conn.commit()
                    print(f"  ✅ Added {column_name}")
                    added_count += 1
                except Exception as e:
                    print(f"  ❌ Failed to add {column_name}: {e}")

        print(f"\n📊 Migration Summary:")
        print(f"  ✅ Columns added: {added_count}")
        print(f"  ⏭️  Columns skipped: {skipped_count}")

        if added_count > 0:
            print(f"\n✅ Migration completed successfully!")
            print(f"🔄 Restart services to apply changes:")
            print(f"   docker compose restart")
        else:
            print(f"\n✅ Database schema is already up to date!")

if __name__ == "__main__":
    migrate_database()
