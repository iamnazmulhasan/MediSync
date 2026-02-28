import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { pharmacyAPI, doctorAPI } from '../api/api';
import { FaSearch, FaChevronLeft, FaChevronRight, FaCheckCircle, FaClinicMedical, FaPlus } from 'react-icons/fa';

const Toast = Swal.mixin({
    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true,
    didOpen: (toast) => { toast.addEventListener('mouseenter', Swal.stopTimer); toast.addEventListener('mouseleave', Swal.resumeTimer); }
});

const OfficerPharmacies = () => {
    const navigate = useNavigate();
    const [pharmacies, setPharmacies] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    useEffect(() => {
        fetchAllPharmacies();
    }, []);

    const fetchAllPharmacies = async () => {
        setLoading(true);
        try {
            const res = await pharmacyAPI.getAll();
            setPharmacies(res.data || []);
        } catch (error) {
            console.error("Error fetching pharmacies:", error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Could not load pharmacies list.', customClass: { popup: 'swal-modern-popup' } });
        } finally {
            setLoading(false);
        }
    };

    // --- FRONTEND FILTERING ---
    const getVisiblePharmacies = () => {
        if (!searchQuery.trim()) return pharmacies;
        const lowerQ = searchQuery.toLowerCase();
        return pharmacies.filter(p => 
            p.name?.toLowerCase().includes(lowerQ) || 
            p.email?.toLowerCase().includes(lowerQ) ||
            p.mobile?.includes(lowerQ) ||
            p.owner_name?.toLowerCase().includes(lowerQ) ||
            p.address?.toLowerCase().includes(lowerQ)
        );
    };

    const filteredPharmacies = getVisiblePharmacies();
    const totalPages = Math.ceil(filteredPharmacies.length / itemsPerPage);
    const currentPharmacies = filteredPharmacies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const paginate = (pageNumber) => {
        if (pageNumber >= 1 && pageNumber <= totalPages) setCurrentPage(pageNumber);
    };

    // --- TOGGLE ACTIVE STATUS ---
    const handleToggleActive = async (pharmacyId, currentStatus) => {
        try {
            setPharmacies(prev => prev.map(p => p.id === pharmacyId ? { ...p, active: !currentStatus } : p));
            await pharmacyAPI.updatePharmacy(pharmacyId, { active: !currentStatus });
            Toast.fire({ icon: 'success', title: `Pharmacy ${!currentStatus ? 'Activated' : 'Deactivated'} Successfully` });
        } catch (error) {
            console.error("Error updating status:", error);
            setPharmacies(prev => prev.map(p => p.id === pharmacyId ? { ...p, active: currentStatus } : p));
            Swal.fire({ icon: 'error', title: 'Update Failed', text: 'Could not update active status.', customClass: { popup: 'swal-modern-popup' } });
        }
    };

    // --- CLICK OWNER NAME LOGIC ---
    const handleOwnerClick = async (personId) => {
        if (!personId) return;
        try {
            Swal.fire({ title: 'Loading Profile...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), customClass: { popup: 'swal-modern-popup' } });
            
            const res = await doctorAPI.getProfileIds(personId);
            Swal.close();

            if (res.data.doctor_id) {
                navigate('/view-profile', { state: { doctorId: res.data.doctor_id, personId: personId } });
            } else if (res.data.patient_id) {
                navigate('/view-profile', { state: { patientId: res.data.patient_id, personId: personId } });
            } else {
                Swal.fire({ icon: 'info', title: 'No Detailed Profile', text: 'This owner only has a base user profile.', customClass: { popup: 'swal-modern-popup' } });
            }
        } catch (error) {
            console.error("Error fetching profile IDs", error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Could not load owner profile.', customClass: { popup: 'swal-modern-popup' } });
        }
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
                    Pharmacy Directory
                </h2>
                <p className="mb-4" style={{ fontFamily: "'Google Sans', sans-serif", fontSize: '0.85rem', color: 'var(--luna-mid)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Manage and update registered pharmacies
                </p>
            </div>

            {/* Search Bar & Create Button */}
            <Row className="justify-content-center mb-4">
                <Col xl={9} lg={10}>
                    <div className="d-flex gap-3">
                        <div className="voice-assist-container d-flex align-items-center flex-grow-1" style={{ padding: '6px 10px', height: '52px' }}>
                            <input 
                                type="text" 
                                className="flex-grow-1 px-3" 
                                placeholder="Search by Pharmacy Name, Email, Mobile, Owner or Location..." 
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
                            onClick={() => navigate('/officer/create-business')}
                            className="btn-action-book d-flex align-items-center gap-2" 
                            style={{ height: '52px', padding: '0 25px', borderRadius: '50px', fontSize: '0.95rem', background: 'linear-gradient(135deg, #00796B 0%, #26A69A 100%)' }}
                        >
                            <FaPlus size={14} /> Create Business
                        </button>
                    </div>
                </Col>
            </Row>

            {/* Data Table */}
            {loading ? (
                <div className="loading-container mt-5">
                    <div className="custom-spinner"></div>
                    <div className="font-google-sans" style={{fontWeight: 600}}>Loading Pharmacies...</div>
                </div>
            ) : (
                <>
                    <div className="plain-table-container">
                        <table className="plain-table">
                            <thead>
                                <tr>
                                    <th style={{width: '22%'}}>Pharmacy Name</th>
                                    <th style={{width: '18%'}}>Email</th>
                                    <th style={{width: '18%'}}>Location</th>
                                    <th style={{width: '12%'}}>Owner</th>
                                    <th style={{width: '10%'}}>Mobile</th>
                                    <th style={{width: '7%'}}>Active</th>
                                    <th style={{width: '13%'}}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentPharmacies.length > 0 ? (
                                    currentPharmacies.map((pharm) => (
                                        <tr key={pharm.id}>
                                            <td className="text-start ps-4">
                                                <div className="doc-info-cell align-items-center">
                                                    <div className="avatar-box bg-light text-success rounded-circle" style={{minWidth:'36px', height:'36px'}}>
                                                        <FaClinicMedical size={14}/>
                                                    </div>
                                                    <span className="doc-name mb-0" style={{fontSize: '0.9rem'}}>{pharm.name || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td><span className="text-unified" style={{fontWeight: 500}}>{pharm.email || 'N/A'}</span></td>
                                            <td><span className="text-unified" style={{color: '#546E7A', fontSize: '0.8rem'}}>{pharm.address || 'N/A'}</span></td>
                                            <td>
                                                <span 
                                                    className="text-unified" 
                                                    style={{color: 'var(--luna-light)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px'}}
                                                    onClick={() => handleOwnerClick(pharm.owner)}
                                                    title="Click to view Owner Profile"
                                                >
                                                    {pharm.owner_name || 'N/A'}
                                                </span>
                                            </td>
                                            <td><span className="text-unified">{pharm.mobile || 'N/A'}</span></td>
                                            
                                            <td>
                                                <div className="d-flex justify-content-center">
                                                    <button 
                                                        className={`status-check-btn ${pharm.active ? 'active-status' : 'inactive-status'}`}
                                                        onClick={() => handleToggleActive(pharm.id, pharm.active)}
                                                    >
                                                        <FaCheckCircle size={22} />
                                                    </button>
                                                </div>
                                            </td>

                                            <td>
                                                <button className="btn-view-profile-capsule" onClick={() => navigate('/officer/view-business', { state: { pharmacyId: pharm.id } })}>
                                                    View Pharmacy
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr className="row-transparent">
                                        <td colSpan="7" className="no-results-view no-results-content">
                                            <div className="nr-divider"></div>
                                            <h3 className="nr-title">NO PHARMACIES FOUND</h3>
                                            <p className="nr-subtitle">No pharmacy matches your search criteria.</p>
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
                </>
            )}
        </Container>
    );
};

export default OfficerPharmacies;