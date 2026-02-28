import React, { useState, useEffect } from 'react';
import { Container } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { coreAPI } from '../api/api';
import { FaChevronLeft, FaPills } from 'react-icons/fa';

const Toast = Swal.mixin({
    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true,
    didOpen: (toast) => { toast.addEventListener('mouseenter', Swal.stopTimer); toast.addEventListener('mouseleave', Swal.resumeTimer); }
});

// Utility to escape regex
const escapeRegex = (string) => {
    if (typeof string !== 'string') return '';
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Highlight component
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
                        ? <strong key={i} style={{fontWeight: 800, color: '#D32F2F'}}>{part}</strong> 
                        : <span key={i}>{part}</span>
                )}
            </span>
        );
    } catch (e) {
        return <span>{text}</span>;
    }
};

const OfficerAddMedicine = () => {
    const navigate = useNavigate();
    
    // Autocomplete States
    const [genericList, setGenericList] = useState([]);
    const [medicinesCache, setMedicinesCache] = useState([]);
    
    // Form States
    const [genericQuery, setGenericQuery] = useState('');
    const [selectedGenericId, setSelectedGenericId] = useState(null);
    
    const [medicineQuery, setMedicineQuery] = useState('');
    const [price, setPrice] = useState('');
    const [warnings, setWarnings] = useState('');
    
    // UI States
    const [showGenericDropdown, setShowGenericDropdown] = useState(false);
    const [showMedicineDropdown, setShowMedicineDropdown] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const loadGenerics = async () => {
            try {
                const res = await coreAPI.getMedicineGenerics();
                const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
                setGenericList(data);
            } catch (err) { console.error("Failed to load generics"); }
        };
        loadGenerics();
    }, []);

    const fetchMedicinesForGeneric = async (genId) => {
        try {
            const res = await coreAPI.getMedicinesByGeneric(genId);
            setMedicinesCache(Array.isArray(res.data) ? res.data : (res.data.results || []));
        } catch (err) { console.error(err); }
    };

    // Filters
    const getFilteredGenerics = () => {
        if (!genericQuery.trim()) return [];
        const q = genericQuery.toLowerCase().trim();
        return genericList.filter(g => g.name.toLowerCase().includes(q)).slice(0, 10);
    };

    const getFilteredMedicines = () => {
        if (!medicineQuery.trim() || !selectedGenericId) return [];
        const q = medicineQuery.toLowerCase().trim();
        return medicinesCache.filter(m => m.name.toLowerCase().includes(q)).slice(0, 10);
    };

    const handleSelectGeneric = (genericObj) => {
        setGenericQuery(genericObj.name);
        setSelectedGenericId(genericObj.id);
        setShowGenericDropdown(false);
        fetchMedicinesForGeneric(genericObj.id);
    };

    const handleSelectMedicine = (medObj) => {
        setMedicineQuery(medObj.name);
        setShowMedicineDropdown(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedGenericId) {
            Toast.fire({ icon: 'warning', title: 'Please select a valid Generic Name from the list.' });
            return;
        }
        if (!medicineQuery.trim()) {
            Toast.fire({ icon: 'warning', title: 'Medicine Name is required.' });
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                name: medicineQuery.trim(),
                generic: selectedGenericId,
                price: price ? Math.round(parseFloat(price)).toString() : "0",
                warnings: warnings.trim() || null
            };

            await coreAPI.createMedicine(payload);
            Swal.fire({
                icon: 'success',
                title: 'Medicine Added',
                text: 'The new medicine has been successfully added.',
                customClass: { popup: 'swal-modern-popup', confirmButton: 'btn-modern-confirm' }
            }).then(() => {
                navigate('/officer/medicines');
            });
        } catch (error) {
            console.error("Failed to add medicine:", error);
            Toast.fire({ icon: 'error', title: 'Failed to add medicine' });
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
                    Add Medicine
                </h2>
                <p className="mb-4" style={{ fontFamily: "'Google Sans', sans-serif", fontSize: '0.85rem', color: 'var(--luna-mid)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Register a new medicine to the database
                </p>
            </div>

            <div className="d-flex justify-content-center w-100">
                <div className="glass-card" style={{ maxWidth: '600px', width: '100%', padding: '2.5rem' }}>
                    <div className="text-center mb-4">
                        <FaPills size={40} style={{ color: '#0288D1' }} className="mb-3" />
                        <h4 className="font-heading" style={{ color: 'var(--luna-navy)' }}>Medicine Details</h4>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Generic Name */}
                        <div className="mb-custom mb-3 position-relative">
                            <label className="form-label">Medicine Generic</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={genericQuery} 
                                onChange={(e) => {
                                    setGenericQuery(e.target.value);
                                    setSelectedGenericId(null); // Reset selection if they type
                                    setShowGenericDropdown(true);
                                }} 
                                onFocus={() => setShowGenericDropdown(true)}
                                onBlur={() => setTimeout(() => setShowGenericDropdown(false), 200)}
                                required 
                                placeholder="Search & Select Generic..." 
                            />
                            {showGenericDropdown && getFilteredGenerics().length > 0 && (
                                <div className="rx-dx-dropdown w-100 position-absolute" style={{zIndex: 1000}}>
                                    {getFilteredGenerics().map(g => (
                                        <div 
                                            key={g.id} 
                                            className="rx-dx-option" 
                                            onMouseDown={(e) => { e.preventDefault(); handleSelectGeneric(g); }}
                                        >
                                            <HighlightMatch text={g.name} query={genericQuery} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Medicine Name */}
                        <div className="mb-custom mb-3 position-relative">
                            <label className="form-label">Medicine Name</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={medicineQuery} 
                                onChange={(e) => {
                                    setMedicineQuery(e.target.value);
                                    setShowMedicineDropdown(true);
                                }} 
                                onFocus={() => setShowMedicineDropdown(true)}
                                onBlur={() => setTimeout(() => setShowMedicineDropdown(false), 200)}
                                required 
                                disabled={!selectedGenericId}
                                placeholder={selectedGenericId ? "e.g., Napa 500 mg" : "Select a generic first..."} 
                            />
                            {showMedicineDropdown && getFilteredMedicines().length > 0 && (
                                <div className="rx-dx-dropdown w-100 position-absolute" style={{zIndex: 999}}>
                                    {getFilteredMedicines().map(m => (
                                        <div 
                                            key={m.id} 
                                            className="rx-dx-option" 
                                            onMouseDown={(e) => { e.preventDefault(); handleSelectMedicine(m); }}
                                        >
                                            <HighlightMatch text={m.name} query={medicineQuery} />
                                        </div>
                                    ))}
                                </div>
                            )}
                            <small className="text-muted mt-1 d-block" style={{fontSize: '0.75rem'}}>
                                Suggestions appear to prevent duplicates. You can type a new name to create it.
                            </small>
                        </div>

                        {/* Price */}
                        <div className="mb-custom mb-3">
                            <label className="form-label">Price (৳)</label>
                            <input 
                                type="number" 
                                className="form-control" 
                                value={price} 
                                onChange={(e) => setPrice(e.target.value)} 
                                placeholder="0" 
                                min="0"
                                step="1"
                            />
                        </div>

                        {/* Warnings */}
                        <div className="mb-custom mb-4">
                            <label className="form-label">Warnings & Instructions (Optional)</label>
                            <textarea 
                                className="form-control" 
                                rows="3" 
                                value={warnings} 
                                onChange={(e) => setWarnings(e.target.value)} 
                                placeholder="e.g., Take after meal."
                                style={{ fontFamily: "'Google Sans', sans-serif", fontSize: '0.9rem', color: 'var(--luna-navy)' }}
                            />
                        </div>

                        <button 
                            type="submit" 
                            className="btn btn-modern w-100 text-white border-0 shadow-sm" 
                            style={{background: 'linear-gradient(135deg, #26A69A 0%, #0288D1 100%)', fontWeight: '700'}} 
                            disabled={isSubmitting || !selectedGenericId}
                        >
                            {isSubmitting ? 'Saving...' : 'Add Medicine'}
                        </button>
                    </form>
                </div>
            </div>
        </Container>
    );
};

export default OfficerAddMedicine;