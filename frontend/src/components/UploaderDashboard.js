import React, { useState, useEffect } from "react";
import axios from "axios";
import MultipleFileUpload from "./MultipleFileUpload";
import Table from "react-bootstrap/Table";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";

function UploaderDashboard({ token, onLogout }) {
  const [leads, setLeads] = useState([]);
  const [doneUpdate, setDoneUpdate] = useState({ leadId: "", done: false });

  useEffect(() => {
    fetchLeads();
  }, []);

  // Fetch leads sent to researcher
  async function fetchLeads() {
    try {
      const res = await axios.get("http://localhost:5000/api/leads/uploader/list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("API Response:", res.data); // Debugging log
      const filteredLeads = res.data.filter((lead) => lead.sentToResearcher);
      setLeads(filteredLeads);
    } catch (err) {
      console.error("Error fetching leads for uploader:", err);
    }
  }
  

  // Update Done/Undone status
  async function handleUpdateDone(e) {
    e.preventDefault();
    try {
      await axios.patch(
        `http://localhost:5000/api/leads/${doneUpdate.leadId}/done`,
        { done: doneUpdate.done },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Lead marked as ${doneUpdate.done ? "Done" : "Undone"}!`);
      setDoneUpdate({ leadId: "", done: false }); 
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
            <th>Project Name</th>
            <th>Description</th>
            <th>Done</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead, idx) => (
            <tr key={idx}>
              <td>{lead.leadId}</td>
              <td>{lead.projectName}</td>
              <td>{lead.projectDescription}</td>
              <td>
                {lead.done ? (
                  <Badge bg="primary">Done</Badge>
                ) : (
                  <Badge bg="secondary">Undone</Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <h3 className="mt-5">Mark Done/Undone</h3>
      <Form onSubmit={handleUpdateDone} className="mt-3">
        <Form.Group className="mb-3">
          <Form.Control
            placeholder="Enter Lead ID"
            value={doneUpdate.leadId}
            onChange={(e) => setDoneUpdate({ ...doneUpdate, leadId: e.target.value })}
          />
        </Form.Group>
        <Form.Select
          value={doneUpdate.done}
          onChange={(e) => setDoneUpdate({ ...doneUpdate, done: e.target.value === "true" })}
          className="mb-3"
        >
          <option value="false">Mark as Undone</option>
          <option value="true">Mark as Done</option>
        </Form.Select>
        <Button type="submit" variant="primary">
          Update Status
        </Button>
      </Form>

      <h3 className="mt-5">Upload Files</h3>
      <MultipleFileUpload token={token} />
    </div>
  );
}

export default UploaderDashboard;
