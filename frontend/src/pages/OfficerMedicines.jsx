import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { coreAPI } from '../api/api';
import { FaSearch, FaChevronLeft, FaChevronRight, FaPlus, FaTrash, FaPills } from 'react-icons/fa';

const Toast = Swal.mixin({
    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true,
    didOpen: (toast) => { toast.addEventListener('mouseenter', Swal.stopTimer); toast.addEventListener('mouseleave', Swal.resumeTimer); }
});

const OfficerMedicines = () => {
    const navigate = useNavigate();
    const [medicines, setMedicines] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    useEffect(() => {
        fetchAllMedicines();
    }, []);

    const fetchAllMedicines = async () => {
        setLoading(true);
        try {
            const res = await coreAPI.getMedicines();
            setMedicines(res.data || []);
        } catch (error) {
            console.error("Error fetching medicines:", error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Could not load medicines.', customClass: { popup: 'swal-modern-popup' } });
        } finally {
            setLoading(false);
        }
    };

    // --- FRONTEND FILTERING ---
    const getVisibleMedicines = () => {
        if (!searchQuery.trim()) return medicines;
        const lowerQ = searchQuery.toLowerCase();
        return medicines.filter(m => 
            m.name?.toLowerCase().includes(lowerQ) || 
            m.generic_name?.toLowerCase().includes(lowerQ) ||
            m.id?.toString().includes(lowerQ)
        );
    };

    const filteredMedicines = getVisibleMedicines();
    const totalPages = Math.ceil(filteredMedicines.length / itemsPerPage);
    const currentMedicines = filteredMedicines.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const paginate = (pageNumber) => {
        if (pageNumber >= 1 && pageNumber <= totalPages) setCurrentPage(pageNumber);
    };

    // --- DELETE MEDICINE ---
    const handleDeleteMedicine = (id) => {
        Swal.fire({
            title: 'Are you sure?',
            text: "This medicine will be permanently deleted!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel',
            customClass: {
                popup: 'swal-modern-popup',
                confirmButton: 'btn-modern-confirm',
                cancelButton: 'btn-modern-cancel'
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await coreAPI.deleteMedicine(id);
                    setMedicines(prev => prev.filter(m => m.id !== id));
                    Toast.fire({ icon: 'success', title: 'Medicine deleted successfully' });
                } catch (error) {
                    console.error("Delete failed", error);
                    Swal.fire({ icon: 'error', title: 'Delete Failed', text: 'Could not delete this medicine.', customClass: { popup: 'swal-modern-popup' } });
                }
            }
        });
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

    return (
        <Container fluid className="p-4 fade-in">
            <button 
                onClick={() => navigate('/')} 
                className="btn btn-light mb-4 d-flex align-items-center gap-2 shadow-sm rounded-pill px-3"
                style={{fontFamily: "'Google Sans', sans-serif", fontWeight: '600', color: '#546E7A', width: 'fit-content'}}
            >
                <FaChevronLeft size={12} /> Back to Dashboard
            </button>

            <div className="text-center mb-4">
                <h2 className="page-title-serif mb-2" style={{ fontWeight: '700', fontStyle: 'italic', fontSize: '2.8rem' }}>
                    Medicine Directory
                </h2>
                <p className="mb-4" style={{ fontFamily: "'Google Sans', sans-serif", fontSize: '0.85rem', color: 'var(--luna-mid)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Manage and update registered medicines
                </p>
            </div>

            <Row className="justify-content-center mb-4">
                <Col xl={10} lg={11}>
                    <div className="d-flex gap-3">
                        <div className="voice-assist-container d-flex align-items-center flex-grow-1" style={{ padding: '6px 10px', height: '52px' }}>
                            <input 
                                type="text" 
                                className="flex-grow-1 px-3" 
                                placeholder="Search by Name, Generic, or ID..." 
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                                style={{ 
                                    border: 'none', background: 'transparent', outline: 'none',
                                    fontFamily: "'Google Sans', sans-serif", fontWeight: '500',
                                    fontSize: '1rem', color: 'var(--luna-navy)', paddingTop: '3px'
                                }}
                            />
                            <button className="voice-search-action-btn" style={{ width: '40px', height: '40px' }} disabled>
                                <FaSearch size={16} />
                            </button>
                        </div>
                        
                        <button 
                            onClick={() => navigate('/officer/create-medicine')}
                            className="btn-action-book d-flex align-items-center gap-2 text-white border-0 shadow-sm" 
                            style={{ 
                                height: '52px', padding: '0 25px', borderRadius: '50px', fontSize: '0.95rem', fontWeight: '700',
                                background: 'linear-gradient(135deg, #26A69A 0%, #0288D1 100%)' 
                            }}
                        >
                            <FaPlus size={14} /> Add Medicine
                        </button>
                    </div>
                </Col>
            </Row>

            {loading ? (
                <div className="loading-container mt-5">
                    <div className="custom-spinner"></div>
                    <div className="font-google-sans" style={{fontWeight: 600}}>Loading Medicines...</div>
                </div>
            ) : (
                <>
                    <Row className="justify-content-center">
                        <Col xl={10} lg={11}>
                            <div className="plain-table-container">
                                <table className="plain-table">
                                    <thead>
                                        <tr>
                                            <th style={{width: '15%', textAlign: 'center'}}>ID</th>
                                            <th style={{width: '25%', textAlign: 'center'}}>Generic Name</th>
                                            <th style={{width: '30%', textAlign: 'center'}}>Name</th>
                                            <th style={{width: '10%', textAlign: 'center'}}>Price</th>
                                            <th style={{width: '20%', textAlign: 'center'}}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentMedicines.length > 0 ? (
                                            currentMedicines.map((med) => (
                                                <tr key={med.id}>
                                                    <td className="text-center align-middle">
                                                        <span className="text-unified text-muted" style={{fontFamily: "'Inter', monospace", fontSize: '0.9rem'}}>
                                                            #{String(med.id).padStart(4, '0')}
                                                        </span>
                                                    </td>
                                                    <td className="text-center align-middle">
                                                        <span className="text-unified" style={{color: '#546E7A', fontSize: '0.85rem'}}>
                                                            {med.generic_name || 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td className="text-center align-middle">
                                                        <span className="doc-name mb-0" style={{fontSize: '0.95rem', color: 'var(--luna-navy)'}}>
                                                            {med.name}
                                                        </span>
                                                    </td>
                                                    <td className="text-center align-middle">
                                                        <span className="fee-val" style={{fontSize: '0.95rem'}}>
                                                            <span className="currency-symbol-normal" style={{color: '#2E7D32'}}>৳</span>
                                                            {med.price ? Math.round(parseFloat(med.price)) : 0}
                                                        </span>
                                                    </td>
                                                    <td className="text-center align-middle">
                                                        <div className="d-flex align-items-center justify-content-center gap-3">
                                                            <button className="btn-view-profile-capsule" onClick={() => navigate('/officer/view-medicine', { state: { medicineId: med.id } })}>
                                                                View Medicine
                                                            </button>
                                                            <button 
                                                                className="btn-icon-circle" 
                                                                style={{background: '#FFEBEE', color: '#C62828', width: '32px', height: '32px'}} 
                                                                onClick={() => handleDeleteMedicine(med.id)}
                                                                title="Delete Medicine"
                                                            >
                                                                <FaTrash size={12} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr className="row-transparent">
                                                <td colSpan="5" className="no-results-view no-results-content">
                                                    <div className="nr-divider"></div>
                                                    <h3 className="nr-title">NO MEDICINES FOUND</h3>
                                                    <p className="nr-subtitle">No medicines match your search criteria.</p>
                                                    <div className="nr-divider"></div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {totalPages > 1 && (
                                <div className="pagination-wrapper-right mt-3">
                                    {renderPagination()}
                                </div>
                            )}
                        </Col>
                    </Row>
                </>
            )}
        </Container>
    );
};

export default OfficerMedicines;