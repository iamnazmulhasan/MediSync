import React, { useState } from 'react';
import { Container } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { coreAPI } from '../api/api';
import { FaChevronLeft, FaVial } from 'react-icons/fa';

const Toast = Swal.mixin({
    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true,
    didOpen: (toast) => { toast.addEventListener('mouseenter', Swal.stopTimer); toast.addEventListener('mouseleave', Swal.resumeTimer); }
});

const OfficerNewTest = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ name: '', warnings: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await coreAPI.createTest(formData);
            Swal.fire({
                icon: 'success',
                title: 'Test Created',
                text: 'The new lab test has been successfully added to the database.',
                customClass: { popup: 'swal-modern-popup', confirmButton: 'btn-modern-confirm' }
            }).then(() => {
                navigate('/officer/tests');
            });
        } catch (error) {
            console.error("Failed to create test:", error);
            Toast.fire({ icon: 'error', title: 'Failed to create test' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Container fluid className="p-4 fade-in">
            <button 
                onClick={() => navigate(-1)} 
                className="btn btn-light mb-4 d-flex align-items-center gap-2 shadow-sm rounded-pill px-3"
                style={{fontFamily: "'Google Sans', sans-serif", fontWeight: '600', color: '#546E7A', width: 'fit-content'}}
            >
                <FaChevronLeft size={12} /> Back
            </button>

            <div className="text-center mb-5">
                <h2 className="page-title-serif mb-2" style={{ fontWeight: '700', fontStyle: 'italic', fontSize: '2.8rem' }}>
                    Create New Test
                </h2>
                <p className="mb-4" style={{ fontFamily: "'Google Sans', sans-serif", fontSize: '0.85rem', color: 'var(--luna-mid)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Add a new diagnostic lab test to the system
                </p>
            </div>

            <div className="d-flex justify-content-center w-100">
                <div className="glass-card" style={{ maxWidth: '600px', width: '100%', padding: '2.5rem' }}>
                    <div className="text-center mb-4">
                        <FaVial size={40} style={{ color: '#0288D1' }} className="mb-3" />
                        <h4 className="font-heading" style={{ color: 'var(--luna-navy)' }}>Test Details</h4>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-custom mb-3">
                            <label className="form-label">Test Name</label>
                            <input 
                                type="text" 
                                name="name" 
                                className="form-control" 
                                value={formData.name} 
                                onChange={handleInputChange} 
                                required 
                                placeholder="e.g., Complete Blood Count (CBC)" 
                            />
                        </div>

                        <div className="mb-custom mb-4">
                            <label className="form-label">Warnings & Instructions</label>
                            <textarea 
                                name="warnings" 
                                className="form-control" 
                                rows="4" 
                                value={formData.warnings} 
                                onChange={handleInputChange} 
                                placeholder="e.g., Fasting required for 8 hours before the test."
                                style={{ fontFamily: "'Google Sans', sans-serif", fontSize: '0.9rem', color: 'var(--luna-navy)' }}
                            />
                        </div>

                        <button 
                            type="submit" 
                            className="btn btn-modern w-100 text-white border-0 shadow-sm" 
                            style={{background: 'linear-gradient(135deg, #26A69A 0%, #0288D1 100%)', fontWeight: '700'}} 
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Saving...' : 'Add Lab Test'}
                        </button>
                    </form>
                </div>
            </div>
        </Container>
    );
};

export default OfficerNewTest;