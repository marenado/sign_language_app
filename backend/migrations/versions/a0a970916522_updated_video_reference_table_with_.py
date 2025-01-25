"""updated video_reference table with relationship to taskvideo table

Revision ID: a0a970916522
Revises: 849bda82074d
Create Date: 2025-01-25 00:23:41.510472

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a0a970916522'
down_revision: Union[str, None] = '849bda82074d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # No structural changes to the video_reference table are needed
    # Relationships are managed at the ORM level.
    pass


def downgrade() -> None:
    # No actions needed for downgrade since no changes were made to the schema
    pass
