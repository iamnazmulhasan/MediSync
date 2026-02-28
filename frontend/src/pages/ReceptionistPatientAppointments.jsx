import React, { useState } from 'react';
import { Container, Row, Col, Badge, Button } from 'react-bootstrap';
import { FaCalendarCheck, FaSearch, FaClock, FaEnvelope, FaUserMd } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { receptionistAPI, appointmentAPI } from '../api/api';

const ReceptionistPatientAppointments = () => {
    // State Management
    const [searchEmail, setSearchEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    
    const [patientInfo, setPatientInfo] = useState(null);
    const [upcomingList, setUpcomingList] = useState([]);

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

    const capitalize = (str) => {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    const getBadgeVariant = (status) => {
        const s = status ? status.toLowerCase() : '';
        if (s === 'completed') return 'success';
        if (s === 'pending') return 'warning';
        if (s === 'cancelled') return 'danger';
        return null; 
    };

    const formatDateHeader = (dateStr) => {
        if (!dateStr) return "Date Unknown";
        try {
            const dateObj = new Date(dateStr);
            if (isNaN(dateObj.getTime())) return dateStr;

            const today = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(today.getDate() + 1);

            const dStr = dateObj.toISOString().split('T')[0];
            const tStr = today.toISOString().split('T')[0];
            const tomStr = tomorrow.toISOString().split('T')[0];

            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const fullDate = dateObj.toLocaleDateString('en-US', options);

            if (dStr === tStr) return `Today - ${fullDate}`;
            if (dStr === tomStr) return `Tomorrow - ${fullDate}`;
            
            return fullDate;
        } catch (e) {
            return dateStr;
        }
    };

    // --- SEARCH LOGIC ---
    const handleSearch = async () => {
        if (!searchEmail.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Email Required',
                text: 'Please enter a patient\'s email to search.',
                customClass: { popup: 'swal-modern-popup', title: 'swal-modern-title', confirmButton: 'btn-modern-confirm' }
            });
            return;
        }

        setLoading(true);
        setHasSearched(false);
        try {
            const res = await receptionistAPI.getPatientUpcomingAppointments(searchEmail);
            
            // Set Patient Info from Response
            setPatientInfo({
                name: res.data.patient_name,
                email: res.data.email
            });
            
            // Sort dates ascending
            const sorted = (res.data.upcoming_appointments || []).sort((a, b) => {
                const dateA = new Date(`${a.appointment_date}T${a.time}`);
                const dateB = new Date(`${b.appointment_date}T${b.time}`);
                return dateA - dateB;
            });
            setUpcomingList(sorted);
            setHasSearched(true);
            
        } catch (error) {
            console.error("Search failed:", error);
            setPatientInfo(null);
            setUpcomingList([]);
            Swal.fire({
                icon: 'error',
                title: 'Not Found',
                text: 'Could not find upcoming appointments for this email.',
                customClass: { popup: 'swal-modern-popup', title: 'swal-modern-title', confirmButton: 'btn-modern-confirm' }
            });
        } finally {
            setLoading(false);
        }
    };

    // --- CANCEL LOGIC ---
    const handleCancel = (id) => {
        Swal.fire({
            title: 'Cancel Appointment?',
            text: "Are you sure you want to cancel this appointment? This action cannot be undone.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, cancel it',
            cancelButtonText: 'No, keep it',
            customClass: {
                popup: 'swal-modern-popup',
                title: 'swal-modern-title',
                confirmButton: 'btn-modern-confirm',
                cancelButton: 'btn-modern-cancel'
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await appointmentAPI.updateAppointment(id, { status: 3 });
                    
                    setUpcomingList(prev => prev.map(app => 
                        app.id === id ? { ...app, status: 3, status_name: 'cancelled' } : app
                    ));
                    
                    Swal.fire({ icon: 'success', title: 'Cancelled!', showConfirmButton: false, timer: 1500 });
                } catch (error) {
                    console.error("Cancel failed:", error);
                    Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to cancel the appointment.' });
                }
            }
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

    const groupedAppointments = groupAppointments(upcomingList);

    // --- RENDER ---
    return (
        <Container fluid className="p-4" style={{ minHeight: '100vh' }}>
            
            {/* Header */}
            <div className="text-center mb-4">
                <h2 className="page-title-serif mb-2" style={{ fontWeight: '700', fontStyle: 'italic', fontSize: '2.5rem' }}>
                    Patient Appointments
                </h2>
                <p className="mb-4" style={{ fontFamily: "'Google Sans', sans-serif", fontSize: '1.15rem', color: 'var(--luna-mid)', fontWeight: '500' }}>
                    Find and manage upcoming patient schedules
                </p>
            </div>

            {/* Beautiful Search Bar */}
            <div className="search-bar-container mx-auto" style={{ maxWidth: '550px' }}>
                <div className="d-flex align-items-center bg-white" style={{ borderRadius: '50px', padding: '6px 6px 6px 20px', boxShadow: '0 8px 25px rgba(84, 172, 191, 0.15)', border: '1px solid #E1F5FE' }}>
                    <input 
                        type="email" 
                        className="flex-grow-1" 
                        placeholder="Search by Patient's Email" 
                        value={searchEmail}
                        onChange={(e) => setSearchEmail(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        style={{ 
                            border: 'none', 
                            outline: 'none', 
                            background: 'transparent',
                            fontFamily: "'Google Sans', sans-serif", 
                            fontWeight: '500', 
                            fontSize: '1rem', 
                            color: 'var(--luna-navy)' 
                        }}
                    />
                    <button 
                        className="btn-prescribe-gradient m-0 d-flex align-items-center justify-content-center" 
                        style={{ width: '50px', height: '50px', padding: '0', borderRadius: '50px', flexShrink: 0 }}
                        onClick={handleSearch} 
                        disabled={loading}
                        title="Search"
                    >
                        {loading ? 
                            <div className="spinner-sm" style={{ width: '24px', height: '24px', borderWidth: '3px' }}></div> 
                            : 
                            <FaSearch size={22} />
                        }
                    </button>
                </div>
            </div>

            {/* Conditional Divider */}
            {hasSearched && (
                <div className="horizontal-gradient-line my-5 mx-auto" style={{ width: '80%' }}></div>
            )}

            {/* Results Section */}
            {hasSearched && patientInfo && (
                <div className="fade-in">
                    
                    {/* Patient Info Banner */}
                    <div className="text-center mb-5">
                        <h4 style={{ fontFamily: "'Google Sans', sans-serif", fontWeight: '700', color: 'var(--luna-navy)' }}>
                            {patientInfo.name}
                        </h4>
                        <span className="kindred-pill mt-2" style={{ fontFamily: "'Inter', sans-serif", fontWeight: '500' }}>
                            <FaEnvelope style={{ color: 'var(--luna-mid)' }} /> {patientInfo.email}
                        </span>
                    </div>

                    {/* Grouped Cards */}
                    {upcomingList.length > 0 ? (
                        Object.keys(groupedAppointments).map((dateKey) => (
                            <div key={dateKey} className="mb-5">
                                <div className="date-header-glass mx-auto mb-4" style={{ width: 'fit-content' }}>
                                    <FaCalendarCheck className="me-3" style={{ color: '#26658C', fontSize: '1.1rem' }} />
                                    {formatDateHeader(dateKey)}
                                </div>

                                <Row className="g-4 justify-content-center">
                                    {groupedAppointments[dateKey].map((appt) => {
                                        const statusRaw = appt.status_name || 'pending';
                                        const statusLower = statusRaw.toLowerCase();
                                        
                                        let cardClass = '';
                                        if (statusLower === 'completed') cardClass = 'card-tint-completed';
                                        else if (statusLower === 'pending') cardClass = 'card-tint-pending';
                                        else if (statusLower === 'prechecked') cardClass = 'card-tint-prechecked';
                                        else if (statusLower === 'cancelled') cardClass = 'card-tint-cancelled opacity-50';

                                        const badgeClass = statusLower === 'prechecked' 
                                            ? 'badge-prechecked rounded-pill px-3 py-1' 
                                            : 'rounded-pill px-3 py-1';

                                        return (
                                            <Col lg={4} md={6} key={appt.id}>
                                                <div className={`rhythm-card ${cardClass}`}>
                                                    
                                                    {/* Doctor Info Header */}
                                                    <div className="d-flex align-items-center mb-3 pb-3 border-bottom border-light">
                                                        <div className="avatar-box bg-white text-info rounded-circle me-3 d-flex align-items-center justify-content-center" style={{ width:'45px', height:'45px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                                                            <FaUserMd size={24} />
                                                        </div>
                                                        <div className="flex-grow-1 overflow-hidden">
                                                            <h6 className="mb-1 text-truncate" style={{ fontFamily: "'Google Sans', sans-serif", fontWeight: '700', fontSize: '1rem', color: 'var(--luna-navy)' }}>
                                                                {appt.doctor_name || 'Unknown Doctor'}
                                                            </h6>
                                                            <small className="text-truncate d-block" style={{ fontFamily: "'Inter', sans-serif", fontWeight: '500', fontSize:'0.75rem', color: '#546E7A' }}>
                                                                Assigned Doctor
                                                            </small>
                                                        </div>
                                                    </div>

                                                    {/* Details */}
                                                    <div className="mb-2">
                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                            <small className="text-muted d-flex align-items-center" style={{ fontFamily: "'Inter', sans-serif", fontWeight: '500', fontSize: '0.85rem' }}>
                                                                <FaClock className="me-2 text-info" size={14}/> Time
                                                            </small>
                                                            <span className="text-dark bg-white px-2 py-1 rounded shadow-sm" style={{ fontFamily: "'Inter', sans-serif", fontWeight: '600', fontSize: '0.85rem' }}>
                                                                {formatTime(appt.time)}
                                                            </span>
                                                        </div>
                                                        
                                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                                            <small className="text-muted" style={{ fontFamily: "'Inter', sans-serif", fontWeight: '500', fontSize: '0.85rem' }}>
                                                                Type
                                                            </small>
                                                            <span style={{ fontFamily: "'Google Sans', sans-serif", fontWeight: '600', fontSize: '0.85rem', color: 'var(--luna-mid)' }}>
                                                                {appt.type || 'Standard'}
                                                            </span>
                                                        </div>

                                                        {/* Status */}
                                                        <div className="d-flex justify-content-between align-items-center border-top pt-3">
                                                            <small className="text-muted" style={{ fontFamily: "'Inter', sans-serif", fontWeight: '500', fontSize: '0.85rem' }}>Status</small>
                                                            <Badge 
                                                                bg={getBadgeVariant(statusRaw)} 
                                                                className={badgeClass}
                                                                style={{ fontFamily: "'Inter', sans-serif", fontWeight: '600', fontSize: '0.75rem', textTransform: 'capitalize' }}
                                                            >
                                                                {capitalize(statusRaw)}
                                                            </Badge>
                                                        </div>
                                                        
                                                        {/* Cancel Action - Centered */}
                                                        {statusLower !== 'cancelled' && (
                                                            <div className="mt-3 text-center">
                                                                <Button 
                                                                    variant="danger" 
                                                                    size="sm" 
                                                                    className="rounded-pill px-4 py-1 shadow-sm"
                                                                    style={{ fontFamily: "'Google Sans', sans-serif", fontWeight: '600', fontSize: '0.8rem', background: '#ef5350', border: 'none' }}
                                                                    onClick={() => handleCancel(appt.id)}
                                                                >
                                                                    Cancel
                                                                </Button>
                                                            </div>
                                                        )}

                                                    </div>
                                                    
                                                </div>
                                            </Col>
                                        );
                                    })}
                                </Row>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-5">
                            <h5 style={{ fontFamily: "'Google Sans', sans-serif", fontWeight: '700', color: 'var(--luna-navy)' }}>No upcoming appointments</h5>
                            <p style={{ fontFamily: "'Inter', sans-serif", color: '#78909C' }}>This patient currently has no scheduled visits.</p>
                        </div>
                    )}
                </div>
            )}
        </Container>
    );
};

export default ReceptionistPatientAppointments;