import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pharmacyAPI, laboratoryAPI, authAPI } from '../api/api';
import Swal from 'sweetalert2';
import { 
    FaEnvelope, FaPhone, FaMapMarkerAlt, FaPen, FaCheck, FaTimes, 
    FaCheckCircle, FaBan, FaLock, FaBuilding, FaUserTie, FaPercentage,
    FaFlask, FaPills, FaWallet
} from 'react-icons/fa';

const BusinessProfile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Edit Mode States
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});

    useEffect(() => {
        const loadBusinessData = async () => {
            const storedUserStr = localStorage.getItem('user');
            if (!storedUserStr) { navigate('/business'); return; }

            const storedUser = JSON.parse(storedUserStr);
            setUser(storedUser); 

            try {
                let response;
                if (storedUser.role === 'pharmacy') {
                    response = await pharmacyAPI.getPharmacy(storedUser.id);
                } else if (storedUser.role === 'laboratory') {
                    response = await laboratoryAPI.getLab(storedUser.id);
                }

                if (response && response.data) {
                    const updatedUser = { ...storedUser, ...response.data };
                    setUser(updatedUser);
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                }
            } catch (error) {
                console.error("Failed to refresh business data", error);
            } finally {
                setLoading(false);
            }
        };
        loadBusinessData();
    }, [navigate]);

    const handleEditToggle = () => {
        if (isEditing) {
            setIsEditing(false);
            setEditForm({});
        } else {
            setEditForm({ ...user });
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
            let newVal = editForm[key];
            let oldVal = user[key];

            if (newVal === "") newVal = null;
            if (oldVal === "") oldVal = null; 

            if (newVal !== oldVal) {
                changedData[key] = newVal;
                hasChanges = true;
            }
        });

        // PREVENT EDITING PROTECTED FIELDS (API logic)
        delete changedData.id;
        delete changedData.name; // Cannot edit name
        delete changedData.owner;
        delete changedData.owner_name;
        delete changedData.balance;
        delete changedData.active;

        if (!hasChanges || Object.keys(changedData).length === 0) {
            setIsEditing(false);
            return;
        }

        try {
            if (user.role === 'pharmacy') {
                await pharmacyAPI.updatePharmacy(user.id, changedData);
            } else {
                await laboratoryAPI.updateLab(user.id, changedData);
            }

            const updatedUser = { ...user, ...changedData };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            Swal.fire({
                icon: 'success', title: 'Business Profile Updated',
                toast: true, position: 'top-end', showConfirmButton: false, timer: 2000
            });

            setIsEditing(false);

        } catch (error) {
            console.error("Update failed", error);
            Swal.fire({
                icon: 'error', title: 'Update Failed', text: 'Could not save changes.',
                toast: true, position: 'top-end', showConfirmButton: false, timer: 3000
            });
        }
    };

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
                    await authAPI.changePassword({
                        type: user.role, // "pharmacy" or "laboratory"
                        id: user.id,
                        new_password: newPass
                    });
                    return true;
                } catch (error) {
                    Swal.showValidationMessage(error.response?.data?.message || 'Failed to update password');
                    return false;
                }
            }
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    icon: 'success', title: 'Password changed successfully',
                    toast: true, position: 'top-end', showConfirmButton: false, timer: 2000
                });
            }
        });
    };

    const renderField = (name, value, icon, isLocked = false, type = "text") => {
        if (isEditing && !isLocked) {
            return (
                <div className="d-flex align-items-center w-100">
                    {icon && <span className="me-2 opacity-50">{icon}</span>}
                    <input 
                        type={type}
                        name={name}
                        value={editForm[name] || ''}
                        onChange={handleInputChange}
                        className="editable-field"
                    />
                </div>
            );
        }

        return (
            <div className="info-value d-flex align-items-center gap-2">
                {icon && React.cloneElement(icon, { size: 14, className: "opacity-50" })} 
                {value || <span className="text-muted fst-italic">Not Provided</span>}
            </div>
        );
    };

    if (loading || !user) {
        return <div className="d-flex justify-content-center align-items-center vh-100 font-body">Loading Business Data...</div>;
    }

    const isPharmacy = user.role === 'pharmacy';

    return (
        <div className="container-fluid py-5 px-4 px-lg-5">
            <div className="row g-5">
                
                {/* --- LEFT COLUMN: IMAGE & QUICK STATS --- */}
                <div className="col-lg-5 col-xl-4">
                    <div className="profile-img-card mb-4">
                        <div className="profile-placeholder-img">
                            {isPharmacy ? <FaPills size={120} style={{opacity: 0.5}} /> : <FaFlask size={120} style={{opacity: 0.5}} />}
                        </div>
                        
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
                                <div className="action-btn-circle" onClick={handleEditToggle} title="Edit Business Info">
                                    <FaPen size={14} />
                                </div>
                            )}
                            
                            <div className="action-btn-circle" onClick={handleChangePassword} title="Change Password">
                                <FaLock size={14} />
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats Capsules */}
                    <div className="d-flex flex-wrap gap-2">
                        <div className={`status-pill ${user.active ? 'active' : 'inactive'}`}>
                            {user.active ? <FaCheckCircle /> : <FaBan />}
                            <span>{user.active ? 'Active Operation' : 'Inactive'}</span>
                        </div>
                        <div className="kindred-pill">
                            <FaWallet className="text-muted" />
                            <span className="fw-bold" style={{fontFamily: 'Google Sans'}}>৳ {parseFloat(user.balance || 0).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* --- RIGHT COLUMN: INFO & DETAILS --- */}
                <div className="col-lg-7 col-xl-8 ps-lg-4">
                    
                    <div className="mb-4">
                        <div className="font-serif-italic mb-2 fs-5">Business Profile of</div>
                        {/* Name cannot be edited based on logic rules */}
                        <h1 className="font-heading display-5 mb-2">{user.name}</h1>
                        
                        <div className="d-flex align-items-center text-muted gap-2 font-body text-uppercase" style={{fontSize: '0.85rem', letterSpacing: '1px', fontWeight: '700'}}>
                            <FaBuilding />
                            <span>Registered {isPharmacy ? 'Pharmacy' : 'Laboratory'}</span>
                        </div>
                    </div>

                    <div className="section-divider"></div>

                    <div className="mb-5">
                        <h4 className="font-heading mb-4">Contact & Location</h4>

                        <div className="row g-4">
                            <div className="col-md-6">
                                <div className="info-label">Email Address</div>
                                {renderField('email', user.email, <FaEnvelope />)} 
                            </div>

                            <div className="col-md-6">
                                <div className="info-label">Mobile Number</div>
                                {renderField('mobile', user.mobile, <FaPhone />)}
                            </div>

                            <div className="col-12">
                                <div className="info-label">Operating Address</div>
                                {renderField('address', user.address, <FaMapMarkerAlt />)}
                            </div>
                        </div>
                    </div>

                    <div className="section-divider"></div>

                    <div className="mb-5">
                        <h4 className="font-heading mb-4">Operational Details</h4>
                        
                        <div className="row g-4">
                            <div className="col-md-6">
                                <div className="info-label">Owner Name</div>
                                <div className="info-value d-flex align-items-center gap-2">
                                    <FaUserTie size={14} className="opacity-50" />
                                    {user.owner_name}
                                </div>
                            </div>

                            {/* Pharmacy specific field */}
                            {isPharmacy && (
                                <div className="col-md-6">
                                    <div className="info-label">Discount Percentage</div>
                                    {isEditing ? (
                                        <div className="d-flex align-items-center w-100 position-relative">
                                            <FaPercentage className="position-absolute ms-2 opacity-50" size={12} />
                                            <input 
                                                type="number"
                                                name="discount_percentage"
                                                value={editForm.discount_percentage || ''}
                                                onChange={handleInputChange}
                                                className="editable-field"
                                                style={{paddingLeft: '25px'}}
                                                step="0.01"
                                                max="100"
                                            />
                                        </div>
                                    ) : (
                                        <div className="info-value d-flex align-items-center gap-2">
                                            <FaPercentage size={14} className="opacity-50" />
                                            {user.discount_percentage ? `${parseFloat(user.discount_percentage).toFixed(2)}%` : '0.00%'}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default BusinessProfile;