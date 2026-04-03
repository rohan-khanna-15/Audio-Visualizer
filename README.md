# Audio Visualizer (Next.js + Node)

Real-time audio visualizer web app migrated to a modern split architecture:

- Frontend: Next.js (`frontend/`)
- Backend: Node.js + Express + SQLite (`backend/`)

## Features

- User login/register (student/admin roles)
- Audio/video upload and media library
- Realtime visualizer modes (Bars, Circular, Wave, Auto)
- Session recorder and analytics widgets
- Admin user/file management
- Detailed live audio statistics (RMS, centroid, rolloff, etc.)

## Project Structure

```text
CP/
  backend/
    server.js
    data/
    uploads/
  frontend/
    app/
    public/
    next.config.mjs
```

## Prerequisites

- Node.js 18+
- npm

## Setup

Install dependencies (if not already installed):

```powershell
cd backend
npm install

cd ../frontend
npm install
```

## Run Locally

Start backend (port 3001):

```powershell
cd backend
npm start
```

Start frontend (port 3000):

```powershell
cd frontend
npm run dev
```

Open: `http://localhost:3000`

## Notes

- Frontend API calls are proxied to backend using `frontend/next.config.mjs` rewrites.
- Uploaded files and DB are stored under `backend/uploads` and `backend/data`.
- If you want a fresh DB, remove `backend/data/app.db` and restart backend.

## GitHub

Repository: `https://github.com/rohan-khanna-15/Audio-Visualizer`
