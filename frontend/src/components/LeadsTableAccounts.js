import React, { useState, useEffect } from "react";
import axios from "axios";
import { Table, Button, Form } from "react-bootstrap";

import LeadDetailsuploader from "./LeadDetailsuploader"; 
function LeadsTableAccounts({ token }) {
  const [leads, setLeads] = useState([]);
  const [statusUpdates, setStatusUpdates] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [leadsPerPage] = useState(10);
  const [selectedLeadId, setSelectedLeadId] = useState(null);

  useEffect(() => {
    fetchAllLeads();
  }, [token]);

  async function fetchAllLeads() {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/leads/accounts/all-leads`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeads(res.data);

      const initialStatus = {};
      res.data.forEach((lead) => {
        initialStatus[lead.leadId] = lead.paymentStatus || "not_received";
      });
      setStatusUpdates(initialStatus);
    } catch (err) {
      console.error("Error fetching all leads:", err);
    }
  }

  async function updatePaymentStatus(leadId) {
    try {
      const paymentStatus = statusUpdates[leadId];
      await axios.patch(
        `${process.env.REACT_APP_API_BASE_URL}/api/leads/${leadId}/payment-status`,
        { paymentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Payment status updated successfully!");
      fetchAllLeads();
    } catch (err) {
      console.error("Error updating payment status:", err);
      alert("Failed to update payment status.");
    }
  }
  async function handleUpdateDone(leadId, currentStatus) {
    if (currentStatus === "Dispatched") {
      alert("You cannot modify a dispatched lead.");
      return;
    }

    if (currentStatus === "Done") {
      alert("You cannot mark a lead as undone once marked as Done.");
      return;
    }

    try {
      await axios.patch(
        `${process.env.REACT_APP_API_BASE_URL}/api/leads/${leadId}/done`,
        { done: "Done" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Lead marked as Ready to Dispatch!");
      fetchAllLeads();
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update status. Please try again.");
    }
  }

  const handleStatusChange = (leadId, value) => {
    setStatusUpdates((prev) => ({
      ...prev,
      [leadId]: value,
    }));
  };

  const filteredLeads = leads.filter(
    (lead) =>
      lead.clientCompany &&
      lead.clientCompany.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastLead = currentPage * leadsPerPage;
  const indexOfFirstLead = indexOfLastLead - leadsPerPage;
  const currentLeads = filteredLeads.slice(indexOfFirstLead, indexOfLastLead);
  const totalPages = Math.ceil(filteredLeads.length / leadsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  return (
    <div>
      <h3>Leads Table</h3>

      {/* Search Box */}
      <Form.Group className="mb-3">
        <Form.Control
          type="text"
          placeholder="Search by Client Company"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Form.Group>

      {/* Leads Table */}
      <div className="table-container">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Lead ID</th>
              <th>Client Company</th>
              <th>Project Name</th>
              <th>Payment Status</th>
              <th>Actions</th>
              <th>Ready to Dispatch</th>
            </tr>
          </thead>
          <tbody>
            {currentLeads.length > 0 ? (
              currentLeads.map((lead) => (
                <tr key={lead.leadId}>
                  <td
                    style={{ cursor: "pointer", color: "blue" }}
                    onClick={() => setSelectedLeadId(lead.leadId)}
                  >
                    {lead.leadId}
                  </td>
                  <td>{lead.clientCompany}</td>
                  <td>{lead.projectName}</td>
                  <td>
                    <Form.Select
                      value={statusUpdates[lead.leadId] || "not_received"}
                      onChange={(e) => handleStatusChange(lead.leadId, e.target.value)}
                    >
                      <option value="not_received">Not Received</option>
                      <option value="partial">Partial Received</option>
                      <option value="full">Full</option>
                    </Form.Select>
                  </td>
                  <td>
                    <Button
                      variant="primary"
                      onClick={() => updatePaymentStatus(lead.leadId)}
                    >
                      Update Payment
                    </Button>
                  </td>
                  <td>
                    {lead.done === "Dispatched" ? (
                      <span className="text-success fw-bold">Dispatched</span>
                    ) : lead.done === "Done" ? (
                      <span className="text-primary fw-bold">Ready to Dispatch</span>
                    ) : (
                      <Button
                        variant="success"
                        onClick={() => handleUpdateDone(lead.leadId, lead.done)}
                      >
                        Mark as Done
                      </Button>
                    )}
                  </td>
                 
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center">
                  No leads found.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="pagination-controls">
        <Button
          variant="secondary"
          onClick={handlePrevPage}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="secondary"
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>

      {/* Lead Details Popup */}
      {selectedLeadId && (
        <LeadDetailsuploader
          token={token}
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
        />
      )}
    </div>
  );
}

export default LeadsTableAccounts;
