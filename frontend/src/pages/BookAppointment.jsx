import React, { useState, useRef, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { authAPI, appointmentAPI, doctorAPI } from '../api/api';
import { 
    FaChevronLeft, FaSearch, FaMapMarkerAlt, FaSortAmountDown, FaSortAmountUp, 
    FaSort, FaPhone, FaUserMd, FaCalendarAlt, FaUser, FaChevronRight, 
    FaChevronDown, FaUniversity, FaCheckCircle, FaTimes
} from 'react-icons/fa';

import VoiceAssist from '../components/VoiceAssist';
import { matchDepartment } from '../data/symptomMapping';

// --- HELPER: DATES ---
const getTodayDateObj = () => new Date();

const formatDateLong = (isoDate) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
    });
};

const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- HELPER: TIME ---
const formatTime12h = (timeStr) => {
    if (!timeStr) return "N/A";
    const [h, m] = timeStr.split(':');
    const date = new Date();
    date.setHours(h);
    date.setMinutes(m);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const parseTimeForSort = (timeStr) => {
    if(!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':');
    return parseInt(hours) * 60 + parseInt(minutes);
};

const parseEducation = (eduString) => {
    if (!eduString) return [];
    return eduString.split(',').filter(x => x).map(item => {
        const match = item.match(/(.*)\((.*)\)/);
        if (match) return { institution: match[1].trim(), degree: match[2].trim() };
        return { institution: item.trim(), degree: '' };
    });
};

// --- COMPONENT: DYNAMIC CALENDAR ---
const CustomCalendar = ({ onSelect, onClose }) => {
    const [currentDate, setCurrentDate] = useState(getTodayDateObj()); 
    const today = getTodayDateObj();
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    const handlePrevMonth = () => {
        const prevMonthDate = new Date(year, month - 1, 1);
        if (prevMonthDate < new Date(today.getFullYear(), today.getMonth(), 1)) return;
        setCurrentDate(prevMonthDate);
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const isPrevDisabled = (year === today.getFullYear() && month === today.getMonth());

    const renderCalendarDays = () => {
        let calendarDays = [];
        for (let i = 0; i < firstDayIndex; i++) {
            calendarDays.push(<div key={`empty-${i}`} className="mini-cal-day empty"></div>);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const todayStr = getTodayDateString();
            const isPast = dateStr < todayStr;

            calendarDays.push(
                <div 
                    key={i} 
                    className={`mini-cal-day ${isPast ? 'disabled' : ''}`}
                    onClick={() => {
                        if (!isPast) onSelect(dateStr);
                    }}
                >
                    {i}
                </div>
            );
        }
        return calendarDays;
    };

    return (
        <div>
             <div className="d-flex justify-content-between align-items-center mb-2">
                <button 
                    className="cal-nav-btn" 
                    onClick={handlePrevMonth} 
                    disabled={isPrevDisabled}
                    style={{ opacity: isPrevDisabled ? 0.3 : 1, cursor: isPrevDisabled ? 'default' : 'pointer' }}
                >
                    <FaChevronLeft/>
                </button>
                <span className="cal-title-text">{monthNames[month]} {year}</span>
                <button className="cal-nav-btn" onClick={handleNextMonth}><FaChevronRight/></button>
            </div>
            <div className="mini-cal-grid">
                {days.map(d => <div key={d} className="mini-cal-head">{d}</div>)}
                {renderCalendarDays()}
            </div>
            <div className="mt-3 text-center">
                <button className="btn-save-mini" style={{ width: '80px', margin: '0 auto', display: 'block' }} onClick={onClose}>Close</button>
            </div>
        </div>
    );
};

// --- COMPONENT: LUNA DROPDOWN ---
const LunaDropdown = ({ options, value, onChange, placeholder = "Select", direction = "down" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (option) => {
        onChange(option);
        setIsOpen(false);
    };

    return (
        <div className="position-relative w-100" ref={containerRef} style={{zIndex: 1050}}>
            <div 
                className={`input-luna-trigger ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={value ? 'text-selected-val' : 'text-placeholder'}>
                    {value ? value.name : placeholder}
                </span>
                <FaChevronDown className="text-luna-light" size={12} />
            </div>

            {isOpen && (
                <div 
                    className={`popup-container ${direction === 'up' ? 'popup-dropup' : ''}`}
                    style={{ 
                        top: direction === 'up' ? 'auto' : '115%', 
                        left: 0, 
                        width: '100%',
                        maxHeight: '300px',
                        overflow: 'hidden'
                    }}
                >
                    <div className="dept-list-scroll">
                        {options.map((opt, idx) => (
                            <div 
                                key={opt.id || idx} 
                                className={`dept-option ${value && value.id === opt.id ? 'selected' : ''}`}
                                onClick={() => handleSelect(opt)}
                            >
                                {opt.name}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const BookAppointment = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const calendarRef = useRef(null);

    // --- STATE ---
    const [selectedDateApi, setSelectedDateApi] = useState('');
    const [selectedDateDisplay, setSelectedDateDisplay] = useState('');
    const [selectedDept, setSelectedDept] = useState(null); 
    
    // Voice State
    const [voiceText, setVoiceText] = useState('');

    const [showCalendar, setShowCalendar] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchPerformed, setSearchPerformed] = useState(false);
    
    const [departments, setDepartments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [locationsList, setLocationsList] = useState([]);

    const [locationQuery, setLocationQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [sortOrder, setSortOrder] = useState('none'); 

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    // Booking & Balance
    const [bookingModalOpen, setBookingModalOpen] = useState(false);
    const [selectedDoctorForBooking, setSelectedDoctorForBooking] = useState(null);
    const [bookingType, setBookingType] = useState('New Visit');
    const [isBookingLoading, setIsBookingLoading] = useState(false);
    
    // Balance
    const [patientId, setPatientId] = useState(null); 
    const [userBalance, setUserBalance] = useState(0);
    const [newBalance, setNewBalance] = useState(0); 
    const [hasInsufficientBalance, setHasInsufficientBalance] = useState(false);

    // Confirm Modal
    const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
    const [confirmedDetails, setConfirmedDetails] = useState(null);

    const appointmentOptions = [
        { id: 'New Visit', name: 'New Visit' },
        { id: 'Follow-up', name: 'Follow-up' },
        { id: 'Report Analysis', name: 'Report Analysis' }
    ];

    // --- INITIAL FETCH ---
    useEffect(() => {
        const fetchDepts = async () => {
            try {
                const res = await authAPI.getDoctorTypes();
                const sortedDepts = (res.data.results || res.data || []).sort((a, b) => a.name.localeCompare(b.name));
                setDepartments(sortedDepts); 
            } catch (error) {
                console.error("Failed to load departments", error);
            }
        };
        fetchDepts();
    }, []);

    // --- VOICE TO DEPARTMENT MAPPING (MANUAL TRIGGER) ---
    const handleProcessVoiceText = (textToProcess) => {
        if (!textToProcess || departments.length === 0) return;
        
        // Find the best matching department based on the Bengali transcript
        const matchedDeptName = matchDepartment(textToProcess);
        
        // Find actual department object from API data
        const foundDept = departments.find(d => d.name.toLowerCase() === matchedDeptName.toLowerCase());
        
        if (foundDept) {
            setSelectedDept(foundDept);
        }
    };

    // --- RESTORE STATE LOGIC ---
    useEffect(() => {
        const savedState = sessionStorage.getItem('appt_search_restore');
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                
                setSelectedDateApi(parsed.selectedDateApi);
                setSelectedDateDisplay(parsed.selectedDateDisplay);
                setSelectedDept(parsed.selectedDept);
                setDoctors(parsed.doctors);
                setLocationsList(parsed.locationsList || []);
                setShowResults(parsed.showResults);
                setSearchPerformed(parsed.searchPerformed);
                setLocationQuery(parsed.locationQuery);
                setSortOrder(parsed.sortOrder);
                setCurrentPage(parsed.currentPage);
                setVoiceText(parsed.voiceText || '');

                sessionStorage.removeItem('appt_search_restore');
            } catch (e) {
                console.error("Failed to restore state", e);
            }
        }
    }, []);

    // --- CLICK OUTSIDE ---
    useEffect(() => {
        function handleClickOutside(event) {
            if (calendarRef.current && !calendarRef.current.contains(event.target)) setShowCalendar(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 1. FIND DOCTORS
    const handleFindDoctors = async () => {
        if (!selectedDateApi || !selectedDept) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Information',
                text: 'Please select a date and department.',
                confirmButtonColor: '#26658C',
                customClass: { popup: 'swal2-popup' }
            });
            return;
        }

        setLoading(true);
        setSearchPerformed(true);
        setShowResults(false);
        setDoctors([]);

        try {
            const res = await appointmentAPI.getAvailableDoctors(selectedDept.id, selectedDateApi);
            const availableDocs = res.data.results || [];

            const doctorsWithTime = await Promise.all(availableDocs.map(async (doc) => {
                try {
                    const timeRes = await appointmentAPI.getExpectedTime(doc.id, selectedDateApi);
                    const rawTime = timeRes.data.expected_time || timeRes.data.time;
                    return { 
                        ...doc, 
                        expected_time_raw: rawTime, 
                        expected_time_fmt: formatTime12h(rawTime) 
                    };
                } catch (e) {
                    return { ...doc, expected_time_raw: "00:00:00", expected_time_fmt: "N/A" };
                }
            }));

            const todayStr = getTodayDateString();
            let filteredDocs = doctorsWithTime;

            if (selectedDateApi === todayStr) {
                const now = new Date();
                const currentMinutes = now.getHours() * 60 + now.getMinutes();
                const threshold = currentMinutes + 10; 

                filteredDocs = doctorsWithTime.filter(doc => {
                    const docMinutes = parseTimeForSort(doc.expected_time_raw);
                    return docMinutes > threshold;
                });
            }

            const locations = [...new Set(filteredDocs.map(d => d.location).filter(Boolean))];
            setLocationsList(locations);

            filteredDocs.sort((a, b) => parseTimeForSort(a.expected_time_raw) - parseTimeForSort(b.expected_time_raw));

            setDoctors(filteredDocs);
            setShowResults(true);
            setCurrentPage(1);

        } catch (error) {
            console.error("Error finding doctors:", error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Could not fetch doctors.', confirmButtonColor: '#26658C' });
        } finally {
            setLoading(false);
        }
    };

    // --- RESET SEARCH ---
    const handleResetSearch = () => {
        setShowResults(false);
        setDoctors([]);
        setSearchPerformed(false);
        setVoiceText(''); 
    };

    // --- NAVIGATE TO PROFILE ---
    const handleViewProfile = (doc) => {
        const stateToSave = {
            selectedDateApi, selectedDateDisplay, selectedDept, 
            doctors, locationsList, showResults, searchPerformed, 
            locationQuery, sortOrder, currentPage, voiceText
        };
        sessionStorage.setItem('appt_search_restore', JSON.stringify(stateToSave));
        navigate('/view-profile', { state: { doctorId: doc.id } });
    };

    // 2. PHONE ACTION
    const handlePhoneClick = async (doc) => {
        Swal.fire({
            title: 'Fetching Details...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); },
            customClass: { popup: 'swal2-popup' }
        });

        try {
            const payload = { type: "doctor_id", id: doc.id };
            const res = await doctorAPI.getDoctorDetails(payload);
            const mobile = res.data.mobile || "Not Available";

            Swal.fire({
                html: `
                    <div class="phone-popup-container">
                        <div class="phone-popup-label">Contact Number</div>
                        <div class="phone-display-text">${mobile}</div>
                    </div>
                `,
                showConfirmButton: true,
                confirmButtonText: 'Call Now',
                confirmButtonColor: '#26658C',
                showCancelButton: true,
                cancelButtonText: 'Close',
                customClass: { popup: 'swal2-popup' }
            });
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Could not retrieve contact details.', confirmButtonColor: '#26658C' });
        }
    };

    // 3. BOOKING FLOW
    const openBookingModal = async (doctor) => {
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;

        if (!user || !user.email) {
            Swal.fire({ icon: 'error', title: 'Login Required', text: 'You must be logged in to book.', confirmButtonColor: '#26658C' });
            return;
        }

        setSelectedDoctorForBooking(doctor);
        setBookingModalOpen(true);
        setIsBookingLoading(true);
        setHasInsufficientBalance(false);
        
        try {
            const res = await authAPI.checkProfile('patient', user.email);
            let profileData = null;
            if (res.data.patient) profileData = res.data.patient; 
            else if (res.data.exists && res.data.patient) profileData = res.data.patient;

            if (profileData && profileData.id) {
                setPatientId(profileData.id);
                const currentBalance = parseFloat(profileData.balance || 0);
                const fee = parseFloat(doctor.appointment_fee || 0);
                
                setUserBalance(currentBalance);
                setNewBalance(currentBalance - fee);

                if (currentBalance < fee) setHasInsufficientBalance(true);
            } else {
                 throw new Error("Patient profile ID not found");
            }

            let type = 'New Visit';
            try {
                const histRes = await appointmentAPI.getPreviousPatients(doctor.id);
                const prevPatients = histRes.data.results || [];
                if (prevPatients.some(p => p.id === user.id)) type = 'Follow-up';
            } catch (histErr) { console.warn("History check failed", histErr); }
            setBookingType(type);

        } catch (error) {
            console.error("Error fetching profile", error);
            Swal.fire('Error', 'Failed to retrieve patient profile.', 'error');
            setBookingModalOpen(false); 
        } finally {
            setIsBookingLoading(false);
        }
    };

    // 4. CONFIRM BOOKING
    const handleConfirmBooking = async () => {
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;

        if (!user || !user.id || !patientId) {
            Swal.fire('Error', 'Missing ID. Login again.', 'error');
            return;
        }

        setIsBookingLoading(true);

        try {
            const updatePatientPayload = {
                type: 'patient',
                id: patientId,
                data: { balance: newBalance.toFixed(2) }
            };
            await authAPI.updateProfile(updatePatientPayload);

            try {
                const docRes = await doctorAPI.getDoctorDetails({ 
                    type: "doctor_id", id: selectedDoctorForBooking.id 
                });
                
                const doctorCurrentBalance = parseFloat(docRes.data.balance || 0);
                const fee = parseFloat(selectedDoctorForBooking.appointment_fee || 0);
                const doctorNewBalance = doctorCurrentBalance + fee;

                const updateDoctorPayload = {
                    type: 'doctor',
                    id: selectedDoctorForBooking.id,
                    data: { balance: doctorNewBalance.toFixed(2) }
                };
                await authAPI.updateProfile(updateDoctorPayload);
            } catch (docUpdateErr) {
                console.error("Failed to update doctor's balance:", docUpdateErr);
            }

            const appointmentPayload = {
                doctor_id: selectedDoctorForBooking.id,
                patient_id: user.id,
                date: selectedDateApi,
                time: selectedDoctorForBooking.expected_time_raw ? selectedDoctorForBooking.expected_time_raw.slice(0, 5) : "00:00",
                status: 1, // Pending
                type: bookingType
            };
            await appointmentAPI.makeAppointment(appointmentPayload);

            setBookingModalOpen(false);

            setConfirmedDetails({
                doctor: selectedDoctorForBooking.doctor_name,
                designation: selectedDoctorForBooking.designation,
                date: selectedDateDisplay,
                time: selectedDoctorForBooking.expected_time_fmt,
                fee: selectedDoctorForBooking.appointment_fee
            });
            setConfirmationModalOpen(true);

            // Auto-refresh the search to get updated lists/times
            await handleFindDoctors();

        } catch (error) {
            console.error("Booking transaction failed", error);
            Swal.fire({ icon: 'error', title: 'Failed', text: 'Transaction could not be completed.', confirmButtonColor: '#26658C' });
        } finally {
            setIsBookingLoading(false);
        }
    };

    // --- FILTER & UTILS ---
    const getVisibleDoctors = () => {
        let filtered = [...doctors];
        if (locationQuery) {
            filtered = filtered.filter(d => d.location.toLowerCase().includes(locationQuery.toLowerCase()));
        }
        if (sortOrder === 'asc') filtered.sort((a, b) => parseFloat(a.appointment_fee) - parseFloat(b.appointment_fee));
        else if (sortOrder === 'desc') filtered.sort((a, b) => parseFloat(b.appointment_fee) - parseFloat(a.appointment_fee));
        return filtered;
    };

    const formatLocationForSuggestion = (fullLoc) => {
        if (!fullLoc) return '';
        const parts = fullLoc.split(',');
        if (parts.length <= 2) return fullLoc;
        return parts.slice(-2).join(', ').trim();
    };

    const allVisibleDoctors = getVisibleDoctors();
    const totalPages = Math.ceil(allVisibleDoctors.length / itemsPerPage);
    const currentDoctors = allVisibleDoctors.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    
    const paginate = (pageNumber) => {
        if (pageNumber >= 1 && pageNumber <= totalPages) setCurrentPage(pageNumber);
    };

    const filteredLocations = locationsList.filter(l => l.toLowerCase().includes(locationQuery.toLowerCase()));

    // --- RENDER PAGINATION ---
    const renderPagination = () => {
        if (totalPages <= 1) return null;
        const buttons = [];
        let startPage = Math.max(1, currentPage - 1);
        let endPage = Math.min(totalPages, startPage + 3);
        if (endPage - startPage < 3) startPage = Math.max(1, endPage - 3);

        buttons.push(
            <button key="prev" className="page-btn-modern" onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}>
                <FaChevronLeft size={10} />
            </button>
        );

        for (let i = startPage; i <= endPage; i++) {
            buttons.push(
                <button key={i} className={`page-btn-modern ${currentPage === i ? 'active' : ''}`} onClick={() => paginate(i)}>
                    {i}
                </button>
            );
        }

        if (endPage < totalPages) buttons.push(<span key="dots" style={{color:'#B0BEC5', fontSize:'0.8rem'}}>...</span>);

        buttons.push(
            <button key="next" className="page-btn-modern" onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages}>
                <FaChevronRight size={10} />
            </button>
        );
        return buttons;
    };

    return (
        <Container fluid className="p-4">
            
            <div className="d-flex align-items-center mb-4">
                <div className="back-btn-circle me-3" onClick={() => navigate(-1)}>
                    <FaChevronLeft size={12} />
                </div>
                <div>
                    <h2 className="page-title-serif mb-0">Book Appointment</h2>
                </div>
            </div>

            <Row className="justify-content-center">
                <Col xl={8} lg={10}>
                    <div className="search-bar-container">
                        <Row className="g-3 align-items-center justify-content-center">
                            
                            <Col md={4}>
                                <div className="d-flex gap-2">
                                    <div className="position-relative flex-grow-1" ref={calendarRef} style={{zIndex: 1050}}>
                                        <div 
                                            className={`input-luna-trigger ${showCalendar ? 'active' : ''}`}
                                            onClick={() => setShowCalendar(!showCalendar)}
                                        >
                                            <span className={selectedDateDisplay ? 'text-selected-val' : 'text-placeholder'}>
                                                {selectedDateDisplay || 'Select Date'}
                                            </span>
                                            <FaCalendarAlt className="text-luna-light" size={14} />
                                        </div>
                                        {showCalendar && (
                                            <div className="cal-popup">
                                                <CustomCalendar 
                                                    onSelect={(apiDate) => {
                                                        setSelectedDateApi(apiDate);
                                                        setSelectedDateDisplay(formatDateLong(apiDate));
                                                        setShowCalendar(false);
                                                    }}
                                                    onClose={() => setShowCalendar(false)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Col>

                            <Col md={5}>
                                <LunaDropdown 
                                    options={departments}
                                    value={selectedDept}
                                    onChange={(val) => setSelectedDept(val)}
                                    placeholder="Select Department"
                                />
                            </Col>

                            <Col md={3}>
                                <div className="d-flex gap-2">
                                    <button className="btn-find-docs flex-grow-1" onClick={handleFindDoctors} disabled={loading}>
                                        {loading ? (
                                            <div className="d-flex align-items-center justify-content-center gap-2">
                                                <div className="spinner-sm border-white"></div>
                                            </div>
                                        ) : (
                                            <><FaSearch size={14}/> Find</>
                                        )}
                                    </button>
                                    
                                    {showResults && (
                                        <button 
                                            className="btn-reset-search" 
                                            onClick={handleResetSearch}
                                            title="Clear Results"
                                        >
                                            <FaTimes size={14} />
                                        </button>
                                    )}
                                </div>
                            </Col>
                        </Row>
                    </div>
                </Col>
            </Row>

            {/* --- THE GEMINI VOICE ASSISTANT --- */}
            {!searchPerformed && (
                <Row className="justify-content-center mb-4 fade-in">
                    <Col xl={7} lg={9}>
                        <VoiceAssist 
                            text={voiceText} 
                            onTextChange={setVoiceText} 
                            onProcessClick={handleProcessVoiceText} 
                        />
                    </Col>
                </Row>
            )}

            {searchPerformed && (
                <hr className="my-4" style={{ borderColor: 'var(--luna-light)', opacity: 0.2 }} />
            )}

            {loading && (
                <div className="loading-container fade-in">
                    <div className="custom-spinner"></div>
                    <p style={{fontFamily: "'Google Sans', sans-serif", fontWeight: '500'}}>Searching Doctors...</p>
                </div>
            )}

            {!loading && showResults && (
                <div className="fade-in">
                    
                    <div className="filter-bar-wrapper">
                        <div className="location-search-box">
                            <FaMapMarkerAlt className="loc-search-icon" />
                            <input 
                                type="text" 
                                className="input-location-search" 
                                placeholder="Location"
                                value={locationQuery}
                                onChange={(e) => {
                                    setLocationQuery(e.target.value);
                                    setShowSuggestions(e.target.value.length > 0);
                                }}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            />
                            {showSuggestions && filteredLocations.length > 0 && (
                                <div className="autocomplete-dropdown">
                                    {filteredLocations.slice(0,5).map((loc, idx) => (
                                        <div key={idx} className="suggestion-item" onClick={() => { setLocationQuery(loc); setShowSuggestions(false); }}>
                                            <FaMapMarkerAlt size={10} className="text-luna-light"/> {formatLocationForSuggestion(loc)}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button 
                            className={`btn-sort-gradient ${sortOrder !== 'none' ? 'active' : ''}`}
                            onClick={() => setSortOrder(prev => prev === 'none' ? 'asc' : prev === 'asc' ? 'desc' : 'none')}
                        >
                            {sortOrder === 'none' && <FaSort />}
                            {sortOrder === 'asc' && <FaSortAmountUp />}
                            {sortOrder === 'desc' && <FaSortAmountDown />}
                            {sortOrder === 'none' ? 'Sort by Fee' : sortOrder === 'asc' ? 'Low to High' : 'High to Low'}
                        </button>
                    </div>

                    <div className="plain-table-container">
                        <table className="plain-table">
                            <thead>
                                <tr>
                                    <th style={{width: '22%'}}>Doctor</th>
                                    <th style={{width: '15%'}}>Designation</th>
                                    <th style={{width: '25%'}}>Location</th>
                                    <th style={{width: '15%'}}>Expected Time</th>
                                    <th style={{width: '15%'}}>Fee</th>
                                    <th style={{width: '14%'}}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentDoctors.length > 0 ? (
                                    currentDoctors.map((doc) => {
                                        const eduList = parseEducation(doc.education);
                                        return (
                                            <tr key={doc.id}>
                                                <td className="text-start ps-4">
                                                    <div className="doc-info-cell">
                                                        <div className="avatar-box bg-light text-luna-mid rounded-circle mt-1" style={{minWidth:'40px', height:'40px'}}>
                                                            <FaUserMd />
                                                        </div>
                                                        <div className="d-flex flex-column text-start">
                                                            <span className="doc-name">{doc.doctor_name}</span>
                                                            <div className="d-flex flex-column">
                                                                {eduList.length > 0 ? eduList.map((item, i) => (
                                                                    <div key={i} className="edu-row">
                                                                        <FaUniversity size={10} />
                                                                        <span className="edu-inst">{item.institution}</span>
                                                                        <span className="edu-sep">|</span>
                                                                        <span className="edu-deg">{item.degree}</span>
                                                                    </div>
                                                                )) : (
                                                                    <small className="text-muted fst-italic">MBBS</small>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td><span className="text-unified">{doc.designation}</span></td>
                                                <td><span className="text-unified">{doc.location}</span></td>
                                                <td><span className="time-bold">{doc.expected_time_fmt}</span></td>
                                                <td><span className="fee-val"><span className="currency-symbol-normal">৳</span>{doc.appointment_fee}</span></td>
                                                <td>
                                                    <div className="d-flex align-items-center justify-content-center gap-2">
                                                        <button className="btn-icon-circle btn-icon-call" onClick={() => handlePhoneClick(doc)}>
                                                            <FaPhone size={14}/>
                                                        </button>
                                                        <button 
                                                            className="btn-icon-circle btn-icon-profile" 
                                                            onClick={() => handleViewProfile(doc)}
                                                        >
                                                            <FaUser size={14}/>
                                                        </button>
                                                        <button className="btn-action-book" onClick={() => openBookingModal(doc)}>
                                                            Book
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr className="row-transparent">
                                        <td colSpan="6" className="no-results-view no-results-content">
                                            <div className="nr-divider"></div>
                                            <h3 className="nr-title">NO DOCTORS FOUND</h3>
                                            <p className="nr-subtitle">We couldn't find any doctors matching your criteria. Try changing the location or date.</p>
                                            <div className="nr-divider"></div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="pagination-wrapper-right">
                            {renderPagination()}
                        </div>
                    )}
                </div>
            )}

            {bookingModalOpen && selectedDoctorForBooking && (
                <div className="modal-overlay">
                    <div className="booking-modal-card">
                        <div className="modal-header">
                            <h3 className="modal-title">Confirm Appointment</h3>
                            <div className="modal-subtitle">Verify details before proceeding</div>
                        </div>

                        {hasInsufficientBalance ? (
                            <div className="no-results-view p-0 mb-4" style={{ background: 'transparent', boxShadow: 'none' }}>
                                <div className="nr-divider my-2"></div>
                                <h3 className="nr-title" style={{fontSize: '0.9rem'}}>INSUFFICIENT BALANCE</h3>
                                <p className="nr-subtitle small">
                                    Appointment Fee: ৳{Math.floor(parseFloat(selectedDoctorForBooking.appointment_fee)).toLocaleString()} <br/>
                                    Your Balance: ৳{Math.floor(userBalance).toLocaleString()}
                                </p>
                                <div className="nr-divider my-2"></div>
                            </div>
                        ) : (
                            <div className="booking-summary">
                                <div className="summary-row">
                                    <span className="summary-label">Doctor</span>
                                    <span className="summary-val">{selectedDoctorForBooking.doctor_name}</span>
                                </div>
                                <div className="summary-row">
                                    <span className="summary-label">Date</span>
                                    <span className="summary-val">{selectedDateDisplay}</span>
                                </div>
                                <div className="summary-row">
                                    <span className="summary-label">Time</span>
                                    <span className="summary-val">{selectedDoctorForBooking.expected_time_fmt}</span>
                                </div>

                                <div className="summary-row mt-3 pt-2 border-top">
                                    <span className="summary-label">Current Balance</span>
                                    <span className="summary-val" style={{color: '#26658C'}}>
                                        ৳ {Math.floor(userBalance).toLocaleString()}
                                    </span>
                                </div>

                                <div className="summary-row">
                                    <span className="summary-label">Fees</span>
                                    <span className="summary-val" style={{color: '#C62828'}}>
                                        ৳ {Math.floor(parseFloat(selectedDoctorForBooking.appointment_fee)).toLocaleString()}
                                    </span>
                                </div>

                                <div className="summary-row pt-2 border-top">
                                    <span className="summary-label">Balance after confirming</span>
                                    <span className="summary-val" style={{color: '#2E7D32'}}>
                                        ৳ {Math.floor(newBalance).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        )}

                        {!hasInsufficientBalance && (
                            <div className="mb-3">
                                <label className="form-label">Appointment Type</label>
                                {isBookingLoading ? (
                                    <div className="d-flex align-items-center gap-2 text-muted small">
                                        <div className="spinner-sm text-luna-mid border-secondary"></div> Checking...
                                    </div>
                                ) : (
                                    <LunaDropdown 
                                        options={appointmentOptions}
                                        value={appointmentOptions.find(opt => opt.name === bookingType) || appointmentOptions[0]}
                                        onChange={(opt) => setBookingType(opt.name)}
                                        placeholder="Select Type"
                                        direction="up" 
                                    />
                                )}
                            </div>
                        )}

                        <div className="modal-actions">
                            <button className="btn-modal-cancel" onClick={() => setBookingModalOpen(false)}>Cancel</button>
                            {!hasInsufficientBalance && (
                                <button className="btn-modal-confirm" onClick={handleConfirmBooking} disabled={isBookingLoading}>
                                    {isBookingLoading ? 'Processing...' : 'Confirm'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {confirmationModalOpen && confirmedDetails && (
                <div className="modal-overlay">
                    <div className="booking-modal-card" style={{ maxWidth: '380px' }}>
                         <div className="text-center mb-4">
                             <div className="success-icon-circle mx-auto mb-3">
                                <FaCheckCircle size={50} color="#66BB6A" />
                             </div>
                             <h3 className="modal-title" style={{ fontFamily: "'Libre Baskerville', serif", fontWeight: 700, fontSize: '1.4rem' }}>
                                Appointment Confirmed!
                             </h3>
                         </div>
                         
                         <div className="text-center px-2">
                             <p className="font-google-sans text-luna-navy" style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                                 Your appointment with <strong>{confirmedDetails.doctor}</strong>, {confirmedDetails.designation} has been confirmed for <strong>{confirmedDetails.date}</strong> at <strong>{confirmedDetails.time}</strong>, with a consultation fee of <strong>{Math.floor(parseFloat(confirmedDetails.fee)).toLocaleString()} Taka</strong>.
                             </p>
                         </div>

                         <div className="modal-actions justify-content-center mt-4">
                             <button className="btn-modal-confirm" onClick={() => { setConfirmationModalOpen(false); setConfirmedDetails(null); }}>
                                 OK
                             </button>
                         </div>
                    </div>
                </div>
            )}

        </Container>
    );
};

export default BookAppointment;