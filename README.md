# MCA Academic Management Dashboard

Modern, responsive, **API-driven** Academic SaaS platform for MCA — built as a frontend-only project per specification. No traditional backend in the repo. No MySQL / MongoDB / localStorage for academic data.

> **Architecture:** Frontend → REST API → JSON Data

```
Frontend (HTML5, CSS3, ES6+, Bootstrap 5, Chart.js, Font Awesome)
   ↓ Fetch / Axios
REST API (external, mocked via js/api.js with realistic latency & error handling)
   ↓
JSON Data (centralized in MockDB)
```

---

## ✨ Key Highlights

- **Evaluation System Exactly Per Spec**
  - **Theory:** Best 2 of 3 Quizzes (15 each → 30) + Internal (20 configurable) + End Sem (50) = 100. Quiz lowest excluded (86.67% example).
  - **Lab:** Lab Assignment 20 + EPP 30 + Quiz1 15 + Quiz2 15 + Daily Evaluation 20 = 100 (configurable).
  - **Attendance:** 75% requirement, monitored only, **no marks**.
  - **SGPA/CGPA:** Credit-weighted `Σ(Credit×GradePoint)/ΣCredits` — CGPA not simple average. Grade points from API or fallback mapping.
- **Two Roles:** Student + Teacher, role from API (`{role:"student"|"teacher"}`), no fake auth, privacy per §37.
- **API Service Layer:** `js/config.js` (base URL) + `js/api.js` with reusable functions: `getStudent`, `getSubjects`, `getAttendance`, `getAssessments`, `getMarks`, `getAssignments`, `getSubmissions`, `getExams`, `getNotices`, `getNotes`, `getSyllabus`, `getProgress`, `getNotifications` + search, CRUD, validation.
- **No localStorage / sessionStorage** for academic data — only in-memory UI state.
- **Dynamic Calculations:** `js/calculations.js` — `calculateAttendance`, `calculateBestTwoQuizzes`, `calculateTheoryTotal`, `validateInternalTotal`, `calculateLabTotal`, `calculateSGPA`, `calculateCGPA`, validators.
- **Professional SaaS UI:** Sidebar + topbar, cards, tables, progress bars, modals, toasts, tabs, badges, skeletons, empty & error states, Chart.js visuals, dark/light toggle (in-memory).
- **Fully Responsive:** Collapsible sidebar, responsive cards/tables/charts, mobile-friendly forms & file upload, touch buttons.

---

## 📁 Project Structure

```
mca-academic-dashboard/
├── index.html                  # Landing + role selector + architecture overview
├── css/
│   ├── style.css               # Design system (SaaS, light/dark via [data-theme])
│   ├── dashboard.css           # Dashboard specific
│   ├── student.css             # Student overrides (imports style)
│   ├── teacher.css             # Teacher overrides
│   └── responsive.css
├── js/
│   ├── config.js               # API_BASE_URL, grade map, constants
│   ├── api.js                  # Central API service + MockDB (simulated REST)
│   ├── calculations.js         # All academic formulas
│   ├── charts.js               # Chart.js wrappers
│   ├── app.js                  # Main controller (student + teacher SPA)
│   ├── student.js / teacher.js # Role modules (for structure compliance)
│   ├── subjects.js / attendance.js / quizzes.js / internal.js
│   ├── assignments.js / submissions.js / exams.js
│   └── syllabus.js / notes.js / notifications.js
├── student/
│   ├── dashboard.html          # Full Student SPA (all views via JS routing)
│   ├── subjects.html → redirect
│   ├── subject-details.html → redirect
│   ├── attendance.html → redirect
│   ├── quiz-marks.html → redirect
│   ├── assignments.html → redirect
│   ├── exams.html → redirect
│   ├── syllabus.html → redirect
│   ├── notes.html → redirect
│   ├── sgpa-cgpa.html → redirect
│   ├── progress.html → redirect
│   ├── notices.html → redirect
│   └── profile.html → redirect
├── teacher/
│   ├── dashboard.html          # Full Teacher SPA
│   ├── subjects.html → redirect
│   ├── students.html → redirect
│   ├── quizzes.html → redirect
│   ├── internal.html → redirect
│   ├── attendance.html → redirect
│   ├── assignments.html → redirect
│   ├── submissions.html → redirect
│   └── marks.html → redirect
└── README.md
```

> Student & Teacher dashboards are single-page shells that render all sections dynamically. The per-file redirects ensure every documented path exists and lands in the correct view.

---

## 🔌 API Endpoints (frontend contract)

