import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { coreProfileAPI, prescriptionAPI, laboratoryAPI } from '../api/api';
import { FaSearch, FaChevronLeft, FaFlask, FaUser, FaStethoscope, FaEnvelope, FaPhone, FaCheckCircle, FaVial } from 'react-icons/fa';

// --- SAFE UTILITIES ---
const parseBracketArray = (str) => {
    if (!str || typeof str !== 'string') return [];
    try {
        return [...str.matchAll(/\[(.*?)\]/g)].map(m => m[1]);
    } catch (e) {
        return [];
    }
};

const hasBengali = (text) => /[\u0980-\u09FF]/.test(text || '');

const LabPrescriptions = () => {
    const navigate = useNavigate();
    
    // Auth Data - Get lab_id safely
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const labId = storedUser?.id || storedUser?.lab_id || storedUser?.laboratory_id;

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    
    // Selection State
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [prescriptions, setPrescriptions] = useState([]);
    const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
    
    const [selectedPrescription, setSelectedPrescription] = useState(null);
    const [tests, setTests] = useState([]);
    const [loadingTests, setLoadingTests] = useState(false);
    const [selectedTestIds, setSelectedTestIds] = useState([]);
    const [processing, setProcessing] = useState(false);

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

    // --- 2. SELECT PATIENT ---
    const handleSelectPatient = async (patientData) => {
        setSearchQuery('');
        setSuggestions([]);
        setSelectedPatient(patientData);
        setSelectedPrescription(null);
        setTests([]);
        setSelectedTestIds([]);
        
        setLoadingPrescriptions(true);
        try {
            const res = await prescriptionAPI.getPatientPrescriptions(patientData?.id);
            setPrescriptions(Array.isArray(res?.data) ? res.data : []);
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Could not load prescriptions.', customClass: { popup: 'swal-modern-popup' } });
        } finally {
            setLoadingPrescriptions(false);
        }
    };

    // --- 3. SELECT PRESCRIPTION ---
    const handleSelectPrescription = async (prescription) => {
        setSelectedPrescription(prescription);
        setSelectedTestIds([]); // Reset selection on new prescription
        setLoadingTests(true);
        try {
            const res = await laboratoryAPI.getPrescriptionTests(prescription?.id);
            setTests(Array.isArray(res?.data) ? res.data : []);
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Could not load tests.', customClass: { popup: 'swal-modern-popup' } });
        } finally {
            setLoadingTests(false);
        }
    };

    // --- 4. TOGGLE TEST SELECTION ---
    const handleToggleTest = (id) => {
        setSelectedTestIds(prev => 
            prev.includes(id) ? prev.filter(testId => testId !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedTestIds.length === tests.length) {
            setSelectedTestIds([]);
        } else {
            setSelectedTestIds(tests.map(t => t.id));
        }
    };

    // --- 5. CONFIRM TESTS ACTION (FIXED) ---
    const handleConfirmTests = async () => {
        if (!selectedTestIds || selectedTestIds.length === 0) return;
        
        // Ensure labId is a strict integer
        const parsedLabId = parseInt(labId, 10);
        
        if (!parsedLabId || isNaN(parsedLabId)) {
            Swal.fire('Error', 'Laboratory ID is missing. Please log out and log back in.', 'error');
            return;
        }
        
        Swal.fire({
            title: `<span style="font-family: 'Google Sans', sans-serif; font-weight: 700; color: var(--luna-navy);">Confirm Tests</span>`,
            html: `<div style="font-family: 'Google Sans', sans-serif; font-size: 0.9rem; color: var(--luna-mid);">Are you sure you want to confirm <b style="color: #0277BD;">${selectedTestIds.length}</b> selected test(s)?</div>`,
            showCancelButton: true,
            confirmButtonText: 'Yes, Confirm',
            buttonsStyling: false,
            customClass: {
                popup: 'rounded-4 border-0 shadow-lg',
                confirmButton: 'btn btn-modern px-4 py-2 mx-2',
                cancelButton: 'btn btn-light px-4 py-2 mx-2 fw-semibold text-secondary',
                actions: 'd-flex justify-content-center mt-3'
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                setProcessing(true);
                try {
                    // Send confirmation for each selected test sequentially to avoid overloading and catch exact errors
                    for (const testId of selectedTestIds) {
                        const payload = {
                            prescribed_test_id: parseInt(testId, 10), // Strict Integer
                            lab_id: parsedLabId                       // Strict Integer
                        };
                        
                        console.log("🚀 SENDING CONFIRMATION PAYLOAD:", payload);
                        
                        await laboratoryAPI.confirmTest(payload);
                    }

                    Swal.fire({
                        icon: 'success',
                        title: 'Tests Confirmed!',
                        text: `Successfully initiated test reports for ${selectedPatient?.person?.name || 'Patient'}.`,
                        toast: true, position: 'top-end', showConfirmButton: false, timer: 3000
                    });
                    
                    // Remove confirmed tests from UI
                    setTests(prev => prev.filter(t => !selectedTestIds.includes(t.id)));
                    setSelectedTestIds([]);
                    
                } catch (error) {
                    console.error("Confirmation Error:", error);
                    let errorMsg = 'Failed to confirm some tests. Please try again.';
                    
                    // If Django rejects it, this will tell us exactly why (e.g. "lab_id does not exist")
                    if (error.response && error.response.data) {
                        errorMsg = `Django says: ${JSON.stringify(error.response.data)}`;
                    }
                    
                    Swal.fire({
                        icon: 'error',
                        title: 'API Request Failed',
                        text: errorMsg,
                        customClass: { popup: 'swal-modern-popup' }
                    });
                } finally {
                    setProcessing(false);
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
                
                .presc-card {
                    background: white; border-radius: 10px; border: 1px solid #E1F5FE; padding: 12px 15px; margin-bottom: 10px;
                    cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 10px rgba(0,0,0,0.02);
                }
                .presc-card:hover { border-color: var(--luna-light); box-shadow: 0 4px 15px rgba(84, 172, 191, 0.1); transform: translateY(-1px); }
                .presc-card.active { background: linear-gradient(135deg, #F0F9FF 0%, #E1F5FE 100%); border-color: var(--luna-mid); }
                
                .bengali-font { font-family: "Noto Serif Bengali", serif !important; font-weight: 600; }
                .english-font { font-family: "Google Sans", sans-serif !important; font-weight: 500; }
                
                /* Custom Checkbox for tests */
                .test-checkbox {
                    width: 20px; height: 20px; cursor: pointer; accent-color: var(--luna-mid);
                }
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
                {/* LARGER LIBRE BASKERVILLE ITALIC TITLE */}
                <h2 className="mb-1" style={{ fontFamily: "'Libre Baskerville', serif", fontStyle: 'italic', fontWeight: '700', color: 'var(--luna-navy)', fontSize: '2.4rem', letterSpacing: '-0.3px' }}>
                    Lab Prescriptions
                </h2>
                <p className="mb-4 fw-medium" style={{ fontFamily: "'Google Sans', sans-serif", fontSize: '0.9rem', color: '#90A4AE' }}>
                    Search patient to view and confirm prescribed tests
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
                    <Col xl={11} xxl={10}>
                        <div className="rx-master-wrapper">
                            
                            {/* Patient Info Banner */}
                            <div className="d-flex align-items-center gap-3 mb-4 p-3" style={{background: 'linear-gradient(135deg, rgba(225, 245, 254, 0.6) 0%, rgba(240, 249, 255, 0.6) 100%)', borderRadius: '14px', border: '1px solid #E1F5FE'}}>
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

                            <Row className="g-4">
                                {/* LEFT COL: Prescriptions List */}
                                <Col lg={4} md={5}>
                                    <div className="p-3" style={{background: 'rgba(255,255,255,0.6)', borderRadius: '14px', border: '1px solid #E1F5FE', height: '100%'}}>
                                        <h6 className="fw-semibold mb-3" style={{fontFamily: "'Google Sans', sans-serif", color: 'var(--luna-navy)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px'}}>
                                            Prescription History
                                        </h6>
                                        
                                        {loadingPrescriptions ? (
                                            <div className="text-center py-4 fw-medium text-muted" style={{fontSize: '0.85rem'}}><div className="spinner-border spinner-border-sm me-2"></div>Loading...</div>
                                        ) : prescriptions && prescriptions.length > 0 ? (
                                            <div style={{maxHeight: '500px', overflowY: 'auto', paddingRight: '5px'}}>
                                                {prescriptions.map(rx => (
                                                    <div 
                                                        key={rx?.id} 
                                                        className={`presc-card ${selectedPrescription?.id === rx?.id ? 'active' : ''}`}
                                                        onClick={() => handleSelectPrescription(rx)}
                                                    >
                                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                                            <span className="fw-bold" style={{fontFamily: "'Google Sans', sans-serif", color: 'var(--luna-navy)', fontSize: '0.95rem'}}>
                                                                #{rx?.id}
                                                            </span>
                                                            <span className="badge fw-medium" style={{fontFamily: "'Google Sans', sans-serif", background: 'white', color: 'var(--luna-mid)', border: '1px solid #B2EBF2', fontSize: '0.7rem', padding: '4px 8px'}}>
                                                                {rx?.appointment_date || 'Unknown Date'}
                                                            </span>
                                                        </div>
                                                        <div className="d-flex align-items-center fw-medium mt-1" style={{fontFamily: "'Google Sans', sans-serif", fontSize: '0.8rem', color: '#0277BD'}}>
                                                            <FaStethoscope className="me-2 opacity-75" size={12} /> Dr. {rx?.doctor_name || 'Unknown'}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-5 fw-medium text-muted" style={{fontFamily: "'Google Sans', sans-serif", fontStyle: 'italic', fontSize: '0.85rem'}}>No past prescriptions found.</div>
                                        )}
                                    </div>
                                </Col>

                                {/* RIGHT COL: Selected Prescription Details */}
                                <Col lg={8} md={7}>
                                    {selectedPrescription ? (
                                        <div className="h-100 d-flex flex-column p-4" style={{background: 'white', borderRadius: '14px', border: '1px solid #E1F5FE', boxShadow: '0 2px 10px rgba(0,0,0,0.02)'}}>
                                            
                                            {/* Clinical Summary */}
                                            <div className="mb-4 p-3" style={{background: '#F0F9FF', borderRadius: '12px', border: '1px dashed #B3E5FC'}}>
                                                <h6 className="fw-semibold mb-2" style={{fontFamily: "'Google Sans', sans-serif", color: 'var(--luna-navy)', fontSize: '0.85rem'}}>Clinical Summary</h6>
                                                
                                                <div className="row g-3">
                                                    <div className="col-md-6">
                                                        <strong className="fw-semibold text-uppercase" style={{fontFamily: "'Google Sans', sans-serif", fontSize: '0.7rem', letterSpacing: '0.5px', color: '#0277BD'}}>Diagnosis (D/X):</strong>
                                                        <div className="d-flex flex-wrap gap-2 mt-1">
                                                            {parseBracketArray(selectedPrescription?.dx).map((item, i) => (
                                                                <span key={i} className={`badge bg-white fw-medium ${hasBengali(item) ? 'bengali-font' : 'english-font'}`} style={{padding: '6px 10px', border: '1px solid #81D4FA', borderRadius: '6px', color: 'var(--luna-navy)', fontSize: '0.75rem'}}>{item}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <strong className="fw-semibold text-uppercase" style={{fontFamily: "'Google Sans', sans-serif", fontSize: '0.7rem', letterSpacing: '0.5px', color: '#0277BD'}}>Complaints (C/C):</strong>
                                                        <div className="d-flex flex-wrap gap-2 mt-1">
                                                            {parseBracketArray(selectedPrescription?.cc).map((item, i) => (
                                                                <span key={i} className={`badge bg-white fw-medium ${hasBengali(item) ? 'bengali-font' : 'english-font'}`} style={{padding: '6px 10px', border: '1px solid #81D4FA', borderRadius: '6px', color: 'var(--luna-navy)', fontSize: '0.75rem'}}>{item}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <h6 className="fw-semibold mb-3" style={{fontFamily: "'Google Sans', sans-serif", color: 'var(--luna-mid)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px'}}>
                                                Prescribed Lab Tests
                                            </h6>

                                            {/* Responsive Tests Table */}
                                            {loadingTests ? (
                                                <div className="text-center py-5 fw-medium text-muted" style={{fontSize: '0.85rem'}}><div className="spinner-border spinner-border-sm me-2"></div>Loading Tests...</div>
                                            ) : tests && tests.length > 0 ? (
                                                <>
                                                    <div className="table-responsive flex-grow-1" style={{overflowX: 'auto', border: '1px solid #E1F5FE', borderRadius: '10px'}}>
                                                        <table className="table align-middle mb-0" style={{minWidth: '500px'}}>
                                                            <thead style={{background: '#E1F5FE'}}>
                                                                <tr>
                                                                    <th className="fw-semibold text-uppercase border-bottom py-2" style={{fontFamily: "'Google Sans', sans-serif", fontSize: '0.7rem', width: '80%', paddingLeft: '15px', color: '#0277BD'}}>Test Name</th>
                                                                    <th className="fw-semibold text-uppercase border-bottom text-end py-2" style={{fontFamily: "'Google Sans', sans-serif", fontSize: '0.7rem', width: '20%', paddingRight: '15px', color: '#0277BD'}}>
                                                                        <span style={{cursor: 'pointer', textDecoration: 'underline'}} onClick={handleSelectAll}>
                                                                            {selectedTestIds.length === tests.length ? 'Deselect All' : 'Select All'}
                                                                        </span>
                                                                    </th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {tests.map((testItem) => (
                                                                    <tr key={testItem.id}>
                                                                        <td className="py-3 border-bottom" style={{paddingLeft: '15px'}}>
                                                                            <div className={`fw-semibold ${hasBengali(testItem.test_name) ? 'bengali-font' : 'english-font'}`} style={{color: 'var(--luna-navy)', fontSize: '0.9rem'}}>
                                                                                <FaVial className="me-2 text-muted" size={12}/>
                                                                                {testItem.test_name || 'N/A'}
                                                                            </div>
                                                                        </td>
                                                                        <td className="py-3 text-end border-bottom" style={{paddingRight: '15px'}}>
                                                                            <input 
                                                                                type="checkbox" 
                                                                                className="test-checkbox"
                                                                                checked={selectedTestIds.includes(testItem.id)}
                                                                                onChange={() => handleToggleTest(testItem.id)}
                                                                            />
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    {/* Confirmation Footer */}
                                                    <div className="mt-3 p-3 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3" style={{background: 'linear-gradient(135deg, #01579B 0%, #0277BD 100%)', borderRadius: '12px', color: 'white'}}>
                                                        <div>
                                                            <div className="fw-semibold text-uppercase" style={{fontFamily: "'Google Sans', sans-serif", fontSize: '0.75rem', opacity: 0.9, letterSpacing: '1px'}}>Tests Selected</div>
                                                            <div className="fw-bold mt-1" style={{fontFamily: "'Google Sans', sans-serif", fontSize: '1.4rem', lineHeight: '1'}}>{selectedTestIds.length} / {tests.length}</div>
                                                        </div>
                                                        <button 
                                                            className="btn fw-semibold px-4 py-2 rounded-pill d-flex align-items-center justify-content-center gap-2"
                                                            style={{background: 'white', color: '#01579B', fontFamily: "'Google Sans', sans-serif", border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', fontSize: '0.9rem', width: 'auto'}}
                                                            onClick={handleConfirmTests}
                                                            disabled={selectedTestIds.length === 0 || processing}
                                                        >
                                                            {processing ? (
                                                                <><div className="spinner-border spinner-border-sm"></div> Processing...</>
                                                            ) : (
                                                                <><FaCheckCircle size={16} /> Confirm Tests</>
                                                            )}
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center py-5 fw-medium" style={{fontFamily: "'Google Sans', sans-serif", color: '#90A4AE'}}>
                                                    <FaFlask size={40} className="mb-2 opacity-50" />
                                                    <h5 style={{fontSize: '1rem'}}>No lab tests prescribed</h5>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted" style={{minHeight: '400px', border: '2px dashed #B3E5FC', borderRadius: '20px', background: 'rgba(255,255,255,0.4)'}}>
                                            <div style={{background: '#E1F5FE', padding: '20px', borderRadius: '50%', marginBottom: '15px', color: '#0288D1'}}>
                                                <FaFlask size={40} />
                                            </div>
                                            <h5 className="fw-semibold mb-2" style={{fontFamily: "'Google Sans', sans-serif", color: 'var(--luna-mid)', fontSize: '1.1rem'}}>Select a Prescription</h5>
                                            <p className="fw-medium text-center" style={{fontFamily: "'Google Sans', sans-serif", fontSize: '0.85rem', maxWidth: '280px', color: '#0288D1'}}>Click on a prescription from the history list to view and confirm requested lab tests.</p>
                                        </div>
                                    )}
                                </Col>
                            </Row>
                        </div>
                    </Col>
                </Row>
            )}
        </Container>
    );
};

export default LabPrescriptions;