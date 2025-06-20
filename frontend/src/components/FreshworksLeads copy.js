import React, { useState, useEffect, useRef } from 'react';
import '../styles/freshworksleads.css';

const FreshworksLeads = () => {
  const [contacts, setContacts] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalContacts: 0,
    avgTouchpoints: '0.0',
    avgEmails: '0.0',
    avgCalls: '0.0',              
    avgConnectedCalls: '0.0',
    avgSampleSentHours: '0.0',
    clientEmailsReceived: 0,
    avgCallDuration: '0',
    responseRate: '0.0',
    samplesSentCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [filters, setFilters] = useState({
    status: '',
    owner: '',
    territory: '',
    leadLevel: '',
    contactCategory: '',
    customTags: '',
    isActive: '',
    dateFilter: '', // today, yesterday, week, month, custom
    startDate: '',
    endDate: ''
  });
  const [filterOptions, setFilterOptions] = useState({
    statuses: [],
    owners: [],
    territories: [],
    leadLevels: [],
    contactCategories: [],
    customTags: [],
    activeStatus: []
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showColumnCustomizer, setShowColumnCustomizer] = useState(false);
  
  // Column configuration - UPDATED with CRM analytics columns
  const [availableColumns] = useState({
    created_at: { label: 'Date', width: 120, visible: true },
    market_name: { label: 'Market Name', width: 150, visible: true },
    company: { label: 'Company Name', width: 180, visible: true },
    display_name: { label: 'Name', width: 150, visible: true },
    job_title: { label: 'Designation', width: 150, visible: true },
    status_name: { label: 'Status', width: 120, visible: true },
    lead_level: { label: 'Lead Category', width: 130, visible: true },
    last_contacted_time: { label: 'Last Contact', width: 160, visible: true },
    owner_name: { label: 'Owner', width: 120, visible: true },
    email: { label: 'Email', width: 200, visible: false },
    country: { label: 'Country', width: 120, visible: false },
    territory: { label: 'Territory', width: 120, visible: false },
    last_contacted_mode: { label: 'Contact Mode', width: 130, visible: false },
    contact_category: { label: 'Contact Category', width: 140, visible: false },
    custom_tags: { label: 'Custom Tags', width: 140, visible: false },
    is_active: { label: 'Active Status', width: 120, visible: false },
    sample_sent_timing: { label: 'Sample Sent (Hours)', width: 150, visible: false },
    
    last_email_received: { label: 'Last Email Received', width: 160, visible: false },
    first_email_with_attachment: { label: 'First Email w/ Attachment', width: 180, visible: false },
    total_touchpoints: { label: 'Total Touchpoints', width: 140, visible: false },
    outgoing_emails: { label: 'Outgoing Emails', width: 130, visible: false },
    incoming_emails: { label: 'Incoming Emails', width: 130, visible: false },
    outgoing_calls: { label: 'Outgoing Calls', width: 130, visible: false },
    connected_calls: { label: 'Connected Calls', width: 130, visible: false },
    not_connected_calls: { label: 'Not Connected Calls', width: 150, visible: false },
    call_duration_total: { label: 'Total Call Duration', width: 150, visible: false }
  });
  
  const [columnConfig, setColumnConfig] = useState(availableColumns);
  const [columnOrder, setColumnOrder] = useState(Object.keys(availableColumns));
  const [draggedColumn, setDraggedColumn] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [searchColumns, setSearchColumns] = useState('');
  
  // Temporary states for customizer
  const [tempColumnConfig, setTempColumnConfig] = useState(availableColumns);
  const [tempColumnOrder, setTempColumnOrder] = useState(Object.keys(availableColumns));

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Date filter options
  const dateFilterOptions = [
    { value: '', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'week', label: 'Last 7 Days' },
    { value: 'month', label: 'Last 30 Days' },
    { value: 'custom', label: 'Custom Range' }
  ];

  // Helper function to get date ranges
  const getDateRange = (filterType) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filterType) {
      case 'today':
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        return {
          startDate: today.toISOString(),
          endDate: todayEnd.toISOString()
        };
      
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setHours(23, 59, 59, 999);
        return {
          startDate: yesterday.toISOString(),
          endDate: yesterdayEnd.toISOString()
        };
      
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const todayEndWeek = new Date(today);
        todayEndWeek.setHours(23, 59, 59, 999);
        return {
          startDate: weekAgo.toISOString(),
          endDate: todayEndWeek.toISOString()
        };
      
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);
        const todayEndMonth = new Date(today);
        todayEndMonth.setHours(23, 59, 59, 999);
        return {
          startDate: monthAgo.toISOString(),
          endDate: todayEndMonth.toISOString()
        };
      
      default:
        return { startDate: '', endDate: '' };
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [currentPage, searchTerm, sortConfig, filters]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Load saved column configuration
  useEffect(() => {
    const savedConfig = localStorage.getItem('freshworks-column-config');
    const savedOrder = localStorage.getItem('freshworks-column-order');
    
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setColumnConfig(parsed);
        setTempColumnConfig(parsed);
      } catch (e) {
        console.error('Failed to parse saved column config:', e);
      }
    }
    
    if (savedOrder) {
      try {
        const parsedOrder = JSON.parse(savedOrder);
        setColumnOrder(parsedOrder);
        setTempColumnOrder(parsedOrder);
      } catch (e) {
        console.error('Failed to parse saved column order:', e);
      }
    }
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      
      // Get date range based on filter
      let dateRange = { startDate: '', endDate: '' };
      if (filters.dateFilter && filters.dateFilter !== 'custom') {
        dateRange = getDateRange(filters.dateFilter);
      } else if (filters.dateFilter === 'custom') {
        dateRange = {
          startDate: filters.startDate,
          endDate: filters.endDate
        };
      }

      const params = new URLSearchParams({
        page: currentPage,
        limit: 100,
        search: searchTerm,
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction,
        status: filters.status,
        owner: filters.owner,
        territory: filters.territory,
        leadLevel: filters.leadLevel,
        contactCategory: filters.contactCategory,
        customTags: filters.customTags,
        isActive: filters.isActive,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });

      const response = await fetch(`${API_BASE_URL}/contacts/table?${params}`);
      const data = await response.json();

      if (data.success) {
        setContacts(data.data);
        setAnalytics(data.analytics || {
          totalContacts: 0,
          avgTouchpoints: '0.0',
          avgEmails: '0.0',
          avgCalls: '0.0',              
          avgConnectedCalls: '0.0',
          avgSampleSentHours: '0.0',
          clientEmailsReceived: 0,
          avgCallDuration: '0',
          responseRate: '0.0',
          samplesSentCount: 0
        });
        setTotalPages(data.pagination.totalPages);
        setTotalCount(data.pagination.totalCount);
      } else {
        setError(data.message || 'Error fetching contacts');
      }
    } catch (err) {
      setError('Failed to fetch contacts');
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/contacts/filters`);
      const data = await response.json();
      if (data.success) {
        setFilterOptions({
          statuses: data.data.statuses || [],
          owners: data.data.owners || [],
          territories: data.data.territories || [],
          leadLevels: data.data.leadLevels || [],
          contactCategories: data.data.contactCategories || [],
          customTags: data.data.customTags || [],
          activeStatus: data.data.activeStatus || []
        });
      }
    } catch (err) {
      console.error('Failed to fetch filter options:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchContacts();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [filterName]: value };
      
      // Handle date filter changes
      if (filterName === 'dateFilter') {
        if (value === 'custom') {
          setShowCustomDatePicker(true);
        } else {
          setShowCustomDatePicker(false);
          // Clear custom date values when switching to preset filters
          newFilters.startDate = '';
          newFilters.endDate = '';
        }
      }
      
      return newFilters;
    });
    setCurrentPage(1);
  };

  const handleCustomDateChange = (dateType, value) => {
    setFilters(prev => ({
      ...prev,
      [dateType]: value
    }));
  };

  const clearFilters = () => {
    setFilters({ 
      status: '', 
      owner: '', 
      territory: '', 
      leadLevel: '',
      contactCategory: '',
      customTags: '',
      isActive: '',
      dateFilter: '',
      startDate: '',
      endDate: ''
    });
    setSearchTerm('');
    setCurrentPage(1);
    setShowCustomDatePicker(false);
  };

  // Get the display text for active date filter
  const getDateFilterDisplayText = () => {
    if (!filters.dateFilter) return '';
    
    const option = dateFilterOptions.find(opt => opt.value === filters.dateFilter);
    if (filters.dateFilter === 'custom' && (filters.startDate || filters.endDate)) {
      const start = filters.startDate ? new Date(filters.startDate).toLocaleDateString() : '';
      const end = filters.endDate ? new Date(filters.endDate).toLocaleDateString() : '';
      return `Custom: ${start} - ${end}`;
    }
    return option ? option.label : '';
  };

  // Column customizer functions (keeping existing functionality)
  const toggleColumnVisibility = (columnKey) => {
    setTempColumnConfig(prev => ({
      ...prev,
      [columnKey]: {
        ...prev[columnKey],
        visible: !prev[columnKey].visible
      }
    }));
  };

  const resetColumns = () => {
    const defaultOrder = Object.keys(availableColumns);
    setTempColumnConfig(availableColumns);
    setTempColumnOrder(defaultOrder);
  };

  const applyColumnChanges = () => {
    setColumnConfig(tempColumnConfig);
    setColumnOrder(tempColumnOrder);
    
    localStorage.setItem('freshworks-column-config', JSON.stringify(tempColumnConfig));
    localStorage.setItem('freshworks-column-order', JSON.stringify(tempColumnOrder));
    
    setShowColumnCustomizer(false);
  };

  const cancelColumnChanges = () => {
    setTempColumnConfig(columnConfig);
    setTempColumnOrder(columnOrder);
    setShowColumnCustomizer(false);
  };

  // Drag and drop functionality (keeping existing)
  const handleDragStart = (e, columnKey) => {
    setDraggedColumn(columnKey);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragOver = (e, targetColumnKey) => {
    e.preventDefault();
    setDragOverColumn(targetColumnKey);
  };

  const handleDragLeave = (e) => {
    setDragOverColumn(null);
  };

  const handleDrop = (e, targetColumnKey) => {
    e.preventDefault();
    
    if (draggedColumn && draggedColumn !== targetColumnKey) {
      const newOrder = [...tempColumnOrder];
      const draggedIndex = newOrder.indexOf(draggedColumn);
      const targetIndex = newOrder.indexOf(targetColumnKey);
      
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedColumn);
      
      setTempColumnOrder(newOrder);
    }
    
    setDraggedColumn(null);
    setDragOverColumn(null);
    e.currentTarget.style.opacity = '1';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  // Column resizing (keeping existing)
  const handleMouseDown = (e, columnKey) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startWidth = columnConfig[columnKey].width;
    
    const handleMouseMove = (moveEvent) => {
      const diff = moveEvent.clientX - startX;
      const newWidth = Math.max(80, startWidth + diff);
      
      setColumnConfig(prev => ({
        ...prev,
        [columnKey]: {
          ...prev[columnKey],
          width: newWidth
        }
      }));
    };

    const handleMouseUp = () => {
      localStorage.setItem('freshworks-column-config', JSON.stringify(columnConfig));
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (date) => {
    if (!date) return '-';
    const dateStr = new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const timeStr = new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    return `${dateStr} ${timeStr}`;
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '0m 0s';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getSortIcon = (column) => {
    if (sortConfig.key !== column) return '↕';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const getStatusBadgeClass = (status) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('active') || statusLower.includes('open')) return 'bg-success';
    if (statusLower.includes('qualified')) return 'bg-primary';
    if (statusLower.includes('unqualified') || statusLower.includes('closed')) return 'bg-danger';
    if (statusLower.includes('contacted')) return 'bg-info';
    return 'bg-secondary';
  };

  const getLeadLevelBadgeClass = (level) => {
    const levelLower = level?.toLowerCase() || '';
    if (levelLower.includes('hot')) return 'bg-danger';
    if (levelLower.includes('warm')) return 'bg-warning';
    if (levelLower.includes('cold')) return 'bg-info';
    return 'bg-secondary';
  };

  const getCategoryBadgeClass = (category) => {
    const categoryLower = category?.toLowerCase() || '';
    if (categoryLower === 'corporate') return 'bg-primary';
    if (categoryLower === 'generic') return 'bg-success';
    if (categoryLower === 'test') return 'bg-warning';
    if (categoryLower === 'invalid') return 'bg-danger';
    if (categoryLower === 'student') return 'bg-info';
    if (categoryLower === 'edu') return 'bg-info';
    if (categoryLower === 'duplicate') return 'bg-dark';
    return 'bg-secondary';
  };

  const getCustomTagsBadgeClass = (tag) => {
    const tagLower = tag?.toLowerCase() || '';
    if (tagLower.includes('sample requested')) return 'bg-info';
    if (tagLower.includes('inbound')) return 'bg-success';
    if (tagLower.includes('outbound')) return 'bg-primary';
    if (tagLower.includes('hot')) return 'bg-danger';
    if (tagLower.includes('cold')) return 'bg-secondary';
    if (tagLower.includes('follow')) return 'bg-warning';
    if (tagLower.includes('demo')) return 'bg-purple';
    if (tagLower.includes('quote')) return 'bg-dark';
    return 'bg-light text-dark';
  };

  const renderCellContent = (columnKey, contact) => {
    const getValue = () => {
      switch (columnKey) {
        case 'created_at':
          return formatDate(contact.created_at);
        case 'last_contacted_time':
          return formatDateTime(contact.last_contacted_time);
        case 'territory':
          return contact.territory || '-';
        case 'contact_category':
          return contact.contact_category || '-';
        case 'custom_tags':
          return contact.custom_tags || '-';
        case 'is_active':
          return contact.is_active || 'No';
        case 'sample_sent_timing':
          // Calculate sample sent timing for individual contact
          if (contact.created_at && contact.first_email_with_attachment) {
            const createdDate = new Date(contact.created_at);
            const sampleDate = new Date(contact.first_email_with_attachment);
            const hoursDelay = (sampleDate - createdDate) / (1000 * 60 * 60);
            return hoursDelay > 0 ? `${hoursDelay.toFixed(1)}h` : '-';
          }
          return '-';
        
        // NEW CRM Analytics fields
        case 'last_email_received':
          return formatDateTime(contact.last_email_received);
        case 'first_email_with_attachment':
          return formatDateTime(contact.first_email_with_attachment);
        case 'total_touchpoints':
          return contact.total_touchpoints || 0;
        case 'outgoing_emails':
          return contact.outgoing_emails || 0;
        case 'incoming_emails':
          return contact.incoming_emails || 0;
        case 'outgoing_calls':
          return contact.outgoing_calls || 0;
        case 'connected_calls':
          return contact.connected_calls || 0;
        case 'not_connected_calls':
          return contact.not_connected_calls || 0;
        case 'call_duration_total':
          return contact.call_duration_formatted || formatDuration(contact.call_duration_total || 0);
        
        default:
          return contact[columnKey] || '-';
      }
    };

    const value = getValue();
    const displayValue = value || '-';

    switch (columnKey) {
      case 'created_at':
      case 'last_contacted_time':
      case 'last_email_received':
      case 'first_email_with_attachment':
        return (
          <span className="date-time-cell" title={displayValue}>
            {displayValue}
          </span>
        );
      
      case 'market_name':
      case 'company':
        return (
          <span className="report-name" title={displayValue}>
            {displayValue}
          </span>
        );
      
      case 'display_name':
        return (
          <strong title={displayValue}>
            {displayValue}
          </strong>
        );
      
      case 'status_name':
        return (
          <span 
            className={`badge type-badge ${getStatusBadgeClass(contact.status_name)}`}
            title={displayValue}
          >
            {displayValue}
          </span>
        );
      
      case 'lead_level':
        return (
          <span 
            className={`badge type-badge ${getLeadLevelBadgeClass(contact.lead_level)}`}
            title={displayValue}
          >
            {displayValue}
          </span>
        );

      case 'contact_category':
        return (
          <span 
            className={`badge category-badge ${getCategoryBadgeClass(contact.contact_category)}`}
            title={displayValue}
          >
            {displayValue}
          </span>
        );

      case 'custom_tags':
        return (
          <span 
            className={`badge custom-tags-badge ${getCustomTagsBadgeClass(contact.custom_tags)}`}
            title={displayValue}
          >
            {displayValue}
          </span>
        );

      case 'is_active':
        return (
          <span 
            className={`badge active-status-badge ${contact.is_active === 'Yes' ? 'bg-success' : 'bg-secondary'}`}
            title={contact.is_active === 'Yes' ? 'Contact has responded via email or phone' : 'Contact has not responded yet'}
          >
            {contact.is_active === 'Yes' ? '✓ Active' : '✗ Inactive'}
          </span>
        );

      case 'sample_sent_timing':
        return (
          <span 
            className={`sample-timing-cell ${displayValue === '-' ? 'text-muted' : 'text-info fw-bold'}`}
            title={displayValue === '-' ? 'No sample sent yet' : `Sample sent ${displayValue} after contact creation`}
          >
            {displayValue}
          </span>
        );
      
      // CRM Analytics numeric fields
      case 'total_touchpoints':
      case 'outgoing_emails':
      case 'incoming_emails':
      case 'outgoing_calls':
      case 'connected_calls':
      case 'not_connected_calls':
        return (
          <span className="analytics-number" title={displayValue}>
            <strong>{displayValue}</strong>
          </span>
        );
      
      case 'call_duration_total':
        return (
          <span className="duration-cell" title={`Total: ${displayValue}`}>
            {displayValue}
          </span>
        );
      
      default:
        return (
          <span title={displayValue}>
            {displayValue}
          </span>
        );
    }
  };

  const visibleColumns = columnOrder
    .filter(key => columnConfig[key]?.visible)
    .map(key => [key, columnConfig[key]]);
    
  const filteredColumns = tempColumnOrder
    .filter(key => tempColumnConfig[key]?.label?.toLowerCase().includes(searchColumns.toLowerCase()))
    .map(key => [key, tempColumnConfig[key]]);

  if (loading && contacts.length === 0) {
    return (
      <div className="freshworks-leads-container">
        <div className="dashboard-card">
          <div className="dashboard-header">
            <h1 className="dashboard-title">Leads Management</h1>
          </div>
          <div className="empty-state">
            <div className="empty-icon">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
            <h5 className="text-muted">Loading contacts...</h5>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="freshworks-leads-container">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error!</h4>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const activeFiltersCount = Object.values(filters).filter((value, index) => {
    // Don't count startDate and endDate separately if dateFilter is set
    const keys = Object.keys(filters);
    const key = keys[index];
    if ((key === 'startDate' || key === 'endDate') && filters.dateFilter) {
      return false;
    }
    return Boolean(value);
  }).length;

  return (
    <div className="freshworks-leads-container">
      <div className="dashboard-card">
        {/* Header */}
        <div className="dashboard-header">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="dashboard-title">Leads Management</h1>
              <p className="text-muted mb-0">
                {loading ? 'Loading...' : 
                  `${totalCount.toLocaleString()} total filtered • Showing ${contacts.length} on page ${currentPage} of ${totalPages}`
                }
              </p>
            </div>
            <div className="d-flex gap-2">
              <button 
                onClick={() => {
                  setTempColumnConfig(columnConfig);
                  setTempColumnOrder(columnOrder);
                  setShowColumnCustomizer(true);
                }}
                className="btn btn-outline-secondary"
              >
                ⚙️ Customize Table
              </button>
              <button 
                onClick={handleRefresh}
                className="btn btn-outline-primary refresh-btn"
                disabled={refreshing}
              >
                <span className={`refresh-icon ${refreshing ? 'rotating' : ''}`}>⟳</span>
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="dashboard-header border-bottom-0 pb-0">
          <div className="row g-3">
            <div className="col-md-6">
              <div className="input-group search-filter-container">
                <span className="input-group-text search-icon-container">
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search by name, email, phone, or company..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
            <div className="col-md-6">
              <div className="d-flex gap-2 justify-content-end">
                <button 
                  className="btn btn-outline-secondary"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  🔽 Filters
                  {activeFiltersCount > 0 && (
                    <span className="badge bg-primary ms-2">{activeFiltersCount}</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Filter Dropdowns */}
          {showFilters && (
            <div className="mt-3 p-3 bg-light rounded">
              <div className="row g-3">
                {/* Date Filter */}
                <div className="col-md-3">
                  <label className="form-label fw-bold text-muted small">DATE RANGE</label>
                  <select
                    className="form-select"
                    value={filters.dateFilter}
                    onChange={(e) => handleFilterChange('dateFilter', e.target.value)}
                  >
                    {dateFilterOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {filters.dateFilter && (
                    <small className="text-muted d-block mt-1">
                      {getDateFilterDisplayText()}
                    </small>
                  )}
                </div>

                <div className="col-md-3">
                  <label className="form-label fw-bold text-muted small">STATUS</label>
                  <select
                    className="form-select"
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <option value="">All Status</option>
                    {filterOptions.statuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label fw-bold text-muted small">OWNER</label>
                  <select
                    className="form-select"
                    value={filters.owner}
                    onChange={(e) => handleFilterChange('owner', e.target.value)}
                  >
                    <option value="">All Owners</option>
                    {filterOptions.owners.map(owner => (
                      <option key={owner} value={owner}>{owner}</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label fw-bold text-muted small">TERRITORY</label>
                  <select
                    className="form-select"
                    value={filters.territory}
                    onChange={(e) => handleFilterChange('territory', e.target.value)}
                  >
                    <option value="">All Territories</option>
                    {filterOptions.territories.map(territory => (
                      <option key={territory} value={territory}>{territory}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom Date Range Picker */}
              {showCustomDatePicker && (
                <div className="row g-3 mt-2 p-3 border rounded bg-white">
                  <div className="col-md-6">
                    <label className="form-label fw-bold text-muted small">START DATE</label>
                    <input
                      type="date"
                      className="form-control"
                      value={filters.startDate ? filters.startDate.split('T')[0] : ''}
                      onChange={(e) => {
                        const date = e.target.value ? `${e.target.value}T00:00:00.000Z` : '';
                        handleCustomDateChange('startDate', date);
                      }}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold text-muted small">END DATE</label>
                    <input
                      type="date"
                      className="form-control"
                      value={filters.endDate ? filters.endDate.split('T')[0] : ''}
                      onChange={(e) => {
                        const date = e.target.value ? `${e.target.value}T23:59:59.999Z` : '';
                        handleCustomDateChange('endDate', date);
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Lead Level and Contact Category Filters */}
              <div className="row g-3 mt-2">
                <div className="col-md-3">
                  <label className="form-label fw-bold text-muted small">LEAD LEVEL</label>
                  <select
                    className="form-select"
                    value={filters.leadLevel}
                    onChange={(e) => handleFilterChange('leadLevel', e.target.value)}
                  >
                    <option value="">All Lead Levels</option>
                    {filterOptions.leadLevels.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label fw-bold text-muted small">CONTACT CATEGORY</label>
                  <select
                    className="form-select"
                    value={filters.contactCategory}
                    onChange={(e) => handleFilterChange('contactCategory', e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {filterOptions.contactCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label fw-bold text-muted small">CUSTOM TAGS</label>
                  <select
                    className="form-select"
                    value={filters.customTags}
                    onChange={(e) => handleFilterChange('customTags', e.target.value)}
                  >
                    <option value="">All Tags</option>
                    {filterOptions.customTags.map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label fw-bold text-muted small">ACTIVE STATUS</label>
                  <select
                    className="form-select"
                    value={filters.isActive}
                    onChange={(e) => handleFilterChange('isActive', e.target.value)}
                  >
                    <option value="">All Contacts</option>
                    <option value="yes">Active (Responded)</option>
                    <option value="no">Not Active (No Response)</option>
                  </select>
                </div>
              </div>

              {activeFiltersCount > 0 && (
                <div className="mt-3">
                  <button 
                    onClick={clearFilters}
                    className="btn btn-sm btn-outline-primary"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Analytics Section - 4x4 Layout */}
        <div className={`analytics-section bg-light border rounded p-3 mb-3 ${loading ? 'loading' : ''}`}>
          <div className="row g-3">
            <div className="col-md-12 mb-2">
              <h6 className="fw-bold text-primary mb-3">
                📊 Analytics for All Filtered Results ({analytics.totalContacts.toLocaleString()} contacts)
                {loading && <span className="spinner-border spinner-border-sm ms-2" role="status"></span>}
              </h6>
            </div>
            
            {/* First Row - 4 Core Metrics */}
            <div className="col-lg-3 col-md-6 col-sm-6">
              <div className="analytics-card bg-white p-3 rounded border" title="Total number of contacts matching current filters">
                <div className="d-flex align-items-center">
                  <div className="analytics-icon bg-primary text-white rounded-circle p-2 me-3">
                    👥
                  </div>
                  <div>
                    <div className="analytics-number text-primary fw-bold fs-4">
                      {loading ? '...' : (analytics.totalContacts || 0).toLocaleString()}
                    </div>
                    <div className="analytics-label text-muted small">Total Contacts</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-3 col-md-6 col-sm-6">
              <div className="analytics-card bg-white p-3 rounded border" title="Average number of touchpoints per contact">
                <div className="d-flex align-items-center">
                  <div className="analytics-icon bg-info text-white rounded-circle p-2 me-3">
                    🎯
                  </div>
                  <div>
                    <div className="analytics-number text-info fw-bold fs-4">
                      {loading ? '...' : (analytics.avgTouchpoints || '0.0')}
                    </div>
                    <div className="analytics-label text-muted small">Avg Touchpoints</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-3 col-md-6 col-sm-6">
              <div className="analytics-card bg-white p-3 rounded border" title="Average emails sent per contact">
                <div className="d-flex align-items-center">
                  <div className="analytics-icon bg-success text-white rounded-circle p-2 me-3">
                    📧
                  </div>
                  <div>
                    <div className="analytics-number text-success fw-bold fs-4">
                      {loading ? '...' : (analytics.avgEmails || '0.0')}
                    </div>
                    <div className="analytics-label text-muted small">Avg Emails Sent</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-3 col-md-6 col-sm-6">
              <div className="analytics-card bg-white p-3 rounded border" title="Average calls made per contact">
                <div className="d-flex align-items-center">
                  <div className="analytics-icon bg-purple text-white rounded-circle p-2 me-3" style={{background: 'linear-gradient(135deg, #6f42c1, #5a359a)'}}>
                    📱
                  </div>
                  <div>
                    <div className="analytics-number fw-bold fs-4" style={{color: '#6f42c1'}}>
                      {loading ? '...' : (analytics.avgCalls || '0.0')}
                    </div>
                    <div className="analytics-label text-muted small">Avg Calls Made</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Second Row - 4 Additional Metrics */}
            <div className="col-lg-3 col-md-6 col-sm-6">
              <div className="analytics-card bg-white p-3 rounded border" title="Average connected calls per contact with call activity">
                <div className="d-flex align-items-center">
                  <div className="analytics-icon bg-warning text-white rounded-circle p-2 me-3">
                    📞
                  </div>
                  <div>
                    <div className="analytics-number text-warning fw-bold fs-4">
                      {loading ? '...' : (analytics.avgConnectedCalls || '0.0')}
                    </div>
                    <div className="analytics-label text-muted small">Avg Connected Calls</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-3 col-md-6 col-sm-6">
              <div className="analytics-card bg-white p-3 rounded border" title={`Average hours between contact creation and sample report sent (${analytics.samplesSentCount || 0} samples sent)`}>
                <div className="d-flex align-items-center">
                  <div className="analytics-icon bg-danger text-white rounded-circle p-2 me-3">
                    📊
                  </div>
                  <div>
                    <div className="analytics-number text-danger fw-bold fs-4">
                      {loading ? '...' : `${analytics.avgSampleSentHours || '0.0'}h`}
                    </div>
                    <div className="analytics-label text-muted small">Avg Sample Sent Timing</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-3 col-md-6 col-sm-6">
              <div className="analytics-card bg-white p-3 rounded border" title="Total client responses received">
                <div className="d-flex align-items-center">
                  <div className="analytics-icon bg-secondary text-white rounded-circle p-2 me-3">
                    📨
                  </div>
                  <div>
                    <div className="analytics-number text-secondary fw-bold fs-4">
                      {loading ? '...' : (analytics.clientEmailsReceived || 0).toLocaleString()}
                    </div>
                    <div className="analytics-label text-muted small">Client Emails Received</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-3 col-md-6 col-sm-6">
              <div className="analytics-card bg-white p-3 rounded border" title="Average call duration in seconds">
                <div className="d-flex align-items-center">
                  <div className="analytics-icon bg-dark text-white rounded-circle p-2 me-3">
                    ⏱️
                  </div>
                  <div>
                    <div className="analytics-number text-dark fw-bold fs-4">
                      {loading ? '...' : `${analytics.avgCallDuration || '0'}s`}
                    </div>
                    <div className="analytics-label text-muted small">Avg Call Duration</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="table leads-table" style={{ tableLayout: 'fixed', width: '100%' }}>
            <colgroup>
              {visibleColumns.map(([columnKey, config]) => (
                <col key={columnKey} style={{ width: `${config.width}px` }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {visibleColumns.map(([columnKey, config]) => (
                  <th 
                    key={columnKey}
                    className="sortable-header resizable-header"
                    style={{ width: `${config.width}px`, minWidth: '80px' }}
                  >
                    <div 
                      className="header-content"
                      onClick={() => handleSort(columnKey)}
                      title={config.label}
                    >
                      <span className="header-text">{config.label}</span>
                      <span className="sort-icon">{getSortIcon(columnKey)}</span>
                    </div>
                    <div 
                      className="resize-handle"
                      onMouseDown={(e) => handleMouseDown(e, columnKey)}
                      onClick={(e) => e.stopPropagation()}
                      title="Drag to resize column"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id} className="lead-row">
                  {visibleColumns.map(([columnKey]) => (
                    <td 
                      key={columnKey}
                      className="table-cell"
                      style={{ width: `${columnConfig[columnKey].width}px`, minWidth: '80px' }}
                    >
                      {renderCellContent(columnKey, contact)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="dashboard-footer">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <span className="text-muted">
                Showing {(currentPage - 1) * 100 + 1} to {Math.min(currentPage * 100, totalCount)} of {totalCount.toLocaleString()} results
              </span>
            </div>
            <div>
              <nav aria-label="Pagination">
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button 
                      className="page-link"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      First
                    </button>
                  </li>
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button 
                      className="page-link"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                  </li>
                  
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
                      <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                        <button 
                          className="page-link"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      </li>
                    );
                  })}
                  
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button 
                      className="page-link"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </li>
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button 
                      className="page-link"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      Last
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Column Customizer Modal */}
      {showColumnCustomizer && (
        <div className="modal-overlay" onClick={cancelColumnChanges}>
          <div className="customize-table-modal" onClick={(e) => e.stopPropagation()}>
            <div className="customize-header">
              <h4 className="customize-title">Customize table</h4>
              <button 
                className="close-button" 
                onClick={cancelColumnChanges}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            
            <div className="customize-body">
              <div className="search-container">
                <div className="search-input-container">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search fields"
                    value={searchColumns}
                    onChange={(e) => setSearchColumns(e.target.value)}
                  />
                </div>
              </div>

              <div className="columns-container">
                <div className="visible-columns-section">
                  {filteredColumns
                    .filter(([_, config]) => config.visible)
                    .map(([columnKey, config]) => (
                    <div 
                      key={columnKey} 
                      className={`column-row ${draggedColumn === columnKey ? 'dragging' : ''} ${dragOverColumn === columnKey ? 'drag-over' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, columnKey)}
                      onDragOver={(e) => handleDragOver(e, columnKey)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, columnKey)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="column-content">
                        <span className="drag-icon">⋮⋮</span>
                        <input
                          type="checkbox"
                          id={`visible-${columnKey}`}
                          checked={config.visible}
                          onChange={() => toggleColumnVisibility(columnKey)}
                          className="column-checkbox"
                        />
                        <label htmlFor={`visible-${columnKey}`} className="column-name">
                          {config.label}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="section-divider">
                  <span className="divider-text">Fields not shown in table</span>
                </div>

                <div className="hidden-columns-section">
                  {filteredColumns
                    .filter(([_, config]) => !config.visible)
                    .map(([columnKey, config]) => (
                    <div key={columnKey} className="column-row hidden-row">
                      <div className="column-content">
                        <input
                          type="checkbox"
                          id={`hidden-${columnKey}`}
                          checked={config.visible}
                          onChange={() => toggleColumnVisibility(columnKey)}
                          className="column-checkbox"
                        />
                        <label htmlFor={`hidden-${columnKey}`} className="column-name">
                          {config.label}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="customize-footer">
              <button 
                className="reset-button"
                onClick={resetColumns}
              >
                Reset to default
              </button>
              <div className="action-buttons">
                <button 
                  className="cancel-button"
                  onClick={cancelColumnChanges}
                >
                  Cancel
                </button>
                <button 
                  className="apply-button"
                  onClick={applyColumnChanges}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FreshworksLeads;