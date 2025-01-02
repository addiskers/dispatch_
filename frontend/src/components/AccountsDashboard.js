import React, { useState, useEffect } from "react";
import axios from "axios";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import "../styles/dashboard.css";

function AccountsDashboard({ token, onLogout }) {
  const [leads, setLeads] = useState([]);
  const [statusUpdates, setStatusUpdates] = useState({}); 

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

      // Initialize statusUpdates for tracking changes
      const initialStatus = {};
      res.data.forEach((lead) => {
        initialStatus[lead.leadId] = {
          paymentStatus: lead.paymentStatus || "not_received",
          paymentRemark: lead.paymentRemark || "",
        };
      });
      setStatusUpdates(initialStatus);
    } catch (err) {
      console.error("Error fetching all leads:", err);
    }
  }

  // Update payment status and remark for a lead
  async function updatePaymentStatus(leadId) {
    try {
      const { paymentStatus, paymentRemark } = statusUpdates[leadId];
      await axios.patch(
        `http://localhost:5000/api/leads/${leadId}/payment-status`,
        { paymentStatus, paymentRemark },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Payment status updated successfully!");
      fetchAllLeads(); // Refresh leads after updating
    } catch (err) {
      console.error("Error updating payment status:", err);
      alert("Failed to update payment status.");
    }
  }

  // Handle changes to paymentStatus or paymentRemark
  function handleInputChange(leadId, field, value) {
    setStatusUpdates((prev) => ({
      ...prev,
      [leadId]: {
        ...prev[leadId],
        [field]: value,
      },
    }));
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
            <th>Created Date</th>
            <th>Client Name</th>
            <th>Project Name</th>
            <th>Payment Status</th>
            <th>Payment Remark</th>
            <th>Actions</th>
            <th>Done</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.leadId}>
              <td>{lead.leadId}</td>
              <td>
          {new Date(lead.createdAt).toLocaleDateString()} {/* Format the created date */}
        </td>
              <td>{lead.clientName}</td>
              <td>{lead.projectName}</td>
             
              <td>
                <Form.Select
                  value={statusUpdates[lead.leadId]?.paymentStatus || "not_received"}
                  onChange={(e) =>
                    handleInputChange(lead.leadId, "paymentStatus", e.target.value)
                  }
                >
                  <option value="not_received">Not Received</option>
                  <option value="partial">Partial Received</option>
                  <option value="full">Full</option>
                </Form.Select>
              </td>
              <td>
                <Form.Control
                  as="textarea"
                  placeholder="Add Payment Remark"
                  value={statusUpdates[lead.leadId]?.paymentRemark || ""}
                  onChange={(e) =>
                    handleInputChange(lead.leadId, "paymentRemark", e.target.value)
                  }
                />
              </td>
              <td>
                <Button
                  variant="primary"
                  onClick={() => updatePaymentStatus(lead.leadId)}
                >
                  Update Payment
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

export default AccountsDashboard;
