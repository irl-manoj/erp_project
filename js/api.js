/* Browser API client for the Express backend. Academic data is never cached locally. */
(function () {
  'use strict';
  const API_BASE = (window.CONFIG && window.CONFIG.API_BASE_URL) || '/api';
  const USER_KEY = 'mca_current_user';
  const TOKEN_KEY = 'mca_access_token';
  let memoryToken = null;

  function readToken() {
    if (memoryToken) return memoryToken;
    try {
      const token = sessionStorage.getItem(TOKEN_KEY);
      if (token) return token;
    } catch {}
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  }
  function sessionHeaders() {
    const headers = new Headers();
    const token = readToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
      // Some embedded proxies remove Authorization; this same-origin fallback carries
      // the same signed token in a non-special header.
      headers.set('X-Session-Token', token);
    }
    return headers;
  }
  function clearSession() {
    memoryToken = null;
    try { localStorage.removeItem(USER_KEY); } catch {}
    try { localStorage.removeItem(TOKEN_KEY); } catch {}
    try { sessionStorage.removeItem(TOKEN_KEY); } catch {}
  }

  function queryString(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.set(key, value);
    });
    const query = params.toString();
    return query ? `?${query}` : '';
  }
  async function request(path, options = {}) {
    const headers = new Headers(sessionHeaders());
    new Headers(options.headers || {}).forEach((value, key) => headers.set(key, value));
    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'same-origin' });
    const contentType = response.headers.get('content-type') || '';
    const body = contentType.includes('application/json') ? await response.json() : null;
    if (!response.ok) {
      const error = { status: response.status, message: body?.message || `Request failed (${response.status})` };
      if (response.status === 401 && (path === '/auth/login' || path === '/auth/me' || (!location.pathname.endsWith('index.html') && !location.pathname.endsWith('login.html')))) {
        clearSession();
      }
      throw error;
    }
    return body;
  }
  const get = (collection, filters = {}) => request(`/${collection}${queryString(filters)}`);
  const post = (collection, payload) => request(`/${collection}`, { method: 'POST', body: JSON.stringify(payload) });
  const put = (collection, id, payload) => request(`/${collection}/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) });

  const API = {
    authenticate: async (identifier, role, password) => {
      const result = await request('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, role, password }) });
      memoryToken = result.accessToken;
      try { localStorage.setItem(USER_KEY, JSON.stringify(result.user)); } catch {}
      try { sessionStorage.setItem(TOKEN_KEY, result.accessToken); } catch {}
      try { localStorage.setItem(TOKEN_KEY, result.accessToken); } catch {}
      return result.user;
    },
    login: async (userId) => {
      const user = await request(`/students/${encodeURIComponent(userId)}`);
      return user;
    },
    getCurrentUser: () => { try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; } },
    getMe: async () => {
      const result = await request('/auth/me');
      try { localStorage.setItem(USER_KEY, JSON.stringify(result.user)); } catch {}
      return result.user;
    },
    logout: async () => {
      try { await request('/auth/logout', { method: 'POST' }); } finally { clearSession(); }
      return { success: true };
    },
    getStudent: id => request(`/students/${encodeURIComponent(id)}`),
    getStudents: filters => get('students', filters),
    getTeachers: () => get('teachers'),
    getSubjects: filters => get('subjects', filters),
    getSubject: async id => {
      const list = await get('subjects');
      const item = list.find(x => String(x.id) === String(id));
      if (!item) throw { status: 404, message: 'Subject not found' };
      return item;
    },
    createSubject: payload => post('subjects', payload),
    updateSubject: (id, payload) => put('subjects', id, payload),
    deleteSubject: id => request(`/subjects/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    getAttendance: filters => get('attendance', filters),
    updateAttendance: (subjectId, studentId, payload) => request('/attendance/upsert', { method: 'PUT', body: JSON.stringify({ subjectId, studentId, ...payload }) }),
    getQuizzes: filters => get('quizzes', filters),
    getAssessments: filters => get('quizzes', filters),
    updateQuiz: (id, payload) => put('quizzes', id, payload),
    getInternals: filters => get('internals', filters),
    getInternal: (subjectId, studentId) => request(`/internals/one${queryString({ subjectId, studentId })}`),
    updateInternal: (subjectId, studentId, components) => request('/internals/upsert', { method: 'PUT', body: JSON.stringify({ subjectId, studentId, components }) }),
    getEndSems: filters => get('endSems', filters),
    getEndSem: (subjectId, studentId) => request(`/endSems/one${queryString({ subjectId, studentId })}`),
    updateEndSem: (subjectId, studentId, marksObtained) => request('/endSems/upsert', { method: 'PUT', body: JSON.stringify({ subjectId, studentId, marksObtained }) }),
    getLabMarks: filters => get('labMarks', filters),
    updateLabMarks: (subjectId, studentId, components) => request('/labMarks/upsert', { method: 'PUT', body: JSON.stringify({ subjectId, studentId, components }) }),
    getAssignments: filters => get('assignments', filters),
    createAssignment: payload => {
      const attachments = Array.from(payload.files || []);
      if (attachments.length) {
        const form = new FormData();
        Object.entries(payload).forEach(([key, value]) => { if (key !== 'files' && value != null) form.append(key, value); });
        attachments.forEach(file => form.append('attachments', file));
        return request('/assignments/upload', { method: 'POST', body: form });
      }
      return post('assignments', payload);
    },
    updateAssignment: (id, payload) => put('assignments', id, payload),
    deleteAssignment: id => request(`/assignments/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    downloadAssignment: async (id, index = 0, fileName = '') => {
      const response = await fetch(`${API_BASE}/assignments/${encodeURIComponent(id)}/files/${encodeURIComponent(index)}`, { credentials: 'same-origin', headers: sessionHeaders() });
      if (!response.ok) throw { status: response.status, message: 'No assignment file is attached or download is unavailable.' };
      const blob = await response.blob();
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = fileName || '';
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(link.href);
    },

    getSubmissions: filters => get('submissions', filters),
    createSubmission: payload => {
      const files = Array.from(payload.files || []);
      if (files.length) {
        const form = new FormData(); form.append('assignmentId', payload.assignmentId);
        files.forEach(file => form.append('files', file));
        return request('/submissions/upload', { method: 'POST', body: form });
      }
      return post('submissions', payload);
    },
    gradeSubmission: (id, marks, feedback) => put('submissions', id, { marks, feedback }),
    downloadSubmission: async (id, index = 0, fileName = '') => {
      const response = await fetch(`${API_BASE}/submissions/${encodeURIComponent(id)}/files/${encodeURIComponent(index)}`, { credentials: 'same-origin', headers: sessionHeaders() });
      if (!response.ok) throw { status: response.status, message: 'Could not download this submission.' };
      const blob = await response.blob();
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = fileName || '';
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(link.href);
    },
    getExams: filters => get('exams', filters),
    getNotices: filters => get('notices', filters),
    getNotes: filters => get('notes', filters),
    getSyllabus: subjectId => get('syllabus', { subjectId }).then(rows => rows.find(x => String(x.subjectId) === String(subjectId)) || { subjectId, modules: [] }),
    getNotifications: () => get('notifications'),
    getProgress: studentId => request(`/progress${queryString({ studentId })}`),
    getMarks: async filters => {
      const [quizzes, internals, endsems, labs] = await Promise.all([API.getQuizzes(filters), API.getInternals(filters), API.getEndSems(filters), API.getLabMarks(filters)]);
      return { quizzes, internals, endsems, labs };
    },
    search: async (query, studentId) => {
      const filters = { search: query };
      const [subjects, assignments, notes, notices] = await Promise.all([API.getSubjects(filters), API.getAssignments(filters), API.getNotes(filters), API.getNotices(filters)]);
      return { subjects, assignments, notes, notices };
    }
  };
  window.API = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = { API };
})();
