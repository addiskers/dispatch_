import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LeadsSection from "./LeadsSection"; 
import ManageAccessSection from "./ManageAccessSection"; 
import LogsSection from "./LogsSection"; 
import ContractPage from "./ContractPage"; 
import MultipleFileUpload from "./MultipleFileUpload";
import FreshworksLeads from "./FreshworksLeads"; 
import Sale from "./Sale";
import GIIForm from "./GIIForm";
import "../styles/superAdminDashboard.css";
import SampleTable from "./SampleTable";
import SalespersonActivity from './SalespersonActivity';

function SuperAdminDashboard({ token, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedSection, setSelectedSection] = useState("Manage Access");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [navigationFilters, setNavigationFilters] = useState(null);
  const sidebarRef = useRef(null);
  const [navigationKey, setNavigationKey] = useState(Date.now());

  useEffect(() => {
    if (location.state?.selectedSection) {
      const { selectedSection: newSection, filters, fromAnalytics } = location.state;
      
      setSelectedSection(newSection);

      if (filters) {
        setNavigationFilters(filters);
        if (fromAnalytics) {
          setNavigationKey(Date.now());
        }
      }      
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
      case "Freshworks Leads":
        return <FreshworksLeads key={navigationKey} initialFilters={navigationFilters} token={token} />; 
      case "Analytics":
        return <Sale token={token} />;
      case "GII":
        return <GIIForm token={token} />;
      case "Sample Table":
        return <SampleTable token={token} />;
      case "Salesperson Activity":
        return <SalespersonActivity token={token} />;
      default:
        return <ManageAccessSection token={token} />;
    }
  }

  const menuItems = [
    { name: "Manage Access", section: "Manage Access" },
    { name: "Leads", section: "Leads" },
    { name: "Freshworks Leads", section: "Freshworks Leads" },
    { name: "Analytics", section: "Analytics" },
    { name: "Salesperson Activity", section: "Salesperson Activity" },
    { name: "GII", section: "GII" },
    { name: "Contracts", section: "Contracts" },
    { name: "Upload", section: "Uploads" },
    {name: "Sample Table", section: "Sample Table" },
    { name: "Sample", section: "Sample" },
    { name: "Logs", section: "Logs" },
  ];

  const handleMenuClick = (section) => {
    if (section === "Logout") {
      onLogout();
    } else {
      setSelectedSection(section);
      setIsSidebarOpen(false);
      if (section !== "Freshworks Leads") {
        setNavigationFilters(null);
      }
    }
  };

  const shouldRemovePadding = selectedSection === "Analytics" || selectedSection === "GII";

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
        className={`content ${shouldRemovePadding ? 'no-padding' : ''}`}
        onClick={() => window.innerWidth <= 768 && setIsSidebarOpen(false)}
      >
        {renderSection()}
      </div>
    </div>
  );
}

export default SuperAdminDashboard;