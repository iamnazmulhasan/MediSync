import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Table } from 'react-bootstrap';
import { 
    FaChevronLeft, FaChevronRight, FaCheck, FaTimes, 
    FaCalendarAlt, FaClipboardList, FaPrescription 
} from 'react-icons/fa';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { doctorAPI, appointmentAPI } from '../api/api';

const DoctorAppointments = () => {
    const navigate = useNavigate();
    
    // --- STATE ---
    const [user, setUser] = useState(null);
    const [doctorId, setDoctorId] = useState(null);
    const [activeTab, setActiveTab] = useState('today'); 
    
    // Calendar State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    
    // Appointment Data State
    const [todayAppointments, setTodayAppointments] = useState([]);
    const [upcomingAppointments, setUpcomingAppointments] = useState([]);
    const [showUpcomingTable, setShowUpcomingTable] = useState(false);

    // --- HELPERS ---
    const getLocalYYYYMMDD = (dateObj) => {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const formatTime12h = (timeStr) => {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        const date = new Date();
        date.setHours(parseInt(h));
        date.setMinutes(parseInt(m));
        
        let hours = date.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; 
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${hours}:${minutes} ${ampm}`;
    };

    const formatApiData = (results) => {
        return results.map(appt => {
            let rawStatus = appt.status; 
            let formattedStatus = 'Pending';
            
            if (rawStatus === 4 || (typeof rawStatus === 'string' && rawStatus.toLowerCase() === 'prechecked')) formattedStatus = 'Prechecked';
            if (rawStatus === 2 || (typeof rawStatus === 'string' && (rawStatus.toLowerCase() === 'complete' || rawStatus.toLowerCase() === 'completed'))) formattedStatus = 'Completed';
            if (rawStatus === 3 || (typeof rawStatus === 'string' && rawStatus.toLowerCase() === 'cancelled')) formattedStatus = 'Cancelled';

            return {
                id: appt.id,
                patient_id: appt.patient_id, 
                patient: appt.patient_name,
                age: appt.patient_age,
                time: formatTime12h(appt.time), 
                type: appt.type || 'Visit',
                status: formattedStatus
            };
        });
    };

    // --- INIT & API FETCHING ---
    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser) {
            setUser(storedUser);
            const personId = storedUser.person_id || storedUser.id;
            
            doctorAPI.getProfileIds(personId)
                .then(res => {
                    if (res.data && res.data.doctor_id) {
                        setDoctorId(res.data.doctor_id);
                        fetchTodayAppointments(res.data.doctor_id);
                    }
                })
                .catch(err => console.error("Failed to fetch doctor ID", err));
        }
    }, []);

    const fetchTodayAppointments = async (dId) => {
        try {
            const todayStr = getLocalYYYYMMDD(new Date());
            const res = await appointmentAPI.getDoctorAppointments(dId, todayStr);
            if (res.data && res.data.results) {
                setTodayAppointments(formatApiData(res.data.results));
            }
        } catch (error) { console.error("Failed to fetch today's appointments", error); }
    };

    const fetchUpcomingAppointments = async (dId, dateObj) => {
        try {
            const dateStr = getLocalYYYYMMDD(dateObj);
            const res = await appointmentAPI.getDoctorAppointments(dId, dateStr);
            if (res.data && res.data.results) {
                setUpcomingAppointments(formatApiData(res.data.results));
            }
        } catch (error) { console.error("Failed to fetch upcoming appointments", error); }
    };

    // --- ACTIONS ---
    const handleTreatClick = (appt) => { 
        navigate('/prescribe', { state: { patientId: appt.patient_id, appointmentId: appt.id, isEditMode: false } });
    };

    const handleViewPrescription = async (appt) => {
        try {
            const res = await appointmentAPI.getAppointmentInfo(appt.id);
            const prescriptionId = res.data.prescription_id;

            if (!prescriptionId) {
                Swal.fire('Info', 'Prescription ID not found for this appointment.', 'info');
                return;
            }

            navigate(`/prescription/${prescriptionId}`, {
                state: {
                    appointmentId: appt.id,
                    patientId: appt.patient_id,
                    isEditMode: true
                }
            });
        } catch (error) {
            console.error("Error fetching appointment info:", error);
            Swal.fire('Error', 'Failed to retrieve prescription details.', 'error');
        }
    };

    const handlePrecheck = (id) => {
        navigate(`/prechecked/${id}`);
    };

    const handleCancel = (id) => {
        Swal.fire({
            title: 'Cancel Appointment?',
            text: "Are you sure you want to mark this as cancelled?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef5350',
            confirmButtonText: 'Yes, Cancel',
            customClass: { popup: 'swal2-popup' }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await appointmentAPI.updateAppointment(id, { status: 3 }); 
                    
                    if (activeTab === 'today') {
                        setTodayAppointments(prev => prev.map(a => a.id === id ? { ...a, status: "Cancelled" } : a));
                    } else {
                        setUpcomingAppointments(prev => prev.map(a => a.id === id ? { ...a, status: "Cancelled" } : a));
                    }
                    Swal.fire({ icon: 'success', title: 'Cancelled', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
                } catch (error) {
                    console.error("Cancel failed", error);
                    Swal.fire('Error', 'Could not cancel appointment. Please try again.', 'error');
                }
            }
        });
    };

    // --- UPCOMING LOGIC ---
    const handleDateSelect = (date) => {
        setSelectedDate(date);
        setShowUpcomingTable(true);
        if (doctorId) {
            fetchUpcomingAppointments(doctorId, date);
        }
    };

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay(); 
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        // Setup today for validation (stripping time)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} />);
        
        for (let d = 1; d <= daysInMonth; d++) {
            const thisDate = new Date(year, month, d);
            const isSelected = selectedDate && thisDate.toDateString() === selectedDate.toDateString();
            
            // Validation: Dates must be strictly greater than today
            const isPastOrToday = thisDate <= today;
            
            days.push(
                <div 
                    key={d} 
                    className={`appt-cal-day ${isSelected ? 'selected' : ''}`} 
                    style={isPastOrToday ? { opacity: 0.3, cursor: 'not-allowed', backgroundColor: 'transparent' } : {}}
                    onClick={() => {
                        if (!isPastOrToday) handleDateSelect(thisDate);
                    }}
                >
                    {d}
                </div>
            );
        }

        return (
            <div className="appt-calendar-wrapper fade-in">
                {/* Header Row */}
                <div className="appt-cal-header-row">
                    <span className="appt-cal-title">{monthNames[month]} {year}</span>
                    <div className="d-flex gap-2">
                        <button className="cal-nav-btn fs-6" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}><FaChevronLeft/></button>
                        <button className="cal-nav-btn fs-6" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}><FaChevronRight/></button>
                    </div>
                </div>
                
                {/* Grid */}
                <div className="appt-cal-grid">
                    {['S','M','T','W','T','F','S'].map((day,i) => <div key={i} className="appt-cal-head">{day}</div>)}
                    {days}
                </div>
            </div>
        );
    };

    // --- TABLE COMPONENT ---
    const AppointmentsTable = ({ data }) => (
        <div className="plain-table-container fade-in">
            <Table className="align-middle mb-0 plain-table">
                <thead>
                    <tr>
                        <th className="text-center" style={{width: '12%'}}>TIME</th>
                        <th className="text-center" style={{width: '22%'}}>PATIENT</th>
                        <th className="text-center" style={{width: '15%'}}>TYPE</th>
                        <th className="text-center" style={{width: '15%'}}>STATUS</th>
                        <th className="text-center" style={{width: '36%'}}>ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan="5" className="text-center text-muted py-4">No appointments found.</td>
                        </tr>
                    ) : (
                        data.map((appt) => (
                            <tr key={appt.id} className={appt.status === 'Cancelled' ? 'row-cancelled' : ''}>
                                <td className="font-heading fw-bold text-luna-dark text-nowrap text-center">{appt.time}</td>
                                
                                <td className="text-center" style={{whiteSpace: 'normal', wordWrap: 'break-word'}}>
                                    <div className="font-heading fw-bold text-dark" style={{fontSize:'0.95rem', lineHeight: '1.3'}}>{appt.patient}</div>
                                    <small className="text-luna-light font-serif-italic d-block mt-1" style={{fontSize:'0.8rem'}}>Age: {appt.age}</small>
                                </td>
                                
                                <td className="text-center"><span className="type-badge">{appt.type}</span></td>
                                
                                <td className="text-center">
                                    <Badge className={`status-badge ${appt.status.toLowerCase()}`}>
                                        {appt.status}
                                    </Badge>
                                </td>
                                
                                <td className="text-center">
                                    <div className="d-flex justify-content-center align-items-center gap-2 flex-wrap">
                                        
                                        {/* Actions mirrored from DoctorDashboard */}
                                        {appt.status !== 'Cancelled' && appt.status !== 'Completed' && (
                                            <>
                                                {appt.status === 'Pending' ? (
                                                    <button className="btn-precheck-capsule large" onClick={() => handlePrecheck(appt.id)}>
                                                        Precheck
                                                    </button>
                                                ) : (
                                                    <button className="action-btn-circle small-edit ms-1" style={{color: 'var(--luna-light)'}} onClick={() => navigate(`/prechecked/${appt.id}`)} title="View/Edit Precheck Data">
                                                        <FaClipboardList size={12}/>
                                                    </button>
                                                )}
                                                <button className="btn-treat-capsule large" onClick={() => handleTreatClick(appt)}>Treat</button>
                                                <button className="action-btn-circle small-cancel" onClick={() => handleCancel(appt.id)} title="Cancel">
                                                    <FaTimes size={10}/>
                                                </button>
                                            </>
                                        )}
                                        
                                        {appt.status === 'Completed' && (
                                            <div className="d-flex align-items-center gap-2">
                                                <button 
                                                    className="action-btn-circle small-edit ms-1" 
                                                    style={{color: 'var(--luna-light)'}} 
                                                    onClick={() => navigate(`/prechecked/${appt.id}`)} 
                                                    title="View/Edit Precheck Data"
                                                >
                                                    <FaClipboardList size={12}/>
                                                </button>
                                                
                                                <button 
                                                    className="action-btn-circle small-edit" 
                                                    title="View/Edit Prescription"
                                                    onClick={() => handleViewPrescription(appt)}
                                                >
                                                    <FaPrescription size={12} color="#0277BD" />
                                                </button>
                                                <span className="text-luna-mid small fw-bold d-flex align-items-center">
                                                    <FaCheck className="me-1" /> Done
                                                </span>
                                            </div>
                                        )}
                                        
                                        {appt.status === 'Cancelled' && <span className="text-muted small fst-italic">Cancelled</span>}
                                        
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </Table>
        </div>
    );

    return (
        <Container fluid className="px-4 pb-5 pt-4">
            <div className="text-center mb-4">
                <h2 className="page-title-cust mb-2" style={{fontSize: '2.2rem'}}>My Appointments</h2>
                <p className="text-luna-mid font-body small">Manage your schedule and patient visits</p>
            </div>

            <div className="doc-toggle-wrapper">
                <div className="doc-toggle-container">
                    <div className={`doc-toggle-slider ${activeTab === 'upcoming' ? 'right' : ''}`}></div>
                    
                    <button 
                        className={`doc-toggle-btn ${activeTab === 'today' ? 'active' : ''}`} 
                        onClick={() => {
                            setActiveTab('today');
                            if (doctorId) fetchTodayAppointments(doctorId);
                        }}
                    >
                        Today's Appointments
                    </button>
                    
                    <button 
                        className={`doc-toggle-btn ${activeTab === 'upcoming' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('upcoming')}
                    >
                        Upcoming Appointments
                    </button>
                </div>
            </div>

            <Row className="justify-content-center">
                <Col lg={11}>
                    {activeTab === 'today' && (
                        <div className="fade-in">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5 className="font-heading fw-bold text-luna-navy mb-0">
                                    Queue for {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                </h5>
                                <Badge bg="light" text="dark" className="border px-3 py-2 rounded-pill font-serif-italic">
                                    Total: {todayAppointments.length}
                                </Badge>
                            </div>
                            <AppointmentsTable data={todayAppointments} />
                        </div>
                    )}

                    {activeTab === 'upcoming' && (
                        <div className="fade-in">
                            <Row className="g-4">
                                {/* LEFT: CALENDAR SELECTION */}
                                <Col md={4} className="d-flex flex-column">
                                    <Card className="glass-card border-0 calendar-card-custom h-auto w-100">
                                        <Card.Body className="p-3 text-center">
                                            <h5 className="card-title-cust mb-3 text-decoration-underline text-luna-navy">Select Date</h5>
                                            
                                            {/* Render Fixed Calendar */}
                                            {renderCalendar()}
                                            
                                            <div className="mt-2 text-center">
                                                 {selectedDate ? (
                                                     <div className="font-heading fw-bold text-luna-cust fs-5 fade-in">
                                                         {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                                     </div>
                                                 ) : (
                                                     <small className="text-muted font-body">Click a date to view schedule</small>
                                                 )}
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>

                                {/* RIGHT: RESULTS TABLE */}
                                <Col md={8}>
                                    {!showUpcomingTable ? (
                                        <div className="h-100 d-flex flex-column align-items-center justify-content-center empty-state-container rounded-4 border border-dashed" style={{backgroundColor: 'rgba(255,255,255,0.5)', borderColor: '#B0BEC5'}}>
                                            <div className="icon-box info mb-3" style={{width: '60px', height: '60px', borderRadius: '50%'}}>
                                                <FaCalendarAlt size={24}/>
                                            </div>
                                            <h5 className="font-heading text-muted">No Date Selected</h5>
                                            <p className="font-body small text-muted mb-0">Select a date from the calendar to view the schedule.</p>
                                        </div>
                                    ) : (
                                        <div className="fade-in">
                                             <div className="date-selector-bar mb-3">
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="icon-box primary">
                                                        <FaClipboardList />
                                                    </div>
                                                    <div>
                                                        <small className="text-muted font-heading d-block" style={{fontSize:'0.7rem'}}>VIEWING SCHEDULE FOR</small>
                                                        <span className="selected-date-display">
                                                            {selectedDate?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Badge className="rounded-pill px-3 text-white" style={{backgroundColor: 'var(--luna-navy)'}}>
                                                    {upcomingAppointments.length} Booked
                                                </Badge>
                                             </div>
                                            
                                            <AppointmentsTable data={upcomingAppointments} />
                                        </div>
                                    )}
                                </Col>
                            </Row>
                        </div>
                    )}
                </Col>
            </Row>
        </Container>
    );
};

export default DoctorAppointments;