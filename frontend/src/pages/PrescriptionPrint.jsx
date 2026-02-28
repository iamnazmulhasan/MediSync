import React, { useEffect, useState, useRef } from 'react';
import { FaPrint, FaDownload, FaArrowLeft } from 'react-icons/fa';
import { doctorAPI, appointmentAPI } from '../api/api';

const PrescriptionPrint = () => {
    const [data, setData] = useState(null);
    const [doctorInfo, setDoctorInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);

    // --- COLUMN BALANCER STATE ---
    const [leftItems, setLeftItems] = useState(['cc', 'oe', 'dx', 'tests']);
    const [overflowItems, setOverflowItems] = useState([]);
    const leftRef = useRef(null);
    const rightRef = useRef(null);

    useEffect(() => {
        const fetchPrintData = async () => {
            try {
                const storedData = localStorage.getItem('rx_print_data');
                if (!storedData) {
                    setLoading(false);
                    return;
                }

                const parsedData = JSON.parse(storedData);
                setData(parsedData);

                if (parsedData.appointmentId) {
                    const apptRes = await appointmentAPI.getAppointmentInfo(parsedData.appointmentId);
                    const docId = apptRes.data.doctor_id;

                    if (docId) {
                        const detailsRes = await doctorAPI.getDoctorDetails({ type: 'doctor_id', id: docId });
                        setDoctorInfo(detailsRes.data);
                    }
                }
            } catch (error) {
                console.error("Failed to load doctor profile for print", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPrintData();
    }, []);

    // --- AUTO BALANCER LOGIC ---
    useEffect(() => {
        if (loading || !data) return;
        
        const balanceColumns = setTimeout(() => {
            if (leftRef.current && rightRef.current) {
                const leftH = leftRef.current.scrollHeight;
                const rightH = rightRef.current.scrollHeight;
                
                if (leftH > rightH + 40 && leftItems.length > 1) {
                    setLeftItems(prev => {
                        const next = [...prev];
                        const popped = next.pop();
                        setOverflowItems(oPrev => [popped, ...oPrev]); 
                        return next;
                    });
                }
            }
        }, 50);

        return () => clearTimeout(balanceColumns);
    }, [leftItems, loading, data]);

    const formatEducation = (eduString) => {
        if (!eduString) return '';
        return eduString.split(',').map(item => {
            const match = item.trim().match(/(.*?)\((.*?)\)/);
            if (match) {
                return `${match[2].trim()}(${match[1].trim()})`;
            }
            return item.trim();
        }).join(', ');
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

    // 1. STANDARD NATIVE PRINT
    const handlePrintFile = () => {
        window.print();
    };

    // 2. PERFECTED BACKGROUND PDF DOWNLOAD
    const handleDownloadPDF = async () => {
        setIsDownloading(true);
        const element = document.getElementById('a4-printable-pad');
        
        // Zero margins config relies on the DOM's natural padding to stop edge clipping
        // Scale 2 is crisp but safe, scrollX/Y 0 stops shifting.
        const opt = {
            margin:       0, 
            filename:     `Prescription_${data?.patientData?.name?.replace(/\s+/g, '_') || 'Document'}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, scrollY: 0, scrollX: 0 }, 
            pagebreak:    { mode: 'css', avoid: ['.print-footer', '.med-print-item'] }, // Forces footer to stay glued together
            jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' } 
        };
        
        try {
            if (window.html2pdf) {
                await window.html2pdf().set(opt).from(element).save();
            } else {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                script.onload = async () => {
                    await window.html2pdf().set(opt).from(element).save();
                    setIsDownloading(false);
                };
                document.body.appendChild(script);
                return;
            }
        } catch(err) {
            console.error("PDF Generation failed", err);
        }
        setIsDownloading(false);
    };

    if (loading || !data) {
        return (
            <div className="p-5 text-center" style={{fontFamily: "'Google Sans Flex', sans-serif", color: 'var(--luna-navy)'}}>
                <div className="spinner-border text-primary" role="status"></div>
                <div className="mt-3 fw-bold">Formatting Document Layout...</div>
            </div>
        );
    }

    const renderBlock = (blockKey) => {
        switch (blockKey) {
            case 'cc':
                if (!data.complaints?.length) return null;
                return (
                    <div key="cc" className="print-section">
                        <h4 className="print-section-title">C/C:</h4>
                        <ul className="print-list google-sans-list">
                            {data.complaints.map((c, i) => (
                                <li key={i}>
                                    <span className={c.symptom && c.symptom.match(/[\u0980-\u09FF]/) ? 'bengali-font' : ''}>
                                        {c.symptom} {c.duration ? `- ${c.duration} ${c.modifier}` : ''}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                );
            case 'oe':
                if (!data.precheckFields?.length) return null;
                return (
                    <div key="oe" className="print-section">
                        <h4 className="print-section-title">O/E:</h4>
                        <div className="oe-grid-container">
                            {data.precheckFields.map((f, i) => (
                                <div key={i} className="oe-print-grid">
                                    <div className="oe-grid-label">{f.label}</div>
                                    <div className="oe-grid-colon">:</div>
                                    <div className="oe-grid-value">
                                        {f.value} <span style={{fontSize: '0.7rem', color: '#718096'}}>{f.unit}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'dx':
                if (!data.conditions?.length) return null;
                return (
                    <div key="dx" className="print-section">
                        <h4 className="print-section-title">D/X:</h4>
                        <ul className="print-list google-sans-list">
                            {data.conditions.map((c, i) => (
                                <li key={i}>
                                    <span className={c.text && c.text.match(/[\u0980-\u09FF]/) ? 'bengali-font' : ''}>{c.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                );
            case 'tests':
                if (!data.labTests?.length) return null;
                return (
                    <div key="tests" className="print-section">
                        <h4 className="print-section-title">Investigations:</h4>
                        <ul className="print-list test-list google-sans-list">
                            {data.labTests.map((t, i) => (
                                <li key={i}>
                                    <span className={t.test && t.test.match(/[\u0980-\u09FF]/) ? 'bengali-font' : ''}>{t.test}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="print-page-wrapper">
            {/* ACTION BAR */}
            <div className="print-action-bar no-print">
                <div>
                    <button className="btn-print-action-secondary" onClick={() => window.close()} disabled={isDownloading}>
                        <FaArrowLeft /> Close
                    </button>
                </div>
                <div className="d-flex gap-2">
                    <button className="btn-print-action-print" onClick={handlePrintFile} disabled={isDownloading}>
                        <FaPrint /> Print
                    </button>
                    <button className="btn-print-action-download" onClick={handleDownloadPDF} disabled={isDownloading}>
                        {isDownloading ? (
                            <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Downloading...</>
                        ) : (
                            <><FaDownload /> Download PDF</>
                        )}
                    </button>
                </div>
            </div>

            {/* A4 PRINTABLE DOCUMENT */}
            <div className="a4-container" id="a4-printable-pad">
                
                {/* DOCTOR HEADER */}
                <div className="print-doc-header">
                    <div className="doc-details-left">
                        <h2 className="doc-name">Dr. {doctorInfo?.name || "Doctor Name"}</h2>
                        <p className="doc-degree">{formatEducation(doctorInfo?.education)}</p>
                        <p className="doc-designation">{doctorInfo?.designation || "Specialist"}</p>
                        <p className="doc-designation" style={{color: '#718096'}}>{doctorInfo?.department_name || ""}</p>
                    </div>
                    <div className="doc-details-right text-end">
                        <h2 className="clinic-name">MediSync Care</h2>
                        <p className="clinic-address">{doctorInfo?.location || "General Hospital Area"}</p>
                        <p className="clinic-phone">Mobile: {doctorInfo?.mobile || "N/A"}</p>
                        <p className="clinic-phone">Email: {doctorInfo?.email || ""}</p>
                    </div>
                </div>

                <div className="divider-line"></div>

                {/* PATIENT INFO BANNER */}
                <div className="print-patient-info">
                    <span><strong>Name:</strong> {data.patientData?.name || 'N/A'}</span>
                    <span><strong>Age:</strong> {calculateAge(data.patientData?.dob)} Yrs</span>
                    <span><strong>Sex:</strong> {data.patientData?.gender || 'N/A'}</span>
                    <span><strong>Date:</strong> {data.date}</span>
                    <span style={{marginLeft: 'auto'}}><strong>ID:</strong> #{data.appointmentId}</span>
                </div>

                <div className="divider-line mb-3"></div>

                {/* PRESCRIPTION BODY */}
                <div className="print-body-row">
                    
                    {/* LEFT COLUMN */}
                    <div className="print-sidebar" ref={leftRef}>
                        {leftItems.map(blockKey => renderBlock(blockKey))}
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="print-main" ref={rightRef}>
                        <div className="rx-symbol-print">Rx</div>

                        {/* MEDICINES */}
                        {data.medicines?.map((m, i) => (
                            <div key={i} className="med-print-item mb-4">
                                <div className="med-print-header">
                                    <span className="med-print-number">{i + 1}.</span>
                                    <span className="med-print-name">{m.medicineName}</span>
                                    {m.generic && <span className="med-print-generic">({m.generic})</span>}
                                </div>
                                <div className="med-print-instructions">
                                    <div className="med-print-dose bengali-font">{m.dose}</div>
                                    <div className="med-print-sep px-2 text-muted">---</div>
                                    <div className="med-print-dur bengali-font">{m.duration}</div>
                                </div>
                                <div className="med-print-timing bengali-font text-muted">{m.instruction}</div>
                            </div>
                        ))}

                        {/* ADVICES */}
                        {data.advices?.length > 0 && (
                            <div className="print-advices mt-4 pt-3 border-top">
                                <h4 className="print-section-title">Advise:</h4>
                                <ul className="print-list mb-0 list-unstyled">
                                    {data.advices.map((a, i) => (
                                        <li key={i} className="bengali-font pb-2 d-flex align-items-start gap-2">
                                            <span>-</span><span>{a.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* FOLLOW UP */}
                        {(data.nextVisitOption === 'after' || data.nextVisitOption === 'none') && (
                            <div className="print-followup mt-4 pt-3 border-top">
                                <h4 className="print-section-title d-inline me-2">Next Visit: </h4>
                                <span className="bengali-font fw-bold" style={{color: '#0c2041'}}>
                                    {data.nextVisitOption === 'none' ? 'প্রয়োজন নেই' : `${data.nextVisitNumber} ${data.nextVisitUnit} পর আবার আসবেন।`}
                                </span>
                            </div>
                        )}

                        {/* OVERFLOW ITEMS (Dynamic line appears here if needed) */}
                        {overflowItems.length > 0 && (
                            <div className="overflow-section">
                                <div className="wrap-divider"></div>
                                {overflowItems.map(blockKey => renderBlock(blockKey))}
                            </div>
                        )}
                    </div>
                </div>

                {/* DOCTOR SIGNATURE FOOTER */}
                {/* Fixed margin cutoff by adding paddingRight and aligned perfectly 1px above line */}
                <div className="print-footer" style={{ marginTop: '50px', display: 'flex', justifyContent: 'flex-end', pageBreakInside: 'avoid', paddingRight: '15px' }}>
                    <div className="signature-line-container" style={{ textAlign: 'center', minWidth: '220px' }}>
                        <div className="allura-regular" style={{ fontSize: '3.4rem', color: '#011C40', lineHeight: 0.75, margin: 0, paddingBottom: 0, marginBottom: '1px' }}>
                            {doctorInfo?.name || "Doctor"}
                        </div>
                        <p style={{ margin: 0, borderTop: '1px solid #011C40', paddingTop: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#4a5568' }}>
                            Signature & Seal
                        </p>
                    </div>
                </div>
                
            </div>
        </div>
    );
};

export default PrescriptionPrint;