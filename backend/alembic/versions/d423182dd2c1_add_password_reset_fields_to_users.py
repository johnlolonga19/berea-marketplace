"""add password reset fields to users

Revision ID: d423182dd2c1
Revises: eaddfa31bab8
Create Date: 2026-11-06 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd423182dd2c1'
down_revision: Union[str, None] = 'eaddfa31bab8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('password_reset_code', sa.String(length=6), nullable=True))
    op.add_column(
        'users', sa.Column('password_reset_expires_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        'users',
        sa.Column('password_reset_attempts', sa.Integer(), nullable=False, server_default='0'),
    )


def downgrade() -> None:
    op.drop_column('users', 'password_reset_attempts')
    op.drop_column('users', 'password_reset_expires_at')
    op.drop_column('users', 'password_reset_code')
