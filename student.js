// Student module - extends app.js (kept for modularity per spec folder structure)
// All student-specific logic is handled in app.js via ROLE='student'
// This file provides legacy exports for compatibility
const StudentModule = {
  role: 'student',
  can: ['viewSubjects','viewAttendance','viewQuiz','viewInternal','viewEndSem','viewFinal','viewSGPA','viewCGPA','viewAssignments','submitAssignments','viewNotes','viewSyllabus','viewExams','viewNotices']
};
if(typeof module !== 'undefined') module.exports = StudentModule;
