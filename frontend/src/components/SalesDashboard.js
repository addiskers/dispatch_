import React, { useState, useEffect, useRef } from "react";
import CreateLeadForm from "./CreateLeadForm";
import LeadsTable from "./LeadsTable";
import ContractPage from "./ContractPage";
import "../styles/superAdminDashboard.css";

function SalesDashboard({ token, onLogout, userRole }) {
  const [selectedSection, setSelectedSection] = useState("Create Lead");
  const [refreshLeads, setRefreshLeads] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarRef = useRef(null);

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
    }
  }

  const getDashboardTitle = () => {
    return userRole === "superadmin" ? "Admin Dashboard" : "Sales Dashboard";
  };

  const menuItems = [
    { name: "Create Lead", section: "Create Lead" },
    { name: "Leads Table", section: "Leads Table" },
    { name: "Contracts", section: "Contracts" },
  ];

  const handleMenuClick = (section) => {
    setSelectedSection(section);
    setIsSidebarOpen(false);
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
