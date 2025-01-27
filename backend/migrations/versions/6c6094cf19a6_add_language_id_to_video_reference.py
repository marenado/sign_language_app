"""Add language_id to video_reference

Revision ID: 6c6094cf19a6
Revises: fc64b80a2028
Create Date: 2025-01-27 21:52:04.602045
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# Revision identifiers, used by Alembic.
revision: str = "6c6094cf19a6"
down_revision: Union[str, None] = "fc64b80a2028"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Step 1: Add `language_id` column as nullable
    op.add_column(
        "video_reference",
        sa.Column("language_id", sa.Integer(), nullable=True),
    )

    # Step 2: Populate `language_id` with a default language
    op.execute(
        """
        UPDATE video_reference
        SET language_id = (
            SELECT id FROM languages WHERE code = 'en' LIMIT 1
        )
        """
    )

    # Step 3: Alter the column to be non-nullable
    op.alter_column("video_reference", "language_id", nullable=False)

    # Step 4: Add a foreign key constraint
    op.create_foreign_key(
        "fk_video_reference_language",  # Foreign key name
        "video_reference",              # Source table
        "languages",                    # Referenced table
        ["language_id"],                # Source column
        ["id"],                         # Referenced column
    )


def downgrade() -> None:
    # Drop the foreign key constraint
    op.drop_constraint("fk_video_reference_language", "video_reference", type_="foreignkey")

    # Drop the `language_id` column
    op.drop_column("video_reference", "language_id")
