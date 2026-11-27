# MCA Academic Dashboard - Presentation Plan

**Suggested duration:** 8-10 minutes, including a short live demonstration.

## Slide 1: Title

- MCA Academic Dashboard
- Student and teacher academic workflows
- Presenter name, program, semester, and institution

## Slide 2: Problem

- Academic information is often spread across separate records and messages.
- Students need a clear view of attendance, assessments, assignments, and progress.
- Teachers need a single place to update records and review submissions.

## Slide 3: Project goals

- Provide separate student and teacher experiences.
- Keep student records private through server-side authorization.
- Validate academic updates on the server.
- Support assignment files, student submissions, grading, and feedback.

## Slide 4: Technology

- HTML, CSS, JavaScript, Bootstrap, and Chart.js.
- Node.js and Express REST API.
- SQLite database with bcrypt-hashed passwords.
- HttpOnly session cookies and private upload folders.

## Slide 5: Architecture

```text
Student or teacher browser
  -> js/api.js HTTP client
  -> Express API and role checks
  -> SQLite academic records
  -> uploads/assignments/ and uploads/submissions/
```

The frontend runs from the same Express server as the API. Academic records are persisted on the server, not in browser storage.

## Slide 6: Core academic features

- Best two of three quizzes.
- Internal marks out of 20 and end-semester marks out of 50.
- Lab components and attendance calculations.
- Credit-weighted SGPA and CGPA.
- Server-side validation for marks and attendance.

Verify the official department regulations before relying on any calculation.

## Slide 7: Assignment lifecycle

1. Teacher creates an assignment and may attach up to 10 files.
2. Student views the assignment and submits up to 10 files.
3. Files are stored in separate assignment and submission folders.
4. Teacher reviews, downloads, and grades the submission.
5. The student sees the saved marks and feedback.

Each file is limited to 15 MB. Downloads are served through authenticated API routes.

## Slide 8: Live demonstration

- Sign in as a teacher and update attendance or assessment marks.
- Create an assignment and attach more than one file.
- Sign in as a student and confirm the assignment and attachments appear.
- Upload multiple submission files, then return to the teacher portal and grade the work.
- Show that invalid access and invalid marks are rejected by the server.

## Slide 9: Testing and next steps

- `npm test` covers login, role isolation, database writes, validations, and multi-file uploads/downloads.
- Current demo accounts and academic records are seeded examples.
- Production work includes institutional account provisioning, password recovery, persistent hosting, backups, and a security/privacy review.

## Opening statement

> The MCA Academic Dashboard brings key student and teacher workflows into one application. Students can review their own academic information and submit assignment files, while teachers can maintain records and evaluate submissions. The frontend uses an Express API, server-side role checks, a SQLite database, and private upload folders. The bundled records are demonstration data, so the project is not an official university system.
