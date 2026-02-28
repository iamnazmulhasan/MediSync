import React, { useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { 
    FaBell, 
    FaSignOutAlt, 
    FaUserCircle, 
    FaHeartbeat, 
    FaThLarge, 
    FaCalendarAlt,
    FaUserInjured,
    FaMoneyBillWave,
    FaUserCheck,
    FaPills,
    FaFileMedical,
    FaFlask, // Icon for Laboratory Prescriptions
    FaVial,  // Added Icon for Lab Tests/Availability
    FaFileSignature // Added Icon for Update Test Reports
} from 'react-icons/fa'; 
import { authAPI } from '../api/api'; 

const Header = ({ user, onLogout }) => {
    const isDoctor = user?.role === 'doctor';
    const isPatient = user?.role === 'patient';
    const isReceptionist = user?.role === 'receptionist';
    const isOfficer = user?.role === 'officer'; 
    const isPharmacy = user?.role === 'pharmacy'; 
    const isLaboratory = user?.role === 'laboratory'; // Identify Laboratory
    
    // Check if the user has wallet access
    const isWalletUser = isDoctor || isPatient || user?.role === 'pharmacy' || user?.role === 'laboratory';
    
    const [scrolled, setScrolled] = useState(false);
    const [balance, setBalance] = useState(0); 
    const location = useLocation();

    // --- 1. SCROLL EFFECT ---
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 20) { setScrolled(true); } else { setScrolled(false); }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // --- 2. FETCH BALANCE (WITH 5-SECOND INTERVAL) ---
    useEffect(() => {
        if (!user?.email || !user?.role || !isWalletUser) return;
        
        let isMounted = true;
        
        const fetchBalance = async () => {
            try {
                const roleType = user.role.toLowerCase();
                const response = await authAPI.checkProfile(roleType, user.email);
                
                if (isMounted && response.data) {
                    let profileData = null;

                    if (response.data[roleType]) {
                        profileData = response.data[roleType];
                    } else if (response.data.exists && response.data[roleType]) {
                        profileData = response.data[roleType];
                    } else if (response.data.balance !== undefined) {
                        profileData = response.data; 
                    }

                    if (profileData && profileData.balance !== undefined) {
                        setBalance(profileData.balance);
                    }
                }
            } catch (error) {
                // Silent fail to avoid console spam on interval
            }
        };

        // Initial fetch
        fetchBalance();

        // Safe 5-second interval
        const intervalId = setInterval(fetchBalance, 5000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [user, isWalletUser, location.pathname]); 

    const isActive = (path) => location.pathname === path;

    return (
        <div className={`top-header ${scrolled ? 'scrolled' : ''}`}>
            
            {/* LEFT SIDE: Logo for Doctors Only */}
            {isDoctor && (
                <div className="d-flex align-items-center ps-2">
                    <FaHeartbeat className="header-brand-icon" />
                    <span className="header-brand-text ms-2">
                        MediSync
                    </span>
                </div>
            )}

            <div className="flex-grow-1"></div>

            {/* Right Actions */}
            <div className="header-actions">
                
                {/* --- DOCTOR NAVIGATION ICONS --- */}
                {isDoctor && (
                    <>
                        <Link to="/" className="text-decoration-none">
                            <div className={`header-icon-box ${isActive('/') ? 'active-header-icon' : ''}`} title="Dashboard">
                                <FaThLarge size={18} />
                            </div>
                        </Link>

                        <Link to="/appointments" className="text-decoration-none">
                            <div className={`header-icon-box ${isActive('/appointments') ? 'active-header-icon' : ''}`} title="Appointments">
                                <FaCalendarAlt size={18} />
                            </div>
                        </Link>

                        <Link to="/my-patients" className="text-decoration-none">
                            <div className={`header-icon-box ${isActive('/my-patients') ? 'active-header-icon' : ''}`} title="My Patients & Prescriptions">
                                <FaUserInjured size={18} />
                            </div>
                        </Link>
                    </>
                )}

                {/* --- PHARMACY NAVIGATION ICONS --- */}
                {isPharmacy && (
                    <>
                        <Link to="/pharmacy/prescriptions" className="text-decoration-none">
                            <div className={`header-icon-box ${isActive('/pharmacy/prescriptions') ? 'active-header-icon' : ''}`} title="View Prescriptions & Sell">
                                <FaFileMedical size={18} />
                            </div>
                        </Link>

                        <Link to="/pharmacy/medicines" className="text-decoration-none">
                            <div className={`header-icon-box ${isActive('/pharmacy/medicines') ? 'active-header-icon' : ''}`} title="Add Stock / Medicines">
                                <FaPills size={18} />
                            </div>
                        </Link>
                    </>
                )}

                {/* --- LABORATORY NAVIGATION ICONS --- */}
                {isLaboratory && (
                    <>
                        {/* Manage Lab Available Tests */}
                        <Link to="/laboratory/tests" className="text-decoration-none">
                            <div className={`header-icon-box ${isActive('/laboratory/tests') ? 'active-header-icon' : ''}`} title="Manage Test Availability">
                                <FaVial size={18} />
                            </div>
                        </Link>

                        {/* Update Test Reports */}
                        <Link to="/laboratory/test-reports" className="text-decoration-none">
                            <div className={`header-icon-box ${isActive('/laboratory/test-reports') ? 'active-header-icon' : ''}`} title="Update Test Reports">
                                <FaFileSignature size={18} />
                            </div>
                        </Link>

                        {/* View & Confirm Prescriptions */}
                        <Link to="/laboratory/prescriptions" className="text-decoration-none">
                            <div className={`header-icon-box ${isActive('/laboratory/prescriptions') ? 'active-header-icon' : ''}`} title="Lab Prescriptions">
                                <FaFlask size={18} />
                            </div>
                        </Link>
                    </>
                )}

                {/* --- BALANCE DISPLAY --- */}
                {isWalletUser && (
                    <Link to="/wallet" className="text-decoration-none">
                        <div className="header-balance-box" title="Wallet">
                            <span className="currency-symbol">৳</span>
                            <span className="balance-amount">{Math.floor(Number(balance)).toLocaleString()}</span>
                        </div>
                    </Link>
                )}

                {/* --- OFFICER NAVIGATION ICONS --- */}
                {isOfficer && (
                    <>
                        <Link to="/officer/activate" className="text-decoration-none">
                            <div className={`header-icon-box ${isActive('/officer/activate') ? 'active-header-icon' : ''}`} title="Activate Accounts">
                                <FaUserCheck size={18} />
                            </div>
                        </Link>
                        
                        <Link to="/officer/finance" className="text-decoration-none">
                            <div className={`header-icon-box ${isActive('/officer/finance') ? 'active-header-icon' : ''}`} title="Finance">
                                <FaMoneyBillWave size={18} />
                            </div>
                        </Link>
                    </>
                )}

                {/* Notification */}
                <div className="header-icon-box" title="Notifications">
                    <FaBell size={18} />
                </div>

                {/* Divider */}
                <div className="header-divider"></div>

                {/* User Profile */}
                <Link to={(isLaboratory || isPharmacy) ? '/' : '/profile'} className="header-profile-link">
                    <div className="text-end me-3 d-none d-md-block">
                        <div className="profile-name">
                            {isDoctor && !user?.name?.toLowerCase().startsWith('dr') ? `Dr. ${user?.name}` : user?.name}
                        </div>
                        <div className="profile-role">
                            {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
                        </div>
                    </div>
                    <FaUserCircle size={38} className="profile-icon-color" />
                </Link>

                {/* Logout */}
                <Button 
                    variant="light" 
                    onClick={onLogout} 
                    className="btn-logout-custom p-0 d-flex justify-content-center align-items-center"
                    title="Log Out"
                >
                    <FaSignOutAlt size={16} />
                </Button>
            </div>
        </div>
    );
};

export default Header;