"""Add is_verified column to User table!!!

Revision ID: ecc668c4f221
Revises: 9b6b32d532d0
Create Date: 2024-12-18 18:15:55.224114

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ecc668c4f221'
down_revision: Union[str, None] = '9b6b32d532d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    pass
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    pass
    # ### end Alembic commands ###
