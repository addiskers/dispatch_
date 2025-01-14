import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import "../styles/dashboard.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Chat from "./Chat";
import "../styles/Chat.css";

function SalesDashboard({ token, onLogout }) {
  const [leads, setLeads] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [form, setForm] = useState({
    leadId: "",
    clientName: [],
    clientEmail: [],
    clientCompany:"",
    projectName: "",
    projectDescription: "",
    paymentStatus: "not_received",
    deliveryDate: null,
    sqcode: "",
  });
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");

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

  async function handleCreateLead(e) {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/leads", form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Lead created!");
      setForm({
        leadId: "",
        clientName: [],
        clientEmail: [],
        clientCompany:"",
        projectName: "",
        projectDescription: "",
        paymentStatus: "not_received",
        deliveryDate: null,
        sqcode: "",
      });
      fetchMyLeads();
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        alert(err.response.data.message);
      } else {
        console.error("Error creating lead:", err);
        alert("Failed to create lead. Please try again.");
      }
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

  function addClientName(e) {
    if (e.key === ",") {
      e.preventDefault();
      if (nameInput.trim()) {
        setForm((prevForm) => ({
          ...prevForm,
          clientName: [...prevForm.clientName.filter(Boolean), nameInput.trim()],
        }));
        setNameInput("");
      }
    }
  }

  function addClientEmail(e) {
    if (e.key === ",") {
      e.preventDefault();
      if (emailInput.trim()) {
        setForm((prevForm) => ({
          ...prevForm,
          clientEmail: [...prevForm.clientEmail.filter(Boolean), emailInput.trim()],
        }));
        setEmailInput("");
      }
    }
  }

  function removeClientName(index) {
    setForm((prevForm) => ({
      ...prevForm,
      clientName: prevForm.clientName.filter((_, i) => i !== index),
    }));
  }

  function removeClientEmail(index) {
    setForm((prevForm) => ({
      ...prevForm,
      clientEmail: prevForm.clientEmail.filter((_, i) => i !== index),
    }));
  }

  return (
    <div className="container mt-5">
      <Button onClick={onLogout} variant="danger" style={{ float: "right" }}>
        Logout
      </Button>
      <h2>Sales Dashboard</h2>
      {/* Chat Popup */}
  {selectedLeadId && (
    <Chat
      token={token}
      leadId={selectedLeadId}
      onClose={() => setSelectedLeadId(null)}
    />
  )}
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
          <div>
            <label>Client Names:</label>
            <div className="tags-input">
              {form.clientName.map((name, index) => (
                <span key={index} className="tag">
                  {name}
                  <Button variant="link" onClick={() => removeClientName(index)}>
                    &times;
                  </Button>
                </span>
              ))}
              <Form.Control
                placeholder="Add client name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={addClientName}
              />
            </div>
          </div>
        </Form.Group>
        <Form.Group className="mb-3">
          <div>
            <label>Client Email:</label>
            <div className="tags-input">
              {form.clientEmail.map((email, index) => (
                <span key={index} className="tag">
                  {email}
                  <Button variant="link" onClick={() => removeClientEmail(index)}>
                    &times;
                  </Button>
                </span>
              ))}
              <Form.Control
                placeholder="Add client email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={addClientEmail}
              />
            </div>
          </div>
        </Form.Group>
        <Form.Group className="mb-3">
        <Form.Control
          placeholder="Client Company"
          value={form.clientCompany}
          onChange={(e) => setForm({ ...form, clientCompany: e.target.value })}
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
          <Form.Control
            placeholder="Sqcode"
            value={form.sqcode} // Sqcode field
            onChange={(e) => setForm({ ...form, sqcode: e.target.value })}
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
            <th>Created Date</th>
            <th>Client Names</th>
            <th>Client Emails</th>
            <th>Client Company</th>
            <th>Project Name</th>
            <th>Project Description</th>
            <th>Payment Status</th>
            <th>Payment Remark</th>
            <th>Delivery Date</th>
            <th>Actions</th>
            <th>Done</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.leadId}>
              <td>{lead.leadId}</td>
              <td>{new Date(lead.createdAt).toLocaleDateString()}</td>
              <td>{Array.isArray(lead.clientName) ? lead.clientName.join(", ") : "No Names"}</td>
              <td>{Array.isArray(lead.clientEmail) ? lead.clientEmail.join(", ") : "No Emails"}</td>
              <td>{lead.clientCompany}</td>
              <td>{lead.projectName}</td>
              <td>{lead.projectDescription}</td>
              <td>{lead.paymentStatus}</td>
              <td>{lead.paymentRemark || "No Remarks"}</td>
              <td>
                {lead.deliveryDate
                  ? new Date(lead.deliveryDate).toLocaleDateString()
                  : "Not Set"}
              </td>
              <td>
                <Button variant="danger" onClick={() => handleDeleteLead(lead.leadId)}>
                  Delete
                </Button>
              </td>
              <td>
              <Button
              variant="primary"
              onClick={() => setSelectedLeadId(lead.leadId)}
            >
              Chat
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
