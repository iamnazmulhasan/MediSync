import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Badge, Button } from 'react-bootstrap';
import { FaCalendarCheck, FaClock, FaUser, FaUserMd, FaEye, FaClipboardList } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

// Note: Using doctorAPI.getProfileIds because it returns ALL ids (doctor, patient, etc) for a person.
import { prescriptionAPI, doctorAPI } from '../api/api';

const PreviousPrescriptions = () => {
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [prescriptions, setPrescriptions] = useState([]);
    const [userRole, setUserRole] = useState(null);

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

    // Safely extract DX text from [BRACKETS]
    const formatDx = (dxStr) => {
        if (!dxStr) return 'N/A';
        if (dxStr.includes('[')) {
            const matches = [...dxStr.matchAll(/\[(.*?)\]/g)].map(m => m[1]);
            return matches.join(', ') || 'N/A';
        }
        return dxStr;
    };

    // --- Init & Fetch Logic ---
    useEffect(() => {
        const fetchHistory = async () => {
            const storedUser = JSON.parse(localStorage.getItem('user'));
            if (!storedUser) {
                setLoading(false);
                return;
            }

            const role = storedUser.role;
            const personId = storedUser.person_id || storedUser.id;
            setUserRole(role);

            try {
                // 1. Get exact profile IDs for this person
                const idsRes = await doctorAPI.getProfileIds(personId);
                const ids = idsRes.data;

                let rxRes;
                // 2. Route to the correct API based on role
                if (role === 'doctor' && ids.doctor_id) {
                    rxRes = await prescriptionAPI.getPreviousPrescriptions(ids.doctor_id);
                } else if (role === 'patient' && ids.patient_id) {
                    rxRes = await prescriptionAPI.getPatientPreviousPrescriptions(ids.patient_id);
                } else {
                    throw new Error("Invalid Role or Missing Profile ID");
                }

                if (rxRes && rxRes.data && rxRes.data.previous_prescriptions) {
                    setPrescriptions(rxRes.data.previous_prescriptions);
                }

            } catch (error) {
                console.error("Failed to fetch prescription history", error);
                Swal.fire('Error', 'Could not load prescription history.', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    // --- Actions ---
    const handleViewDetails = (rx) => {
        navigate(`/prescription/${rx.id}`, {
            state: {
                appointmentId: rx.appointment,
                patientId: rx.patient_id,
                isEditMode: true,
                role: userRole // Pass role so ViewPrescription knows whether to lock edits
            }
        });
    };

    const handleNameClick = (rx) => {
        if (userRole === 'doctor' && rx.patient_id) {
            navigate('/view-profile', { state: { patientId: rx.patient_id } });
        } else if (userRole === 'patient' && rx.doctor_id) {
            navigate('/view-profile', { state: { doctorId: rx.doctor_id } });
        }
    };

    // --- Grouping Logic ---
    const groupPrescriptions = (list) => {
        const groups = {};
        list.forEach(rx => {
            const dateKey = rx.appointment_date || 'Unknown Date';
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(rx);
        });
        
        // Sort dates descending (newest first)
        return Object.keys(groups).sort((a, b) => new Date(b) - new Date(a)).reduce((acc, key) => {
            acc[key] = groups[key];
            return acc;
        }, {});
    };

    const groupedData = groupPrescriptions(prescriptions);
    const isDoctor = userRole === 'doctor';

    return (
        <Container fluid className="px-4 pb-5 pt-4">
            <div className="d-flex justify-content-between align-items-end mb-5">
                <div>
                    <h2 className="page-title-serif mb-0">
                        {isDoctor ? 'My Patients' : 'My Prescriptions'}
                    </h2>
                    <p className="text-luna-mid font-body small mb-0">
                        {isDoctor ? 'Review previously issued prescriptions' : 'View your past medical prescriptions'}
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="loading-container fade-in mt-5">
                    <div className="custom-spinner"></div>
                    <p style={{fontFamily: "'Google Sans', sans-serif", fontWeight: '500'}}>Loading History...</p>
                </div>
            ) : Object.keys(groupedData).length === 0 ? (
                <div className="text-center py-5 text-muted mt-5">
                    <div className="icon-box info mb-3 mx-auto" style={{width: '60px', height: '60px', borderRadius: '50%'}}>
                        <FaClipboardList size={24}/>
                    </div>
                    <h5 style={{fontFamily: "'Google Sans', sans-serif"}}>No Prescription History</h5>
                    <p style={{fontFamily: "'Inter', sans-serif"}}>
                        {isDoctor ? 'You have not issued any prescriptions yet.' : 'You have no past prescriptions.'}
                    </p>
                </div>
            ) : (
                Object.keys(groupedData).map((dateKey) => (
                    <div key={dateKey} className="mb-4 fade-in">
                        {/* GLOSSY HEADER */}
                        <div className="date-header-glass">
                            <FaCalendarCheck className="me-3" style={{color: '#26658C', fontSize: '1.1rem'}} />
                            {formatDateHeader(dateKey)}
                            <Badge bg="light" text="dark" className="ms-3 border rounded-pill">
                                {groupedData[dateKey].length} {isDoctor ? 'Patient(s)' : 'Prescription(s)'}
                            </Badge>
                        </div>

                        <Row className="g-3">
                            {groupedData[dateKey].map((rx) => {
                                const formattedDisease = formatDx(rx.dx);
                                // Determine the display name based on role
                                const displayName = isDoctor ? rx.patient_name : rx.doctor_name;
                                const fallbackName = isDoctor ? 'Unknown Patient' : 'Unknown Doctor';
                                
                                return (
                                    /* WIDER CARDS: Restored to 3 per row (lg={4}) */
                                    <Col lg={4} md={6} sm={12} key={rx.id}>
                                        <div className="rx-history-card d-flex flex-column h-100 p-3">
                                            
                                            {/* Header Info */}
                                            <div className="d-flex align-items-center mb-3 pb-3 border-bottom border-light">
                                                <div className="avatar-box bg-light text-primary rounded-circle me-3 flex-shrink-0" style={{width:'45px', height:'45px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)'}}>
                                                    {isDoctor ? <FaUser size={18} /> : <FaUserMd size={18} />}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <h6 
                                                        className="mb-1 text-truncate" 
                                                        title={displayName} 
                                                        style={{
                                                            fontFamily: "'Google Sans', sans-serif", 
                                                            fontWeight: '700', 
                                                            fontSize: '1.05rem', 
                                                            lineHeight: '1.2',
                                                            cursor: 'pointer',
                                                            color: '#0277BD'
                                                        }}
                                                        onClick={() => handleNameClick(rx)}
                                                        onMouseOver={(e) => { e.target.style.textDecoration = 'underline'; }}
                                                        onMouseOut={(e) => { e.target.style.textDecoration = 'none'; }}
                                                    >
                                                        {displayName || fallbackName}
                                                    </h6>
                                                    <small className="text-muted d-flex align-items-center" style={{fontFamily: "'Inter', sans-serif", fontWeight: '500', fontSize:'0.75rem'}}>
                                                        <FaClock className="me-1 text-info"/> {formatTime(rx.appointment_time)}
                                                    </small>
                                                </div>
                                            </div>

                                            {/* Snapshot Details */}
                                            <div className="mb-3 ps-1 flex-grow-1">
                                                <div className="d-flex justify-content-between align-items-start mb-2">
                                                    <span className="text-muted small fw-bold font-heading">Appt ID:</span>
                                                    <span className="text-dark small fw-bold font-heading mt-1">#{rx.appointment}</span>
                                                </div>
                                                
                                                {/* Replaced truncate with wrap style */}
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

                                            {/* Action Button */}
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
        </Container>
    );
};

export default PreviousPrescriptions;