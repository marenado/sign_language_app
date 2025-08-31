"""updated task table with relationship to taskvideo table

Revision ID: 849bda82074d
Revises: aa40338be3b6
Create Date: 2025-01-25 00:13:37.789399

"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "849bda82074d"
down_revision: Union[str, None] = "aa40338be3b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Upgrade: Ensure the task table is properly linked to the task_video association table.
    """
    # Note: No direct changes to the `task` table itself; the relationship is defined via ORM models.
    pass


def downgrade() -> None:
    """
    Downgrade: Roll back any ORM-level changes, if necessary.
    """
    pass
