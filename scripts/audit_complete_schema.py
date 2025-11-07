#!/usr/bin/env python3
"""
Complete database schema audit including all model files.

Compares ALL SQLAlchemy models (database.py + user_models.py) with actual database.
"""

import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import create_engine, inspect
from src.core.database import Base
import src.core.database as db_module
import src.core.user_models as user_module

def audit_complete_schema():
    """Audit complete database schema against all model definitions."""

    # Get database path
    database_path = os.getenv("DATABASE_PATH", "./data/hephaestus.db")

    # Create engine
    engine = create_engine(
        f"sqlite:///{database_path}",
        connect_args={"check_same_thread": False}
    )

    print("=" * 80)
    print("COMPLETE DATABASE SCHEMA AUDIT")
    print("=" * 80)
    print(f"Database: {database_path}\n")

    # Get all models from both modules
    model_tables = {}

    # Core database models
    for name, obj in vars(db_module).items():
        if isinstance(obj, type) and issubclass(obj, Base) and obj != Base:
            if hasattr(obj, '__tablename__'):
                table_name = obj.__tablename__
                model_tables[table_name] = {
                    'class': obj,
                    'module': 'database.py'
                }

    # User management models
    for name, obj in vars(user_module).items():
        if isinstance(obj, type) and issubclass(obj, Base) and obj != Base:
            if hasattr(obj, '__tablename__'):
                table_name = obj.__tablename__
                model_tables[table_name] = {
                    'class': obj,
                    'module': 'user_models.py'
                }

    print(f"📋 Found {len(model_tables)} model classes:\n")

    # Group by module
    db_models = [t for t, info in model_tables.items() if info['module'] == 'database.py']
    user_models = [t for t, info in model_tables.items() if info['module'] == 'user_models.py']

    print(f"  Core Models (database.py): {len(db_models)}")
    for table_name in sorted(db_models):
        print(f"    • {table_name}")
    print()

    print(f"  User Models (user_models.py): {len(user_models)}")
    for table_name in sorted(user_models):
        print(f"    • {table_name}")
    print()

    # Get all tables from database
    inspector = inspect(engine)
    db_tables = inspector.get_table_names()

    print(f"🗄️  Found {len(db_tables)} database tables\n")

    # Find missing/extra tables
    missing_tables = set(model_tables.keys()) - set(db_tables)
    extra_tables = set(db_tables) - set(model_tables.keys())

    if missing_tables:
        print("❌ MISSING TABLES (in models but not in database):")
        for table in sorted(missing_tables):
            module = model_tables[table]['module']
            print(f"  • {table} (from {module})")
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

    for table_name, model_info in sorted(model_tables.items()):
        if table_name not in db_tables:
            continue  # Skip missing tables

        model_class = model_info['class']

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
            print(f"📊 Table: {table_name} ({model_info['module']})")
            print(f"   Model columns: {len(model_columns)}")
            print(f"   DB columns:    {len(db_columns)}")

            if missing:
                print(f"   ❌ MISSING {len(missing)} columns in database:")
                all_missing_columns[table_name] = []
                for col_name in sorted(missing):
                    col = model_columns[col_name]
                    col_type = str(col.type)
                    nullable = "NULL" if col.nullable else "NOT NULL"
                    default = ""
                    if col.default:
                        if hasattr(col.default, 'arg'):
                            default = f"DEFAULT {repr(col.default.arg)}"
                        elif hasattr(col.default, '__str__'):
                            default = f"DEFAULT {col.default}"

                    print(f"      • {col_name} ({col_type}, {nullable} {default})".strip())

                    all_missing_columns[table_name].append({
                        'name': col_name,
                        'column': col,
                        'type': col_type,
                        'nullable': col.nullable,
                        'default': col.default
                    })

            if extra:
                print(f"   ℹ️  EXTRA {len(extra)} columns in database:")
                for col_name in sorted(extra):
                    print(f"      • {col_name}")

            print()

    # Summary
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print()

    total_model_tables = len(model_tables)
    total_db_tables = len(db_tables)
    total_missing_tables = len(missing_tables)
    total_extra_tables = len(extra_tables)
    total_tables_with_issues = len(all_missing_columns)
    total_missing_cols = sum(len(cols) for cols in all_missing_columns.values())

    print(f"📊 Tables:")
    print(f"   • Defined in models:  {total_model_tables}")
    print(f"   • Found in database:  {total_db_tables}")
    print(f"   • Missing tables:     {total_missing_tables}")
    print(f"   • Extra tables:       {total_extra_tables}")
    print()

    print(f"📋 Columns:")
    print(f"   • Tables with missing columns: {total_tables_with_issues}")
    print(f"   • Total missing columns:       {total_missing_cols}")
    print()

    if total_missing_tables == 0 and total_missing_cols == 0:
        print("✅ DATABASE SCHEMA IS COMPLETE!")
        print("   All model definitions match database structure.")
        print()
        if total_extra_tables > 0:
            print("ℹ️  Note: Extra tables found (FTS indexes, etc.) - this is expected.")
    else:
        print(f"⚠️  ACTION REQUIRED:")
        if total_missing_tables > 0:
            print(f"   • {total_missing_tables} tables need to be created")
        if total_missing_cols > 0:
            print(f"   • {total_missing_cols} columns need to be added")
        print()

        if all_missing_columns:
            print("📋 TABLES REQUIRING MIGRATION:")
            for table_name, columns in sorted(all_missing_columns.items()):
                module = model_tables[table_name]['module']
                print(f"   • {table_name} ({module}): {len(columns)} missing columns")
        print()

        print("💡 RECOMMENDATION:")
        print("   Create a migration script to add missing tables/columns.")

    print("=" * 80)

    return {
        'missing_tables': missing_tables,
        'extra_tables': extra_tables,
        'missing_columns': all_missing_columns,
        'total_issues': total_missing_tables + total_missing_cols
    }

if __name__ == "__main__":
    result = audit_complete_schema()
    sys.exit(1 if result['total_issues'] > 0 else 0)
