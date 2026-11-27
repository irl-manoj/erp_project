# MCA Academic Dashboard - Viva Questions and Answers

Use these concise answers as a starting point. Demonstrate the relevant workflow where possible, and distinguish sample records from official institutional data.

## Project and architecture

**1. What is the project?**

It is an educational academic dashboard with separate student and teacher workflows for academic records, attendance, assessment marks, assignments, submissions, and progress.

**2. What technology does it use?**

The frontend uses HTML, CSS, JavaScript, Bootstrap, and Chart.js. The backend uses Node.js and Express, with SQLite persistence, bcrypt password hashing, signed session cookies, and Multer for file uploads.

**3. How does a browser request reach the database?**

The browser calls the centralized client in `js/api.js`. Express routes in `server.js` authenticate and authorize each request, then read or update records through `backend/db.js`.

**4. Where is the data stored?**

User profiles and academic records are stored in `data/academic.sqlite`. Uploaded assignment and submission files are stored under `uploads/assignments/` and `uploads/submissions/`. These local paths must be placed on persistent storage in a deployment.

**5. Why are frontend and backend served from the same origin?**

The frontend can make relative API requests and use the HttpOnly session cookie without configuring cross-origin access. It also keeps the local demo setup straightforward.

**6. Is this an official BIT Mesra system?**

No. It is an educational demonstration. Bundled accounts, marks, attendance, and other records are sample data and must not be treated as official records.

## Authentication and security

**7. How does login work?**

The server finds the account by email or student roll number, compares the submitted password with a bcrypt hash, and issues a signed, 12-hour session. It uses an HttpOnly cookie where available and a short-lived bearer-token fallback for embedded previews. The selected role must match the account.

**8. Are passwords stored in plaintext?**

No. Passwords are stored as bcrypt hashes. The included demo accounts share a demonstration password, which must be replaced before any public deployment.

**9. How are student records kept private?**

The API identifies the user from the signed session cookie and enforces role and ownership checks on the server. A student cannot gain access to another student's data by changing an ID in the browser.

**10. What can a teacher do?**

An authenticated teacher can view the class roster and manage subjects, attendance, marks, assignments, and submission grades. Student accounts are not authorized to make teacher-only changes.

**11. What security controls are included?**

The project includes password hashing, signed HttpOnly cookies, role checks, login rate limiting, server-side validation, upload type and size limits, and authenticated file downloads. It still requires a full security and privacy review before real use.

## Data and academic rules

**12. What is the difference between sample data and live data?**

Sample data is seeded during the first local database setup for demonstration. Records created or changed through the app persist in SQLite, but they are not connected to an official institutional system.

**13. How are academic calculations handled?**

The frontend calculation module computes displayed totals such as best-two quiz marks, internal totals, end-semester totals, attendance percentages, and credit-weighted SGPA/CGPA. The server independently validates important updates before saving them.

**14. What does best two of three mean?**

The system selects the two highest quiz marks and excludes the lowest. The counted score is therefore out of 30 when each of the three quizzes is out of 15.

**15. How are files uploaded?**

The browser sends multipart form data to Express. Multer validates permitted file extensions and limits each file to 15 MB, with up to 10 files per upload. File contents are saved in a private folder; metadata and generated paths are saved in SQLite.

**16. Who can download uploaded files?**

Assignment attachments require an authenticated account. Submission files can be downloaded by the submitting student or an authenticated teacher. Direct public access to the upload folders is blocked.

## Development and testing

**17. How do you run the project?**

Run `npm install`, optionally copy `.env.example` to `.env`, then run `npm start` and open `http://localhost:3000`. The frontend and API must be accessed through the Express server.

**18. How do you run the tests?**

Run `npm test`. The integration tests exercise student and teacher login, authorization, data isolation, validation, SQLite writes, multi-file uploads, and authenticated downloads.

**19. What happens when invalid attendance is submitted?**

The server returns a client error and does not save the update when attended classes exceed total classes or the values are invalid.

**20. What happens if a student attempts a teacher-only update?**

The server returns HTTP 403. Hiding teacher controls in the interface is not the security boundary; authorization is checked on the API.

**21. Why is the database not stored in `localStorage`?**

Browser storage is local to one browser and cannot safely provide shared multi-user records. SQLite provides a server-side source of truth that both portals access through authenticated requests.

## Limitations and next steps

**22. Does the application support self-registration or password reset?**

Not yet. It currently seeds sample student and teacher accounts. A real deployment needs an approved process for account provisioning and password recovery.

**23. Can it be deployed as-is for a full institution?**

No. The current setup is for local development and single-instance demonstration. Before public use it needs persistent storage, HTTPS, backups, real account management, privacy approval, operational monitoring, and a security review.

**24. What would change for a larger deployment?**

Migrate SQLite records to PostgreSQL, move uploaded files to durable object storage, use persistent secrets and managed infrastructure, and add audit logging, monitoring, and formal recovery procedures.
