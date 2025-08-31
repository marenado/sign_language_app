"""created new taskvideo association table

Revision ID: aa40338be3b6
Revises: 84a20ffab7b3
Create Date: 2025-01-25 00:10:22.002988

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "aa40338be3b6"
down_revision: Union[str, None] = "84a20ffab7b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the task_video table
    op.create_table(
        "task_video",
        sa.Column(
            "task_id",
            sa.Integer,
            sa.ForeignKey("task.task_id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "video_id",
            sa.String,
            sa.ForeignKey("video_reference.video_id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )


def downgrade() -> None:
    # Drop the task_video table
    op.drop_table("task_video")
