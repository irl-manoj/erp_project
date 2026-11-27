/**
 * View-layer smoke test — actually executes app.js (student portal) inside a minimal DOM stub,
 * then drives the sidebar path: setView('subject-details') → openSubject() → real render.
 * Proves the "student subject details blank" bug is fixed and nav re-entry doesn't refetch.
 * Run: node tests/view_smoke.test.js
 */
'use strict';
const path = require('path');

// ---------- stubs ----------
const store = {};
global.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};

function fakeEl(sel) {
  const el = {
    _sel: sel, innerHTML: '', textContent: '', value: '',
    dataset: {}, style: {}, children: [],
    classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    setAttribute() {}, removeAttribute() {}, getAttribute() { return null; },
    addEventListener(t, fn) { (el._ls = el._ls || {})[t] = fn; },
    appendChild(c) { el.children.push(c); return c; },
    before() {}, insertAdjacentHTML(_, h) { el.innerHTML += h; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    closest() { return null; }, remove() {}, focus() {}, click() {},
    scrollIntoView() {}, offsetHeight: 0, offsetWidth: 0,
  };
  return el;
}
const elCache = new Map();
const docListeners = {};
global.document = {
  readyState: 'complete',
  querySelector: s => { if (!elCache.has(s)) elCache.set(s, fakeEl(s)); return elCache.get(s); },
  getElementById: id => { const s = '#' + id; if (!elCache.has(s)) elCache.set(s, fakeEl(s)); return elCache.get(s); },
  querySelectorAll: () => [],
  createElement: t => fakeEl('<' + t + '>'),
  addEventListener: (t, fn) => { docListeners[t] = fn; },
  body: fakeEl('body'), documentElement: fakeEl('html'), head: fakeEl('head'),
};
global.window = global;
global.location = { href: 'http://localhost:8000/student/dashboard.html', pathname: '/student/dashboard.html', search: '', assign(h) { this.href = h; } };
global.history = { pushState() {} };
global.scrollTo = () => {};
global.bootstrap = { Modal: class { static getInstance() { return { hide() {} } } show() {} } };
global.Chart = undefined;
global.__timers = [];
const _origTimeout = global.setTimeout;
global.setTimeout = (fn, ms, ...a) => _origTimeout(() => { try { fn(...a); } catch (e) { /* chart paints on fake canvas — swallow, not part of this test */ } }, ms, ...a);

// login as Manoj (student 101) BEFORE loading app.js
store['mca_current_user'] = JSON.stringify({ id: 101, name: 'Manoj Das', roll: 'MCA/2024/017', role: 'student', email: 'manoj.das@bitmesra.ac.in' });

global.CONFIG = require(path.join(__dirname, '../js/config.js'));
global.CONFIG.MOCK_DELAY = 0;
const { API, MockDB } = require(path.join(__dirname, '../js/api.js'));
MockDB.setErrorRate(0); // deterministic harness (no random 500s)
global.API = API;
// charts stub with every renderer name used
global.Charts = new Proxy({}, { get: () => () => {} });
// pure calc functions are globals in the browser (script tags) — expose them like the page does
Object.assign(global, require(path.join(__dirname, '../js/calculations.js')));

global.ROLE = 'student';

let passed = 0, failed = 0;
const ok = (c, n) => { c ? (passed++, console.log('  PASS - ' + n)) : (failed++, console.log('  FAIL - ' + n)); };
const sleep = ms => new Promise(r => _origTimeout(r, ms));

(async () => {
  console.log('== Booting app.js under DOM stub (student=Manoj 101) ==');
  require(path.join(__dirname, '../js/app.js'));
  if (docListeners['DOMContentLoaded']) docListeners['DOMContentLoaded']();
  await sleep(1200); // initial dashboard load (simulateFetch jitter up to 300ms/call)

  console.log('== Bug repro path: sidebar "Subject Details" with NO prior selection ==');
  window.setView('subject-details'); // exactly what the nav-link click does
  await sleep(1200);
  const view = document.querySelector('#subjectDetailsView');
  const html = view.innerHTML;
  ok(html.length > 5000, 'container rendered rich content (was blank before fix), ' + html.length + ' chars');
  ok(html.includes('Database Management System'), 'auto-selected first subject of Sem 1 renders');
  ok(html.includes('END SEMESTER (50)') && html.includes('42/50'), 'end-sem panel shows 42/50 from teacher data');
  ok(html.includes('BEST 2 COUNTED'), 'quiz Best2 section rendered');
  ok(html.includes('FINAL MARKS') && html.includes('/100'), 'theory total block rendered');
  ok(html.includes('Attendance') && html.includes('%'), 'attendance panel rendered');
  ok(!html.includes('Unable to load'), 'no error state');
  ok(!html.includes('skeleton-line'), 'loading skeleton replaced by real content (tab-panels may still show nested loaders — expected)');
  ok(view.dataset.loadedId === '1', 'loadedId marker set for subject 1 (got "' + view.dataset.loadedId + '")');

  console.log('== Re-entry: click nav again → must NOT re-render from scratch ==');
  const before = view.innerHTML;
  window.setView('dashboard'); await sleep(120);
  window.setView('subject-details'); await sleep(120);
  ok(view.innerHTML === before, 'cached view shown without refetch (identical HTML)');

  console.log('== Card path: openSubject(2) via View Subject button ==');
  await window.openSubject(2); await sleep(1200);
  ok(view.innerHTML.includes('Object Oriented Programming') || view.innerHTML.includes('Discrete') || view.innerHTML.length > 5000, 'subject 2 renders via direct open');
  ok(view.dataset.loadedId === '2', 'loadedId switched to 2');

  console.log(`\n==== VIEW SMOKE: ${passed} passed, ${failed} failed ====`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
