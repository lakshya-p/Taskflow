# TaskFlow API Documentation

All successful responses use:

```json
{ "success": true, "message": "Message", "data": {} }
```

All errors use:

```json
{ "success": false, "message": "Error message", "errors": [] }
```

Private endpoints require:

```text
Authorization: Bearer ACCESS_TOKEN
```

## Auth

| Method | URL | Auth | Body |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | No | `{ "name": "Aarav", "email": "a@b.com", "password": "Password123!" }` |
| POST | `/api/auth/login` | No | `{ "email": "a@b.com", "password": "Password123!" }` |
| POST | `/api/auth/logout` | No | `{ "refreshToken": "token" }` |
| GET | `/api/auth/me` | Yes | None |
| POST | `/api/auth/refresh-token` | No | `{ "refreshToken": "token" }` |
| GET | `/api/auth/oauth/google` | No | Redirects to Google OAuth |
| GET | `/api/auth/oauth/google/callback` | No | Provider callback |
| GET | `/api/auth/oauth/github` | No | Redirects to GitHub OAuth |
| GET | `/api/auth/oauth/github/callback` | No | Provider callback |

Login returns `accessToken`, `refreshToken`, and `user`.

OAuth callbacks create or link a user by verified provider email, issue the same JWT/refresh-token pair, and redirect to the frontend with short-lived query parameters that the dashboard stores in local storage for the demo session.

## Users

| Method | URL | Auth | Role | Body |
| --- | --- | --- | --- | --- |
| GET | `/api/users/me` | Yes | Any user | None |
| PATCH | `/api/users/me` | Yes | Any user | `{ "name": "New Name", "email": "new@example.com" }` |
| GET | `/api/users/:id` | Yes | Any user | None |

Passwords and password hashes are never returned.

## Workspaces

| Method | URL | Auth | Role | Body / Query |
| --- | --- | --- | --- | --- |
| POST | `/api/workspaces` | Yes | Any user | `{ "name": "Engineering", "description": "API team" }` |
| GET | `/api/workspaces?page=1&limit=10` | Yes | Member of returned workspaces | Pagination query |
| GET | `/api/workspaces/:workspaceId` | Yes | OWNER, ADMIN, MEMBER, VIEWER | None |
| PATCH | `/api/workspaces/:workspaceId` | Yes | OWNER, ADMIN | `{ "name": "New name", "description": null }` |
| DELETE | `/api/workspaces/:workspaceId` | Yes | OWNER | None |

Creating a workspace automatically creates an `OWNER` membership for the creator.

## Members

| Method | URL | Auth | Role | Body / Query |
| --- | --- | --- | --- | --- |
| POST | `/api/workspaces/:workspaceId/members/invite` | Yes | OWNER, ADMIN | `{ "email": "user@example.com", "role": "MEMBER" }` |
| GET | `/api/workspaces/:workspaceId/members?page=1&limit=10` | Yes | OWNER, ADMIN, MEMBER, VIEWER | Pagination query |
| PATCH | `/api/workspaces/:workspaceId/members/:memberId/role` | Yes | OWNER, ADMIN | `{ "role": "VIEWER" }` |
| DELETE | `/api/workspaces/:workspaceId/members/:memberId` | Yes | OWNER, ADMIN | None |

Rules:

- Owner can manage any role.
- Admin can manage only members/viewers and cannot create admins/owners.
- The last owner cannot be removed or demoted.
- Duplicate workspace membership returns `409 Conflict`.

## Projects

| Method | URL | Auth | Role | Body / Query |
| --- | --- | --- | --- | --- |
| POST | `/api/workspaces/:workspaceId/projects` | Yes | OWNER, ADMIN, MEMBER | `{ "name": "API", "description": "REST APIs", "status": "ACTIVE" }` |
| GET | `/api/workspaces/:workspaceId/projects?status=ACTIVE&page=1&limit=10` | Yes | OWNER, ADMIN, MEMBER, VIEWER | Optional status and pagination |
| GET | `/api/projects/:projectId` | Yes | Workspace member | None |
| PATCH | `/api/projects/:projectId` | Yes | OWNER, ADMIN, MEMBER | `{ "name": "API v2", "status": "COMPLETED" }` |
| DELETE | `/api/projects/:projectId` | Yes | OWNER, ADMIN, MEMBER | None |

Project statuses: `PLANNED`, `ACTIVE`, `COMPLETED`, `ARCHIVED`.

## Tasks

| Method | URL | Auth | Role | Body / Query |
| --- | --- | --- | --- | --- |
| POST | `/api/projects/:projectId/tasks` | Yes | OWNER, ADMIN, MEMBER | `{ "title": "Build auth", "priority": "HIGH", "assignedTo": "userId" }` |
| GET | `/api/projects/:projectId/tasks` | Yes | Workspace member | Filters, pagination, sorting |
| GET | `/api/tasks/:taskId` | Yes | Workspace member | None |
| PATCH | `/api/tasks/:taskId` | Yes | OWNER, ADMIN, MEMBER | Partial task fields |
| DELETE | `/api/tasks/:taskId` | Yes | OWNER, ADMIN, MEMBER | None |
| PATCH | `/api/tasks/:taskId/status` | Yes | OWNER, ADMIN, MEMBER | `{ "status": "DONE" }` |
| PATCH | `/api/tasks/:taskId/assign` | Yes | OWNER, ADMIN, MEMBER | `{ "assignedTo": "userId" }` or `{ "assignedTo": null }` |

Task statuses: `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `BLOCKED`.

Task priorities: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.

Task list query params:

- `page`
- `limit`
- `status`
- `priority`
- `assignedTo`
- `dueDate`
- `search`
- `sortBy=createdAt|dueDate|priority`
- `sortOrder=asc|desc`

Tasks can only be assigned to users who are members of the task project's workspace.

## Activity

| Method | URL | Auth | Role | Query |
| --- | --- | --- | --- | --- |
| GET | `/api/workspaces/:workspaceId/activity?page=1&limit=10` | Yes | Workspace member | Pagination |
| GET | `/api/projects/:projectId/activity?page=1&limit=10` | Yes | Workspace member | Pagination |
| GET | `/api/tasks/:taskId/activity?page=1&limit=10` | Yes | Workspace member | Pagination |

Activity records include:

- `id`
- `action`
- `entityType`
- `entityId`
- `userId`
- `workspaceId`
- `metadata`
- `createdAt`

## Status Codes

- `200 OK`
- `201 Created`
- `400 Bad Request`
- `401 Unauthorized`
- `403 Forbidden`
- `404 Not Found`
- `409 Conflict`
- `422 Validation Error`
- `500 Internal Server Error`
