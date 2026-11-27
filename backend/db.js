'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { MockDB } = require('../api');

const dataDir = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.resolve(process.env.DB_PATH || path.join(dataDir, 'academic.sqlite'));
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    role TEXT NOT NULL CHECK(role IN ('student','teacher')),
    password_hash TEXT NOT NULL,
    profile_json TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    collection TEXT NOT NULL,
    record_key TEXT NOT NULL,
    owner_id INTEGER,
    subject_id INTEGER,
    teacher_id INTEGER,
    payload TEXT NOT NULL,
    UNIQUE(collection, record_key)
  );
  CREATE INDEX IF NOT EXISTS idx_records_collection ON records(collection);
  CREATE INDEX IF NOT EXISTS idx_records_owner ON records(collection, owner_id);
  CREATE INDEX IF NOT EXISTS idx_records_subject ON records(collection, subject_id);
`);
try { db.exec('ALTER TABLE records ADD COLUMN teacher_id INTEGER'); } catch (error) { if (!/duplicate column/i.test(error.message)) throw error; }
db.exec('CREATE INDEX IF NOT EXISTS idx_records_teacher ON records(collection, teacher_id)');
db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (migration_key TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');

const recordCollections = {
  subjects: MockDB.subjects,
  timetable: MockDB.timetable,
  attendance: MockDB.attendance,
  attendanceSessions: MockDB.attendanceSessions,
  fees: MockDB.fees,
  feePayments: MockDB.feePayments,
  quizzes: MockDB.quizzes,
  internals: MockDB.internals,
  endSems: MockDB.endSems,
  labMarks: MockDB.labMarks,
  assignments: MockDB.assignments,
  submissions: MockDB.submissions,
  exams: MockDB.exams,
  notices: MockDB.notices,
  notes: MockDB.notes,
  syllabus: MockDB.syllabus,
  notifications: MockDB.notifications
};
const requestedDemoFee = Math.floor(Number(process.env.DEMO_SEMESTER_FEE_INR));
const configuredDemoFee = Number.isSafeInteger(requestedDemoFee) && requestedDemoFee > 0 ? requestedDemoFee : 50000;
for (const invoice of recordCollections.fees) invoice.amountInr = configuredDemoFee;
const count = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
if (count === 0) {
  const demoPassword = process.env.DEMO_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : '1234');
  if (!demoPassword) throw new Error('Set DEMO_PASSWORD before starting in production.');
  const insertUser = db.prepare(`INSERT INTO users(id,name,email,role,password_hash,profile_json) VALUES(?,?,?,?,?,?)`);
  const addUser = db.transaction((user, role) => {
    const profile = { ...user, role };
    insertUser.run(user.id, user.name, user.email, role, bcrypt.hashSync(demoPassword, 12), JSON.stringify(profile));
  });
  for (const user of MockDB.students) addUser(user, 'student');
  for (const user of MockDB.teachers) addUser(user, 'teacher');
  const insertRecord = db.prepare(`INSERT OR IGNORE INTO records(collection,record_key,owner_id,subject_id,payload) VALUES(?,?,?,?,?)`);
  const seedRecords = db.transaction(() => {
    for (const [collection, list] of Object.entries(recordCollections)) {
      for (const item of list) {
        const key = item.id == null ? `${item.subjectId ?? ''}:${item.studentId ?? ''}` : String(item.id);
        insertRecord.run(collection, key, item.studentId ?? null, item.subjectId ?? null, JSON.stringify(item));
      }
    }
  });
  seedRecords();
}

function safeUser(row) {
  if (!row) return null;
  try { return JSON.parse(row.profile_json); } catch { return { id: row.id, name: row.name, email: row.email, role: row.role }; }
}
function listUsers(role) {
  const rows = role
    ? db.prepare('SELECT id,name,email,role,profile_json FROM users WHERE role=? ORDER BY id').all(role)
    : db.prepare('SELECT id,name,email,role,profile_json FROM users ORDER BY id').all();
  return rows.map(safeUser);
}
function findUserById(id) {
  return safeUser(db.prepare('SELECT id,name,email,role,profile_json FROM users WHERE id=?').get(id));
}
function listRecords(collection, teacherId) {
  const rows = teacherId == null
    ? db.prepare('SELECT payload FROM records WHERE collection=? ORDER BY id').all(collection)
    : db.prepare('SELECT payload FROM records WHERE collection=? AND teacher_id=? ORDER BY id').all(collection, teacherId);
  return rows.map(row => JSON.parse(row.payload));
}
function recordTeacherId(collection, key) {
  return db.prepare('SELECT teacher_id FROM records WHERE collection=? AND record_key=?').get(collection, String(key))?.teacher_id ?? null;
}
function upsertRecord(collection, record, key, teacherId = null) {
  const recordKey = String(key ?? record.id ?? `${record.subjectId ?? ''}:${record.studentId ?? ''}`);
  db.prepare(`INSERT INTO records(collection,record_key,owner_id,subject_id,teacher_id,payload) VALUES(?,?,?,?,?,?)
    ON CONFLICT(collection,record_key) DO UPDATE SET owner_id=excluded.owner_id, subject_id=excluded.subject_id,
      teacher_id=COALESCE(excluded.teacher_id, records.teacher_id), payload=excluded.payload`)
    .run(collection, recordKey, record.studentId ?? null, record.subjectId ?? null, teacherId, JSON.stringify(record));
  return record;
}
function deleteRecord(collection, key) {
  return db.prepare('DELETE FROM records WHERE collection=? AND record_key=?').run(collection, String(key)).changes > 0;
}
function findRecord(collection, key) {
  const row = db.prepare('SELECT payload FROM records WHERE collection=? AND record_key=?').get(collection, String(key));
  return row ? JSON.parse(row.payload) : null;
}

// Backfill ownership for both fresh databases and older databases seeded before teacher isolation.
const teachersByName = new Map(listUsers('teacher').map(user => [String(user.name).trim().toLowerCase(), user.id]));
const subjectOwners = new Map(listRecords('subjects').map(subject => [String(subject.id), teachersByName.get(String(subject.faculty || '').trim().toLowerCase()) ?? null]));
const assignmentOwners = new Map(listRecords('assignments').map(assignment => [String(assignment.id), subjectOwners.get(String(assignment.subjectId)) ?? null]));
const setTeacherOwner = db.prepare('UPDATE records SET teacher_id=? WHERE collection=? AND record_key=? AND teacher_id IS NULL');
for (const collection of Object.keys(recordCollections)) {
  for (const item of listRecords(collection)) {
    let teacherId = null;
    if (collection === 'subjects') teacherId = subjectOwners.get(String(item.id));
    else if (collection === 'submissions') teacherId = assignmentOwners.get(String(item.assignmentId));
    else if (item.subjectId != null) teacherId = subjectOwners.get(String(item.subjectId));
    if (teacherId == null && item.author) teacherId = teachersByName.get(String(item.author).trim().toLowerCase()) ?? null;
    if (teacherId != null) {
      const key = item.id == null ? `${item.subjectId ?? ''}:${item.studentId ?? ''}` : String(item.id);
      setTeacherOwner.run(teacherId, collection, key);
    }
  }
}

const featureMigration = 'weekly-timetable-attendance-fees-v1';
if (!db.prepare('SELECT 1 FROM schema_migrations WHERE migration_key=?').get(featureMigration)) {
  const migrateFeatures = db.transaction(() => {
    for (const collection of ['timetable','fees','feePayments']) {
      for (const item of recordCollections[collection]) {
        const owner = item.subjectId == null ? null : subjectOwners.get(String(item.subjectId)) ?? null;
        upsertRecord(collection, item, item.id, owner);
      }
    }
    if (!listRecords('attendanceSessions').length) {
      const dayIndex = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
      const sessionsBySubject = new Map();
      for (const session of listRecords('timetable')) {
        if (!sessionsBySubject.has(String(session.subjectId))) sessionsBySubject.set(String(session.subjectId), new Set());
        sessionsBySubject.get(String(session.subjectId)).add(dayIndex[session.day]);
      }
      for (const summary of listRecords('attendance')) {
        const classDays = sessionsBySubject.get(String(summary.subjectId)) || new Set();
        const dates = [];
        const cursor = new Date(Date.UTC(2026, 10, 27, 12));
        for (let step = 0; step < 1200 && dates.length < Number(summary.totalClasses || 0); step++) {
          if (classDays.has(cursor.getUTCDay())) dates.push(cursor.toISOString().slice(0, 10));
          cursor.setUTCDate(cursor.getUTCDate() - 1);
        }
        dates.reverse();
        const total = dates.length;
        const attended = Math.min(total, Math.max(0, Number(summary.attendedClasses) || 0));
        dates.forEach((date, index) => {
          const session = { id: `${summary.subjectId}-${summary.studentId}-${date}`, subjectId: summary.subjectId, studentId: summary.studentId, date, status: Math.floor((index + 1) * attended / total) > Math.floor(index * attended / total) ? 'present' : 'absent' };
          upsertRecord('attendanceSessions', session, session.id, subjectOwners.get(String(summary.subjectId)) ?? null);
        });
      }
    }
    db.prepare('INSERT INTO schema_migrations(migration_key,applied_at) VALUES(?,?)').run(featureMigration, new Date().toISOString());
  });
  migrateFeatures();
}

module.exports = { db, recordCollections, listUsers, findUserById, listRecords, recordTeacherId, upsertRecord, deleteRecord, findRecord, safeUser };
