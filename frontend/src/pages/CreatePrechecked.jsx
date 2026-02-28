import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form } from 'react-bootstrap';
import { FaHeartbeat, FaArrowLeft, FaCheckCircle, FaPen, FaCheck, FaTimes } from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { prescriptionAPI, appointmentAPI } from '../api/api';

const CreatePrechecked = () => {
    const navigate = useNavigate();
    const { id } = useParams(); 

    // --- State Management ---
    const [hasExistingData, setHasExistingData] = useState(false);
    const [isEditing, setIsEditing] = useState(true); // Defaults true for new, turns false if data exists
    
    // Snapshots for canceling edits and calculating PATCH diffs
    const [initialFormData, setInitialFormData] = useState({});
    const [initialPayload, setInitialPayload] = useState({});

    const [formData, setFormData] = useState({
        bpSys: '', bpDia: '', bpUnit: 'mmHg',
        pulse: '', pulseUnit: 'bpm',
        weight: '', weightUnit: 'kg',
        height: '', heightUnit: 'cm',
        temperature: '', temperatureUnit: 'F',
        spo2: '', spo2Unit: '%',
        rbs: '', rbsUnit: 'mg/dl',
        bmi: '',
        bmr: '',
        family_disease_history: '',
        
        heartSelect: 'Normal', heartComment: '',
        lungsSelect: 'Clear', lungsComment: '',
        abdSelect: 'Soft', abdComment: '',
        
        anemia: 'No',
        jaundice: 'No',
        cyanosis: 'No'
    });

    // --- Fetch Existing Data ---
    useEffect(() => {
        if (id) {
            prescriptionAPI.getPrecheckedByAppointment(id)
                .then(res => {
                    const dataArray = res.data;
                    
                    if (dataArray && dataArray.length > 0) {
                        setHasExistingData(true);
                        setIsEditing(false); // Lock the form since data exists
                        
                        // Extract highest ID
                        const latestExisting = dataArray.reduce((prev, current) => 
                            (prev.id > current.id) ? prev : current
                        );
                        
                        // Parse Helpers
                        const parseValAndUnit = (str, defaultUnit) => {
                            if (!str) return { val: '', unit: defaultUnit };
                            const parts = str.split(' ');
                            return { val: parts[0] || '', unit: parts[1] || defaultUnit };
                        };

                        const parseObservation = (str, defaultSelect) => {
                            if (!str) return { select: defaultSelect, comment: '' };
                            const match = str.match(/\[(.*?)\](?:\[(.*?)\])?/);
                            if (match) return { select: match[1], comment: match[2] || '' };
                            return { select: defaultSelect, comment: '' };
                        };

                        const bpParts = latestExisting.bp ? parseValAndUnit(latestExisting.bp, 'mmHg') : { val: '' };
                        const [bpS, bpD] = bpParts.val.split('/');

                        const populatedForm = {
                            bpSys: bpS || '', bpDia: bpD || '', bpUnit: bpParts.unit || 'mmHg',
                            pulse: parseValAndUnit(latestExisting.pulse, 'bpm').val, pulseUnit: parseValAndUnit(latestExisting.pulse, 'bpm').unit,
                            weight: parseValAndUnit(latestExisting.weight, 'kg').val, weightUnit: parseValAndUnit(latestExisting.weight, 'kg').unit,
                            height: parseValAndUnit(latestExisting.height, 'cm').val, heightUnit: parseValAndUnit(latestExisting.height, 'cm').unit,
                            temperature: parseValAndUnit(latestExisting.temperature, 'F').val, temperatureUnit: parseValAndUnit(latestExisting.temperature, 'F').unit,
                            spo2: parseValAndUnit(latestExisting.spo2, '%').val, spo2Unit: parseValAndUnit(latestExisting.spo2, '%').unit,
                            rbs: parseValAndUnit(latestExisting.rbs, 'mg/dl').val, rbsUnit: parseValAndUnit(latestExisting.rbs, 'mg/dl').unit,
                            bmi: latestExisting.bmi || '',
                            bmr: latestExisting.bmr || '',
                            family_disease_history: latestExisting.family_disease_history || '',
                            
                            heartSelect: parseObservation(latestExisting.heart, 'Normal').select, heartComment: parseObservation(latestExisting.heart, 'Normal').comment,
                            lungsSelect: parseObservation(latestExisting.lungs, 'Clear').select, lungsComment: parseObservation(latestExisting.lungs, 'Clear').comment,
                            abdSelect: parseObservation(latestExisting.abd, 'Soft').select, abdComment: parseObservation(latestExisting.abd, 'Soft').comment,
                            
                            anemia: latestExisting.anemia || 'No',
                            jaundice: latestExisting.jaundice || 'No',
                            cyanosis: latestExisting.cyanosis || 'No'
                        };

                        // Save states
                        setFormData(populatedForm);
                        setInitialFormData(populatedForm);
                        setInitialPayload({
                            bp: latestExisting.bp, pulse: latestExisting.pulse, weight: latestExisting.weight,
                            height: latestExisting.height, temperature: latestExisting.temperature, spo2: latestExisting.spo2,
                            rbs: latestExisting.rbs, bmi: latestExisting.bmi, bmr: latestExisting.bmr,
                            family_disease_history: latestExisting.family_disease_history,
                            heart: latestExisting.heart, lungs: latestExisting.lungs, abd: latestExisting.abd,
                            anemia: latestExisting.anemia, jaundice: latestExisting.jaundice, cyanosis: latestExisting.cyanosis
                        });
                    }
                })
                .catch(err => console.error("Could not fetch existing precheck data:", err));
        }
    }, [id]);

    // --- Input Handlers ---
    const handleInputChange = (e) => {
        if (!isEditing) return;
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUnitSelect = (field, unit) => {
        if (!isEditing) return;
        setFormData(prev => ({ ...prev, [`${field}Unit`]: unit }));
    };

    const handleToggle = (field, val) => {
        if (!isEditing) return;
        setFormData(prev => ({ ...prev, [field]: val }));
    };

    const handleCancelEdit = () => {
        setFormData(initialFormData); // Revert to snapshot
        setIsEditing(false);
    };

    // --- Payload Generator ---
    const generatePayload = () => {
        const valOrNull = (val) => (val && val.toString().trim() !== '' ? val : null);
        return {
            bp: (formData.bpSys && formData.bpDia) ? `${formData.bpSys}/${formData.bpDia} ${formData.bpUnit}` : null,
            pulse: valOrNull(formData.pulse) ? `${formData.pulse} ${formData.pulseUnit}` : null,
            weight: valOrNull(formData.weight) ? `${formData.weight} ${formData.weightUnit}` : null,
            height: valOrNull(formData.height) ? `${formData.height} ${formData.heightUnit}` : null,
            temperature: valOrNull(formData.temperature) ? `${formData.temperature} ${formData.temperatureUnit}` : null,
            spo2: valOrNull(formData.spo2) ? `${formData.spo2} ${formData.spo2Unit}` : null,
            rbs: valOrNull(formData.rbs) ? `${formData.rbs} ${formData.rbsUnit}` : null,
            bmi: valOrNull(formData.bmi),
            bmr: valOrNull(formData.bmr),
            family_disease_history: valOrNull(formData.family_disease_history),
            
            heart: `[${formData.heartSelect}]${formData.heartComment ? `[${formData.heartComment}]` : ''}`,
            lungs: `[${formData.lungsSelect}]${formData.lungsComment ? `[${formData.lungsComment}]` : ''}`,
            abd: `[${formData.abdSelect}]${formData.abdComment ? `[${formData.abdComment}]` : ''}`,
            
            anemia: formData.anemia,
            jaundice: formData.jaundice,
            cyanosis: formData.cyanosis,
        };
    };

    // --- SUBMIT (CREATE NEW) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            ...generatePayload(),
            appointment: id ? parseInt(id) : null,
            prescription_id: null
        };

        try {
            await prescriptionAPI.createPrechecked(payload);
            if (id) {
                await appointmentAPI.updateAppointment(id, { status: 4 }); // Change status to Prechecked
            }

            Swal.fire({
                icon: 'success', title: 'Saved',
                html: '<div class="swal-modern-text" style="margin-top:-10px">Precheck data saved successfully.</div>',
                showConfirmButton: false, timer: 1500,
                customClass: { popup: 'swal-modern-popup', title: 'swal-modern-title' }
            });
            navigate(-1);
        } catch (error) {
            console.error("Error saving precheck:", error);
            Swal.fire('Error', 'Failed to save precheck data.', 'error');
        }
    };

    // --- UPDATE (PATCH EXISTING) ---
    const handleUpdate = async () => {
        const currentPayload = generatePayload();
        const patchData = {};
        
        // Find only the fields that were modified
        Object.keys(currentPayload).forEach(key => {
            if (currentPayload[key] !== initialPayload[key]) {
                patchData[key] = currentPayload[key];
            }
        });

        if (Object.keys(patchData).length === 0) {
            setIsEditing(false); // No changes made
            return;
        }

        try {
            await prescriptionAPI.updatePrechecked(id, patchData);
            
            Swal.fire({
                icon: 'success', title: 'Updated',
                html: '<div class="swal-modern-text" style="margin-top:-10px">Precheck data updated successfully.</div>',
                showConfirmButton: false, timer: 1500,
                customClass: { popup: 'swal-modern-popup', title: 'swal-modern-title' }
            });
            
            // Sync local snapshots with new data
            setInitialPayload({ ...initialPayload, ...patchData });
            setInitialFormData({ ...formData });
            setIsEditing(false);
        } catch (error) {
            console.error("Update failed:", error);
            Swal.fire('Error', 'Failed to update precheck data.', 'error');
        }
    };

    // --- Reusable UI Blocks (Locked down via pointers when !isEditing) ---
    const blockStyle = { pointerEvents: isEditing ? 'auto' : 'none', opacity: isEditing ? 1 : 0.85 };

    const renderUnitInput = (label, name, placeholder, units, type = "text") => (
        <Form.Group className="mb-custom">
            <Form.Label className="form-label">{label}</Form.Label>
            <div className="input-with-units" style={blockStyle}>
                <Form.Control 
                    type={type} 
                    name={name} 
                    value={formData[name]} 
                    onChange={handleInputChange} 
                    placeholder={placeholder}
                    className="unit-input-field"
                    disabled={!isEditing}
                />
                <div className="unit-selectors">
                    {units.map(unit => (
                        <div 
                            key={unit} 
                            className={`unit-pill ${formData[`${name}Unit`] === unit ? 'active' : ''}`}
                            onClick={() => handleUnitSelect(name, unit)}
                        >
                            {unit}
                        </div>
                    ))}
                </div>
            </div>
        </Form.Group>
    );

    const renderObservation = (label, fieldPrefix, options) => (
        <Form.Group className="mb-custom">
            <Form.Label className="form-label">{label}</Form.Label>
            <div className="observation-container" style={blockStyle}>
                <div className="observation-options">
                    {options.map(opt => (
                        <div 
                            key={opt} 
                            className={`obs-pill ${formData[`${fieldPrefix}Select`] === opt ? 'active' : ''}`}
                            onClick={() => handleToggle(`${fieldPrefix}Select`, opt)}
                        >
                            {opt}
                        </div>
                    ))}
                </div>
                <Form.Control 
                    type="text" 
                    name={`${fieldPrefix}Comment`} 
                    value={formData[`${fieldPrefix}Comment`]} 
                    onChange={handleInputChange} 
                    placeholder="Optional details or comments..."
                    className="mt-2 text-sm form-control"
                    disabled={!isEditing}
                />
            </div>
        </Form.Group>
    );

    const renderBinaryToggle = (label, name) => (
        <Form.Group className="mb-custom">
            <Form.Label className="form-label d-block">{label}</Form.Label>
            <div className="binary-toggle-group" style={blockStyle}>
                {['Yes', 'No'].map(opt => (
                    <div 
                        key={opt} 
                        className={`binary-pill ${opt === 'Yes' ? 'pill-yes' : 'pill-no'} ${formData[name] === opt ? 'active' : ''}`}
                        onClick={() => handleToggle(name, opt)}
                    >
                        {opt}
                    </div>
                ))}
            </div>
        </Form.Group>
    );

    return (
        <Container className="pb-5 pt-4">
            <Row className="justify-content-center">
                <Col md={10} lg={8}>
                    
                    {/* --- HEADER & TOP ACTIONS --- */}
                    <div className="d-flex align-items-center justify-content-between mb-4">
                        <div className="d-flex align-items-center">
                            <button className="back-btn-circle me-3" onClick={() => navigate(-1)} title="Go Back">
                                <FaArrowLeft size={14} />
                            </button>
                            <div>
                                <h3 className="form-title mb-0">Patient Precheck</h3>
                                <p className="text-luna-mid font-body small mb-0">Record vitals and preliminary observations</p>
                            </div>
                        </div>

                        {/* Top Right Icons (Only show if data exists) */}
                        {hasExistingData && (
                            <div className="profile-actions-float position-relative top-0 right-0">
                                {isEditing ? (
                                    <>
                                        <div className="action-btn-circle save-btn" onClick={handleUpdate} title="Save Changes">
                                            <FaCheck size={16} />
                                        </div>
                                        <div className="action-btn-circle cancel-btn" onClick={handleCancelEdit} title="Cancel">
                                            <FaTimes size={16} />
                                        </div>
                                    </>
                                ) : (
                                    <div className="action-btn-circle" onClick={() => setIsEditing(true)} title="Edit Precheck">
                                        <FaPen size={14} />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* --- FORM CARD --- */}
                    <Card className="glass-card card-dynamic border-0 p-3">
                        <Card.Body>
                            <Form onSubmit={handleSubmit}>
                                
                                <h4 className="step-title mb-3 d-flex align-items-center gap-2">
                                    <FaHeartbeat className="text-luna-light" /> Vitals
                                </h4>
                                
                                {/* Row 1: BP, Pulse, Weight */}
                                <Row className="g-3">
                                    <Col md={4}>
                                        <Form.Group className="mb-custom">
                                            <Form.Label className="form-label">Blood Pressure</Form.Label>
                                            <div className="input-with-units" style={blockStyle}>
                                                <div className="d-flex align-items-center w-100 gap-1">
                                                    <Form.Control type="number" name="bpSys" placeholder="Sys" value={formData.bpSys} onChange={handleInputChange} disabled={!isEditing} className="unit-input-field text-center px-1" />
                                                    <span className="text-luna-mid fw-bold">/</span>
                                                    <Form.Control type="number" name="bpDia" placeholder="Dia" value={formData.bpDia} onChange={handleInputChange} disabled={!isEditing} className="unit-input-field text-center px-1" />
                                                </div>
                                                <div className="unit-selectors ps-1">
                                                    <div className="unit-pill active">mmHg</div>
                                                </div>
                                            </div>
                                        </Form.Group>
                                    </Col>
                                    <Col md={4}>{renderUnitInput("Pulse", "pulse", "e.g., 78", ["bpm"])}</Col>
                                    <Col md={4}>{renderUnitInput("Weight", "weight", "e.g., 65", ["kg", "lbs"])}</Col>
                                </Row>

                                {/* Row 2: Height, Temp, SpO2 */}
                                <Row className="g-3 mt-1">
                                    <Col md={4}>{renderUnitInput("Height", "height", "e.g., 170", ["cm", "ft"])}</Col>
                                    <Col md={4}>{renderUnitInput("Temperature", "temperature", "e.g., 98.6", ["F", "C"])}</Col>
                                    <Col md={4}>{renderUnitInput("SpO2", "spo2", "e.g., 98", ["%"])}</Col>
                                </Row>

                                {/* Row 3: RBS, BMI, BMR */}
                                <Row className="g-3 mt-1">
                                    <Col md={4}>{renderUnitInput("RBS", "rbs", "e.g., 110", ["mg/dl", "mmol"])}</Col>
                                    <Col md={4}>
                                        <Form.Group className="mb-custom">
                                            <Form.Label className="form-label">BMI</Form.Label>
                                            <Form.Control type="number" name="bmi" value={formData.bmi} onChange={handleInputChange} disabled={!isEditing} placeholder="e.g., 22.5" />
                                        </Form.Group>
                                    </Col>
                                    <Col md={4}>
                                        <Form.Group className="mb-custom">
                                            <Form.Label className="form-label">BMR</Form.Label>
                                            <Form.Control type="number" name="bmr" value={formData.bmr} onChange={handleInputChange} disabled={!isEditing} placeholder="e.g., 1500" />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <div className="section-divider my-4"></div>

                                {/* --- EXAMINATIONS SECTION --- */}
                                <h4 className="step-title mb-3">Systemic & General Examination</h4>
                                <Row className="g-3">
                                    <Col md={12}>{renderObservation("Heart", "heart", ["Normal", "Murmur", "Tachycardia", "Bradycardia"])}</Col>
                                    <Col md={12}>{renderObservation("Lungs", "lungs", ["Clear", "Wheeze", "Crepitations", "Decreased Sounds"])}</Col>
                                    <Col md={12}>{renderObservation("Abdomen", "abd", ["Soft", "Tender", "Distended", "Mass Felt"])}</Col>
                                </Row>

                                <Row className="g-3 mt-2">
                                    <Col md={4}>{renderBinaryToggle("Anemia", "anemia")}</Col>
                                    <Col md={4}>{renderBinaryToggle("Jaundice", "jaundice")}</Col>
                                    <Col md={4}>{renderBinaryToggle("Cyanosis", "cyanosis")}</Col>
                                </Row>

                                <div className="section-divider my-4"></div>

                                {/* --- HISTORY SECTION --- */}
                                <h4 className="step-title mb-3">History</h4>
                                <Row>
                                    <Col md={12}>
                                        <Form.Group className="mb-custom">
                                            <Form.Label className="form-label">Family Disease History</Form.Label>
                                            <Form.Control 
                                                as="textarea" 
                                                rows={2}
                                                name="family_disease_history" 
                                                value={formData.family_disease_history} 
                                                onChange={handleInputChange} 
                                                disabled={!isEditing}
                                                placeholder="e.g., Diabetes, Hypertension..." 
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                {/* Only show bottom SAVE button if creating a new precheck */}
                                {!hasExistingData && (
                                    <div className="mt-4 d-flex justify-content-end">
                                        <button 
                                            type="submit" 
                                            className="btn-modern d-flex align-items-center justify-content-center gap-2" 
                                            style={{ padding: '6px 20px', fontSize: '0.85rem', borderRadius: '50px' }}
                                        >
                                            <FaCheckCircle size={14} /> SAVE
                                        </button>
                                    </div>
                                )}

                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default CreatePrechecked;