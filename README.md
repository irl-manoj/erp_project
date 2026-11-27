# MCA Academic Management Dashboard

A responsive student/teacher academic portal backed by an Express API and a persistent SQLite database. It includes authenticated role-specific login, per-student academic data, a weekly timetable, date-by-date attendance with a 75% projection, demo-only fee invoices and receipts, teacher mark/attendance workflows, assignment submissions, and server-side validation.

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

The demo password is only for the included sample accounts. The login page links to account registration: students can register with a unique roll number, email, semester, and password. Teacher registration requires the private `TEACHER_REGISTRATION_CODE` in `.env`; without it, public teacher sign-up stays disabled. The server stores **bcrypt password hashes**, never plaintext passwords. On first startup it creates `data/academic.sqlite` and seeds sample users and academic records. Database and uploaded files are ignored by Git.

## What is connected to the backend

- **Authentication:** email/roll + password, role-bound login, 12-hour signed session in an HttpOnly cookie, a short-lived bearer-token fallback for embedded preview browsers, logout, and login rate limiting.
- **Authorization:** students can read only their own profile, attendance, marks, and submissions. Teacher access is scoped server-side to subjects assigned to that teacher; teachers cannot read or edit another teacher’s subject marks, assignments, or submissions. A teacher may see student profiles only for semesters in which they teach. Changing client IDs or roles does not bypass these checks.
- **Persisted records:** students/teachers, subjects, timetable, aggregate and dated attendance, demo fee invoices/payments, quizzes, internal and end-semester marks, lab marks, assignments, submissions, exams, notes, notices, syllabus and notifications are stored in SQLite.
- **Timetable:** teachers can add, edit, and remove schedule entries for their own subjects; the server validates ownership, class times, and teacher/room conflicts. Students see saved entries on their dashboard and full timetable page, including day, time, room, subject, and teacher email. Seeded rows are demo data and should be checked against the official department schedule.
- **Attendance:** students can review each dated Present/Absent class record and subject-level projections for the 75% target (additional classes to attend, or future classes they can miss while remaining at target). Teachers can record attendance by date for scheduled classes; the server validates subject ownership, student enrollment, date, and schedule.
- **Fees and receipts:** sample invoices can be marked paid in the demo ledger and produce downloadable HTML receipts. This is explicitly a **demo-only action**: it does not connect to a payment processor, charge money, or create an official institutional receipt. Sample amounts are not official fee notices. `DEMO_SEMESTER_FEE_INR` optionally changes the sample amount (default `50000`).
- **Teacher actions:** create/update/delete subjects; record dated attendance and assessment marks; create assignments; review and grade submissions.
- **Student actions:** view their academic dashboard and upload up to 10 assignment-submission files per submission. Each file can be up to 15 MB and is saved in `uploads/submissions/`; downloads are limited to the owning student or a teacher.
- **Assignment materials:** teachers can attach up to 10 files to an assignment. Files are saved in `uploads/assignments/` and students can download each attachment through an authenticated route. Accepted types are PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, TXT, ZIP, PNG, and JPEG.
- **Validation:** mark ranges, internal component totals, attendance totals, uploads and authorization are checked on the server, not just in the browser.
- **Frontend:** `js/api.js` calls `/api` rather than the old mock data layer. Browser storage holds only the UI identity cache and a short-lived session fallback; academic records live in SQLite.

## Useful commands

```bash
npm start       # run the app
npm run dev     # restart server on source changes
npm test        # API/auth/authorization/database tests
```

Health check: `GET /api/health`.

## Configuration and deployment notes

Copy `.env.example` to `.env` and set a long random `JWT_SECRET`. Set a private `TEACHER_REGISTRATION_CODE` only when you want to allow invited teachers to register; students can register without an invitation. Set `NODE_ENV=production` and serve over HTTPS (session cookies are always Secure); the server requires `JWT_SECRET` and `DEMO_PASSWORD` on the **first database seed**. Change sample passwords for a production deployment and provision real institutional accounts instead of exposing demo accounts.

SQLite is a good fit for local development and a single-instance demo. For hosting, use a persistent disk/volume for both the SQLite database and `uploads/`; ephemeral container filesystems lose data when redeployed. For multiple app instances or a larger production deployment, migrate the records to PostgreSQL and use durable object storage for uploads. Production deployment also needs HTTPS, backups, a domain, and institutional account/password management.

## Source layout

- `server.js` — Express REST API, session auth, role authorization, uploads and static frontend serving.
- `backend/db.js` — SQLite schema, seed data, and query helpers.
- `backend/server.test.js` — backend integration tests.
- `js/api.js` — browser HTTP client.
- `api.js` — original sample records retained as the initial database seed source; it is not used by browser requests.
