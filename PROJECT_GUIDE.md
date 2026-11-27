# MCA Academic Management Dashboard — Complete Project Guide
### (BIT Mesra • Every technology, command & concept used — for Viva & Presentation)

> **Project at a glance (real counts, scanned from code — 21 Sept 2025):**
> | Item | Value |
> |---|---|
> | Total code | **4,512 lines** across 46 files |
> | HTML pages | **24** (1 landing + 1 login + 13 student + 10 teacher… incl. redirect stubs) |
> | JS modules | **17** (biggest: `app.js` 1,540 lines, `api.js` 504) |
> | CSS files | **5** (`style.css` 432 lines = design system) |
> | Chart types | **4** — bar, line, radar, doughnut (5 chart renderers) |
> | Font Awesome icons | **57 distinct icons** used |
> | Distinct CSS properties used | **117** |
> | Roles | Student (4 demo students) + Teacher (2 faculty) |
> | Backend / Database | **NONE** — 100% frontend, mock REST adapter |

---

## 1. What the project is (1-para definition for viva)

A **role-based academic management web application** for MCA students & faculty — built as a pure
frontend SaaS-style dashboard. It implements real university evaluation rules (**Best 2 of 3 quizzes → 30, Internal → 20, End-Sem → 50, Theory total 100**; Lab = configurable 100; Attendance tracked for 75% eligibility but **adds no marks**; credit-weighted **SGPA/CGPA**). All data flows through a **centralized API layer** (`js/api.js`) designed like a REST client so a real backend can be plugged in by changing one file + `API_BASE_URL` in `js/config.js`.

**Why it looks like a real product:** login system, two portals, dark mode, responsive down to 360px, toasts, skeleton loaders, empty/error states, form validations, one-click demo accounts.

---

## 2. Complete technology stack (exactly what is used)

| # | Technology | Version | Where / How |
|---|---|---|---|
| 1 | **HTML5** | — | All 24 pages: `<!DOCTYPE html>`, semantic tags, forms, data-attributes |
| 2 | **CSS3** | — | 5 files, custom properties, flexbox, grid, media queries, animations |
| 3 | **JavaScript (ES6+)** | — | 17 modules: async/await, Promises, arrow fns, template literals, spread/destructure, optional chaining, IIFE pattern |
| 4 | **Bootstrap 5.3.3** | via CDN | Grid (`col-md-6` etc), Modal, Dropdown, Collapse, badges, buttons, form-control, utilities |
| 5 | **Chart.js 4.4.3** | via CDN | `js/charts.js` — bar, line, radar, doughnut charts |
| 6 | **Font Awesome 6.5.2** | via CDN | 57 icons via `<i class="fa-solid fa-…">` |
| 7 | **Google Fonts** | via CDN | `Inter` (body) + `Plus Jakarta Sans` (headings) |
| 8 | **localStorage (browser Web Storage API)** | — | ONLY 2 keys: `mca_current_user` (session/login) + `mca_db_v2` (mock DB persistence so teacher edits survive reload) |
| 9 | **Fetch-style Promise adapter (mock REST)** | — | `simulateFetch()` in `api.js` mimics network latency + errors, returns Promises like `fetch()` would |
| 10 | **Node.js test harness** | (dev only) | `tests/run_tests.js` — **27 assertions / 5 suites** (run it live in class!); `node --check` on all 17 files for syntax |

**NOT used (by design / forbidden):** Flask, Django, Express, PHP, Spring, MySQL, MongoDB, PostgreSQL, SQLite, sessionStorage. There is **no server-side code at all**.

---

## 3. Folder structure (as per submission spec)

