import React, { useState, useEffect } from "react";
import axios from "axios";
import { Table, Button, Form } from "react-bootstrap";
import LeadDetailsTable from "./LeadDetailsTable";

function LeadsTable({ token }) {
  const [leads, setLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [leadsPerPage] = useState(10);
  const [selectedLeadId, setSelectedLeadId] = useState(null);

  // Fetch leads from the server
  useEffect(() => {
    async function fetchLeads() {
      try {
        const res = await axios.get("http://localhost:5000/api/leads/my-leads", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLeads(res.data);
      } catch (error) {
        console.error("Error fetching leads:", error);
      }
    }

    fetchLeads();
  }, [token]);



  // Filtered leads based on search term
  const filteredLeads = leads.filter((lead) =>
    lead.clientCompany.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
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
      <h3>My Leads</h3>
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
              <th>Delivery Date</th>
            
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
                  <td>{lead.paymentStatus}</td>
                  <td>
                    {lead.deliveryDate
                      ? new Date(lead.deliveryDate).toLocaleDateString()
                      : "Not Set"}
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
        <LeadDetailsTable
          token={token}
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
        />
      )}
    </div>
  );
}

export default LeadsTable;
