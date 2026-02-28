import React, { useState } from 'react';
import { Container } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { authAPI, laboratoryAPI, pharmacyAPI } from '../api/api';
import { 
    FaChevronLeft, FaHospital, FaClinicMedical, FaEnvelope, 
    FaSearch, FaEye, FaEyeSlash, FaCheckCircle, FaTimesCircle 
} from 'react-icons/fa';

const Toast = Swal.mixin({
    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true,
    didOpen: (toast) => { toast.addEventListener('mouseenter', Swal.stopTimer); toast.addEventListener('mouseleave', Swal.resumeTimer); }
});

const CreateBusiness = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('laboratory'); // 'laboratory' | 'pharmacy'
    const [step, setStep] = useState(1);
    
    // Step 1: Search State
    const [searchEmail, setSearchEmail] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    
    // Step 2: Form State
    const [ownerData, setOwnerData] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        mobile: '',
        address: '',
        discount_percentage: '',
        password: ''
    });
    
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setStep(1);
        setSearchEmail('');
        setOwnerData(null);
        setFormData({ name: '', email: '', mobile: '', address: '', discount_percentage: '', password: '' });
        setConfirmPassword('');
    };

    const handleSearchOwner = async (e) => {
        e.preventDefault();
        if (!searchEmail) return;

        setIsSearching(true);
        try {
            const res = await authAPI.checkProfile('user', searchEmail);
            const data = res.data;
            
            let foundUser = null;
            if (data && data.exists && data.user) {
                foundUser = data.user;
            } else if (data && !data.exists && data.id) {
                foundUser = data;
            }

            if (foundUser) {
                setOwnerData(foundUser);
                setFormData({
                    ...formData,
                    email: foundUser.email || '',
                    mobile: foundUser.mobile || '',
                    address: foundUser.address || '',
                });
                setStep(2);
                Toast.fire({ icon: 'success', title: 'Owner found!' });
            } else {
                Swal.fire({ icon: 'error', title: 'Not Found', text: 'No user exists with this email.', customClass: { popup: 'swal-modern-popup' } });
            }
        } catch (error) {
            console.error("Search failed:", error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Could not fetch owner details.', customClass: { popup: 'swal-modern-popup' } });
        } finally {
            setIsSearching(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== confirmPassword) {
            Toast.fire({ icon: 'error', title: 'Passwords do not match!' });
            return;
        }

        setIsSubmitting(true);
        try {
            if (activeTab === 'laboratory') {
                const payload = {
                    name: formData.name,
                    email: formData.email,
                    mobile: formData.mobile,
                    owner: ownerData.id,
                    password: formData.password
                };
                await laboratoryAPI.register(payload);
            } else {
                const payload = {
                    name: formData.name,
                    email: formData.email,
                    mobile: formData.mobile,
                    address: formData.address,
                    owner: ownerData.id,
                    password: formData.password,
                    discount_percentage: formData.discount_percentage || "0.00"
                };
                await pharmacyAPI.register(payload);
            }

            Swal.fire({
                icon: 'success',
                title: 'Registration Successful',
                text: `${activeTab === 'laboratory' ? 'Laboratory' : 'Pharmacy'} has been created.`,
                customClass: { popup: 'swal-modern-popup', confirmButton: 'btn-modern-confirm' }
            }).then(() => {
                // Return to previous page or dashboard
                navigate(-1);
            });

        } catch (error) {
            console.error("Registration failed", error);
            let errorMsg = 'Registration failed.';
            if (error.response?.data) {
                errorMsg = JSON.stringify(error.response.data).replace(/[{"}\[\]]/g, ' ').trim(); 
            }
            Toast.fire({ icon: 'error', title: errorMsg });
        } finally {
            setIsSubmitting(false);
        }
    };

    const passwordsMatch = formData.password && confirmPassword && formData.password === confirmPassword;
    const passwordsMismatch = formData.password && confirmPassword && formData.password !== confirmPassword;

    return (
        <Container fluid className="p-4 fade-in">
            <button 
                onClick={() => navigate(-1)} 
                className="btn btn-light mb-4 d-flex align-items-center gap-2 shadow-sm rounded-pill px-3"
                style={{fontFamily: "'Google Sans', sans-serif", fontWeight: '600', color: '#546E7A', width: 'fit-content'}}
            >
                <FaChevronLeft size={12} /> Back
            </button>

            <div className="text-center mb-4">
                <h2 className="page-title-serif mb-2" style={{ fontWeight: '700', fontStyle: 'italic', fontSize: '2.8rem' }}>
                    Create Business
                </h2>
                <p className="mb-4" style={{ fontFamily: "'Google Sans', sans-serif", fontSize: '0.85rem', color: 'var(--luna-mid)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Register a new Medical Facility
                </p>
            </div>

            <div className="d-flex justify-content-center w-100">
                <div className="glass-card" style={{ maxWidth: '500px', width: '100%', padding: '2rem' }}>
                    
                    {/* TOGGLE */}
                    <div className="auth-toggle-wrapper mb-4">
                        <div className="auth-toggle-container" style={{ width: '280px' }}>
                            <div className={`toggle-slider ${activeTab === 'pharmacy' ? 'right' : ''}`}></div>
                            <button className={`toggle-btn ${activeTab === 'laboratory' ? 'active' : ''}`} onClick={() => handleTabChange('laboratory')}>Laboratory</button>
                            <button className={`toggle-btn ${activeTab === 'pharmacy' ? 'active' : ''}`} onClick={() => handleTabChange('pharmacy')}>Pharmacy</button>
                        </div>
                    </div>

                    {/* STEP 1: SEARCH OWNER */}
                    {step === 1 && (
                        <div className="fade-in text-center mt-4">
                            <div className="mb-3">
                                {activeTab === 'laboratory' ? <FaHospital size={50} color="var(--luna-light)" /> : <FaClinicMedical size={50} color="var(--luna-light)" />}
                            </div>
                            <h4 className="font-heading mb-4 text-uppercase" style={{fontSize: '1.2rem', color: 'var(--luna-navy)'}}>Find Owner Account</h4>
                            
                            <form onSubmit={handleSearchOwner}>
                                <div className="mb-3 text-start">
                                    <label className="form-label">Owner's Email Address</label>
                                    <div className="input-group-custom">
                                        <input type="email" className="form-control" value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} required placeholder="name@example.com" />
                                        <FaEnvelope className="input-icon" size={14}/>
                                    </div>
                                </div>
                                <button className="btn btn-modern w-100 mt-2" type="submit" disabled={isSearching}>
                                    {isSearching ? 'Searching...' : 'Continue'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* STEP 2: BUSINESS DETAILS FORM */}
                    {step === 2 && (
                        <div className="fade-in">
                            <div className="d-flex align-items-center mb-4 position-relative">
                                <div style={{position: 'absolute', left: '-10px', top: '0'}}>
                                    <button onClick={() => setStep(1)} className="btn-back" type="button"><FaChevronLeft size={14}/></button>
                                </div>
                                <h3 className="form-title w-100 text-center mb-0" style={{fontSize: '1.3rem', textTransform: 'uppercase', fontWeight: '900'}}>
                                    {activeTab} Details
                                </h3>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="row g-3">
                                    {/* LOCKED OWNER INFO */}
                                    <div className="col-12">
                                        <div className="p-3 rounded-3 mb-2" style={{backgroundColor: '#F8FAFC', border: '1px dashed #CFD8DC'}}>
                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                <span className="text-muted fw-bold" style={{fontSize: '0.7rem', textTransform: 'uppercase'}}>Owner Name</span>
                                                <span className="text-muted fw-bold" style={{fontSize: '0.7rem', textTransform: 'uppercase'}}>ID: {ownerData.id}</span>
                                            </div>
                                            <div style={{fontFamily: 'Google Sans', fontWeight: 700, color: 'var(--luna-navy)'}}>{ownerData.name}</div>
                                        </div>
                                    </div>

                                    {/* EDITABLE BUSINESS FIELDS */}
                                    <div className="col-12">
                                        <div className="mb-custom">
                                            <label className="form-label">Business Name</label>
                                            <input type="text" name="name" className="form-control" value={formData.name} onChange={handleInputChange} required placeholder="e.g., City Diagnostic Center" />
                                        </div>
                                    </div>

                                    <div className="col-6">
                                        <div className="mb-custom">
                                            <label className="form-label">Business Email</label>
                                            <input type="email" name="email" className="form-control" value={formData.email} onChange={handleInputChange} required />
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div className="mb-custom">
                                            <label className="form-label">Business Mobile</label>
                                            <input type="tel" name="mobile" className="form-control" value={formData.mobile} onChange={handleInputChange} required />
                                        </div>
                                    </div>

                                    {activeTab === 'pharmacy' && (
                                        <>
                                            <div className="col-12">
                                                <div className="mb-custom">
                                                    <label className="form-label">Address</label>
                                                    <input type="text" name="address" className="form-control" value={formData.address} onChange={handleInputChange} required />
                                                </div>
                                            </div>
                                            <div className="col-12">
                                                <div className="mb-custom">
                                                    <label className="form-label">Discount Percentage (%)</label>
                                                    <input type="number" step="0.01" name="discount_percentage" className="form-control" value={formData.discount_percentage} onChange={handleInputChange} placeholder="e.g., 5.00" />
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* PASSWORD SECTION */}
                                    <div className="col-12 mt-2">
                                        <div className="mb-custom">
                                            <label className="form-label">Business Password</label>
                                            <div className="input-group-custom position-relative">
                                                <input type={showPassword ? "text" : "password"} name="password" className="form-control" value={formData.password} onChange={handleInputChange} required />
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
                                                {confirmPassword && (
                                                    <div className="validation-icon">
                                                        {passwordsMatch ? <FaCheckCircle color="var(--status-pending)" size={14} /> : <FaTimesCircle color="var(--status-cancelled)" size={14} />}
                                                    </div>
                                                )}
                                                <button type="button" className="password-toggle-btn" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                                    {showConfirmPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                                                </button>
                                            </div>
                                            {passwordsMismatch && <small className="d-block mt-1 fw-bold" style={{ color: 'var(--status-cancelled)', fontSize: '0.75rem' }}>Password didn't match</small>}
                                            {passwordsMatch && <small className="d-block mt-1 fw-bold" style={{ color: 'var(--status-pending)', fontSize: '0.75rem' }}>Password matched</small>}
                                        </div>
                                    </div>
                                </div>
                                <button type="submit" className="btn btn-modern w-100 mt-4" disabled={isSubmitting || passwordsMismatch}>
                                    {isSubmitting ? 'Creating...' : `Create ${activeTab === 'laboratory' ? 'Laboratory' : 'Pharmacy'}`}
                                </button>
                            </form>
                        </div>
                    )}

                </div>
            </div>
        </Container>
    );
};

export default CreateBusiness;