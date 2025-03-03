import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/LeadDetails.css";

function LeadDetails({ token, leadId, onClose,userRole  }) {
  const [lead, setLead] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedLead, setEditedLead] = useState({});
  const [logs, setLogs] = useState([]);
  const [messages, setMessages] = useState([]); 
  const [newMessage, setNewMessage] = useState(""); 
  const [isEditingSales, setIsEditingSales] = useState(false);
  const [salesUsers, setSalesUsers] = useState([]);
  useEffect(() => {
    fetchLeadDetails();
    fetchLeadLogs();
    fetchMessages();
    fetchSalesUsers();
    
  }, [leadId]);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");

 
 async function fetchSalesUsers() {
  try {
    const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/auth/sales-users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setSalesUsers(res.data);
  } catch (err) {
    console.error("Error fetching sales users:", err);
  }
}
  function addClientName(e) {
    if (e.key === ",") {
      e.preventDefault();
      if (nameInput.trim()) {
        setEditedLead((prevLead) => ({
          ...prevLead,
          clientName: [...prevLead.clientName.filter(Boolean), nameInput.trim()],
        }));
        setNameInput("");
      }
    }
  }
  
  function addClientEmail(e) {
    if (e.key === ",") {
      e.preventDefault();
      if (emailInput.trim()) {
        setEditedLead((prevLead) => ({
          ...prevLead,
          clientEmail: [...prevLead.clientEmail.filter(Boolean), emailInput.trim()],
        }));
        setEmailInput("");
      }
    }
  }
  
  function removeClientName(index) {
    setEditedLead((prevLead) => ({
      ...prevLead,
      clientName: prevLead.clientName.filter((_, i) => i !== index),
    }));
  }
  
  function removeClientEmail(index) {
    setEditedLead((prevLead) => ({
      ...prevLead,
      clientEmail: prevLead.clientEmail.filter((_, i) => i !== index),
    }));
  }
  
  async function fetchLeadDetails() {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/leads/${leadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLead(res.data);
      setEditedLead(res.data); 
    } catch (err) {
      console.error("Error fetching lead details:", err);
    }
  }

  async function fetchLeadLogs() {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/logs?leadId=${leadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLogs(res.data);
    } catch (err) {
      console.error("Error fetching lead logs:", err);
    }
  }

  async function fetchMessages() {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/chats/${leadId}`, {
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
        `${process.env.REACT_APP_API_BASE_URL}/api/chats/${leadId}`,
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

  async function handleSaveChanges() {
    try {
      const response = await axios.patch(
        `${process.env.REACT_APP_API_BASE_URL}/api/leads/${leadId}`,
        editedLead,
        { headers: { Authorization: `Bearer ${token}` } }      )
      alert("Lead updated successfully!");
      setIsEditing(false);
      setIsEditingSales(false);
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
        <i className="fas fa-times"></i>
      </button>

      </div>
      {lead ? (
        <div className="popup-content">
          <div className="left-column">
          <div className="section overview-section">
  <h3>Overview</h3>
  {isEditing ? (
    <div className="edit-form">
      {/* Editable fields */}
        <div>
            <label>Client Names:</label>
            <div className="tags-input">
            {editedLead.clientName.map((name, index) => (
                <span key={index} className="tag">
                {name}
                <button className="remove-tag" onClick={() => removeClientName(index)}>
                    &times;
                </button>
                </span>
            ))}
            <input
                type="text"
                placeholder="Add client name (Press ',' to add)"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={addClientName}
            />
            </div>
        </div>
        <div>
            <label>Client Emails:</label>
            <div className="tags-input">
            {editedLead.clientEmail.map((email, index) => (
                <span key={index} className="tag">
                {email}
                <button className="remove-tag" onClick={() => removeClientEmail(index)}>
                    &times;
                </button>
                </span>
            ))}
            <input
                type="email"
                placeholder="Add client email (Press ',' to add)"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={addClientEmail}
            />
            </div>
        </div>
        <label>Client Company:</label>
        <input
            type="text"
            
            placeholder="Client Company"
            value={editedLead.clientCompany}
            onChange={(e) => setEditedLead({ ...editedLead, clientCompany: e.target.value })}
        />
        <label>Project Name:</label>
        <input
            type="text"
            placeholder="Project Name"
            value={editedLead.projectName}
            onChange={(e) => setEditedLead({ ...editedLead, projectName: e.target.value })}
        />
        <label>Project Description:</label>
        <textarea
            placeholder="Project Description"
            value={editedLead.projectDescription}
            onChange={(e) =>
            setEditedLead({ ...editedLead, projectDescription: e.target.value })
            }
        />
        <label>Sqcode:</label>
        <input
            type="text"
            placeholder="Sqcode"
            value={editedLead.sqcode}
            onChange={(e) => setEditedLead({ ...editedLead, sqcode: e.target.value })}
        />
        <div className="button-group">
            <button className="save-btn" onClick={handleSaveChanges}>
            Save
            </button>
            <button className="cancel-btn" onClick={() => setIsEditing(false)}>
            Cancel
            </button>
        </div>
        </div>
    ) : (
        <div className="details">
        <p><strong>Lead ID:</strong> {lead.leadId}</p>
       
        <p>
            <strong>Client Names:</strong>{" "}
            {Array.isArray(lead.clientName) && lead.clientName.length > 0
            ? lead.clientName.join(", ")
            : "No Names"}
        </p>
        <p>
            <strong>Client Emails:</strong>{" "}
            {Array.isArray(lead.clientEmail) && lead.clientEmail.length > 0
            ? lead.clientEmail.join(", ")
            : "No Emails"}
        </p>
        <p><strong>Client Company:</strong> {lead.clientCompany}</p>
        <p><strong>Project Name:</strong> {lead.projectName}</p>
        <p><strong>Project Description:</strong> {lead.projectDescription}</p>
        <p><strong>Sqcode:</strong> {lead.sqcode}</p>
        <button className="edit-btn" onClick={() => setIsEditing(true)}>
            Edit
        </button>
        </div>
    )}
    </div>

            {/* Chat */}
            <div className="section chat-section">
                <h3>Chat</h3>
                <div className="chat-messages">
                    {messages.length > 0 ? (
                    messages.map((msg) => (
                        <div key={msg._id} className="chat-message">
                        <div className="chat-content">
                            <strong>{msg.sender.username}:</strong> {msg.message}
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
  {isEditingSales ? (
    <div className="edit-sales-user">
      {/* Sales User Dropdown */}
      <div className="form-group">
        <label htmlFor="salesUser">Sales User:</label>
        <select
          id="salesUser"
          value={editedLead.salesUser || ""}
          onChange={(e) => setEditedLead({ ...editedLead, salesUser: e.target.value })}
          className="form-control"
        >
          <option value="" disabled>
            Select Sales User
          </option>
          {salesUsers.map((user) => (
            <option key={user._id} value={user._id}>
              {user.username}
            </option>
          ))}
        </select>
      </div>

      {/* Delivery Date Input */}
      <div className="form-group">
        <label htmlFor="deliveryDate">Delivery Date:</label>
        <input
          id="deliveryDate"
          type="date"
          value={
            editedLead.deliveryDate
              ? new Date(editedLead.deliveryDate).toISOString().split("T")[0]
              : ""
          }
          onChange={(e) => setEditedLead({ ...editedLead, deliveryDate: e.target.value })}
          className="form-control"
        />
      </div>

      {/* Payment Status Dropdown */}
      <div className="form-group">
        <label htmlFor="paymentStatus">Payment Status:</label>
        <select
          id="paymentStatus"
          value={editedLead.paymentStatus}
          onChange={(e) => setEditedLead({ ...editedLead, paymentStatus: e.target.value })}
          className="form-control"
        >
          <option value="not_received">Not Received</option>
          <option value="partial">Partial</option>
          <option value="full">Full</option>
        </select>
      </div>

      {/* Save and Cancel Buttons */}
      <div className="button-group">
        <button className="save-btn" onClick={handleSaveChanges}>
          Save
        </button>
        <button className="cancel-btn" onClick={() => setIsEditingSales(false)}>
          Cancel
        </button>
      </div>
    </div>
  ) : (
    <div className="sales-user-details">
      <p>
        <strong>Sales User:</strong> {lead.salesUser?.username || "Unknown"}
      </p>
      <p>
        <strong>Created Date:</strong> {new Date(lead.createdAt).toLocaleDateString()}
      </p>
      <p>
        <strong>Delivery Date:</strong>{" "}
        {lead.deliveryDate ? new Date(lead.deliveryDate).toLocaleDateString() : "Not Set"}
      </p>
      <p>
        <strong>Payment Status:</strong> {lead.paymentStatus || "Not Set"}
      </p>
      <button className="edit-btn" onClick={() => setIsEditingSales(true)}>
        Edit Sales Section
      </button>
    </div>
  )}
</div>

            {/* Activities */}
            <div className="section">
              <h3>Streams</h3>
              <ul className="activity-log">
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <li key={log._id}>
                      <strong>{log.action}</strong> -{" "}
                      {new Date(log.timestamp).toLocaleString()}
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


export default LeadDetails;
