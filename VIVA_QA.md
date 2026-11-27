# Viva Question Bank — MCA Academic Dashboard
### 70 questions the sir is most likely to ask, with short speakable answers.
**Tip:** answer 2–3 lines max, then offer to show it live ("I can demonstrate?"). Answers below are phrased in the exact English you can speak.

---

## A. Project & Architecture (asked first 90% of the time)

**Q1. What is your project?**
> It's a role-based academic management dashboard for MCA — student and teacher portals — implementing our college's evaluation rules: best two of three quizzes out of thirty, internal marks out of twenty, end-semester out of fifty, lab components out of a hundred, attendance eligibility at seventy-five percent, and credit-weighted SGPA and CGPA. It's a complete frontend built on HTML5, CSS3, ES6 JavaScript, Bootstrap 5 and Chart.js, talking to a centralized API layer.

**Q2. Which backend/database did you use?**
> None — and that's the design. The assignment is frontend-only. I built a centralized API service layer in `js/api.js` that exposes REST-style functions — getSubjects, updateAttendance, gradeSubmission — backed by an in-memory JSON store with simulated network latency. Swapping in a real Flask/Django API means changing one function and the base URL in `js/config.js`; the UI doesn't change at all. That separation is the point of the architecture.

**Q3. Then how does data persist / what is this localStorage?**
> I'm not storing academic logic in localStorage — calculations always run through the API layer. I use exactly two localStorage keys: one for the login session, and one to persist the mock database, so when a teacher edits attendance and reloads, the student portal shows it. It simulates what a server database would do.

**Q4. Explain your file/folder structure.**
> `index.html` landing and `login.html`; `css/` has a 430-line design-system `style.css` with CSS variables, plus dashboard and responsive layers; `js/` is split by concern — `config.js` constants, `api.js` service layer, `calculations.js` pure business rules, `charts.js` Chart.js renderers, `app.js` the controller/router — and `student/` `teacher/` folders hold each portal. Script order is config → calculations → api → charts → app, so every dependency loads before its consumer.

**Q5. What is an API? What is REST?**
> An API is a contract between two software components — here, UI and data layer. REST is an architectural style: resources identified by URLs, operations mapped to HTTP verbs (GET reads, POST creates, PUT updates, DELETE removes), stateless, JSON payloads. My mock mirrors that — `API.getAttendance({studentId})` returns a Promise of JSON and `updateAttendance` returns 404/400-style errors.

**Q6. What is `API_BASE_URL` used for?**
> It's a single configuration constant in `config.js`. Every endpoint conceptually hangs under it, so moving from mock to a deployed server or changing environments is a one-line change, not a code hunt.

**Q7. Difference between fetch and axios? What did you use?**
> Both are Promise-based HTTP clients; axios adds interceptors, automatic JSON transform, timeouts and better error objects in a wrapper. I used the structure of `fetch` with a Promise adapter. I didn't need a dependency, and the spec said fetch or axios.

**Q8. What happens step-by-step when the student dashboard loads?**
> Login stored the session → `app.js` IIFE boots on DOMContentLoaded → reads the persisted user, decides portal role → calls `setView('dashboard')` → dashboard fires `Promise.all` of eleven API calls → skeleton loaders show → data arrives → pure functions in `calculations.js` compute Best-2, totals, SGPA → HTML strings injected, Chart.js renders from same data → listeners bound. If any call fails, catch renders an error card with a Retry button.

**Q9. Is this a SPA?**
> It behaves like one: no page reloads on navigation — `setView()` swaps sections by `data-view` attributes and re-runs loaders, like a router in a single-page app, but hand-written without a framework.

**Q10. What design patterns did you use?**
> Module pattern — entire app is an IIFE keeping state private with closures; observer-ish event listeners on forms; adapter — `simulateFetch` isolates the transport so the backend is swappable; repository pattern — all data access funnels through the API object, nothing else touches MockDB; DTO-ish aggregation in `getMarks` combining four endpoints.

