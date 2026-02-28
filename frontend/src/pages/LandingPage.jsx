import React, { useEffect } from 'react';
import { FaHeartbeat, FaArrowRight } from 'react-icons/fa';

const LandingPage = ({ onEnter }) => {
    
    // Listen for "Enter" key press
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Enter') {
                onEnter();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        // Cleanup listener on component unmount
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onEnter]);

    return (
        <div className="landing-page">
            <div className="landing-content text-center fade-in">
                
                {/* LOGO SECTION */}
                <div className="mb-4">
                    <div className="mb-2 d-inline-block">
                        {/* Icon matching the green/blue vibe */}
                        <FaHeartbeat size={65} className="landing-icon-main" />
                    </div>
                    <h1 className="landing-logo">MediSync</h1>
                </div>

                {/* PUNCHLINES */}
                <div className="landing-text mb-5">
                    <h2 className="mb-3 fw-bold" style={{color: '#011C40', letterSpacing: '-0.5px'}}>Healthcare, Reimagined.</h2>
                    <p className="text-muted lead mb-1 fw-medium" style={{fontSize: '1.1rem'}}>
                        Connect with doctors instantly & manage records securely.
                    </p>
                    <p className="small text-muted" style={{opacity: 0.8}}>
                        Secure • Fast • Reliable
                    </p>
                </div>

                {/* ENTER BUTTON */}
                <button className="btn-enter" onClick={onEnter}>
                    Enter <FaArrowRight className="ms-2" size={14} />
                </button>
            </div>
        </div>
    );
};

export default LandingPage;