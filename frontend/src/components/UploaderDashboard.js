import React, { useState, useEffect, useRef } from "react";
import LeadsTableUploader from "./LeadsTableuploader.js";
import MultipleFileUpload from "./MultipleFileUpload.js";
import "../styles/superAdminDashboard.css";
import SampleTable from "./SampleTable";

function UploaderDashboard({ token, onLogout, currentUser }) {
  const [selectedSection, setSelectedSection] = useState("Sample Table");
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
    switch(selectedSection) {
      case "Sample Table":
        return <SampleTable token={token} userRole="uploader" currentUser={currentUser} />;
      case "Leads Table":
        return <LeadsTableUploader token={token} userRole="uploader" />;
      case "Uploads":
        return <MultipleFileUpload token={token} />;
      default:
        return <SampleTable token={token} userRole="uploader" currentUser={currentUser} />;
    }
  };

  const menuItems = [
    { name: "Sample Management", section: "Sample Table" },
    { name: "Leads Table", section: "Leads Table" },
    { name: "File Uploads", section: "Uploads" }
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
        <h3>Researcher Dashboard</h3>
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