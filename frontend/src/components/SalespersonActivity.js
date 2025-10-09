import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const SalespersonActivity = ({ token }) => {
  const [activities, setActivities] = useState([]);
  const [summary, setSummary] = useState({
    totalUsers: 0,
    totalActivities: 0,
    totalEmails: 0,
    totalCalls: 0,
    totalConnectedCalls: 0,
    notConnectedCalls: 0,
    uniqueLeadsContacted: 0,
    avgCallDuration: "0",
    connectionRate: "0",
    totalOpenedEmails: 0,
    totalBouncedEmails: 0,
    openRate: "0"
  });
  const [userSummaries, setUserSummaries] = useState([]);
  const [dailyActivities, setDailyActivities] = useState([]);
  const [openedEmails, setOpenedEmails] = useState([]);
  const [bouncedEmails, setBouncedEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('activities');
  
  const [filters, setFilters] = useState({
    owner: [],
    country: [],
    territory: [],
    leadLevel: [],
    contactCategory: [],
    activityType: 'all',
    dateFilter: 'month',
    startDate: '',
    endDate: ''
  });

  const [filterOptions, setFilterOptions] = useState({
    owners: [],
    countries: [],
    territories: [],
    leadLevels: [],
    contactCategories: []
  });

  const [showConversationsModal, setShowConversationsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userConversations, setUserConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationsError, setConversationsError] = useState(null);
  const [expandedThreads, setExpandedThreads] = useState(new Set());
  const [expandedEmails, setExpandedEmails] = useState(new Set());
  const [conversationFilter, setConversationFilter] = useState('all');

  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const filtersInitialized = useRef(false);
  const API_BASE_URL = `${process.env.REACT_APP_API_BASE_URL || 'https://www.theskyquestt.org'}/api`;

  const dateFilterOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'week', label: 'Last 7 Days' },
    { value: 'month', label: 'Last 30 Days' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const activityTypeOptions = [
    { value: 'all', label: 'All Activities' },
    { value: 'email', label: 'Emails Only' },
    { value: 'call', label: 'Calls Only' }
  ];

  const getAuthHeaders = () => {
    if (!token) {
      return { 'Content-Type': 'application/json' };
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const getDateRange = (filterType) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filterType) {
      case 'today':
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        return {
          startDate: todayStart.toISOString(),
          endDate: todayEnd.toISOString()
        };
      
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setHours(23, 59, 59, 999);
        return {
          startDate: yesterday.toISOString(),
          endDate: yesterdayEnd.toISOString()
        };
      
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);
        const todayEndWeek = new Date(today);
        todayEndWeek.setHours(23, 59, 59, 999);
        return {
          startDate: weekAgo.toISOString(),
          endDate: todayEndWeek.toISOString()
        };
      
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);
        monthAgo.setHours(0, 0, 0, 0);
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
    if (!filtersInitialized.current) {
      const defaultDateRange = getDateRange(filters.dateFilter); 
      setFilters(prev => ({
        ...prev,
        startDate: defaultDateRange.startDate,
        endDate: defaultDateRange.endDate
      }));
      filtersInitialized.current = true;
    }
  }, [filters.dateFilter]);

  useEffect(() => {
    if (token && filtersInitialized.current && filters.startDate) {
      fetchActivities();
    }
  }, [currentPage, searchTerm, filters, token]);

  useEffect(() => {
    if (token) {
      fetchFilterOptions();
    }
  }, [token]);

  const fetchActivities = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: currentPage,
        limit: 100,
        search: searchTerm,
        owner: JSON.stringify(filters.owner),
        country: JSON.stringify(filters.country),
        territory: JSON.stringify(filters.territory),
        leadLevel: JSON.stringify(filters.leadLevel),
        contactCategory: JSON.stringify(filters.contactCategory),
        activityType: filters.activityType,
        startDate: filters.startDate,
        endDate: filters.endDate
      });

      const response = await fetch(`${API_BASE_URL}/activities/salesperson?${params}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setActivities(data.data.activities);
        setSummary(data.data.summary);
        setUserSummaries(data.data.userSummaries);
        setDailyActivities(data.data.dailyActivities || []);
        setOpenedEmails(data.data.openedEmails || []);
        setBouncedEmails(data.data.bouncedEmails || []);
        setTotalPages(data.pagination.totalPages);
        setTotalCount(data.pagination.totalCount);
      } else {
        setError(data.message || 'Error fetching activities');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to fetch activities. Please check your authentication.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/contacts/filters`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setFilterOptions({
          owners: data.data.owners || [],
          countries: data.data.countries || [],
          territories: data.data.territories || [],
          leadLevels: data.data.leadLevels || [],
          contactCategories: data.data.contactCategories || []
        });
      }
    } catch (err) {
      console.error('Failed to fetch filter options:', err);
    }
  };

  const handleViewUserConversations = async (user) => {
    try {
      setSelectedUser(user);
      setShowConversationsModal(true);
      setConversationsLoading(true);
      setConversationsError(null);
      setExpandedThreads(new Set());
      setExpandedEmails(new Set());
      setConversationFilter('all');

      const params = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate,
        activityType: filters.activityType
      });

      const url = `${API_BASE_URL}/activities/user/${user.userId}/conversations?${params}`;

      const response = await fetch(url, { 
        headers: getAuthHeaders() 
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setUserConversations(data.data || []);
      } else {
        setConversationsError(data.message || 'Error fetching conversations');
      }
    } catch (error) {
      console.error('Error fetching user conversations:', error);
      setConversationsError(`Failed to fetch conversations: ${error.message}`);
    } finally {
      setConversationsLoading(false);
    }
  };

  const getFilteredConversations = () => {
    if (conversationFilter === 'all') {
      return userConversations;
    }
    return userConversations.filter(conv => conv.type === conversationFilter);
  };

  const getConversationCounts = () => {
    const emailCount = userConversations.filter(c => c.type === 'email_thread').length;
    const phoneCount = userConversations.filter(c => c.type === 'phone').length;
    const noteCount = userConversations.filter(c => c.type === 'note').length;
    
    return { 
      emailCount,
      phoneCount, 
      noteCount, 
      total: emailCount + phoneCount + noteCount 
    };
  };

  const toggleThreadVisibility = (conversationId) => {
    setExpandedThreads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(conversationId)) {
        newSet.delete(conversationId);
      } else {
        newSet.add(conversationId);
      }
      return newSet;
    });
  };

  const isThreadExpanded = (conversationId) => {
    return expandedThreads.has(conversationId);
  };

  const toggleEmailExpansion = (conversationId, messageId) => {
    const key = `${conversationId}-${messageId}`;
    setExpandedEmails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchActivities();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      
      if (filterName === 'dateFilter') {
        newFilters[filterName] = value;
        if (value === 'custom') {
          setShowCustomDatePicker(true);
        } else {
          setShowCustomDatePicker(false);
          if (value && value !== '') {
            const dateRange = getDateRange(value);
            newFilters.startDate = dateRange.startDate;
            newFilters.endDate = dateRange.endDate;
          } else {
            newFilters.startDate = '';
            newFilters.endDate = '';
          }
        }
      } else if (filterName === 'activityType') {
        newFilters[filterName] = value;
      } else if (['owner', 'country', 'territory', 'leadLevel', 'contactCategory'].includes(filterName)) {
        const currentValues = newFilters[filterName] || [];
        if (currentValues.includes(value)) {
          newFilters[filterName] = currentValues.filter(v => v !== value);
        } else {
          newFilters[filterName] = [...currentValues, value];
        }
      } else {
        newFilters[filterName] = value;
      }
      
      return newFilters;
    });
    setCurrentPage(1);
  };

  const handleCustomDateChange = (dateType, value) => {
    if (value) {
      const [year, month, day] = value.split('-').map(Number);
      const selectedDate = new Date(year, month - 1, day); 
      
      if (dateType === 'startDate') {
        selectedDate.setHours(0, 0, 0, 0); 
      } else if (dateType === 'endDate') {
        selectedDate.setHours(23, 59, 59, 999); 
      }
      
      setFilters(prev => ({
        ...prev,
        [dateType]: selectedDate.toISOString()
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        [dateType]: ''
      }));
    }
  };

  const clearFilters = () => {
    const defaultDateRange = getDateRange('today');
    setFilters({ 
      owner: [],
      country: [],
      territory: [],
      leadLevel: [],
      contactCategory: [],
      activityType: 'all',
      dateFilter: 'today',
      startDate: defaultDateRange.startDate,
      endDate: defaultDateRange.endDate
    });
    setSearchTerm('');
    setCurrentPage(1);
    setShowCustomDatePicker(false);
  };

  const formatDateTime = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '0m 0s';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const truncateContent = (content, maxLength = 200) => {
    if (!content || content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const calculateTimeDifference = (sentTime, openedTime) => {
    if (!sentTime || !openedTime) return '-';
    const diff = new Date(openedTime) - new Date(sentTime);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  const activeFiltersCount = Object.values(filters).filter((value, index) => {
    const keys = Object.keys(filters);
    const key = keys[index];
    if ((key === 'startDate' || key === 'endDate') && filters.dateFilter) {
      return false;
    }
    if (key === 'activityType' && value === 'all') {
      return false;
    }
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  }).length;

  if (!token) {
    return (
      <div className="freshworks-leads-container">
        <div className="dashboard-card">
          <div className="dashboard-header">
            <h1 className="dashboard-title">Salesperson Activity Tracker</h1>
          </div>
          <div className="empty-state">
            <div className="empty-icon">
              <h5 className="text-danger">🔒 Authentication Required</h5>
            </div>
            <p className="text-muted">Please log in to view activity data.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading && activities.length === 0) {
    return (
      <div className="freshworks-leads-container">
        <div className="dashboard-card">
          <div className="dashboard-header">
            <h1 className="dashboard-title">Salesperson Activity Tracker</h1>
          </div>
          <div className="empty-state">
            <div className="empty-icon">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
            <h5 className="text-muted">Loading activities...</h5>
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
          <button onClick={handleRefresh} className="btn btn-outline-danger">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="freshworks-leads-container">
      <div className="dashboard-card">
        {/* Header */}
        <div className="dashboard-header">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="dashboard-title">Salesperson Activity Tracker</h1>
              <p className="text-muted mb-0">
                {loading ? 'Loading...' : 
                  `${totalCount.toLocaleString()} total activities`
                }
              </p>
            </div>
            <div className="d-flex gap-2">
              <button 
                onClick={handleRefresh}
                className="btn btn-outline-primary refresh-btn-lead"
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
                <span className="input-group-text search-icon-container">🔍</span>
                <input
                  type="text"
                  placeholder="Search by contact name, email, or user..."
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
                </div>

                <div className="col-md-3">
                  <label className="form-label fw-bold text-muted small">ACTIVITY TYPE</label>
                  <select
                    className="form-select"
                    value={filters.activityType}
                    onChange={(e) => handleFilterChange('activityType', e.target.value)}
                  >
                    {activityTypeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label fw-bold text-muted small">OWNER</label>
                  <select
                    className="form-select"
                    value=""
                    onChange={(e) => e.target.value && handleFilterChange('owner', e.target.value)}
                  >
                    <option value="">Select Owner...</option>
                    {filterOptions.owners.map(owner => (
                      <option key={owner} value={owner} disabled={filters.owner.includes(owner)}>
                        {owner} {filters.owner.includes(owner) ? '✓' : ''}
                      </option>
                    ))}
                  </select>
                  {filters.owner.length > 0 && (
                    <div className="mt-1">
                      {filters.owner.map(owner => (
                        <span key={owner} className="badge bg-primary me-1 mb-1">
                          {owner}
                          <button 
                            type="button" 
                            className="btn-close btn-close-white ms-1" 
                            style={{fontSize: '0.7rem'}}
                            onClick={() => handleFilterChange('owner', owner)}
                          ></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="col-md-3">
                  <label className="form-label fw-bold text-muted small">TERRITORY</label>
                  <select
                    className="form-select"
                    value=""
                    onChange={(e) => e.target.value && handleFilterChange('territory', e.target.value)}
                  >
                    <option value="">Select Territory...</option>
                    {filterOptions.territories.map(territory => (
                      <option key={territory} value={territory} disabled={filters.territory.includes(territory)}>
                        {territory} {filters.territory.includes(territory) ? '✓' : ''}
                      </option>
                    ))}
                  </select>
                  {filters.territory.length > 0 && (
                    <div className="mt-1">
                      {filters.territory.map(territory => (
                        <span key={territory} className="badge bg-warning me-1 mb-1">
                          {territory}
                          <button 
                            type="button" 
                            className="btn-close ms-1" 
                            style={{fontSize: '0.7rem'}}
                            onClick={() => handleFilterChange('territory', territory)}
                          ></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="col-md-3">
                  <label className="form-label fw-bold text-muted small">COUNTRY</label>
                  <select
                    className="form-select"
                    value=""
                    onChange={(e) => e.target.value && handleFilterChange('country', e.target.value)}
                  >
                    <option value="">Select Country...</option>
                    {filterOptions.countries.map(country => (
                      <option key={country} value={country} disabled={filters.country.includes(country)}>
                        {country} {filters.country.includes(country) ? '✓' : ''}
                      </option>
                    ))}
                  </select>
                  {filters.country.length > 0 && (
                    <div className="mt-1">
                      {filters.country.map(country => (
                        <span key={country} className="badge bg-info me-1 mb-1">
                          {country}
                          <button 
                            type="button" 
                            className="btn-close btn-close-white ms-1" 
                            style={{fontSize: '0.7rem'}}
                            onClick={() => handleFilterChange('country', country)}
                          ></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {showCustomDatePicker && (
                <div className="row g-3 mt-2">
                  <div className="col-md-6">
                    <label className="form-label fw-bold text-muted small">START DATE</label>
                    <input 
                      type="date" 
                      value={
                        filters.startDate 
                          ? new Date(filters.startDate).toLocaleDateString('en-CA')
                          : ''
                      } 
                      onChange={(e) => handleCustomDateChange('startDate', e.target.value)} 
                      className="form-select" 
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold text-muted small">END DATE</label>
                    <input 
                      type="date" 
                      value={
                        filters.endDate 
                          ? new Date(filters.endDate).toLocaleDateString('en-CA')
                          : ''
                      } 
                      onChange={(e) => handleCustomDateChange('endDate', e.target.value)} 
                      className="form-select" 
                    />
                  </div>
                </div>
              )}

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

        {/* Summary Analytics */}
        <div className="analytics-section bg-light border rounded p-3 mb-3">
          <h6 className="fw-bold text-primary mb-3">📊 Activity Summary</h6>
          <div className="row g-3">
            <div className="col-md-2">
              <div className="analytics-card bg-white p-3 rounded border">
                <div className="d-flex align-items-center">
                  <div className="analytics-icon bg-primary text-white rounded-circle p-2 me-3">👥</div>
                  <div>
                    <div className="analytics-number text-primary fw-bold fs-4">{summary.totalUsers}</div>
                    <div className="analytics-label text-muted small">Active Users</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-2">
              <div className="analytics-card bg-white p-3 rounded border">
                <div className="d-flex align-items-center">
                  <div className="analytics-icon bg-success text-white rounded-circle p-2 me-3">📧</div>
                  <div>
                    <div className="analytics-number text-success fw-bold fs-4">{summary.totalEmails}</div>
                    <div className="analytics-label text-muted small">Emails Sent</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-2">
              <div className="analytics-card bg-white p-3 rounded border">
                <div className="d-flex align-items-center">
                  <div className="analytics-icon bg-info text-white rounded-circle p-2 me-3">📞</div>
                  <div>
                    <div className="analytics-number text-info fw-bold fs-4">{summary.totalCalls}</div>
                    <div className="analytics-label text-muted small">Calls Made</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-2">
              <div className="analytics-card bg-white p-3 rounded border">
                <div className="d-flex align-items-center">
                  <div className="analytics-icon bg-warning text-white rounded-circle p-2 me-3">✅</div>
                  <div>
                    <div className="analytics-number text-warning fw-bold fs-4">{summary.totalConnectedCalls}</div>
                    <div className="analytics-label text-muted small">Connected Calls</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-2">
              <div className="analytics-card bg-white p-3 rounded border">
                <div className="d-flex align-items-center">
                  <div className="analytics-icon bg-primary text-white rounded-circle p-2 me-3">📬</div>
                  <div>
                    <div className="analytics-number text-primary fw-bold fs-4">{summary.totalOpenedEmails}</div>
                    <div className="analytics-label text-muted small">Opened Emails</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-2">
              <div className="analytics-card bg-white p-3 rounded border">
                <div className="d-flex align-items-center">
                  <div className="analytics-icon bg-success text-white rounded-circle p-2 me-3">📊</div>
                  <div>
                    <div className="analytics-number text-success fw-bold fs-4">{summary.openRate}%</div>
                    <div className="analytics-label text-muted small">Open Rate</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-2">
              <div className="analytics-card bg-white p-3 rounded border">
                <div className="d-flex align-items-center">
                  <div className="analytics-icon bg-danger text-white rounded-circle p-2 me-3">⚠️</div>
                  <div>
                    <div className="analytics-number text-danger fw-bold fs-4">{summary.totalBouncedEmails}</div>
                    <div className="analytics-label text-muted small">Bounced Emails</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-2">
              <div className="analytics-card bg-white p-3 rounded border">
                <div className="d-flex align-items-center">
                  <div className="analytics-icon bg-secondary text-white rounded-circle p-2 me-3">👤</div>
                  <div>
                    <div className="analytics-number text-secondary fw-bold fs-4">{summary.uniqueLeadsContacted}</div>
                    <div className="analytics-label text-muted small">Unique Leads</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="mb-3">
          <ul className="nav nav-tabs">
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'activities' ? 'active' : ''}`}
                onClick={() => setActiveTab('activities')}
              >
                📋 All Activities
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => setActiveTab('users')}
              >
                👥 User Activity Breakdown
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'chart' ? 'active' : ''}`}
                onClick={() => setActiveTab('chart')}
              >
                📊 Daily Activity Chart
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'opened' ? 'active' : ''}`}
                onClick={() => setActiveTab('opened')}
              >
                📬 Opened Emails ({summary.totalOpenedEmails})
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'bounced' ? 'active' : ''}`}
                onClick={() => setActiveTab('bounced')}
              >
                ⚠️ Bounced Emails ({summary.totalBouncedEmails})
              </button>
            </li>
          </ul>
        </div>

        {/* ALL ACTIVITIES TAB */}
        {activeTab === 'activities' && (
          <>
            <div className="table-responsive">
              <table className="table leads-table">
                <thead>
                  <tr>
                    <th>Date/Time</th>
                    <th>User</th>
                    <th>Type</th>
                    <th>Contact</th>
                    <th>Market Name</th>
                    <th>Country</th>
                    <th>Territory</th>
                    <th>Lead Level</th>
                    <th>Subject</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((activity, index) => (
                    <tr key={index} className="lead-row">
                      <td>{formatDateTime(activity.activityTime)}</td>
                      <td>
                        <div>
                          <strong>{activity.userName}</strong>
                          <br />
                          <small className="text-muted">{activity.userEmail}</small>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${activity.activityType === 'Email' ? 'bg-success' : 'bg-info'}`}>
                          {activity.activityType === 'Email' ? '📧' : '📞'} {activity.activityType}
                        </span>
                      </td>
                      <td>
                        <div>
                          <strong>{activity.contactName}</strong>
                          <br />
                          <small className="text-muted">{activity.contactEmail}</small>
                        </div>
                      </td>
                      <td>{activity.marketName}</td>
                      <td>{activity.contactCountry}</td>
                      <td>{activity.territory}</td>
                      <td>
                        <span className={`badge ${
                          activity.leadLevel?.toLowerCase().includes('hot') ? 'bg-danger' :
                          activity.leadLevel?.toLowerCase().includes('warm') ? 'bg-warning' :
                          'bg-info'
                        }`}>
                          {activity.leadLevel}
                        </span>
                      </td>
                      <td>{activity.subject}</td>
                      <td>
                        {activity.activityType === 'Call' && (
                          <div>
                            <div>{formatDuration(activity.callDuration)}</div>
                            <span className={`badge ${activity.isConnected ? 'bg-success' : 'bg-secondary'}`}>
                              {activity.isConnected ? '✓ Connected' : '✗ Not Connected'}
                            </span>
                          </div>
                        )}
                        {activity.activityType === 'Email' && (
                          <div>
                            {activity.isOpened && <span className="badge bg-primary me-1">📬 Opened</span>}
                            {activity.isBounced && <span className="badge bg-danger">⚠️ Bounced</span>}
                          </div>
                        )}
                      </td>
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
          </>
        )}

        {/* USER ACTIVITY BREAKDOWN TAB */}
        {activeTab === 'users' && userSummaries.length > 0 && (
          <div className="mb-3">
            <h6 className="fw-bold text-primary mb-3">👤 User Activity Breakdown</h6>
            <div className="table-responsive">
              <table className="table table-sm table-bordered">
                <thead className="table-light">
                  <tr>
                    <th>User Name</th>
                    <th>Email</th>
                    <th>Activities</th>
                    <th>Emails</th>
                    <th>Calls</th>
                    <th>Connected</th>
                    <th>Opened</th>
                    <th>Bounced</th>
                    <th>Open Rate</th>
                    <th>Unique Leads</th>
                    <th>Avg Call Duration</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {userSummaries.map(user => (
                    <tr key={user.userId}>
                      <td><strong>{user.userName}</strong></td>
                      <td>{user.userEmail}</td>
                      <td><span className="badge bg-primary">{user.totalActivities}</span></td>
                      <td><span className="badge bg-success">{user.totalEmails}</span></td>
                      <td><span className="badge bg-info">{user.totalCalls}</span></td>
                      <td><span className="badge bg-warning">{user.connectedCalls}</span></td>
                      <td><span className="badge bg-primary">{user.openedEmails || 0}</span></td>
                      <td><span className="badge bg-danger">{user.bouncedEmails || 0}</span></td>
                      <td><span className="badge bg-success">{user.openRate || '0'}%</span></td>
                      <td><span className="badge bg-secondary">{user.uniqueLeadsContacted}</span></td>
                      <td>{user.avgCallDuration}s</td>
                      <td>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleViewUserConversations(user)}
                          title={`View all conversations for ${user.userName}`}
                        >
                          💬 View Conversations
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DAILY ACTIVITY CHART TAB */}
        {activeTab === 'chart' && dailyActivities.length > 0 && (
          <div className="mb-3">
            <h6 className="fw-bold text-primary mb-3">📊 Daily Email & Call Activity</h6>
            <div style={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <LineChart data={dailyActivities}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="emails" stroke="#28a745" name="Emails" strokeWidth={2} />
                  <Line type="monotone" dataKey="calls" stroke="#17a2b8" name="Calls" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'chart' && dailyActivities.length === 0 && (
          <div className="alert alert-info">
            <p className="mb-0">No daily activity data available for the selected filters.</p>
          </div>
        )}

        {/* OPENED EMAILS TAB - NEW */}
        {activeTab === 'opened' && (
          <div className="mb-3">
            <h6 className="fw-bold text-primary mb-3">📬 Opened Emails ({openedEmails.length})</h6>
            {openedEmails.length > 0 ? (
              <div className="table-responsive">
                <table className="table leads-table">
                  <thead>
                    <tr>
                      <th>Sent Date/Time</th>
                      <th>Opened Date/Time</th>
                      <th>Time to Open</th>
                      <th>User</th>
                      <th>Contact</th>
                      <th>Market Name</th>
                      <th>Country</th>
                      <th>Territory</th>
                      <th>Subject</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openedEmails.map((email, index) => (
                      <tr key={index} className="lead-row">
                        <td>{formatDateTime(email.activityTime)}</td>
                        <td>
                          <span className="badge bg-primary">
                            {formatDateTime(email.openedTime)}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-info">
                            {calculateTimeDifference(email.activityTime, email.openedTime)}
                          </span>
                        </td>
                        <td>
                          <div>
                            <strong>{email.userName}</strong>
                            <br />
                            <small className="text-muted">{email.userEmail}</small>
                          </div>
                        </td>
                        <td>
                          <div>
                            <strong>{email.contactName}</strong>
                            <br />
                            <small className="text-muted">{email.contactEmail}</small>
                          </div>
                        </td>
                        <td>{email.marketName}</td>
                        <td>{email.contactCountry}</td>
                        <td>{email.territory}</td>
                        <td>{email.subject}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="alert alert-info">
                <p className="mb-0">No opened emails found for the selected filters.</p>
              </div>
            )}
          </div>
        )}

        {/* BOUNCED EMAILS TAB - NEW */}
        {activeTab === 'bounced' && (
          <div className="mb-3">
            <h6 className="fw-bold text-danger mb-3">⚠️ Bounced Emails ({bouncedEmails.length})</h6>
            {bouncedEmails.length > 0 ? (
              <div className="table-responsive">
                <table className="table leads-table">
                  <thead>
                    <tr>
                      <th>Date/Time</th>
                      <th>User</th>
                      <th>Contact</th>
                      <th>Contact Email</th>
                      <th>Market Name</th>
                      <th>Country</th>
                      <th>Territory</th>
                      <th>Lead Level</th>
                      <th>Subject</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bouncedEmails.map((email, index) => (
                      <tr key={index} className="lead-row">
                        <td>{formatDateTime(email.activityTime)}</td>
                        <td>
                          <div>
                            <strong>{email.userName}</strong>
                            <br />
                            <small className="text-muted">{email.userEmail}</small>
                          </div>
                        </td>
                        <td><strong>{email.contactName}</strong></td>
                        <td>
                          <span className="badge bg-danger">{email.contactEmail}</span>
                        </td>
                        <td>{email.marketName}</td>
                        <td>{email.contactCountry}</td>
                        <td>{email.territory}</td>
                        <td>
                          <span className={`badge ${
                            email.leadLevel?.toLowerCase().includes('hot') ? 'bg-danger' :
                            email.leadLevel?.toLowerCase().includes('warm') ? 'bg-warning' :
                            'bg-info'
                          }`}>
                            {email.leadLevel}
                          </span>
                        </td>
                        <td>{email.subject}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="alert alert-success">
                <p className="mb-0">✅ No bounced emails found! All emails were delivered successfully.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CONVERSATIONS MODAL - keeping existing modal code */}
      {showConversationsModal && selectedUser && (
        <div className="modal-overlay" onClick={() => {
          setShowConversationsModal(false);
          setExpandedThreads(new Set());
          setExpandedEmails(new Set());
        }}>
          <div className="conversations-modal-professional" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-professional">
              <div className="contact-header-info">
                <div className="contact-title">
                  <h3 className="contact-name">{selectedUser.userName}'s Activities</h3>
                  <div className="contact-details">
                    <span className="company-name">{selectedUser.userEmail}</span>
                    <span className="country-info">{selectedUser.totalActivities} total activities</span>
                  </div>
                </div>
              </div>
              
              <button 
                className="close-button-professional" 
                onClick={() => {
                  setShowConversationsModal(false);
                  setExpandedThreads(new Set());
                  setExpandedEmails(new Set());
                }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {userConversations.length > 0 && (
              <div className="conversation-filters">
                {(() => {
                  const counts = getConversationCounts();
                  return (
                    <div className="filter-buttons">
                      <button 
                        className={`filter-btn ${conversationFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setConversationFilter('all')}
                      >
                        All ({counts.total})
                      </button>
                      {counts.emailCount > 0 && (
                        <button 
                          className={`filter-btn email-filter ${conversationFilter === 'email_thread' ? 'active' : ''}`}
                          onClick={() => setConversationFilter('email_thread')}
                        >
                          📧 Emails ({counts.emailCount})
                        </button>
                      )}
                      {counts.phoneCount > 0 && (
                        <button 
                          className={`filter-btn phone-filter ${conversationFilter === 'phone' ? 'active' : ''}`}
                          onClick={() => setConversationFilter('phone')}
                        >
                          📞 Calls ({counts.phoneCount})
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
            
            <div className="modal-body-professional">
              {conversationsLoading && (
                <div className="loading-state-professional">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading conversations...</span>
                  </div>
                  <p className="text-muted mt-2">Loading conversations...</p>
                </div>
              )}

              {conversationsError && (
                <div className="error-state-professional">
                  <div className="alert alert-danger" role="alert">
                    <h6 className="alert-heading">Error loading conversations</h6>
                    <p className="mb-0">{conversationsError}</p>
                  </div>
                </div>
              )}

              {!conversationsLoading && !conversationsError && userConversations.length === 0 && (
                <div className="empty-state-professional">
                  <div className="empty-icon">📭</div>
                  <h5>No conversations found</h5>
                  <p className="text-muted">This user doesn't have any recorded conversations in the selected period.</p>
                </div>
              )}

              {!conversationsLoading && !conversationsError && userConversations.length > 0 && (
                <div className="conversations-list-professional">
                  {getFilteredConversations().map((conversation, index) => (
                    <div key={conversation.conversation_id || index} 
                      className={`conversation-item-professional conversation-${conversation.type}`}>

                      {conversation.contact_info && (
                        <div className="contact-info-header bg-light p-2 mb-2 rounded">
                          <strong>👤 {conversation.contact_info.display_name}</strong>
                          {conversation.contact_info.company && <span className="ms-2">🏢 {conversation.contact_info.company}</span>}
                          {conversation.contact_info.country && <span className="ms-2">🌍 {conversation.contact_info.country}</span>}
                        </div>
                      )}

                      {conversation.type === 'email_thread' && (
                        <div className="email-thread-professional">
                          <div className="conversation-header-professional">
                            <div className="conversation-type-info">
                              <div className="type-badge email-badge">📧 Email Thread</div>
                              <div className="message-count-prominent">
                                <span className="message-count-number">{conversation.messages?.length || 0}</span>
                                <span className="message-count-text">messages</span>
                              </div>
                            </div>
                            <div className="conversation-date-range">
                              <span>{formatDateTime(conversation.created_at)}</span>
                            </div>
                          </div>
                          
                          <div 
                            className="thread-subject-professional clickable-header"
                            onClick={() => toggleThreadVisibility(conversation.conversation_id)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="subject-header-content">
                              <h5>{conversation.subject || 'No Subject'}</h5>
                              <div className="expand-all-indicator">
                                {isThreadExpanded(conversation.conversation_id) ? (
                                  <span className="expand-icon">📖 Click to collapse</span>
                                ) : (
                                  <span className="expand-icon">📧 Click to expand</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {isThreadExpanded(conversation.conversation_id) && conversation.messages && (
                            <div className="messages-container-professional">
                              {conversation.messages
                                .filter(msg => msg.direction === 'outgoing' && msg.sender?.id == selectedUser.userId)
                                .map((message, msgIndex) => {
                                  const expandKey = `${conversation.conversation_id}-${message.message_id || msgIndex}`;
                                  const isExpanded = expandedEmails.has(expandKey);
                                  const shouldTruncate = message.content && message.content.length > 300;
                                  
                                  return (
                                    <div key={message.message_id || msgIndex} className="message-item-professional outgoing">
                                      <div className="message-header-professional">
                                        <div className="sender-info-professional">
                                          <div className="sender-avatar">🏢</div>
                                          <div className="sender-details">
                                            <span className="sender-name">{message.sender?.name || 'Unknown'}</span>
                                          </div>
                                          <div className="direction-badge-professional outgoing">📤 Sent</div>
                                        </div>
                                        <div className="message-timestamp">
                                          {formatDateTime(message.timestamp)}
                                        </div>
                                      </div>
                                      
                                      {message.attachments?.length > 0 && (
                                        <div className="attachments-professional">
                                          <div className="attachments-header">📎 Attachments:</div>
                                          <div className="attachments-list">
                                            {message.attachments.map((attachment, attIndex) => (
                                              <div key={attIndex} className="attachment-item-professional">
                                                <span className="attachment-name">{attachment.name}</span>
                                                <span className="attachment-size">({(attachment.size / 1024).toFixed(1)}KB)</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      <div className="message-content-professional">
                                        {message.content ? (
                                          <div 
                                            className={`content-text ${shouldTruncate && !isExpanded ? 'truncated' : ''}`}
                                            style={{
                                              maxHeight: shouldTruncate && !isExpanded ? '120px' : 'none',
                                              overflow: shouldTruncate && !isExpanded ? 'hidden' : 'visible'
                                            }}
                                            dangerouslySetInnerHTML={{ 
                                              __html: shouldTruncate && !isExpanded 
                                                ? truncateContent(message.content, 300)
                                                : message.content
                                            }} 
                                          />
                                        ) : (
                                          <em className="no-content">No content available</em>
                                        )}
                                        
                                        {shouldTruncate && (
                                          <button 
                                            className="btn btn-sm btn-primary mt-2"
                                            onClick={() => toggleEmailExpansion(conversation.conversation_id, message.message_id || msgIndex)}
                                          >
                                            {isExpanded ? '📄 Show Less' : '📖 Show Full Email'}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      )}

                      {conversation.type === 'phone' && (
                        <div className="phone-call-professional">
                          <div className="conversation-header-professional">
                            <div className="conversation-type-info">
                              <div className="type-badge phone-badge">📞 Phone Call</div>
                              <div className={`call-direction-badge ${conversation.call_direction}`}>
                                {conversation.call_direction === 'incoming' ? '📞 Incoming' : '📱 Outgoing'}
                              </div>
                            </div>
                            <div className="conversation-date-range">
                              {formatDateTime(conversation.created_at)}
                            </div>
                          </div>
                          
                          <div className="call-details-professional">
                            <div className="call-metrics">
                              <div className="metric-card">
                                <div className="metric-icon">⏱️</div>
                                <div className="metric-info">
                                  <span className="metric-label">Duration</span>
                                  <span className="metric-value">{formatDuration(conversation.call_duration || 0)}</span>
                                </div>
                              </div>
                              
                              <div className="metric-card">
                                <div className={`metric-icon ${conversation.call_duration > 90 ? 'success' : 'error'}`}>
                                  {conversation.call_duration > 90 ? '✅' : '❌'}
                                </div>
                                <div className="metric-info">
                                  <span className="metric-label">Status</span>
                                  <span className="metric-value">
                                    {conversation.call_duration > 90 ? 'Connected' : 'Not Connected'}
                                  </span>
                                </div>
                              </div>
                              
                              {conversation.phone_number && (
                                <div className="metric-card">
                                  <div className="metric-icon">📞</div>
                                  <div className="metric-info">
                                    <span className="metric-label">Number</span>
                                    <span className="metric-value">{conversation.phone_number}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalespersonActivity;