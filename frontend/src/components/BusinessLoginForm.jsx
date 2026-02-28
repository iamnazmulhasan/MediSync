import React, { useState } from 'react';
import { authAPI } from '../api/api';
import Swal from 'sweetalert2';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaEnvelope, FaEye, FaEyeSlash, FaFlask, FaPills } from 'react-icons/fa';

const Toast = Swal.mixin({
    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true,
    didOpen: (toast) => { toast.addEventListener('mouseenter', Swal.stopTimer); toast.addEventListener('mouseleave', Swal.resumeTimer); }
});

const BusinessLoginForm = () => {
    const [isPharmacy, setIsPharmacy] = useState(true);
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const type = isPharmacy ? 'pharmacy' : 'laboratory';

        try {
            // API expects "login" and "password"
            const res = await authAPI.businessLogin(type, formData.email, formData.password);
            const data = res.data;

            // Extract the correct ID based on the login type
            const activeId = isPharmacy ? data.pharmacy_id : data.lab_id;

            // Format object for localStorage
            const userObj = {
                ...data,
                id: activeId, // Standardize ID property for the app
                role: type,   // "pharmacy" or "laboratory"
                profile_category: type 
            };

            localStorage.setItem('user', JSON.stringify(userObj));
            sessionStorage.setItem('showWelcome', 'true');
            
            Toast.fire({ icon: 'success', title: `Welcome to ${data.name}!` });
            
            setTimeout(() => { 
                window.location.href = '/'; 
            }, 1000);

        } catch (error) {
            Toast.fire({ icon: 'error', title: 'Invalid credentials or inactive account.' });
            setLoading(false);
        }
    };

    return (
        <div className="auth-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="glass-card" style={{ animation: 'fadeIn 0.3s ease' }}>
                <div className="d-flex align-items-center mb-4 position-relative">
                    <Link to="/" className="btn-back" style={{position: 'absolute', left: '-10px'}}><FaArrowLeft size={14}/></Link>
                    <h3 className="form-title w-100 text-center mb-0" style={{fontSize: '1.4rem', textTransform: 'uppercase', fontWeight: '900'}}>Business Portal</h3>
                </div>
                
                {/* TOGGLE: Pharmacy vs Laboratory */}
                <div className="auth-toggle-wrapper mb-4">
                    <div className="auth-toggle-container" style={{ width: '100%' }}>
                        <div className={`toggle-slider ${!isPharmacy ? 'right' : ''}`}></div>
                        <button type="button" className={`toggle-btn d-flex align-items-center justify-content-center gap-2 ${isPharmacy ? 'active' : ''}`} onClick={() => setIsPharmacy(true)}>
                            <FaPills /> Pharmacy
                        </button>
                        <button type="button" className={`toggle-btn d-flex align-items-center justify-content-center gap-2 ${!isPharmacy ? 'active' : ''}`} onClick={() => setIsPharmacy(false)}>
                            <FaFlask /> Laboratory
                        </button>
                    </div>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <div className="mb-custom">
                        <label className="form-label">Business Email</label>
                        <div className="input-group-custom">
                            <input type="email" name="email" className="form-control" value={formData.email} onChange={handleChange} required placeholder="business@example.com" />
                            <FaEnvelope className="input-icon" size={14}/>
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

                    <div className="d-flex justify-content-end mb-3">
                        <Link to="/reset-password" style={{fontSize: '0.75rem', fontWeight: '600', color: 'var(--luna-mid)', textDecoration: 'none', fontFamily: 'Google Sans, sans-serif'}}>
                            Forgot Password?
                        </Link>
                    </div>
                    
                    <button type="submit" className="btn btn-modern w-100 mb-2" disabled={loading}>
                        {loading ? 'Authenticating...' : `Sign in as ${isPharmacy ? 'Pharmacy' : 'Laboratory'}`}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default BusinessLoginForm;