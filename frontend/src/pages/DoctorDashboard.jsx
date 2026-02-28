import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Badge, Table, Modal, Form, Button } from 'react-bootstrap';
import { 
    FaCalendarAlt, FaChevronLeft, FaChevronRight, FaCheck, FaTimes, FaClock, 
    FaAngleDown, FaAngleUp, FaPen, FaClipboardList, FaPrescription
} from 'react-icons/fa';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { doctorAPI, appointmentAPI } from '../api/api';

const DoctorDashboard = () => {
    const navigate = useNavigate();

    // --- User & IDs ---
    const [user, setUser] = useState(null);
    const [doctorId, setDoctorId] = useState(null);

    // --- Data State ---
    const [appointments, setAppointments] = useState([]);

    const [weeklyAvailability, setWeeklyAvailability] = useState([]);
    const [offDaysList, setOffDaysList] = useState([]); 
    const [currentDate, setCurrentDate] = useState(new Date());
    
    // UI State
    const [showTreatModal, setShowTreatModal] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [openSection, setOpenSection] = useState(null); 
    
    // --- EDIT STATE ---
    const [editingDayId, setEditingDayId] = useState(null); 
    const [editValues, setEditValues] = useState({ 
        startH: '', startM: '', startMeridiem: 'AM',
        endH: '', endM: '', endMeridiem: 'PM' 
    });

    // --- Helpers ---
    const getLocalYYYYMMDD = (dateObj) => {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const parseTimeForEdit = (timeStr) => {
        if (!timeStr) return { h: '9', m: '00', meridiem: 'AM' };
        const [h, m] = timeStr.split(':');
        let hour = parseInt(h);
        const meridiem = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12; 
        return { 
            h: String(hour), 
            m: String(m).padStart(2, '0'), 
            meridiem 
        };
    };

    const formatTimeForApi = (hStr, mStr, meridiem) => {
        let hour = parseInt(hStr);
        if (isNaN(hour)) hour = 9;
        if (meridiem === 'PM' && hour !== 12) hour += 12;
        if (meridiem === 'AM' && hour === 12) hour = 0;
        return `${String(hour).padStart(2, '0')}:${String(mStr).padStart(2, '0')}:00`;
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

    // --- Init ---
    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser) {
            setUser(storedUser);
            fetchDoctorId(storedUser.person_id || storedUser.id);
        }
    }, []);

    const fetchDoctorId = async (personId) => {
        try {
            const res = await doctorAPI.getProfileIds(personId);
            if (res.data && res.data.doctor_id) {
                setDoctorId(res.data.doctor_id);
                fetchScheduleData(res.data.doctor_id);
                fetchTodayAppointments(res.data.doctor_id);
            }
        } catch (error) { console.error("Failed to fetch IDs", error); }
    };

    const fetchTodayAppointments = async (dId) => {
        try {
            const todayStr = getLocalYYYYMMDD(new Date());
            const res = await appointmentAPI.getDoctorAppointments(dId, todayStr);
            if (res.data && res.data.results) {
                const formattedAppointments = res.data.results.map(appt => {
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
                setAppointments(formattedAppointments);
            }
        } catch (error) {
            console.error("Failed to fetch today's appointments", error);
        }
    };

    const fetchScheduleData = useCallback(async (dId) => {
        try {
            const availRes = await doctorAPI.getAvailability(dId);
            if (availRes.data && availRes.data.availabilities) {
                const sorted = availRes.data.availabilities.sort((a,b) => a.week_day_id - b.week_day_id);
                setWeeklyAvailability(sorted);
            }
            const offRes = await doctorAPI.getOffDays(dId);
            if (offRes.data) setOffDaysList(offRes.data);
        } catch (error) { console.error("Failed to fetch schedule", error); }
    }, []);

    // --- Handlers ---
    const handleDayToggle = async (day) => {
        if (!doctorId) return;
        const isCurrentlyOn = !!day.start_time;
        const newStart = isCurrentlyOn ? null : "09:00:00";
        const newEnd = isCurrentlyOn ? null : "17:00:00";
        const payload = [{ week_day_id: day.week_day_id, start_time: newStart, end_time: newEnd }];
        try {
            updateLocalAvailability(day.week_day_id, newStart, newEnd);
            await doctorAPI.updateAvailability(doctorId, payload);
        } catch (error) { fetchScheduleData(doctorId); }
    };

    const startEditingDay = (day) => {
        if (!day.start_time) return;
        const startObj = parseTimeForEdit(day.start_time);
        const endObj = parseTimeForEdit(day.end_time);
        setEditingDayId(day.week_day_id);
        setEditValues({
            startH: startObj.h, startM: startObj.m, startMeridiem: startObj.meridiem,
            endH: endObj.h, endM: endObj.m, endMeridiem: endObj.meridiem
        });
    };

    const toggleMeridiem = (key) => {
        setEditValues(prev => ({ ...prev, [key]: prev[key] === 'AM' ? 'PM' : 'AM' }));
    };

    const saveTimeEdit = async (dayId) => {
        if (!doctorId) return;
        const apiStart = formatTimeForApi(editValues.startH, editValues.startM, editValues.startMeridiem);
        const apiEnd = formatTimeForApi(editValues.endH, editValues.endM, editValues.endMeridiem);
        const payload = [{ week_day_id: dayId, start_time: apiStart, end_time: apiEnd }];
        try {
            await doctorAPI.updateAvailability(doctorId, payload);
            updateLocalAvailability(dayId, apiStart, apiEnd);
            setEditingDayId(null);
            Swal.fire({ icon: 'success', title: 'Updated', toast: true, position: 'top-end', showConfirmButton: false, timer: 1000 });
        } catch (error) { Swal.fire('Error', 'Could not save', 'error'); }
    };

    const updateLocalAvailability = (dayId, start, end) => {
        setWeeklyAvailability(prev => prev.map(d => 
            d.week_day_id === dayId ? { ...d, start_time: start, end_time: end } : d
        ));
    };

    const getDayLetter = (id) => { 
        const map = {1: 'M', 2: 'T', 3: 'W', 4: 'T', 5: 'F', 6: 'S', 7: 'S'}; 
        return map[id] || '-'; 
    };

    // --- Renderers ---
    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay(); 
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} />);
        
        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, month, d);
            const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            let isOff = offDaysList.some(od => od.date === dStr);
            
            if (!isOff) {
                const jsDay = dateObj.getDay();
                const apiDayId = jsDay === 0 ? 7 : jsDay; 

                const dayConfig = weeklyAvailability.find(wc => wc.week_day_id === apiDayId);
                if (dayConfig && !dayConfig.start_time) isOff = true;
            }
            
            days.push(
                <div key={d} className={`sidebar-cal-day ${isOff ? 'selected' : ''}`} onClick={() => handleDateClick(d)}
                    style={isOff ? { opacity: 0.6, background: '#FFEBEE', color: '#C62828', border: '1px solid #FFCDD2' } : {}}>
                    {d}
                </div>
            );
        }
        const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        return (
            <div className="sidebar-calendar-wrapper fade-in">
                <div className="sidebar-cal-header-row mb-1">
                    <span className="sidebar-cal-title small">{monthNames[month]} {year}</span>
                    <div className="d-flex gap-1">
                        <button className="sidebar-cal-nav-btn" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}><FaChevronLeft/></button>
                        <button className="sidebar-cal-nav-btn" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}><FaChevronRight/></button>
                    </div>
                </div>
                <div className="sidebar-cal-grid gap-1">
                    {['S','M','T','W','T','F','S'].map((day,i) => <div key={i} className="sidebar-cal-head">{day}</div>)}
                    {days}
                </div>
            </div>
        );
    };

    const handleDateClick = async (day) => {
        if (!doctorId) return;
        const y = currentDate.getFullYear();
        const m = String(currentDate.getMonth() + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        const existingOffDay = offDaysList.find(od => od.date === dateStr);
        try {
            if (existingOffDay) {
                await doctorAPI.deleteOffDay(existingOffDay.id);
                setOffDaysList(prev => prev.filter(od => od.id !== existingOffDay.id));
            } else {
                const res = await doctorAPI.createOffDay({ doctor_id: doctorId, date: dateStr });
                setOffDaysList(prev => [...prev, res.data]);
            }
        } catch (error) { console.error(error); }
    };

    // --- Navigate to Prescribe (Create New) ---
    const handleTreatClick = (appt) => { 
        // FIXED: Restore navigation to /prescribe
        navigate('/prescribe', { state: { patientId: appt.patient_id, appointmentId: appt.id } });
    };

    // --- View/Edit Prescription ---
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

    const handleFinalizeTreatment = () => { setAppointments(prev => prev.map(a => a.id === selectedPatient.id ? { ...a, status: "Completed" } : a)); setShowTreatModal(false); };
    
    // --- SINGLE CANCEL API ---
    const handleCancelAppointment = (id) => {
        Swal.fire({ 
            title: 'Cancel?', 
            text: "Mark as cancelled?", 
            icon: 'warning', 
            showCancelButton: true, 
            confirmButtonColor: '#ef5350', 
            confirmButtonText: 'Yes',
            customClass: { popup: 'swal2-popup' } 
        })
        .then(async (result) => { 
            if (result.isConfirmed) {
                try {
                    await appointmentAPI.updateAppointment(id, { status: 3 }); 
                    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: "Cancelled" } : a));
                    Swal.fire({ icon: 'success', title: 'Cancelled', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
                } catch (err) {
                    console.error("Cancel failed", err);
                    Swal.fire('Error', 'Could not cancel appointment', 'error');
                }
            } 
        });
    };

    // --- BULK CANCEL REMAINING TODAY API ---
    const handleCancelRemainingToday = () => {
        const remaining = appointments.filter(a => a.status === 'Pending' || a.status === 'Prechecked');
        
        if (remaining.length === 0) {
            Swal.fire({ icon: 'info', title: 'No remaining appointments.', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
            return;
        }

        Swal.fire({
            title: 'Cancel Remaining?',
            html: `
                <div class="swal-gradient-line"></div>
                <div class="swal-modern-text">Are you sure you want to cancel the remaining <b>${remaining.length}</b> appointment(s) for today?</div>
                <div class="swal-gradient-line"></div>
            `,
            iconHtml: '<div style="color: #ef5350; border: none;"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208 208-93.31 208-208S370.69 48 256 48zm75.31 260.69a16 16 0 11-22.62 22.62L256 278.63l-52.69 52.68a16 16 0 01-22.62-22.62L233.37 256l-52.68-52.69a16 16 0 0122.62-22.62L256 233.37l52.69-52.68a16 16 0 0122.62 22.62L278.63 256z"></path></svg></div>',
            customClass: { 
                popup: 'swal-modern-popup',
                title: 'swal-modern-title',
                confirmButton: 'btn-modern-confirm',
                cancelButton: 'btn-modern-cancel',
                icon: 'border-0'
            },
            showCancelButton: true,
            confirmButtonText: 'Confirm',
            cancelButtonText: 'Close',
            buttonsStyling: false
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await Promise.all(remaining.map(appt => 
                        appointmentAPI.updateAppointment(appt.id, { status: 3 })
                    ));
                    
                    setAppointments(prev => prev.map(a => 
                        (a.status === 'Pending' || a.status === 'Prechecked') ? { ...a, status: "Cancelled" } : a
                    ));

                    Swal.fire({ 
                        title: 'Cancelled!', 
                        html: '<div class="swal-modern-text" style="margin-top:-10px">All remaining appointments of today are cancelled.</div>',
                        icon: 'success', 
                        showConfirmButton: false, 
                        timer: 2000,
                        customClass: { popup: 'swal-modern-popup', title: 'swal-modern-title' }
                    });
                } catch (error) {
                    console.error("Bulk cancel failed", error);
                    Swal.fire('Error', 'Failed to cancel some appointments. Please try again.', 'error');
                }
            }
        });
    };

    return (
        <Container className="pb-5 pt-4">
            <Row className="g-4 justify-content-center">
                <Col style={{ flex: '0 0 72%', maxWidth: '72%' }}>
                    <Card className="glass-card card-dynamic h-100">
                        <Card.Body className="p-4">
                            <div className="d-flex justify-content-between align-items-end mb-4">
                                <div>
                                    <h4 className="dashboard-card-title mb-1">Today's Appointments</h4>
                                    <p className="text-luna-mid font-body small mb-0">Manage your patient queue</p>
                                </div>
                                <div className="d-flex gap-2">
                                     <span className="kindred-pill small bg-white border font-serif-cust fw-bold">
                                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                     </span>
                                </div>
                            </div>

                            <div className="plain-table-container">
                                <Table className="align-middle mb-0 doc-table" responsive>
                                    <thead>
                                        <tr>
                                            <th className="th-time text-center">TIME</th>
                                            <th className="th-patient text-center">PATIENT</th>
                                            <th className="th-type text-center">TYPE</th>
                                            <th className="th-status text-center">STATUS</th>
                                            <th className="th-actions text-center">ACTIONS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {appointments.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="text-center text-muted py-4">No appointments found for today.</td>
                                            </tr>
                                        ) : (
                                            appointments.map((appt) => (
                                                <tr key={appt.id} className={appt.status === 'Cancelled' ? 'row-cancelled' : ''}>
                                                    <td className="font-heading fw-bold text-luna-dark text-nowrap text-center">{appt.time}</td>
                                                    <td className="text-center" style={{whiteSpace: 'normal', wordWrap: 'break-word'}}>
                                                        <div className="font-heading fw-bold text-dark" style={{fontSize:'0.95rem', lineHeight: '1.3'}}>
                                                            {appt.patient}
                                                        </div>
                                                        <small className="text-luna-light font-serif-italic d-block mt-1" style={{fontSize:'0.8rem'}}>Age: {appt.age}</small>
                                                    </td>
                                                    <td className="text-center text-nowrap"><span className="type-badge">{appt.type}</span></td>
                                                    <td className="text-center text-nowrap">
                                                        <Badge className={`status-badge ${appt.status.toLowerCase()}`}>
                                                            {appt.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="text-center text-nowrap">
                                                        <div className="d-flex justify-content-center align-items-center gap-2">
                                                            {appt.status !== 'Cancelled' && appt.status !== 'Completed' && (
                                                                <>
                                                                    {appt.status === 'Pending' ? (
                                                                        <button className="btn-precheck-capsule large" onClick={() => navigate(`/prechecked/${appt.id}`)}>
                                                                            Precheck
                                                                        </button>
                                                                    ) : (
                                                                        <button className="action-btn-circle small-edit ms-1" style={{color: 'var(--luna-light)'}} onClick={() => navigate(`/prechecked/${appt.id}`)} title="View/Edit Precheck Data">
                                                                            <FaClipboardList size={12}/>
                                                                        </button>
                                                                    )}
                                                                    <button className="btn-treat-capsule large" onClick={() => handleTreatClick(appt)}>Treat</button>
                                                                    <button className="action-btn-circle small-cancel" onClick={() => handleCancelAppointment(appt.id)} title="Cancel">
                                                                        <FaTimes size={10}/>
                                                                    </button>
                                                                </>
                                                            )}
                                                            {appt.status === 'Completed' && (
                                                                <div className="d-flex align-items-center gap-2">
                                                                    {/* FIXED: Precheck button restored for Completed Status */}
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
                        </Card.Body>
                    </Card>
                </Col>

                <Col style={{ flex: '0 0 28%', maxWidth: '28%' }}>
                    <div className="d-flex flex-column gap-3">
                        <Card className="glass-card card-compact-extra">
                            <Card.Body className="p-3">
                                <h5 className="dashboard-card-title small mb-3 text-center">Today's Patients</h5>
                                <div className="stats-list-compact">
                                    <div className="stat-item">
                                        <span className="stat-label">Pending</span>
                                        <span className="stat-val pending-color">{appointments.filter(a => a.status === 'Pending' || a.status === 'Prechecked').length}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Completed</span>
                                        <span className="stat-val completed-color">{appointments.filter(a => a.status === 'Completed').length}</span>
                                    </div>
                                    <div className="stat-item border-0 pb-0">
                                        <span className="stat-label">Cancelled</span>
                                        <span className="stat-val cancelled-color">{appointments.filter(a => a.status === 'Cancelled').length}</span>
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>

                        <Card className="dashboard-glass-card card-compact-extra">
                            <Card.Body className="p-2">
                                <h5 className="dashboard-card-title small mb-2 ps-2 pt-1 text-center">Set Availability</h5>
                                
                                <div className="availability-menu">
                                    <button className="avail-option" onClick={handleCancelRemainingToday} style={{marginBottom: '4px'}}>
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="icon-box danger"><FaTimes size={12} /></div>
                                            <span className="avail-opt-text" style={{fontSize: '0.8rem', color: '#C62828'}}>Cancel Remaining Today</span>
                                        </div>
                                    </button>

                                    <button className={`avail-option ${openSection === 'offDays' ? 'active' : ''}`} onClick={() => setOpenSection(openSection === 'offDays' ? null : 'offDays')}>
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="icon-box primary"><FaCalendarAlt size={12} /></div>
                                            <span className="avail-opt-text" style={{fontSize: '0.8rem'}}>Mark Off-Days</span>
                                        </div>
                                        {openSection === 'offDays' ? <FaAngleUp size={10} className="text-luna-light"/> : <FaAngleDown size={10} className="text-luna-light"/>}
                                    </button>
                                    
                                    {openSection === 'offDays' && <div className="avail-content">{renderCalendar()}</div>}

                                    <button className={`avail-option ${openSection === 'availability' ? 'active' : ''}`} onClick={() => setOpenSection(openSection === 'availability' ? null : 'availability')}>
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="icon-box info"><FaClock size={12} /></div>
                                            <span className="avail-opt-text" style={{fontSize: '0.8rem'}}>Weekly Schedule</span>
                                        </div>
                                        {openSection === 'availability' ? <FaAngleUp size={10} className="text-luna-light"/> : <FaAngleDown size={10} className="text-luna-light"/>}
                                    </button>

                                    {openSection === 'availability' && (
                                        <div className="avail-content p-0" style={{overflow: 'hidden'}}>
                                            {weeklyAvailability.map((day) => {
                                                const isActive = !!day.start_time;
                                                const isEditing = editingDayId === day.week_day_id;
                                                
                                                return (
                                                    <div key={day.week_day_id} className="avail-row">
                                                        <div className="d-flex align-items-center justify-content-center w-100">
                                                            <div 
                                                                className={`day-circle-toggle ${isActive ? 'active' : ''}`}
                                                                onClick={() => handleDayToggle(day)}
                                                            >
                                                                {getDayLetter(day.week_day_id)}
                                                            </div>
                                                            
                                                            {isActive ? (
                                                                isEditing ? (
                                                                    <div className="d-flex align-items-center">
                                                                        <div className="d-flex align-items-center">
                                                                            <div className="edit-pill-container">
                                                                                <input 
                                                                                    type="text" 
                                                                                    className="edit-sub-input hour-input" 
                                                                                    value={editValues.startH} 
                                                                                    onChange={(e) => setEditValues({...editValues, startH: e.target.value})} 
                                                                                />
                                                                                <span className="edit-colon">:</span>
                                                                                <input 
                                                                                    type="text"
                                                                                    className="edit-sub-input min-input" 
                                                                                    value={editValues.startM} 
                                                                                    onChange={(e) => setEditValues({...editValues, startM: e.target.value})} 
                                                                                />
                                                                                <span className="edit-meridiem" onClick={() => toggleMeridiem('startMeridiem')}>{editValues.startMeridiem}</span>
                                                                            </div>
                                                                            
                                                                            <span className="time-hyphen">-</span>
                                                                            
                                                                            <div className="edit-pill-container">
                                                                                <input 
                                                                                    type="text"
                                                                                    className="edit-sub-input hour-input" 
                                                                                    value={editValues.endH} 
                                                                                    onChange={(e) => setEditValues({...editValues, endH: e.target.value})} 
                                                                                />
                                                                                <span className="edit-colon">:</span>
                                                                                <input 
                                                                                    type="text"
                                                                                    className="edit-sub-input min-input" 
                                                                                    value={editValues.endM} 
                                                                                    onChange={(e) => setEditValues({...editValues, endM: e.target.value})} 
                                                                                />
                                                                                <span className="edit-meridiem" onClick={() => toggleMeridiem('endMeridiem')}>{editValues.endMeridiem}</span>
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        <div className="action-btn-circle small-save ms-1" onClick={() => saveTimeEdit(day.week_day_id)}><FaCheck size={10}/></div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="d-flex align-items-center">
                                                                        <div className="avail-time-group d-flex align-items-center">
                                                                            <span className="time-pill">{formatTime12h(day.start_time)}</span>
                                                                            <span className="time-hyphen">-</span>
                                                                            <span className="time-pill">{formatTime12h(day.end_time)}</span>
                                                                        </div>
                                                                        <div className="action-btn-circle small-edit ms-1" onClick={() => startEditingDay(day)}><FaPen size={9}/></div>
                                                                    </div>
                                                                )
                                                            ) : (
                                                                <span className="closed-badge ms-1">Closed</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </Card.Body>
                        </Card>
                    </div>
                </Col>
            </Row>

            <Modal show={showTreatModal} onHide={() => setShowTreatModal(false)} size="lg" centered contentClassName="glass-card card-dynamic border-0">
                <Modal.Header closeButton className="border-bottom border-light">
                    <Modal.Title className="dashboard-card-title h5">Treating: {selectedPatient?.patient}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Row className="g-3">
                            <Col md={12}>
                                <Form.Group><Form.Label className="small fw-bold text-luna-mid font-heading">SYMPTOMS</Form.Label><Form.Control as="textarea" rows={3} className="bg-light border-0" placeholder="Notes..." /></Form.Group>
                            </Col>
                        </Row>
                    </Form>
                </Modal.Body>
                <Modal.Footer className="border-0">
                    <Button variant="light" onClick={() => setShowTreatModal(false)} className="rounded-pill px-4">Close</Button>
                    <button className="btn-treat-capsule" onClick={handleFinalizeTreatment}>Finalize</button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default DoctorDashboard;