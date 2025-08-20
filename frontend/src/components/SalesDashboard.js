import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CreateLeadForm from "./CreateLeadForm";
import LeadsTable from "./LeadsTable";
import ContractPage from "./ContractPage";
import FreshworksLeads from "./FreshworksLeads"; 
import Sale from "./Sale"; 
import "../styles/superAdminDashboard.css";

function SalesDashboard({ token, onLogout, userRole }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedSection, setSelectedSection] = useState("Create Lead");
  const [refreshLeads, setRefreshLeads] = useState(false);
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
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        window.innerWidth <= 768 &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target)
      ) {
        setIsSidebarOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
    } else if (selectedSection === "Freshworks Leads") {
      return <FreshworksLeads initialFilters={navigationFilters} token={token} />; 
    } else if (selectedSection === "Analytics") {
      return <Sale token={token} />;
    }
  }

  const getDashboardTitle = () => {
    return userRole === "superadmin" ? "Admin Dashboard" : "Sales Dashboard";
  };

  const menuItems = [
    { name: "Create Lead", section: "Create Lead" },
    { name: "Leads Table", section: "Leads Table" },
    { name: "Contracts", section: "Contracts" },
    { name: "Freshworks Leads", section: "Freshworks Leads" },
    { name: "Analytics", section: "Analytics" },
  ];

  const handleMenuClick = (section) => {
    setSelectedSection(section);
    setIsSidebarOpen(false);
    if (section !== "Freshworks Leads") {
      setNavigationFilters(null);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Hamburger Menu */}
      <button
        className={`hamburger-menu ${isSidebarOpen ? "open" : ""}`}
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        aria-label="Toggle Menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`sidebar ${isSidebarOpen ? "open" : ""}`}
      >
        <h3>{getDashboardTitle()}</h3>
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

      {/* Content */}
      <div
        className="content"
        onClick={() => window.innerWidth <= 768 && setIsSidebarOpen(false)}
      >
        {renderSection()}
      </div>
    </div>
  );
}

export default SalesDashboard;