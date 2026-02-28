import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { 
    FaArrowLeft, FaTimes, FaPlus, FaStethoscope, 
    FaClipboardList, FaPen, FaPrint, FaSave, FaNotesMedical, FaCheck, FaCalendarAlt
} from 'react-icons/fa';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';

// --- API IMPORTS ---
import { prescriptionAPI, patientAPI, appointmentAPI, doctorAPI, coreAPI, diseaseAPI } from '../api/api';

// --- DICTIONARY IMPORTS ---
import { fetchDoses } from '../data/doses'; 
import { fetchInstructions, commonInstructions } from '../data/instructions';
import { fetchDurations, commonDurations } from '../data/durations';
import { fetchSymptoms } from '../data/symptoms';

import { convertToBengali as convertDoseToBengali } from '../data/dictionaryDose'; 
import { convertToBengali as convertInstToBengali } from '../data/dictionaryInstructions'; 
import { convertToBengaliDuration, convertDurationToEnglishInt } from '../data/dictionaryDurations'; 

// --- UTILITIES ---
const escapeRegex = (string) => {
    if (typeof string !== 'string') return '';
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const hasBengali = (text) => {
    return /[\u0980-\u09FF]/.test(text || '');
};

const intToBengaliDuration = (intVal) => {
    if (!intVal) return '';
    const engToBenMap = { '0':'০', '1':'১', '2':'২', '3':'৩', '4':'৪', '5':'৫', '6':'৬', '7':'৭', '8':'৮', '9':'৯' };
    const benNum = String(intVal).replace(/[0-9]/g, d => engToBenMap[d] || d);
    return `${benNum} দিন`;
};

const calculateAge = (dob) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
};

// --- HELPER COMPONENT FOR HIGHLIGHTING TEXT ---
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
                        ? <strong key={i} className="rx-highlight-match">{part}</strong> 
                        : <span key={i}>{part}</span>
                )}
            </span>
        );
    } catch (e) {
        return <span>{text}</span>;
    }
};

