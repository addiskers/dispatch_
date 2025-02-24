import React, { useState, useEffect } from "react";
import axios from "axios";
import { Loader2, FileIcon, Upload, Send, Search } from "lucide-react";
import "../styles/contractpage.css";

const ContractPage = ({ token }) => {
  const [leadId, setLeadId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [contracts, setContracts] = useState([]);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [recipientEmail, setRecipientEmail] = useState("");
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

  const handleSendInvoice = async () => {
    if (!recipientEmail || selectedInvoices.length === 0) {
      alert("Please enter recipient email and select at least one invoice.");
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/api/upload/send-invoice`,
        {
          leadId,
          recipientEmail,
          files: selectedInvoices,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert("Invoice sent successfully!");
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
            {/* Contracts Section */}
            <div className="contracts-section">
              <div className="section-header">
                <h3>Existing Contracts</h3>
                <span className="contract-count">
                  {contracts.length} Contract{contracts.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="contracts-list">
                {contracts.length > 0 ? (
                  contracts.map((contractKey) => (
                    <div key={contractKey} className="contract-item">
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
                      />
                      <FileIcon className="file-icon" />
                      <span
                        className="contract-name"
                        onClick={() => handleDownload(contractKey)}
                      >
                        {getFileName(contractKey)}
                      </span>
                      {downloadLoading[contractKey] && (
                        <Loader2 className="loading-spinner small" />
                      )}
                    </div>
                  ))
                ) : (
                  <p className="no-contracts">No contracts found for this lead.</p>
                )}
              </div>
            </div>

            <div className="separator" />

            {/* Invoice Section */}
            <div className="invoice-section">
              <h3>Send Invoice</h3>
              <div className="invoice-input-group">
                <input
                  type="email"
                  placeholder="Recipient email address"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                />
                <button
                  onClick={handleSendInvoice}
                  disabled={loading || selectedInvoices.length === 0}
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
