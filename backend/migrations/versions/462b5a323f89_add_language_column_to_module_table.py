from alembic import op
import sqlalchemy as sa

# Revision identifiers, used by Alembic.
revision = '462b5a323f89'
down_revision = '032f4ad10b14'
branch_labels = None
depends_on = None

def upgrade():
    # Add the language column with a temporary default value
    op.add_column('module', sa.Column('language', sa.String(length=2), nullable=False, server_default='en'))

    # Remove the default constraint after existing rows are updated
    op.alter_column('module', 'language', server_default=None)

def downgrade():
    # Drop the language column
    op.drop_column('module', 'language')
