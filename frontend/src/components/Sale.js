import React from 'react';
import { Card, Row, Col, Table, Badge, ProgressBar } from 'react-bootstrap';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import "../styles/Sale.css";
// Dummy data for the dashboard
const salesTeamData = [
  {
    id: 1,
    name: "Jagraj Singh",
    role: "Senior Business Developer",
    avgSampleTime: 2.3, // in days
    followUps: 42,
    avgCalls: 18,
    conversionRate: 32,
    revenueGenerated: 52000,
    pendingQuotes: 8,
    lastMonthPerformance: 120, // percentage of target
    avatar: "JS"
  },
  {
    id: 2,
    name: "Hashita Mehta",
    role: "Business Development Manager",
    avgSampleTime: 1.8,
    followUps: 56,
    avgCalls: 22,
    conversionRate: 38,
    revenueGenerated: 65000,
    pendingQuotes: 5,
    lastMonthPerformance: 145,
    avatar: "HM"
  },
  {
    id: 3,
    name: "Priyanshi Shah",
    role: "Sales Executive",
    avgSampleTime: 2.7,
    followUps: 38,
    avgCalls: 15,
    conversionRate: 28,
    revenueGenerated: 43000,
    pendingQuotes: 12,
    lastMonthPerformance: 95,
    avatar: "PS"
  },
  {
    id: 4,
    name: "Ankit Patel",
    role: "Business Developer",
    avgSampleTime: 2.1,
    followUps: 49,
    avgCalls: 20,
    conversionRate: 34,
    revenueGenerated: 48000,
    pendingQuotes: 7,
    lastMonthPerformance: 110,
    avatar: "AP"
  }
];

// Aggregate data
const averages = {
  sampleTime: salesTeamData.reduce((sum, person) => sum + person.avgSampleTime, 0) / salesTeamData.length,
  followUps: salesTeamData.reduce((sum, person) => sum + person.followUps, 0) / salesTeamData.length,
  calls: salesTeamData.reduce((sum, person) => sum + person.avgCalls, 0) / salesTeamData.length,
  conversion: salesTeamData.reduce((sum, person) => sum + person.conversionRate, 0) / salesTeamData.length,
};

// Monthly trend data
const monthlyTrendData = [
  { month: 'Jan', samples: 45, followUps: 120, calls: 380, conversions: 22 },
  { month: 'Feb', samples: 52, followUps: 145, calls: 420, conversions: 28 },
  { month: 'Mar', samples: 48, followUps: 135, calls: 390, conversions: 25 },
  { month: 'Apr', samples: 70, followUps: 180, calls: 450, conversions: 32 },
  { month: 'May', samples: 80, followUps: 220, calls: 520, conversions: 37 },
];

// Deal stage data
const dealStageData = [
  { name: 'Qualified', value: 25, color: '#0088FE' },
  { name: 'Proposal', value: 40, color: '#00C49F' },
  { name: 'Negotiation', value: 20, color: '#FFBB28' },
  { name: 'Closed Won', value: 15, color: '#FF8042' },
];

// Performance comparison data
const performanceData = salesTeamData.map(person => ({
  name: person.name.split(' ')[0],
  sampleTime: person.avgSampleTime,
  followUps: person.followUps,
  calls: person.avgCalls,
  conversion: person.conversionRate
}));

// Recent activities data (dummy)
const recentActivities = [
  { id: 1, agent: "Jagraj Singh", action: "Sent sample", client: "Acme Corp", time: "2 hours ago" },
  { id: 2, agent: "Hashita Mehta", action: "Closed deal", client: "TechGiant Inc", time: "3 hours ago" },
  { id: 3, agent: "Priyanshi Shah", action: "Added follow-up", client: "Startup Labs", time: "5 hours ago" },
  { id: 4, agent: "Ankit Patel", action: "Scheduled call", client: "Global Systems", time: "Yesterday" },
  { id: 5, agent: "Jagraj Singh", action: "Updated quote", client: "MediHealth", time: "Yesterday" },
];

