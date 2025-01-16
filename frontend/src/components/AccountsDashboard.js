import React, { useState } from "react";
import LeadsTableAccounts from "./LeadsTableAccounts";
import "../styles/dashboard.css";

function AccountsDashboard({ token, onLogout }) {
  const [selectedSection, setSelectedSection] = useState("Leads Table");

  const renderSection = () => {
    if (selectedSection === "Leads Table") {
      return <LeadsTableAccounts token={token} userRole="accounts" />;
    } 
  };

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h3>Accounts Dashboard</h3>
        <ul>
          <li
            onClick={() => setSelectedSection("Leads Table")}
            className={selectedSection === "Leads Table" ? "active" : ""}
          >
            Leads Table
          </li>
         
        </ul>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </div>
      <div className="content">{renderSection()}</div>
    </div>
  );
}

export default AccountsDashboard;
