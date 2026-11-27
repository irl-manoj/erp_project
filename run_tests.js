/**
 * MCA Dashboard — Test Suite (run: node tests/run_tests.js)
 * Covers: API data layer, per-student isolation, validation rules, auth, persistence/reload.
 * No framework needed — plain Node with a localStorage stub simulating the browser.
 */
'use strict';
const path = require('path');

// ---- browser stubs ----
const store = {};
global.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};
global.CONFIG = require(path.join(__dirname, '../js/config.js'));
global.CONFIG.MOCK_DELAY = 1; // fast tests

const apiPath = path.join(__dirname, '../js/api.js');
const { API, MockDB } = require(apiPath);

let passed = 0, failed = 0;
const ok = (cond, name) => {
  if (cond) { passed++; console.log('  PASS - ' + name); }
  else { failed++; console.log('  FAIL - ' + name); }
};

(async () => {
  console.log('== Suite 1: Data layer (per-student model) ==');
  ok(MockDB.students.length === 4, '4 students seeded');
  ok(MockDB.teachers.length === 2, '2 teachers seeded');
  ok(MockDB.attendance.length % MockDB.students.length === 0 && MockDB.attendance.length >= 32,
     'attendance exists for every student × subject (' + MockDB.attendance.length + ' rows)');
  for (const sid of [101, 102, 103, 104]) {
    const recs = MockDB.attendance.filter(a => a.studentId === sid);
    ok(recs.length >= 8, `student ${sid}: own records (${recs.length})`);
  }
  const a1 = MockDB.attendance.find(a => a.studentId === 101 && a.subjectId === 1);
  const a2 = MockDB.attendance.find(a => a.studentId === 102 && a.subjectId === 1);
  ok(a1 && a2 && (a1.attendedClasses !== a2.attendedClasses || a1.totalClasses !== a2.totalClasses),
     'two students have DIFFERENT DBMS attendance (real per-student data)');
  const att103 = await API.getAttendance({ studentId: 103 });
  ok(att103.length >= 8 && att103.every(a => typeof a.percentage === 'number'), 'API.getAttendance filters by studentId + enriches %');
  ok(MockDB.quizzes.length === MockDB.students.length * 14, 'quiz records for every student (' + MockDB.quizzes.length + ')');

  console.log('== Suite 2: Validation rules ==');
  let e;
  e = await API.createSubject({ name: '', code: '' }).then(() => null).catch(x => x);
  ok(e && e.status === 400, 'subject without name/code -> 400');
  e = await API.createSubject({ name: 'X', code: 'Y', credits: 0 }).then(() => null).catch(x => x);
  ok(e && e.status === 400, 'credits must be > 0');
  e = await API.updateAttendance(1, 101, { totalClasses: 40, attendedClasses: 41 }).catch(x => x);
  ok(e && e.status === 400, 'attended > total -> 400');
  e = await API.updateInternal(1, 101, [{ name: 'A', maxMarks: 10, marks: 5 }]).catch(x => x);
  ok(e && e.status === 400, 'internal components must sum to 20 -> 400');
  e = await API.updateEndSem(1, 101, 55).catch(x => x);
  ok(e && e.status === 400, 'end-sem > 50 -> 400');
  const q = MockDB.quizzes.find(x => x.subjectId === 1 && x.studentId === 101);
  e = await API.updateQuiz(q.id, { marksObtained: 16 }).catch(x => x);
  ok(e && e.status === 400, 'quiz marks > 15 -> 400');

  console.log('== Suite 3: Writes work + persist ==');
  await API.updateAttendance(1, 103, { totalClasses: 40, attendedClasses: 38 });
  let p = JSON.parse(store['mca_db_v2']);
  ok(p.attendance.find(a => a.studentId === 103 && a.subjectId === 1).attendedClasses === 38, 'teacher edit persisted to storage (Aman DBMS 38/40)');
  ok(p.attendance.find(a => a.studentId === 101 && a.subjectId === 1).attendedClasses === a1.attendedClasses, 'other students unaffected by scoped update');
  const newSub = await API.createSubject({ name: 'Compiler Design', code: 'MCA-CD', credits: 4, semester: 2, type: 'theory', faculty: 'Dr. Anjali Mehta' });
  ok(MockDB.attendance.filter(a => a.subjectId === newSub.id).length === 4, 'new subject auto-creates attendance for ALL 4 students');
  // End-sem marks entry (teacher UI -> PUT /endsem)
  await API.updateEndSem(1, 102, 44);
  ok(MockDB.endSems.find(x => x.subjectId === 1 && x.studentId === 102).marksObtained === 44, 'end-sem 44/50 saved for Priya (subject 1)');
  ok(JSON.parse(store['mca_db_v2']).endSems.find(x => x.subjectId === 1 && x.studentId === 102).marksObtained === 44, 'end-sem write persisted to storage');
  ok(MockDB.endSems.find(x => x.subjectId === 1 && x.studentId === 101).marksObtained !== 44, 'end-sem write scoped — other students unaffected');
  e = await API.updateEndSem(1, 102, -1).catch(x => x);
  ok(e && e.status === 400, 'end-sem < 0 rejected by API too');

  console.log('== Suite 4: Auth (fake login) ==');
  let u = await API.authenticate('manoj.das@bitmesra.ac.in', 'student', 'x');
  ok(u.id === 101, 'email match -> Manoj');
  u = await API.authenticate('MCA/2024/019', 'student', 'x');
  ok(u.id === 103, 'roll match -> Aman');
  u = await API.authenticate('rajesh', 'teacher', 'x');
  ok(u && (u.id === 501 || u.role === 'teacher'), 'first-name match -> teacher (via teacher pool)');
  e = await API.authenticate('ghost@nowhere.com', 'student', 'x').then(() => null).catch(x => x);
  ok(e && e.status === 404, 'unknown user -> 404');
  ok(JSON.parse(store['mca_current_user']).id === 501, 'session saved to localStorage on login');
  await API.logout();
  ok(API.getCurrentUser() === null, 'logout clears session');

  console.log('== Suite 5: Reload persistence (simulated page reload) ==');
  // wipe cache, re-require module with SAME localStorage -> loadPersisted() must restore edits
  delete require.cache[require.resolve(apiPath)];
  const mod2 = require(apiPath);
  const restored = mod2.MockDB.attendance.find(a => a.studentId === 103 && a.subjectId === 1);
  ok(restored.attendedClasses === 38, 'Aman attendance edit survives reload');
  ok(mod2.MockDB.subjects.some(s => s.code === 'MCA-CD'), 'new subject survives reload');
  ok(mod2.MockDB.endSems.find(x => x.subjectId === 1 && x.studentId === 102).marksObtained === 44, 'end-sem marks survive reload (student totals reflect teacher entry)');

  console.log(`\n==== RESULT: ${passed} passed, ${failed} failed ====`);
  process.exit(failed ? 1 : 0);
})().catch(err => { console.error('HARNESS ERROR:', err); process.exit(2); });
