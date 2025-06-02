import React, { useState, useEffect } from "react";
import axios from "axios";
import { Modal, Button, Spinner, Card, Badge, Alert, Tabs, Tab } from "react-bootstrap";
import "../styles/conversationTimeline.css";

function ConversationTimeline({ leadId, token, show, onHide }) {
  const [conversations, setConversations] = useState([]);
  const [emailThread, setEmailThread] = useState(null);
  const [loading, setLoading] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('list'); 
  const [transcription, setTranscription] = useState(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptError, setTranscriptError] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null);

  useEffect(() => {
    if (show && leadId) {
      fetchConversations();
    }
  }, [show, leadId]);

  useEffect(() => {
    if (!show) {
      setActiveView('list');
      setEmailThread(null);
      setTranscription(null);
      setActiveConversation(null);
    }
  }, [show]);

  const fetchConversations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/api/freshworks/leads/${leadId}/conversations`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Process and combine the conversations
      const processedConversations = processConversationsData(res.data);
      setConversations(processedConversations);
    } catch (err) {
      console.error("Error fetching conversations:", err);
      setError("Failed to load conversations. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailThread = async (emailId) => {
  setThreadLoading(true);
  setError(null);
  try {
    const res = await axios.get(
      `${process.env.REACT_APP_API_BASE_URL}/api/freshworks/emails/${emailId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    // Ensure we preserve all the data from the API response
    setEmailThread(res.data);
    setActiveView('thread');
  } catch (err) {
    console.error("Error fetching email thread:", err);
    setError("Failed to load email thread. Please try again.");
  } finally {
    setThreadLoading(false);
  }
};

  const fetchCallTranscript = async (recordingUrl, conversation) => {
    setTranscriptLoading(true);
    setTranscriptError(null);
    setActiveConversation(conversation);
    
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/api/freshworks/call-transcript`,
        { recordingUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setTranscription(res.data);
      setActiveView('transcript');
    } catch (err) {
      console.error("Error fetching call transcript:", err);
      setTranscriptError(
        err.response?.data?.error || 
        "Failed to transcribe call recording. Please try again."
      );
    } finally {
      setTranscriptLoading(false);
    }
  };

  const processConversationsData = (data) => {
  const { conversations, email_conversations, phone_calls, users, email_conversation_recipients } = data;
  
  if (!conversations) return [];

  // Map conversations to a unified format
  return conversations.map(conv => {
    const targetable = conv.targetable;
    let processedConv = {
      id: conv.id,
      type: targetable.type,
      timestamp: null,
      content: null,
      direction: null,
      duration: null,
      status: null,
      recording: null,
      subject: null,
      user: null,
      emailId: null,
      count: 1
    };

    // Process email conversations
    if (targetable.type === "email_conversation") {
      const emailConv = email_conversations.find(e => e.id === targetable.id);
      if (emailConv) {
        // Find the sender from email_conversation_recipients
        const sender = email_conversation_recipients?.find(
          r => r.field === "from" && emailConv.email_conversation_recipient_ids?.includes(r.id)
        );
        
        processedConv = {
          ...processedConv,
          timestamp: emailConv.conversation_time,
          content: emailConv.display_content,
          direction: emailConv.direction,
          subject: emailConv.subject,
          status: emailConv.status,
          // Use sender's email_name if available
          user: sender?.email_name || 
                (emailConv.user_id ? users?.find(u => u.id === emailConv.user_id)?.display_name : null) || 
                "Unknown",
          emailId: emailConv.email_id,
          count: emailConv.count || 1,
          email_conversation_recipient_ids: emailConv.email_conversation_recipient_ids
        };
      }
    } 
    // Process phone calls - no changes needed here as it already works correctly
    else if (targetable.type === "phone_call") {
      const phoneCall = phone_calls.find(p => p.id === targetable.id);
      if (phoneCall) {
        processedConv = {
          ...processedConv,
          timestamp: phoneCall.conversation_time,
          duration: phoneCall.call_duration,
          direction: phoneCall.call_direction ? "incoming" : "outgoing",
          status: phoneCall.status,
          recording: phoneCall.recording,
          user: users?.find(u => u.id === phoneCall.user_id)?.display_name || "Unknown"
        };
      }
    }

    return processedConv;
  }).sort((a, b) => {
    // Sort by timestamp descending (newest first)
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
};

  const formatDateTime = (isoString) => {
    if (!isoString) return "-";
    const d = new Date(isoString);
    const date = d.toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric"
    });
    const time = d.toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit", hour12: true
    });
    return `${date} ${time}`;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderConversationContent = (conversation) => {
    if (conversation.type === "email_conversation") {
      return (
        <div className="email-content">
          <div className="email-header">
            <h6 className="email-subject">{conversation.subject || "No Subject"}</h6>
            {conversation.count > 1 && (
              <Badge bg="info" className="ms-2">
                {conversation.count} {conversation.count === 1 ? 'message' : 'messages'}
              </Badge>
            )}
          </div>
          <p className="email-body">{conversation.content || "No content available"}</p>
          {conversation.count > 1 && (
            <Button 
              variant="outline-primary" 
              size="sm"
              className="view-thread-btn" 
              onClick={() => fetchEmailThread(conversation.emailId)}
            >
              View Full Thread
            </Button>
          )}
        </div>
      );
    } else if (conversation.type === "phone_call") {
      return (
        <div className="call-content">
          <p className="call-info">
            <strong>Duration:</strong> {formatDuration(conversation.duration)}
            {conversation.recording && (
              <div className="call-actions mt-2">
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  onClick={() => window.open(conversation.recording, '_blank')}
                  className="recording-link me-2"
                >
                  <i className="bi bi-play-circle me-1"></i>
                  Listen to Recording
                </Button>
                <Button 
                  variant="outline-success" 
                  size="sm"
                  onClick={() => fetchCallTranscript(conversation.recording, conversation)}
                  className="transcript-btn"
                >
                  <i className="bi bi-file-text me-1"></i>
                  Transcript
                </Button>
              </div>
            )}
          </p>
        </div>
      );
    }
    return <p>Unknown conversation type</p>;
  };

  const renderEmailThreadView = () => {
    if (!emailThread || !emailThread.email_conversations) {
      return (
        <Alert variant="warning">
          No email thread data available
        </Alert>
      );
    }

    const emailConversations = emailThread.email_conversations || [];
    
    // Sort by conversation time ascending (oldest first)
    const sortedEmails = [...emailConversations].sort((a, b) => 
      new Date(a.conversation_time) - new Date(b.conversation_time)
    );
    
    return (
      <div className="email-thread">
        <div className="thread-header">
          <Button 
            variant="link" 
            className="back-button" 
            onClick={() => setActiveView('list')}
          >
            &larr; Back to all conversations
          </Button>
          
          <h5 className="thread-subject">
            {sortedEmails[0]?.subject || "No Subject"}
            <Badge bg="primary" className="ms-2">
              {sortedEmails.length} {sortedEmails.length === 1 ? 'message' : 'messages'}
            </Badge>
          </h5>
        </div>
        
        <div className="thread-emails">
          {sortedEmails.map((email, index) => (
            <Card key={email.id} className="mb-3 email-card">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <div>
                  <Badge bg={email.direction === "outgoing" ? "success" : "primary"}>
                    {email.direction === "outgoing" ? "Outgoing" : "Incoming"}
                  </Badge>
                  {index === 0 && <Badge bg="info" className="ms-2">First Message</Badge>}
                </div>
                <div className="text-muted email-time">
                  {formatDateTime(email.conversation_time)}
                </div>
              </Card.Header>
              <Card.Body>
                {email.html_content ? (
                  <div 
                    className="email-html-content" 
                    dangerouslySetInnerHTML={{ __html: email.html_content }}
                  />
                ) : (
                  <p className="email-text-content">
                    {email.display_content || "No content available"}
                  </p>
                )}
                
                {email.attachments && email.attachments.length > 0 && (
                  <div className="email-attachments mt-3">
                    <h6>Attachments:</h6>
                    <div className="attachment-list">
                      {email.attachments.map(attachment => (
                        <div key={attachment.id} className="attachment-item">
                          <a 
                            href={attachment.content_path} 
                            target="_blank" 
                            rel="noreferrer"
                            className="attachment-link"
                          >
                            <i className="bi bi-file-earmark-pdf"></i>
                            <span className="attachment-name">{attachment.content_file_name}</span>
                            <span className="attachment-size">
                              ({Math.round(attachment.content_file_size / 1024)} KB)
                            </span>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card.Body>
              <Card.Footer className="d-flex justify-content-between align-items-center">
  <span className="sender-info">
    From: {
      // First, try finding the sender from email_conversation_recipients
      emailThread.email_conversation_recipients?.find(
        r => r.field === "from" && email.email_conversation_recipient_ids?.includes(r.id)
      )?.email_name ||
      // Then try user_id lookup as fallback
      (email.user_id && emailThread.users?.find(u => u.id === email.user_id)?.display_name) ||
      "Unknown"
    }
  </span>
  {email.recipients && (
    <span className="recipient-info">
      To: {email.recipients.filter(r => r.field === "to").map(r => r.email_name).join(", ")}
    </span>
  )}
</Card.Footer>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderCallTranscriptView = () => {
    if (!activeConversation) {
      return (
        <Alert variant="warning">
          No call data available
        </Alert>
      );
    }

    if (transcriptLoading) {
      return (
        <div className="text-center p-4">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Transcribing call recording...</p>
          <p className="text-muted small">This may take a minute for longer calls</p>
        </div>
      );
    }

    if (transcriptError) {
      return (
        <Alert variant="danger" className="my-3">
          <h5>Error Transcribing Call</h5>
          <p>{transcriptError}</p>
          <Button 
            variant="outline-primary" 
            size="sm" 
            className="mt-2"
            onClick={() => setActiveView('list')}
          >
            &larr; Back to conversations
          </Button>
        </Alert>
      );
    }

    if (!transcription) {
      return (
        <Alert variant="warning">
          No transcript data available
        </Alert>
      );
    }

    return (
      <div className="transcript-view">
        <div className="thread-header">
          <Button 
            variant="link" 
            className="back-button" 
            onClick={() => setActiveView('list')}
          >
            &larr; Back to all conversations
          </Button>
          
          <h5 className="call-title">
            Call Transcript
            <Badge bg={activeConversation.direction === "outgoing" ? "success" : "primary"} className="ms-2">
              {activeConversation.direction === "outgoing" ? "Outgoing" : "Incoming"}
            </Badge>
            <span className="text-muted ms-2 call-date">
              {formatDateTime(activeConversation.timestamp)}
            </span>
          </h5>
        </div>

        <Card className="transcript-card">
          <Card.Header>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <strong>Call Duration:</strong> {formatDuration(activeConversation.duration)}
              </div>
              <div>
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  onClick={() => window.open(activeConversation.recording, '_blank')}
                  className="recording-link"
                >
                  <i className="bi bi-play-circle me-1"></i>
                  Listen to Original Recording
                </Button>
              </div>
            </div>
          </Card.Header>
          <Card.Body>
            {transcription.segments && transcription.segments.length > 0 ? (
              <div className="transcript-segments">
                {transcription.segments.map((segment, index) => (
                  <div key={index} className={`transcript-segment ${segment.speaker === 'Agent' ? 'agent' : 'customer'}`}>
                    <div className="segment-header">
                      <Badge bg={segment.speaker === 'Agent' ? 'primary' : 'secondary'}>
                        {segment.speaker || 'Speaker'}
                      </Badge>
                      <span className="segment-time">
                        {Math.floor(segment.start / 60)}:{Math.floor(segment.start % 60).toString().padStart(2, '0')} - 
                        {Math.floor(segment.end / 60)}:{Math.floor(segment.end % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                    <div className="segment-text">
                      {segment.text}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="transcript-text">
                {transcription.transcript || "No transcript available"}
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    );
  };

  const renderMainContent = () => {
    if (loading) {
      return (
        <div className="text-center p-4">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Loading conversations...</p>
        </div>
      );
    }
    
    if (threadLoading) {
      return (
        <div className="text-center p-4">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Loading email thread...</p>
        </div>
      );
    }
    
    if (error) {
      return (
        <Alert variant="danger" className="my-3">
          {error}
        </Alert>
      );
    }
    
    if (activeView === 'thread') {
      return renderEmailThreadView();
    }

    if (activeView === 'transcript') {
      return renderCallTranscriptView();
    }
    
    if (conversations.length === 0) {
      return (
        <div className="text-center p-4">
          <p>No conversations found for this lead.</p>
        </div>
      );
    }
    
    return (
      <div className="conversation-list">
        {conversations.map((conversation) => (
          <Card key={conversation.id} className="mb-3 conversation-card">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <div className="conversation-badges">
                <Badge 
                  bg={conversation.type === "email_conversation" ? "info" : "warning"}
                  className="me-2"
                >
                  {conversation.type === "email_conversation" ? "Email" : "Call"}
                </Badge>
                <Badge 
                  bg={conversation.direction === "outgoing" || conversation.direction === false ? "success" : "primary"}
                >
                  {conversation.direction === "outgoing" || conversation.direction === false ? "Outgoing" : "Incoming"}
                </Badge>
                {conversation.count > 1 && (
                  <Badge bg="secondary" className="ms-2">
                    {conversation.count} messages
                  </Badge>
                )}
              </div>
              <div className="text-muted conversation-time">
                {formatDateTime(conversation.timestamp)}
              </div>
            </Card.Header>
            <Card.Body>
              {renderConversationContent(conversation)}
            </Card.Body>
            <Card.Footer className="text-muted">
              <small>By: {conversation.user || "System"}</small>
            </Card.Footer>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <Modal 
      show={show} 
      onHide={onHide}
      size="lg"
      aria-labelledby="conversation-timeline-modal"
      backdrop="static"
      className="conversation-timeline-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title id="conversation-timeline-modal">
          Conversation Timeline
          {activeView === 'thread' && emailThread && (
            <Badge bg="info" className="ms-2">
              {emailThread.email_conversations?.length || 0} messages
            </Badge>
          )}
          {activeView === 'transcript' && (
            <Badge bg="warning" className="ms-2">
              Call Transcript
            </Badge>
          )}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {renderMainContent()}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ConversationTimeline;