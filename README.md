# Student ID Monitoring System — Starter

Starter project using React + Vite, Express, and MySQL. It includes database schema, JWT login, role checks, student CRUD, attendance time-in/time-out, dashboard metrics, and CSV export endpoint.

## Requirements
- Node.js 20+
- MySQL 8+
- npm

## 1. Database
Create a database and run the schema:

```sql
CREATE DATABASE zppsu_student_monitoring CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE zppsu_student_monitoring;
SOURCE database/schema.sql;
```

If copying the database name manually, use `zppsu_student_monitoring` (without any hidden characters).

## 2. Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your MySQL credentials and a long random JWT_SECRET
npm install
npm run dev
```

Create the first admin account:
```bash
npm run create-admin
```
Follow the prompts. Do not use a default admin password.

API runs at `http://localhost:4000/api`.

## 3. Frontend
In a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Open the URL Vite prints (usually http://localhost:5173).

## API endpoints
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/students?search=&status=&page=&limit=`
- `POST /api/students`
- `GET /api/students/:id`
- `PUT /api/students/:id`
- `DELETE /api/students/:id` (admin only; blocks deletion when logs exist)
- `POST /api/attendance/scan` with `{ "studentIdNumber": "..." }` — toggles time-in/time-out for the current day
- `GET /api/attendance?from=YYYY-MM-DD&to=YYYY-MM-DD&search=`
- `GET /api/attendance/export.csv?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/dashboard/summary`
- `GET /api/health`

## Important notes
- `attendance_logs` has a unique key on `(student_id, date)`, so this starter supports one time-in and one time-out per student per day. For multiple campus re-entries in one day, use a separate visit/session table or remove that constraint and redesign the scan logic.
- The scan endpoint toggles between time-in and time-out. It requires security/admin/staff login. Ensure staff understand the toggle behavior to avoid accidental time-outs.
- Use HTTPS in deployment, rotate secrets, add rate limiting and audit logs, back up the database, and follow the Data Privacy Act of 2012. Student records are sensitive personal information; restrict access and retention.
- The included frontend is a functional starter, not a production-certified deployment.
