import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import ResetPassword from './pages/ResetPassword';
import BusinessLoginForm from './components/BusinessLoginForm';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard'; 
import ReceptionistAppointments from './pages/ReceptionistAppointments';
import ReceptionistPatientAppointments from './pages/ReceptionistPatientAppointments'; 
import ReceptionistBookAppointment from './pages/ReceptionistBookAppointment';
import ReceptionistAvailability from './pages/ReceptionistAvailability';
import LandingPage from './pages/LandingPage';
import Appointments from './pages/Appointments'; // Patient Appointments
import DoctorAppointments from './pages/DoctorAppointments'; // Doctor Appointments
import BookAppointment from './pages/BookAppointment'; 
import Profile from './pages/Profile'; 
import Header from './components/Header';
import Sidebar from './components/Sidebar'; 
// REMOVED: ReceptionistSidebar import
import { authAPI } from './api/api'; 
import ViewProfile from './pages/ViewProfile';
import CreatePrechecked from './pages/CreatePrechecked'; 
import Prescribe from './pages/Prescribe'; // Added Import
import Prescription from './pages/Prescription'; // Added Import
import ViewPrescription from './pages/ViewPrescription';
import PreviousPrescriptions from './pages/PreviousPrescriptions';
import Wallet from './pages/Wallet';
import PaymentGateway from './pages/PaymentGateway';
import OfficerDashboard from './pages/OfficerDashboard'; // --- NEW: Added Officer Import ---
import OfficerPatients from './pages/OfficerPatients';
import OfficerDoctors from './pages/OfficerDoctors';
import OfficerLaboratories from './pages/OfficerLaboratories';
import ViewBusiness from './pages/ViewBusiness';
import CreateBusiness from './pages/CreateBusiness';
import OfficerPharmacies from './pages/OfficerPharmacies';
import OfficerLabTests from './pages/OfficerLabTests';
import OfficerNewTest from './pages/OfficerNewTest';
import OfficerViewTest from './pages/OfficerViewTest';
import OfficerMedicineGenerics from './pages/OfficerMedicineGenerics';
import OfficerMedicines from './pages/OfficerMedicines';
import OfficerAddMedicine from './pages/OfficerAddMedicine';
import OfficerViewMedicine from './pages/OfficerViewMedicine';
import OfficerFinance from './pages/OfficerFinance';
import OfficerActivate from './pages/OfficerActivate';
import PatientDoctors from './pages/PatientDoctors';
import PatientLabAvailability from './pages/PatientLabAvailability';
import BusinessProfile from './pages/BusinessProfile';
import PharmacyMedicine from './pages/PharmacyMedicine';
import PharmacyPrescription from './pages/PharmacyPrescription';
import LabPrescriptions from './pages/LabPrescriptions';
import LabAvailableTests from './pages/LabAvailableTests';
import LabTestReports from './pages/LabTestReports';
import PrescriptionPrint from './pages/PrescriptionPrint'; // Add this line
import './App.css';

