import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Row, Col, Badge, Button } from 'react-bootstrap';
import { patientAPI, prescriptionAPI } from '../api/api';
import { 
    FaUserCircle, FaArrowLeft, FaNotesMedical, FaUser, 
    FaHourglassHalf, FaPrescriptionBottleAlt, 
    FaEnvelope, FaPhone, FaMapMarkerAlt, FaIdCard,
    FaCalendarCheck, FaClock, FaUserMd, FaEye, FaClipboardList 
} from 'react-icons/fa';

const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

const Prescribe = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Get IDs passed from DoctorDashboard
    const patientId = location.state?.patientId;
    const appointmentId = location.state?.appointmentId;

    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- Prescription History State ---
    const [prescriptions, setPrescriptions] = useState([]);
    const [rxLoading, setRxLoading] = useState(true);

    // --- Formatters ---
    const formatTime = (timeStr) => {
        if (!timeStr) return '--:--';
        try {
            const [hours, minutes] = timeStr.split(':');
            const h = parseInt(hours, 10);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 || 12;
            return `${h12}:${minutes} ${ampm}`;
        } catch (e) {
            return timeStr;
        }
    };

    const formatDateHeader = (dateStr) => {
        if (!dateStr) return "Unknown Date";
        try {
            const dateObj = new Date(dateStr);
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            return dateObj.toLocaleDateString('en-US', options);
        } catch (e) {
            return dateStr;
        }
    };

    const formatDx = (dxStr) => {
        if (!dxStr) return 'N/A';
        if (dxStr.includes('[')) {
            const matches = [...dxStr.matchAll(/\[(.*?)\]/g)].map(m => m[1]);
            return matches.join(', ') || 'N/A';
        }
        return dxStr;
    };

    // --- Fetch Logic ---
    useEffect(() => {
        const fetchData = async () => {
            if (!patientId) {
                setError("No patient selected.");
                setLoading(false);
                setRxLoading(false);
                return;
            }

            try {
                // 1. Fetch Patient Profile
                const profilePayload = { type: 'patient_id', id: patientId };
                const patientRes = await patientAPI.getPatientDetails(profilePayload);
                setPatient(patientRes.data);

                // 2. Fetch Patient's Previous Prescriptions
                const rxRes = await prescriptionAPI.getPatientPreviousPrescriptions(patientId);
                if (rxRes && rxRes.data && rxRes.data.previous_prescriptions) {
                    setPrescriptions(rxRes.data.previous_prescriptions);
                }
            } catch (err) {
                console.error("Failed to fetch data", err);
                setError("Failed to load patient data.");
            } finally {
                setLoading(false);
                setRxLoading(false);
            }
        };

        fetchData();
    }, [patientId]);

    const handlePrescribeClick = () => {
        navigate('/prescription', { state: { patientId, appointmentId } });
    };

    const handleViewDetails = (rx) => {
        navigate(`/prescription/${rx.id}`, {
            state: {
                appointmentId: rx.appointment,
                patientId: rx.patient_id,
                isEditMode: true,
                role: 'doctor' // Ensure the view knows a doctor is accessing it
            }
        });
    };

    // --- Grouping Logic ---
    const groupPrescriptions = (list) => {
        const groups = {};
        list.forEach(rx => {
            const dateKey = rx.appointment_date || 'Unknown Date';
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(rx);
        });
        
        return Object.keys(groups).sort((a, b) => new Date(b) - new Date(a)).reduce((acc, key) => {
            acc[key] = groups[key];
            return acc;
        }, {});
    };

    if (loading) return <div className="d-flex justify-content-center align-items-center vh-100 font-body">Loading Details...</div>;
    if (error) return <div className="d-flex justify-content-center align-items-center vh-100 font-body text-danger">{error}</div>;
    if (!patient) return null;

    const age = calculateAge(patient.dob);
    const groupedData = groupPrescriptions(prescriptions);

    return (
        <div className="container-fluid py-5 px-4 px-lg-5">
            {/* Back Button */}
            <button 
                onClick={() => navigate(-1)} 
                className="btn btn-light mb-4 d-flex align-items-center gap-2 shadow-sm rounded-pill px-3"
                style={{fontFamily: "'Google Sans', sans-serif", fontWeight: '600', color: '#546E7A'}}
            >
                <FaArrowLeft size={12} /> Back
            </button>

            {/* --- TOP SECTION: PATIENT DETAILS --- */}
            <div className="row g-5">
                {/* Image Column */}
                <div className="col-lg-5 col-xl-4">
                    <div className="profile-img-card mb-4">
                        <div className="profile-placeholder-img">
                            <FaUserCircle size={150} style={{opacity: 0.5}} />
                        </div>
                    </div>
                </div>

                {/* Details Column */}
                <div className="col-lg-7 col-xl-8 ps-lg-4">
                    <div className="mb-4">
                        <h1 className="font-heading display-4 mb-2">
                            {patient.name}
                        </h1>
                    </div>

                    <div className="section-divider"></div>

                    <div className="mb-5">
                        <h4 className="font-heading mb-4">Patient Information</h4>
                        
                        <div className="row g-4">
                            <div className="col-md-6">
                                <div className="info-label">Email Address</div>
                                <div className="info-value d-flex align-items-center gap-2">
                                    <FaEnvelope size={14} className="opacity-50" />
                                    {patient.email || 'N/A'}
                                </div>
                            </div>

                            <div className="col-md-6">
                                <div className="info-label">Mobile Number</div>
                                <div className="info-value d-flex align-items-center gap-2">
                                    <FaPhone size={14} className="opacity-50" />
                                    {patient.mobile || 'N/A'}
                                </div>
                            </div>

                            <div className="col-md-6">
                                <div className="info-label">Age</div>
                                <div className="info-value d-flex align-items-center gap-2">
                                    <FaHourglassHalf size={14} className="opacity-50" />
                                    {age} years
                                </div>
                            </div>

                            <div className="col-md-6">
                                <div className="info-label">Gender</div>
                                <div className="info-value d-flex align-items-center gap-2">
                                    <FaUser size={14} className="opacity-50" />
                                    {patient.gender || 'N/A'}
                                </div>
                            </div>

                            <div className="col-md-6">
                                <div className="info-label">NID Number</div>
                                <div className="info-value d-flex align-items-center gap-2">
                                    <FaIdCard size={14} className="opacity-50" />
                                    {patient.nid || 'N/A'}
                                </div>
                            </div>

                            <div className="col-12">
                                <div className="info-label">Address</div>
                                <div className="info-value d-flex align-items-center gap-2">
                                    <FaMapMarkerAlt size={14} className="opacity-50" />
                                    {patient.address || 'N/A'}
                                </div>
                            </div>

                            <div className="col-12">
                                <div className="info-label">Chronic Diseases</div>
                                <div className="info-value d-flex align-items-center gap-2">
                                    <FaNotesMedical size={14} className="opacity-50" /> 
                                    {patient.chronic_diseases || 'None reported'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MIDDLE SECTION: FULL WIDTH ACTION BUTTON --- */}
            <div className="section-divider w-100" style={{ margin: '3rem 0 2rem 0' }}></div>

            <div className="text-center mb-4">
                <button className="btn-prescribe-gradient" onClick={handlePrescribeClick}>
                    <FaPrescriptionBottleAlt className="me-2" /> Prescribe a Prescription
                </button>
            </div>

            <div className="section-divider w-100" style={{ margin: '2rem 0 3rem 0' }}></div>

            {/* --- BOTTOM SECTION: PREVIOUS PRESCRIPTIONS --- */}
            <div className="w-100 fade-in">
                <h2 className="page-title-serif mb-4">Previous Prescriptions</h2>
                
                {rxLoading ? (
                    <div className="loading-container fade-in mt-4">
                        <div className="custom-spinner"></div>
                        <p style={{fontFamily: "'Google Sans', sans-serif", fontWeight: '500'}}>Loading History...</p>
                    </div>
                ) : Object.keys(groupedData).length === 0 ? (
                    <div className="text-center py-5 text-muted mt-2">
                        <div className="icon-box info mb-3 mx-auto" style={{width: '60px', height: '60px', borderRadius: '50%'}}>
                            <FaClipboardList size={24}/>
                        </div>
                        <h5 style={{fontFamily: "'Google Sans', sans-serif"}}>No Prescription History</h5>
                        <p style={{fontFamily: "'Inter', sans-serif"}}>
                            This patient does not have any previous prescriptions on record.
                        </p>
                    </div>
                ) : (
                    Object.keys(groupedData).map((dateKey) => (
                        <div key={dateKey} className="mb-4 fade-in">
                            <div className="date-header-glass">
                                <FaCalendarCheck className="me-3" style={{color: '#26658C', fontSize: '1.1rem'}} />
                                {formatDateHeader(dateKey)}
                                <Badge bg="light" text="dark" className="ms-3 border rounded-pill">
                                    {groupedData[dateKey].length} Prescription(s)
                                </Badge>
                            </div>

                            <Row className="g-3">
                                {groupedData[dateKey].map((rx) => {
                                    const formattedDisease = formatDx(rx.dx);
                                    // Since we are looking at the patient's timeline, we want to see which doctor treated them
                                    const displayName = rx.doctor_name || 'Unknown Doctor';
                                    
                                    return (
                                        <Col lg={4} md={6} sm={12} key={rx.id}>
                                            <div className="rx-history-card d-flex flex-column h-100 p-3">
                                                
                                                <div className="d-flex align-items-center mb-3 pb-3 border-bottom border-light">
                                                    <div className="avatar-box bg-light text-primary rounded-circle me-3 flex-shrink-0" style={{width:'45px', height:'45px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)'}}>
                                                        <FaUserMd size={18} />
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <h6 className="text-dark mb-1 text-truncate" title={displayName} style={{fontFamily: "'Google Sans', sans-serif", fontWeight: '700', fontSize: '1.05rem', lineHeight: '1.2'}}>
                                                            {displayName}
                                                        </h6>
                                                        <small className="text-muted d-flex align-items-center" style={{fontFamily: "'Inter', sans-serif", fontWeight: '500', fontSize:'0.75rem'}}>
                                                            <FaClock className="me-1 text-info"/> {formatTime(rx.appointment_time)}
                                                        </small>
                                                    </div>
                                                </div>

                                                <div className="mb-3 ps-1 flex-grow-1">
                                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                                        <span className="text-muted small fw-bold font-heading">Appt ID:</span>
                                                        <span className="text-dark small fw-bold font-heading mt-1">#{rx.appointment}</span>
                                                    </div>
                                                    
                                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                                        <span className="text-muted small fw-bold font-heading">Condition:</span>
                                                        <span className="text-dark small fw-bold font-heading rx-dx-wrap mt-1">
                                                            {formattedDisease}
                                                        </span>
                                                    </div>

                                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                                        <span className="text-muted small fw-bold font-heading">Medicines:</span>
                                                        <span className="text-dark small fw-bold font-heading mt-1">{rx.medicines?.length || 0}</span>
                                                    </div>
                                                    
                                                    <div className="d-flex justify-content-between align-items-start">
                                                        <span className="text-muted small fw-bold font-heading">Tests:</span>
                                                        <span className="text-dark small fw-bold font-heading mt-1">{rx.tests?.length || 0}</span>
                                                    </div>
                                                </div>

                                                <div className="mt-auto pt-2">
                                                    <Button 
                                                        variant="light" 
                                                        className="w-100 rounded-pill shadow-sm d-flex align-items-center justify-content-center gap-2 border" 
                                                        onClick={() => handleViewDetails(rx)}
                                                        style={{fontFamily: "'Inter', sans-serif", fontWeight: '600', fontSize: '0.85rem', color: 'var(--luna-mid)'}}
                                                    >
                                                        <FaEye size={14} /> View Details
                                                    </Button>
                                                </div>

                                            </div>
                                        </Col>
                                    );
                                })}
                            </Row>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Prescribe;