import React, { useState, useEffect } from "react";
import axios from "axios";
import { Table, Button, Form, Row, Col } from "react-bootstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import LeadDetailsTable from "./LeadDetailsTable";

function LeadsTable({ token }) {
  const [leads, setLeads] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [leadsPerPage] = useState(10);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [creationDateFrom, setCreationDateFrom] = useState(null);
  const [creationDateTo, setCreationDateTo] = useState(null);
  const [deliveryDateFrom, setDeliveryDateFrom] = useState(null);
  const [deliveryDateTo, setDeliveryDateTo] = useState(null);
  useEffect(() => {
    async function fetchLeads() {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/leads/accounts/all-leads`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLeads(res.data);
      } catch (error) {
        console.error("Error fetching leads:", error);
      }
    }

    fetchLeads();
  }, [token]);


  const filteredLeads = leads.filter((lead) => {
    const matchesSearchTerm =
      lead.projectName &&
      lead.projectName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter ? lead.done === statusFilter : true;

    const matchesCreationDate =
      (!creationDateFrom || new Date(lead.createdAt) >= new Date(creationDateFrom)) &&
      (!creationDateTo || new Date(lead.createdAt) <= new Date(creationDateTo));

    const matchesDeliveryDate =
      (!deliveryDateFrom || new Date(lead.deliveryDate) >= new Date(deliveryDateFrom)) &&
      (!deliveryDateTo || new Date(lead.deliveryDate) <= new Date(deliveryDateTo));

    return matchesSearchTerm && matchesStatus && matchesCreationDate && matchesDeliveryDate;
  });

  const indexOfLastLead = currentPage * leadsPerPage;
  const indexOfFirstLead = indexOfLastLead - leadsPerPage;
  const currentLeads = filteredLeads.slice(indexOfFirstLead, indexOfLastLead);
  const totalPages = Math.max(Math.ceil(filteredLeads.length / leadsPerPage), 1);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  return (
    <div>
      <h3>My Leads</h3>
      <Form className="mb-4">
        <Row className="g-3">
          {/* Search by Project Name - Full width on mobile, 3 columns on larger screens */}
          <Col xs={12} md={6} lg={3}>
            <Form.Group>
              <Form.Label>Search by Project Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter Project Name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Form.Group>
          </Col>

          {/* Creation Date Filters - Stack vertically on mobile */}
          <Col xs={12} md={6} lg={3}>
            <Form.Group>
              <Form.Label>Creation Date Range</Form.Label>
              <div className="d-flex flex-column gap-2">
                <DatePicker
                  selected={creationDateFrom}
                  onChange={(date) => setCreationDateFrom(date)}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="Start Date"
                  className="form-control"
                />
                <DatePicker
                  selected={creationDateTo}
                  onChange={(date) => setCreationDateTo(date)}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="End Date"
                  className="form-control"
                />
              </div>
            </Form.Group>
          </Col>

          {/* Delivery Date Filters - Stack vertically on mobile */}
          <Col xs={12} md={6} lg={3}>
            <Form.Group>
              <Form.Label>Delivery Date Range</Form.Label>
              <div className="d-flex flex-column gap-2">
                <DatePicker
                  selected={deliveryDateFrom}
                  onChange={(date) => setDeliveryDateFrom(date)}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="Start Date"
                  className="form-control"
                />
                <DatePicker
                  selected={deliveryDateTo}
                  onChange={(date) => setDeliveryDateTo(date)}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="End Date"
                  className="form-control"
                />
              </div>
            </Form.Group>
          </Col>

          {/* Status Filter - Full width on mobile, auto-width on larger screens */}
          <Col xs={12} md={6} lg={3}>
            <Form.Group>
              <Form.Label>Filter by Status</Form.Label>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="false">Waiting for Approval</option>
                <option value="Done">Ready to Dispatch</option>
                <option value="Dispatched">Dispatched</option>
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>
      </Form>
{/* Leads Table */}
<div className="table-container">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Lead ID</th>
              <th>Client Company</th>
              <th>Project Name</th>
              <th>Payment Status</th>
              <th>Creation Date</th>
              <th>Delivery Date</th>
              <th>Dispatch Status</th>
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
                  <td className="project-name">{lead.projectName}</td>                 
                  <td>{lead.paymentStatus}</td>
                  <td>{lead.createdAt
                      ? new Date(lead.createdAt).toLocaleDateString()
                      : "Not Set"}</td>
                  <td>{lead.deliveryDate
                      ? new Date(lead.deliveryDate).toLocaleDateString()
                      : "Not Set"}</td>
                  <td>
                {lead.done === "Dispatched" ? (
                  <span className="text-primary fw-bold">Dispatched</span>
                ) : lead.done === "Done" ? (
                  <span className="text-success fw-bold">Ready to Dispatch</span>
                ) : !lead.done || lead.done === "false" ? (
                  <span className="text-warning fw-bold">Waiting for Approval</span>
                ) : (
                  <span className="text-danger fw-bold">Unknown Status</span>
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
