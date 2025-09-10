import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom'; 
import '../styles/freshworksleads.css';
import "../styles/conversations-modal.css";

const FreshworksLeads = ({ initialFilters = {}, token }) => {
  const location = useLocation(); 
  const navigate = useNavigate(); 
  const [contacts, setContacts] = useState([]);
  const [sampleStatuses, setSampleStatuses] = useState({}); 
  const [sampleRequestLoading, setSampleRequestLoading] = useState(false);

  const [analytics, setAnalytics] = useState({
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
    avgConnectedCallDuration: '0', 
    samplesSentCount: 0,
    firstCallsCount: 0, 
    countryBreakdown: {},
    territoryBreakdown: {},
    activeLeadCount: 0,
    leadLevelBreakdown: {},
    contactCategoryBreakdown: {},
    priorityCountries: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [expandedThreads, setExpandedThreads] = useState(new Set());
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
  const [showColumnCustomizer, setShowColumnCustomizer] = useState(false);
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [currentSampleContact, setCurrentSampleContact] = useState(null);
  const [analyticsCountryFilter, setAnalyticsCountryFilter] = useState([]);
  const priorityCountries = [
    'United States', 'United Kingdom', 'France', 'Italy', 
    'Germany', 'Spain', 'Japan', 'Korea, Republic of'
  ];
  
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
    request_sample: { label: 'Request Sample', width: 140, visible: true },
    email: { label: 'Email', width: 200, visible: false },
    country: { label: 'Country', width: 120, visible: true },
    territory: { label: 'Territory', width: 120, visible: false },
    last_contacted_mode: { label: 'Contact Mode', width: 130, visible: false },
    contact_category: { label: 'Contact Category', width: 140, visible: false },
    custom_tags: { label: 'Custom Tags', width: 140, visible: false },
    is_active: { label: 'Active Status', width: 120, visible: false },
    view_conversations: { label: 'View Conversations', width: 150, visible: true }, 
    sample_sent_timing: { label: 'Sample Sent (Hours)', width: 150, visible: false },
    first_call_timing: { label: 'First Call (Minutes)', width: 150, visible: false }, 
    last_email_received: { label: 'Last Email Received', width: 160, visible: false },
    first_call_date: { label: 'First Call Date', width: 160, visible: false }, 
    total_touchpoints: { label: 'Total Touchpoints', width: 140, visible: false },
    outgoing_emails: { label: 'Outgoing Emails', width: 130, visible: false },
    incoming_emails: { label: 'Incoming Emails', width: 130, visible: false },
    outgoing_calls: { label: 'Outgoing Calls', width: 130, visible: false },
    connected_calls: { label: 'Connected Calls', width: 130, visible: false },
    not_connected_calls: { label: 'Not Connected Calls', width: 150, visible: false },
    avg_connected_call_duration: { label: 'Avg Connected Call Duration', width: 180, visible: false }
  });
  
  const [columnConfig, setColumnConfig] = useState(availableColumns);
  const [columnOrder, setColumnOrder] = useState(Object.keys(availableColumns));
  const [draggedColumn, setDraggedColumn] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [searchColumns, setSearchColumns] = useState('');
  
  const [tempColumnConfig, setTempColumnConfig] = useState(availableColumns);
  const [tempColumnOrder, setTempColumnOrder] = useState(Object.keys(availableColumns));

  const filtersInitialized = useRef(false);
  const API_BASE_URL = `${process.env.REACT_APP_API_BASE_URL || 'https://www.theskyquestt.org'}/api`;
  
  // Conversations modal state
  const [showConversationsModal, setShowConversationsModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationsError, setConversationsError] = useState(null);
  const [expandedEmails, setExpandedEmails] = useState(new Set());
  const [conversationFilter, setConversationFilter] = useState('all'); 
  const [clientRequirementFiles, setClientRequirementFiles] = useState([]);
  const clientRequirementFileInputRef = useRef(null);
  const [sampleForm, setSampleForm] = useState({
    querySource: 'SQ',
    priority: 'medium',
    salesRequirement: '',
    dueDate: ''
  });

  const getAuthHeaders = () => {
    if (!token) {
      return { 'Content-Type': 'application/json' };
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const dateFilterOptions = [
    { value: '', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'week', label: 'Last 7 Days' },
    { value: 'month', label: 'Last 30 Days' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const fetchSampleStatuses = async (contactIds) => {
    if (!contactIds || contactIds.length === 0) {
      return;
    }

    try {
      
      const statusPromises = contactIds.map(async (contactId) => {
        try {
          const response = await fetch(`${API_BASE_URL}/samples/contact/${contactId}/status`, {
            headers: getAuthHeaders()
          });
          const data = await response.json();
          if (data.success && data.data.length > 0) {
            // Get the latest sample status
            const latestSample = data.data[0];
            console.log(`Sample status for contact ${contactId}:`, latestSample.status);
            return { contactId, status: latestSample.status, sampleId: latestSample.sampleId };
          }
          return { contactId, status: null, sampleId: null };
        } catch (error) {
          console.error(`Error fetching sample status for contact ${contactId}:`, error);
          return { contactId, status: null, sampleId: null };
        }
      });

      const statuses = await Promise.all(statusPromises);
      const statusMap = {};
      statuses.forEach(({ contactId, status, sampleId }) => {
        if (status) {
          statusMap[contactId] = { status, sampleId };
        }
      });
      
      
      setSampleStatuses(prev => {
        const merged = { ...prev };
        Object.keys(statusMap).forEach(contactId => {
          if (!merged[contactId] || merged[contactId].status !== statusMap[contactId].status) {
            merged[contactId] = statusMap[contactId];
          }
        });
        return merged;
      });
    } catch (error) {
      console.error('Error fetching sample statuses:', error);
    }
  };
  const handleRequestSample = async (contact) => {
    try {
      const existingStatus = sampleStatuses[contact.id];
      if (existingStatus && existingStatus.status) {
        if (existingStatus.status === 'done') {
          alert(`Sample already completed for ${contact.display_name}`);
        } else {
          alert(`Sample already ${existingStatus.status} for ${contact.display_name}`);
        }
        return;
      }

      setCurrentSampleContact(contact);
      setShowSampleModal(true);
    } catch (error) {
      console.error('Error checking sample status:', error);
    }
  };

const handleSampleRequestSubmit = async () => {
  if (sampleRequestLoading) return;
  
  try {
    setSampleRequestLoading(true); 
    
    const requestData = {
      contactId: currentSampleContact.id,
      reportName: currentSampleContact.market_name || 'Unknown Report',
      querySource: sampleForm.querySource,
      reportIndustry: currentSampleContact.custom_field?.cf_industry || 'Unknown Industry',
      salesPerson: currentSampleContact.owner_name || 'Unassigned',
      clientCompany: currentSampleContact.company || 'Unknown Company',
      clientDesignation: currentSampleContact.job_title || 'Unknown Designation',
      clientCountry: currentSampleContact.country || 'Unknown Country',
      salesRequirement: sampleForm.salesRequirement || '',
      priority: sampleForm.priority,
      dueDate: sampleForm.dueDate || null
    };

    const response = await fetch(`${API_BASE_URL}/samples`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(requestData)
    });

    const data = await response.json();

    if (data.success) {
      if (clientRequirementFiles && clientRequirementFiles.length > 0) {
        try {
          const formData = new FormData();
          
          Array.from(clientRequirementFiles).forEach(file => {
            formData.append('requirementFiles', file);
          });

          const fileUploadResponse = await fetch(`${API_BASE_URL}/samples/${data.data._id}/upload-requirements`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: formData
          });

          const fileUploadData = await fileUploadResponse.json();
          
          if (!fileUploadData.success) {
            console.error('File upload failed:', fileUploadData);
            alert(`Sample created successfully: ${data.data.sampleId}, but file upload failed: ${fileUploadData.message}`);
          } else {
            console.log('Files uploaded successfully:', fileUploadData);
          }
        } catch (fileError) {
          console.error('Error uploading requirement files:', fileError);
          alert(`Sample created successfully: ${data.data.sampleId}, but file upload failed.`);
        }
      }
      const contactId = currentSampleContact.id;
      setSampleStatuses(prev => ({
        ...prev,
        [contactId]: { 
          status: 'requested', 
          sampleId: data.data.sampleId 
        }
      }));

      alert(`Sample request created successfully: ${data.data.sampleId}`);
      
      setShowSampleModal(false);
      setSampleForm({
        querySource: 'SQ',
        priority: 'medium',
        salesRequirement: '', 
        dueDate: ''
      });
      setClientRequirementFiles([]);
      if (clientRequirementFileInputRef.current) {
        clientRequirementFileInputRef.current.value = '';
      }
      setCurrentSampleContact(null);

      setTimeout(async () => {
        try {
          const statusResponse = await fetch(`${API_BASE_URL}/samples/contact/${contactId}/status`, {
            headers: getAuthHeaders()
          });
          const statusData = await statusResponse.json();
          if (statusData.success && statusData.data.length > 0) {
            const latestSample = statusData.data[0];
            setSampleStatuses(prev => ({
              ...prev,
              [contactId]: { 
                status: latestSample.status, 
                sampleId: latestSample.sampleId 
              }
            }));
          }
        } catch (error) {
          console.error('Error refetching sample status:', error);
        }
      }, 1000); 

    } else {
      alert(`Error creating sample request: ${data.message}`);
    }
  } catch (error) {
    console.error('Error creating sample request:', error);
    alert('Error creating sample request. Please try again.');
  } finally {
    setSampleRequestLoading(false);
  }
};

  const getSampleButtonDisplay = (contact) => {
    const sampleStatus = sampleStatuses[contact.id];
    
    
    if (!sampleStatus || !sampleStatus.status) {
      return {
        text: '📋 Request Sample',
        className: 'btn btn-sm btn-primary request-sample-btn',
        disabled: false
      };
    }

    switch (sampleStatus.status) {
      case 'requested':
        return {
          text: '📋 Requested',
          className: 'btn btn-sm btn-warning sample-status-btn',
          disabled: true
        };
      case 'allocated':
        return {
          text: '👥 Allocated',
          className: 'btn btn-sm btn-info sample-status-btn',
          disabled: true
        };
      case 'in_progress':
        return {
          text: '🔄 In Progress',
          className: 'btn btn-sm btn-info sample-status-btn',
          disabled: true
        };
      case 'done':
        return {
          text: '✅ Done',
          className: 'btn btn-sm btn-success sample-status-btn',
          disabled: true
        };
      case 'cancelled':
        return {
          text: '❌ Cancelled',
          className: 'btn btn-sm btn-secondary sample-status-btn',
          disabled: true
        };
      default:
        console.warn(`Unknown sample status: ${sampleStatus.status} for contact ${contact.id}`);
        return {
          text: '📋 Request Sample',
          className: 'btn btn-sm btn-primary request-sample-btn',
          disabled: false
        };
    }
  };

  const calculateConversationMetrics = (contact, conversations) => {
    if (!conversations || conversations.length === 0) {
      return {
        sampleSentTiming: null,
        needsAction: false,
        hasReplied: false,
        lastInteractionDays: null,
        ownerName: contact.owner_name || 'Unassigned',
        primaryUser: null
      };
    }

    let sampleSentTiming = null;
    if (contact.created_at && contact.crm_analytics?.first_email_with_attachment?.date) {
      const createdDate = new Date(contact.created_at);
      const sampleDate = new Date(contact.crm_analytics.first_email_with_attachment.date);
      const hoursDelay = (sampleDate - createdDate) / (1000 * 60 * 60);
      if (hoursDelay >= 0) {
        sampleSentTiming = hoursDelay.toFixed(1);
      }
    }

    const hasReplied = conversations.some(conv => 
      conv.type === 'email_thread' && 
      conv.messages?.some(msg => msg.direction === 'incoming')
    );

    const emailThreads = conversations.filter(conv => conv.type === 'email_thread');
    let needsAction = false;
    
    if (emailThreads.length > 0) {
      const latestThread = emailThreads.sort((a, b) => 
        new Date(b.last_message_date) - new Date(a.last_message_date)
      )[0];
      
      if (latestThread.messages && latestThread.messages.length > 0) {
        const latestMessage = latestThread.messages.sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        )[0];
        
        if (latestMessage.direction === 'outgoing') {
          const daysSinceLastMessage = (new Date() - new Date(latestMessage.timestamp)) / (1000 * 60 * 60 * 24);
          needsAction = daysSinceLastMessage > 2; 
        }
      }
    }

    // Calculate days since last interaction
    let lastInteractionDays = null;
    const allDates = conversations.flatMap(conv => {
      if (conv.type === 'email_thread') {
        return conv.messages?.map(msg => msg.timestamp) || [];
      }
      return [conv.created_at];
    }).filter(date => date);

    if (allDates.length > 0) {
      const latestDate = new Date(Math.max(...allDates.map(date => new Date(date))));
      lastInteractionDays = Math.floor((new Date() - latestDate) / (1000 * 60 * 60 * 24));
    }

    const primaryUser = contact.crm_analytics?.primary_user || null;
    return {
      sampleSentTiming,
      needsAction,
      hasReplied,
      lastInteractionDays,
      ownerName: contact.owner_name || 'Unassigned',
      primaryUser
    };
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

  const handleViewConversations = async (contact) => {
    try {
      setSelectedContact(contact);
      setShowConversationsModal(true);
      setConversationsLoading(true);
      setConversationsError(null);
      setExpandedEmails(new Set());
      setExpandedThreads(new Set()); 
      setConversationFilter('all');

      console.log('Fetching conversations for contact:', contact);

      const response = await fetch(`${API_BASE_URL}/contacts/${contact.id}/conversations?includeConversations=true`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setConversations(data.data || []);
      } else {
        setConversationsError(data.message || 'Error fetching conversations');
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setConversationsError('Failed to fetch conversations');
    } finally {
      setConversationsLoading(false);
    }
  };

  // Filter conversations based on type
  const getFilteredConversations = () => {
    if (conversationFilter === 'all') {
      return conversations;
    }
    return conversations.filter(conv => conv.type === conversationFilter);
  };

  // Handle navigation state from Sale.js
  useEffect(() => {
    if (location.state?.filters && location.state?.fromAnalytics && !filtersInitialized.current) {
      console.log('Applying filters from navigation:', location.state.filters);
      setFilters(prev => ({
        ...prev,
        ...location.state.filters
      }));
      setShowFilters(true);
      filtersInitialized.current = true;
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  // Apply initial filters 
  useEffect(() => {
    if (initialFilters && Object.keys(initialFilters).length > 0) {
      console.log('Applying initial filters:', initialFilters);
      setFilters(prev => ({ 
        ...prev, 
        ...initialFilters 
      }));
      setShowFilters(true);
      filtersInitialized.current = true;
    }
  }, [initialFilters]);

  // Helper function to get date ranges
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
    if (token) {
      fetchContacts();
    }
  }, [currentPage, searchTerm, sortConfig, filters, analyticsCountryFilter, token]);

  useEffect(() => {
    if (token) {
      fetchFilterOptions();
    }
  }, [token]);

  useEffect(() => {
    const savedConfig = localStorage.getItem('freshworks-column-config');
    const savedOrder = localStorage.getItem('freshworks-column-order');
    
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        const mergedConfig = {};
        Object.keys(availableColumns).forEach(key => {
          mergedConfig[key] = {
            ...availableColumns[key],
            ...(parsed[key] || {})
          };
        });
        setColumnConfig(mergedConfig);
        setTempColumnConfig(mergedConfig);
      } catch (e) {
        console.error('Failed to parse saved column config:', e);
      }
    }
    
    if (savedOrder) {
      try {
        const parsedOrder = JSON.parse(savedOrder);
        const validOrder = parsedOrder.filter(key => availableColumns[key]);
        Object.keys(availableColumns).forEach(key => {
          if (!validOrder.includes(key)) {
            validOrder.push(key);
          }
        });
        setColumnOrder(validOrder);
        setTempColumnOrder(validOrder);
      } catch (e) {
        console.error('Failed to parse saved column order:', e);
      }
    }
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      
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
      const response = await fetch(`${API_BASE_URL}/contacts/table?${params}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

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
          avgFirstCallMinutes: '0.0', 
          clientEmailsReceived: 0,
          avgCallDuration: '0',
          avgConnectedCallDuration: '0',
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
        setTotalPages(data.pagination.totalPages);
        setTotalCount(data.pagination.totalCount);
        if (data.data && data.data.length > 0) {
          const contactIds = data.data.map(contact => contact.id);
          await fetchSampleStatuses(contactIds);
        }
      } else {
        setError(data.message || 'Error fetching contacts');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to fetch contacts. Please check your authentication.');
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
        console.log('Filter options received:', data.data);
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

  // Handle multi-select filter changes
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
      
      console.log(`Selected ${dateType}:`, {
        inputValue: value,
        localDate: selectedDate.toLocaleString(),
        isoString: selectedDate.toISOString()
      });
      
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

  const getConversationCounts = () => {
    const emailMessageCount = conversations.reduce((total, conversation) => {
      if (conversation.type === 'email_thread') {
        return total + (conversation.messages?.length || 0);
      }
      return total;
    }, 0);
    
    const phoneCount = conversations.filter(c => c.type === 'phone').length;
    const noteCount = conversations.filter(c => c.type === 'note').length;
    
    return { 
      emailCount: emailMessageCount,
      phoneCount, 
      noteCount, 
      total: emailMessageCount + phoneCount + noteCount 
    };
  };

  //  function to expand/collapse all emails in a thread
  const toggleAllEmailsInThread = (conversationId) => {
    const conversation = conversations.find(c => c.conversation_id === conversationId);
    if (!conversation || conversation.type !== 'email_thread' || !conversation.messages) return;
    
    const allMessageKeys = conversation.messages.map((message, index) => 
      `${conversationId}-${message.message_id || index}`
    );
    
    const hasExpandedMessages = allMessageKeys.some(key => expandedEmails.has(key));
    
    setExpandedEmails(prev => {
      const newSet = new Set(prev);
      
      if (hasExpandedMessages) {
        allMessageKeys.forEach(key => newSet.delete(key));
      } else {
        allMessageKeys.forEach(key => newSet.add(key));
      }
      
      return newSet;
    });
  };

  // Function to check if all emails in a thread are expanded
  const areAllEmailsExpanded = (conversationId) => {
    const conversation = conversations.find(c => c.conversation_id === conversationId);
    if (!conversation || conversation.type !== 'email_thread' || !conversation.messages) return false;
    
    const allMessageKeys = conversation.messages.map((message, index) => 
      `${conversationId}-${message.message_id || index}`
    );
    
    return allMessageKeys.every(key => expandedEmails.has(key));
  };

  const clearFilters = () => {
    setFilters({ 
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
    setSearchTerm('');
    setCurrentPage(1);
    setShowCustomDatePicker(false);
    setAnalyticsCountryFilter([]);
    filtersInitialized.current = false;
  };

  const handleAnalyticsCountryFilter = (country) => {
    console.log('Analytics country filter clicked:', country);
    setAnalyticsCountryFilter(prev => {
      const newFilter = prev.includes(country) 
        ? prev.filter(c => c !== country)
        : [...prev, country];
      
      console.log('New analytics country filter:', newFilter);
      return newFilter;
    });
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

  const getSelectedFiltersText = (filterName) => {
    const selected = filters[filterName] || [];
    if (selected.length === 0) return '';
    if (selected.length === 1) return selected[0];
    return `${selected.length} selected`;
  };

  const getAllContactCategoryValues = () => {
    if (analytics.contactCategoryBreakdown) {
      return Object.keys(analytics.contactCategoryBreakdown);
    }
    return [];
  };

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

  const handleMouseDown = (e, columnKey) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startWidth = columnConfig[columnKey].width;
    
    const handleMouseMove = (moveEvent) => {
      const diff = moveEvent.clientX - startX;
      const newWidth = Math.max(80, startWidth + diff);
      
      setColumnConfig(prev => {
        const updated = {
          ...prev,
          [columnKey]: {
            ...prev[columnKey],
            width: newWidth
          }
        };
        localStorage.setItem('freshworks-column-config', JSON.stringify(updated));
        return updated;
      });
    };

    const handleMouseUp = () => {
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

  const truncateContent = (content, maxLength = 200) => {
    if (!content || content.length <= maxLength) return content;
    
    let truncateIndex = maxLength;
    while (truncateIndex > 0 && content[truncateIndex] !== ' ') {
      truncateIndex--;
    }
    
    if (truncateIndex === 0) truncateIndex = maxLength;
    
    return content.substring(0, truncateIndex) + '...';
  };

  const renderCellContent = (columnKey, contact) => {
    if (columnKey === 'request_sample') {
      const buttonDisplay = getSampleButtonDisplay(contact);
      return (
        <button
          className={buttonDisplay.className}
          onClick={() => !buttonDisplay.disabled && handleRequestSample(contact)}
          title={buttonDisplay.disabled ? `Sample status: ${buttonDisplay.text.substring(2)}` : `Request sample for ${contact.display_name}`}
          disabled={buttonDisplay.disabled}
          style={{
            fontSize: '0.75rem',
            padding: '0.25rem 0.5rem',
            whiteSpace: 'nowrap',
            cursor: buttonDisplay.disabled ? 'not-allowed' : 'pointer'
          }}
        >
          {buttonDisplay.text}
        </button>
      );
    }
    if (columnKey === 'view_conversations') {
      return (
        <button
          className="btn btn-sm btn-info view-conversations-btn"
          onClick={() => handleViewConversations(contact)}
          title={`View conversations for ${contact.display_name}`}
          style={{
            fontSize: '0.75rem',
            padding: '0.25rem 0.5rem',
            whiteSpace: 'nowrap'
          }}
        >
          💬 View Conversations
        </button>
      );
    }
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
          if (contact.created_at && contact.first_email_with_attachment) {
            const createdDate = new Date(contact.created_at);
            const sampleDate = new Date(contact.first_email_with_attachment);
            const hoursDelay = (sampleDate - createdDate) / (1000 * 60 * 60);
            return hoursDelay > 0 ? `${hoursDelay.toFixed(1)}h` : '-';
          }
          return '-';
        
        case 'first_call_timing':
          if (contact.first_call_timing) {
            return `${contact.first_call_timing}m`;
          }
          return '-';
        
        case 'last_email_received':
          return formatDateTime(contact.last_email_received);
        case 'first_email_with_attachment':
          return formatDateTime(contact.first_email_with_attachment);
        case 'first_call_date': 
          return formatDateTime(contact.first_call_date);
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
        case 'avg_connected_call_duration':
          return contact.avg_connected_call_duration_formatted || formatDuration(contact.avg_connected_call_duration || 0);
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
      case 'first_call_date': 
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

      case 'first_call_timing':
        return (
          <span 
            className={`first-call-timing-cell ${displayValue === '-' ? 'text-muted' : 'text-warning fw-bold'}`}
            title={displayValue === '-' ? 'No call made yet' : `First call made ${displayValue} after contact creation`}
          >
            {displayValue}
          </span>
        );
      
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
      
      case 'avg_connected_call_duration':
        return (
          <span className="duration-cell" title={`Average connected call duration: ${displayValue}`}>
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

  // Show error if no token
  if (!token) {
    return (
      <div className="freshworks-leads-container">
        <div className="dashboard-card">
          <div className="dashboard-header">
            <h1 className="dashboard-title">Leads Management</h1>
          </div>
          <div className="empty-state">
            <div className="empty-icon">
              <h5 className="text-danger">🔒 Authentication Required</h5>
            </div>
            <p className="text-muted">Please log in to view leads data.</p>
          </div>
        </div>
      </div>
    );
  }

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
          <button onClick={handleRefresh} className="btn btn-outline-danger">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Calculate active filters count
  const activeFiltersCount = Object.values(filters).filter((value, index) => {
    const keys = Object.keys(filters);
    const key = keys[index];
    if ((key === 'startDate' || key === 'endDate') && filters.dateFilter) {
      return false;
    }
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
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
                {/* Show indicator if filters were applied from navigation */}
                {location.state?.fromAnalytics && (
                  <span className="badge bg-info ms-2">Filtered from Analytics</span>
                )}
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

                {/* Multi-Select Filters */}
                <div className="col-md-3">
                  <label className="form-label fw-bold text-muted small">STATUS</label>
                  <select
                    className="form-select"
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
                    <div className="mt-1">
                      {filters.status.map(status => (
                        <span key={status} className="badge bg-primary me-1 mb-1">
                          {status}
                          <button 
                            type="button" 
                            className="btn-close btn-close-white ms-1" 
                            style={{fontSize: '0.7rem'}}
                            onClick={() => handleFilterChange('status', status)}
                          ></button>
                        </span>
                      ))}
                    </div>
                  )}
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

              {/* Custom Date Range Picker */}
              {showCustomDatePicker && (
              <div className="custom-date-picker">
                <div className="date-picker-row">
                  <div className="date-picker-group">
                    <label className="filter-label">START DATE</label>
                    <input 
                      type="date" 
                      value={
                        filters.startDate 
                          ? new Date(filters.startDate).toLocaleDateString('en-CA')
                          : ''
                      } 
                      onChange={(e) => handleCustomDateChange('startDate', e.target.value)} 
                      className="filter-select" 
                    />
                  </div>
                  <div className="date-picker-group">
                    <label className="filter-label">END DATE</label>
                    <input 
                      type="date" 
                      value={
                        filters.endDate 
                          ? new Date(filters.endDate).toLocaleDateString('en-CA')
                          : ''
                      } 
                      onChange={(e) => handleCustomDateChange('endDate', e.target.value)} 
                      className="filter-select" 
                    />
                  </div>
                </div>
              </div>
            )}

              {/* Additional Multi-Select Filters */}
              <div className="row g-3 mt-2">
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
                  <label className="form-label fw-bold text-muted small">LEAD LEVEL</label>
                  <select
                    className="form-select"
                    value=""
                    onChange={(e) => e.target.value && handleFilterChange('leadLevel', e.target.value)}
                  >
                    <option value="">Select Lead Level...</option>
                    {filterOptions.leadLevels.map(level => (
                      <option key={level} value={level} disabled={filters.leadLevel.includes(level)}>
                        {level} {filters.leadLevel.includes(level) ? '✓' : ''}
                      </option>
                    ))}
                  </select>
                  {filters.leadLevel.length > 0 && (
                    <div className="mt-1">
                      {filters.leadLevel.map(level => (
                        <span key={level} className="badge bg-danger me-1 mb-1">
                          {level}
                          <button 
                            type="button" 
                            className="btn-close btn-close-white ms-1" 
                            style={{fontSize: '0.7rem'}}
                            onClick={() => handleFilterChange('leadLevel', level)}
                          ></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="col-md-3">
                  <label className="form-label fw-bold text-muted small">CONTACT CATEGORY</label>
                  <select
                    className="form-select"
                    value=""
                    onChange={(e) => e.target.value && handleFilterChange('contactCategory', e.target.value)}
                  >
                    <option value="">Select Category...</option>
                    {filterOptions.contactCategories.map(category => (
                      <option key={category} value={category} disabled={filters.contactCategory.includes(category)}>
                        {category} {filters.contactCategory.includes(category) ? '✓' : ''}
                      </option>
                    ))}
                  </select>
                  {filters.contactCategory.length > 0 && (
                    <div className="mt-1">
                      {filters.contactCategory.map(category => (
                        <span key={category} className="badge bg-success me-1 mb-1">
                          {category}
                          <button 
                            type="button" 
                            className="btn-close btn-close-white ms-1" 
                            style={{fontSize: '0.7rem'}}
                            onClick={() => handleFilterChange('contactCategory', category)}
                          ></button>
                        </span>
                      ))}
                    </div>
                  )}
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

        {/* Analytics Section */}
        <div className={`analytics-section bg-light border rounded p-3 mb-3 ${loading ? 'loading' : ''}`}>
          <div className="row g-3">
            <div className="col-md-12 mb-2">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="fw-bold text-primary mb-3">
                  📊 Analytics for All Filtered Results ({analytics.totalContacts?.toLocaleString() || 0} contacts)
                  {loading && <span className="spinner-border spinner-border-sm ms-2" role="status"></span>}
                </h6>
                
                {/* Analytics Country Filter */}
                <div className="analytics-country-filter">
                  <label className="form-label fw-bold text-muted small me-2">FOCUS COUNTRIES:</label>
                  <div className="btn-group flex-wrap" role="group">
                    {priorityCountries.map(country => (
                      <button
                        key={country}
                        type="button"
                        className={`btn btn-sm ${analyticsCountryFilter.includes(country) ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => handleAnalyticsCountryFilter(country)}
                      >
                        {country} {analytics.priorityCountries?.[country] ? `(${analytics.priorityCountries[country]})` : '(0)'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* First Row - Core Metrics */}
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
              <div className="analytics-card bg-white p-3 rounded border" title="Number of active/responsive leads">
                <div className="d-flex align-items-center">
                  <div className="analytics-icon bg-success text-white rounded-circle p-2 me-3">
                    ✅
                  </div>
                  <div>
                    <div className="analytics-number text-success fw-bold fs-4">
                      {loading ? '...' : (analytics.activeLeadCount || 0).toLocaleString()}
                    </div>
                    <div className="analytics-label text-muted small">Active Leads</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-3 col-md-6 col-sm-6">
              <div className="analytics-card bg-white p-3 rounded border" title="Number of unique countries represented">
                <div className="d-flex align-items-center">
                  <div className="analytics-icon bg-info text-white rounded-circle p-2 me-3">
                    🌍
                  </div>
                  <div>
                    <div className="analytics-number text-info fw-bold fs-4">
                      {loading ? '...' : Object.keys(analytics.countryBreakdown || {}).length}
                    </div>
                    <div className="analytics-label text-muted small">Countries</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-3 col-md-6 col-sm-6">
              <div className="analytics-card bg-white p-3 rounded border" title={`Average minutes between contact creation and first call attempt (${analytics.firstCallsCount || 0} calls made)`}>
                <div className="d-flex align-items-center">
                  <div className="analytics-icon bg-warning text-white rounded-circle p-2 me-3">
                    📞
                  </div>
                  <div>
                    <div className="analytics-number text-warning fw-bold fs-4">
                      {loading ? '...' : `${analytics.avgFirstCallMinutes || '0.0'}m`}
                    </div>
                    <div className="analytics-label text-muted small">Avg First Call Timing</div>
                  </div>
                </div>
              </div>
            </div>
            {/* Corporate contacts count card */}
            <div className="col-lg-3 col-md-6 col-sm-6">
              <div className="analytics-card bg-white p-3 rounded border" title={`Corporate contacts. Available categories: ${getAllContactCategoryValues().join(', ')}`}>
                <div className="d-flex align-items-center">
                  <div className="analytics-icon bg-primary text-white rounded-circle p-2 me-3">
                    🏢
                  </div>
                  <div>
                    <div className="analytics-number text-primary fw-bold fs-4">
                      {loading ? '...' : (() => {
                        const breakdown = analytics.contactCategoryBreakdown || {};
                        console.log('Contact category breakdown for Corporate:', breakdown);
                        
                        const corporate = breakdown['Corporate'] || breakdown['corporate'] || 
                                      breakdown['CORPORATE'] || breakdown['CORP'] || 
                                      breakdown['Corp'] || 0;
                        
                        console.log('Corporate count found:', corporate);
                        return corporate.toLocaleString();
                      })()}
                    </div>
                    <div className="analytics-label text-muted small">Corporate</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Generic contacts count card */}
            <div className="col-lg-3 col-md-6 col-sm-6">
              <div className="analytics-card bg-white p-3 rounded border" title="Generic contacts count">
                <div className="d-flex align-items-center">
                  <div className="analytics-icon bg-success text-white rounded-circle p-2 me-3">
                    📧
                  </div>
                  <div>
                    <div className="analytics-number text-success fw-bold fs-4">
                      {loading ? '...' : (() => {
                        const breakdown = analytics.contactCategoryBreakdown || {};
                        console.log('Contact category breakdown for Generic:', breakdown);
                        
                        const generic = breakdown['Generic'] || breakdown['generic'] || 
                                      breakdown['GENERIC'] || breakdown['GEN'] || 
                                      breakdown['Gen'] || 0;
                        
                        console.log('Generic count found:', generic);
                        return generic.toLocaleString();
                      })()}
                    </div>
                    <div className="analytics-label text-muted small">Generic</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Average calls made per contact card */}
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

            {/* Average sample sent timing card */}
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

            {/* Average connected call duration card */}
            <div className="col-lg-3 col-md-6 col-sm-6">
              <div className="analytics-card bg-white p-3 rounded border" title="Average duration of connected calls only (excludes missed/unanswered calls)">
                <div className="d-flex align-items-center">
                  <div className="analytics-icon bg-danger text-white rounded-circle p-2 me-3">
                    ⏱️
                  </div>
                  <div>
                    <div className="analytics-number text-danger fw-bold fs-4">
                      {loading ? '...' : `${analytics.avgConnectedCallDuration || '0'}s`}
                    </div>
                    <div className="analytics-label text-muted small">Avg Connected Call Duration</div>
                  </div>
                </div>
              </div>
            </div>          
            {/* Additional metrics continue... */}
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
              <div className="analytics-card bg-white p-3 rounded border" title="Response rate percentage">
                <div className="d-flex align-items-center">
                  <div className="analytics-icon bg-secondary text-white rounded-circle p-2 me-3">
                    📈
                  </div>
                  <div>
                    <div className="analytics-number text-secondary fw-bold fs-4">
                      {loading ? '...' : `${analytics.responseRate || '0.0'}%`}
                    </div>
                    <div className="analytics-label text-muted small">Response Rate</div>
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
                      onClick={() => (columnKey !== 'request_sample' && columnKey !== 'view_conversations') && handleSort(columnKey)}
                      title={config.label}
                      style={{ cursor: (columnKey === 'request_sample' || columnKey === 'view_conversations') ? 'default' : 'pointer' }}
                    >
                      <span className="header-text">{config.label}</span>
                      {(columnKey !== 'request_sample' && columnKey !== 'view_conversations') && (
                        <span className="sort-icon">{getSortIcon(columnKey)}</span>
                      )}
                    </div>
                    {(columnKey !== 'request_sample' && columnKey !== 'view_conversations') && (
                      <div 
                        className="resize-handle"
                        onMouseDown={(e) => handleMouseDown(e, columnKey)}
                        onClick={(e) => e.stopPropagation()}
                        title="Drag to resize column"
                      />
                    )}
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
       {/* Sample Request Modal */}
      {showSampleModal && currentSampleContact && (
  <div className="modal-overlay" onClick={() => setShowSampleModal(false)}>
    <div className="modal-content sample-request-modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h3>Request Sample - {currentSampleContact.display_name}</h3>
        <button 
          onClick={() => setShowSampleModal(false)}
          className="close-button"
        >
          ✕
        </button>
      </div>
      <div className="modal-body">
        <div className="sample-form">
          {/* Contact Research Requirement - Read Only Section */}
          {currentSampleContact.custom_field?.cf_research_requirement && (
            <div className="contact-requirement-section" style={{
              border: '2px solid #17a2b8', 
              padding: '15px', 
              marginBottom: '20px', 
              backgroundColor: '#f0f9ff',
              borderRadius: '5px'
            }}>
              <label className="requirement-label" style={{fontWeight: 'bold', color: '#17a2b8', marginBottom: '10px', display: 'block'}}>
                📋 Contact Research Requirement (From Contact Profile):
              </label>
              
              <div className="contact-requirement-box" style={{
                padding: '12px',
                backgroundColor: '#ffffff',
                border: '1px solid #17a2b8',
                borderRadius: '4px',
                minHeight: '60px',
                maxHeight: '150px',
                overflowY: 'auto'
              }}>
                <p style={{margin: '0', fontSize: '14px', lineHeight: '1.4', whiteSpace: 'pre-line'}}>
                  {currentSampleContact.custom_field.cf_research_requirement}
                </p>
              </div>
              <small className="text-muted" style={{display: 'block', marginTop: '8px', fontSize: '12px', color: '#666'}}>
                This requirement is automatically captured from the contact's profile and cannot be edited here.
              </small>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Report Name:</label>
              <input 
                type="text" 
                value={currentSampleContact.market_name || currentSampleContact.custom_field?.cf_report_name || 'Unknown Report'} 
                disabled 
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Query Source:</label>
              <select
                value={sampleForm.querySource}
                onChange={(e) => setSampleForm(prev => ({ ...prev, querySource: e.target.value }))}
                className="form-control"
              >
                <option value="SQ">SQ</option>
                <option value="GII">GII</option>
              </select>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Industry:</label>
              <input 
                type="text" 
                value={currentSampleContact.custom_field?.cf_industry || 'Unknown Industry'} 
                disabled 
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Sales Person:</label>
              <input 
                type="text" 
                value={currentSampleContact.owner_name || 'Unassigned'} 
                disabled 
                className="form-control"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Client Company:</label>
              <input 
                type="text" 
                value={currentSampleContact.company || currentSampleContact.custom_field?.cf_company_name || 'Unknown Company'} 
                disabled 
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Client Designation:</label>
              <input 
                type="text" 
                value={currentSampleContact.job_title || 'Unknown Designation'} 
                disabled 
                className="form-control"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Client Country:</label>
              <input 
                type="text" 
                value={currentSampleContact.country || 'Unknown Country'} 
                disabled 
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Priority:</label>
              <select
                value={sampleForm.priority}
                onChange={(e) => setSampleForm(prev => ({ ...prev, priority: e.target.value }))}
                className="form-control"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          
          {/* Sales Requirement - Editable Section */}
          <div className="sales-requirement-section" style={{
            border: '2px solid #28a745', 
            padding: '15px', 
            marginBottom: '20px', 
            backgroundColor: '#f8fff9',
            borderRadius: '5px'
          }}>
            <div className="form-group full-width">
              <label className="requirement-label" style={{fontWeight: 'bold', color: '#28a745', marginBottom: '10px', display: 'block'}}>
                ✏️ Sales Requirement (Your Input - Optional ):
              </label>
              <textarea
                value={sampleForm.salesRequirement}
                onChange={(e) => setSampleForm(prev => ({ ...prev, salesRequirement: e.target.value }))}
                placeholder="Enter your specific requirement details for this sample request..."
                className="form-control sales-requirement-textarea"
                rows="4"
                style={{
                  border: '2px solid #28a745',
                  borderRadius: '4px',
                  padding: '10px',
                  resize: 'vertical',
                  minHeight: '100px'
                }}
              />
              <small className="form-help-text" style={{color: '#666', fontSize: '12px', marginTop: '5px', display: 'block'}}>
                Describe what the client needs, specific focus areas, or any special requirements for this sample.
              </small>
            </div>
            
            <div className="form-group full-width">
              <label className="requirement-label" style={{fontWeight: 'bold', color: '#28a745', marginBottom: '10px', display: 'block'}}>
                📎 Sales Requirement Files (Optional - up to 5 files):
              </label>
              <input
                ref={clientRequirementFileInputRef}
                type="file"
                multiple
                onChange={(e) => setClientRequirementFiles(e.target.files)}
                className="file-input"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                style={{
                  border: '1px solid #28a745',
                  borderRadius: '4px',
                  padding: '8px'
                }}
              />
              <small className="form-help-text" style={{color: '#666', fontSize: '12px', marginTop: '5px', display: 'block'}}>
                Upload any additional files that help clarify the requirement (RFP, specification docs, etc.)
              </small>
              {clientRequirementFiles && clientRequirementFiles.length > 0 && (
                <div className="selected-files" style={{
                  marginTop: '10px',
                  padding: '10px',
                  backgroundColor: '#e8f5e8',
                  borderRadius: '4px',
                  border: '1px solid #28a745'
                }}>
                  <p className="files-count" style={{margin: '0 0 8px 0', fontWeight: 'bold'}}>
                    Selected {clientRequirementFiles.length} file(s):
                  </p>
                  <ul className="files-list" style={{margin: '0', paddingLeft: '20px'}}>
                    {Array.from(clientRequirementFiles).map((file, index) => (
                      <li key={index} className="file-item" style={{marginBottom: '4px'}}>
                        <span className="file-name" style={{fontWeight: 'bold'}}>{file.name}</span>
                        <span className="file-size" style={{color: '#666', marginLeft: '8px'}}>
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Due Date (Optional):</label>
              <input
                type="date"
                value={sampleForm.dueDate}
                onChange={(e) => setSampleForm(prev => ({ ...prev, dueDate: e.target.value }))}
                className="form-control"
              />
            </div>
          </div>
        </div>
        
        <div className="modal-actions">
          <button
            onClick={handleSampleRequestSubmit}
            className="btn btn-primary"
            disabled={sampleRequestLoading}
            style={{
              position: 'relative',
              minWidth: '180px',
              opacity: sampleRequestLoading ? 0.7 : 1,
              cursor: sampleRequestLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {sampleRequestLoading ? (
              <>
                <span 
                  className="spinner-border spinner-border-sm me-2" 
                  role="status" 
                  aria-hidden="true"
                  style={{ width: '1rem', height: '1rem' }}
                ></span>
                Creating Sample Request...
              </>
            ) : (
              'Create Sample Request'
            )}
          </button>
          <button
            onClick={() => setShowSampleModal(false)}
            className="btn btn-outline"
            disabled={sampleRequestLoading}
            style={{
              opacity: sampleRequestLoading ? 0.5 : 1,
              cursor: sampleRequestLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {sampleRequestLoading ? 'Please wait...' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  </div>
)}

      {/* Conversations Modal */}
      {showConversationsModal && (
        <div className="modal-overlay" onClick={() => {
            setShowConversationsModal(false);
            setExpandedThreads(new Set()); 
            setExpandedEmails(new Set());
          }}>
          <div className="conversations-modal-professional" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-professional">
              <div className="contact-header-info">
                <div className="contact-title">
                  <h3 className="contact-name">{selectedContact?.display_name}</h3>
                  <div className="contact-details">
                    {selectedContact?.company && <span className="company-name">{selectedContact.company}</span>}
                    {selectedContact?.country && <span className="country-info">{selectedContact.country}</span>}
                    {selectedContact?.job_title && <span className="job-title">{selectedContact.job_title}</span>}
                  </div>
                </div>
                
                {/* Enhanced header with metrics and owner info */}
                {conversations.length > 0 && (() => {
                  const metrics = calculateConversationMetrics(selectedContact, conversations);
                  return (
                    <div className="conversation-metrics">
                      {/* Owner Information */}
                      <div className="metric-item owner-info">
                        <div className="metric-icon">👤</div>
                        <div className="metric-content">
                          <span className="metric-label">Owner</span>
                          <span className="metric-value">{metrics.ownerName}</span>
                        </div>
                      </div>

                      {/* Sample Timing */}
                      {metrics.sampleSentTiming && (
                        <div className="metric-item sample-timing">
                          <div className="metric-icon">📊</div>
                          <div className="metric-content">
                            <span className="metric-label">Sample Sent</span>
                            <span className="metric-value">{metrics.sampleSentTiming}h after contact</span>
                          </div>
                        </div>
                      )}
                      
                      {metrics.needsAction && (
                        <div className="metric-item needs-action">
                          <div className="metric-icon">⚠️</div>
                          <div className="metric-content">
                            <span className="metric-label">Action</span>
                            <span className="metric-value">Needs Follow-up</span>
                          </div>
                        </div>
                      )}
                      
                      {metrics.lastInteractionDays !== null && (
                        <div className="metric-item last-interaction">
                          <div className="metric-icon">🕒</div>
                          <div className="metric-content">
                            <span className="metric-label">Last Contact</span>
                            <span className="metric-value">
                              {metrics.lastInteractionDays === 0 ? 'Today' : 
                               metrics.lastInteractionDays === 1 ? '1 day ago' : 
                               `${metrics.lastInteractionDays} days ago`}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
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
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Conversation Filter Buttons */}
            {conversations.length > 0 && (
              <div className="conversation-filters">
                {(() => {
                  const counts = getConversationCounts();
                  return (
                    <div className="filter-buttons">
                      <button 
                        className={`filter-btn ${conversationFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setConversationFilter('all')}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        All ({counts.total})
                      </button>
                      {counts.emailCount > 0 && (
                        <button 
                          className={`filter-btn email-filter ${conversationFilter === 'email_thread' ? 'active' : ''}`}
                          onClick={() => setConversationFilter('email_thread')}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22,6 12,13 2,6"></polyline>
                          </svg>
                          Emails ({counts.emailCount})
                        </button>
                      )}
                      {counts.phoneCount > 0 && (
                        <button 
                          className={`filter-btn phone-filter ${conversationFilter === 'phone' ? 'active' : ''}`}
                          onClick={() => setConversationFilter('phone')}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                          </svg>
                          Calls ({counts.phoneCount})
                        </button>
                      )}
                      {counts.noteCount > 0 && (
                        <button 
                          className={`filter-btn note-filter ${conversationFilter === 'note' ? 'active' : ''}`}
                          onClick={() => setConversationFilter('note')}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14,2 14,8 20,8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10,9 9,9 8,9"></polyline>
                          </svg>
                          Notes ({counts.noteCount})
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

              {!conversationsLoading && !conversationsError && conversations.length === 0 && (
                <div className="empty-state-professional">
                  <div className="empty-icon">📭</div>
                  <h5>No conversations found</h5>
                  <p className="text-muted">This contact doesn't have any recorded conversations yet.</p>
                </div>
              )}

              {/* Conversations List */}
              {!conversationsLoading && !conversationsError && conversations.length > 0 && (
                <div className="conversations-list-professional">
                  {getFilteredConversations()
                    .sort((a, b) => {
                      const dateA = new Date(a.last_message_date || a.created_at);
                      const dateB = new Date(b.last_message_date || b.created_at);
                      return dateB - dateA;
                    })
                    .map((conversation, index) => (
                    <div key={conversation.conversation_id || index} 
                      className={`conversation-item-professional conversation-${conversation.type} ${
                        conversation.type === 'email_thread' && isThreadExpanded(conversation.conversation_id) ? 'expanded' : ''
                      }`}>

                      {/* Email Thread */}
                      {conversation.type === 'email_thread' && (
                        <div className={`email-thread-professional ${isThreadExpanded(conversation.conversation_id) ? 'expanded' : 'collapsed'}`}>
                          <div className="conversation-header-professional">
                            <div className="conversation-type-info">
                              <div className="type-badge email-badge">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                  <polyline points="22,6 12,13 2,6"></polyline>
                                </svg>
                                Email Thread
                              </div>
                              <div className="message-count-prominent">
                                <span className="message-count-number">{conversation.messages?.length || 0}</span>
                                <span className="message-count-text">messages</span>
                              </div>
                            </div>
                            
                            <div className="conversation-date-range">
                              <span>{formatDateTime(conversation.first_message_date)}</span>
                              <span className="date-separator">→</span>
                              <span>{formatDateTime(conversation.last_message_date)}</span>
                            </div>
                          </div>
                          
                          {/* Clickable thread subject */}
                          <div 
                            className="thread-subject-professional clickable-header"
                            onClick={() => toggleThreadVisibility(conversation.conversation_id)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="subject-header-content">
                              <h5>{conversation.subject || 'No Subject'}</h5>
                              <div className="expand-all-indicator">
                                {isThreadExpanded(conversation.conversation_id) ? (
                                  <span className="expand-icon">📖 Click to collapse thread</span>
                                ) : (
                                  <span className="expand-icon">📧 Click to view all {conversation.messages?.length || 0} emails</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Thread stats and messages - only show when expanded */}
                          {isThreadExpanded(conversation.conversation_id) && (
                            <>
                              <div className="thread-stats-professional">
                                <div className="stat-item">
                                  <span className="stat-icon">📤</span>
                                  <span className="stat-text">{conversation.stats?.outgoing_messages || 0} Sent</span>
                                </div>
                                <div className="stat-item">
                                  <span className="stat-icon">📥</span>
                                  <span className="stat-text">{conversation.stats?.incoming_messages || 0} Received</span>
                                </div>
                                {conversation.stats?.total_attachments > 0 && (
                                  <div className="stat-item">
                                    <span className="stat-icon">📎</span>
                                    <span className="stat-text">{conversation.stats.total_attachments} Attachments</span>
                                  </div>
                                )}
                                <div className="stat-item expand-all-action" onClick={(e) => {
                                  e.stopPropagation();
                                  toggleAllEmailsInThread(conversation.conversation_id);
                                }}>
                                  <span className="stat-icon">
                                    {areAllEmailsExpanded(conversation.conversation_id) ? '📝' : '📄'}
                                  </span>
                                  <span className="stat-text">
                                    {areAllEmailsExpanded(conversation.conversation_id) ? 'Collapse All Content' : 'Expand All Content'}
                                  </span>
                                </div>
                              </div>

                              {/* Messages */}
                              <div className="messages-container-professional">
                                {conversation.messages
                                  ?.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) 
                                  ?.map((message, msgIndex) => {
                                  const expandKey = `${conversation.conversation_id}-${message.message_id || msgIndex}`;
                                  const isExpanded = expandedEmails.has(expandKey);
                                  const shouldTruncate = message.content && message.content.length > 300;
                                  
                                  return (
                                    <div key={message.message_id || msgIndex} className={`message-item-professional ${message.direction}`}>
                                      <div className="message-header-professional">
                                        <div className="sender-info-professional">
                                          <div className="sender-avatar">
                                            {message.direction === 'incoming' ? '👤' : '🏢'}
                                          </div>
                                          <div className="sender-details">
                                            <span className="sender-name">{message.sender?.name || 'Unknown'}</span>
                                            <span className="message-number">Message {msgIndex + 1} of {conversation.messages.length}</span>
                                          </div>
                                          <div className={`direction-badge-professional ${message.direction}`}>
                                            {message.direction === 'incoming' ? '📥 Received' : '📤 Sent'}
                                          </div>
                                        </div>
                                        <div className="message-timestamp">
                                          {formatDateTime(message.timestamp)}
                                        </div>
                                      </div>
                                      
                                      {message.attachments?.length > 0 && (
                                        <div className="attachments-professional">
                                          <div className="attachments-header">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                                            </svg>
                                            Attachments:
                                          </div>
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
                                              overflow: shouldTruncate && !isExpanded ? 'hidden' : 'visible',
                                              transition: 'max-height 0.3s ease'
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
                                            className="expand-button"
                                            onClick={() => toggleEmailExpansion(conversation.conversation_id, message.message_id || msgIndex)}
                                            style={{
                                              background: 'linear-gradient(135deg, #007bff, #0056b3)',
                                              color: 'white',
                                              border: 'none',
                                              borderRadius: '4px',
                                              padding: '6px 12px',
                                              fontSize: '12px',
                                              cursor: 'pointer',
                                              marginTop: '8px',
                                              transition: 'all 0.2s ease'
                                            }}
                                          >
                                            {isExpanded ? '📄 Show Less' : '📖 Show Full Email'}
                                          </button>
                                        )}
                                      </div>

                                      {message.engagement && (
                                        <div className="engagement-info-professional">
                                          {message.engagement.opened && (
                                            <div className="engagement-stat">
                                              <span className="engagement-icon">👁️</span>
                                              <span>Opened</span>
                                            </div>
                                          )}
                                          {message.engagement.clicked && (
                                            <div className="engagement-stat">
                                              <span className="engagement-icon">🖱️</span>
                                              <span>Clicked</span>
                                            </div>
                                          )}
                                          {message.engagement.bounced && (
                                            <div className="engagement-stat bounced">
                                              <span className="engagement-icon">⚠️</span>
                                              <span>Bounced</span>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Phone Call */}
                      {conversation.type === 'phone' && (
                        <div className="phone-call-professional">
                          <div className="conversation-header-professional">
                            <div className="conversation-type-info">
                              <div className="type-badge phone-badge">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                </svg>
                                Phone Call
                              </div>
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
                            {conversation.call_recording_url && (
                              <div className="recording-info-professional">
                                <a href={conversation.call_recording_url} target="_blank" rel="noopener noreferrer" className="recording-link">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polygon points="5,3 19,12 5,21"></polygon>
                                  </svg>
                                  Listen to Recording
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Note */}
                      {conversation.type === 'note' && (
                        <div className="note-item-professional">
                          <div className="conversation-header-professional">
                            <div className="conversation-type-info">
                              <div className="type-badge note-badge">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                  <polyline points="14,2 14,8 20,8"></polyline>
                                  <line x1="16" y1="13" x2="8" y2="13"></line>
                                  <line x1="16" y1="17" x2="8" y2="17"></line>
                                  <polyline points="10,9 9,9 8,9"></polyline>
                                </svg>
                                Note
                              </div>
                            </div>
                            
                            <div className="conversation-date-range">
                              {formatDateTime(conversation.created_at)}
                            </div>
                          </div>
                          
                          <div className="note-content-professional">
                            <h5>{conversation.subject || 'Note'}</h5>
                            <div className="note-text">
                              {conversation.content || 'No content available'}
                            </div>
                          </div>

                          {conversation.participants?.length > 0 && (
                            <div className="note-creator-professional">
                              <div className="creator-avatar">👤</div>
                              <span>Created by {conversation.participants[0].name}</span>
                            </div>
                          )}
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