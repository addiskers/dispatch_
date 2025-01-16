import React, { useState } from "react";
import LeadsTableuploader from "./LeadsTableuploader.js";
import MultipleFileUpload from "./MultipleFileUpload";
import "../styles/dashboard.css";

function UploaderDashboard({ token, onLogout }) {
  const [selectedSection, setSelectedSection] = useState("Leads Table");

  const renderSection = () => {
    if (selectedSection === "Leads Table") {
      return <LeadsTableuploader token={token} userRole="uploader" />;
    } else if (selectedSection === "Uploads") {
      return <MultipleFileUpload token={token} />;
    }
  };

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h3>Researcher's Dashboard</h3>
        <ul>
          <li
            onClick={() => setSelectedSection("Leads Table")}
            className={selectedSection === "Leads Table" ? "active" : ""}
          >
            Leads Table
          </li>
          <li
            onClick={() => setSelectedSection("Uploads")}
            className={selectedSection === "Uploads" ? "active" : ""}
          >
            Uploads
          </li>
        </ul>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </div>
      <div className="content">{renderSection()}</div>
    </div>
  );
}

export default UploaderDashboard;
