# Project Assigner

A production-grade project management system with task assignment, document management, templates, and real-time notifications.

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lenis (smooth scroll), Socket.io Client, Lucide Icons
- **Backend**: Node.js, Express.js, Socket.io
- **Database**: PostgreSQL
- **Auth**: JWT (JSON Web Tokens)
- **File Uploads**: Multer (local storage)
- **Email**: Nodemailer (optional)

## Features

- **Authentication** — JWT-based login/register. First user becomes admin automatically.
- **Projects** — Create projects with color, priority, due date. Assign team members.
- **Tasks** — Kanban board per project (To Do / In Progress / Review / Done). Assign tasks to members.
- **Documents** — Upload any file type (PDF, Word, Excel, CSV, Images, etc.). Drag-and-drop support.
- **Templates** — Build custom form templates with multiple field types. Submit and track data.
- **Notifications** — Real-time in-app notifications via Socket.io + optional email via Nodemailer.
- **User Management** — Admin can create, edit, deactivate users.
- **Two Roles** — `admin` (full access) and `employee` (access to assigned projects/tasks).

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### 1. Database Setup

Create a PostgreSQL database:

```bash
psql -U postgres -c "CREATE DATABASE project_assigner;"
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your PostgreSQL credentials and JWT secret
npm run dev
```

The server auto-initializes the database schema on first start.

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at **http://localhost:5173**
The backend runs at **http://localhost:5000**

### 4. Environment Variables

Copy `backend/.env.example` to `backend/.env` and update:

| Variable | Description |
|----------|-------------|
| `DB_HOST` | PostgreSQL host (default: localhost) |
| `DB_PORT` | PostgreSQL port (default: 5432) |
| `DB_NAME` | Database name |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |
| `JWT_SECRET` | Strong random secret for JWT signing |
| `SMTP_*` | Optional — email notifications via SMTP |

## Usage

1. Register the first user — they become **admin** automatically
2. Admin creates projects and assigns employees
3. Employees see their assigned projects in the dashboard
4. Upload documents to projects
5. Create form templates for structured data collection
6. All assignment actions trigger real-time in-app + email notifications
# project-assigner-