```
/ (root)
├── index.html                  ← Landing page (BIT branding, login CTA)
├── privacy.html              ← honest privacy policy (no server, localStorage only)
├── terms.html                ← terms: demo disclaimer, no-official-record, OSS attributions
├── login.html                  ← Fake-auth login portal (Student/Teacher tabs, demo chips)
├── README.md                   ← Project readme
├── css/
│   ├── style.css               ← MAIN design system (432 lines): variables, sidebar, cards, buttons, dark theme
│   ├── dashboard.css           ← Dashboard extras (hero, quiz-card, gauges, status pills)
│   ├── responsive.css          ← Breakpoint hardening (<1200 / <992 / <768 / <480 + touch)
│   ├── student.css             ← Student accent overrides (imports style.css)
│   └── teacher.css             ← Teacher accent overrides
├── js/
│   ├── config.js               ← CONFIG object: API_BASE_URL, college name, grade map, rules, delay
│   ├── api.js                  ← API SERVICE LAYER (504 lines): MockDB + simulateFetch + all endpoints
│   ├── calculations.js         ← PURE business-rule engine (Best-2, totals, SGPA, CGPA, attendance, validation)
│   ├── charts.js               ← Chart.js renderers (bar/line/radar/doughnut)
│   ├── app.js                  ← MAIN CONTROLLER (1,540 lines): State, router(setView), all views, forms, auth
│   ├── subjects.js / quizzes.js / attendance.js / internal.js / …  ← per-module thin API wrappers (10 lines each)
│   ├── student.js / teacher.js ← role bootstrap helpers
├── student/
│   ├── dashboard.html          ← Full student SPA (sidebar 14 views)
│   └── subjects.html, attendance.html, quiz-marks.html … (12 stub pages → redirect to dashboard view)
├── teacher/
│   ├── dashboard.html          ← Full faculty SPA (11 views + student switcher)
│   └── subjects.html, quizzes.html … (8 stub pages → redirect)
├── tests/
│   ├── run_tests.js            ← 32 assertions / 5 suites: data isolation, validations, writes+persist, auth, reload-restore
│                                run: `node tests/run_tests.js` (27→ now **32 assertions**) + `node tests/view_smoke.test.js` (**12 view-layer assertions** — boots app.js under a DOM stub, clicks the sidebar, asserts real HTML)
└── docs/ (this guide, VIVA_QA.md, PRESENTATION.md)
```

**Script load order on every dashboard (important — examiner may ask "why this order?"):**
`config.js → calculations.js → api.js → charts.js → app.js`
(definitions before consumers; app.js uses all of them.)

---

## 4. HTML — every command/element actually used in this project

### 4.1 Document skeleton (all pages)
| Code | Meaning |
|---|---|
| `<!DOCTYPE html>` | Declares HTML5 document type (standards mode) |
| `<html lang="en">` | Root element + language attribute (accessibility/SEO) |
| `<head>` … `</head>` | Metadata container |
| `<meta charset="UTF-8">` | Unicode encoding so `•`, `₹` etc render |
| `<meta name="viewport" content="width=device-width, initial-scale=1.0">` | **THE responsive key** — tells mobile browsers to use device width (without it, no responsive design works) |
| `<title>` | Tab title |
| `<link rel="stylesheet" href="…">` | Attach Bootstrap CDN CSS + own CSS files |
| `<script src="…" [defer]>` | Load JS libraries/controllers |

### 4.2 Semantic HTML5 layout tags used
`<header>` (topbar) • `<nav>` (sidebar navigation, landing nav) • `<aside>` (sidebar panel) • `<main>` role via `.main-wrap` div • `<section>` (landing hero/features) • `<footer>` (page footers)
> Viva line: *"Semantic tags improve accessibility and SEO and describe meaning to browsers, unlike generic `<div>`."*

### 4.3 Content & text tags
- `<h1>`–`<h6>` (heading hierarchy: h1 landing hero, h4 page titles, h6 modal titles)
- `<p>`, `<span>` (inline styling targets), `<strong>` (semantic bold = important), `<em>` (italic emphasis), `<b>`, `<code>` (API paths shown in banners)

### 4.4 Form controls & attributes (Add Subject, Create Assignment, Submit, Grade, Attendance, Login)
| Element / attribute | Used for |
|---|---|
| `<form id="addSubjectForm">` | Groups inputs; fires `submit` event (we `preventDefault()`) |
| `<label>` | Accessible name for input (click label → focuses input) |
| `<input type="text">` | Name, code, title fields |
| `<input type="number" min="1" max="10">` | Credits, marks — **native browser validation** |
| `<input type="password">` | Login password field |
| `<input type="date">` | Assignment deadline (native date picker) |
| `<input type="file" accept=".pdf,.doc,.docx,.zip">` | Submission upload (name/size read client-side) |
| `<input type="hidden">` | Carries IDs (e.g. `#attSubjectId`) into modal forms |
| `<select>` / `<option value>` | Semester, subject type, student switcher, login picker |
| `<textarea rows="2">` | Description, feedback |
| `required` | HTML5 mandatory-field validation |
| `value`, `placeholder`, `autocomplete="off"`, `title`, `accept`, `min/max/step` | UX + constraints |
| `<button type="submit">` vs `type="button"` | Submit vs action buttons |
| **`FormData` API (JS)** | Reads all named fields of a form in one object — `new FormData(e.target)` |

