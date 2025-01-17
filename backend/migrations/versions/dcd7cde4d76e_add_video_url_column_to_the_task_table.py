"""Add video_url column to the task table

Revision ID: dcd7cde4d76e
Revises: c1b9338bea5e
Create Date: 2025-01-17 02:15:12.144324

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dcd7cde4d76e'
down_revision: Union[str, None] = 'c1b9338bea5e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add the 'video_url' column to the 'task' table
    op.add_column('task', sa.Column('video_url', sa.Text(), nullable=True))


def downgrade() -> None:
    # Remove the 'video_url' column from the 'task' table
    op.drop_column('task', 'video_url')

