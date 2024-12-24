// src/components/UploaderDashboard.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import MultipleFileUpload from "./MultipleFileUpload";

function UploaderDashboard({ token, onLogout }) {
  const [leads, setLeads] = useState([]);
  const [doneUpdate, setDoneUpdate] = useState({ leadId: "", done: false });

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    try {
      const res = await axios.get("http://localhost:5000/api/leads/uploader/list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeads(res.data);
    } catch (err) {
      console.error("Error fetching leads for uploader:", err);
    }
  }

  async function handleUpdateDone(e) {
    e.preventDefault();
    try {
      await axios.patch(
        `http://localhost:5000/api/leads/${doneUpdate.leadId}/done`,
        { done: doneUpdate.done },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert("Done status updated!");
      fetchLeads();
    } catch (err) {
      console.error("Error updating done status:", err);
    }
  }

  return (
    <div style={{ margin: 20 }}>
      <h2>Uploader Dashboard</h2>
      <button onClick={onLogout} style={{ float: "right" }}>
        Logout
      </button>

      <h3>Leads List</h3>
      <ul>
        {leads.map((lead, idx) => (
          <li key={idx}>
            <strong>ID:</strong> {lead.leadId} | 
            <strong>Project:</strong> {lead.projectName} | 
            <strong>Description:</strong> {lead.projectDescription} |
            <strong>Paid?:</strong> {lead.paymentStatus} |
            <strong>Done?:</strong> {lead.done ? "Yes" : "No"}
          </li>
        ))}
      </ul>

      <h3>Mark Done/Undone</h3>
      <form onSubmit={handleUpdateDone}>
        <input
          placeholder="Lead ID"
          value={doneUpdate.leadId}
          onChange={(e) => setDoneUpdate({ ...doneUpdate, leadId: e.target.value })}
        />
        <select
          value={doneUpdate.done}
          onChange={(e) => setDoneUpdate({ ...doneUpdate, done: e.target.value === "true" })}
        >
          <option value="false">Undone</option>
          <option value="true">Done</option>
        </select>
        <button type="submit">Update</button>
      </form>

      {/* Link to or include the multiple file upload component */}
      <MultipleFileUpload token={token} />
    </div>
  );
}

export default UploaderDashboard;
