import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doctorAPI, officerAPI } from '../api/api';
import { 
    FaUserInjured, FaUserMd, FaHospital, FaClinicMedical, 
    FaFlask, FaCapsules, FaPills, FaUserShield, FaHeadset
} from 'react-icons/fa';

const OfficerDashboard = ({ user }) => {
    const [counts, setCounts] = useState(null);
    const [officerProfile, setOfficerProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Map the raw API keys to beautiful names, routes, specific gradients, and icons
    const cardConfig = {
        patients: { 
            label: 'Patients', 
            path: '/officer/patients', 
            gradient: 'linear-gradient(135deg, #1A2980 0%, #26D0CE 100%)', // Deep Blue to Cyan
            icon: <FaUserInjured size={28} />
        },
        doctors: { 
            label: 'Doctors', 
            path: '/officer/doctors', 
            gradient: 'linear-gradient(135deg, #0575E6 0%, #021B79 100%)', // Vibrant Blue to Dark Navy
            icon: <FaUserMd size={28} />
        },
        laboratories: { 
            label: 'Laboratories', 
            path: '/officer/laboratories', 
            gradient: 'linear-gradient(135deg, #00416A 0%, #E4E5E6 100%)', // Navy to Light Slate
            icon: <FaHospital size={28} />
        },
        pharmacies: { 
            label: 'Pharmacies', 
            path: '/officer/pharmacies', 
            gradient: 'linear-gradient(135deg, #1D976C 0%, #93F9B9 100%)', // Forest Green to Mint
            icon: <FaClinicMedical size={28} />
        },
        tests: { 
            label: 'Lab Tests', 
            path: '/officer/tests', 
            gradient: 'linear-gradient(135deg, #3A1C71 0%, #D76D77 50%, #FFAF7B 100%)', // Purple to Sunset
            icon: <FaFlask size={28} />
        },
        medicine_generics: { 
            label: 'Medicine Generics', 
            path: '/officer/medicine-generics', 
            gradient: 'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)', // Steel Blue to Midnight
            icon: <FaCapsules size={28} />
        },
        medicines: { 
            label: 'Medicines', 
            path: '/officer/medicines', 
            gradient: 'linear-gradient(135deg, #00C9FF 0%, #0072FF 50%, #0042A5 100%)', // Rich 3-stop Ocean Gradient
            icon: <FaPills size={28} />
        }
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user?.person_id) return;
            
            try {
                // 1. Get IDs by person_id
                const idResponse = await doctorAPI.getProfileIds(user.person_id);
                const officerId = idResponse.data.officer_id;

                if (officerId) {
                    // 2. Fetch Officer Specific Profile Data
                    const profileResponse = await officerAPI.getProfile(officerId);
                    setOfficerProfile(profileResponse.data);
                }

                // 3. Fetch Dashboard Counts
                const countsResponse = await officerAPI.getDashboardCounts();
                setCounts(countsResponse.data);

            } catch (error) {
                console.error("Failed to load officer dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    if (loading) {
        return (
            <div className="loading-container mt-5">
                <div className="custom-spinner"></div>
                <div style={{fontFamily: "'Google Sans', sans-serif", fontWeight: 600}}>Loading Dashboard...</div>
            </div>
        );
    }

    // Filter out Receptionists and Officers from the main grid cards
    const gridCards = counts ? Object.entries(counts).filter(([key]) => key !== 'receptionists' && key !== 'officers') : [];
    
    // Extract specific counts for the top header summary
    const receptionistCount = counts?.receptionists || 0;
    const officerCount = counts?.officers || 0;

    return (
        <div className="p-4 w-100 fade-in">
            
            {/* Header Section: Title + Right Aligned Summary */}
            <div className="d-flex justify-content-between align-items-end mb-4 border-bottom pb-3">
                <div>
                    <h2 
                        className="mb-1" 
                        style={{fontFamily: "'Libre Baskerville', serif", fontWeight: '700', fontStyle: 'italic', fontSize: '2.5rem', color: 'var(--luna-navy)'}}
                    >
                        Officer Dashboard
                    </h2>
                    <p 
                        className="text-muted mb-0" 
                        style={{fontFamily: "'Google Sans', sans-serif", fontSize: '0.95rem', letterSpacing: '0.5px'}}
                    >
                        Welcome back, <strong style={{color: 'var(--luna-mid)'}}>{officerProfile?.user?.name || user?.name || 'Officer'}</strong>. Here is the system overview.
                    </p>
                </div>

                {/* Right Aligned Summary */}
                <div className="d-none d-md-flex gap-3 text-end">
                    <div className="bg-light px-3 py-2 rounded-3 border shadow-sm d-flex flex-column align-items-end">
                        <div className="text-muted text-uppercase" style={{fontFamily: "'Google Sans', sans-serif", fontSize: '0.75rem', fontWeight: 800, letterSpacing: '1px'}}>Receptionists</div>
                        <div className="d-flex align-items-center gap-2" style={{fontFamily: "'Google Sans', sans-serif", fontWeight: 700, color: 'var(--luna-navy)', fontSize: '1.2rem'}}>
                            {receptionistCount.toLocaleString()} <FaHeadset size={14} className="opacity-50" />
                        </div>
                    </div>
                    <div className="bg-light px-3 py-2 rounded-3 border shadow-sm d-flex flex-column align-items-end">
                        <div className="text-muted text-uppercase" style={{fontFamily: "'Google Sans', sans-serif", fontSize: '0.75rem', fontWeight: 800, letterSpacing: '1px'}}>Officers</div>
                        <div className="d-flex align-items-center gap-2" style={{fontFamily: "'Google Sans', sans-serif", fontWeight: 700, color: 'var(--luna-navy)', fontSize: '1.2rem'}}>
                            {officerCount.toLocaleString()} <FaUserShield size={14} className="opacity-50" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom Grid Layout using Flex to stretch bottom row */}
            <div className="d-flex flex-wrap gap-4 mt-4">
                {gridCards.map(([key, value]) => {
                    const config = cardConfig[key];
                    if (!config) return null; // Safety fallback

                    return (
                        <div 
                            key={key} 
                            onClick={() => navigate(config.path)}
                            className="position-relative overflow-hidden shadow-sm"
                            style={{
                                flex: '1 1 calc(25% - 1.5rem)', // Base width 25% minus gap. If fewer items on bottom row, flex-grow automatically stretches them.
                                minWidth: '220px', // Prevents squeezing too small on mobile
                                height: '140px',
                                borderRadius: '16px',
                                background: config.gradient,
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                padding: '1.2rem 1.5rem',
                                color: 'white'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-5px)';
                                e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
                            }}
                        >
                            {/* Decorative Background Icon */}
                            <div style={{
                                position: 'absolute',
                                right: '-15px',
                                bottom: '-30px',
                                opacity: 0.15,
                                fontSize: '8rem', // Made bigger
                                transform: 'rotate(-15deg)',
                                pointerEvents: 'none'
                            }}>
                                {config.icon}
                            </div>

                            {/* Card Content */}
                            <div className="d-flex justify-content-between align-items-start position-relative z-1">
                                <div style={{
                                    fontFamily: "'Google Sans', sans-serif", 
                                    fontWeight: 700, 
                                    fontSize: '1.05rem', // Made bigger
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    opacity: 0.9
                                }}>
                                    {config.label}
                                </div>
                                <div style={{opacity: 0.8}}>
                                    {config.icon}
                                </div>
                            </div>
                            
                            <div className="position-relative z-1" style={{
                                fontFamily: "'Libre Baskerville', serif",
                                fontWeight: 700,
                                fontSize: '2.2rem',
                                lineHeight: '1'
                            }}>
                                {value.toLocaleString()}
                            </div>
                        </div>
                    );
                })}
            </div>
            
        </div>
    );
};

export default OfficerDashboard;