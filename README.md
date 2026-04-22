# 🏥 AIVOA CRM – AI-First HCP Interaction Module

> **Full Stack Developer Assignment | AIVOA.AI**  
> Built with React + Redux · FastAPI · LangGraph · Groq LLM · SQLite/PostgreSQL

---

## 📸 Overview

An AI-first Customer Relationship Management (CRM) system for Life Sciences field representatives to **log, manage, and analyze interactions with Healthcare Professionals (HCPs)**.

The **Log Interaction Screen** supports two modes:
- 📋 **Structured Form** — Traditional form-based logging with AI-powered follow-up suggestions
- 🤖 **AI Chat Interface** — Conversational logging powered by LangGraph + Groq LLM

---

## 🧠 Architecture

```
┌─────────────────────────────────────────────────────┐
│                  React Frontend                      │
│   Redux Store ─► InteractionForm / ChatInterface    │
│         └─► axios ─► FastAPI Backend               │
└────────────────────────┬────────────────────────────┘
                         │ HTTP
┌────────────────────────▼────────────────────────────┐
│              FastAPI (Python)                        │
│   /api/interactions  ─►  SQLAlchemy ORM             │
│   /api/chat          ─►  LangGraph Agent            │
│                               │                     │
│              ┌────────────────▼──────────────────┐  │
│              │       LangGraph Agent              │  │
│              │   ┌──────────────────────────┐    │  │
│              │   │  5 Tools via Groq LLM    │    │  │
│              │   │  1. log_interaction      │    │  │
│              │   │  2. edit_interaction     │    │  │
│              │   │  3. get_hcp_history      │    │  │
│              │   │  4. suggest_follow_up    │    │  │
│              │   │  5. analyze_sentiment    │    │  │
│              │   └──────────────────────────┘    │  │
│              └────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│           SQLite (dev) / PostgreSQL (prod)           │
└─────────────────────────────────────────────────────┘
```

---

## 🤖 LangGraph Agent & Tools

The LangGraph agent acts as an intelligent orchestrator that interprets natural language from field reps and routes to the appropriate tool.

### Tool 1: `log_interaction`
Captures interaction data from natural language or structured input. Uses the **Groq gemma2-9b-it** LLM to:
- Extract and summarize key discussion points
- Infer HCP sentiment (Positive/Neutral/Negative)
- Generate a concise AI summary
- Persist to database with all fields

### Tool 2: `edit_interaction`
Allows modification of any previously logged interaction by ID. Accepts partial updates — only provided fields are changed. Re-generates AI summary if content is updated.

### Tool 3: `get_hcp_history`
Retrieves the interaction history for any HCP (fuzzy name match). Returns the last N interactions sorted by most recent, giving reps full context before a visit.

### Tool 4: `suggest_follow_up`
Uses **llama-3.3-70b-versatile** to generate 3 specific, actionable follow-up steps for the field rep based on the interaction context. Suggestions can be directly added to the form.

### Tool 5: `analyze_sentiment`
Analyzes free-text interaction notes to infer HCP sentiment with confidence score and rationale. Helps reps understand the emotional tone of their last meeting.

---

## 🗄️ Database Schema

```sql
CREATE TABLE interactions (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    hcp_name          VARCHAR(255) NOT NULL,
    interaction_type  VARCHAR(100) NOT NULL,
    date              VARCHAR(50) NOT NULL,
    time              VARCHAR(50),
    attendees         TEXT,
    topics_discussed  TEXT,
    materials_shared  TEXT,
    samples_distributed TEXT,
    sentiment         VARCHAR(50) DEFAULT 'Neutral',
    outcomes          TEXT,
    follow_up_actions TEXT,
    ai_summary        TEXT,
    created_at        DATETIME,
    updated_at        DATETIME
);
```

---

## 🛠️ Tech Stack

| Layer       | Technology                                      |
|-------------|------------------------------------------------|
| Frontend    | React 18, Redux Toolkit, Axios                  |
| Styling     | Custom CSS with Google Inter font               |
| Backend     | Python 3.12, FastAPI, Uvicorn                   |
| AI Agent    | LangGraph 1.1+, LangChain                       |
| LLMs        | Groq `gemma2-9b-it`, `llama-3.3-70b-versatile` |
| Database    | SQLite (dev) / PostgreSQL (prod) via SQLAlchemy |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- Groq API key (free at https://console.groq.com)

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/aivoa-crm.git
cd aivoa-crm
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env — add your GROQ_API_KEY
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend runs at: `http://localhost:8000`  
API docs at: `http://localhost:8000/docs`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```

Frontend runs at: `http://localhost:3000`

---

## 📁 Project Structure

```
aivoa-crm/
├── backend/
│   ├── main.py          # FastAPI app, all REST + /api/chat endpoints
│   ├── agent.py         # LangGraph agent with 5 tools
│   ├── database.py      # SQLAlchemy models + async DB setup
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── App.js
    │   ├── store/
    │   │   ├── store.js             # Redux store
    │   │   ├── interactionsSlice.js # CRUD state management
    │   │   └── chatSlice.js         # Chat state management
    │   └── components/
    │       ├── LogInteractionScreen.jsx  # Main screen with sidebar
    │       ├── InteractionForm.jsx       # Structured form
    │       ├── ChatInterface.jsx         # AI chat interface
    │       └── InteractionsList.jsx      # Interactions panel with edit/delete
    └── package.json
```

---

## 🎥 Demo

> Video walkthrough demonstrates:
> 1. Logging interaction via structured form
> 2. AI Chat logging via natural language
> 3. All 5 LangGraph tools in action
> 4. Edit and delete interactions
> 5. AI-powered follow-up suggestions

---

## 🌐 API Endpoints

| Method | Endpoint                    | Description                     |
|--------|-----------------------------|---------------------------------|
| GET    | `/api/interactions`         | List all interactions           |
| POST   | `/api/interactions`         | Create new interaction          |
| PUT    | `/api/interactions/{id}`    | Update existing interaction     |
| DELETE | `/api/interactions/{id}`    | Delete interaction              |
| POST   | `/api/chat`                 | Chat with AI agent              |
| GET    | `/api/hcps`                 | List unique HCP names           |

---

## 📝 Notes

- Database defaults to SQLite for development. Set `DATABASE_URL=postgresql+asyncpg://...` in `.env` for production.
- All AI features require a valid `GROQ_API_KEY` in `.env`.
- CORS is open (`*`) for development — restrict in production.
