"""add admin user

Revision ID: 4213a33d4c89
Revises: 8d6bd1b12e07
Create Date: 2025-10-25 16:21:06.197116
"""

from datetime import UTC, datetime
from typing import Sequence, Union
from uuid import uuid4

import sqlalchemy as sa
from sqlalchemy.sql import column, table

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "4213a33d4c89"
down_revision: Union[str, Sequence[str], None] = "8d6bd1b12e07"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    users_table = table(
        "users",
        column("id", sa.Uuid),
        column("email", sa.String),
        column("hashed_password", sa.String),
        column("registered_at", sa.DateTime),
    )

    admin_id = uuid4()

    # password is 'adminpassword'
    hashed_password = "$2b$12$ooXXEzALMo.RzR3Kh1ZG0eR4tZbamwPifnxkFfoiPnpZEy1MgclJK"

    op.bulk_insert(
        users_table,
        [
            {
                "id": admin_id,
                "email": "admin@example.com",
                "hashed_password": hashed_password,
                "registered_at": datetime.now(UTC),
            }
        ],
    )


def downgrade() -> None:
    op.execute("DELETE FROM users WHERE email = 'admin@example.com';")
