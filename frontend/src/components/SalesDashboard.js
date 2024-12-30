import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import "../styles/dashboard.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

function SalesDashboard({ token, onLogout }) {
  const [leads, setLeads] = useState([]);
  const [form, setForm] = useState({
    leadId: "",
    clientName: "",
    clientEmail: "",
    projectName: "",
    projectDescription: "",
    paymentStatus: "no",
    deliveryDate: null,
  });

  const fetchMyLeads = useCallback(async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/leads/my-leads", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeads(res.data);
    } catch (err) {
      console.error("Error fetching leads:", err);
    }
  }, [token]);

  useEffect(() => {
    fetchMyLeads();
  }, [fetchMyLeads]);

  async function sendToResearcher(leadId) {
    try {
      await axios.patch(
        `http://localhost:5000/api/leads/${leadId}/send-to-researcher`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert("Lead sent to researcher!");
      fetchMyLeads();
    } catch (err) {
      console.error("Error sending lead to researcher:", err);
    }
  }

  async function handleCreateLead(e) {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/leads", form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Lead created!");
      setForm({
        leadId: "",
        clientName: "",
        clientEmail: "",
        projectName: "",
        projectDescription: "",
        paymentStatus: "no",
        deliveryDate: null, // Reset delivery date
      });
      fetchMyLeads();
    } catch (err) {
      console.error("Error creating lead:", err);
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
    <div className="container mt-5">
      <Button onClick={onLogout} variant="danger" style={{ float: "right" }}>
        Logout
      </Button>
      <h2>Sales Dashboard</h2>

      <Form className="mt-4" onSubmit={handleCreateLead}>
        <h3>Create Lead</h3>
        <Form.Group className="mb-3">
          <Form.Control
            placeholder="Lead ID"
            value={form.leadId}
            onChange={(e) => setForm({ ...form, leadId: e.target.value })}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Control
            placeholder="Client Name"
            value={form.clientName}
            onChange={(e) => setForm({ ...form, clientName: e.target.value })}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Control
            placeholder="Client Email"
            value={form.clientEmail}
            onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Control
            placeholder="Project Name"
            value={form.projectName}
            onChange={(e) => setForm({ ...form, projectName: e.target.value })}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Control
            as="textarea"
            placeholder="Project Description"
            value={form.projectDescription}
            onChange={(e) => setForm({ ...form, projectDescription: e.target.value })}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <DatePicker
            selected={form.deliveryDate}
            onChange={(date) => setForm({ ...form, deliveryDate: date })}
            dateFormat="yyyy-MM-dd"
            placeholderText="Select Delivery Date"
            className="form-control"
          />
        </Form.Group>
        <Button type="submit" className="mt-3" variant="primary">
          Create Lead
        </Button>
      </Form>

      <h3 className="mt-5">My Leads</h3>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Lead ID</th>
            <th>Client Name</th>
            <th>Client Email</th>
            <th>Project Name</th>
            <th>Project Description</th>
            <th>Payment Status</th>
            <th>Delivery Date</th>
            <th>Actions</th>
            <th>Send to Researcher</th>
            <th>Done</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.leadId}>
              <td>{lead.leadId}</td>
              <td>{lead.clientName}</td>
              <td>{lead.clientEmail}</td>
              <td>{lead.projectName}</td>
              <td>{lead.projectDescription}</td>
              <td>{lead.paymentStatus}</td>
              <td>
                {lead.deliveryDate
                  ? new Date(lead.deliveryDate).toLocaleDateString()
                  : "Not Set"}
              </td>
              <td>
                <Button
                  variant="danger"
                  onClick={() => handleDeleteLead(lead.leadId)}
                >
                  Delete
                </Button>
              </td>
              <td>
                <Button
                  variant="primary"
                  onClick={() => sendToResearcher(lead.leadId)}
                  disabled={lead.sentToResearcher}
                >
                  {lead.sentToResearcher ? "Sent" : "Send to Researcher"}
                </Button>
              </td>
              <td>{lead.done ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

export default SalesDashboard;
