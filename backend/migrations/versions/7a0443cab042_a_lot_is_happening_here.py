"""a lot is happening here

Revision ID: 7a0443cab042
Revises: 2e40dc561bf3
Create Date: 2025-01-25 01:37:41.897465

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "7a0443cab042"
down_revision: Union[str, None] = "2e40dc561bf3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the existing constraints with their actual names
    op.drop_constraint("task_video_task_id_fkey", "task_video", type_="foreignkey")
    op.drop_constraint("task_video_video_id_fkey", "task_video", type_="foreignkey")

    # Recreate the constraints with the desired definitions
    op.create_foreign_key(
        "fk_task_video_task",
        "task_video",
        "task",
        ["task_id"],
        ["task_id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_task_video_video",
        "task_video",
        "video_reference",
        ["video_id"],
        ["video_id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    # Drop the newly created constraints
    op.drop_constraint("fk_task_video_task", "task_video", type_="foreignkey")
    op.drop_constraint("fk_task_video_video", "task_video", type_="foreignkey")

    # Restore the original constraints if necessary
    op.create_foreign_key(
        "task_video_task_id_fkey",
        "task_video",
        "task",
        ["task_id"],
        ["task_id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "task_video_video_id_fkey",
        "task_video",
        "video_reference",
        ["video_id"],
        ["video_id"],
        ondelete="CASCADE",
    )
