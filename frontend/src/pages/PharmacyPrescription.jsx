import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { coreProfileAPI, prescriptionAPI } from '../api/api';
import { FaSearch, FaChevronLeft, FaFileMedical, FaUser, FaStethoscope, FaEnvelope, FaPhone, FaClipboardList, FaCheckCircle } from 'react-icons/fa';

// --- SAFE UTILITIES ---
const parseBracketArray = (str) => {
    if (!str || typeof str !== 'string') return [];
    try {
        return [...str.matchAll(/\[(.*?)\]/g)].map(m => m[1]);
    } catch (e) {
        return [];
    }
};

const parseUsesProcess = (processStr) => {
    if (!processStr || typeof processStr !== 'string') return { generic: '', dose: '', instruction: '' };
    const parts = parseBracketArray(processStr);
    return {
        generic: parts[0] || '',
        dose: parts[1] || '',
        instruction: parts[2] || ''
    };
};

const hasBengali = (text) => /[\u0980-\u09FF]/.test(text || '');

const PharmacyPrescription = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [prescriptions, setPrescriptions] = useState([]);
    const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
    
    const [selectedPrescription, setSelectedPrescription] = useState(null);
    const [medicines, setMedicines] = useState([]);
    const [loadingMedicines, setLoadingMedicines] = useState(false);

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
        setMedicines([]);
        
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
        setLoadingMedicines(true);
        try {
            const res = await prescriptionAPI.getPrescriptionMedicines(prescription?.id);
            setMedicines(Array.isArray(res?.data) ? res.data : []);
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Could not load medicines.', customClass: { popup: 'swal-modern-popup' } });
        } finally {
            setLoadingMedicines(false);
        }
    };

    // --- 4. SELL ACTION ---
    const handleSell = () => {
        if (!medicines || medicines.length === 0) return;
        
        Swal.fire({
            title: `<span style="font-family: 'Google Sans', sans-serif; font-weight: 700; color: var(--luna-navy);">Confirm Sale</span>`,
            html: `<div style="font-family: 'Google Sans', sans-serif; font-size: 0.9rem; color: var(--luna-mid);">Are you sure you want to complete this sale for <br/><b style="font-size: 1.5rem; color: #0277BD;">৳${totalPrice.toFixed(2)}</b>?</div>`,
            showCancelButton: true,
            confirmButtonText: 'Yes, Sell',
            buttonsStyling: false,
            customClass: {
                popup: 'rounded-4 border-0 shadow-lg',
                confirmButton: 'btn btn-modern px-4 py-2 mx-2',
                cancelButton: 'btn btn-light px-4 py-2 mx-2 fw-semibold text-secondary',
                actions: 'd-flex justify-content-center mt-3'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    icon: 'success',
                    title: 'Sale Completed!',
                    text: `Medicines successfully sold to ${selectedPatient?.person?.name || 'Patient'}.`,
                    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000
                });
                setSelectedPrescription(null);
                setMedicines([]);
            }
        });
    };

    // Safe Total Calculation
    const totalPrice = Array.isArray(medicines) 
        ? medicines.reduce((acc, curr) => acc + (parseFloat(curr?.medicine_price) || 0), 0) 
        : 0;

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
                
                .bengali-font { font-family: "Noto Serif Bengali", serif !important; font-weight: 500; }
                .english-font { font-family: "Google Sans", sans-serif !important; font-weight: 500; }
            `}} />

            {/* HEADER */}
            <button 
                onClick={() => navigate('/profile')} 
                className="btn btn-light mb-4 d-flex align-items-center gap-2 shadow-sm rounded-pill px-3 py-2 fw-semibold"
                style={{fontFamily: "'Google Sans', sans-serif", color: '#0277BD', width: 'fit-content', fontSize: '0.85rem'}}
            >
                <FaChevronLeft size={10} /> Back to Profile
            </button>

            <div className="text-center mb-4">
                <h2 className="page-title-serif mb-1" style={{ fontWeight: '700', color: 'var(--luna-navy)', fontSize: '1.8rem', letterSpacing: '-0.3px' }}>
                    View Prescriptions
                </h2>
                <p className="mb-4 fw-medium" style={{ fontFamily: "'Google Sans', sans-serif", fontSize: '0.85rem', color: '#90A4AE' }}>
                    Search patient to process medical orders
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
                                                                <span key={i} className="badge bg-white fw-medium" style={{fontFamily: "'Google Sans', sans-serif", padding: '6px 10px', border: '1px solid #81D4FA', borderRadius: '6px', color: 'var(--luna-navy)', fontSize: '0.75rem'}}>{item}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <strong className="fw-semibold text-uppercase" style={{fontFamily: "'Google Sans', sans-serif", fontSize: '0.7rem', letterSpacing: '0.5px', color: '#0277BD'}}>Complaints (C/C):</strong>
                                                        <div className="d-flex flex-wrap gap-2 mt-1">
                                                            {parseBracketArray(selectedPrescription?.cc).map((item, i) => (
                                                                <span key={i} className="badge bg-white fw-medium" style={{fontFamily: "'Google Sans', sans-serif", padding: '6px 10px', border: '1px solid #81D4FA', borderRadius: '6px', color: 'var(--luna-navy)', fontSize: '0.75rem'}}>{item}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <h6 className="fw-semibold mb-3" style={{fontFamily: "'Google Sans', sans-serif", color: 'var(--luna-mid)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px'}}>
                                                Medicines Prescribed
                                            </h6>

                                            {/* Responsive Medicines Table */}
                                            {loadingMedicines ? (
                                                <div className="text-center py-5 fw-medium text-muted" style={{fontSize: '0.85rem'}}><div className="spinner-border spinner-border-sm me-2"></div>Loading Medicines...</div>
                                            ) : medicines && medicines.length > 0 ? (
                                                <>
                                                    <div className="table-responsive flex-grow-1" style={{overflowX: 'auto', border: '1px solid #E1F5FE', borderRadius: '10px'}}>
                                                        <table className="table align-middle mb-0" style={{minWidth: '600px'}}>
                                                            <thead style={{background: '#E1F5FE'}}>
                                                                <tr>
                                                                    <th className="fw-semibold text-uppercase border-bottom py-2" style={{fontFamily: "'Google Sans', sans-serif", fontSize: '0.7rem', width: '35%', paddingLeft: '15px', color: '#0277BD'}}>Medicine</th>
                                                                    <th className="fw-semibold text-uppercase border-bottom text-center py-2" style={{fontFamily: "'Google Sans', sans-serif", fontSize: '0.7rem', width: '25%', color: '#0277BD'}}>Dose</th>
                                                                    <th className="fw-semibold text-uppercase border-bottom text-center py-2" style={{fontFamily: "'Google Sans', sans-serif", fontSize: '0.7rem', width: '25%', color: '#0277BD'}}>Instruction</th>
                                                                    <th className="fw-semibold text-uppercase border-bottom text-end py-2" style={{fontFamily: "'Google Sans', sans-serif", fontSize: '0.7rem', width: '15%', paddingRight: '15px', color: '#0277BD'}}>Price</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {medicines.map((med) => {
                                                                    const parsed = parseUsesProcess(med?.uses_process);
                                                                    const price = parseFloat(med?.medicine_price) || 0;
                                                                    return (
                                                                        <tr key={med?.id}>
                                                                            <td className="py-2 border-bottom" style={{paddingLeft: '15px'}}>
                                                                                <div className="fw-semibold" style={{fontFamily: "'Google Sans', sans-serif", color: 'var(--luna-navy)', fontSize: '0.85rem'}}>{med?.medicine_name || 'N/A'}</div>
                                                                                <div className="fw-medium" style={{fontFamily: "'Google Sans', sans-serif", fontSize: '0.7rem', color: '#0288D1'}}>{med?.generic_name || 'N/A'}</div>
                                                                            </td>
                                                                            <td className="py-2 text-center border-bottom">
                                                                                <div className={hasBengali(parsed.dose) ? 'bengali-font' : 'english-font'} style={{fontSize: '0.8rem', color: 'var(--luna-navy)'}}>{parsed.dose}</div>
                                                                                <div className="fw-medium" style={{fontFamily: "'Google Sans', sans-serif", fontSize: '0.7rem', color: 'var(--luna-mid)'}}>{med?.duration || 0} days</div>
                                                                            </td>
                                                                            <td className="py-2 text-center border-bottom">
                                                                                <div className={hasBengali(parsed.instruction) ? 'bengali-font' : 'english-font'} style={{fontSize: '0.75rem', color: '#0277BD'}}>{parsed.instruction}</div>
                                                                            </td>
                                                                            <td className="py-2 text-end border-bottom" style={{paddingRight: '15px'}}>
                                                                                <span className="fw-semibold" style={{fontFamily: "'Google Sans', sans-serif", color: 'var(--luna-mid)', fontSize: '0.85rem'}}>৳{price.toFixed(2)}</span>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    {/* Cart Footer */}
                                                    <div className="mt-3 p-3 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3" style={{background: 'linear-gradient(135deg, #01579B 0%, #0277BD 100%)', borderRadius: '12px', color: 'white'}}>
                                                        <div>
                                                            <div className="fw-semibold text-uppercase" style={{fontFamily: "'Google Sans', sans-serif", fontSize: '0.7rem', opacity: 0.9, letterSpacing: '1px'}}>Total Amount</div>
                                                            <div className="fw-bold" style={{fontFamily: "'Google Sans', sans-serif", fontSize: '1.6rem', lineHeight: '1'}}>৳{totalPrice.toFixed(2)}</div>
                                                        </div>
                                                        <button 
                                                            className="btn fw-semibold px-4 py-2 rounded-pill d-flex align-items-center justify-content-center gap-2"
                                                            style={{background: 'white', color: '#01579B', fontFamily: "'Google Sans', sans-serif", border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', fontSize: '0.9rem', width: 'auto'}}
                                                            onClick={handleSell}
                                                        >
                                                            <FaCheckCircle size={16} /> Confirm Sell
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center py-5 fw-medium" style={{fontFamily: "'Google Sans', sans-serif", color: '#90A4AE'}}>
                                                    <FaClipboardList size={40} className="mb-2 opacity-50" />
                                                    <h5 style={{fontSize: '1rem'}}>No medicines prescribed</h5>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted" style={{minHeight: '400px', border: '2px dashed #B3E5FC', borderRadius: '20px', background: 'rgba(255,255,255,0.4)'}}>
                                            <div style={{background: '#E1F5FE', padding: '20px', borderRadius: '50%', marginBottom: '15px', color: '#0288D1'}}>
                                                <FaFileMedical size={40} />
                                            </div>
                                            <h5 className="fw-semibold mb-2" style={{fontFamily: "'Google Sans', sans-serif", color: 'var(--luna-mid)', fontSize: '1.1rem'}}>Select a Prescription</h5>
                                            <p className="fw-medium text-center" style={{fontFamily: "'Google Sans', sans-serif", fontSize: '0.85rem', maxWidth: '280px', color: '#0288D1'}}>Click on a prescription from the history list to view medicines and process the sale.</p>
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

export default PharmacyPrescription;