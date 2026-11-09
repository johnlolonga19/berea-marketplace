"""add last-read timestamps to conversations

Revision ID: fed47ca65d78
Revises: d423182dd2c1
Create Date: 2026-11-06 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fed47ca65d78'
down_revision: Union[str, None] = 'd423182dd2c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'conversations', sa.Column('buyer_last_read_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        'conversations', sa.Column('seller_last_read_at', sa.DateTime(timezone=True), nullable=True)
    )
    # Treat everything sent before this feature existed as already read, so
    # nobody gets a burst of stale unread badges on deploy.
    op.execute(
        "UPDATE conversations SET buyer_last_read_at = CURRENT_TIMESTAMP, "
        "seller_last_read_at = CURRENT_TIMESTAMP"
    )


def downgrade() -> None:
    op.drop_column('conversations', 'seller_last_read_at')
    op.drop_column('conversations', 'buyer_last_read_at')
