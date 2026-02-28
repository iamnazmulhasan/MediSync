import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { laboratoryAPI, pharmacyAPI } from '../api/api';
import Swal from 'sweetalert2';
import { 
    FaHospital, FaClinicMedical, FaEnvelope, FaPhone, FaUserTie, 
    FaMoneyBillWave, FaArrowLeft, FaIdCard, FaMapMarkerAlt, FaTags,
    FaPen, FaCheck, FaTimes, FaCheckCircle, FaBan, FaLock
} from 'react-icons/fa';

const ViewBusiness = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Check which ID was passed
    const labId = location.state?.labId;
    const pharmacyId = location.state?.pharmacyId;
    
    const isPharmacy = !!pharmacyId;
    const activeBusinessId = labId || pharmacyId;

    const loggedInUser = JSON.parse(localStorage.getItem('user')) || {};
    const isOfficer = loggedInUser.role === 'officer';

    const [business, setBusiness] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Edit States
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});

    useEffect(() => {
        const fetchDetails = async () => {
            if (!activeBusinessId) {
                setError("No business selected.");
                setLoading(false);
                return;
            }
            try {
                let res;
                if (isPharmacy) {
                    res = await pharmacyAPI.getPharmacy(activeBusinessId);
                } else {
                    res = await laboratoryAPI.getLab(activeBusinessId);
                }
                setBusiness(res.data);
            } catch (err) {
                console.error("Failed to fetch business details", err);
                setError("Failed to load business profile.");
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [activeBusinessId, isPharmacy]);

    const handleEditToggle = () => {
        if (isEditing) {
            setIsEditing(false);
            setEditForm({});
        } else {
            setEditForm({ ...business });
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
            if (editForm[key] !== business[key]) {
                changedData[key] = editForm[key];
                hasChanges = true;
            }
        });

        if (!hasChanges) {
            setIsEditing(false);
            return;
        }

        try {
            if (isPharmacy) {
                await pharmacyAPI.updatePharmacy(business.id, changedData);
            } else {
                await laboratoryAPI.updateLab(business.id, changedData);
            }
            
            setBusiness({ ...business, ...changedData });
            Swal.fire({ icon: 'success', title: 'Business Updated', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
            setIsEditing(false);
        } catch (error) {
            console.error("Update failed", error);
            Swal.fire({ icon: 'error', title: 'Update Failed', text: 'Could not save changes.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        }
    };

    // --- CHANGE PASSWORD HANDLER ---
    const handleChangePassword = () => {
        const eyeIcon = `<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 576 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M572.52 241.4C518.29 135.59 410.93 64 288 64S57.68 135.64 3.48 241.41a32.35 32.35 0 0 0 0 29.19C57.71 376.41 165.07 448 288 448s230.32-71.64 284.52-177.41a32.35 32.35 0 0 0 0-29.19zM288 400a144 144 0 1 1 144-144 143.93 143.93 0 0 1-144 144zm0-240a95.31 95.31 0 0 0-25.31 3.79 47.85 47.85 0 0 1-66.9 66.9A95.78 95.78 0 1 0 288 160z"></path></svg>`;
        const eyeSlashIcon = `<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 640 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M320 400c-75.85 0-137.25-58.71-142.9-133.11L72.2 185.82c-13.79 17.3-26.48 35.59-36.72 55.59a32.35 32.35 0 0 0 0 29.19C89.71 376.41 197.07 448 320 448c26.91 0 52.87-4 77.89-10.46L346 397.39a144.13 144.13 0 0 1-26 2.61zm313.82 58.1l-110.55-85.44a331.25 331.25 0 0 0 81.25-102.07 32.35 32.35 0 0 0 0-29.19C550.29 135.59 442.93 64 320 64a308.15 308.15 0 0 0-147.32 37.7L45.46 3.37A16 16 0 0 0 23 6.18L3.37 31.45A16 16 0 0 0 6.18 53.9l588.36 454.73a16 16 0 0 0 22.46-2.81l19.64-25.27a16 16 0 0 0-2.82-22.45zm-179.16-138.48-73.93-57.14a96 96 0 0 1-23.34 23.35l-57.14-73.93c7.8-1.76 15.86-2.9 24.25-2.9a96 96 0 0 1 96 96c0 8.39-1.14 16.45-2.9 24.25zM320 240a95.25 95.25 0 0 0-6.19 33.39l-60.52-46.78a143.51 143.51 0 0 1 66.71-66.71l46.78 60.52A95.25 95.25 0 0 0 320 240z"></path></svg>`;

        Swal.fire({
            title: 'Change Password',
            width: 400,
            buttonsStyling: false,
            html: `
                <div class="text-start px-2">
                    <label class="form-label text-muted fw-bold text-uppercase swal-label-tight">New Password</label>
                    <div class="position-relative">
                        <input type="password" id="new_pass" class="form-control swal-input-tight" placeholder="">
                        <span id="toggle_new_pass" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #6c757d;">
                            ${eyeIcon}
                        </span>
                    </div>
                    
                    <label class="form-label text-muted fw-bold text-uppercase swal-label-tight mt-2">Confirm Password</label>
                    <div class="position-relative">
                        <input type="password" id="confirm_pass" class="form-control swal-input-tight" placeholder="">
                        <span id="toggle_confirm_pass" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #6c757d;">
                            ${eyeIcon}
                        </span>
                    </div>
                    <div id="pass-match-msg" class="mt-1 small fw-bold" style="height: 16px; font-size: 0.75rem;"></div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Save',
            cancelButtonText: 'Cancel',
            customClass: {
                popup: 'rounded-4 swal-compact-popup',
                title: 'swal-pass-title',
                confirmButton: 'btn-save-glow',
                cancelButton: 'btn-cancel-simple',
                actions: 'd-flex gap-1 justify-content-center mt-2'
            },
            didOpen: () => {
                const newPassInput = Swal.getPopup().querySelector('#new_pass');
                const confirmPassInput = Swal.getPopup().querySelector('#confirm_pass');
                const toggleNewPass = Swal.getPopup().querySelector('#toggle_new_pass');
                const toggleConfirmPass = Swal.getPopup().querySelector('#toggle_confirm_pass');
                const msgDiv = Swal.getPopup().querySelector('#pass-match-msg');

                const toggleVisibility = (input, iconSpan) => {
                    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                    input.setAttribute('type', type);
                    iconSpan.innerHTML = type === 'password' ? eyeIcon : eyeSlashIcon;
                };

                toggleNewPass.addEventListener('click', () => toggleVisibility(newPassInput, toggleNewPass));
                toggleConfirmPass.addEventListener('click', () => toggleVisibility(confirmPassInput, toggleConfirmPass));

                const checkMatch = () => {
                    const p1 = newPassInput.value;
                    const p2 = confirmPassInput.value;
                    if (!p1 || !p2) { msgDiv.innerHTML = ''; return; }
                    if (p1 === p2) {
                        msgDiv.innerHTML = '<span class="text-success"><i class="fas fa-check-circle"></i> Matched</span>';
                    } else {
                        msgDiv.innerHTML = '<span class="text-danger">Mismatch</span>';
                    }
                };

                newPassInput.addEventListener('input', checkMatch);
                confirmPassInput.addEventListener('input', checkMatch);
            },
            preConfirm: async () => {
                const newPass = Swal.getPopup().querySelector('#new_pass').value;
                const confirmPass = Swal.getPopup().querySelector('#confirm_pass').value;

                if (!newPass || !confirmPass) {
                    Swal.showValidationMessage('Fill all fields');
                    return false;
                }
                if (newPass !== confirmPass) {
                    Swal.showValidationMessage('Passwords do not match');
                    return false;
                }

                try {
                    const payload = { password: newPass };
                    if (isPharmacy) {
                        await pharmacyAPI.updatePharmacy(business.id, payload);
                    } else {
                        await laboratoryAPI.updateLab(business.id, payload);
                    }
                    return true;
                } catch (error) {
                    Swal.showValidationMessage(error.response?.data?.message || 'Failed to update password');
                    return false;
                }
            }
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({ icon: 'success', title: 'Password changed successfully', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
            }
        });
    };

    const renderField = (name, value, icon, isLocked = false, type = "text") => {
        if (isEditing && !isLocked) {
            return (
                <div className="d-flex align-items-center w-100">
                    {icon && <span className="me-2 opacity-50">{icon}</span>}
                    <input type={type} name={name} value={editForm[name] || ''} onChange={handleInputChange} className="editable-field" />
                </div>
            );
        }
        return (
            <div className="info-value d-flex align-items-center gap-2">
                {icon && React.cloneElement(icon, { size: 14, className: "opacity-50" })} 
                {value || 'N/A'}
            </div>
        );
    };

    if (loading) return <div className="d-flex justify-content-center align-items-center vh-100 font-body">Loading Business...</div>;
    if (error) return <div className="d-flex justify-content-center align-items-center vh-100 font-body text-danger">{error}</div>;
    if (!business) return null;

    return (
        <div className="container-fluid py-5 px-4 px-lg-5 fade-in">
            <button 
                onClick={() => navigate(-1)} 
                className="btn btn-light mb-4 d-flex align-items-center gap-2 shadow-sm rounded-pill px-3"
                style={{fontFamily: "'Google Sans', sans-serif", fontWeight: '600', color: '#546E7A', width: 'fit-content'}}
            >
                <FaArrowLeft size={12} /> Back
            </button>

            <div className="row g-5">
                <div className="col-lg-5 col-xl-4">
                    <div className="profile-img-card mb-4 position-relative" style={{background: 'linear-gradient(135deg, #E1F5FE 0%, #B3E5FC 100%)'}}>
                        <div className="profile-placeholder-img" style={{background: 'transparent', color: 'var(--luna-mid)'}}>
                            {isPharmacy ? <FaClinicMedical size={130} style={{opacity: 0.8}} /> : <FaHospital size={130} style={{opacity: 0.8}} />}
                        </div>

                        {isOfficer && (
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
                                    <>
                                        <div className="action-btn-circle" onClick={handleEditToggle} title="Edit Business">
                                            <FaPen size={14} />
                                        </div>
                                        <div className="action-btn-circle" onClick={handleChangePassword} title="Change Password">
                                            <FaLock size={14} />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="d-flex flex-wrap gap-2">
                         <div className={`status-pill ${business.active ? 'active' : 'inactive'}`}>
                            {business.active ? <FaCheckCircle /> : <FaBan />}
                            <span>{business.active ? 'Active' : 'Inactive'}</span>
                         </div>
                    </div>
                </div>

                <div className="col-lg-7 col-xl-8 ps-lg-4">
                    <div className="mb-4">
                        <div className="font-serif-italic mb-2 fs-5">{isPharmacy ? 'Pharmacy Profile' : 'Laboratory Profile'}</div>
                        {isEditing ? (
                            <input type="text" name="name" className="name-input-edit display-4 mb-2" value={editForm.name || ''} onChange={handleInputChange} />
                        ) : (
                            <h1 className="font-heading display-4 mb-2" style={{color: 'var(--luna-navy)'}}>
                                {business.name}
                            </h1>
                        )}
                        <div className="d-flex align-items-center text-muted gap-2 font-body">
                            <span>Registered Medical {isPharmacy ? 'Pharmacy' : 'Laboratory'}</span>
                        </div>
                    </div>

                    <div className="section-divider"></div>

                    <div className="mb-5">
                        <h4 className="font-heading mb-4 text-capitalize">Business Details</h4>
                        
                        <div className="row g-4">
                            <div className="col-md-6">
                                <div className="info-label">Contact Email</div>
                                {renderField('email', business.email, <FaEnvelope />)} 
                            </div>

                            <div className="col-md-6">
                                <div className="info-label">Mobile Number</div>
                                {renderField('mobile', business.mobile, <FaPhone />)}
                            </div>

                            <div className="col-md-6">
                                <div className="info-label">Owner Name</div>
                                {renderField('owner_name', business.owner_name, <FaUserTie />, true)} 
                            </div>

                            <div className="col-md-6">
                                <div className="info-label">Owner's Person ID</div>
                                {renderField('owner', business.owner, <FaIdCard />, true)} 
                            </div>
                            
                            {/* PHARMACY SPECIFIC FIELDS */}
                            {isPharmacy && (
                                <>
                                    <div className="col-12">
                                        <div className="info-label">Location Address</div>
                                        {renderField('address', business.address, <FaMapMarkerAlt />)} 
                                    </div>
                                    <div className="col-md-6">
                                        <div className="info-label">Discount Percentage</div>
                                        <div className="info-value d-flex align-items-center gap-2">
                                            {isEditing ? (
                                                <div className="d-flex align-items-center w-100">
                                                    <FaTags className="me-2 opacity-50" size={14} />
                                                    <input type="number" step="0.01" name="discount_percentage" value={editForm.discount_percentage || ''} onChange={handleInputChange} className="editable-field" />
                                                </div>
                                            ) : (
                                                <>
                                                    <FaTags className="opacity-50" size={14} />
                                                    {business.discount_percentage ? `${business.discount_percentage}%` : '0%'}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="col-md-6">
                                <div className="info-label">Current Balance</div>
                                <div className="info-value d-flex align-items-center gap-2" style={{color: '#2E7D32', fontWeight: 700}}>
                                    <FaMoneyBillWave className="opacity-50" size={14} />
                                    ৳ {business.balance ? Math.round(parseFloat(business.balance)) : 0}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewBusiness;