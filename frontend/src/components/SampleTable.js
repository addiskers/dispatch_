import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../styles/sample-table.css';

const SampleTable = ({ token, userRole, currentUser }) => {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortConfig, setSortConfig] = useState({ key: 'requestedAt', direction: 'desc' });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSample, setSelectedSample] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [statistics, setStatistics] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  
  // New allocation states
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [allocationData, setAllocationData] = useState({
    allocatedToEmail: '',
    qcedByEmail: ''
  });
  const [allocationLoading, setAllocationLoading] = useState(false);
  
  const [filters, setFilters] = useState({
    status: [],
    querySource: '',
    priority: '',
    salesPerson: '',
    startDate: '',
    endDate: ''
  });

  const fileInputRef = useRef(null);
  const API_BASE_URL = `${process.env.REACT_APP_API_BASE_URL || 'https://www.theskyquestt.org'}/api`;

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const statusOptions = [
    { value: 'requested', label: 'Requested', color: '#ff9800' },
    { value: 'allocated', label: 'Allocated', color: '#9c27b0' },
    { value: 'in_progress', label: 'In Progress', color: '#2196f3' },
    { value: 'done', label: 'Done', color: '#4caf50' },
    { value: 'cancelled', label: 'Cancelled', color: '#f44336' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low', color: '#4caf50' },
    { value: 'medium', label: 'Medium', color: '#ff9800' },
    { value: 'high', label: 'High', color: '#f44336' },
    { value: 'urgent', label: 'Urgent', color: '#e91e63' }
  ];

  useEffect(() => {
    if (token) {
      fetchSamples();
      fetchStatistics();
      if (canAllocate()) {
        fetchTeamMembers();
      }
    }
  }, [currentPage, searchTerm, sortConfig, filters, token]);

  const fetchTeamMembers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/samples/team-members`, {
        headers: getAuthHeaders()
      });
      if (response.data.success) {
        setTeamMembers(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching team members:', err);
    }
  };

  const fetchSamples = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage,
        limit: 50,
        search: searchTerm,
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction
      });

      if (filters.status.length > 0) {
        filters.status.forEach(status => params.append('status', status));
      }
      if (filters.querySource) params.append('querySource', filters.querySource);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.salesPerson) params.append('salesPerson', filters.salesPerson);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await axios.get(`${API_BASE_URL}/samples?${params}`, {
        headers: getAuthHeaders()
      });

      if (response.data.success) {
        setSamples(response.data.data);
        setTotalPages(response.data.pagination.totalPages);
        setTotalCount(response.data.pagination.totalCount);
      } else {
        setError(response.data.message || 'Error fetching samples');
      }
    } catch (err) {
      console.error('Error fetching samples:', err);
      setError('Failed to fetch samples. Please check your authentication.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/samples/statistics`, {
        headers: getAuthHeaders()
      });

      if (response.data.success) {
        setStatistics(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching sample statistics:', err);
    }
  };

  const handleAllocateSample = async () => {
    if (!allocationData.allocatedToEmail || !allocationData.qcedByEmail) {
      alert('Please select both Allocated To and QC person');
      return;
    }

    try {
      setAllocationLoading(true);
      const response = await axios.patch(
        `${API_BASE_URL}/samples/${selectedSample._id}/allocate`,
        allocationData,
        { headers: getAuthHeaders() }
      );

      if (response.data.success) {
        fetchSamples();
        setShowAllocationModal(false);
        setAllocationData({ allocatedToEmail: '', qcedByEmail: '' });
        setSelectedSample(null);
        alert('Sample allocated successfully! Notification emails have been sent.');
      }
    } catch (err) {
      console.error('Error allocating sample:', err);
      alert('Error allocating sample: ' + (err.response?.data?.message || err.message));
    } finally {
      setAllocationLoading(false);
    }
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      
      if (filterName === 'status') {
        const currentValues = newFilters.status || [];
        if (currentValues.includes(value)) {
          newFilters.status = currentValues.filter(v => v !== value);
        } else {
          newFilters.status = [...currentValues, value];
        }
      } else {
        newFilters[filterName] = value;
      }
      
      return newFilters;
    });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      status: [],
      querySource: '',
      priority: '',
      salesPerson: '',
      startDate: '',
      endDate: ''
    });
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleUpdateStatus = async (sampleId, newStatus, notes = '') => {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/samples/${sampleId}/status`,
        { status: newStatus, notes },
        { headers: getAuthHeaders() }
      );

      if (response.data.success) {
        fetchSamples();
        if (selectedSample && selectedSample._id === sampleId) {
          setSelectedSample(response.data.data);
        }
        alert(`Sample marked as ${newStatus} successfully!`);
      }
    } catch (err) {
      console.error('Error updating sample status:', err);
      alert('Error updating sample status');
    }
  };

  const handleMultipleFileUpload = async (sampleId) => {
    if (!uploadFiles || uploadFiles.length === 0) {
      alert('Please select at least one file');
      return;
    }

    try {
      setUploadLoading(true);
      const formData = new FormData();
      
      Array.from(uploadFiles).forEach(file => {
        formData.append('files', file);
      });

      const response = await axios.post(
        `${API_BASE_URL}/samples/${sampleId}/upload-multiple`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        fetchSamples();
        setShowUploadModal(false);
        setUploadFiles([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        alert(`${uploadFiles.length} file(s) uploaded successfully!`);
      }
    } catch (err) {
      console.error('Error uploading files:', err);
      alert('Error uploading files');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDownloadFile = async (sampleId, fileId, filename, isRequirement = false) => {
    try {
      const endpoint = isRequirement 
        ? `${API_BASE_URL}/samples/${sampleId}/download-requirement/${fileId}`
        : `${API_BASE_URL}/samples/${sampleId}/download/${fileId}`;
        
      const response = await axios.get(endpoint, { headers: getAuthHeaders() });

      if (response.data.success) {
        window.open(response.data.downloadUrl, '_blank');
      }
    } catch (err) {
      console.error('Error downloading file:', err);
      alert('Error downloading file');
    }
  };

  const handleDownloadMultipleFiles = async (sampleId, fileIds) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/samples/${sampleId}/download-multiple`,
        { fileIds },
        { headers: getAuthHeaders() }
      );

      if (response.data.success) {
        response.data.files.forEach(file => {
          window.open(file.downloadUrl, '_blank');
        });
        setShowDownloadModal(false);
        setSelectedFiles([]);
      }
    } catch (err) {
      console.error('Error downloading files:', err);
      alert('Error downloading files');
    }
  };

  const getTimingFromContactCreation = (sample) => {
    if (sample.timeSinceContactCreation && !sample.timeSinceContactCreation.error) {
      return sample.timeSinceContactCreation.formatted;
    }
    return 'Contact data unavailable';
  };

  const getCompletionTime = (sample) => {
    if (!sample.completedAt) return '-';
    
    const requestedDate = sample.requestedAtIST ? 
      new Date(sample.requestedAtIST) : 
      new Date(sample.requestedAt);
    const completedDate = sample.completedAtIST ? 
      new Date(sample.completedAtIST) : 
      new Date(sample.completedAt);
      
    const diffMs = completedDate - requestedDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h ${diffMinutes}m`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    } else {
      return `${diffMinutes}m`;
    }
  };

  const formatDate = (dateString) => {
    const date = dateString.includes('T') ? new Date(dateString) : new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    });
  };

  const getStatusBadge = (status) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    return (
      <span 
        className="status-badge"
        style={{ backgroundColor: statusOption?.color || '#9e9e9e' }}
      >
        {statusOption?.label || status}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityOption = priorityOptions.find(opt => opt.value === priority);
    return (
      <span 
        className="priority-badge"
        style={{ backgroundColor: priorityOption?.color || '#9e9e9e' }}
      >
        {priorityOption?.label || priority}
      </span>
    );
  };

  const getSortIcon = (column) => {
    if (sortConfig.key !== column) return '↕';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const activeFiltersCount = Object.values(filters).filter((value) => {
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  }).length;

  const canUpload = () => ['uploader', 'superadmin'].includes(userRole);
  const canDownload = () => true; 
  const canMarkAsDone = () => ['uploader', 'superadmin'].includes(userRole);
  const canAllocate = () => ['uploader', 'superadmin'].includes(userRole);

  if (loading && samples.length === 0) {
    return (
      <div className="sample-table-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading samples...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sample-table-container">
        <div className="error-state">
          <h4>Error</h4>
          <p>{error}</p>
          <button onClick={fetchSamples} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sample-table-container">
      {/* Header */}
      <div className="sample-header">
        <div className="header-content">
          <h1 className="sample-title">Sample Management</h1>
          <p className="sample-subtitle">
            {loading ? 'Loading...' : 
              `${totalCount.toLocaleString()} total samples • Page ${currentPage} of ${totalPages}`
            }
          </p>
        </div>
        <div className="header-actions">
          <button 
            onClick={fetchSamples}
            className="btn btn-outline refresh-btn"
            disabled={loading}
          >
            {loading ? '⟳' : '↻'} Refresh
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="statistics-section">
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-icon requested">📋</div>
              <div className="stat-content">
                <div className="stat-number">{statistics.overview.requestedCount}</div>
                <div className="stat-label">Requested</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon allocated">👥</div>
              <div className="stat-content">
                <div className="stat-number">{statistics.overview.allocatedCount || 0}</div>
                <div className="stat-label">Allocated</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon in-progress">⚠</div>
              <div className="stat-content">
                <div className="stat-number">{statistics.overview.inProgressCount}</div>
                <div className="stat-label">In Progress</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon completed">✅</div>
              <div className="stat-content">
                <div className="stat-number">{statistics.overview.completedCount}</div>
                <div className="stat-label">Completed</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon total">📊</div>
              <div className="stat-content">
                <div className="stat-number">{statistics.overview.totalSamples}</div>
                <div className="stat-label">Total</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="search-filters-section">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search samples by report name, company, or requirement..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="search-input"
          />
        </div>
        <div className="filter-controls">
          <button 
            className={`btn ${showFilters ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            🔽 Filters
            {activeFiltersCount > 0 && (
              <span className="filter-count">{activeFiltersCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="filter-panel">
          <div className="filter-row">
            <div className="filter-group">
              <label>Status</label>
              <div className="checkbox-group">
                {statusOptions.map(option => (
                  <label key={option.value} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={filters.status.includes(option.value)}
                      onChange={() => handleFilterChange('status', option.value)}
                    />
                    <span style={{ color: option.color }}>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="filter-group">
              <label>Query Source</label>
              <select
                value={filters.querySource}
                onChange={(e) => handleFilterChange('querySource', e.target.value)}
              >
                <option value="">All Sources</option>
                <option value="SQ">SQ</option>
                <option value="GII">GII</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label>Priority</label>
              <select
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
              >
                <option value="">All Priorities</option>
                {priorityOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label>Sales Person</label>
              <input
                type="text"
                placeholder="Search by sales person..."
                value={filters.salesPerson}
                onChange={(e) => handleFilterChange('salesPerson', e.target.value)}
              />
            </div>
          </div>
          
          <div className="filter-row">
            <div className="filter-group">
              <label>Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            
            <div className="filter-group">
              <label>End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>
          
          {activeFiltersCount > 0 && (
            <div className="filter-actions">
              <button onClick={clearFilters} className="btn btn-outline">
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Sample Table */}
      <div className="table-container">
        <table className="sample-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('sampleId')}>
                Sample ID {getSortIcon('sampleId')}
              </th>
              <th onClick={() => handleSort('reportName')}>
                Report Name {getSortIcon('reportName')}
              </th>
              <th onClick={() => handleSort('querySource')}>
                Query Source {getSortIcon('querySource')}
              </th>
              <th onClick={() => handleSort('salesPerson')}>
                Sales Person {getSortIcon('salesPerson')}
              </th>
              <th onClick={() => handleSort('clientCompany')}>
                Client Company {getSortIcon('clientCompany')}
              </th>
              <th onClick={() => handleSort('clientCountry')}>
                Country {getSortIcon('clientCountry')}
              </th>
              <th onClick={() => handleSort('reportIndustry')}>
                Industry {getSortIcon('reportIndustry')}
              </th>
              <th onClick={() => handleSort('status')}>
                Status {getSortIcon('status')}
              </th>
              <th onClick={() => handleSort('priority')}>
                Priority {getSortIcon('priority')}
              </th>
              {canAllocate() && (
                <>
                  <th>Allocated To</th>
                  <th>QC'ed By</th>
                </>
              )}
              <th>
                Time Since Contact Created
              </th>
              <th>
                Completion Time
              </th>
              <th>
                Files ({samples.reduce((total, sample) => total + (sample.sampleFiles?.length || 0), 0)})
              </th>
              <th>
                Requirements & Downloads
              </th>
              <th onClick={() => handleSort('requestedAt')}>
                Requested {getSortIcon('requestedAt')}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {samples.map((sample) => (
              <tr key={sample._id} className="sample-row">
                <td className="sample-id">{sample.sampleId}</td>
                <td className="report-name" title={sample.reportName}>
                  {sample.reportName}
                </td>
                <td className="query-source">
                  <span className={`source-badge ${sample.querySource.toLowerCase()}`}>
                    {sample.querySource}
                  </span>
                </td>
                <td className="sales-person">{sample.salesPerson}</td>
                <td className="client-company">{sample.clientCompany}</td>
                <td className="country">{sample.clientCountry}</td>
                <td className="industry">{sample.reportIndustry}</td>
                <td className="status">{getStatusBadge(sample.status)}</td>
                <td className="priority">{getPriorityBadge(sample.priority)}</td>
                {canAllocate() && (
                  <>
                    <td className="allocated-to">
                      {sample.allocatedToName ? (
                        <span className="allocation-badge allocated">
                          👤 {sample.allocatedToName}
                        </span>
                      ) : (
                        <span className="allocation-badge unallocated">-</span>
                      )}
                    </td>
                    <td className="qced-by">
                      {sample.qcedByName ? (
                        <span className="allocation-badge qc">
                          🔍 {sample.qcedByName}
                        </span>
                      ) : (
                        <span className="allocation-badge unallocated">-</span>
                      )}
                    </td>
                  </>
                )}
                <td className="time-since-contact-creation">
                  <span className="timing-contact" title="Time from contact creation to sample request">
                    📞 {getTimingFromContactCreation(sample)}
                  </span>
                </td>
               
                <td className="completion-time">
                  <span className={`timing-completion ${sample.completedAt ? 'completed' : 'pending'}`} 
                        title={sample.completedAt ? "Time taken from request to completion" : "Not completed yet"}>
                    {sample.completedAt ? `✅ ${getCompletionTime(sample)}` : '⏳ Pending'}
                  </span>
                </td>
                <td className="files-count">
                  {sample.sampleFiles?.length || 0} files
                </td>
                <td className="requirements-downloads">
                  <div className="requirement-info">
                    {/* Sales Requirement */}
                    {sample.salesRequirement && (
                      <div className="requirement-item">
                        <span className="req-indicator sales-req" title="Sales Requirement">💼 Sales</span>
                      </div>
                    )}
                    
                    {/* Contact Requirement */}
                    {sample.contactRequirement && (
                      <div className="requirement-item">
                        <span className="req-indicator contact-req" title="Contact Requirement">📞 Contact</span>
                      </div>
                    )}
                    
                    {/* Requirement Files (Display Only) */}
                    {sample.requirementFiles && sample.requirementFiles.length > 0 && (
                      <div className="requirement-files-section">
                        <div className="files-header">
                          <span className="req-file-count" title={`${sample.requirementFiles.length} requirement files`}>
                            📎 {sample.requirementFiles.length} files
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Sample Files Count (Display Only) */}
                    {sample.sampleFiles && sample.sampleFiles.length > 0 && (
                      <div className="sample-files-section">
                        <div className="files-header">
                          <span className="sample-file-count" title={`${sample.sampleFiles.length} sample files`}>
                            📁 {sample.sampleFiles.length} samples
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {!sample.salesRequirement && !sample.contactRequirement && (!sample.requirementFiles || sample.requirementFiles.length === 0) && (!sample.sampleFiles || sample.sampleFiles.length === 0) && (
                      <span className="no-requirements" title="No requirements or files">-</span>
                    )}
                  </div>
                </td>
                <td className="requested-date">
                  {formatDate(sample.requestedAtIST || sample.requestedAt)}
                </td>
                <td className="actions">
                  <div className="action-buttons">
                    <button
                      onClick={() => {
                        setSelectedSample(sample);
                        setShowDetailsModal(true);
                      }}
                      className="btn btn-sm btn-info"
                      title="View Details"
                    >
                      👁 View
                    </button>
                    
                    {canAllocate() && sample.status === 'requested' && (
                      <button
                        onClick={() => {
                          setSelectedSample(sample);
                          setAllocationData({ allocatedToEmail: '', qcedByEmail: '' });
                          setShowAllocationModal(true);
                        }}
                        className="btn btn-sm btn-secondary"
                        title="Allocate Sample"
                      >
                        👥 Allocate
                      </button>
                    )}
                    
                    {canUpload() && sample.status !== 'cancelled' && sample.status !== 'done' && (
                      <button
                        onClick={() => {
                          setSelectedSample(sample);
                          setUploadFiles([]);
                          setShowUploadModal(true);
                        }}
                        className="btn btn-sm btn-primary"
                        title="Upload Files"
                      >
                        📁 Upload
                      </button>
                    )}

                    {sample.sampleFiles && sample.sampleFiles.length > 0 && (
                      <button
                        onClick={() => {
                          setSelectedSample(sample);
                          setSelectedFiles([]);
                          setShowDownloadModal(true);
                        }}
                        className="btn btn-sm btn-success"
                        title="Download Files"
                      >
                        📥 Download
                      </button>
                    )}
                    
                    {canMarkAsDone() && sample.status === 'in_progress' && (
                      <button
                        onClick={() => handleUpdateStatus(sample._id, 'done')}
                        className="btn btn-sm btn-success"
                        title="Mark as Done"
                      >
                        ✅ Done
                      </button>
                    )}
                    
                    {sample.status === 'requested' && (
                      userRole === 'superadmin' || 
                      (userRole === 'sales' && sample.salesPerson.includes(currentUser?.username))
                    ) && (
                      <button
                        onClick={() => handleUpdateStatus(sample._id, 'cancelled')}
                        className="btn btn-sm btn-danger"
                        title="Cancel Request"
                      >
                        ❌ Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {samples.length === 0 && !loading && (
          <div className="empty-state">
            <p>No samples found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="pagination-container">
        <div className="pagination-info">
          Showing {(currentPage - 1) * 50 + 1} to {Math.min(currentPage * 50, totalCount)} of {totalCount.toLocaleString()} results
        </div>
        <div className="pagination">
          <button 
            onClick={() => setCurrentPage(1)} 
            disabled={currentPage === 1}
            className="btn btn-sm"
          >
            First
          </button>
          <button 
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
            disabled={currentPage === 1}
            className="btn btn-sm"
          >
            Previous
          </button>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            
            return (
              <button 
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`btn btn-sm ${currentPage === pageNum ? 'active' : ''}`}
              >
                {pageNum}
              </button>
            );
          })}
          
          <button 
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
            disabled={currentPage === totalPages}
            className="btn btn-sm"
          >
            Next
          </button>
          <button 
            onClick={() => setCurrentPage(totalPages)} 
            disabled={currentPage === totalPages}
            className="btn btn-sm"
          >
            Last
          </button>
        </div>
      </div>

      {/* Allocation Modal */}
      {showAllocationModal && selectedSample && canAllocate() && (
        <div className="modal-overlay" onClick={() => setShowAllocationModal(false)}>
          <div className="modal-content allocation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Allocate Sample - {selectedSample.sampleId}</h3>
              <button 
                onClick={() => setShowAllocationModal(false)}
                className="close-button"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="allocation-form">
                <div className="form-group">
                  <label>Allocate To *</label>
                  <select
                    value={allocationData.allocatedToEmail}
                    onChange={(e) => setAllocationData(prev => ({ ...prev, allocatedToEmail: e.target.value }))}
                    className="form-select"
                    required
                  >
                    <option value="">Select team member...</option>
                    {teamMembers.map(member => (
                      <option key={member.email} value={member.email}>
                        {member.name} ({member.email})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>QC'ed By *</label>
                  <select
                    value={allocationData.qcedByEmail}
                    onChange={(e) => setAllocationData(prev => ({ ...prev, qcedByEmail: e.target.value }))}
                    className="form-select"
                    required
                  >
                    <option value="">Select QC person...</option>
                    {teamMembers.map(member => (
                      <option key={member.email} value={member.email}>
                        {member.name} ({member.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sample-info">
                  <h4>Sample Information</h4>
                  <p><strong>Report Name:</strong> {selectedSample.reportName}</p>
                  <p><strong>Client Company:</strong> {selectedSample.clientCompany}</p>
                  <p><strong>Priority:</strong> <span style={{ color: priorityOptions.find(p => p.value === selectedSample.priority)?.color }}>{selectedSample.priority.toUpperCase()}</span></p>
                  <p><strong>Sales Person:</strong> {selectedSample.salesPerson}</p>
                </div>
              </div>
              
              <div className="modal-actions">
                <button
                  onClick={handleAllocateSample}
                  disabled={!allocationData.allocatedToEmail || !allocationData.qcedByEmail || allocationLoading}
                  className="btn btn-primary"
                >
                  {allocationLoading ? (
                    <>
                      <span className="spinner"></span> Allocating...
                    </>
                  ) : (
                    'Allocate Sample'
                  )}
                </button>
                <button
                  onClick={() => setShowAllocationModal(false)}
                  className="btn btn-outline"
                  disabled={allocationLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sample Details Modal - Updated with Allocation Info */}
      {showDetailsModal && selectedSample && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content sample-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Sample Details - {selectedSample.sampleId}</h3>
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="close-button"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="details-grid">
                <div className="detail-item">
                  <label>Report Name:</label>
                  <span>{selectedSample.reportName}</span>
                </div>
                <div className="detail-item">
                  <label>Query Source:</label>
                  <span>{selectedSample.querySource}</span>
                </div>
                <div className="detail-item">
                  <label>Industry:</label>
                  <span>{selectedSample.reportIndustry}</span>
                </div>
                <div className="detail-item">
                  <label>Sales Person:</label>
                  <span>{selectedSample.salesPerson}</span>
                </div>
                <div className="detail-item">
                  <label>Client Company:</label>
                  <span>{selectedSample.clientCompany}</span>
                </div>
                <div className="detail-item">
                  <label>Client Designation:</label>
                  <span>{selectedSample.clientDesignation}</span>
                </div>
                <div className="detail-item">
                  <label>Client Department:</label>
                  <span>{selectedSample.clientDepartment}</span>
                </div>
                <div className="detail-item">
                  <label>Client Country:</label>
                  <span>{selectedSample.clientCountry}</span>
                </div>
                
                {/* Allocation Information */}
                {(selectedSample.allocatedToName || selectedSample.qcedByName) && (
                  <>
                    <div className="detail-item">
                      <label>Allocated To:</label>
                      <span>{selectedSample.allocatedToName || '-'}</span>
                    </div>
                    <div className="detail-item">
                      <label>QC'ed By:</label>
                      <span>{selectedSample.qcedByName || '-'}</span>
                    </div>
                    {selectedSample.allocatedAtIST && (
                      <div className="detail-item">
                        <label>Allocated On:</label>
                        <span>{formatDate(selectedSample.allocatedAtIST)}</span>
                      </div>
                    )}
                  </>
                )}
                
                {/* Sales Requirement Section */}
                {selectedSample.salesRequirement && (
                  <div className="detail-item full-width">
                    <label>Sales Requirement:</label>
                    <div className="requirement-box sales-requirement">
                      <p>{selectedSample.salesRequirement}</p>
                    </div>
                  </div>
                )}
                
                {/* Contact Requirement Section */}
                {selectedSample.contactRequirement && (
                  <div className="detail-item full-width">
                    <label>Contact Requirement:</label>
                    <div className="requirement-box contact-requirement">
                      <p>{selectedSample.contactRequirement}</p>
                    </div>
                  </div>
                )}
                
                <div className="detail-item">
                  <label>Status:</label>
                  {getStatusBadge(selectedSample.status)}
                </div>
                <div className="detail-item">
                  <label>Priority:</label>
                  {getPriorityBadge(selectedSample.priority)}
                </div>
                <div className="detail-item">
                  <label>Time Since Contact Created:</label>
                  <span>{getTimingFromContactCreation(selectedSample)}</span>
                </div>
               
                <div className="detail-item">
                  <label>Completion Time:</label>
                  <span>{getCompletionTime(selectedSample)}</span>
                </div>
                <div className="detail-item">
                  <label>Requested:</label>
                  <span>{formatDate(selectedSample.requestedAtIST || selectedSample.requestedAt)}</span>
                </div>
                {selectedSample.completedAt && (
                  <div className="detail-item">
                    <label>Completed:</label>
                    <span>{formatDate(selectedSample.completedAtIST || selectedSample.completedAt)}</span>
                  </div>
                )}
              </div>
              
              {/* Requirement Files */}
              {selectedSample.requirementFiles && selectedSample.requirementFiles.length > 0 && (
                <div className="requirement-files">
                  <h4>Requirement Files ({selectedSample.requirementFiles.length})</h4>
                  <ul className="file-list">
                    {selectedSample.requirementFiles.map((file) => (
                      <li key={file._id} className="file-item">
                        <span className="file-name">{file.originalName}</span>
                        <span className="file-date">{formatDate(file.uploadedAtIST || file.uploadedAt)}</span>
                        <span className="file-uploader">
                          by {file.uploadedBy?.username || 'Unknown'}
                        </span>
                        <button
                          onClick={() => handleDownloadFile(selectedSample._id, file._id, file.originalName, true)}
                          className="btn btn-sm btn-outline"
                        >
                          Download
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Sample Files */}
              {selectedSample.sampleFiles && selectedSample.sampleFiles.length > 0 && (
                <div className="sample-files">
                  <h4>Sample Files ({selectedSample.sampleFiles.length})</h4>
                  <ul className="file-list">
                    {selectedSample.sampleFiles.map((file) => (
                      <li key={file._id} className="file-item">
                        <span className="file-name">{file.originalName}</span>
                        <span className="file-date">{formatDate(file.uploadedAtIST || file.uploadedAt)}</span>
                        <span className="file-uploader">
                          by {file.uploadedBy?.username || 'Unknown'}
                        </span>
                        <button
                          onClick={() => handleDownloadFile(selectedSample._id, file._id, file.originalName, false)}
                          className="btn btn-sm btn-outline"
                        >
                          Download
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Multiple Files Modal */}
      {showUploadModal && selectedSample && canUpload() && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content upload-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Upload Sample Files - {selectedSample.sampleId}</h3>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="close-button"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="upload-section">
                <label>Select Sample Files (up to 10 files):</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => setUploadFiles(e.target.files)}
                  className="file-input"
                />
                {uploadFiles && uploadFiles.length > 0 && (
                  <div className="selected-files">
                    <p>Selected {uploadFiles.length} file(s):</p>
                    <ul>
                      {Array.from(uploadFiles).map((file, index) => (
                        <li key={index}>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button
                  onClick={() => handleMultipleFileUpload(selectedSample._id)}
                  disabled={!uploadFiles || uploadFiles.length === 0 || uploadLoading}
                  className="btn btn-primary"
                >
                  {uploadLoading ? 'Uploading...' : `Upload ${uploadFiles?.length || 0} File(s)`}
                </button>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Download Multiple Files Modal */}
      {showDownloadModal && selectedSample && (
        <div className="modal-overlay" onClick={() => setShowDownloadModal(false)}>
          <div className="modal-content download-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Download Sample Files - {selectedSample.sampleId}</h3>
              <button 
                onClick={() => setShowDownloadModal(false)}
                className="close-button"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="download-section">
                <label>Select files to download:</label>
                <div className="file-selection">
                  {selectedSample.sampleFiles && selectedSample.sampleFiles.map((file) => (
                    <label key={file._id} className="file-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(file._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFiles(prev => [...prev, file._id]);
                          } else {
                            setSelectedFiles(prev => prev.filter(id => id !== file._id));
                          }
                        }}
                      />
                      <span className="file-info">
                        <span className="file-name">{file.originalName}</span>
                        <span className="file-meta">
                          {formatDate(file.uploadedAtIST || file.uploadedAt)} • by {file.uploadedBy?.username || 'Unknown'}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="modal-actions">
                <button
                  onClick={() => {
                    const allFileIds = selectedSample.sampleFiles.map(f => f._id);
                    setSelectedFiles(allFileIds);
                  }}
                  className="btn btn-outline btn-sm"
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelectedFiles([])}
                  className="btn btn-outline btn-sm"
                >
                  Clear Selection
                </button>
                <button
                  onClick={() => handleDownloadMultipleFiles(selectedSample._id, selectedFiles)}
                  disabled={selectedFiles.length === 0}
                  className="btn btn-primary"
                >
                  Download {selectedFiles.length} File(s)
                </button>
                <button
                  onClick={() => setShowDownloadModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SampleTable;