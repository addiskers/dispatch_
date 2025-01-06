import React, { useState, useEffect } from "react";
import axios from "axios";
import Table from "react-bootstrap/Table";

function LeadsSection({ token }) {
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    try {
      const res = await axios.get("http://localhost:5000/api/leads/accounts/all-leads", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeads(res.data);
    } catch (err) {
      console.error("Error fetching leads:", err);
    }
  }

  return (
    <div>
      <h2>All Leads</h2>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Lead ID</th>
            <th>Client Company</th>
            <th>Project Name</th>
            <th>Payment Status</th>
            <th>Delivery Date</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.leadId}>
              <td>{lead.leadId}</td>
              <td>{lead.clientCompany}</td>
              <td>{lead.projectName}</td>
              <td>{lead.paymentStatus}</td>
              <td>{new Date(lead.deliveryDate).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

export default LeadsSection;
