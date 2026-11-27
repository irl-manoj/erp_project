'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mca-backend-test-'));
process.env.DB_PATH = path.join(temp, 'test.sqlite');
process.env.DATA_DIR = temp;
process.env.UPLOAD_DIR = path.join(temp, 'uploads');
process.env.JWT_SECRET = 'test-secret-for-unit-tests';
process.env.NODE_ENV = 'test';
const { app, db } = require('../server');
let server;
let base;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise(resolve => server.close(resolve));
  db.close();
  fs.rmSync(temp, { recursive: true, force: true });
});

async function login(identifier, role, password = '1234') {
  const response = await fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier, role, password })
  });
  const data = await response.json();
  return { response, data, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
async function api(pathname, cookie, options = {}) {
  const response = await fetch(`${base}/api${pathname}`, {
    ...options,
    headers: { ...(options.body && !(options.body instanceof FormData) ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}), ...(options.headers || {}) }
  });
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();
  return { response, data };
}

test('health endpoint reports a working SQLite database', async () => {
  const response = await fetch(`${base}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', database: 'sqlite' });
});

test('student and teacher passwords are verified and role-bound', async () => {
  const student = await login('manoj.das@bitmesra.ac.in', 'student');
  assert.equal(student.response.status, 200);
  assert.equal(student.data.user.role, 'student');
  assert.ok(student.cookie);
  const teacher = await login('rajesh.kumar@bitmesra.ac.in', 'teacher');
  assert.equal(teacher.response.status, 200);
  assert.equal(teacher.data.user.role, 'teacher');
  const wrongPassword = await login('manoj.das@bitmesra.ac.in', 'student', 'not-the-password');
  assert.equal(wrongPassword.response.status, 401);
  const wrongRole = await login('manoj.das@bitmesra.ac.in', 'teacher');
  assert.equal(wrongRole.response.status, 401);
});

test('student data access is scoped; teacher can see the class roster', async () => {
  const student = await login('MCA/2024/017', 'student');
  const own = await api('/students', student.cookie);
  assert.equal(own.response.status, 200);
  assert.deepEqual(own.data.map(x => x.id), [101]);
  const otherProfile = await api('/students/102', student.cookie);
  assert.equal(otherProfile.response.status, 403);
  const otherAttendance = await api('/attendance?studentId=102', student.cookie);
  assert.deepEqual(otherAttendance.data, []);
  const ownAttendance = await api('/attendance?studentId=101', student.cookie);
  assert.ok(ownAttendance.data.length > 0);
  assert.ok(ownAttendance.data.every(x => x.studentId === 101));
  const teacher = await login('rajesh.kumar@bitmesra.ac.in', 'teacher');
  const roster = await api('/students', teacher.cookie);
  assert.equal(roster.data.length, 4);
});

test('students cannot write teacher data; teacher edits validate and persist', async () => {
  const student = await login('manoj.das@bitmesra.ac.in', 'student');
  const forbidden = await api('/attendance/upsert', student.cookie, { method: 'PUT', body: JSON.stringify({ subjectId: 1, studentId: 101, totalClasses: 40, attendedClasses: 39 }) });
  assert.equal(forbidden.response.status, 403);

  const teacher = await login('rajesh.kumar@bitmesra.ac.in', 'teacher');
  const invalid = await api('/attendance/upsert', teacher.cookie, { method: 'PUT', body: JSON.stringify({ subjectId: 1, studentId: 101, totalClasses: 10, attendedClasses: 11 }) });
  assert.equal(invalid.response.status, 400);
  const saved = await api('/attendance/upsert', teacher.cookie, { method: 'PUT', body: JSON.stringify({ subjectId: 1, studentId: 101, totalClasses: 45, attendedClasses: 39 }) });
  assert.equal(saved.response.status, 200);
  assert.equal(saved.data.attendedClasses, 39);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM records WHERE collection='attendance' AND record_key='1:101'").get().n, 1);
});

test('teacher assignment attachments persist and can be downloaded by a student', async () => {
  const teacher = await login('rajesh.kumar@bitmesra.ac.in', 'teacher');
  const form = new FormData();
  form.set('subjectId', '1'); form.set('title', 'New DBMS task'); form.set('description', 'Test handout');
  form.set('maxMarks', '20'); form.set('deadline', '2026-12-01');
  form.append('attachments', new Blob(['assignment handout'], { type: 'text/plain' }), 'handout.txt');
  form.append('attachments', new Blob(['reference sheet'], { type: 'text/plain' }), 'reference.txt');
  const created = await api('/assignments/upload', teacher.cookie, { method: 'POST', body: form });
  assert.equal(created.response.status, 201);
  assert.equal(created.data.files.length, 2);
  assert.ok(created.data.files.every(file => fs.existsSync(path.join(temp, 'uploads', file.path))));
  assert.ok(created.data.files.every(file => file.path.startsWith('assignments/')));
  const student = await login('manoj.das@bitmesra.ac.in', 'student');
  const download = await api(`/assignments/${created.data.id}/files/1`, student.cookie);
  assert.equal(download.data, 'reference sheet');
});

test('uploads reject unsupported file types and excessive file counts', async () => {
  const teacher = await login('rajesh.kumar@bitmesra.ac.in', 'teacher');
  const invalidType = new FormData();
  invalidType.set('subjectId', '1'); invalidType.set('title', 'Invalid attachment');
  invalidType.set('maxMarks', '10'); invalidType.set('deadline', '2026-12-01');
  invalidType.append('attachments', new Blob(['not allowed'], { type: 'application/octet-stream' }), 'malware.exe');
  const rejectedType = await api('/assignments/upload', teacher.cookie, { method: 'POST', body: invalidType });
  assert.equal(rejectedType.response.status, 400);

  const tooMany = new FormData();
  tooMany.set('subjectId', '1'); tooMany.set('title', 'Too many attachments');
  tooMany.set('maxMarks', '10'); tooMany.set('deadline', '2026-12-01');
  for (let index = 0; index < 11; index++) tooMany.append('attachments', new Blob([`file ${index}`], { type: 'text/plain' }), `file-${index}.txt`);
  const rejectedCount = await api('/assignments/upload', teacher.cookie, { method: 'POST', body: tooMany });
  assert.equal(rejectedCount.response.status, 400);
});

test('assignment submissions upload to disk and are permission-checked on download', async () => {
  const student = await login('manoj.das@bitmesra.ac.in', 'student');
  const form = new FormData();
  form.set('assignmentId', '1');
  form.append('files', new Blob(['homework content'], { type: 'text/plain' }), 'answer.txt');
  form.append('files', new Blob(['source code'], { type: 'text/plain' }), 'solution.txt');
  const created = await api('/submissions/upload', student.cookie, { method: 'POST', body: form });
  assert.equal(created.response.status, 201);
  assert.deepEqual(created.data.fileNames, ['answer.txt', 'solution.txt']);
  assert.equal(created.data.files.length, 2);
  assert.ok(created.data.files.every(file => fs.existsSync(path.join(temp, 'uploads', file.path))));
  assert.ok(created.data.files.every(file => file.path.startsWith('submissions/')));
  const teacher = await login('rajesh.kumar@bitmesra.ac.in', 'teacher');
  const teacherDownload = await api(`/submissions/${created.data.id}/files/1`, teacher.cookie);
  assert.equal(teacherDownload.response.status, 200);
  assert.equal(teacherDownload.data, 'source code');
  const otherStudent = await login('priya.sharma@bitmesra.ac.in', 'student');
  const denied = await api(`/submissions/${created.data.id}/file`, otherStudent.cookie);
  assert.equal(denied.response.status, 403);
});
