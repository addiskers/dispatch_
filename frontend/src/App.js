// src/App.js
import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import SalesDashboard from "./components/SalesDashboard";
import UploaderDashboard from "./components/UploaderDashboard";

function App() {
  // We'll store the JWT token and the user role in state
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [role, setRole] = useState(localStorage.getItem("role") || "");

  // If there’s no token, show Login
  // If token exists, show different dashboards based on role
  if (!token) {
    return <Login onLoginSuccess={(t, r) => {
      setToken(t);
      setRole(r);
      localStorage.setItem("token", t);
      localStorage.setItem("role", r);
    }} />;
  }

  // If we do have a token, decide which dashboard to show
  if (role === "sales") {
    return <SalesDashboard token={token} onLogout={() => handleLogout()} />;
  } else if (role === "uploader") {
    return <UploaderDashboard token={token} onLogout={() => handleLogout()} />;
  }

  // If role is unknown, show a fallback (or force logout)
  return <div>Unknown role. <button onClick={handleLogout}>Logout</button></div>;

  function handleLogout() {
    setToken("");
    setRole("");
    localStorage.removeItem("token");
    localStorage.removeItem("role");
  }
}

export default App;
