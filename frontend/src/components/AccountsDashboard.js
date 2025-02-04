import React, { useState, useEffect, useRef } from "react";
import LeadsTableAccounts from "./LeadsTableAccounts";
import ContractPage from "./ContractPage";
import "../styles/dashboard.css";

function AccountsDashboard({ token, onLogout }) {
  const [selectedSection, setSelectedSection] = useState("Leads Table");
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

  const renderSection = () => {
    if (selectedSection === "Leads Table") {
      return <LeadsTableAccounts token={token} userRole="accounts" />;
    } else if (selectedSection === "Contracts") {
      return <ContractPage token={token} />;
    }
  };

  const menuItems = [
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
        <h3>Accounts Dashboard</h3>
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

export default AccountsDashboard;
