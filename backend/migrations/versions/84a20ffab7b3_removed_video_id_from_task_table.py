"""removed video_id from task table

Revision ID: 84a20ffab7b3
Revises: 8cd9dcc27318
Create Date: 2025-01-25 00:04:29.578098

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '84a20ffab7b3'
down_revision: Union[str, None] = '8cd9dcc27318'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove the video_id column from the task table
    with op.batch_alter_table("task") as batch_op:
        batch_op.drop_column("video_id")


def downgrade() -> None:
    # Add the video_id column back to the task table
    with op.batch_alter_table("task") as batch_op:
        batch_op.add_column(sa.Column("video_id", sa.String, sa.ForeignKey("video_reference.video_id"), nullable=True))
