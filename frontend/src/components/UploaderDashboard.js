import React, { useState, useEffect, useRef } from "react";
import LeadsTableUploader from "./LeadsTableuploader.js";
import MultipleFileUpload from "./MultipleFileUpload";
import "../styles/superAdminDashboard.css";

function UploaderDashboard({ token, onLogout }) {
  const [selectedSection, setSelectedSection] = useState("Leads Table");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarRef = useRef(null);

  // Close sidebar when clicking outside on mobile
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
      return <LeadsTableUploader token={token} userRole="uploader" />;
    } else if (selectedSection === "Uploads") {
      return <MultipleFileUpload token={token} />;
    }
  };

  const menuItems = [
    { name: "Leads Table", section: "Leads Table" },
    { name: "Uploads", section: "Uploads" },
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
        <h3>Researcher's Dashboard</h3>
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

export default UploaderDashboard;
