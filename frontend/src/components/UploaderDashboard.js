import React, { useState, useEffect } from "react";
import axios from "axios";
import MultipleFileUpload from "./MultipleFileUpload";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import "../styles/dashboard.css";

function UploaderDashboard({ token, onLogout }) {
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    fetchLeads();
  }, []);

  // Fetch all leads for uploader
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

  // Update Done/Undone status
  async function handleUpdateDone(leadId, done) {
    if (done) {
      alert("You cannot mark a lead as undone once marked as done.");
      return;
    }

    try {
      await axios.patch(
        `http://localhost:5000/api/leads/${leadId}/done`,
        { done: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Lead marked as Done!");
      fetchLeads();
    } catch (err) {
      console.error("Error updating done status:", err);
      alert("Failed to update status. Please try again.");
    }
  }

  return (
    <div className="container mt-5">
      <Button onClick={onLogout} variant="danger" style={{ float: "right" }}>
        Logout
      </Button>
      <h2>Uploader Dashboard</h2>

      <h3 className="mt-4">Leads List</h3>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Lead ID</th>
            <th>Created Date</th>
            <th>Project Name</th>
            <th>Description</th>
            <th>Payment Status</th>
            <th>Delivery Date</th>
            <th>Done</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.leadId}>
              <td>{lead.leadId}</td>
              <td>
          {new Date(lead.createdAt).toLocaleDateString()} {/* Format the created date */}
        </td>
              <td>{lead.projectName}</td>
              <td>{lead.projectDescription}</td>
              <td>{lead.paymentStatus}</td>
              <td>
                {lead.deliveryDate
                  ? new Date(lead.deliveryDate).toLocaleDateString()
                  : "Not Set"}
              </td>
              <td>
                {lead.done ? (
                  <Badge bg="primary">Done</Badge>
                ) : (
                  <Badge bg="secondary">Undone</Badge>
                )}
              </td>
              <td>
                {!lead.done && (
                  <Button
                    variant="success"
                    onClick={() => handleUpdateDone(lead.leadId, lead.done)}
                  >
                    Mark as Done
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <h3 className="mt-5">Upload Files</h3>
      <MultipleFileUpload token={token} />
    </div>
  );
}

export default UploaderDashboard;
