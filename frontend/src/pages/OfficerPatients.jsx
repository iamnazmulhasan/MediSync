import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { coreProfileAPI } from '../api/api';
import { FaSearch, FaChevronLeft, FaChevronRight, FaCheckCircle, FaTimes, FaUser } from 'react-icons/fa';

const Toast = Swal.mixin({
    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true,
    didOpen: (toast) => { toast.addEventListener('mouseenter', Swal.stopTimer); toast.addEventListener('mouseleave', Swal.resumeTimer); }
});

const OfficerPatients = () => {
    const navigate = useNavigate();
    const [patients, setPatients] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    useEffect(() => {
        fetchAllPatients();
    }, []);

    const fetchAllPatients = async () => {
        setLoading(true);
        try {
            const res = await coreProfileAPI.getAllProfiles('patient');
            // The API returns { type: "patient", count: X, results: [...] }
            const fetchedPatients = res.data.results || [];
            setPatients(fetchedPatients);
        } catch (error) {
            console.error("Error fetching patients:", error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Could not load patients list.', customClass: { popup: 'swal-modern-popup' } });
        } finally {
            setLoading(false);
        }
    };

    // --- FRONTEND FILTERING ---
    const getVisiblePatients = () => {
        if (!searchQuery.trim()) return patients;
        const lowerQ = searchQuery.toLowerCase();
        return patients.filter(p => 
            p.person?.name?.toLowerCase().includes(lowerQ) || 
            p.person?.email?.toLowerCase().includes(lowerQ) ||
            p.person?.mobile?.includes(lowerQ)
        );
    };

    const filteredPatients = getVisiblePatients();
    const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
    const currentPatients = filteredPatients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const paginate = (pageNumber) => {
        if (pageNumber >= 1 && pageNumber <= totalPages) setCurrentPage(pageNumber);
    };

    // --- TOGGLE ACTIVE STATUS ---
    const handleToggleActive = async (patientId, currentStatus) => {
        try {
            // Optimistic UI Update for snappiness
            setPatients(prev => prev.map(p => p.id === patientId ? { ...p, active: !currentStatus } : p));
            
            const payload = {
                type: "patient",
                id: patientId,
                data: { active: !currentStatus }
            };
            
            await coreProfileAPI.updateProfile(payload);
            Toast.fire({ icon: 'success', title: `Patient ${!currentStatus ? 'Activated' : 'Deactivated'} Successfully` });
        } catch (error) {
            console.error("Error updating status:", error);
            // Revert on failure
            setPatients(prev => prev.map(p => p.id === patientId ? { ...p, active: currentStatus } : p));
            Swal.fire({ icon: 'error', title: 'Update Failed', text: 'Could not update active status.', customClass: { popup: 'swal-modern-popup' } });
        }
    };

    const handleViewProfile = (patient) => {
        // Pass both profile ID and person ID in state in case the ViewProfile component needs it
        navigate('/view-profile', { state: { patientId: patient.id, personId: patient.person?.id } });
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;
        const buttons = [];
        let startPage = Math.max(1, currentPage - 1);
        let endPage = Math.min(totalPages, startPage + 3);
        if (endPage - startPage < 3) startPage = Math.max(1, endPage - 3);

        buttons.push(
            <button key="prev" className="page-btn-modern" onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}>
                <FaChevronLeft size={10} />
            </button>
        );
        for (let i = startPage; i <= endPage; i++) {
            buttons.push(
                <button key={i} className={`page-btn-modern ${currentPage === i ? 'active' : ''}`} onClick={() => paginate(i)}>{i}</button>
            );
        }
        if (endPage < totalPages) buttons.push(<span key="dots" style={{color:'#B0BEC5', fontSize:'0.8rem'}}>...</span>);
        buttons.push(
            <button key="next" className="page-btn-modern" onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages}>
                <FaChevronRight size={10} />
            </button>
        );
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
                    Patient Directory
                </h2>
                <p className="mb-4" style={{ fontFamily: "'Google Sans', sans-serif", fontSize: '0.85rem', color: 'var(--luna-mid)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Manage and update patient profiles
                </p>
            </div>

            {/* Search Bar (Voice Assist Style) */}
            <Row className="justify-content-center mb-4">
                <Col xl={7} lg={9}>
                    <div className="voice-assist-container d-flex align-items-center" style={{ padding: '6px 10px', height: '52px' }}>
                        <input 
                            type="text" 
                            className="flex-grow-1 px-3" 
                            placeholder="Search by Name, Email, or Mobile..." 
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1); // Reset pagination on search
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
                </Col>
            </Row>

            {/* Data Table */}
            {loading ? (
                <div className="loading-container mt-5">
                    <div className="custom-spinner"></div>
                    <div className="font-google-sans" style={{fontWeight: 600}}>Loading Patients...</div>
                </div>
            ) : (
                <>
                    <div className="plain-table-container">
                        <table className="plain-table">
                            <thead>
                                <tr>
                                    <th style={{width: '25%'}}>Name</th>
                                    <th style={{width: '20%'}}>Email</th>
                                    <th style={{width: '15%'}}>Date of Birth</th>
                                    <th style={{width: '15%'}}>Mobile</th>
                                    <th style={{width: '10%'}}>Active</th>
                                    <th style={{width: '15%'}}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentPatients.length > 0 ? (
                                    currentPatients.map((patient) => (
                                        <tr key={patient.id}>
                                            <td className="text-start ps-4">
                                                <div className="doc-info-cell align-items-center">
                                                    <div className="avatar-box bg-light text-luna-mid rounded-circle" style={{minWidth:'36px', height:'36px'}}>
                                                        <FaUser size={14}/>
                                                    </div>
                                                    <span className="doc-name mb-0" style={{fontSize: '0.9rem'}}>{patient.person?.name || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td><span className="text-unified" style={{fontWeight: 500}}>{patient.person?.email || 'N/A'}</span></td>
                                            <td><span className="text-unified" style={{color: '#546E7A'}}>{patient.person?.dob || 'N/A'}</span></td>
                                            <td><span className="text-unified">{patient.person?.mobile || 'N/A'}</span></td>
                                            
                                            {/* Active Checkmark Toggle */}
                                            <td>
                                                <div className="d-flex justify-content-center">
                                                    <button 
                                                        className={`status-check-btn ${patient.active ? 'active-status' : 'inactive-status'}`}
                                                        onClick={() => handleToggleActive(patient.id, patient.active)}
                                                        title={patient.active ? "Click to Deactivate" : "Click to Activate"}
                                                    >
                                                        {patient.active ? <FaCheckCircle size={22} /> : <FaCheckCircle size={22} />}
                                                    </button>
                                                </div>
                                            </td>

                                            <td>
                                                <button className="btn-view-profile-capsule" onClick={() => handleViewProfile(patient)}>
                                                    View Profile
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr className="row-transparent">
                                        <td colSpan="6" className="no-results-view no-results-content">
                                            <div className="nr-divider"></div>
                                            <h3 className="nr-title">NO PATIENTS FOUND</h3>
                                            <p className="nr-subtitle">No patient matches your search criteria.</p>
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

export default OfficerPatients;