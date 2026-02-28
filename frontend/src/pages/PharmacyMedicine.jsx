import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { pharmacyAPI, coreAPI } from '../api/api';
import { FaSearch, FaChevronLeft, FaChevronRight, FaPlus, FaBoxOpen, FaSave, FaPen } from 'react-icons/fa';

const Toast = Swal.mixin({
    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true,
    didOpen: (toast) => { toast.addEventListener('mouseenter', Swal.stopTimer); toast.addEventListener('mouseleave', Swal.resumeTimer); }
});

const escapeRegex = (string) => string ? string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';

const HighlightMatch = ({ text, query }) => {
    if (!query || typeof text !== 'string') return <span style={{ fontFamily: "'Google Sans', sans-serif" }}>{text}</span>; 
    try {
        const safeQuery = escapeRegex(query.trim());
        const regex = new RegExp(`(${safeQuery})`, 'gi');
        const parts = text.split(regex);
        return (
            <span style={{ fontFamily: "'Google Sans', sans-serif" }}>
                {parts.map((part, i) => 
                    (part.toLowerCase() === safeQuery.toLowerCase())
                        ? <strong key={i} style={{fontWeight: 800, color: 'var(--luna-mid)'}}>{part}</strong> 
                        : <span key={i}>{part}</span>
                )}
            </span>
        );
    } catch (e) {
        return <span style={{ fontFamily: "'Google Sans', sans-serif" }}>{text}</span>;
    }
};

