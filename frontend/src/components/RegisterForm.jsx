import React, { useState, useEffect, useRef } from 'react';
import { authAPI } from '../api/api';
import LoginForm from './LoginForm';
import Swal from 'sweetalert2'; 
import { motion, AnimatePresence } from 'framer-motion'; 
import { 
    FaUserInjured, FaUserMd, FaArrowLeft, FaEnvelope, FaPlus, FaTrash, 
    FaCheckCircle, FaTimesCircle, FaChevronDown, FaCalendarAlt, 
    FaChevronLeft, FaChevronRight, FaEye, FaEyeSlash 
} from 'react-icons/fa';

// --- DATA CONSTANTS (FULL LIST RESTORED) ---

const INSTITUTION_DEGREES = {
    "BCPS": ["FCPS"],
    "BSMMU": ["MBBS", "BDS", "MD", "MS", "MPhil", "PhD"],
    "BSMRMU": ["MBBS", "MD", "MS", "PhD"],
    "DU": ["MBBS", "BDS", "MD", "MS", "MPhil", "PhD"],
    "CU": ["MBBS", "BDS", "MD", "MS", "MPhil", "PhD"],
    "RU": ["MBBS", "BDS", "MD", "MS", "MPhil", "PhD"],
    "SUST": ["MBBS", "MD", "MS", "MPhil", "PhD"],
    "KU": ["MBBS", "MPhil", "PhD"],
    // MBBS Only Colleges
    "DMC": ["MBBS"], "SSMC": ["MBBS"], "ShSMC": ["MBBS"], "ShSMMC": ["MBBS"],
    "MMC": ["MBBS"], "RMC": ["MBBS"], "CMC": ["MBBS"], "SOMC": ["MBBS"],
    "SBMC": ["MBBS"], "RpMC": ["MBBS"], "KMC": ["MBBS"], "FMC": ["MBBS"],
    "CoMC": ["MBBS"], "NoMC": ["MBBS"], "CoxMC": ["MBBS"], "PabMC": ["MBBS"],
    "SZMC": ["MBBS"], "DinMC": ["MBBS"], "JasMC": ["MBBS"], "KusMC": ["MBBS"],
    "SatMC": ["MBBS"], "MagMC": ["MBBS"], "GaiMC": ["MBBS"], "LalMC": ["MBBS"],
    "NilMC": ["MBBS"], "PatuMC": ["MBBS"], "BhoMC": ["MBBS"], "GopMC": ["MBBS"],
    "MadMC": ["MBBS"], "ShaMC": ["MBBS"], "HabMC": ["MBBS"], "SunMC": ["MBBS"],
    "MouMC": ["MBBS"], "BanMC": ["MBBS"], "RangMC": ["MBBS"], "KhaMC": ["MBBS"]
};

const DESIGNATIONS = [
    "Intern Doctor", "Honorary Medical Officer (HMO)", "Indoor Medical Officer (IMO)",
    "Medical Officer (MO)", "Junior Consultant", "Consultant", "Senior Consultant",
    "Assistant Professor", "Associate Professor", "Professor", "Head of Department (HOD)"
].sort();

const GENDER_OPTIONS = ["Female", "Male", "Prefer not to say", "Unspecified"].sort();

const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 4000, 
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
});

// --- DATE HELPERS ---

// Converts YYYY-MM-DD (API) -> DD/MM/YYYY (Display)
const formatDateToDisplay = (isoDate) => {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
};

// Converts DD/MM/YYYY (Display) -> YYYY-MM-DD (API)
const formatDateToApi = (displayDate) => {
    if (!displayDate) return '';
    const parts = displayDate.split('/');
    if (parts.length !== 3) return displayDate; 
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
};

