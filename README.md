# LearnSphere AI

A full-stack learning and assessment platform built to match junior full-stack engineering requirements.

## Stack
- React + TypeScript + Vite
- Tailwind CSS
- Node.js + Express + TypeScript
- PostgreSQL + Prisma
- Zod validation
- JWT authentication
- Socket.IO real-time notifications
- Docker Compose
- GitHub Actions

## Quick start (Docker)
Requirements: Docker Desktop.

```bash
docker compose up --build
```

Open:
- Frontend: http://localhost:5173
- API: http://localhost:5000
- Health: http://localhost:5000/api/health

Demo account:
- Email: demo@learnsphere.dev
- Password: Password123!

## Local development
1. Copy `server/.env.example` to `server/.env`.
2. Start PostgreSQL locally or use Docker.
3. In `server`: `npm install`, `npx prisma migrate dev`, `npm run seed`, `npm run dev`.
4. In `client`: `npm install`, `npm run dev`.

The included Docker setup is the easiest option.
