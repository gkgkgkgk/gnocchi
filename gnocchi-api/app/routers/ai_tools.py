from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import schemas
from app.db import get_session
from app.models import AITool

router = APIRouter(prefix="/ai-tools", tags=["ai-tools"])


@router.get("", response_model=list[schemas.AIToolOut])
async def list_tools(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(AITool).order_by(AITool.name))
    return list(result.scalars().all())
