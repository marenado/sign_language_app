"""Recreate video_reference

Revision ID: 7f76fa7f4f5a
Revises: 378a92cd87e2
Create Date: 2025-01-27 14:14:56.301509

"""
from typing import Sequence, Union


from sqlalchemy.dialects.postgresql import JSON
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7f76fa7f4f5a'
down_revision: Union[str, None] = '378a92cd87e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create video_reference table
    op.create_table(
        "video_reference",
        sa.Column("video_id", sa.String, primary_key=True, index=True),
        sa.Column("gloss", sa.String, nullable=False),
        sa.Column("signer_id", sa.Integer, nullable=True),
        sa.Column("video_metadata", JSON, nullable=True),
        sa.Column("video_url", sa.String, nullable=False)
    )


def downgrade() -> None:
    # Drop video_reference table
    op.drop_table("video_reference")