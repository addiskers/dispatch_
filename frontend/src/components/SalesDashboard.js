// src/components/SalesDashboard.js
import React, { useState, useEffect } from "react";
import axios from "axios";

function SalesDashboard({ token, onLogout }) {
  const [leads, setLeads] = useState([]);
  const [form, setForm] = useState({
    leadId: "",
    clientName: "",
    clientEmail: "",
    projectName: "",
    projectDescription: "",
    paymentStatus: "no",
  });
  const [statusUpdate, setStatusUpdate] = useState({ leadId: "", paymentStatus: "no" });

  useEffect(() => {
    fetchMyLeads();
  }, []);

  async function fetchMyLeads() {
    try {
      const res = await axios.get("http://localhost:5000/api/leads/my-leads", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setLeads(res.data);
    } catch (err) {
      console.error("Error fetching leads:", err);
    }
  }

  async function handleCreateLead(e) {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/leads", form, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      alert("Lead created!");
      setForm({
        leadId: "",
        clientName: "",
        clientEmail: "",
        projectName: "",
        projectDescription: "",
        paymentStatus: "no",
      });
      fetchMyLeads();
    } catch (err) {
      console.error("Error creating lead:", err);
    }
  }

  async function handleUpdatePayment(e) {
    e.preventDefault();
    try {
      await axios.patch(
        `http://localhost:5000/api/leads/${statusUpdate.leadId}/payment-status`,
        { paymentStatus: statusUpdate.paymentStatus },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert("Payment status updated!");
      fetchMyLeads();
    } catch (err) {
      console.error("Error updating payment status:", err);
    }
  }

  async function handleDeleteLead(leadId) {
    if (!window.confirm("Are you sure?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/leads/${leadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Lead deleted!");
      fetchMyLeads();
    } catch (err) {
      console.error("Error deleting lead:", err);
    }
  }

  return (
    <div style={{ margin: 20 }}>
      <h2>Sales Dashboard</h2>
      <button onClick={onLogout} style={{ float: "right" }}>
        Logout
      </button>

      <h3>Create Lead</h3>
      <form onSubmit={handleCreateLead}>
        <input
          placeholder="Lead ID"
          value={form.leadId}
          onChange={(e) => setForm({ ...form, leadId: e.target.value })}
        />
        <input
          placeholder="Client Name"
          value={form.clientName}
          onChange={(e) => setForm({ ...form, clientName: e.target.value })}
        />
        <input
          placeholder="Client Email"
          value={form.clientEmail}
          onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
        />
        <input
          placeholder="Project Name"
          value={form.projectName}
          onChange={(e) => setForm({ ...form, projectName: e.target.value })}
        />
        <textarea
          placeholder="Project Description"
          value={form.projectDescription}
          onChange={(e) => setForm({ ...form, projectDescription: e.target.value })}
        />
        <select
          value={form.paymentStatus}
          onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
        >
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
        <button type="submit">Create Lead</button>
      </form>

      <h3>My Leads</h3>
      <ul>
        {leads.map((lead) => (
          <li key={lead._id} style={{ marginBottom: 10 }}>
            <strong>ID:</strong> {lead.leadId} | <strong>Name:</strong> {lead.clientName} | 
            <strong>Email:</strong> {lead.clientEmail} | 
            <strong>Payment:</strong> {lead.paymentStatus} | 
            <button onClick={() => handleDeleteLead(lead.leadId)}>Delete</button>
          </li>
        ))}
      </ul>

      <h3>Update Payment Status</h3>
      <form onSubmit={handleUpdatePayment}>
        <input
          placeholder="Lead ID"
          value={statusUpdate.leadId}
          onChange={(e) => setStatusUpdate({ ...statusUpdate, leadId: e.target.value })}
        />
        <select
          value={statusUpdate.paymentStatus}
          onChange={(e) => setStatusUpdate({ ...statusUpdate, paymentStatus: e.target.value })}
        >
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
        <button type="submit">Update</button>
      </form>
    </div>
  );
}

export default SalesDashboard;
