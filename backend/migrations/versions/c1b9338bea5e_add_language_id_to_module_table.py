"""Add language_id to module table

Revision ID: c1b9338bea5e
Revises: 65f8be3dc2d3
Create Date: 2025-01-15 23:26:08.606273

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c1b9338bea5e"
down_revision: Union[str, None] = "65f8be3dc2d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add the `language_id` column to the `module` table
    op.add_column(
        "module",
        sa.Column(
            "language_id",
            sa.Integer(),
            sa.ForeignKey("languages.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )

    # Set all existing modules to reference the default language (e.g., English with id=1)
    op.execute("UPDATE module SET language_id = 1")

    # Alter the `language_id` column to make it NOT NULL
    op.alter_column("module", "language_id", nullable=False)


def downgrade() -> None:
    # Drop the `language_id` column from the `module` table
    op.drop_column("module", "language_id")