// --- COMPONENT: CUSTOM CALENDAR (Updated with initialDate & Outline) ---
const CustomCalendar = ({ onSelect, onClose, initialDate }) => {
    // 1. Initialize logic: Parse "DD/MM/YYYY" or default to Today
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
    
    // Dynamic Years (1900 - Current)
    const currentYear = new Date().getFullYear();
    const years = Array.from({length: 125}, (_, i) => currentYear - i);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Capture selected date for outlining
    const selectedDateObj = getStartDate(); 
    const isSelected = (d, m, y) => {
        return d === selectedDateObj.getDate() && m === selectedDateObj.getMonth() && y === selectedDateObj.getFullYear();
    };

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

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

    return (
        <div className="mini-calendar-wrapper" style={{padding: '10px'}}>
             <div className="d-flex justify-content-between align-items-center mb-2">
                <button type="button" className="cal-nav-btn" onClick={handlePrev}><FaChevronLeft/></button>
                <div className="d-flex align-items-center gap-1">
                    <span className="cal-title-text">{monthNames[month]}</span>
                    <select 
                        value={year} 
                        onChange={handleYearChange}
                        className="cal-title-text border-0 bg-transparent p-0"
                        style={{cursor: 'pointer', outline: 'none', appearance: 'none', textAlign: 'center'}}
                    >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <button type="button" className="cal-nav-btn" onClick={handleNext}><FaChevronRight/></button>
            </div>
            
            <div className="mini-cal-grid">
                {days.map(d => <div key={d} className="mini-cal-head">{d}</div>)}
                {blanks.map(b => <div key={`blank-${b}`} className="mini-cal-day"></div>)}
                {dateArray.map(date => {
                    // Check if this date is the selected one
                    const active = isSelected(date, month, year);
                    
                    return (
                        <div 
                            key={date} 
                            className="mini-cal-day"
                            style={active ? {
                                border: '0.5px solid #26658C', // Outline Color (Same as Header/Close btn)
                                borderRadius: '15px',         // Smoothed Square
                                fontWeight: 'bold',
                                color: '#26658C',
                                background: 'rgba(38, 101, 140, 0.13)' // Light background
                            } : {}}
                            onClick={(e) => {
                                e.stopPropagation(); 
                                // Calendar returns YYYY-MM-DD
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

// --- COMPONENT: LUNA DROPDOWN (Hybrid: supports Flow or Float) ---
const LunaDropdown = ({ 
    options, value, onChange, placeholder = "Select", 
    labelKey = null, valueKey = null, disabled = false, 
    zIndex = 1000, dropUp = false, variant = 'float' // 'float' = absolute (overlay), 'flow' = relative (push)
}) => {
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
        onChange(valueKey ? option[valueKey] : option);
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

    // Determine the CSS class based on variant
    const popupClass = variant === 'flow' ? 'popup-flow' : 'popup-float';

    return (
        <div ref={containerRef} className="position-relative">
            {/* Trigger Area */}
            <div 
                className={`input-luna-trigger ${isOpen ? 'active' : ''}`}
                style={{ 
                    borderRadius: '12px', background: disabled ? '#e9ecef' : '#F5FDFF',
                    border: '1px solid #E0F2F1', height: 'auto', padding: '0.6rem 0.7rem',
                    opacity: disabled ? 0.7 : 1, pointerEvents: disabled ? 'none' : 'auto',
                    position: 'relative'
                }}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <span className={getDisplayLabel() ? 'text-dark' : 'text-muted'} style={{fontSize: '0.85rem', fontWeight: '500'}}>
                    {getDisplayLabel() || placeholder}
                </span>
                <FaChevronDown className="text-luna-light" size={12} style={{position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)'}} />
            </div>

            {/* Popup Area */}
            {isOpen && (
                <div 
                    className={`${popupClass} ${dropUp ? 'dropup' : ''}`} 
                    style={{ zIndex: zIndex }}
                >
                    <div className="dept-list-scroll" style={{ maxHeight: '220px' }}>
                        {options.map((opt, idx) => {
                            const optVal = valueKey ? opt[valueKey] : opt;
                            const optLabel = labelKey ? opt[labelKey] : opt;
                            const isSelected = value === optVal;
                            return (
                                <div key={idx} className={`dept-option ${isSelected ? 'selected' : ''}`} onClick={() => handleSelect(opt)}>
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


const RegisterForm = () => {
    const [activeTab, setActiveTab] = useState('login'); 
    const [isRedirect, setIsRedirect] = useState(false);
    const [checkedEmail, setCheckedEmail] = useState('');
    
    // Registration State
    const [step, setStep] = useState(1);
    const [role, setRole] = useState(''); 
    const [isLoading, setIsLoading] = useState(false);
    const [formAlert, setFormAlert] = useState(null); 
    const [email, setEmail] = useState('');
    const [profileData, setProfileData] = useState({ gender: '' });
    
    // Password Visibility State
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [lockedFields, setLockedFields] = useState([]); 
    const [isExistingAuthUser, setIsExistingAuthUser] = useState(false); 
    const [existingUserId, setExistingUserId] = useState(null);
    const [retrievalMsg, setRetrievalMsg] = useState(null);

    // Dynamic Degrees & API Data
    const [degreeRows, setDegreeRows] = useState([{ institution: "", degree: "" }]);
    const [departmentOptions, setDepartmentOptions] = useState([]);

    // Calendar Popup State
    const [showCalendar, setShowCalendar] = useState(false);
    const calendarRef = useRef(null);

    // Click outside handler for Calendar
    useEffect(() => {
        const handleClickOutsideCal = (event) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target)) {
                setShowCalendar(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutsideCal);
        return () => document.removeEventListener("mousedown", handleClickOutsideCal);
    }, []);

    // --- FETCH DOCTOR TYPES ---
    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const res = await authAPI.getDoctorTypes();
                if (res.data) {
                    const sorted = res.data.sort((a, b) => a.name.localeCompare(b.name));
                    setDepartmentOptions(sorted);
                }
            } catch (error) {
                console.error("Failed to fetch doctor types", error);
            }
        };
        fetchDepartments();
    }, []);

    const parseApiResponse = (response) => {
        const data = response.data;
        if (data && typeof data.exists === 'boolean' && data.exists === false) return null;
        if (data && data.exists === true) return data.patient || data.doctor || data.user || data;
        if (data && Object.keys(data).length > 0 && !data.exists) return data;
        return null;
    };

    const handleRoleSelect = (selectedRole) => {
        setRole(selectedRole); setStep(2); setFormAlert(null); setProfileData({ gender: '' });
        setLockedFields(['email']); setIsExistingAuthUser(false); setExistingUserId(null); setRetrievalMsg(null);
        setDegreeRows([{ institution: "", degree: "" }]);
        setConfirmPassword(''); 
    };

    const handleEmailCheck = async (e) => {
        e.preventDefault(); setIsLoading(true); setFormAlert({ type: 'info', msg: 'Checking...' });
        try {
            const userResponse = await authAPI.checkProfile('user', email);
            const existingAuthData = parseApiResponse(userResponse);
            
            if (existingAuthData) {
                setIsExistingAuthUser(true);
                const userData = existingAuthData.user || existingAuthData;
                setExistingUserId(userData.id); 
                
                const split_name = (userData.name || "").split(" ");
                
                // Prefill Data (Format DOB to DD/MM/YYYY)
                const prefilledData = {
                    email: email,
                    first_name: split_name[0] || "",
                    last_name: split_name.slice(1).join(" ") || "",
                    phone_number: userData.mobile || "",
                    nid: userData.nid || "",
                    dob: userData.dob ? formatDateToDisplay(userData.dob) : "", 
                    address: userData.address || "",
                    gender: userData.gender || "" 
                };

                const fieldsToLock = ['email', 'first_name', 'last_name', 'phone_number', 'nid', 'dob', 'address'];
                if (userData.gender) fieldsToLock.push('gender');

                setRetrievalMsg(`Data retrieved from User account`);

                const roleResponse = await authAPI.checkProfile(role, email);
                if (parseApiResponse(roleResponse)) {
                    setFormAlert(null); setIsRedirect(true); setCheckedEmail(email); setActiveTab('login'); setIsLoading(false); return; 
                }
                
                const otherRole = role === 'patient' ? 'doctor' : 'patient';
                const otherRoleResponse = await authAPI.checkProfile(otherRole, email);
                const otherProfile = parseApiResponse(otherRoleResponse);
                
                if (otherProfile) {
                    const otherData = otherProfile.user || otherProfile;
                    if (otherData.gender) {
                        prefilledData.gender = otherData.gender;
                        if (!fieldsToLock.includes('gender')) fieldsToLock.push('gender');
                    }
                    setRetrievalMsg(`Data retrieved from ${otherRole} profile`);
                    setFormAlert({ type: 'success', msg: `Found your ${otherRole} details.` });
                } else {
                    setFormAlert({ type: 'success', msg: `Found your User details.` });
                }

                setProfileData(prefilledData);
                setLockedFields(fieldsToLock);

            } else { 
                setIsExistingAuthUser(false); 
                setExistingUserId(null); 
                setProfileData({ email, gender: '' }); 
                setRetrievalMsg(null);
                setFormAlert(null); 
            }
            setTimeout(() => setStep(3), 300);
        } catch (error) { console.error("Check Error", error); setFormAlert({ type: 'danger', msg: "Connection failed." });
        } finally { setIsLoading(false); }
    };

    const handleDegreeChange = (index, field, value) => {
        const updatedRows = [...degreeRows];
        updatedRows[index][field] = value;
        if (field === 'institution') {
            updatedRows[index].degree = ""; 
        }
        setDegreeRows(updatedRows);
    };

    const addDegreeRow = () => {
        setDegreeRows([...degreeRows, { institution: "", degree: "" }]);
    };

    const removeDegreeRow = (index) => {
        if (degreeRows.length > 1) {
            const updatedRows = degreeRows.filter((_, i) => i !== index);
            setDegreeRows(updatedRows);
        }
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault(); 

        if (!isExistingAuthUser) {
            if (profileData.password !== confirmPassword) {
                Toast.fire({ icon: 'error', title: 'Passwords do not match!' });
                return;
            }
        }

        setIsLoading(true);
        try {
            // Convert DOB back to YYYY-MM-DD for API
            const apiDob = formatDateToApi(profileData.dob);

            const commonData = {
                email: profileData.email,
                name: `${profileData.first_name} ${profileData.last_name}`.trim(),
                mobile: profileData.phone_number,
                nid: profileData.nid,
                dob: apiDob,
                address: profileData.address,
                gender: profileData.gender,
                password: profileData.password,
                username: profileData.email 
            };
            
            let activeUserId = existingUserId;

            if (!isExistingAuthUser) {
                const userRes = await authAPI.createProfile('user', commonData);
                const createdUser = userRes.data.user || userRes.data; 
                
                if (createdUser && createdUser.id) {
                    activeUserId = createdUser.id;
                } else if (userRes.data && userRes.data.id) {
                    activeUserId = userRes.data.id;
                }
            }
            
            let educationString = "";
            if (role === 'doctor') {
                educationString = degreeRows
                    .filter(row => row.institution && row.degree)
                    .map(row => `${row.institution}(${row.degree})`)
                    .join(',');
            }

            const profilePayload = { 
                ...commonData, 
                person_id: activeUserId, 
                user: activeUserId, 
                user_id: activeUserId,
                
                education: role === 'doctor' ? educationString : undefined,
                designation: role === 'doctor' ? profileData.designation : undefined,
                department: role === 'doctor' ? profileData.department : undefined
            };

            await authAPI.createProfile(role, profilePayload);
            
            Toast.fire({ 
                icon: 'success', 
                title: 'Account created successfully',
                timer: 3000 
            }); 
            
            setTimeout(() => {
                setCheckedEmail(profileData.email); 
                setIsRedirect(false); 
                setActiveTab('login');
                
                // RESET STATE & FIX LOADING BUTTON ISSUE
                setStep(1);
                setRole('');
                setEmail(''); 
                setProfileData({ gender: '' });
                setConfirmPassword('');
                setDegreeRows([{ institution: "", degree: "" }]);
                setLockedFields([]);
                setIsExistingAuthUser(false);
                setIsLoading(false); // Unblock button
            }, 2000);

        } catch (error) {
            let errorMsg = 'Registration failed.';
            if (error.response && error.response.data) { 
                errorMsg = JSON.stringify(error.response.data).replace(/[{"}\[\]]/g, ' ').trim(); 
            }
            Toast.fire({ icon: 'error', title: errorMsg });
            setIsLoading(false); 
        }
    };

    const handleInputChange = (e) => { setProfileData({ ...profileData, [e.target.name]: e.target.value }); };
    
    // --- AUTO-FORMAT DATE INPUT (DD/MM/YYYY) ---
    const handleDateInputChange = (e) => {
        let val = e.target.value.replace(/\D/g, ''); // Remove non-numeric
        if (val.length > 8) val = val.slice(0, 8); // Limit to 8 digits
        
        let formattedVal = val;
        // Insert slash after 2nd char
        if (val.length > 2) {
            formattedVal = val.slice(0, 2) + '/' + val.slice(2);
        }
        // Insert slash after 4th char
        if (val.length > 4) {
            formattedVal = formattedVal.slice(0, 5) + '/' + formattedVal.slice(5);
        }
        
        setProfileData({ ...profileData, dob: formattedVal });
    };

    const handleDropdownChange = (name, value) => { setProfileData(prev => ({ ...prev, [name]: value })); };

    const handleTabClick = (tab) => { 
        setActiveTab(tab); 
        setIsLoading(false);
        if (tab === 'login') { setIsRedirect(false); setCheckedEmail(''); } 
    };

    const variants = { hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0, transition: { duration: 0.3 } }, exit: { opacity: 0, x: -20, transition: { duration: 0.2 } } };

    const passwordsMatch = profileData.password && confirmPassword && profileData.password === confirmPassword;
    const passwordsMismatch = profileData.password && confirmPassword && profileData.password !== confirmPassword;

    const sortedInstitutions = Object.keys(INSTITUTION_DEGREES).sort();

    return (
        <div className="auth-container">
            <div className="glass-card">
                <div className="auth-toggle-wrapper mb-3">
                    <div className="auth-toggle-container">
                        <div className={`toggle-slider ${activeTab === 'register' ? 'right' : ''}`}></div>
                        <button className={`toggle-btn ${activeTab === 'login' ? 'active' : ''}`} onClick={() => handleTabClick('login')}>Log In</button>
                        <button className={`toggle-btn ${activeTab === 'register' ? 'active' : ''}`} onClick={() => handleTabClick('register')}>Register</button>
                    </div>
                </div>

                <AnimatePresence mode='wait'>
                    {activeTab === 'login' && (
                        <motion.div key="login-view" variants={variants} initial="hidden" animate="visible" exit="exit">
                            <LoginForm isRedirect={isRedirect} prefilledEmail={checkedEmail} />
                        </motion.div>
                    )}

                    {activeTab === 'register' && (
                        <motion.div key="register-view" variants={variants} initial="hidden" animate="visible" exit="exit">
                            {step === 1 && (
                                <div className="text-center pt-3">
                                    <h3 className="form-title mb-4" style={{fontWeight: '600', fontSize: '1.2rem', textTransform: 'uppercase'}}>I AM A...</h3>
                                    <div className="d-flex gap-3 justify-content-center">
                                        <div className="role-card flex-fill" onClick={() => handleRoleSelect('patient')}><FaUserInjured size={40} style={{color: '#54ACBF'}} className="mb-2" /><div className="fw-bold text-dark small">PATIENT</div></div>
                                        <div className="role-card flex-fill" onClick={() => handleRoleSelect('doctor')}><FaUserMd size={40} style={{color: '#26658C'}} className="mb-2" /><div className="fw-bold text-dark small">DOCTOR</div></div>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div>
                                    <div className="d-flex align-items-center mb-1 position-relative">
                                        <div style={{position: 'absolute', left: '-10px'}}><button onClick={() => setStep(1)} className="btn-back"><FaArrowLeft size={14}/></button></div>
                                        <h3 className="email-verify-header">Enter your email to verify eligibility</h3>
                                    </div>
                                    <div className="mb-4"></div> 
                                    
                                    <form onSubmit={handleEmailCheck}>
                                        <div className="mb-3">
                                            <label className="form-label">Email Address</label>
                                            <div className="input-group-custom">
                                                <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="name@example.com" />
                                                <FaEnvelope className="input-icon" size={14}/>
                                            </div>
                                        </div>
                                        {formAlert && <div className={`alert alert-${formAlert.type} py-1 small mb-2`}>{formAlert.msg}</div>}
                                        <button className="btn btn-modern w-100 mt-1" type="submit" disabled={isLoading}>{isLoading ? '...' : 'Continue'}</button>
                                    </form>
                                </div>
                            )}

                            {step === 3 && (
                                <div>
                                    <div className="d-flex flex-column align-items-center mb-3 position-relative">
                                        <div style={{position: 'absolute', left: '-10px', top: '0'}}><button onClick={() => setStep(2)} className="btn-back"><FaArrowLeft size={14}/></button></div>
                                        <h3 className="form-title w-100 text-center mb-0" style={{fontSize: '1.5rem', textTransform: 'uppercase', fontWeight: '900'}}>{role} DETAILS</h3>
                                        
                                        {retrievalMsg && <span className="text-muted small mt-1" style={{fontSize: '0.75rem', fontWeight: '500'}}>{retrievalMsg}</span>}
                                    </div>

                                    <form onSubmit={handleRegisterSubmit}>
                                        <div className="row g-2">
                                            <div className="col-12"><div className="mb-custom"><label className="form-label">Email</label><input type="email" className="form-control locked-input" value={profileData.email || ''} readOnly /></div></div>
                                            <div className="col-6"><div className="mb-custom"><label className="form-label">First Name</label><input type="text" name="first_name" className={`form-control ${lockedFields.includes('first_name') ? 'locked-input' : ''}`} value={profileData.first_name || ''} onChange={handleInputChange} readOnly={lockedFields.includes('first_name')} required /></div></div>
                                            <div className="col-6"><div className="mb-custom"><label className="form-label">Last Name</label><input type="text" name="last_name" className={`form-control ${lockedFields.includes('last_name') ? 'locked-input' : ''}`} value={profileData.last_name || ''} onChange={handleInputChange} readOnly={lockedFields.includes('last_name')} required /></div></div>
                                            
                                            <div className="col-6"><div className="mb-custom"><label className="form-label">Mobile</label><input type="tel" name="phone_number" className={`form-control ${lockedFields.includes('phone_number') ? 'locked-input' : ''}`} value={profileData.phone_number || ''} onChange={handleInputChange} readOnly={lockedFields.includes('phone_number')} required /></div></div>
                                            <div className="col-6"><div className="mb-custom"><label className="form-label">NID</label><input type="text" name="nid" className={`form-control ${lockedFields.includes('nid') ? 'locked-input' : ''}`} value={profileData.nid || ''} onChange={handleInputChange} readOnly={lockedFields.includes('nid')} required /></div></div>
                                            
                                            <div className="col-12"><div className="mb-custom"><label className="form-label">Address</label><input type="text" name="address" className={`form-control ${lockedFields.includes('address') ? 'locked-input' : ''}`} value={profileData.address || ''} onChange={handleInputChange} readOnly={lockedFields.includes('address')} required /></div></div>
                                            
                                            <div className="col-6">
                                                <div className="mb-custom">
                                                    <label className="form-label">Gender</label>
                                                    {lockedFields.includes('gender') ? (
                                                        <input type="text" className="form-control locked-input" value={profileData.gender} readOnly />
                                                    ) : (
                                                        // Gender: Uses "flow" to push content down
                                                        <LunaDropdown options={GENDER_OPTIONS} value={profileData.gender || ''} onChange={(val) => handleDropdownChange('gender', val)} placeholder="Select" zIndex={1003} variant='flow' />
                                                    )}
                                                </div>
                                            </div>

                                            {/* BIRTH DATE: Uses "flow" style to push content down */}
                                            <div className="col-6">
                                                <div className="mb-custom" ref={calendarRef}>
                                                    <label className="form-label">Birth Date</label>
                                                    {lockedFields.includes('dob') ? (
                                                         <input type="text" className="form-control locked-input" value={profileData.dob} readOnly />
                                                    ) : (
                                                        <div>
                                                            <div className="position-relative input-group-custom">
                                                                <input 
                                                                    type="text" 
                                                                    className="form-control" 
                                                                    name="dob"
                                                                    value={profileData.dob || ''}
                                                                    onChange={handleDateInputChange} 
                                                                    placeholder="DD/MM/YYYY"
                                                                />
                                                                {/* Icon is locked inside input group (STABLE) */}
                                                                <div className="input-icon-date" onClick={() => setShowCalendar(!showCalendar)}>
                                                                    <FaCalendarAlt size={12} />
                                                                </div>
                                                            </div>
                                                            {/* Popup is a sibling (Pushes content down via CSS .popup-flow) */}
                                                            {showCalendar && (
                                                                <div className="popup-flow popup-center" style={{zIndex: 1004}}>
                                                                    <CustomCalendar 
                                                                        initialDate={profileData.dob} // Passes the initial date
                                                                        onSelect={(apiDateStr) => {
                                                                            const displayDate = formatDateToDisplay(apiDateStr);
                                                                            handleInputChange({ target: { name: 'dob', value: displayDate }});
                                                                            setShowCalendar(false);
                                                                        }}
                                                                        onClose={() => setShowCalendar(false)}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {role === 'doctor' && ( <>
                                                <div className="col-12">
                                                    <div className="d-flex flex-column" style={degreeRows.length > 1 ? { border: '1px solid rgba(84, 172, 191, 0.3)', borderRadius: '12px', padding: '10px' } : {}}>
                                                        {degreeRows.map((row, index) => (
                                                            <React.Fragment key={index}>
                                                                <div className="d-flex w-100" style={{ gap: '10px', marginBottom: index === degreeRows.length - 1 ? 0 : '10px' }}>
                                                                    <div style={{ flex: 1 }}>
                                                                        <div className="mb-custom">
                                                                            <label className="form-label">Institution</label>
                                                                            {/* FLOAT VARIANT (Default: Overlays content) */}
                                                                            <LunaDropdown options={sortedInstitutions} value={row.institution} onChange={(val) => handleDegreeChange(index, 'institution', val)} placeholder="Select" zIndex={1002} variant='float' />
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ flex: 1 }}>
                                                                        <div className="mb-custom">
                                                                            <label className="form-label">Degree</label>
                                                                            {/* FLOAT VARIANT (Default: Overlays content) */}
                                                                            <LunaDropdown options={(row.institution && INSTITUTION_DEGREES[row.institution]) ? INSTITUTION_DEGREES[row.institution].sort() : []} value={row.degree} onChange={(val) => handleDegreeChange(index, 'degree', val)} placeholder="Select" disabled={!row.institution} zIndex={1002} variant='float' />
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ width: 'auto' }}>
                                                                        <div className="d-flex align-items-center justify-content-center" style={{ paddingTop: '36.5px' }}>
                                                                                {index === degreeRows.length - 1 ? (
                                                                                    <div onClick={addDegreeRow} className="d-flex align-items-center justify-content-center" style={{ width: '18px', height: '18px', borderRadius: '50%', border: '1.5px solid var(--luna-mid)', cursor: 'pointer', color: 'var(--luna-mid)' }}><FaPlus size={8} /></div>
                                                                                ) : (
                                                                                    <div onClick={() => removeDegreeRow(index)} className="d-flex align-items-center justify-content-center" style={{ width: '18px', height: '18px', borderRadius: '50%', border: '1.5px solid #ef4444', cursor: 'pointer', color: '#ef4444' }}><FaTrash size={8} /></div>
                                                                                )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                </div>
                                                
                                                <div className="col-12">
                                                    <div className="mb-custom">
                                                        <label className="form-label">Designation</label>
                                                        {/* FLOW VARIANT (Pushes content down) */}
                                                        <LunaDropdown options={DESIGNATIONS} value={profileData.designation || ''} onChange={(val) => handleDropdownChange('designation', val)} placeholder="Select" zIndex={1001} variant='flow' />
                                                    </div>
                                                </div>
                                                <div className="col-12">
                                                    <div className="mb-custom">
                                                        <label className="form-label">Department</label>
                                                        {/* FLOW VARIANT (Pushes content down) */}
                                                        <LunaDropdown options={departmentOptions} value={profileData.department || ''} onChange={(val) => handleDropdownChange('department', val)} placeholder="Select Department" labelKey="name" valueKey="id" zIndex={1000} variant='flow' />
                                                    </div>
                                                </div>
                                            </> )}

                                            {!isExistingAuthUser && ( 
                                                <>
                                                    <div className="col-12">
                                                        <div className="mb-custom">
                                                            <label className="form-label">Password</label>
                                                            <div className="input-group-custom position-relative">
                                                                <input 
                                                                    type={showPassword ? "text" : "password"} 
                                                                    name="password" 
                                                                    className="form-control" 
                                                                    onChange={handleInputChange} 
                                                                    required 
                                                                />
                                                                <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)}>
                                                                    {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div> 
                                                    <div className="col-12">
                                                        <div className="mb-custom">
                                                            <label className="form-label">Confirm Password</label>
                                                            <div className="input-group-custom position-relative">
                                                                <input 
                                                                    type={showConfirmPassword ? "text" : "password"} 
                                                                    className="form-control" 
                                                                    value={confirmPassword} 
                                                                    onChange={(e) => setConfirmPassword(e.target.value)} 
                                                                    required 
                                                                    style={passwordsMismatch ? { borderColor: 'var(--status-cancelled)' } : {}}
                                                                />
                                                                
                                                                {/* VALIDATION ICON (Check/Cross) - Sits LEFT of Eye */}
                                                                {confirmPassword && (
                                                                    <div className="validation-icon">
                                                                        {passwordsMatch ? (
                                                                            <FaCheckCircle color="var(--status-pending)" size={14} />
                                                                        ) : (
                                                                            <FaTimesCircle color="var(--status-cancelled)" size={14} />
                                                                        )}
                                                                    </div>
                                                                )}

                                                                <button type="button" className="password-toggle-btn" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                                                    {showConfirmPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                                                                </button>
                                                            </div>
                                                            {passwordsMismatch && (
                                                                <small className="d-block mt-1 fw-bold" style={{ color: 'var(--status-cancelled)', fontSize: '0.75rem' }}>
                                                                    Password didn't match
                                                                </small>
                                                            )}
                                                            {passwordsMatch && (
                                                                <small className="d-block mt-1 fw-bold" style={{ color: 'var(--status-pending)', fontSize: '0.75rem' }}>
                                                                    Password matched
                                                                </small>
                                                            )}
                                                        </div>
                                                    </div> 
                                                </>
                                            )}
                                        </div>
                                        <button type="submit" className="btn btn-modern w-100 mt-2" disabled={isLoading}>{isLoading ? '...' : 'Register'}</button>
                                    </form>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
export default RegisterForm;