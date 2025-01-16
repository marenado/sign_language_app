from alembic import op
import sqlalchemy as sa

# Revision identifiers, used by Alembic.
revision = '297c646e086f'
down_revision = '032f4ad10b14'
branch_labels = None
depends_on = None

def upgrade():
    # Create the `languages` table
    op.create_table(
        'languages',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('code', sa.String(length=10), unique=True, nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
    )

def downgrade():
    # Drop the `languages` table
    op.drop_table('languages')
