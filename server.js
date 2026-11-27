'use strict';

require('dotenv').config();
const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { db, recordCollections, listUsers, findUserById, listRecords, recordTeacherId, upsertRecord, deleteRecord, findRecord, safeUser } = require('./backend/db');

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET is required in production.');
const JWT_SECRET = process.env.JWT_SECRET || 'local-development-secret-change-me';
const COOKIE_NAME = 'mca_session';
const requestedDemoFee = Math.floor(Number(process.env.DEMO_SEMESTER_FEE_INR));
const DEMO_SEMESTER_FEE_INR = Number.isSafeInteger(requestedDemoFee) && requestedDemoFee > 0 ? requestedDemoFee : 50000;
const app = express();
const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, 'uploads'));
fs.mkdirSync(uploadDir, { recursive: true });
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' }, contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: process.env.NODE_ENV === 'test' ? 100 : 10, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many login attempts. Try again in 15 minutes.' } });
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: process.env.NODE_ENV === 'test' ? 100 : 5, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many accounts registered from this address. Try again later.' } });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, file, cb) => {
      const folder = file.fieldname === 'attachments' ? 'assignments' : 'submissions';
      const destination = path.join(uploadDir, folder);
      fs.mkdirSync(destination, { recursive: true });
      cb(null, destination);
    },
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${require('node:crypto').randomUUID()}${path.extname(file.originalname).slice(0, 12)}`)
  }),
  limits: { fileSize: 15 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt|zip|png|jpe?g)$/i.test(file.originalname);
    if (allowed) return cb(null, true);
    const error = new Error('File type not allowed. Upload a document, PDF, image, or ZIP.');
    error.status = 400;
    cb(error);
  }
});

function httpError(status, message) { const error = new Error(message); error.status = status; return error; }
function sessionCookieOptions(_req) {
  // The browser-facing app is HTTPS, even when a preview proxy talks HTTP to Express.
  // Always issue a cross-site-capable secure cookie so preview proxy headers cannot
  // accidentally downgrade it to SameSite=Lax and make the session disappear.
  return { httpOnly: true, secure: true, sameSite: 'none', maxAge: 12 * 60 * 60 * 1000, path: '/' };
}
function auth(req, _res, next) {
  const authorization = req.get('authorization') || '';
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  const sessionHeader = req.get('x-session-token');
  const tokens = [...new Set([bearer, sessionHeader, req.cookies[COOKIE_NAME]].filter(Boolean))];
  if (!tokens.length) return next(httpError(401, 'Please log in to continue.'));

  // Embedded browsers can retain an expired cookie while sending a fresh bearer token.
  // Validate both credentials rather than letting a stale cookie mask a valid login.
  for (const token of tokens) {
    try {
      const payload = jwt.verify(token, JWT_SECRET, { issuer: 'mca-academic-dashboard' });
      const user = findUserById(payload.sub);
      if (!user || user.role !== payload.role) continue;
      req.user = user;
      return next();
    } catch {}
  }
  return next(httpError(401, 'Your session has expired. Please log in again.'));
}
function requireRole(...roles) { return (req, _res, next) => roles.includes(req.user.role) ? next() : next(httpError(403, 'You do not have permission to do that.')); }
function number(value) { const n = Number(value); return Number.isFinite(n) ? n : null; }
function matchesFilter(item, query) {
  for (const [key, value] of Object.entries(query)) {
    if (value == null || value === '' || key === 'search') continue;
    if (item[key] != value) return false;
  }
  if (query.search) {
    const q = String(query.search).toLowerCase();
    return Object.values(item).some(v => typeof v === 'string' && v.toLowerCase().includes(q));
  }
  return true;
}
function teacherOwnsSubject(teacherId, subjectId) {
  return Number(recordTeacherId('subjects', subjectId)) === Number(teacherId);
}
function assertTeacherOwnsSubject(req, subjectId) {
  if (req.user.role === 'teacher' && !teacherOwnsSubject(req.user.id, subjectId)) throw httpError(403, 'You can only manage subjects assigned to your account.');
}
function teacherOwnsRecord(req, collection, record, key) {
  const directOwner = recordTeacherId(collection, key ?? record.id);
  if (directOwner != null) return Number(directOwner) === Number(req.user.id);
  if (record.subjectId != null) return teacherOwnsSubject(req.user.id, record.subjectId);
  if (collection === 'submissions') {
    const assignment = findRecord('assignments', record.assignmentId);
    return Boolean(assignment && teacherOwnsSubject(req.user.id, assignment.subjectId));
  }
  return false;
}
function assertTeacherOwnsRecord(req, collection, record, key) {
  if (req.user.role === 'teacher' && !teacherOwnsRecord(req, collection, record, key)) throw httpError(403, 'You can only view or change records for your own subjects.');
}
function teacherCanSeeStudent(teacherId, student) {
  const semesters = new Set(listRecords('subjects', teacherId).map(subject => Number(subject.semester)));
  return semesters.has(Number(student.semester));
}
function collectionRead(req, collection) {
  if (collection === 'students') return listUsers('student')
    .filter(user => req.user.role === 'teacher' ? teacherCanSeeStudent(req.user.id, user) : user.id === req.user.id)
    .filter(user => matchesFilter(user, req.query));
  if (collection === 'teachers') return listUsers('teacher').filter(user => user.id === req.user.id);
  if (!recordCollections[collection]) throw httpError(404, 'Unknown resource.');
  let records = listRecords(collection, req.user.role === 'teacher' ? req.user.id : null);
  if (req.user.role === 'student' && ['submissions','attendance','attendanceSessions','quizzes','internals','endSems','labMarks','fees','feePayments'].includes(collection)) records = records.filter(item => Number(item.studentId) === Number(req.user.id));
  records = records.filter(item => matchesFilter(item, req.query));
  if (collection === 'attendance') records = records.map(item => ({ ...item, percentage: item.totalClasses ? Math.round(item.attendedClasses / item.totalClasses * 10000) / 100 : 0 }));
  if (collection === 'timetable') records = records.map(item => {
    const subject = findRecord('subjects', item.subjectId);
    const teacherId = recordTeacherId('subjects', item.subjectId);
    const teacher = teacherId == null ? null : findUserById(teacherId);
    return { ...item, subjectName: subject?.name || 'Subject', subjectCode: subject?.code || '', teacherName: subject?.faculty || teacher?.name || '', teacherEmail: teacher?.email || '' };
  });
  return records;
}
function saveOne(collection, record, key, teacherId = null) { return upsertRecord(collection, record, key, teacherId); }
function nextRecordId(collection) {
  const maxId = listRecords(collection).reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
  return Math.max(Date.now(), maxId + 1);
}
function storedFile(file) {
  return { path: path.relative(uploadDir, file.path).split(path.sep).join('/'), name: path.basename(file.originalname), size: file.size, type: file.mimetype };
}
function uploadPath(storedPath) {
  const resolved = path.resolve(uploadDir, storedPath || '');
  if (!resolved.startsWith(`${uploadDir}${path.sep}`)) throw httpError(400, 'Invalid stored file path.');
  return resolved;
}
function filesFor(record) {
  if (Array.isArray(record.files) && record.files.length) return record.files;
  return record.filePath ? [{ path: record.filePath, name: record.fileName || 'download' }] : [];
}
function removeStoredFiles(record) {
  for (const file of filesFor(record)) {
    const absolute = uploadPath(file.path);
    if (fs.existsSync(absolute)) fs.unlinkSync(absolute);
  }
}
function requireInt(value, label) { const n = number(value); if (!Number.isInteger(n)) throw httpError(400, `${label} must be a whole number.`); return n; }
function validateTimetableRecord(req, record, excludeId = null) {
  const subjectId = requireInt(record.subjectId, 'subjectId');
  const subject = findRecord('subjects', subjectId);
  if (!subject) throw httpError(404, 'Subject not found.');
  assertTeacherOwnsSubject(req, subjectId);
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const day = String(record.day || '');
  const startTime = String(record.startTime || '');
  const endTime = String(record.endTime || '');
  const room = String(record.room || '').trim();
  if (!days.includes(day)) throw httpError(400, 'Choose a valid day of the week.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) || endTime <= startTime) throw httpError(400, 'Enter a valid 24-hour class time; end time must be after start time.');
  if (!room || room.length > 80) throw httpError(400, 'Room is required and must be 80 characters or fewer.');
  const start = Number(startTime.slice(0,2))*60 + Number(startTime.slice(3));
  const end = Number(endTime.slice(0,2))*60 + Number(endTime.slice(3));
  for (const scheduled of listRecords('timetable')) {
    if (String(scheduled.id) === String(excludeId) || scheduled.day !== day) continue;
    const otherStart = Number(String(scheduled.startTime).slice(0,2))*60 + Number(String(scheduled.startTime).slice(3,5));
    const otherEnd = Number(String(scheduled.endTime).slice(0,2))*60 + Number(String(scheduled.endTime).slice(3,5));
    const overlaps = start < otherEnd && otherStart < end;
    const sameTeacher = recordTeacherId('subjects', scheduled.subjectId) === req.user.id;
    const sameRoom = String(scheduled.room || '').trim().toLowerCase() === room.toLowerCase();
    if (overlaps && (sameTeacher || sameRoom)) throw httpError(409, 'This time overlaps another class for you or uses a room that is already booked.');
  }
  return { ...record, subjectId, day, startTime, endTime, room };
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', database: 'sqlite' }));
function issueSession(req, res, user, status = 200) {
  const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '12h', issuer: 'mca-academic-dashboard' });
  res.cookie(COOKIE_NAME, token, sessionCookieOptions(req));
  res.status(status).json({ user, accessToken: token, expiresIn: 43200 });
}
app.post('/api/auth/login', loginLimiter, (req, res, next) => {
  try {
    const { identifier, role, password } = req.body || {};
    if (!['student','teacher'].includes(role) || !identifier || !password) throw httpError(400, 'Enter your email or roll number, role, and password.');
    const ident = String(identifier).trim().toLowerCase();
    const candidates = db.prepare('SELECT * FROM users WHERE role=? AND (lower(email)=? OR lower(json_extract(profile_json,\'$.roll\'))=?)').all(role, ident, ident);
    const row = candidates.find(candidate => bcrypt.compareSync(String(password), candidate.password_hash));
    if (!row) throw httpError(401, 'Email/roll number or password is incorrect.');
    issueSession(req, res, safeUser(row));
  } catch (error) { next(error); }
});
app.post('/api/auth/register', registerLimiter, (req, res, next) => {
  try {
    const { name, email, password, role = 'student' } = req.body || {};
    const cleanName = String(name || '').trim().replace(/\s+/g, ' ');
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!['student','teacher'].includes(role)) throw httpError(400, 'Choose a valid account type.');
    if (cleanName.length < 2 || cleanName.length > 100) throw httpError(400, 'Enter your full name (2–100 characters).');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 254) throw httpError(400, 'Enter a valid email address.');
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw httpError(400, 'Password must be 8–128 characters.');
    if (db.prepare('SELECT 1 FROM users WHERE email=? COLLATE NOCASE').get(cleanEmail)) throw httpError(409, 'An account with this email already exists.');

    let profile;
    if (role === 'student') {
      const roll = String(req.body.roll || '').trim().toUpperCase();
      const semester = Number(req.body.semester);
      if (!/^[A-Z0-9/-]{4,30}$/.test(roll)) throw httpError(400, 'Enter a valid student roll number.');
      if (!Number.isInteger(semester) || semester < 1 || semester > 4) throw httpError(400, 'Choose a semester from 1 to 4.');
      if (db.prepare("SELECT 1 FROM users WHERE lower(json_extract(profile_json,'$.roll'))=lower(?)").get(roll)) throw httpError(409, 'That student roll number is already registered.');
      const avatar = cleanName.split(' ').map(part => part[0]).join('').slice(0,2).toUpperCase();
      profile = { name: cleanName, email: cleanEmail, role, roll, semester, avatar, program: 'MCA', batch: String(new Date().getFullYear()), cgpa: 0, sgpa: 0 };
    } else {
      const configuredBytes = Buffer.from(process.env.TEACHER_REGISTRATION_CODE || '');
      const suppliedBytes = Buffer.from(String(req.body.inviteCode || ''));
      if (!configuredBytes.length) throw httpError(403, 'Teacher sign-up is currently by invitation only. Ask the administrator to configure a teacher registration code.');
      if (suppliedBytes.length !== configuredBytes.length || !require('node:crypto').timingSafeEqual(suppliedBytes, configuredBytes)) throw httpError(403, 'The teacher invitation code is incorrect.');
      const avatar = cleanName.split(' ').map(part => part[0]).join('').slice(0,2).toUpperCase();
      profile = { name: cleanName, email: cleanEmail, role, dept: 'Computer Applications', avatar };
    }

    const id = Number(db.prepare('SELECT COALESCE(MAX(id),0)+1 AS id FROM users').get().id);
    profile.id = id;
    const insertAccount = db.transaction(() => {
      db.prepare('INSERT INTO users(id,name,email,role,password_hash,profile_json) VALUES(?,?,?,?,?,?)')
        .run(id, cleanName, cleanEmail, role, bcrypt.hashSync(password, 12), JSON.stringify(profile));
      if (role === 'student') {
        for (const subject of listRecords('subjects').filter(item => Number(item.semester) === profile.semester)) {
          saveOne('attendance', { subjectId: subject.id, studentId: id, totalClasses: 0, attendedClasses: 0 }, `${subject.id}:${id}`, recordTeacherId('subjects', subject.id));
        }
        saveOne('fees', { id: nextRecordId('fees'), studentId: id, academicYear: `${new Date().getFullYear()}–${String(new Date().getFullYear() + 1).slice(-2)}`, semester: profile.semester, description: 'Semester academic fee (sample invoice)', amountInr: DEMO_SEMESTER_FEE_INR, dueDate: `${new Date().getFullYear()}-12-31`, status: 'due', sample: true });
      }
    });
    insertAccount();
    issueSession(req, res, profile, 201);
  } catch (error) { next(error); }
});
app.post('/api/auth/logout', (req, res) => { const options = sessionCookieOptions(req); delete options.maxAge; res.clearCookie(COOKIE_NAME, options); res.json({ success: true }); });
app.get('/api/auth/me', auth, (req, res) => res.json({ user: req.user }));
app.post('/api/fees/:id/demo-pay', auth, requireRole('student'), (req, res, next) => {
  try {
    const invoice = findRecord('fees', req.params.id);
    if (!invoice) throw httpError(404, 'Fee invoice not found.');
    if (Number(invoice.studentId) !== Number(req.user.id)) throw httpError(403, 'You can only pay your own fee invoice.');
    if (invoice.status === 'paid') throw httpError(409, 'This invoice has already been paid.');
    const amountInr = Number(invoice.amountInr);
    if (!Number.isSafeInteger(amountInr) || amountInr <= 0) throw httpError(400, 'This invoice has an invalid amount.');
    const id = nextRecordId('feePayments');
    const payment = {
      id, invoiceId: invoice.id, studentId: req.user.id, amountInr, status: 'demo-paid',
      paymentMethod: 'Demo payment (no money charged)', paidAt: new Date().toISOString(),
      receiptNo: `DEMO-${new Date().getFullYear()}-${String(id).slice(-8)}`
    };
    const savePayment = db.transaction(() => {
      saveOne('feePayments', payment);
      invoice.status = 'paid';
      invoice.paidAt = payment.paidAt;
      saveOne('fees', invoice);
    });
    savePayment();
    res.status(201).json(payment);
  } catch (error) { next(error); }
});

app.get('/api/progress', auth, (req, res, next) => {
  try {
    const studentId = req.user.role === 'student' ? req.user.id : number(req.query.studentId);
    if (!studentId) throw httpError(400, 'studentId is required for teacher requests.');
    const student = findUserById(studentId);
    if (!student || student.role !== 'student') throw httpError(404, 'Student not found.');
    if (req.user.role === 'teacher' && !teacherCanSeeStudent(req.user.id, student)) throw httpError(403, 'This student is not in your assigned subjects.');
    const subjects = listRecords('subjects', req.user.role === 'teacher' ? req.user.id : null).filter(s => !student.semester || Number(s.semester) === Number(student.semester));
    const attendance = listRecords('attendance', req.user.role === 'teacher' ? req.user.id : null).filter(a => a.studentId === studentId);
    const progress = subjects.map(subject => {
      const att = attendance.find(a => a.subjectId === subject.id);
      const pct = att && att.totalClasses ? Math.round(att.attendedClasses / att.totalClasses * 100) : 0;
      return { subjectId: subject.id, name: subject.name, completion: Math.min(100, pct) };
    });
    res.json({ overall: progress.length ? Math.round(progress.reduce((sum, x) => sum + x.completion, 0) / progress.length) : 0, subjects: progress });
  } catch (error) { next(error); }
});

app.get('/api/:collection', auth, (req, res, next) => {
  try { res.json(collectionRead(req, req.params.collection)); } catch (error) { next(error); }
});
app.get('/api/:collection/one', auth, (req, res, next) => {
  try {
    const collection = req.params.collection;
    if (!recordCollections[collection]) throw httpError(404, 'Unknown resource.');
    const key = `${req.query.subjectId ?? ''}:${req.query.studentId ?? ''}`;
    let item = findRecord(collection, key);
    if (!item && collection === 'syllabus') item = listRecords(collection).find(x => x.subjectId == req.query.subjectId) || null;
    if (item && req.user.role === 'student' && item.studentId !== undefined && item.studentId !== req.user.id) throw httpError(403, 'You cannot view another student’s records.');
    if (item && req.user.role === 'teacher') assertTeacherOwnsRecord(req, collection, item, key);
    res.json(item);
  } catch (error) { next(error); }
});
app.post('/api/:collection', auth, (req, res, next) => {
  try {
    const collection = req.params.collection;
    if (!recordCollections[collection]) throw httpError(404, 'Unknown resource.');
    if (collection === 'submissions') {
      if (req.user.role !== 'student') throw httpError(403, 'Only students can submit assignments.');
      const record = { ...req.body, id: nextRecordId('submissions'), studentId: req.user.id, submittedAt: new Date().toISOString().slice(0,10), status: 'submitted', marks: null, feedback: null };
      const assignment = findRecord('assignments', record.assignmentId);
      if (!assignment) throw httpError(404, 'Assignment not found.');
      record.maxMarks = Number(assignment.maxMarks) || 20;
      saveOne(collection, record, undefined, recordTeacherId('assignments', assignment.id));
      assignment.submissionsCount = (assignment.submissionsCount || 0) + 1;
      saveOne('assignments', assignment);
      return res.status(201).json(record);
    }
    if (collection === 'attendanceSessions') {
      if (req.user.role !== 'teacher') throw httpError(403, 'Only teachers can record class attendance.');
      const subjectId = requireInt(req.body.subjectId, 'subjectId');
      const studentId = requireInt(req.body.studentId, 'studentId');
      const student = findUserById(studentId);
      const subject = findRecord('subjects', subjectId);
      if (!student || student.role !== 'student') throw httpError(404, 'Student not found.');
      if (!subject) throw httpError(404, 'Subject not found.');
      assertTeacherOwnsSubject(req, subjectId);
      if (!teacherCanSeeStudent(req.user.id, student) || Number(student.semester) !== Number(subject.semester)) throw httpError(403, 'This student is not enrolled in the selected subject.');
      const date = String(req.body.date || '');
      const classDate = new Date(`${date}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(classDate.getTime()) || classDate.toISOString().slice(0, 10) !== date) throw httpError(400, 'Enter a valid class date.');
      if (date > new Date().toISOString().slice(0, 10)) throw httpError(400, 'Attendance cannot be recorded for a future date.');
      const status = String(req.body.status || '').toLowerCase();
      if (!['present','absent'].includes(status)) throw httpError(400, 'Attendance status must be present or absent.');
      const weekday = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
      if (!listRecords('timetable', req.user.id).some(slot => Number(slot.subjectId) === subjectId && slot.day === weekday)) throw httpError(400, `There is no scheduled ${subject.name} class on ${weekday}.`);
      const key = `${subjectId}-${studentId}-${date}`;
      const existing = findRecord(collection, key);
      const record = { id: key, subjectId, studentId, date, status };
      saveOne(collection, record, key, req.user.id);
      const sessions = listRecords(collection, req.user.id).filter(item => Number(item.subjectId) === subjectId && Number(item.studentId) === studentId);
      const totalClasses = sessions.length;
      const attendedClasses = sessions.filter(item => item.status === 'present').length;
      saveOne('attendance', { subjectId, studentId, totalClasses, attendedClasses }, `${subjectId}:${studentId}`, req.user.id);
      return res.status(existing ? 200 : 201).json(record);
    }
    if (req.user.role !== 'teacher') throw httpError(403, 'Only teachers can create this resource.');
    const record = { ...req.body, id: nextRecordId(collection) };
    delete record.teacherId;
    delete record.ownerId;
    if (record.subjectId != null && collection !== 'subjects') assertTeacherOwnsSubject(req, record.subjectId);
    if (collection === 'subjects') {
      record.faculty = req.user.name;
      if (!record.name || !record.code || !(Number(record.credits) > 0) || !Number.isInteger(Number(record.semester)) || Number(record.semester) < 1 || Number(record.semester) > 4) throw httpError(400, 'Subject name, code, positive credits, and semester (1–4) are required.');
      if (listRecords('subjects').some(subject => String(subject.code).toLowerCase() === String(record.code).toLowerCase())) throw httpError(409, 'A subject with this code already exists.');
      const students = listUsers('student');
      const createAttendance = db.transaction(() => students.forEach(student => saveOne('attendance', { subjectId: record.id, studentId: student.id, totalClasses: record.type === 'lab' ? 24 : 40, attendedClasses: 0 }, `${record.id}:${student.id}`, req.user.id)));
      saveOne(collection, record, undefined, req.user.id); createAttendance();
    } else {
      if (collection === 'timetable') Object.assign(record, validateTimetableRecord(req, record));
      if (collection === 'assignments') {
        if (!record.title || !record.subjectId || !findRecord('subjects', record.subjectId)) throw httpError(400, 'Assignment title and a valid subject are required.');
        if (!(Number(record.maxMarks) > 0) || !record.deadline) throw httpError(400, 'Assignment max marks and deadline are required.');
        record.submissionsCount = 0;
        record.createdAt = new Date().toISOString().slice(0,10);
        record.status = 'pending';
      }
      saveOne(collection, record, undefined, req.user.id);
    }
    res.status(201).json(record);
  } catch (error) { next(error); }
});
app.put('/api/:collection/upsert', auth, requireRole('teacher'), (req, res, next) => {
  try {
    const collection = req.params.collection;
    const { subjectId, studentId } = req.body || {};
    if (!recordCollections[collection] || !['attendance','internals','endSems','labMarks'].includes(collection)) throw httpError(404, 'Unknown update resource.');
    const sid = requireInt(subjectId, 'subjectId');
    const stid = requireInt(studentId, 'studentId');
    const student = findUserById(stid);
    if (!student || student.role !== 'student') throw httpError(404, 'Student not found.');
    if (!findRecord('subjects', sid)) throw httpError(404, 'Subject not found.');
    assertTeacherOwnsSubject(req, sid);
    let record = findRecord(collection, `${sid}:${stid}`) || { subjectId: sid, studentId: stid };
    if (collection === 'attendance') {
      const totalClasses = requireInt(req.body.totalClasses, 'totalClasses');
      const attendedClasses = requireInt(req.body.attendedClasses, 'attendedClasses');
      if (totalClasses < 0 || attendedClasses < 0 || attendedClasses > totalClasses) throw httpError(400, 'Attendance must be non-negative and attended cannot exceed total classes.');
      record = { ...record, totalClasses, attendedClasses };
    } else if (collection === 'internals') {
      const components = req.body.components;
      if (!Array.isArray(components) || components.reduce((sum, x) => sum + Number(x.maxMarks || 0), 0) !== 20 || components.some(x => !Number.isFinite(Number(x.marks)) || !Number.isFinite(Number(x.maxMarks)) || Number(x.maxMarks) < 0 || Number(x.marks) < 0 || Number(x.marks) > Number(x.maxMarks))) throw httpError(400, 'Internal components must total 20 marks and each score must be within its maximum.');
      record = { ...record, total: 20, components };
    } else if (collection === 'endSems') {
      const marksObtained = number(req.body.marksObtained);
      if (marksObtained == null || marksObtained < 0 || marksObtained > 50) throw httpError(400, 'End-semester marks must be between 0 and 50.');
      record = { ...record, maxMarks: 50, marksObtained };
    } else {
      const components = req.body.components;
      if (!Array.isArray(components) || components.some(x => !Number.isFinite(Number(x.marks)) || !Number.isFinite(Number(x.maxMarks)) || Number(x.maxMarks) < 0 || Number(x.marks) < 0 || Number(x.marks) > Number(x.maxMarks))) throw httpError(400, 'Lab marks must be within each component maximum.');
      record = { ...record, components };
    }
    saveOne(collection, record, `${sid}:${stid}`, req.user.id);
    res.json(record);
  } catch (error) { next(error); }
});
app.put('/api/:collection/:id', auth, requireRole('teacher'), (req, res, next) => {
  try {
    const collection = req.params.collection;
    if (!recordCollections[collection]) throw httpError(404, 'Unknown resource.');
    const record = findRecord(collection, req.params.id);
    if (!record) throw httpError(404, 'Record not found.');
    assertTeacherOwnsRecord(req, collection, record, req.params.id);
    const updated = collection === 'submissions'
      ? { ...record, marks: req.body.marks, feedback: req.body.feedback, id: record.id }
      : { ...record, ...req.body, id: record.id };
    delete updated.teacherId;
    delete updated.ownerId;
    if (updated.subjectId != null && collection !== 'subjects') assertTeacherOwnsSubject(req, updated.subjectId);
    if (collection === 'subjects') {
      updated.faculty = req.user.name;
      if (!updated.name || !updated.code || !(Number(updated.credits) > 0) || !Number.isInteger(Number(updated.semester)) || Number(updated.semester) < 1 || Number(updated.semester) > 4) throw httpError(400, 'Subject name, code, credits, and semester are invalid.');
      if (listRecords('subjects').some(subject => subject.id !== record.id && String(subject.code).toLowerCase() === String(updated.code).toLowerCase())) throw httpError(409, 'A subject with this code already exists.');
    }
    if (collection === 'timetable') Object.assign(updated, validateTimetableRecord(req, updated, record.id));
    if (collection === 'assignments' && (!String(updated.title || '').trim() || !(Number(updated.maxMarks) > 0) || !findRecord('subjects', updated.subjectId))) throw httpError(400, 'Assignment title, valid subject, and positive max marks are required.');
    if (collection === 'quizzes' && (!Number.isFinite(Number(updated.marksObtained)) || Number(updated.marksObtained) < 0 || Number(updated.marksObtained) > Number(updated.maxMarks))) throw httpError(400, `Quiz marks must be between 0 and ${updated.maxMarks}.`);
    if (collection === 'submissions') {
      const marks = number(updated.marks);
      if (marks == null || marks < 0 || marks > Number(updated.maxMarks)) throw httpError(400, `Marks must be between 0 and ${updated.maxMarks}.`);
      updated.status = 'checked';
    }
    saveOne(collection, updated, undefined, req.user.id);
    res.json(updated);
  } catch (error) { next(error); }
});
app.delete('/api/:collection/:id', auth, requireRole('teacher'), (req, res, next) => {
  try {
    const collection = req.params.collection;
    if (!recordCollections[collection]) throw httpError(404, 'Unknown resource.');
    const deleting = findRecord(collection, req.params.id);
    if (!deleting) throw httpError(404, 'Record not found.');
    assertTeacherOwnsRecord(req, collection, deleting, req.params.id);
    if (!deleteRecord(collection, req.params.id)) throw httpError(404, 'Record not found.');
    if (collection === 'assignments') removeStoredFiles(deleting);
    if (collection === 'subjects') {
      for (const related of ['timetable','attendance','attendanceSessions','quizzes','internals','endSems','labMarks','syllabus']) {
        for (const item of listRecords(related).filter(x => x.subjectId == req.params.id)) {
          const key = item.id ?? `${item.subjectId ?? ''}:${item.studentId ?? ''}`;
          deleteRecord(related, key);
        }
      }
    }
    if (collection === 'assignments') {
      for (const submission of listRecords('submissions').filter(item => item.assignmentId == req.params.id)) {
        removeStoredFiles(submission);
        deleteRecord('submissions', submission.id);
      }
    }
    res.json({ success: true });
  } catch (error) { next(error); }
});
app.post('/api/submissions/upload', auth, requireRole('student'), upload.array('files', 10), (req, res, next) => {
  try {
    const uploaded = req.files || [];
    if (!uploaded.length) throw httpError(400, 'Choose at least one file to upload.');
    const assignmentId = requireInt(req.body.assignmentId, 'assignmentId');
    const assignment = findRecord('assignments', assignmentId);
    if (!assignment) { uploaded.forEach(file => fs.unlinkSync(file.path)); throw httpError(404, 'Assignment not found.'); }
    const files = uploaded.map(storedFile);
    const record = { id: nextRecordId('submissions'), assignmentId, studentId: req.user.id, files, fileNames: files.map(file => file.name), fileName: files[0].name, filePath: files[0].path, submittedAt: new Date().toISOString().slice(0,10), status: 'submitted', marks: null, feedback: null, maxMarks: Number(assignment.maxMarks) || 20 };
    saveOne('submissions', record, undefined, recordTeacherId('assignments', assignment.id));
    assignment.submissionsCount = (assignment.submissionsCount || 0) + 1;
    saveOne('assignments', assignment);
    res.status(201).json(record);
  } catch (error) { (req.files || []).forEach(file => { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); }); next(error); }
});
app.post('/api/assignments/upload', auth, requireRole('teacher'), upload.array('attachments', 10), (req, res, next) => {
  try {
    const uploaded = req.files || [];
    if (!uploaded.length) throw httpError(400, 'Choose at least one assignment file to upload.');
    const subjectId = requireInt(req.body.subjectId, 'subjectId');
    const subject = findRecord('subjects', subjectId);
    if (subject) assertTeacherOwnsSubject(req, subjectId);
    const title = String(req.body.title || '').trim();
    const maxMarks = number(req.body.maxMarks);
    const deadline = String(req.body.deadline || '');
    if (!subject || !title || maxMarks == null || maxMarks <= 0 || !deadline) { uploaded.forEach(file => fs.unlinkSync(file.path)); throw httpError(400, 'A valid subject, title, positive max marks, and deadline are required.'); }
    const files = uploaded.map(storedFile);
    const record = { id: nextRecordId('assignments'), subjectId, title, description: String(req.body.description || ''), maxMarks, deadline, status: 'pending', submissionsCount: 0, createdAt: new Date().toISOString().slice(0,10), files, fileNames: files.map(file => file.name), fileName: files[0].name, filePath: files[0].path };
    saveOne('assignments', record, undefined, req.user.id);
    res.status(201).json(record);
  } catch (error) { (req.files || []).forEach(file => { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); }); next(error); }
});
app.get('/api/assignments/:id/file', auth, (req, res, next) => {
  try {
    const assignment = findRecord('assignments', req.params.id);
    if (!assignment) throw httpError(404, 'Assignment not found.');
    assertTeacherOwnsRecord(req, 'assignments', assignment, req.params.id);
    const file = filesFor(assignment)[0];
    if (!file) throw httpError(404, 'No file is attached to this assignment.');
    res.download(uploadPath(file.path), file.name);
  } catch (error) { next(error); }
});
app.get('/api/assignments/:id/files/:index', auth, (req, res, next) => {
  try {
    const assignment = findRecord('assignments', req.params.id);
    if (!assignment) throw httpError(404, 'Assignment not found.');
    assertTeacherOwnsRecord(req, 'assignments', assignment, req.params.id);
    const file = filesFor(assignment)[requireInt(req.params.index, 'file index')];
    if (!file) throw httpError(404, 'Assignment file not found.');
    res.download(uploadPath(file.path), file.name);
  } catch (error) { next(error); }
});
app.get('/api/submissions/:id/file', auth, (req, res, next) => {
  try {
    const record = findRecord('submissions', req.params.id);
    if (!record) throw httpError(404, 'Submission not found.');
    if (req.user.role === 'student' && record.studentId !== req.user.id) throw httpError(403, 'You cannot download another student’s files.');
    assertTeacherOwnsRecord(req, 'submissions', record, req.params.id);
    const file = filesFor(record)[0];
    if (!file) throw httpError(404, 'This submission has no uploaded file.');
    res.download(uploadPath(file.path), file.name);
  } catch (error) { next(error); }
});
app.get('/api/submissions/:id/files/:index', auth, (req, res, next) => {
  try {
    const record = findRecord('submissions', req.params.id);
    if (!record) throw httpError(404, 'Submission not found.');
    if (req.user.role === 'student' && record.studentId !== req.user.id) throw httpError(403, 'You cannot download another student’s files.');
    assertTeacherOwnsRecord(req, 'submissions', record, req.params.id);
    const file = filesFor(record)[requireInt(req.params.index, 'file index')];
    if (!file) throw httpError(404, 'Submission file not found.');
    res.download(uploadPath(file.path), file.name);
  } catch (error) { next(error); }
});