// --- NEW INTERNAL LAYOUT COMPONENT ---
// This component sits inside the <Router> so it can use the useLocation() hook
const AppLayout = ({ user, handleLogout }) => {
  const location = useLocation();
  const isDoctor = user?.role === 'doctor';
  const isReceptionist = user?.role === 'receptionist';
  const isOfficer = user?.role === 'officer';
  const isBusiness = user?.role === 'pharmacy' || user?.role === 'laboratory'; // Added Business Check
  // Check if we are on the payment gateway page
  const hideNavigation = location.pathname === '/payment-gateway' || location.pathname === '/print-prescription';

  const getDashboard = () => {
      if (isDoctor) return <DoctorDashboard user={user} onLogout={handleLogout} />;
      if (isReceptionist) return <ReceptionistAppointments user={user} onLogout={handleLogout} />;
      if (isOfficer) return <OfficerDashboard user={user} onLogout={handleLogout} />;
      if (isBusiness) return <BusinessProfile user={user} onLogout={handleLogout} />; // Routes business to their profile
      return <PatientDashboard user={user} onLogout={handleLogout} />;
  };

  // If we are on the payment gateway, render ONLY the gateway. No Sidebar, No Header.
  if (hideNavigation) {
      return (
          <Routes>
              <Route path="/payment-gateway" element={<PaymentGateway />} />
              <Route path="/print-prescription" element={<PrescriptionPrint />} /> {/* Add this line */}
          </Routes>
      );
  }

  // Otherwise, render the normal layout with Sidebar and Header
  return (
      <div className="d-flex">
          {/* UPDATED: Render the unified Sidebar and pass the user prop. Hidden for doctors AND officers. */}
          {!isDoctor && !isOfficer && !isBusiness && <Sidebar user={user} />}
          

          {/* UPDATED: Added isOfficer check to remove the sidebar padding */}
          <div className={`layout-wrapper w-100 ${isDoctor || isOfficer || isBusiness ? 'no-sidebar' : ''}`}>
              <Header user={user} onLogout={handleLogout} />

              <div className="content-area">
                  <Routes>
                      <Route path="/" element={getDashboard()} />
                      
                      {/* --- APPOINTMENTS ROUTE --- */}
                      <Route 
                          path="/appointments" 
                          element={isDoctor ? <DoctorAppointments /> : <Appointments />} 
                      />
                      {/* --- PHARMACY ROUTES --- */}
                      <Route path="/pharmacy/medicines" element={<PharmacyMedicine />} />
                      <Route path="/pharmacy/prescriptions" element={<PharmacyPrescription />} /> {/* ADD THIS */}

                      {/* --- LAB ROUTES --- */}
                      <Route path="/laboratory/prescriptions" element={<LabPrescriptions />} />
                      <Route path="/laboratory/tests" element={<LabAvailableTests />} />
                      <Route path="/laboratory/test-reports" element={<LabTestReports />} />
                      {/* --- ADDED PATIENT APPOINTMENTS ROUTE --- */}
                      <Route path="/patient-appointments" element={<ReceptionistPatientAppointments />} />

                      {/* --- BOOK APPOINTMENT ROUTE --- */}
                        <Route 
                            path="/book-appointment" 
                            element={
                                isReceptionist ? <ReceptionistBookAppointment /> : <BookAppointment />
                            } 
                        />

                      {/* --- PRECHECK ROUTING --- */}
                      <Route path="/prechecked/:id" element={<CreatePrechecked />} />
                      <Route path="/create-prechecked" element={<CreatePrechecked />} />

                      {/* --- PRESCRIBE ROUTING --- */}
                      <Route path="/prescribe" element={<Prescribe />} />
                      <Route path="/prescription" element={<Prescription />} />
                      <Route path="/prescription/:id" element={<ViewPrescription />} />
                      <Route path="/my-patients" element={<PreviousPrescriptions />} />
                      <Route path="/prescriptions" element={<PreviousPrescriptions />} />

                      {/* --- WALLET ROUTING --- */}
                      <Route path="/wallet" element={<Wallet />} />
                      <Route path="/payment-gateway" element={<PaymentGateway />} />
                      
                      {/* Placeholders */}
                      {/* --- DOCTORS / AVAILABILITY ROUTE --- */}
                        <Route 
                          path={isReceptionist ? "/availability" : "/doctors"} 
                          element={
                              isReceptionist ? <ReceptionistAvailability /> : <PatientDoctors />
                          } 
                      />
                      {/* --- LAB TESTS ROUTE --- */}
                      <Route path="/tests" element={<PatientLabAvailability />} />
                      <Route path="/reports" element={<div>Reports</div>} />
                      <Route path="/settings" element={<div>Settings</div>} />
                      <Route path="/profile" element={<Profile />} />
                      
                      {/* --- NEW: OFFICER ROUTES PLACEHOLDER --- */}
                      {/* --- OFFICER ROUTES --- */}
                      <Route path="/officer/patients" element={<OfficerPatients />} />
                      <Route path="/officer/doctors" element={<OfficerDoctors />} />
                      <Route path="/officer/laboratories" element={<OfficerLaboratories />} />
                      <Route path="/officer/pharmacies" element={<OfficerPharmacies />} />
                      <Route path="/officer/view-business" element={<ViewBusiness />} />
                      <Route path="/officer/create-business" element={<CreateBusiness />} />
                      {/* NEW TEST ROUTES */}
                      <Route path="/officer/tests" element={<OfficerLabTests />} />
                      <Route path="/officer/create-test" element={<OfficerNewTest />} />
                      <Route path="/officer/view-test" element={<OfficerViewTest />} />
                      <Route path="/officer/medicine-generics" element={<OfficerMedicineGenerics />} />
                      <Route path="/officer/medicines" element={<OfficerMedicines />} />
                      <Route path="/officer/create-medicine" element={<OfficerAddMedicine />} />
                      <Route path="/officer/view-medicine" element={<OfficerViewMedicine />} />
                      <Route path="/officer/finance" element={<OfficerFinance />} />
                      <Route path="/officer/activate" element={<OfficerActivate />} />
                      <Route path="/officer/:section" element={<div className="p-4" style={{fontFamily: 'Google Sans'}}><h2>Officer Section Loading...</h2></div>} />

                      {/* Fallback */}
                      <Route path="*" element={<Navigate to="/" />} />
                      <Route path="/view-profile" element={<ViewProfile />} />
                  </Routes>
              </div>
          </div>
      </div>
  );
};


