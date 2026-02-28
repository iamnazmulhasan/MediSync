import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Badge, Button, Collapse } from 'react-bootstrap';
import { FaCalendarCheck, FaUserMd, FaClock, FaMapMarkerAlt, FaHistory, FaChevronDown, FaChevronUp, FaPhone, FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { appointmentAPI } from '../api/api';

const Appointments = () => {
    const navigate = useNavigate();
    const [showPast, setShowPast] = useState(false);
    
    // Data States
    const [upcomingList, setUpcomingList] = useState([]);
    const [pastList, setPastList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingPast, setLoadingPast] = useState(false);

    // --- MAPPING HELPERS ---
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

    // --- FORMATTERS ---
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

    const formatFee = (fee) => {
        if (!fee) return '0';
        return Math.round(parseFloat(fee));
    };

    const capitalize = (str) => {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    // --- BADGE LOGIC ---
    // Returns 'custom' for prechecked to handle class manually, otherwise standard variants
    const getBadgeVariant = (status) => {
        const s = status ? status.toLowerCase() : '';
        if (s === 'confirmed' || s === 'completed') return 'success';
        if (s === 'pending') return 'warning';
        if (s === 'cancelled') return 'danger';
        // For prechecked, we return nothing here and use custom class
        return null; 
    };

    // --- DATE LOGIC (Local Time) ---
    const getLocalDayString = (dateObj) => {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatDateHeader = (dateStr) => {
        if (!dateStr || dateStr === 'Unknown Date') return "Date Unknown";

        try {
            const dateObj = new Date(dateStr);
            if (isNaN(dateObj.getTime())) return dateStr;

            const today = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(today.getDate() + 1);
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);

            const dStr = getLocalDayString(dateObj);
            const tStr = getLocalDayString(today);
            const tomStr = getLocalDayString(tomorrow);
            const yestStr = getLocalDayString(yesterday);

            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const fullDate = dateObj.toLocaleDateString('en-US', options);

            if (dStr === tStr) return `Today - ${fullDate}`;
            if (dStr === tomStr) return `Tomorrow - ${fullDate}`;
            if (dStr === yestStr) return `Yesterday - ${fullDate}`;
            
            return fullDate;
        } catch (e) {
            return dateStr;
        }
    };

    // --- DATA FETCHING ---
    const getPersonId = () => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                return user.person_id;
            } catch (e) {
                console.error("User Parse Error", e);
                return null;
            }
        }
        return null;
    };

    const fetchUpcoming = async () => {
        const pid = getPersonId();
        if (!pid) {
            setLoading(false);
            return;
        }
        
        try {
            const res = await appointmentAPI.getPatientUpcoming(pid);
            if (res.data && Array.isArray(res.data.results)) {
                const sorted = res.data.results.sort((a, b) => {
                    const dateA = a.appointment_date ? new Date(a.appointment_date) : new Date(0);
                    const dateB = b.appointment_date ? new Date(b.appointment_date) : new Date(0);
                    return dateA - dateB;
                });
                setUpcomingList(sorted);
            }
        } catch (error) {
            console.error("Error fetching upcoming appointments", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPast = async () => {
        const pid = getPersonId();
        if (!pid) return;

        setLoadingPast(true);
        try {
            const res = await appointmentAPI.getPatientPrevious(pid);
            if (res.data && Array.isArray(res.data.results)) {
                const sorted = res.data.results.sort((a, b) => {
                    const dateA = a.appointment_date ? new Date(a.appointment_date) : new Date(0);
                    const dateB = b.appointment_date ? new Date(b.appointment_date) : new Date(0);
                    return dateB - dateA; // Descending
                });
                setPastList(sorted);
            }
        } catch (error) {
            console.error("Error fetching past appointments", error);
        } finally {
            setLoadingPast(false);
        }
    };

    useEffect(() => {
        fetchUpcoming();
    }, []);

    const handleTogglePast = () => {
        if (!showPast && pastList.length === 0) {
            fetchPast();
        }
        setShowPast(!showPast);
    };

    const handleCallClick = (mobile, name) => {
        Swal.fire({
            title: `Contact ${name || 'Doctor'}`,
            text: mobile || "No number available",
            icon: 'info',
            confirmButtonColor: '#26658C',
            confirmButtonText: 'Close'
        });
    };

    // --- GROUPING LOGIC ---
    const groupAppointments = (list) => {
        const groups = {};
        list.forEach(app => {
            const dateKey = app.appointment_date || 'Unknown Date';
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(app);
        });
        return groups;
    };

    const upcomingGroups = groupAppointments(upcomingList);
    const pastGroups = groupAppointments(pastList);

    // --- RENDER HELPERS ---
    const renderLocation = (locString) => {
        if (!locString) return <span className="text-muted">Location info unavailable</span>;
        
        const str = String(locString); 
        const parts = str.split(',').map(s => s.trim());
        
        const room = parts[0] || ""; 
        const hospital = parts[1] || "";
        const city = parts.slice(2).join(', ') || "";

        return (
            <div className="text-end-custom" style={{lineHeight: '1.2'}}>
                <span className="text-dark d-block" style={{fontFamily: "'Inter', sans-serif", fontWeight: '700', fontSize: '0.85rem'}}>
                    {room}
                </span>
                {hospital && (
                    <span className="text-muted d-block" style={{fontFamily: "'Inter', sans-serif", fontWeight: '400', fontSize: '0.75rem'}}>
                        {hospital}
                    </span>
                )}
                {city && (
                    <span className="text-muted d-block" style={{fontFamily: "'Inter', sans-serif", fontWeight: '400', fontSize: '0.75rem'}}>
                        {city}
                    </span>
                )}
            </div>
        );
    };

    // --- RENDER SECTION ---
    const renderAppointmentSection = (groups, isHistory = false) => {
        return Object.keys(groups).map((dateKey) => (
            <div key={dateKey} className="mb-4 fade-in">
                {/* GLOSSY HEADER */}
                <div className="date-header-glass">
                    <FaCalendarCheck className="me-3" style={{color: '#26658C', fontSize: '1.1rem'}} />
                    {formatDateHeader(dateKey)}
                </div>

                <Row className="g-3">
                    {groups[dateKey].map((appt) => {
                        const statusRaw = appt.status || 'Pending';
                        const statusLower = statusRaw.toLowerCase();
                        
                        // Custom Card Tints
                        let cardClass = '';
                        if (statusLower === 'completed') cardClass = 'card-tint-completed';
                        else if (statusLower === 'pending') cardClass = 'card-tint-pending';
                        else if (statusLower === 'cancelled') cardClass = 'card-tint-cancelled';
                        else if (statusLower === 'prechecked') cardClass = 'card-tint-prechecked';
                        
                        if (isHistory) cardClass += ' opacity-75';
                        else if (statusLower === 'cancelled') cardClass += ' opacity-50';

                        // Custom Badge Class for Prechecked
                        const badgeClass = statusLower === 'prechecked' 
                            ? 'badge-prechecked rounded-pill px-2 py-1' 
                            : 'rounded-pill px-2 py-1';

                        const dept = appt.doctor_department || 'General';
                        const displayDept = departmentMap[dept] || dept;

                        return (
                            <Col lg={4} md={6} key={appt.id || Math.random()}>
                                <div className={`rhythm-card ${cardClass}`}>
                                    {/* Doctor Info */}
                                    <div className="d-flex align-items-center mb-2 pb-2 border-bottom border-light">
                                        <div className="avatar-box bg-light text-primary rounded-circle me-3" style={{width:'50px', height:'50px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)'}}>
                                            <FaUserMd size={24} />
                                        </div>
                                        <div>
                                            <h6 className="text-dark mb-0" style={{fontFamily: "'Google Sans', sans-serif", fontWeight: '700', fontSize: '1rem', lineHeight: '1.2'}}>
                                                {appt.doctor_name || 'Unknown Doctor'}
                                            </h6>
                                            <small className="text-muted" style={{fontFamily: "'Inter', sans-serif", fontWeight: '500', fontSize:'0.75rem', letterSpacing:'0.3px', textTransform:'uppercase'}}>
                                                {displayDept}
                                            </small>
                                        </div>
                                        <div className="ms-auto">
                                            <Badge 
                                                bg={getBadgeVariant(statusRaw)} 
                                                className={badgeClass}
                                                style={{fontFamily: "'Inter', sans-serif", fontWeight: '600', fontSize: '0.7rem'}}
                                            >
                                                {capitalize(statusRaw)}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Details Grid */}
                                    <div className="mb-2">
                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                            <small className="text-muted d-flex align-items-center" style={{fontFamily: "'Inter', sans-serif", fontWeight: '500', fontSize: '0.85rem'}}>
                                                <FaClock className="me-2 text-info" size={14}/> Time
                                            </small>
                                            {/* Time aligned to right to match location */}
                                            <div className="text-end">
                                                <span className="text-dark bg-light px-2 py-0 rounded" style={{fontFamily: "'Inter', sans-serif", fontWeight: '600', fontSize: '0.85rem'}}>
                                                    {formatTime(appt.time)}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="d-flex justify-content-between align-items-start mb-1">
                                            <small className="text-muted d-flex align-items-center mt-1" style={{fontFamily: "'Inter', sans-serif", fontWeight: '500', fontSize: '0.85rem'}}>
                                                <FaMapMarkerAlt className="me-2 text-danger" size={14}/> Location
                                            </small>
                                            {renderLocation(appt.doctor_location)}
                                        </div>

                                        <div className="d-flex justify-content-between align-items-center border-top pt-2 mt-2">
                                            <small className="text-muted" style={{fontFamily: "'Inter', sans-serif", fontWeight: '500', fontSize: '0.85rem'}}>Consultation Fee</small>
                                            <span className="text-primary fs-6" style={{fontFamily: "'Libre Baskerville', serif", fontWeight: '700', fontStyle: 'italic'}}>
                                                ৳ {formatFee(appt.appointment_fee)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    {isHistory ? (
                                        <div className="mt-2">
                                            <div className="history-phone-text">
                                                <FaPhone size={12} style={{color: '#90A4AE'}}/> Phone: <span style={{color: '#37474F', fontWeight: '600'}}>{appt.doctor_mobile}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        statusLower !== 'cancelled' && (
                                            <div className="d-flex gap-2 mt-2">
                                                <Button 
                                                    variant="light" 
                                                    size="sm" 
                                                    className="w-100 rounded-pill text-success shadow-sm d-flex align-items-center justify-content-center gap-2" 
                                                    onClick={() => handleCallClick(appt.doctor_mobile, appt.doctor_name)}
                                                    title="Call Doctor"
                                                    style={{fontFamily: "'Inter', sans-serif", fontWeight: '600', fontSize: '0.8rem'}}
                                                >
                                                    <FaPhone size={12}/> Call Doctor
                                                </Button>
                                            </div>
                                        )
                                    )}
                                </div>
                            </Col>
                        );
                    })}
                </Row>
            </div>
        ));
    };

    return (
        <Container fluid className="p-4">
            <div className="d-flex justify-content-between align-items-end mb-5">
                <div>
                    <h2 className="page-title-serif mb-0">My Appointments</h2>
                </div>
                
                <Button className="btn-glassy-primary" 
                    onClick={() => navigate('/book-appointment')}
                >
                    <FaPlus size={12} style={{marginBottom: '2px'}}/> New Appointment
                </Button>
            </div>

            {/* MODERN SPINNER & HIDE BUTTON WHEN LOADING */}
            {loading ? (
                <div className="loading-container fade-in">
                    <div className="custom-spinner"></div>
                    <p style={{fontFamily: "'Google Sans', sans-serif", fontWeight: '500'}}>Loading Appointments...</p>
                </div>
            ) : (
                <>
                    {upcomingList.length > 0 ? (
                        renderAppointmentSection(upcomingGroups)
                    ) : (
                        <div className="text-center py-5 text-muted">
                            <h5 style={{fontFamily: "'Google Sans', sans-serif"}}>No upcoming appointments</h5>
                            <p style={{fontFamily: "'Inter', sans-serif"}}>Schedule a visit with a doctor to get started.</p>
                        </div>
                    )}
                </>
            )}

            {/* ONLY SHOW BUTTON IF NOT LOADING */}
            {!loading && (
                <div className="mt-5 pt-3 border-top">
                    <div className="d-flex justify-content-center">
                        <Button 
                            variant="light" 
                            className="d-flex align-items-center gap-2 px-4 py-2 rounded-pill shadow-sm border bg-white"
                            onClick={handleTogglePast}
                            disabled={loadingPast}
                            style={{color: 'var(--luna-mid)', fontWeight: '600', fontFamily: "'Inter', sans-serif"}}
                        >
                            <FaHistory /> 
                            {loadingPast ? "Loading..." : (showPast ? "Hide Previous Appointments" : "Show Previous Appointments")}
                            {!loadingPast && (showPast ? <FaChevronUp/> : <FaChevronDown/>)}
                        </Button>
                    </div>

                    <Collapse in={showPast}>
                        <div className="mt-4">
                            <h5 className="text-muted mb-4 ps-2 border-start border-4 border-secondary" style={{fontFamily: "'Google Sans', sans-serif", fontWeight: '600'}}>History</h5>
                            {pastList.length > 0 ? renderAppointmentSection(pastGroups, true) : (
                                !loadingPast && <p className="text-center text-muted">No past history found.</p>
                            )}
                        </div>
                    </Collapse>
                </div>
            )}
        </Container>
    );
};

export default Appointments;