---

## B. HTML5 questions

**Q11. What is `<!DOCTYPE html>` for?**
> It switches the browser to standards mode so layout rules render per the HTML5 spec; without it quirks mode breaks box model behavior.

**Q12. What is semantic HTML and why use it?**
> Tags that describe meaning — `header, nav, aside, section, footer` — instead of only `div`. Screen readers, SEO and maintainability all benefit; my layout uses `aside` for the sidebar, `header` for the topbar, `nav` for menus, `section` for page regions.

**Q13. Difference between `<div>` and `<section>`?**
> `div` is a generic container with no meaning; `section` is thematic content, ideally with a heading, visible in the document outline.

**Q14. `<span>` vs `<div>`?**
> `span` is inline — flows inside text; `div` is block-level — starts a new line. I use span for badge-style inline labels.

**Q15. What does the viewport meta tag do?**
> `<meta name="viewport" content="width=device-width, initial-scale=1">` tells a mobile browser to match the layout viewport to the device width instead of faking a 980px desktop — without it, no responsive design works at all.

**Q16. Explain your form validation.**
> Two layers: HTML5 native — `required`, `type=number` with `min/max`, `type=date`, file `accept` — gives instant browser feedback; and JS custom validation in the submit handlers for business rules — credits greater than zero, internal components summing to exactly twenty, attended not exceeding total — with toasts. Server-side (API layer) also rejects with 400s, so UI can't be trusted alone.

**Q17. `<input type="date">` vs a JS date picker?**
> Native date input is zero-dependency, accessible, and mobile-optimized with platform pickers; JS libraries give more formatting control. I used native for deadlines.

**Q18. How does a file upload work in your project?**
> `input type=file` — on change I read `file.name` and `file.size` client-side and record the submission through the API with a `fileUrl` placeholder; actual bytes would go to storage in a real backend via multipart form data — noted in my future-scope.

**Q19. What are data-attributes? Where did you use them?**
> `data-*` attributes attach custom data to DOM nodes, readable via `element.dataset`. I drive my entire navigation with `data-view` and Bootstrap components with `data-bs-toggle`/`data-bs-target` — declarative, no inline JS.

**Q20. `<table>` semantics — did you use them properly?**
> Yes — dynamic tables have `thead`, `tbody`, `th` headers; wrapped in `.table-responsive` so phones get horizontal scroll instead of overflow.

**Q21. What is `<canvas>` and how is it used here?**
> A bitmap drawing surface driven by JS; Chart.js draws every bar, line, radar and doughnut chart inside my six canvas elements with fixed-height responsive wrappers.

**Q22. How do you link CSS and JS files, and what is defer/async?**
> `<link rel="stylesheet">` in head, `<script src>` at end of body. `defer` loads in background and executes after parsing in order; `async` executes as soon as downloaded — I place scripts manually in dependency order, so ordering is guaranteed without them.

**Q23. What is `lang`, `charset`, `<title>` used for?**
> `lang="en"` helps screeners/hyphenation/translation; `charset=UTF-8` guarantees bullets like • render; title sets tab/search label.

**Q24. Accessibility touches you made?**
> Semantic landmarks, `label` for every input, `aria-expanded` on dropdown, `:focus-visible` rings, color-contrast on the crimson/white palette, 40px touch targets on `hover:none` devices, and status always paired with text/icons — never color alone.

---

## C. CSS questions

**Q25. What are CSS variables/custom properties and why use them?**
> `--name: value` declarations, usually on `:root`, consumed with `var()`. I have 188 usages; the whole theme — colors, radii, shadows, sidebar width — changes from one block. Dark mode and my red re-theme were each a few variable edits.

**Q26. How did you implement dark mode?**
> A second variable block under the attribute selector `[data-theme="dark"]` overrides the same custom properties; a toggle button flips the attribute on `<html>`. Only the attribute changes — every component re-derives colors. I deliberately don't persist the choice — session-only.

