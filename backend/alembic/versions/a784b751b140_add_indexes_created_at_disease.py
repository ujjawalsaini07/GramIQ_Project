"""add indexes on created_at and predicted_disease

Revision ID: a784b751b140
Revises: 5926f4bb0165
Create Date: 2026-07-19 23:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a784b751b140'
down_revision: Union[str, None] = '5926f4bb0165'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Speeds up GET /api/v1/predictions (ordered by created_at)
    op.create_index(
        'ix_predictions_created_at', 'predictions', ['created_at'], unique=False
    )
    # Speeds up GET /api/v1/analytics/summary (grouped by predicted_disease)
    op.create_index(
        'ix_predictions_predicted_disease', 'predictions', ['predicted_disease'], unique=False
    )


def downgrade() -> None:
    op.drop_index('ix_predictions_predicted_disease', table_name='predictions')
    op.drop_index('ix_predictions_created_at', table_name='predictions')