"""change metadata to video_metadata

Revision ID: 0048b4ac23e1
Revises: 2192a8828e86
Create Date: 2025-01-17 03:15:31.892749

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "0048b4ac23e1"
down_revision: Union[str, None] = "2192a8828e86"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Rename the column "metadata" to "video_metadata"
    op.alter_column(
        table_name="video_reference",
        column_name="metadata",
        new_column_name="video_metadata",
    )


def downgrade() -> None:
    # Revert the column name back to "metadata"
    op.alter_column(
        table_name="video_reference",
        column_name="video_metadata",
        new_column_name="metadata",
    )
