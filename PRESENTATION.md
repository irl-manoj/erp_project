# Class Presentation — Script + Slide Plan + Live Demo
**Time budget: ~10 min talk + 5 min demo. Adjust per sir's rules. [bracket] = action, not spoken.**

---

## Slide plan (9 slides — put these bullets in PowerPoint, keep them sparse)

**S1 · Title** — MCA Academic Management Dashboard · Your Name · MCA Sem-1 · BIT Mesra · *(screenshot collage of both portals)*

**S2 · Problem Statement**
- Marks, attendance, assignments scattered: registers, WhatsApp groups, memory
- Students can't see how totals are computed; faculty recompute SGPA manually
- Goal: one dashboard, two roles, our college's exact evaluation rules

**S3 · Objectives**
- Role-based portals (Student / Teacher) with login
- Encode rules: Best 2 of 3 · Internal 20 · End-Sem 50 · Lab 100 · 75% attendance · credit-weighted SGPA/CGPA
- API-driven frontend — zero backend dependency, production-ready contract
- Responsive + accessible + dark mode

**S4 · Tech Stack** (two columns)
- **Core:** HTML5 semantic, CSS3 (vars/flex/grid/animations), JavaScript ES6+ (async/await, modules pattern, fetch-style Promises)
- **Libraries:** Bootstrap 5.3.3 · Chart.js 4.4.3 · Font Awesome 6.5.2 — all CDN
- **Explicitly none:** no Flask/Django/PHP/database — mock REST adapter with swappable transport

**S5 · Architecture** *(draw simple boxes)*
```
login.html / index.html
        │ session
Student SPA ←┐            ┌→→ Teacher SPA (manage any student)
        ├─ app.js (router + views + forms + validation)
        │        ↓
        │  calculations.js  (pure business rules)
        │        ↓
        │  api.js  ← REST-style service layer (getSubjects, updateAttendance…)
        │        ↓
        │  simulateFetch() + MockDB JSON  →  persist() → localStorage
        │        ↑
        └ config.js (API_BASE_URL, rules, grade map)   → real backend = swap 1 function
```
Say: *"Every UI call goes through one API object; the mock behaves like a network — Promises, latency, 400/404 errors — so the UI never knows the difference."*

**S6 · Evaluation Engine** (the numbers sir will check)
- Theory: quiz 3×15 → **best two = 30** + internal **20** (components configurable, Σmax=20 enforced) + end-sem **50** = **100**
- Lab: 20+30+15+15+20 = **100**, editable per subject
- Attendance: per student **per subject**, 75% eligibility, **adds no marks**
- SGPA = Σ(credit×GP)/Σcredit · CGPA = credit-weighted across semesters · GP map 90+→10 … <40→0
- Live worked example: `12+14=26 (10 excluded) + 17 + 42 = 85/100 → GP 9 → 4×9 in SGPA`

**S7 · Features** *(3×2 icon grid)*
Dual-portal login · Best-2 badges "Counted/Excluded" · offline-quiz display model · per-student attendance editing with live % · assignment create→submit→grade→feedback flow · search + notices + notes + syllabus tracker · skeletons/empty/error+Retry states · toasts · dark mode · responsive 360px→4K · 27-assertion test suite

**S8 · Live Demo** (transition slide — go to browser)

**S9 · Conclusion + Future Scope**
- Done: rules engine, two roles, multi-user persistence, responsive SaaS UI, testing
- Next: real REST backend + JWT, file storage, multi-batch, email alerts, PWA
- Thank you + questions

---

## Opening script (memorize ~40s, then speak naturally)

> "Good morning everyone. My project is an MCA Academic Management Dashboard — and the reason it exists is personal: every semester, we chase three different people for quiz marks, nobody knows how the best-of-two is being calculated, and attendance surprises us at exam-form time. I built one system where faculty enter data once, and every rule of our evaluation — Best 2 of 3 out of 30, internal 20, end-sem 50, the 75% attendance gate, credit-weighted SGPA — is computed automatically and visible to students instantly. Technically it's HTML5, CSS3, ES6 JavaScript with Bootstrap 5 and Chart.js. The architecture note I'd highlight: there is deliberately no backend in this submission — but every piece of data flows through a REST-shaped service layer with Promises, latency and error codes, so production is a one-function swap, not a rewrite. Let me show you."

---

## Live demo script (6–8 min — rehearsé twice; keep 2 tabs open: teacher + student)

**Prep checklist:** server running (`python3 -m http.server 8000`) · 2 browser windows side-by-side or fast Ctrl+Tab · login chips ready · dark mode & DevTools open · internet ON for CDNs · fallback: your own laptop + phone hotspot.

1. **Login page** *(20s)*
   "Two roles, one screen. No accounts — demo passwords accepted by design since it's frontend-only." Click a **teacher demo chip** → Login.
2. **Faculty dashboard** *(45s)*
   "Teacher does NOT have personal marks — this is a management console: subjects he teaches, class strength, pending grading queue, upcoming exams." Point at **Class Attendance Overview** — "four students, each their own numbers; Aman already shows two subjects below 75% in red."
