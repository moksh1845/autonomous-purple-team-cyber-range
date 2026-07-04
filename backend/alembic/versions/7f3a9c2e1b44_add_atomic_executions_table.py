"""add atomic_executions table and fix simulations.completed_at default

Revision ID: 7f3a9c2e1b44
Revises: 1d54d0780dd2
Create Date: 2026-06-30 00:00:00.000000

This migration accompanies the real Atomic Red Team integration
(orchestrator/attack_manager.py, services/execution_service.py) and the
fix for Simulation.completed_at, which previously had
server_default=func.now() identical to started_at -- meaning it never
actually reflected when a simulation finished, since both columns got the
same DB-side timestamp at INSERT time. completed_at is now nullable with
no server default, set explicitly in code only when execution completes.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "7f3a9c2e1b44"
down_revision: Union[str, Sequence[str], None] = "1d54d0780dd2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "atomic_executions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("attack_id", sa.Integer(), nullable=True),
        sa.Column("atomic_test_number", sa.Integer(), nullable=True),
        sa.Column("atomic_test_name", sa.String(length=255), nullable=True),
        sa.Column("command_executed", sa.Text(), nullable=True),
        sa.Column("exit_code", sa.Integer(), nullable=True),
        sa.Column("raw_output", sa.Text(), nullable=True),
        sa.Column(
            "executed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["attack_id"], ["attacks.id"], ondelete="CASCADE"
        ),
    )
    op.create_index(
        op.f("ix_atomic_executions_attack_id"),
        "atomic_executions",
        ["attack_id"],
        unique=False,
    )

    # Drop the server_default on completed_at -- previously identical to
    # started_at on every row, since both defaulted to func.now() at
    # INSERT time. Existing rows keep their (incorrect) values; only new
    # rows are affected going forward. No ALTER COLUMN TYPE is needed,
    # only the default removal.
    op.alter_column(
        "simulations",
        "completed_at",
        existing_type=sa.DateTime(timezone=True),
        server_default=None,
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "simulations",
        "completed_at",
        existing_type=sa.DateTime(timezone=True),
        server_default=sa.text("now()"),
        existing_nullable=True,
    )
    op.drop_index(
        op.f("ix_atomic_executions_attack_id"), table_name="atomic_executions"
    )
    op.drop_table("atomic_executions")
