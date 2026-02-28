import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { coreAPI } from '../api/api';
import { FaSearch, FaChevronLeft, FaChevronRight, FaPlus } from 'react-icons/fa';

const Toast = Swal.mixin({
    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true,
    didOpen: (toast) => { toast.addEventListener('mouseenter', Swal.stopTimer); toast.addEventListener('mouseleave', Swal.resumeTimer); }
});

const OfficerMedicineGenerics = () => {
    const navigate = useNavigate();
    const [generics, setGenerics] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    
    // Quick Add State
    const [newGenericName, setNewGenericName] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    useEffect(() => {
        fetchGenerics();
    }, []);

    const fetchGenerics = async () => {
        setLoading(true);
        try {
            const res = await coreAPI.getMedicineGenerics();
            const fetchedData = Array.isArray(res.data) ? res.data : (res.data.results || []);
            // Sort alphabetically for better UX
            fetchedData.sort((a, b) => a.name.localeCompare(b.name));
            setGenerics(fetchedData);
        } catch (error) {
            console.error("Error fetching generics:", error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Could not load medicine generics.', customClass: { popup: 'swal-modern-popup' } });
        } finally {
            setLoading(false);
        }
    };

    // --- QUICK ADD HANDLER ---
    const handleAddGeneric = async (e) => {
        e.preventDefault();
        if (!newGenericName.trim()) return;

        setIsAdding(true);
        try {
            const res = await coreAPI.createMedicineGeneric({ name: newGenericName.trim() });
            const createdGeneric = res.data;
            
            // Optimistically update the list & re-sort
            setGenerics(prev => {
                const newList = [...prev, createdGeneric];
                return newList.sort((a, b) => a.name.localeCompare(b.name));
            });
            
            setNewGenericName(''); // Clear input
            Toast.fire({ icon: 'success', title: 'Generic Added Successfully' });
        } catch (error) {
            console.error("Error adding generic:", error);
            Toast.fire({ icon: 'error', title: 'Failed to add generic' });
        } finally {
            setIsAdding(false);
        }
    };

    // --- FRONTEND FILTERING ---
    const getVisibleGenerics = () => {
        if (!searchQuery.trim()) return generics;
        const lowerQ = searchQuery.toLowerCase();
        return generics.filter(g => 
            g.name?.toLowerCase().includes(lowerQ) || 
            g.id?.toString().includes(lowerQ)
        );
    };

    const filteredGenerics = getVisibleGenerics();
    const totalPages = Math.ceil(filteredGenerics.length / itemsPerPage);
    const currentGenerics = filteredGenerics.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
                    Medicine Generics
                </h2>
                <p className="mb-4" style={{ fontFamily: "'Google Sans', sans-serif", fontSize: '0.85rem', color: 'var(--luna-mid)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Directory of chemical generic names for prescriptions
                </p>
            </div>

            {/* Top Bar: Search & Quick Add */}
            <Row className="justify-content-center mb-4">
                <Col xl={9} lg={10}>
                    <div className="d-flex flex-column flex-md-row gap-3 justify-content-center">
                        
                        {/* SEARCH BAR (Reduced Width) */}
                        <div className="voice-assist-container d-flex align-items-center" style={{ padding: '6px 10px', height: '52px', width: '100%', maxWidth: '350px' }}>
                            <input 
                                type="text" 
                                className="flex-grow-1 px-3" 
                                placeholder="Search by Generic Name or ID..." 
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
                        
                        {/* BEAUTIFUL QUICK ADD RECTANGLE (Matches Search Bar) */}
                        <form onSubmit={handleAddGeneric} className="voice-assist-container d-flex align-items-center flex-grow-1" style={{ padding: '6px 10px', height: '52px' }}>
                            <input 
                                type="text" 
                                className="flex-grow-1 px-3" 
                                placeholder="New Generic Name..." 
                                value={newGenericName}
                                onChange={(e) => setNewGenericName(e.target.value)}
                                style={{ 
                                    border: 'none', background: 'transparent', outline: 'none',
                                    fontFamily: "'Google Sans', sans-serif", fontWeight: '500',
                                    fontSize: '1rem', color: 'var(--luna-navy)', paddingTop: '3px'
                                }}
                            />
                            <button 
                                type="submit"
                                className="btn text-white border-0 d-flex align-items-center justify-content-center shadow-sm"
                                style={{ 
                                    borderRadius: '50px', 
                                    background: 'linear-gradient(135deg, #00796B 0%, #26A69A 100%)', // Fresh Teal/Green Variant
                                    height: '40px', 
                                    padding: '0 20px', 
                                    minWidth: '100px',
                                    fontWeight: '700',
                                    fontFamily: "'Google Sans', sans-serif"
                                }}
                                disabled={isAdding || !newGenericName.trim()}
                            >
                                {isAdding ? <div className="spinner-sm"></div> : <><FaPlus size={12} className="me-2"/> Add</>}
                            </button>
                        </form>

                    </div>
                </Col>
            </Row>

            {/* Data Table */}
            {loading ? (
                <div className="loading-container mt-5">
                    <div className="custom-spinner"></div>
                    <div className="font-google-sans" style={{fontWeight: 600}}>Loading Generics...</div>
                </div>
            ) : (
                <>
                    <Row className="justify-content-center">
                        <Col xl={9} lg={10}>
                            <div className="plain-table-container">
                                <table className="plain-table">
                                    <thead>
                                        <tr>
                                            <th style={{width: '30%', textAlign: 'center'}}>Generic ID</th>
                                            <th style={{width: '70%', textAlign: 'center'}}>Generic Name</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentGenerics.length > 0 ? (
                                            currentGenerics.map((generic) => (
                                                <tr key={generic.id}>
                                                    <td className="text-center align-middle">
                                                        <span className="text-unified text-muted" style={{fontFamily: "'Inter', monospace", fontSize: '0.95rem'}}>
                                                            #{String(generic.id).padStart(4, '0')}
                                                        </span>
                                                    </td>
                                                    <td className="text-center align-middle">
                                                        <span className="doc-name mb-0" style={{fontSize: '1.05rem', color: 'var(--luna-navy)'}}>
                                                            {generic.name}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr className="row-transparent">
                                                <td colSpan="2" className="no-results-view no-results-content">
                                                    <div className="nr-divider"></div>
                                                    <h3 className="nr-title">NO GENERICS FOUND</h3>
                                                    <p className="nr-subtitle">We couldn't find any medicine generic matching your search.</p>
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

export default OfficerMedicineGenerics;