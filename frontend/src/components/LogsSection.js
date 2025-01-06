import React, { useState, useEffect } from "react";
import axios from "axios";

function LogsSection({ token }) {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    try {
      const res = await axios.get("http://localhost:5000/api/auth/activity-logs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLogs(res.data);
    } catch (err) {
      console.error("Error fetching logs:", err);
    }
  }

  return (
    <div>
      <h2>Activity Logs</h2>
      <ul>
        {logs.map((log) => (
          <li key={log._id}>
            {log.username} - {log.action} at {new Date(log.timestamp).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default LogsSection;