const PharmacyMedicine = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [view, setView] = useState('list'); 
    
    const [inventory, setInventory] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    const [genericList, setGenericList] = useState([]);
    const [medicinesCache, setMedicinesCache] = useState({});
    const [activeField, setActiveField] = useState(null);
    const [form, setForm] = useState({
        generic: '', genericId: null, medicineName: '', medicineId: null, amount: ''
    });

    useEffect(() => {
        const storedUserStr = localStorage.getItem('user');
        if (storedUserStr) {
            const parsedUser = JSON.parse(storedUserStr);
            setUser(parsedUser);
            fetchInventory(parsedUser.id);
        } else {
            navigate('/business');
        }

        coreAPI.getMedicineGenerics()
            .then(res => setGenericList(Array.isArray(res.data) ? res.data : (res.data?.results || [])))
            .catch(console.error);
    }, [navigate]);

    const fetchInventory = async (pharmacyId) => {
        setLoading(true);
        try {
            const res = await pharmacyAPI.getMedicineAvailability(pharmacyId);
            setInventory(Array.isArray(res.data) ? res.data : (res.data?.results || []));
        } catch (error) {
            console.error("Error fetching inventory:", error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Could not load inventory.', customClass: { popup: 'swal-modern-popup' } });
        } finally {
            setLoading(false);
        }
    };

    const handleAddSubmit = async () => {
        if (!form.medicineId || !form.amount || parseInt(form.amount) < 0) {
            Swal.fire({ icon: 'warning', title: 'Invalid Entry', text: 'Please select a medicine and enter a valid amount.', customClass: { popup: 'swal-modern-popup' } });
            return;
        }

        setLoading(true);
        try {
            const payload = { medicine_id: parseInt(form.medicineId), amount: parseInt(form.amount) };
            const response = await pharmacyAPI.addMedicine(user.id, payload);

            Toast.fire({ icon: 'success', title: `Added ${response.data.result?.amount || form.amount} units of ${response.data.result?.medicine_name || form.medicineName}` });

            setForm({ generic: '', genericId: null, medicineName: '', medicineId: null, amount: '' });
            fetchInventory(user.id);
            setView('list');
        } catch (error) {
            console.error(error);
            Swal.fire({ icon: 'error', title: 'Failed to add stock', text: error.response?.data?.detail || 'Please try again.', customClass: { popup: 'swal-modern-popup' } });
        } finally {
            setLoading(false);
        }
    };

    // --- FIX: UPDATED SWEETALERT POPUP ---
    const handleUpdateStock = (item) => {
        Swal.fire({
            title: `<span style="font-family: 'Google Sans', sans-serif; font-weight: 800; color: var(--luna-navy); font-size: 1.4rem;">Update Stock</span>`,
            width: 340, // STRICT WIDTH
            html: `
                <div style="font-family: 'Google Sans', sans-serif; font-size: 0.9rem; color: var(--luna-mid); margin-bottom: 20px;">
                    Updating quantity for <br/><b style="color: var(--luna-navy); font-size: 1.05rem;">${item.medicine_name}</b>
                </div>
                <input id="swal-stock-input" type="number" 
                       style="width: 120px; text-align: center; margin: 0 auto; display: block; padding: 10px; border: 2px solid var(--luna-light); border-radius: 12px; font-family: 'Google Sans', sans-serif; font-size: 1.3rem; font-weight: 700; color: var(--luna-navy); outline: none;" 
                       value="${item.amount}" min="0" step="1" onfocus="this.style.borderColor='var(--luna-mid)'" onblur="this.style.borderColor='var(--luna-light)'">
            `,
            showCancelButton: true,
            confirmButtonText: 'Update',
            cancelButtonText: 'Cancel',
            buttonsStyling: false,
            customClass: {
                popup: 'rounded-4 border-0 shadow-lg',
                confirmButton: 'btn btn-modern px-4 py-2 mx-1',
                cancelButton: 'btn btn-light px-4 py-2 mx-1 fw-bold text-secondary',
                actions: 'd-flex justify-content-center mt-4 mb-2'
            },
            preConfirm: async () => {
                const newAmount = document.getElementById('swal-stock-input').value;
                if (newAmount === '' || parseInt(newAmount) < 0) {
                    Swal.showValidationMessage('Please enter a valid amount');
                    return false;
                }
                try {
                    await pharmacyAPI.updateMedicineStock(user.id, item.id, { amount: parseInt(newAmount) });
                    return parseInt(newAmount);
                } catch (error) {
                    Swal.showValidationMessage(error.response?.data?.detail || 'Failed to update stock');
                    return false;
                }
            }
        }).then((result) => {
            if (result.isConfirmed) {
                Toast.fire({ icon: 'success', title: 'Stock updated successfully' });
                fetchInventory(user.id);
            }
        });
    };

    const getVisibleInventory = () => {
        if (!searchQuery.trim()) return inventory;
        const lowerQ = searchQuery.toLowerCase();
        return inventory.filter(m => 
            m.medicine_name?.toLowerCase().includes(lowerQ) || m.generic_name?.toLowerCase().includes(lowerQ) || m.medicine?.toString().includes(lowerQ)
        );
    };

    const filteredInventory = getVisibleInventory();
    const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
    const currentInventory = filteredInventory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const paginate = (pageNumber) => {
        if (pageNumber >= 1 && pageNumber <= totalPages) setCurrentPage(pageNumber);
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;
        const buttons = [];
        let startPage = Math.max(1, currentPage - 1);
        let endPage = Math.min(totalPages, startPage + 3);
        if (endPage - startPage < 3) startPage = Math.max(1, endPage - 3);

        buttons.push(<button key="prev" className="page-btn-modern" onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}><FaChevronLeft size={10} /></button>);
        for (let i = startPage; i <= endPage; i++) {
            buttons.push(<button key={i} className={`page-btn-modern ${currentPage === i ? 'active' : ''}`} onClick={() => paginate(i)}>{i}</button>);
        }
        if (endPage < totalPages) buttons.push(<span key="dots" style={{color:'#B0BEC5', fontSize:'0.8rem'}}>...</span>);
        buttons.push(<button key="next" className="page-btn-modern" onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages}><FaChevronRight size={10} /></button>);
        return buttons;
    };

    const getFilteredGenerics = (query) => {
        if (!query || !Array.isArray(genericList)) return [];
        const q = query.toLowerCase().trim();
        return genericList.filter(g => g?.name?.toLowerCase().includes(q)).sort((a, b) => a.name.length - b.name.length);
    };

    const getFilteredMedicines = (query, genericId) => {
        if (!query || !genericId || !medicinesCache[genericId] || !Array.isArray(medicinesCache[genericId])) return [];
        const q = query.toLowerCase().trim();
        return medicinesCache[genericId].filter(m => m?.name?.toLowerCase().includes(q)).sort((a, b) => a.name.length - b.name.length);
    };

    const fetchMedicinesForGeneric = async (genericId) => {
        if (medicinesCache[genericId]) return; 
        try {
            const res = await coreAPI.getMedicinesByGeneric(genericId);
            setMedicinesCache(prev => ({ ...prev, [genericId]: Array.isArray(res.data) ? res.data : (res.data?.results || []) }));
        } catch (err) { console.error(err); }
    };

    const handleSelectGeneric = (genericItem) => {
        setForm(prev => ({ ...prev, generic: genericItem.name, genericId: genericItem.id, medicineName: '', medicineId: null }));
        setActiveField(null);
        fetchMedicinesForGeneric(genericItem.id);
    };

    const handleSelectMedicine = (medicineItem) => {
        setForm(prev => ({ ...prev, medicineName: medicineItem.name, medicineId: medicineItem.id }));
        setActiveField(null);
    };

    return (
        <Container fluid className="p-4 fade-in" style={{fontFamily: "'Google Sans', sans-serif"}}>
            <style>{`
                .pm-dropdown {
                    position: absolute; top: 100%; left: 0; width: 100%; max-height: 220px; overflow-y: auto;
                    background: white; border: 1px solid #E1F5FE; border-radius: 12px; box-shadow: 0 10px 30px rgba(1, 28, 64, 0.08);
                    z-index: 1060; margin-top: 8px; padding: 5px 0;
                }
                .pm-dropdown::-webkit-scrollbar { width: 6px; }
                .pm-dropdown::-webkit-scrollbar-thumb { background: #B2EBF2; border-radius: 12px; }
                .pm-option {
                    padding: 12px 15px; font-family: 'Google Sans', sans-serif !important; font-size: 0.95rem; font-weight: 600;
                    color: var(--luna-navy); cursor: pointer; transition: background 0.2s; text-align: left;
                }
                .pm-option:hover { background: #F0F9FF; color: var(--luna-mid); }
                .pm-input-custom {
                    font-family: 'Google Sans', sans-serif !important; font-weight: 600 !important; border: 1px solid #E0F2F1 !important;
                    border-radius: 12px !important; box-shadow: none !important; transition: all 0.2s ease; padding: 12px 15px !important; font-size: 1rem !important;
                }
                .pm-input-custom::placeholder { color: #90A4AE !important; font-weight: 500 !important; }
                .pm-input-custom:focus { border-color: var(--luna-light) !important; box-shadow: 0 0 0 3px rgba(106, 211, 227, 0.2) !important; background: white !important; }
            `}</style>

            <button 
                onClick={() => view === 'add' ? setView('list') : navigate('/profile')} 
                className="btn btn-light mb-4 d-flex align-items-center gap-2 shadow-sm rounded-pill px-3 fw-bold"
                style={{color: 'var(--luna-mid)', width: 'fit-content'}}
            >
                <FaChevronLeft size={12} /> {view === 'add' ? 'Back to Inventory' : 'Back to Profile'}
            </button>

            <div className="text-center mb-4">
                <h2 className="mb-2" style={{ fontWeight: '800', color: 'var(--luna-navy)', fontSize: '2.4rem', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
                    {view === 'list' ? 'Pharmacy Inventory' : 'Add New Stock'}
                </h2>
                <p className="mb-4 text-uppercase fw-bold" style={{ fontSize: '0.85rem', color: 'var(--luna-mid)', letterSpacing: '1px' }}>
                    {view === 'list' ? 'Manage and track your available medicines' : 'Update your pharmacy inventory'}
                </p>
            </div>

            {/* --- VIEW: ADD STOCK (Fixed Alignment & Width) --- */}
            {view === 'add' && (
                <Row className="justify-content-center">
                    <Col xl={5} lg={6} md={8} sm={10}>
                        <div className="glass-card w-100 p-4 pt-5 mx-auto text-start" style={{ borderRadius: '24px', maxWidth: '450px' }}>
                            <div className="d-flex justify-content-center mb-4">
                                <div className="d-flex align-items-center justify-content-center" style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#F0F9FF', color: 'var(--luna-mid)', border: '2px solid #E1F5FE' }}>
                                    <FaBoxOpen size={26} />
                                </div>
                            </div>

                            <div className="mb-4 position-relative">
                                <label className="form-label text-muted text-uppercase fw-bold" style={{fontSize: '0.75rem', letterSpacing: '0.5px'}}>Step 1: Generic Name</label>
                                <input 
                                    type="text" 
                                    className="form-control pm-input-custom" 
                                    style={{ background: '#F5FDFF', color: 'var(--luna-navy)' }}
                                    placeholder="Type generic name..."
                                    value={form.generic}
                                    onFocus={() => setActiveField('generic')}
                                    onBlur={() => setTimeout(() => setActiveField(null), 200)}
                                    onChange={(e) => {
                                        setForm({ ...form, generic: e.target.value, genericId: null, medicineName: '', medicineId: null });
                                        setActiveField('generic');
                                    }}
                                />
                                {activeField === 'generic' && form.generic.length > 0 && (
                                    <div className="pm-dropdown">
                                        {getFilteredGenerics(form.generic).length > 0 ? (
                                            getFilteredGenerics(form.generic).map(item => (
                                                <div key={item.id} className="pm-option" onMouseDown={(e) => { e.preventDefault(); handleSelectGeneric(item); }}>
                                                    <HighlightMatch text={item.name} query={form.generic} />
                                                </div>
                                            ))
                                        ) : (
                                            <div className="pm-option text-muted fst-italic fw-medium">No generic matches found</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="mb-4 position-relative">
                                <label className="form-label text-muted text-uppercase fw-bold" style={{fontSize: '0.75rem', letterSpacing: '0.5px'}}>Step 2: Brand Name</label>
                                <input 
                                    id="medInput"
                                    type="text" 
                                    className="form-control pm-input-custom" 
                                    style={{ background: form.genericId ? '#F5FDFF' : '#f1f5f9', color: 'var(--luna-navy)', opacity: form.genericId ? 1 : 0.6 }}
                                    placeholder={form.genericId ? "Type brand name..." : "Select generic first"}
                                    value={form.medicineName}
                                    disabled={!form.genericId}
                                    onFocus={() => setActiveField('medicineName')}
                                    onBlur={() => setTimeout(() => setActiveField(null), 200)}
                                    onChange={(e) => {
                                        setForm({ ...form, medicineName: e.target.value, medicineId: null });
                                        setActiveField('medicineName');
                                    }}
                                />
                                {activeField === 'medicineName' && form.medicineName.length > 0 && (
                                    <div className="pm-dropdown">
                                        {getFilteredMedicines(form.medicineName, form.genericId).length > 0 ? (
                                            getFilteredMedicines(form.medicineName, form.genericId).map(item => (
                                                <div key={item.id} className="pm-option" onMouseDown={(e) => { e.preventDefault(); handleSelectMedicine(item); }}>
                                                    <HighlightMatch text={item.name} query={form.medicineName} />
                                                </div>
                                            ))
                                        ) : (
                                            <div className="pm-option text-muted fst-italic fw-medium">No brand matches found</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="mb-5 position-relative">
                                <label className="form-label text-muted text-uppercase fw-bold" style={{fontSize: '0.75rem', letterSpacing: '0.5px'}}>Step 3: Quantity / Amount</label>
                                <input 
                                    id="amountInput"
                                    type="number" 
                                    className="form-control pm-input-custom" 
                                    style={{ background: form.medicineId ? '#F5FDFF' : '#f1f5f9', fontSize: '1.2rem', color: 'var(--luna-navy)', opacity: form.medicineId ? 1 : 0.6 }}
                                    placeholder="0"
                                    min="0"
                                    value={form.amount}
                                    disabled={!form.medicineId}
                                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                />
                            </div>

                            <button 
                                className="btn btn-modern w-100 py-3 d-flex align-items-center justify-content-center gap-2 fw-bold" 
                                disabled={loading || !form.medicineId || !form.amount}
                                onClick={handleAddSubmit}
                                style={{fontSize: '1rem', borderRadius: '14px', fontFamily: "'Google Sans', sans-serif"}}
                            >
                                {loading ? 'Saving...' : <><FaSave /> Add to Inventory</>}
                            </button>
                        </div>
                    </Col>
                </Row>
            )}

            {/* --- VIEW: INVENTORY LIST --- */}
            {view === 'list' && (
                <>
                    <Row className="justify-content-center mb-4">
                        <Col xl={10} lg={11}>
                            <div className="d-flex gap-3 flex-column flex-md-row">
                                <div className="voice-assist-container d-flex align-items-center flex-grow-1" style={{ padding: '6px 10px', height: '52px' }}>
                                    <input 
                                        type="text" 
                                        className="flex-grow-1 px-3 fw-medium" 
                                        placeholder="Search inventory by Brand, Generic, or ID..." 
                                        value={searchQuery}
                                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '1rem', color: 'var(--luna-navy)' }}
                                    />
                                    <button className="voice-search-action-btn" style={{ width: '40px', height: '40px' }} disabled><FaSearch size={16} /></button>
                                </div>
                                <button 
                                    onClick={() => setView('add')}
                                    className="btn-action-book d-flex align-items-center justify-content-center gap-2 text-white border-0 shadow-sm fw-bold" 
                                    style={{ height: '52px', padding: '0 25px', borderRadius: '50px', fontSize: '0.95rem', background: 'linear-gradient(135deg, var(--luna-mid) 0%, var(--luna-dark) 100%)', whiteSpace: 'nowrap' }}
                                >
                                    <FaPlus size={14} /> Add Stock
                                </button>
                            </div>
                        </Col>
                    </Row>

                    {loading ? (
                        <div className="loading-container mt-5">
                            <div className="custom-spinner" style={{borderColor: 'var(--luna-light)', borderTopColor: 'var(--luna-navy)'}}></div>
                            <div className="fw-bold text-muted">Loading Inventory...</div>
                        </div>
                    ) : (
                        <Row className="justify-content-center">
                            <Col xl={10} lg={11}>
                                <div className="plain-table-container">
                                    <table className="plain-table w-100">
                                        <thead>
                                            <tr>
                                                <th style={{width: '10%', textAlign: 'center'}}>Med ID</th>
                                                <th style={{width: '25%', textAlign: 'center'}}>Generic Name</th>
                                                <th style={{width: '35%', textAlign: 'left', paddingLeft: '15px'}}>Brand Name</th>
                                                <th style={{width: '15%', textAlign: 'center'}}>In Stock</th>
                                                <th style={{width: '15%', textAlign: 'center'}}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentInventory.length > 0 ? (
                                                currentInventory.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td className="text-center align-middle">
                                                            <span className="text-muted fw-bold" style={{fontSize: '0.9rem'}}>#{String(item.medicine).padStart(4, '0')}</span>
                                                        </td>
                                                        <td className="text-center align-middle">
                                                            <span style={{color: 'var(--luna-mid)', fontSize: '0.85rem', fontWeight: 600}}>{item.generic_name || 'N/A'}</span>
                                                        </td>
                                                        <td className="text-start align-middle" style={{paddingLeft: '15px'}}>
                                                            <span className="mb-0 fw-bold" style={{fontSize: '0.95rem', color: 'var(--luna-navy)'}}>{item.medicine_name}</span>
                                                        </td>
                                                        <td className="text-center align-middle">
                                                            <span className="badge-status-modern fw-bold" style={{
                                                                background: item.amount > 10 ? '#E8F5E9' : '#FFEBEE', 
                                                                color: item.amount > 10 ? '#2E7D32' : '#C62828',
                                                                padding: '6px 16px', fontSize: '0.9rem'
                                                            }}>
                                                                {item.amount} Units
                                                            </span>
                                                        </td>
                                                        <td className="text-center align-middle">
                                                            <div className="d-flex align-items-center justify-content-center gap-2">
                                                                <button 
                                                                    className="btn-icon-circle" 
                                                                    style={{background: '#E1F5FE', color: 'var(--luna-mid)', width: '34px', height: '34px'}} 
                                                                    onClick={() => handleUpdateStock(item)}
                                                                    title="Update Stock"
                                                                >
                                                                    <FaPen size={12} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr className="row-transparent">
                                                    <td colSpan="5" className="no-results-view no-results-content">
                                                        <div className="nr-divider" style={{background: 'var(--luna-mid)'}}></div>
                                                        <h3 className="nr-title fw-bold" style={{color: 'var(--luna-navy)'}}>INVENTORY EMPTY</h3>
                                                        <p className="nr-subtitle fw-medium">No medicines match your search criteria.</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {totalPages > 1 && <div className="pagination-wrapper-right mt-3">{renderPagination()}</div>}
                            </Col>
                        </Row>
                    )}
                </>
            )}
        </Container>
    );
};

export default PharmacyMedicine;