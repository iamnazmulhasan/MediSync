import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { doctorAPI, patientAPI, authAPI, coreProfileAPI } from '../api/api';
import Swal from 'sweetalert2';
import { 
    FaUserCircle, FaEnvelope, FaPhone, FaMapMarkerAlt, 
    FaUserMd, FaUniversity, FaStethoscope, 
    FaUser, FaMoneyBillWave, FaArrowLeft, 
    FaNotesMedical, FaIdCard, FaHourglassHalf, 
    FaPen, FaCheck, FaTimes, FaBirthdayCake,
    FaCalendarAlt, FaChevronDown, FaChevronLeft, FaChevronRight, FaPlus, FaTrash,
    FaMapMarkedAlt, FaClock, FaUserClock
} from 'react-icons/fa';

// --- UTILS ---
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

const parseEducation = (eduString) => {
    if (!eduString) return [];
    return eduString.split(',').filter(x => x).map(item => {
        const match = item.match(/(.*)\((.*)\)/);
        if (match) return { institution: match[1].trim(), degree: match[2].trim() };
        return { institution: item.trim(), degree: '' };
    });
};

const formatDateToDisplay = (isoDate) => {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
};

const formatDateToApi = (displayDate) => {
    if (!displayDate) return '';
    const parts = displayDate.split('/');
    if (parts.length !== 3) return displayDate; 
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
};

// --- COMPONENT: CUSTOM CALENDAR ---
const CustomCalendar = ({ onSelect, onClose, initialDate }) => {
    const getStartDate = () => {
        if (initialDate) {
            const parts = initialDate.split('/');
            if (parts.length === 3) {
                const [day, month, year] = parts.map(Number);
                const date = new Date(year, month - 1, day);
                if (!isNaN(date.getTime())) return date;
            }
        }
        return new Date();
    };

    const [currentDate, setCurrentDate] = useState(getStartDate);
    const selectedDateObj = getStartDate();
    const currentYear = new Date().getFullYear();
    const years = Array.from({length: 125}, (_, i) => currentYear - i);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const handlePrev = () => setCurrentDate(new Date(year, month - 1, 1));
    const handleNext = () => setCurrentDate(new Date(year, month + 1, 1));
    
    const handleYearChange = (e) => {
        const newYear = parseInt(e.target.value);
        setCurrentDate(new Date(newYear, month, 1));
    };

    const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
    const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

    const totalDays = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const blanks = Array.from({ length: firstDay }, (_, i) => i);
    const dateArray = Array.from({ length: totalDays }, (_, i) => i + 1);

    const isSelected = (d) => d === selectedDateObj.getDate() && month === selectedDateObj.getMonth() && year === selectedDateObj.getFullYear();

    return (
        <div className="mini-calendar-wrapper" style={{padding: '10px'}}>
             <div className="d-flex justify-content-between align-items-center mb-2">
                <button type="button" className="cal-nav-btn" onClick={handlePrev}><FaChevronLeft/></button>
                <div className="d-flex align-items-center gap-1">
                    <span className="cal-title-text">{monthNames[month]}</span>
                    <select value={year} onChange={handleYearChange} className="cal-title-text border-0 bg-transparent p-0" style={{cursor: 'pointer', outline: 'none', appearance: 'none', textAlign: 'center'}}>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <button type="button" className="cal-nav-btn" onClick={handleNext}><FaChevronRight/></button>
            </div>
            
            <div className="mini-cal-grid">
                {days.map(d => <div key={d} className="mini-cal-head">{d}</div>)}
                {blanks.map(b => <div key={`blank-${b}`} className="mini-cal-day"></div>)}
                {dateArray.map(date => {
                    const active = isSelected(date);
                    return (
                        <div 
                            key={date} 
                            className="mini-cal-day"
                            style={active ? { border: '0.5px solid #26658C', borderRadius: '15px', fontWeight: 'bold', color: '#26658C', background: 'rgba(38, 101, 140, 0.13)' } : {}}
                            onClick={(e) => {
                                e.stopPropagation(); 
                                const formatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
                                onSelect(formatted);
                            }}
                        >
                            {date}
                        </div>
                    );
                })}
            </div>
            <div className="mt-3 text-center">
                <button type="button" className="btn-save-mini" onClick={onClose}>Close</button>
            </div>
        </div>
    );
};

