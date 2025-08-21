// src/components/TimeSeriesModal.js
import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts';

const COLORS = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="label">{`Period: ${label}`}</p>
        {payload.map((pld, index) => (
          <p key={index} style={{ color: pld.color }}>
            {`${pld.name}: ${pld.value.toFixed(2)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const TimeSeriesModal = ({ isOpen, onClose, chartType, chartTitle, filters, API_BASE_URL, token }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeFilter, setTimeFilter] = useState('monthly');

  useEffect(() => {
    if (isOpen && token) {
      fetchTimeSeriesData();
    }
  }, [isOpen, chartType, timeFilter, filters, token]);

  const fetchTimeSeriesData = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      let dateRange = { startDate: '', endDate: '' };
      if (filters.dateFilter === 'custom') {
        dateRange = { startDate: filters.startDate, endDate: filters.endDate };
      }

      const params = new URLSearchParams({
        chartType,
        timeFilter,
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
      });
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch(`${API_BASE_URL}/contacts/timeseries?${params}`, { headers });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setData(result);
      } else {
        throw new Error(result.message || 'Failed to fetch time series data');
      }
    } catch (err) {
      console.error('Error fetching time series data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderChart = () => {
    if (!data || data.data.length === 0) {
      return <div className="no-data-message"><p>No time series data available for the selected filters.</p></div>;
    }

    switch (chartType) {
      case 'performanceByOwner':
        return (
          <ComposedChart data={data.data}>
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <CartesianGrid stroke="#f5f5f5" />
            <Bar dataKey="totalContacts" barSize={20} fill="#a4b0be" name="Total Contacts" />
            {data.owners?.map((owner, index) => (
              <Line key={owner} type="monotone" dataKey={`owner_${owner.replace(/\s+/g, '_')}`} stroke={COLORS[index % COLORS.length]} name={owner} />
            ))}
          </ComposedChart>
        );
      
      case 'avgTouchpointsByOwner':
        return (
          <LineChart data={data.data}>
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <CartesianGrid stroke="#f5f5f5" />
            {data.owners?.map((owner, index) => (
              <React.Fragment key={owner}>
                <Line type="monotone" dataKey={`${owner.replace(/\s+/g, '_')}_emails`} stroke={COLORS[index % COLORS.length]} name={`${owner} - Avg Emails`} />
                <Line type="monotone" dataKey={`${owner.replace(/\s+/g, '_')}_calls`} stroke={COLORS[index % COLORS.length]} strokeDasharray="5 5" name={`${owner} - Avg Calls`} />
              </React.Fragment>
            ))}
          </LineChart>
        );

      case 'responseRateByOwner':
      case 'avgSampleTimingByOwner':
      case 'avgFirstCallTimingByOwner':
        return (
          <LineChart data={data.data}>
            <XAxis dataKey="period" />
            <YAxis label={{ value: chartType.includes('Rate') ? '%' : (chartType.includes('Timing') ? 'hours/mins' : ''), angle: -90, position: 'insideLeft' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <CartesianGrid stroke="#f5f5f5" />
            {data.owners?.map((owner, index) => (
              <Line key={owner} type="monotone" dataKey={`owner_${owner.replace(/\s+/g, '_')}`} stroke={COLORS[index % COLORS.length]} name={owner} />
            ))}
          </LineChart>
        );

      case 'dealsWonByOwner':
        return (
          <BarChart data={data.data}>
            <XAxis dataKey="period" />
            <YAxis label={{ value: 'Deals Won', angle: -90, position: 'insideLeft' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <CartesianGrid stroke="#f5f5f5" />
            {data.owners?.map((owner, index) => (
              <Bar key={owner} dataKey={`owner_${owner.replace(/\s+/g, '_')}`} fill={COLORS[index % COLORS.length]} name={owner} />
            ))}
          </BarChart>
        );

      case 'leadLevelsByOwner':
      case 'contactCategories':
      case 'territoryDistribution':
        const keys = chartType === 'leadLevelsByOwner' ? data.leadLevels : (chartType === 'contactCategories' ? data.contactCategories : data.territories);
        const prefix = chartType === 'leadLevelsByOwner' ? 'level' : (chartType === 'contactCategories' ? 'category' : 'territory');
        return (
          <AreaChart data={data.data}>
             <XAxis dataKey="period" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <CartesianGrid stroke="#f5f5f5" />
            {keys?.map((key, index) => (
               <Area key={key} type="monotone" dataKey={`${prefix}_${key.replace(/\s+/g, '_')}`} stackId="1" stroke={COLORS[index % COLORS.length]} fill={COLORS[index % COLORS.length]} name={key} />
            ))}
          </AreaChart>
        );

      default:
        return <div className="no-data-message"><p>This chart type is not supported yet.</p></div>;
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="timeseries-modal-overlay">
      <div className="timeseries-modal">
        <div className="timeseries-modal-header">
          <h2>{chartTitle}</h2>
          <div className="timeseries-controls">
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="timeseries-filter-select"
            >
              <option value="monthly">Monthly</option>
              <option value="daily">Daily</option>
            </select>
            <button onClick={onClose} className="timeseries-close-btn">×</button>
          </div>
        </div>
        <div className="timeseries-modal-content">
          {loading && <div className="spinner"></div>}
          {error && <p className="error-message">Error: {error}</p>}
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default TimeSeriesModal;