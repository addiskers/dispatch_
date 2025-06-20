import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, ComposedChart, Area, AreaChart } from 'recharts';

const Sales = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
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

  const [showFilters, setShowFilters] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsCountryFilter, setAnalyticsCountryFilter] = useState([]);

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

  // Colors for charts
  const COLORS = {
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#06B6D4',
    purple: '#8B5CF6',
    pink: '#EC4899',
    indigo: '#6366F1'
  };

  const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1'];

  useEffect(() => {
    fetchAnalyticsData();
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

  const fetchAnalyticsData = async () => {
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
        limit: 1000, // Get more data for analytics
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
        const processedData = processAnalyticsData(data.data, data.analytics);
        setAnalyticsData(processedData);
      } else {
        setError(data.message || 'Error fetching analytics data');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to fetch analytics data');
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

  const processAnalyticsData = (contacts, globalAnalytics) => {
    // Group contacts by owner for detailed analytics
    const ownerGroups = {};
    
    contacts.forEach(contact => {
      const owner = contact.owner_name || 'Unassigned';
      if (!ownerGroups[owner]) {
        ownerGroups[owner] = {
          contacts: [],
          totalContacts: 0,
          activeContacts: 0,
          inactiveContacts: 0,
          totalTouchpoints: 0,
          totalEmails: 0,
          totalCalls: 0,
          totalConnectedCalls: 0,
          samplesSent: 0,
          firstCalls: 0,
          sampleTimingSum: 0,
          firstCallTimingSum: 0,
          corporate: 0,
          generic: 0,
          other: 0,
          incomingEmails: 0,
          countries: {}
        };
      }
      
      const group = ownerGroups[owner];
      group.contacts.push(contact);
      group.totalContacts++;
      
      // Active/Inactive tracking
      if (contact.is_active === 'Yes') {
        group.activeContacts++;
      } else {
        group.inactiveContacts++;
      }
      
      // Engagement metrics
      group.totalTouchpoints += contact.total_touchpoints || 0;
      group.totalEmails += contact.outgoing_emails || 0;
      group.totalCalls += contact.outgoing_calls || 0;
      group.totalConnectedCalls += contact.connected_calls || 0;
      group.incomingEmails += contact.incoming_emails || 0;
      
      // Sample and call timing
      if (contact.sample_sent_timing) {
        group.samplesSent++;
        group.sampleTimingSum += parseFloat(contact.sample_sent_timing) || 0;
      }
      
      if (contact.first_call_timing) {
        group.firstCalls++;
        group.firstCallTimingSum += parseFloat(contact.first_call_timing) || 0;
      }
      
      // Contact categories
      const category = contact.contact_category?.toLowerCase() || '';
      if (category.includes('corporate')) {
        group.corporate++;
      } else if (category.includes('generic')) {
        group.generic++;
      } else {
        group.other++;
      }
      
      // Country tracking
      const country = contact.country || 'Unknown';
      group.countries[country] = (group.countries[country] || 0) + 1;
    });

    // Convert to chart-friendly format
    const ownerData = Object.entries(ownerGroups).map(([owner, data]) => ({
      owner: owner.length > 15 ? owner.substring(0, 15) + '...' : owner,
      fullOwner: owner,
      totalContacts: data.totalContacts,
      activeContacts: data.activeContacts,
      inactiveContacts: data.inactiveContacts,
      avgTouchpoints: data.totalContacts > 0 ? (data.totalTouchpoints / data.totalContacts).toFixed(1) : 0,
      avgEmails: data.totalContacts > 0 ? (data.totalEmails / data.totalContacts).toFixed(1) : 0,
      avgCalls: data.totalContacts > 0 ? (data.totalCalls / data.totalContacts).toFixed(1) : 0,
      avgConnectedCalls: data.totalCalls > 0 ? (data.totalConnectedCalls / data.totalCalls).toFixed(1) : 0,
      avgSampleTiming: data.samplesSent > 0 ? (data.sampleTimingSum / data.samplesSent).toFixed(1) : 0,
      avgFirstCallTiming: data.firstCalls > 0 ? (data.firstCallTimingSum / data.firstCalls).toFixed(1) : 0,
      corporate: data.corporate,
      generic: data.generic,
      other: data.other,
      responseRate: data.totalEmails > 0 ? ((data.incomingEmails / data.totalEmails) * 100).toFixed(1) : 0,
      countries: data.countries
    })).sort((a, b) => b.totalContacts - a.totalContacts);

    // Category breakdown for pie chart
    const categoryData = [
      { name: 'Corporate', value: globalAnalytics.contactCategoryBreakdown?.Corporate || 0, color: COLORS.primary },
      { name: 'Generic', value: globalAnalytics.contactCategoryBreakdown?.Generic || 0, color: COLORS.success },
      { name: 'Test', value: globalAnalytics.contactCategoryBreakdown?.Test || 0, color: COLORS.warning },
      { name: 'Invalid', value: globalAnalytics.contactCategoryBreakdown?.Invalid || 0, color: COLORS.danger },
      { name: 'Student', value: globalAnalytics.contactCategoryBreakdown?.Student || 0, color: COLORS.info },
      { name: 'Other', value: globalAnalytics.contactCategoryBreakdown?.Other || 0, color: COLORS.purple }
    ].filter(item => item.value > 0);

    // Country breakdown for pie chart
    const countryData = Object.entries(globalAnalytics.countryBreakdown || {})
      .map(([country, count]) => ({
        name: country.length > 12 ? country.substring(0, 12) + '...' : country,
        fullName: country,
        value: count
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 countries

    // Territory breakdown
    const territoryData = Object.entries(globalAnalytics.territoryBreakdown || {})
      .map(([territory, count]) => ({
        name: territory === 'Unassigned' ? 'Unassigned' : (territory.length > 10 ? territory.substring(0, 10) + '...' : territory),
        fullName: territory,
        value: count
      }))
      .sort((a, b) => b.value - a.value);

    // Lead level breakdown
    const leadLevelData = Object.entries(globalAnalytics.leadLevelBreakdown || {})
      .map(([level, count]) => ({
        name: level,
        value: count,
        color: level.toLowerCase().includes('hot') ? COLORS.danger :
               level.toLowerCase().includes('warm') ? COLORS.warning :
               level.toLowerCase().includes('cold') ? COLORS.info : COLORS.purple
      }))
      .sort((a, b) => b.value - a.value);

    return {
      globalAnalytics,
      ownerData,
      categoryData,
      countryData,
      territoryData,
      leadLevelData
    };
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalyticsData();
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
    setFilters(prev => ({ ...prev, [dateType]: value }));
  };

  const clearFilters = () => {
    setFilters({ 
      status: [], owner: [], territory: [], leadLevel: [],
      contactCategory: [], customTags: [], country: [],
      isActive: '', dateFilter: '', startDate: '', endDate: ''
    });
    setShowCustomDatePicker(false);
    setAnalyticsCountryFilter([]);
  };

  const handleAnalyticsCountryFilter = (country) => {
    setAnalyticsCountryFilter(prev => {
      const newFilter = prev.includes(country) 
        ? prev.filter(c => c !== country)
        : [...prev, country];
      return newFilter;
    });
  };

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

  const getSelectedFiltersText = (filterName) => {
    const selected = filters[filterName] || [];
    if (selected.length === 0) return '';
    if (selected.length === 1) return selected[0];
    return `${selected.length} selected`;
  };

  const activeFiltersCount = Object.values(filters).filter((value, index) => {
    const keys = Object.keys(filters);
    const key = keys[index];
    if ((key === 'startDate' || key === 'endDate') && filters.dateFilter) {
      return false;
    }
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  }).length;

  if (loading && !analyticsData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <h5 className="text-gray-600">Loading sales analytics...</h5>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="text-red-800">
              <h4 className="text-lg font-semibold mb-2">Error!</h4>
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { globalAnalytics, ownerData, categoryData, countryData, territoryData, leadLevelData } = analyticsData || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">📊 Sales Analytics Dashboard</h1>
              <p className="text-gray-600">
                {loading ? 'Loading...' : 
                  `${globalAnalytics?.totalContacts?.toLocaleString() || 0} total contacts analyzed • ${ownerData?.length || 0} sales owners`
                }
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                🔽 Filters
                {activeFiltersCount > 0 && (
                  <span className="bg-blue-800 text-white text-xs px-2 py-1 rounded-full">{activeFiltersCount}</span>
                )}
              </button>
              <button 
                onClick={handleRefresh}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                disabled={refreshing}
              >
                <span className={`${refreshing ? 'animate-spin' : ''}`}>⟳</span>
                Refresh
              </button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Date Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">DATE RANGE</label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={filters.dateFilter}
                    onChange={(e) => handleFilterChange('dateFilter', e.target.value)}
                  >
                    {dateFilterOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  {filters.dateFilter && (
                    <small className="text-gray-500 block mt-1">{getDateFilterDisplayText()}</small>
                  )}
                </div>

                {/* Owner Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">OWNER</label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    <div className="mt-2 flex flex-wrap gap-1">
                      {filters.owner.map(owner => (
                        <span key={owner} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                          {owner}
                          <button 
                            type="button" 
                            className="ml-1 text-blue-600 hover:text-blue-800"
                            onClick={() => handleFilterChange('owner', owner)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">STATUS</label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value=""
                    onChange={(e) => e.target.value && handleFilterChange('status', e.target.value)}
                  >
                    <option value="">Select Status...</option>
                    {filterOptions.statuses.map(status => (
                      <option key={status} value={status} disabled={filters.status.includes(status)}>
                        {status} {filters.status.includes(status) ? '✓' : ''}
                      </option>
                    ))}
                  </select>
                  {filters.status.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {filters.status.map(status => (
                        <span key={status} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                          {status}
                          <button 
                            type="button" 
                            className="ml-1 text-green-600 hover:text-green-800"
                            onClick={() => handleFilterChange('status', status)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Country Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">COUNTRY</label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    <div className="mt-2 flex flex-wrap gap-1">
                      {filters.country.map(country => (
                        <span key={country} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                          {country}
                          <button 
                            type="button" 
                            className="ml-1 text-purple-600 hover:text-purple-800"
                            onClick={() => handleFilterChange('country', country)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Analytics Country Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">FOCUS COUNTRIES FOR ANALYTICS:</label>
                <div className="flex flex-wrap gap-2">
                  {priorityCountries.map(country => (
                    <button
                      key={country}
                      type="button"
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        analyticsCountryFilter.includes(country) 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      onClick={() => handleAnalyticsCountryFilter(country)}
                    >
                      {country} ({globalAnalytics?.priorityCountries?.[country] || 0})
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Date Range */}
              {showCustomDatePicker && (
                <div className="bg-white p-4 border border-gray-200 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">START DATE</label>
                      <input
                        type="date"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={filters.startDate ? filters.startDate.split('T')[0] : ''}
                        onChange={(e) => {
                          const date = e.target.value ? `${e.target.value}T00:00:00.000Z` : '';
                          handleCustomDateChange('startDate', date);
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">END DATE</label>
                      <input
                        type="date"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={filters.endDate ? filters.endDate.split('T')[0] : ''}
                        onChange={(e) => {
                          const date = e.target.value ? `${e.target.value}T23:59:59.999Z` : '';
                          handleCustomDateChange('endDate', date);
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeFiltersCount > 0 && (
                <div>
                  <button 
                    onClick={clearFilters}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Contacts</p>
                <p className="text-3xl font-bold text-blue-600">{globalAnalytics?.totalContacts?.toLocaleString() || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <span className="text-2xl">👥</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Leads</p>
                <p className="text-3xl font-bold text-green-600">{globalAnalytics?.activeLeadCount?.toLocaleString() || 0}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <span className="text-2xl">✅</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Response Rate</p>
                <p className="text-3xl font-bold text-purple-600">{globalAnalytics?.responseRate || '0.0'}%</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <span className="text-2xl">📈</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Touchpoints</p>
                <p className="text-3xl font-bold text-orange-600">{globalAnalytics?.avgTouchpoints || '0.0'}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <span className="text-2xl">🎯</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contacts by Owner Bar Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📊 Contacts by Owner</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={ownerData?.slice(0, 10) || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="owner" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
                          <p className="font-semibold">{data.fullOwner}</p>
                          <p className="text-blue-600">Total: {data.totalContacts}</p>
                          <p className="text-green-600">Active: {data.activeContacts}</p>
                          <p className="text-red-600">Inactive: {data.inactiveContacts}</p>
                          <p className="text-purple-600">Response Rate: {data.responseRate}%</p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Legend />
                  <Bar dataKey="totalContacts" fill={COLORS.primary} name="Total Contacts" />
                  <Bar dataKey="activeContacts" fill={COLORS.success} name="Active" />
                  <Bar dataKey="inactiveContacts" fill={COLORS.danger} name="Inactive" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Performance Metrics by Owner */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📈 Performance by Owner</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ownerData?.slice(0, 8) || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="owner" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
                          <p className="font-semibold">{data.fullOwner}</p>
                          <p className="text-blue-600">Avg Touchpoints: {data.avgTouchpoints}</p>
                          <p className="text-green-600">Avg Emails: {data.avgEmails}</p>
                          <p className="text-orange-600">Avg Calls: {data.avgCalls}</p>
                          <p className="text-purple-600">Response Rate: {data.responseRate}%</p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Legend />
                  <Line type="monotone" dataKey="avgTouchpoints" stroke={COLORS.primary} name="Avg Touchpoints" strokeWidth={2} />
                  <Line type="monotone" dataKey="responseRate" stroke={COLORS.success} name="Response Rate %" strokeWidth={2} />
                  <Line type="monotone" dataKey="avgEmails" stroke={COLORS.warning} name="Avg Emails" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Categories Pie Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">🏢 Contact Categories</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {(categoryData || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Countries Distribution */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">🌍 Top Countries</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={countryData?.slice(0, 6) || []} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={80} />
                  <Tooltip content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
                          <p className="font-semibold">{data.fullName}</p>
                          <p className="text-blue-600">Contacts: {data.value}</p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Bar dataKey="value" fill={COLORS.info} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Lead Levels */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">🌡️ Lead Levels</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leadLevelData || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {(leadLevelData || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Timing Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sample Timing by Owner */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📊 Avg Sample Timing by Owner (Hours)</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ownerData?.filter(d => d.avgSampleTiming > 0).slice(0, 8) || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="owner" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
                          <p className="font-semibold">{data.fullOwner}</p>
                          <p className="text-orange-600">Avg Sample Timing: {data.avgSampleTiming} hours</p>
                          <p className="text-blue-600">Total Contacts: {data.totalContacts}</p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Bar dataKey="avgSampleTiming" fill={COLORS.warning} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* First Call Timing by Owner */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📞 Avg First Call Timing by Owner (Minutes)</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ownerData?.filter(d => d.avgFirstCallTiming > 0).slice(0, 8) || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="owner" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
                          <p className="font-semibold">{data.fullOwner}</p>
                          <p className="text-purple-600">Avg First Call: {data.avgFirstCallTiming} minutes</p>
                          <p className="text-blue-600">Total Contacts: {data.totalContacts}</p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Bar dataKey="avgFirstCallTiming" fill={COLORS.purple} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Owner Detailed Table */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">👥 Detailed Owner Performance</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Corporate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generic</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Touchpoints</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Response Rate</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(ownerData || []).map((owner, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{owner.fullOwner}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{owner.totalContacts}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {owner.activeContacts}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{owner.corporate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{owner.generic}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{owner.avgTouchpoints}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        parseFloat(owner.responseRate) > 10 ? 'bg-green-100 text-green-800' :
                        parseFloat(owner.responseRate) > 5 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {owner.responseRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sales;