import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaHandPointer, FaLanguage, FaHeadset, FaQuestionCircle, FaGift } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { authAPI } from '../api/api';

const PaymentGateway = () => {
    const location = useLocation();
    const navigate = useNavigate();
    
    const [processing, setProcessing] = useState(false);
    const [agreed, setAgreed] = useState(false);
    
    // Tab States
    const [activeTab, setActiveTab] = useState('mobile'); 
    const [selectedMFS, setSelectedMFS] = useState('bkash');
    
    // Input States
    const [mobileNumber, setMobileNumber] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [accountNumber, setAccountNumber] = useState('');

    const amount = location.state?.amount || 10.00;
    const user = JSON.parse(localStorage.getItem('user'));

    const handlePay = async () => {
        if (!agreed) return;
        setProcessing(true);
        
        try {
            // 1. Fetch current profile to get exact ID and latest balance
            const roleType = user.role.toLowerCase();
            const profileRes = await authAPI.checkProfile(roleType, user.email);
            
            let profileData = null;
            if (profileRes.data[roleType]) {
                profileData = profileRes.data[roleType];
            } else if (profileRes.data.exists && profileRes.data[roleType]) {
                profileData = profileRes.data[roleType];
            }

            if (!profileData || !profileData.id) {
                throw new Error("Could not fetch user profile details.");
            }

            const currentBalance = parseFloat(profileData.balance || 0);
            const newBalance = currentBalance + amount;

            // 2. Patch the new balance
            await authAPI.updateProfile({
                type: roleType,
                id: profileData.id,
                data: {
                    balance: newBalance.toFixed(2)
                }
            });

            // 3. Fake delay to make the gateway feel "real", then show success
            setTimeout(() => {
                setProcessing(false);
                Swal.fire({
                    icon: 'success',
                    title: 'Transaction Successful',
                    text: `৳${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} added to your wallet.`,
                    timer: 2500,
                    showConfirmButton: false,
                    customClass: { popup: 'swal-modern-popup' }
                }).then(() => {
                    navigate('/wallet'); // Go back to wallet automatically
                });
            }, 2000);

        } catch (error) {
            console.error("Payment failed", error);
            setProcessing(false);
            Swal.fire({
                icon: 'error',
                title: 'Transaction Failed',
                text: 'We could not update your balance. Please try again.',
                customClass: { popup: 'swal-modern-popup' }
            });
        }
    };

    // Relaxed Validation: Just checks if the input is not entirely empty
    const isPayDisabled = () => {
        if (!agreed || processing) return true;
        if (activeTab === 'mobile' && mobileNumber.trim() === '') return true;
        if (activeTab === 'cards' && cardNumber.trim() === '') return true;
        if (activeTab === 'netbanking' && accountNumber.trim() === '') return true;
        return false;
    };

    return (
        <div className="ssl-mock-bg">
            <div className="ssl-mock-card fade-in">
                
                <div className="ssl-logo-wrapper">
                    <FaHandPointer />
                    <span className="ssl-logo-text">DEMO</span>
                </div>

                <div className="ssl-top-actions">
                    <FaLanguage className="ssl-lang-icon" title="Language Translation" />
                </div>

                <div className="ssl-merchant-name">EASY COM BD</div>

                <div className="ssl-quick-links">
                    <a href="#!" className="ssl-link-item"><FaHeadset />Support</a>
                    <a href="#!" className="ssl-link-item"><FaQuestionCircle />FAQ</a>
                    <a href="#!" className="ssl-link-item"><FaGift />Offers</a>
                </div>

                <div className="ssl-tabs-row">
                    <div className={`ssl-tab ${activeTab === 'cards' ? 'active' : ''}`} onClick={() => setActiveTab('cards')}>CARDS</div>
                    <div className={`ssl-tab ${activeTab === 'mobile' ? 'active' : ''}`} onClick={() => setActiveTab('mobile')}>MOBILE BANKING</div>
                    <div className={`ssl-tab ${activeTab === 'netbanking' ? 'active' : ''}`} onClick={() => setActiveTab('netbanking')}>NET BANKING</div>
                </div>

                <div className="ssl-content-area">
                    {/* -- MOBILE BANKING VIEW -- */}
                    {activeTab === 'mobile' && (
                        <div className="fade-in">
                            <div className="ssl-mobile-logos">
                                <div className={`ssl-mfs-logo ${selectedMFS === 'bkash' ? 'active' : ''}`} onClick={() => setSelectedMFS('bkash')}>
                                    <img src="https://sif.gatesfoundation.org/-/media/sif/portfolio-co-logos/updated-logos/bkash-540x270.png" alt="bKash" />
                                </div>
                                <div className={`ssl-mfs-logo ${selectedMFS === 'nagad' ? 'active' : ''}`} onClick={() => setSelectedMFS('nagad')}>
                                    <img src="https://www.logo.wine/a/logo/Nagad/Nagad-Logo.wine.svg" alt="Nagad" style={{transform: 'scale(1.5)'}} />
                                </div>
                            </div>
                            <input 
                                type="text" 
                                className="ssl-input" 
                                placeholder={`Enter ${selectedMFS === 'bkash' ? 'bKash' : 'Nagad'} Account Number`} 
                                value={mobileNumber}
                                onChange={(e) => setMobileNumber(e.target.value)}
                                disabled={processing}
                            />
                        </div>
                    )}

                    {/* -- CARDS VIEW -- */}
                    {activeTab === 'cards' && (
                        <div className="fade-in">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <img src="https://raw.githubusercontent.com/muhammederdem/credit-card-form/master/src/assets/images/visa.png" alt="Visa" height="20" />
                                <img src="https://raw.githubusercontent.com/muhammederdem/credit-card-form/master/src/assets/images/mastercard.png" alt="MC" height="24" />
                                <span style={{fontSize: '0.8rem', color: '#3983d5', cursor: 'pointer'}}>Other Cards</span>
                            </div>
                            <input type="text" className="ssl-input" placeholder="Enter Card Number" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} disabled={processing} />
                            <div className="ssl-mock-grid">
                                <input type="text" className="ssl-input mb-0" placeholder="MM/YY" disabled={processing} />
                                <input type="text" className="ssl-input mb-0" placeholder="CVC/CVV" disabled={processing} />
                            </div>
                            <input type="text" className="ssl-input" placeholder="Card Holder Name" disabled={processing} />
                        </div>
                    )}

                    {/* -- NET BANKING VIEW -- */}
                    {activeTab === 'netbanking' && (
                        <div className="fade-in">
                            <select className="ssl-input" disabled={processing}>
                                <option value="">Select Bank</option>
                                <option value="city">City Bank</option>
                                <option value="brac">BRAC Bank</option>
                                <option value="dbbl">Dutch-Bangla Bank</option>
                            </select>
                            <input type="text" className="ssl-input" placeholder="Enter Account Number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} disabled={processing} />
                        </div>
                    )}

                    {/* Terms and Conditions Box */}
                    <div className="ssl-terms-box">
                        <label className="ssl-terms-label">
                            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} disabled={processing} style={{marginTop: '4px', cursor: 'pointer'}} />
                            <span>Remember Me</span>
                        </label>
                        <div className="ssl-terms-subtext">
                            By checking this box you agree to the <a href="#!" className="ssl-terms-link" onClick={(e) => e.preventDefault()}>Terms & Conditions</a>
                        </div>
                    </div>
                </div>

                {/* Footer Pay Button */}
                <button className="ssl-pay-btn" onClick={handlePay} disabled={isPayDisabled()}>
                    {processing ? (
                        <span>Processing...</span>
                    ) : (
                        <>
                            <FaHandPointer size={18} />
                            PAY {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </>
                    )}
                </button>

                <div 
                    onClick={() => !processing && navigate('/wallet')} 
                    style={{position: 'absolute', bottom: '-35px', left: '50%', transform: 'translateX(-50%)', color: '#90A4AE', fontSize: '0.85rem', cursor: 'pointer'}}
                >
                    Cancel and return to site
                </div>
            </div>
        </div>
    );
};

export default PaymentGateway;