"""created video_reference table for storing the videos

Revision ID: 2192a8828e86
Revises: dcd7cde4d76e
Create Date: 2025-01-17 02:48:51.718299

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2192a8828e86'
down_revision: Union[str, None] = 'dcd7cde4d76e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the video_reference table
    op.create_table(
        "video_reference",
        sa.Column("video_id", sa.String, primary_key=True, index=True, nullable=False),
        sa.Column("gloss", sa.String, nullable=False),
        sa.Column("signer_id", sa.Integer, nullable=True),
        sa.Column("metadata", sa.JSON, nullable=True),
        sa.Column("video_url", sa.String, nullable=False),
    )


def downgrade() -> None:
    # Drop the video_reference table
    op.drop_table("video_reference")