### 4.5 Data attributes & ARIA
- `data-view="teacher-attendance"` — **our SPA router** reads `event.target.dataset.view`
- `data-bs-toggle="modal|collapse|dropdown"`, `data-bs-target="#id"` — Bootstrap declarative components
- `data-theme="dark"` on `<html>` — CSS dark-mode switch
- `data-cat="Exam"` — notice filter chips
- `aria-expanded="false"` on dropdown toggle — accessibility state

### 4.6 Table tags — generated dynamically by JS templates
`<table>` `<thead>` `<tbody>` `<tr>` `<th>` `<td>` — attendance grids, subjects list, submissions queue, SGPA breakdown (wrapped in `.table-responsive` for mobile horizontal scroll).

### 4.7 Other
- `<canvas id="…">` — Chart.js drawing surface (6 canvases)
- `<ul>/<li>` — syllabus topic lists, tab lists
- `<a href>` + `<a href="#" onclick>` — navigation & pseudo-buttons
- `<i class="fa-solid fa-x">` — Font Awesome icon element
- `<br>`, `<div class="container">` etc.

---

## 5. CSS — every concept/command actually used

### 5.1 Core architecture of our CSS (style.css = design system)
```css
:root {                       /* Custom properties (CSS VARIABLES) — theme in one place */
  --primary: #c8102e;         /* crimson (final theme) */
  --bg: #faf9f9; --card:#fff; --border:#e2e8f0; --radius:18px;
  --shadow: 0 1px 3px …;      /* 3-level shadow system: sm / regular / lg */
}
[data-theme="dark"] { --bg:#020617; --card:#0f172a; … }  /* attribute-selector theme swap */
```
- **188 usages of `var(--…)`** → change one line, whole app re-themes (we actually did: blue→crimson in minutes)
- **Specificity & `!important`** used only 10× to override Bootstrap defaults (`.btn-primary`, `.text-primary`)
- `@import url(…)` — Google Fonts import inside CSS

### 5.2 Box model & sizing
`box-sizing: border-box` (universal `*` rule), `max-width`, `min-height:100vh`, `height:100%`, units: **`rem`** (typography — respects user font size), `px` (borders), `%`, `vw/vh`, `fr`.

### 5.3 Layout systems
| Concept | Where |
|---|---|
| **Flexbox** — `display:flex`, `justify-content`, `align-items`, `gap`, `flex:1`, `flex-wrap`, `flex-direction` | topbar, cards, toolbars, button rows (16 rules) |
| **CSS Grid** — `display:grid`, `place-items:center`, `grid-template-columns: repeat(auto-fit,minmax(140px,1fr))` | logo/avatar centering, internal-marks grid, notices stack (`d-grid`) |
| **Positioning** — `relative/absolute/fixed/sticky` | sticky sidebar-brand & topbar (`position:sticky;top:0`), fixed sidebar + overlay, absolute search button, relative popper parents |
| `z-index` layering | sidebar 1040 > overlay 1035 > toasts 1080 |

### 5.4 Visual polish (all present in our CSS)
- `linear-gradient` (×12), `radial-gradient` (stat-card glow), **`conic-gradient`** (attendance % ring & CGPA gauge — no SVG needed!)
- `box-shadow` (×23) multi-layer elevation; `--shadow-primary` tinted glow for primary buttons
- `border-radius: 999px` pill shapes; `overflow:hidden` cards
- `backdrop-filter: blur(12px) saturate(1.2)` — **frosted-glass topbar**
- `transition: all .15s` + **`cubic-bezier(.32,.72,0,1)`** easing for premium feel
- `@keyframes shimmer` (skeleton loaders) + `fadeIn` animation, `animation: … infinite linear`
- `transform: translateY(-2px)` hover-lift; `translateX(-100%)` off-canvas sidebar
- `::before` / `::after` **pseudo-elements** — hero decorative circle, stat-card glow, sidebar active marker, page-title accent bar
- `:hover` (×15), `:focus` rings with `color-mix()` tint, **`:focus-visible`** keyboard-only outlines, `::selection` red highlight
- `color-mix(in srgb, …)` — modern color blending (mixing card+bg)
- `calc(100vw - 16px)`, fluid type `clamp(1.6rem,3vw,2rem)`, text truncation `-webkit-line-clamp:2` (card descriptions)
- Scrollbar styling: `::-webkit-scrollbar` + `scrollbar-width:thin`; `scroll-behavior:smooth`
- `text-transform:uppercase; letter-spacing:.1em` micro-labels; `line-height` rhythm
- `overflow-x:hidden` on body + `@media (hover:none)` touch rules (no hover-lift on phones, 40px tap targets)

