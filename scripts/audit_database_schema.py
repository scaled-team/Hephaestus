#!/usr/bin/env python3
"""
Comprehensive database schema audit script.

Compares all SQLAlchemy model definitions with actual database schema
to identify missing tables and columns.
"""

import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import create_engine, text, inspect
from src.core.database import Base
import src.core.database as db_module

def audit_database_schema():
    """Audit database schema against model definitions."""

    # Get database path
    database_path = os.getenv("DATABASE_PATH", "./data/hephaestus.db")

    # Create engine
    engine = create_engine(
        f"sqlite:///{database_path}",
        connect_args={"check_same_thread": False}
    )

    print("=" * 80)
    print("DATABASE SCHEMA AUDIT")
    print("=" * 80)
    print(f"Database: {database_path}\n")

    # Get all tables from models
    model_tables = {}
    for name, obj in vars(db_module).items():
        if isinstance(obj, type) and issubclass(obj, Base) and obj != Base:
            if hasattr(obj, '__tablename__'):
                table_name = obj.__tablename__
                model_tables[table_name] = obj

    print(f"📋 Found {len(model_tables)} model classes:\n")
    for table_name in sorted(model_tables.keys()):
        print(f"  • {table_name}")
    print()

    # Get all tables from database
    inspector = inspect(engine)
    db_tables = inspector.get_table_names()

    print(f"🗄️  Found {len(db_tables)} database tables:\n")
    for table_name in sorted(db_tables):
        print(f"  • {table_name}")
    print()

    # Find missing tables
    missing_tables = set(model_tables.keys()) - set(db_tables)
    extra_tables = set(db_tables) - set(model_tables.keys())

    if missing_tables:
        print("❌ MISSING TABLES (in models but not in database):")
        for table in sorted(missing_tables):
            print(f"  • {table}")
        print()

    if extra_tables:
        print("⚠️  EXTRA TABLES (in database but not in models):")
        for table in sorted(extra_tables):
            print(f"  • {table}")
        print()

    # Check each table for missing columns
    print("=" * 80)
    print("COLUMN AUDIT")
    print("=" * 80)
    print()

    all_missing_columns = {}

    for table_name, model_class in sorted(model_tables.items()):
        if table_name not in db_tables:
            continue  # Skip missing tables (already reported above)

        # Get columns from model
        model_columns = {}
        for column in model_class.__table__.columns:
            model_columns[column.name] = column

        # Get columns from database
        db_columns = {}
        for col_info in inspector.get_columns(table_name):
            db_columns[col_info['name']] = col_info

        # Find missing columns
        missing = set(model_columns.keys()) - set(db_columns.keys())
        extra = set(db_columns.keys()) - set(model_columns.keys())

        if missing or extra:
            print(f"📊 Table: {table_name}")
            print(f"   Model columns: {len(model_columns)}")
            print(f"   DB columns:    {len(db_columns)}")

            if missing:
                print(f"   ❌ MISSING {len(missing)} columns in database:")
                all_missing_columns[table_name] = []
                for col_name in sorted(missing):
                    col = model_columns[col_name]
                    col_type = str(col.type)
                    nullable = "NULL" if col.nullable else "NOT NULL"
                    default = f"DEFAULT {col.default.arg}" if col.default and hasattr(col.default, 'arg') else ""

                    print(f"      • {col_name} ({col_type}, {nullable} {default})".strip())

                    all_missing_columns[table_name].append({
                        'name': col_name,
                        'column': col,
                        'type': col_type,
                        'nullable': col.nullable,
                        'default': col.default
                    })

            if extra:
                print(f"   ⚠️  EXTRA {len(extra)} columns in database:")
                for col_name in sorted(extra):
                    print(f"      • {col_name}")

            print()

    # Summary
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print()

    total_issues = len(missing_tables) + len(all_missing_columns)

    if total_issues == 0:
        print("✅ DATABASE SCHEMA IS UP TO DATE!")
        print("   All model definitions match database structure.")
    else:
        print(f"⚠️  FOUND {total_issues} ISSUES:")
        print(f"   • Missing tables: {len(missing_tables)}")
        print(f"   • Tables with missing columns: {len(all_missing_columns)}")
        print()

        total_missing_cols = sum(len(cols) for cols in all_missing_columns.values())
        print(f"   • Total missing columns: {total_missing_cols}")
        print()

        if all_missing_columns:
            print("📋 TABLES REQUIRING MIGRATION:")
            for table_name, columns in sorted(all_missing_columns.items()):
                print(f"   • {table_name}: {len(columns)} missing columns")
        print()

        print("💡 RECOMMENDATION:")
        print("   Run the comprehensive migration script to add all missing columns.")
        print("   Script: scripts/migrate_complete_schema.py")

    print()
    print("=" * 80)

    return {
        'missing_tables': missing_tables,
        'extra_tables': extra_tables,
        'missing_columns': all_missing_columns
    }

if __name__ == "__main__":
    result = audit_database_schema()

    # Exit with error code if issues found
    total_issues = len(result['missing_tables']) + len(result['missing_columns'])
    sys.exit(1 if total_issues > 0 else 0)
