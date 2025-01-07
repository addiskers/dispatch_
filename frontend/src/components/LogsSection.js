import React, { useState, useEffect } from "react";
import axios from "axios";
import { Table, Form, Button } from "react-bootstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

function LogsSection({ token }) {
  const [logs, setLogs] = useState([]); // All logs
  const [filteredLogs, setFilteredLogs] = useState([]); // Filtered logs
  const [users, setUsers] = useState([]); // List of users for the dropdown
  const [filters, setFilters] = useState({
    userId: "",
    leadId: "",
    action: "",
    startDate: null,
    endDate: null,
  });

  // Fetch all logs and users on component mount
  useEffect(() => {
    fetchUsers();
    fetchAllLogs();
  }, []);

  // Fetch all users for the filter dropdown
  async function fetchUsers() {
    try {
      const res = await axios.get("http://localhost:5000/api/auth/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  }

  // Fetch all logs
  async function fetchAllLogs() {
    try {
      const res = await axios.get("http://localhost:5000/api/logs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLogs(res.data); // Set logs
      setFilteredLogs(res.data); // Initially, show all logs
    } catch (err) {
      console.error("Error fetching logs:", err);
    }
  }

  // Apply filters
  function applyFilters() {
    let filtered = logs;

    if (filters.userId) {
      filtered = filtered.filter((log) => log.user._id === filters.userId);
    }

    if (filters.leadId) {
      filtered = filtered.filter((log) => log.leadId === filters.leadId);
    }

    if (filters.action) {
      filtered = filtered.filter((log) => log.action === filters.action);
    }

    if (filters.startDate && filters.endDate) {
      filtered = filtered.filter(
        (log) =>
          new Date(log.timestamp) >= filters.startDate &&
          new Date(log.timestamp) <= filters.endDate
      );
    }

    setFilteredLogs(filtered);
  }

  // Handle filter changes
  function handleFilterChange(e) {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  }

  return (
    <div className="container mt-4">
      <h2>Activity Logs</h2>

      {/* Filters */}
      <div className="filters d-flex gap-3 mb-4">
        {/* User Filter */}
        <Form.Select
          name="userId"
          value={filters.userId}
          onChange={handleFilterChange}
        >
          <option value="">Select User</option>
          {users.map((user) => (
            <option key={user._id} value={user._id}>
              {user.username} ({user.role})
            </option>
          ))}
        </Form.Select>

        {/* Lead ID Filter */}
        <Form.Control
          type="text"
          name="leadId"
          value={filters.leadId}
          onChange={handleFilterChange}
          placeholder="Enter Lead ID"
        />

        {/* Action Filter */}
        <Form.Select
          name="action"
          value={filters.action}
          onChange={handleFilterChange}
        >
          <option value="">Select Action</option>
          <option value="login">Login</option>
          <option value="created lead">Created Lead</option>
          <option value="updated payment status">Updated Payment Status</option>
          <option value="deleted lead">Deleted Lead</option>
          <option value="updated done status">Updated Done Status</option>
        </Form.Select>

        {/* Date Range Filters */}
        <DatePicker
          selected={filters.startDate}
          onChange={(date) => setFilters((prev) => ({ ...prev, startDate: date }))}
          placeholderText="Start Date"
          className="form-control"
        />
        <DatePicker
          selected={filters.endDate}
          onChange={(date) => setFilters((prev) => ({ ...prev, endDate: date }))}
          placeholderText="End Date"
          className="form-control"
        />

        <Button variant="primary" onClick={applyFilters}>
          Apply Filters
        </Button>
      </div>

      {/* Logs Table */}
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Username</th>
            <th>Action</th>
            <th>Lead ID</th>
            <th>Old Value</th>
            <th>New Value</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {filteredLogs.map((log) => (
            <tr key={log._id}>
              <td>{log.user.username}</td>
              <td>{log.action}</td>
              <td>{log.leadId || "N/A"}</td>
              <td>{JSON.stringify(log.oldValue) || "N/A"}</td>
              <td>{JSON.stringify(log.newValue) || "N/A"}</td>
              <td>{new Date(log.timestamp).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

export default LogsSection;
