/**
 * MCA Academic Dashboard - API Service Layer v2
 * BIT Mesra - Per-student attendance for all students, multi-user login via localStorage
 * Architecture: Frontend -> REST API -> JSON Data (mocked with localStorage persistence)
 */

const MockDB = (() => {
    const students = [
        { id: 101, name: "Manoj Kumar Das", roll: "MCA/2024/017", email: "manoj.das@bitmesra.ac.in", role: "student", semester: 1, avatar: "MD", program: "MCA", batch: "2024-26", cgpa: 8.33, sgpa: 8.33 },
        { id: 102, name: "Priya Sharma", roll: "MCA/2024/018", email: "priya.sharma@bitmesra.ac.in", role: "student", semester: 1, avatar: "PS", program: "MCA", batch: "2024-26", cgpa: 8.10, sgpa: 8.10 },
        { id: 103, name: "Aman Verma", roll: "MCA/2024/019", email: "aman.verma@bitmesra.ac.in", role: "student", semester: 1, avatar: "AV", program: "MCA", batch: "2024-26", cgpa: 7.85, sgpa: 7.85 },
        { id: 104, name: "Neha Singh", roll: "MCA/2024/020", email: "neha.singh@bitmesra.ac.in", role: "student", semester: 1, avatar: "NS", program: "MCA", batch: "2024-26", cgpa: 8.50, sgpa: 8.50 },
    ];
    const teachers = [
        { id: 501, name: "Prof. Rajesh Kumar", email: "rajesh.kumar@bitmesra.ac.in", role: "teacher", dept: "Computer Applications", avatar: "RK" },
        { id: 502, name: "Dr. Anjali Mehta", email: "anjali.mehta@bitmesra.ac.in", role: "teacher", dept: "Computer Applications", avatar: "AM" },
    ];
    const subjects = [
        { id: 1, name: "Database Management System", code: "MCA-DBMS", faculty: "Prof. Rajesh Kumar", semester: 1, credits: 4, type: "theory", color: "#c8102e" },
        { id: 2, name: "Data Structures & Algorithms", code: "MCA-DSA", faculty: "Dr. Anjali Mehta", semester: 1, credits: 4, type: "theory", color: "#9f1239" },
        { id: 3, name: "Java Programming", code: "MCA-JAVA", faculty: "Prof. Rajesh Kumar", semester: 1, credits: 3, type: "theory", color: "#b45309" },
        { id: 4, name: "Discrete Mathematics", code: "MCA-MATH", faculty: "Dr. Anjali Mehta", semester: 1, credits: 4, type: "theory", color: "#0891b2" },
        { id: 5, name: "DBMS Lab", code: "MCA-DBMS-LAB", faculty: "Prof. Rajesh Kumar", semester: 1, credits: 2, type: "lab", color: "#059669" },
        { id: 6, name: "Operating Systems", code: "MCA-OS", faculty: "Dr. Anjali Mehta", semester: 2, credits: 4, type: "theory", color: "#ea580c" },
        { id: 7, name: "Computer Networks", code: "MCA-CN", faculty: "Prof. Rajesh Kumar", semester: 2, credits: 4, type: "theory", color: "#1d4ed8" },
        { id: 8, name: "Java Lab", code: "MCA-JAVA-LAB", faculty: "Prof. Rajesh Kumar", semester: 2, credits: 2, type: "lab", color: "#0d9488" },
    ];

    // Base quiz data for student 101 - will replicate for other students with variation
    const baseQuizzes = [
        { subjectId: 1, title: "Quiz 1", maxMarks: 15, marksObtained: 12, date: "2024-08-15", description: "ER Model & Relational Algebra" },
        { subjectId: 1, title: "Quiz 2", maxMarks: 15, marksObtained: 10, date: "2024-09-10", description: "SQL & Normalization" },
        { subjectId: 1, title: "Quiz 3", maxMarks: 15, marksObtained: 14, date: "2024-10-05", description: "Transactions & Indexing" },
        { subjectId: 2, title: "Quiz 1", maxMarks: 15, marksObtained: 13, date: "2024-08-18", description: "Arrays & Linked Lists" },
        { subjectId: 2, title: "Quiz 2", maxMarks: 15, marksObtained: 11, date: "2024-09-12", description: "Stacks & Queues" },
        { subjectId: 2, title: "Quiz 3", maxMarks: 15, marksObtained: 9, date: "2024-10-08", description: "Trees & Graphs" },
        { subjectId: 3, title: "Quiz 1", maxMarks: 15, marksObtained: 14, date: "2024-08-20", description: "OOP Concepts" },
        { subjectId: 3, title: "Quiz 2", maxMarks: 15, marksObtained: 12, date: "2024-09-15", description: "Collections & Exceptions" },
        { subjectId: 3, title: "Quiz 3", maxMarks: 15, marksObtained: 13, date: "2024-10-10", description: "Multithreading & JDBC" },
        { subjectId: 4, title: "Quiz 1", maxMarks: 15, marksObtained: 10, date: "2024-08-22", description: "Set Theory" },
        { subjectId: 4, title: "Quiz 2", maxMarks: 15, marksObtained: 8, date: "2024-09-18", description: "Graph Theory" },
        { subjectId: 4, title: "Quiz 3", maxMarks: 15, marksObtained: 12, date: "2024-10-12", description: "Probability" },
        { subjectId: 5, title: "Quiz 1", maxMarks: 15, marksObtained: 13, date: "2024-09-05", description: "SQL Lab" },
        { subjectId: 5, title: "Quiz 2", maxMarks: 15, marksObtained: 14, date: "2024-10-15", description: "PL/SQL" },
    ];
    const quizzes = [];
    let qid = 1;
    students.forEach(stu => {
        baseQuizzes.forEach((b, idx) => {
            // Add variation per student: -2 to +2, clamped 0-15
            const variation = (stu.id % 3) - 1 + (idx % 2 === 0 ? 1 : -1);
            let marks = Math.max(0, Math.min(15, b.marksObtained + variation + (stu.id === 102 ? 1 : stu.id === 104 ? -1 : 0)));
            // For Priya (102) slightly higher, Aman (103) medium, Neha (104) high
            if (stu.id === 104) marks = Math.min(15, marks + 1);
            quizzes.push({ id: qid++, studentId: stu.id, subjectId: b.subjectId, title: b.title, maxMarks: b.maxMarks, marksObtained: marks, date: b.date, description: b.description });
        });
    });

    // Internals per student per theory subject
    const baseInternals = [
        { subjectId: 1, components: [{ name: "Assignment", maxMarks: 5, marks: 5 }, { name: "Presentation", maxMarks: 5, marks: 4 }, { name: "Class Test", maxMarks: 10, marks: 8 }] },
        { subjectId: 2, components: [{ name: "Assignment", maxMarks: 10, marks: 8 }, { name: "Presentation", maxMarks: 5, marks: 4 }, { name: "Homework", maxMarks: 5, marks: 5 }] },
        { subjectId: 3, components: [{ name: "Project", maxMarks: 10, marks: 9 }, { name: "Viva", maxMarks: 5, marks: 4 }, { name: "Assignment", maxMarks: 5, marks: 5 }] },
        { subjectId: 4, components: [{ name: "Class Test", maxMarks: 10, marks: 7 }, { name: "Assignment", maxMarks: 5, marks: 4 }, { name: "Presentation", maxMarks: 5, marks: 3 }] },
    ];
    const internals = [];
    students.forEach(stu => {
        baseInternals.forEach(b => {
            const comps = b.components.map(c => {
                let m = c.marks;
                if (stu.id === 102) m = Math.min(c.maxMarks, m + 1);
                if (stu.id === 103) m = Math.max(0, m - 1);
                if (stu.id === 104) m = Math.min(c.maxMarks, m + 1);
                return { ...c, marks: m };
            });
            internals.push({ subjectId: b.subjectId, studentId: stu.id, total: 20, components: comps });
        });
    });

    const baseEndSems = [
        { subjectId: 1, marksObtained: 42 },
        { subjectId: 2, marksObtained: 38 },
        { subjectId: 3, marksObtained: 44 },
        { subjectId: 4, marksObtained: 35 },
    ];
    const endSems = [];
    students.forEach(stu => {
        baseEndSems.forEach(b => {
            let m = b.marksObtained + (stu.id === 102 ? 2 : stu.id === 103 ? -2 : stu.id === 104 ? 3 : 0);
            m = Math.max(0, Math.min(50, m));
            endSems.push({ subjectId: b.subjectId, studentId: stu.id, maxMarks: 50, marksObtained: m });
        });
    });

    const baseLabMarks = [
        { subjectId: 5, components: [{ name: "Lab Assignment", maxMarks: 20, marks: 18 }, { name: "EPP / Major Test", maxMarks: 30, marks: 26 }, { name: "Quiz 1", maxMarks: 15, marks: 13 }, { name: "Quiz 2", maxMarks: 15, marks: 14 }, { name: "Daily Evaluation", maxMarks: 20, marks: 17 }] },
        { subjectId: 8, components: [{ name: "Lab Assignment", maxMarks: 20, marks: 16 }, { name: "EPP / Major Test", maxMarks: 30, marks: 24 }, { name: "Quiz 1", maxMarks: 15, marks: 12 }, { name: "Quiz 2", maxMarks: 15, marks: 13 }, { name: "Daily Evaluation", maxMarks: 20, marks: 15 }] },
    ];
    const labMarks = [];
    students.forEach(stu => {
        baseLabMarks.forEach(b => {
            const comps = b.components.map(c => {
                let m = c.marks + (stu.id === 102 ? 1 : stu.id === 103 ? -1 : stu.id === 104 ? 1 : 0);
                m = Math.max(0, Math.min(c.maxMarks, m));
                return { ...c, marks: m };
            });
            labMarks.push({ subjectId: b.subjectId, studentId: stu.id, components: comps });
        });
    });

    // Attendance: PER STUDENT PER SUBJECT (32 records)
    const attendance = [];
    students.forEach(stu => {
        subjects.forEach(sub => {
            let total = sub.type === 'lab' ? 22 + (sub.id % 3) * 2 : 36 + (sub.id % 4) * 2;
            // Generate attended with 68-96% range, deterministic per student
            let perc = 0;
            if (stu.id === 101) perc = [85, 78.9, 91.6, 71.4, 91.6, 90, 83.3, 87.5][sub.id - 1] || 82;
            else if (stu.id === 102) perc = 88 + (sub.id % 3) - 1; // Priya high
            else if (stu.id === 103) perc = 72 + (sub.id % 5); // Aman lower, some below 75
            else if (stu.id === 104) perc = 92 - (sub.id % 2); // Neha highest
            perc = Math.max(60, Math.min(98, perc + (Math.random() * 4 - 2)));
            let attended = Math.round((perc / 100) * total);
            if (stu.id === 103 && sub.id === 4) attended = Math.round(total * 0.68); // intentionally low for demo
            if (stu.id === 103 && sub.id === 2) attended = Math.round(total * 0.71);
            attendance.push({ subjectId: sub.id, studentId: stu.id, totalClasses: total, attendedClasses: attended });
        });
    });

    const assignments = [
        { id: 1, subjectId: 1, title: "DBMS Normalization Assignment", description: "Solve 3NF and BCNF problems with examples. Submit as PDF.", maxMarks: 20, deadline: "2024-09-30", createdAt: "2024-09-15", fileUrl: "#", status: "checked", submissionsCount: 42 },
        { id: 2, subjectId: 1, title: "ER Diagram Case Study", description: "Design ER diagram for Hospital Management System.", maxMarks: 10, deadline: "2024-10-20", createdAt: "2024-10-02", fileUrl: "#", status: "pending", submissionsCount: 28 },
        { id: 3, subjectId: 2, title: "Implement BST & AVL", description: "Implement Binary Search Tree and AVL rotation in Java.", maxMarks: 15, deadline: "2024-10-25", createdAt: "2024-10-05", fileUrl: "#", status: "submitted", submissionsCount: 35 },
        { id: 4, subjectId: 3, title: "Java Collections Project", description: "Build inventory system using Collections framework.", maxMarks: 20, deadline: "2024-09-28", createdAt: "2024-09-10", fileUrl: "#", status: "late", submissionsCount: 18 },
        { id: 5, subjectId: 5, title: "DBMS Lab - Query Assignment", description: "Write 15 SQL queries on Student DB.", maxMarks: 20, deadline: "2024-10-18", createdAt: "2024-10-01", fileUrl: "#", status: "not_started", submissionsCount: 31 },
        { id: 6, subjectId: 4, title: "Graph Theory Problems", description: "Solve 10 problems on Euler & Hamiltonian graphs.", maxMarks: 10, deadline: "2024-11-05", createdAt: "2024-10-20", fileUrl: "#", status: "pending", submissionsCount: 22 },
    ];

    const submissions = [
        { id: 1, assignmentId: 1, studentId: 101, fileName: "manoj_normalization.pdf", submittedAt: "2024-09-28", status: "checked", marks: 18, feedback: "Excellent work! Well explained 3NF.", maxMarks: 20 },
        { id: 2, assignmentId: 3, studentId: 101, fileName: "BST_AVL_Manoj.zip", submittedAt: "2024-10-22", status: "submitted", marks: null, feedback: null, maxMarks: 15 },
        { id: 3, assignmentId: 4, studentId: 101, fileName: "inventory_system.zip", submittedAt: "2024-09-30", status: "late", marks: 12, feedback: "Good implementation, late by 2 days.", maxMarks: 20 },
        { id: 4, assignmentId: 1, studentId: 102, fileName: "priya_normalization.pdf", submittedAt: "2024-09-29", status: "checked", marks: 19, feedback: "Outstanding!", maxMarks: 20 },
        { id: 5, assignmentId: 2, studentId: 103, fileName: "aman_er.pdf", submittedAt: "2024-10-18", status: "submitted", marks: null, feedback: null, maxMarks: 10 },
        { id: 6, assignmentId: 1, studentId: 104, fileName: "neha_normalization.pdf", submittedAt: "2024-09-27", status: "checked", marks: 20, feedback: "Perfect!", maxMarks: 20 },
    ];

    const exams = [
        { id: 1, subjectId: 1, title: "End Semester Examination", date: "2024-11-20", time: "10:00 AM - 1:00 PM", venue: "Hall A", maxMarks: 50, type: "theory", status: "upcoming" },
        { id: 2, subjectId: 2, title: "End Semester Examination", date: "2024-11-22", time: "10:00 AM - 1:00 PM", venue: "Hall A", maxMarks: 50, type: "theory", status: "upcoming" },
        { id: 3, subjectId: 5, title: "Lab Practical Examination", date: "2024-11-15", time: "9:00 AM - 12:00 PM", venue: "Lab 1", maxMarks: 100, type: "lab", status: "upcoming" },
        { id: 4, subjectId: 3, title: "Internal Class Test", date: "2024-10-28", time: "2:00 PM - 3:30 PM", venue: "Room 201", maxMarks: 20, type: "internal", status: "completed" },
    ];
    const notices = [
        { id: 1, title: "Quiz 3 Marks Published", content: "Quiz 3 marks for all Semester 1 subjects have been published. Check Quiz & Marks section.", date: "2024-10-16", category: "Marks", priority: "high", author: "Prof. Rajesh Kumar" },
        { id: 2, title: "Assignment Deadline Extended", content: "DBMS ER Diagram assignment deadline extended to 25 Oct, 2024 due to technical fest.", date: "2024-10-14", category: "Assignment", priority: "medium", author: "Dr. Anjali Mehta" },
        { id: 3, title: "Lab Test Scheduled", content: "DBMS Lab EPP scheduled on 5 Nov, 2024. Syllabus: SQL, PL/SQL, Triggers.", date: "2024-10-12", category: "Exam", priority: "high", author: "Prof. Rajesh Kumar" },
        { id: 4, title: "End-Sem Timetable Released", content: "End Semester timetable for Nov 2024 released. Available in Exams section.", date: "2024-10-10", category: "Exam", priority: "high", author: "Academic Office, BIT Mesra" },
        { id: 5, title: "Diwali Holidays", content: "College will remain closed from 30 Oct to 3 Nov for Diwali. Happy Diwali!", date: "2024-10-08", category: "General", priority: "low", author: "Admin, BIT Mesra" },
    ];
    const notes = [
        { id: 1, subjectId: 1, title: "Module 1 - Introduction to DBMS", module: "Module 1", description: "Database concepts, architecture, data models", fileUrl: "#", fileType: "pdf", size: "2.4 MB", date: "2024-08-10", pages: 42 },
        { id: 2, subjectId: 1, title: "Module 2 - ER Model & Relational Model", module: "Module 2", description: "ER diagrams, relational algebra, mapping", fileUrl: "#", fileType: "pdf", size: "3.1 MB", date: "2024-08-25", pages: 58 },
        { id: 3, subjectId: 1, title: "SQL Complete Notes", module: "Module 3", description: "DDL, DML, DCL, TCL with examples", fileUrl: "#", fileType: "pdf", size: "4.2 MB", date: "2024-09-05", pages: 72 },
        { id: 4, subjectId: 2, title: "Trees & Graphs - DSA", module: "Module 4", description: "BST, AVL, Graph traversals, shortest path", fileUrl: "#", fileType: "ppt", size: "5.8 MB", date: "2024-09-12", pages: 64 },
        { id: 5, subjectId: 3, title: "Java OOP Concepts", module: "Module 1", description: "Class, objects, inheritance, polymorphism", fileUrl: "#", fileType: "pdf", size: "2.9 MB", date: "2024-08-12", pages: 48 },
        { id: 6, subjectId: 5, title: "DBMS Lab Manual", module: "Lab Manual", description: "Complete lab experiments with queries", fileUrl: "#", fileType: "pdf", size: "6.5 MB", date: "2024-08-15", pages: 96 },
    ];
    const syllabus = [
        { subjectId: 1, modules: [{ id: 1, title: "Module 1: Database Concepts", topics: ["Introduction", "DBMS vs File System", "Three Schema Architecture", "Data Models"], completion: 100 }, { id: 2, title: "Module 2: ER Model & Relational Model", topics: ["ER Diagram", "Keys", "Relational Algebra", "Mapping"], completion: 100 }, { id: 3, title: "Module 3: SQL", topics: ["DDL/DML", "Joins", "Subqueries", "Views", "Indexing"], completion: 75 }, { id: 4, title: "Module 4: Normalization & Transactions", topics: ["1NF, 2NF, 3NF, BCNF", "Transactions", "Concurrency", "Recovery"], completion: 40 }] },
        { subjectId: 2, modules: [{ id: 1, title: "Module 1: Arrays & Linked Lists", topics: ["Arrays", "Singly/Doubly Linked List", "Applications"], completion: 100 }, { id: 2, title: "Module 2: Stacks & Queues", topics: ["Stack", "Queue", "Deque", "Applications"], completion: 90 }, { id: 3, title: "Module 3: Trees", topics: ["BST", "AVL", "Heap", "Traversals"], completion: 60 }, { id: 4, title: "Module 4: Graphs & Algorithms", topics: ["BFS/DFS", "Dijkstra", "Sorting", "Searching"], completion: 30 }] }
    ];
    const notifications = [
        { id: 1, title: "New Assignment: ER Diagram", message: "Prof. Rajesh Kumar posted a new assignment for DBMS", time: "2 hours ago", read: false, type: "assignment" },
        { id: 2, title: "Quiz Marks Updated", message: "Your Quiz 3 marks for DBMS have been published (14/15)", time: "5 hours ago", read: false, type: "marks" },
        { id: 3, title: "Attendance Alert", message: "Mathematics attendance at 71% - below 75% requirement", time: "1 day ago", read: false, type: "attendance" },
        { id: 4, title: "Lab Submission Graded", message: "DBMS Normalization assignment graded: 18/20", time: "2 days ago", read: true, type: "submission" },
    ];
    let errorRate = 0;

    // --- localStorage persistence for multi-user ---
    const STORAGE_KEY = 'mca_db_v2';
    function persist() {
        try {
            if (typeof localStorage === 'undefined') return;
            const data = { subjects, quizzes, internals, endSems, labMarks, attendance, assignments, submissions };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) { }
    }
    function loadPersisted() {
        try {
            if (typeof localStorage === 'undefined') return;
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const data = JSON.parse(raw);
            // Merge persisted over defaults (allow new subjects to persist, but keep new students if added)
            if (data.subjects) { subjects.length = 0; data.subjects.forEach(s => subjects.push(s)); }
            if (data.quizzes) { quizzes.length = 0; data.quizzes.forEach(q => quizzes.push(q)); }
            if (data.internals) { internals.length = 0; data.internals.forEach(x => internals.push(x)); }
            if (data.endSems) { endSems.length = 0; data.endSems.forEach(x => endSems.push(x)); }
            if (data.labMarks) { labMarks.length = 0; data.labMarks.forEach(x => labMarks.push(x)); }
            if (data.attendance) { attendance.length = 0; data.attendance.forEach(x => attendance.push(x)); }
            if (data.assignments) { assignments.length = 0; data.assignments.forEach(x => assignments.push(x)); }
            if (data.submissions) { submissions.length = 0; data.submissions.forEach(x => submissions.push(x)); }
        } catch (e) { }
    }
    loadPersisted();

    return {
        students, teachers, subjects, quizzes, internals, endSems, labMarks, attendance, assignments, submissions, exams, notices, notes, syllabus, notifications,
        persist,
        get errorRate() { return errorRate; }, setErrorRate(v) { errorRate = v; }
    };
})();