function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // --- LOGIC: Initialize based on localStorage ---
  const [showLanding, setShowLanding] = useState(!localStorage.getItem('user'));

  useEffect(() => {
    const initializeUser = async () => {
      const storedUser = localStorage.getItem('user');
      
      if (storedUser) {
        let parsedUser = JSON.parse(storedUser);

        // --- STRICT ROLE CHECK ---
        if (!parsedUser.role) {
            try {
                console.log(`Verifying role for ${parsedUser.email}...`);
                const docRes = await authAPI.checkDoctorByEmail(parsedUser.email);
                
                if (docRes.data && docRes.data.exists === true) {
                    console.log("Verified as DOCTOR");
                    const doctorData = docRes.data.doctor || docRes.data;
                    parsedUser = { ...parsedUser, ...doctorData, role: 'doctor' };
                } 
                else {
                    const patRes = await authAPI.checkPatientByEmail(parsedUser.email);
                    if (patRes.data && patRes.data.exists === true) {
                        console.log("Verified as PATIENT");
                        const patientData = patRes.data.patient || patRes.data;
                        parsedUser = { ...parsedUser, ...patientData, role: 'patient' };
                    } else {
                        console.log("Role Unknown (Just a User)");
                        parsedUser.role = 'user'; // Fallback
                    }
                }
                localStorage.setItem('user', JSON.stringify(parsedUser));
            } catch (error) {
                console.error("Failed to verify role:", error);
            }
        }
        
        setUser(parsedUser);
        setShowLanding(false); // Ensure landing is hidden if user is found
      }
      
      setLoading(false);
    };

    initializeUser();
  }, []);

  const handleLogout = () => {
      localStorage.removeItem('user');
      setUser(null);
      window.location.href = '/'; 
  };

  if (loading) return <div className="d-flex justify-content-center align-items-center vh-100" style={{color: 'var(--luna-navy)'}}>Loading...</div>;

  return (
    <Router>
      {/* 1. LANDING PAGE */}
      {showLanding ? (
        <LandingPage onEnter={() => setShowLanding(false)} />
      ) : !user ? (
        /* 2. AUTH PAGE & UNAUTHENTICATED ROUTES */
        <Routes>
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/business" element={<BusinessLoginForm />} />
            <Route path="*" element={<AuthPage />} />
        </Routes>
      ) : (
        /* 3. MAIN APP LAYOUT (Using the new internal component) */
        <AppLayout user={user} handleLogout={handleLogout} />
      )}
    </Router>
  );
}

export default App;