import React, { useState, useEffect } from "react";
import axios from "axios";
import { Loader2, FileIcon, Upload, Send, Search, X } from "lucide-react";
import "../styles/contractpage.css";

const ContractPage = ({ token }) => {
  const [leadId, setLeadId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [contracts, setContracts] = useState([]);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [toEmails, setToEmails] = useState([]);
  const [ccEmails, setCcEmails] = useState([]);
  const [toEmailInput, setToEmailInput] = useState("");
  const [ccEmailInput, setCcEmailInput] = useState("");
  const [files, setFiles] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validLead, setValidLead] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState({});

  useEffect(() => {
    const fetchContracts = async () => {
      if (leadId && projectName) {
        setLoading(true);
        try {
          const response = await axios.get(
            `${process.env.REACT_APP_API_BASE_URL}/api/leads/${leadId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (response.data.projectName === projectName) {
            setContracts(response.data.contracts || []);
            setValidLead(true);
          } else {
            setContracts([]);
            setValidLead(false);
          }
        } catch (error) {
          console.error("Error fetching contracts:", error);
          setContracts([]);
          setValidLead(false);
        }
        setLoading(false);
      }
    };

    fetchContracts();
  }, [leadId, projectName, token]);

  const handleUploadContracts = async (e) => {
    e.preventDefault();
    if (!files || !leadId) {
      alert("Please enter a valid Lead ID and select files.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("leadId", leadId);
    Array.from(files).forEach((file) => formData.append("contracts", file));

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/api/leads/upload-contracts`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setContracts([...contracts, ...response.data.contractKeys]);
      setFiles(null);

      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = "";

      alert("Contracts uploaded successfully!");
    } catch (error) {
      console.error("Error uploading contracts:", error);
      alert("Error uploading contracts.");
    }
    setLoading(false);
  };

  const getFileName = (path) => path.split("/").pop();

  const handleDownload = async (contractKey) => {
    try {
      setDownloadLoading((prev) => ({ ...prev, [contractKey]: true }));
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/api/leads/download-contract`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { key: contractKey },
        }
      );

      if (response.data.url) {
        const link = document.createElement("a");
        link.href = response.data.url;
        link.setAttribute("download", getFileName(contractKey));
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error("Download URL not found in response");
      }
    } catch (error) {
      console.error("Error downloading contract:", error);
      alert(`Error downloading the contract: ${error.message || "Please try again."}`);
    } finally {
      setDownloadLoading((prev) => ({ ...prev, [contractKey]: false }));
    }
  };

  const handleAddEmail = (e, type) => {
    const email = type === 'to' ? toEmailInput.trim() : ccEmailInput.trim();
    
    if ((e.key === "," || e.key === "Enter") && email) {
      e.preventDefault();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        alert("Please enter a valid email address");
        return;
      }
      
      if (type === 'to') {
        if (!toEmails.includes(email)) {
          setToEmails([...toEmails, email]);
        }
        setToEmailInput("");
      } else {
        if (!ccEmails.includes(email)) {
          setCcEmails([...ccEmails, email]);
        }
        setCcEmailInput("");
      }
    }
  };

  const handleRemoveEmail = (email, type) => {
    if (type === 'to') {
      setToEmails(toEmails.filter(e => e !== email));
    } else {
      setCcEmails(ccEmails.filter(e => e !== email));
    }
  };

  const handleSendInvoice = async () => {
    if (toEmails.length === 0 || selectedInvoices.length === 0) {
      alert("Please enter at least one recipient email and select at least one invoice.");
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/api/upload/send-invoice`,
        {
          leadId,
          toEmails,
          ccEmails,
          files: selectedInvoices,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert("Invoice sent successfully!");
      setToEmails([]);
      setCcEmails([]);
      setToEmailInput("");
      setCcEmailInput("");
      setSelectedInvoices([]);
    } catch (error) {
      console.error("Error sending invoice:", error);
      alert("Failed to send invoice.");
    }
    setLoading(false);
  };

  return (
    <div className="contract-container">
      <div className="contract-card">
        {/* Header */}
        <div className="card-header">
          <h2>Contract & Invoice Management</h2>
          <p>Manage contracts and send invoices for your projects</p>
        </div>

        {/* Search Section */}
        <div className="search-section">
          <div className="input-group">
            <label>Lead ID</label>
            <div className="search-input">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Enter Lead ID"
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
              />
            </div>
          </div>
          <div className="input-group">
            <label>Project Name</label>
            <input
              type="text"
              placeholder="Enter Project Name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>
        </div>

        {loading && (
          <div className="loading-container">
            <Loader2 className="loading-spinner" />
          </div>
        )}

        {!validLead && leadId && projectName && (
          <div className="error-message">
            <p>Invalid Lead ID or Project Name. Please check your inputs and try again.</p>
          </div>
        )}

        {validLead && (
          <>
            <div className="contracts-section">
              <div className="section-header">
                <h3>Existing Contracts</h3>
                <span className="contract-count">{contracts.length} Contracts</span>
              </div>
              <div className="contracts-table">
                <div className="contracts-table-header">
                  <div className="checkbox-column">Select</div>
                  <div className="name-column">File Name</div>
                  <div className="actions-column">Actions</div>
                </div>
                <div className="contracts-table-body">
                  {contracts.length > 0 ? (
                    contracts.map((contractKey) => (
                      <div key={contractKey} className="contract-row">
                        <div className="checkbox-column">
                          <input
                            type="checkbox"
                            checked={selectedInvoices.includes(contractKey)}
                            onChange={() =>
                              setSelectedInvoices((prev) =>
                                prev.includes(contractKey)
                                  ? prev.filter((key) => key !== contractKey)
                                  : [...prev, contractKey]
                              )
                            }
                            className="contract-checkbox"
                          />
                        </div>
                        <div className="name-column">
                          <FileIcon className="file-icon" />
                          <span className="file-name">{getFileName(contractKey)}</span>
                        </div>
                        <div className="actions-column">
                          <button 
                            className="download-button"
                            onClick={() => handleDownload(contractKey)}
                          >
                            {downloadLoading[contractKey] ? (
                              <Loader2 className="loading-spinner-small" />
                            ) : (
                              "Download"
                            )}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-contracts">
                      <p>No contracts found for this lead.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="separator" />

            {/* Invoice Section */}
            <div className="invoice-section">
              <h3>Send Invoice</h3>
              
              {/* To emails */}
              <div className="email-input-container">
                <label>To:</label>
                <div className="email-chips-container">
                  {toEmails.map((email, index) => (
                    <div key={index} className="email-chip">
                      <span>{email}</span>
                      <button 
                        className="remove-email"
                        onClick={() => handleRemoveEmail(email, 'to')}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <input
                    type="email"
                    placeholder="Enter email addresses (press Enter or comma to add)"
                    value={toEmailInput}
                    onChange={(e) => setToEmailInput(e.target.value)}
                    onKeyDown={(e) => handleAddEmail(e, 'to')}
                    className="email-input"
                  />
                </div>
              </div>
              
              {/* Cc emails */}
              <div className="email-input-container">
                <label>Cc:</label>
                <div className="email-chips-container">
                  {ccEmails.map((email, index) => (
                    <div key={index} className="email-chip">
                      <span>{email}</span>
                      <button 
                        className="remove-email"
                        onClick={() => handleRemoveEmail(email, 'cc')}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <input
                    type="email"
                    placeholder="Enter CC email addresses (press Enter or comma to add)"
                    value={ccEmailInput}
                    onChange={(e) => setCcEmailInput(e.target.value)}
                    onKeyDown={(e) => handleAddEmail(e, 'cc')}
                    className="email-input"
                  />
                </div>
              </div>
              
              <div className="invoice-actions">
                <button
                  onClick={handleSendInvoice}
                  disabled={loading || selectedInvoices.length === 0 || toEmails.length === 0}
                  className="primary-button"
                >
                  <Send className="button-icon" />
                  Send
                </button>
              </div>
            </div>

            <div className="separator" />

            {/* Upload Section */}
            <div className="upload-section">
              <h3>Upload New Contracts</h3>
              <div className="upload-input-group">
                <input
                  type="file"
                  multiple
                  onChange={(e) => setFiles(e.target.files)}
                  className="file-input"
                />
                <button
                  onClick={handleUploadContracts}
                  disabled={loading || !files}
                  className="secondary-button"
                >
                  <Upload className="button-icon" />
                  Upload
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ContractPage;
