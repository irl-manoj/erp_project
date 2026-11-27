'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = __dirname;
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('both dashboard roles and their view containers are present', () => {
  const html = read('dashboard.html');
  assert.match(html, /data-student-only/);
  assert.match(html, /data-teacher-only/);
  assert.match(html, /id="submitFile"[^>]*multiple/);
  assert.match(html, /name="files"[^>]*multiple/);
  assert.match(html, /id="timetableForm"/);
  assert.match(html, /data-view="timetable"/);
  for (const view of ['dashboard','subjects','attendance','timetable','fees','quiz','internal','assignments','sgpa','progress','exams','profile','teacher-subjects','teacher-attendance','teacher-submissions']) {
    assert.match(html, new RegExp(`data-view="${view}"`));
  }
});

test('browser loads real API client and verifies the server session before dashboard boot', () => {
  const html = read('dashboard.html');
  const client = read('js/api.js');
  const app = read('app.js');
  const login = read('login.html');
  const registration = read('register.html');
  assert.match(html, /src="js\/api\.js\?v=timetable-management1"/);
  assert.match(client, /fetch\(/);
  assert.match(client, /\/auth\/login/);
  assert.match(client, /\/auth\/me/);
  assert.match(client, /Authorization/);
  assert.match(login, /await API\.getMe\(\)/);
  assert.match(login, /href="register\.html"/);
  assert.match(registration, /API\.register\(payload\)/);
  assert.match(client, /\/auth\/register/);
  assert.match(client, /getAttendanceSessions/);
  assert.match(client, /getTimetable/);
  assert.match(client, /createTimetable/);
  assert.match(client, /updateTimetable/);
  assert.match(client, /deleteTimetable/);
  assert.match(client, /payDemoFee/);
  assert.match(app, /Weekly timetable/);
  assert.match(app, /API\.getTimetable\(\)\.then\(items=>\(\{items,error:null\}\)\)\.catch\(error=>\(\{items:\[\],error\}\)\)/);
  assert.match(app, /Attend the next/);
  assert.match(app, /Daily attendance history/);
  assert.match(app, /Demo billing only/);
  assert.match(app, /await API\.getMe\(\)/);
});

test('login bearer token survives blocked sessionStorage and a page reload', async () => {
  const values = new Map();
  const localStorage = {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
  const sessionStorage = {
    getItem: () => { throw new Error('sessionStorage unavailable'); },
    setItem: () => { throw new Error('sessionStorage unavailable'); },
    removeItem: () => { throw new Error('sessionStorage unavailable'); }
  };
  const user = { id: 101, role: 'student' };
  let requestAuthorization = null;
  let lastHeaders = null;
  const fetch = async (_url, options) => {
    lastHeaders = options.headers;
    requestAuthorization = options.headers.get('Authorization');
    const isLogin = _url.endsWith('/auth/login');
    const body = isLogin ? { user, accessToken: 'test-access-token' } : { user };
    return { ok: true, headers: { get: () => 'application/json' }, json: async () => body };
  };
  const makeClient = () => {
    const context = {
      window: { CONFIG: { API_BASE_URL: '/api' } },
      location: { pathname: '/login.html' },
      localStorage, sessionStorage, fetch, Headers, FormData, URLSearchParams
    };
    vm.runInNewContext(read('js/api.js'), context);
    return context.window.API;
  };

  const loginClient = makeClient();
  await loginClient.authenticate('manoj.das@bitmesra.ac.in', 'student', '1234');
  await loginClient.getMe();
  assert.equal(requestAuthorization, 'Bearer test-access-token');
  assert.equal(lastHeaders.get('X-Session-Token'), 'test-access-token');

  requestAuthorization = null;
  const reloadedClient = makeClient();
  await reloadedClient.getMe();
  assert.equal(requestAuthorization, 'Bearer test-access-token');
  assert.equal(lastHeaders.get('X-Session-Token'), 'test-access-token');
});
