import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; // Add this import
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer,
  ComposedChart, Area, AreaChart
} from 'recharts';
import '../styles/Sale.css';

const Sale = () => {
  const navigate = useNavigate(); // Add this hook
  const [analyticsData, setAnalyticsData] = useState({
    totalContacts: 0,
    avgTouchpoints: '0.0',
    avgEmails: '0.0',
    avgCalls: '0.0',
    avgConnectedCalls: '0.0',
    avgSampleSentHours: '0.0',
    avgFirstCallMinutes: '0.0',
    clientEmailsReceived: 0,
    avgCallDuration: '0',
    responseRate: '0.0',
    samplesSentCount: 0,
    firstCallsCount: 0,
    countryBreakdown: {},
    territoryBreakdown: {},
    activeLeadCount: 0,
    leadLevelBreakdown: {},
    contactCategoryBreakdown: {},
    priorityCountries: {}
  });

  const [ownerAnalytics, setOwnerAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [filters, setFilters] = useState({
    status: [],
    owner: [],
    territory: [],
    leadLevel: [],
    contactCategory: [],
    customTags: [],
    country: [],
    isActive: '',
    dateFilter: '',
    startDate: '',
    endDate: ''
  });

  // Updated navigation function using React Router
  const navigateToLeads = (additionalFilters = {}) => {
    const combinedFilters = { ...filters, ...additionalFilters };
    
    // Navigate to dashboard with state to show FreshworksLeads
    navigate('/', { 
      state: { 
        selectedSection: 'Freshworks Leads',
        filters: combinedFilters,
        fromAnalytics: true 
      } 
    });
  };

  const [filterOptions, setFilterOptions] = useState({
    statuses: [],
    owners: [],
    territories: [],
    leadLevels: [],
    contactCategories: [],
    customTags: [],
    countries: [],
    activeStatus: []
  });

  const [analyticsCountryFilter, setAnalyticsCountryFilter] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const priorityCountries = [
    'United States', 'United Kingdom', 'France', 'Italy', 
    'Germany', 'Spain', 'Japan', 'Korea, Republic of'
  ];

  const dateFilterOptions = [
    { value: '', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'week', label: 'Last 7 Days' },
    { value: 'month', label: 'Last 30 Days' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const COLORS = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];
  const TERRITORY_COLORS = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e', '#16a085', '#c0392b', '#8e44ad', '#2980b9'];

  useEffect(() => {
    fetchAnalytics();
    fetchFilterOptions();
  }, [filters, analyticsCountryFilter]);

  const getDateRange = (filterType) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filterType) {
      case 'today':
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        return { startDate: today.toISOString(), endDate: todayEnd.toISOString() };
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setHours(23, 59, 59, 999);
        return { startDate: yesterday.toISOString(), endDate: yesterdayEnd.toISOString() };
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const todayEndWeek = new Date(today);
        todayEndWeek.setHours(23, 59, 59, 999);
        return { startDate: weekAgo.toISOString(), endDate: todayEndWeek.toISOString() };
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);
        const todayEndMonth = new Date(today);
        todayEndMonth.setHours(23, 59, 59, 999);
        return { startDate: monthAgo.toISOString(), endDate: todayEndMonth.toISOString() };
      default:
        return { startDate: '', endDate: '' };
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      let dateRange = { startDate: '', endDate: '' };
      if (filters.dateFilter && filters.dateFilter !== 'custom') {
        dateRange = getDateRange(filters.dateFilter);
      } else if (filters.dateFilter === 'custom') {
        dateRange = { startDate: filters.startDate, endDate: filters.endDate };
      }

      const params = new URLSearchParams({
        page: 1,
        limit: 1000,
        search: '',
        sortBy: 'created_at',
        sortOrder: 'desc',
        status: JSON.stringify(filters.status),
        owner: JSON.stringify(filters.owner),
        territory: JSON.stringify(filters.territory),
        leadLevel: JSON.stringify(filters.leadLevel),
        contactCategory: JSON.stringify(filters.contactCategory),
        customTags: JSON.stringify(filters.customTags),
        country: JSON.stringify(filters.country),
        isActive: filters.isActive,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        analyticsCountryFilter: JSON.stringify(analyticsCountryFilter)
      });

      const response = await fetch(`${API_BASE_URL}/contacts/table?${params}`);
      const data = await response.json();

      if (data.success) {
        setAnalyticsData(data.analytics || {});
        generateOwnerAnalytics(data.data || []);
      } else {
        setError(data.message || 'Error fetching analytics');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to fetch analytics');
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
          countries: data.data.countries || [],
          activeStatus: data.data.activeStatus || []
        });
      }
    } catch (err) {
      console.error('Failed to fetch filter options:', err);
    }
  };

  const generateOwnerAnalytics = (contacts) => {
    const ownerData = {};
    const leadLevelByOwner = {};
    
    contacts.forEach(contact => {
      const owner = contact.owner_name || 'Unassigned';
      if (!ownerData[owner]) {
        ownerData[owner] = {
          owner,
          totalContacts: 0,
          activeLeads: 0,
          inactiveLeads: 0,
          totalTouchpoints: 0,
          totalEmails: 0,
          totalCalls: 0,
          sampleSentHours: [],
          firstCallMinutes: [],
          corporateLeads: 0,
          genericLeads: 0,
          responseRate: 0,
          incomingEmails: 0,
          outgoingEmails: 0
        };
      }

      if (!leadLevelByOwner[owner]) {
        leadLevelByOwner[owner] = {};
      }
      
      const data = ownerData[owner];
      data.totalContacts++;
      
      if (contact.is_active === 'Yes') {
        data.activeLeads++;
      } else {
        data.inactiveLeads++;
      }
      
      data.totalTouchpoints += contact.total_touchpoints || 0;
      data.totalEmails += contact.outgoing_emails || 0;
      data.totalCalls += contact.outgoing_calls || 0;
      data.incomingEmails += contact.incoming_emails || 0;
      data.outgoingEmails += contact.outgoing_emails || 0;
      
      if (contact.sample_sent_timing) {
        data.sampleSentHours.push(parseFloat(contact.sample_sent_timing));
      }
      
      if (contact.first_call_timing) {
        data.firstCallMinutes.push(parseFloat(contact.first_call_timing));
      }
      
      const category = contact.contact_category?.toLowerCase() || '';
      if (category.includes('corporate')) {
        data.corporateLeads++;
      } else if (category.includes('generic')) {
        data.genericLeads++;
      }

      // Track lead levels by owner
      const leadLevel = contact.lead_level || 'Unassigned';
      leadLevelByOwner[owner][leadLevel] = (leadLevelByOwner[owner][leadLevel] || 0) + 1;
    });
    
    // Calculate averages and response rates
    const ownerStats = Object.values(ownerData).map(data => ({
      ...data,
      avgTouchpoints: data.totalContacts > 0 ? (data.totalTouchpoints / data.totalContacts).toFixed(1) : '0.0',
      avgEmails: data.totalContacts > 0 ? (data.totalEmails / data.totalContacts).toFixed(1) : '0.0',
      avgCalls: data.totalContacts > 0 ? (data.totalCalls / data.totalContacts).toFixed(1) : '0.0',
      avgSampleHours: data.sampleSentHours.length > 0 ? (data.sampleSentHours.reduce((a, b) => a + b, 0) / data.sampleSentHours.length).toFixed(1) : '0.0',
      avgFirstCallMinutes: data.firstCallMinutes.length > 0 ? (data.firstCallMinutes.reduce((a, b) => a + b, 0) / data.firstCallMinutes.length).toFixed(1) : '0.0',
      responseRate: data.outgoingEmails > 0 ? ((data.incomingEmails / data.outgoingEmails) * 100).toFixed(1) : '0.0',
      leadLevels: leadLevelByOwner[data.owner] || {}
    }));
    
    setOwnerAnalytics(ownerStats);
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
          newFilters.startDate = '';
          newFilters.endDate = '';
        }
      } else if (['status', 'owner', 'territory', 'leadLevel', 'contactCategory', 'customTags', 'country'].includes(filterName)) {
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
  };

  const handleCustomDateChange = (dateType, value) => {
    setFilters(prev => ({
      ...prev,
      [dateType]: value
    }));
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

  const clearFilters = () => {
    setFilters({ 
      status: [], owner: [], territory: [], leadLevel: [],
      contactCategory: [], customTags: [], country: [],
      isActive: '', dateFilter: '', startDate: '', endDate: ''
    });
    setAnalyticsCountryFilter([]);
    setShowCustomDatePicker(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleAnalyticsCountryFilter = (country) => {
    setAnalyticsCountryFilter(prev => {
      const newFilter = prev.includes(country) 
        ? prev.filter(c => c !== country)
        : [...prev, country];
      return newFilter;
    });
  };

  // Enhanced tooltip formatter
  const formatTooltip = (value, name, props) => {
    if (name.includes('Rate') || name.includes('Percentage')) {
      return [`${value}%`, name];
    }
    if (name.includes('Hours')) {
      return [`${value}h`, name];
    }
    if (name.includes('Minutes')) {
      return [`${value}m`, name];
    }
    return [value, name];
  };

  // Prepare chart data with better formatting
  const categoryData = Object.entries(analyticsData.contactCategoryBreakdown || {}).map(([category, count]) => ({
    name: category || 'Unknown', // Use 'name' instead of 'category' for proper labeling
    category: category || 'Unknown',
    count,
    percentage: analyticsData.totalContacts > 0 ? ((count / analyticsData.totalContacts) * 100).toFixed(1) : 0
  }));

  const territoryData = Object.entries(analyticsData.territoryBreakdown || {})
    .sort(([,a], [,b]) => b - a)
    .map(([territory, count], index) => ({
      territory: territory || 'Unassigned',
      count,
      fill: TERRITORY_COLORS[index % TERRITORY_COLORS.length] // Add different color for each bar
    }));

  const leadLevelData = Object.entries(analyticsData.leadLevelBreakdown || {}).map(([level, count]) => ({
    level: level || 'Unassigned',
    count
  }));

  // Prepare lead level data by owner
  const leadLevelByOwnerData = ownerAnalytics.map(owner => {
    const ownerData = { owner: owner.owner };
    Object.entries(owner.leadLevels || {}).forEach(([level, count]) => {
      ownerData[level] = count;
    });
    return ownerData;
  });

  // Get all unique lead levels for the stacked chart
  const allLeadLevels = [...new Set(ownerAnalytics.flatMap(owner => Object.keys(owner.leadLevels || {})))];

  // Custom label for pie charts showing numbers
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, count, name }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {count}
      </text>
    );
  };

  const activeFiltersCount = Object.values(filters).filter((value, index) => {
    const keys = Object.keys(filters);
    const key = keys[index];
    if ((key === 'startDate' || key === 'endDate') && filters.dateFilter) {
      return false;
    }
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  }).length;

  if (loading && !analyticsData.totalContacts) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="spinner"></div>
          <h3>Loading Sales Analytics...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="sales-dashboard">
      {/* Header */}
      <div className="header-card">
        <div className="header-content">
          <div className="header-info">
            <h1 className="main-title">📊 Sales Analytics Dashboard</h1>
            <p className="subtitle">
              {analyticsData.totalContacts?.toLocaleString() || 0} total contacts • Interactive insights and metrics
            </p>
          </div>
          <div className="header-actions">
            <button 
              onClick={handleRefresh}
              disabled={refreshing}
              className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
            >
              {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`filters-toggle ${showFilters ? 'active' : ''}`}
          >
            🔽 Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </button>
        </div>

        {showFilters && (
          <div className="filters-container">
            <div className="filters-grid">
              {/* Date Filter */}
              <div className="filter-group">
                <label className="filter-label">DATE RANGE</label>
                <select
                  value={filters.dateFilter}
                  onChange={(e) => handleFilterChange('dateFilter', e.target.value)}
                  className="filter-select"
                >
                  {dateFilterOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {filters.dateFilter && (
                  <small className="filter-display-text">
                    {getDateFilterDisplayText()}
                  </small>
                )}
              </div>

              {/* Owner Filter */}
              <div className="filter-group">
                <label className="filter-label">OWNER</label>
                <select
                  value=""
                  onChange={(e) => e.target.value && handleFilterChange('owner', e.target.value)}
                  className="filter-select"
                >
                  <option value="">Select Owner...</option>
                  {filterOptions.owners.map(owner => (
                    <option key={owner} value={owner} disabled={filters.owner.includes(owner)}>
                      {owner} {filters.owner.includes(owner) ? '✓' : ''}
                    </option>
                  ))}
                </select>
                {filters.owner.length > 0 && (
                  <div className="selected-filters">
                    {filters.owner.map(owner => (
                      <span key={owner} className="selected-filter-tag">
                        {owner}
                        <button onClick={() => handleFilterChange('owner', owner)}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Territory Filter */}
              <div className="filter-group">
                <label className="filter-label">TERRITORY</label>
                <select
                  value=""
                  onChange={(e) => e.target.value && handleFilterChange('territory', e.target.value)}
                  className="filter-select"
                >
                  <option value="">Select Territory...</option>
                  {filterOptions.territories.map(territory => (
                    <option key={territory} value={territory} disabled={filters.territory.includes(territory)}>
                      {territory} {filters.territory.includes(territory) ? '✓' : ''}
                    </option>
                  ))}
                </select>
                {filters.territory.length > 0 && (
                  <div className="selected-filters">
                    {filters.territory.map(territory => (
                      <span key={territory} className="selected-filter-tag">
                        {territory}
                        <button onClick={() => handleFilterChange('territory', territory)}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Country Filter */}
              <div className="filter-group">
                <label className="filter-label">COUNTRY</label>
                <select
                  value=""
                  onChange={(e) => e.target.value && handleFilterChange('country', e.target.value)}
                  className="filter-select"
                >
                  <option value="">Select Country...</option>
                  {filterOptions.countries.map(country => (
                    <option key={country} value={country} disabled={filters.country.includes(country)}>
                      {country} {filters.country.includes(country) ? '✓' : ''}
                    </option>
                  ))}
                </select>
                {filters.country.length > 0 && (
                  <div className="selected-filters">
                    {filters.country.map(country => (
                      <span key={country} className="selected-filter-tag">
                        {country}
                        <button onClick={() => handleFilterChange('country', country)}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Lead Level Filter */}
              <div className="filter-group">
                <label className="filter-label">LEAD LEVEL</label>
                <select
                  value=""
                  onChange={(e) => e.target.value && handleFilterChange('leadLevel', e.target.value)}
                  className="filter-select"
                >
                  <option value="">Select Lead Level...</option>
                  {filterOptions.leadLevels.map(level => (
                    <option key={level} value={level} disabled={filters.leadLevel.includes(level)}>
                      {level} {filters.leadLevel.includes(level) ? '✓' : ''}
                    </option>
                  ))}
                </select>
                {filters.leadLevel.length > 0 && (
                  <div className="selected-filters">
                    {filters.leadLevel.map(level => (
                      <span key={level} className="selected-filter-tag">
                        {level}
                        <button onClick={() => handleFilterChange('leadLevel', level)}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Contact Category Filter */}
              <div className="filter-group">
                <label className="filter-label">CONTACT CATEGORY</label>
                <select
                  value=""
                  onChange={(e) => e.target.value && handleFilterChange('contactCategory', e.target.value)}
                  className="filter-select"
                >
                  <option value="">Select Category...</option>
                  {filterOptions.contactCategories.map(category => (
                    <option key={category} value={category} disabled={filters.contactCategory.includes(category)}>
                      {category} {filters.contactCategory.includes(category) ? '✓' : ''}
                    </option>
                  ))}
                </select>
                {filters.contactCategory.length > 0 && (
                  <div className="selected-filters">
                    {filters.contactCategory.map(category => (
                      <span key={category} className="selected-filter-tag">
                        {category}
                        <button onClick={() => handleFilterChange('contactCategory', category)}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Status Filter */}
              <div className="filter-group">
                <label className="filter-label">ACTIVE STATUS</label>
                <select
                  value={filters.isActive}
                  onChange={(e) => handleFilterChange('isActive', e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Contacts</option>
                  <option value="yes">Active (Responded)</option>
                  <option value="no">Not Active (No Response)</option>
                </select>
              </div>
            </div>

            {/* Custom Date Range Picker */}
            {showCustomDatePicker && (
              <div className="custom-date-picker">
                <div className="date-picker-row">
                  <div className="date-picker-group">
                    <label className="filter-label">START DATE</label>
                    <input
                      type="date"
                      value={filters.startDate ? filters.startDate.split('T')[0] : ''}
                      onChange={(e) => {
                        const date = e.target.value ? `${e.target.value}T00:00:00.000Z` : '';
                        handleCustomDateChange('startDate', date);
                      }}
                      className="filter-select"
                    />
                  </div>
                  <div className="date-picker-group">
                    <label className="filter-label">END DATE</label>
                    <input
                      type="date"
                      value={filters.endDate ? filters.endDate.split('T')[0] : ''}
                      onChange={(e) => {
                        const date = e.target.value ? `${e.target.value}T23:59:59.999Z` : '';
                        handleCustomDateChange('endDate', date);
                      }}
                      className="filter-select"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Priority Countries Filter */}
            <div className="priority-countries">
              <label className="filter-label">FOCUS COUNTRIES:</label>
              <div className="country-buttons">
                {priorityCountries.map(country => (
                  <button
                    key={country}
                    onClick={() => handleAnalyticsCountryFilter(country)}
                    className={`country-btn ${analyticsCountryFilter.includes(country) ? 'active' : ''}`}
                  >
                    {country} ({analyticsData.priorityCountries?.[country] || 0})
                  </button>
                ))}
              </div>
            </div>

            {activeFiltersCount > 0 && (
              <button onClick={clearFilters} className="clear-filters-btn">
                Clear All Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Key Metrics Cards */}
      <div className="metrics-grid">
        {[
          { icon: '👥', label: 'Total Contacts', value: analyticsData.totalContacts?.toLocaleString() || 0, color: '#3498db' },
          { icon: '✅', label: 'Active Leads', value: analyticsData.activeLeadCount?.toLocaleString() || 0, color: '#27ae60' },
          { icon: '📧', label: 'Avg Emails/Contact', value: analyticsData.avgEmails || '0.0', color: '#e67e22' },
          { icon: '📞', label: 'Avg Calls/Contact', value: analyticsData.avgCalls || '0.0', color: '#9b59b6' },
          { icon: '📊', label: 'Response Rate', value: `${analyticsData.responseRate || '0.0'}%`, color: '#e74c3c' },
          { icon: '⏱️', label: 'Avg Sample Time', value: `${analyticsData.avgSampleSentHours || '0.0'}h`, color: '#f39c12' },
          { icon: '📱', label: 'Avg First Call Time', value: `${analyticsData.avgFirstCallMinutes || '0.0'}m`, color: '#1abc9c' },
          { icon: '📈', label: 'Samples Sent', value: analyticsData.samplesSentCount?.toLocaleString() || 0, color: '#34495e' }
        ].map((metric, index) => (
          <div key={index} className="metric-card">
            <div className="metric-icon">{metric.icon}</div>
            <div className="metric-value" style={{ color: metric.color }}>
              {metric.value}
            </div>
            <div className="metric-label">{metric.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        
        {/* Owner Analytics Bar Chart */}
        <div className="chart-container resizable">
          <div className="chart-header">
            <h3>📊 Performance by Owner</h3>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart 
              data={ownerAnalytics} 
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ecf0f1" />
              <XAxis 
                dataKey="owner" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                fontSize={10}
                stroke="#7f8c8d"
              />
              <YAxis stroke="#7f8c8d" />
              <Tooltip 
                formatter={formatTooltip}
                contentStyle={{ 
                  backgroundColor: '#2c3e50', 
                  border: 'none', 
                  borderRadius: '8px', 
                  color: 'white' 
                }}
              />
              <Legend />
              <Bar 
                dataKey="totalContacts" 
                fill="#3498db" 
                name="Total Contacts" 
                radius={[2, 2, 0, 0]}
                onClick={(data) => navigateToLeads({ owner: [data.owner] })}
                style={{ cursor: 'pointer' }}
              />
              <Bar 
                dataKey="activeLeads" 
                fill="#27ae60" 
                name="Active Leads" 
                radius={[2, 2, 0, 0]}
                onClick={(data) => navigateToLeads({ owner: [data.owner], isActive: 'yes' })}
                style={{ cursor: 'pointer' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* New Avg Touchpoint Stacked Bar Chart (Calls + Emails) */}
        <div className="chart-container resizable">
          <div className="chart-header">
            <h3>📊 Avg Touchpoints by Owner (Calls + Emails)</h3>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart 
              data={ownerAnalytics} 
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ecf0f1" />
              <XAxis 
                dataKey="owner" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                fontSize={10}
                stroke="#7f8c8d"
              />
              <YAxis stroke="#7f8c8d" />
              <Tooltip 
                formatter={formatTooltip}
                contentStyle={{ 
                  backgroundColor: '#2c3e50', 
                  border: 'none', 
                  borderRadius: '8px', 
                  color: 'white' 
                }}
              />
              <Legend />
              <Bar 
                dataKey="avgCalls" 
                stackId="touchpoints" 
                fill="#9b59b6" 
                name="Avg Calls" 
                radius={[0, 0, 0, 0]}
                onClick={(data) => navigateToLeads({ owner: [data.owner] })}
                style={{ cursor: 'pointer' }}
              />
              <Bar 
                dataKey="avgEmails" 
                stackId="touchpoints" 
                fill="#e67e22" 
                name="Avg Emails" 
                radius={[2, 2, 0, 0]}
                onClick={(data) => navigateToLeads({ owner: [data.owner] })}
                style={{ cursor: 'pointer' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Contact Categories Pie Chart */}
        <div className="chart-container resizable">
          <div className="chart-header">
            <h3>🏢 Contact Categories</h3>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
                nameKey="name"
              >
                {categoryData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                    onClick={() => navigateToLeads({ contactCategory: [entry.name] })}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [value, 'Count']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Response Rate by Owner */}
        <div className="chart-container resizable">
          <div className="chart-header">
            <h3>📈 Response Rate by Owner</h3>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart 
              data={ownerAnalytics} 
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ecf0f1" />
              <XAxis 
                dataKey="owner" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                fontSize={10}
                stroke="#7f8c8d"
              />
              <YAxis domain={[0, 'dataMax + 10']} stroke="#7f8c8d" />
              <Tooltip formatter={(value) => [`${value}%`, 'Response Rate']} />
              <Legend />
              <Bar 
                dataKey="responseRate" 
                fill="#e74c3c" 
                name="Response Rate %" 
                radius={[4, 4, 0, 0]}
                onClick={(data) => navigateToLeads({ owner: [data.owner] })}
                style={{ cursor: 'pointer' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Sample Timing by Owner */}
        <div className="chart-container resizable">
          <div className="chart-header">
            <h3>⏰ Avg Sample Timing by Owner</h3>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={ownerAnalytics} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ecf0f1" />
              <XAxis 
                dataKey="owner" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                fontSize={10}
                stroke="#7f8c8d"
              />
              <YAxis stroke="#7f8c8d" />
              <Tooltip formatter={(value) => [`${value} hours`, 'Avg Sample Timing']} />
              <Area 
                type="monotone" 
                dataKey="avgSampleHours" 
                stroke="#f39c12" 
                fill="#f39c12" 
                fillOpacity={0.6}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* First Call Timing by Owner */}
        <div className="chart-container resizable">
          <div className="chart-header">
            <h3>📞 Avg First Call Timing by Owner</h3>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={ownerAnalytics} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ecf0f1" />
              <XAxis 
                dataKey="owner" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                fontSize={10}
                stroke="#7f8c8d"
              />
              <YAxis stroke="#7f8c8d" />
              <Tooltip formatter={(value) => [`${value} minutes`, 'Avg First Call Timing']} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="avgFirstCallMinutes" 
                stroke="#9b59b6" 
                strokeWidth={3}
                dot={{ fill: '#9b59b6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#9b59b6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Lead Levels Distribution by Owner */}
        <div className="chart-container resizable">
          <div className="chart-header">
            <h3>🌡️ Lead Levels Distribution by Owner</h3>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart 
              data={leadLevelByOwnerData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ecf0f1" />
              <XAxis 
                dataKey="owner" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                fontSize={10}
                stroke="#7f8c8d"
              />
              <YAxis stroke="#7f8c8d" />
              <Tooltip />
              <Legend />
              {allLeadLevels.map((level, index) => (
                <Bar 
                  key={level}
                  dataKey={level} 
                  stackId="leadLevels"
                  fill={COLORS[index % COLORS.length]} 
                  name={level}
                  onClick={(data) => navigateToLeads({ owner: [data.owner], leadLevel: [level] })}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Territory Distribution - Different Colors */}
        <div className="chart-container resizable">
          <div className="chart-header">
            <h3>🗺️ Territory Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart 
              data={territoryData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ecf0f1" />
              <XAxis 
                dataKey="territory" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                fontSize={10}
                stroke="#7f8c8d"
              />
              <YAxis stroke="#7f8c8d" />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {territoryData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.fill}
                    onClick={() => navigateToLeads({ territory: [entry.territory] })}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Owner Details Table */}
      <div className="table-container">
        <h3>👥 Detailed Owner Analytics</h3>
        <div className="table-wrapper">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Owner</th>
                <th>Total</th>
                <th>Active</th>
                <th>Corporate</th>
                <th>Generic</th>
                <th>Avg Touchpoints</th>
                <th>Response Rate</th>
                <th>Avg Sample Time</th>
                <th>Avg Call Time</th>
              </tr>
            </thead>
            <tbody>
              {ownerAnalytics.map((owner, index) => (
                <tr key={index}>
                  <td className="owner-name">{owner.owner}</td>
                  <td>{owner.totalContacts}</td>
                  <td className="active-count">{owner.activeLeads}</td>
                  <td className="corporate-count">{owner.corporateLeads}</td>
                  <td className="generic-count">{owner.genericLeads}</td>
                  <td>{owner.avgTouchpoints}</td>
                  <td className="response-rate">{owner.responseRate}%</td>
                  <td className="sample-time">{owner.avgSampleHours}h</td>
                  <td className="call-time">{owner.avgFirstCallMinutes}m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Sale;