// ==========================================
// MAIN COMPONENT
// ==========================================
const ViewPrescription = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id: prescriptionId } = useParams(); 

    // Extract role from location state or fallback to local storage
    const userRole = location.state?.role || JSON.parse(localStorage.getItem('user'))?.role;
    const isDoctor = userRole === 'doctor';

    // --- UI STATE ---
    const [isLoading, setIsLoading] = useState(true);
    const [isEditingRx, setIsEditingRx] = useState(false); 

    // --- CORE DATA STATE ---
    const [patientData, setPatientData] = useState(null);
    const [apptId, setApptId] = useState(null);

    // --- PRESCRIPTION STATE ---
    const [conditions, setConditions] = useState([]);
    const [complaints, setComplaints] = useState([]);
    const [medicines, setMedicines] = useState([]);
    const [labTests, setLabTests] = useState([]);
    const [showLabTests, setShowLabTests] = useState(false);
    const [advices, setAdvices] = useState([]); 

    const [nextVisitOption, setNextVisitOption] = useState('none');
    const [nextVisitNumber, setNextVisitNumber] = useState('');
    const [nextVisitUnit, setNextVisitUnit] = useState('দিন');

    // --- PRECHECKED STATE ---
    const [precheckId, setPrecheckId] = useState(null);
    const [hasPrecheck, setHasPrecheck] = useState(false);
    const [isEditingPrecheck, setIsEditingPrecheck] = useState(false);
    const [precheckFields, setPrecheckFields] = useState([
        { key: 'bp', label: 'BP', value: '', unit: 'mmHg' },
        { key: 'pulse', label: 'Pulse', value: '', unit: 'b/min' },
        { key: 'temperature', label: 'Temp', value: '', unit: 'F' },
        { key: 'spo2', label: 'SpO2', value: '', unit: '%' },
        { key: 'weight', label: 'Weight', value: '', unit: 'kg' },
        { key: 'rbs', label: 'RBS', value: '', unit: 'mg/dl' },
        { key: 'bmi', label: 'BMI', value: '', unit: '' },
        { key: 'bmr', label: 'BMR', value: '', unit: '' },
        { key: 'family_disease_history', label: 'Fam. History', value: '', unit: '' },
        { key: 'heart', label: 'Heart', value: '', unit: '' },
        { key: 'lungs', label: 'Lungs', value: '', unit: '' },
        { key: 'abd', label: 'Abd', value: '', unit: '' },
        { key: 'anemia', label: 'Anaemia', value: '', unit: '' },
        { key: 'jaundice', label: 'Jaundice', value: '', unit: '' },
        { key: 'cyanosis', label: 'Cyanosis', value: '', unit: '' }
    ]);

    // --- DROPDOWNS & AUTOCOMPLETE STATE ---
    const [medicalConditionsList, setMedicalConditionsList] = useState([]);
    const [symptomsList, setSymptomsList] = useState([]);
    const [genericList, setGenericList] = useState([]);
    const [medicinesCache, setMedicinesCache] = useState({});
    const [testsList, setTestsList] = useState([]);
    const [dosesList, setDosesList] = useState([]);
    const [instructionsList, setInstructionsList] = useState(commonInstructions || []);
    const [durationsList, setDurationsList] = useState(commonDurations || []);

    const [activeDxId, setActiveDxId] = useState(null);
    const [activeCcId, setActiveCcId] = useState(null);
    const [activeGenericId, setActiveGenericId] = useState(null);
    const [activeMedicineId, setActiveMedicineId] = useState(null);
    const [activeDoseId, setActiveDoseId] = useState(null);
    const [activeInstId, setActiveInstId] = useState(null);
    const [activeDurId, setActiveDurId] = useState(null);
    const [activeTestId, setActiveTestId] = useState(null);

    const parseAdvice = (rawName) => {
        let category = "অন্যান্য";
        let text = rawName; 
        if (rawName && rawName.includes(':')) {
            const parts = rawName.split(':');
            category = parts[0].trim();
            text = parts.slice(1).join(':').trim(); 
        }
        return { category, text };
    };

    // --- MASTER FETCH LOGIC ---
    useEffect(() => {
        const fetchMasterData = async () => {
            try {
                const safeExtract = (data) => Array.isArray(data) ? data : (data?.results || []);

                // 1. STRICT AWAIT for all background dictionaries so search never fails
                const [condRes, testsRes, sympRes, doseRes, genRes] = await Promise.all([
                    diseaseAPI.getMedicalConditions().catch(() => ({ data: [] })),
                    coreAPI.getTests().catch(() => ({ data: [] })),
                    typeof fetchSymptoms === 'function' ? fetchSymptoms().catch(() => []) : Promise.resolve([]),
                    fetchDoses().catch(() => []),
                    coreAPI.getMedicineGenerics().catch(() => ({ data: [] }))
                ]);
                
                setMedicalConditionsList(safeExtract(condRes.data));
                setTestsList(safeExtract(testsRes.data));
                setSymptomsList(Array.isArray(sympRes) ? sympRes : []);
                setDosesList(Array.isArray(doseRes) ? doseRes : []);
                setGenericList(safeExtract(genRes.data));

                // 2. Fetch Prescription
                const rxRes = await prescriptionAPI.getPrescription(prescriptionId);
                const rxData = rxRes.data;
                const fetchedApptId = rxData.appointment;
                setApptId(fetchedApptId);

                // 3. Fetch Appointment & Patient Data Safely
                let apptData = {};
                if (fetchedApptId) {
                    try {
                        const apptRes = await appointmentAPI.getAppointmentInfo(fetchedApptId);
                        apptData = apptRes.data || {};
                    } catch (e) { console.warn("Failed to fetch appt info", e); }
                }

                let pId = location.state?.patientId || apptData.patient_id || apptData.patient; 
                if (pId) {
                    try {
                        const patRes = await patientAPI.getPatientDetails({ type: 'patient_id', id: pId });
                        setPatientData(patRes.data);
                    } catch (e) { console.warn("Failed to fetch patient data", e); }
                }

                // 4. Safely Fetch Advices
                let initialAdvices = [];
                if (apptData.doctor_id) {
                    try {
                        const docRes = await doctorAPI.getDoctorDetails({ type: 'doctor_id', id: apptData.doctor_id });
                        const adviceRes = await coreAPI.getDoctorAdvices(docRes.data.department_id);
                        initialAdvices = safeExtract(adviceRes.data).map(adv => ({ id: adv.id, ...parseAdvice(adv.name), selected: false }));
                    } catch (e) { console.warn("Failed to fetch advices", e); }
                }

                // -------------------------------------
                // DATA PARSING
                // -------------------------------------
                
                // Parse DX
                if (rxData.dx) {
                    const dxMatches = [...rxData.dx.matchAll(/\[(.*?)\]/g)].map(m => m[1]);
                    if (dxMatches.length > 0) {
                        setConditions(dxMatches.map((text, i) => ({ id: i + 1, text: text || '' })));
                    } else setConditions([{ id: 1, text: '' }]);
                } else setConditions([{ id: 1, text: '' }]);

                // Parse CC
                if (rxData.cc) {
                    const ccMatches = [...rxData.cc.matchAll(/\[(.*?)\]/g)].map(m => m[1]);
                    if (ccMatches.length > 0) {
                        setComplaints(ccMatches.map((str, i) => {
                            const [symp, durPart] = str.split(' - ');
                            let dur = '', mod = 'D';
                            if (durPart) {
                                const [dVal, dMod] = durPart.trim().split(' ');
                                dur = dVal || ''; mod = dMod || 'D';
                            }
                            return { id: i + 1, symptom: symp?.trim() || '', duration: dur, modifier: mod };
                        }));
                    } else setComplaints([{ id: 1, symptom: '', duration: '', modifier: 'D' }]);
                } else setComplaints([{ id: 1, symptom: '', duration: '', modifier: 'D' }]);

                // Parse Medicines
                if (rxData.medicines && rxData.medicines.length > 0) {
                    setMedicines(rxData.medicines.map((m, i) => {
                        const parts = [...(m.uses_process || '').matchAll(/\[(.*?)\]/g)].map(match => match[1]);
                        return {
                            id: i + 1,
                            generic: parts[0] || m.generic_name || '',
                            genericId: null, 
                            medicineName: m.medicine_name || '',
                            medicineId: m.medicine, 
                            dose: parts[1] || '',
                            instruction: parts[2] || '',
                            duration: intToBengaliDuration(m.duration), 
                            step: 3 
                        };
                    }));
                } else setMedicines([{ id: 1, generic: '', genericId: null, medicineName: '', medicineId: null, dose: '', instruction: '', duration: '', step: 1 }]);

                // Parse Tests
                if (rxData.tests && rxData.tests.length > 0) {
                    setShowLabTests(true);
                    setLabTests(rxData.tests.map((t, i) => ({
                        id: i + 1, test: t.test_name || '', testId: t.test, step: 2
                    })));
                } else setLabTests([{ id: 1, test: '', testId: null, step: 1 }]);

                // Parse Checked Advices
                if (rxData.suggestions && initialAdvices.length > 0) {
                    initialAdvices = initialAdvices.map(a => {
                        const isSelected = rxData.suggestions.includes(`[${a.category}: ${a.text}]`) || rxData.suggestions.includes(`[${a.category}:${a.text}]`);
                        return { ...a, selected: isSelected };
                    });
                }
                setAdvices(initialAdvices);

                // Parse Next Visit
                if (rxData.next_visit) {
                    if (rxData.next_visit.includes('প্রয়োজন নেই')) {
                        setNextVisitOption('none');
                    } else {
                        const match = rxData.next_visit.match(/পরবর্তী ([0-9০-৯]+) (দিন|মাস|সপ্তাহ)/);
                        if (match) {
                            setNextVisitOption('after');
                            setNextVisitNumber(match[1]);
                            setNextVisitUnit(match[2]);
                        }
                    }
                }

                // Parse Prechecked Data
                if (rxData.prechecked && rxData.prechecked_id && fetchedApptId) {
                    setHasPrecheck(true);
                    setPrecheckId(rxData.prechecked_id);
                    try {
                        const preRes = await prescriptionAPI.getPrecheckedByAppointment(fetchedApptId);
                        const precheckArray = safeExtract(preRes.data);
                        const targetPrecheck = precheckArray.find(p => p.id === rxData.prechecked_id) || precheckArray[0];

                        if (targetPrecheck) {
                            const parseVal = (str, key) => {
                                if (str === null || str === undefined) return '';
                                str = String(str);
                                if (str.includes('[')) return [...str.matchAll(/\[(.*?)\]/g)].map(m => m[1]).join(', ');
                                if (['bp', 'pulse', 'temperature', 'spo2', 'weight', 'rbs'].includes(key) && str.includes(' ')) return str.split(' ')[0]; 
                                return str;
                            };
                            setPrecheckFields(prev => prev.map(field => {
                                let rawValue = targetPrecheck[field.key];
                                if (field.key === 'anemia') rawValue = targetPrecheck.anemia; 
                                return { ...field, value: parseVal(rawValue, field.key) };
                            }));
                        }
                    } catch (e) { console.warn("Failed to fetch precheck data", e); }
                }

                setIsLoading(false);

            } catch (error) {
                console.error("FATAL: Failed to load core prescription data:", error);
                Swal.fire('Error', 'Could not load prescription data. Check console.', 'error');
                setIsLoading(false);
            }
        };

        if (prescriptionId) fetchMasterData();
    }, [prescriptionId, location.state]);

    // --- AUTO-RESIZER ---
    useEffect(() => {
        setTimeout(() => {
            const textareas = document.querySelectorAll('textarea.rx-grid-input');
            textareas.forEach(t => {
                t.style.height = 'auto';
                t.style.height = t.scrollHeight + 'px';
            });
        }, 0);
    }, [conditions, complaints, medicines, labTests, precheckFields, hasPrecheck, isEditingPrecheck, showLabTests, advices, isEditingRx, isLoading]);

    // --- ARRAY HELPERS ---
    const updateArray = (setter, id, field, value) => setter(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    const addRow = (setter, emptyObj) => setter(prev => [...prev, { id: Date.now(), ...emptyObj }]);
    const removeRow = (setter, id) => setter(prev => prev.filter(item => item.id !== id));

    const cycleModifier = (id, currentVal) => {
        if (!isEditingRx) return;
        const nextVal = currentVal === 'D' ? 'M' : currentVal === 'M' ? 'Y' : 'D';
        updateArray(setComplaints, id, 'modifier', nextVal);
    };

    const getDmyClass = (val) => {
        if (!isEditingRx) return 'bg-light border text-muted shadow-none';
        if (val === 'D') return 'dmy-days';
        if (val === 'M') return 'dmy-months';
        return 'dmy-years';
    };

    const handleAutoResize = (e) => {
        const target = e.target || e;
        target.style.height = 'auto';
        target.style.height = target.scrollHeight + 'px';
    };

    // --- Autocomplete Fetchers ---
    const getFilteredConditions = (query, currentId) => {
        if (!query || !Array.isArray(medicalConditionsList)) return [];
        const q = query.toLowerCase().trim();
        const otherSelectedNames = conditions.filter(c => c.id !== currentId && c.text).map(c => c.text?.toLowerCase().trim() || '');
        const filtered = medicalConditionsList.filter(c => c?.name?.toLowerCase().includes(q) && !otherSelectedNames.includes(c.name.toLowerCase().trim()));
        return filtered.sort((a, b) => {
            const aStarts = a.name.toLowerCase().startsWith(q);
            const bStarts = b.name.toLowerCase().startsWith(q);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            return a.name.length - b.name.length || a.name.localeCompare(b.name);
        });
    };

    const getFilteredSymptoms = (query, currentId) => {
        if (!query || !Array.isArray(symptomsList)) return [];
        const q = query.toLowerCase().trim();
        const otherSelectedSymptoms = complaints.filter(c => c.id !== currentId && c.symptom).map(c => c.symptom?.toLowerCase().trim() || '');
        const filtered = symptomsList.filter(s => typeof s === 'string' && s.toLowerCase().includes(q) && !otherSelectedSymptoms.includes(s.toLowerCase().trim()));
        return filtered.sort((a, b) => {
            const aStarts = a.toLowerCase().startsWith(q);
            const bStarts = b.toLowerCase().startsWith(q);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            return a.length - b.length || a.localeCompare(b);
        });
    };

    const getFilteredTests = (query, currentId) => {
        if (!query || !Array.isArray(testsList)) return [];
        const q = query.toLowerCase().trim();
        const otherSelectedTests = labTests.filter(t => t.id !== currentId && t.test).map(t => t.test?.toLowerCase().trim() || '');
        const filtered = testsList.filter(t => t?.name?.toLowerCase().includes(q) && !otherSelectedTests.includes(t.name.toLowerCase().trim()));
        return filtered.sort((a, b) => {
            const aStarts = a.name.toLowerCase().startsWith(q);
            const bStarts = b.name.toLowerCase().startsWith(q);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            return a.name.length - b.name.length || a.name.localeCompare(b.name);
        });
    };

    const getFilteredGenerics = (query) => {
        if (!query || !Array.isArray(genericList)) return [];
        const q = query.toLowerCase().trim();
        const filtered = genericList.filter(g => g?.name?.toLowerCase().includes(q));
        return filtered.sort((a, b) => {
            const aStarts = a.name.toLowerCase().startsWith(q);
            const bStarts = b.name.toLowerCase().startsWith(q);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            return a.name.length - b.name.length || a.name.localeCompare(b.name);
        });
    };

    const getFilteredMedicines = (query, currentId, genericId) => {
        if (!query || !genericId || !medicinesCache[genericId] || !Array.isArray(medicinesCache[genericId])) return [];
        const q = query.toLowerCase().trim();
        const otherSelectedNames = medicines.filter(m => m.id !== currentId && m.medicineName).map(m => m.medicineName?.toLowerCase().trim() || '');
        const filtered = medicinesCache[genericId].filter(m => m?.name?.toLowerCase().includes(q) && !otherSelectedNames.includes(m.name.toLowerCase().trim()));
        return filtered.sort((a, b) => {
            const aStarts = a.name.toLowerCase().startsWith(q);
            const bStarts = b.name.toLowerCase().startsWith(q);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            return a.name.length - b.name.length || a.name.localeCompare(b.name);
        });
    };

    const getFilteredDoses = (query) => {
        if (!query || !Array.isArray(dosesList)) return [];
        const q = query.toLowerCase().trim(); 
        const filtered = dosesList.filter(d => typeof d === 'string' && d.toLowerCase().includes(q));
        return filtered.sort((a, b) => {
            const aPlus = a.includes('+');
            const bPlus = b.includes('+');
            if (aPlus && !bPlus) return -1;
            if (!aPlus && bPlus) return 1;
            const aStarts = a.toLowerCase().startsWith(q);
            const bStarts = b.toLowerCase().startsWith(q);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            return a.length - b.length || a.localeCompare(b);
        });
    };

    const getFilteredInstructions = (query) => {
        if (!query || !Array.isArray(instructionsList)) return [];
        const q = query.toLowerCase().trim();
        const filtered = instructionsList.filter(inst => typeof inst === 'string' && inst.toLowerCase().includes(q));
        return filtered.sort((a, b) => {
            const aShort = a.length <= 10;
            const bShort = b.length <= 10;
            if (aShort && !bShort) return -1;
            if (!aShort && bShort) return 1;
            const aStarts = a.toLowerCase().startsWith(q);
            const bStarts = b.toLowerCase().startsWith(q);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            return a.length - b.length || a.localeCompare(b);
        });
    };

    const getFilteredDurations = (query) => {
        if (!query || !Array.isArray(durationsList)) return [];
        const q = query.toLowerCase().trim();
        const filtered = durationsList.filter(dur => typeof dur === 'string' && dur.toLowerCase().includes(q));
        return filtered.sort((a, b) => {
            const aShort = a.length <= 10;
            const bShort = b.length <= 10;
            if (aShort && !bShort) return -1;
            if (!aShort && bShort) return 1;
            const aStarts = a.toLowerCase().startsWith(q);
            const bStarts = b.toLowerCase().startsWith(q);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            return a.length - b.length || a.localeCompare(b);
        });
    };

    // --- Complex Handlers ---
    const fetchMedicinesForGeneric = async (genericId) => {
        if (medicinesCache[genericId]) return; 
        try {
            const res = await coreAPI.getMedicinesByGeneric(genericId);
            setMedicinesCache(prev => ({ ...prev, [genericId]: Array.isArray(res.data) ? res.data : (res.data?.results || []) }));
        } catch (err) { console.error(err); }
    };

    const handleSelectGeneric = (medId, genericItem) => {
        setMedicines(prev => prev.map(m => m.id === medId ? { ...m, generic: genericItem.name, genericId: genericItem.id, medicineId: null, step: 2 } : m));
        setActiveGenericId(null);
        fetchMedicinesForGeneric(genericItem.id);
    };

    const handleSelectMedicineName = (medId, medicineItem) => {
        setMedicines(prev => prev.map(m => m.id === medId ? { ...m, medicineName: medicineItem.name, medicineId: medicineItem.id, step: 3 } : m));
        setActiveMedicineId(null);
    };

    const handleMedicineFlow = (id, currentStep, field, value, e) => {
        if (e.key === 'Enter' || e.type === 'blur') {
            if (value.trim() !== '') {
                if (currentStep === 1) {
                    const matchedGeneric = genericList.find(g => g?.name?.toLowerCase() === value.trim().toLowerCase());
                    if (matchedGeneric) {
                        fetchMedicinesForGeneric(matchedGeneric.id);
                        setMedicines(prev => prev.map(med => med.id === id ? { ...med, generic: matchedGeneric.name, genericId: matchedGeneric.id, medicineId: null, step: 2 } : med));
                        return; 
                    }
                } else if (currentStep === 2) {
                    const med = medicines.find(m => m.id === id);
                    const matchedMed = medicinesCache[med.genericId]?.find(m => m.name.toLowerCase() === value.trim().toLowerCase());
                    setMedicines(prev => prev.map(medItem => medItem.id === id ? { ...medItem, medicineName: value, medicineId: matchedMed ? matchedMed.id : null, step: 3 } : medItem));
                    return;
                }
                setMedicines(prev => prev.map(med => med.id === id ? { ...med, [field]: value, step: currentStep + 1 } : med));
            }
        } else {
            updateArray(setMedicines, id, field, value);
        }
    };

    const handleLabTestFlow = (id, value, e) => {
        if (e.key === 'Enter' || e.type === 'blur') {
            if (value.trim() !== '') {
                const matchedTest = testsList.find(apiTest => apiTest.name.toLowerCase() === value.trim().toLowerCase());
                setLabTests(prev => prev.map(t => t.id === id ? { ...t, test: value, testId: matchedTest ? matchedTest.id : null, step: 2 } : t));
                setActiveTestId(null);
            }
        }
    };

    const toggleAdvice = (id) => {
        if (!isEditingRx) return;
        setAdvices(prev => prev.map(a => a.id === id ? { ...a, selected: !a.selected } : a));
    };

    const toggleNextVisitUnit = (e) => { 
        if (!isEditingRx) return;
        e.stopPropagation(); 
        setNextVisitUnit(prev => prev === 'দিন' ? 'মাস' : 'দিন'); 
    };

    const handlePrecheckUpdate = (key, val) => setPrecheckFields(prev => prev.map(f => f.key === key ? { ...f, value: val } : f));

    const savePrecheck = async () => {
        const patchData = {};
        precheckFields.forEach(f => {
            if (f.value) {
                if (['bp', 'pulse', 'temperature', 'spo2', 'weight', 'rbs'].includes(f.key)) patchData[f.key] = `${f.value} ${f.unit}`;
                else if (['heart', 'lungs', 'abd'].includes(f.key)) patchData[f.key] = f.value.split(',').map(s => `[${s.trim()}]`).join('');
                else patchData[f.key] = f.value;
            }
        });
        try {
            await prescriptionAPI.updatePrechecked(apptId, patchData);
            setIsEditingPrecheck(false);
            Swal.fire({ icon: 'success', title: 'O/E Updated', toast: true, position: 'top-end', timer: 1500, showConfirmButton: false });
        } catch (error) { Swal.fire('Error', 'Failed to update precheck.', 'error'); }
    };

    // --- PATCH PRESCRIPTION ---
    const handleUpdate = async () => {
        try {
            const dxString = conditions.filter(c => c.text.trim()).map(c => `[${c.text.trim()}]`).join('');
            const ccString = complaints.filter(c => c.symptom.trim()).map(c => {
                const durStr = c.duration ? ` - ${c.duration} ${c.modifier}` : '';
                return `[${c.symptom.trim()}${durStr}]`;
            }).join('');
            const suggestionsString = advices.filter(a => a.selected).map(a => `[${a.category}: ${a.text}]`).join('');

            let nextVisitString = "";
            if (nextVisitOption === 'none') {
                nextVisitString = "প্রয়োজন নেই";
            } else if (nextVisitOption === 'after' && nextVisitNumber) {
                nextVisitString = `পরবর্তী ${nextVisitNumber} ${nextVisitUnit} পর আবার আসবেন।`;
            }

            const medicinesPayload = medicines
                .filter(m => m.medicineId) 
                .map(m => ({
                    medicine_id: parseInt(m.medicineId, 10),
                    uses_process: `[${m.generic || ''}][${m.dose || ''}][${m.instruction || ''}]`,
                    duration: convertDurationToEnglishInt(m.duration) || null 
                }));

            const testsPayload = labTests
                .filter(t => t.testId) 
                .map(t => ({ test_id: parseInt(t.testId, 10) }));

            const payload = {
                dx: dxString,
                cc: ccString,
                suggestions: suggestionsString,
                next_visit: nextVisitString,
                medicines: medicinesPayload,
                tests: testsPayload
            };

            await prescriptionAPI.updatePrescription(prescriptionId, payload);
            
            Swal.fire({ icon: 'success', title: 'Prescription Updated', showConfirmButton: false, timer: 1500, customClass: { popup: 'swal-modern-popup', title: 'swal-modern-title' } });
            setIsEditingRx(false);
            
        } catch (error) {
            console.error("Prescription Update Error:", error);
            let errorDetails = "Failed to update.";
            if (error.response && error.response.data) errorDetails = JSON.stringify(error.response.data, null, 2);
            Swal.fire({ icon: 'error', title: 'Bad Request (400)', text: `Django says: ${errorDetails}`, customClass: { popup: 'swal-modern-popup' } });
        }
    };

    // --- NEW PRINT PRESCRIPTION LOGIC ---
    const handlePrintClick = () => {
        const printPayload = {
            patientData,
            appointmentId: apptId, // Note: Mapped apptId to appointmentId for the print view
            date: new Date().toLocaleDateString('en-GB'),
            conditions: conditions.filter(c => c.text && c.text.trim()),
            complaints: complaints.filter(c => c.symptom && c.symptom.trim()),
            precheckFields: hasPrecheck ? precheckFields.filter(f => f.value && String(f.value).trim()) : [],
            medicines: medicines.filter(m => m.medicineName && m.medicineName.trim()),
            labTests: labTests.filter(t => (t.test && t.test.trim()) || t.testId),
            advices: advices.filter(a => a.selected),
            nextVisitOption,
            nextVisitNumber,
            nextVisitUnit
        };

        localStorage.setItem('rx_print_data', JSON.stringify(printPayload));
        window.open('/print-prescription', '_blank');
    };

    if (isLoading) {
        return (
            <div className="loading-container vh-100">
                <div className="custom-spinner"></div>
                <div className="fw-bold mt-2" style={{color: 'var(--luna-navy)', fontFamily: 'Google Sans Flex, sans-serif', fontSize: '1.1rem'}}>Loading Prescription...</div>
            </div>
        );
    }

    const groupedAdvices = advices.reduce((acc, curr) => {
        if (!acc[curr.category]) acc[curr.category] = [];
        acc[curr.category].push(curr);
        return acc;
    }, {});

    return (
        <Container fluid className="pb-4 pt-3 px-1 px-lg-3 rx-container google-sans-flex">
            
            <style>{`
                textarea.rx-grid-input.force-bengali-font { font-family: "Noto Serif Bengali", serif !important; font-weight: 600 !important; }
                textarea.rx-grid-input.force-english-font { font-family: "Google Sans Flex", "Google Sans", sans-serif !important; font-weight: 500 !important; }
                .rx-dx-option.force-bengali-font { font-family: "Noto Serif Bengali", serif !important; font-weight: 600 !important; }
                .rx-dx-option.force-english-font { font-family: "Google Sans Flex", "Google Sans", sans-serif !important; font-weight: 500 !important; }
            `}</style>

            <div className="d-flex align-items-center justify-content-between mb-3 px-2">
                <div className="d-flex align-items-center">
                    {!isEditingRx && (
                        <button className="back-btn-circle me-3" onClick={() => navigate(-1)}>
                            <FaArrowLeft size={14} />
                        </button>
                    )}
                    <div className="d-flex align-items-center gap-2">
                        <h3 className="form-title mb-0" style={{letterSpacing: '-0.5px'}}>Prescription</h3>
                        {!isEditingRx && isDoctor && (
                            <div className="rx-edit-circle active" onClick={() => setIsEditingRx(true)} title="Edit Prescription">
                                <FaPen size={10} color="#0277BD" />
                            </div>
                        )}
                    </div>
                </div>
                <div className="d-flex gap-2">
                    <button className="btn-glass-rx" onClick={handlePrintClick}><FaPrint size={12}/> Print</button>
                    {isEditingRx && (
                        <button className="btn-glass-rx btn-glass-save" onClick={handleUpdate}><FaSave size={12}/> Update</button>
                    )}
                </div>
            </div>

            <div className="rx-patient-banner mx-2">
                <span><strong>Name:</strong> {patientData?.name || 'N/A'}</span>
                <span><strong>Age:</strong> {calculateAge(patientData?.dob)}</span>
                <span><strong>Sex:</strong> {patientData?.gender || 'N/A'}</span>
                <span><strong>Mobile:</strong> {patientData?.mobile || 'N/A'}</span>
                <span><strong>Appointment No:</strong> {apptId || 'N/A'}</span>
                <span><strong>Weight:</strong> {precheckFields.find(f => f.key === 'weight')?.value || '--'} kg</span>
                <span><strong>Date:</strong> {new Date().toLocaleDateString('en-GB')}</span>
                <span className="rx-address-wrap"><strong>Address:</strong> {patientData?.address || 'N/A'}</span>
            </div>

            <div className="rx-master-wrapper">
                <Row className="g-0">
                    <Col lg={4} xl={3} className="pe-2 pe-lg-3 d-flex flex-column pt-1">
                        
                        {/* DX */}
                        <div className="rx-left-box mb-3">
                            <div className="rx-section-title rx-header-underline"><FaStethoscope className="opacity-50" size={14} /> D/X</div>
                            <div>
                                {conditions.map((cond) => {
                                    if (!isEditingRx && !cond.text.trim()) return null;
                                    const filteredSuggestions = getFilteredConditions(cond.text, cond.id);
                                    const showDropdown = isEditingRx && activeDxId === cond.id && cond.text.length > 0;
                                    return (
                                        <div key={cond.id} className="d-flex align-items-start rx-row-border pt-1">
                                            {isEditingRx && <div className="rx-delete-btn me-1 flex-shrink-0 mt-1" onClick={() => removeRow(setConditions, cond.id)}><FaTimes /></div>}
                                            <div className="position-relative flex-grow-1">
                                                <textarea rows={1} className={`rx-grid-input w-100 ${hasBengali(cond.text) ? 'force-bengali-font' : 'force-english-font'}`} value={cond.text} disabled={!isEditingRx} onFocus={() => setActiveDxId(cond.id)} onBlur={() => setTimeout(() => setActiveDxId(null), 200)} onChange={(e) => { handleAutoResize(e); updateArray(setConditions, cond.id, 'text', e.target.value); }} />
                                                {showDropdown && (
                                                    <div className="rx-dx-dropdown">
                                                        {filteredSuggestions.length > 0 ? filteredSuggestions.map(item => (
                                                            <div key={item.id} className={`rx-dx-option ${hasBengali(item.name) ? 'force-bengali-font' : 'force-english-font'}`} onMouseDown={(e) => { e.preventDefault(); updateArray(setConditions, cond.id, 'text', item.name); setActiveDxId(null); }}><HighlightMatch text={item.name} query={cond.text} /></div>
                                                        )) : <div className="rx-dx-option text-muted" style={{fontStyle: 'italic', textTransform: 'none'}}>No matches found</div>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {isEditingRx && <div className="text-center mt-2"><div className="rx-add-text-btn" onClick={() => addRow(setConditions, { text: '' })}><FaPlus size={10} /> Add Diagnosis</div></div>}
                            </div>
                        </div>

                        {/* CC */}
                        <div className="rx-left-box mb-3">
                            <div className="rx-section-title rx-header-underline"><FaClipboardList className="opacity-50" size={14} /> C/C</div>
                            {(!isEditingRx && complaints.every(c => !c.symptom.trim())) ? null : (
                                <Row className="mb-1 gx-1 ms-4 pe-1">
                                    <Col xs={9}><div className="rx-col-header ps-1">Symptom</div></Col>
                                    <Col xs={3}><div className="rx-col-header text-center">Duration</div></Col>
                                </Row>
                            )}
                            {complaints.map((comp) => {
                                if (!isEditingRx && !comp.symptom.trim()) return null;
                                const filteredSuggestions = getFilteredSymptoms(comp.symptom, comp.id);
                                const showDropdown = isEditingRx && activeCcId === comp.id && comp.symptom.length > 0;
                                return (
                                    <Row key={comp.id} className="align-items-start gx-1 rx-row-border mx-0 pt-1">
                                        <Col xs={9} className="d-flex align-items-start rx-col-sep p-0 pe-1">
                                            {isEditingRx && <div className="rx-delete-btn me-1 flex-shrink-0 mt-1" onClick={() => removeRow(setComplaints, comp.id)}><FaTimes /></div>}
                                            <div className="position-relative flex-grow-1">
                                                {/* FIXED: ADDED setActiveCcId(comp.id) */}
                                                <textarea rows={1} className={`rx-grid-input w-100 px-1 ${hasBengali(comp.symptom) ? 'force-bengali-font' : 'force-english-font'}`} value={comp.symptom} disabled={!isEditingRx} onFocus={() => setActiveCcId(comp.id)} onBlur={() => setTimeout(() => setActiveCcId(null), 200)} onChange={(e) => { handleAutoResize(e); updateArray(setComplaints, comp.id, 'symptom', e.target.value); setActiveCcId(comp.id); }} />
                                                {showDropdown && (
                                                    <div className="rx-dx-dropdown">
                                                        {filteredSuggestions.length > 0 ? filteredSuggestions.map((item, idx) => (
                                                            <div key={idx} className={`rx-dx-option ${hasBengali(item) ? 'force-bengali-font' : 'force-english-font'}`} onMouseDown={(e) => { e.preventDefault(); updateArray(setComplaints, comp.id, 'symptom', item); setActiveCcId(null); }}><HighlightMatch text={item} query={comp.symptom} /></div>
                                                        )) : <div className="rx-dx-option text-muted" style={{fontStyle: 'italic', textTransform: 'none'}}>No matches found</div>}
                                                    </div>
                                                )}
                                            </div>
                                        </Col>
                                        <Col xs={3} className="p-0 px-1 d-flex align-items-center">
                                            <textarea rows={1} disabled={!isEditingRx} className="rx-grid-input force-english-font text-center px-0 flex-grow-1" value={comp.duration} onChange={(e) => { handleAutoResize(e); updateArray(setComplaints, comp.id, 'duration', e.target.value); }} />
                                            <div className={`rx-dmy-btn ms-1 ${getDmyClass(comp.modifier)}`} onClick={() => cycleModifier(comp.id, comp.modifier)}>{comp.modifier}</div>
                                        </Col>
                                    </Row>
                                );
                            })}
                            {isEditingRx && <div className="text-center mt-2"><div className="rx-add-text-btn" onClick={() => addRow(setComplaints, { symptom: '', duration: '', modifier: 'D' })}><FaPlus size={10} /> Add C/C</div></div>}
                        </div>

                        {/* O/E */}
                        {hasPrecheck && (
                            <div className="rx-left-box mb-3">
                                <div className="d-flex justify-content-between align-items-center rx-header-underline">
                                    <div className="rx-section-title mb-0"><FaNotesMedical className="opacity-50" size={14} /> O/E</div>
                                    {isEditingRx && <div className={`rx-edit-circle ${isEditingPrecheck ? 'active' : ''}`} onClick={isEditingPrecheck ? savePrecheck : () => setIsEditingPrecheck(true)}>{isEditingPrecheck ? <FaCheck className="text-success" /> : <FaPen />}</div>}
                                </div>
                                <Row className="mb-1 gx-1 px-1">
                                    <Col xs={3}><div className="rx-col-header">O/E</div></Col>
                                    <Col xs={7}><div className="rx-col-header ps-2">Value</div></Col>
                                    <Col xs={2}><div className="rx-col-header text-end pe-2">Unit</div></Col>
                                </Row>
                                {precheckFields.map((field) => {
                                    if (!isEditingRx && !isEditingPrecheck && !field.value) return null;
                                    return (
                                        <Row key={field.key} className="align-items-center gx-1 rx-row-border mx-0 py-1">
                                            <Col xs={3} className="rx-col-sep p-0 px-1 d-flex align-items-center">
                                                <div style={{fontFamily: 'Google Sans Flex', fontSize: '0.75rem', fontWeight: 700, color: 'var(--luna-navy)'}}>{field.label}</div>
                                            </Col>
                                            <Col xs={7} className="rx-col-sep p-0 px-1">
                                                <textarea rows={1} className="rx-grid-input rx-oe-input w-100" value={field.value} disabled={!isEditingPrecheck} onChange={(e) => { handleAutoResize(e); handlePrecheckUpdate(field.key, e.target.value); }} />
                                            </Col>
                                            <Col xs={2} className="p-0 px-1 text-end d-flex align-items-center justify-content-end"><span className="rx-oe-unit">{field.unit}</span></Col>
                                        </Row>
                                    );
                                })}
                            </div>
                        )}
                    </Col>

                    <Col lg="auto" className="d-none d-lg-block px-1 px-xl-2"><div className="rx-beautiful-divider"></div></Col>

                    {/* RIGHT COLUMN */}
                    <Col lg className="ps-2 ps-lg-3 d-flex flex-column pt-1">
                        <div className="d-flex align-items-end mb-2 gap-2"><div className="rx-symbol-large">Rx</div></div>

                        {/* MEDICINES */}
                        <div className="rx-med-card">
                            <div className="rx-med-header-row mx-0">
                                <div className="col-med-name px-1 d-flex align-items-center">
                                    <div style={{width: isEditingRx ? '26px' : '0px', flexShrink: 0}}></div>
                                    <div className="rx-col-header" style={{paddingLeft: '6px'}}>Medicine Name</div>
                                </div>
                                <div className="col-med-dose px-1"><div className="rx-col-header text-center">Dose</div></div>
                                <div className="col-med-inst px-1"><div className="rx-col-header text-center">Instruction</div></div>
                                <div className="col-med-dur px-1"><div className="rx-col-header text-center">Duration</div></div>
                            </div>

                            {medicines.map((med) => {
                                if (!isEditingRx && !med.medicineName.trim() && !med.generic.trim()) return null;

                                const showGenericDropdown = isEditingRx && activeGenericId === med.id && med.generic.length > 0;
                                const filteredGenerics = getFilteredGenerics(med.generic);
                                const showMedicineDropdown = isEditingRx && activeMedicineId === med.id && med.medicineName.length > 0;
                                const filteredMedicines = getFilteredMedicines(med.medicineName, med.id, med.genericId);
                                const showDoseDropdown = isEditingRx && activeDoseId === med.id && med.dose.length > 0;
                                const filteredDoses = getFilteredDoses(med.dose);
                                const showInstDropdown = isEditingRx && activeInstId === med.id && med.instruction.length > 0;
                                const filteredInsts = getFilteredInstructions(med.instruction);
                                const showDurDropdown = isEditingRx && activeDurId === med.id && med.duration.length > 0;
                                const filteredDurs = getFilteredDurations(med.duration);

                                return (
                                <div key={med.id} className="rx-med-row mx-0">
                                    <div className="col-med-name d-flex align-items-start p-0 rx-col-sep">
                                        {isEditingRx ? (
                                            <div className="rx-delete-btn me-2 ms-1 mt-1 flex-shrink-0" onClick={() => removeRow(setMedicines, med.id)}><FaTimes /></div>
                                        ) : <div style={{width: '26px', flexShrink: 0}}></div>}

                                        <div className="flex-grow-1 position-relative d-flex align-items-center justify-content-between pe-2" style={{minHeight: '40px'}}>
                                            {(!isEditingRx || med.step === 3) && (
                                                <>
                                                    <div className="ps-2 py-1 w-100" onClick={() => isEditingRx && updateArray(setMedicines, med.id, 'step', 2)} style={{cursor: isEditingRx ? 'pointer' : 'default'}}>
                                                        <div style={{fontSize: '0.9rem', color: 'var(--luna-navy)', fontFamily: "'Libre Baskerville', serif", fontWeight: 700, wordBreak: 'break-word'}}>{med.medicineName}</div>
                                                        <div className="rx-med-generic-display">{med.generic}</div>
                                                    </div>
                                                    {isEditingRx && <div className="rx-edit-circle ms-1" onClick={() => updateArray(setMedicines, med.id, 'step', 1)}><FaPen /></div>}
                                                </>
                                            )}

                                            {isEditingRx && med.step === 1 && (
                                                <div className="w-100 position-relative">
                                                    <textarea rows={1} className={`rx-grid-input w-100 ${hasBengali(med.generic) ? 'force-bengali-font' : 'force-english-font'}`} value={med.generic} placeholder="Generic Name" onFocus={() => setActiveGenericId(med.id)} onBlur={(e) => { setTimeout(() => setActiveGenericId(null), 200); handleMedicineFlow(med.id, 1, 'generic', med.generic, e); }} onChange={(e) => { handleAutoResize(e); setMedicines(prev => prev.map(m => m.id === med.id ? { ...m, generic: e.target.value, genericId: null, medicineId: null } : m)); setActiveGenericId(med.id); }} onKeyDown={(e) => handleMedicineFlow(med.id, 1, 'generic', med.generic, e)} />
                                                    {showGenericDropdown && (
                                                        <div className="rx-dx-dropdown">
                                                            {filteredGenerics.length > 0 ? filteredGenerics.map(item => (
                                                                <div key={item.id} className="rx-dx-option" onMouseDown={(e) => { e.preventDefault(); handleSelectGeneric(med.id, item); }}><HighlightMatch text={item.name} query={med.generic} /></div>
                                                            )) : <div className="rx-dx-option text-muted" style={{fontStyle: 'italic', textTransform: 'none'}}>No matches found</div>}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {isEditingRx && med.step === 2 && (
                                                <div className="w-100 position-relative">
                                                    <textarea rows={1} className={`rx-grid-input w-100 pb-0 ${hasBengali(med.medicineName) ? 'force-bengali-font' : 'force-english-font'}`} autoFocus value={med.medicineName} placeholder="Brand Name" onFocus={() => setActiveMedicineId(med.id)} onBlur={(e) => { setTimeout(() => setActiveMedicineId(null), 200); handleMedicineFlow(med.id, 2, 'medicineName', med.medicineName, e); }} onChange={(e) => { handleAutoResize(e); updateArray(setMedicines, med.id, 'medicineName', e.target.value); setActiveMedicineId(med.id); }} onKeyDown={(e) => handleMedicineFlow(med.id, 2, 'medicineName', med.medicineName, e)} />
                                                    <div className="rx-med-generic-display">{med.generic}</div>
                                                    {showMedicineDropdown && (
                                                        <div className="rx-dx-dropdown">
                                                            {filteredMedicines.length > 0 ? filteredMedicines.map(item => (
                                                                <div key={item.id} className="rx-dx-option" onMouseDown={(e) => { e.preventDefault(); handleSelectMedicineName(med.id, item); }}><HighlightMatch text={item.name} query={med.medicineName} /></div>
                                                            )) : <div className="rx-dx-option text-muted" style={{fontStyle: 'italic', textTransform: 'none'}}>No matches found</div>}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* DOSE */}
                                    <div className="col-med-dose p-0 px-1 rx-col-sep position-relative">
                                        <textarea rows={1} className={`rx-grid-input text-center w-100 ${hasBengali(med.dose) ? 'force-bengali-font' : 'force-english-font'}`} disabled={!isEditingRx} value={med.dose} onFocus={() => setActiveDoseId(med.id)} onBlur={() => setTimeout(() => setActiveDoseId(null), 200)} onChange={(e) => { handleAutoResize(e); updateArray(setMedicines, med.id, 'dose', convertDoseToBengali(e.target.value)); setActiveDoseId(med.id); }} />
                                        {showDoseDropdown && (
                                            <div className="rx-dx-dropdown text-start" style={{ width: '220px', left: '50%', transform: 'translateX(-50%)' }}>
                                                {filteredDoses.length > 0 && filteredDoses.map((item, idx) => (
                                                    <div key={idx} className="rx-dx-option force-bengali-font" onMouseDown={(e) => { e.preventDefault(); updateArray(setMedicines, med.id, 'dose', item); setActiveDoseId(null); }}><HighlightMatch text={item} query={med.dose} /></div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* INSTRUCTION */}
                                    <div className="col-med-inst p-0 px-1 rx-col-sep position-relative">
                                        <textarea rows={1} className={`rx-grid-input text-center w-100 ${hasBengali(med.instruction) ? 'force-bengali-font' : 'force-english-font'}`} disabled={!isEditingRx} value={med.instruction} onFocus={() => setActiveInstId(med.id)} onBlur={() => setTimeout(() => setActiveInstId(null), 200)} onChange={(e) => { handleAutoResize(e); updateArray(setMedicines, med.id, 'instruction', convertInstToBengali(e.target.value)); setActiveInstId(med.id); }} />
                                        {showInstDropdown && (
                                            <div className="rx-dx-dropdown text-start" style={{ width: '220px', left: '50%', transform: 'translateX(-50%)' }}>
                                                {filteredInsts.length > 0 && filteredInsts.map((item, idx) => (
                                                    <div key={idx} className="rx-dx-option force-bengali-font" onMouseDown={(e) => { e.preventDefault(); updateArray(setMedicines, med.id, 'instruction', item); setActiveInstId(null); }}><HighlightMatch text={item} query={med.instruction} /></div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* DURATION */}
                                    <div className="col-med-dur p-0 px-1 position-relative">
                                        <textarea rows={1} className={`rx-grid-input text-center w-100 ${hasBengali(med.duration) ? 'force-bengali-font' : 'force-english-font'}`} disabled={!isEditingRx} value={med.duration} onFocus={() => setActiveDurId(med.id)} onBlur={() => setTimeout(() => setActiveDurId(null), 200)} onChange={(e) => { handleAutoResize(e); updateArray(setMedicines, med.id, 'duration', convertToBengaliDuration(e.target.value)); setActiveDurId(med.id); }} />
                                        {showDurDropdown && (
                                            <div className="rx-dx-dropdown text-start" style={{ width: '200px', right: '0', left: 'auto' }}>
                                                {filteredDurs.length > 0 && filteredDurs.map((item, idx) => (
                                                    <div key={idx} className="rx-dx-option force-bengali-font" onMouseDown={(e) => { e.preventDefault(); updateArray(setMedicines, med.id, 'duration', item); setActiveDurId(null); }}><HighlightMatch text={item} query={med.duration} /></div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )})}
                            
                            {isEditingRx && (
                                <div className="text-center mt-2 pb-1">
                                    <div className="rx-add-text-btn" onClick={() => addRow(setMedicines, { generic: '', genericId: null, medicineName: '', medicineId: null, dose: '', instruction: '', duration: '', step: 1 })}><FaPlus size={10} /> Add Medicine</div>
                                </div>
                            )}
                        </div>

                        {/* TESTS */}
                        {(isEditingRx || (showLabTests && labTests.some(t => t.test.trim()))) && (
                            <>
                                {isEditingRx && (
                                    <div className="rx-custom-toggle d-flex align-items-center gap-2 mb-2 mt-4 ps-0 ms-0">
                                        <div className="form-check form-switch m-0 ps-0 d-flex align-items-center">
                                            <input className="form-check-input m-0" type="checkbox" id="labTestToggle" checked={showLabTests} onChange={() => setShowLabTests(!showLabTests)} />
                                        </div>
                                        <label className="rx-section-title mb-0" htmlFor="labTestToggle" style={{cursor: 'pointer'}}>Add Lab Tests</label>
                                    </div>
                                )}
                                {showLabTests && (
                                    <div className="rx-left-box mb-3 border-0 bg-transparent shadow-none px-0 py-0 mt-3">
                                        {labTests.map((test) => {
                                            if (!isEditingRx && !test.test.trim()) return null;
                                            const filteredSuggestions = getFilteredTests(test.test, test.id);
                                            const showDropdown = isEditingRx && activeTestId === test.id && test.test.length > 0;
                                            return (
                                                <div key={test.id} className="d-flex align-items-center rx-row-border pt-1">
                                                    {isEditingRx && <div className="rx-delete-btn me-1 flex-shrink-0" onClick={() => removeRow(setLabTests, test.id)}><FaTimes /></div>}
                                                    <div className="flex-grow-1 px-1 position-relative">
                                                        {isEditingRx && test.step === 1 ? (
                                                            <>
                                                                <textarea rows={1} className={`rx-grid-input w-100 ${hasBengali(test.test) ? 'force-bengali-font' : 'force-english-font'}`} value={test.test} autoFocus onFocus={() => setActiveTestId(test.id)} onBlur={() => setTimeout(() => setActiveTestId(null), 200)} onChange={(e) => { handleAutoResize(e); updateArray(setLabTests, test.id, 'test', e.target.value); setActiveTestId(test.id); }} onKeyDown={(e) => handleLabTestFlow(test.id, test.test, e)} />
                                                                {showDropdown && (
                                                                    <div className="rx-dx-dropdown">
                                                                        {filteredSuggestions.length > 0 ? filteredSuggestions.map(item => (
                                                                            <div key={item.id} className={`rx-dx-option ${hasBengali(item.name) ? 'force-bengali-font' : 'force-english-font'}`} style={{ textTransform: 'none' }} onMouseDown={(e) => { e.preventDefault(); updateArray(setLabTests, test.id, 'test', item.name); updateArray(setLabTests, test.id, 'testId', item.id); updateArray(setLabTests, test.id, 'step', 2); setActiveTestId(null); }}><HighlightMatch text={item.name} query={test.test} /></div>
                                                                        )) : <div className="rx-dx-option text-muted" style={{fontStyle: 'italic', textTransform: 'none'}}>No matches found</div>}
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <div className="w-100 py-1" onClick={() => isEditingRx && updateArray(setLabTests, test.id, 'step', 1)}>
                                                                <div className={`${hasBengali(test.test) ? 'force-bengali-font' : 'force-english-font'}`} style={{fontSize: '0.85rem', color: 'var(--luna-navy)', cursor: isEditingRx ? 'pointer' : 'default', paddingLeft: '6px'}}>{test.test}</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        {isEditingRx && <div className="text-center mt-2"><div className="rx-add-text-btn" onClick={() => addRow(setLabTests, { test: '', testId: null, step: 1 })}><FaPlus size={10} /> Add Test</div></div>}
                                        <div className="rx-test-warning">Follow doctor instructions before the test. Inform about medications, pregnancy, allergies, and existing medical conditions.</div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* ADVICES */}
                        {advices.length > 0 && (
                            <div className="mb-2 mt-4">
                                <div className="rx-section-title mb-2 pb-1"><FaPen className="opacity-50" size={14} /> Advise</div>
                                <div className="rx-left-box border-0 bg-transparent shadow-none px-0 py-0">
                                    {Object.entries(groupedAdvices).map(([category, items]) => {
                                        if (!isEditingRx && !items.some(i => i.selected)) return null;
                                        return (
                                            <div key={category} className="mb-3">
                                                {category !== 'অন্যান্য' && <div className="rx-advice-category-title rx-bengali-text">{category}</div>}
                                                {items.map((adv) => {
                                                    if (!isEditingRx && !adv.selected) return null;
                                                    return (
                                                        <div key={adv.id} className="d-flex align-items-center rx-row-border py-2" onClick={() => toggleAdvice(adv.id)} style={{cursor: isEditingRx ? 'pointer' : 'default'}}>
                                                            <div className={`rx-advice-check me-2 ${adv.selected ? 'selected' : ''}`}><FaCheck size={10} /></div>
                                                            <div className="flex-grow-1 d-flex align-items-center"><span className="rx-advice-text rx-bengali-text">{adv.text}</span></div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* NEXT VISIT */}
                        <div className="mb-2 mt-4">
                            <div className="rx-section-title mb-2 pb-1"><FaCalendarAlt className="opacity-50" size={14} /> Next Visit</div>
                            <div className="rx-left-box border-0 bg-transparent shadow-none px-0 py-0">
                                {(!isEditingRx ? nextVisitOption === 'none' : true) && (
                                    <div className="d-flex align-items-center rx-row-border py-2" onClick={() => isEditingRx && setNextVisitOption('none')} style={{cursor: isEditingRx ? 'pointer' : 'default'}}>
                                        <div className={`rx-advice-check me-2 ${nextVisitOption === 'none' ? 'selected' : ''}`}><FaCheck size={10} /></div>
                                        <div className="flex-grow-1 d-flex align-items-center"><span className="rx-bengali-text" style={{fontSize: '0.9rem', color: 'var(--luna-navy)'}}>প্রয়োজন নেই</span></div>
                                    </div>
                                )}
                                {(!isEditingRx ? nextVisitOption === 'after' : true) && (
                                    <div className="d-flex align-items-center rx-row-border py-2" onClick={() => isEditingRx && setNextVisitOption('after')} style={{cursor: isEditingRx ? 'pointer' : 'default'}}>
                                        <div className={`rx-advice-check me-2 ${nextVisitOption === 'after' ? 'selected' : ''}`}><FaCheck size={10} /></div>
                                        <div className="flex-grow-1 d-flex align-items-center flex-wrap gap-1">
                                            <span className="rx-bengali-text" style={{fontSize: '0.9rem', color: 'var(--luna-navy)'}}>পরবর্তী</span>
                                            <input type="text" className="rx-next-visit-input" value={nextVisitNumber} disabled={!isEditingRx} onChange={(e) => { setNextVisitOption('after'); setNextVisitNumber(e.target.value); }} onClick={(e) => e.stopPropagation()} placeholder="" />
                                            <div className={`rx-next-visit-btn rx-bengali-text ${!isEditingRx ? 'bg-light border text-muted shadow-none' : ''}`} onClick={toggleNextVisitUnit}>{nextVisitUnit}</div>
                                            <span className="rx-bengali-text" style={{fontSize: '0.9rem', color: 'var(--luna-navy)'}}>পর আবার আসবেন।</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </Col>
                </Row>
            </div>
        </Container>
    );
};

export default ViewPrescription;