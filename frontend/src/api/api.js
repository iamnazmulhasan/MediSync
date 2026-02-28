/* src/api/api.js */
import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:8000/api';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const authAPI = {
    login: (email, password) => api.post('/auth/login/', { email, password }),
    checkProfile: (type, email) => api.get(`/profile/available-profile/?type=${type}&email=${email}`),
    createProfile: (type, data) => api.post('/profile/', { type, data }),
    updateProfile: (payload) => api.patch('/profile/update/', payload),
    changePassword: (payload) => api.post('/auth/change-password/', payload),
    getDoctorTypes: () => api.get('/core/doctor-types/'),
    sendMail: (payload) => axios.post('http://127.0.0.1:8000/mail/send-mail/', payload, {
        headers: { 'Content-Type': 'application/json' }
    }),
    businessLogin: (type, login, password) => api.post(`/${type}/login/`, { login, password }),
};

export const doctorAPI = {
    getProfileIds: (personId) => api.get(`/profile/profiles/by-person/${personId}/`),
    getAvailability: (doctorId) => api.get(`/profile/doctors/${doctorId}/availabilities/bulk/`),
    updateAvailability: (doctorId, availabilities) => api.put(`/profile/doctors/${doctorId}/availabilities/bulk/`, { availabilities }),
    getOffDays: (doctorId) => api.get(`/profile/doctor/offday/?doctor_id=${doctorId}`),
    createOffDay: (data) => api.post('/profile/doctor/offday/', data),
    deleteOffDay: (offDayId) => api.delete(`/profile/doctor/offday/${offDayId}/`),
    getDoctorDetails: (payload) => api.post('/profile/doctor/details/', payload),
};

export const appointmentAPI = {
    getAvailableDoctors: (deptId, date) => api.get(`/appointment/doctors/available/?department=${deptId}&date=${date}`),
    getExpectedTime: (doctorId, date) => api.get(`/appointment/get-expected-time/?doctor_id=${doctorId}&date=${date}`),
    getPreviousPatients: (doctorId) => api.get(`/appointment/doctors/${doctorId}/previous-patients/`),
    makeAppointment: (payload) => api.post('/appointment/make-appointment/', payload),
    getPatientUpcoming: (personId) => api.get(`/appointment/patient/upcoming/?person_id=${personId}`),
    getPatientPrevious: (personId) => api.get(`/appointment/patient/previous/?person_id=${personId}`),
    getDoctorAppointments: (doctorId, date) => api.get(`/appointment/doctors/${doctorId}/appointments/?date=${date}`),
    updateAppointment: (id, payload) => api.patch(`/appointment/${id}/`, payload),
    // --- NEW: Added getAppointmentInfo ---
    getAppointmentInfo: (appointmentId) => api.get(`/appointment/${appointmentId}/info/`),
};

export const prescriptionAPI = {
    getPrechecked: () => api.get('/prescription/prechecked/'),
    createPrechecked: (payload) => api.post('/prescription/prechecked/', payload),
    getPrecheckedByAppointment: (appointmentId) => api.get(`/prescription/prechecked/by-appointment/${appointmentId}/`),
    updatePrechecked: (appointmentId, payload) => api.patch(`/prescription/appointment/${appointmentId}/prechecked/update/`, payload),
    createPrescription: (payload) => api.post('/prescription/', payload),
    
    // --- ADD THESE TWO LINES ---
    getPrescription: (id) => api.get(`/prescription/${id}/`),
    updatePrescription: (id, payload) => api.patch(`/prescription/${id}/`, payload),
    getPreviousPrescriptions: (doctorId) => api.get(`/prescription/doctors/${doctorId}/previous-prescriptions/`),
    getPatientPreviousPrescriptions: (patientId) => api.get(`/prescription/patients/${patientId}/previous-prescriptions/`),
    getActiveMedicinesToday: (patientId) => api.get(`/prescription/patients/${patientId}/active-medicines-today/`),
    getPatientPrescriptions: (patientId) => api.get(`/prescription/patients/${patientId}/prescriptions/`),
    getPrescriptionMedicines: (prescriptionId) => api.get(`/prescription/${prescriptionId}/medicines/`),
};

export const patientAPI = {
    getPatientDetails: (payload) => api.post('/profile/patient/details/', payload),
};

// --- NEW: Added Core API for Advices, Tests, and Medicines ---
export const coreAPI = {
    getDoctorAdvices: (deptId) => api.get(`/core/doctor-types/${deptId}/doctors-advice/`),
    getTests: () => api.get('/core/tests/'),
    getTest: (id) => api.get(`/core/tests/${id}/`), // NEW
    createTest: (payload) => api.post('/core/tests/', payload), // NEW
    updateTest: (id, payload) => api.patch(`/core/tests/${id}/`, payload), // NEW
    deleteTest: (id) => api.delete(`/core/tests/${id}/`), // NEW
    getMedicineGenerics: () => api.get('/core/medicine-generics/'),
    createMedicineGeneric: (payload) => api.post('/core/medicine-generics/', payload), // NEW
    getMedicinesByGeneric: (genericId) => api.get(`/core/medicine-generics/${genericId}/`),

    // --- NEW: Medicines APIs ---
    getMedicines: () => api.get('/core/medicines/'),
    getMedicine: (id) => api.get(`/core/medicines/${id}/`),
    createMedicine: (payload) => api.post('/core/medicines/', payload),
    updateMedicine: (id, payload) => api.patch(`/core/medicines/${id}/`, payload),
    deleteMedicine: (id) => api.delete(`/core/medicines/${id}/`),

    getUserTypes: () => api.get('/core/user-types/'),
    requestCashout: (payload) => api.post('/core/cashout/', payload),
};
// --- NEW: Added Disease API for Medical Conditions ---
export const diseaseAPI = {
    getMedicalConditions: () => api.get('/disease/medical-conditions/'),
};

