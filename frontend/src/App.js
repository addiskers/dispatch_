import React, { useState } from "react";
import Login from "./components/Login";
import SalesDashboard from "./components/SalesDashboard";
import UploaderDashboard from "./components/UploaderDashboard";
import AccountsDashboard from "./components/AccountsDashboard";
import SuperAdminDashboard from "./components/SuperAdminDashboard"; // Import your Super Admin dashboard

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
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (role === "sales") {
    return <SalesDashboard token={token} onLogout={handleLogout} />;
  } else if (role === "uploader") {
    return <UploaderDashboard token={token} onLogout={handleLogout} />;
  } else if (role === "accounts") {
    return <AccountsDashboard token={token} onLogout={handleLogout} />;
  } else if (role === "superadmin") {
    return <SuperAdminDashboard token={token} onLogout={handleLogout} />; // Render Super Admin Dashboard
  }

  return (
    <div>
      Unknown role. <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default App;
