import React, { useState } from "react";
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
  const [testMode, setTestMode] = useState(false); // Add state for test mode

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

  // Function to toggle test mode
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
      <div>
        <Login onLoginSuccess={handleLoginSuccess} />
        <button 
          onClick={toggleTestMode}
          style={{position: 'fixed', bottom: '10px', right: '10px'}}
        >
          Test Market Dashboard
        </button>
      </div>
    );
  }

  let dashboard;
  if (role === "sales") {
    dashboard = <SalesDashboard token={token} onLogout={handleLogout} />;
  } else if (role === "uploader") {
    dashboard = <UploaderDashboard token={token} onLogout={handleLogout} />;
  } else if (role === "accounts") {
    dashboard = <AccountsDashboard token={token} onLogout={handleLogout} />;
  } else if (role === "superadmin") {
    dashboard = <SuperAdminDashboard token={token} onLogout={handleLogout} />; 
  } else {
    dashboard = <div>Unknown role. <button onClick={handleLogout}>Logout</button></div>;
  }

  return (
    <div>
      {dashboard}
      <button 
        onClick={toggleTestMode}
        style={{position: 'fixed', bottom: '10px', right: '10px'}}
      >
        Test Market Dashboard
      </button>
    </div>
  );
}

export default App;