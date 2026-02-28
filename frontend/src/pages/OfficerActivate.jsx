import React, { useState, useRef, useEffect } from 'react';
import { Container } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { coreProfileAPI, officerAPI } from '../api/api';
import { 
    FaChevronLeft, FaSearch, FaUserCheck, FaChevronDown, FaCheckCircle 
} from 'react-icons/fa';

const Toast = Swal.mixin({
    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true,
    didOpen: (toast) => { toast.addEventListener('mouseenter', Swal.stopTimer); toast.addEventListener('mouseleave', Swal.resumeTimer); }
});

// Excludes "officer" from the list
const ACTIVATE_USER_TYPES = [
    { id: 1, name: "doctor" },
    { id: 2, name: "patient" },
    { id: 3, name: "laboratory" },
    { id: 4, name: "pharmacy" }
];

// Highlight component for autocomplete
const HighlightMatch = ({ text, query }) => {
    if (!query || typeof text !== 'string') return <span>{text}</span>; 
    try {
        const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
        const regex = new RegExp(`(${safeQuery})`, 'gi');
        const parts = text.split(regex);
        return (
            <span>
                {parts.map((part, i) => 
                    (part.toLowerCase() === safeQuery.toLowerCase())
                        ? <strong key={i} style={{fontWeight: 800, color: '#D32F2F'}}>{part}</strong> 
                        : <span key={i}>{part}</span>
                )}
            </span>
        );
    } catch (e) {
        return <span>{text}</span>;
    }
};

