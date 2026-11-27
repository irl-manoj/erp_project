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
    payload TEXT NOT NULL,
    UNIQUE(collection, record_key)
  );
  CREATE INDEX IF NOT EXISTS idx_records_collection ON records(collection);
  CREATE INDEX IF NOT EXISTS idx_records_owner ON records(collection, owner_id);
  CREATE INDEX IF NOT EXISTS idx_records_subject ON records(collection, subject_id);
`);

const recordCollections = {
  subjects: MockDB.subjects,
  attendance: MockDB.attendance,
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
function listRecords(collection) {
  return db.prepare('SELECT payload FROM records WHERE collection=? ORDER BY id').all(collection).map(row => JSON.parse(row.payload));
}
function upsertRecord(collection, record, key) {
  const recordKey = String(key ?? record.id ?? `${record.subjectId ?? ''}:${record.studentId ?? ''}`);
  db.prepare(`INSERT INTO records(collection,record_key,owner_id,subject_id,payload) VALUES(?,?,?,?,?)
    ON CONFLICT(collection,record_key) DO UPDATE SET owner_id=excluded.owner_id, subject_id=excluded.subject_id, payload=excluded.payload`)
    .run(collection, recordKey, record.studentId ?? null, record.subjectId ?? null, JSON.stringify(record));
  return record;
}
function deleteRecord(collection, key) {
  return db.prepare('DELETE FROM records WHERE collection=? AND record_key=?').run(collection, String(key)).changes > 0;
}
function findRecord(collection, key) {
  const row = db.prepare('SELECT payload FROM records WHERE collection=? AND record_key=?').get(collection, String(key));
  return row ? JSON.parse(row.payload) : null;
}

module.exports = { db, recordCollections, listUsers, findUserById, listRecords, upsertRecord, deleteRecord, findRecord, safeUser };
