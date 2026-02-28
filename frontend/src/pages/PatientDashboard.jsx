import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Badge, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { 
    FaCalendarAlt, FaUserMd, FaMapMarkerAlt, 
    FaPills, FaStethoscope, FaPhoneAlt, FaClock, FaMoneyBillWave,
    FaSyringe, FaClinicMedical, FaEllipsisH, FaHeartbeat, FaNotesMedical,
    FaInfoCircle, FaCalendarDay
} from 'react-icons/fa';
import { appointmentAPI, prescriptionAPI, doctorAPI } from '../api/api';

const PatientDashboard = ({ user }) => {
    const navigate = useNavigate();
    
    // --- STATE ---
    const [showWelcome, setShowWelcome] = useState(
        sessionStorage.getItem('showWelcome') === 'true'
    );
    const [startFade, setStartFade] = useState(false);
    
    const [appointments, setAppointments] = useState([]);
    const [activeMeds, setActiveMeds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [nextApptDetails, setNextApptDetails] = useState(null);

    // --- WELCOME ANIMATION ---
    useEffect(() => {
        if (showWelcome) {
            sessionStorage.removeItem('showWelcome');
            const fadeTimer = setTimeout(() => setStartFade(true), 1500);
            const removeTimer = setTimeout(() => setShowWelcome(false), 2500);
            return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer); };
        }
    }, [showWelcome]);

    // --- FETCH DATA (Appointments & Active Medicines) ---
    useEffect(() => {
        const fetchData = async () => {
            if (!user?.person_id) return;
            try {
                setLoading(true);
                
                // 1. Fetch Appointments (Uses person_id)
                const apptRes = await appointmentAPI.getPatientUpcoming(user.person_id);
                
                if (apptRes.data && Array.isArray(apptRes.data.results)) {
                    const validStatuses = ['pending', 'prechecked'];
                    const filtered = apptRes.data.results.filter(appt => {
                        const status = (appt.status || '').trim().toLowerCase();
                        return validStatuses.includes(status);
                    });

                    const sorted = filtered.sort((a, b) => {
                        const dateA = new Date(a.appointment_date);
                        const dateB = new Date(b.appointment_date);
                        if (dateA - dateB !== 0) return dateA - dateB;
                        const timeA = (a.time || '00:00').replace(/:/g, '');
                        const timeB = (b.time || '00:00').replace(/:/g, '');
                        return timeA - timeB;
                    });

                    setAppointments(sorted);
                    setNextApptDetails(sorted.length > 0 ? sorted[0] : null);
                }

                // 2. Fetch EXACT patient_id from person_id
                const profileIdsRes = await doctorAPI.getProfileIds(user.person_id);
                const patientId = profileIdsRes.data.patient_id;

                // 3. Fetch Active Medicines (Uses patient_id)
                if (patientId) {
                    const medsRes = await prescriptionAPI.getActiveMedicinesToday(patientId);
                    const fetchedMeds = Array.isArray(medsRes.data) ? medsRes.data : [];
                    
                    // Parse the uses_process string into structured data
                    const parsedMeds = fetchedMeds.map(med => {
                        const processString = med.uses_process || '';
                        const matches = [...processString.matchAll(/\[(.*?)\]/g)].map(m => m[1]);
                        
                        return {
                            id: med.id,
                            name: med.medicine_name,
                            generic: matches[0] || 'Unknown Generic',
                            dose: matches[1] || '-',
                            instruction: matches[2] || '-',
                            duration: med.duration ? `${med.duration} দিন` : 'চলবে'
                        };
                    });
                    
                    setActiveMeds(parsedMeds);
                }

            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    // --- HELPERS ---
    const formatTime = (timeStr) => {
        if (!timeStr) return '--:--';
        try {
            const [h, m] = timeStr.split(':');
            const date = new Date();
            date.setHours(h);
            date.setMinutes(m);
            return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        } catch (e) { return timeStr; }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch (e) { return dateStr; }
    };

    const formatFee = (fee) => Math.round(parseFloat(fee || 0));

    const getStatusColor = (status) => {
        const s = (status || '').toLowerCase();
        if (s === 'pending') return '#FFB300';
        if (s === 'prechecked') return '#00BCD4';
        return '#90A4AE';
    };

    const departmentMap = {
        "General Physician": "General Physician",
        "Diabetes & Endocrinology": "Endocrinologist",
        "Cardiology": "Cardiologist",
        "Gastroenterology": "Gastroenterologist",
        "Gynecology": "Gynecologist",
        "Obstetrics": "Obstetrician",
        "Pediatrics": "Pediatrician",
        "Orthopedics": "Orthopedic Surgeon",
        "Dermatology": "Dermatologist",
        "ENT": "ENT Specialist",
        "Ophthalmology": "Ophthalmologist",
        "Neurology": "Neurologist",
        "Psychiatry": "Psychiatrist",
        "Urology": "Urologist",
        "Nephrology": "Nephrologist",
        "Pulmonology": "Pulmonologist",
        "General Surgery": "General Surgeon",
        "Dentistry": "Dentist",
        "Oncology": "Oncologist",
        "Emergency Medicine": "Emergency Physician"
    };

    return (
        <>
            {showWelcome && (
                <div className={`welcome-overlay ${startFade ? 'fade-out' : ''}`}>
                    <FaHeartbeat className="welcome-brand-icon" />
                    <div className="welcome-text">Welcome to</div>
                    <div className="welcome-brand-name">MediSync</div>
                </div>
            )}

            {/* 1. MAIN CONTAINER */}
            <Container fluid className="split-layout-container p-4 fade-in">
                
                {/* 2. HEADER */}
                <div className="d-flex justify-content-between align-items-end mb-4 flex-shrink-0">
                    <div>
                        <h2 className="anim-header-text fw-bold m-0 font-google">
                            Hi, {user?.name || 'User'}
                        </h2>
                        <p className="text-muted m-0 font-google" style={{fontSize: '0.95rem', marginTop: '4px'}}>
                            Here's your overview for today.
                        </p>
                    </div>
                    <div className="d-none d-md-block">
                        <Button variant="light" size="sm" className="shadow-sm border bg-white d-flex align-items-center gap-2 px-3 py-2 rounded-pill">
                            <FaCalendarAlt className="text-luna-mid"/> 
                            <span className="font-google fw-bold text-luna-navy">
                                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </span>
                        </Button>
                    </div>
                </div>

                {/* 3. SPLIT CONTENT ROW */}
                <Row className="split-content-row g-4">
                    
                    {/* === LEFT COLUMN === */}
                    <Col lg={7} xl={8} className="split-col">
                        <Row className="g-4">
                            
                            {/* UPCOMING APPOINTMENT CARD */}
                            <Col md={12}>
                                <div className="rhythm-card card-luna-dark p-4">
                                    <div className="medical-pattern-bg">
                                        <FaStethoscope style={{position:'absolute', top:'10%', right:'5%', fontSize:'8rem', transform:'rotate(15deg)'}} />
                                        <FaSyringe style={{position:'absolute', bottom:'-10%', left:'10%', fontSize:'6rem', transform:'rotate(-20deg)'}} />
                                        <FaClinicMedical style={{position:'absolute', top:'40%', left:'40%', fontSize:'4rem', opacity:0.3}} />
                                    </div>

                                    <div className="d-flex justify-content-between align-items-start mb-4 position-relative z-1">
                                        <div>
                                            <div className="dashboard-stat-label mb-1">Up Next</div>
                                            <h3 className="font-basker text-white mb-0 mt-1">Appointment</h3>
                                        </div>
                                        {nextApptDetails && (
                                            <div 
                                                className="badge-status-modern" 
                                                style={{
                                                    backgroundColor: getStatusColor(nextApptDetails.status), 
                                                    color: '#011C40'
                                                }}
                                            >
                                                {nextApptDetails.status}
                                            </div>
                                        )}
                                    </div>

                                    {nextApptDetails ? (
                                        <div className="position-relative z-1">
                                            <div className="d-flex align-items-start gap-4">
                                                <div className="avatar-box bg-white bg-opacity-10 text-white rounded-circle d-flex align-items-center justify-content-center flex-shrink-0">
                                                    <FaUserMd size={32} />
                                                </div>
                                                
                                                <div className="flex-grow-1">
                                                    <h4 className="font-google text-white mb-1">{nextApptDetails.doctor_name}</h4>
                                                    <div className="font-google text-white text-opacity-75 mb-3">
                                                        {departmentMap[nextApptDetails.doctor_department] || nextApptDetails.doctor_department}
                                                    </div>

                                                    <div className="d-flex flex-wrap gap-2 mt-1">
                                                        <div className="d-flex align-items-center gap-2 text-white bg-black bg-opacity-25 px-3 py-2 rounded-3">
                                                            <FaClock className="text-info" /> 
                                                            <span className="font-google fw-bold">{formatTime(nextApptDetails.time)}</span>
                                                            <span className="text-white text-opacity-50">|</span>
                                                            <span className="font-google">{formatDate(nextApptDetails.appointment_date)}</span>
                                                        </div>
                                                        
                                                        {nextApptDetails.doctor_mobile && nextApptDetails.doctor_mobile !== "N/A" && (
                                                            <div className="d-flex align-items-center gap-2 text-white bg-black bg-opacity-25 px-3 py-2 rounded-3">
                                                                <FaPhoneAlt className="text-success" size={12} />
                                                                <span className="font-google fw-bold">{nextApptDetails.doctor_mobile}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="d-flex align-items-start gap-2 mt-3 text-white text-opacity-90 font-google small">
                                                        <FaMapMarkerAlt className="flex-shrink-0 text-danger" style={{ marginTop: '2px' }} />
                                                        <div style={{lineHeight: '1.4'}}>
                                                            {(nextApptDetails.doctor_location || '').split(',').map((part, i) => (
                                                                <div key={i}>{part.trim()}</div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-white text-opacity-75 text-center py-5 position-relative z-1">
                                            <FaCalendarAlt size={40} className="mb-3 opacity-50" />
                                            <h5 className="font-google">No upcoming appointments scheduled</h5>
                                            <p className="small">Book a visit to see your schedule here.</p>
                                        </div>
                                    )}
                                </div>
                            </Col>

                            <Col md={12}>
                                <div className="horizontal-gradient-line"></div>
                            </Col>

                            {/* ACTIVE MEDICATIONS */}
                            <Col md={12}>
                                <div className="d-flex align-items-center justify-content-between mb-3">
                                    <h5 className="font-basker text-luna-navy m-0 fw-bold">Active Medications Today</h5>
                                    {activeMeds.length > 0 && <Badge bg="success" className="rounded-pill px-2">Active</Badge>}
                                </div>
                                
                                {activeMeds.length > 0 ? (
                                    <div className="row g-3">
                                        {activeMeds.map((med, idx) => (
                                            <div key={idx} className="col-md-6">
                                                <div className="p-3 rounded-4 bg-white border shadow-sm h-100 d-flex flex-column justify-content-between" style={{borderColor: '#E0F2F1'}}>
                                                    <div className="d-flex align-items-start mb-3">
                                                        <div className="icon-box bg-light text-luna-mid rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 me-3" style={{width: '40px', height: '40px'}}>
                                                            <FaPills size={18} />
                                                        </div>
                                                        <div className="flex-grow-1" style={{minWidth: 0}}>
                                                            <div className="font-google fw-bold text-luna-navy text-truncate" style={{fontSize: '1rem', lineHeight: '1.2'}} title={med.name}>
                                                                {med.name}
                                                            </div>
                                                            <div className="font-google text-muted text-truncate" style={{fontSize: '0.75rem', marginTop: '2px'}} title={med.generic}>
                                                                {med.generic}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="d-flex flex-wrap gap-2 mt-auto">
                                                        <div className="d-flex align-items-center px-2 py-1 bg-light rounded-pill" style={{fontSize: '0.75rem', fontFamily: 'Google Sans Flex', fontWeight: 600, color: 'var(--luna-navy)'}}>
                                                            <FaClock className="me-1 text-info opacity-75" /> <span style={{fontFamily: 'Noto Serif Bengali'}}>{med.dose}</span>
                                                        </div>
                                                        <div className="d-flex align-items-center px-2 py-1 bg-light rounded-pill" style={{fontSize: '0.75rem', fontFamily: 'Google Sans Flex', fontWeight: 600, color: 'var(--luna-navy)'}}>
                                                            <FaInfoCircle className="me-1 text-warning opacity-75" /> <span style={{fontFamily: 'Noto Serif Bengali'}}>{med.instruction}</span>
                                                        </div>
                                                        <div className="d-flex align-items-center px-2 py-1 bg-light rounded-pill" style={{fontSize: '0.75rem', fontFamily: 'Google Sans Flex', fontWeight: 600, color: 'var(--luna-navy)'}}>
                                                            <FaCalendarDay className="me-1 text-success opacity-75" /> <span style={{fontFamily: 'Noto Serif Bengali'}}>{med.duration}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-muted bg-white rounded-4 border shadow-sm">
                                        <FaPills size={30} className="opacity-25 mb-2" />
                                        <h6 style={{fontFamily: "'Google Sans', sans-serif"}}>No Active Medications</h6>
                                        <p className="small mb-0">You don't have any active prescriptions for today.</p>
                                    </div>
                                )}
                            </Col>
                        </Row>
                    </Col>

                    {/* === RIGHT COLUMN === */}
                    <Col lg={5} xl={4} className="split-col">
                        <div className="rhythm-card auto-height border-0 shadow-sm p-4" style={{background: 'rgba(255,255,255,0.9)'}}>
                            <div className="d-flex align-items-center justify-content-between mb-4 border-bottom pb-3">
                                <span className="font-basker fw-bold text-luna-navy fs-5">Upcoming Schedule</span>
                                <Badge bg="light" text="dark" className="border font-google">
                                    {appointments.length}
                                </Badge>
                            </div>

                            <div className="bg-light p-3 rounded-4 mb-4 d-flex justify-content-between align-items-center border border-white shadow-sm">
                                <FaCalendarAlt className="text-luna-light"/>
                                <div className="text-center">
                                    <div className="small text-muted text-uppercase font-google fw-bold" style={{fontSize: '0.7rem', letterSpacing: '1px'}}>Today</div>
                                    <div className="fw-bold text-luna-dark font-basker fs-5">
                                        {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}
                                    </div>
                                </div>
                                <FaMoneyBillWave className="text-luna-light" size={20} />
                            </div>

                            <div className="d-flex flex-column">
                                {appointments.length > 0 ? (
                                    appointments.map((item) => {
                                        const deptName = departmentMap[item.doctor_department] || item.doctor_department;
                                        return (
                                            <div key={item.id} className="schedule-grid">
                                                <div className="text-center">
                                                    <div className="font-google fw-bold text-luna-dark">{formatTime(item.time)}</div>
                                                    <div className="text-muted small font-google" style={{fontSize: '0.7rem'}}>
                                                        {formatDate(item.appointment_date)}
                                                    </div>
                                                </div>

                                                <div className="d-flex justify-content-center h-100">
                                                    <div className="vertical-line-accent"></div>
                                                </div>

                                                <div className="ps-1">
                                                    <div className="font-google fw-bold text-luna-navy text-truncate" style={{maxWidth: '140px'}}>
                                                        {item.doctor_name}
                                                    </div>
                                                    <div className="text-muted small font-google text-truncate" style={{maxWidth: '140px'}}>
                                                        {deptName}
                                                    </div>
                                                </div>

                                                <div className="text-end">
                                                    <div className="font-basker fw-bold text-luna-mid fs-6">
                                                        <span className="bdt-symbol">৳</span>
                                                        {formatFee(item.appointment_fee)}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-5">
                                        <div className="bg-light rounded-circle d-inline-flex p-3 mb-3 text-muted">
                                            <FaNotesMedical size={24} />
                                        </div>
                                        <h6 className="font-google text-luna-navy">No upcoming scheduled</h6>
                                        <p className="small text-muted font-google">
                                            Today, {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-4 text-center">
                                <button 
                                    className="btn-view-all"
                                    onClick={() => navigate('/appointments')}
                                >
                                    View All Appointments
                                </button>
                            </div>
                        </div>
                    </Col>
                </Row>
            </Container>
        </>
    );
};

export default PatientDashboard;