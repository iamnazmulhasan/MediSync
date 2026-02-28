import React, { useState, useEffect } from 'react';
import { authAPI } from '../api/api';
import Swal from 'sweetalert2';
import { Link } from 'react-router-dom';
import { 
    FaUserMd, 
    FaUserInjured, 
    FaEnvelope, 
    FaLock, 
    FaUserTie, 
    FaConciergeBell, 
    FaBriefcase,
    FaEye,
    FaEyeSlash
} from 'react-icons/fa';

const Toast = Swal.mixin({
    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true,
    didOpen: (toast) => { toast.addEventListener('mouseenter', Swal.stopTimer); toast.addEventListener('mouseleave', Swal.resumeTimer); }
});

const LoginForm = ({ isRedirect, prefilledEmail }) => {
    const [formData, setFormData] = useState({ email: prefilledEmail || '', password: '' });
    const [loading, setLoading] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [showPassword, setShowPassword] = useState(false); // Added Eye toggle state
    
    // UI States
    const [showProfileSelector, setShowProfileSelector] = useState(false);
    const [showValidationMessage, setShowValidationMessage] = useState(false); 
    
    // Data State
    const [foundProfiles, setFoundProfiles] = useState({ 
        baseUser: null, patient: null, doctor: null, receptionist: null, officer: null, isDoctorActive: false 
    });

    useEffect(() => {
        if (prefilledEmail) { setFormData(prev => ({ ...prev, email: prefilledEmail })); }
    }, [prefilledEmail]);

    const handleChange = (e) => { setFormData({ ...formData, [e.target.name]: e.target.value }); setLoginError(''); };

    const handleSubmit = async (e) => {
        e.preventDefault(); 
        setLoading(true); 
        setLoginError('');
        
        try {
            // 1. Authenticate
            await authAPI.login(formData.email, formData.password);

            // 2. Fetch Profiles
            const [userRes, patRes, docRes, recRes, offRes] = await Promise.all([
                authAPI.checkProfile('user', formData.email),
                authAPI.checkProfile('patient', formData.email).catch(() => ({ data: { exists: false } })),
                authAPI.checkProfile('doctor', formData.email).catch(() => ({ data: { exists: false } })),
                authAPI.checkProfile('receptionist', formData.email).catch(() => ({ data: { exists: false } })),
                authAPI.checkProfile('officer', formData.email).catch(() => ({ data: { exists: false } }))
            ]);

            // 3. Parse Base User
            let baseUser = null;
            if (userRes.data && userRes.data.exists && userRes.data.user) {
                baseUser = userRes.data.user;
            } else if (userRes.data && !userRes.data.exists) {
                baseUser = userRes.data; 
            }

            // 4. Parse Doctor Active Status
            let doctorData = null;
            let isDoctorActive = false;
            
            if (docRes.data && docRes.data.exists) {
                doctorData = docRes.data.doctor || docRes.data;
                // Handle various boolean formats (1, true, 'true')
                isDoctorActive = doctorData.active === true || doctorData.active === 1; 
            }

            // 5. Construct Profile Object
            const profiles = {
                baseUser: baseUser,
                patient: (patRes.data && patRes.data.exists) ? (patRes.data.patient || patRes.data) : null,
                doctor: doctorData,
                receptionist: (recRes.data && recRes.data.exists) ? (recRes.data.receptionist || recRes.data) : null,
                officer: (offRes.data && offRes.data.exists) ? (offRes.data.officer || offRes.data) : null,
                isDoctorActive: isDoctorActive 
            };

            // 6. Logic Flow
            const roleCount = [profiles.patient, profiles.doctor, profiles.receptionist, profiles.officer].filter(Boolean).length;

            if (roleCount > 1) {
                // Multiple Profiles
                setFoundProfiles(profiles);
                setShowProfileSelector(true);
                setLoading(false);
            } else if (profiles.doctor) {
                // Single Doctor
                if (profiles.isDoctorActive) {
                    finalizeLogin('doctor', profiles.doctor, baseUser);
                } else {
                    setShowValidationMessage(true);
                    setLoading(false);
                }
            } else if (profiles.patient) {
                finalizeLogin('patient', profiles.patient, baseUser);
            } else if (profiles.receptionist) {
                finalizeLogin('receptionist', profiles.receptionist, baseUser);
            } else if (profiles.officer) {
                finalizeLogin('officer', profiles.officer, baseUser);
            } else {
                finalizeLogin('user', {}, baseUser);
            }

        } catch (err) { 
            console.error("Login Error:", err); 
            setLoginError('Incorrect email or password'); 
            setLoading(false); 
        }
    };

    const finalizeLogin = (role, profileData, baseUser) => {
        let profileCategory = 'person'; 
        const lowerRole = role.toLowerCase();
        
        if (['patient', 'doctor', 'officer', 'receptionist', 'user'].includes(lowerRole)) {
            profileCategory = 'person';
        } else if (lowerRole === 'pharmacy') {
            profileCategory = 'business';
        } else if (lowerRole === 'laboratory') {
            profileCategory = 'laboratory';
        }

        const finalUserObject = { 
            ...baseUser, 
            person_id: baseUser?.id, 
            ...profileData, 
            role: role, 
            profile_category: profileCategory 
        };

        localStorage.setItem('user', JSON.stringify(finalUserObject));
        
        // --- NEW: Set One-Time Welcome Flag ---
        sessionStorage.setItem('showWelcome', 'true'); 

        Toast.fire({ icon: 'success', title: `Welcome, ${finalUserObject.name || 'User'}!` });
        
        setTimeout(() => { 
            window.location.href = '/'; 
        }, 1000);
    };

    // --- RENDER 1: SINGLE INACTIVE DOCTOR MESSAGE ---
    if (showValidationMessage) {
         return (
            <>
                <div className="profile-overlay fade-in d-flex flex-column justify-content-center align-items-center h-100">
                    <div className="profile-separator-wide mb-4"></div>
                    
                    <h3 className="profile-select-header text-center" style={{fontSize: '1.2rem', color: '#C62828'}}>
                        ACCOUNT UNDER VALIDATION
                    </h3>
                    
                    <p className="profile-select-subtitle mt-2 mb-4" style={{maxWidth: '300px'}}>
                        Please visit our office or contact an administrator to activate your account.
                    </p>
                    
                    <div className="profile-separator-wide mt-2"></div>
                    
                    <button onClick={() => window.location.reload()} className="btn btn-sm btn-outline-secondary mt-4 rounded-pill px-4 btn-back-login">
                        Back to Login
                    </button>
                </div>

                {/* INVISIBLE SPACER */}
                <div style={{ opacity: 0, pointerEvents: 'none', visibility: 'hidden', marginTop: '-90px' }}>
                    <div style={{height: '250px'}}></div> 
                </div>
            </>
        );
    }

    // --- RENDER 2: PROFILE SELECTOR ---
    if (showProfileSelector) {
        const availableOptions = [
            foundProfiles.patient && 'patient',
            foundProfiles.doctor && 'doctor',
            foundProfiles.receptionist && 'receptionist',
            foundProfiles.officer && 'officer'
        ].filter(Boolean);

        return (
            <>
                <div className="profile-overlay fade-in">
                    <div className="d-flex flex-column align-items-center mb-1">
                         <h3 className="profile-select-header">SELECT PROFILE</h3>
                         <p className="profile-select-subtitle">
                            You have multiple profiles. Choose one to continue.
                        </p>
                        <div className="profile-separator"></div>
                    </div>
                    
                    <div className="profile-list-container">
                        
                        {/* PATIENT */}
                        {foundProfiles.patient && (
                            <button onClick={() => finalizeLogin('patient', foundProfiles.patient, foundProfiles.baseUser)}
                                className="profile-option-card patient-card">
                                <div className="d-flex align-items-center">
                                    <div className="profile-icon-box patient-icon">
                                        <FaUserInjured size={20} />
                                    </div>
                                    <div className="text-start">
                                        <div className="profile-role-title patient-title">PATIENT</div>
                                        <div className="profile-role-desc">Book appointments & view history</div>
                                    </div>
                                </div>
                            </button>
                        )}

                        {/* DOCTOR */}
                        {foundProfiles.doctor && (
                            foundProfiles.isDoctorActive ? (
                                <button onClick={() => finalizeLogin('doctor', foundProfiles.doctor, foundProfiles.baseUser)}
                                    className="profile-option-card doctor-card">
                                    <div className="d-flex align-items-center">
                                        <div className="profile-icon-box doctor-icon">
                                            <FaUserMd size={20} />
                                        </div>
                                        <div className="text-start">
                                            <div className="profile-role-title doctor-title">DOCTOR</div>
                                            <div className="profile-role-desc">Manage patients, appointments & Rx</div>
                                        </div>
                                    </div>
                                </button>
                            ) : (
                                <div className="profile-option-card doctor-card inactive-profile">
                                    <div className="d-flex align-items-center" style={{opacity: 0.5}}>
                                        <div className="profile-icon-box doctor-icon" style={{filter: 'grayscale(100%)'}}>
                                            <FaUserMd size={20} />
                                        </div>
                                        <div className="text-start">
                                            <div className="profile-role-title" style={{color: '#90A4AE'}}>DOCTOR</div>
                                            <div className="profile-role-desc text-danger fw-bold" style={{fontSize: '0.65rem', letterSpacing: '0.5px'}}>
                                                STILL UNDER VALIDATION
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        )}

                        {/* RECEPTIONIST */}
                        {foundProfiles.receptionist && (
                            <button onClick={() => finalizeLogin('receptionist', foundProfiles.receptionist, foundProfiles.baseUser)}
                                className="profile-option-card receptionist-card">
                                <div className="d-flex align-items-center">
                                    <div className="profile-icon-box receptionist-icon">
                                        <FaConciergeBell size={20} />
                                    </div>
                                    <div className="text-start">
                                        <div className="profile-role-title receptionist-title">RECEPTIONIST</div>
                                        <div className="profile-role-desc">Schedule appointments & availability</div>
                                    </div>
                                </div>
                            </button>
                        )}

                        {/* OFFICER */}
                        {foundProfiles.officer && (
                            <button onClick={() => finalizeLogin('officer', foundProfiles.officer, foundProfiles.baseUser)}
                                className="profile-option-card officer-card">
                                <div className="d-flex align-items-center">
                                    <div className="profile-icon-box officer-icon">
                                        <FaUserTie size={20} />
                                    </div>
                                    <div className="text-start">
                                        <div className="profile-role-title officer-title">OFFICER</div>
                                        <div className="profile-role-desc">Administrative control & financial reports</div>
                                    </div>
                                </div>
                            </button>
                        )}
                    </div>
                </div>

                {/* INVISIBLE SPACER */}
                <div style={{ opacity: 0, pointerEvents: 'none', visibility: 'hidden', marginTop: '-90px', paddingBottom: '20px' }}>
                    <div style={{height: '100px'}}></div> 
                    <div className="d-grid gap-2">
                        {availableOptions.map((_, i) => (
                            <div key={i} style={{height: '62px', width: '100%'}}></div> 
                        ))}
                    </div>
                </div>
            </>
        );
    }

    // --- RENDER 3: STANDARD LOGIN FORM ---
    return (
        <div className="w-100 pt-2">
            <form onSubmit={handleSubmit}>
                <div className="text-center mb-4">
                    <h3 className="form-title mb-1" style={{fontWeight: '900', textTransform: 'uppercase', color: 'var(--luna-navy)'}}>
                        {isRedirect ? 'WELCOME BACK' : 'LOGIN'}
                    </h3>
                    <p className="text-muted small mb-0">
                        {isRedirect ? 'We found your account. Please sign in.' : 'Enter your credentials to access account'}
                    </p>
                </div>

                <div className="mb-custom">
                    <label className="form-label">Email</label>
                    <div className="input-group-custom">
                        <input type="email" name="email" className={`form-control ${prefilledEmail ? 'locked-input' : ''}`} 
                            value={formData.email} onChange={handleChange} required placeholder="Email" readOnly={!!prefilledEmail} />
                        <FaEnvelope className="input-icon" size={14} />
                    </div>
                </div>
                
                <div className="mb-2">
                    <label className="form-label">Password</label>
                    <div className="input-group-custom position-relative">
                        <input 
                            type={showPassword ? "text" : "password"} 
                            name="password" 
                            className="form-control" 
                            value={formData.password} 
                            onChange={handleChange} 
                            required 
                            placeholder="Password" 
                        />
                        <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                        </button>
                    </div>
                </div>

                {/* FORGOT PASSWORD LINK */}
                <div className="d-flex justify-content-end mb-3">
                    <Link to="/reset-password" style={{fontSize: '0.75rem', fontWeight: '600', color: 'var(--luna-mid)', textDecoration: 'none', fontFamily: 'Google Sans, sans-serif'}}>
                        Forgot Password?
                    </Link>
                </div>

                {loginError && <div className="text-danger small text-center mb-2 fw-bold">{loginError}</div>}
                
                <button type="submit" className="btn btn-modern w-100 mb-2" disabled={loading}>
                    {loading ? 'Signing In...' : 'Sign In'}
                </button>
            </form>

            {!isRedirect && !prefilledEmail && (
                <div className="text-center mt-4">
                    <div className="position-relative mb-3">
                        <hr style={{borderColor: '#E0F2F1', opacity: 1}} />
                        <span style={{
                            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', 
                            background: 'rgba(255, 255, 255, 0.95)', padding: '0 10px', fontSize: '0.7rem', color: '#90A4AE', fontWeight: '600'
                        }}>OR</span>
                    </div>
                    {/* UPDATED TO LINK */}
                    <Link to="/business" className="text-decoration-none d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill" 
                       style={{color: 'var(--luna-mid)', backgroundColor: '#F0F9FF', border: '1px solid #E1F5FE', fontSize: '0.85rem', fontWeight: '600', transition: 'all 0.2s'}}>
                        <FaBriefcase size={12} /> Login as Business
                    </Link>
                </div>
            )}
        </div>
    );
};
export default LoginForm;