function simulateFetch(data, options = {}) {
    const delay = (typeof CONFIG !== 'undefined' ? CONFIG.MOCK_DELAY : 400);
    const shouldFail = Math.random() < MockDB.errorRate;
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (shouldFail && !options.noFail) reject({ status: 500, message: "Network error: Unable to reach API. Please try again." });
            else resolve(JSON.parse(JSON.stringify(data)));
        }, delay + Math.random() * 300);
    });
}

const API = {
    _delay: () => new Promise(r => setTimeout(r, CONFIG.MOCK_DELAY)),
    // Auth helpers (localStorage based, no backend)
    login: (userId) => {
        let user = MockDB.students.find(x => x.id == userId) || MockDB.teachers.find(x => x.id == userId);
        if (!user) return Promise.reject({ status: 404, message: "User not found" });
        try { if (typeof localStorage !== 'undefined') localStorage.setItem('mca_current_user', JSON.stringify(user)); } catch {}
        return simulateFetch(user, { noFail: true });
    },
    getCurrentUser: () => {
        try {
            if (typeof localStorage === 'undefined') return null;
            const raw = localStorage.getItem('mca_current_user');
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    },
    logout: () => {
        try { if (typeof localStorage !== 'undefined') localStorage.removeItem('mca_current_user'); } catch {}
        return Promise.resolve({ success: true });
    },
    // Fake auth: match any seeded account by email / roll / name (demo password)
    authenticate: (identifier, role, password) => {
        const q = String(identifier || '').trim().toLowerCase();
        const pwd = String(password || '').trim();
        if (!q) return Promise.reject({ status: 400, message: 'Enter your email address or student roll number.' });
        if (pwd.length < 1) return Promise.reject({ status: 400, message: 'Enter your password.' });
        const pool = role === 'teacher' ? MockDB.teachers : MockDB.students;
        const u = pool.find(x => {
            const em = (x.email || '').toLowerCase(), nm = (x.name || '').toLowerCase();
            const words = nm.replace(/^(prof|dr|mr|ms|mrs)\.?\s+/i, '').split(/[\s.]+/).filter(Boolean);
            return em === q || (x.roll || '').toLowerCase() === q || nm === q ||
                   em.split('@')[0] === q || em.split('@')[0].split('.')[0] === q ||
                   words[0] === q || words[words.length - 1] === q;
        });
        if (!u) return Promise.reject({ status: 404, message: 'Account not found. Choose one of the listed demo accounts or check your credentials.' });
        try { if (typeof localStorage !== 'undefined') localStorage.setItem('mca_current_user', JSON.stringify(u)); } catch {}
        return simulateFetch(u, { noFail: true });
    },
    getStudent: (id) => {
        const s = MockDB.students.find(x => x.id == id) || MockDB.students[0];
        if (!s) return simulateFetch(null).then(() => Promise.reject({ status: 404, message: "Student not found" }));
        return simulateFetch(s);
    },
    getStudents: (filters = {}) => {
        let list = [...MockDB.students];
        if (filters.search) {
            const q = filters.search.toLowerCase();
            list = list.filter(s => s.name.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q));
        }
        return simulateFetch(list);
    },
    getTeachers: () => simulateFetch([...MockDB.teachers]),
    getSubjects: (filters = {}) => {
        let list = [...MockDB.subjects];
        if (filters.semester) list = list.filter(s => s.semester == filters.semester);
        if (filters.type) list = list.filter(s => s.type === filters.type);
        if (filters.search) {
            const q = filters.search.toLowerCase();
            list = list.filter(s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
        }
        return simulateFetch(list);
    },
    getSubject: (id) => {
        const s = MockDB.subjects.find(x => x.id == id);
        if (!s) return simulateFetch(null).then(() => Promise.reject({ status: 404, message: "Subject not found" }));
        return simulateFetch(s);
    },
    createSubject: (payload) => {
        if (!payload.name || !payload.code) return Promise.reject({ status: 400, message: "Name and code are required" });
        if (payload.credits <= 0) return Promise.reject({ status: 400, message: "Credits must be positive" });
        const newSub = { id: Date.now(), ...payload };
        MockDB.subjects.push(newSub);
        // Also create attendance records for all students for new subject
        MockDB.students.forEach(stu => {
            const total = newSub.type === 'lab' ? 24 : 40;
            const perc = 80 + Math.floor(Math.random() * 10);
            const attended = Math.round((perc / 100) * total);
            MockDB.attendance.push({ subjectId: newSub.id, studentId: stu.id, totalClasses: total, attendedClasses: attended });
        });
        MockDB.persist();
        return simulateFetch(newSub, { noFail: true });
    },
    updateSubject: (id, payload) => {
        const idx = MockDB.subjects.findIndex(x => x.id == id);
        if (idx === -1) return Promise.reject({ status: 404, message: "Subject not found" });
        MockDB.subjects[idx] = { ...MockDB.subjects[idx], ...payload };
        MockDB.persist();
        return simulateFetch(MockDB.subjects[idx], { noFail: true });
    },
    deleteSubject: (id) => {
        const idx = MockDB.subjects.findIndex(x => x.id == id);
        if (idx === -1) return Promise.reject({ status: 404, message: "Subject not found" });
        MockDB.subjects.splice(idx, 1);
        // cleanup related records
        MockDB.attendance = MockDB.attendance.filter(a => a.subjectId !== id);
        // need to reassign filtered to persisted - but our persist saves reference, so update MockDB.attendance array in place
        // For simplicity, persist will save current arrays
        MockDB.persist();
        return simulateFetch({ success: true }, { noFail: true });
    },
    getAttendance: (filters = {}) => {
        let list = [...MockDB.attendance];
        if (filters.studentId) list = list.filter(a => a.studentId == filters.studentId);
        if (filters.subjectId) list = list.filter(a => a.subjectId == filters.subjectId);
        list = list.map(a => ({ ...a, percentage: Math.round((a.attendedClasses / a.totalClasses) * 100 * 100) / 100 }));
        return simulateFetch(list);
    },
    updateAttendance: (subjectId, studentId, payload) => {
        const rec = MockDB.attendance.find(a => a.subjectId == subjectId && a.studentId == studentId);
        if (!rec) {
            // create if not exists (for new students/subjects)
            MockDB.attendance.push({ subjectId, studentId, totalClasses: payload.totalClasses, attendedClasses: payload.attendedClasses });
            MockDB.persist();
            return simulateFetch({ subjectId, studentId, ...payload }, { noFail: true });
        }
        if (payload.attendedClasses > payload.totalClasses) return Promise.reject({ status: 400, message: "Attended cannot exceed total classes" });
        Object.assign(rec, payload);
        MockDB.persist();
        return simulateFetch(rec, { noFail: true });
    },
    getQuizzes: (filters = {}) => {
        let list = [...MockDB.quizzes];
        if (filters.studentId) list = list.filter(q => q.studentId == filters.studentId);
        if (filters.subjectId) list = list.filter(q => q.subjectId == filters.subjectId);
        return simulateFetch(list);
    },
    getAssessments: function (filters) { return this.getQuizzes(filters); },
    updateQuiz: (id, payload) => {
        const q = MockDB.quizzes.find(x => x.id == id);
        if (!q) return Promise.reject({ status: 404, message: "Quiz not found" });
        if (payload.marksObtained !== undefined && payload.marksObtained > (payload.maxMarks || q.maxMarks)) return Promise.reject({ status: 400, message: "Marks exceed maximum" });
        if (payload.marksObtained !== undefined && payload.marksObtained < 0) return Promise.reject({ status: 400, message: "Marks cannot be negative" });
        Object.assign(q, payload);
        MockDB.persist();
        return simulateFetch(q, { noFail: true });
    },
    getInternals: (filters = {}) => {
        let list = [...MockDB.internals];
        if (filters.studentId) list = list.filter(x => x.studentId == filters.studentId);
        if (filters.subjectId) list = list.filter(x => x.subjectId == filters.subjectId);
        return simulateFetch(list);
    },
    getInternal: (subjectId, studentId) => {
        const r = MockDB.internals.find(x => x.subjectId == subjectId && x.studentId == studentId);
        return simulateFetch(r || null);
    },
    updateInternal: (subjectId, studentId, components) => {
        const total = components.reduce((s, c) => s + c.maxMarks, 0);
        if (total !== 20) return Promise.reject({ status: 400, message: `Internal total must be 20, got ${total}` });
        let rec = MockDB.internals.find(x => x.subjectId == subjectId && x.studentId == studentId);
        if (!rec) {
            rec = { subjectId, studentId, total: 20, components };
            MockDB.internals.push(rec);
        } else rec.components = components;
        MockDB.persist();
        return simulateFetch(rec, { noFail: true });
    },
    getEndSems: (filters = {}) => {
        let list = [...MockDB.endSems];
        if (filters.studentId) list = list.filter(x => x.studentId == filters.studentId);
        if (filters.subjectId) list = list.filter(x => x.subjectId == filters.subjectId);
        return simulateFetch(list);
    },
    getEndSem: (subjectId, studentId) => {
        const r = MockDB.endSems.find(x => x.subjectId == subjectId && x.studentId == studentId);
        return simulateFetch(r || null);
    },
    updateEndSem: (subjectId, studentId, marksObtained) => {
        if (marksObtained < 0 || marksObtained > 50) return Promise.reject({ status: 400, message: "End sem marks must be 0-50" });
        let rec = MockDB.endSems.find(x => x.subjectId == subjectId && x.studentId == studentId);
        if (!rec) { rec = { subjectId, studentId, maxMarks: 50, marksObtained }; MockDB.endSems.push(rec); }
        else rec.marksObtained = marksObtained;
        MockDB.persist();
        return simulateFetch(rec, { noFail: true });
    },
    getLabMarks: (filters = {}) => {
        let list = [...MockDB.labMarks];
        if (filters.studentId) list = list.filter(x => x.studentId == filters.studentId);
        if (filters.subjectId) list = list.filter(x => x.subjectId == filters.subjectId);
        return simulateFetch(list);
    },
    updateLabMarks: (subjectId, studentId, components) => {
        let rec = MockDB.labMarks.find(x => x.subjectId == subjectId && x.studentId == studentId);
        if (!rec) { rec = { subjectId, studentId, components }; MockDB.labMarks.push(rec); }
        else rec.components = components;
        MockDB.persist();
        return simulateFetch(rec, { noFail: true });
    },
    getAssignments: (filters = {}) => {
        let list = [...MockDB.assignments];
        if (filters.subjectId) list = list.filter(a => a.subjectId == filters.subjectId);
        if (filters.search) {
            const q = filters.search.toLowerCase();
            list = list.filter(a => a.title.toLowerCase().includes(q));
        }
        return simulateFetch(list);
    },
    createAssignment: (payload) => {
        const n = { id: Date.now(), submissionsCount: 0, createdAt: new Date().toISOString().split('T')[0], status: "pending", ...payload };
        MockDB.assignments.push(n);
        MockDB.persist();
        return simulateFetch(n, { noFail: true });
    },
    getSubmissions: (filters = {}) => {
        let list = [...MockDB.submissions];
        if (filters.studentId) list = list.filter(s => s.studentId == filters.studentId);
        if (filters.assignmentId) list = list.filter(s => s.assignmentId == filters.assignmentId);
        return simulateFetch(list);
    },
    createSubmission: (payload) => {
        const n = { id: Date.now(), submittedAt: new Date().toISOString().split('T')[0], status: "submitted", marks: null, feedback: null, ...payload };
        MockDB.submissions.push(n);
        const assign = MockDB.assignments.find(a => a.id == payload.assignmentId);
        if (assign) assign.submissionsCount++;
        MockDB.persist();
        return simulateFetch(n, { noFail: true });
    },
    gradeSubmission: (id, marks, feedback) => {
        const s = MockDB.submissions.find(x => x.id == id);
        if (!s) return Promise.reject({ status: 404, message: "Submission not found" });
        s.marks = marks; s.feedback = feedback; s.status = "checked";
        MockDB.persist();
        return simulateFetch(s, { noFail: true });
    },
    getExams: (filters = {}) => {
        let list = [...MockDB.exams];
        if (filters.subjectId) list = list.filter(e => e.subjectId == filters.subjectId);
        return simulateFetch(list);
    },
    getNotices: (filters = {}) => {
        let list = [...MockDB.notices];
        if (filters.search) {
            const q = filters.search.toLowerCase();
            list = list.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
        }
        if (filters.category) list = list.filter(n => n.category === filters.category);
        return simulateFetch(list);
    },
    getNotes: (filters = {}) => {
        let list = [...MockDB.notes];
        if (filters.subjectId) list = list.filter(n => n.subjectId == filters.subjectId);
        if (filters.search) {
            const q = filters.search.toLowerCase();
            list = list.filter(n => n.title.toLowerCase().includes(q));
        }
        return simulateFetch(list);
    },
    getSyllabus: (subjectId) => {
        const s = MockDB.syllabus.find(x => x.subjectId == subjectId);
        return simulateFetch(s || { subjectId, modules: [] });
    },
    getNotifications: () => simulateFetch([...MockDB.notifications]),
    getProgress: (studentId) => {
        return simulateFetch({
            overall: 68,
            subjects: MockDB.subjects.slice(0, 5).map(s => ({ subjectId: s.id, name: s.name, completion: 40 + Math.floor(Math.random() * 50) }))
        });
    },
    getMarks: async (filters = {}) => {
        const [quizzes, internals, endsems, labs] = await Promise.all([
            API.getQuizzes(filters), API.getInternals(filters), API.getEndSems(filters), API.getLabMarks(filters)
        ]);
        return { quizzes, internals, endsems, labs };
    },
    search: async (query, studentId) => {
        const q = query.toLowerCase();
        const [subjects, assignments, notes, notices] = await Promise.all([
            API.getSubjects({ search: q }),
            API.getAssignments({ search: q }),
            API.getNotes({ search: q }),
            API.getNotices({ search: q })
        ]);
        return { subjects, assignments, notes, notices };
    }
};
API.getAssessments = API.getAssessments;
API._mock = MockDB;
if (typeof module !== 'undefined' && module.exports) module.exports = { API, MockDB, simulateFetch };
