import React, { useState, useEffect } from "react";
import axios from "axios";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import LeadDetails from "./LeadDetails";
import "../styles/logsection.css";

function LeadsSection({ token }) {
  const [leads, setLeads] = useState([]);
  const [currentPage, setCurrentPage] = useState(1); 
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const leadsPerPage = 10; 

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/leads/accounts/all-leads`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeads(res.data);
    } catch (err) {
      console.error("Error fetching leads:", err);
    }
  }
  const handleDeleteLead = async (leadId) => {
    if (!window.confirm("Are you sure you want to delete this lead?")) return;

    try {
      await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/leads/${leadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeads((prevLeads) => prevLeads.filter((lead) => lead.leadId !== leadId));
      alert("Lead deleted successfully!");
    } catch (error) {
      console.error("Error deleting lead:", error);
      alert("Failed to delete the lead.");
    }
  };

  // Pagination logic
  const indexOfLastLead = currentPage * leadsPerPage;
  const indexOfFirstLead = indexOfLastLead - leadsPerPage;
  const currentLeads = leads.slice(indexOfFirstLead, indexOfLastLead);

  const totalPages = Math.ceil(leads.length / leadsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="container mt-4">
      <h2>All Leads</h2>
      <div className="table-container">
        <Table className="table table-striped table-bordered table-hover">
          <thead>
            <tr>
              <th>Lead ID</th>
              <th>Client Company</th>
              <th>Project Name</th>
              <th>Payment Status</th>
              <th>Delivery Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentLeads.map((lead) => (
              <tr key={lead.leadId}>
                <td>
                  <button
                    className="btn btn-link"
                    onClick={() => setSelectedLeadId(lead.leadId)}
                  >
                    {lead.leadId}
                  </button>
                </td>
                <td>{lead.clientCompany}</td>
                <td>{lead.projectName}</td>
                <td>{lead.paymentStatus}</td>
                <td>{new Date(lead.deliveryDate).toLocaleDateString()}</td>
                <td>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteLead(lead.leadId)}
                    >
                      Delete
                    </Button>
                  </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

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

      {selectedLeadId && (
        <LeadDetails
          token={token}
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
        />
      )}
    </div>
  );
}

export default LeadsSection;
