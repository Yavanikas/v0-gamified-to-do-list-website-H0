"""Add bonus_points and bonus_reason to tasks

Revision ID: 0002_task_bonus_points
Revises: 0001_initial
Create Date: 2024-06-13 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0002_task_bonus_points'
down_revision: Union[str, None] = '0001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tasks', sa.Column('bonus_points', sa.Integer(), server_default='50', nullable=False))
    op.add_column('tasks', sa.Column('bonus_reason', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('tasks', 'bonus_reason')
    op.drop_column('tasks', 'bonus_points')
