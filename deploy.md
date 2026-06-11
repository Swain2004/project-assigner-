# Dockploy Deployment Guide

## Files Created

| File | Purpose |
|------|---------|
| `backend/Dockerfile` | Builds backend Node.js container |
| `backend/.dockerignore` | Excludes files from backend build |
| `frontend/Dockerfile` | Multi-stage build with Nginx |
| `frontend/.dockerignore` | Excludes files from frontend build |
| `frontend/nginx.conf` | Nginx config with API proxy |
| `docker-compose.yml` | Local development with PostgreSQL |
| `docker-compose.prod.yml` | Production deployment config |
| `.env.example` | Environment variables template |

## Quick Deploy to Dockploy

### 1. Prepare Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
# Edit .env with your actual values
```

### 2. For Dockploy (with external PostgreSQL)

If using Dockploy's managed database or an external PostgreSQL:

```yaml
# Use docker-compose.prod.yml
version: '3.8'

services:
  backend:
    build: ./backend
    environment:
      NODE_ENV: production
      PORT: 5000
      DB_HOST: ${DB_HOST}        # Your DB host from Dockploy
      DB_PORT: ${DB_PORT:-5432}
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT:-587}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
      EMAIL_FROM: ${EMAIL_FROM}
      FRONTEND_URL: ${FRONTEND_URL}
    volumes:
      - uploads:/app/uploads
    ports:
      - "5000:5000"

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  uploads:
```

### 3. Build & Push to Registry (if needed)

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Or build and push to registry
docker build -t your-registry/project-assigner-backend:latest ./backend
docker build -t your-registry/project-assigner-frontend:latest ./frontend
docker push your-registry/project-assigner-backend:latest
docker push your-registry/project-assigner-frontend:latest
```

### 4. Deploy on Dockploy

1. Connect your Git repository or upload the files
2. Set environment variables in Dockploy dashboard
3. Use `docker-compose.prod.yml` as the compose file
4. Deploy!

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Nginx (80)    │────▶│  Backend (5000) │────▶│   PostgreSQL    │
│  (Frontend +    │     │   (Node.js)     │     │   (External)    │
│   API Proxy)    │◄────│                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │
        ▼
   Static Files
   (React Build)
```

## Environment Variables Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `db.abc123.supabase.co` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `project_assigner` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `secret123` |
| `JWT_SECRET` | Secret for JWT tokens | `random-string-32-chars` |
| `SMTP_HOST` | Email server | `smtp.office365.com` |
| `SMTP_PORT` | Email port | `587` |
| `SMTP_USER` | Email username | `admin@aitechtures.com` |
| `SMTP_PASS` | Email password | `password` |
| `EMAIL_FROM` | From address | `Project Assigner <admin@aitechtures.com>` |
| `FRONTEND_URL` | Public URL | `https://projects.aitechtures.com` |

## Health Checks

- Backend: `GET /api/health` → returns `{ status: 'OK' }`
- Frontend: `GET /health` → returns `healthy`

## Volumes

- `uploads/` - Stores uploaded files (documents, templates)

## Post-Deployment

1. Initialize database schema (first deploy only):
   ```bash
   docker-compose exec backend npm run db:init
   ```

2. Create first admin user via registration (first user becomes admin)

## Troubleshooting

**Socket.IO connection issues**: Ensure WebSocket support is enabled on your Dockploy/reverse proxy

**Database connection fails**: Check DB_HOST is accessible from the container network

**Email not sending**: Verify SMTP credentials and that the email provider allows the connection