**Q27. Explain the box model.**
> Content → padding → border → margin. With `box-sizing: border-box`, width includes padding+border, which is why I set it globally `*` — sizing math stops lying.

**Q28. Flexbox vs Grid — where did you use what?**
> Flexbox is one-dimensional — I use it for the topbar, card rows, gap layouts (`justify-content`, `align-items`, `gap`). Grid is two-dimensional — `repeat(auto-fit, minmax(140px,1fr))` for the internal-marks grid and `place-items` for logo/avatar boxes. Grid for layouts, flex for alignment.

**Q29. position: relative vs absolute vs fixed vs sticky?**
> Relative offsets itself, stays in flow; absolute positions against the nearest positioned ancestor and leaves flow — my search-arrow button; fixed pins to viewport — sidebar and toast container; sticky scrolls then sticks at an offset — topbar and sidebar brand.

**Q30. What is specificity and how does Bootstrap fit?**
> Inline > ID > class > element; equal weight = last wins. To override Bootstrap I add same-or-higher specificity — `.topbar .btn-primary` — and I minimized `!important` to just the deliberate brand overrides.

**Q31. What is a media query? Which breakpoints?**
> `@media (max-width: 991.98px){…}` conditionally applies CSS. I tuned four tiers — 1200, 992, 768, 480 — plus Bootstrap's grid breakpoints, because Bootstrap's col-* classes are themselves media-query-driven.

**Q32. `rem` vs `em` vs `px` vs `%` vs `vh/vw`?**
> rem = root-font multiples (accessibility-friendly, my typography), em = parent-font, px absolute (borders), % of parent box, vh/vw viewport fractions (hero `min-height`, `max-width:86vw` sidebar).

**Q33. Transitions vs animations?**
> Transition interpolates between two states on an event — my hover-lift `.15s ease`; `@keyframes` animation is scriptable regardless of state — my skeleton shimmer loops `infinite linear`. Both hardware-friendly since I only animate transform/opacity mostly.

**Q34. What are pseudo-classes and pseudo-elements?**
> Pseudo-classes select states — `:hover, :focus-visible, :active`; pseudo-elements create styling boxes that don't exist in markup — `::before/::after`. My decorative sidebar marker, hero circle and stat glow are all `::after` — zero extra HTML.

**Q35. Gradients — did you need images?**
> No — linear for the hero, radial for card glows, and a **conic-gradient** for the attendance ring and CGPA gauge — a data visualization in pure CSS without SVG.

**Q36. What is `calc()`, `clamp()`, `color-mix()`?**
> `calc(100vw - 16px)` mixed math for dropdown max-width; `clamp(1.6rem, 3vw, 2rem)` fluid headline sizing — scales with viewport, bounded; `color-mix(in srgb, …)` blends theme colors — used in focus rings and header tints.

**Q37. What is backdrop-filter?**
> Applies effects to the pixels behind a semi-transparent element — my topbar has `blur(12px)` frosted glass over scrolling content.

**Q38. How did you make it responsive — summarize?**
> Bootstrap 12-column grid (`col-6 col-md-6 col-xl-3`) for card flow, off-canvas sidebar under 992px with a burger toggle, four custom media-query tiers, `min-width:0` and `overflow` guards against flex/grid blowouts, `table-responsive`, touch-target rules under `@media (hover:none)`, and viewport meta at the root.

**Q39. What is z-index and the stacking context gotcha?**
> Later/painted stacking order wins only inside a common stacking context; a transformed/filtered ancestor creates a new one — that's why overlays live near top of body, sidebar 1040, overlay 1035, toasts 1080.

**Q40. `display:none` vs `visibility:hidden`?**
> none removes from layout — space collapses; visibility keeps the box but hides ink. My view router uses `d-none` — Bootstrap's utility for display:none — so inactive views cost zero layout.

---

## D. JavaScript ES6 questions

