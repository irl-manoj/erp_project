'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('both dashboard roles and their view containers are present', () => {
  const html = read('dashboard.html');
  assert.match(html, /data-student-only/);
  assert.match(html, /data-teacher-only/);
  assert.match(html, /id="submitFile"[^>]*multiple/);
  assert.match(html, /name="files"[^>]*multiple/);
  for (const view of ['dashboard','subjects','attendance','quiz','internal','assignments','sgpa','progress','exams','profile','teacher-subjects','teacher-attendance','teacher-submissions']) {
    assert.match(html, new RegExp(`data-view="${view}"`));
  }
});

test('browser loads real API client and verifies the server session before dashboard boot', () => {
  const html = read('dashboard.html');
  const client = read('js/api.js');
  const app = read('app.js');
  assert.match(html, /src="js\/api\.js"/);
  assert.match(client, /fetch\(/);
  assert.match(client, /\/auth\/login/);
  assert.match(client, /\/auth\/me/);
  assert.match(app, /await API\.getMe\(\)/);
});
