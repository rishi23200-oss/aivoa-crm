#!/bin/bash
echo "🏥 Starting AIVOA CRM..."

# Check .env
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "⚠️  Created backend/.env — please add your GROQ_API_KEY"
fi

# Backend in background
echo "🐍 Starting FastAPI backend on port 8000..."
cd backend && pip install -r requirements.txt -q && uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

sleep 2

# Frontend
echo "⚛️  Starting React frontend on port 3000..."
cd frontend && npm install -q && npm start &
FRONTEND_PID=$!

echo ""
echo "✅ Backend:  http://localhost:8000"
echo "✅ Frontend: http://localhost:3000"
echo "📖 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"

wait $BACKEND_PID $FRONTEND_PID
