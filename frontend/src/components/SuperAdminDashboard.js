import React, { useState, useEffect, useRef } from "react";
import LeadsSection from "./LeadsSection"; 
import ManageAccessSection from "./ManageAccessSection"; 
import LogsSection from "./LogsSection"; 
import ContractPage from "./ContractPage"; 
import MultipleFileUpload from "./MultipleFileUpload";
import "../styles/superAdminDashboard.css";

function SuperAdminDashboard({ token, onLogout }) {
  const [selectedSection, setSelectedSection] = useState("Manage Access");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (window.innerWidth <= 768 && 
          sidebarRef.current && 
          !sidebarRef.current.contains(event.target)) {
        setIsSidebarOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function renderSection() {
    if (selectedSection === "Leads") {
      return <LeadsSection token={token} />;
    } else if (selectedSection === "Manage Access") {
      return <ManageAccessSection token={token} />;
    } else if (selectedSection === "Logs") {
      return <LogsSection token={token} />;
    } else if (selectedSection === "Contracts") {
      return <ContractPage token={token} />; 
    } else if (selectedSection === "Uploads") {
      return <MultipleFileUpload token={token} />;
    }
  }

  const menuItems = [
    { name: "Leads", section: "Leads" },
    { name: "Manage Access", section: "Manage Access" },
    { name: "Logs", section: "Logs" },
    { name: "Contracts", section: "Contracts" },
    { name: "Upload", section: "Uploads" }
  ];

  const handleMenuClick = (section) => {
    setSelectedSection(section);
    setIsSidebarOpen(false);
  };

  return (
    <div className="dashboard-container">
      <button 
        className={`hamburger-menu ${isSidebarOpen ? 'open' : ''}`}
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        aria-label="Toggle Menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div 
        ref={sidebarRef}
        className={`sidebar ${isSidebarOpen ? 'open' : ''}`}
      >
        <h3>Super Admin</h3>
        <ul>
          {menuItems.map((item) => (
            <li
              key={item.section}
              onClick={() => handleMenuClick(item.section)}
              className={selectedSection === item.section ? "active" : ""}
            >
              {item.name}
            </li>
          ))}
        </ul>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </div>
      <div 
        className="content" 
        onClick={() => window.innerWidth <= 768 && setIsSidebarOpen(false)}
      >
        {renderSection()}
      </div>
    </div>
  );
}

export default SuperAdminDashboard;