const Sale = () => {
  return (
    <div className="sales-dashboard">
      <div className="dashboard-header">
        <h1>Sales Performance Dashboard</h1>
        <div className="date-indicator">
          <span>Last updated: May 19, 2025</span>
        </div>
      </div>
      
      {/* Key Metrics Cards */}
      <Row className="metrics-cards mb-4">
        <Col md={3}>
          <Card className="metric-card">
            <Card.Body>
              <h6 className="metric-title">Avg. Sample Time</h6>
              <div className="metric-value">{averages.sampleTime.toFixed(1)} days</div>
              <div className="metric-trend positive">
                <i className="bi bi-arrow-down-right"></i> 12% from last month
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="metric-card">
            <Card.Body>
              <h6 className="metric-title">Avg. Follow-ups</h6>
              <div className="metric-value">{Math.round(averages.followUps)}</div>
              <div className="metric-trend positive">
                <i className="bi bi-arrow-up-right"></i> 8% from last month
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="metric-card">
            <Card.Body>
              <h6 className="metric-title">Avg. Calls per Rep</h6>
              <div className="metric-value">{Math.round(averages.calls)}</div>
              <div className="metric-trend positive">
                <i className="bi bi-arrow-up-right"></i> 5% from last month
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="metric-card">
            <Card.Body>
              <h6 className="metric-title">Avg. Conversion Rate</h6>
              <div className="metric-value">{Math.round(averages.conversion)}%</div>
              <div className="metric-trend positive">
                <i className="bi bi-arrow-up-right"></i> 3% from last month
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Main Dashboard Content */}
      <Row>
        {/* Left Column - Charts */}
        <Col lg={8}>
          {/* Monthly Trend Chart */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="card-title">Monthly Performance Trends</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="samples" stroke="#8884d8" name="Samples Sent" />
                  <Line type="monotone" dataKey="followUps" stroke="#82ca9d" name="Follow-ups" />
                  <Line type="monotone" dataKey="calls" stroke="#ffc658" name="Calls Made" />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
          
          {/* Team Performance Comparison */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="card-title">Team Performance Comparison</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="followUps" fill="#8884d8" name="Follow-ups" />
                  <Bar dataKey="calls" fill="#82ca9d" name="Calls" />
                  <Bar dataKey="conversion" fill="#ffc658" name="Conversion %" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
          
          {/* Sample Time Analysis */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="card-title">Average Sample Time (Days)</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="sampleTime" fill="#8884d8" stroke="#8884d8" name="Avg. Days" />
                </AreaChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        
        {/* Right Column - Team Stats & Activities */}
        <Col lg={4}>
          {/* Deal Stage Distribution */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="card-title">Deal Stage Distribution</h5>
            </Card.Header>
            <Card.Body className="text-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={dealStageData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label
                  >
                    {dealStageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
          
          {/* Team Performance */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="card-title">Team Performance</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <Table className="team-performance-table" hover>
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Progress</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {salesTeamData.map(person => (
                    <tr key={person.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="avatar">{person.avatar}</div>
                          <div className="ms-2">{person.name.split(' ')[0]}</div>
                        </div>
                      </td>
                      <td>
                        <ProgressBar 
                          now={person.lastMonthPerformance} 
                          variant={person.lastMonthPerformance >= 100 ? "success" : "warning"}
                        />
                      </td>
                      <td className="text-end">
                        <Badge bg={person.lastMonthPerformance >= 100 ? "success" : "warning"}>
                          {person.lastMonthPerformance}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
          
          {/* Recent Activities */}
          <Card className="mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">Recent Activities</h5>
              <Badge bg="info">{recentActivities.length} new</Badge>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="activity-list">
                {recentActivities.map(activity => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-content">
                      <div className="activity-title">
                        <span className="agent-name">{activity.agent.split(' ')[0]}</span>
                        <span className="activity-action">{activity.action}</span>
                        <span className="client-name">{activity.client}</span>
                      </div>
                      <div className="activity-time">{activity.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Sale;