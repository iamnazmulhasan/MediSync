import React, { useState, useCallback } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap'; // FIXED: Added Button import
import Swal from 'sweetalert2';
import { authAPI, doctorAPI } from '../api/api';
import { 
    FaSearch, FaUserMd, FaEnvelope, FaPhone, FaMapMarkerAlt, 
    FaGraduationCap, FaCalendarTimes, FaClock, FaChevronLeft, FaChevronRight 
} from 'react-icons/fa';

const ReceptionistAvailability = () => {
    // --- STATE ---
    const [searchEmail, setSearchEmail] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    
    const [doctorInfo, setDoctorInfo] = useState(null);
    const [weeklyAvailability, setWeeklyAvailability] = useState([]);
    const [offDaysList, setOffDaysList] = useState([]); 
    
    const [currentDate, setCurrentDate] = useState(new Date());
    const [activeSection, setActiveSection] = useState(null); // 'offDays' or 'weekly'

    // --- HELPER: TIME ---
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

    const getDayLetter = (id) => { 
        const map = {1: 'M', 2: 'T', 3: 'W', 4: 'T', 5: 'F', 6: 'S', 7: 'S'}; 
        return map[id] || '-'; 
    };

    // --- SEARCH LOGIC ---
    const handleSearch = async () => {
        if (!searchEmail.trim()) {
            Swal.fire({ icon: 'warning', title: 'Email Required', text: 'Please enter a doctor email to search.', customClass: { popup: 'swal-modern-popup' } });
            return;
        }

        setIsSearching(true);
        setDoctorInfo(null);
        setActiveSection(null);
        setWeeklyAvailability([]);
        setOffDaysList([]);

        try {
            // 1. Fetch Doctor Profile
            const res = await authAPI.checkProfile('doctor', searchEmail);
            if (res.data && res.data.exists && res.data.doctor) {
                const docData = res.data.doctor;
                setDoctorInfo(docData);
                
                // 2. Fetch Availability Data using the Doctor ID
                await fetchScheduleData(docData.id);
            } else {
                throw new Error("Doctor not found");
            }
        } catch (error) {
            console.error("Search error:", error);
            Swal.fire({ icon: 'error', title: 'Not Found', text: 'No doctor found with this email.', customClass: { popup: 'swal-modern-popup' } });
        } finally {
            setIsSearching(false);
        }
    };

    const fetchScheduleData = useCallback(async (dId) => {
        try {
            const availRes = await doctorAPI.getAvailability(dId);
            if (availRes.data && Array.isArray(availRes.data.availabilities)) {
                const sorted = availRes.data.availabilities.sort((a,b) => a.week_day_id - b.week_day_id);
                setWeeklyAvailability(sorted);
            }
            
            const offRes = await doctorAPI.getOffDays(dId);
            if (offRes.data) {
                // Safety check to ensure we set an array
                setOffDaysList(Array.isArray(offRes.data) ? offRes.data : (offRes.data.results || []));
            }
        } catch (error) { 
            console.error("Failed to fetch schedule", error); 
        }
    }, []);

    // --- RENDERERS ---
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
                <div 
                    key={d} 
                    className={`sidebar-cal-day ${isOff ? 'selected' : ''}`} 
                    style={isOff ? { opacity: 0.6, background: '#FFEBEE', color: '#C62828', border: '1px solid #FFCDD2', cursor: 'default' } : { cursor: 'default' }}
                >
                    {d}
                </div>
            );
        }
        
        const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        
        return (
            <div className="sidebar-calendar-wrapper fade-in mx-auto mt-4" style={{ maxWidth: '300px' }}>
                <div className="sidebar-cal-header-row mb-2">
                    <span className="sidebar-cal-title" style={{ fontSize: '1.1rem' }}>{monthNames[month]} {year}</span>
                    <div className="d-flex gap-2">
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

    // Safe extraction of person data
    const person = doctorInfo?.person || {};

    return (
        <Container fluid className="p-4" style={{ minHeight: '100vh' }}>
            
            {/* Header */}
            <div className="text-center mb-4">
                <h2 className="page-title-serif mb-2" style={{ fontWeight: '700', fontStyle: 'italic', fontSize: '2.8rem' }}>
                    Availability
                </h2>
                <p className="mb-4" style={{ fontFamily: "'Google Sans', sans-serif", fontSize: '0.85rem', color: 'var(--luna-mid)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Check doctor schedules and off-days
                </p>
            </div>

            {/* --- EMAIL SEARCH BAR --- */}
            <Row className="justify-content-center mb-5 fade-in">
                <Col xl={7} lg={9}>
                    <div className="voice-assist-container d-flex align-items-center" style={{ padding: '6px 10px', height: '52px' }}>
                        <input 
                            type="email" 
                            className="flex-grow-1 px-3" 
                            placeholder="Search by Doctor's Email" 
                            value={searchEmail}
                            onChange={(e) => setSearchEmail(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            style={{ 
                                border: 'none', background: 'transparent', outline: 'none',
                                fontFamily: "'Google Sans', sans-serif", fontWeight: '500',
                                fontSize: '1rem', color: 'var(--luna-navy)',
                                paddingTop: '3px'
                            }}
                        />
                        <button 
                            className="voice-search-action-btn" 
                            onClick={handleSearch}
                            disabled={isSearching}
                            style={{ width: '40px', height: '40px' }}
                        >
                            {isSearching ? <div className="spinner-sm" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div> : <FaSearch size={16} />}
                        </button>
                    </div>
                </Col>
            </Row>

            {/* --- DOCTOR INFO CARD --- */}
            {doctorInfo && (
                <div className="fade-in mb-5 mx-auto" style={{ maxWidth: '650px' }}>
                    <div className="rhythm-card" style={{ background: 'rgba(255, 255, 255, 0.9)', border: '1px solid #E1F5FE' }}>
                        <div className="d-flex align-items-center mb-3 pb-3 border-bottom">
                            <div className="avatar-box bg-light text-info rounded-circle me-3 d-flex align-items-center justify-content-center" style={{ width:'60px', height:'60px', color: 'var(--luna-mid)', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                                <FaUserMd size={28} style={{ color: 'var(--luna-mid)' }} />
                            </div>
                            <div>
                                <h5 style={{ fontFamily: "'Google Sans', sans-serif", fontWeight: '800', color: 'var(--luna-navy)', margin: 0, fontSize: '1.3rem' }}>
                                    {person.name || 'Unknown Name'}
                                </h5>
                                <div className="d-flex align-items-center gap-3 mt-1" style={{ fontFamily: "'Inter', sans-serif", color: '#546E7A', fontSize: '0.85rem' }}>
                                    <span><FaEnvelope className="me-1" style={{ color: 'var(--luna-light)' }}/> {person.email || 'N/A'}</span>
                                    <span><FaPhone className="me-1" style={{ color: 'var(--luna-light)' }}/> {person.mobile || 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        <Row className="g-3 mb-2">
                            <Col xs={12}>
                                <div className="d-flex align-items-start">
                                    <FaGraduationCap className="mt-1 me-2" style={{ color: 'var(--luna-mid)', opacity: 0.6 }} />
                                    <div>
                                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#90A4AE', fontWeight: 700 }}>Designation & Education</div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--luna-navy)' }}>
                                            {doctorInfo.designation || 'N/A'} <span className="text-muted fw-normal">|</span> {doctorInfo.education || 'N/A'}
                                        </div>
                                    </div>
                                </div>
                            </Col>
                            <Col xs={12}>
                                <div className="d-flex align-items-start">
                                    <FaMapMarkerAlt className="mt-1 me-2" style={{ color: 'var(--luna-mid)', opacity: 0.6 }} />
                                    <div>
                                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#90A4AE', fontWeight: 700 }}>Location</div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--luna-navy)' }}>{doctorInfo.location || 'N/A'}</div>
                                    </div>
                                </div>
                            </Col>
                        </Row>
                    </div>

                    {/* --- ACTION BUTTONS --- */}
                    <div className="d-flex justify-content-center gap-3 mt-4 fade-in">
                        <Button 
                            variant={activeSection === 'offDays' ? 'primary' : 'outline-primary'}
                            className={`rounded-pill px-4 py-2 ${activeSection === 'offDays' ? 'shadow' : ''}`}
                            style={{ 
                                fontFamily: "'Google Sans', sans-serif", fontWeight: '600',
                                background: activeSection === 'offDays' ? 'linear-gradient(135deg, var(--luna-mid) 0%, var(--luna-dark) 100%)' : 'white',
                                color: activeSection === 'offDays' ? 'white' : 'var(--luna-mid)',
                                borderColor: 'var(--luna-mid)'
                            }}
                            onClick={() => setActiveSection('offDays')}
                        >
                            <FaCalendarTimes className="me-2"/> See Off Days
                        </Button>
                        <Button 
                            variant={activeSection === 'weekly' ? 'primary' : 'outline-primary'}
                            className={`rounded-pill px-4 py-2 ${activeSection === 'weekly' ? 'shadow' : ''}`}
                            style={{ 
                                fontFamily: "'Google Sans', sans-serif", fontWeight: '600',
                                background: activeSection === 'weekly' ? 'linear-gradient(135deg, var(--luna-mid) 0%, var(--luna-dark) 100%)' : 'white',
                                color: activeSection === 'weekly' ? 'white' : 'var(--luna-mid)',
                                borderColor: 'var(--luna-mid)'
                            }}
                            onClick={() => setActiveSection('weekly')}
                        >
                            <FaClock className="me-2"/> See Weekly Availability
                        </Button>
                    </div>
                </div>
            )}

            {/* --- RESULTS SECTION --- */}
            {doctorInfo && activeSection && (
                <Row className="justify-content-center mt-4 fade-in">
                    <Col xl={6} lg={8}>
                        <Card className="dashboard-glass-card card-compact-extra shadow-sm border-0">
                            <Card.Body className="p-4">
                                {activeSection === 'offDays' && (
                                    <>
                                        <h5 className="dashboard-card-title small mb-3 text-center" style={{ fontFamily: "'Google Sans', sans-serif" }}>Doctor's Off-Days</h5>
                                        {renderCalendar()}
                                        <div className="text-center mt-3 small text-muted font-italic" style={{ fontFamily: "'Inter', sans-serif" }}>
                                            Highlighted dates in red indicate when the doctor is completely unavailable.
                                        </div>
                                    </>
                                )}

                                {activeSection === 'weekly' && (
                                    <>
                                        <h5 className="dashboard-card-title small mb-4 text-center" style={{ fontFamily: "'Google Sans', sans-serif" }}>Weekly Schedule</h5>
                                        <div className="avail-content p-0 border-0" style={{overflow: 'hidden'}}>
                                            {weeklyAvailability.length === 0 ? (
                                                <div className="text-center py-4 text-muted" style={{ fontFamily: "'Inter', sans-serif" }}>No weekly schedule configured.</div>
                                            ) : (
                                                weeklyAvailability.map((day) => {
                                                    const isActive = !!day.start_time;
                                                    return (
                                                        <div key={day.week_day_id} className="avail-row py-3" style={{ borderBottom: '1px solid #E1F5FE' }}>
                                                            <div className="d-flex align-items-center justify-content-center w-100">
                                                                <div 
                                                                    className={`day-circle-toggle ${isActive ? 'active' : ''}`}
                                                                    style={{ cursor: 'default' }} // Read-only
                                                                >
                                                                    {getDayLetter(day.week_day_id)}
                                                                </div>
                                                                
                                                                {isActive ? (
                                                                    <div className="d-flex align-items-center ms-3">
                                                                        <div className="avail-time-group d-flex align-items-center">
                                                                            <span className="time-pill px-3 py-1" style={{ fontSize: '0.85rem' }}>{formatTime12h(day.start_time)}</span>
                                                                            <span className="time-hyphen mx-2">-</span>
                                                                            <span className="time-pill px-3 py-1" style={{ fontSize: '0.85rem' }}>{formatTime12h(day.end_time)}</span>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <span className="closed-badge ms-3 px-3 py-1" style={{ fontSize: '0.8rem' }}>Closed</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

        </Container>
    );
};

export default ReceptionistAvailability;