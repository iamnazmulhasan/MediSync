import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import Swal from 'sweetalert2';
import { coreAPI, laboratoryAPI } from '../api/api';
import { 
    FaSearch, FaChevronLeft, FaChevronRight, 
    FaFlask, FaHospital, FaTimes 
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

const PatientLabAvailability = () => {
    // Data States
    const [allTests, setAllTests] = useState([]);
    const [allLabs, setAllLabs] = useState([]);
    const [loadingInitial, setLoadingInitial] = useState(true);
    
    // Search & Result States
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedTest, setSelectedTest] = useState(null);
    const [availableLabs, setAvailableLabs] = useState([]);
    const [searchingLabs, setSearchingLabs] = useState(false);
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    // 1. Fetch initial background data (All Tests + All Labs for mapping)
    useEffect(() => {
        const fetchInitialData = async () => {
            setLoadingInitial(true);
            try {
                const [testsRes, labsRes] = await Promise.all([
                    coreAPI.getTests(),
                    laboratoryAPI.getAll()
                ]);
                
                const testsData = Array.isArray(testsRes.data) ? testsRes.data : (testsRes.data.results || []);
                const labsData = Array.isArray(labsRes.data) ? labsRes.data : (labsRes.data.results || []);
                
                setAllTests(testsData.sort((a, b) => a.name.localeCompare(b.name)));
                setAllLabs(labsData);
            } catch (error) {
                console.error("Error fetching initial data:", error);
                Swal.fire({ icon: 'error', title: 'Error', text: 'Could not load lab tests.', customClass: { popup: 'swal-modern-popup' } });
            } finally {
                setLoadingInitial(false);
            }
        };

        fetchInitialData();
    }, []);

    // --- SUGGESTION LOGIC ---
    const getSuggestions = () => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase().trim();
        return allTests.filter(t => t.name.toLowerCase().includes(q)).slice(0, 8);
    };

    const suggestions = getSuggestions();

    const handleSelectTest = async (test) => {
        setSelectedTest(test);
        setSearchQuery(test.name);
        setShowSuggestions(false);
        setCurrentPage(1);
        
        // Fetch laboratories offering this test
        setSearchingLabs(true);
        try {
            const res = await laboratoryAPI.getLabsForTest(test.id);
            const rawLabs = Array.isArray(res.data) ? res.data : (res.data.results || []);
            
            // Map the raw data with our allLabs array to attach the extra info
            const mappedLabs = rawLabs.map(labItem => {
                const matchingLabProfile = allLabs.find(l => l.id === labItem.lab_id);
                return {
                    ...labItem,
                    email: matchingLabProfile ? matchingLabProfile.email : 'N/A',
                    mobile: matchingLabProfile ? matchingLabProfile.mobile : 'N/A',
                    owner_name: matchingLabProfile ? matchingLabProfile.owner_name : 'N/A'
                };
            });

            setAvailableLabs(mappedLabs);
        } catch (error) {
            console.error("Error fetching available labs:", error);
            setAvailableLabs([]);
        } finally {
            setSearchingLabs(false);
        }
    };

    const clearSelection = () => {
        setSelectedTest(null);
        setSearchQuery('');
        setAvailableLabs([]);
        setCurrentPage(1);
    };

    // --- PAGINATION ---
    const totalPages = Math.ceil(availableLabs.length / itemsPerPage);
    const currentLabs = availableLabs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
            <div className="text-center mb-4">
                <h2 className="page-title-serif mb-2" style={{ fontWeight: '700', fontStyle: 'italic', fontSize: '2.8rem' }}>
                    Lab Test Availability
                </h2>
                <p className="mb-4" style={{ fontFamily: "'Google Sans', sans-serif", fontSize: '0.85rem', color: 'var(--luna-mid)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Search for tests and find offering laboratories
                </p>
            </div>

            {/* --- SMART SEARCH BAR --- */}
            {/* Added relative positioning and high zIndex to ensure dropdown perfectly overlays the empty state placeholder */}
            <Row className="justify-content-center mb-4" style={{ position: 'relative', zIndex: 1050 }}>
                <Col xl={8} lg={10}>
                    <div className="voice-assist-container d-flex align-items-center position-relative" style={{ padding: '6px 10px', height: '52px' }}>
                        
                        {/* Selected Test Badge */}
                        {selectedTest && (
                            <div className="d-flex align-items-center me-2 px-3 py-1 rounded-pill" style={{background: '#E1F5FE', border: '1px solid #B3E5FC'}}>
                                <FaFlask size={12} className="me-2 text-luna-mid" />
                                <span className="fw-bold text-luna-navy" style={{fontSize: '0.85rem', fontFamily: 'Google Sans'}}>{selectedTest.name}</span>
                                <FaTimes size={12} className="ms-2 text-muted cursor-pointer" style={{cursor: 'pointer'}} onClick={clearSelection} title="Clear Filter" />
                            </div>
                        )}

                        <input 
                            type="text" 
                            className="flex-grow-1 px-3" 
                            placeholder={selectedTest ? "Search another test..." : "Search by Lab Test Name..."} 
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setShowSuggestions(true);
                                if (selectedTest) setSelectedTest(null); 
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            style={{ 
                                border: 'none', background: 'transparent', outline: 'none',
                                fontFamily: "'Google Sans', sans-serif", fontWeight: '500',
                                fontSize: '1rem', color: 'var(--luna-navy)', paddingTop: '3px'
                            }}
                            disabled={loadingInitial}
                        />
                        <button className="voice-search-action-btn" style={{ width: '40px', height: '40px' }} disabled>
                            <FaSearch size={16} />
                        </button>

                        {/* AUTOCOMPLETE DROPDOWN */}
                        {showSuggestions && suggestions.length > 0 && !selectedTest && (
                            <div className="rx-dx-dropdown w-100 position-absolute" style={{zIndex: 1060, top: '100%', left: 0, marginTop: '8px'}}>
                                <div className="px-3 py-2">
                                    <div style={{fontSize: '0.7rem', fontWeight: 800, color: '#90A4AE', textTransform: 'uppercase', marginBottom: '5px'}}>Medical Tests</div>
                                    {suggestions.map(test => (
                                        <div 
                                            key={`test-${test.id}`} 
                                            className="rx-dx-option d-flex align-items-center" 
                                            style={{ textTransform: 'none', padding: '6px 8px', borderRadius: '6px' }}
                                            onMouseDown={(e) => { e.preventDefault(); handleSelectTest(test); }}
                                        >
                                            <FaFlask className="me-2 text-luna-mid" size={12} />
                                            <HighlightMatch text={test.name} query={searchQuery} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </Col>
            </Row>

            {/* --- INSTRUCTIONS / WARNINGS --- */}
            {selectedTest && selectedTest.warnings && !searchingLabs && (
                <Row className="justify-content-center mb-4 fade-in">
                    <Col xl={10} lg={11}>
                        <div className="p-3 rounded-3 text-center" style={{background: '#FFF8E1', border: '1px dashed #FFE082', color: '#E65100', fontFamily: "'Inter', sans-serif", fontSize: '0.9rem'}}>
                            <strong style={{fontFamily: "'Google Sans', sans-serif"}}>Test Instructions:</strong> {selectedTest.warnings}
                        </div>
                    </Col>
                </Row>
            )}

            {/* --- DATA TABLE --- */}
            {loadingInitial || searchingLabs ? (
                <div className="loading-container mt-5">
                    <div className="custom-spinner"></div>
                    <div className="font-google-sans" style={{fontWeight: 600}}>
                        {loadingInitial ? "Loading Directory..." : "Finding Laboratories..."}
                    </div>
                </div>
            ) : (
                <>
                    {selectedTest ? (
                        <>
                            <div className="plain-table-container">
                                <table className="plain-table w-100">
                                    <thead>
                                        <tr>
                                            {/* Balanced, evenly spaced, centered columns */}
                                            <th className="text-center align-middle" style={{width: '9%'}}>Lab ID</th>
                                            <th className="text-center align-middle" style={{width: '9%'}}>Test ID</th>
                                            <th className="text-center align-middle" style={{width: '21%'}}>Laboratory Name</th>
                                            <th className="text-center align-middle" style={{width: '20%'}}>Email</th>
                                            <th className="text-center align-middle" style={{width: '14%'}}>Mobile</th>
                                            <th className="text-center align-middle" style={{width: '17%'}}>Owner</th>
                                            <th className="text-center align-middle" style={{width: '10%'}}>Test Price</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentLabs.length > 0 ? (
                                            currentLabs.map((lab, idx) => (
                                                <tr key={idx}>
                                                    {/* LAB ID */}
                                                    <td className="text-center align-middle">
                                                        <span className="text-muted" style={{fontFamily: "'Inter', monospace", fontSize: '0.85rem'}}>
                                                            #{String(lab.lab_id).padStart(4, '0')}
                                                        </span>
                                                    </td>

                                                    {/* TEST ID */}
                                                    <td className="text-center align-middle">
                                                        <span className="text-muted" style={{fontFamily: "'Inter', monospace", fontSize: '0.85rem'}}>
                                                            #{String(lab.test_id).padStart(4, '0')}
                                                        </span>
                                                    </td>

                                                    {/* LABORATORY NAME */}
                                                    <td className="text-center align-middle">
                                                        <div className="d-flex align-items-center justify-content-center gap-2">
                                                            <div className="avatar-box bg-light text-luna-mid rounded-circle flex-shrink-0" style={{width:'32px', height:'32px', margin: 0}}>
                                                                <FaHospital size={14}/>
                                                            </div>
                                                            <span className="doc-name mb-0 text-start" style={{fontSize: '0.9rem', color: 'var(--luna-navy)', lineHeight: '1.2'}}>
                                                                {lab.lab_name}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    
                                                    {/* EMAIL */}
                                                    <td className="text-center align-middle">
                                                        <span className="text-unified" style={{fontSize: '0.85rem', fontWeight: 500}}>
                                                            {lab.email}
                                                        </span>
                                                    </td>

                                                    {/* MOBILE */}
                                                    <td className="text-center align-middle">
                                                        <span className="text-unified" style={{fontSize: '0.85rem'}}>
                                                            {lab.mobile}
                                                        </span>
                                                    </td>

                                                    {/* OWNER NAME */}
                                                    <td className="text-center align-middle">
                                                        <span className="text-unified" style={{fontSize: '0.85rem', color: '#546E7A'}}>
                                                            {lab.owner_name}
                                                        </span>
                                                    </td>
                                                    
                                                    {/* PRICE */}
                                                    <td className="text-center align-middle">
                                                        <span className="fee-val" style={{fontSize: '0.95rem'}}>
                                                            <span className="currency-symbol-normal" style={{color: '#2E7D32'}}>৳</span>
                                                            {lab.price ? Math.round(parseFloat(lab.price)) : 0}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr className="row-transparent">
                                                <td colSpan="7" className="no-results-view no-results-content">
                                                    <div className="nr-divider"></div>
                                                    <h3 className="nr-title">NO LABORATORIES FOUND</h3>
                                                    <p className="nr-subtitle">We couldn't find any laboratories currently offering this test.</p>
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
                    ) : (
                        // Placeholder View (Sits safely below the search bar dropdown due to z-index fix)
                        <Row className="justify-content-center mt-5">
                            <Col xs={12} className="text-center text-muted">
                                <FaFlask size={40} style={{opacity: 0.2}} className="mb-3" />
                                <h5 style={{fontFamily: "'Google Sans', sans-serif"}}>Search for a test</h5>
                                <p style={{fontSize: '0.85rem'}}>Select a test from the search bar above to see which laboratories offer it.</p>
                            </Col>
                        </Row>
                    )}
                </>
            )}
        </Container>
    );
};

export default PatientLabAvailability;