// Custom Dropdown Component
const LunaDropdown = ({ options, value, onChange, placeholder = "Select Type", zIndex = 1000 }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedObj = options.find(o => o.name === value);

    return (
        <div className="position-relative w-100" ref={containerRef}>
            <div className={`input-luna-trigger ${isOpen ? 'active' : ''}`} style={{ borderRadius: '12px', background: '#F5FDFF', border: '1px solid #E0F2F1', height: 'auto', padding: '0.6rem 0.7rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', width: '100%' }} onClick={() => setIsOpen(!isOpen)}>
                <span className={selectedObj ? 'text-dark text-capitalize' : 'text-muted'} style={{fontSize: '0.85rem', fontWeight: '500'}}>
                    {selectedObj ? selectedObj.name : placeholder}
                </span>
                <FaChevronDown className="text-luna-light" size={12} style={{position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)'}} />
            </div>
            {isOpen && (
                <div className="popup-flow" style={{ position: 'absolute', top: '100%', left: 0, width: '100%', zIndex: zIndex, background: 'white', borderRadius: '12px', boxShadow: '0 5px 25px rgba(0,0,0,0.1)', marginTop: '5px' }}>
                    <div className="dept-list-scroll" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {options.map((opt) => (
                            <div key={opt.id} className={`dept-option ${value === opt.name ? 'selected' : ''}`} onClick={() => { onChange(opt.name); setIsOpen(false); }} style={{padding: '10px 15px', cursor: 'pointer', textTransform: 'capitalize'}}>
                                {opt.name}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const OfficerActivate = () => {
    const navigate = useNavigate();
    
    const [selectedType, setSelectedType] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    
    // The currently loaded user to toggle
    const [selectedUser, setSelectedUser] = useState(null);
    const [isToggling, setIsToggling] = useState(false);

    const handleSearchUser = async (query) => {
        setSearchQuery(query);
        setSelectedUser(null); // Clear selected user when typing
        if (query.trim().length < 2 || !selectedType) {
            setSearchResults([]);
            setShowSuggestions(false);
            return;
        }

        try {
            const res = await coreProfileAPI.searchProfiles(selectedType, query);
            const data = res.data.results || [];
            
            // Normalize data structure for UI
            const mappedData = data.map(item => ({
                id: item.id,
                name: item.person?.name || item.name || item.owner_name || 'Unknown',
                email: item.person?.email || item.email || 'No Email',
                active: item.active === true || item.active === 1,
                raw: item
            }));

            setSearchResults(mappedData);
            setShowSuggestions(true);
        } catch (error) {
            console.error("Search failed", error);
        }
    };

    const handleSelectUser = (userObj) => {
        setSearchQuery(userObj.name);
        setSelectedUser(userObj);
        setShowSuggestions(false);
    };

    const handleToggleActive = async () => {
        if (!selectedUser || isToggling) return;

        setIsToggling(true);
        const newStatus = !selectedUser.active;

        try {
            const payload = {
                user_type: selectedType,
                user_id: selectedUser.id,
                active: newStatus
            };

            await officerAPI.toggleActive(payload);
            
            // Optimistically update the UI
            setSelectedUser(prev => ({ ...prev, active: newStatus }));
            
            Toast.fire({ 
                icon: 'success', 
                title: `Account ${newStatus ? 'Activated' : 'Frozen'} successfully.` 
            });

        } catch (error) {
            console.error("Toggle failed", error);
            Swal.fire({ icon: 'error', title: 'Action Failed', text: 'Could not update account status.', customClass: { popup: 'swal-modern-popup' } });
        } finally {
            setIsToggling(false);
        }
    };

    return (
        <Container fluid className="p-4 fade-in">
            <button 
                onClick={() => navigate('/')} 
                className="btn btn-light mb-4 d-flex align-items-center gap-2 shadow-sm rounded-pill px-3"
                style={{fontFamily: "'Google Sans', sans-serif", fontWeight: '600', color: '#546E7A', width: 'fit-content'}}
            >
                <FaChevronLeft size={12} /> Back to Dashboard
            </button>

            <div className="text-center mb-5">
                <h2 className="page-title-serif mb-2" style={{ fontWeight: '700', fontStyle: 'italic', fontSize: '2.8rem' }}>
                    Account Activation
                </h2>
                <p className="mb-4" style={{ fontFamily: "'Google Sans', sans-serif", fontSize: '0.85rem', color: 'var(--luna-mid)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Freeze or unfreeze registered accounts
                </p>
            </div>

            <div className="d-flex justify-content-center w-100">
                <div className="glass-card" style={{ maxWidth: '500px', width: '100%', padding: '2.5rem' }}>
                    
                    <div className="text-center mb-4">
                        <div className="avatar-box mx-auto mb-3 d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px', background: 'linear-gradient(135deg, #E0F2F1 0%, #B2EBF2 100%)', color: '#00796B', borderRadius: '50%' }}>
                            <FaUserCheck size={24} />
                        </div>
                        <h4 className="font-heading" style={{ color: 'var(--luna-navy)' }}>Find Account</h4>
                    </div>

                    {/* 1. User Type Dropdown */}
                    <div className="mb-custom mb-3" style={{zIndex: 1000, position: 'relative'}}>
                        <label className="form-label">User Type</label>
                        <LunaDropdown 
                            options={ACTIVATE_USER_TYPES} 
                            value={selectedType} 
                            onChange={(val) => { setSelectedType(val); setSearchQuery(''); setSelectedUser(null); }} 
                            placeholder="Select Type" 
                        />
                    </div>

                    {/* 2. Search Autocomplete */}
                    <div className="mb-custom mb-3 position-relative">
                        <label className="form-label">Search Account</label>
                        <div className="input-group-custom">
                            <input 
                                type="text" 
                                className="form-control" 
                                value={searchQuery} 
                                onChange={(e) => handleSearchUser(e.target.value)} 
                                onFocus={() => setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                disabled={!selectedType}
                                placeholder={selectedType ? "Search by Name, Email..." : "Select user type first"} 
                            />
                            <FaSearch className="input-icon" size={14}/>
                        </div>
                        
                        {showSuggestions && searchResults.length > 0 && (
                            <div className="rx-dx-dropdown w-100 position-absolute" style={{zIndex: 999}}>
                                {searchResults.map(u => (
                                    <div 
                                        key={u.id} 
                                        className="rx-dx-option" 
                                        style={{ textTransform: 'none' }}
                                        onMouseDown={(e) => { e.preventDefault(); handleSelectUser(u); }}
                                    >
                                        <HighlightMatch text={`${u.name} (${u.email})`} query={searchQuery} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 3. Display Selected User & Toggle */}
                    {selectedUser && (
                        <div className="p-3 rounded-3 mt-4 fade-in" style={{backgroundColor: '#F8FAFC', border: '1px solid #CFD8DC'}}>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="text-muted fw-bold" style={{fontSize: '0.7rem', textTransform: 'uppercase'}}>Account Details</span>
                                <span className="text-muted fw-bold" style={{fontSize: '0.7rem', textTransform: 'uppercase'}}>ID: {selectedUser.id}</span>
                            </div>
                            
                            <div style={{fontFamily: 'Google Sans', fontWeight: 700, color: 'var(--luna-navy)', fontSize: '1.1rem'}}>{selectedUser.name}</div>
                            <div style={{fontSize: '0.85rem', color: '#546E7A'}} className="mb-3">{selectedUser.email}</div>
                            
                            <div className="pt-3 border-top d-flex justify-content-between align-items-center">
                                <span className="fw-bold" style={{fontFamily: "'Google Sans Flex', sans-serif", color: 'var(--luna-navy)'}}>
                                    Account Status
                                </span>
                                
                                <div className="d-flex align-items-center gap-2">
                                    <span style={{fontSize: '0.85rem', fontWeight: '600', color: selectedUser.active ? '#2E7D32' : '#90A4AE'}}>
                                        {selectedUser.active ? 'Active' : 'Frozen'}
                                    </span>
                                    <button 
                                        className={`status-check-btn ${selectedUser.active ? 'active-status' : 'inactive-status'}`}
                                        onClick={handleToggleActive}
                                        disabled={isToggling}
                                        title={selectedUser.active ? "Click to Freeze Account" : "Click to Activate Account"}
                                    >
                                        {isToggling ? <div className="spinner-sm" style={{borderColor: '#2E7D32'}}></div> : <FaCheckCircle size={26} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </Container>
    );
};

export default OfficerActivate;