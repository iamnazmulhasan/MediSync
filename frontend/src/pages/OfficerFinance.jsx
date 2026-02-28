import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    doctorAPI, patientAPI, coreProfileAPI, transactionAPI, 
    officerBusinessAPI
} from '../api/api';
import { 
    FaChevronLeft, FaChevronRight, FaSearch, FaCheck, FaTimes, 
    FaMoneyBillWave, FaClock, FaBan, FaCheckCircle, FaChevronDown
} from 'react-icons/fa';

const Toast = Swal.mixin({
    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true,
    didOpen: (toast) => { toast.addEventListener('mouseenter', Swal.stopTimer); toast.addEventListener('mouseleave', Swal.resumeTimer); }
});

const STATIC_USER_TYPES = [
    { id: 1, name: "doctor" },
    { id: 2, name: "patient" },
    { id: 3, name: "laboratory" },
    { id: 4, name: "pharmacy" },
    { id: 5, name: "officer" }
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
const LunaDropdown = ({ options, value, onChange, placeholder = "Select", zIndex = 1000 }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedObj = options.find(o => o.id === value);

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
                            <div key={opt.id} className={`dept-option ${value === opt.id ? 'selected' : ''}`} onClick={() => { onChange(opt.id); setIsOpen(false); }} style={{padding: '10px 15px', cursor: 'pointer', textTransform: 'capitalize'}}>
                                {opt.name}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const OfficerFinance = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));
    
    const [activeTab, setActiveTab] = useState('cashout'); // 'cashout' | 'cashin'
    const [officerId, setOfficerId] = useState(null);

    // --- CASH OUT STATE ---
    const [cashoutRequests, setCashoutRequests] = useState([]);
    const [filterStatus, setFilterStatus] = useState('all');
    const [loadingOut, setLoadingOut] = useState(true);
    const [profilesCache, setProfilesCache] = useState({});
    
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    // --- CASH IN STATE ---
    const [cashinType, setCashinType] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [isSubmittingIn, setIsSubmittingIn] = useState(false);

    // Initial Setup
    useEffect(() => {
        if (!user?.person_id) return;
        doctorAPI.getProfileIds(user.person_id).then(res => setOfficerId(res.data.officer_id)).catch(console.error);
    }, [user]);

    // ==========================================
    // CASH OUT LOGIC
    // ==========================================
    useEffect(() => {
        if (activeTab === 'cashout') fetchCashouts();
    }, [activeTab, filterStatus]);

    const fetchCashouts = async () => {
        setLoadingOut(true);
        try {
            const res = await transactionAPI.getCashouts(filterStatus);
            setCashoutRequests(res.data.results || res.data || []);
        } catch (error) {
            console.error("Failed to load requests", error);
            Toast.fire({ icon: 'error', title: 'Failed to load requests' });
        } finally {
            setLoadingOut(false);
        }
    };

    // Cache specific profiles for the visible requests dynamically
    useEffect(() => {
        if (activeTab !== 'cashout' || cashoutRequests.length === 0) return;

        const visibleRequests = cashoutRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
        
        const fetchMissingProfiles = async () => {
            let updatedCache = { ...profilesCache };
            let hasNew = false;
            
            for (let req of visibleRequests) {
                const key = `${req.requester_type_name}-${req.requester_id}`;
                if (!updatedCache[key]) {
                    try {
                        let data = null;
                        if (req.requester_type_name === 'doctor') {
                            const res = await doctorAPI.getDoctorDetails({ type: 'doctor_id', id: req.requester_id });
                            data = res.data;
                        } else if (req.requester_type_name === 'patient') {
                            const res = await patientAPI.getPatientDetails({ type: 'patient_id', id: req.requester_id });
                            data = res.data;
                        } else if (req.requester_type_name === 'laboratory') {
                            const res = await officerBusinessAPI.getLab(req.requester_id);
                            data = res.data;
                        } else if (req.requester_type_name === 'pharmacy') {
                            const res = await officerBusinessAPI.getPharmacy(req.requester_id);
                            data = res.data;
                        }
                        
                        if (data) {
                            updatedCache[key] = {
                                name: data.person?.name || data.name || data.owner_name || 'Unknown',
                                email: data.person?.email || data.email || 'N/A',
                                balance: parseFloat(data.balance || 0)
                            };
                            hasNew = true;
                        }
                    } catch (e) {
                        updatedCache[key] = { name: 'Error', email: 'Error', balance: 0 };
                        hasNew = true;
                    }
                }
            }
            if (hasNew) setProfilesCache(updatedCache);
        };
        fetchMissingProfiles();
    }, [cashoutRequests, currentPage, activeTab, profilesCache]);

    const handleAcceptCashout = (req) => {
        if (!officerId) return;
        const cacheKey = `${req.requester_type_name}-${req.requester_id}`;
        const profileInfo = profilesCache[cacheKey];
        const reqAmount = parseFloat(req.amount);

        if (!profileInfo) {
            Toast.fire({ icon: 'warning', title: 'Still loading user profile...' });
            return;
        }

        if (profileInfo.balance < reqAmount) {
            Swal.fire({ icon: 'error', title: 'Insufficient Funds', text: 'The user does not have enough balance for this cashout.', customClass: { popup: 'swal-modern-popup' } });
            return;
        }

        Swal.fire({
            title: 'Accept Request?',
            text: `This will deduct ৳${Math.round(reqAmount)} from ${profileInfo.name}'s account.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Accept',
            customClass: { popup: 'swal-modern-popup', confirmButton: 'btn-modern-confirm', cancelButton: 'btn-modern-cancel' }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    Swal.fire({ title: 'Processing...', didOpen: () => Swal.showLoading(), allowOutsideClick: false, customClass: { popup: 'swal-modern-popup' }});
                    
                    // 1. Accept Request via Backend
                    await transactionAPI.acceptCashout(req.id, { officer_id: officerId, officer_type: 5 });
                    
                    // 2. Deduct Balance via PATCH
                    const newBalance = (profileInfo.balance - reqAmount).toFixed(2);
                    
                    if (req.requester_type_name === 'doctor' || req.requester_type_name === 'patient') {
                        await coreProfileAPI.updateProfile({ type: req.requester_type_name, id: req.requester_id, data: { balance: newBalance } });
                    } else if (req.requester_type_name === 'laboratory') {
                        await officerBusinessAPI.updateLab(req.requester_id, { balance: newBalance });
                    } else if (req.requester_type_name === 'pharmacy') {
                        await officerBusinessAPI.updatePharmacy(req.requester_id, { balance: newBalance });
                    }

                    // Update UI request status to accepted
                    setCashoutRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 5, status_name: 'accepted' } : r));
                    
                    // NOTE: We do NOT update the profilesCache balance here. This ensures the table 
                    // continues to display the original 'current' balance at the time of the request.
                    
                    Swal.fire({ icon: 'success', title: 'Accepted', text: 'Cash out processed successfully.', timer: 2000, showConfirmButton: false, customClass: { popup: 'swal-modern-popup' }});
                } catch (error) {
                    console.error(error);
                    Swal.fire({ icon: 'error', title: 'Failed', text: 'Could not process request.', customClass: { popup: 'swal-modern-popup' }});
                }
            }
        });
    };

    const handleCancelCashout = (reqId) => {
        if (!officerId) return;
        Swal.fire({
            title: 'Cancel Request',
            input: 'textarea',
            inputLabel: 'Reason for cancellation',
            inputPlaceholder: 'Type reason here...',
            showCancelButton: true,
            confirmButtonText: 'Cancel Request',
            cancelButtonText: 'Back',
            customClass: { popup: 'swal-modern-popup', confirmButton: 'btn-modern-confirm', cancelButton: 'btn-modern-cancel', input: 'swal-modern-input' },
            preConfirm: (reason) => {
                if (!reason) { Swal.showValidationMessage('Reason is required'); return false; }
                return reason;
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await transactionAPI.cancelCashout(reqId, { officer_id: officerId, officer_type: 5, reason: result.value });
                    setCashoutRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 4, status_name: 'cancelled' } : r));
                    Toast.fire({ icon: 'success', title: 'Request Cancelled' });
                } catch (error) {
                    Swal.fire({ icon: 'error', title: 'Error', text: 'Could not cancel request.', customClass: { popup: 'swal-modern-popup' }});
                }
            }
        });
    };

    // ==========================================
    // CASH IN LOGIC
    // ==========================================
    const handleSearchUser = async (query) => {
        setSearchQuery(query);
        setSelectedUser(null);
        if (query.trim().length < 2 || !cashinType) {
            setSearchResults([]);
            setShowSuggestions(false);
            return;
        }

        try {
            const typeObj = STATIC_USER_TYPES.find(t => t.id === cashinType);
            if (!typeObj) return;

            const res = await coreProfileAPI.searchProfiles(typeObj.name, query);
            const data = res.data.results || [];
            
            const mappedData = data.map(item => ({
                id: item.id,
                name: item.person?.name || item.name || item.owner_name || 'Unknown',
                email: item.person?.email || item.email || 'No Email',
                balance: parseFloat(item.balance || 0),
                raw: item
            }));

            setSearchResults(mappedData);
            setShowSuggestions(true);
        } catch (error) {
            console.error("Search failed", error);
        }
    };

    const handleSelectCashinUser = (userObj) => {
        setSearchQuery(userObj.name);
        setSelectedUser(userObj);
        setShowSuggestions(false);
    };

    const handleSubmitCashIn = async (e) => {
        e.preventDefault();
        if (!officerId || !selectedUser || !amount || parseFloat(amount) <= 0) return;

        setIsSubmittingIn(true);
        try {
            const typeObj = STATIC_USER_TYPES.find(t => t.id === cashinType);
            const amtFloat = parseFloat(amount);

            const payload = {
                user_id: selectedUser.id,
                user_type: typeObj.id,
                amount: Math.round(amtFloat).toString(),
                note: note.trim() || 'Cash in via Officer',
                officer_id: officerId,
                officer_type: 5
            };

            await transactionAPI.addMoney(payload);

            const newBalance = (selectedUser.balance + amtFloat).toFixed(2);
            
            if (typeObj.name === 'doctor' || typeObj.name === 'patient' || typeObj.name === 'officer') {
                await coreProfileAPI.updateProfile({ type: typeObj.name, id: selectedUser.id, data: { balance: newBalance } });
            } else if (typeObj.name === 'laboratory') {
                await officerBusinessAPI.updateLab(selectedUser.id, { balance: newBalance });
            } else if (typeObj.name === 'pharmacy') {
                await officerBusinessAPI.updatePharmacy(selectedUser.id, { balance: newBalance });
            }

            Swal.fire({
                icon: 'success', title: 'Cash In Successful', text: `Added ৳${Math.round(amtFloat)} to ${selectedUser.name}'s wallet.`,
                customClass: { popup: 'swal-modern-popup', confirmButton: 'btn-modern-confirm' }
            });

            // Reset form
            setCashinType(''); setSearchQuery(''); setSelectedUser(null); setAmount(''); setNote('');
            
        } catch (error) {
            console.error("Cash in failed", error);
            Swal.fire({ icon: 'error', title: 'Transaction Failed', customClass: { popup: 'swal-modern-popup' } });
        } finally {
            setIsSubmittingIn(false);
        }
    };

    // ==========================================
    // RENDER HELPERS
    // ==========================================
    const getStatusBadge = (statusName) => {
        const s = statusName.toLowerCase();
        if (s === 'accepted') return <span className="badge-status-modern" style={{background: '#E8F5E9', color: '#2E7D32'}}>Accepted</span>;
        if (s === 'cancelled') return <span className="badge-status-modern" style={{background: '#FFEBEE', color: '#C62828'}}>Cancelled</span>;
        return <span className="badge-status-modern" style={{background: '#FFF3E0', color: '#F57C00'}}>Pending</span>;
    };

    const formatDate = (isoString) => {
        if (!isoString) return 'N/A';
        const date = new Date(isoString);
        return date.toLocaleDateString('en-GB');
    };

    const formatTime = (isoString) => {
        if (!isoString) return 'N/A';
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const variants = { hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0, transition: { duration: 0.3 } }, exit: { opacity: 0, x: -20, transition: { duration: 0.2 } } };

    const totalPages = Math.ceil(cashoutRequests.length / itemsPerPage);
    const visibleCashouts = cashoutRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const renderPagination = () => {
        if (totalPages <= 1) return null;
        const buttons = [];
        let startPage = Math.max(1, currentPage - 1);
        let endPage = Math.min(totalPages, startPage + 3);
        if (endPage - startPage < 3) startPage = Math.max(1, endPage - 3);

        buttons.push(<button key="prev" className="page-btn-modern" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}><FaChevronLeft size={10} /></button>);
        for (let i = startPage; i <= endPage; i++) {
            buttons.push(<button key={i} className={`page-btn-modern ${currentPage === i ? 'active' : ''}`} onClick={() => setCurrentPage(i)}>{i}</button>);
        }
        if (endPage < totalPages) buttons.push(<span key="dots" style={{color:'#B0BEC5', fontSize:'0.8rem'}}>...</span>);
        buttons.push(<button key="next" className="page-btn-modern" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}><FaChevronRight size={10} /></button>);
        return buttons;
    };

    return (
        <Container fluid className="p-4">
            <button onClick={() => navigate('/')} className="btn btn-light mb-4 d-flex align-items-center gap-2 shadow-sm rounded-pill px-3" style={{fontFamily: "'Google Sans', sans-serif", fontWeight: '600', color: '#546E7A', width: 'fit-content'}}>
                <FaChevronLeft size={12} /> Back to Dashboard
            </button>

            <div className="text-center mb-4">
                <h2 className="page-title-serif mb-2" style={{ fontWeight: '700', fontStyle: 'italic', fontSize: '2.8rem' }}>
                    Financial Hub
                </h2>
                <p className="mb-4" style={{ fontFamily: "'Google Sans', sans-serif", fontSize: '0.85rem', color: 'var(--luna-mid)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Manage platform transactions & requests
                </p>
            </div>

            {/* TOGGLE */}
            <div className="auth-toggle-wrapper mb-4">
                <div className="auth-toggle-container" style={{ width: '280px' }}>
                    <div className={`toggle-slider ${activeTab === 'cashin' ? 'right' : ''}`}></div>
                    <button className={`toggle-btn ${activeTab === 'cashout' ? 'active' : ''}`} onClick={() => {setActiveTab('cashout'); setCurrentPage(1);}}>Cash Out</button>
                    <button className={`toggle-btn ${activeTab === 'cashin' ? 'active' : ''}`} onClick={() => setActiveTab('cashin')}>Cash In</button>
                </div>
            </div>

            <AnimatePresence mode='wait'>
                
                {/* --- CASH OUT TAB --- */}
                {activeTab === 'cashout' && (
                    <motion.div key="cashout-view" variants={variants} initial="hidden" animate="visible" exit="exit">
                        
                        {/* Filters */}
                        <div className="d-flex justify-content-center mb-4 gap-2">
                            {['all', 'pending', 'accepted', 'cancelled'].map(status => (
                                <button 
                                    key={status}
                                    onClick={() => { setFilterStatus(status); setCurrentPage(1); }}
                                    className="btn-glassy-primary"
                                    style={{
                                        background: filterStatus === status ? 'linear-gradient(135deg, var(--luna-mid) 0%, var(--luna-dark) 100%)' : 'white',
                                        color: filterStatus === status ? 'white' : 'var(--luna-mid)',
                                        border: '1px solid #E1F5FE',
                                        textTransform: 'capitalize', padding: '6px 16px', fontSize: '0.8rem'
                                    }}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>

                        {loadingOut ? (
                            <div className="loading-container mt-5">
                                <div className="custom-spinner"></div>
                                <div className="font-google-sans" style={{fontWeight: 600}}>Loading Requests...</div>
                            </div>
                        ) : (
                            <>
                                <div className="plain-table-container">
                                    <table className="plain-table">
                                        <thead>
                                            <tr>
                                                <th style={{width: '6%'}}>ID</th>
                                                <th style={{width: '12%'}}>Type</th>
                                                {/* Centered Headers */}
                                                <th style={{width: '18%', textAlign: 'center'}}>Requester Name</th>
                                                <th style={{width: '18%', textAlign: 'center'}}>Email</th>
                                                <th style={{width: '10%'}}>Amount</th>
                                                <th style={{width: '10%'}}>Balance</th>
                                                <th style={{width: '9%'}}>Date</th>
                                                <th style={{width: '9%'}}>Time</th>
                                                <th style={{width: '8%'}}>Status</th>
                                                <th style={{width: '15%'}}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {visibleCashouts.length > 0 ? (
                                                visibleCashouts.map((req) => {
                                                    const cacheKey = `${req.requester_type_name}-${req.requester_id}`;
                                                    const profileInfo = profilesCache[cacheKey] || { name: 'Loading...', email: '...', balance: 0 };
                                                    const isPending = req.status_name.toLowerCase() === 'pending';

                                                    return (
                                                        <tr key={req.id}>
                                                            <td><span className="text-muted" style={{fontFamily: "'Inter', monospace", fontSize: '0.85rem'}}>#{req.id}</span></td>
                                                            <td><span className="text-unified text-capitalize" style={{color: '#546E7A', fontSize: '0.8rem'}}>{req.requester_type_name}</span></td>
                                                            
                                                            {/* Centered Content with 2px nudge downwards */}
                                                            <td className="text-center align-middle">
                                                                <span className="doc-name mb-0" style={{fontSize: '0.9rem', position: 'relative', top: '2px'}}>{profileInfo.name}</span>
                                                            </td>
                                                            <td className="text-center align-middle">
                                                                <span className="text-unified" style={{fontWeight: 500, fontSize: '0.8rem'}}>{profileInfo.email}</span>
                                                            </td>
                                                            
                                                            <td><span className="fee-val" style={{color: '#C62828'}}>৳{Math.round(parseFloat(req.amount))}</span></td>
                                                            <td><span className="fee-val" style={{color: '#2E7D32'}}>৳{Math.round(profileInfo.balance)}</span></td>
                                                            
                                                            <td><span className="text-unified" style={{fontSize: '0.8rem'}}>{formatDate(req.created_at)}</span></td>
                                                            <td><span className="time-bold" style={{fontSize: '0.8rem'}}>{formatTime(req.created_at)}</span></td>
                                                            
                                                            <td>{getStatusBadge(req.status_name)}</td>
                                                            
                                                            <td>
                                                                {isPending ? (
                                                                    <div className="d-flex align-items-center justify-content-center gap-2">
                                                                        <button className="btn-icon-circle" style={{background: '#E8F5E9', color: '#2E7D32', width: '30px', height: '30px'}} onClick={() => handleAcceptCashout(req)} title="Accept">
                                                                            <FaCheck size={12} />
                                                                        </button>
                                                                        <button className="btn-icon-circle" style={{background: '#FFEBEE', color: '#C62828', width: '30px', height: '30px'}} onClick={() => handleCancelCashout(req.id)} title="Cancel">
                                                                            <FaTimes size={12} />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-muted fst-italic" style={{fontSize: '0.8rem', fontFamily: 'Inter'}}>Processed</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr className="row-transparent">
                                                    <td colSpan="10" className="no-results-view no-results-content">
                                                        <div className="nr-divider"></div>
                                                        <h3 className="nr-title">NO REQUESTS FOUND</h3>
                                                        <p className="nr-subtitle">There are no cash out requests matching this status.</p>
                                                        <div className="nr-divider"></div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {totalPages > 1 && <div className="pagination-wrapper-right mt-3">{renderPagination()}</div>}
                            </>
                        )}
                    </motion.div>
                )}

                {/* --- CASH IN TAB --- */}
                {activeTab === 'cashin' && (
                    <motion.div key="cashin-view" variants={variants} initial="hidden" animate="visible" exit="exit" className="d-flex justify-content-center w-100">
                        <div className="glass-card" style={{ maxWidth: '500px', width: '100%', padding: '2.5rem' }}>
                            <div className="text-center mb-4">
                                <div className="avatar-box mx-auto mb-3 d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px', background: 'linear-gradient(135deg, #E0F2F1 0%, #B2EBF2 100%)', color: '#00796B', borderRadius: '50%' }}>
                                    <FaMoneyBillWave size={24} />
                                </div>
                                <h4 className="font-heading" style={{ color: 'var(--luna-navy)' }}>Add Money to Wallet</h4>
                            </div>

                            <form onSubmit={handleSubmitCashIn}>
                                
                                {/* 1. User Type Dropdown */}
                                <div className="mb-custom mb-3" style={{zIndex: 1000, position: 'relative'}}>
                                    <label className="form-label">User Type</label>
                                    <LunaDropdown 
                                        options={STATIC_USER_TYPES} 
                                        value={cashinType} 
                                        onChange={(val) => { setCashinType(val); setSearchQuery(''); setSelectedUser(null); }} 
                                        placeholder="Select Type" 
                                    />
                                </div>

                                {/* 2. Search Autocomplete */}
                                <div className="mb-custom mb-3 position-relative">
                                    <label className="form-label">Search User</label>
                                    <div className="input-group-custom">
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            value={searchQuery} 
                                            onChange={(e) => handleSearchUser(e.target.value)} 
                                            onFocus={() => setShowSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                            disabled={!cashinType}
                                            placeholder={cashinType ? "Search by Name, Email..." : "Select user type first"} 
                                        />
                                        <FaSearch className="input-icon" size={14}/>
                                    </div>
                                    
                                    {showSuggestions && searchResults.length > 0 && (
                                        <div className="rx-dx-dropdown w-100 position-absolute" style={{zIndex: 999}}>
                                            {searchResults.map(u => (
                                                <div 
                                                    key={u.id} 
                                                    className="rx-dx-option" 
                                                    style={{ textTransform: 'none' }} // Ensure no capitalization 
                                                    onMouseDown={(e) => { e.preventDefault(); handleSelectCashinUser(u); }}
                                                >
                                                    <HighlightMatch text={`${u.name} (${u.email})`} query={searchQuery} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Display Selected User Info */}
                                {selectedUser && (
                                    <div className="p-3 rounded-3 mb-3" style={{backgroundColor: '#F8FAFC', border: '1px dashed #CFD8DC'}}>
                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                            <span className="text-muted fw-bold" style={{fontSize: '0.7rem', textTransform: 'uppercase'}}>Selected User</span>
                                        </div>
                                        <div style={{fontFamily: 'Google Sans', fontWeight: 700, color: 'var(--luna-navy)'}}>{selectedUser.name}</div>
                                        <div style={{fontSize: '0.8rem', color: '#546E7A'}}>{selectedUser.email}</div>
                                        
                                        <div className="mt-2 pt-2 border-top d-flex justify-content-between align-items-center">
                                            <span className="text-muted fw-bold" style={{fontSize: '0.7rem', textTransform: 'uppercase'}}>Current Balance</span>
                                            <span style={{fontFamily: "'Google Sans Flex', sans-serif", fontWeight: 800, color: '#2E7D32'}}>
                                                ৳ {Math.round(selectedUser.balance)}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Amount & Note */}
                                <div className="row g-2 mb-4">
                                    <div className="col-5">
                                        <div className="mb-custom">
                                            <label className="form-label">Amount (৳)</label>
                                            <input type="number" className="form-control text-center" value={amount} onChange={(e) => setAmount(e.target.value)} required min="1" step="1" disabled={!selectedUser} />
                                        </div>
                                    </div>
                                    <div className="col-7">
                                        <div className="mb-custom">
                                            <label className="form-label">Note</label>
                                            <input type="text" className="form-control" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" disabled={!selectedUser} />
                                        </div>
                                    </div>
                                </div>

                                <button type="submit" className="btn btn-modern w-100" style={{background: 'linear-gradient(135deg, #00796B 0%, #26A69A 100%)', fontWeight: '700', color: 'white'}} disabled={isSubmittingIn || !selectedUser || !amount}>
                                    {isSubmittingIn ? 'Processing...' : 'Add Balance'}
                                </button>
                            </form>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Container>
    );
};

export default OfficerFinance;