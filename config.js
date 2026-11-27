/**
 * MCA Academic Dashboard - Configuration
 * BIT Mesra - Centralized API configuration
 */
const CONFIG = {
    API_BASE_URL: "https://api.mca-dashboard.edu/api",
    API_VERSION: "v1",
    APP_NAME: "MCA Academic Dashboard",
    COLLEGE_NAME: "Birla Institute of Technology, Mesra",
    COLLEGE_SHORT: "BIT Mesra",
    DEPT: "Department of Computer Applications",
    GRADE_POINT_MAP: [
        { min: 90, max: 100, point: 10, label: "O" },
        { min: 80, max: 89, point: 9,  label: "A+" },
        { min: 70, max: 79, point: 8,  label: "A" },
        { min: 60, max: 69, point: 7,  label: "B+" },
        { min: 50, max: 59, point: 6,  label: "B" },
        { min: 40, max: 49, point: 5,  label: "C" },
        { min: 0,  max: 39, point: 0,  label: "F" }
    ],
    REQUIRED_ATTENDANCE: 75,
    THEORY_MAX: 100,
    QUIZ_MAX: 15,
    INTERNAL_MAX: 20,
    ENDSEM_MAX: 50,
    SEMESTERS: [1, 2, 3, 4],
    MOCK_DELAY: 400,
    ENABLE_MOCK_API: true
};
if (typeof module !== 'undefined' && module.exports) module.exports = CONFIG;