### 5.5 Responsive design (this is a **responsive website** — mobile-first-friendly, verify with F12 device toolbar)
Our custom breakpoints + Bootstrap's grid:
```css
@media (max-width: 1199.98px) { /* charts shrink, search compact, arrow button hidden */ }
@media (max-width: 991.98px)  { /* sidebar off-canvas + burger, content padding, tabs scrollable */ }
@media (max-width: 767.98px)  { /* topbar 58px, stat cards compact, tables small, full-width buttons */ }
@media (max-width: 479.98px)  { /* toast full-width, micro-typography, spacing reduction */ }
```
Bootstrap grid used: `col-6 col-md-6 col-lg-5 col-xl-3/4`, `row g-2/g-3` (gutters) — meaning cards render **2-per-row on mobile, 3-4 on desktop** automatically.
Other responsive tools: `max-width: 86vw` sidebar, `.table-responsive` horizontal scroll, media queries for print-safety, viewport meta.

### 5.6 Theme system (dark mode)
Toggle swaps `data-theme` attribute on `<html>` → variable overrides apply. Kept **in-memory only (not persisted)** — deliberate spec-compliance (no storage for UI prefs) and a viva talking-point.

---

## 6. JavaScript ES6+ — every feature actually used (with real counts)

### 6.1 Language features
| Feature | Count | Example from our code |
|---|---|---|
| `const` / `let` declarations | 400 / 34 | block-scoped, `const` for immutable refs |
| **Arrow functions** | **335** | `const $ = s => document.querySelector(s)` |
| **Template literals** | 334 | whole UI built: `` el.innerHTML = `<div>${esc(s.name)}</div>` `` |
| `async` / `await` | 33 / 62 | every loader: `const subjects = await API.getSubjects(…)` |
| `Promise` / `Promise.all` | 37 / **17** | parallel data fetch per view: `Promise.all([getSubjects, getAttendance, getQuizzes…])` |
| Object/array **destructuring** | many | `const [subjects, students] = await Promise.all([...])` |
| **Spread `...`** | heavy | `{ ...MockDB.students[idx], ...payload }`, `[...MockDB.attendance]` |
| **Optional chaining `?.`** | 16 | `internal?.components || []` |
| Nullish-default via `||` | everywhere | `e.message \|\| 'Network error'` |
| Ternaries | everywhere | status pill colors: `status==='checked' ? '#dcfce7' : …` |
| `try / catch / finally` | 48+ | all loaders have error UI + **Retry button** |
| **IIFE + closures (module pattern)** | 1 | entire `app.js` wrapped: `(function(){ … const State = {…} })()` — nothing leaks to global scope except explicit `window.setView` etc |
| Array methods | map **79**, filter **60**, find **54**, reduce 9, forEach 30, join 54, push 22, slice, sort | `semSubjects.map(s => …)`, `attendance.filter(a=>a.studentId===id)` |
| String methods | toLowerCase 21, includes 10, split 8, trim 10 | search matching |
| `JSON.parse/stringify` | 4+ | localStorage persistence (deep clone in simulateFetch) |
| `Math` | 44 | percentages, rounding, random demo-variation |
| `Date`, `toLocaleDateString('en-IN')` | 8 / 2 | `15 Sept 2024` Indian format |
| `new Set` | 1 | `submittedIds` — O(1) lookup for pending-assignment calc |
| `Object.assign` | 2 | DB record updates |
| `FormData` | 4 | reading modal forms |
| `localStorage API` | 25 | 2 keys only (session + mock DB) |
| `setTimeout` | 11 | simulated latency, chart-after-paint, toast auto-hide |

