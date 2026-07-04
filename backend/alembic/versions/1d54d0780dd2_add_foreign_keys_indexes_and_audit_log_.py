"""add foreign keys, indexes, and audit log timestamp fix

Revision ID: 1d54d0780dd2
Revises: 5ad13eeeeafb
Create Date: 2026-06-20 18:31:53.966484
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "1d54d0780dd2"
down_revision: Union[str, Sequence[str], None] = "5ad13eeeeafb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.alter_column(
        "attacks",
        "execution_time",
        existing_type=postgresql.TIMESTAMP(),
        type_=sa.DateTime(timezone=True),
        existing_nullable=True,
        existing_server_default=sa.text("CURRENT_TIMESTAMP"),
    )

    op.alter_column(
        "attacks",
        "status",
        existing_type=sa.VARCHAR(length=20),
        type_=sa.String(length=50),
        existing_nullable=True,
    )

    op.alter_column(
        "audit_logs",
        "timestamp",
        existing_type=postgresql.TIMESTAMP(),
        type_=sa.DateTime(timezone=True),
        existing_nullable=True,
        existing_server_default=sa.text("now()"),
    )

    op.alter_column(
        "detections",
        "detection_time",
        existing_type=postgresql.TIMESTAMP(),
        type_=sa.DateTime(timezone=True),
        existing_nullable=True,
        existing_server_default=sa.text("CURRENT_TIMESTAMP"),
    )

    op.alter_column(
        "users",
        "username",
        existing_type=sa.VARCHAR(length=100),
        nullable=False,
    )

    op.alter_column(
        "users",
        "email",
        existing_type=sa.VARCHAR(length=100),
        nullable=False,
    )

    op.alter_column(
        "users",
        "password_hash",
        existing_type=sa.VARCHAR(length=255),
        nullable=False,
    )

    op.alter_column(
        "users",
        "role",
        existing_type=sa.VARCHAR(length=50),
        nullable=False,
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.alter_column(
        "users",
        "role",
        existing_type=sa.VARCHAR(length=50),
        nullable=True,
    )

    op.alter_column(
        "users",
        "password_hash",
        existing_type=sa.VARCHAR(length=255),
        nullable=True,
    )

    op.alter_column(
        "users",
        "email",
        existing_type=sa.VARCHAR(length=100),
        nullable=True,
    )

    op.alter_column(
        "users",
        "username",
        existing_type=sa.VARCHAR(length=100),
        nullable=True,
    )

    op.alter_column(
        "detections",
        "detection_time",
        existing_type=sa.DateTime(timezone=True),
        type_=postgresql.TIMESTAMP(),
        existing_nullable=True,
        existing_server_default=sa.text("CURRENT_TIMESTAMP"),
    )

    op.alter_column(
        "audit_logs",
        "timestamp",
        existing_type=sa.DateTime(timezone=True),
        type_=postgresql.TIMESTAMP(),
        existing_nullable=True,
        existing_server_default=sa.text("now()"),
    )

    op.alter_column(
        "attacks",
        "status",
        existing_type=sa.String(length=50),
        type_=sa.VARCHAR(length=20),
        existing_nullable=True,
    )

    op.alter_column(
        "attacks",
        "execution_time",
        existing_type=sa.DateTime(timezone=True),
        type_=postgresql.TIMESTAMP(),
        existing_nullable=True,
        existing_server_default=sa.text("CURRENT_TIMESTAMP"),
    )