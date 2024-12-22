from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context
from app.database import Base 
from app.models.user import * 


# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from alembic import context

def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    This function creates a synchronous Engine for Alembic
    to apply migrations.
    """
    # Replace `asyncpg` with `psycopg2` in the database URL
    url = config.get_main_option("sqlalchemy.url").replace("asyncpg", "psycopg2")

    # Create a synchronous engine
    connectable: Engine = create_engine(url, poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,  # Optional: Ensures column types are compared
        )

        with context.begin_transaction():
            context.run_migrations()

# Determine whether to run offline or online migrations
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
