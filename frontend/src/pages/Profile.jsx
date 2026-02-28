import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/api';
import Swal from 'sweetalert2';
import { 
    FaUserCircle, FaEnvelope, FaPhone, FaMapMarkerAlt, 
    FaBirthdayCake, FaIdCard, FaUserMd, 
    FaCog, FaPen, FaUniversity, FaStethoscope, FaCheckCircle, 
    FaUser, FaHourglassHalf, FaCheck, FaTimes, FaPlus, FaTrash,
    FaMapMarkedAlt, FaClock, FaMoneyBillWave, FaUserClock, FaNotesMedical, FaBan, FaLock, FaChevronDown,
    FaCalendarAlt, FaChevronLeft, FaChevronRight 
} from 'react-icons/fa';

// --- DATE HELPERS ---
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
    // 1. Initialize logic: Parse "DD/MM/YYYY" or default to Today
    const getStartDate = () => {
        if (initialDate) {
            const parts = initialDate.split('/');
            if (parts.length === 3) {
                const [day, month, year] = parts.map(Number);
                // Check if valid date
                const date = new Date(year, month - 1, day);
                if (!isNaN(date.getTime())) return date;
            }
        }
        return new Date();
    };

    const [currentDate, setCurrentDate] = useState(getStartDate);
    
    // Capture the actually selected date object to compare for styling
    const selectedDateObj = getStartDate();

    const currentYear = new Date().getFullYear();
    // Allow range from 1900 to Current Year
    const years = Array.from({length: 125}, (_, i) => currentYear - i);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
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

    // Helper to check if a specific grid date matches the selected input date
    const isSelected = (d) => {
        return d === selectedDateObj.getDate() &&
               month === selectedDateObj.getMonth() &&
               year === selectedDateObj.getFullYear();
    };

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
                    const active = isSelected(date);
                    return (
                        <div 
                            key={date} 
                            className="mini-cal-day"
                            style={active ? {
                                border: '0.5px solid #26658C', // Outline Color
                                borderRadius: '15px',         // Smoothed Square
                                fontWeight: 'bold',
                                color: '#26658C',
                                background: 'rgba(38, 101, 140, 0.13)' // Light background
                            } : {}}
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
const LunaDropdown = ({ 
    options, value, onChange, placeholder = "Select", 
    labelKey = null, valueKey = null, disabled = false, zIndex = 1000
}) => {
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
            <div 
                className={`input-luna-trigger ${isOpen ? 'active' : ''}`}
                style={{ 
                    borderRadius: '8px', 
                    background: disabled ? '#e9ecef' : 'rgba(255, 255, 255, 0.4)',
                    border: '1px solid rgba(38, 101, 140, 0.2)',
                    height: 'auto',
                    padding: '6px 10px',
                    opacity: disabled ? 0.7 : 1,
                    pointerEvents: disabled ? 'none' : 'auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    width: '100%'
                }}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <span className={getDisplayLabel() ? 'text-dark' : 'text-muted'} style={{fontSize: '1rem', fontFamily: 'Libre Baskerville, serif'}}>
                    {getDisplayLabel() || placeholder}
                </span>
                <FaChevronDown className="text-luna-light" size={12} />
            </div>

            {isOpen && (
                <div 
                    className="popup-container" 
                    style={{ 
                        top: '110%', 
                        left: 0,
                        width: '100%',
                        zIndex: zIndex,
                        borderRadius: '12px',
                        boxShadow: '0 5px 25px rgba(0,0,0,0.1)',
                        background: 'white',
                        position: 'absolute'
                    }}
                >
                    <div className="dept-list-scroll" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                        {options.map((opt, idx) => {
                            const optVal = valueKey ? opt[valueKey] : opt;
                            const optLabel = labelKey ? opt[labelKey] : opt;
                            const isSelected = value === optVal;

                            return (
                                <div 
                                    key={idx} 
                                    className={`dept-option ${isSelected ? 'selected' : ''}`}
                                    onClick={() => handleSelect(opt)}
                                    style={{padding: '10px 20px', cursor: 'pointer'}}
                                >
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

const Profile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Departments Data
    const [departmentOptions, setDepartmentOptions] = useState([]);

    // Edit Mode States
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});

    // Calendar State
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

    // 1. Initial Load & Fetch Fresh Data
    useEffect(() => {
        const loadUserData = async () => {
            const storedUserStr = localStorage.getItem('user');
            if (!storedUserStr) { navigate('/login'); return; }

            const storedUser = JSON.parse(storedUserStr);
            setUser(storedUser); 

            // Fetch Departments List
            try {
                const deptRes = await authAPI.getDoctorTypes();
                if (deptRes.data) {
                    setDepartmentOptions(deptRes.data.sort((a, b) => a.name.localeCompare(b.name)));
                }
            } catch (err) {
                console.error("Failed to load departments", err);
            }

            // Fetch Fresh Profile Data
            if (storedUser.email && storedUser.role) {
                try {
                    const response = await authAPI.checkProfile(storedUser.role, storedUser.email);
                    const data = response.data;
                    let freshData = null;

                    if (data.exists) {
                        freshData = data.patient || data.doctor || data.receptionist || data.user;
                    } else if (!data.exists && (data.patient || data.doctor || data.receptionist || data.user)) {
                         freshData = data.patient || data.doctor || data.receptionist || data.user;
                    }

                    if (freshData) {
                        const updatedUser = { ...storedUser, ...freshData };
                        setUser(updatedUser);
                        localStorage.setItem('user', JSON.stringify(updatedUser));
                    }
                } catch (error) {
                    console.error("Failed to refresh profile data", error);
                }
            }
            setLoading(false);
        };
        loadUserData();
    }, [navigate]);

    // --- UTILS ---
    const parseEducation = (eduString) => {
        if (!eduString) return [];
        return eduString.split(',').filter(x => x).map(item => {
            const match = item.match(/(.*)\((.*)\)/);
            if (match) return { institution: match[1].trim(), degree: match[2].trim() };
            return { institution: item, degree: '' };
        });
    };

    const calculateAge = (dob) => {
        if (!dob) return null;
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const getDepartmentName = (id) => {
        if (!departmentOptions.length) return id; 
        const found = departmentOptions.find(d => d.id === id);
        return found ? found.name : id;
    };

    // --- HANDLERS ---

    const handleEditToggle = () => {
        if (isEditing) {
            setIsEditing(false);
            setEditForm({});
            setShowCalendar(false);
        } else {
            const initialForm = { ...user };
            
            // Format DOB for Display (YYYY-MM-DD -> DD/MM/YYYY)
            if (initialForm.dob) {
                initialForm.dob = formatDateToDisplay(initialForm.dob);
            }

            if (user.role === 'doctor') {
                initialForm.educationArray = parseEducation(user.education);
                if (initialForm.educationArray.length === 0) {
                    initialForm.educationArray = [{ institution: '', degree: '' }];
                }
            }
            setEditForm(initialForm);
            setIsEditing(true);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
    };

    // --- AUTO-FORMAT DATE INPUT (DD/MM/YYYY) ---
    const handleDateInputChange = (e) => {
        let val = e.target.value.replace(/\D/g, ''); 
        if (val.length > 8) val = val.slice(0, 8); 
        
        let formattedVal = val;
        if (val.length > 2) formattedVal = val.slice(0, 2) + '/' + val.slice(2);
        if (val.length > 4) formattedVal = formattedVal.slice(0, 5) + '/' + formattedVal.slice(5);
        
        setEditForm({ ...editForm, dob: formattedVal });
    };

    const handleDropdownChange = (name, value) => {
        setEditForm(prev => ({ ...prev, [name]: value }));
    };

    const handleEducationChange = (index, field, value) => {
        const updatedEdu = [...editForm.educationArray];
        updatedEdu[index][field] = value;
        setEditForm(prev => ({ ...prev, educationArray: updatedEdu }));
    };

    const addEducationRow = () => {
        setEditForm(prev => ({
            ...prev,
            educationArray: [...prev.educationArray, { institution: '', degree: '' }]
        }));
    };

    const removeEducationRow = (index) => {
        const updatedEdu = editForm.educationArray.filter((_, i) => i !== index);
        setEditForm(prev => ({ ...prev, educationArray: updatedEdu }));
    };

    const handleSaveChanges = async () => {
        const dataToSave = { ...editForm };

        // Convert DOB back to API format (DD/MM/YYYY -> YYYY-MM-DD)
        if (dataToSave.dob) {
            dataToSave.dob = formatDateToApi(dataToSave.dob);
        }

        if (user.role === 'doctor' && dataToSave.educationArray) {
            const eduString = dataToSave.educationArray
                .filter(item => item.institution && item.degree) 
                .map(item => `${item.institution}(${item.degree})`)
                .join(',');
            dataToSave.education = eduString;
            delete dataToSave.educationArray;
        }

        const changedData = {};
        let hasChanges = false;

        Object.keys(dataToSave).forEach(key => {
            let newVal = dataToSave[key];
            let oldVal = user[key];

            if (newVal === "") newVal = null;
            if (oldVal === "") oldVal = null; 

            if (newVal !== oldVal) {
                changedData[key] = newVal;
                hasChanges = true;
            }
        });

        if (!hasChanges) {
            setIsEditing(false);
            return;
        }

        try {
            const payload = {
                type: user.role, 
                id: user.id,     
                data: changedData
            };

            await authAPI.updateProfile(payload);

            const updatedUser = { ...user, ...changedData };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            Swal.fire({
                icon: 'success', title: 'Profile Updated',
                toast: true, position: 'top-end', showConfirmButton: false, timer: 2000
            });

            setIsEditing(false);

        } catch (error) {
            console.error("Update failed", error);
            Swal.fire({
                icon: 'error', title: 'Update Failed', text: 'Could not save changes.',
                toast: true, position: 'top-end', showConfirmButton: false, timer: 3000
            });
        }
    };

    // --- NEW: Change Password Handler (With Eye Toggles) ---
    const handleChangePassword = () => {
        // SVG strings for Eye and EyeSlash (matches FaEye/FaEyeSlash)
        const eyeIcon = `<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 576 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M572.52 241.4C518.29 135.59 410.93 64 288 64S57.68 135.64 3.48 241.41a32.35 32.35 0 0 0 0 29.19C57.71 376.41 165.07 448 288 448s230.32-71.64 284.52-177.41a32.35 32.35 0 0 0 0-29.19zM288 400a144 144 0 1 1 144-144 143.93 143.93 0 0 1-144 144zm0-240a95.31 95.31 0 0 0-25.31 3.79 47.85 47.85 0 0 1-66.9 66.9A95.78 95.78 0 1 0 288 160z"></path></svg>`;
        const eyeSlashIcon = `<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 640 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M320 400c-75.85 0-137.25-58.71-142.9-133.11L72.2 185.82c-13.79 17.3-26.48 35.59-36.72 55.59a32.35 32.35 0 0 0 0 29.19C89.71 376.41 197.07 448 320 448c26.91 0 52.87-4 77.89-10.46L346 397.39a144.13 144.13 0 0 1-26 2.61zm313.82 58.1l-110.55-85.44a331.25 331.25 0 0 0 81.25-102.07 32.35 32.35 0 0 0 0-29.19C550.29 135.59 442.93 64 320 64a308.15 308.15 0 0 0-147.32 37.7L45.46 3.37A16 16 0 0 0 23 6.18L3.37 31.45A16 16 0 0 0 6.18 53.9l588.36 454.73a16 16 0 0 0 22.46-2.81l19.64-25.27a16 16 0 0 0-2.82-22.45zm-179.16-138.48-73.93-57.14a96 96 0 0 1-23.34 23.35l-57.14-73.93c7.8-1.76 15.86-2.9 24.25-2.9a96 96 0 0 1 96 96c0 8.39-1.14 16.45-2.9 24.25zM320 240a95.25 95.25 0 0 0-6.19 33.39l-60.52-46.78a143.51 143.51 0 0 1 66.71-66.71l46.78 60.52A95.25 95.25 0 0 0 320 240z"></path></svg>`;

        Swal.fire({
            title: 'Change Password',
            width: 400, // Very compact width
            buttonsStyling: false, // Disable default styles to use our classes
            html: `
                <div class="text-start px-2">
                    <label class="form-label text-muted fw-bold text-uppercase swal-label-tight">New Password</label>
                    <div class="position-relative">
                        <input type="password" id="new_pass" class="form-control swal-input-tight" placeholder="">
                        <span id="toggle_new_pass" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #6c757d;">
                            ${eyeIcon}
                        </span>
                    </div>
                    
                    <label class="form-label text-muted fw-bold text-uppercase swal-label-tight mt-2">Confirm Password</label>
                    <div class="position-relative">
                        <input type="password" id="confirm_pass" class="form-control swal-input-tight" placeholder="">
                        <span id="toggle_confirm_pass" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #6c757d;">
                            ${eyeIcon}
                        </span>
                    </div>
                    <div id="pass-match-msg" class="mt-1 small fw-bold" style="height: 16px; font-size: 0.75rem;"></div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Save',
            cancelButtonText: 'Cancel',
            customClass: {
                popup: 'rounded-4 swal-compact-popup',
                title: 'swal-pass-title',
                confirmButton: 'btn-save-glow',
                cancelButton: 'btn-cancel-simple',
                actions: 'd-flex gap-1 justify-content-center mt-2' // Tighter button spacing
            },
            didOpen: () => {
                const newPassInput = Swal.getPopup().querySelector('#new_pass');
                const confirmPassInput = Swal.getPopup().querySelector('#confirm_pass');
                const toggleNewPass = Swal.getPopup().querySelector('#toggle_new_pass');
                const toggleConfirmPass = Swal.getPopup().querySelector('#toggle_confirm_pass');
                const msgDiv = Swal.getPopup().querySelector('#pass-match-msg');

                // Toggle visibility logic
                const toggleVisibility = (input, iconSpan) => {
                    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                    input.setAttribute('type', type);
                    iconSpan.innerHTML = type === 'password' ? eyeIcon : eyeSlashIcon;
                };

                toggleNewPass.addEventListener('click', () => toggleVisibility(newPassInput, toggleNewPass));
                toggleConfirmPass.addEventListener('click', () => toggleVisibility(confirmPassInput, toggleConfirmPass));

                const checkMatch = () => {
                    const p1 = newPassInput.value;
                    const p2 = confirmPassInput.value;

                    if (!p1 || !p2) {
                        msgDiv.innerHTML = '';
                        return;
                    }

                    if (p1 === p2) {
                        msgDiv.innerHTML = '<span class="text-success"><i class="fas fa-check-circle"></i> Matched</span>';
                    } else {
                        msgDiv.innerHTML = '<span class="text-danger">Mismatch</span>';
                    }
                };

                newPassInput.addEventListener('input', checkMatch);
                confirmPassInput.addEventListener('input', checkMatch);
            },
            preConfirm: async () => {
                const newPass = Swal.getPopup().querySelector('#new_pass').value;
                const confirmPass = Swal.getPopup().querySelector('#confirm_pass').value;

                if (!newPass || !confirmPass) {
                    Swal.showValidationMessage('Fill all fields');
                    return false;
                }
                if (newPass !== confirmPass) {
                    Swal.showValidationMessage('Passwords do not match');
                    return false;
                }

                try {
                    const profileCat = user.profile_category || 'person';
                    const targetId = (profileCat === 'person' && user.person_id) ? user.person_id : user.id;
                    const apiType = profileCat === 'business' ? 'pharmacy' : profileCat;

                    const payload = {
                        type: apiType,
                        id: targetId,
                        new_password: newPass
                    };

                    const response = await authAPI.changePassword(payload);
                    return response;
                } catch (error) {
                    Swal.showValidationMessage(
                        error.response?.data?.message || 'Failed'
                    );
                    return false;
                }
            }
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    icon: 'success',
                    title: 'Password changed successfully',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000
                });
            }
        });
    };

    // --- RENDER HELPERS ---
    
    const renderField = (name, value, icon, isLocked = false, type = "text") => {
        if (isEditing && !isLocked) {
            
            // SPECIAL CALENDAR RENDER FOR DOB
            if (name === 'dob') {
                return (
                    <div className="d-flex align-items-center w-100" ref={calendarRef}>
                        {icon && <span className="me-2 opacity-50">{icon}</span>}
                        <div className="position-relative w-100">
                            <input 
                                type="text" 
                                name="dob" 
                                value={editForm.dob || ''} 
                                onChange={handleDateInputChange}
                                className="editable-field w-100" 
                                placeholder="DD/MM/YYYY"
                                style={{paddingRight: '35px'}} 
                            />
                            {/* Calendar Icon - Moved upwards using translateY(-60%) */}
                            <div 
                                style={{
                                    position: 'absolute', right: '10px', top: '50%', 
                                    transform: 'translateY(-60%)', cursor: 'pointer',
                                    color: '#26658C', zIndex: 10
                                }} 
                                onClick={() => setShowCalendar(!showCalendar)}
                            >
                                <FaCalendarAlt size={14} />
                            </div>

                            {/* Calendar Popup */}
                            {showCalendar && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    marginTop: '8px',
                                    zIndex: 1050,
                                    background: 'white',
                                    borderRadius: '12px',
                                    boxShadow: '0 5px 25px rgba(0,0,0,0.15)',
                                    width: '280px' 
                                }}>
                                    <CustomCalendar 
                                        initialDate={editForm.dob} 
                                        onSelect={(apiDateStr) => {
                                            const displayDate = formatDateToDisplay(apiDateStr);
                                            setEditForm(prev => ({ ...prev, dob: displayDate }));
                                            setShowCalendar(false);
                                        }}
                                        onClose={() => setShowCalendar(false)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                );
            }

            return (
                <div className="d-flex align-items-center w-100">
                    {icon && <span className="me-2 opacity-50">{icon}</span>}
                    <input 
                        type={type}
                        name={name}
                        value={editForm[name] || ''}
                        onChange={handleInputChange}
                        className="editable-field"
                    />
                </div>
            );
        }

        let displayValue = value;
        if (name === 'dob' && value) {
            displayValue = formatDateToDisplay(value);
        }

        return (
            <div className="info-value d-flex align-items-center gap-2">
                {icon && React.cloneElement(icon, { size: 14, className: "opacity-50" })} 
                {displayValue || 'N/A'}
            </div>
        );
    };

    if (loading || !user) {
        return <div className="d-flex justify-content-center align-items-center vh-100 font-body">Loading Profile...</div>;
    }

    const isDoctor = user.role === 'doctor';
    const isReceptionist = user.role === 'receptionist';
    const age = calculateAge(user.dob);

    const doctorPrefFields = [
        { key: 'location', label: 'Location', icon: <FaMapMarkedAlt /> },
        { key: 'average_time', label: 'Average Consultation Time', icon: <FaClock /> },
        { key: 'appointment_fee', label: 'Consultation Fee', icon: <FaMoneyBillWave /> },
        { key: 'daily_patient_limit', label: 'Maximum Daily Patient Appointment Limit', icon: <FaUserClock /> },
    ];

    // Subtitle logic
    let subtitleText = 'Registered Patient';
    if (isDoctor) subtitleText = user.designation;
    if (isReceptionist) subtitleText = 'Registered Receptionist';

    return (
        <div className="container-fluid py-5 px-4 px-lg-5">
            <div className="row g-5">
                
                {/* --- LEFT COLUMN: IMAGE & QUICK STATS --- */}
                <div className="col-lg-5 col-xl-4">
                    <div className="profile-img-card mb-4">
                        <div className="profile-placeholder-img">
                            <FaUserCircle size={150} style={{opacity: 0.5}} />
                        </div>
                        
                        <div className="profile-actions-float">
                            {isEditing ? (
                                <>
                                    <div className="action-btn-circle save-btn" onClick={handleSaveChanges} title="Save Changes">
                                        <FaCheck size={16} />
                                    </div>
                                    <div className="action-btn-circle cancel-btn" onClick={handleEditToggle} title="Cancel">
                                        <FaTimes size={16} />
                                    </div>
                                </>
                            ) : (
                                <div className="action-btn-circle" onClick={handleEditToggle} title="Edit Profile">
                                    <FaPen size={14} />
                                </div>
                            )}
                            
                            <div className="action-btn-circle" onClick={handleChangePassword} title="Change Password">
                                <FaLock size={14} />
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats Capsules */}
                    <div className="d-flex flex-wrap gap-2">
                         {isDoctor && (
                             <div className={`status-pill ${user.active ? 'active' : 'inactive'}`}>
                                {user.active ? <FaCheckCircle /> : <FaBan />}
                                <span>{user.active ? 'Active' : 'Inactive'}</span>
                             </div>
                         )}

                         <div className="kindred-pill">
                             <FaUser />
                             <span>{user.gender || 'Not Specified'}</span>
                         </div>
                         {age !== null && (
                             <div className="kindred-pill">
                                 <FaHourglassHalf className="text-muted" />
                                 <span>{age} years old</span>
                             </div>
                         )}
                    </div>
                </div>

                {/* --- RIGHT COLUMN: INFO & DETAILS --- */}
                <div className="col-lg-7 col-xl-8 ps-lg-4">
                    
                    <div className="mb-4">
                        <div className="font-serif-italic mb-2 fs-5">Profile of</div>
                        {isEditing ? (
                            <input 
                                type="text" 
                                name="name" 
                                className="name-input-edit display-4 mb-2" 
                                value={editForm.name || ''} 
                                onChange={handleInputChange} 
                            />
                        ) : (
                            <h1 className="font-heading display-4 mb-2">
                                {isDoctor && !user.name.toLowerCase().startsWith('dr') ? `Dr. ${user.name}` : user.name}
                            </h1>
                        )}
                        
                        <div className="d-flex align-items-center text-muted gap-2 font-body">
                            <span>{subtitleText}</span>
                            {user.department && (
                                <>
                                    <span>•</span>
                                    <span>{getDepartmentName(user.department)}</span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="section-divider"></div>

                    {/* Personal Information */}
                    <div className="mb-5">
                        <h4 className="font-heading mb-4">Personal Information</h4>
                        <div className="font-body text-muted mb-4">
                            This information is used for medical records and appointments.
                        </div>

                        <div className="row g-4">
                            <div className="col-md-6">
                                <div className="info-label">Email Address</div>
                                {renderField('email', user.email, <FaEnvelope />, true)} 
                            </div>

                            <div className="col-md-6">
                                <div className="info-label">Mobile Number</div>
                                {renderField('mobile', user.mobile, <FaPhone />)}
                            </div>

                            <div className="col-md-6">
                                <div className="info-label">Date of Birth</div>
                                {renderField('dob', user.dob, <FaBirthdayCake />, false, 'date')}
                            </div>

                            <div className="col-md-6">
                                <div className="info-label">NID Number</div>
                                {renderField('nid', user.nid, <FaIdCard />, true)}
                            </div>

                            <div className="col-12">
                                <div className="info-label">Address</div>
                                {renderField('address', user.address, <FaMapMarkerAlt />)}
                            </div>

                             <div className="col-md-6">
                                <div className="info-label">Gender</div>
                                {isEditing ? (
                                    <div className="d-flex align-items-center gender-select-wrapper">
                                        <FaUser className="me-2 opacity-50" size={14} />
                                        <select 
                                            name="gender" 
                                            className="editable-field" 
                                            value={editForm.gender || ''} 
                                            onChange={handleInputChange}
                                        >
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Prefer not to say">Prefer not to say</option>
                                            <option value="Unspecified">Unspecified</option>
                                        </select>
                                    </div>
                                ) : (
                                    <div className="info-value d-flex align-items-center gap-2">
                                        <FaUser size={14} className="opacity-50" /> {user.gender || 'N/A'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* DOCTOR: Professional Qualifications */}
                    {isDoctor && (
                        <div className="mb-5">
                            <div className="section-divider"></div>
                            <h4 className="font-heading mb-4">Professional Qualifications</h4>
                            
                            <div className="row g-4 mb-4">
                                <div className="col-md-6">
                                    <div className="info-label">Designation</div>
                                    {renderField('designation', user.designation, <FaUserMd />)}
                                </div>
                                <div className="col-md-6">
                                    <div className="info-label">Department</div>
                                    {isEditing ? (
                                        <div className="d-flex align-items-center w-100">
                                            <FaStethoscope className="me-2 opacity-50" size={14} />
                                            {/* DROPDOWN MENU FOR EDITING */}
                                            <LunaDropdown 
                                                options={departmentOptions}
                                                value={editForm.department} // Uses the ID stored in form
                                                onChange={(val) => handleDropdownChange('department', val)}
                                                placeholder="Select Department"
                                                labelKey="name" // Display the Name
                                                valueKey="id"   // Save the ID
                                                zIndex={1050}
                                            />
                                        </div>
                                    ) : (
                                        <div className="info-value d-flex align-items-center gap-2">
                                            <FaStethoscope size={14} className="opacity-50" />
                                            {/* Map the ID to Name for Display */}
                                            {getDepartmentName(user.department)}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="info-label mb-3">Degrees & Certifications</div>
                            
                            <div className="d-flex flex-wrap gap-3">
                                {isEditing ? (
                                    <>
                                        {editForm.educationArray.map((item, index) => (
                                            <div key={index} className="kindred-pill editable">
                                                <input 
                                                    type="text" 
                                                    className="pill-input inst" 
                                                    placeholder="Inst." 
                                                    value={item.institution} 
                                                    onChange={(e) => handleEducationChange(index, 'institution', e.target.value)} 
                                                />
                                                <span className="opacity-50">|</span>
                                                <input 
                                                    type="text" 
                                                    className="pill-input degree" 
                                                    placeholder="Degree" 
                                                    value={item.degree} 
                                                    onChange={(e) => handleEducationChange(index, 'degree', e.target.value)} 
                                                />
                                                <FaTrash 
                                                    size={10} 
                                                    className="text-danger ms-1 cursor-pointer" 
                                                    onClick={() => removeEducationRow(index)} 
                                                />
                                            </div>
                                        ))}
                                        <div className="kindred-pill editable" onClick={addEducationRow} style={{cursor: 'pointer', borderStyle: 'solid', borderColor: '#e0e0e0'}}>
                                            <FaPlus className="text-muted" size={10} />
                                        </div>
                                    </>
                                ) : (
                                    parseEducation(user.education).length > 0 ? (
                                        parseEducation(user.education).map((deg, index) => (
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
                    )}

                    {/* DOCTOR: Personal Preference Section */}
                    {isDoctor && (isEditing || doctorPrefFields.some(field => user[field.key])) && (
                        <div className="mb-5">
                            <div className="section-divider"></div>
                            <h4 className="font-heading mb-4">Personal Preference</h4>
                            
                            <div className="row g-4">
                                {isEditing ? (
                                    doctorPrefFields.map((field) => (
                                        <div key={field.key} className="col-md-6">
                                            <div className="info-label">{field.label}</div>
                                            {renderField(field.key, user[field.key], field.icon)}
                                        </div>
                                    ))
                                ) : (
                                    doctorPrefFields
                                        .filter(field => user[field.key]) 
                                        .map(field => (
                                            <div key={field.key} className="col-md-6">
                                                <div className="info-label">{field.label}</div>
                                                <div className="info-value d-flex align-items-center gap-2">
                                                    {React.cloneElement(field.icon, { size: 14, className: "opacity-50" })} 
                                                    {user[field.key]}
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* PATIENT: Diagnosed Diseases Section */}
                    {!isDoctor && !isReceptionist && (isEditing || user.chronic_diseases) && (
                         <div className="mb-5">
                            <div className="section-divider"></div>
                            <h4 className="font-heading mb-4">Diagnosed Diseases</h4>
                            
                            <div className="row g-4">
                                <div className="col-12">
                                    <div className="info-label">Chronic Diseases</div>
                                    {isEditing ? (
                                        renderField('chronic_diseases', user.chronic_diseases, <FaNotesMedical />)
                                    ) : (
                                        <div className="info-value d-flex align-items-center gap-2">
                                            <FaNotesMedical size={14} className="opacity-50" /> 
                                            {user.chronic_diseases}
                                        </div>
                                    )}
                                </div>
                            </div>
                         </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default Profile;