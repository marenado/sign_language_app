"""updated task_video model

Revision ID: 2e40dc561bf3
Revises: a0a970916522
Create Date: 2025-01-25 01:21:44.622768

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "2e40dc561bf3"
down_revision: Union[str, None] = "a0a970916522"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ensure relationships are established with cascading deletes
    op.create_foreign_key(
        "fk_task_video_task_id",
        "task_video",
        "task",
        ["task_id"],
        ["task_id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_task_video_video_id",
        "task_video",
        "video_reference",
        ["video_id"],
        ["video_id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    # Drop foreign keys during downgrade
    op.drop_constraint("fk_task_video_task_id", "task_video", type_="foreignkey")
    op.drop_constraint("fk_task_video_video_id", "task_video", type_="foreignkey")
