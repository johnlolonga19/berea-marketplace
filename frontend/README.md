# Berea Marketplace — Frontend

React + TypeScript + Vite SPA, styled with Tailwind CSS, talking to the FastAPI backend in `../backend`.

## Setup

```bash
npm install
cp .env.example .env   # set VITE_API_URL if the backend isn't on the default port
npm run dev
```

Requires the backend to be running (see `../backend/README` setup) and its `CORS_ORIGINS` to include this dev server's origin (`http://localhost:5173` by default).

## Demo data

Run `python -m app.seed` in `../backend` (with the venv active and `.env` pointing at your dev DB) to create a demo user and a handful of sample listings. Log in at `/login` with `demo@berea.edu` / `demopassword123`.

## Structure

- `src/lib/api.ts` — fetch wrapper for the backend's `/auth`, `/listings`, `/uploads` endpoints
- `src/context/AuthContext.tsx` — JWT stored in `localStorage`, exposes `useAuth()`
- `src/components/ProtectedRoute.tsx` — redirects to `/login` when signed out
- `src/pages/` — one component per route (see `src/App.tsx` for the route table)
