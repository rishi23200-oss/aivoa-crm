"""
LangGraph AI Agent for HCP CRM Module
5 Tools: log_interaction, edit_interaction, get_hcp_history, suggest_follow_up, analyze_sentiment
"""

import os
import json
from typing import Annotated, TypedDict
from datetime import datetime

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from dotenv import load_dotenv
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./crm.db")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

llm = ChatGroq(model="gemma2-9b-it", api_key=GROQ_API_KEY, temperature=0.3)
llm_large = ChatGroq(model="gemma2-9b-it", api_key=GROQ_API_KEY, temperature=0.3)


# ── Tool 1: Log Interaction ─────────────────────────────────────────────────
@tool
async def log_interaction(hcp_name: str, interaction_type: str, date: str,
    topics_discussed: str, attendees: str = "", materials_shared: str = "",
    samples_distributed: str = "", outcomes: str = "", follow_up_actions: str = "", time: str = "") -> str:
    """Logs a new HCP interaction. Uses LLM for sentiment + summary."""
    try:
        summary_prompt = f"""Analyze this HCP interaction. Respond ONLY in JSON format like this:
{{"summary": "2 sentence summary here", "sentiment": "Positive"}}

HCP: {hcp_name}, Type: {interaction_type}, Topics: {topics_discussed}, Outcomes: {outcomes}

Important: sentiment must be exactly one of: Positive, Neutral, Negative"""
        
        response = llm.invoke([HumanMessage(content=summary_prompt)])
        ai_data = {"summary": "Interaction logged.", "sentiment": "Neutral"}
        try:
            raw = response.content.strip()
            if "```" in raw:
                raw = raw.split("```")[1].replace("json","").strip()
            start = raw.find("{")
            end = raw.rfind("}") + 1
            if start >= 0:
                ai_data = json.loads(raw[start:end])
        except:
            pass

        async with AsyncSessionLocal() as db:
            await db.execute(text("""
                INSERT INTO interactions 
                (hcp_name, interaction_type, date, time, attendees, topics_discussed, 
                 materials_shared, samples_distributed, sentiment, outcomes, 
                 follow_up_actions, ai_summary, created_at, updated_at)
                VALUES (:hcp_name, :interaction_type, :date, :time, :attendees, :topics_discussed,
                        :materials_shared, :samples_distributed, :sentiment, :outcomes,
                        :follow_up_actions, :ai_summary, :created_at, :updated_at)
            """), {
                "hcp_name": hcp_name, "interaction_type": interaction_type,
                "date": date, "time": time, "attendees": attendees,
                "topics_discussed": topics_discussed, "materials_shared": materials_shared,
                "samples_distributed": samples_distributed,
                "sentiment": ai_data.get("sentiment", "Neutral"),
                "outcomes": outcomes, "follow_up_actions": follow_up_actions,
                "ai_summary": ai_data.get("summary", ""),
                "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()
            })
            await db.commit()
        
        return json.dumps({
            "status": "success",
            "message": f"Interaction with {hcp_name} logged successfully!",
            "ai_summary": ai_data.get("summary", ""),
            "sentiment": ai_data.get("sentiment", "Neutral")
        })
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


# ── Tool 2: Edit Interaction ────────────────────────────────────────────────
@tool
async def edit_interaction(interaction_id: int, topics_discussed: str = None,
    outcomes: str = None, follow_up_actions: str = None, sentiment: str = None,
    hcp_name: str = None, materials_shared: str = None) -> str:
    """Edits an existing logged interaction by ID."""
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(text("SELECT * FROM interactions WHERE id = :id"), {"id": interaction_id})
            row = result.fetchone()
            if not row:
                return json.dumps({"status": "error", "message": f"Interaction ID {interaction_id} not found."})
            
            updates = {}
            if hcp_name: updates["hcp_name"] = hcp_name
            if topics_discussed: updates["topics_discussed"] = topics_discussed
            if outcomes: updates["outcomes"] = outcomes
            if follow_up_actions: updates["follow_up_actions"] = follow_up_actions
            if sentiment: updates["sentiment"] = sentiment
            if materials_shared: updates["materials_shared"] = materials_shared
            updates["updated_at"] = datetime.utcnow()

            set_clause = ", ".join([f"{k} = :{k}" for k in updates.keys()])
            updates["id"] = interaction_id
            await db.execute(text(f"UPDATE interactions SET {set_clause} WHERE id = :id"), updates)
            await db.commit()

        return json.dumps({"status": "success", "message": f"Interaction {interaction_id} updated successfully!"})
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


