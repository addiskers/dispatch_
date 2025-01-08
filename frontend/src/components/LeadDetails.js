import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/LeadDetails.css";

function LeadDetails({ token, leadId, onClose }) {
  const [lead, setLead] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedLead, setEditedLead] = useState({});
  const [logs, setLogs] = useState([]);
  const [messages, setMessages] = useState([]); // Chat messages
  const [newMessage, setNewMessage] = useState(""); // New chat message

  useEffect(() => {
    fetchLeadDetails();
    fetchLeadLogs();
    fetchMessages();
  }, [leadId]);

  // Fetch lead details
  async function fetchLeadDetails() {
    try {
      const res = await axios.get(`http://localhost:5000/api/leads/${leadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLead(res.data);
      setEditedLead(res.data); // Pre-fill fields for editing
    } catch (err) {
      console.error("Error fetching lead details:", err);
    }
  }

  // Fetch logs related to the lead
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

  // Fetch chat messages
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

  // Handle sending a new chat message
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

  // Handle save changes for the lead
  async function handleSaveChanges() {
    try {
      await axios.put(
        `http://localhost:5000/api/leads/${leadId}`,
        editedLead,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Lead updated successfully!");
      setIsEditing(false);
      fetchLeadDetails();
    } catch (err) {
      console.error("Error updating lead:", err);
      alert("Failed to update lead. Please try again.");
    }
  }

  return (
    <div className="lead-details-popup">
      <div className="popup-header">
        <h2>Lead Details</h2>
        <button className="close-btn" onClick={onClose}>
          ✖
        </button>
      </div>

      {lead ? (
        <div className="popup-content">
          {/* Section 1: Overview */}
          <div className="section">
            <h3>Overview</h3>
            {isEditing ? (
              <div className="edit-form">
                <label>Client Name:</label>
                <input
                  type="text"
                  value={editedLead.clientName}
                  onChange={(e) =>
                    setEditedLead({ ...editedLead, clientName: e.target.value })
                  }
                />
                <label>Client Email:</label>
                <input
                  type="email"
                  value={editedLead.clientEmail}
                  onChange={(e) =>
                    setEditedLead({ ...editedLead, clientEmail: e.target.value })
                  }
                />
                <label>Client Company:</label>
                <input
                  type="text"
                  value={editedLead.clientCompany}
                  onChange={(e) =>
                    setEditedLead({ ...editedLead, clientCompany: e.target.value })
                  }
                />
                <label>Project Name:</label>
                <input
                  type="text"
                  value={editedLead.projectName}
                  onChange={(e) =>
                    setEditedLead({ ...editedLead, projectName: e.target.value })
                  }
                />
                <label>Project Description:</label>
                <textarea
                  value={editedLead.projectDescription}
                  onChange={(e) =>
                    setEditedLead({
                      ...editedLead,
                      projectDescription: e.target.value,
                    })
                  }
                />
                <label>Sqcode:</label>
                <input
                  type="text"
                  value={editedLead.sqcode}
                  onChange={(e) =>
                    setEditedLead({ ...editedLead, sqcode: e.target.value })
                  }
                />
                <button onClick={handleSaveChanges} className="save-btn">
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="details">
                <p><strong>Lead ID:</strong> {lead.leadId}</p>
                <p><strong>Client Name:</strong> {lead.clientName}</p>
                <p><strong>Client Email:</strong> {lead.clientEmail}</p>
                <p><strong>Client Company:</strong> {lead.clientCompany}</p>
                <p><strong>Project Name:</strong> {lead.projectName}</p>
                <p><strong>Project Description:</strong> {lead.projectDescription}</p>
                <p><strong>Sqcode:</strong> {lead.sqcode}</p>
                <button onClick={() => setIsEditing(true)} className="edit-btn">
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Sales User */}
          <div className="section">
            <h3>Sales User</h3>
            <p><strong>Name:</strong> {lead.salesUser?.username || "Unknown"}</p>
            <p><strong>Created Date:</strong> {new Date(lead.createdAt).toLocaleDateString()}</p>
            <p><strong>Delivery Date:</strong> {new Date(lead.deliveryDate).toLocaleDateString()}</p>
          </div>

          {/* Section 3: Chat */}
          <div className="section chat-section">
            <h3>Chat</h3>
            <div className="chat-body">
              {messages.length > 0 ? (
                messages.map((msg) => (
                  <div key={msg._id} className={`chat-message ${msg.sender.role}`}>
                    <strong>{msg.sender.username}:</strong> {msg.message}
                  </div>
                ))
              ) : (
                <p className="no-messages">No messages yet for this lead.</p>
              )}
            </div>
            <form onSubmit={sendMessage} className="chat-footer">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message"
                className="chat-input"
              />
              <button type="submit" className="chat-send-btn">
                Send
              </button>
            </form>
          </div>

         {/* Section 4: Activities */}
          <div className="section">
            <h3>Activities</h3>
            {logs.length > 0 ? (
              <ul className="activity-log">
                {logs.map((log) => (
                  <li key={log._id}>
                    <strong>{log.action}</strong> - {log.timestamp && new Date(log.timestamp).toLocaleString()}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No activity logs found for this lead.</p>
            )}
          </div>
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}

export default LeadDetails;
