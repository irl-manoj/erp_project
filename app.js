/**
 * MCA Academic Dashboard - Main Controller v3 - BIT Mesra
 * Per-student academic views and role-specific workflows.
 * Browser -> authenticated Express API -> SQLite database and private file storage.
 */
(function(){
  const ROLE = window.ROLE || 'student';
  // read persisted login; fallback to role default for direct URL access
  function getPersistedUser(){
    try{
      const u = JSON.parse(localStorage.getItem('mca_current_user')||'null');
      if(u && u.id) return u;
    }catch{}
    return null;
  }
  const _persisted = getPersistedUser();
  // portal role is decided by the PAGE (window.ROLE); persisted login must match to be used
  const _myUser = (_persisted && _persisted.role === ROLE) ? _persisted : null;
  const State = {
    role: ROLE,
    currentUser: _myUser,
    studentId: _myUser && ROLE==='student' ? _myUser.id : 101,
    teacherSelectedStudentId: 101,
    teacherSelectedStudent: null,
    semester: 1,
    view: 'dashboard',
    subjects: [],
    attendance: [],
    quizzes: [],
    internals: [],
    endsems: [],
    labMarks: [],
    assignments: [],
    submissions: [],
    exams: [],
    notices: [],
    notes: [],
    notifications: [],
    search: '',
    currentSubjectId: null,
    theme: 'light',
    tempInternal: []
  };

  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);
  function toast(msg, type='info'){
    const c = $('#toastContainer'); if(!c) return;
    const color = type==='success'?'#10b981':type==='error'?'#ef4444':type==='warning'?'#f59e0b':'#c8102e';
    const icon = type==='success'?'fa-circle-check':type==='error'?'fa-circle-xmark':type==='warning'?'fa-triangle-exclamation':'fa-circle-info';
    const el=document.createElement('div');
    el.className='toast-saas mb-2 fade-in';
    el.style.borderLeftColor=color;
    el.innerHTML=`<div class="d-flex gap-3 align-items-start"><i class="fa-solid ${icon}" style="color:${color};margin-top:3px;"></i><div class="small flex-fill" style="font-weight:500;">${msg}</div><button class="btn btn-sm" style="border:none;background:transparent;" onclick="this.closest('.toast-saas').remove()"><i class="fa-solid fa-xmark" style="color:var(--text-muted)"></i></button></div>`;
    c.appendChild(el);
    setTimeout(()=>{ el.style.transition='all .28s'; el.style.opacity='0'; el.style.transform='translateX(8px)'; setTimeout(()=>el.remove(),280)}, 3800);
  }
  function esc(s){ return (s||'').toString().replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function fmtDate(d){ try{ return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});}catch{return d;}}
  function skeletonCards(n=3){ return Array.from({length:n}).map(()=>`<div class="col"><div class="skeleton skeleton-card"></div></div>`).join(''); }
  function escAttr(s){ return esc(s).replace(/'/g,'&#39;'); }

  function setView(view){
    State.view = view;
    $$('.view-section').forEach(el=> el.classList.toggle('d-none', el.dataset.view!==view));
    $$('.sidebar .nav-link').forEach(a=> a.classList.toggle('active', a.dataset.view===view));
    window.scrollTo({top:0,behavior:'smooth'});
    if(view==='dashboard'){ State.role==='teacher'? loadTeacherDashboard(): loadDashboard(); }
    if(view==='subjects') loadSubjectsView();
    if(view==='subject-details'){ const c=$('#subjectDetailsView'); const L=c?(c.dataset.loadedId||''):''; if(c && !L.startsWith('pending') && L!==String(State.currentSubjectId)) openSubject(State.currentSubjectId); }
    if(view==='attendance') loadAttendanceView();
    if(view==='quiz') loadQuizView();
    if(view==='internal') loadInternalView();
    if(view==='assignments') loadAssignmentsView();
    if(view==='syllabus') loadSyllabusView();
    if(view==='notes') loadNotesView();
    if(view==='sgpa') loadSgpaView();
    if(view==='exams') loadExamsView();
    if(view==='notices') loadNoticesView();
    if(view==='progress') loadProgressView();
    if(view==='profile') loadProfileView();
    if(view==='teacher-subjects') loadTeacherSubjects();
    if(view==='teacher-students') loadTeacherStudents();
    if(view==='teacher-quizzes') loadTeacherQuizzes();
    if(view==='teacher-internal') loadTeacherInternal();
    if(view==='teacher-attendance') loadTeacherAttendance();
    if(view==='teacher-assignments') loadTeacherAssignments();
    if(view==='teacher-submissions') loadTeacherSubmissions();
  }

  function toggleTheme(){
    State.theme = State.theme==='light'?'dark':'light';
    document.documentElement.setAttribute('data-theme', State.theme);
    const i=$('#themeIcon'); if(i) i.className = State.theme==='dark'?'fa-solid fa-sun':'fa-solid fa-moon';
  }

  async function handleSearch(q){
    State.search = q.trim().toLowerCase();
    const c=$('#searchResults');
    if(!State.search){ if(c) c.classList.add('d-none'); setView(State.view); return; }
    try{
      const res = await API.search(State.search, State.studentId);
      if(!c) return;
      c.classList.remove('d-none');
      c.innerHTML=`
        <div class="card-saas p-3 mb-3">
          <div class="d-flex justify-content-between align-items-center">
            <div class="fw-bold">Search results for "${esc(q)}" <span class="badge rounded-pill" style="background:var(--bg-soft);border:1px solid var(--border);">${res.subjects.length+res.assignments.length+res.notes.length+res.notices.length} found</span></div>
            <button class="btn btn-ghost btn-sm" onclick="document.getElementById('searchResults').classList.add('d-none');document.getElementById('globalSearch').value='';State.search='';setView(State.view)">Clear ✕</button>
          </div>
          <div class="row g-3 mt-2">
            <div class="col-md-3"><div class="fw-bold small mb-1">Subjects (${res.subjects.length})</div>${res.subjects.map(s=>`<div class="small p-2 rounded mt-1" style="background:var(--bg-soft);border:1px solid var(--border);cursor:pointer" onclick="openSubject(${s.id})">${esc(s.name)}<div class="text-muted" style="font-size:0.72rem;">${esc(s.code)} • Sem ${s.semester}</div></div>`).join('') || '<div class="small text-muted">No subjects</div>'}</div>
            <div class="col-md-3"><div class="fw-bold small mb-1">Assignments (${res.assignments.length})</div>${res.assignments.map(a=>`<div class="small p-2 rounded mt-1" style="background:var(--bg-soft);border:1px solid var(--border);">${esc(a.title)}</div>`).join('') || '<div class="small text-muted">No assignments</div>'}</div>
            <div class="col-md-3"><div class="fw-bold small mb-1">Notes (${res.notes.length})</div>${res.notes.map(n=>`<div class="small p-2 rounded mt-1" style="background:var(--bg-soft);border:1px solid var(--border);">${esc(n.title)}</div>`).join('') || '<div class="small text-muted">No notes</div>'}</div>
            <div class="col-md-3"><div class="fw-bold small mb-1">Notices (${res.notices.length})</div>${res.notices.map(n=>`<div class="small p-2 rounded mt-1" style="background:var(--bg-soft);border:1px solid var(--border);">${esc(n.title)}</div>`).join('') || '<div class="small text-muted">No notices</div>'}</div>
          </div>
        </div>`;
    }catch{ toast('Search failed - try again','error'); }
  }

  /* ---------- Loaders ---------- */
  async function loadDashboard(){
    const dash=$('#dashboardContent'); if(!dash) return;
    dash.innerHTML=`<div class="row g-3">${skeletonCards(4)}</div><div class="row g-3 mt-1">${skeletonCards(3)}</div>`;
    try{
      const [subjects, attendance, quizzes, internals, endsems, labMarks, assignments, exams, notices, notifications, submissions] = await Promise.all([
        API.getSubjects({semester: State.semester}),
        API.getAttendance({studentId: State.studentId}),
        API.getQuizzes({studentId: State.studentId}),
        API.getInternals({studentId: State.studentId}),
        API.getEndSems({studentId: State.studentId}),
        API.getLabMarks({studentId: State.studentId}),
        API.getAssignments({}),
        API.getExams({}),
        API.getNotices({}),
        API.getNotifications(),
        API.getSubmissions({studentId: State.studentId})
      ]);
      State.subjects=subjects; State.attendance=attendance; State.quizzes=quizzes; State.internals=internals; State.endsems=endsems; State.labMarks=labMarks; State.assignments=assignments; State.exams=exams; State.notices=notices; State.notifications=notifications; State.submissions=submissions;
      attendance.forEach(a=> a.percentage = calculateAttendance(a.attendedClasses, a.totalClasses));
      const semSubjects = subjects.filter(s=>s.semester===State.semester);
      let overallAttendance = calculateOverallAttendance(attendance.filter(a=> semSubjects.some(s=>s.id===a.subjectId)));
      if(!isFinite(overallAttendance)) overallAttendance=0;
      const subjectPerformances = semSubjects.map(s=>{
        if(s.type==='lab'){
          const lab = labMarks.find(l=>l.subjectId===s.id);
          const tot = lab ? calculateLabTotal(lab.components).total : 0;
          return {...s, marks: tot, percentage: tot, gradePoint: getGradePoint(tot)};
        } else {
          const q = quizzes.filter(x=>x.subjectId===s.id);
          const best = calculateBestTwoQuizzes(q);
          const internal = internals.find(x=>x.subjectId===s.id);
          const internalTotal = internal? calculateInternalTotal(internal.components):0;
          const end = endsems.find(x=>x.subjectId===s.id);
          const endMarks = end? end.marksObtained:0;
          const total = calculateTheoryTotal(best.countedMarks, internalTotal, endMarks);
          return {...s, marks: total, percentage: total, gradePoint: getGradePoint(total), best, internalTotal, endMarks};
        }
      });
      const sgpaData = calculateSGPA(subjectPerformances);
      // CGPA: sem1 actual + sem2 mock (to show trend)
      const sem2Subjects = State.subjects.filter(s=>s.semester===2);
      const sem2Perf = sem2Subjects.map(s=>{
        const m = 68 + Math.floor(Math.random()*18);
        return {...s, marks:m, percentage:m, gradePoint:getGradePoint(m)};
      });
      const cgpaData = calculateCGPA([{subjects: subjectPerformances},{subjects: sem2Perf}]);
      // pending assignments: not submitted by this student
      const submittedIds = new Set(submissions.map(s=>s.assignmentId));
      const pending = assignments.filter(a=> !submittedIds.has(a.id) && new Date(a.deadline) >= new Date()).length;
      const upcomingExams = exams.filter(e=>e.status==='upcoming').length;

      dash.innerHTML=`
        <div class="hero-greeting mb-4">
          <div class="row align-items-center g-3">
            <div class="col-lg-8">
              <div class="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill" style="background:rgba(255,255,255,0.16);border:1px solid rgba(255,255,255,0.22);font-size:0.72rem;font-weight:700;letter-spacing:0.06em;">● LIVE • API-DRIVEN • SEMESTER ${State.semester}</div>
              <h2 class="mt-3 mb-1" style="font-size:clamp(1.6rem,3vw,2rem);">Good Morning, ${State.currentUser ? esc(String(State.currentUser.name).split(' ')[0]) : 'there'} 👋</h2>
              <p class="mb-3" style="opacity:0.92;">Here's what's happening in Semester ${State.semester} today • ${new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
              <div class="d-flex flex-wrap gap-2">
                <span class="badge bg-white text-dark rounded-pill px-3 py-2" style="font-weight:700;"><i class="fa-solid fa-book me-1 text-primary"></i>${semSubjects.length} Subjects</span>
                <span class="badge bg-white text-dark rounded-pill px-3 py-2" style="font-weight:700;"><i class="fa-solid fa-chart-simple me-1 text-success"></i>SGPA ${sgpaData.sgpa}</span>
                <span class="badge rounded-pill px-3 py-2" style="background:rgba(255,255,255,0.16);border:1px solid rgba(255,255,255,0.28);font-weight:700;">CGPA ${cgpaData.cgpa}</span>
              </div>
            </div>
            <div class="col-lg-4 text-lg-end">
              <div class="semester-tabs">
                ${[1,2,3,4].map(n=>`<button class="${State.semester===n?'active':''}" onclick="switchSemester(${n})">Sem ${n}</button>`).join('')}
              </div>
              <div class="small mt-2" style="color:rgba(255,255,255,0.88);font-weight:500;">Switch semester to view respective subjects</div>
            </div>
          </div>
        </div>

        <div class="row g-3">
          <div class="col-6 col-xl-3"><div class="stat-card">
            <div class="icon-box" style="background:#fde5e9;color:#a30d26;border-color:#fbcfe0;"><i class="fa-solid fa-chart-line"></i></div>
            <div class="value">${sgpaData.sgpa}</div><div class="label">Current SGPA</div>
            <div class="trend" style="background:#dcfce7;color:#166534;border-color:#bbf7d0;"><i class="fa-solid fa-arrow-trend-up"></i> Credit-weighted</div>
            <div class="sub">${sgpaData.totalCredits} credits • ${sgpaData.totalPoints} points</div>
          </div></div>
          <div class="col-6 col-xl-3"><div class="stat-card">
            <div class="icon-box" style="background:#fce7f3;color:#9d174d;border-color:#fbcfe8;"><i class="fa-solid fa-graduation-cap"></i></div>
            <div class="value">${cgpaData.cgpa}</div><div class="label">Overall CGPA</div>
            <div class="trend" style="background:#fce7f3;color:#9d174d;border-color:#fbcfe8;"><i class="fa-solid fa-layer-group"></i> Across semesters</div>
            <div class="sub">${cgpaData.totalCredits} total credits</div>
          </div></div>
          <div class="col-6 col-xl-3"><div class="stat-card">
            <div class="icon-box" style="background:${overallAttendance>=75?'#dcfce7':'#fee2e2'};color:${overallAttendance>=75?'#166534':'#991b1b'};border-color:${overallAttendance>=75?'#bbf7d0':'#fecaca'};"><i class="fa-solid fa-clipboard-check"></i></div>
            <div class="value">${overallAttendance.toFixed(1)}%</div><div class="label">Overall Attendance</div>
            <div class="trend" style="background:${overallAttendance>=75?'#dcfce7':'#fee2e2'};color:${overallAttendance>=75?'#166534':'#991b1b'};border-color:${overallAttendance>=75?'#bbf7d0':'#fecaca'};">${overallAttendance>=75?'✓ Eligible (≥75%)':'⚠ Below 75%'}</div>
            <div class="progress progress-saas mt-2"><div class="progress-bar" style="width:${overallAttendance}%;background:${overallAttendance>=75?'#10b981':'#ef4444'}"></div></div>
          </div></div>
          <div class="col-6 col-xl-3"><div class="stat-card">
            <div class="icon-box" style="background:#fef3c7;color:#92400e;border-color:#fde68a;"><i class="fa-solid fa-file-pen"></i></div>
            <div class="value">${pending}</div><div class="label">Pending Assignments</div>
            <div class="trend" style="background:#fef3c7;color:#92400e;border-color:#fde68a;"><i class="fa-solid fa-clock"></i> Due soon</div>
            <div class="sub"><a href="#" onclick="setView('assignments');return false;" style="color:var(--primary);font-weight:700;text-decoration:none;">View all →</a></div>
          </div></div>
        </div>

        <div class="row g-3 mt-1">
          <div class="col-lg-8">
            <div class="card-saas h-100">
              <div class="card-header-saas">
                <div class="fw-bold"><i class="fa-solid fa-book-open me-2" style="color:var(--primary)"></i>My Subjects • Semester ${State.semester}</div>
                <button class="btn btn-ghost btn-sm" onclick="setView('subjects')">View all <i class="fa-solid fa-arrow-right ms-1"></i></button>
              </div>
              <div class="card-body">
                <div class="row g-3">
                  ${semSubjects.map(s=>{
                    const att = attendance.find(a=>a.subjectId===s.id);
                    const perc = att? att.percentage:0;
                    const status = getAttendanceStatus(perc);
                    let marksText='-', subText='';
                    if(s.type==='lab'){
                      const lab = labMarks.find(l=>l.subjectId===s.id);
                      const tot = lab? calculateLabTotal(lab.components):{total:0,max:100,percentage:0};
                      marksText = `${tot.total}/${tot.max}`; subText = `${tot.percentage}%`;
                    } else {
                      const perf = subjectPerformances.find(p=>p.id===s.id);
                      marksText = perf? `${perf.marks}/100` : '-';
                      subText = perf? `${perf.percentage}%` : '';
                    }
                    return `
                    <div class="col-md-6">
                      <div class="subject-card">
                        <div class="card-top" style="background:${s.color}"></div>
                        <div class="card-body">
                          <div class="d-flex justify-content-between align-items-start gap-2">
                            <div class="fw-bold" style="line-height:1.25;font-size:0.98rem;">${esc(s.name)}</div>
                            <span class="badge-type ${s.type==='theory'?'badge-theory':s.type==='lab'?'badge-lab':'badge-elective'}">${esc(s.type)}</span>
                          </div>
                          <div class="small text-muted mt-1">${esc(s.code)} • ${esc(s.faculty)} • ${s.credits} Cr</div>
                          <div class="mt-3">
                            <div class="d-flex justify-content-between small fw-bold"><span>Attendance</span><span class="${status.met?'text-success':'text-danger'}">${perc.toFixed(1)}% ${status.met?'✓':''}</span></div>
                            <div class="progress progress-saas mt-1" style="height:8px;"><div class="progress-bar" style="width:${perc}%;background:${status.met?'#10b981':'#ef4444'}"></div></div>
                            <div class="small text-muted mt-1">${status.label} • Required 75%</div>
                          </div>
                          <div class="mt-3 d-flex justify-content-between align-items-center p-2 rounded" style="background:var(--bg-soft);border:1px solid var(--border);">
                            <div><div class="small text-muted" style="font-weight:600;letter-spacing:0.04em;">CURRENT MARKS</div><div class="fw-bold" style="font-size:1.08rem;">${marksText} <span class="small fw-normal text-muted">${subText}</span></div></div>
                            <button class="btn btn-primary-saas btn-sm" onclick="openSubject(${s.id})">View →</button>
                          </div>
                        </div>
                      </div>
                    </div>`;
                  }).join('')}
                </div>
                ${semSubjects.length===0?`<div class="empty-state mt-3"><div class="empty-icon"><i class="fa-solid fa-book-open"></i></div><div class="fw-bold">No subjects in Semester ${State.semester}</div><div class="small text-muted">Teacher hasn't added subjects for this semester yet.</div><button class="btn btn-primary-saas btn-sm mt-3" onclick="switchSemester(1)">Go to Sem 1</button></div>`:''}
              </div>
            </div>
          </div>
          <div class="col-lg-4">
            <div class="card-saas mb-3">
              <div class="card-header-saas"><div class="fw-bold small" style="letter-spacing:0.06em;">OFFLINE QUIZ PERFORMANCE</div><span class="badge rounded-pill" style="background:var(--bg-soft);border:1px solid var(--border);">Best 2 of 3 • 30</span></div>
              <div class="card-body">
                <div class="chart-wrap sm"><canvas id="dashQuizChart"></canvas></div>
                <div class="quiz-offline-banner mt-3"><i class="fa-solid fa-chalkboard-teacher mt-1"></i><div><strong>Offline class tests:</strong> Taken in classroom by faculty. This dashboard only <em>displays</em> marks entered by teacher (no online quiz). Lowest automatically excluded. Ex: 12+14=26/30.</div></div>
              </div>
            </div>
            <div class="card-saas mb-3">
              <div class="card-header-saas"><div class="fw-bold small" style="letter-spacing:0.06em;">UPCOMING EXAMS</div><a href="#" onclick="setView('exams');return false;" class="small fw-bold text-decoration-none" style="color:var(--primary)">View all →</a></div>
              <div class="card-body p-0">
                ${exams.slice(0,3).map(e=>{
                  const subj = subjects.find(x=>x.id===e.subjectId);
                  return `<div class="p-3 d-flex gap-3 align-items-center" style="border-bottom:1px solid var(--border);">
                    <div class="text-center" style="min-width:54px;background:var(--bg-soft);border:1px solid var(--border);border-radius:12px;padding:8px 6px;"><div class="fw-bold" style="font-size:1.05rem;line-height:1;">${new Date(e.date).getDate()}</div><div class="small text-muted" style="font-weight:800;font-size:0.72rem;letter-spacing:0.04em;">${new Date(e.date).toLocaleString('en-IN',{month:'short'})}</div></div>
                    <div class="flex-fill"><div class="fw-bold small">${esc(e.title)}</div><div class="small text-muted">${subj?esc(subj.name):''} • ${esc(e.venue)}</div><div class="small text-muted">${esc(e.time)}</div></div>
                    <span class="badge rounded-pill" style="background:${e.status==='upcoming'?'#e2e8f0':'#dcfce7'};color:${e.status==='upcoming'?'#334155':'#166534'};font-weight:700;font-size:0.68rem;">${esc(e.status)}</span>
                  </div>`;
                }).join('') || '<div class="p-3 small text-muted">No upcoming exams</div>'}
              </div>
            </div>
            <div class="card-saas">
              <div class="card-header-saas"><div class="fw-bold small" style="letter-spacing:0.06em;">NOTICES</div><a href="#" onclick="setView('notices');return false;" class="small fw-bold text-decoration-none" style="color:var(--primary)">View all →</a></div>
              <div class="card-body p-0">
                ${notices.slice(0,3).map(n=>`<div class="p-3" style="border-bottom:1px solid var(--border);"><div class="fw-bold small">${esc(n.title)}</div><div class="small text-muted" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${esc(n.content)}</div><div class="small text-muted mt-1"><i class="fa-regular fa-clock me-1"></i>${fmtDate(n.date)} • ${esc(n.category)}</div></div>`).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
      setTimeout(()=>{
        const first = semSubjects[0];
        const qs = first ? quizzes.filter(q=>q.subjectId===first.id) : quizzes.slice(0,3);
        if(qs.length) Charts.quizPerformance('dashQuizChart', qs);
      }, 120);
    }catch(e){
      dash.innerHTML=`<div class="card-saas p-4 text-center"><div class="empty-icon mx-auto" style="width:56px;height:56px;border-radius:14px;background:var(--bg-soft);border:1px solid var(--border);display:grid;place-items:center;"><i class="fa-solid fa-triangle-exclamation" style="color:var(--amber)"></i></div><div class="fw-bold mt-3">Unable to load dashboard</div><div class="small text-muted">${esc(e.message||'Network error')}</div><button class="btn btn-primary-saas mt-3" onclick="loadDashboard()"><i class="fa-solid fa-rotate me-1"></i>Retry</button></div>`;
    }
  }

  /* ---------- Teacher (Faculty) Dashboard - shows student records to manage, NOT own marks ---------- */
  async function loadTeacherDashboard(){
    const dash=$('#dashboardContent'); if(!dash) return;
    dash.innerHTML=`<div class="row g-3">${skeletonCards(4)}</div><div class="row g-3 mt-1">${skeletonCards(2)}</div>`;
    try{
      const [subjects, students, attendance, submissions, assignments, exams, notices] = await Promise.all([
        API.getSubjects({}), API.getStudents({}), API.getAttendance({}), API.getSubmissions({}), API.getAssignments({}), API.getExams({}), API.getNotices({})
      ]);
      const semSubjects = subjects.filter(s=>s.semester===State.semester);
      const pendingGrading = submissions.filter(s=>s.status==='submitted');
      const upcomingExams = exams.filter(e=>e.status==='upcoming');
      const prof = State.currentUser ? State.currentUser.name : 'Prof. Rajesh Kumar';
      const sName = id => { const x=students.find(st=>st.id==id); return x? x.name : 'Student '+id; };
      const perSubject = semSubjects.map(s=>{
        const recs = attendance.filter(a=>a.subjectId===s.id && students.some(st=>st.id===a.studentId));
        const avg = recs.length ? recs.reduce((x,a)=>x+calculateAttendance(a.attendedClasses,a.totalClasses),0)/recs.length : 0;
        const assignCount = assignments.filter(x=>x.subjectId===s.id).length;
        return {...s, avg, assignCount, strength: recs.length};
      });
      const byStudent = students.map(st=>{
        const recs = attendance.filter(a=>a.studentId===st.id && semSubjects.some(s=>s.id===a.subjectId));
        let overall = recs.length? calculateOverallAttendance(recs) : 0;
        if(!isFinite(overall)) overall = 0;
        const low = recs.filter(r=> calculateAttendance(r.attendedClasses,r.totalClasses) < (CONFIG.REQUIRED_ATTENDANCE||75)).length;
        const subs = submissions.filter(x=>x.studentId===st.id).length;
        return { st, overall, low, subs };
      });
      dash.innerHTML=`
        <div class="card-saas mb-3 p-3" style="background:linear-gradient(135deg,#fff1f2,#fdf2f8);border:1px solid #fde5e9;">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <div class="fw-bold" style="font-size:1.15rem;">Good Morning, ${esc(prof)} 👋</div>
              <div class="small text-muted">Semester ${State.semester} • ${semSubjects.length} subjects you teach • ${students.length} students in class • ${pendingGrading.length} submissions awaiting grading</div>
            </div>
            <div class="semester-tabs">${[1,2,3,4].map(n=>`<button class="${State.semester===n?'active':''}" onclick="switchSemester(${n})">Sem ${n}</button>`).join('')}</div>
          </div>
          <div class="small mt-2 p-2 rounded" style="background:#fffbeb;border:1px dashed #fde68a;color:#92400e;"><i class="fa-solid fa-circle-info me-1"></i><strong>Note:</strong> everything below is <strong>your students' records that you manage</strong> - attendance, quiz marks, internals, assignments. Faculty has no personal exams/marks here; use the sidebar to edit per student.</div>
        </div>

        <div class="row g-3">
          <div class="col-6 col-xl-3"><div class="stat-card">
            <div class="icon-box" style="background:#fde5e9;color:#a30d26;border-color:#fbcfe0;"><i class="fa-solid fa-book"></i></div>
            <div class="value">${semSubjects.length}</div><div class="label">Subjects Teaching</div>
            <div class="sub">Sem ${State.semester} • Theory + Lab</div>
          </div></div>
          <div class="col-6 col-xl-3"><div class="stat-card">
            <div class="icon-box" style="background:#dcfce7;color:#166534;border-color:#bbf7d0;"><i class="fa-solid fa-user-group"></i></div>
            <div class="value">${students.length}</div><div class="label">Class Strength</div>
            <div class="sub">MCA 2024-26 • Sem 1 section</div>
          </div></div>
          <div class="col-6 col-xl-3"><div class="stat-card" style="cursor:pointer;" onclick="setView('teacher-submissions')">
            <div class="icon-box" style="background:#fef3c7;color:#92400e;border-color:#fde68a;"><i class="fa-solid fa-inbox"></i></div>
            <div class="value">${pendingGrading.length}</div><div class="label">Pending Grading</div>
            <div class="trend" style="background:#fef3c7;color:#92400e;border-color:#fde68a;"><i class="fa-solid fa-clock"></i> Tap to grade</div>
          </div></div>
          <div class="col-6 col-xl-3"><div class="stat-card">
            <div class="icon-box" style="background:#fce7f3;color:#9d174d;border-color:#fbcfe8;"><i class="fa-solid fa-calendar-check"></i></div>
            <div class="value">${upcomingExams.length}</div><div class="label">Upcoming Exams</div>
            <div class="sub">End-sem & practicals • Nov 2024</div>
          </div></div>
        </div>

        <div class="row g-3 mt-1">
          <div class="col-lg-7">
            <div class="card-saas h-100">
              <div class="card-header-saas">
                <div class="fw-bold"><i class="fa-solid fa-chalkboard me-2" style="color:var(--primary)"></i>My Subjects to Manage • Sem ${State.semester}</div>
                <button class="btn btn-ghost btn-sm" onclick="setView('teacher-subjects')">All subjects <i class="fa-solid fa-arrow-right ms-1"></i></button>
              </div>
              <div class="card-body p-0">
                <div class="table-responsive"><table class="table table-saas mb-0"><thead><tr><th>Subject</th><th>Type</th><th>Class Att. (avg)</th><th>Assignments</th><th>Manage</th></tr></thead><tbody>
                ${perSubject.map(s=>`<tr>
                  <td><div class="fw-bold small">${esc(s.name)}</div><div class="small text-muted">${esc(s.code)} • ${s.credits} cr • ${esc(s.faculty)}</div></td>
                  <td><span class="badge-type ${s.type==='theory'?'badge-theory':s.type==='lab'?'badge-lab':'badge-elective'}">${esc(s.type)}</span></td>
                  <td style="min-width:130px;"><div class="d-flex justify-content-between small fw-bold"><span>${s.avg.toFixed(1)}%</span><span class="text-muted">of ${s.strength}</span></div><div class="progress progress-saas mt-1" style="height:6px;"><div class="progress-bar" style="width:${s.avg}%;background:${s.avg>=75?'#10b981':'#ef4444'}"></div></div></td>
                  <td class="small fw-bold">${s.assignCount}</td>
                  <td><div class="d-flex gap-1 flex-wrap">
                    <button class="btn btn-ghost btn-sm" title="Attendance" onclick="setView('teacher-attendance')"><i class="fa-solid fa-clipboard-check"></i></button>
                    <button class="btn btn-ghost btn-sm" title="Quiz marks" onclick="setView('teacher-quizzes')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-ghost btn-sm" title="Student report" onclick="openSubject(${s.id})"><i class="fa-solid fa-eye"></i></button>
                  </div></td></tr>`).join('') || '<tr><td colspan="5" class="small text-muted text-center p-3">No subjects this semester</td></tr>'}
                </tbody></table></div>
              </div>
            </div>
          </div>
          <div class="col-lg-5">
            <div class="card-saas h-100">
              <div class="card-header-saas">
                <div class="fw-bold small" style="letter-spacing:0.05em;">CLASS ATTENDANCE OVERVIEW</div>
                <button class="btn btn-ghost btn-sm" onclick="setView('teacher-attendance')">Update <i class="fa-solid fa-arrow-right ms-1"></i></button>
              </div>
              <div class="card-body p-0">
                ${byStudent.map(x=>`<div class="p-3 d-flex gap-3 align-items-center" style="border-bottom:1px solid var(--border);">
                  <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--primary-100),#fce7f3);color:var(--primary);display:grid;place-items:center;font-weight:800;font-size:0.78rem;flex-shrink:0;">${esc(x.st.avatar)}</div>
                  <div class="flex-fill" style="min-width:0;">
                    <div class="d-flex justify-content-between gap-2"><span class="fw-bold small text-truncate">${esc(x.st.name)}</span><span class="small fw-bold ${x.overall>=75?'text-success':'text-danger'}">${x.overall.toFixed(1)}%</span></div>
                    <div class="progress progress-saas mt-1" style="height:6px;"><div class="progress-bar" style="width:${x.overall}%;background:${x.overall>=75?'#10b981':'#ef4444'}"></div></div>
                    <div class="small text-muted mt-1">${esc(x.st.roll)} • ${x.low>0?`<span class="text-danger fw-bold">${x.low} subject(s) below 75%</span>`:'all subjects eligible'} • ${x.subs} submissions</div>
                  </div>
                </div>`).join('')}
                <div class="p-2 small text-muted"><i class="fa-solid fa-circle-info me-1"></i>Attendance is tracked only - it adds <strong>no marks</strong>, it decides 75% eligibility (§9).</div>
              </div>
            </div>
          </div>
        </div>

        <div class="row g-3 mt-1">
          <div class="col-lg-7">
            <div class="card-saas h-100">
              <div class="card-header-saas">
                <div class="fw-bold small" style="letter-spacing:0.05em;">AWAITING YOUR GRADING</div>
                <span class="badge rounded-pill" style="background:${pendingGrading.length?'#fef3c7':'#dcfce7'};color:${pendingGrading.length?'#92400e':'#166534'};font-weight:700;">${pendingGrading.length} pending</span>
              </div>
              <div class="card-body p-0">
                ${pendingGrading.slice(0,5).map(s=>{
                  const a=assignments.find(y=>y.id===s.assignmentId);
                  return `<div class="p-3 d-flex gap-3 align-items-center" style="border-bottom:1px solid var(--border);">
                    <div style="width:34px;height:34px;border-radius:10px;background:var(--bg-soft);border:1px solid var(--border);display:grid;place-items:center;color:var(--primary);flex-shrink:0;"><i class="fa-solid fa-file"></i></div>
                    <div class="flex-fill" style="min-width:0;"><div class="fw-bold small text-truncate">${esc(a?a.title:'Assignment')}</div><div class="small text-muted">${esc(sName(s.studentId))} • ${esc(s.fileName)} • ${fmtDate(s.submittedAt)} • max ${s.maxMarks}</div></div>
                    <button class="btn btn-primary-saas btn-sm" onclick="openGradeModal(${s.id})"><i class="fa-solid fa-pen me-1"></i>Grade</button>
                  </div>`;
                }).join('') || '<div class="p-4 text-center small text-muted"><i class="fa-solid fa-circle-check me-1 text-success"></i>All caught up - nothing to grade.</div>'}
              </div>
            </div>
          </div>
          <div class="col-lg-5">
            <div class="card-saas h-100">
              <div class="card-header-saas"><div class="fw-bold small" style="letter-spacing:0.05em;">QUICK FLOW</div></div>
              <div class="card-body">
                <div class="d-grid gap-2">
                  <button class="btn btn-ghost w-100 text-start" onclick="setView('teacher-quizzes')"><i class="fa-solid fa-pen-to-square me-2" style="color:#c8102e"></i><strong>Enter quiz (0-15) &amp; end-sem (0-50) marks</strong> <span class="small text-muted">- select student on top • Best2 + totals live</span></button>
                  <button class="btn btn-ghost w-100 text-start" onclick="setView('teacher-internal')"><i class="fa-solid fa-list-check me-2" style="color:#9f1239"></i><strong>Configure internals (sum = 20)</strong> <span class="small text-muted">- per student per subject</span></button>
                  <button class="btn btn-ghost w-100 text-start" onclick="setView('teacher-attendance')"><i class="fa-solid fa-clipboard-check me-2" style="color:#059669"></i><strong>Update attendance</strong> <span class="small text-muted">- per student per subject</span></button>
                  <button class="btn btn-ghost w-100 text-start" onclick="setView('teacher-assignments')"><i class="fa-solid fa-file-pen me-2" style="color:#ea580c"></i><strong>Create assignment</strong> <span class="small text-muted">- visible to all students instantly</span></button>
                </div>
                <div class="small text-muted mt-2"><i class="fa-solid fa-bullhorn me-1"></i>Notices: ${notices.length} published • latest: <strong>${esc(notices[0]?notices[0].title:'-')}</strong></div>
              </div>
            </div>
          </div>
        </div>
      `;
    }catch(e){
      dash.innerHTML=`<div class="card-saas p-4 text-center"><div class="fw-bold mt-2">Unable to load faculty dashboard</div><div class="small text-muted">${esc(e.message||'Network error')}</div><button class="btn btn-primary-saas mt-3" onclick="loadTeacherDashboard()"><i class="fa-solid fa-rotate me-1"></i>Retry</button></div>`;
    }
  }

  async function loadSubjectsView(){
    const el=$('#subjectsView'); if(!el) return;
    el.innerHTML=`<div class="row g-3">${skeletonCards(4)}</div>`;
    try{
      const [subjects, attendance, quizzes, internals, endsems, labs] = await Promise.all([
        API.getSubjects({semester: State.semester, search: State.search||undefined}),
        API.getAttendance({studentId: State.studentId}),
        API.getQuizzes({studentId: State.studentId}),
        API.getInternals({studentId: State.studentId}),
        API.getEndSems({studentId: State.studentId}),
        API.getLabMarks({studentId: State.studentId})
      ]);
      if(subjects.length===0){
        el.innerHTML=`<div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-book"></i></div><div class="fw-bold">No subjects found</div><div class="small text-muted">No subjects in Semester ${State.semester}${State.search?' for "'+esc(State.search)+'"':''}. ${State.role==='teacher'?'Create one via Add Subject.':''}</div>${State.role==='teacher'?'<button class="btn btn-primary-saas mt-3" data-bs-toggle="modal" data-bs-target="#addSubjectModal"><i class="fa-solid fa-plus me-1"></i>Add Subject</button>':''}</div>`;
        return;
      }
      el.innerHTML=`<div class="row g-3">${subjects.map(s=>{
        const att=attendance.find(a=>a.subjectId===s.id);
        const perc=att?calculateAttendance(att.attendedClasses,att.totalClasses):0;
        const st=getAttendanceStatus(perc);
        let marks='',detail='';
        if(s.type==='lab'){
          const lab=labs.find(l=>l.subjectId===s.id);
          const tot=lab?calculateLabTotal(lab.components):{total:0,max:100,percentage:0};
          marks=`${tot.total}/${tot.max}`; detail=`Lab • ${tot.percentage}%`;
        } else {
          const q=quizzes.filter(x=>x.subjectId===s.id);
          const best=calculateBestTwoQuizzes(q);
          const internal=internals.find(x=>x.subjectId===s.id);
          const it=internal?calculateInternalTotal(internal.components):0;
          const end=endsems.find(x=>x.subjectId===s.id);
          const tot=calculateTheoryTotal(best.countedMarks,it,end?end.marksObtained:0);
          marks=`${tot}/100`; detail=`Theory • Best2 ${best.countedMarks}/30 • Internal ${it}/20 • End ${end?end.marksObtained:0}/50`;
        }
        return `<div class="col-md-6 col-xl-4"><div class="subject-card"><div class="card-top" style="background:${s.color}"></div><div class="card-body">
          <div class="d-flex justify-content-between align-items-start gap-2"><span class="badge-type ${s.type==='theory'?'badge-theory':s.type==='lab'?'badge-lab':'badge-elective'}">${esc(s.type)}</span><span class="small text-muted" style="font-weight:600;">${s.credits} Credits</span></div>
          <div class="fw-bold mt-2" style="line-height:1.25;">${esc(s.name)}</div>
          <div class="small text-muted">${esc(s.code)} • ${esc(s.faculty)} • Sem ${s.semester}</div>
          <div class="mt-3">
            <div class="d-flex justify-content-between small fw-bold"><span>Attendance</span><span class="${st.met?'text-success':'text-danger'}">${perc.toFixed(1)}%</span></div>
            <div class="progress progress-saas mt-1"><div class="progress-bar" style="width:${perc}%;background:${st.met?'#10b981':'#ef4444'}"></div></div>
            <div class="small text-muted mt-1">${st.label} • ${att?`${att.attendedClasses}/${att.totalClasses} classes`:''}</div>
          </div>
          <div class="mt-3 p-2 rounded" style="background:var(--bg-soft);border:1px solid var(--border);"><div class="small text-muted" style="font-weight:700;letter-spacing:0.04em;">CURRENT MARKS</div><div class="fw-bold">${marks}</div><div class="small text-muted" style="font-size:0.78rem;">${detail}</div></div>
          <button class="btn btn-primary-saas w-100 mt-3" onclick="openSubject(${s.id})"><i class="fa-solid fa-eye me-1"></i>View Subject</button>
          ${State.role==='teacher'?`<div class="d-flex gap-1 mt-2"><button class="btn btn-ghost btn-sm flex-fill" onclick="editSubject(${s.id})"><i class="fa-solid fa-pen me-1"></i>Edit</button><button class="btn btn-ghost btn-sm flex-fill text-danger" onclick="deleteSubject(${s.id})"><i class="fa-solid fa-trash me-1"></i>Delete</button></div>`:''}
        </div></div></div>`;
      }).join('')}</div>`;
    }catch(e){ el.innerHTML=`<div class="card-saas p-4 text-center"><div class="fw-bold">Unable to load subjects</div><div class="small text-muted">${esc(e.message)}</div><button class="btn btn-primary-saas mt-2" onclick="loadSubjectsView()">Retry</button></div>`; }
  }

  async function openSubject(id){
    const c=$('#subjectDetailsView'); if(!c) return;
    if(!id){ // e.g. sidebar click before picking a subject - auto-select first of this semester
      try{ const subs=await API.getSubjects({semester: State.semester}); if(subs.length) id=subs[0].id; }catch(e){}
    }
    if(!id){
      State.currentSubjectId=null; c.dataset.loadedId='empty'; setView('subject-details');
      c.innerHTML=`<div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-book-open"></i></div><div class="fw-bold">No subject selected</div><div class="small text-muted">Pick a subject from the Subjects page - attendance, offline quizzes (Best2), internals, end-sem and syllabus will open here.</div><button class="btn btn-primary-saas mt-3" onclick="setView('${State.role==='student'?'subjects':'teacher-subjects'}')"><i class="fa-solid fa-arrow-right me-1"></i>Go to Subjects</button></div>`;
      return;
    }
    State.currentSubjectId=id;
    c.dataset.loadedId='pending-'+id;   // MUST be set before setView - its guard re-enters openSubject otherwise → recursion
    setView('subject-details');
    c.innerHTML=`<div class="skeleton skeleton-card"></div><div class="mt-3"><div class="skeleton skeleton-line w-75"></div><div class="skeleton skeleton-line w-50"></div></div>`;
    const effStudentId = State.role==='teacher' ? State.teacherSelectedStudentId : State.studentId;
    try{
      const [subject, attendanceList, quizzes, internal, endSem, lab, syllabus] = await Promise.all([
        API.getSubject(id),
        API.getAttendance({studentId: effStudentId, subjectId: id}),
        API.getQuizzes({studentId: effStudentId, subjectId: id}),
        API.getInternal(id, effStudentId),
        API.getEndSem(id, effStudentId),
        API.getLabMarks({studentId: effStudentId, subjectId: id}),
        API.getSyllabus(id)
      ]);
      const att=attendanceList[0];
      const perc=att?calculateAttendance(att.attendedClasses,att.totalClasses):0;
      const status=getAttendanceStatus(perc);
      let perfHTML='';
      if(subject.type==='lab'){
        const comps=lab[0]?.components||[];
        const tot=calculateLabTotal(comps);
        perfHTML=`
          <div class="quiz-offline-banner"><i class="fa-solid fa-flask mt-1"></i><div><strong>Lab - offline practical evaluation.</strong> Components are evaluated in lab sessions, not online.</div></div>
          <div class="row g-3 mt-2">
            ${comps.map(c=>`<div class="col-6 col-md-4"><div class="p-3 rounded text-center" style="background:var(--bg-soft);border:1px solid var(--border);"><div class="small text-muted" style="font-weight:600;">${esc(c.name)}</div><div class="fw-bold" style="font-size:1.15rem;">${c.marks}/${c.maxMarks}</div><div class="small text-muted">${Math.round((c.marks/c.maxMarks)*100)}%</div></div></div>`).join('')}
            <div class="col-12"><div class="p-3 rounded text-center" style="background:linear-gradient(135deg,#c8102e,#9f1239);color:#fff;box-shadow:var(--shadow-primary);"><div class="small" style="opacity:0.9;letter-spacing:0.08em;font-weight:800;">TOTAL</div><div class="fw-bold" style="font-size:1.7rem;">${tot.total}/${tot.max} • ${tot.percentage}%</div></div></div>
          </div>
          <div class="chart-wrap mt-3"><canvas id="labChart"></canvas></div>`;
        setTimeout(()=>{ if(comps.length) Charts.labBreakdown('labChart', comps); }, 120);
      } else {
        const best=calculateBestTwoQuizzes(quizzes);
        const it=internal?calculateInternalTotal(internal.components):0;
        const im=internal?calculateInternalMax(internal.components):20;
        const end=endSem?endSem.marksObtained:0;
        const total=calculateTheoryTotal(best.countedMarks,it,end);
        perfHTML=`
          <div class="quiz-offline-banner mb-3"><i class="fa-solid fa-chalkboard-teacher mt-1"></i><div><strong>Offline quizzes - class tests:</strong> Faculty conducts 3 tests in classroom (15 marks each). Marks are entered by teacher via API and displayed here. System auto-selects <strong>Best 2 of 3</strong> (lowest excluded). <span class="badge rounded-pill" style="background:#fff;border:1px solid #fde68a;color:#92400e;">No online quiz on website</span></div></div>
          <div class="card-saas mb-3">
            <div class="card-header-saas"><div class="fw-bold small" style="letter-spacing:0.05em;">QUIZ MARKS (OFFLINE) • BEST 2 OF 3</div><span class="badge rounded-pill bg-success" style="font-weight:700;">Counted ${best.countedMarks}/${best.maxMarks} • ${best.percentage}%</span></div>
            <div class="card-body">
              <div class="row g-2">
                ${quizzes.map(q=>{
                  const isBest=best.best.some(b=>b.id===q.id);
                  const isEx=best.excluded.some(e=>e.id===q.id);
                  return `<div class="col-md-4"><div class="quiz-card ${isBest?'best':isEx?'excluded':''}">
                    <div class="d-flex justify-content-between align-items-center"><span class="fw-bold small">${esc(q.title)}</span><span class="badge ${isBest?'bg-success':isEx?'bg-danger':'bg-secondary'} rounded-pill" style="font-size:0.68rem;">${isBest?'Counted':isEx?'Not counted':''}</span></div>
                    <div class="fw-bold mt-1">${q.marksObtained}/${q.maxMarks} <span class="small fw-normal text-muted">${Math.round((q.marksObtained/q.maxMarks)*100*100)/100}%</span></div>
                    <div class="small text-muted"><i class="fa-regular fa-calendar me-1"></i>${fmtDate(q.date)} • ${esc(q.description||'')}</div>
                  </div></div>`;
                }).join('')}
              </div>
              <div class="mt-3 p-3 rounded" style="background:var(--bg-soft);border:1px solid var(--border);">
                <div class="small fw-bold" style="letter-spacing:0.04em;">BEST 2 COUNTED:</div>
                <div class="small mt-1">${best.best.map(b=>`${esc(b.title)} ${b.marksObtained}/15`).join(' + ')} = <span class="fw-bold">${best.countedMarks}/30</span> • ${best.percentage}%</div>
                ${best.excluded.length?`<div class="small text-muted mt-1">Excluded (lowest): ${esc(best.excluded[0].title)} ${best.excluded[0].marksObtained}/15 - not averaged, excluded per spec §4</div>`:''}
              </div>
              <div class="chart-wrap mt-3"><canvas id="subjectQuizChart"></canvas></div>
            </div>
          </div>
          <div class="row g-3">
            <div class="col-md-6"><div class="card-saas h-100"><div class="card-header-saas"><div class="fw-bold small">INTERNAL (${im}) • CONFIGURABLE</div><span class="small text-muted">Sum must =20</span></div><div class="card-body">
              ${(internal?.components||[]).map(c=>`<div class="d-flex justify-content-between py-2" style="border-bottom:1px solid var(--border);"><span class="small">${esc(c.name)} <span class="text-muted">/${c.maxMarks}</span></span><span class="fw-bold">${c.marks}/${c.maxMarks}</span></div>`).join('') || '<div class="small text-muted">No internal components yet - teacher will configure.</div>'}
              <div class="mt-3 p-2 rounded text-center fw-bold" style="background:var(--bg-soft);border:1px solid var(--border);">Total: ${it}/${im} • ${im?Math.round((it/im)*100):0}%</div>
            </div></div></div>
            <div class="col-md-6"><div class="card-saas h-100"><div class="card-header-saas"><div class="fw-bold small">END SEMESTER (50)</div><span class="small text-muted">Teacher enters 0-50</span></div><div class="card-body text-center py-4">
              <div class="fw-bold" style="font-size:2.2rem;">${end}/50</div><div class="small text-muted">${Math.round((end/50)*100)}%</div>
              <div class="mt-4 p-3 rounded" style="background:linear-gradient(135deg,#0f172a,#334155);color:#fff;"><div class="small" style="letter-spacing:0.08em;font-weight:800;opacity:0.9;">FINAL MARKS</div><div class="fw-bold" style="font-size:1.8rem;">${total}/100 • ${total}%</div><div class="small" style="opacity:0.85;">Best2 ${best.countedMarks} + Internal ${it} + End ${end}</div><div class="small mt-1" style="opacity:0.7;">No letter grades • as per spec §8</div></div>
            </div></div></div>
          </div>`;
        setTimeout(()=> Charts.quizPerformance('subjectQuizChart', quizzes), 120);
      }

      c.innerHTML=`
        <div class="d-flex align-items-center gap-2 mb-3">
          <button class="btn btn-ghost btn-sm" onclick="setView('${State.role==='student'?'subjects':'teacher-subjects'}')"><i class="fa-solid fa-arrow-left me-1"></i>Back</button>
          <span class="badge-type ${subject.type==='theory'?'badge-theory':subject.type==='lab'?'badge-lab':'badge-elective'}">${esc(subject.type)}</span>
          <span class="small text-muted">${esc(subject.code)}</span>
          ${State.role==='teacher'?'<span class="badge rounded-pill" style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;font-weight:700;"><i class="fa-solid fa-user-graduate me-1"></i>Viewing '+esc(((window.__allStudents||[]).find(x=>x.id===State.teacherSelectedStudentId)||{}).name||'selected student')+'’s record - not faculty marks</span>':''}
          <span class="ms-auto small text-muted">${subject.credits} Credits • Sem ${subject.semester}</span>
        </div>
        <div class="card-saas mb-3">
          <div class="card-body">
            <div class="row g-3 align-items-center">
              <div class="col-md-8">
                <h3 class="mb-1" style="font-size:1.55rem;">${esc(subject.name)}</h3>
                <div class="small text-muted">${esc(subject.code)} • ${esc(subject.faculty)} • Semester ${subject.semester} • ${subject.credits} Credits • <span class="fw-bold">${esc(subject.type)}</span></div>
                <div class="mt-3 d-flex flex-wrap gap-2">
                  <span class="badge rounded-pill px-3 py-2" style="background:var(--bg-soft);border:1px solid var(--border);font-weight:600;"><i class="fa-solid fa-user-tie me-1"></i>${esc(subject.faculty)}</span>
                  <span class="badge rounded-pill px-3 py-2" style="background:${perc>=75?'#dcfce7':'#fee2e2'};color:${perc>=75?'#166534':'#991b1b'};border:1px solid ${perc>=75?'#bbf7d0':'#fecaca'};font-weight:700;"><i class="fa-solid fa-clipboard-check me-1"></i>Attendance ${perc.toFixed(1)}% • ${status.label}</span>
                </div>
              </div>
              <div class="col-md-4">
                <div class="p-3 rounded" style="background:var(--bg-soft);border:1px solid var(--border);">
                  <div class="small text-muted fw-bold" style="letter-spacing:0.06em;">ATTENDANCE</div>
                  <div class="d-flex justify-content-between small fw-bold mt-1"><span>${att?`${att.attendedClasses}/${att.totalClasses} classes`:''}</span><span>${perc.toFixed(1)}%</span></div>
                  <div class="progress progress-saas mt-1"><div class="progress-bar" style="width:${perc}%;background:${status.met?'#10b981':'#ef4444'}"></div></div>
                  <div class="small text-muted mt-1">Required: 75% • ${status.label} • No marks</div>
                  ${State.role==='teacher'?`<button class="btn btn-primary-saas btn-sm w-100 mt-3" onclick="openAttendanceModal(${subject.id})"><i class="fa-solid fa-pen me-1"></i>Update Attendance</button>`:''}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="card-saas mb-3">
          <div class="card-header-saas" style="padding:0;">
            <ul class="nav nav-tabs-saas p-2" role="tablist" style="border-bottom:none;">
              <li><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#tab-overview">Overview</button></li>
              <li><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-syllabus">Syllabus</button></li>
              <li><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-notes">Notes</button></li>
              <li><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-assignments">Assignments</button></li>
            </ul>
          </div>
          <div class="card-body">
            <div class="tab-content">
              <div class="tab-pane fade show active" id="tab-overview">${perfHTML}</div>
              <div class="tab-pane fade" id="tab-syllabus"><div id="subjectSyllabus"><div class="skeleton skeleton-card"></div></div></div>
              <div class="tab-pane fade" id="tab-notes"><div id="subjectNotes"><div class="skeleton skeleton-card"></div></div></div>
              <div class="tab-pane fade" id="tab-assignments"><div id="subjectAssignments"><div class="skeleton skeleton-card"></div></div></div>
            </div>
          </div>
        </div>
      `;
      c.dataset.loadedId=String(id); // fully rendered - nav re-entry should not re-fetch
      // nested async loads
      if(syllabus && syllabus.modules){
        $('#subjectSyllabus').innerHTML = syllabus.modules.map(m=>`
          <div class="card-saas mb-2" style="box-shadow:none;">
            <div class="p-3 d-flex justify-content-between align-items-center" style="cursor:pointer" onclick="this.nextElementSibling.classList.toggle('d-none')">
              <div><div class="fw-bold small">${esc(m.title)}</div><div class="small text-muted">${m.topics.join(' • ')}</div></div>
              <div class="text-end"><div class="small fw-bold" style="color:${m.completion===100?'#10b981':m.completion>=70?'#f59e0b':'#64748b'}">${m.completion}%</div><div class="progress progress-saas" style="width:92px;height:6px;"><div class="progress-bar" style="width:${m.completion}%;background:${m.completion===100?'#10b981':'#c8102e'}"></div></div></div>
            </div>
            <div class="p-3" style="border-top:1px solid var(--border);background:var(--bg-soft);">
              <ul class="small mb-0">${m.topics.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>
            </div>
          </div>
        `).join('') || '<div class="small text-muted">No syllabus</div>';
      } else {
        $('#subjectSyllabus').innerHTML='<div class="small text-muted">No syllabus available for this subject</div>';
      }
      const notes = await API.getNotes({subjectId: id});
      $('#subjectNotes').innerHTML = notes.length? `<div class="row g-2">${notes.map(n=>`
          <div class="col-md-6"><div class="p-3 rounded" style="background:var(--bg-soft);border:1px solid var(--border);">
            <div class="d-flex gap-2"><div style="width:38px;height:38px;border-radius:11px;background:var(--primary-100);color:var(--primary);display:grid;place-items:center;"><i class="fa-solid fa-file-${n.fileType==='pdf'?'pdf':n.fileType==='ppt'?'powerpoint':'word'}"></i></div><div class="flex-fill"><div class="fw-bold small">${esc(n.title)}</div><div class="small text-muted">${esc(n.module)} • ${esc(n.fileType.toUpperCase())} • ${esc(n.size)}</div></div></div>
            <div class="small text-muted mt-2">${esc(n.description)}</div>
            <div class="d-flex justify-content-between align-items-center mt-2"><span class="small text-muted">${fmtDate(n.date)}</span><button class="btn btn-ghost btn-sm" disabled title="No file has been uploaded for this note"><i class="fa-solid fa-file-circle-xmark me-1"></i>No file attached</button></div>
          </div></div>`).join('')}</div>` : '<div class="empty-state py-4"><div class="small text-muted">No notes yet for this subject</div></div>';
      const assigns = await API.getAssignments({subjectId: id});
      $('#subjectAssignments').innerHTML = assigns.length? assigns.map(a=>`
          <div class="d-flex gap-3 p-3 rounded mb-2" style="background:var(--bg-soft);border:1px solid var(--border);">
            <div class="flex-fill"><div class="fw-bold small">${esc(a.title)}</div><div class="small text-muted">${esc(a.description)}</div><div class="small text-muted mt-1"><i class="fa-regular fa-calendar me-1"></i>Deadline ${fmtDate(a.deadline)} • ${a.maxMarks} marks • <span class="badge rounded-pill" style="background:var(--card);border:1px solid var(--border);">${esc(a.status)}</span></div></div>
            <button class="btn btn-ghost btn-sm align-self-center" onclick="setView('assignments')"><i class="fa-solid fa-eye"></i> View</button>
          </div>`).join('') : '<div class="small text-muted">No assignments for this subject</div>';
    }catch(e){
      c.dataset.loadedId=''; // failed - allow nav/retry to load again
      c.innerHTML=`<div class="card-saas p-4 text-center"><div class="fw-bold">Unable to load subject</div><div class="small text-muted">${esc(e.message)}</div><button class="btn btn-primary-saas mt-3" onclick="openSubject(${id})">Retry</button></div>`;
    }
  }

  async function loadAttendanceView(){
    const el=$('#attendanceView'); if(!el) return;
    el.innerHTML=`<div class="row g-3">${skeletonCards(3)}</div>`;
    try{
      const [subjects, attendance]=await Promise.all([API.getSubjects({semester: State.semester}), API.getAttendance({studentId: State.studentId})]);
      const semAtt=attendance.filter(a=> subjects.some(s=>s.id===a.subjectId && s.semester===State.semester));
      const overall=calculateOverallAttendance(semAtt);
      const st=getAttendanceStatus(overall);
      el.innerHTML=`
        <div class="card-saas mb-3"><div class="card-body d-flex flex-wrap gap-3 align-items-center">
          <div style="width:110px;height:110px;border-radius:50%;background:conic-gradient(${overall>=75?'#10b981':'#ef4444'} 0% ${overall}%, var(--border) ${overall}% 100%);display:grid;place-items:center;"><div style="width:84px;height:84px;border-radius:50%;background:var(--card);display:grid;place-items:center;box-shadow:var(--shadow);"><div class="text-center"><div class="fw-bold" style="font-size:1.25rem;">${overall.toFixed(1)}%</div><div class="small text-muted">Overall</div></div></div></div>
          <div>
            <div class="fw-bold">Overall Attendance • Semester ${State.semester}</div>
            <div class="small text-muted">Required: 75% • <span class="${st.met?'text-success':'text-danger'} fw-bold">${st.label}</span> • Attendance does NOT add marks (§9)</div>
            <div class="progress progress-saas mt-2" style="max-width:360px;"><div class="progress-bar" style="width:${overall}%;background:${st.met?'#10b981':'#ef4444'}"></div></div>
          </div>
          <div class="ms-auto chart-wrap sm" style="width:280px;height:160px;"><canvas id="attChart"></canvas></div>
        </div></div>
        <div class="row g-3">
          ${semAtt.map(a=>{
            const s=subjects.find(x=>x.id===a.subjectId);
            const perc=calculateAttendance(a.attendedClasses,a.totalClasses);
            const st2=getAttendanceStatus(perc);
            return `<div class="col-md-6 col-xl-4"><div class="card-saas"><div class="card-top" style="height:4px;background:${s?.color||'#c8102e'}"></div><div class="card-body">
              <div class="fw-bold small">${esc(s?.name||'Subject')}</div><div class="small text-muted">${esc(s?.code||'')} • ${a.attendedClasses}/${a.totalClasses} classes</div>
              <div class="d-flex justify-content-between small fw-bold mt-2"><span>Attendance</span><span class="${st2.met?'text-success':'text-danger'}">${perc.toFixed(1)}%</span></div>
              <div class="progress progress-saas mt-1"><div class="progress-bar" style="width:${perc}%;background:${st2.met?'#10b981':'#ef4444'}"></div></div>
              <div class="small mt-1 ${st2.met?'text-success':'text-danger'}"><i class="fa-solid ${st2.met?'fa-circle-check':'fa-triangle-exclamation'} me-1"></i>${st2.label} • Required 75%</div>
            </div></div></div>`;
          }).join('')}
        </div>`;
      setTimeout(()=> Charts.attendanceChart('attChart', semAtt, subjects), 120);
    }catch(e){ el.innerHTML=`<div class="card-saas p-4 text-center"><div class="fw-bold">Unable to load attendance</div><div class="small text-muted">${esc(e.message)}</div><button class="btn btn-primary-saas mt-3" onclick="loadAttendanceView()">Retry</button></div>`; }
  }

  async function loadQuizView(){
    const el=$('#quizView'); if(!el) return;
    el.innerHTML=`<div class="skeleton skeleton-card"></div>`;
    try{
      const [subjects, quizzes]=await Promise.all([API.getSubjects({semester: State.semester}), API.getQuizzes({studentId: State.studentId})]);
      const semSubjects=subjects.filter(s=>s.type!=='lab');
      if(semSubjects.length===0){ el.innerHTML=`<div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-pen"></i></div><div class="fw-bold">No theory subjects</div><div class="small text-muted">No quizzes in this semester.</div></div>`; return; }
      el.innerHTML=`
        <div class="quiz-offline-banner mb-3"><i class="fa-solid fa-circle-info mt-1" style="color:#d97706"></i><div><strong>Important - Quizzes are offline class tests</strong> (not an online quiz). Faculty conducts 3 tests in the classroom (15 marks each). Marks are entered by the teacher via <code>PUT /api/assessments</code> and this screen only <strong>displays</strong> them. The system auto-calculates <strong>Best 2 of 3 → 30</strong> (lowest excluded, not averaged). Teachers manage quizzes in <strong>Teacher → Quizzes</strong>.</div></div>
        ${semSubjects.map(s=>{
          const qs=quizzes.filter(q=>q.subjectId===s.id);
          const best=calculateBestTwoQuizzes(qs);
          return `<div class="card-saas mb-3"><div class="card-header-saas"><div><div class="fw-bold">${esc(s.name)}</div><div class="small text-muted">${esc(s.code)} • ${s.credits} Credits • Offline Tests</div></div><span class="badge rounded-pill" style="background:${best.percentage>=70?'#dcfce7':'#fee2e2'};color:${best.percentage>=70?'#166534':'#991b1b'};font-weight:700;border:1px solid ${best.percentage>=70?'#bbf7d0':'#fecaca'};">${best.countedMarks}/${best.maxMarks} • ${best.percentage}%</span></div>
            <div class="card-body">
              <div class="row g-2">
                ${qs.map(q=>{
                  const isBest=best.best.some(b=>b.id===q.id);
                  const isEx=best.excluded.some(e=>e.id===q.id);
                  return `<div class="col-md-4"><div class="quiz-card ${isBest?'best':isEx?'excluded':''}"><div class="d-flex justify-content-between"><span class="fw-bold small">${esc(q.title)}</span><span class="badge ${isBest?'bg-success':isEx?'bg-danger':'bg-secondary'} rounded-pill" style="font-size:0.68rem;">${isBest?'Counted':isEx?'Not counted - lowest':''}</span></div><div class="fw-bold mt-1">${q.marksObtained}/${q.maxMarks} • ${Math.round((q.marksObtained/q.maxMarks)*100*100)/100}%</div><div class="small text-muted">${fmtDate(q.date)} • ${esc(q.description||'Class test')}</div></div></div>`;
                }).join('')}
              </div>
              <div class="mt-3 p-3 rounded" style="background:var(--bg-soft);border:1px solid var(--border);">
                <div class="small fw-bold" style="letter-spacing:0.04em;">BEST 2 COUNTED (auto):</div>
                <div class="small mt-1">${best.best.map(b=>`${esc(b.title)} ${b.marksObtained}/15`).join(' + ')} = <span class="fw-bold">${best.countedMarks}/30</span> • ${best.percentage}%</div>
                ${best.excluded.length?`<div class="small text-muted mt-1">Excluded: ${esc(best.excluded[0].title)} ${best.excluded[0].marksObtained}/15 (lowest) - not counted per spec §4</div>`:''}
              </div>
              <div class="chart-wrap sm mt-3"><canvas id="quizChart-${s.id}"></canvas></div>
            </div>
          </div>`;
        }).join('')}`;
      setTimeout(()=> semSubjects.forEach(s=>{
        const qs=quizzes.filter(q=>q.subjectId===s.id);
        if(qs.length) Charts.quizPerformance(`quizChart-${s.id}`, qs);
      }), 140);
    }catch(e){ el.innerHTML=`<div class="card-saas p-4 text-center"><div class="fw-bold">Unable to load quizzes</div><div class="small text-muted">${esc(e.message)}</div><button class="btn btn-primary-saas mt-2" onclick="loadQuizView()">Retry</button></div>`; }
  }

  async function loadInternalView(){
    const el=$('#internalView'); if(!el) return;
    el.innerHTML=`<div class="skeleton skeleton-card"></div>`;
    try{
      const [subjects, internals]=await Promise.all([API.getSubjects({semester: State.semester}), API.getInternals({studentId: State.studentId})]);
      const theories=subjects.filter(s=>s.type==='theory');
      if(theories.length===0){ el.innerHTML=`<div class="empty-state"><div class="small text-muted">No theory subjects in this semester</div></div>`; return; }
      el.innerHTML=theories.map(s=>{
        const rec=internals.find(x=>x.subjectId===s.id);
        const comps=rec?.components||[];
        const tot=calculateInternalTotal(comps);
        const mx=calculateInternalMax(comps);
        const v=validateInternalTotal(comps);
        return `<div class="card-saas mb-3"><div class="card-header-saas"><div><div class="fw-bold">${esc(s.name)}</div><div class="small text-muted">${esc(s.code)} • Internal must sum to 20 ${v.valid?'<span class="text-success">✓ Valid</span>':'<span class="text-danger">⚠ '+esc(v.message)+'</span>'}</div></div><span class="badge rounded-pill ${v.valid?'bg-success':'bg-danger'}" style="font-weight:700;">${tot}/${mx||20}</span></div>
          <div class="card-body">
            <div class="row g-2">
              ${comps.map(c=>`<div class="col-6 col-md-3"><div class="p-3 rounded text-center" style="background:var(--bg-soft);border:1px solid var(--border);"><div class="small text-muted" style="font-weight:600;">${esc(c.name)}</div><div class="fw-bold">${c.marks}/${c.maxMarks}</div><div class="small text-muted">${Math.round((c.marks/c.maxMarks)*100)}%</div></div></div>`).join('') || '<div class="col-12 small text-muted">No components configured - teacher will configure via Teacher → Internal.</div>'}
            </div>
            <div class="mt-3 p-2 rounded text-center fw-bold" style="background:var(--bg-soft);border:1px solid var(--border);">Internal Total: ${tot}/20 • ${mx?Math.round((tot/mx)*100):0}%</div>
          </div>
        </div>`;
      }).join('');
    }catch(e){ el.innerHTML=`<div class="card-saas p-4 text-center"><div class="fw-bold">Unable to load internal marks</div><div class="small text-muted">${esc(e.message)}</div></div>`; }
  }

  async function loadAssignmentsView(){
    const el=$('#assignmentsView'); if(!el) return;
    el.innerHTML=`<div class="row g-3">${skeletonCards(2)}</div>`;
    try{
      const [assignments, submissions, subjects]=await Promise.all([API.getAssignments({}), API.getSubmissions({studentId: State.studentId}), API.getSubjects({})]);
      State.submissions=submissions;
      const filter = State.search ? assignments.filter(a=> a.title.toLowerCase().includes(State.search) ): assignments;
      if(filter.length===0){ el.innerHTML=`<div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-file-circle-xmark"></i></div><div class="fw-bold">No assignments found</div><div class="small text-muted">No assignments ${State.search?'for "'+esc(State.search)+'"':''}.</div></div>`; return; }
      el.innerHTML=`<div class="d-flex justify-content-between align-items-center mb-3"><div class="fw-bold">Assignments <span class="badge rounded-pill" style="background:var(--bg-soft);border:1px solid var(--border);">${filter.length}</span></div><div class="small text-muted">Statuses: Not Started • Submitted • Late • Checked • Returned • Via API</div></div>
      <div class="row g-3">
        ${filter.map(a=>{
          const s=subjects.find(x=>x.id===a.subjectId);
          const sub=submissions.find(x=>x.assignmentId===a.id);
          const status=sub?sub.status:a.status;
          const statusClass=status;
          return `<div class="col-md-6"><div class="card-saas h-100"><div class="card-body">
            <div class="d-flex justify-content-between align-items-start gap-2"><span class="badge-type ${s?.type==='lab'?'badge-lab':'badge-theory'}">${esc(s?.code||'Subject')}</span><span class="badge rounded-pill" style="background:${status==='checked'?'#dcfce7':status==='submitted'?'#e2e8f0':status==='late'?'#fee2e2':'#f1f5f9'};color:${status==='checked'?'#166534':status==='submitted'?'#334155':status==='late'?'#991b1b':'#475569'};font-weight:700;font-size:0.68rem;letter-spacing:0.05em;">${esc(status).replace('_',' ')}</span></div>
            <div class="fw-bold mt-2" style="line-height:1.3;">${esc(a.title)}</div>
            <div class="small text-muted" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${esc(a.description)}</div>
            <div class="mt-2 small d-flex flex-wrap gap-2"><span><i class="fa-regular fa-calendar me-1"></i>Deadline ${fmtDate(a.deadline)}</span><span>• ${a.maxMarks} marks</span><span>• ${a.submissionsCount} submissions</span></div>
            ${sub ? '<div class="mt-3 p-2 rounded" style="background:var(--bg-soft);border:1px solid var(--border);"><div class="small fw-bold">Your Submission: ' + esc((sub.fileNames||[sub.fileName]).join(', ')) + ' • ' + fmtDate(sub.submittedAt) + '</div>' + (sub.marks!==null ? '<div class="small">Marks: <span class="fw-bold">' + sub.marks + '/' + sub.maxMarks + '</span> • Feedback: ' + esc(sub.feedback||'-') + '</div>' : '<div class="small text-muted">Awaiting grading by teacher</div>') + '</div>' : ''}
            <div class="d-flex gap-2 mt-3">
              ${(a.files||[]).map((file,index)=>`<button class="btn btn-ghost btn-sm" title="Download ${escAttr(file.name)}" onclick="API.downloadAssignment(${a.id},${index}).catch(e=>toast(e.message,'error'))"><i class="fa-solid fa-download me-1"></i>${esc(file.name)}</button>`).join('') || '<span class="small text-muted">No files attached</span>'}
              ${!sub||sub.status==='not_started'?`<button class="btn btn-primary-saas btn-sm flex-fill" onclick="openSubmitModal(${a.id}, '${escAttr(a.title)}')"><i class="fa-solid fa-upload me-1"></i>${sub?'Resubmit':'Submit'}</button>`:`<button class="btn btn-ghost btn-sm flex-fill" disabled><i class="fa-solid fa-check me-1"></i>${esc(status)}</button>`}
            </div>
          </div></div></div>`;
        }).join('')}
      </div>`;
    }catch(e){ el.innerHTML=`<div class="card-saas p-4 text-center"><div class="fw-bold">Unable to load assignments</div><div class="small text-muted">${esc(e.message)}</div><button class="btn btn-primary-saas mt-2" onclick="loadAssignmentsView()">Retry</button></div>`; }
  }

  async function loadSyllabusView(){
    const el=$('#syllabusView'); if(!el) return;
    el.innerHTML=`<div class="skeleton skeleton-card"></div>`;
    try{
      const subjects=await API.getSubjects({semester: State.semester});
      el.innerHTML=`<div class="row g-3">${subjects.map(s=>`<div class="col-md-6"><div class="card-saas h-100"><div class="card-body"><div class="fw-bold">${esc(s.name)}</div><div class="small text-muted">${esc(s.code)} • ${s.credits} Credits • ${esc(s.type)}</div><div class="small text-muted mt-2">Modules with completion % - click to expand in Subject Details.</div><button class="btn btn-ghost btn-sm mt-3" onclick="openSubject(${s.id})"><i class="fa-solid fa-eye me-1"></i>View Syllabus</button></div></div></div>`).join('')}</div>`;
    }catch(e){ el.innerHTML=`<div class="small text-danger">${esc(e.message)}</div>`; }
  }

  async function loadNotesView(){
    const el=$('#notesView'); if(!el) return;
    el.innerHTML=`<div class="row g-3">${skeletonCards(4)}</div>`;
    try{
      const notes=await API.getNotes({});
      const filtered= State.search? notes.filter(n=>n.title.toLowerCase().includes(State.search)): notes;
      if(filtered.length===0){ el.innerHTML=`<div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-file"></i></div><div class="fw-bold">No notes available</div><div class="small text-muted">No study material found${State.search?' for "'+esc(State.search)+'"':''}.</div></div>`; return; }
      el.innerHTML=`<div class="row g-3">${filtered.map(n=>`
        <div class="col-md-6 col-xl-4"><div class="card-saas h-100"><div class="card-body">
          <div class="d-flex gap-3"><div style="width:42px;height:42px;border-radius:12px;background:var(--primary-100);color:var(--primary);display:grid;place-items:center;flex-shrink:0;"><i class="fa-solid fa-file-${n.fileType==='pdf'?'pdf':n.fileType==='ppt'?'powerpoint':'word'}"></i></div><div class="flex-fill"><div class="fw-bold small" style="line-height:1.3;">${esc(n.title)}</div><div class="small text-muted">${esc(n.module)} • ${esc(n.fileType.toUpperCase())} • ${esc(n.size)} • ${n.pages} pages</div></div></div>
          <div class="small text-muted mt-2" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${esc(n.description)}</div>
          <div class="d-flex justify-content-between align-items-center mt-3"><span class="small text-muted">${fmtDate(n.date)}</span><button class="btn btn-ghost btn-sm" disabled title="No file has been uploaded for this note"><i class="fa-solid fa-file-circle-xmark me-1"></i>No file attached</button></div>
        </div></div></div>
      `).join('')}</div>`;
    }catch(e){ el.innerHTML=`<div class="card-saas p-4 text-center"><div class="fw-bold">Unable to load notes</div><div class="small text-muted">${esc(e.message)}</div></div>`; }
  }

  async function loadSgpaView(){
    const el=$('#sgpaView'); if(!el) return;
    el.innerHTML=`<div class="skeleton skeleton-card"></div>`;
    try{
      const [subjects, quizzes, internals, endsems, labs]=await Promise.all([
        API.getSubjects({}), API.getQuizzes({studentId: State.studentId}), API.getInternals({studentId: State.studentId}), API.getEndSems({studentId: State.studentId}), API.getLabMarks({studentId: State.studentId})
      ]);
      const semesters=[1,2];
      const semData=semesters.map(sem=>{
        const semSubs=subjects.filter(s=>s.semester===sem);
        const perfs=semSubs.map(s=>{
          if(s.type==='lab'){
            const lab=labs.find(l=>l.subjectId===s.id);
            const tot=lab? calculateLabTotal(lab.components).total : 0;
            return {...s, marks: tot, percentage: tot, gradePoint: getGradePoint(tot)};
          } else {
            const q=quizzes.filter(x=>x.subjectId===s.id);
            const best=calculateBestTwoQuizzes(q);
            const internal=internals.find(x=>x.subjectId===s.id);
            const it=internal? calculateInternalTotal(internal.components):0;
            const end=endsems.find(x=>x.subjectId===s.id);
            const total=calculateTheoryTotal(best.countedMarks, it, end?end.marksObtained:0);
            return {...s, marks: total, percentage: total, gradePoint: getGradePoint(total)};
          }
        });
        const sgpa=calculateSGPA(perfs);
        return {semester: sem, subjects: perfs, sgpa: sgpa.sgpa, credits: sgpa.totalCredits, totalPoints: sgpa.totalPoints};
      });
      const cgpa=calculateCGPA(semData);
      el.innerHTML=`
        <div class="row g-3">
          <div class="col-md-4"><div class="card-saas text-center p-4">
            <div style="width:132px;height:132px;border-radius:50%;background:conic-gradient(var(--primary) 0% ${cgpa.cgpa*10}%, var(--border) ${cgpa.cgpa*10}% 100%);display:grid;place-items:center;margin:0 auto;"><div style="width:102px;height:102px;border-radius:50%;background:var(--card);display:grid;place-items:center;box-shadow:var(--shadow);"><div><div class="fw-bold" style="font-size:1.6rem;">${cgpa.cgpa}</div><div class="small text-muted" style="font-weight:700;letter-spacing:0.06em;">CGPA</div></div></div></div>
            <div class="fw-bold mt-3">Overall CGPA</div><div class="small text-muted">Credit-weighted • ${cgpa.totalCredits} credits • Not simple average</div>
            <div class="small mt-2 p-2 rounded" style="background:var(--bg-soft);border:1px solid var(--border);font-weight:600;">Σ(Credit×GradePoint)/ΣCredits</div>
          </div></div>
          <div class="col-md-8"><div class="card-saas h-100"><div class="card-header-saas"><div class="fw-bold small" style="letter-spacing:0.06em;">SGPA TREND</div><span class="small text-muted">Sem 1-2 • via API</span></div><div class="card-body"><div class="chart-wrap"><canvas id="sgpaTrendChart"></canvas></div><div class="small text-muted mt-2">Grade points: 90-100:10, 80-89:9, 70-79:8, 60-69:7, 50-59:6, 40-49:5, &lt;40:0 (fallback if API not providing points per spec §15)</div></div></div></div>
        </div>
        ${semData.map(sd=>`
          <div class="card-saas mt-3"><div class="card-header-saas"><div class="fw-bold">Semester ${sd.semester} • SGPA ${sd.sgpa}</div><span class="badge rounded-pill" style="background:var(--bg-soft);border:1px solid var(--border);font-weight:700;">${sd.credits} credits • ${sd.totalPoints} points</span></div>
            <div class="card-body p-0">
              <div class="table-responsive"><table class="table table-saas mb-0"><thead><tr><th>Subject</th><th>Credits</th><th>Marks</th><th>Grade Point</th><th>Credit×GP</th></tr></thead><tbody>
                ${sd.subjects.map(s=>`<tr><td><div class="fw-bold small">${esc(s.name)}</div><div class="small text-muted">${esc(s.code)}</div></td><td>${s.credits}</td><td>${s.marks}/100</td><td><span class="badge rounded-pill" style="background:var(--primary-100);color:var(--primary-600);font-weight:700;">${s.gradePoint}</span></td><td>${(s.credits*s.gradePoint).toFixed(1)}</td></tr>`).join('')}
                <tr style="background:var(--bg-soft);font-weight:800;"><td>Semester Total</td><td>${sd.credits}</td><td></td><td></td><td>${sd.totalPoints}</td></tr>
                <tr style="background:var(--bg-soft);"><td colspan="4" class="text-end fw-bold">SGPA = ${sd.totalPoints} / ${sd.credits} =</td><td class="fw-bold" style="color:var(--primary);font-size:1.05rem;">${sd.sgpa}</td></tr>
              </tbody></table></div>
            </div>
          </div>
        `).join('')}
      `;
      setTimeout(()=> Charts.sgpaTrend('sgpaTrendChart', semData), 120);
    }catch(e){ el.innerHTML=`<div class="card-saas p-4 text-center"><div class="fw-bold">Unable to load SGPA</div><div class="small text-muted">${esc(e.message)}</div></div>`; }
  }

  async function loadExamsView(){
    const el=$('#examsView'); if(!el) return;
    el.innerHTML=`<div class="skeleton skeleton-card"></div>`;
    try{
      const [exams, subjects]=await Promise.all([API.getExams({}), API.getSubjects({})]);
      el.innerHTML=`<div class="row g-3">${exams.map(e=>{
        const s=subjects.find(x=>x.id===e.subjectId);
        return `<div class="col-md-6"><div class="card-saas"><div class="card-body">
          <div class="d-flex justify-content-between"><span class="badge rounded-pill" style="background:${e.status==='upcoming'?'#e2e8f0':'#dcfce7'};color:${e.status==='upcoming'?'#334155':'#166534'};font-weight:700;">${esc(e.status)}</span><span class="small text-muted" style="font-weight:600;">${e.maxMarks} marks • ${esc(e.type)}</span></div>
          <div class="fw-bold mt-2">${esc(e.title)}</div><div class="small text-muted">${s?esc(s.name):''} • ${esc(s?.code||'')}</div>
          <div class="mt-2 small"><i class="fa-regular fa-calendar me-1"></i>${fmtDate(e.date)} • ${esc(e.time)} • ${esc(e.venue)}</div>
        </div></div></div>`;
      }).join('')}</div>`;
    }catch(e){ el.innerHTML=`<div class="small text-danger">${esc(e.message)}</div>`; }
  }

  async function loadNoticesView(){
    const el=$('#noticesView'); if(!el) return;
    el.innerHTML=`<div class="skeleton skeleton-card"></div>`;
    try{
      const notices=await API.getNotices({});
      const cats=['All','Marks','Assignment','Exam','General'];
      el.innerHTML=`
        <div class="d-flex gap-2 flex-wrap mb-3">${cats.map(c=>`<button class="btn btn-ghost btn-sm ${c==='All'?'active':''}" style="${c==='All'?'background:var(--primary);color:#fff;border-color:var(--primary);':''}" onclick="filterNotices('${c}')">${c}</button>`).join('')}</div>
        <div id="noticesList" class="d-grid gap-3">
          ${notices.map(n=>`<div class="card-saas p-3" style="border-left:3px solid ${n.priority==='high'?'var(--rose)':n.priority==='medium'?'var(--amber)':'var(--slate-400)'};" data-cat="${esc(n.category)}"><div class="d-flex justify-content-between gap-2"><div class="fw-bold small">${esc(n.title)}</div><span class="badge rounded-pill" style="background:var(--bg-soft);border:1px solid var(--border);font-size:0.68rem;">${esc(n.category)}</span></div><div class="small text-muted mt-1">${esc(n.content)}</div><div class="small text-muted mt-2"><i class="fa-regular fa-clock me-1"></i>${fmtDate(n.date)} • ${esc(n.author)} • <span class="badge ${n.priority==='high'?'bg-danger':n.priority==='medium'?'bg-warning text-dark':'bg-secondary'} rounded-pill" style="font-size:0.68rem;">${esc(n.priority)}</span></div></div>`).join('')}
        </div>
      `;
      window.filterNotices=(cat)=>{ $$('#noticesList [data-cat]').forEach(el=>{ el.style.display = (cat==='All' || el.dataset.cat===cat) ? 'block':'none'; }); };
    }catch(e){ el.innerHTML=`<div class="small text-danger">${esc(e.message)}</div>`; }
  }

  async function loadProgressView(){
    const el=$('#progressView'); if(!el) return;
    el.innerHTML=`<div class="skeleton skeleton-card"></div>`;
    try{
      const prog=await API.getProgress(State.studentId);
      el.innerHTML=`
        <div class="card-saas mb-3"><div class="card-body d-flex gap-3 align-items-center flex-wrap">
          <div style="width:92px;height:92px;border-radius:50%;background:conic-gradient(var(--primary) 0% ${prog.overall}%, var(--border) ${prog.overall}% 100%);display:grid;place-items:center;"><div style="width:70px;height:70px;border-radius:50%;background:var(--card);display:grid;place-items:center;box-shadow:var(--shadow);"><div class="fw-bold">${prog.overall}%</div></div></div>
          <div><div class="fw-bold">Overall Academic Progress</div><div class="small text-muted">Syllabus + Assignments + Attendance completion</div><div class="progress progress-saas mt-2" style="width:220px;"><div class="progress-bar" style="width:${prog.overall}%;background:var(--primary)"></div></div></div>
          <div class="ms-auto small text-muted">Updated via API: /progress</div>
        </div></div>
        <div class="row g-3">${prog.subjects.map(s=>`<div class="col-md-6"><div class="card-saas"><div class="card-body"><div class="d-flex justify-content-between"><span class="fw-bold small">${esc(s.name)}</span><span class="fw-bold" style="color:${s.completion>=80?'#10b981':s.completion>=50?'#f59e0b':'#ef4444'}">${s.completion}%</span></div><div class="progress progress-saas mt-2"><div class="progress-bar" style="width:${s.completion}%;background:${s.completion>=80?'#10b981':s.completion>=50?'#f59e0b':'#ef4444'}"></div></div></div></div></div>`).join('')}</div>
      `;
    }catch(e){ el.innerHTML=`<div class="small text-danger">${esc(e.message)}</div>`; }
  }

  async function loadProfileView(){
    const el=$('#profileView'); if(!el) return;
    try{
      const s=await API.getStudent(State.studentId);
      el.innerHTML=`
        <div class="row g-3">
          <div class="col-md-4"><div class="card-saas text-center p-4">
            <div style="width:76px;height:76px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--violet));color:#fff;display:grid;place-items:center;font-weight:800;font-size:1.45rem;margin:0 auto;box-shadow:var(--shadow-primary);">${esc(s.avatar)}</div>
            <div class="fw-bold mt-3" style="font-size:1.05rem;">${esc(s.name)}</div><div class="small text-muted">${esc(s.roll)} • ${esc(s.program)}</div><div class="small text-muted">${esc(s.email)}</div>
            <div class="mt-3 d-flex justify-content-center gap-2"><span class="badge rounded-pill" style="background:var(--primary-100);color:var(--primary-600);font-weight:700;">Sem ${s.semester}</span><span class="badge rounded-pill" style="background:var(--emerald-50);color:#065f46;font-weight:700;">CGPA ${s.cgpa}</span></div>
          </div></div>
          <div class="col-md-8"><div class="card-saas"><div class="card-header-saas"><div class="fw-bold">Student Information</div><span class="small text-muted">Private • §37</span></div><div class="card-body">
            <div class="row small">
              <div class="col-6 py-2" style="border-bottom:1px solid var(--border);"><div class="text-muted" style="font-weight:600;">Roll Number</div><div class="fw-bold">${esc(s.roll)}</div></div>
              <div class="col-6 py-2" style="border-bottom:1px solid var(--border);"><div class="text-muted" style="font-weight:600;">Program</div><div class="fw-bold">${esc(s.program)} • Batch ${esc(s.batch)}</div></div>
              <div class="col-6 py-2" style="border-bottom:1px solid var(--border);"><div class="text-muted" style="font-weight:600;">Semester</div><div class="fw-bold">Semester ${s.semester}</div></div>
              <div class="col-6 py-2" style="border-bottom:1px solid var(--border);"><div class="text-muted" style="font-weight:600;">Email</div><div class="fw-bold">${esc(s.email)}</div></div>
              <div class="col-6 py-2"><div class="text-muted" style="font-weight:600;">Role</div><div class="fw-bold text-capitalize">${esc(s.role)}</div></div>
              <div class="col-6 py-2"><div class="text-muted" style="font-weight:600;">Privacy</div><div class="fw-bold">You can only see your own data</div></div>
            </div>
            <div class="alert mt-3" style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;font-size:0.85rem;border-radius:12px;"><i class="fa-solid fa-shield-halved me-2"></i>Marks, attendance, submissions are private per student per spec §37.</div>
          </div></div></div>
        </div>
      `;
    }catch(e){ el.innerHTML=`<div class="small text-danger">${esc(e.message)}</div>`; }
  }

  /* ---------- Teacher Views - Fully Working ---------- */
  async function loadTeacherSubjects(){
    const el=$('#teacherSubjectsView'); if(!el) return;
    el.innerHTML=`<div class="skeleton skeleton-card"></div>`;
    try{
      const subjects=await API.getSubjects({});
      el.innerHTML=`
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div class="fw-bold" style="font-size:1.05rem;">Subjects <span class="badge rounded-pill" style="background:var(--bg-soft);border:1px solid var(--border);">${subjects.length}</span> <span class="small text-muted" style="font-weight:500;">• API: /subjects</span></div>
          <button class="btn btn-primary-saas" data-bs-toggle="modal" data-bs-target="#addSubjectModal"><i class="fa-solid fa-plus me-1"></i>Add Subject</button>
        </div>
        <div class="card-saas">
          <div class="table-responsive"><table class="table table-saas mb-0">
            <thead><tr><th>Subject</th><th>Code</th><th>Faculty</th><th>Sem</th><th>Credits</th><th>Type</th><th style="width:120px;">Action</th></tr></thead>
            <tbody>${subjects.map(s=>`<tr><td><div class="fw-bold small">${esc(s.name)}</div><div class="small text-muted">${esc(s.code)}</div></td><td class="small fw-semibold">${esc(s.code)}</td><td class="small">${esc(s.faculty)}</td><td><span class="badge rounded-pill" style="background:var(--bg-soft);border:1px solid var(--border);">${s.semester}</span></td><td><span class="badge rounded-pill" style="background:var(--primary-100);color:var(--primary-600);">${s.credits}</span></td><td><span class="badge-type ${s.type==='theory'?'badge-theory':s.type==='lab'?'badge-lab':'badge-elective'}">${esc(s.type)}</span></td>
              <td><div class="d-flex gap-1"><button class="btn btn-ghost btn-sm" title="View" onclick="openSubject(${s.id})"><i class="fa-solid fa-eye"></i></button><button class="btn btn-ghost btn-sm" title="Edit" onclick="editSubject(${s.id})"><i class="fa-solid fa-pen"></i></button><button class="btn btn-ghost btn-sm text-danger" title="Delete" onclick="deleteSubject(${s.id})"><i class="fa-solid fa-trash"></i></button></div></td></tr>`).join('')}</tbody>
          </table></div>
        </div>
        <div class="small text-muted mt-2"><i class="fa-solid fa-circle-info me-1"></i>Credits required for SGPA • Type determines evaluation (Theory 30+20+50, Lab 100). All via API - changes reflect instantly for students.</div>
      `;
    }catch(e){ el.innerHTML=`<div class="small text-danger">${esc(e.message)}</div>`; }
  }

  async function loadTeacherStudents(){
    const el=$('#teacherStudentsView'); if(!el) return;
    el.innerHTML=`<div class="skeleton skeleton-card"></div>`;
    try{
      const [students, attendance, submissions, subjects]=await Promise.all([API.getStudents({}), API.getAttendance({}), API.getSubmissions({}), API.getSubjects({})]);
      window.__allStudents = students;
      el.innerHTML=`
        <div class="fw-bold mb-3" style="font-size:1.05rem;">Class Roster • <span class="badge rounded-pill" style="background:var(--bg-soft);border:1px solid var(--border);">${students.length}</span> <span class="small text-muted">open a student's tab to manage - their marks are shown only to them & to you for grading</span></div>
        <div class="row g-3">${students.map(st=>{
          const recs=attendance.filter(a=>a.studentId===st.id && subjects.some(s=>s.id===a.subjectId && s.semester===(st.semester||1)));
          let ov=recs.length?calculateOverallAttendance(recs):0; if(!isFinite(ov))ov=0;
          const low=recs.filter(r=>calculateAttendance(r.attendedClasses,r.totalClasses)<(CONFIG.REQUIRED_ATTENDANCE||75)).length;
          const subs=submissions.filter(x=>x.studentId===st.id);
          const pending=subs.filter(x=>x.status==='submitted').length;
          return `<div class="col-md-6 col-xl-4"><div class="card-saas"><div class="card-body">
            <div class="d-flex gap-3"><div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--primary-100),#fce7f3);color:var(--primary);display:grid;place-items:center;font-weight:800;">${esc(st.avatar)}</div><div class="flex-fill"><div class="fw-bold small">${esc(st.name)}</div><div class="small text-muted">${esc(st.roll)} • Sem ${st.semester}</div><div class="small text-muted">${esc(st.email||'')}</div></div></div>
            <div class="d-flex gap-2 mt-3 text-center">
              <div class="flex-fill p-2 rounded" style="background:var(--bg-soft);border:1px solid var(--border);"><div class="small text-muted" style="font-weight:600;font-size:0.68rem;">ATTENDANCE</div><div class="fw-bold ${ov>=75?'text-success':'text-danger'}">${ov.toFixed(1)}%</div><div class="small text-muted" style="font-size:0.7rem;">${low>0?low+' subject(s) <75%':'eligible'}</div></div>
              <div class="flex-fill p-2 rounded" style="background:var(--bg-soft);border:1px solid var(--border);"><div class="small text-muted" style="font-weight:600;font-size:0.68rem;">SUBMISSIONS</div><div class="fw-bold">${subs.length}</div><div class="small text-muted" style="font-size:0.7rem;">${pending} to grade</div></div>
            </div>
            <div class="d-flex gap-1 mt-2 flex-wrap"><button class="btn btn-ghost btn-sm flex-fill" onclick="selectStudentFor(${st.id},'teacher-attendance')"><i class="fa-solid fa-clipboard-check me-1"></i>Attendance</button><button class="btn btn-ghost btn-sm flex-fill" onclick="selectStudentFor(${st.id},'teacher-quizzes')"><i class="fa-solid fa-pen me-1"></i>Quizzes</button><button class="btn btn-ghost btn-sm flex-fill" onclick="selectStudentFor(${st.id},'teacher-internal')"><i class="fa-solid fa-list-check me-1"></i>Internals</button></div>
          </div></div></div>`;
        }).join('')}</div>
      `;
    }catch(e){ el.innerHTML=`<div class="small text-danger">${esc(e.message)}</div>`; }
  }

  async function loadTeacherQuizzes(){
    const el=$('#teacherQuizzesView'); if(!el) return;
    el.innerHTML=`<div class="skeleton skeleton-card"></div>`;
    try{
      const qStudentId = State.teacherSelectedStudentId || State.studentId;
      const [subjects, quizzes, students, endsems, internals]=await Promise.all([API.getSubjects({semester: State.semester}), API.getQuizzes({studentId: qStudentId}), API.getStudents({}), API.getEndSems({studentId: qStudentId}), API.getInternals({studentId: qStudentId})]);
      const theories=subjects.filter(s=>s.type==='theory');
      const qSel = students.find(s=>s.id===qStudentId);
      el.innerHTML=`
        <div class="d-flex flex-wrap gap-2 align-items-center mb-2">
          <div class="quiz-offline-banner flex-fill mb-0"><i class="fa-solid fa-chalkboard-teacher"></i><div><strong>Classroom quizzes - enter marks for ${qSel?esc(qSel.name):'the selected student'} here.</strong> Three quizzes worth 15 marks each; the best two count toward 30. <strong>End-semester marks are entered below each subject card, out of 50.</strong> The server validates scores and saves changes to the database.</div></div>
          <select id="quizStudentSwitch" class="form-select form-select-sm" style="max-width:220px; border-radius:999px;">${students.map(s=>`<option value="${s.id}" ${s.id===qStudentId?'selected':''}>${esc(s.name)} - ${esc(s.roll)}</option>`).join('')}</select>
        </div>
        ${theories.map(s=>{
          const qs=quizzes.filter(q=>q.subjectId===s.id);
          const best=calculateBestTwoQuizzes(qs);
          const es=endsems.find(x=>x.subjectId===s.id);
          const esVal=es?es.marksObtained:'';
          const intRec=internals.find(x=>x.subjectId===s.id);
          const it=intRec?calculateInternalTotal(intRec.components):0;
          const grand=best.countedMarks+it+(es?es.marksObtained:0);
          return `<div class="card-saas mb-3"><div class="card-header-saas"><div><div class="fw-bold">${esc(s.name)} <span class="small text-muted">• ${esc(s.code)}</span></div><div class="small text-muted">3 offline tests • Best2: ${best.countedMarks}/30 • Enter 0-15 via API</div></div><span class="badge rounded-pill ${best.countedMarks>=18?'bg-success':'bg-warning text-dark'}" style="font-weight:700;">${best.countedMarks}/30</span></div>
            <div class="card-body">
              <div class="row g-2">
                ${qs.map(q=>`
                  <div class="col-md-4"><div class="p-3 rounded" style="background:var(--bg-soft);border:1px solid var(--border);">
                    <div class="d-flex justify-content-between"><span class="fw-bold small">${esc(q.title)}</span><span class="small text-muted">${fmtDate(q.date)}</span></div>
                    <div class="small text-muted mb-2">${esc(q.description||'Class test')}</div>
                    <label class="small fw-bold">Marks (0-15)</label>
                    <div class="d-flex gap-2">
                      <input type="number" min="0" max="15" value="${q.marksObtained}" class="form-control form-control-saas form-control-sm" id="quiz-${q.id}" style="max-width:90px;">
                      <button class="btn btn-primary-saas btn-sm flex-fill" onclick="saveQuiz(${q.id})"><i class="fa-solid fa-floppy-disk me-1"></i>Save</button>
                    </div>
                    <div class="small mt-1" id="quiz-msg-${q.id}" style="min-height:14px;"></div>
                  </div></div>
                `).join('')}
              </div>
              ${qs.length===3?`<div class="small mt-3 p-2 rounded" style="background:var(--bg-soft);border:1px solid var(--border);">Auto Best2: <strong>${best.best.map(b=>`${esc(b.title)} ${b.marksObtained}/15`).join(' + ')} = ${best.countedMarks}/30</strong> • Excluded: ${best.excluded[0]?esc(best.excluded[0].title)+' '+best.excluded[0].marksObtained+'/15':''}</div>`:''}
              <div class="mt-3 pt-3" style="border-top:1px dashed var(--border);">
                <div class="d-flex flex-wrap align-items-center gap-2">
                  <span class="fw-bold small" style="letter-spacing:0.03em;"><i class="fa-solid fa-file-signature me-1" style="color:var(--primary)"></i>END-SEMESTER (out of 50)</span>
                  <input type="number" min="0" max="50" step="1" value="${esVal}" class="form-control form-control-saas form-control-sm" id="endsem-${s.id}" style="max-width:90px;" placeholder="0-50" title="Enter 0 to 50">
                  <button class="btn btn-primary-saas btn-sm" onclick="saveEndSem(${s.id})"><i class="fa-solid fa-floppy-disk me-1"></i>Save</button>
                  ${es?`<span class="badge rounded-pill bg-success" style="font-weight:700;">${es.marksObtained}/50 saved</span>`:`<span class="badge rounded-pill bg-warning text-dark" style="font-weight:700;">not entered</span>`}
                  <span class="small text-muted" id="es-msg-${s.id}" style="min-height:14px;"></span>
                </div>
                <div class="small mt-2 p-2 rounded" style="background:var(--primary-50,#fff1f2);border:1px solid var(--border);">
                  Theory total (what the student sees): Best2 <strong>${best.countedMarks}/30</strong> + Internal <strong>${it}/20</strong> + End-Sem <strong>${es?es.marksObtained:'-'}/50</strong> = <strong style="color:var(--primary);">${grand}/100</strong>${es?` • Grade Point ${getGradePoint(grand)}`:' • grade appears once end-sem is saved'}
                  ${intRec?'':' • <span class="text-muted">internal not configured - treated as 0</span>'}
                </div>
              </div>
            </div>
          </div>`;
        }).join('') || '<div class="empty-state"><div class="small text-muted">No theory subjects in this semester</div></div>'}
      `;
      const qsSwitch=document.getElementById('quizStudentSwitch'); if(qsSwitch) qsSwitch.addEventListener('change', e=>{ State.teacherSelectedStudentId=parseInt(e.target.value); loadTeacherQuizzes(); });
      window.saveQuiz=async(id)=>{
        const inp=document.getElementById(`quiz-${id}`);
        const msg=document.getElementById(`quiz-msg-${id}`);
        const v=parseInt(inp.value);
        if(isNaN(v) || v<0 || v>15){ msg.innerHTML='<span class="text-danger">0-15 only</span>'; toast('Quiz marks must be 0-15','error'); return; }
        try{
          await API.updateQuiz(id, {marksObtained: v});
          msg.innerHTML='<span class="text-success">✓ Saved via PUT /api/assessments/'+id+'</span>';
          toast('Quiz marks saved - Best2 auto-recalculated','success');
          loadTeacherQuizzes(); loadQuizView();
        }catch(e){ msg.innerHTML='<span class="text-danger">'+esc(e.message)+'</span>'; toast(e.message,'error'); }
      };
      window.saveEndSem=async(subjectId)=>{
        const inp=document.getElementById(`endsem-${subjectId}`);
        const msg=document.getElementById(`es-msg-${subjectId}`);
        if(!inp) return;
        if(inp.value===''){ msg.innerHTML='<span class="text-danger">Enter a number 0-50</span>'; toast('End-sem marks required (0-50)','error'); return; }
        const v=parseInt(inp.value);
        if(isNaN(v)||v<0||v>50){ msg.innerHTML='<span class="text-danger">0-50 only</span>'; toast('End-sem marks must be 0-50','error'); return; }
        try{
          await API.updateEndSem(subjectId, qStudentId, v);
          msg.innerHTML='<span class="text-success">✓ Saved via PUT /api/subjects/'+subjectId+'/endsem?studentId='+qStudentId+'</span>';
          toast('End-sem marks saved - totals updated for student','success');
          loadTeacherQuizzes(); loadQuizView();
        }catch(e){ msg.innerHTML='<span class="text-danger">'+esc(e.message)+'</span>'; toast(e.message,'error'); }
      };
    }catch(e){ el.innerHTML=`<div class="small text-danger">${esc(e.message)}</div>`; }
  }

  async function loadTeacherInternal(){
    const el=$('#teacherInternalView'); if(!el) return;
    // Build builder UI - fetch sample subject
    try{
      const subjects=await API.getSubjects({semester: State.semester});
      try{ window.__allStudents = await API.getStudents({}); }catch{}
      const theories=subjects.filter(s=>s.type==='theory');
      if(theories.length===0){ el.innerHTML=`<div class="empty-state"><div class="small text-muted">No theory subjects</div></div>`; return; }
      const first=theories[0];
      const effId = State.teacherSelectedStudentId || State.studentId;
      const rec=await API.getInternal(first.id, effId);
      State.tempInternal = rec? [...rec.components] : [{name:'Assignment',maxMarks:5,marks:5},{name:'Presentation',maxMarks:5,marks:4},{name:'Class Test',maxMarks:10,marks:8}];
      renderInternalBuilder(first);
      // subject selector
      function renderInternalBuilder(subject){
        const total = State.tempInternal.reduce((s,c)=>s+c.maxMarks,0);
        const valid = total===20;
        el.innerHTML=`
          <div class="card-saas">
            <div class="card-header-saas"><div><div class="fw-bold">Internal Configuration - ${esc(subject.name)} <span class="small text-muted">(${esc(subject.code)})</span></div><div class="small text-muted">Total must =20 • Teacher defines distribution (assignment, presentation, test, viva...) • Via PUT /api/assessments</div></div><span class="badge rounded-pill ${valid?'bg-success':'bg-danger'}" style="font-weight:700;">Total ${total}/20 ${valid?'✓':'⚠'}</span></div>
            <div class="card-body">
              <div class="d-flex gap-2 flex-wrap mb-3">
                <select id="internalSubjectSelect" class="form-select form-select-saas" style="max-width:260px;">${theories.map(s=>`<option value="${s.id}" ${s.id===subject.id?'selected':''}>${esc(s.name)} (${esc(s.code)})</option>`).join('')}</select>
                <button class="btn btn-ghost btn-sm" onclick="toast('Switch subject to configure its internal','info')">Load</button>
                <select id="internalStudentSwitch" class="form-select form-select-sm ms-auto" style="max-width:230px; border-radius:999px;">${window.__allStudents? window.__allStudents.map(s=>`<option value="${s.id}" ${s.id===(State.teacherSelectedStudentId||State.studentId)?'selected':''}>Marks for: ${esc(s.name)} - ${esc(s.roll)}</option>`).join(''):''}</select>
              </div>
              <div class="table-responsive mb-3"><table class="table table-saas mb-0"><thead><tr><th>Component</th><th>Max Marks</th><th>Marks Obtained</th><th></th></tr></thead><tbody>
                ${State.tempInternal.map((c,i)=>`<tr><td><input class="form-control form-control-saas form-control-sm" value="${esc(c.name)}" onchange="updateComp(${i},'name',this.value)"></td><td><input type="number" min="1" max="20" class="form-control form-control-saas form-control-sm" value="${c.maxMarks}" onchange="updateComp(${i},'maxMarks',this.value)" style="width:90px;"></td><td><input type="number" min="0" max="${c.maxMarks}" class="form-control form-control-saas form-control-sm" value="${c.marks}" onchange="updateComp(${i},'marks',this.value)" style="width:90px;"></td><td><button class="btn btn-ghost btn-sm text-danger" onclick="removeComp(${i})"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('')}
                <tr style="background:var(--bg-soft);font-weight:800;"><td>Total</td><td>${total}/20</td><td></td><td>${valid?'<span class="text-success">✓ Valid</span>':'<span class="text-danger">Must be 20</span>'}</td></tr>
              </tbody></table></div>
              <div class="d-flex gap-2 flex-wrap">
                <div class="d-flex gap-2">
                  <select id="newCompType" class="form-select form-select-saas" style="width:160px;"><option>Assignment</option><option>Presentation</option><option>Class Test</option><option>Homework</option><option>Viva</option><option>Project</option><option>Other</option></select>
                  <input id="newCompMax" type="number" min="1" max="20" placeholder="Max" class="form-control form-control-saas" style="width:90px;">
                  <button class="btn btn-primary-saas" onclick="addComp()"><i class="fa-solid fa-plus me-1"></i>Add</button>
                </div>
                <button class="btn btn-primary-saas ms-auto" onclick="saveInternal(${subject.id})" ${valid?'':'disabled'}><i class="fa-solid fa-floppy-disk me-1"></i>Save Configuration (PUT)</button>
              </div>
              ${!valid?'<div class="alert mt-3" style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:12px;"><i class="fa-solid fa-triangle-exclamation me-1"></i>Internal total must equal 20. Adjust components.</div>':''}
            </div>
          </div>
          <div class="small text-muted mt-2">Example valid: Assignment 5 + Presentation 5 + Class Test 10 =20. Another: Assignment 10 + Presentation 5 + Homework 5 =20.</div>
        `;
        const isw=document.getElementById('internalStudentSwitch');
        if(isw) isw.addEventListener('change', e=>{ State.teacherSelectedStudentId=parseInt(e.target.value); loadTeacherInternal(); });
        document.getElementById('internalSubjectSelect').addEventListener('change', async e=>{
          const sid=parseInt(e.target.value);
          const r=await API.getInternal(sid, State.teacherSelectedStudentId || State.studentId);
          State.tempInternal = r? [...r.components] : [];
          const subj=theories.find(s=>s.id===sid);
          renderInternalBuilder(subj);
        });
      }
      window.updateComp=(i,field,val)=>{
        if(field==='maxMarks' || field==='marks') val=parseInt(val)||0;
        State.tempInternal[i][field]=val;
        const subj=theories.find(s=>s.id===first.id);
        // re-render to update total
        const sel=document.getElementById('internalSubjectSelect');
        const curId=sel?parseInt(sel.value):first.id;
        const curSub=theories.find(s=>s.id===curId) || first;
        renderInternalBuilder(curSub);
      };
      window.removeComp=(i)=>{ State.tempInternal.splice(i,1); const sel=document.getElementById('internalSubjectSelect'); const curId=sel?parseInt(sel.value):first.id; renderInternalBuilder(theories.find(s=>s.id===curId)); };
      window.addComp=()=>{
        const type=document.getElementById('newCompType').value;
        const max=parseInt(document.getElementById('newCompMax').value)||5;
        if(max<=0){ toast('Max must be positive','error'); return; }
        State.tempInternal.push({name:type, maxMarks:max, marks: Math.min(max, 5)});
        const sel=document.getElementById('internalSubjectSelect'); const curId=sel?parseInt(sel.value):first.id;
        renderInternalBuilder(theories.find(s=>s.id===curId));
      };
      window.saveInternal=async(sid)=>{
        const total=State.tempInternal.reduce((s,c)=>s+c.maxMarks,0);
        if(total!==20){ toast('Internal total must be 20, got '+total,'error'); return; }
        try{
          await API.updateInternal(sid, State.teacherSelectedStudentId || State.studentId, State.tempInternal);
          const who=(State.teacherSelectedStudent&&State.teacherSelectedStudent.name)||('student #'+(State.teacherSelectedStudentId||State.studentId));
          toast('Internal marks saved for '+who+' via PUT /api/assessments - student sees updated marks','success');
          loadTeacherDashboard();
        }catch(e){ toast(e.message,'error'); }
      };
    }catch(e){ el.innerHTML=`<div class="small text-danger">${esc(e.message)}</div>`; }
  }

  async function loadTeacherAttendance(){
    const el=$('#teacherAttendanceView'); if(!el) return;
    el.innerHTML=`<div class="skeleton skeleton-card"></div>`;
    try{
      const [subjects, students]=await Promise.all([API.getSubjects({semester: State.semester}), API.getStudents({})]);
      // ensure selected student exists
      if(!students.find(s=>s.id===State.teacherSelectedStudentId)) State.teacherSelectedStudentId = students[0]?.id || 101;
      const selStudent = students.find(s=>s.id===State.teacherSelectedStudentId);
      const attendance=await API.getAttendance({studentId: State.teacherSelectedStudentId});
      const selName = selStudent? selStudent.name : 'Student';
      el.innerHTML=`
        <div class="d-flex flex-wrap gap-2 align-items-center mb-3">
          <div class="fw-bold">Attendance Management - <span style="color:var(--primary);">${esc(selName)}</span></div>
          <select id="attStudentSwitch" class="form-select form-select-sm" style="max-width:220px; border-radius:999px;">
            ${students.map(s=>`<option value="${s.id}" ${s.id===State.teacherSelectedStudentId?'selected':''}>${esc(s.name)} - ${esc(s.roll)}</option>`).join('')}
          </select>
          <span class="small text-muted">Every student, every subject - update and it persists for that student</span>
        </div>
        <div class="card-saas"><div class="card-header-saas"><div><div class="fw-bold">Per-Subject Attendance for ${esc(selName)}</div><div class="small text-muted">Update total and attended classes • Attended cannot exceed total • Percentage is calculated automatically • 75% eligibility • Changes are saved to the database</div></div><span class="badge rounded-pill" style="background:var(--bg-soft);border:1px solid var(--border);">${attendance.length} subjects</span></div>
          <div class="table-responsive"><table class="table table-saas mb-0"><thead><tr><th>Subject</th><th>Code</th><th>Total</th><th>Attended</th><th>%</th><th>Status</th><th>Save</th></tr></thead><tbody>
            ${attendance.map(a=>{
              const s=subjects.find(x=>x.id===a.subjectId) || {name:'Subject '+a.subjectId, code:'', color:'#c8102e'};
              const perc=calculateAttendance(a.attendedClasses,a.totalClasses);
              const st=getAttendanceStatus(perc);
              return `<tr><td class="small fw-bold">${esc(s.name)}</td><td class="small text-muted">${esc(s.code||'')}</td><td><input class="form-control form-control-saas form-control-sm" style="width:80px;" value="${a.totalClasses}" type="number" min="0" id="att-total-${a.subjectId}"></td><td><input class="form-control form-control-saas form-control-sm" style="width:80px;" value="${a.attendedClasses}" type="number" min="0" id="att-att-${a.subjectId}"></td><td class="${st.met?'text-success':'text-danger'} fw-bold" id="att-perc-${a.subjectId}">${perc.toFixed(1)}%</td><td><span class="badge ${st.met?'bg-success':'bg-danger'} rounded-pill" style="font-size:0.68rem;">${esc(st.label)}</span></td><td><button class="btn btn-primary-saas btn-sm" onclick="saveAtt(${a.subjectId})"><i class="fa-solid fa-check"></i> Save</button></td></tr>`;
            }).join('')}
          </tbody></table></div>
          <div class="small text-muted p-3 d-flex flex-wrap gap-2" style="border-top:1px solid var(--border);"><span><i class="fa-solid fa-circle-info me-1"></i>Validation: Attended ≤ Total • Required 75%. Example: Aman has 68% in some subjects (below 75% warning) • Changes are saved to the database and visible to the student after refresh.</span><button class="btn btn-ghost btn-sm ms-auto" onclick="navigator.clipboard&&navigator.clipboard.writeText('Login as '+selName+' to see updated attendance')"><i class="fa-solid fa-eye me-1"></i>How student sees it</button></div>
        </div>
      `;
      document.getElementById('attStudentSwitch').addEventListener('change', (e)=>{
        State.teacherSelectedStudentId = parseInt(e.target.value);
        loadTeacherAttendance();
      });
      window.saveAtt=async(sid)=>{
        const total=parseInt(document.getElementById(`att-total-${sid}`).value);
        const att=parseInt(document.getElementById(`att-att-${sid}`).value);
        if(isNaN(total)||isNaN(att)){ toast('Enter numbers','error'); return; }
        if(att>total){ toast('Attended cannot exceed Total','error'); return; }
        try{
          await API.updateAttendance(sid, State.teacherSelectedStudentId, {totalClasses: total, attendedClasses: att});
          const perc=calculateAttendance(att,total);
          const cell=document.getElementById(`att-perc-${sid}`);
          if(cell) cell.textContent=perc.toFixed(1)+'%';
          toast(`Attendance for ${selName} saved (${perc.toFixed(1)}%). The student will see the updated value after refresh.`, 'success');
          // teacher: refresh his faculty dashboard (no student views on this page anymore)
          loadTeacherDashboard();
        }catch(e){ toast(e.message,'error'); }
      };
    }catch(e){ el.innerHTML=`<div class="small text-danger">${esc(e.message)}</div>`; }
  }

  async function loadTeacherAssignments(){
    const el=$('#teacherAssignmentsView'); if(!el) return;
    el.innerHTML=`<div class="skeleton skeleton-card"></div>`;
    try{
      const assignments=await API.getAssignments({});
      const subjects=await API.getSubjects({});
      el.innerHTML=`
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3"><div class="fw-bold">Assignments • <span class="badge rounded-pill" style="background:var(--bg-soft);border:1px solid var(--border);">${assignments.length}</span></div><button class="btn btn-primary-saas" data-bs-toggle="modal" data-bs-target="#addAssignmentModal"><i class="fa-solid fa-plus me-1"></i>Create Assignment</button></div>
        <div class="row g-3">${assignments.map(a=>{
          const s=subjects.find(x=>x.id===a.subjectId);
          return `<div class="col-md-6"><div class="card-saas h-100"><div class="card-body">
            <div class="d-flex justify-content-between"><span class="badge-type ${s?.type==='lab'?'badge-lab':'badge-theory'}">${esc(s?.code||'')}</span><span class="small text-muted" style="font-weight:600;">${a.maxMarks} marks</span></div>
            <div class="fw-bold mt-2">${esc(a.title)}</div><div class="small text-muted" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${esc(a.description)}</div>
            <div class="small mt-2 text-muted"><i class="fa-regular fa-calendar me-1"></i>Deadline ${fmtDate(a.deadline)} • ${a.submissionsCount} submissions • ${esc(a.status)}</div>
            <div class="d-flex gap-2 mt-3"><button class="btn btn-ghost btn-sm flex-fill" onclick="setView('teacher-submissions')"><i class="fa-solid fa-eye me-1"></i>Submissions</button>${(a.files||[]).map((file,index)=>`<button class="btn btn-ghost btn-sm" title="Download ${escAttr(file.name)}" onclick="API.downloadAssignment(${a.id},${index}).catch(e=>toast(e.message,'error'))"><i class="fa-solid fa-download"></i></button>`).join('')}<button class="btn btn-ghost btn-sm" title="Edit" onclick="editAssignment(${a.id})"><i class="fa-solid fa-pen"></i></button><button class="btn btn-ghost btn-sm text-danger" title="Delete" onclick="deleteAssignment(${a.id})"><i class="fa-solid fa-trash"></i></button></div>
          </div></div></div>`;
        }).join('')}</div>
      `;
    }catch(e){ el.innerHTML=`<div class="small text-danger">${esc(e.message)}</div>`; }
  }

  async function loadTeacherSubmissions(){
    const el=$('#teacherSubmissionsView'); if(!el) return;
    el.innerHTML=`<div class="skeleton skeleton-card"></div>`;
    try{
      const [subs, assignments]=await Promise.all([API.getSubmissions({}), API.getAssignments({})]);
      const pending=subs.filter(s=>s.status==='submitted').length;
      el.innerHTML=`
        <div class="card-saas"><div class="card-header-saas"><div><div class="fw-bold">Submissions • Evaluation</div><div class="small text-muted">Download • Give marks • Feedback • Statuses: Not Started / Submitted / Late / Checked</div></div><span class="badge bg-warning text-dark rounded-pill" style="font-weight:700;">${pending} pending</span></div>
          <div class="table-responsive"><table class="table table-saas mb-0"><thead><tr><th>Assignment</th><th>Student</th><th>File</th><th>Submitted</th><th>Status</th><th>Marks</th><th>Action</th></tr></thead><tbody>
            ${subs.map(s=>{
              const a=assignments.find(x=>x.id===s.assignmentId);
              const stName=((window.__allStudents||[]).find(x=>x.id==s.studentId)||{}).name || (s.studentId===101?'Manoj Kumar Das':s.studentId===102?'Priya Sharma':s.studentId===103?'Aman Verma':s.studentId===104?'Neha Singh':'Student '+s.studentId);
              return `<tr><td class="small fw-bold">${esc(a?.title||'')}</td><td class="small">${esc(stName)}</td><td class="small"><i class="fa-solid fa-file me-1 text-muted"></i>${esc((s.fileNames||[s.fileName]).join(', '))}</td><td class="small">${fmtDate(s.submittedAt)}</td><td><span class="badge rounded-pill" style="background:${s.status==='checked'?'#dcfce7':s.status==='submitted'?'#e2e8f0':s.status==='late'?'#fee2e2':'#f1f5f9'};color:${s.status==='checked'?'#166534':s.status==='submitted'?'#334155':s.status==='late'?'#991b1b':'#475569'};">${esc(s.status)}</span></td><td class="small fw-bold">${s.marks!==null?`${s.marks}/${s.maxMarks}`:'-'}</td><td><div class="d-flex gap-1"><button class="btn btn-primary-saas btn-sm" title="Grade" onclick="openGradeModal(${s.id})"><i class="fa-solid fa-pen"></i></button>${(s.files||[]).map((file,index)=>`<button class="btn btn-ghost btn-sm" title="Download ${escAttr(file.name)}" onclick="API.downloadSubmission(${s.id},${index}).catch(e=>toast(e.message,'error'))"><i class="fa-solid fa-download"></i></button>`).join('')}</div></td></tr>`;
            }).join('') || '<tr><td colspan="7" class="text-center small text-muted p-4">No submissions yet</td></tr>'}
          </tbody></table></div>
        </div>
      `;
    }catch(e){ el.innerHTML=`<div class="small text-danger">${esc(e.message)}</div>`; }
  }

  /* ---------- Modals ---------- */
  function openSubmitModal(id, title){
    const el=$('#submitModal'); if(!el) return;
    $('#submitAssignmentId').value=id;
    const t=$('#submitAssignmentTitle'); if(t) t.textContent=title;
    const m=new bootstrap.Modal(el); m.show();
  }
  async function handleSubmitAssignment(e){
    e.preventDefault();
    const id=parseInt($('#submitAssignmentId').value);
    const files=Array.from($('#submitFile').files||[]);
    if(!files.length){ toast('Select at least one file to upload','error'); return; }
    if(files.length>10){ toast('Select no more than 10 files','error'); return; }
    if(files.some(file=>file.size>15*1024*1024)){ toast('Each file must be 15 MB or smaller','error'); return; }
    const btn=e.target.querySelector('button[type="submit"]');
    const orig=btn.innerHTML; btn.innerHTML='<span class="spinner-border spinner-border-sm me-1"></span>Uploading...'; btn.disabled=true;
    try{
      await API.createSubmission({assignmentId:id, files});
      toast(`✓ ${files.length} file${files.length===1?'':'s'} submitted successfully`,'success');
      bootstrap.Modal.getInstance($('#submitModal')).hide();
      e.target.reset();
      const d=$('#fileNameDisplay'); if(d) d.textContent='';
      loadAssignmentsView();
    }catch(err){ toast(err.message||'Submission failed','error'); }
    finally{ btn.innerHTML=orig; btn.disabled=false; }
  }
  function openGradeModal(id){
    const el=$('#gradeModal'); if(!el) return;
    $('#gradeSubmissionId').value=id;
    const m=new bootstrap.Modal(el); m.show();
  }
  async function handleGrade(e){
    e.preventDefault();
    const id=parseInt($('#gradeSubmissionId').value);
    const marks=parseInt($('#gradeMarks').value);
    const feedback=$('#gradeFeedback').value;
    if(isNaN(marks) || marks<0){ toast('Marks must be ≥0','error'); return; }
    try{
      await API.gradeSubmission(id, marks, feedback);
      toast('✓ Graded! Marks & feedback saved via API - student sees in Assignments','success');
      bootstrap.Modal.getInstance($('#gradeModal')).hide();
      e.target.reset();
      loadTeacherSubmissions(); loadAssignmentsView();
    }catch(err){ toast(err.message,'error'); }
  }
  function openAttendanceModal(sid){
    const el=$('#attendanceModal'); if(!el) return;
    $('#attSubjectId').value=sid;
    const m=new bootstrap.Modal(el); m.show();
  }
  async function handleAttendance(e){
    e.preventDefault();
    const sid=parseInt($('#attSubjectId').value);
    const total=parseInt($('#attTotal').value);
    const attended=parseInt($('#attAttended').value);
    if(attended>total){ toast('Attended cannot exceed Total','error'); return; }
    const effId = State.role==='teacher' ? State.teacherSelectedStudentId : State.studentId;
    try{
      await API.updateAttendance(sid, effId, {totalClasses:total, attendedClasses:attended});
      toast('Attendance updated via PUT /api/attendance','success');
      bootstrap.Modal.getInstance($('#attendanceModal')).hide();
      if(State.role==='teacher'){ loadTeacherDashboard(); if(State.currentSubjectId) openSubject(State.currentSubjectId); }
      else { loadAttendanceView(); loadDashboard(); }
    }catch(err){ toast(err.message,'error'); }
  }
  async function handleAddSubject(e){
    e.preventDefault();
    const fd=new FormData(e.target);
    const payload={
      name: (fd.get('name')||'').toString().trim(),
      code: (fd.get('code')||'').toString().trim(),
      faculty: (fd.get('faculty')||'').toString().trim(),
      semester: parseInt(fd.get('semester')),
      credits: parseInt(fd.get('credits')),
      type: fd.get('type'),
      color: '#c8102e'
    };
    if(!payload.name || !payload.code){ toast('Name and Code are required','error'); return; }
    if(!payload.credits || payload.credits<=0){ toast('Credits must be positive (1-10)','error'); return; }
    const subjectId=fd.get('id');
    const btn=e.target.querySelector('button[type="submit"]');
    const orig=btn.innerHTML; btn.innerHTML='<span class="spinner-border spinner-border-sm me-1"></span>Saving...'; btn.disabled=true;
    try{
      const created=subjectId ? await API.updateSubject(subjectId,payload) : await API.createSubject(payload);
      toast(`✓ Subject "${created.name}" saved (${created.code})`,'success');
      bootstrap.Modal.getInstance($('#addSubjectModal')).hide();
      e.target.reset();
      // refresh views
      if(State.role==='teacher'){ await loadTeacherSubjects(); await loadTeacherDashboard(); } else { await loadSubjectsView(); await loadDashboard(); }
      // switch to subjects to show new one
      setTimeout(()=> setView(State.role==='teacher'?'teacher-subjects':'subjects'), 400);
    }catch(err){ toast(err.message||'Failed to create subject','error'); }
    finally{ btn.innerHTML=orig; btn.disabled=false; }
  }
  async function handleAddAssignment(e){
    e.preventDefault();
    const fd=new FormData(e.target);
    const payload={
      subjectId: parseInt(fd.get('subjectId')),
      title: (fd.get('title')||'').toString().trim(),
      description: (fd.get('description')||'').toString().trim(),
      maxMarks: parseInt(fd.get('maxMarks'))||20,
      deadline: fd.get('deadline'),
      status: 'pending'
    };
    const files=Array.from(fd.getAll('files')).filter(file=>file instanceof File && file.size>0);
    if(files.length>10){ toast('Select no more than 10 files','error'); return; }
    if(files.some(file=>file.size>15*1024*1024)){ toast('Each file must be 15 MB or smaller','error'); return; }
    if(files.length) payload.files=files;
    if(!payload.title){ toast('Title required','error'); return; }
    if(!payload.deadline){ toast('Deadline required','error'); return; }
    const btn=e.target.querySelector('button[type="submit"]');
    const orig=btn.innerHTML; btn.innerHTML='<span class="spinner-border spinner-border-sm me-1"></span>Creating...'; btn.disabled=true;
    try{
      const created=await API.createAssignment(payload);
      toast(`✓ Assignment "${created.title}" created - via POST /api/assignments`,'success');
      bootstrap.Modal.getInstance($('#addAssignmentModal')).hide();
      e.target.reset();
      await loadTeacherAssignments();
    }catch(err){ toast(err.message,'error'); }
    finally{ btn.innerHTML=orig; btn.disabled=false; }
  }
  window.editAssignment=async(id)=>{
    try{
      const assignment=(await API.getAssignments({})).find(item=>item.id===id);
      if(!assignment) throw new Error('Assignment not found');
      const title=prompt('Assignment title:',assignment.title);
      if(title===null) return;
      if(!title.trim()){ toast('Title is required','error'); return; }
      const description=prompt('Assignment instructions:',assignment.description||'');
      if(description===null) return;
      await API.updateAssignment(id,{title:title.trim(),description});
      toast('Assignment updated and saved to the database','success');
      await loadTeacherAssignments();
    }catch(error){ toast(error.message||'Could not update assignment','error'); }
  };
  window.deleteAssignment=async(id)=>{
    if(!confirm('Delete this assignment?')) return;
    try{ await API.deleteAssignment(id); toast('Assignment deleted','success'); await loadTeacherAssignments(); }
    catch(error){ toast(error.message||'Could not delete assignment','error'); }
  };
  window.deleteSubject=async(id)=>{
    if(!confirm('Delete this subject? This will remove it for all students (via DELETE /api/subjects/'+id+').')) return;
    try{ await API.deleteSubject(id); toast('Subject deleted via DELETE /api/subjects','success'); await loadTeacherSubjects(); await loadSubjectsView(); }catch(e){ toast(e.message,'error'); }
  };
  window.editSubject=async(id)=>{
    try{
      const subject=await API.getSubject(id);
      const form=$('#addSubjectForm');
      if(!form) return;
      form.elements.name.value=subject.name||'';
      form.elements.code.value=subject.code||'';
      form.elements.faculty.value=subject.faculty||'';
      form.elements.semester.value=String(subject.semester||1);
      form.elements.credits.value=subject.credits||1;
      form.elements.type.value=subject.type||'theory';
      form.querySelector('[name="id"]').value=subject.id;
      $('#subjectModalTitle').innerHTML='<i class="fa-solid fa-pen me-2 text-primary"></i>Edit Subject';
      $('#subjectSubmitButton').innerHTML='<i class="fa-solid fa-check me-1"></i>Save Changes';
      new bootstrap.Modal($('#addSubjectModal')).show();
    }catch(error){ toast(error.message||'Unable to load subject','error'); }
  };
  window.viewStudent=(id)=>{ toast('Viewing student via GET /api/marks?studentId='+id+' & GET /api/attendance?studentId='+id+' (private per §37)','info'); };

  function ensureAuth(){
    if(!State.currentUser || State.currentUser.role !== ROLE){
      window.location.replace('login.html?role='+ROLE);
      return false;
    }
    return true;
  }

  function updateHeaderForUser(){
    const u = State.currentUser;
    const nEl=$('#headerUserName'); const rEl=$('#headerUserRole');
    const avatarEls=document.querySelectorAll('.avatar');
    if(!u){
      if(nEl) nEl.textContent = State.role==='student' ? 'Manoj Kumar Das (Demo)' : 'Prof. Rajesh Kumar (Demo)';
      if(rEl) rEl.textContent = State.role==='student' ? 'MCA/2024/017 • Sem 1 • Demo' : 'Teacher • Demo';
      return;
    }
    // update topbar name/role
    if(nEl) nEl.textContent = u.name;
    if(rEl) {
      if(u.role==='student') rEl.textContent = `${u.roll||''} • Sem ${u.semester||State.semester} • BIT Mesra`;
      else rEl.textContent = `${u.role==='teacher'?'Teacher':u.role} • BIT Mesra • ${u.email||''}`;
    }
    // update sidebar mini
    const sideName=document.querySelector('.sidebar-footer .name');
    const sideRole=document.querySelector('.sidebar-footer .role');
    if(sideName) sideName.textContent = u.name;
    if(sideRole) sideRole.textContent = u.role==='student' ? `${u.roll} • Sem ${u.semester} • ${u.email}` : `${u.email} • ${u.role}`;
    avatarEls.forEach(a=>{
      if(a.textContent.trim().length<=3) a.textContent = u.avatar || u.name.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();
    });
    // add logout button if not exists
    const topActions=document.querySelector('.topbar-actions');
    if(topActions && !document.getElementById('logoutBtn')){
      const b=document.createElement('button');
      b.id='logoutBtn';
      b.className='btn btn-ghost btn-sm';
      b.title='Logout';
      b.innerHTML='<i class="fa-solid fa-right-from-bracket"></i> <span class="d-none d-lg-inline">Logout</span>';
      b.onclick=async()=>{ await API.logout(); window.location.href='index.html'; };
      topActions.appendChild(b);
    }
    // also add logout in sidebar
    const sideFoot=document.querySelector('.sidebar-footer');
    if(sideFoot && !document.getElementById('sidebarLogout')){
      const s=document.createElement('button');
      s.id='sidebarLogout';
      s.className='btn btn-ghost btn-sm w-100 mt-2';
      s.innerHTML='<i class="fa-solid fa-right-from-bracket me-1"></i>Logout';
      s.onclick=async()=>{ await API.logout(); window.location.href='index.html'; };
      sideFoot.appendChild(s);
    }
  }

  async function init(){
    try{
      const verifiedUser = await API.getMe();
      if(verifiedUser.role !== ROLE){
        window.location.replace('dashboard.html?role='+verifiedUser.role);
        return;
      }
      State.currentUser = verifiedUser;
      if(verifiedUser.role === 'student') State.studentId = verifiedUser.id;
    }catch{
      try{ localStorage.removeItem('mca_current_user'); }catch{}
      try{ sessionStorage.removeItem('mca_access_token'); }catch{}
      window.location.replace('login.html?role='+ROLE);
      return;
    }
    if(!ensureAuth()) return;
    updateHeaderForUser();
    document.querySelectorAll('[data-teacher-only]').forEach(el=>{ if(!el.classList.contains('view-section')) el.classList.toggle('d-none', ROLE!=='teacher'); });
    document.querySelectorAll('[data-student-only]').forEach(el=>el.classList.toggle('d-none', ROLE!=='student'));
    const dashboardTitle=document.querySelector('[data-view="dashboard"] .page-title');
    if(dashboardTitle) dashboardTitle.textContent=ROLE==='student'?'Student Dashboard':'Faculty Dashboard';
    const dashboardSubtitle=document.querySelector('[data-view="dashboard"] .page-subtitle');
    if(dashboardSubtitle) dashboardSubtitle.textContent=ROLE==='student'?'Your subjects, attendance, marks, assignments and academic progress':'Manage students, attendance, marks, assignments and submissions';
    // teacher: populate student picker state
    if(State.role==='teacher'){
      try{
        const students = await API.getStudents({});
        window.__allStudents = students;
        State.teacherSelectedStudent = students.find(s=>s.id===State.teacherSelectedStudentId) || students[0];
        if(State.teacherSelectedStudent) State.teacherSelectedStudentId = State.teacherSelectedStudent.id;
      }catch{}
    }
    const mobileToggle=$('#mobileToggle');
    const sidebar=$('#sidebar');
    const overlay=$('#sidebarOverlay');
    function toggleSidebar(){ if(sidebar) sidebar.classList.toggle('show'); if(overlay) overlay.classList.toggle('show'); }
    if(mobileToggle) mobileToggle.addEventListener('click', toggleSidebar);
    if(overlay) overlay.addEventListener('click', toggleSidebar);
    $$('.sidebar .nav-link').forEach(a=> a.addEventListener('click', e=>{
      const v=a.dataset.view;
      if(v){ e.preventDefault(); setView(v); }
      if(v && window.innerWidth<992 && sidebar?.classList.contains('show')) toggleSidebar();
    }));
    const themeBtn=$('#themeToggle'); if(themeBtn) themeBtn.addEventListener('click', toggleTheme);
    const sInput=$('#globalSearch');
    if(sInput){
      sInput.addEventListener('keydown', e=>{ if(e.key==='Enter') handleSearch(e.target.value); });
      const btn=$('#searchBtn'); if(btn) btn.addEventListener('click', ()=> handleSearch(sInput.value));
    }
    const mInput=$('#globalSearchMobile');
    if(mInput) mInput.addEventListener('keydown', e=>{ if(e.key==='Enter'){ const d=$('#globalSearch'); if(d) d.value=e.target.value; handleSearch(e.target.value); }});
    const notifBtn=$('#notifBtn');
    if(notifBtn) notifBtn.addEventListener('click', async()=>{
      try{
        const notifs=await API.getNotifications();
        const c=$('#notifDropdown'); if(!c) return;
        c.innerHTML=notifs.map(n=>`<div class="p-2 small" style="border-bottom:1px solid var(--border);background:${n.read?'transparent':'var(--primary-50)'};"><div class="fw-bold small">${esc(n.title)}</div><div class="text-muted" style="font-size:0.82rem;">${esc(n.message)}</div><div class="text-muted" style="font-size:0.72rem;">${esc(n.time)}</div></div>`).join('') || '<div class="p-3 small text-muted">No notifications</div>';
      }catch{}
    });
    const addSubjectForm=$('#addSubjectForm');
    if(addSubjectForm){
      addSubjectForm.addEventListener('submit', handleAddSubject);
      $('#addSubjectModal')?.addEventListener('hidden.bs.modal',()=>{
        addSubjectForm.reset(); addSubjectForm.querySelector('[name="id"]').value='';
        $('#subjectModalTitle').innerHTML='<i class="fa-solid fa-book me-2 text-primary"></i>Add Subject';
        $('#subjectSubmitButton').innerHTML='<i class="fa-solid fa-plus me-1"></i>Create Subject';
      });
    }
    const addAssignmentForm=$('#addAssignmentForm'); if(addAssignmentForm) addAssignmentForm.addEventListener('submit', handleAddAssignment);
    const submitForm=$('#submitForm'); if(submitForm) submitForm.addEventListener('submit', handleSubmitAssignment);
    const gradeForm=$('#gradeForm'); if(gradeForm) gradeForm.addEventListener('submit', handleGrade);
    const attForm=$('#attendanceForm'); if(attForm) attForm.addEventListener('submit', handleAttendance);

    window.switchSemester=(n)=>{
      State.semester=n;
      $$('.semester-tabs button').forEach(b=> b.classList.toggle('active', b.textContent.trim()===`Sem ${n}`));
      State.role==='teacher'? loadTeacherDashboard(): loadDashboard();
      if(State.view==='subjects') loadSubjectsView();
      if(State.view==='attendance') loadAttendanceView();
      if(State.view==='quiz') loadQuizView();
      if(State.view==='teacher-quizzes') loadTeacherQuizzes();
      if(State.view==='teacher-attendance') loadTeacherAttendance();
    };
    window.openSubject=openSubject;
    window.openSubmitModal=openSubmitModal;
    window.openGradeModal=openGradeModal;
    window.openAttendanceModal=openAttendanceModal;
    window.setView=setView;
    window.loadTeacherDashboard=loadTeacherDashboard;
    window.selectStudentFor=(sid,view)=>{
      State.teacherSelectedStudentId=sid;
      try{ State.teacherSelectedStudent=(window.__allStudents||[]).find(x=>x.id===sid)||null; }catch{}
      const sel=document.getElementById('teacherStudentSelect'); if(sel) sel.value=sid;
      const sw=document.getElementById('attStudentSwitch'); if(sw) sw.value=sid;
      setView(view);
    };

    try{
      const [studentOrTeacher, notifications]=await Promise.all([
        State.role==='student' ? API.getStudent(State.studentId) : API.getStudents({}).then(arr=>arr.find(x=>x.id===(State.currentUser?.id||501)) || arr[0]),
        API.getNotifications()
      ]);
      // header already updated via updateHeaderForUser, just badge
      const badge=$('#notifBadge'); if(badge){ badge.textContent = notifications.filter(n=>!n.read).length; if(notifications.filter(n=>!n.read).length===0) badge.classList.add('d-none'); }
      // also ensure State.teacherSelectedStudentId valid
      if(State.role==='teacher'){
        try{
          const allStudents = await API.getStudents({});
          // inject teacher student picker into topbar for quick switching and into views
          const topbar = document.querySelector('.topbar');
          if(topbar && !document.getElementById('teacherStudentPicker')){
            const wrap=document.createElement('div');
            wrap.id='teacherStudentPicker';
            wrap.className='d-none d-xl-flex align-items-center gap-2 ms-2 ps-2';
            wrap.style.borderLeft='1px solid var(--border)';
            wrap.innerHTML='<label class="small fw-bold text-muted" style="white-space:nowrap;"><i class=\"fa-solid fa-user-graduate me-1\"></i>Student:</label><select id="teacherStudentSelect" class="form-select form-select-sm" style="min-width:190px; border-radius:999px;">'+allStudents.map(s=>`<option value="${s.id}" ${s.id===State.teacherSelectedStudentId?'selected':''}>${s.name} - ${s.roll}</option>`).join('')+'</select>';
            topbar.querySelector('.topbar-actions')?.before(wrap);
            document.getElementById('teacherStudentSelect').addEventListener('change', (e)=>{
              State.teacherSelectedStudentId = parseInt(e.target.value);
              State.teacherSelectedStudent = allStudents.find(x=>x.id===State.teacherSelectedStudentId);
              toast(`Switched to ${State.teacherSelectedStudent.name} - attendance & marks views now show this student (edits persist)`, 'info');
              // refresh relevant views
              if(State.view==='teacher-attendance') loadTeacherAttendance();
              if(State.view==='teacher-quizzes') loadTeacherQuizzes();
              if(State.view==='teacher-internal') loadTeacherInternal();
              if($('#subjectDetailsView')) $('#subjectDetailsView').dataset.loadedId='';  // force re-render for new student
              if(State.view==='subject-details' && State.currentSubjectId) openSubject(State.currentSubjectId);
            });
          }
        }catch{}
      }
    }catch{}

    setView('dashboard');
    window.State=State; window.API=API;
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
