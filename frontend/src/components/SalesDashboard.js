import React, { useState } from "react";
import CreateLeadForm from "./CreateLeadForm";
import LeadsTable from "./LeadsTable";
import ContractPage from "./ContractPage"; 
import "../styles/superAdminDashboard.css";

function SalesDashboard({ token, onLogout, userRole }) {
  const [selectedSection, setSelectedSection] = useState("Create Lead");
  const [refreshLeads, setRefreshLeads] = useState(false);

  const handleLeadCreated = () => {
    setRefreshLeads((prevState) => !prevState);
    setSelectedSection("Leads Table"); 
  };

  function renderSection() {
    if (selectedSection === "Create Lead") {
      return <CreateLeadForm token={token} onLeadCreated={handleLeadCreated} userRole={userRole} />;
    } else if (selectedSection === "Leads Table") {
      return <LeadsTable token={token} refresh={refreshLeads} userRole={userRole} />;
    } else if (selectedSection === "Contracts") {
      return <ContractPage token={token} />; 
    }
  }

  const getDashboardTitle = () => {
    return userRole === 'superadmin' ? 'Admin Dashboard' : 'Sales Dashboard';
  };

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h3>{getDashboardTitle()}</h3>
        <ul>
          <li
            onClick={() => setSelectedSection("Create Lead")}
            className={selectedSection === "Create Lead" ? "active" : ""}
          >
            Create Lead
          </li>
          <li
            onClick={() => setSelectedSection("Leads Table")}
            className={selectedSection === "Leads Table" ? "active" : ""}
          >
            Leads Table
          </li>
          <li
            onClick={() => setSelectedSection("Contracts")}
            className={selectedSection === "Contracts" ? "active" : ""}
          >
            Contracts
          </li>
        </ul>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </div>
      <div className="content">{renderSection()}</div>
    </div>
  );
}

export default SalesDashboard;