**Q41. var vs let vs const?**
> `let/const` are block-scoped with temporal dead zone; `var` is function-scoped and hoisted-initialized — a bug factory. I use `const` by default (400), `let` only when reassigned (34), `var` never.

**Q42. Arrow function vs normal function?**
> Arrow functions are lexical `this`, implicit return and terse syntax — perfect for callbacks like `.map(q => …)`. They lack their own `this`/`prototype`, so class methods need `function` style.

**Q43. Template literals — why not concatenation?**
> Backtick strings with `${}` interpolation and multiline support; my whole UI is built as HTML template strings with embedded expressions — plus a gotcha I actually hit: nested backticks in ternaries need care, which is a real debugging story I can tell.

**Q44. What is a Promise? States?**
> An object representing an async result: pending → fulfilled or rejected; `.then/.catch` or await. Every API call returns one; `Promise.all` runs eleven requests concurrently and waits for all.

**Q45. async/await vs .then chains?**
> `async function` returns a Promise; `await` pauses until settled, making async read like sync with normal try/catch. Mine use it for all loaders with error UI in catch.

**Q46. What is an IIFE and why wrap app.js in one?**
> Immediately-invoked function expression — `(function(){ … })()` — runs once, and everything inside is private. My `State` object can't be tampered with globally; only explicit exports like `window.setView` exist. It's the pre-module pattern for script tags.

**Q47. What is a closure? Give an example from your code.**
> A function remembering its outer scope variables. My `toast(msg)` closes over `$('#toastContainer')`; `setView` closes over `State` — persistent private state without a class.

**Q48. Explain map/filter/reduce with your real uses.**
> `map` transforms arrays — subjects array to card HTML (79 uses); `filter` selects — assignments matching search (60); `find` locates one — subject by id (54); `reduce` aggregates — internal component maxMarks summing to twenty.

**Q49. Destructuring & spread — used where?**
> `const [subjects, students] = await Promise.all(…)` array destructuring; spread for immutable updates `{...rec, ...payload}` and shallow copies `[...MockDB.attendance]` — deep clone via JSON for API responses so a view mutation can't corrupt the database.

**Q50. What is optional chaining?**
> `internal?.components || []` — returns undefined instead of throwing when a link is missing. Prevents "cannot read property" crashes when a student has no internal record yet — exactly my case with new students.

**Q51. How do you update the DOM? InnerHTML vs createElement?**
> `innerHTML` with template strings for bulk view rendering — fast to build, safe because every interpolated value passes through my escaper; `createElement` where I attach behavior — toasts, banners.

**Q52. Event listeners & preventDefault — why?**
> Forms natively navigate and reload; I call `e.preventDefault()` on submit, handle via JS to the API, then re-render only the affected view — the no-reload SPA feel.

**Q53. What is event delegation?**
> Listening on a parent and checking the target — my notice filter buttons bind once at render, sidebar links each bound but could delegate; for this size, direct listeners are fine and clearer.

**Q54. How does your search work?**
> Keydown Enter on the input → `handleSearch(q)` → API search across four resources with lowercase `includes` match → result card renders counts + grouped clickable results; clearing re-renders the current view.

**Q55. How is XSS prevented?**
> Single choke-point `esc()` mapping `& < > " '` to entities before ANY dynamic string enters HTML, plus `escAttr` for attribute contexts. Even local data passes through it — the discipline that matters in real apps with user input.

**Q56. JSON — what and where?**
> JavaScript Object Notation — text format for data exchange. `JSON.stringify` persists mock DB to localStorage; `JSON.parse` restores and deep-clones API responses; `fetch` would `response.json()` in production.

**Q57. localStorage vs sessionStorage?**
> Both same-origin string stores. Local persists until cleared, shared across tabs of the browser; session dies with the tab and needs an extra tab check for login. I chose local for the two keys; sessionStorage banned by spec — moot.

