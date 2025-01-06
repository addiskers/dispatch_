import React, { useState } from "react";
import LeadsSection from "./LeadsSection"; // Placeholder for the Leads section
import ManageAccessSection from "./ManageAccessSection"; // Updated Manage Access section
import LogsSection from "./LogsSection"; // Placeholder for Logs section
import "../styles/superAdminDashboard.css"; // Style for layout

function SuperAdminDashboard({ token, onLogout }) {
  const [selectedSection, setSelectedSection] = useState("Manage Access");

  // Render appropriate section based on the current selection
  function renderSection() {
    if (selectedSection === "Leads") {
      return <LeadsSection token={token} />;
    } else if (selectedSection === "Manage Access") {
      return <ManageAccessSection token={token} />;
    } else if (selectedSection === "Logs") {
      return <LogsSection token={token} />;
    }
  }

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h3>Super Admin</h3>
        <ul>
          <li
            onClick={() => setSelectedSection("Leads")}
            className={selectedSection === "Leads" ? "active" : ""}
          >
            Leads
          </li>
          <li
            onClick={() => setSelectedSection("Manage Access")}
            className={selectedSection === "Manage Access" ? "active" : ""}
          >
            Manage Access
          </li>
          <li
            onClick={() => setSelectedSection("Logs")}
            className={selectedSection === "Logs" ? "active" : ""}
          >
            Logs
          </li>
        </ul>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </div>
      <div className="content">{renderSection()}</div>
    </div>
  );
}

export default SuperAdminDashboard;
