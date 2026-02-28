import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { coreAPI } from '../api/api';
import Swal from 'sweetalert2';
import { 
    FaPills, FaArrowLeft, FaExclamationTriangle,
    FaPen, FaCheck, FaTimes, FaMoneyBillWave, FaCapsules
} from 'react-icons/fa';

const OfficerViewMedicine = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const medicineId = location.state?.medicineId;

    const [medicineData, setMedicineData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Edit States
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});

    useEffect(() => {
        const fetchMedicineDetails = async () => {
            if (!medicineId) {
                setError("No medicine selected.");
                setLoading(false);
                return;
            }
            try {
                const res = await coreAPI.getMedicine(medicineId);
                setMedicineData(res.data);
            } catch (err) {
                console.error("Failed to fetch medicine details", err);
                setError("Failed to load medicine information.");
            } finally {
                setLoading(false);
            }
        };

        fetchMedicineDetails();
    }, [medicineId]);

    const handleEditToggle = () => {
        if (isEditing) {
            setIsEditing(false);
            setEditForm({});
        } else {
            // Price parsed to int for clean editing
            setEditForm({ 
                ...medicineData, 
                price: medicineData.price ? Math.round(parseFloat(medicineData.price)) : '' 
            });
            setIsEditing(true);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveChanges = async () => {
        const changedData = {};
        let hasChanges = false;

        Object.keys(editForm).forEach(key => {
            if (editForm[key] != medicineData[key]) {
                changedData[key] = editForm[key];
                hasChanges = true;
            }
        });

        if (!hasChanges) {
            setIsEditing(false);
            return;
        }

        try {
            await coreAPI.updateMedicine(medicineData.id, changedData);
            
            setMedicineData({ ...medicineData, ...changedData });
            Swal.fire({ icon: 'success', title: 'Medicine Updated', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
            setIsEditing(false);
        } catch (error) {
            console.error("Update failed", error);
            Swal.fire({ icon: 'error', title: 'Update Failed', text: 'Could not save changes.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        }
    };

    if (loading) return <div className="d-flex justify-content-center align-items-center vh-100 font-body">Loading Medicine Details...</div>;
    if (error) return <div className="d-flex justify-content-center align-items-center vh-100 font-body text-danger">{error}</div>;
    if (!medicineData) return null;

    return (
        <div className="container-fluid py-5 px-4 px-lg-5 fade-in">
            <button 
                onClick={() => navigate(-1)} 
                className="btn btn-light mb-4 d-flex align-items-center gap-2 shadow-sm rounded-pill px-3"
                style={{fontFamily: "'Google Sans', sans-serif", fontWeight: '600', color: '#546E7A', width: 'fit-content'}}
            >
                <FaArrowLeft size={12} /> Back
            </button>

            <div className="row g-5 justify-content-center">
                <div className="col-lg-8">
                    
                    <div className="rhythm-card position-relative p-5" style={{border: '1px solid rgba(2, 136, 209, 0.2)'}}>
                        
                        <div className="profile-actions-float">
                            {isEditing ? (
                                <>
                                    <div className="action-btn-circle save-btn" onClick={handleSaveChanges} title="Save Changes">
                                        <FaCheck size={16} />
                                    </div>
                                    <div className="action-btn-circle cancel-btn" onClick={handleEditToggle} title="Cancel">
                                        <FaTimes size={16} />
                                    </div>
                                </>
                            ) : (
                                <div className="action-btn-circle" onClick={handleEditToggle} title="Edit Medicine Details">
                                    <FaPen size={14} />
                                </div>
                            )}
                        </div>

                        <div className="d-flex align-items-center mb-4">
                            <div className="avatar-box me-4 d-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #E0F2F1 0%, #B2EBF2 100%)', color: '#00796B', borderRadius: '20px' }}>
                                <FaPills size={40} />
                            </div>
                            <div className="flex-grow-1">
                                <div className="font-serif-italic mb-1 text-muted" style={{fontSize: '0.9rem'}}>Medicine ID: #{String(medicineData.id).padStart(4, '0')}</div>
                                
                                {isEditing ? (
                                    <input 
                                        type="text" 
                                        name="name" 
                                        className="name-input-edit display-6 mb-0 w-100" 
                                        value={editForm.name || ''} 
                                        onChange={handleInputChange} 
                                    />
                                ) : (
                                    <h1 className="font-heading display-6 mb-0" style={{color: 'var(--luna-navy)'}}>
                                        {medicineData.name}
                                    </h1>
                                )}
                            </div>
                        </div>

                        <div className="section-divider mt-4 mb-4"></div>

                        <div className="row g-4 mb-4">
                            <div className="col-md-6">
                                <div className="info-label">Generic Name</div>
                                <div className="info-value d-flex align-items-center gap-2">
                                    <FaCapsules size={14} className="opacity-50 text-indigo" /> 
                                    <span style={{color: '#546E7A'}}>{medicineData.generic_name || 'N/A'}</span>
                                </div>
                                <small className="text-muted fst-italic" style={{fontSize: '0.7rem'}}>*Generic assignment cannot be edited here.</small>
                            </div>

                            <div className="col-md-6">
                                <div className="info-label">Price</div>
                                {isEditing ? (
                                    <div className="d-flex align-items-center w-100">
                                        <FaMoneyBillWave className="me-2 opacity-50" size={14} />
                                        <input 
                                            type="number" 
                                            name="price" 
                                            value={editForm.price || ''} 
                                            onChange={handleInputChange} 
                                            className="editable-field w-50" 
                                        />
                                    </div>
                                ) : (
                                    <div className="info-value d-flex align-items-center gap-2" style={{color: '#2E7D32', fontWeight: 'bold'}}>
                                        <FaMoneyBillWave size={14} className="opacity-50" /> 
                                        ৳ {medicineData.price ? Math.round(parseFloat(medicineData.price)) : 0}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <div className="info-label d-flex align-items-center gap-2 mb-3" style={{color: '#E53935'}}>
                                <FaExclamationTriangle size={14} /> Warnings & Instructions
                            </div>
                            
                            {isEditing ? (
                                <textarea 
                                    className="form-control" 
                                    name="warnings" 
                                    rows="5" 
                                    value={editForm.warnings || ''} 
                                    onChange={handleInputChange} 
                                    placeholder="Enter medicine warnings..." 
                                    style={{ fontFamily: "'Google Sans', sans-serif", fontSize: '0.95rem', color: 'var(--luna-navy)' }} 
                                />
                            ) : (
                                <div className="p-4 rounded-3" style={{background: '#FFEBEE', border: '1px dashed #FFCDD2', color: '#B71C1C', fontFamily: "'Inter', sans-serif", fontSize: '0.95rem', lineHeight: '1.6'}}>
                                    {medicineData.warnings || <span className="fst-italic opacity-75">No specific warnings for this medicine.</span>}
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default OfficerViewMedicine;