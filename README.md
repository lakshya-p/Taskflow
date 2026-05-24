# TaskFlow Platform

TaskFlow Platform is a backend-focused project operations system built with Node.js, Express, TypeScript, PostgreSQL, Redis, Prisma, Docker, and JWT authentication. It includes a compact React/Vite dashboard so the API can be demonstrated on Vercel without turning the project into a frontend-first app.

## Features

- JWT access tokens with refresh-token rotation and logout invalidation.
- Google and GitHub OAuth sign-in with account linking to the same JWT session flow.
- User profile APIs with password hashes excluded from all responses.
- Workspace management with `OWNER`, `ADMIN`, `MEMBER`, and `VIEWER` RBAC.
- Workspace member management with duplicate prevention and last-owner protection.
- Project and task APIs with filtering, pagination, sorting, assignment, and status tracking.
- Activity logs generated in service-layer mutations.
- Redis read-through caching for workspace, project, and task detail endpoints with TTL and invalidation.
- Centralized Zod validation, error handling, response formatting, rate limiting, Helmet, CORS, compression, and Pino logging.
- Docker Compose for local PostgreSQL, Redis, backend, and frontend.
- Vercel-compatible static frontend plus serverless Express API handler.
- Jest/Supertest integration tests for auth, protected routes, RBAC, and task CRUD.

## Tech Stack

- Backend: Node.js, Express, TypeScript, Prisma
- Database: PostgreSQL
- Cache: Redis with graceful fallback
- Security: JWT, bcrypt, Helmet, CORS, rate limiting, Zod validation
- Logging: Pino and pino-http
- Frontend: React, Vite, TypeScript, plain CSS
- Testing: Jest, Supertest
- Deployment: Docker Compose locally, Vercel with external PostgreSQL/Redis in production

## Architecture

The backend uses controller-service-repository separation:

- Controllers handle HTTP input/output.
- Services enforce business rules, RBAC-sensitive workflows, activity logging, and cache invalidation.
- Repositories isolate Prisma queries and select only needed fields.
- Middlewares handle auth, workspace role resolution, validation, rate limiting, and errors.

Main backend path: `backend/src`.

## Local Setup

1. Copy environment variables:

```bash
cp backend/.env.example backend/.env
```

2. Start PostgreSQL and Redis:

```bash
docker compose up postgres redis -d
```

3. Install dependencies:

```bash
npm run install:all
```

4. Run migrations and seed data:

```bash
cd backend
npx prisma migrate dev
npx prisma db seed
```

5. Start the backend:

```bash
cd backend
npm run dev
```

6. Start the frontend:

```bash
cd frontend
npm run dev
```

Frontend: `http://localhost:3000`
Backend: `http://localhost:5000/api/health`

## Docker Setup

Run the full stack:

```bash
docker compose up --build
```

The compose file starts:

- PostgreSQL on `5432`
- Redis on `6379`
- Backend on `5000`
- Frontend on `3000`

Seed after the services are up:

```bash
docker compose exec backend npx prisma db seed
```

## Demo Credentials

All seeded users use this password:

```text
DemoPass123!
```

Accounts:

- `owner@taskflow.dev`
- `admin@taskflow.dev`
- `viewer@taskflow.dev`

## Database Schema Overview

Models:

- `User`
- `RefreshToken`
- `Workspace`
- `WorkspaceMember`
- `Project`
- `Task`
- `ActivityLog`

Key constraints:

- User email is unique.
- Workspace membership is unique per `workspaceId + userId`.
- Indexed columns support auth lookup, workspace membership checks, project listing, task filtering/sorting, and activity-log queries.

## RBAC Rules

- `OWNER`: full workspace control, can delete workspace, can manage all member roles, cannot remove/demote the last owner.
- `ADMIN`: can update workspace details, invite members/viewers, manage members/viewers, and create/update/delete projects/tasks.
- `MEMBER`: can create/update/delete projects and tasks, but cannot manage workspace members.
- `VIEWER`: read-only access to workspace, members, projects, tasks, and activity.

## Redis Caching

Redis is used for detail endpoint caching:

- `workspace:{id}`
- `project:{id}`
- `task:{id}`

The cache service uses TTLs, logs hit/miss information in development, invalidates on update/delete, and falls back to database reads if Redis is unavailable.

## API Documentation

Full endpoint documentation is in [`docs/API.md`](docs/API.md).

Quick examples:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@taskflow.dev","password":"DemoPass123!"}'
```

```bash
curl -X POST http://localhost:5000/api/workspaces \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Interview Demo","description":"Backend-heavy workspace"}'
```

```bash
curl -X POST http://localhost:5000/api/workspaces/WORKSPACE_ID/projects \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"API Launch","status":"ACTIVE"}'
```

```bash
curl -X POST http://localhost:5000/api/projects/PROJECT_ID/tasks \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Ship RBAC middleware","priority":"HIGH"}'
```

```bash
curl -X PATCH http://localhost:5000/api/tasks/TASK_ID/status \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"DONE"}'
```

## Testing

Tests expect PostgreSQL and Redis to be reachable. For the default test URL, create a `taskflow_test` database or override `DATABASE_URL`.

```bash
docker compose up postgres redis -d
createdb taskflow_test
cd backend
npx prisma migrate deploy
npm test
```

## Vercel Deployment

Vercel does not run Docker Compose. Use managed PostgreSQL and Redis providers, then configure these environment variables in Vercel:

```text
NODE_ENV=production
DATABASE_URL=...
REDIS_URL=...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=10
CORS_ORIGIN=https://your-vercel-domain.vercel.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
VITE_API_BASE_URL=
OAUTH_REDIRECT_BASE_URL=https://your-api-domain
FRONTEND_URL=https://your-vercel-domain.vercel.app
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

OAuth callback URLs to register with providers:

- Google: `https://your-api-domain/api/auth/oauth/google/callback`
- GitHub: `https://your-api-domain/api/auth/oauth/github/callback`

Deployment uses:

- `frontend/dist` for the static dashboard.
- `api/index.ts` for the serverless Express API.
- `vercel.json` rewrites `/api/*` to the API handler and all other routes to the frontend.

Before first production use, run Prisma migrations against the production database:

```bash
cd backend
DATABASE_URL="your-production-url" npx prisma migrate deploy
```

