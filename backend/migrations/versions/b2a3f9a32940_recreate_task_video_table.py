"""Recreate task_video table

Revision ID: b2a3f9a32940
Revises: 7f76fa7f4f5a
Create Date: 2025-01-27 14:16:21.685057

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2a3f9a32940'
down_revision: Union[str, None] = '7f76fa7f4f5a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Recreate task_video table
    op.create_table(
        "task_video",
        sa.Column("task_id", sa.Integer, sa.ForeignKey("task.task_id", ondelete="CASCADE"), primary_key=True),
        sa.Column("video_id", sa.String, sa.ForeignKey("video_reference.video_id", ondelete="CASCADE"), primary_key=True)
    )


def downgrade() -> None:
    # Drop task_video table
    op.drop_table("task_video")