**Q58. What happens if your API "fails"?**
> `simulateFetch` has an error-rate dial; real failures flow through Promise rejection to the loader's catch, showing an error card with the message and a Retry button that re-invokes the same async loader — no dead UI.

**Q59. How would you add authentication for real?**
> Server-side: POST credentials → hashed-password check (bcrypt) → signed JWT/session cookie; API adapter adds an auth header to every request; my logout clears storage. Never trust a client-side flag — my portal guard already shows the pattern: role is validated against page context.

---

## E. Bootstrap / Chart.js / Libraries

**Q60. What Bootstrap components did you use (not just classes)?**
> Grid, Reboot/utilities, **Modal** (5 — subject, assignment, submission, grade, attendance) with `data-bs-*` API, **Dropdown** (notifications), **Collapse** (mobile search), Nav pills for tabs, spinner, badges, tables, form-control styling — all initialized by `bootstrap.bundle.min.js` which includes Popper for positioning.

**Q61. Explain grid classes: `col-6 col-md-6 col-xl-3`.**
> Base `col-6` = half-width always; `md` and up keeps 6; from `xl` it's a quarter row. Mobile-first: smallest applies, larger override. `g-3` sets a gutter gap. That's my stat-card row: 2 per row on phones, 4 on desktops.

**Q62. What is a CDN and why use one?**
> Content Delivery Network — geographically distributed caches serving `min.css/min.js`; faster, versioned, no build tooling. Risk: offline = missing styles — I keep all custom CSS local so layout survives, noted in limitations.

**Q63. Chart.js — how does it work?**
> `new Chart(canvasCtx, {type, data:{labels, datasets}, options})` renders on a canvas; I wrapped five renderers in `charts.js` — attendance bar (75% baseline), quiz bar with Best-2 highlight, internal/assignment doughnut & radar, SGPA trend line — each fed by the same API data, responsive with `maintainAspectRatio:false` in fixed-height wrappers.

**Q64. How do Font Awesome icons work?**
> Webfont/SVG: `<i class="fa-solid fa-pen">` maps a CSS class to a glyph. I keep semantics in my own text and icons decorative only.

---

## F. Rules & domain logic (the MCA part — shine here)

**Q65. Explain your Best-2-of-3 implementation.**
> `calculateBestTwoQuizzes` sorts a student's three 15-mark quiz records descending, sums the top two for a 30 cap, and returns the remainder as excluded. UI shows per-card badges "Counted"/"Excluded (lowest)"; if fewer than three exist it's incomplete and the banner says so. It's not an average — one bad test is dropped entirely.

**Q66. Full marks formula per subject?**
> Theory: 2×15 quizzes = 30 + internal 20 + end-sem 50 = **100**. Lab: configurable components defaulting to assignment 20 + EPP 30 + two quizzes 15+15 + daily 20 = **100**. Internal components are teacher-defined but their max must total exactly 20 — enforced live with a red/green badge and API rejection. The teacher enters end-sem marks (0–50) in the "Quizzes & End-Sem" view — one entry strip per subject card, scoped per selected student, validated twice: HTML min/max and the API returning a 400 — and the card shows the running theory total so faculty see exactly what the student will see.

**Q67. Does attendance give marks?**
> No — spec rule. Attendance percent is computed per subject and overall; at 75% eligibility is flagged for the exam form. It only appears as progress bars, badges, and a shortage alert — never in any total.

**Q68. SGPA vs CGPA — exact formula?**
> SGPA = Σ(credit × grade-point)/Σ credits for one semester. CGPA = the same across all semesters combined — **credit-weighted, not the mean of SGPAs**; a 4-credit subject moves CGPA more than a 2-credit lab. Grade points from the config map: 90–100→10 … below 40→0.

**Q69. Where are quizzes actually taken then?**
> Offline, in the classroom — that's the product definition: the website never asks students to attempt a quiz; it displays marks the faculty enters through the teacher portal, auto-computing Best-2 and totals instantly for the student portal.

