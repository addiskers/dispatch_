import React, { useState, useEffect } from "react";
import axios from "axios";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import "../styles/dashboard.css";

function AccountsDashboard({ token, onLogout }) {
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    fetchAllLeads();
  }, []);

  // Fetch all leads for accounts role
  async function fetchAllLeads() {
    try {
      const res = await axios.get("http://localhost:5000/api/leads/accounts/all-leads", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeads(res.data);
    } catch (err) {
      console.error("Error fetching all leads:", err);
    }
  }

  // Update payment status for a lead
  async function updatePaymentStatus(leadId, paymentStatus) {
    try {
      await axios.patch(
        `http://localhost:5000/api/leads/${leadId}/payment-status`,
        { paymentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchAllLeads(); // Refresh leads after updating
    } catch (err) {
      console.error("Error updating payment status:", err);
    }
  }

  return (
    <div className="container mt-5">
      <Button onClick={onLogout} variant="danger" style={{ float: "right" }}>
        Logout
      </Button>
      <h2>Accounts Dashboard</h2>

      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Lead ID</th>
            <th>Client Name</th>
            <th>Client Email</th>
            <th>Project Name</th>
            <th>Project Description</th>
            <th>Payment Status</th>
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
              <td>
                <Form.Select
                  value={lead.paymentStatus}
                  onChange={(e) => updatePaymentStatus(lead.leadId, e.target.value)}
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </Form.Select>
              </td>
              <td>{lead.done ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

export default AccountsDashboard;
