#!/bin/bash

echo "🚀 Starting PoldaJabarCatpers - Optimized Version"

# Start Backend
echo "📦 Starting Backend Server..."
cd /app/backend
NODE_ENV=development PORT=5000 node src/server.js &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"

# Wait a bit for backend to initialize
sleep 3

# Start Frontend
echo "🎨 Starting Frontend..."
cd /app/frontend
npm start &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "🎉 Application started successfully!"
echo "📍 Backend: http://localhost:5000"
echo "📍 Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for any process to exit
wait
