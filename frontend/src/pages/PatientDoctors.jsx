import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { coreProfileAPI, authAPI } from '../api/api';
import { 
    FaSearch, FaChevronLeft, FaChevronRight, 
    FaUserMd, FaUniversity, FaStethoscope, FaTimes 
} from 'react-icons/fa';

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
                        ? <strong key={i} style={{fontWeight: 800, color: 'var(--luna-mid)'}}>{part}</strong> 
                        : <span key={i}>{part}</span>
                )}
            </span>
        );
    } catch (e) {
        return <span>{text}</span>;
    }
};

const parseEducation = (eduString) => {
    if (!eduString) return [];
    return eduString.split(',').filter(x => x).map(item => {
        const match = item.match(/(.*)\((.*)\)/);
        if (match) return { institution: match[1].trim(), degree: match[2].trim() };
        return { institution: item.trim(), degree: '' };
    });
};

const PatientDoctors = () => {
    const navigate = useNavigate();
    
    // Data States
    const [doctors, setDoctors] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Search & Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDept, setSelectedDept] = useState(null); 
    const [showSuggestions, setShowSuggestions] = useState(false);
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch active doctors and departments concurrently
                const [docsRes, deptsRes] = await Promise.all([
                    coreProfileAPI.getActiveProfiles('doctor'),
                    authAPI.getDoctorTypes()
                ]);
                
                const fetchedDoctors = docsRes.data.results || docsRes.data || [];
                const fetchedDepts = deptsRes.data || [];
                
                setDoctors(fetchedDoctors);
                setDepartments(fetchedDepts.sort((a, b) => a.name.localeCompare(b.name)));
            } catch (error) {
                console.error("Error fetching data:", error);
                Swal.fire({ icon: 'error', title: 'Error', text: 'Could not load doctors directory.', customClass: { popup: 'swal-modern-popup' } });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // --- DUAL SUGGESTION LOGIC ---
    const getSuggestions = () => {
        if (!searchQuery.trim()) return { deptMatches: [], docMatches: [] };
        const q = searchQuery.toLowerCase().trim();
        
        const deptMatches = departments.filter(d => d.name.toLowerCase().includes(q)).slice(0, 3);
        const docMatches = doctors.filter(d => {
            const name = d.person?.name || d.name || '';
            return name.toLowerCase().includes(q);
        }).slice(0, 5);

        return { deptMatches, docMatches };
    };

    const { deptMatches, docMatches } = getSuggestions();

    const handleSelectDepartment = (dept) => {
        setSelectedDept(dept);
        setSearchQuery('');
        setShowSuggestions(false);
        setCurrentPage(1);
    };

    const handleSelectDoctor = (docName) => {
        setSearchQuery(docName);
        setSelectedDept(null);
        setShowSuggestions(false);
        setCurrentPage(1);
    };

    const clearDepartmentFilter = () => {
        setSelectedDept(null);
        setCurrentPage(1);
    };

    // --- FILTERING TABLE DATA ---
    const getVisibleDoctors = () => {
        let filtered = doctors;
        
        if (selectedDept) {
            filtered = filtered.filter(d => d.department === selectedDept.id);
        }
        
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(d => {
                const name = d.person?.name || d.name || '';
                return name.toLowerCase().includes(q);
            });
        }
        
        return filtered;
    };

    const visibleDoctors = getVisibleDoctors();
    const totalPages = Math.ceil(visibleDoctors.length / itemsPerPage);
    const currentDoctors = visibleDoctors.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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

    const getDepartmentName = (id) => {
        const found = departments.find(d => d.id === id);
        return found ? found.name : 'Unknown Department';
    };

    return (
        <Container fluid className="p-4 fade-in">
            <div className="text-center mb-4">
                <h2 className="page-title-serif mb-2" style={{ fontWeight: '700', fontStyle: 'italic', fontSize: '2.8rem' }}>
                    Doctors Directory
                </h2>
                <p className="mb-4" style={{ fontFamily: "'Google Sans', sans-serif", fontSize: '0.85rem', color: 'var(--luna-mid)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Browse and connect with registered medical specialists
                </p>
            </div>

            {/* --- SMART SEARCH BAR --- */}
            <Row className="justify-content-center mb-4">
                <Col xl={8} lg={10}>
                    <div className="voice-assist-container d-flex align-items-center position-relative" style={{ padding: '6px 10px', height: '52px' }}>
                        
                        {/* Selected Department Badge */}
                        {selectedDept && (
                            <div className="d-flex align-items-center me-2 px-3 py-1 rounded-pill" style={{background: '#E1F5FE', border: '1px solid #B3E5FC'}}>
                                <FaStethoscope size={12} className="me-2 text-luna-mid" />
                                <span className="fw-bold text-luna-navy" style={{fontSize: '0.85rem', fontFamily: 'Google Sans'}}>{selectedDept.name}</span>
                                <FaTimes size={12} className="ms-2 text-muted cursor-pointer" style={{cursor: 'pointer'}} onClick={clearDepartmentFilter} title="Clear Filter" />
                            </div>
                        )}

                        <input 
                            type="text" 
                            className="flex-grow-1 px-3" 
                            placeholder={selectedDept ? "Search doctor within this department..." : "Search by Doctor Name or Department..."} 
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setShowSuggestions(true);
                                setCurrentPage(1);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            style={{ 
                                border: 'none', background: 'transparent', outline: 'none',
                                fontFamily: "'Google Sans', sans-serif", fontWeight: '500',
                                fontSize: '1rem', color: 'var(--luna-navy)', paddingTop: '3px'
                            }}
                        />
                        <button className="voice-search-action-btn" style={{ width: '40px', height: '40px' }} disabled>
                            <FaSearch size={16} />
                        </button>

                        {/* AUTOCOMPLETE DROPDOWN */}
                        {showSuggestions && (deptMatches.length > 0 || docMatches.length > 0) && (
                            <div className="rx-dx-dropdown w-100 position-absolute" style={{zIndex: 1050, top: '100%', left: 0, marginTop: '8px'}}>
                                
                                {/* Department Suggestions */}
                                {deptMatches.length > 0 && (
                                    <div className="px-3 py-2 bg-light border-bottom">
                                        <div style={{fontSize: '0.7rem', fontWeight: 800, color: '#90A4AE', textTransform: 'uppercase', marginBottom: '5px'}}>Departments</div>
                                        {deptMatches.map(dept => (
                                            <div 
                                                key={`dept-${dept.id}`} 
                                                className="rx-dx-option d-flex align-items-center" 
                                                style={{ textTransform: 'none', padding: '6px 8px', borderRadius: '6px' }}
                                                onMouseDown={(e) => { e.preventDefault(); handleSelectDepartment(dept); }}
                                            >
                                                <FaStethoscope className="me-2 text-luna-light" size={12} />
                                                <HighlightMatch text={dept.name} query={searchQuery} />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Doctor Suggestions */}
                                {docMatches.length > 0 && (
                                    <div className="px-3 py-2">
                                        <div style={{fontSize: '0.7rem', fontWeight: 800, color: '#90A4AE', textTransform: 'uppercase', marginBottom: '5px'}}>Doctors</div>
                                        {docMatches.map(doc => {
                                            const docName = doc.person?.name || doc.name || 'Unknown';
                                            const displayName = docName.toLowerCase().startsWith('dr') ? docName : `Dr. ${docName}`;
                                            return (
                                                <div 
                                                    key={`doc-${doc.id}`} 
                                                    className="rx-dx-option d-flex align-items-center" 
                                                    style={{ textTransform: 'none', padding: '6px 8px', borderRadius: '6px' }}
                                                    onMouseDown={(e) => { e.preventDefault(); handleSelectDoctor(docName); }}
                                                >
                                                    <FaUserMd className="me-2 text-luna-mid" size={12} />
                                                    <HighlightMatch text={displayName} query={searchQuery} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </Col>
            </Row>

            {/* --- DATA TABLE --- */}
            {loading ? (
                <div className="loading-container mt-5">
                    <div className="custom-spinner"></div>
                    <div className="font-google-sans" style={{fontWeight: 600}}>Loading Directory...</div>
                </div>
            ) : (
                <>
                    <div className="plain-table-container">
                        <table className="plain-table w-100">
                            <thead>
                                <tr>
                                    {/* Perfectly balanced and centered column headers */}
                                    <th className="text-center align-middle" style={{width: '24%'}}>Doctor</th>
                                    <th className="text-center align-middle" style={{width: '15%'}}>Designation</th>
                                    <th className="text-center align-middle" style={{width: '22%'}}>Education</th>
                                    <th className="text-center align-middle" style={{width: '14%'}}>Location</th>
                                    <th className="text-center align-middle" style={{width: '10%'}}>Fee</th>
                                    <th className="text-center align-middle" style={{width: '15%'}}>Contact</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentDoctors.length > 0 ? (
                                    currentDoctors.map((doc) => {
                                        const docName = doc.person?.name || doc.name || 'Unknown';
                                        const displayName = docName.toLowerCase().startsWith('dr') ? docName : `Dr. ${docName}`;
                                        const email = doc.person?.email || doc.email || 'N/A';
                                        const eduList = parseEducation(doc.education);

                                        return (
                                            <tr key={doc.id}>
                                                
                                                {/* DOCTOR NAME & DEPT */}
                                                <td className="text-center align-middle">
                                                    <div className="d-flex align-items-center justify-content-center gap-3">
                                                        <div className="avatar-box bg-light text-luna-mid rounded-circle flex-shrink-0" style={{width:'42px', height:'42px', margin: 0}}>
                                                            <FaUserMd size={18}/>
                                                        </div>
                                                        <div className="d-flex flex-column text-start">
                                                            <span 
                                                                className="doc-name mb-0" 
                                                                style={{fontSize: '0.95rem', color: 'var(--luna-navy)', cursor: 'pointer', lineHeight: '1.2'}}
                                                                onClick={() => navigate('/view-profile', { state: { doctorId: doc.id } })}
                                                                onMouseOver={(e) => e.target.style.color = 'var(--luna-light)'}
                                                                onMouseOut={(e) => e.target.style.color = 'var(--luna-navy)'}
                                                                title="View Doctor Profile"
                                                            >
                                                                {displayName}
                                                            </span>
                                                            <span style={{fontSize: '0.8rem', color: '#546E7A', fontFamily: 'Inter', fontWeight: 500, marginTop: '2px'}}>
                                                                {getDepartmentName(doc.department)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                
                                                {/* DESIGNATION */}
                                                <td className="text-center align-middle">
                                                    <span className="text-unified" style={{fontSize: '0.85rem'}}>{doc.designation || 'Specialist'}</span>
                                                </td>
                                                
                                                {/* EDUCATION */}
                                                <td className="text-center align-middle">
                                                    <div className="d-flex flex-column align-items-center justify-content-center gap-1">
                                                        {eduList.length > 0 ? eduList.map((edu, idx) => (
                                                            <div key={idx} className="d-flex align-items-center gap-2" style={{fontSize: '0.8rem', color: '#546E7A', fontFamily: 'Inter'}}>
                                                                <FaUniversity size={12} className="text-luna-light flex-shrink-0" />
                                                                <span className="fw-bold text-dark">{edu.institution}</span>
                                                                {edu.degree && (
                                                                    <>
                                                                        <span className="opacity-50">|</span>
                                                                        <span>{edu.degree}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )) : (
                                                            <span className="text-muted fst-italic" style={{fontSize: '0.8rem'}}>Not specified</span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* LOCATION */}
                                                <td className="text-center align-middle">
                                                    <span className="text-unified" style={{color: '#546E7A', fontSize: '0.85rem'}}>{doc.location || 'Not updated'}</span>
                                                </td>

                                                {/* FEE */}
                                                <td className="text-center align-middle">
                                                    <span className="fee-val" style={{fontSize: '0.9rem'}}>
                                                        <span className="currency-symbol-normal" style={{color: '#2E7D32'}}>৳</span>
                                                        {doc.appointment_fee ? Math.round(parseFloat(doc.appointment_fee)) : 0}
                                                    </span>
                                                </td>

                                                {/* CONTACT (EMAIL) */}
                                                <td className="text-center align-middle">
                                                    <span className="text-muted" style={{fontSize: '0.85rem', fontFamily: 'Inter', fontWeight: 500}}>{email}</span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr className="row-transparent">
                                        <td colSpan="6" className="no-results-view no-results-content">
                                            <div className="nr-divider"></div>
                                            <h3 className="nr-title">NO DOCTORS FOUND</h3>
                                            <p className="nr-subtitle">Try adjusting your search or clearing the department filter.</p>
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

export default PatientDoctors;