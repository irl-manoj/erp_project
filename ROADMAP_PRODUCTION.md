# Production Readiness Roadmap

The project now includes a working local backend. This document lists what is implemented and what should be completed before a real institutional launch.

## Implemented

- Express REST API served from the same origin as the frontend.
- SQLite database initialized with sample student, teacher, subject, attendance, assessment, assignment, notice, note, syllabus, exam, and submission data.
- Student and teacher login with bcrypt password hashes and 12-hour signed, HttpOnly session cookies.
- Role checks on protected routes. Students can only access their own profile, marks, attendance, and submissions; teachers can manage academic records.
- Server-side validation for attendance and assessment updates.
- Teacher workflows for subject maintenance, marks, attendance, assignment creation, and submission grading.
- Multiple file uploads for assignments and student submissions: up to 10 files per upload, 15 MB per file, saved under `uploads/assignments/` or `uploads/submissions/`.
- Authenticated file downloads, automated backend tests, and a local setup documented in `README.md`.

## Before a public launch

1. **Provision real accounts.** The current accounts are seeded demo accounts. Add an administrator workflow or a trusted import process for institutional accounts, and require unique, strong passwords. Do not publish the demo password.
2. **Add account recovery and password changes.** Password reset needs an institutional email provider and abuse protections.
3. **Move to durable production storage.** SQLite is appropriate for local development and a single-instance demo. For a multi-instance service, migrate to PostgreSQL and object storage for uploads. If retaining SQLite for a single instance, attach a persistent disk and test restore procedures.
4. **Deploy securely.** Use HTTPS, a long random `JWT_SECRET`, environment-managed secrets, restrictive network access, automated backups, log retention, and routine dependency updates.
5. **Add operational controls.** Define administrator and teacher scopes, data retention rules, audit logs for grade changes, file scanning, monitoring, and recovery procedures.
6. **Replace placeholder academic materials.** The sample database includes demonstration records and some sample material references have no attached files. Upload the institution's approved notes, assignment documents, exams, and notices before using the site with students.
7. **Run acceptance tests with institutional data.** Confirm grading rules, semesters, credits, account ownership, privacy, upload limits, and backup restoration with the department before launch.

## Local development

```bash
npm install
cp .env.example .env
npm start
```

Open `http://localhost:3000`. The local sample accounts use password `1234`. Run `npm test` to verify login, role isolation, database writes, and multi-file uploads.

## Architecture

```text
Browser pages
  -> js/api.js (same-origin HTTP client)
  -> Express API (server.js)
  -> SQLite database (data/academic.sqlite)
  -> private upload folders (uploads/assignments, uploads/submissions)
```

The backend stores only generated file paths and metadata in the database; uploaded file contents remain in the configured upload folder and are served through authenticated API routes. Keep both the database and upload storage on persistent, backed-up storage in any deployed environment.
