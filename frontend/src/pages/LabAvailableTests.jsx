import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { coreAPI, laboratoryAPI } from '../api/api';
import { 
    FaSearch, FaChevronLeft, FaFlask, FaPlus, FaPen, FaTrash, FaTimes, FaCheckCircle 
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

const LabAvailableTests = () => {
    const navigate = useNavigate();
    
    // Auth Data - strictly parsed
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const labId = parseInt(storedUser?.id || storedUser?.lab_id || storedUser?.laboratory_id, 10);

    // Data States
    const [availableTests, setAvailableTests] = useState([]);
    const [allCoreTests, setAllCoreTests] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter State (For Table)
    const [filterQuery, setFilterQuery] = useState('');

    // Add Test States (Modeled exactly like Prescription.jsx)
    const [showAddForm, setShowAddForm] = useState(false);
    const [addStep, setAddStep] = useState(1); // 1 = typing/searching, 2 = selected
    const [addQuery, setAddQuery] = useState('');
    const [showAddSuggestions, setShowAddSuggestions] = useState(false);
    const [selectedNewTestId, setSelectedNewTestId] = useState(null);
    const [newPrice, setNewPrice] = useState('');
    const [adding, setAdding] = useState(false);

    // --- 1. FETCH DATA ---
    const fetchData = async () => {
        if (!labId || isNaN(labId)) return;
        setLoading(true);
        try {
            const [availRes, coreRes] = await Promise.all([
                laboratoryAPI.getLabAvailableTests(labId),
                coreAPI.getTests()
            ]);
            
            setAvailableTests(Array.isArray(availRes.data) ? availRes.data : []);
            
            const coreData = Array.isArray(coreRes.data) ? coreRes.data : (coreRes.data.results || []);
            setAllCoreTests(coreData.sort((a, b) => a.name.localeCompare(b.name)));
        } catch (error) {
            console.error("Error fetching data:", error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Could not load tests.', customClass: { popup: 'swal-modern-popup' } });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [labId]);

    // --- 2. FILTER TABLE LOGIC ---
    const filteredTableTests = availableTests.filter(t => 
        t.test_name?.toLowerCase().includes(filterQuery.toLowerCase().trim())
    );

    // --- 3. ADD TEST AUTOCOMPLETE LOGIC ---
    const getFilteredTests = (query) => {
        if (!query || !Array.isArray(allCoreTests)) return [];
        const q = query.toLowerCase().trim();
        const existingTestIds = availableTests.map(at => at.test_id);
        
        const filtered = allCoreTests.filter(t => 
            t?.name?.toLowerCase().includes(q) && 
            !existingTestIds.includes(t.id)
        );
        
        return filtered.sort((a, b) => {
            const aStarts = a.name.toLowerCase().startsWith(q);
            const bStarts = b.name.toLowerCase().startsWith(q);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            if (a.name.length !== b.name.length) return a.name.length - b.name.length;
            return a.name.localeCompare(b.name);
        });
    };

    const addSuggestions = getFilteredTests(addQuery);

    const handleAutoResize = (e) => {
        const target = e.target || e;
        target.style.height = 'auto';
        target.style.height = target.scrollHeight + 'px';
    };

    const handleSelectNewTest = (item) => {
        setAddQuery(item.name);
        setSelectedNewTestId(item.id);
        setAddStep(2); // Move to selected view
        setShowAddSuggestions(false);
    };

    const handleAddTestFlow = (e) => {
        if (e.key === 'Enter' || e.type === 'blur') {
            if (addQuery.trim() !== '' && addStep === 1) {
                const matchedTest = allCoreTests.find(t => t.name.toLowerCase() === addQuery.trim().toLowerCase());
                if (matchedTest) {
                    handleSelectNewTest(matchedTest);
                }
            }
        }
    };

    const resetAddForm = () => {
        setAddStep(1);
        setAddQuery('');
        setSelectedNewTestId(null);
        setNewPrice('');
        setShowAddForm(false);
    };

    // --- 4. CREATE NEW TEST ---
    const handleAddTest = async () => {
        if (!selectedNewTestId || !newPrice) {
            Swal.fire('Warning', 'Please select a test and enter a valid price.', 'warning');
            return;
        }

        setAdding(true);
        try {
            await laboratoryAPI.addLabAvailableTest(labId, {
                test_id: parseInt(selectedNewTestId, 10),
                price: parseFloat(newPrice).toFixed(2)
            });
            
            Swal.fire({ icon: 'success', title: 'Test Added', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
            resetAddForm();
            fetchData();
        } catch (error) {
            console.error("Add Error:", error.response?.data || error);
            Swal.fire('Error', `Failed to add: ${JSON.stringify(error.response?.data || 'Unknown Error')}`, 'error');
        } finally {
            setAdding(false);
        }
    };

    // --- 5. EDIT TEST ---
    const handleEditTest = (testItem) => {
        Swal.fire({
            title: `<span style="font-family: 'Google Sans', sans-serif; font-weight: 700; color: var(--luna-navy); font-size: 1.3rem;">Edit Test</span>`,
            html: `
                <div class="text-start mt-3">
                    <p style="font-family: 'Google Sans', sans-serif; font-size: 0.9rem; color: var(--luna-mid); font-weight: 600;" class="mb-3">
                        ${testItem.test_name}
                    </p>
                    <label class="form-label text-uppercase" style="font-family: 'Google Sans', sans-serif; font-size: 0.75rem; font-weight: 700; color: #90A4AE; letter-spacing: 0.5px;">Update Price (৳)</label>
                    <input id="swal-price" type="number" class="form-control mb-3" value="${parseFloat(testItem.price)}" style="font-family: 'Inter', sans-serif; font-weight: 600; border: 1px solid #B2EBF2;" />
                    
                    <div class="form-check form-switch d-flex align-items-center gap-2 ps-0">
                        <input class="form-check-input m-0" type="checkbox" id="swal-available" ${testItem.is_available !== false ? 'checked' : ''} style="width: 2.5em; height: 1.25em; cursor: pointer;">
                        <label class="form-check-label mb-0 ms-2" style="font-family: 'Google Sans', sans-serif; font-size: 0.9rem; font-weight: 600; color: var(--luna-navy); cursor: pointer;" for="swal-available">Currently Available</label>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Save Changes',
            buttonsStyling: false,
            customClass: {
                popup: 'rounded-4 border-0 shadow-lg',
                confirmButton: 'btn btn-modern px-4 py-2 mx-2',
                cancelButton: 'btn btn-light px-4 py-2 mx-2 fw-semibold text-secondary',
                actions: 'd-flex justify-content-center mt-4'
            },
            preConfirm: () => {
                const price = document.getElementById('swal-price').value;
                const is_available = document.getElementById('swal-available').checked;
                if (!price) { Swal.showValidationMessage('Price is required'); }
                return { price: parseFloat(price).toFixed(2), is_available };
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // Update uses the offering ID (testItem.id)
                    await laboratoryAPI.updateLabAvailableTest(testItem.id, result.value);
                    Swal.fire({ icon: 'success', title: 'Updated Successfully', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
                    fetchData();
                } catch (err) {
                    console.error("Update Error:", err.response?.data || err);
                    Swal.fire('Error', `Failed to update: ${JSON.stringify(err.response?.data || 'Unknown Error')}`, 'error');
                }
            }
        });
    };

    // --- 6. DELETE TEST ---
    const handleDeleteTest = (testItem) => {
        Swal.fire({
            title: `<span style="font-family: 'Google Sans', sans-serif; font-weight: 700; color: #C62828;">Remove Test?</span>`,
            html: `<div style="font-family: 'Google Sans', sans-serif; font-size: 0.9rem; color: var(--luna-mid);">Are you sure you want to stop offering <b>${testItem.test_name}</b>?</div>`,
            showCancelButton: true,
            confirmButtonText: 'Yes, Remove',
            buttonsStyling: false,
            customClass: {
                popup: 'rounded-4 border-0 shadow-lg',
                confirmButton: 'btn btn-danger px-4 py-2 mx-2 rounded-pill fw-bold',
                cancelButton: 'btn btn-light px-4 py-2 mx-2 fw-semibold text-secondary rounded-pill',
                actions: 'd-flex justify-content-center mt-3'
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // Delete uses labId and offering ID (testItem.id)
                    await laboratoryAPI.removeLabAvailableTest(labId, testItem.id);
                    Swal.fire({ icon: 'success', title: 'Removed', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
                    fetchData();
                } catch (err) {
                    console.error("Delete Error:", err.response?.data || err);
                    Swal.fire('Error', `Failed to remove: ${JSON.stringify(err.response?.data || 'Unknown Error')}`, 'error');
                }
            }
        });
    };

    return (
        <Container fluid className="p-4 fade-in" style={{fontFamily: "'Google Sans Flex', 'Google Sans', sans-serif"}}>
            
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

                .rx-grid-input {
                    width: 100%; border: 1px solid transparent; background: transparent; padding: 8px 12px;
                    font-family: 'Google Sans Flex', sans-serif !important; font-size: 0.9rem !important; font-weight: 600;
                    color: var(--luna-navy); outline: none; border-radius: 8px; transition: background 0.2s ease;
                    resize: none; overflow: hidden; min-height: 42px; display: block; box-sizing: border-box;
                }
                .rx-grid-input:focus {
                    background: white; border-color: var(--luna-light); box-shadow: 0 0 0 3px rgba(106, 211, 227, 0.2); z-index: 10; position: relative;
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
                    Available Tests
                </h2>
                <p className="mb-4 fw-medium" style={{ fontFamily: "'Google Sans', sans-serif", fontSize: '0.9rem', color: '#90A4AE' }}>
                    Manage the tests your laboratory currently offers
                </p>
            </div>

            <Row className="justify-content-center">
                <Col xl={10} xxl={9}>
                    
                    {/* --- CONTROLS ROW --- */}
                    <div className="d-flex flex-column flex-md-row gap-3 justify-content-between align-items-md-center mb-4">
                        <div className="voice-assist-container d-flex align-items-center" style={{ padding: '4px 12px', height: '45px', borderRadius: '50px', border: '1px solid #E1F5FE', background: 'white', flex: 1, maxWidth: '400px' }}>
                            <FaSearch className="ms-2" style={{color: '#90A4AE'}} size={14} />
                            <input 
                                type="text" 
                                className="flex-grow-1 px-3 fw-medium" 
                                placeholder="Filter offered tests..." 
                                value={filterQuery}
                                onChange={(e) => setFilterQuery(e.target.value)}
                                style={{ border: 'none', background: 'transparent', outline: 'none', fontFamily: "'Google Sans', sans-serif", fontSize: '0.9rem', color: 'var(--luna-navy)' }}
                            />
                        </div>

                        <button 
                            className="btn btn-modern px-4 py-2 d-flex align-items-center gap-2"
                            onClick={() => {
                                if(showAddForm) resetAddForm();
                                else setShowAddForm(true);
                            }}
                            style={{borderRadius: '50px', fontSize: '0.9rem'}}
                        >
                            {showAddForm ? <FaTimes /> : <FaPlus />} 
                            {showAddForm ? 'Cancel' : 'Add New Test'}
                        </button>
                    </div>

                    {/* --- ADD TEST FORM (Prescription.jsx Style) --- */}
                    {showAddForm && (
                        <div className="rx-master-wrapper mb-4 p-3 px-4" style={{background: '#F0F9FF', border: '1px dashed #B3E5FC'}}>
                            <h6 className="fw-bold text-uppercase mb-3" style={{color: '#0277BD', fontSize: '0.8rem', letterSpacing: '0.5px'}}>Add Test to Catalog</h6>
                            
                            <Row className="g-3 align-items-start">
                                <Col md={6}>
                                    <label className="form-label fw-bold" style={{fontSize: '0.75rem', color: 'var(--luna-mid)'}}>Search Master Catalog</label>
                                    
                                    <div className="position-relative w-100" style={{background: 'white', borderRadius: '8px', border: '1px solid #B2EBF2'}}>
                                        {addStep === 1 ? (
                                            <>
                                                <textarea 
                                                    rows={1} 
                                                    className={`rx-grid-input w-100 ${hasBengali(addQuery) ? 'bengali-font' : 'english-font'}`} 
                                                    value={addQuery} autoFocus
                                                    placeholder="Type test name..."
                                                    onFocus={() => setShowAddSuggestions(true)}
                                                    onBlur={(e) => {
                                                        setTimeout(() => setShowAddSuggestions(false), 200);
                                                        handleAddTestFlow(e);
                                                    }}
                                                    onChange={(e) => { 
                                                        handleAutoResize(e); 
                                                        setAddQuery(e.target.value); 
                                                        setShowAddSuggestions(true); 
                                                    }} 
                                                    onKeyDown={handleAddTestFlow}
                                                />
                                                {showAddSuggestions && (
                                                    <div className="rx-dx-dropdown" style={{top: '100%', left: 0}}>
                                                        {addSuggestions.length > 0 ? (
                                                            addSuggestions.map(item => (
                                                                <div 
                                                                    key={item.id} 
                                                                    className={`rx-dx-option ${hasBengali(item.name) ? 'bengali-font' : 'english-font'}`}
                                                                    style={{ textTransform: 'none' }}
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault(); 
                                                                        handleSelectNewTest(item);
                                                                    }}
                                                                >
                                                                    <FaFlask className="me-2 text-luna-mid opacity-50" size={12} />
                                                                    <HighlightMatch text={item.name} query={addQuery} />
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="rx-dx-option text-muted" style={{fontStyle: 'italic', textTransform: 'none'}}>
                                                                No matches found
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="w-100 d-flex align-items-center justify-content-between p-2" onClick={() => setAddStep(1)} style={{cursor: 'pointer', minHeight: '42px'}}>
                                                <div className={`${hasBengali(addQuery) ? 'bengali-font' : 'english-font'}`} style={{fontSize: '0.9rem', color: 'var(--luna-navy)', paddingLeft: '6px'}}>
                                                    <FaFlask className="me-2 text-luna-mid" size={12} /> {addQuery}
                                                </div>
                                                <FaPen className="text-muted me-2" size={12} />
                                            </div>
                                        )}
                                    </div>
                                </Col>

                                <Col md={3}>
                                    <label className="form-label fw-bold" style={{fontSize: '0.75rem', color: 'var(--luna-mid)'}}>Price (৳)</label>
                                    <input 
                                        type="number" 
                                        className="form-control fw-bold text-center bg-white" 
                                        placeholder="0.00"
                                        value={newPrice}
                                        onChange={(e) => setNewPrice(e.target.value)}
                                        style={{height: '42px', fontSize: '1rem', borderRadius: '8px', borderColor: '#B2EBF2', color: 'var(--luna-navy)'}}
                                    />
                                </Col>

                                <Col md={3} className="d-flex align-items-end">
                                    <button 
                                        className="btn w-100 fw-bold d-flex align-items-center justify-content-center gap-2"
                                        onClick={handleAddTest}
                                        disabled={!selectedNewTestId || !newPrice || adding}
                                        style={{height: '42px', background: 'linear-gradient(135deg, #0277BD 0%, #01579B 100%)', color: 'white', borderRadius: '8px', border: 'none', fontSize: '0.9rem'}}
                                    >
                                        {adding ? <div className="spinner-border spinner-border-sm"></div> : <><FaCheckCircle /> Save Test</>}
                                    </button>
                                </Col>
                            </Row>
                        </div>
                    )}

                    {/* --- MAIN TABLE --- */}
                    <div className="rx-master-wrapper p-0" style={{overflow: 'hidden'}}>
                        {loading ? (
                            <div className="text-center py-5">
                                <div className="custom-spinner mx-auto mb-3"></div>
                                <h6 style={{color: 'var(--luna-mid)', fontFamily: 'Google Sans'}}>Loading Catalog...</h6>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="plain-table w-100 mb-0" style={{borderSpacing: 0}}>
                                    <thead style={{background: '#F0F9FF'}}>
                                        <tr>
                                            <th className="text-center py-3" style={{width: '10%', borderBottom: '2px solid #E1F5FE'}}>ID</th>
                                            <th className="text-start py-3" style={{width: '50%', borderBottom: '2px solid #E1F5FE', paddingLeft: '20px'}}>Test Name</th>
                                            <th className="text-center py-3" style={{width: '20%', borderBottom: '2px solid #E1F5FE'}}>Price</th>
                                            <th className="text-center py-3" style={{width: '20%', borderBottom: '2px solid #E1F5FE'}}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTableTests.length > 0 ? (
                                            filteredTableTests.map((test, index) => (
                                                <tr key={test.id} style={{borderBottom: index === filteredTableTests.length - 1 ? 'none' : '1px solid #F1F5F9', background: 'white'}}>
                                                    
                                                    <td className="text-center align-middle py-3">
                                                        <span className="badge bg-light text-muted border" style={{fontFamily: "'Inter', monospace", fontSize: '0.75rem'}}>
                                                            #{String(test.test_id).padStart(4, '0')}
                                                        </span>
                                                    </td>
                                                    
                                                    <td className="align-middle py-3" style={{paddingLeft: '20px'}}>
                                                        <div className={`fw-semibold ${hasBengali(test.test_name) ? 'bengali-font' : 'english-font'} ${test.is_available === false ? 'text-decoration-line-through text-muted' : ''}`} style={{color: 'var(--luna-navy)', fontSize: '0.95rem'}}>
                                                            <FaFlask className="me-2 opacity-50" size={12} color="var(--luna-mid)"/>
                                                            {test.test_name}
                                                        </div>
                                                    </td>
                                                    
                                                    <td className="text-center align-middle py-3">
                                                        <span className="fw-bold" style={{fontFamily: "'Google Sans', sans-serif", fontSize: '1.05rem', color: test.is_available === false ? '#90A4AE' : '#2E7D32'}}>
                                                            <span style={{fontSize: '0.8rem', marginRight: '2px'}}>৳</span>
                                                            {parseFloat(test.price).toFixed(2)}
                                                        </span>
                                                    </td>
                                                    
                                                    <td className="text-center align-middle py-3">
                                                        <div className="d-flex justify-content-center gap-2">
                                                            <button 
                                                                className="btn btn-sm btn-light border d-flex align-items-center justify-content-center" 
                                                                style={{width: '32px', height: '32px', borderRadius: '8px', color: '#0277BD'}}
                                                                onClick={() => handleEditTest(test)}
                                                                title="Edit Price & Availability"
                                                            >
                                                                <FaPen size={12} />
                                                            </button>
                                                            <button 
                                                                className="btn btn-sm btn-light border d-flex align-items-center justify-content-center" 
                                                                style={{width: '32px', height: '32px', borderRadius: '8px', color: '#C62828', borderColor: '#FFCDD2'}}
                                                                onClick={() => handleDeleteTest(test)}
                                                                title="Remove Test"
                                                            >
                                                                <FaTrash size={12} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="4" className="text-center py-5">
                                                    <FaFlask size={40} style={{opacity: 0.2}} className="mb-3 text-muted" />
                                                    <h5 style={{fontFamily: "'Google Sans', sans-serif", color: 'var(--luna-navy)'}}>No tests found</h5>
                                                    <p className="text-muted mb-0" style={{fontSize: '0.85rem'}}>Try adjusting your filter or add a new test.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                </Col>
            </Row>
        </Container>
    );
};

export default LabAvailableTests;