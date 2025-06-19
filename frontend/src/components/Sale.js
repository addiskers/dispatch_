import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ComposedChart
} from 'recharts';

const Sale = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [teamPerformance, setTeamPerformance] = useState([]);
  const [callAnalytics, setCallAnalytics] = useState(null);
  const [emailAnalytics, setEmailAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all analytics data
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        
        // Simulated API calls - replace with actual API endpoints
        const [analyticsRes, teamRes, callRes, emailRes] = await Promise.all([
          fetch('/api/analytics/crm'),
          fetch('/api/analytics/team-performance'),
          fetch('/api/analytics/calls'),
          fetch('/api/analytics/emails')
        ]);

        if (!analyticsRes.ok || !teamRes.ok || !callRes.ok || !emailRes.ok) {
          throw new Error('Failed to fetch analytics data');
        }

        const [analytics, team, calls, emails] = await Promise.all([
          analyticsRes.json(),
          teamRes.json(),
          callRes.json(),
          emailRes.json()
        ]);

        setAnalyticsData(analytics.data);
        setTeamPerformance(team.data);
        setCallAnalytics(calls.data);
        setEmailAnalytics(emails.data);
      } catch (err) {
        // For demo purposes, using mock data
        console.log('Using mock data for demo');
        setTimeout(() => {
          setAnalyticsData(mockAnalyticsData);
          setTeamPerformance(mockTeamData);
          setCallAnalytics(mockCallData);
          setEmailAnalytics(mockEmailData);
          setLoading(false);
        }, 1000);
      }
    };

    fetchAnalyticsData();
  }, []);

  // Mock data for demonstration
  const mockAnalyticsData = {
    totalContacts: 1250,
    userPerformance: [
      { userName: 'Jagraj Singh', leadsHandled: 45, emailsSent: 127, callsMade: 38, connectedCalls: 12, responseRate: 31.6 },
      { userName: 'Priyanshi Harwani', leadsHandled: 32, emailsSent: 89, callsMade: 25, connectedCalls: 8, responseRate: 32.0 },
      { userName: 'Hashita Mehta', leadsHandled: 28, emailsSent: 76, callsMade: 22, connectedCalls: 9, responseRate: 40.9 },
      { userName: 'Ankit Patel', leadsHandled: 35, emailsSent: 98, callsMade: 29, connectedCalls: 10, responseRate: 34.5 }
    ],
    totalMetrics: {
      outgoingEmails: 390,
      incomingEmails: 45,
      outgoingCalls: 114,
      connectedCalls: 39,
      responseRate: 34.2
    },
    monthlyTrends: [
      { month: '2024-08', newLeads: 85, emailsSent: 220, callsMade: 95 },
      { month: '2024-09', newLeads: 92, emailsSent: 245, callsMade: 108 },
      { month: '2024-10', newLeads: 110, emailsSent: 290, callsMade: 125 },
      { month: '2024-11', newLeads: 125, emailsSent: 315, callsMade: 140 },
      { month: '2024-12', newLeads: 140, emailsSent: 390, callsMade: 155 },
      { month: '2025-01', newLeads: 150, emailsSent: 420, callsMade: 168 }
    ]
  };

  const mockTeamData = mockAnalyticsData.userPerformance;

  const mockCallData = {
    totalCalls: 114,
    answeredCalls: 39,
    noResponseCalls: 65,
    leftMessageCalls: 10,
    avgCallDuration: 28,
    callOutcomes: {
      'No response': 65,
      'Connected': 39,
      'Left message': 10
    }
  };

  const mockEmailData = {
    responseRate: 11.5
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && !analyticsData) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <strong>Error Loading Analytics:</strong> {error}
      </div>
    );
  }

  // Color schemes
  const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
  
  // Prepare data for charts
  const userPerformanceData = analyticsData?.userPerformance?.map(user => ({
    name: user.userName?.split(' ')[0] || 'Unknown',
    leadsHandled: user.leadsHandled,
    emailsSent: user.emailsSent,
    callsMade: user.callsMade,
    connectedCalls: user.connectedCalls,
    responseRate: Math.round(user.responseRate || 0)
  })) || [];

  const callOutcomeData = callAnalytics ? Object.entries(callAnalytics.callOutcomes).map(([outcome, count]) => ({
    name: outcome,
    value: count
  })) : [];

  const emailVsCallData = analyticsData ? [{
    name: 'Communication Methods',
    emails: analyticsData.totalMetrics.outgoingEmails,
    calls: analyticsData.totalMetrics.outgoingCalls,
    emailResponses: analyticsData.totalMetrics.incomingEmails,
    callResponses: analyticsData.totalMetrics.connectedCalls
  }] : [];

  const monthlyTrendData = analyticsData?.monthlyTrends?.slice(-6) || [];

  // Metrics cards data
  const metricsData = {
    totalContacts: analyticsData?.totalContacts || 0,
    outgoingEmails: analyticsData?.totalMetrics?.outgoingEmails || 0,
    incomingEmails: analyticsData?.totalMetrics?.incomingEmails || 0,
    totalCalls: callAnalytics?.totalCalls || 0,
    answeredCalls: callAnalytics?.answeredCalls || 0,
    responseRate: Math.round(analyticsData?.totalMetrics?.responseRate || 0),
    avgCallDuration: Math.round(callAnalytics?.avgCallDuration || 0)
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-blue-600 mb-2">CRM Analytics Dashboard</h1>
        <p className="text-gray-600">Real-time insights into your sales team performance</p>
      </div>
      
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">{metricsData.totalContacts}</div>
          <h3 className="text-gray-600 font-semibold">Total Contacts</h3>
          <p className="text-sm text-green-500 mt-1">
            <span className="inline-block transform rotate-12">↗</span> Active leads
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-3xl font-bold text-cyan-600 mb-2">{metricsData.outgoingEmails}</div>
          <h3 className="text-gray-600 font-semibold">Emails Sent</h3>
          <p className="text-sm text-cyan-500 mt-1">
            {metricsData.incomingEmails} responses
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-3xl font-bold text-yellow-600 mb-2">{metricsData.totalCalls}</div>
          <h3 className="text-gray-600 font-semibold">Total Calls</h3>
          <p className="text-sm text-green-500 mt-1">
            {metricsData.answeredCalls} answered
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">{metricsData.responseRate}%</div>
          <h3 className="text-gray-600 font-semibold">Response Rate</h3>
          <p className="text-sm text-gray-500 mt-1">
            Avg: {metricsData.avgCallDuration}s
          </p>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Team Performance Chart */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="bg-blue-600 text-white p-4 rounded-t-lg">
              <h2 className="text-xl font-semibold">Team Performance - Leads Handled by Person</h2>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={userPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="leadsHandled" fill="#0088FE" name="Leads Handled" />
                  <Bar yAxisId="left" dataKey="emailsSent" fill="#00C49F" name="Emails Sent" />
                  <Bar yAxisId="left" dataKey="callsMade" fill="#FFBB28" name="Calls Made" />
                  <Line yAxisId="right" type="monotone" dataKey="responseRate" stroke="#FF8042" name="Response Rate %" strokeWidth={3} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Email vs Call Communication */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="bg-cyan-600 text-white p-4 rounded-t-lg">
              <h2 className="text-xl font-semibold">Communication Methods Comparison</h2>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={emailVsCallData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="emails" fill="#0088FE" name="Outgoing Emails" />
                  <Bar dataKey="calls" fill="#00C49F" name="Outgoing Calls" />
                  <Bar dataKey="emailResponses" fill="#FFBB28" name="Email Responses" />
                  <Bar dataKey="callResponses" fill="#FF8042" name="Call Responses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Monthly Trends */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="bg-green-600 text-white p-4 rounded-t-lg">
              <h2 className="text-xl font-semibold">Monthly Activity Trends</h2>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="newLeads" stroke="#8884d8" name="New Leads" strokeWidth={2} />
                  <Line type="monotone" dataKey="emailsSent" stroke="#82ca9d" name="Emails Sent" strokeWidth={2} />
                  <Line type="monotone" dataKey="callsMade" stroke="#ffc658" name="Calls Made" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        {/* Right Column - Stats & Analytics */}
        <div className="space-y-6">
          {/* Call Outcomes Distribution */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="bg-yellow-600 text-white p-4 rounded-t-lg">
              <h2 className="text-xl font-semibold">Call Outcomes</h2>
            </div>
            <div className="p-4 text-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={callOutcomeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {callOutcomeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Team Performance Table */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="bg-gray-600 text-white p-4 rounded-t-lg">
              <h2 className="text-xl font-semibold">Team Performance Summary</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leads</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calls</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Response %</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {userPerformanceData.slice(0, 5).map((person, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-medium mr-3">
                            {person.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{person.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {person.leadsHandled}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-cyan-100 text-cyan-800">
                          {person.callsMade}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          person.responseRate > 30 
                            ? 'bg-green-100 text-green-800' 
                            : person.responseRate > 15 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {person.responseRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="bg-gray-800 text-white p-4 rounded-t-lg">
              <h2 className="text-xl font-semibold">Quick Statistics</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Email Response Rate</span>
                <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-cyan-100 text-cyan-800">
                  {emailAnalytics ? Math.round(emailAnalytics.responseRate) : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Call Answer Rate</span>
                <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                  {callAnalytics && callAnalytics.totalCalls > 0 
                    ? Math.round((callAnalytics.answeredCalls / callAnalytics.totalCalls) * 100)
                    : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Active Team Members</span>
                <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                  {analyticsData?.userPerformance?.length || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Avg Call Duration</span>
                <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800">
                  {Math.round(callAnalytics?.avgCallDuration || 0)}s
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sale;