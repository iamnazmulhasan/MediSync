import React, { useState, useEffect, useRef } from 'react';
import { authAPI } from '../api/api';
import Swal from 'sweetalert2';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEnvelope, FaArrowLeft, FaEye, FaEyeSlash, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const Toast = Swal.mixin({
    toast: true, position: 'top-end', showConfirmButton: false, timer: 4000, timerProgressBar: true,
    didOpen: (toast) => { toast.addEventListener('mouseenter', Swal.stopTimer); toast.addEventListener('mouseleave', Swal.resumeTimer); }
});

const ResetPassword = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [personId, setPersonId] = useState(null);

    // OTP State
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [generatedOtp, setGeneratedOtp] = useState(null);
    const [timeLeft, setTimeLeft] = useState(120);
    const inputRefs = useRef([]);

    // Password State
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);

    // --- STEP 1: VERIFY EMAIL & GET ID ---
    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            // Check all potential profiles simultaneously
            const [patRes, docRes, recRes, offRes] = await Promise.all([
                authAPI.checkProfile('patient', email).catch(() => ({ data: { exists: false } })),
                authAPI.checkProfile('doctor', email).catch(() => ({ data: { exists: false } })),
                authAPI.checkProfile('receptionist', email).catch(() => ({ data: { exists: false } })),
                authAPI.checkProfile('officer', email).catch(() => ({ data: { exists: false } }))
            ]);

            let activePersonId = null;

            // Extract person_id with safe optional chaining based on your JSON structure
            if (patRes.data?.exists) {
                activePersonId = patRes.data?.patient?.person?.id || patRes.data?.person?.id;
            } else if (docRes.data?.exists) {
                activePersonId = docRes.data?.doctor?.person?.id || docRes.data?.person?.id;
            } else if (recRes.data?.exists) {
                activePersonId = recRes.data?.receptionist?.person?.id || recRes.data?.person?.id;
            } else if (offRes.data?.exists) {
                activePersonId = offRes.data?.officer?.person?.id || offRes.data?.person?.id;
            }

            // Fallback: Check base user if not found in specific roles
            if (!activePersonId) {
                 const userRes = await authAPI.checkProfile('user', email).catch(() => ({ data: { exists: false } }));
                 if (userRes.data?.exists) {
                     activePersonId = userRes.data?.user?.id || userRes.data?.id;
                 }
            }

            if (activePersonId) {
                setPersonId(activePersonId);

                // Generate 6-digit OTP
                const newOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
                setGeneratedOtp(newOtpCode);

                // Send email
                try {
                    await authAPI.sendMail({
                        email: email,
                        subject: "Medisync Password Reset OTP",
                        message: `Hello,\n\nYour OTP for password reset is: ${newOtpCode}\n\nThis OTP is valid for 2 minutes.\nIf you didn't request this, please ignore this email.`
                    });
                    Toast.fire({ icon: 'success', title: 'OTP sent to your email.' });
                    setTimeLeft(120);
                    setStep(2);
                } catch (mailErr) {
                    console.error("Mail Error:", mailErr);
                    Toast.fire({ icon: 'error', title: 'Found email, but failed to send OTP email.' });
                }
            } else {
                Toast.fire({ icon: 'error', title: 'No account found with this email.' });
            }
        } catch (error) {
            console.error("Verification error:", error);
            Toast.fire({ icon: 'error', title: 'Network error while checking email.' });
        } finally {
            setIsLoading(false);
        }
    };

    // --- STEP 2: OTP LOGIC ---
    useEffect(() => {
        if (step === 2 && timeLeft > 0) {
            const timerId = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
            return () => clearInterval(timerId);
        }
    }, [step, timeLeft]);

    const handleOtpChange = (index, value) => {
        if (isNaN(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value !== '' && index < 5) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const verifyOtp = () => {
        const enteredOtp = otp.join('');
        if (enteredOtp.length < 6) {
            Toast.fire({ icon: 'warning', title: 'Please enter all 6 digits.' });
            return;
        }
        if (timeLeft === 0) {
            Toast.fire({ icon: 'error', title: 'OTP expired. Please resend.' });
            return;
        }
        if (enteredOtp === generatedOtp) {
            setStep(3);
            Toast.fire({ icon: 'success', title: 'OTP Verified.' });
        } else {
            Toast.fire({ icon: 'error', title: 'Incorrect OTP.' });
        }
    };

    const resendOtp = async () => {
        setIsLoading(true);
        try {
            const newOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
            setGeneratedOtp(newOtpCode);
            await authAPI.sendMail({
                email: email,
                subject: "Medisync Password Reset OTP",
                message: `Hello,\n\nYour NEW OTP for password reset is: ${newOtpCode}\n\nThis OTP is valid for 2 minutes.`
            });
            Toast.fire({ icon: 'success', title: 'New OTP sent to your email.' });
            setTimeLeft(120);
            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0].focus();
        } catch (error) {
            console.error("Mail Error:", error);
            Toast.fire({ icon: 'error', title: 'Failed to resend OTP.' });
        } finally {
            setIsLoading(false);
        }
    };

    // --- STEP 3: RESET PASSWORD ---
    const handlePasswordReset = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            Toast.fire({ icon: 'error', title: 'Passwords do not match.' });
            return;
        }
        setIsLoading(true);
        try {
            await authAPI.changePassword({
                type: "person",
                id: personId,
                new_password: newPassword
            });
            Toast.fire({ icon: 'success', title: 'Password reset successfully!' });
            navigate('/'); // Navigate back to the login page
        } catch (error) {
            Toast.fire({ icon: 'error', title: 'Failed to reset password.' });
        } finally {
            setIsLoading(false);
        }
    };

    const variants = { hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0, transition: { duration: 0.3 } } };
    const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
    const passwordsMismatch = newPassword && confirmPassword && newPassword !== confirmPassword;

    return (
        <div className="auth-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="glass-card">
                <AnimatePresence mode="wait">
                    
                    {/* STEP 1: EMAIL */}
                    {step === 1 && (
                        <motion.div key="step1" variants={variants} initial="hidden" animate="visible" exit="hidden">
                            <div className="d-flex align-items-center mb-4 position-relative">
                                <Link to="/" className="btn-back" style={{position: 'absolute', left: '-10px'}}><FaArrowLeft size={14}/></Link>
                                <h3 className="form-title w-100 text-center mb-0" style={{fontSize: '1.4rem', textTransform: 'uppercase', fontWeight: '900'}}>Reset Password</h3>
                            </div>
                            <p className="text-muted small text-center mb-4">Enter your registered email to receive a 6-digit OTP.</p>
                            
                            <form onSubmit={handleEmailSubmit}>
                                <div className="mb-custom">
                                    <label className="form-label">Email Address</label>
                                    <div className="input-group-custom">
                                        <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="name@example.com" />
                                        <FaEnvelope className="input-icon" size={14}/>
                                    </div>
                                </div>
                                <button className="btn btn-modern w-100 mt-2" type="submit" disabled={isLoading}>{isLoading ? 'Checking...' : 'Send OTP'}</button>
                            </form>
                        </motion.div>
                    )}

                    {/* STEP 2: OTP */}
                    {step === 2 && (
                        <motion.div key="step2" variants={variants} initial="hidden" animate="visible" exit="hidden">
                            <div className="d-flex align-items-center mb-4 position-relative">
                                <button onClick={() => setStep(1)} className="btn-back" style={{position: 'absolute', left: '-10px'}}><FaArrowLeft size={14}/></button>
                                <h3 className="form-title w-100 text-center mb-0" style={{fontSize: '1.4rem', textTransform: 'uppercase', fontWeight: '900'}}>Enter OTP</h3>
                            </div>
                            <p className="text-muted small text-center mb-4">We've sent a 6-digit code to <strong>{email}</strong></p>
                            
                            <div className="d-flex justify-content-center gap-2 mb-4">
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        type="text"
                                        maxLength="1"
                                        value={digit}
                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                        ref={(el) => (inputRefs.current[index] = el)}
                                        style={{
                                            width: '45px', height: '55px', borderRadius: '12px',
                                            border: `2px solid ${digit ? 'var(--luna-mid)' : '#E0F2F1'}`,
                                            fontSize: '1.5rem', textAlign: 'center', 
                                            fontFamily: 'Google Sans', fontWeight: '700', 
                                            color: 'var(--luna-navy)', background: '#F5FDFF',
                                            outline: 'none', transition: 'border-color 0.2s'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = 'var(--luna-light)'}
                                        onBlur={(e) => e.target.style.borderColor = digit ? 'var(--luna-mid)' : '#E0F2F1'}
                                    />
                                ))}
                            </div>
                            
                            <div className="text-center mb-4">
                                <span style={{ fontFamily: 'Google Sans', fontWeight: '600', fontSize: '0.9rem', color: timeLeft > 0 ? 'var(--luna-mid)' : '#ef5350' }}>
                                    {timeLeft > 0 ? `Time remaining: ${Math.floor(timeLeft / 60)}:${('0' + (timeLeft % 60)).slice(-2)}` : 'OTP Expired'}
                                </span>
                            </div>

                            <button onClick={verifyOtp} className="btn btn-modern w-100 mb-3" disabled={timeLeft === 0}>Verify OTP</button>
                            
                            <div className="text-center">
                                <button onClick={resendOtp} disabled={timeLeft > 0 || isLoading} className="btn btn-link text-decoration-none" style={{ color: timeLeft > 0 ? '#B0BEC5' : 'var(--luna-mid)', fontWeight: '700', fontSize: '0.85rem', fontFamily: 'Google Sans' }}>
                                    {isLoading ? 'Sending...' : 'Resend OTP'}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: NEW PASSWORD */}
                    {step === 3 && (
                        <motion.div key="step3" variants={variants} initial="hidden" animate="visible" exit="hidden">
                             <div className="d-flex flex-column align-items-center mb-4">
                                <h3 className="form-title w-100 text-center mb-0" style={{fontSize: '1.4rem', textTransform: 'uppercase', fontWeight: '900'}}>New Password</h3>
                                <p className="text-muted small text-center mt-2">Create a new strong password.</p>
                            </div>

                            <form onSubmit={handlePasswordReset}>
                                <div className="mb-custom">
                                    <label className="form-label">New Password</label>
                                    <div className="input-group-custom position-relative">
                                        <input type={showPasswords ? "text" : "password"} className="form-control" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="Enter new password" />
                                        <button type="button" className="password-toggle-btn" onClick={() => setShowPasswords(!showPasswords)}>
                                            {showPasswords ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="form-label">Confirm Password</label>
                                    <div className="input-group-custom position-relative">
                                        <input type={showPasswords ? "text" : "password"} className="form-control" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="Confirm new password" style={passwordsMismatch ? { borderColor: 'var(--status-cancelled)' } : {}} />
                                        
                                        {confirmPassword && (
                                            <div className="validation-icon">
                                                {passwordsMatch ? <FaCheckCircle color="var(--status-pending)" size={14} /> : <FaTimesCircle color="var(--status-cancelled)" size={14} />}
                                            </div>
                                        )}
                                        
                                        <button type="button" className="password-toggle-btn" onClick={() => setShowPasswords(!showPasswords)}>
                                            {showPasswords ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                                        </button>
                                    </div>
                                    {passwordsMismatch && <small className="d-block mt-1 fw-bold" style={{ color: 'var(--status-cancelled)', fontSize: '0.75rem' }}>Password didn't match</small>}
                                    {passwordsMatch && <small className="d-block mt-1 fw-bold" style={{ color: 'var(--status-pending)', fontSize: '0.75rem' }}>Password matched</small>}
                                </div>

                                <button type="submit" className="btn btn-modern w-100" disabled={isLoading || passwordsMismatch}>{isLoading ? 'Saving...' : 'Reset Password'}</button>
                            </form>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
};

export default ResetPassword;