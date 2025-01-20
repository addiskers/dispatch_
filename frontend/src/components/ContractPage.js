import React, { useState, useEffect } from "react";
import axios from "axios";
import { Loader2, FileIcon, Upload,  } from "lucide-react";
import "../styles/multiplefile.css";

const ContractPage = ({ token }) => {
  const [leadId, setLeadId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [contracts, setContracts] = useState([]);
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
            `http://localhost:5000/api/leads/${leadId}`,
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
        "http://localhost:5000/api/leads/upload-contracts",
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
      setDownloadLoading(prev => ({ ...prev, [contractKey]: true }));
      const response = await axios.get(
        `http://localhost:5000/api/leads/download-contract`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { key: contractKey }  
        }
      );
  
      if (response.data.url) {
        const link = document.createElement('a');
        link.href = response.data.url; 
        link.setAttribute('download', getFileName(contractKey));
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error('Download URL not found in response');
      }
    } catch (error) {
      console.error("Error downloading contract:", error);
      alert(`Error downloading the contract: ${error.message || 'Please try again.'}`);
    } finally {
      setDownloadLoading(prev => ({ ...prev, [contractKey]: false }));
    }
  };

  return (
    <div className="container">
      <h3 className="title">Contract Management</h3>

      <div className="inputs">
        <input
          className="input-field"
          placeholder="Lead ID"
          value={leadId}
          onChange={(e) => setLeadId(e.target.value)}
        />
        <input
          className="input-field"
          placeholder="Project Name"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
        />
      </div>

      {loading && (
        <div className="loading">
          <Loader2 className="animate-spin" />
        </div>
      )}

      {validLead && (
        <>
          <div className="contracts-section">
            <h4 className="section-title">Existing Contracts</h4>
            {contracts.length > 0 ? (
              contracts.map((contractKey) => (
                <div key={contractKey} className="contract-item">
                  <FileIcon className="w-4 h-4 mr-2" />
                  <span 
                    className="contract-name cursor-pointer hover:text-blue-600"
                    onClick={() => handleDownload(contractKey)}
                  >
                    {getFileName(contractKey)}
                  </span>
                  {downloadLoading[contractKey] && (
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  )}
                </div>
              ))
            ) : (
              <p>No contracts found for this lead.</p>
            )}
          </div>

          <form onSubmit={handleUploadContracts} className="upload-section">
            <input
              type="file"
              multiple
              onChange={(e) => setFiles(e.target.files)}
              className="file-input"
            />
            <button type="submit" className="upload-btn" disabled={loading}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Contracts
            </button>
          </form>
        </>
      )}

      {!validLead && leadId && projectName && (
        <p className="error-message">Invalid Lead ID or Project Name.</p>
      )}
    </div>
  );
};

export default ContractPage;