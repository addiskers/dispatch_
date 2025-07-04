import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from "./components/Login";
import SalesDashboard from "./components/SalesDashboard";
import UploaderDashboard from "./components/UploaderDashboard";
import AccountsDashboard from "./components/AccountsDashboard";
import SuperAdminDashboard from "./components/SuperAdminDashboard"; 

import "bootstrap/dist/css/bootstrap.min.css";
import '@fortawesome/fontawesome-free/css/all.min.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [role, setRole] = useState(localStorage.getItem("role") || "");

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

  if (!token) {
    return (
      <Router>
        <Routes>
          <Route path="*" element={<Login onLoginSuccess={handleLoginSuccess} />} />
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
    </Router>
  );
}

export default App;