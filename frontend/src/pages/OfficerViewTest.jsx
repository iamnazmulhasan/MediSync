import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { coreAPI } from '../api/api';
import Swal from 'sweetalert2';
import { 
    FaVial, FaArrowLeft, FaExclamationTriangle,
    FaPen, FaCheck, FaTimes
} from 'react-icons/fa';

const OfficerViewTest = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const testId = location.state?.testId;

    const [testData, setTestData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Edit States
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});

    useEffect(() => {
        const fetchTestDetails = async () => {
            if (!testId) {
                setError("No test selected.");
                setLoading(false);
                return;
            }
            try {
                const res = await coreAPI.getTest(testId);
                setTestData(res.data);
            } catch (err) {
                console.error("Failed to fetch test details", err);
                setError("Failed to load test information.");
            } finally {
                setLoading(false);
            }
        };

        fetchTestDetails();
    }, [testId]);

    const handleEditToggle = () => {
        if (isEditing) {
            setIsEditing(false);
            setEditForm({});
        } else {
            setEditForm({ ...testData });
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
            if (editForm[key] !== testData[key]) {
                changedData[key] = editForm[key];
                hasChanges = true;
            }
        });

        if (!hasChanges) {
            setIsEditing(false);
            return;
        }

        try {
            await coreAPI.updateTest(testData.id, changedData);
            
            setTestData({ ...testData, ...changedData });
            Swal.fire({ icon: 'success', title: 'Test Updated', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
            setIsEditing(false);
        } catch (error) {
            console.error("Update failed", error);
            Swal.fire({ icon: 'error', title: 'Update Failed', text: 'Could not save changes.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        }
    };

    if (loading) return <div className="d-flex justify-content-center align-items-center vh-100 font-body">Loading Test Details...</div>;
    if (error) return <div className="d-flex justify-content-center align-items-center vh-100 font-body text-danger">{error}</div>;
    if (!testData) return null;

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
                        
                        {/* Floating Action Buttons */}
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
                                <div className="action-btn-circle" onClick={handleEditToggle} title="Edit Test Details">
                                    <FaPen size={14} />
                                </div>
                            )}
                        </div>

                        <div className="d-flex align-items-center mb-4">
                            <div className="avatar-box me-4 d-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #E0F2F1 0%, #B2EBF2 100%)', color: '#00796B', borderRadius: '20px' }}>
                                <FaVial size={40} />
                            </div>
                            <div className="flex-grow-1">
                                <div className="font-serif-italic mb-1 text-muted" style={{fontSize: '0.9rem'}}>Test ID: #{String(testData.id).padStart(4, '0')}</div>
                                
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
                                        {testData.name}
                                    </h1>
                                )}
                            </div>
                        </div>

                        <div className="section-divider mt-4 mb-4"></div>

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
                                    placeholder="Enter test warnings and instructions..." 
                                    style={{ fontFamily: "'Google Sans', sans-serif", fontSize: '0.95rem', color: 'var(--luna-navy)' }} 
                                />
                            ) : (
                                <div className="p-4 rounded-3" style={{background: '#FFEBEE', border: '1px dashed #FFCDD2', color: '#B71C1C', fontFamily: "'Inter', sans-serif", fontSize: '0.95rem', lineHeight: '1.6'}}>
                                    {testData.warnings || <span className="fst-italic opacity-75">No specific warnings required for this test.</span>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OfficerViewTest;