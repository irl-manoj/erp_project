/**
 * MCA Academic Dashboard - Dynamic Calculation Engine
 * All academic calculations are centralized here
 * No hard-coded values - everything is parameterized
 */

// Attendance: (attended / total) * 100
function calculateAttendance(attended, total) {
    if (!total || total === 0) return 0;
    return Math.round((attended / total) * 100 * 100) / 100;
}

function getAttendanceStatus(percentage) {
    const required = (typeof CONFIG !== 'undefined' ? CONFIG.REQUIRED_ATTENDANCE : 75);
    return {
        percentage,
        required,
        met: percentage >= required,
        label: percentage >= required ? "Requirement Met" : "Requirement Not Met",
        variant: percentage >= required ? "success" : "danger"
    };
}

// Future class projection for a minimum attendance threshold.
function getAttendanceProjection(attended, total, required = 75) {
    const a = Math.max(0, Math.floor(Number(attended) || 0));
    const t = Math.max(0, Math.floor(Number(total) || 0));
    const threshold = Number(required);
    if (!Number.isFinite(threshold) || threshold <= 0 || threshold >= 100) throw new RangeError('Attendance threshold must be between 0 and 100.');
    const percentage = t ? (a / t) * 100 : 0;
    if (percentage >= threshold) {
        const classesCanSkip = Math.max(0, Math.floor((a * 100 / threshold) - t + 1e-9));
        return { percentage, met: true, classesToAttend: 0, classesCanSkip };
    }
    const classesToAttend = Math.max(1, Math.ceil(((threshold * t / 100) - a) / (1 - threshold / 100) - 1e-9));
    return { percentage, met: false, classesToAttend, classesCanSkip: 0 };
}

// Best 2 of 3 quizzes - excludes lowest
function calculateBestTwoQuizzes(quizzes) {
    if (!quizzes || quizzes.length === 0) return { best: [], countedMarks: 0, maxMarks: 0, percentage: 0, excluded: [] };
    const sorted = [...quizzes].sort((a, b) => b.marksObtained - a.marksObtained);
    const best = sorted.slice(0, 2);
    const excluded = sorted.slice(2);
    const countedMarks = best.reduce((s, q) => s + (q.marksObtained || 0), 0);
    const maxMarks = best.length * 15; // 15 per quiz, 2 quizzes = 30
    const percentage = maxMarks ? Math.round((countedMarks / maxMarks) * 100 * 100) / 100 : 0;
    return { best, excluded, countedMarks, maxMarks, percentage };
}

// Theory total: best2 + internal + endsem
function calculateTheoryTotal(bestTwoMarks, internalMarks, endSemMarks) {
    return (bestTwoMarks || 0) + (internalMarks || 0) + (endSemMarks || 0);
}

function calculateTheoryPercentage(total) {
    return Math.round((total / 100) * 100 * 100) / 100;
}

// Internal total
function calculateInternalTotal(components) {
    if (!components || components.length === 0) return 0;
    return components.reduce((s, c) => s + (c.marks || 0), 0);
}
function calculateInternalMax(components) {
    if (!components || components.length === 0) return 0;
    return components.reduce((s, c) => s + (c.maxMarks || 0), 0);
}
function validateInternalTotal(components) {
    const total = calculateInternalMax(components);
    return { valid: total === 20, total, expected: 20, message: total === 20 ? "Valid (20/20)" : `Total is ${total}/20 - must equal 20` };
}

// Lab total: sum of all components
function calculateLabTotal(components) {
    // components: [{name, maxMarks, marks}]
    if (!components || components.length === 0) return { total: 0, max: 0, percentage: 0 };
    const total = components.reduce((s, c) => s + (c.marks || 0), 0);
    const max = components.reduce((s, c) => s + (c.maxMarks || 0), 0);
    const percentage = max ? Math.round((total / max) * 100 * 100) / 100 : 0;
    return { total, max, percentage };
}

// Grade point from marks (fallback if API doesn't provide)
function getGradePoint(marks) {
    const map = (typeof CONFIG !== 'undefined' && CONFIG.GRADE_POINT_MAP) ? CONFIG.GRADE_POINT_MAP : [];
    for (const g of map) {
        if (marks >= g.min && marks <= g.max) return g.point;
    }
    return 0;
}

// SGPA: Σ(credit × gradePoint) / Σ(credits)
function calculateSGPA(subjects) {
    // subjects: [{credits, marks, gradePoint?}]
    if (!subjects || subjects.length === 0) return { sgpa: 0, totalCredits: 0, totalPoints: 0 };
    let totalCredits = 0, totalPoints = 0;
    subjects.forEach(s => {
        const gp = (typeof s.gradePoint !== 'undefined' && s.gradePoint !== null) ? s.gradePoint : getGradePoint(s.marks || 0);
        const cr = s.credits || 0;
        totalCredits += cr;
        totalPoints += cr * gp;
    });
    const sgpa = totalCredits ? Math.round((totalPoints / totalCredits) * 100) / 100 : 0;
    return { sgpa, totalCredits, totalPoints: Math.round(totalPoints * 100) / 100 };
}

// CGPA: credit-weighted across semesters, NOT simple average
function calculateCGPA(semesterData) {
    // semesterData: [{sgpa, credits, totalPoints}]
    // OR [{subjects: [...]}, ...]
    if (!semesterData || semesterData.length === 0) return { cgpa: 0, totalCredits: 0, totalPoints: 0 };
    let totalCredits = 0, totalPoints = 0;
    semesterData.forEach(sem => {
        if (sem.subjects) {
            const r = calculateSGPA(sem.subjects);
            totalCredits += r.totalCredits;
            totalPoints += r.totalPoints;
        } else {
            totalCredits += sem.credits || 0;
            totalPoints += (sem.sgpa || 0) * (sem.credits || 0);
        }
    });
    const cgpa = totalCredits ? Math.round((totalPoints / totalCredits) * 100) / 100 : 0;
    return { cgpa, totalCredits, totalPoints: Math.round(totalPoints * 100) / 100 };
}

// Overall attendance across subjects
function calculateOverallAttendance(attendanceList) {
    if (!attendanceList || attendanceList.length === 0) return 0;
    let totalAttended = 0, totalClasses = 0;
    attendanceList.forEach(a => {
        totalAttended += a.attendedClasses || 0;
        totalClasses += a.totalClasses || 0;
    });
    return calculateAttendance(totalAttended, totalClasses);
}

// Utility: format marks display
function formatMarks(obtained, max) {
    return `${obtained}/${max}`;
}
function formatPercentage(p) {
    return `${p}%`;
}

// Validation helpers
const Validators = {
    quiz: (marks) => marks >= 0 && marks <= 15,
    internal: (marks, max) => marks >= 0 && marks <= max,
    endsem: (marks) => marks >= 0 && marks <= 50,
    attendance: (attended, total) => attended >= 0 && attended <= total && total >= 0,
    credits: (c) => c > 0 && c <= 10,
    lab: (marks, max) => marks >= 0 && marks <= max
};

// Export for Node / browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateAttendance, getAttendanceStatus, getAttendanceProjection, calculateBestTwoQuizzes,
        calculateTheoryTotal, calculateTheoryPercentage, calculateInternalTotal,
        calculateInternalMax, validateInternalTotal, calculateLabTotal,
        getGradePoint, calculateSGPA, calculateCGPA, calculateOverallAttendance,
        Validators
    };
}
