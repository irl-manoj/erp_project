# MCA Academic Dashboard - Project Guide

## Overview

The MCA Academic Dashboard is an educational student and teacher portal. It demonstrates academic record management, role-based access, attendance, assessment results, assignments, submissions, and academic progress. It is not an official BIT Mesra system, and its preloaded accounts and records are sample data.

## Technology

- **Frontend:** HTML, CSS, JavaScript, Bootstrap, Chart.js, and Font Awesome.
- **Backend:** Node.js and Express.
- **Authentication:** bcrypt password hashes, signed 12-hour HttpOnly session cookies, and a short-lived bearer-token fallback for embedded previews. Students can self-register; teacher registration requires a private invitation code.
- **Database:** SQLite, initialized from the sample records in `api.js` on first startup.
- **Uploads:** Multer stores files in private `uploads/assignments/` and `uploads/submissions/` folders. Up to 10 files can be sent per upload, at 15 MB per file.

## Request flow

```text
Browser pages
  -> js/api.js
  -> Express routes in server.js
  -> SQLite records and users in backend/db.js
  -> private upload folders for uploaded file content
```

The browser stores a small user display cache and a short-lived session fallback token; it does not store the academic database. Every protected API request is authorized on the server. Teachers can see and edit only records for subjects assigned to their account; changing a role, subject, or student ID in the browser does not grant additional access.

## Roles and main workflows

### Student

- Sign in with an email address or roll number and a password.
- View the signed-in student's profile, subjects, the teacher-published weekly timetable on the dashboard and full timetable page (teacher email, time, and room), attendance history by date and subject-level 75% projection, fee invoices and demo receipts, quizzes, internal marks, end-semester marks, lab marks, assignments, exams, notices, notes, syllabus, and progress.
- Mark sample fee invoices as paid in the demo ledger and download an HTML receipt. This action never charges money and is not an official payment or receipt.
- Upload up to 10 files to an assignment submission. Files are checked by type and size, stored on the server, and can be downloaded by the student who submitted them or a teacher.

### Teacher

- Register with a private invitation code or sign in to the teacher portal.
- View student profiles for semesters in which the teacher has assigned subjects.
- Create and manage only their own subjects; add, edit, or remove their subjects' weekly timetable entries; record present/absent attendance for a scheduled class date and enrolled student; update marks; create assignments; review and grade submissions for those assignments.
- Teacher ownership is enforced by server-side checks, including API reads, edits, deletes, and downloads.

## Academic rules

The application includes the sample project's academic calculations: theory assessment totals, best two of three quizzes, internal marks out of 20, end-semester marks out of 50, lab component totals, attendance eligibility, and credit-weighted SGPA/CGPA. Confirm official department rules before using these calculations for real academic decisions.

## Local setup

```bash
npm install
cp .env.example .env
npm start
```

Then open `http://localhost:3000`. Do not open the HTML files directly or serve them with a separate static server; the frontend uses same-origin API requests and session cookies.

Sample demo accounts use password `1234`. Do not expose the demo password publicly. See `README.md` for the account list and environment settings.

## Testing

```bash
npm test
```

Tests cover student/teacher registration, login, teacher subject ownership, student data isolation, validation, SQLite writes, both teacher and student file uploads, and authenticated file downloads. JavaScript syntax can also be checked with:

```bash
for file in *.js js/*.js backend/*.js; do node --check "$file"; done
```

## Important limitations

- Seeded accounts and academic records are examples, not official institutional records.
- Password reset and administrator account provisioning are not yet included; teacher self-registration requires an invitation code configured by the operator.
- Sample notes and some historical assignment/submission entries do not include actual attached files.
- SQLite and local file storage suit local development and single-instance demonstrations. A public, multi-instance deployment needs persistent storage or a PostgreSQL/object-storage migration, HTTPS, backups, and institutional security and privacy review.