3. **Edit attendance — the money moment** *(60s)*
   Sidebar → Attendance. "Every student, every subject — 4 students × 8 subjects." Select **Aman**, change Discrete Maths attended 29→31 → Save → "% jumps above 75". Toast shows persistence. "This is stored through the mock API and persists — watch the student side."
4. **Switch to Aman's student login** *(45s)*
   Logout → landing shows "Logged in…" gone → login as **Aman Verma** → Dashboard → Attendance. "Discrete Maths now eligible — 78.9%. That's per-student data integrity across portals. Best-2 cards, SGPA, pending assignments — all his own."
5. **Quiz model explanation** *(30s)*
   Student → Quiz & Marks. "Important product decision: quizzes are offline classroom tests — the site never takes an online quiz, it *displays* marks faculty entered. The system auto-excludes the lowest: see — Quiz2 10/15 marked **Excluded (lowest)**, 12+14 = 26/30. That 26 feeds the final: 26 + internal 17 + end-sem 42 = 85/100."
6. **Teacher enters marks** *(40s)*
   Teacher tab → Quizzes & End-Sem. Student switcher visible. Change a mark 11→13 → Best2 banner recalculates **live**. Then the **End-Semester strip (out of 50)** at the bottom of the card: enter e.g. 44 → Save → badge flips "44/50 saved" and the card shows `26 + 17 + 44 = 87/100 → GP 8`. Switch to Aman's student tab → subject page total matches exactly. Then flash Internal Config: "components must sum to exactly 20 — try 25 and both UI and API reject with 400. Same 400 guard on end-sem: type 55, Save — rejected in UI before it even hits the API."
7. **Assignments mini-flow** *(30s)*
   Teacher: Create Assignment modal → title/deadline → Create → student tab: appears instantly → open Submit modal, pick any file → "Awaiting grading" → teacher: grade 18 + feedback → student sees marks. "That's the whole lifecycle through the API layer."
8. **Responsive + polish** *(40s)*
   DevTools → device toolbar → 375px: "sidebar off-canvas with burger, cards reflow 2-per-row, tables scroll, touch targets enlarge." Toggle dark mode: "same CSS-variable tokens." Search: type `DBMS` + Enter → grouped results with counts.
9. **Close** *(15s)*
   "Twenty-seven automated assertions in the repo cover per-student isolation, validations and persistence across reload — I can run `node tests/run_tests.js` if useful. That's the project — any questions on the rules engine or the API adapter?"

**If something breaks live:** reload (10s), demo data regenerates from defaults if storage cleared; say "the retry button and error states exist exactly for this — API failures degrade, never white-screen" → move on. **Have screenshots of slides S2/S6 numbers on standby.**

---

## Presentation delivery tips

- **Stand for demo, sit for slides** if possible; point at the *numbers* on screen (26/30, 75%, 85/100) — sir trusts concrete values
- Never read slides; each bullet is a trigger, sentences come from the script patterns above
- If nervous, follow the formula: **"What it is → why it matters → how it works → show it"**
- Expect architecture + one calculation question; open `config.js`/`calculations.js` if code view is allowed — the formula lines are 8–12 each
- Time discipline: slide 5 (architecture) is where students ramble — one breath, show the diagram, move
- End line ready for "what did you learn": *"API contracts and async patterns — plus the brutal lesson of a silent template-literal syntax error killing an entire controller; now every save gets `node --check`, and I shipped a test harness rather than trusting eyeballs."*

---

## 1-page cheat card (print this, keep in pocket)

```
DEFINE: role-based academic dashboard · rules engine · API-driven frontend
STACK : HTML5 CSS3 ES6+ Bootstrap5.3.3 Chart.js4.4.3 FA6.5.2 | NO backend (mock REST adapter, Promise+latency)
RULES : quiz 3×15→best2=30 | internal=20 (Σmax enforced) | endsem=50 → THEORY 100
        lab 20+30+15+15+20=100 configurable | attend per-std per-subj, 75% gate, NO marks
        SGPA=Σ(c×gp)/Σc | CGPA credit-weighted | GP: 90→10 80→9 70→8 60→7 50→6 40→5 else 0
DEMO FLOW: teacher login → attendance edit Aman → student Aman sees fix → quiz best2 excluded
        → teacher quiz mark 13 live-recalc → assignment create/submit/grade → 375px + dark
FILES : config.js URL+rules · api.js 25 endpoints+auth+persist · calculations.js pure fns
        app.js IIFE State+setView router+esc() XSS+toasts/skeletons/errors · charts.js 5 renderers
STORAGE: ONLY mca_current_user + mca_db_v2 (session + mock-DB persist). sessionStorage never.
TESTS : node tests/run_tests.js → 27/27 (per-student isolation, 400/404s, reload persist) + node --check 17 JS
LIMITS: per-browser sync, filename-only uploads, demo auth → backend+JWT+multipart = next
```
