// Teacher module - extends app.js (ROLE='teacher')
const TeacherModule = {
  role: 'teacher',
  can: ['addSubject','editSubject','deleteSubject','setCredits','configureAssessments','createQuizzes','enterQuizMarks','configureInternal','enterEndSem','updateAttendance','createAssignments','evaluateSubmissions','uploadNotes','publishNotices']
};
if(typeof module !== 'undefined') module.exports = TeacherModule;