# ── Tool 3: Get HCP History ─────────────────────────────────────────────────
@tool
async def get_hcp_history(hcp_name: str, limit: int = 5) -> str:
    """Retrieves past interactions for a specific HCP."""
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(text("""
                SELECT id, interaction_type, date, topics_discussed, sentiment, ai_summary, outcomes
                FROM interactions WHERE hcp_name LIKE :name
                ORDER BY created_at DESC LIMIT :limit
            """), {"name": f"%{hcp_name}%", "limit": limit})
            rows = result.fetchall()
        
        if not rows:
            return json.dumps({"status": "no_data", "message": f"No interactions found for {hcp_name}."})
        
        data = [{"id": r[0], "type": r[1], "date": r[2], "topics": r[3],
                 "sentiment": r[4], "summary": r[5], "outcomes": r[6]} for r in rows]
        return json.dumps({"status": "success", "hcp": hcp_name, "interactions": data})
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


# ── Tool 4: Suggest Follow-Up ──────────────────────────────────────────────
@tool
async def suggest_follow_up(hcp_name: str, last_interaction_context: str) -> str:
    """Generates AI follow-up suggestions for a sales rep based on last HCP interaction."""
    try:
        prompt = f"""You are a Life Sciences sales coach. Give 3 specific follow-up actions for this rep.
HCP: {hcp_name}
Context: {last_interaction_context}
Respond ONLY in JSON: {{"suggestions": ["action1", "action2", "action3"]}}"""
        
        response = llm_large.invoke([HumanMessage(content=prompt)])
        raw = response.content.strip()
        if "```" in raw:
            raw = raw.split("```")[1].replace("json","").strip()
        start = raw.find("{")
        end = raw.rfind("}") + 1
        data = json.loads(raw[start:end]) if start >= 0 else {"suggestions": [raw]}
        return json.dumps({"status": "success", "hcp": hcp_name, "suggestions": data.get("suggestions", [])})
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


# ── Tool 5: Analyze Sentiment ──────────────────────────────────────────────
@tool
async def analyze_sentiment(interaction_text: str, hcp_name: str = "HCP") -> str:
    """Analyzes sentiment of a free-text interaction note using LLM."""
    try:
        prompt = f"""Analyze sentiment of this HCP interaction note.
Note: {interaction_text}
Respond ONLY in JSON: {{"sentiment": "Positive", "confidence": "High", "rationale": "one sentence"}}
sentiment must be exactly: Positive, Neutral, or Negative"""
        
        response = llm.invoke([HumanMessage(content=prompt)])
        raw = response.content.strip()
        if "```" in raw:
            raw = raw.split("```")[1].replace("json","").strip()
        start = raw.find("{")
        end = raw.rfind("}") + 1
        data = json.loads(raw[start:end]) if start >= 0 else {"sentiment": "Neutral", "confidence": "Low", "rationale": raw}
        return json.dumps({"status": "success", **data})
    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


# ── LangGraph Setup ────────────────────────────────────────────────────────
class AgentState(TypedDict):
    messages: Annotated[list, add_messages]

tools = [log_interaction, edit_interaction, get_hcp_history, suggest_follow_up, analyze_sentiment]
llm_with_tools = llm_large.bind_tools(tools)
tool_node = ToolNode(tools)

SYSTEM_PROMPT = """You are an AI assistant for a Life Sciences CRM. Help field reps manage HCP interactions.
You have 5 tools:
1. log_interaction - Log a new meeting/call with an HCP
2. edit_interaction - Update an existing logged interaction
3. get_hcp_history - View past interactions with any HCP
4. suggest_follow_up - Get AI follow-up recommendations
5. analyze_sentiment - Analyze tone/sentiment of an interaction

Always use tools when asked to log, edit, search, suggest, or analyze. Be concise and professional."""

def should_continue(state: AgentState):
    last = state["messages"][-1]
    if hasattr(last, "tool_calls") and last.tool_calls:
        return "tools"
    return END

def call_model(state: AgentState):
    messages = [SystemMessage(content=SYSTEM_PROMPT)] + state["messages"]
    response = llm_with_tools.invoke(messages)
    return {"messages": [response]}

graph_builder = StateGraph(AgentState)
graph_builder.add_node("agent", call_model)
graph_builder.add_node("tools", tool_node)
graph_builder.set_entry_point("agent")
graph_builder.add_conditional_edges("agent", should_continue)
graph_builder.add_edge("tools", "agent")
agent_graph = graph_builder.compile()


async def run_agent(user_message: str, history: list = None) -> dict:
    messages = []
    if history:
        for msg in history:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(AIMessage(content=msg["content"]))
    messages.append(HumanMessage(content=user_message))
    
    result = await agent_graph.ainvoke({"messages": messages})
    final = result["messages"][-1]
    return {"response": final.content, "messages": []}
