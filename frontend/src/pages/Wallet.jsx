import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { FaArrowUp, FaArrowDown, FaPlus, FaHistory, FaCheckCircle, FaClock } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { authAPI, coreAPI, transactionAPI } from '../api/api';

const Toast = Swal.mixin({
    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true,
    didOpen: (toast) => { toast.addEventListener('mouseenter', Swal.stopTimer); toast.addEventListener('mouseleave', Swal.resumeTimer); }
});

// --- STATIC USER TYPES DATA ---
const STATIC_USER_TYPES = [
    { "id": 1, "name": "doctor" },
    { "id": 2, "name": "patient" },
    { "id": 3, "name": "laboratory" },
    { "id": 4, "name": "pharmacy" },
    { "id": 5, "name": "officer" }
];

const Wallet = () => {
    const navigate = useNavigate();
    const [balance, setBalance] = useState(0.00);
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState([]);
    
    // Core data for API requests
    const [profileId, setProfileId] = useState(null);

    const user = JSON.parse(localStorage.getItem('user')) || {};

    const formatDOB = (dobString) => {
        if (!dobString) return 'N/A';
        const dateObj = new Date(dobString);
        if (isNaN(dateObj)) return dobString;
        return dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formattedDate = formatDOB(user?.dob);
    const displayName = user?.name || "Account Holder";
    const cardBgImage = 'https://raw.githubusercontent.com/muhammederdem/credit-card-form/master/src/assets/images/9.jpeg';

    // --- FETCH WALLET BALANCE & TRANSACTIONS (ON LOAD / REDIRECT ONLY) ---
    useEffect(() => {
        if (!user?.email || !user?.role) return;
        let isMounted = true;

        const fetchWalletData = async () => {
            try {
                // 1. Fetch Profile Balance & ID
                const roleType = user.role.toLowerCase();
                const response = await authAPI.checkProfile(roleType, user.email);
                
                let currentProfileId = null;

                if (isMounted && response.data) {
                    let profileData = response.data[roleType] || (response.data.exists && response.data[roleType]);
                    if (!profileData && response.data.id) profileData = response.data; // Fallback for business accounts

                    if (profileData) {
                        if (profileData.balance !== undefined) setBalance(Number(profileData.balance));
                        if (profileData.id !== undefined) {
                            setProfileId(profileData.id);
                            currentProfileId = profileData.id;
                        }
                    }
                }

                // 2. Fetch Live Transactions
                if (isMounted && currentProfileId) {
                    const txRes = await transactionAPI.getUserTransactions(currentProfileId, roleType);
                    const txData = txRes.data.results || [];
                    
                    // Map API data to UI structure
                    const mappedTransactions = txData.map(tx => {
                        // If I am the receiver, it's a credit. If I am the sender, it's a debit.
                        const isCredit = tx.receiver_id === currentProfileId && tx.receiver_type_name === roleType;
                        
                        let desc = 'Transaction';
                        if (isCredit) {
                            desc = tx.sender_type === 5 ? 'Cash In via Officer' : 'Received Funds';
                        } else {
                            desc = 'Cash Out';
                        }

                        return {
                            id: tx.id,
                            type: isCredit ? 'credit' : 'debit',
                            amount: parseFloat(tx.amount),
                            desc: desc,
                            date: tx.created_at,
                            status: 'completed', // Using 'completed' by default as per the sample API
                            officerId: tx.sender_type === 5 ? tx.sender_id : null
                        };
                    });

                    setTransactions(mappedTransactions);
                }

            } catch (err) {
                console.error("Failed to fetch wallet data", err);
            } finally {
                if (isMounted) setLoading(false); 
            }
        };

        // Fire strictly once on page load or redirect
        fetchWalletData();

        return () => {
            isMounted = false;
        };
    }, [user?.email, user?.role]); 

    const handleCashIn = async () => {
        const { value: amount, isConfirmed } = await Swal.fire({
            title: 'Enter Amount',
            input: 'number',
            inputLabel: 'Amount in BDT (৳)',
            showCancelButton: true,
            confirmButtonText: 'Proceed to Payment',
            cancelButtonText: 'Cancel',
            buttonsStyling: false,
            customClass: { 
                popup: 'swal-modern-popup', 
                title: 'swal-modern-title',
                confirmButton: 'swal-btn-proceed',
                cancelButton: 'swal-btn-cancel',
                input: 'swal-modern-input'
            },
            inputValidator: (value) => {
                if (!value || value <= 0) {
                    return 'Please enter a valid amount!';
                }
            }
        });

        if (isConfirmed && amount) {
            navigate('/payment-gateway', { state: { amount: parseFloat(amount) } });
        }
    };

    const handleCashOut = () => {
        if (!profileId) {
            Toast.fire({ icon: 'warning', title: 'Wallet initializing. Please wait a second.' });
            return;
        }

        // Dynamically find the matching Type ID from our STATIC array
        const currentTypeObj = STATIC_USER_TYPES.find(t => t.name.toLowerCase() === user.role.toLowerCase());
        
        if (!currentTypeObj) {
            Toast.fire({ icon: 'error', title: 'Invalid user type configuration.' });
            return;
        }

        // Instant popup without loading state
        Swal.fire({
            title: 'Request Cash Out',
            width: 320, 
            html: `
                <div class="text-center px-2">
                    <label class="form-label text-muted fw-bold text-uppercase swal-label-tight">Amount (৳)</label>
                    <input type="number" id="cashout_amount" class="form-control swal-input-tight mx-auto text-center" min="1" max="${balance}" step="1" style="width: 80%;">
                    
                    <label class="form-label text-muted fw-bold text-uppercase swal-label-tight mt-2">Note (Optional)</label>
                    <textarea id="cashout_note" class="form-control swal-input-tight mx-auto" rows="2" style="width: 80%;"></textarea>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Send Request',
            cancelButtonText: 'Cancel',
            buttonsStyling: false,
            customClass: { 
                popup: 'rounded-4 swal-compact-popup',
                title: 'swal-pass-title',
                confirmButton: 'btn-save-glow',
                cancelButton: 'btn-cancel-simple',
                actions: 'd-flex gap-1 justify-content-center mt-3'
            },
            preConfirm: async () => {
                const amountInput = Swal.getPopup().querySelector('#cashout_amount').value;
                const noteInput = Swal.getPopup().querySelector('#cashout_note').value;

                const amountVal = parseFloat(amountInput);

                if (!amountInput || amountVal <= 0) {
                    Swal.showValidationMessage('Please enter a valid amount.');
                    return false;
                }
                if (amountVal > balance) {
                    Swal.showValidationMessage('Insufficient balance.');
                    return false;
                }

                try {
                    const payload = {
                        requester_id: parseInt(profileId, 10),
                        requester_type: parseInt(currentTypeObj.id, 10),
                        amount: amountVal.toFixed(2),
                        note: noteInput.trim() || null
                    };

                    await coreAPI.requestCashout(payload);
                    return payload;
                } catch (error) {
                    Swal.showValidationMessage(error.response?.data?.message || 'Failed to submit request.');
                    return false;
                }
            }
        }).then((result) => {
            if (result.isConfirmed) {
                // FIXED: Removed the optimistic deduction. Balance stays the same.
                Swal.fire({ 
                    icon: 'success', 
                    title: 'Request Sent', 
                    text: 'Your cash out request is pending officer approval.', 
                    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 
                });
            }
        });
    };

    return (
        <Container fluid className="px-4 pb-5 pt-4 wallet-page-wrapper">
            <div className="d-flex justify-content-between align-items-center mb-4 fade-in">
                <div>
                    <h2 className="page-title-serif mb-0">My Wallet</h2>
                    <p className="text-muted font-body small mb-0 mt-1">Manage your balances and transactions</p>
                </div>
            </div>

            {loading ? (
                <div className="loading-container fade-in mt-5 text-center">
                    <div className="custom-spinner mx-auto mb-3"></div>
                    <p style={{fontFamily: "'Google Sans Flex', sans-serif", fontWeight: '500'}}>Loading Wallet...</p>
                </div>
            ) : (
                <Row className="g-0 fade-in">
                    <Col xs={12}>
                        <div className="card-item-wrapper">
                            <div className="card-item">
                                <div className="card-item__side">
                                    <div className="card-item__cover">
                                        <img src={cardBgImage} className="card-item__bg" alt="card background" />
                                    </div>
                                    
                                    <div className="card-item__wrapper">
                                        <div className="card-item__top">
                                            <img src="https://raw.githubusercontent.com/muhammederdem/credit-card-form/master/src/assets/images/chip.png" className="card-item__chip" alt="chip" />
                                            <div className="card-item__type">
                                                <img src="https://raw.githubusercontent.com/muhammederdem/credit-card-form/master/src/assets/images/visa.png" className="card-item__typeImg" alt="brand" />
                                            </div>
                                        </div>
                                        
                                        <div className="card-item__number">
                                            <span className="balance-currency-wallet">৳</span> 
                                            {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                        
                                        <div className="card-item__content">
                                            <div className="card-item__info">
                                                <div className="card-item__holder">Account Holder</div>
                                                <div className="card-item__name">{displayName}</div>
                                            </div>
                                            <div className="card-item__date">
                                                <div className="card-item__dateTitle">DOB</div>
                                                <div className="card-item__dateItem">{formattedDate}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Centered Buttons */}
                        <div className="d-flex justify-content-center gap-3 mb-0 pb-3">
                            <button className="btn-cash-in" onClick={handleCashIn}>
                                <FaPlus className="me-2" size={12} /> Cash In
                            </button>
                            <button className="btn-cash-out" onClick={handleCashOut}>
                                <FaArrowUp className="me-2" size={12} /> Cash Out
                            </button>
                        </div>
                    </Col>

                    <Col xs={12}>
                        <div className="txn-container">
                            <h4 className="txn-header">
                                <FaHistory style={{color: '#0277BD'}} size={18} /> Recent Transactions
                            </h4>

                            {transactions.length > 0 ? (
                                transactions.map((txn) => {
                                    const dateObj = new Date(txn.date);
                                    const txnFormattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                    const formattedTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                                    const isCredit = txn.type === 'credit';

                                    return (
                                        <div key={txn.id} className="txn-item">
                                            <div className={`txn-icon ${isCredit ? 'credit' : 'debit'}`}>
                                                {isCredit ? <FaArrowDown size={16} /> : <FaArrowUp size={16} />}
                                            </div>
                                            
                                            <div className="txn-details">
                                                <div className="txn-title">{txn.desc}</div>
                                                {txn.officerId && (
                                                    <div className="text-muted mb-1" style={{fontSize: '0.7rem', fontWeight: 600}}>Officer ID: #{txn.officerId}</div>
                                                )}
                                                <div className="txn-date">{txnFormattedDate} • {formattedTime}</div>
                                            </div>
                                            
                                            <div className="txn-amount-box">
                                                <div className={`txn-amount ${isCredit ? 'credit' : 'debit'}`}>
                                                    {isCredit ? '+' : '-'} ৳{txn.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </div>
                                                <div className={`txn-status ${txn.status === 'completed' ? 'status-completed' : 'status-pending'}`}>
                                                    {txn.status === 'completed' ? <FaCheckCircle size={10}/> : <FaClock size={10}/>} 
                                                    {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-5 text-muted">
                                    <div className="mb-3 mx-auto" style={{width: '60px', height: '60px', borderRadius: '50%', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                        <FaHistory size={24} color="#cbd5e1"/>
                                    </div>
                                    <h6 style={{fontFamily: "'Google Sans Flex', sans-serif"}}>No transactions yet</h6>
                                    <p className="small">Your recent wallet activity will appear here.</p>
                                </div>
                            )}
                        </div>
                    </Col>
                </Row>
            )}
        </Container>
    );
};

export default Wallet;