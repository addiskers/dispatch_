import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const AIMarketResearchDashboard = () => {
  // Sample data based on the provided AI market research keywords
  const [marketData, setMarketData] = useState([]);
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

  // Simulate loading market research data
  useEffect(() => {
    // This would typically come from an API or database
    const data = [
      { 
        keyword: 'Artificial Intelligence (AI) in Retail Market',
        traffic1: 245,
        traffic2: 178,
        source1: 'grandviewresearch.com',
        source2: 'marketsandmarkets.com',
        growth: 24.3,
        marketSize: 8.5
      },
      { 
        keyword: 'Artificial Intelligence In Telecommunication Market',
        traffic1: 196,
        traffic2: 142,
        source1: 'mordorintelligence.com',
        source2: 'fortunebusinessinsights.com',
        growth: 38.4,
        marketSize: 6.3
      },
      { 
        keyword: 'Artificial Intelligence In Medical Diagnostics Market',
        traffic1: 312,
        traffic2: 267,
        source1: 'grandviewresearch.com', 
        source2: 'marketsandmarkets.com',
        growth: 42.1,
        marketSize: 9.2
      },
      { 
        keyword: 'Artificial Intelligence (AI) Market',
        traffic1: 478,
        traffic2: 356,
        source1: 'marketsandmarkets.com',
        source2: 'fortunebusinessinsights.com',
        growth: 35.6,
        marketSize: 15.7
      },
      { 
        keyword: 'Artificial Intelligence In Security Market',
        traffic1: 187,
        traffic2: 154,
        source1: 'alliedmarketresearch.com',
        source2: 'grandviewresearch.com',
        growth: 31.8,
        marketSize: 7.8
      },
      { 
        keyword: 'Artificial Intelligence (AI) in Construction Market',
        traffic1: 156,
        traffic2: 133,
        source1: 'marketsandmarkets.com',
        source2: 'mordorintelligence.com',
        growth: 29.7,
        marketSize: 4.5
      },
      { 
        keyword: 'Conversational Artificial Intelligence (AI) Market',
        traffic1: 213,
        traffic2: 165,
        source1: 'marketsandmarkets.com',
        source2: 'grandviewresearch.com',
        growth: 43.2,
        marketSize: 5.9
      },
      { 
        keyword: 'Artificial Intelligence (AI) in Healthcare Market',
        traffic1: 345,
        traffic2: 289,
        source1: 'grandviewresearch.com',
        source2: 'marketsandmarkets.com',
        growth: 47.6,
        marketSize: 12.4
      },
      { 
        keyword: 'Artificial Intelligence (AI) in Cybersecurity Market',
        traffic1: 231,
        traffic2: 198,
        source1: 'marketsandmarkets.com',
        source2: 'fortunebusinessinsights.com',
        growth: 36.5,
        marketSize: 8.1
      },
      { 
        keyword: 'Artificial Intelligence As A Service Market',
        traffic1: 189,
        traffic2: 162,
        source1: 'mordorintelligence.com',
        source2: 'alliedmarketresearch.com',
        growth: 34.7,
        marketSize: 7.3
      }
    ];
    
    setMarketData(data);
    // By default, select the first 5 keywords
    setSelectedKeywords(data.slice(0, 5).map(item => item.keyword));
    setLoading(false);
  }, []);

  // Handler for keyword selection
  const handleKeywordToggle = (keyword) => {
    if (selectedKeywords.includes(keyword)) {
      setSelectedKeywords(selectedKeywords.filter(k => k !== keyword));
    } else {
      // Limit to 5 keywords for better visualization
      if (selectedKeywords.length < 5) {
        setSelectedKeywords([...selectedKeywords, keyword]);
      } else {
        alert('Please deselect a keyword first. Maximum 5 keywords for clear visualization.');
      }
    }
  };

  // Filter data based on search term
  const filteredKeywords = marketData.filter(item => 
    item.keyword.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter data based on selected keywords
  const selectedData = marketData.filter(item => 
    selectedKeywords.includes(item.keyword)
  );

  // Prepare data for traffic comparison chart
  const trafficComparisonData = selectedData.map(item => ({
    name: item.keyword.split(' ').slice(0, 4).join(' ') + '...',
    source1: item.traffic1,
    source2: item.traffic2,
    total: item.traffic1 + item.traffic2
  }));

  // Prepare data for market share pie chart
  const marketShareData = selectedData.map(item => ({
    name: item.keyword.split(' ').slice(0, 3).join(' ') + '...',
    value: item.marketSize
  }));

  // Prepare data for growth comparison
  const growthComparisonData = selectedData.map(item => ({
    name: item.keyword.split(' ').slice(0, 4).join(' ') + '...',
    growth: item.growth
  }));

  // Prepare data for traffic source breakdown
  const sourceBreakdownData = [];
  const sourcesSet = new Set();
  
  selectedData.forEach(item => {
    sourcesSet.add(item.source1);
    sourcesSet.add(item.source2);
  });
  
  const sourcesArray = Array.from(sourcesSet);
  
  sourcesArray.forEach(source => {
    const totalTraffic = selectedData.reduce((sum, item) => {
      if (item.source1 === source) return sum + item.traffic1;
      if (item.source2 === source) return sum + item.traffic2;
      return sum;
    }, 0);
    
    sourceBreakdownData.push({
      name: source.replace('.com', ''),
      value: totalTraffic
    });
  });

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading market research data...</div>;
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
        <h1 className="text-3xl font-bold text-center text-blue-800 mb-2">AI Market Research Dashboard</h1>
        <p className="text-center text-gray-600 mb-4">Interactive visualization of AI market research traffic and trends</p>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold">Select Keywords (Max 5)</h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Search keywords..."
                className="p-2 border rounded"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="h-40 overflow-y-auto border p-2 rounded">
            {filteredKeywords.map((item, index) => (
              <div key={index} className="flex items-center mb-1">
                <input
                  type="checkbox"
                  id={`keyword-${index}`}
                  checked={selectedKeywords.includes(item.keyword)}
                  onChange={() => handleKeywordToggle(item.keyword)}
                  className="mr-2"
                />
                <label htmlFor={`keyword-${index}`} className="cursor-pointer text-sm">
                  {item.keyword}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Traffic Comparison Chart */}
        <div className="bg-white p-4 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-center">Traffic Comparison</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={trafficComparisonData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="source1" name="Primary Source" fill="#8884d8" />
              <Bar dataKey="source2" name="Secondary Source" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Market Size Pie Chart */}
        <div className="bg-white p-4 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-center">Market Size Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={marketShareData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {marketShareData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${value}B`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Growth Rate Chart */}
        <div className="bg-white p-4 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-center">Market Growth Rate (%)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={growthComparisonData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `${value}%`} />
              <Bar dataKey="growth" fill="#FF8042" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Traffic Source Breakdown */}
        <div className="bg-white p-4 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-center">Traffic by Source</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sourceBreakdownData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {sourceBreakdownData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="mt-6 bg-white p-4 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-center">Traffic Trend Analysis</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={trafficComparisonData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="total" stroke="#8884d8" activeDot={{ r: 8 }} name="Total Traffic" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-6 text-center text-gray-500 text-sm">
        <p>Data sourced from multiple market research websites. Last updated: May 2025</p>
      </div>
    </div>
  );
};

export default AIMarketResearchDashboard;