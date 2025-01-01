"""Add fields to lesson, user_activity_log, and progress tables

Revision ID: 76399fcb0aef
Revises: ecc668c4f221
Create Date: 2024-12-30 23:07:55.445979

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "76399fcb0aef"
down_revision: Union[str, None] = "ecc668c4f221"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new fields to `lesson` table
    op.add_column("lesson", sa.Column("duration", sa.Integer(), nullable=True))
    op.add_column("lesson", sa.Column("difficulty", sa.String(length=20), nullable=True))

    # Add new fields to `progress` table
    op.add_column("progress", sa.Column("time_spent", sa.Integer(), nullable=True))
    op.add_column("progress", sa.Column("attempts", sa.Integer(), nullable=False, server_default="1"))

    # Add new fields to `user_activity_log` table
    op.add_column("user_activity_log", sa.Column("duration", sa.Integer(), nullable=True))
    op.add_column("user_activity_log", sa.Column("activity_type", sa.String(length=20), nullable=True))


def downgrade() -> None:
    # Remove fields from `user_activity_log` table
    op.drop_column("user_activity_log", "activity_type")
    op.drop_column("user_activity_log", "duration")

    # Remove fields from `progress` table
    op.drop_column("progress", "attempts")
    op.drop_column("progress", "time_spent")

    # Remove fields from `lesson` table
    op.drop_column("lesson", "difficulty")
    op.drop_column("lesson", "duration")
