import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { coreProfileAPI, laboratoryAPI } from '../api/api';
import { 
    FaSearch, FaChevronLeft, FaUser, FaEnvelope, FaPhone, 
    FaFileSignature, FaVial, FaPen, FaCheckCircle
} from 'react-icons/fa';

// --- SAFE UTILITIES ---
const escapeRegex = (string) => {
    if (typeof string !== 'string') return '';
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const hasBengali = (text) => /[\u0980-\u09FF]/.test(text || '');

const HighlightMatch = ({ text, query }) => {
    if (!query || typeof text !== 'string') return <span>{text}</span>; 
    try {
        const safeQuery = escapeRegex(query.trim());
        const regex = new RegExp(`(${safeQuery})`, 'gi');
        const parts = text.split(regex);
        return (
            <span>
                {parts.map((part, i) => 
                    (part.toLowerCase() === safeQuery.toLowerCase())
                        ? <strong key={i} className="rx-highlight-match" style={{fontWeight: 800, color: '#0277BD'}}>{part}</strong> 
                        : <span key={i}>{part}</span>
                )}
            </span>
        );
    } catch (e) {
        return <span>{text}</span>;
    }
};

const LabTestReports = () => {
    const navigate = useNavigate();
    
    // Auth Data
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const labId = parseInt(storedUser?.id || storedUser?.lab_id || storedUser?.laboratory_id, 10);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    
    // Data State
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [testReports, setTestReports] = useState([]);
    const [loadingReports, setLoadingReports] = useState(false);

    // --- 1. DEBOUNCED PATIENT SEARCH ---
    useEffect(() => {
        const fetchPatients = async () => {
            if (!searchQuery || searchQuery.trim().length < 3) {
                setSuggestions([]);
                return;
            }
            setIsSearching(true);
            try {
                const res = await coreProfileAPI.searchProfiles('patient', searchQuery);
                if (res?.data?.results && Array.isArray(res.data.results)) {
                    setSuggestions(res.data.results);
                } else {
                    setSuggestions([]);
                }
            } catch (err) {
                console.error("Search failed:", err);
                setSuggestions([]);
            } finally {
                setIsSearching(false);
            }
        };

        const timer = setTimeout(fetchPatients, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // --- 2. SELECT PATIENT & FETCH REPORTS ---
    const handleSelectPatient = async (patientData) => {
        setSearchQuery('');
        setSuggestions([]);
        setSelectedPatient(patientData);
        fetchReports(patientData.id);
    };

    const fetchReports = async (patientId) => {
        setLoadingReports(true);
        try {
            const res = await laboratoryAPI.getPatientTestReports(labId, patientId);
            // API returns an object with a "test_reports" array
            if (res.data && Array.isArray(res.data.test_reports)) {
                setTestReports(res.data.test_reports);
            } else {
                setTestReports([]);
            }
        } catch (err) {
            console.error("Error fetching test reports:", err);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Could not load test reports.', customClass: { popup: 'swal-modern-popup' } });
            setTestReports([]);
        } finally {
            setLoadingReports(false);
        }
    };

    // --- 3. UPDATE RESULT LOGIC ---
    const handleUpdateResult = (report) => {
        Swal.fire({
            title: `<span style="font-family: 'Google Sans', sans-serif; font-weight: 700; color: var(--luna-navy); font-size: 1.3rem;">Update Test Result</span>`,
            html: `
                <div class="text-start mt-3">
                    <p style="font-family: 'Google Sans', sans-serif; font-size: 0.95rem; color: var(--luna-mid); font-weight: 600;" class="mb-3">
                        <i class="fas fa-vial me-2 opacity-75"></i> ${report.test_name}
                    </p>
                    <label class="form-label text-uppercase" style="font-family: 'Google Sans', sans-serif; font-size: 0.75rem; font-weight: 700; color: #90A4AE; letter-spacing: 0.5px;">Test Result</label>
                    <textarea id="swal-result-input" class="form-control mb-2 p-3" rows="4" placeholder="Enter findings or results here..." style="font-family: 'Inter', sans-serif; font-weight: 500; border: 1px solid #B2EBF2; resize: none; border-radius: 12px; color: var(--luna-navy);">${report.result || ''}</textarea>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Save Result',
            buttonsStyling: false,
            customClass: {
                popup: 'rounded-4 border-0 shadow-lg',
                confirmButton: 'btn btn-modern px-4 py-2 mx-2',
                cancelButton: 'btn btn-light px-4 py-2 mx-2 fw-semibold text-secondary',
                actions: 'd-flex justify-content-center mt-4'
            },
            preConfirm: () => {
                const resultText = document.getElementById('swal-result-input').value;
                if (!resultText.trim()) {
                    Swal.showValidationMessage('Please enter a result.');
                }
                return resultText.trim();
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // Send PATCH request with the new result
                    await laboratoryAPI.updateTestReport(report.id, {
                        result: result.value
                    });
                    
                    Swal.fire({ 
                        icon: 'success', 
                        title: 'Result Updated', 
                        toast: true, 
                        position: 'top-end', 
                        timer: 2000, 
                        showConfirmButton: false 
                    });
                    
                    // Refresh the table silently
                    fetchReports(selectedPatient.id);
                } catch (err) {
                    console.error("Update Error:", err.response?.data || err);
                    Swal.fire('Error', `Failed to update: ${JSON.stringify(err.response?.data || 'Unknown Error')}`, 'error');
                }
            }
        });
    };

    return (
        <Container fluid className="p-4 fade-in" style={{fontFamily: "'Google Sans', sans-serif"}}>
            
            {/* SAFELY INJECTED CSS */}
            <style dangerouslySetInnerHTML={{__html: `
                .search-dropdown {
                    position: absolute; top: 100%; left: 0; width: 100%; max-height: 250px; overflow-y: auto;
                    background: white; border: 1px solid #E1F5FE; border-radius: 12px; box-shadow: 0 8px 25px rgba(1, 28, 64, 0.06);
                    z-index: 1060; margin-top: 6px; padding: 5px 0;
                }
                .search-dropdown::-webkit-scrollbar { width: 5px; }
                .search-dropdown::-webkit-scrollbar-thumb { background: #B2EBF2; border-radius: 10px; }
                .search-option {
                    padding: 10px 15px; font-family: 'Google Sans', sans-serif !important; font-size: 0.85rem; font-weight: 500;
                    color: var(--luna-navy); cursor: pointer; border-bottom: 1px solid #F0F9FF; transition: background 0.2s; text-align: left;
                }
                .search-option:hover { background: #F0F9FF; color: var(--luna-mid); }
                
                .rx-master-wrapper {
                    background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
                    border-radius: 20px; border: 1px solid white; box-shadow: 0 10px 30px rgba(84, 172, 191, 0.08);
                    padding: 20px; width: 100%; transition: all 0.3s ease;
                }
                
                .bengali-font { font-family: "Noto Serif Bengali", serif !important; font-weight: 600; }
                .english-font { font-family: "Google Sans Flex", "Google Sans", sans-serif !important; font-weight: 500; }
            `}} />

            {/* HEADER */}
            <button 
                onClick={() => navigate('/')} 
                className="btn btn-light mb-4 d-flex align-items-center gap-2 shadow-sm rounded-pill px-3 py-2 fw-semibold"
                style={{fontFamily: "'Google Sans', sans-serif", color: '#0277BD', width: 'fit-content', fontSize: '0.85rem'}}
            >
                <FaChevronLeft size={10} /> Back to Dashboard
            </button>

            <div className="text-center mb-4">
                <h2 className="mb-1" style={{ fontFamily: "'Libre Baskerville', serif", fontStyle: 'italic', fontWeight: '700', color: 'var(--luna-navy)', fontSize: '2.4rem', letterSpacing: '-0.3px' }}>
                    Update Test Reports
                </h2>
                <p className="mb-4 fw-medium" style={{ fontFamily: "'Google Sans', sans-serif", fontSize: '0.9rem', color: '#90A4AE' }}>
                    Search for a patient to log test findings
                </p>
            </div>

            {/* --- SEARCH BAR --- */}
            <Row className="justify-content-center mb-5">
                <Col xl={7} lg={9}>
                    <div className="position-relative">
                        <div className="voice-assist-container d-flex align-items-center w-100" style={{ padding: '4px 12px', height: '50px', borderRadius: '50px', border: '1px solid #E1F5FE', background: 'white', boxShadow: '0 4px 10px rgba(1, 28, 64, 0.03)' }}>
                            <FaSearch className="ms-2" style={{color: '#90A4AE'}} size={16} />
                            <input 
                                type="text" 
                                className="flex-grow-1 px-3 fw-medium" 
                                placeholder="Search Patient by Email or Phone..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ border: 'none', background: 'transparent', outline: 'none', fontFamily: "'Google Sans', sans-serif", fontSize: '0.95rem', color: 'var(--luna-navy)' }}
                            />
                            {isSearching && <div className="spinner-border spinner-border-sm text-info me-3" role="status" style={{width: '1rem', height: '1rem'}}></div>}
                        </div>

                        {/* Search Dropdown */}
                        {searchQuery.trim().length > 2 && suggestions.length > 0 && (
                            <div className="search-dropdown">
                                {suggestions.map(pt => (
                                    <div key={pt?.id} className="search-option d-flex align-items-center gap-3" onClick={() => handleSelectPatient(pt)}>
                                        <div style={{width: '38px', height: '38px', borderRadius: '50%', background: '#E1F5FE', display: 'flex', alignItems:'center', justifyContent:'center', color: 'var(--luna-mid)'}}>
                                            <FaUser size={14} />
                                        </div>
                                        <div>
                                            <div className="fw-semibold text-uppercase" style={{fontFamily: "'Google Sans', sans-serif", fontSize: '0.9rem'}}>{pt?.person?.name || 'Unknown'}</div>
                                            <div className="fw-medium" style={{fontFamily: "'Google Sans', sans-serif", fontSize: '0.75rem', color: '#90A4AE'}}>{pt?.person?.email || 'No Email'} • {pt?.person?.mobile || 'No Mobile'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {searchQuery.trim().length > 2 && !isSearching && suggestions.length === 0 && (
                            <div className="search-dropdown p-3 text-center text-muted" style={{fontFamily: "'Google Sans', sans-serif", fontStyle: 'italic', fontSize: '0.85rem'}}>
                                {"No patients found matching \"" + searchQuery + "\""}
                            </div>
                        )}
                    </div>
                </Col>
            </Row>

            {/* --- MAIN CONTENT: PATIENT FOUND --- */}
            {selectedPatient && (
                <Row className="justify-content-center">
                    <Col xl={10} xxl={9}>
                        <div className="rx-master-wrapper p-0 overflow-hidden">
                            
                            {/* Patient Info Banner */}
                            <div className="d-flex align-items-center gap-3 p-4" style={{background: 'linear-gradient(135deg, rgba(225, 245, 254, 0.6) 0%, rgba(240, 249, 255, 0.6) 100%)', borderBottom: '1px solid #E1F5FE'}}>
                                <div style={{width: '50px', height: '50px', borderRadius: '50%', background: 'linear-gradient(135deg, #0277BD 0%, #01579B 100%)', color: 'white', display: 'flex', alignItems:'center', justifyContent:'center'}}>
                                    <FaUser size={20} />
                                </div>
                                <div className="flex-grow-1">
                                    <h4 className="mb-0 fw-bold" style={{fontFamily: "'Google Sans', sans-serif", color: 'var(--luna-navy)', fontSize: '1.2rem'}}>
                                        {selectedPatient?.person?.name || 'Unknown Patient'}
                                    </h4>
                                    <div className="d-flex flex-wrap gap-4 mt-1 fw-medium" style={{fontFamily: "'Google Sans', sans-serif", fontSize: '0.85rem', color: 'var(--luna-mid)'}}>
                                        <span><FaEnvelope className="me-2 opacity-75"/>{selectedPatient?.person?.email || 'N/A'}</span>
                                        <span><FaPhone className="me-2 opacity-75"/>{selectedPatient?.person?.mobile || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Reports Table Section */}
                            <div className="p-4">
                                <h6 className="fw-semibold mb-3" style={{fontFamily: "'Google Sans', sans-serif", color: 'var(--luna-navy)', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.5px'}}>
                                    Requested Tests
                                </h6>
                                
                                {loadingReports ? (
                                    <div className="text-center py-5">
                                        <div className="custom-spinner mx-auto mb-3"></div>
                                        <h6 style={{color: 'var(--luna-mid)', fontFamily: 'Google Sans'}}>Fetching Reports...</h6>
                                    </div>
                                ) : testReports && testReports.length > 0 ? (
                                    <div className="table-responsive">
                                        <table className="plain-table w-100 mb-0" style={{borderSpacing: '0 8px'}}>
                                            <thead style={{background: '#F0F9FF'}}>
                                                <tr>
                                                    <th className="text-center py-3" style={{width: '15%', borderBottom: '2px solid #E1F5FE'}}>ID</th>
                                                    <th className="text-center py-3" style={{width: '35%', borderBottom: '2px solid #E1F5FE'}}>Test Name</th>
                                                    <th className="text-center py-3" style={{width: '35%', borderBottom: '2px solid #E1F5FE'}}>Result</th>
                                                    <th className="text-center py-3" style={{width: '15%', borderBottom: '2px solid #E1F5FE'}}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {testReports.map((report) => (
                                                    <tr key={report.id} style={{background: 'white', border: '1px solid #E1F5FE', boxShadow: '0 2px 6px rgba(0,0,0,0.02)'}}>
                                                        
                                                        {/* REPORT ID */}
                                                        <td className="text-center align-middle py-3 border-start border-top border-bottom rounded-start-3">
                                                            <span className="badge bg-light text-muted border" style={{fontFamily: "'Inter', monospace", fontSize: '0.75rem'}}>
                                                                #{String(report.id).padStart(4, '0')}
                                                            </span>
                                                        </td>
                                                        
                                                        {/* TEST NAME */}
                                                        <td className="text-center align-middle py-3 border-top border-bottom">
                                                            <div className={`fw-semibold ${hasBengali(report.test_name) ? 'bengali-font' : 'english-font'} d-flex align-items-center justify-content-center`} style={{color: 'var(--luna-navy)', fontSize: '0.95rem'}}>
                                                                <FaVial className="me-2 opacity-50" size={12} color="var(--luna-mid)"/>
                                                                {report.test_name}
                                                            </div>
                                                            <div style={{fontFamily: 'Inter', fontSize: '0.7rem', color: '#90A4AE', marginTop: '2px'}}>
                                                                Ref: Rx #{report.prescription_id}
                                                            </div>
                                                        </td>

                                                        {/* RESULT (Truncated view with updated style) */}
                                                        <td className="text-center align-middle py-3 border-top border-bottom px-3">
                                                            {report.result ? (
                                                                <span style={{fontFamily: "'Google Sans', sans-serif", fontWeight: '700', fontStyle: 'italic', color: '#0277BD', fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>
                                                                    {report.result}
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted" style={{fontFamily: "'Google Sans', sans-serif", fontSize: '0.85rem', fontStyle: 'italic'}}>
                                                                    Awaiting results...
                                                                </span>
                                                            )}
                                                        </td>
                                                        
                                                        {/* ACTIONS */}
                                                        <td className="text-center align-middle py-3 border-end border-top border-bottom rounded-end-3">
                                                            <button 
                                                                className="btn btn-sm d-flex align-items-center justify-content-center mx-auto gap-2" 
                                                                style={{background: '#E1F5FE', color: '#0277BD', borderRadius: '50px', padding: '6px 14px', fontWeight: 600, fontSize: '0.75rem', fontFamily: 'Google Sans'}}
                                                                onClick={() => handleUpdateResult(report)}
                                                            >
                                                                {report.result ? <><FaCheckCircle /> Edit Result</> : <><FaPen /> Add Result</>}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-5 fw-medium text-muted" style={{fontFamily: "'Google Sans', sans-serif", fontStyle: 'italic', fontSize: '0.9rem', border: '1px dashed #B2EBF2', borderRadius: '12px', background: '#F8FAFC'}}>
                                        <FaFileSignature size={40} className="mb-3 opacity-25 d-block mx-auto" />
                                        No pending or completed test reports found for this patient at your laboratory.
                                    </div>
                                )}
                            </div>
                        </div>
                    </Col>
                </Row>
            )}
        </Container>
    );
};

export default LabTestReports;