from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

load_dotenv()

from database import init_db, get_db, Interaction
from agent import run_agent


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="AIVOA CRM - HCP Module", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic Schemas ────────────────────────────────────────────────────────
class InteractionCreate(BaseModel):
    hcp_name: str
    interaction_type: str
    date: str
    time: Optional[str] = ""
    attendees: Optional[str] = ""
    topics_discussed: Optional[str] = ""
    materials_shared: Optional[str] = ""
    samples_distributed: Optional[str] = ""
    sentiment: Optional[str] = "Neutral"
    outcomes: Optional[str] = ""
    follow_up_actions: Optional[str] = ""


class InteractionUpdate(BaseModel):
    hcp_name: Optional[str] = None
    interaction_type: Optional[str] = None
    topics_discussed: Optional[str] = None
    outcomes: Optional[str] = None
    follow_up_actions: Optional[str] = None
    sentiment: Optional[str] = None


class ChatMessage(BaseModel):
    message: str
    history: Optional[List[dict]] = []


# ── Routes: Interactions ────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {"message": "AIVOA CRM Backend Running", "status": "ok"}


@app.get("/api/interactions")
async def list_interactions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Interaction).order_by(Interaction.created_at.desc())
    )
    interactions = result.scalars().all()
    return [
        {
            "id": i.id,
            "hcp_name": i.hcp_name,
            "interaction_type": i.interaction_type,
            "date": i.date,
            "time": i.time,
            "attendees": i.attendees,
            "topics_discussed": i.topics_discussed,
            "materials_shared": i.materials_shared,
            "samples_distributed": i.samples_distributed,
            "sentiment": i.sentiment,
            "outcomes": i.outcomes,
            "follow_up_actions": i.follow_up_actions,
            "ai_summary": i.ai_summary,
            "created_at": str(i.created_at),
        }
        for i in interactions
    ]


@app.get("/api/interactions/{interaction_id}")
async def get_interaction(interaction_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Interaction).where(Interaction.id == interaction_id)
    )
    interaction = result.scalar_one_or_none()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    return interaction


@app.post("/api/interactions")
async def create_interaction(data: InteractionCreate, db: AsyncSession = Depends(get_db)):
    interaction = Interaction(**data.model_dump())
    db.add(interaction)
    await db.commit()
    await db.refresh(interaction)
    return {"id": interaction.id, "message": "Interaction logged", "data": data.model_dump()}


@app.put("/api/interactions/{interaction_id}")
async def update_interaction(
    interaction_id: int, data: InteractionUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Interaction).where(Interaction.id == interaction_id)
    )
    interaction = result.scalar_one_or_none()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(interaction, field, value)
    await db.commit()
    return {"message": "Updated", "id": interaction_id}


@app.delete("/api/interactions/{interaction_id}")
async def delete_interaction(interaction_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Interaction).where(Interaction.id == interaction_id)
    )
    interaction = result.scalar_one_or_none()
    if not interaction:
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(interaction)
    await db.commit()
    return {"message": "Deleted"}


# ── Route: AI Chat Agent ────────────────────────────────────────────────────
@app.post("/api/chat")
async def chat_with_agent(body: ChatMessage):
    try:
        result = await run_agent(body.message, body.history)
        return {"response": result["response"], "status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Route: HCP Names (for autocomplete) ────────────────────────────────────
@app.get("/api/hcps")
async def get_hcps(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Interaction.hcp_name).distinct())
    names = [row[0] for row in result.fetchall()]
    return {"hcps": names}