**Q70. Multi-user demo story?**
> Teacher edits Priya's DBMS attendance 29/30 → `updateAttendance` validates, MockDB mutates, `persist()` writes `mca_db_v2`. Student logs in as Priya on the same machine → same page reads the persisted store → shows 96.7% eligible. Cross-device needs a real DB — first item in future scope.

---


**Bug story #2 — the blank Subject Details page (real debug):** students reported Subject Details showing nothing. Root cause: the sidebar nav routed via `setView('subject-details')`, which only toggles CSS sections — it never called `openSubject()` (content loaded only from the "View Subject" card button). First fix introduced a second bug — a recursion guard flag was written *after* the `setView()` call that reads it → infinite re-entry → stack overflow in my Node DOM-stub harness (`tests/view_smoke.test.js`). Correct fix: set the `pending-<id>` sentinel *before* `setView()`, auto-select the first subject of the semester when none is picked, and show a friendly empty-state with "Go to Subjects" when zero exist. Lesson told to class: **the guard variable for re-entrancy must be set before the call that re-enters** — and it proves why I wrote a view-level test harness instead of clicking around.

## G. Tricky / "gotcha" questions + your honest playbook

| If sir asks… | You say |
|---|---|
| "You cheated — no backend?" | "Backend is out of scope for this submission by design; the entire data contract is already REST-shaped — here's the one function to swap" (open `api.js simulateFetch`) |
| "Is this responsive? Prove it." | F12 → iPhone SE 375px — burger sidebar, 2-col stats, swipe tables, 40px targets; then 1440 — 4-col dashboard |
| "Why not React?" | "Requirement stack is HTML/CSS/JS/Bootstrap; the module pattern gives the same encapsulation for this scale without build tooling — a framework would be over-engineering for the brief" |
| "localStorage is unsafe, everyone knows that" | "Agreed — that's why it's not the security boundary here: it only seeds demo data and session identity; real deployments replace it with a server + JWT; I validate role against page context, not storage" |
| "What broke while building?" | "A nested template-literal SyntaxError killed all JS silently — sidebar, modals, search, all dead. Fixed it by rebuilding that view with string concat, added `node --check` in my loop for every save, and wrote 30 automated tests covering per-student attendance, validations, and reload persistence" — honesty + testing = marks |
| "Two tabs open, both edit — conflict?" | "Last-write-wins on the mock DB; a real backend solves with transactions; my deep-clone-per-response already prevents UI-side shared-state mutation" |
| "How did you test?" | `tests/run_tests.js` — a Node harness stubbing localStorage: **27 assertions in 5 suites** (per-student isolation incl. 32-row attendance matrix, all six validation rules returning 400s, write-persist, auth matching incl. 404s, and a simulated page-reload proving persistence) — plus `node --check` on every JS file, and manual breakpoint/keyboard checks |
| "Explain one bug you're proud of fixing" | The `dashboard.css` loading AFTER `style.css` silently overriding the new crimson hero back to blue — cascade order lesson; fixed and then grepped the whole repo for stale brand colors |

---

## H. 60-second rapid answers (last-minute cram)

- DOCTYPE = standards mode • viewport = mobile scaling • semantic = meaning tags
- `:root` + `var()` = theme tokens • `[data-theme=dark]` = dark mode • `@media` = breakpoints
- flex 1-D / grid 2-D • sticky vs fixed • box-sizing border-box
- const/let scoped • arrow = lexical this • backticks = interpolation
- Promise pending/fulfilled/rejected • await = readable async • Promise.all = parallel
- IIFE = private module • closure = remembered scope • map/filter/find/reduce
- esc() = XSS escape • FormData = read form • dataset = data-*
- mock adapter = swappable transport • localStorage ×2 keys only
- Best2/30 + Int20 + End50 = 100 • SGPA = ΣC×G/ΣC • CGPA = weighted, not average
- Attendance ≠ marks, 75% gate • lab configurable =100 • internals sum=20 enforced