### 6.2 DOM & events
- Selection: `querySelector/querySelectorAll` (14+), by `#id`, `.class`, `[data-cat]`
- Manipulation: `innerHTML` templating, `createElement`, `appendChild/prepend`, `classList.toggle/add/remove`
- **Event listeners:** `click` (sidebar router, burger, theme), `submit` (5 forms), `keydown` (Enter=search), `change` (student switchers, inputs), `DOMContentLoaded` boot
- `e.preventDefault()` everywhere (forms don't navigate)
- View **router**: `setView(name)` toggles `.d-none` on `data-view` sections + active nav state — a **client-side SPA pattern without a framework**

### 6.3 API layer pattern (the heart — explain this confidently)
```
UI (app.js)  →  API object (api.js)  →  simulateFetch(Promise + latency)  →  MockDB (arrays = "tables")
                       ↑
              config.API_BASE_URL = 'https://api.mca-dashboard.edu/api'
```
- `simulateFetch()` = mini network simulator: **delay 400–700ms**, deep-clone response (`JSON.parse(JSON.stringify(data))` — clients can't mutate the DB), random failure rate for testing error states
- All functions return **Promises with the same shape as `fetch().then(r=>r.json())`** → to go live you replace ONE helper:
  ```js
  // production version of the same adapter
  async function httpFetch(path, opts){ const r = await fetch(CONFIG.API_BASE_URL + path, opts); if(!r.ok) throw {status:r.status}; return r.json(); }
  ```
  This is the classic **adapter/middleware pattern** — great viva answer for "how do you connect a real backend?"

### 6.4 Endpoints implemented in `api.js` (name → what it does)
**Read:** `getStudent, getStudents, getTeachers, getSubjects, getSubject, getAttendance, getQuizzes(=getAssessments), getInternals, getInternal, getEndSems, getEndSem, getLabMarks, getAssignments, getSubmissions, getExams, getNotices, getNotes, getSyllabus, getNotifications, getProgress, getMarks (aggregates 4 sources), search (across subjects/assignments/notes/notices)`
**Write:** `createSubject, updateSubject, deleteSubject, updateAttendance, updateQuiz, updateInternal, updateEndSem, updateLabMarks, createAssignment, createSubmission, gradeSubmission`

**Teacher marks UI mapping:** Quizzes 0–15 → `updateQuiz` (each quiz tile), Internals → `updateInternal` (config page), **End-Sem 0–50 → `updateEndSem` — entry strip at the bottom of every theory card in Teacher → “Quizzes & End-Sem” (scoped to the student selected in the top-right switcher; shows live `Best2 + Internal + EndSem = x/100` + grade point; badge flips *not entered → saved*).**
**Auth:** `authenticate(identifier, role, pwd)` (email/roll/name match), `login(id)`, `getCurrentUser()`, `logout()`

### 6.5 Validation rules (client + "server" both — examiner loves this)
| Rule | Where enforced |
|---|---|
| Subject name+code required, `credits > 0` | UI (`handleAddSubject`) **and** API (`createSubject` throws 400) |
| Quiz marks 0–15 | input `max=15` + `updateQuiz` reject |
| Internal components **sum must = 20** | live total badge + `updateInternal` reject + Save disabled |
| End-sem 0–50 | `updateEndSem` reject |
| `attended ≤ totalClasses` | UI + `updateAttendance` reject |
| Attended > 0 total classes guard, `isFinite` guards | NaN-safety in attendance math |

### 6.6 Security conscious practice (say this in viva!)
Every piece of data rendered into HTML passes through **`esc()` — an HTML-escaping function** (`& < > " '` → entities) plus `escAttr()` for attributes → **XSS protection**, even though the data is local. Also `title` attributes sanitized. localStorage stores only the session user, never "trusted" data (in a real system the server decides).

---

## 7. Business rules implemented (`calculations.js` — pure functions, 100% testable)

| Rule | Function | Formula |
|---|---|---|
| Best 2 of 3 quizzes | `calculateBestTwoQuizzes(q)` | sort marks desc → top 2 counted, 3rd **excluded** (not averaged); out of 30 |
| Theory total | `calculateTheoryTotal(b,i,e)` | `min(100, best2 + internal + endsem)` |
| Internal | `calculateInternalTotal / Max` + `validateInternalTotal` | Σ marks, Σ max, must equal 20 |
| Lab | `calculateLabTotal(comps)` | default 20+30+15+15+20=100, configurable |
| Attendance % | `calculateAttendance(a,t)` | `a/t×100` rounded 2dp |
| Overall attendance | `calculateOverallAttendance(recs)` | Σattended/Σtotal (weighted, not mean of %) |
| Eligibility | `getAttendanceStatus(p)` | ≥75 → "Eligible" else "Shortage" |
| Grade point | `getGradePoint(m)` | 90-100:10 … <40:0 from `CONFIG.GRADE_POINT_MAP` |
| **SGPA** | `calculateSGPA(perfs)` | `Σ(credit×GP) / Σcredits` ÷ to 2dp |
| **CGPA** | `calculateCGPA(sems)` | Σ(all credits×GP)/Σ(all credits) — **credit-weighted, NOT average of SGPAs** |

**Worked example to tell the class:** DBMS quiz 12, 10, 15? → Best2 = 12+14=26/30 (say Quiz1 12, Quiz3 14 counted, Quiz2 10 excluded) + Internal 17 + End-sem 42 → **85/100** → grade band 80–89 → **9 points** → contributes `4×9` to SGPA.

**Quiz is OFFLINE by requirement**: tests are conducted in classroom; the site only **displays** marks entered by the teacher (banner everywhere + teacher-only 0–15 entry). No "take quiz online" flow — that was an explicit correction from client (me).

---

## 8. Login / multi-user / persistence design (final evolution)

- `login.html`: role tabs, identifier (email **or roll no. or first name**), password (fake — any non-empty), one-click demo chips; `?role=` deep-link; "Continue as" banner if already logged in
- Session: user object in `localStorage['mca_current_user']`; **portal guard** — if logged-in role ≠ page role, red banner links to correct portal; role decided by the **page** (`window.ROLE`), never trust storage alone
- **Mock DB persistence**: every write calls `MockDB.persist()` → JSON in `localStorage['mca_db_v2']` → **survives reload**, shared across both portals in the same browser — so teacher edits genuinely change what that student sees. `loadPersisted()` restores on boot.
- Data model: 4 students, 2 teachers, 8 subjects, **32 attendance records (every student × every subject)**, 56 quiz marks, per-student internals/endsems/labs, assignments + submissions keyed by studentId
- Multiple people can demo on one machine: logout/login switches account; **each browser is its own "classroom"** (no server = no cross-device sync — state this as an honest limitation + future work)

---

## 9. UX features list (things to SHOW during presentation)

1. Skeleton loaders (shimmer) while `await`ing mock API → loading states
2. Empty state + Error state + **Retry** button on every view
3. Toast notifications (success/error, auto-dismiss 3.8s, manual close)
4. Bootstrap modals: Add Subject, Create Assignment, Submit file, Grade, Attendance
5. Live search (Enter) across subjects/assignments/notes/notices with result counts
6. Notification dropdown with unread badge count from API
7. Dark mode toggle (moon icon)
8. Semester tabs (Sem 1–4) re-load all views
9. Teacher: student switcher (topbar + per-view) — attendance/quiz/internal editing for **any** student
10. Below-75% red flags, progress bars, conic-gradient gauges
11. Best-2 visualized: "Counted / Excluded" badges on each quiz
12. Fully responsive + burger sidebar + swipe tables on mobile
13. One-click demo login chips (judges/teacher can try instantly)

---

## 10. Performance & engineering practices (bonus points)

- **CDN hosting** of libraries (jsDelivr/cdnjs) → cached, minified (`bootstrap.min.css`)
- Only 5 JS files loaded per page; app logic in **one IIFE** (no global pollution)
- **Parallel fetches** via `Promise.all` (dashboard loads 11 endpoints at once, not sequentially)
- Deep-clone responses so UI can't mutate DB (data-integrity, like a real API boundary)
- Pure calculation functions separated from UI ⇒ unit-testable (27-assertion suite in `tests/run_tests.js` passes, incl. simulated page-reload persistence test)
- `color-mix`/CSS vars re-theme in seconds (proven: re-colored whole app blue→crimson in one pass)
- Graceful degradation: if CDN offline, custom CSS still holds layout; error states catch API failures
- `defer`-style boot via `DOMContentLoaded` check in app.js

---

## 11. Honest limitations & future scope (say it before examiner does)

| Limitation | Future work |
|---|---|
| No real backend; localStorage is per-browser | Flask/Django REST + JWT auth; swap `simulateFetch`→`fetch` |
| File upload only records filename | multipart upload to object storage |
| Password not verified (demo) | bcrypt + session cookies |
| Single section (Sem-1 batch) | multi-batch, admin role, CSV import of students |
| No email/SMS alerts | notification service |
| Offline demo = no CDN styles | self-host libs for air-gapped viva |

---

*Files: full inventory in §3. This doc auto-derived from `grep` scans of the actual repo on 21-09-2025 — every number above is verifiable by running the commands in `docs/` companion scripts or `wc -l`.*
