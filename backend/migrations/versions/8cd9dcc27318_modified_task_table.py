"""Modified task table: replaced video_url with video_id

Revision ID: 8cd9dcc27318
Revises: 0048b4ac23e1
Create Date: 2025-01-17 04:13:50.146487

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8cd9dcc27318'
down_revision = '0048b4ac23e1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add the video_id column
    op.add_column('task', sa.Column('video_id', sa.String(), nullable=True))
    
    # Add the foreign key constraint linking to video_reference
    op.create_foreign_key(
        'fk_task_video_reference',
        'task',
        'video_reference',
        ['video_id'],
        ['video_id']
    )

    # Drop the video_url column
    op.drop_column('task', 'video_url')


def downgrade() -> None:
    # Re-add the video_url column
    op.add_column('task', sa.Column('video_url', sa.Text(), nullable=True))

    # Drop the foreign key constraint and the video_id column
    op.drop_constraint('fk_task_video_reference', 'task', type_='foreignkey')
    op.drop_column('task', 'video_id')
