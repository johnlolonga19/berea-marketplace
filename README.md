# Berea Marketplace

[![Backend Tests](https://github.com/johnlolonga19/berea-marketplace/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/johnlolonga19/berea-marketplace/actions/workflows/backend-tests.yml)
[![Frontend Tests](https://github.com/johnlolonga19/berea-marketplace/actions/workflows/frontend-tests.yml/badge.svg)](https://github.com/johnlolonga19/berea-marketplace/actions/workflows/frontend-tests.yml)

A campus marketplace app — students can list items for sale, browse and search what others are selling, and message a seller directly, all gated behind email-verified accounts.

Built as a full-stack project: a FastAPI backend with a real Postgres database, and a React frontend, both fully tested with CI running on every push.

## Features

- **Accounts with real email verification** — sign up, get a 6-digit code emailed to you (via [Resend](https://resend.com)), enter it to activate your account. Login is blocked until verified.
- **Listings** — create, edit, delete, and mark items as sold. Photos upload to [Cloudinary](https://cloudinary.com).
- **Search & filtering** — keyword search across title/description, min/max price, and available/sold status.
- **In-app messaging** — message a listing's seller directly (Facebook Marketplace–style); a threaded inbox for both buyer and seller sides of a conversation.
- **Ownership-enforced permissions** — only a listing's owner can edit/delete/mark it sold; only a conversation's two participants can read or reply to it.

## Tech stack

**Backend** — Python, [FastAPI](https://fastapi.tiangolo.com/), [SQLAlchemy](https://www.sqlalchemy.org/) + [Alembic](https://alembic.sqlalchemy.org/) migrations, PostgreSQL, JWT auth (`python-jose` + `bcrypt`), [pytest](https://docs.pytest.org/).

**Frontend** — React 19 + TypeScript, [Vite](https://vite.dev/), [Tailwind CSS](https://tailwindcss.com/) v4, React Router, [Vitest](https://vitest.dev/) + React Testing Library.

**Infra** — GitHub Actions CI (backend and frontend test suites run independently on every push), Render (API + Postgres) and Netlify (static frontend) for deployment.

## Project structure

```
backend/
  app/
    core/        # settings, DB session, security (JWT, password hashing, verification codes)
    models/       # SQLAlchemy models: User, Listing, Conversation, Message
    schemas/      # Pydantic request/response schemas
    routers/      # auth, listings, uploads, conversations, health
    services/     # Cloudinary and Resend integrations
    seed.py       # demo user + sample listings for local dev
  alembic/         # migrations
  tests/           # pytest suite (runs against an isolated in-memory SQLite DB)

frontend/
  src/
    pages/         # one component per route
    components/    # shared UI (nav, listing card/form, protected route)
    context/        # AuthContext (JWT in localStorage)
    lib/api.ts      # typed fetch client for the backend

render.yaml          # Render Blueprint (backend web service + Postgres)
```

## Running locally

**Prerequisites:** Python 3.13, Node 20, 22, or 24+, PostgreSQL.

### Backend

```bash
cd backend
python3.13 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in DATABASE_URL, CLOUDINARY_*, RESEND_API_KEY
alembic upgrade head
python -m app.seed     # optional: creates demo@berea.edu / demopassword123 + sample listings
uvicorn app.main:app --reload --port 8001
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # set VITE_API_URL if the backend isn't on the default port
npm run dev
```

Open **http://localhost:5173**.

### Tests

```bash
# backend
cd backend && pip install -r requirements-dev.txt && pytest

# frontend
cd frontend && npm test
```

50 backend tests, 56 frontend tests — both suites also run in CI on every push (see `.github/workflows/`).

## API overview

All endpoints are under `/api/v1`.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/verify-code`, `POST /auth/resend-code`, `GET /auth/me` |
| Listings | `GET /listings` (search/filter via `q`, `min_price`, `max_price`, `is_sold`), `POST /listings`, `GET /listings/{id}`, `PATCH /listings/{id}`, `DELETE /listings/{id}` |
| Uploads | `POST /uploads/image` |
| Messaging | `POST /conversations`, `GET /conversations`, `GET /conversations/{id}`, `POST /conversations/{id}/messages` |

Interactive docs are available at `/docs` (Swagger UI) when the backend is running.