// --- COMPONENT: LUNA DROPDOWN ---
const LunaDropdown = ({ options, value, onChange, placeholder = "Select", labelKey = null, valueKey = null, disabled = false, zIndex = 1000 }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (option) => {
        const val = valueKey ? option[valueKey] : option;
        onChange(val);
        setIsOpen(false);
    };

    const getDisplayLabel = () => {
        if (!value) return null;
        if (valueKey && labelKey) {
            const found = options.find(opt => opt[valueKey] === value);
            return found ? found[labelKey] : value;
        }
        return value;
    };

    return (
        <div className="position-relative w-100" ref={containerRef}>
            <div className={`input-luna-trigger ${isOpen ? 'active' : ''}`} style={{ borderRadius: '8px', background: disabled ? '#e9ecef' : 'rgba(255, 255, 255, 0.4)', border: '1px solid rgba(38, 101, 140, 0.2)', height: 'auto', padding: '6px 10px', opacity: disabled ? 0.7 : 1, pointerEvents: disabled ? 'none' : 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', width: '100%' }} onClick={() => !disabled && setIsOpen(!isOpen)}>
                <span className={getDisplayLabel() ? 'text-dark' : 'text-muted'} style={{fontSize: '1rem', fontFamily: 'Libre Baskerville, serif'}}>{getDisplayLabel() || placeholder}</span>
                <FaChevronDown className="text-luna-light" size={12} />
            </div>

            {isOpen && (
                <div className="popup-container" style={{ top: '110%', left: 0, width: '100%', zIndex: zIndex, borderRadius: '12px', boxShadow: '0 5px 25px rgba(0,0,0,0.1)', background: 'white', position: 'absolute' }}>
                    <div className="dept-list-scroll" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                        {options.map((opt, idx) => {
                            const optVal = valueKey ? opt[valueKey] : opt;
                            const optLabel = labelKey ? opt[labelKey] : opt;
                            return (
                                <div key={idx} className={`dept-option ${value === optVal ? 'selected' : ''}`} onClick={() => handleSelect(opt)} style={{padding: '10px 20px', cursor: 'pointer'}}>
                                    {optLabel}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};


const ViewProfile = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Check which ID was passed from the previous component
    const doctorId = location.state?.doctorId;
    const patientId = location.state?.patientId;
    const profileType = doctorId ? 'doctor' : (patientId ? 'patient' : null);

    // Get Logged In User to Check Role
    const loggedInUser = JSON.parse(localStorage.getItem('user')) || {};
    const isOfficer = loggedInUser.role === 'officer';
    const isReceptionist = loggedInUser.role === 'receptionist';

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [departmentOptions, setDepartmentOptions] = useState([]);

    // Independent Edit States (for Patient Chronic Diseases by non-officers)
    const [isEditingDisease, setIsEditingDisease] = useState(false);
    const [editedDisease, setEditedDisease] = useState("");

    // Officer Full Edit States
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editForm, setEditForm] = useState({});
    
    // Calendar State
    const [showCalendar, setShowCalendar] = useState(false);
    const calendarRef = useRef(null);

    // Doctor Preferences Specific Fields (Visible strictly to Officers/Receptionists)
    const doctorPrefFields = [
        { key: 'location', label: 'Location', icon: <FaMapMarkedAlt /> },
        { key: 'average_time', label: 'Average Consultation Time', icon: <FaClock /> },
        { key: 'appointment_fee', label: 'Consultation Fee', icon: <FaMoneyBillWave /> },
        { key: 'daily_patient_limit', label: 'Maximum Daily Patient Appointment Limit', icon: <FaUserClock /> },
    ];

    // Fetch initial profile
    useEffect(() => {
        const fetchDetails = async () => {
            if (!profileType) {
                setError("No profile selected.");
                setLoading(false);
                return;
            }

            try {
                // Fetch Departments for Dropdown if editing might happen
                if (profileType === 'doctor' && isOfficer) {
                    const deptRes = await authAPI.getDoctorTypes();
                    if (deptRes.data) setDepartmentOptions(deptRes.data.sort((a, b) => a.name.localeCompare(b.name)));
                }

                let res;
                if (profileType === 'doctor') {
                    res = await doctorAPI.getDoctorDetails({ type: 'doctor_id', id: doctorId });
                } else if (profileType === 'patient') {
                    res = await patientAPI.getPatientDetails({ type: 'patient_id', id: patientId });
                    setEditedDisease(res.data.chronic_diseases || "");
                }
                
                // Original Implementation: Directly set the response data without custom flattening
                setProfile(res.data);
            } catch (err) {
                console.error(`Failed to fetch ${profileType} details`, err);
                setError(`Failed to load ${profileType} profile.`);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [doctorId, patientId, profileType, isOfficer]);

    // Handle clicking outside the calendar
    useEffect(() => {
        const handleClickOutsideCal = (event) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target)) setShowCalendar(false);
        };
        document.addEventListener("mousedown", handleClickOutsideCal);
        return () => document.removeEventListener("mousedown", handleClickOutsideCal);
    }, []);

    // --- STANDARD PATIENT CHRONIC DISEASE UPDATE ---
    const handleSaveDisease = async () => {
        try {
            await authAPI.updateProfile({
                type: 'patient',
                id: profile.id, 
                data: { chronic_diseases: editedDisease }
            });
            setProfile(prev => ({ ...prev, chronic_diseases: editedDisease }));
            setIsEditingDisease(false);
            
            Swal.fire({ icon: 'success', title: 'Updated', text: 'Chronic diseases updated successfully.', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Update Failed', text: 'Could not update the chronic diseases.', customClass: { popup: 'swal-modern-popup' } });
        }
    };

    // --- OFFICER IN-PLACE EDIT HANDLERS ---
    const handleOfficerEditToggle = () => {
        if (isEditingProfile) {
            setIsEditingProfile(false);
            setEditForm({});
            setShowCalendar(false);
        } else {
            const initialForm = { ...profile };
            if (initialForm.dob) initialForm.dob = formatDateToDisplay(initialForm.dob);
            if (profileType === 'doctor') {
                initialForm.educationArray = parseEducation(profile.education);
                if (initialForm.educationArray.length === 0) initialForm.educationArray = [{ institution: '', degree: '' }];
            }
            setEditForm(initialForm);
            setIsEditingProfile(true);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
    };

    const handleDateInputChange = (e) => {
        let val = e.target.value.replace(/\D/g, ''); 
        if (val.length > 8) val = val.slice(0, 8); 
        let formattedVal = val;
        if (val.length > 2) formattedVal = val.slice(0, 2) + '/' + val.slice(2);
        if (val.length > 4) formattedVal = formattedVal.slice(0, 5) + '/' + formattedVal.slice(5);
        setEditForm({ ...editForm, dob: formattedVal });
    };

    const handleDropdownChange = (name, value) => setEditForm(prev => ({ ...prev, [name]: value }));
    const handleEducationChange = (index, field, value) => {
        const updatedEdu = [...editForm.educationArray];
        updatedEdu[index][field] = value;
        setEditForm(prev => ({ ...prev, educationArray: updatedEdu }));
    };
    const addEducationRow = () => setEditForm(prev => ({ ...prev, educationArray: [...prev.educationArray, { institution: '', degree: '' }] }));
    const removeEducationRow = (index) => {
        const updatedEdu = editForm.educationArray.filter((_, i) => i !== index);
        setEditForm(prev => ({ ...prev, educationArray: updatedEdu }));
    };

    // --- MASTER SAVE FOR OFFICER ---
    const handleOfficerSaveChanges = async () => {
        const dataToSave = { ...editForm };
        if (dataToSave.dob) dataToSave.dob = formatDateToApi(dataToSave.dob);

        if (profileType === 'doctor' && dataToSave.educationArray) {
            dataToSave.education = dataToSave.educationArray.filter(i => i.institution && i.degree).map(i => `${i.institution}(${i.degree})`).join(',');
            delete dataToSave.educationArray;
        }

        const personFields = ['name', 'email', 'mobile', 'dob', 'nid', 'address', 'gender'];
        const changedData = {};
        const personData = {};
        let hasChanges = false;

        Object.keys(dataToSave).forEach(key => {
            let newVal = dataToSave[key];
            let oldVal = profile[key];

            if (newVal === "") newVal = null;
            if (oldVal === "") oldVal = null; 

            if (newVal !== oldVal) {
                hasChanges = true;
                if (personFields.includes(key)) personData[key] = newVal;
                else changedData[key] = newVal;
            }
        });

        if (!hasChanges) {
            setIsEditingProfile(false);
            return;
        }

        if (Object.keys(personData).length > 0) changedData.person = personData;

        try {
            const payload = { type: profileType, id: profile.id, data: changedData };
            
            await coreProfileAPI.updateProfile(payload);
            
            // Update local state smoothly
            const updatedProfile = { ...profile, ...dataToSave };
            setProfile(updatedProfile);
            
            Swal.fire({ icon: 'success', title: 'Profile Updated', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
            setIsEditingProfile(false);
        } catch (error) {
            console.error("Update failed", error);
            Swal.fire({ icon: 'error', title: 'Update Failed', text: 'Could not save changes.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        }
    };

    // --- UNIFIED RENDER HELPER ---
    const renderField = (name, value, icon, isLocked = false, type = "text") => {
        if (isEditingProfile && !isLocked) {
            if (name === 'dob') {
                return (
                    <div className="d-flex align-items-center w-100" ref={calendarRef}>
                        {icon && <span className="me-2 opacity-50">{icon}</span>}
                        <div className="position-relative w-100">
                            <input type="text" name="dob" value={editForm.dob || ''} onChange={handleDateInputChange} className="editable-field w-100" placeholder="DD/MM/YYYY" style={{paddingRight: '35px'}} />
                            <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#26658C', zIndex: 10 }} onClick={() => setShowCalendar(!showCalendar)}>
                                <FaCalendarAlt size={14} />
                            </div>
                            {showCalendar && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', zIndex: 1050, background: 'white', borderRadius: '12px', boxShadow: '0 5px 25px rgba(0,0,0,0.15)', width: '280px' }}>
                                    <CustomCalendar initialDate={editForm.dob} onSelect={(apiDateStr) => {
                                        setEditForm(prev => ({ ...prev, dob: formatDateToDisplay(apiDateStr) }));
                                        setShowCalendar(false);
                                    }} onClose={() => setShowCalendar(false)} />
                                </div>
                            )}
                        </div>
                    </div>
                );
            }

            return (
                <div className="d-flex align-items-center w-100">
                    {icon && <span className="me-2 opacity-50">{icon}</span>}
                    <input type={type} name={name} value={editForm[name] || ''} onChange={handleInputChange} className="editable-field" />
                </div>
            );
        }

        // View Logic
        let displayValue = value;
        if (name === 'dob' && value) displayValue = formatDateToDisplay(value);

        return (
            <div className="info-value d-flex align-items-center gap-2">
                {icon && React.cloneElement(icon, { size: 14, className: "opacity-50" })} 
                {displayValue || 'N/A'}
            </div>
        );
    };

    if (loading) return <div className="d-flex justify-content-center align-items-center vh-100 font-body">Loading Profile...</div>;
    if (error) return <div className="d-flex justify-content-center align-items-center vh-100 font-body text-danger">{error}</div>;
    if (!profile) return null;

    const age = calculateAge(profile.dob);

    return (
        <div className="container-fluid py-5 px-4 px-lg-5 fade-in">
            {/* Back Button */}
            <button 
                onClick={() => navigate(-1)} 
                className="btn btn-light mb-4 d-flex align-items-center gap-2 shadow-sm rounded-pill px-3"
                style={{fontFamily: "'Google Sans', sans-serif", fontWeight: '600', color: '#546E7A', width: 'fit-content'}}
            >
                <FaArrowLeft size={12} /> Back
            </button>

            <div className="row g-5">
                
                {/* --- LEFT COLUMN: IMAGE --- */}
                <div className="col-lg-5 col-xl-4">
                    <div className="profile-img-card mb-4 position-relative">
                        <div className="profile-placeholder-img">
                            <FaUserCircle size={150} style={{opacity: 0.5}} />
                        </div>

                        {/* OFFICER GLOBAL EDIT TOGGLE (Floating Top Right) */}
                        {isOfficer && (
                            <div className="profile-actions-float">
                                {isEditingProfile ? (
                                    <>
                                        <div className="action-btn-circle save-btn" onClick={handleOfficerSaveChanges} title="Save Changes">
                                            <FaCheck size={16} />
                                        </div>
                                        <div className="action-btn-circle cancel-btn" onClick={handleOfficerEditToggle} title="Cancel">
                                            <FaTimes size={16} />
                                        </div>
                                    </>
                                ) : (
                                    <div className="action-btn-circle" onClick={handleOfficerEditToggle} title="Edit Profile">
                                        <FaPen size={14} />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* --- RIGHT COLUMN: INFO & DETAILS --- */}
                <div className="col-lg-7 col-xl-8 ps-lg-4">
                    
                    {/* Header Section */}
                    <div className="mb-4">
                        <div className="font-serif-italic mb-2 fs-5">Profile of</div>
                        {isEditingProfile ? (
                            <input 
                                type="text" 
                                name="name" 
                                className="name-input-edit display-4 mb-2" 
                                value={editForm.name || ''} 
                                onChange={handleInputChange} 
                            />
                        ) : (
                            <h1 className="font-heading display-4 mb-2">
                                {profileType === 'doctor' 
                                    ? (profile.name && profile.name.toLowerCase().startsWith('dr') ? profile.name : `Dr. ${profile.name}`)
                                    : profile.name
                                }
                            </h1>
                        )}
                        
                        {profileType === 'doctor' && !isEditingProfile && (
                            <div className="d-flex align-items-center text-muted gap-2 font-body">
                                <span>{profile.designation}</span>
                                {profile.department_name && (
                                    <>
                                        <span>•</span>
                                        <span>{profile.department_name}</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="section-divider"></div>

                    {/* Details Section */}
                    <div className="mb-5">
                        <h4 className="font-heading mb-4 text-capitalize">{profileType} Details</h4>
                        
                        <div className="row g-4">
                            {/* SHARED FIELDS */}
                            <div className="col-md-6">
                                <div className="info-label">Email Address</div>
                                {renderField('email', profile.email, <FaEnvelope />, true)} 
                            </div>

                            <div className="col-md-6">
                                <div className="info-label">Mobile Number</div>
                                {renderField('mobile', profile.mobile, <FaPhone />)}
                            </div>

                            <div className="col-md-6">
                                <div className="info-label">Age / DOB</div>
                                {isEditingProfile ? (
                                    renderField('dob', profile.dob, <FaBirthdayCake />, false, 'date')
                                ) : (
                                    <div className="info-value d-flex align-items-center gap-2">
                                        <FaHourglassHalf size={14} className="opacity-50" />
                                        {age} years ({formatDateToDisplay(profile.dob)})
                                    </div>
                                )}
                            </div>

                            <div className="col-md-6">
                                <div className="info-label">Gender</div>
                                {isEditingProfile ? (
                                    <div className="d-flex align-items-center gender-select-wrapper">
                                        <FaUser className="me-2 opacity-50" size={14} />
                                        <select name="gender" className="editable-field" value={editForm.gender || ''} onChange={handleInputChange}>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Prefer not to say">Prefer not to say</option>
                                            <option value="Unspecified">Unspecified</option>
                                        </select>
                                    </div>
                                ) : (
                                    renderField('gender', profile.gender, <FaUser />)
                                )}
                            </div>

                            {/* DOCTOR SPECIFIC FIELDS */}
                            {profileType === 'doctor' && (
                                <>
                                    <div className="col-md-6">
                                        <div className="info-label">Designation</div>
                                        {renderField('designation', profile.designation, <FaUserMd />)}
                                    </div>

                                    <div className="col-md-6">
                                        <div className="info-label">Department</div>
                                        {isEditingProfile ? (
                                            <div className="d-flex align-items-center w-100">
                                                <FaStethoscope className="me-2 opacity-50" size={14} />
                                                <LunaDropdown 
                                                    options={departmentOptions} 
                                                    value={editForm.department} 
                                                    onChange={(val) => handleDropdownChange('department', val)} 
                                                    placeholder="Select Department" 
                                                    labelKey="name" 
                                                    valueKey="id" 
                                                    zIndex={1050} 
                                                />
                                            </div>
                                        ) : (
                                            renderField('department_name', profile.department_name, <FaStethoscope />)
                                        )}
                                    </div>

                                    {/* Show Location and Fee here ONLY if user is NOT an Officer and NOT a Receptionist */}
                                    {(!isOfficer && !isReceptionist) && (
                                        <>
                                            <div className="col-12">
                                                <div className="info-label">Location</div>
                                                {renderField('location', profile.location, <FaMapMarkerAlt />, true)}
                                            </div>

                                            <div className="col-md-6">
                                                <div className="info-label">Consultation Fee</div>
                                                <div className="info-value d-flex align-items-center gap-2">
                                                    <FaMoneyBillWave className="opacity-50" size={14} />
                                                    ৳ {profile.appointment_fee ? Math.round(parseFloat(profile.appointment_fee)) : 0}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <div className="col-12">
                                        <div className="info-label mb-2">Degrees & Certifications</div>
                                        <div className="d-flex flex-wrap gap-2">
                                            {isEditingProfile ? (
                                                <>
                                                    {editForm.educationArray.map((item, index) => (
                                                        <div key={index} className="kindred-pill editable">
                                                            <input type="text" className="pill-input inst" placeholder="Inst." value={item.institution} onChange={(e) => handleEducationChange(index, 'institution', e.target.value)} />
                                                            <span className="opacity-50">|</span>
                                                            <input type="text" className="pill-input degree" placeholder="Degree" value={item.degree} onChange={(e) => handleEducationChange(index, 'degree', e.target.value)} />
                                                            <FaTrash size={10} className="text-danger ms-1 cursor-pointer" onClick={() => removeEducationRow(index)} />
                                                        </div>
                                                    ))}
                                                    <div className="kindred-pill editable" onClick={addEducationRow} style={{cursor: 'pointer', borderStyle: 'solid', borderColor: '#e0e0e0'}}>
                                                        <FaPlus className="text-muted" size={10} />
                                                    </div>
                                                </>
                                            ) : (
                                                parseEducation(profile.education).length > 0 ? (
                                                    parseEducation(profile.education).map((deg, index) => (
                                                        <div key={index} className="kindred-pill">
                                                            <FaUniversity />
                                                            <span className="fw-bold">{deg.institution}</span>
                                                            <span className="opacity-50">|</span>
                                                            <span>{deg.degree}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-muted font-body fst-italic">No degrees listed.</span>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* PATIENT SPECIFIC FIELDS */}
                            {profileType === 'patient' && (
                                <>
                                    <div className="col-md-6">
                                        <div className="info-label">NID Number</div>
                                        {renderField('nid', profile.nid, <FaIdCard />, true)}
                                    </div>

                                    <div className="col-12">
                                        <div className="info-label">Address</div>
                                        {renderField('address', profile.address, <FaMapMarkerAlt />)}
                                    </div>

                                    {/* Patient Chronic Diseases */}
                                    <div className="col-12">
                                        <div className="d-flex align-items-center mb-1">
                                            <div className="info-label mb-0 me-3">Chronic Diseases</div>
                                            {/* Local Edit Toggle (Only for non-officers since Officers use Global Edit) */}
                                            {!isOfficer && !isEditingDisease && (
                                                <div className="rx-edit-circle" style={{ width: '22px', height: '22px', fontSize: '0.65rem' }} onClick={() => setIsEditingDisease(true)} title="Edit Diseases">
                                                    <FaPen />
                                                </div>
                                            )}
                                            {!isOfficer && isEditingDisease && (
                                                <div className="d-flex gap-2">
                                                    <div className="rx-edit-circle text-success border-success" style={{ width: '22px', height: '22px', fontSize: '0.65rem', background: '#E8F5E9' }} onClick={handleSaveDisease}>
                                                        <FaCheck />
                                                    </div>
                                                    <div className="rx-edit-circle text-danger border-danger" style={{ width: '22px', height: '22px', fontSize: '0.65rem', background: '#FFEBEE' }} onClick={() => { setIsEditingDisease(false); setEditedDisease(profile.chronic_diseases || ""); }}>
                                                        <FaTimes />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {isEditingProfile ? (
                                            <textarea 
                                                className="form-control mt-2" 
                                                name="chronic_diseases" 
                                                rows="2" 
                                                value={editForm.chronic_diseases || ''} 
                                                onChange={handleInputChange} 
                                                placeholder="Enter chronic diseases..." 
                                                style={{ fontFamily: "'Google Sans', sans-serif", fontSize: '0.9rem', color: 'var(--luna-navy)' }} 
                                            />
                                        ) : !isEditingDisease ? (
                                            <div className="info-value d-flex align-items-center gap-2 mt-1">
                                                <FaNotesMedical size={14} className="opacity-50" /> 
                                                {profile.chronic_diseases || 'None reported'}
                                            </div>
                                        ) : (
                                            <textarea 
                                                className="form-control mt-2" 
                                                rows="2" 
                                                value={editedDisease} 
                                                onChange={(e) => setEditedDisease(e.target.value)} 
                                                placeholder="Enter chronic diseases..." 
                                                style={{ fontFamily: "'Google Sans', sans-serif", fontSize: '0.9rem', color: 'var(--luna-navy)' }} 
                                            />
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* DOCTOR: Personal Preference Section (Hidden from Patients, Visible to Officers & Receptionists) */}
                    {profileType === 'doctor' && (isOfficer || isReceptionist) && (isEditingProfile || doctorPrefFields.some(field => profile[field.key])) && (
                        <div className="mb-5">
                            <div className="section-divider"></div>
                            <h4 className="font-heading mb-4">Personal Preference</h4>
                            
                            <div className="row g-4">
                                {isEditingProfile ? (
                                    doctorPrefFields.map((field) => (
                                        <div key={field.key} className="col-md-6">
                                            <div className="info-label">{field.label}</div>
                                            {renderField(field.key, profile[field.key], field.icon, false, field.key === 'appointment_fee' || field.key === 'daily_patient_limit' ? 'number' : 'text')}
                                        </div>
                                    ))
                                ) : (
                                    doctorPrefFields
                                        .filter(field => profile[field.key]) 
                                        .map(field => (
                                            <div key={field.key} className="col-md-6">
                                                <div className="info-label">{field.label}</div>
                                                <div className="info-value d-flex align-items-center gap-2">
                                                    {React.cloneElement(field.icon, { size: 14, className: "opacity-50" })} 
                                                    {field.key === 'appointment_fee' 
                                                        ? `৳ ${Math.round(parseFloat(profile[field.key] || 0))}` 
                                                        : profile[field.key]}
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default ViewProfile;