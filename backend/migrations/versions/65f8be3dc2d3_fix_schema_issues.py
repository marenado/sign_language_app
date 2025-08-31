"""Fix schema issues

Revision ID: 65f8be3dc2d3
Revises: 297c646e086f
Create Date: 2025-01-15 23:21:53.821826

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "65f8be3dc2d3"
down_revision: Union[str, None] = "297c646e086f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the `languages` table
    op.create_table(
        "languages",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("code", sa.String(length=10), unique=True, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
    )

    # Insert default language(s) into the `languages` table (optional)
    op.bulk_insert(
        sa.table(
            "languages",
            sa.Column("id", sa.Integer),
            sa.Column("code", sa.String),
            sa.Column("name", sa.String),
        ),
        [
            {"id": 1, "code": "en", "name": "English"},  # Add a default language
        ],
    )


def downgrade() -> None:
    # Drop the `languages` table
    op.drop_table("languages")