app.get('/api/students/:id', auth, (req, res, next) => {
  try {
    const student = findUserById(req.params.id);
    if (!student || student.role !== 'student') throw httpError(404, 'Student not found.');
    if (req.user.role === 'student' && student.id !== req.user.id) throw httpError(403, 'You cannot view another student’s profile.');
    if (req.user.role === 'teacher' && !teacherCanSeeStudent(req.user.id, student)) throw httpError(403, 'This student is not in your assigned subjects.');
    res.json(student);
  } catch (error) { next(error); }
});
app.get('/api/:collection/:id', auth, (req, res, next) => {
  try {
    const { collection, id } = req.params;
    if (!recordCollections[collection]) throw httpError(404, 'Unknown resource.');
    const record = findRecord(collection, id);
    if (!record) throw httpError(404, 'Record not found.');
    if (req.user.role === 'student' && record.studentId !== undefined && record.studentId !== req.user.id) throw httpError(403, 'You cannot view another student’s records.');
    if (req.user.role === 'teacher') assertTeacherOwnsRecord(req, collection, record, id);
    res.json(record);
  } catch (error) { next(error); }
});

// Serve the frontend from the same origin; never expose local database or upload storage.
app.use((req, res, next) => {
  if (/^\/(data|backend|uploads|node_modules|\.git)(\/|$)/.test(req.path) || /\.(sqlite(?:-shm|-wal)?|env)$/i.test(req.path) || ['/server.js','/api.js','/run_tests.js','/view_smoke.test.js','/package.json','/package-lock.json'].includes(req.path) || req.path.endsWith('.md')) return res.sendStatus(404);
  next();
});
app.use(express.static(__dirname, { index: 'index.html', dotfiles: 'deny' }));
app.use((error, _req, res, _next) => {
  const status = Number(error.status) || (error instanceof multer.MulterError ? 400 : 500);
  if (status >= 500) console.error(error);
  res.status(status).json({ message: status >= 500 ? 'Unexpected server error.' : error.message });
});

const port = Number(process.env.PORT) || 3000;
if (require.main === module) app.listen(port, '0.0.0.0', () => console.log(`MCA academic app listening on http://0.0.0.0:${port}`));
module.exports = { app, db };
