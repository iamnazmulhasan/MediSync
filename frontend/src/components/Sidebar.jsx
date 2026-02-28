import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
    FaHeartbeat, 
    FaThLarge, 
    FaCalendarAlt, 
    FaUserMd, 
    FaPills, 
    FaFlask, 
    FaFileAlt,
    FaCalendarPlus,
    FaClipboardList,
    FaUserClock,
    FaRegCalendarCheck // Imported a distinct icon for Availability
} from 'react-icons/fa';

const Sidebar = ({ user }) => {
    // Check if the user is a receptionist
    const isReceptionist = user?.role === 'receptionist';

    return (
        <div className="sidebar">
            <div className="sidebar-brand">
                <FaHeartbeat className="brand-icon" />
                <span className="brand-text">MediSync</span>
            </div>

            <div className="nav-group d-flex flex-column gap-1">
                
                {isReceptionist ? (
                    /* --- RECEPTIONIST LINKS --- */
                    <>
                        <NavLink to="/" className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}>
                            <FaClipboardList className="nav-icon" />
                            <span className="nav-text">Appointments</span>
                        </NavLink>

                        <NavLink to="/patient-appointments" className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}>
                            <FaUserClock className="nav-icon" />
                            <span className="nav-text">Patient Appt.</span>
                        </NavLink>
                        
                        <NavLink to="/book-appointment" className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}>
                            <FaCalendarPlus className="nav-icon" />
                            <span className="nav-text">Book Appt.</span>
                        </NavLink>

                        {/* --- CHANGED Doctors to Availability --- */}
                        <NavLink to="/availability" className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}>
                            <FaRegCalendarCheck className="nav-icon" />
                            <span className="nav-text">Availability</span>
                        </NavLink>
                    </>
                ) : (
                    /* --- PATIENT LINKS --- */
                    <>
                        <NavLink to="/" className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}>
                            <FaThLarge className="nav-icon" />
                            <span className="nav-text">Dashboard</span>
                        </NavLink>
                        
                        <NavLink to="/appointments" className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}>
                            <FaCalendarAlt className="nav-icon" />
                            <span className="nav-text">Appointments</span>
                        </NavLink>

                        <NavLink to="/doctors" className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}>
                            <FaUserMd className="nav-icon" />
                            <span className="nav-text">Doctors</span>
                        </NavLink>

                        <NavLink to="/prescriptions" className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}>
                            <FaPills className="nav-icon" />
                            <span className="nav-text">Prescriptions</span>
                        </NavLink>

                        <NavLink to="/tests" className={({ isActive }) => `nav-link-custom ${isActive ? 'active' : ''}`}>
                            <FaFlask className="nav-icon" />
                            <span className="nav-text">Lab Tests</span>
                        </NavLink>
                    </>
                )}
                
            </div>
        </div>
    );
};

export default Sidebar;