```
GET    /api/students/:id
GET    /api/subjects?semester=1&type=theory
POST   /api/subjects
PUT    /api/subjects/:id
DELETE /api/subjects/:id
GET    /api/subjects/:id/syllabus
GET    /api/attendance?studentId=101
PUT    /api/attendance/:id
GET    /api/assessments /api/quizzes
POST   /api/assessments
PUT    /api/assessments/:id
GET    /api/marks?studentId=101
PUT    /api/marks/:id
GET    /api/assignments
POST   /api/assignments
GET    /api/submissions?assignmentId=1
POST   /api/submissions
GET    /api/exams
GET    /api/notices
GET    /api/notes
GET    /api/notifications
GET    /api/progress
GET    /search?q=
```

Each call shows **loading skeletons**, then data, or **empty** / **error with Retry**. Errors never expose stack traces to students.

---

## 🧮 Calculations (js/calculations.js)

```js
calculateAttendance(attended, total) // (attended/total)*100
getAttendanceStatus(percentage)       // met if >=75
calculateBestTwoQuizzes(quizzes)      // sorted desc, slice 0,2, excluded slice 2
calculateTheoryTotal(best2, internal, endSem) // sum
calculateInternalTotal(components)    // sum marks
validateInternalTotal(components)     // must equal 20
calculateLabTotal(components)         // sum / max / %
getGradePoint(marks)                  // fallback mapping 90-100:10 … <40:0
calculateSGPA(subjects)               // Σ(cr*gp)/Σcr
calculateCGPA(semesterData)           // credit-weighted, not avg
```

---

## 🎨 UI Features

- **Sidebar:** Dashboard, My Subjects, Subject Details, Attendance, Quiz & Marks, Internal, Assignments, Syllabus, Notes, SGPA/CGPA, Progress, Exams, Notices, Profile (student) + Manage Subjects, Students, Quizzes, Internal, Attendance, Assignments, Submissions (teacher).
- **Topbar:** Global search (subjects/notes/assignments/notices), notifications, theme toggle, profile, mobile hamburger + overlay.
- **Cards:** SGPA, CGPA, Attendance, Pending Assignments, Upcoming Exams, Quiz Performance; subject cards with color top border, attendance bar, marks.
- **Subject Details:** Tabs Overview/Syllabus/Notes/Assignments; theory shows Quiz (best2), Internal, End-Sem, Final 85/100; lab shows 5 components + doughnut.
- **Charts:** Quiz bar, attendance horizontal bar, SGPA trend line, lab doughnut, radar overall — via Chart.js, responsive.
- **Assignments:** Statuses Not Started/Submitted/Late/Checked/Returned, download, upload modal, grading modal with feedback.
- **Validations:** Quiz 0-15, Internal sum 20, End-Sem 0-50, Attended ≤ Total, Credits >0, Lab max respected.
- **States:** Skeleton loaders, professional empty states, error with Retry, toasts.
- **Responsive:** Breakpoints 576/768/992, collapsible sidebar, stacked grids, table-responsive, file drop.

---

## 🚀 Running Locally

No build step. Open via static server (so Fetch works, not file://):

```bash
# from project root
python3 -m http.server 8000
# then visit
http://localhost:8000/index.html
http://localhost:8000/student/dashboard.html
http://localhost:8000/teacher/dashboard.html
```

Or use any static host (Vercel, Netlify) — just upload the folder.

**External CDN required:** Bootstrap 5.3, Font Awesome 6.5, Chart.js 4.4, Google Fonts Inter — loaded via CDN (no npm needed). For offline viva, files still preview but charts/icons need network; the dashboard logic works regardless.

Dark mode toggle is **in-memory only** (resets on reload) per spec §48 — no localStorage.

---

## 🧪 Demo Credentials (no auth, role from API)

- **Student:** Manoj Kumar Das — MCA/2024/017 — Sem 1 — `student/dashboard.html`
- **Teacher:** Prof. Rajesh Kumar — `teacher/dashboard.html`

Semester switcher: Sem 1 shows DBMS/DSA/Java/Math/Lab; Sem 2 shows OS/CN/Labs.

Try:
- Search “DBMS” in topbar → cross-resource results.
- In Subject Details → Overview → see best-2 math (12+14=26/30), then Quiz chart.
- Teacher → Add Subject → set Credits 0 → validation error; set Type Lab → configurable lab modal.
- Teacher → Attendance → edit Attended > Total → error.

---

## 📝 Notes for Viva

- Emphasize **centralized API layer** (`js/api.js` + `js/config.js`) and **dynamic calculations** (`js/calculations.js`) — no hard-coded marks in UI.
- Show **Network tab:** every card does `fetch` (simulated) with delay, loading state, error handling.
- Explain **Best-2 logic** and **credit-weighted SGPA** vs simple average.
- Mention **no localStorage** — demonstrate by opening DevTools → Application → empty.
- Highlight **responsive** by resizing, and **dark mode** toggle.

---

## 📄 License

College project — free to reuse for academic demonstration.
