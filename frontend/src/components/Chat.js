import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/Chat.css";

function Chat({ token, leadId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    setMessages([]);
    fetchMessages(leadId);
  }, [leadId]);

  async function fetchMessages(leadId) {
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
    <div className="chat-popup">
      <div className="chat-header">
        <span>Chat for Lead: {leadId}</span>
        <button className="close-btn" onClick={onClose}>
          ✖
        </button>
      </div>
      <div className="chat-body">
        {messages.length > 0 ? (
          messages.map((msg) => (
            <div key={msg._id} className={`chat-message ${msg.sender.role}`}>
              <strong>{msg.sender.username}:</strong> {msg.message}
              <div className="chat-timestamp">
                {new Date(msg.timestamp).toLocaleString()}
              </div>
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
  );
}

export default Chat;
