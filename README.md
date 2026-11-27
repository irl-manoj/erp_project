# MCA Academic Management Dashboard

A responsive student/teacher academic portal backed by an Express API and a persistent SQLite database. It includes authenticated role-specific login, per-student academic data, teacher mark/attendance updates, assignment submissions, and server-side validation.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env       # optional for local development; demo works without it
npm start
```

Open **http://localhost:3000**. Do not use `python -m http.server` or open the HTML files directly; the Express server serves the UI and API from the same origin so session cookies work.

### Demo logins

All seeded demo accounts use password **`1234`** in local development. Use the matching role on the login page.

| Role | Login | Roll number (students only) |
|---|---|---|
| Student | `manoj.das@bitmesra.ac.in` | `MCA/2024/017` |
| Student | `priya.sharma@bitmesra.ac.in` | `MCA/2024/018` |
| Student | `aman.verma@bitmesra.ac.in` | `MCA/2024/019` |
| Student | `neha.singh@bitmesra.ac.in` | `MCA/2024/020` |
| Teacher | `rajesh.kumar@bitmesra.ac.in` | — |
| Teacher | `anjali.mehta@bitmesra.ac.in` | — |

The demo password is only for the included sample accounts. The server stores **bcrypt password hashes**, never plaintext passwords. On the first startup it creates `data/academic.sqlite` and seeds the sample users and academic records. Database and uploaded files are ignored by Git.

## What is connected to the backend

- **Authentication:** email/roll + password, role-bound login, 12-hour signed session in an HttpOnly, SameSite cookie, logout, login rate limiting.
- **Authorization:** student accounts can only read their own profile, attendance, marks, and submissions; teacher accounts can see the class roster and make teacher-only changes. The server enforces this even if a client changes IDs or roles.
- **Persisted records:** students/teachers, subjects, attendance, quizzes, internal and end-semester marks, lab marks, assignments, submissions, exams, notes, notices, syllabus and notifications are stored in SQLite.
- **Teacher actions:** create/update/delete subjects; edit attendance and assessment marks; create assignments; review and grade submissions.
- **Student actions:** view their academic dashboard and upload up to 10 assignment-submission files per submission. Each file can be up to 15 MB and is saved in `uploads/submissions/`; downloads are limited to the owning student or a teacher.
- **Assignment materials:** teachers can attach up to 10 files to an assignment. Files are saved in `uploads/assignments/` and students can download each attachment through an authenticated route. Accepted types are PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, TXT, ZIP, PNG, and JPEG.
- **Validation:** mark ranges, internal component totals, attendance totals, uploads and authorization are checked on the server, not just in the browser.
- **Frontend:** `js/api.js` now calls `/api` rather than using the old mock data layer. `localStorage` holds only the small UI identity cache; academic records live in the SQLite database.

## Useful commands

```bash
npm start       # run the app
npm run dev     # restart server on source changes
npm test        # API/auth/authorization/database tests
```

Health check: `GET /api/health`.

## Configuration and deployment notes

Copy `.env.example` to `.env` and set a long random `JWT_SECRET`. Set `NODE_ENV=production` to enable secure cookies; the server then requires `JWT_SECRET` and `DEMO_PASSWORD` on the **first database seed**. Change the sample password for a production deployment and provision real institutional accounts instead of exposing demo accounts.

SQLite is a good fit for local development and a single-instance demo. For hosting, use a persistent disk/volume for both the SQLite database and `uploads/`; ephemeral container filesystems lose data when redeployed. For multiple app instances or a larger production deployment, migrate the records to PostgreSQL and use durable object storage for uploads. Production deployment also needs HTTPS, backups, a domain, and institutional account/password management.

## Source layout

- `server.js` — Express REST API, session auth, role authorization, uploads and static frontend serving.
- `backend/db.js` — SQLite schema, seed data, and query helpers.
- `backend/server.test.js` — backend integration tests.
- `js/api.js` — browser HTTP client.
- `api.js` — original sample records retained as the initial database seed source; it is not used by browser requests.
