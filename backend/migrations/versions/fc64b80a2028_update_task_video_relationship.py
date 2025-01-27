"""Update task-video relationship

Revision ID: fc64b80a2028
Revises: b2a3f9a32940
Create Date: 2025-01-27 15:08:46.843107
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'fc64b80a2028'
down_revision: Union[str, None] = 'b2a3f9a32940'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Only create the table if it doesn't already exist
    if not op.get_bind().dialect.has_table(op.get_bind(), 'task_video'):
        op.create_table(
            'task_video',
            sa.Column('task_id', sa.Integer(), nullable=False),
            sa.Column('video_id', sa.String(), nullable=False),
            sa.ForeignKeyConstraint(['task_id'], ['task.task_id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['video_id'], ['video_reference.video_id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('task_id', 'video_id')
        )



def downgrade() -> None:
    # Drop the task_video table in case of downgrade
    op.drop_table('task_video')
