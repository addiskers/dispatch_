import React, { useState, useEffect } from "react";
import axios from "axios";
import { Table, Button, Card, Badge, Form, InputGroup, Dropdown, OverlayTrigger, Tooltip, Spinner } from "react-bootstrap";
import { Search, Filter, BarChart, Calendar, Envelope, Telephone, ArrowClockwise, Building, InfoCircle } from 'react-bootstrap-icons';
import ConversationTimeline from "./ConversationTimeline";
import "../styles/freshworksleads.css";

function FreshworksLeads({ token }) {
  const [leads, setLeads] = useState([]);
  const [companySummaries, setCompanySummaries] = useState({});
  const [loadingSummaries, setLoadingSummaries] = useState({});
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [showConversations, setShowConversations] = useState(false);
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('table');

  const genericDomains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"];
  const getEmailType = (email) => {
    if (!email || typeof email !== "string") return "-";
    const parts = email.split("@");
    if (parts.length !== 2) return "-";
    const domain = parts[1].toLowerCase();
    return genericDomains.includes(domain) ? "Generic" : "Corporate";
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    // Fetch company summaries for corporate leads that have company names
    const corporateLeadsWithCompanies = leads.filter(lead => 
      getEmailType(lead.email) === 'Corporate' && 
      lead.custom_field?.cf_company_name
    );
    
    corporateLeadsWithCompanies.forEach(lead => {
      const companyName = lead.custom_field?.cf_company_name;
      const country = lead.country || '';
      
      // Only fetch if we don't already have this summary and it's not currently loading
      if (!companySummaries[companyName] && !loadingSummaries[companyName]) {
        fetchCompanySummary(companyName, country, lead.id);
      }
    });
  }, [leads]);

  const fetchLeads = async () => {
    setRefreshing(true);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/api/freshworks/leads`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLeads(res.data.leads);
    } catch (err) {
      console.error("Error fetching leads:", err);
    } finally {
      setRefreshing(false);
    }
  };

  
const fetchCompanySummary = async (companyName, country, leadId) => {
  // Set loading state for this company
  setLoadingSummaries(prev => ({ ...prev, [companyName]: true }));
  
  try {
    console.log(`Fetching summary for ${companyName} from ${country}`);
    
    const res = await axios.get(
      `${process.env.REACT_APP_API_BASE_URL}/api/freshworks/company-summary`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        params: { companyName, country },
        timeout: 20000 // 20 second timeout
      }
    );
    
    if (res.data && res.data.summary) {
      console.log(`Successfully received summary for ${companyName}`);
      
      // Save the summary
      setCompanySummaries(prev => ({ 
        ...prev, 
        [companyName]: res.data.summary 
      }));
    } else {
      console.error(`Received empty response for ${companyName}`);
      throw new Error("Empty response received");
    }
  } catch (err) {
    console.error(`Error fetching summary for ${companyName}:`, err);
    
    let errorMessage = "Unable to fetch company information.";
    
    // Enhanced error handling with specific messages
    if (err.response) {
      // Server returned an error response
      const status = err.response.status;
      const serverError = err.response.data?.error || "Unknown server error";
      const details = err.response.data?.details;
      
      console.error(`Server error (${status}): ${serverError}`);
      
      if (status === 401 || status === 403) {
        errorMessage = "Authentication error. Please login again.";
      } else if (status === 500) {
        if (serverError.includes("OpenAI API key")) {
          errorMessage = "API key configuration issue. Contact support.";
        } else if (serverError.includes("timeout")) {
          errorMessage = "OpenAI request timed out. Try again later.";
        } else {
          errorMessage = `API error: ${serverError}`;
        }
      }
      
      // Log additional details if available
      if (details) {
        console.error("Error details:", details);
      }
    } else if (err.request) {
      // Request was made but no response received
      console.error("No response received from server");
      errorMessage = "Server unavailable. Try again later.";
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = "Request timed out. Try again later.";
      }
    } else {
      // Error setting up the request
      console.error("Error setting up request:", err.message);
      errorMessage = "Connection error. Check your network.";
    }
    
    // Save an error state with a user-friendly message
    setCompanySummaries(prev => ({ 
      ...prev, 
      [companyName]: errorMessage
    }));
  } finally {
    // Clear loading state
    setLoadingSummaries(prev => ({ ...prev, [companyName]: false }));
  }
};

  const handleShowConversations = (leadId) => {
    setSelectedLeadId(leadId);
    setShowConversations(true);
  };

  const handleCloseConversations = () => {
    setShowConversations(false);
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return "-";
    const d = new Date(isoString);
    const date = d.toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric"
    });
    const time = d.toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit", hour12: true
    });
    return `${date} ${time}`;
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const getLeadStageBadge = (stage) => {
    let variant = 'secondary';
    
    switch(stage?.toLowerCase()) {
      case 'new':
        variant = 'info';
        break;
      case 'qualified':
        variant = 'primary';
        break;
      case 'contacted':
        variant = 'warning';
        break;
      case 'converted':
        variant = 'success';
        break;
      default:
        variant = 'secondary';
    }
    
    return <Badge bg={variant}>{stage}</Badge>;
  };

  // Filter and sort leads
  const filteredLeads = leads
    .filter(lead => {
      // First apply the type filter
      if (filterType !== 'all') {
        if (filterType === 'corporate' && getEmailType(lead.email) !== 'Corporate') return false;
        if (filterType === 'generic' && getEmailType(lead.email) !== 'Generic') return false;
        if (filterType === 'new' && lead.stage_name?.toLowerCase() !== 'new') return false;
        if (filterType === 'qualified' && lead.stage_name?.toLowerCase() !== 'qualified') return false;
        if (filterType === 'contacted' && lead.stage_name?.toLowerCase() !== 'contacted') return false;
        if (filterType === 'converted' && lead.stage_name?.toLowerCase() !== 'converted') return false;
      }
      
      // Then apply search term filter
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      
      return (
        (lead.email && lead.email.toLowerCase().includes(searchLower)) ||
        (lead.custom_field?.cf_company_name && lead.custom_field.cf_company_name.toLowerCase().includes(searchLower)) ||
        (lead.custom_field?.cf_report_name && lead.custom_field.cf_report_name.toLowerCase().includes(searchLower)) ||
        (lead.owner_name && lead.owner_name.toLowerCase().includes(searchLower)) ||
        (lead.country && lead.country.toLowerCase().includes(searchLower)) ||
        (lead.stage_name && lead.stage_name.toLowerCase().includes(searchLower))
      );
    })
    .sort((a, b) => {
      let aValue = sortField.includes('custom_field') 
        ? a.custom_field?.[sortField.split('.')[1]] 
        : a[sortField];
      let bValue = sortField.includes('custom_field') 
        ? b.custom_field?.[sortField.split('.')[1]] 
        : b[sortField];
      
      // Handle null/undefined values
      if (!aValue) aValue = '';
      if (!bValue) bValue = '';
      
      // Handle date sorting
      if (sortField === 'created_at' || sortField === 'last_contacted_time') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="freshworks-leads-container">
      <Card className="dashboard-card">
        <Card.Header className="dashboard-header">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <h2 className="dashboard-title">Freshworks Leads</h2>
              <Button 
                variant="outline-primary" 
                className="refresh-btn ms-3" 
                onClick={fetchLeads}
                disabled={refreshing}
              >
                <ArrowClockwise className={`refresh-icon ${refreshing ? 'rotating' : ''}`} size={16} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
            
            <div className="d-flex align-items-center">
              <div className="view-toggle-container me-3">
                <Button 
                  variant={viewMode === 'table' ? 'primary' : 'outline-primary'} 
                  className="view-btn"
                  onClick={() => setViewMode('table')}
                >
                  <BarChart size={18} />
                </Button>
                <Button 
                  variant={viewMode === 'calendar' ? 'primary' : 'outline-primary'} 
                  className="view-btn"
                  onClick={() => setViewMode('calendar')}
                >
                  <Calendar size={18} />
                </Button>
              </div>
              
              <div className="search-filter-container">
                <InputGroup>
                  <InputGroup.Text className="search-icon-container">
                    <Search size={16} />
                  </InputGroup.Text>
                  <Form.Control
                    placeholder="Search leads..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  <Dropdown align="end">
                    <Dropdown.Toggle variant="outline-secondary" id="filter-dropdown" className="filter-btn">
                      <Filter size={16} />
                    </Dropdown.Toggle>
                    <Dropdown.Menu className="filter-menu">
                      <Dropdown.Header>Email Type</Dropdown.Header>
                      <Dropdown.Item onClick={() => setFilterType('all')} active={filterType === 'all'}>All Types</Dropdown.Item>
                      <Dropdown.Item onClick={() => setFilterType('corporate')} active={filterType === 'corporate'}>Corporate Only</Dropdown.Item>
                      <Dropdown.Item onClick={() => setFilterType('generic')} active={filterType === 'generic'}>Generic Only</Dropdown.Item>
                      <Dropdown.Divider />
                      <Dropdown.Header>Lead Stage</Dropdown.Header>
                      <Dropdown.Item onClick={() => setFilterType('new')} active={filterType === 'new'}>New Leads</Dropdown.Item>
                      <Dropdown.Item onClick={() => setFilterType('qualified')} active={filterType === 'qualified'}>Qualified Leads</Dropdown.Item>
                      <Dropdown.Item onClick={() => setFilterType('contacted')} active={filterType === 'contacted'}>Contacted Leads</Dropdown.Item>
                      <Dropdown.Item onClick={() => setFilterType('converted')} active={filterType === 'converted'}>Converted Leads</Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </InputGroup>
              </div>
            </div>
          </div>
        </Card.Header>
        
        <Card.Body className="p-0">
          {viewMode === 'table' && (
            <div className="table-responsive">
              <Table className="leads-table mb-0">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('id')} className="sortable-header">
                      ID {renderSortIcon('id')}
                    </th>
                    <th onClick={() => handleSort('custom_field.cf_report_name')} className="sortable-header">
                      Report Name {renderSortIcon('custom_field.cf_report_name')}
                    </th>
                    <th onClick={() => handleSort('email')} className="sortable-header">
                      Type {renderSortIcon('email')}
                    </th>
                    <th onClick={() => handleSort('email')} className="sortable-header">
                      Email {renderSortIcon('email')}
                    </th>
                    <th onClick={() => handleSort('owner_name')} className="sortable-header">
                      Owner {renderSortIcon('owner_name')}
                    </th>
                    <th onClick={() => handleSort('custom_field.cf_company_name')} className="sortable-header">
                      Company {renderSortIcon('custom_field.cf_company_name')}
                    </th>
                    <th onClick={() => handleSort('country')} className="sortable-header">
                      Country {renderSortIcon('country')}
                    </th>
                    <th>
                      Company Summary
                    </th>
                    <th onClick={() => handleSort('job_title')} className="sortable-header">
                      Designation {renderSortIcon('job_title')}
                    </th>
                    <th onClick={() => handleSort('stage_name')} className="sortable-header">
                      Lead Stage {renderSortIcon('stage_name')}
                    </th>
                    <th onClick={() => handleSort('created_at')} className="sortable-header">
                      Created {renderSortIcon('created_at')}
                    </th>
                    <th>Actions</th>
                    <th onClick={() => handleSort('last_contacted_mode')} className="sortable-header">
                      Contact Mode {renderSortIcon('last_contacted_mode')}
                    </th>
                    <th onClick={() => handleSort('last_contacted_time')} className="sortable-header">
                      Last Contact {renderSortIcon('last_contacted_time')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.length > 0 ? (
                    filteredLeads.map((lead) => {
                      const isCorpEmail = getEmailType(lead.email) === 'Corporate';
                      const companyName = lead.custom_field?.cf_company_name;
                      const hasCompanyInfo = isCorpEmail && companyName;
                      
                      return (
                        <tr key={lead.id} className="lead-row">
                          <td>{lead.id}</td>
                          <td className="report-name">
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip>{lead.custom_field?.cf_report_name || "No report name"}</Tooltip>}
                            >
                              <span>{lead.custom_field?.cf_report_name || "-"}</span>
                            </OverlayTrigger>
                          </td>
                          <td>
                            <Badge bg={isCorpEmail ? 'success' : 'secondary'} className="type-badge">
                              {getEmailType(lead.email)}
                            </Badge>
                          </td>
                          <td className="email-cell">
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip>{lead.email || "No email"}</Tooltip>}
                            >
                              <span>{lead.email || "-"}</span>
                            </OverlayTrigger>
                          </td>
                          <td>{lead.owner_name}</td>
                          <td>
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip>{companyName || "No company name"}</Tooltip>}
                            >
                              <span>{companyName || "-"}</span>
                            </OverlayTrigger>
                          </td>
                          <td>{lead.country || "-"}</td>
                          <td className="company-summary-cell">
                            {hasCompanyInfo ? (
                              loadingSummaries[companyName] ? (
                                <div className="summary-loading">
                                  <Spinner animation="border" size="sm" className="me-2" />
                                  <span>Generating...</span>
                                </div>
                              ) : (
                                <OverlayTrigger
                                  placement="top"
                                  overlay={<Tooltip>{companySummaries[companyName] || "No summary available"}</Tooltip>}
                                >
                                  <div className="company-summary">
                                    <Building size={14} className="me-1" />
                                    <span className="summary-text">
                                      {companySummaries[companyName] ? 
                                        (companySummaries[companyName].length > 40 ? 
                                          companySummaries[companyName].substring(0, 40) + "..." : 
                                          companySummaries[companyName]) :
                                        "No summary available"}
                                    </span>
                                    <InfoCircle size={14} className="ms-1 summary-info-icon" />
                                  </div>
                                </OverlayTrigger>
                              )
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>{lead.job_title || "-"}</td>
                          <td className="lead-stage-cell">{getLeadStageBadge(lead.stage_name)}</td>
                          <td className="date-time-cell">{formatDateTime(lead.created_at)}</td>
                          <td>
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              className="action-btn"
                              onClick={() => handleShowConversations(lead.id)}
                            >
                              View History
                            </Button>
                          </td>
                          <td>
                            {lead.last_contacted_mode && (
                              <Badge bg="info" className="contact-mode-badge">
                                {lead.last_contacted_mode === 'email' ? (
                                  <><Envelope size={12} className="me-1" /> Email</>
                                ) : lead.last_contacted_mode === 'call' ? (
                                  <><Telephone size={12} className="me-1" /> Call</>
                                ) : (
                                  lead.last_contacted_mode
                                )}
                              </Badge>
                            )}
                          </td>
                          <td className="date-time-cell">{lead.last_contacted_time ? formatDateTime(lead.last_contacted_time) : "-"}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="14" className="text-center py-4">
                        <div className="empty-state">
                          <div className="empty-icon">
                            <Search size={32} />
                          </div>
                          <h5>No leads found</h5>
                          <p className="text-muted">Try adjusting your search or filters</p>
                          <Button variant="outline-primary" size="sm" onClick={() => {
                            setSearchTerm('');
                            setFilterType('all');
                          }}>
                            Clear filters
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          )}
          
          {viewMode === 'calendar' && (
            <div className="calendar-view p-4">
              <div className="text-center py-5">
                <h4>Calendar View</h4>
                <p className="text-muted">Calendar view is coming soon...</p>
              </div>
            </div>
          )}
        </Card.Body>
        
        <Card.Footer className="dashboard-footer">
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">Showing {filteredLeads.length} of {leads.length} leads</small>
            {filterType !== 'all' && (
              <Badge bg="primary" className="filter-badge">
                Active Filter: {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                <Button variant="link" className="filter-clear-btn p-0 ms-2" onClick={() => setFilterType('all')}>
                  ×
                </Button>
              </Badge>
            )}
          </div>
        </Card.Footer>
      </Card>

      {/* Conversation Timeline Modal */}
      <ConversationTimeline 
        leadId={selectedLeadId}
        token={token}
        show={showConversations}
        onHide={handleCloseConversations}
      />
    </div>
  );
}

export default FreshworksLeads;