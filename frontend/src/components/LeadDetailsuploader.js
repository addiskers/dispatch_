import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/LeadDetails.css";

function LeadDetailsuploader({ token, leadId, onClose }) {
  const [lead, setLead] = useState(null);
  const [logs, setLogs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    fetchLeadDetailsuploader();
    fetchLeadLogs();
    fetchMessages();
  }, [leadId]);

  async function fetchLeadDetailsuploader() {
    try {
      const res = await axios.get(`http://localhost:5000/api/leads/${leadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLead(res.data);
    } catch (err) {
      console.error("Error fetching lead details:", err);
    }
  }

  async function fetchLeadLogs() {
    try {
      const res = await axios.get(`http://localhost:5000/api/logs?leadId=${leadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLogs(res.data);
    } catch (err) {
      console.error("Error fetching lead logs:", err);
    }
  }

  async function fetchMessages() {
    try {
      const res = await axios.get(`http://localhost:5000/api/chats/${leadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(res.data);
    } catch (err) {
      console.error("Error fetching chat messages:", err);
    }
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!newMessage.trim()) {
      alert("Message cannot be empty");
      return;
    }

    try {
      const res = await axios.post(
        `http://localhost:5000/api/chats/${leadId}`,
        { message: newMessage },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessages((prev) => [...prev, res.data]);
      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
    }
  }

  return (
    <div className="lead-details-popup">
      <div className="popup-header">
        <h2>Lead Details</h2>
        <button className="close-btn" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>
      {lead ? (
        <div className="popup-content">
          {/* Left Column */}
          <div className="left-column">
            <div className="section overview-section">
              <h3>Overview</h3>
              <div className="details">
                <p><strong>Lead ID:</strong> {lead.leadId}</p>
                <p><strong>Client Names:</strong> {lead.clientName?.join(", ") || "No Names"}</p>
                <p><strong>Client Emails:</strong> {lead.clientEmail?.join(", ") || "No Emails"}</p>
                <p><strong>Client Company:</strong> {lead.clientCompany || "No Company"}</p>
                <p><strong>Project Name:</strong> {lead.projectName || "No Project Name"}</p>
                <p><strong>Project Description:</strong> {lead.projectDescription || "No Description"}</p>
                <p><strong>Sqcode:</strong> {lead.sqcode || "N/A"}</p>
              </div>
            </div>

            {/* Chat Section */}
            <div className="section chat-section">
              <h3>Chat</h3>
              <div className="chat-messages">
                {messages.length > 0 ? (
                  messages.map((msg) => (
                    <div key={msg._id} className="chat-message">
                      <div className="chat-content">
                        <strong>{msg.sender?.username || "Unknown"}:</strong> {msg.message}
                      </div>
                      <div className="chat-timestamp">
                        {new Date(msg.timestamp).toLocaleDateString()} {new Date(msg.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No messages yet for this lead.</p>
                )}
              </div>
              <form className="chat-form" onSubmit={sendMessage}>
                <input
                  type="text"
                  className="chat-input"
                  placeholder="Type your message"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button className="chat-send-btn" type="submit">
                  Send
                </button>
              </form>
            </div>
          </div>

          {/* Right Column */}
          <div className="right-column">
            <div className="section sales-user-section">
              <h3>Sales User</h3>
              <div className="sales-user-details">
                <p><strong>Sales User:</strong> {lead.salesUser?.username || "Unknown"}</p>
                <p><strong>Created Date:</strong> {new Date(lead.createdAt).toLocaleDateString()}</p>
                <p><strong>Delivery Date:</strong> {lead.deliveryDate ? new Date(lead.deliveryDate).toLocaleDateString() : "Not Set"}</p>
                <p><strong>Payment Status:</strong> {lead.paymentStatus || "Not Set"}</p>
              </div>
            </div>

            {/* Activities Section */}
            <div className="section">
              <h3>Streams</h3>
              <ul className="activity-log">
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <li key={log._id}>
                      <strong>{log.action}</strong> - {new Date(log.timestamp).toLocaleString()}
                    </li>
                  ))
                ) : (
                  <p>No activities found for this lead.</p>
                )}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <p>Loading lead details...</p>
      )}
    </div>
  );
}

export default LeadDetailsuploader;
