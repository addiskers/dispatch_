import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LeadsSection from "./LeadsSection"; 
import ManageAccessSection from "./ManageAccessSection"; 
import LogsSection from "./LogsSection"; 
import SampleManagementPage from "./SampleManagementPage"; 
import ContractPage from "./ContractPage"; 
import MultipleFileUpload from "./MultipleFileUpload";
import FreshworksLeads from "./FreshworksLeads"; 
import Sale from "./Sale";
import "../styles/superAdminDashboard.css";

function SuperAdminDashboard({ token, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedSection, setSelectedSection] = useState("Manage Access");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [navigationFilters, setNavigationFilters] = useState(null);
  const sidebarRef = useRef(null);

  // Handle navigation state from analytics
  useEffect(() => {
    if (location.state?.selectedSection) {
      setSelectedSection(location.state.selectedSection);
      if (location.state.filters) {
        setNavigationFilters(location.state.filters);
      }
      // Clear the location state
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

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
    switch(selectedSection) {
      case "Leads":
        return <LeadsSection token={token} />;
      case "Manage Access":
        return <ManageAccessSection token={token} />;
      case "Logs":
        return <LogsSection token={token} />;
      case "Contracts":
        return <ContractPage token={token} />; 
      case "Uploads":
        return <MultipleFileUpload token={token} />;
      case "Sample":
        return <SampleManagementPage token={token} />;
      case "Freshworks Leads":
        return <FreshworksLeads initialFilters={navigationFilters} />; 
      case "Analytics":
        return <Sale />;
      default:
        return <ManageAccessSection token={token} />;
    }
  }

  const menuItems = [
    { name: "Manage Access", section: "Manage Access" },
    { name: "Leads", section: "Leads" },
    { name: "Freshworks Leads", section: "Freshworks Leads" },
    { name: "Analytics", section: "Analytics" },
    { name: "Contracts", section: "Contracts" },
    { name: "Upload", section: "Uploads" },
    { name: "Sample", section: "Sample" },
    { name: "Logs", section: "Logs" },
  ];

  const handleMenuClick = (section) => {
    if (section === "Logout") {
      onLogout();
    } else {
      setSelectedSection(section);
      setIsSidebarOpen(false);
      // Clear navigation filters when manually selecting a different section
      if (section !== "Freshworks Leads") {
        setNavigationFilters(null);
      }
    }
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
        <button onClick={onLogout} className="logout-btn">
          Logout
        </button>
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