// --- NEW: Receptionist API ---
// --- NEW: Receptionist API ---
export const receptionistAPI = {
    // Note: Use doctorAPI.getProfileIds(personId) to get the IDs
    // Specific receptionist profile endpoints:
    getProfile: (id) => api.get(`/receptionist/${id}/`),
    updateProfile: (id, payload) => api.patch(`/receptionist/${id}/`, payload),
    getDoctorUpcomingAppointments: (email) => api.get(`/receptionist/doctor/upcoming-appointments/?email=${email}`),
    // ADD THIS NEW LINE:
    getPatientUpcomingAppointments: (email) => api.get(`/receptionist/patient/upcoming-appointments/?email=${email}`),
};

// --- NEW: Officer API ---
export const officerAPI = {
    getProfile: (id) => api.get(`/officer/${id}/`),
    updateProfile: (id, payload) => api.patch(`/officer/${id}/`, payload),
    getDashboardCounts: () => api.get('/core/dashboard-counts/'),
    toggleActive: (payload) => api.patch('/officer/toggle-active/', payload),
};
// --- NEW: Core Profile API (Universal Profile Management) ---
export const coreProfileAPI = {
    getAllProfiles: (type) => api.get(`/core/profile/all/?type=${type}`),
    getActiveProfiles: (type) => api.get(`/core/profile/all/?type=${type}&active=true`),
    searchProfiles: (type, query) => api.get(`/core/profile/all/?type=${type}&q=${query}`),
    updateProfile: (payload) => api.patch(`/core/profile/update/`, payload),
};

// --- NEW: Laboratory API ---
// --- NEW: Laboratory & Pharmacy APIs ---
export const laboratoryAPI = {
    getAll: () => api.get('/laboratory/'),
    getLab: (id) => api.get(`/laboratory/me/${id}/`),
    updateLab: (id, payload) => api.patch(`/laboratory/me/${id}/`, payload),
    register: (payload) => api.post('/laboratory/register/', payload), // NEW
    getLabsForTest: (testId) => api.get(`/laboratory/tests/${testId}/laboratories/`),
    getPrescriptionTests: (prescriptionId) => api.get(`/laboratory/prescription/${prescriptionId}/tests/`),
    confirmTest: (data) => api.post(`/laboratory/confirm-test/`, data),
    getLabAvailableTests: (labId) => api.get(`/laboratory/${labId}/available-tests/`),
    addLabAvailableTest: (labId, payload) => api.post(`/laboratory/${labId}/available-tests/`, payload),
    removeLabAvailableTest: (labId, testPk) => api.delete(`/laboratory/${labId}/available-tests/${testPk}/`),
    updateLabAvailableTest: (offeringId, payload) => api.patch(`/laboratory/available-tests/${offeringId}/`, payload),
    getPatientTestReports: (labId, patientId) => api.get(`/laboratory/labs/${labId}/patients/${patientId}/test-reports/`),
    updateTestReport: (reportId, payload) => api.patch(`/laboratory/test-reports/${reportId}/`, payload),
};

// --- NEW: Pharmacy API ---
export const pharmacyAPI = {
    getAll: () => api.get('/pharmacy/'),
    getPharmacy: (id) => api.get(`/pharmacy/${id}/`),
    updatePharmacy: (id, payload) => api.patch(`/pharmacy/${id}/`, payload),
    register: (payload) => api.post('/pharmacy/register/', payload), 
    getMedicineAvailability: (id) => api.get(`/pharmacy/${id}/medicine-availability/`),
    addMedicine: (id, payload) => api.post(`/pharmacy/${id}/self/medicines/`, payload),
    updateMedicineStock: (pharmacyId, availabilityId, payload) => api.patch(`/pharmacy/${pharmacyId}/self/medicines/${availabilityId}/`, payload),
};

// --- NEW: Transaction & Finance APIs ---
// --- NEW: Transaction & Finance APIs ---
export const transactionAPI = {
    getCashouts: (status = 'all') => api.get(`/notification/transaction/cashouts/?status=${status}`),
    acceptCashout: (id, payload) => api.post(`/core/cashout/${id}/accept/`, payload),
    cancelCashout: (id, payload) => api.post(`/core/cashout/${id}/cancel/`, payload),
    addMoney: (payload) => api.post('/notification/transaction/add-money/', payload),
    getUserTransactions: (userId, userType) => api.get(`/notification/transaction/user-transactions/?user_id=${userId}&user_type=${userType}`),
};

// --- UPDATED: Officer specific Lab/Pharmacy overrides ---
export const officerBusinessAPI = {
    getLab: (id) => api.get(`/laboratory/${id}/`),
    updateLab: (id, payload) => api.patch(`/laboratory/${id}/`, payload),
    getPharmacy: (id) => api.get(`/pharmacy/${id}/`),
    updatePharmacy: (id, payload) => api.patch(`/pharmacy/${id}/`, payload),
};
export default api;