import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from "./components/Login";
import SalesDashboard from "./components/SalesDashboard";
import UploaderDashboard from "./components/UploaderDashboard";
import AccountsDashboard from "./components/AccountsDashboard";
import SuperAdminDashboard from "./components/SuperAdminDashboard"; 
import TestMarketDashboard from './components/TestMarketDashboard';

import "bootstrap/dist/css/bootstrap.min.css";
import '@fortawesome/fontawesome-free/css/all.min.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [role, setRole] = useState(localStorage.getItem("role") || "");
  const [testMode, setTestMode] = useState(false);

  function handleLoginSuccess(token, role) {
    setToken(token);
    setRole(role);
    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
  }

  function handleLogout() {
    setToken("");
    setRole("");
    localStorage.removeItem("token");
    localStorage.removeItem("role");
  }

  function toggleTestMode() {
    setTestMode(!testMode);
  }

  // For quick testing, show test dashboard if test mode is enabled
  if (testMode) {
    return (
      <div>
        <button 
          onClick={toggleTestMode} 
          style={{position: 'fixed', top: '10px', right: '10px', zIndex: 1000}}
        >
          Exit Test Mode
        </button>
        <TestMarketDashboard />
      </div>
    );
  }

  if (!token) {
    return (
      <Router>
        <Routes>
          <Route path="*" element={
            <div>
              <Login onLoginSuccess={handleLoginSuccess} />
              <button 
                onClick={toggleTestMode}
                style={{position: 'fixed', bottom: '10px', right: '10px'}}
              >
                Test Market Dashboard
              </button>
            </div>
          } />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Main dashboard routes */}
        <Route path="/" element={
          role === "sales" ? <SalesDashboard token={token} onLogout={handleLogout} userRole="sales" /> :
          role === "uploader" ? <UploaderDashboard token={token} onLogout={handleLogout} /> :
          role === "accounts" ? <AccountsDashboard token={token} onLogout={handleLogout} /> :
          role === "superadmin" ? <SuperAdminDashboard token={token} onLogout={handleLogout} userRole="superadmin" /> :
          <div>Unknown role. <button onClick={handleLogout}>Logout</button></div>
        } />
        
        {/* Redirect any unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      <button 
        onClick={toggleTestMode}
        style={{position: 'fixed', bottom: '10px', right: '10px'}}
      >
        Test Market Dashboard
      </button>
    </Router>
  );
}

export default App;