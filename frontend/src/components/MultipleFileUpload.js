import React, { useState, useEffect } from "react";
import axios from "axios";
import { Loader2, Upload, Send, FileIcon } from "lucide-react";
import "../styles/multiplefile.css";

const MultipleFileUpload = ({ token }) => {
  const [leadId, setLeadId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [files, setFiles] = useState(null);
  const [existingFiles, setExistingFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [validLead, setValidLead] = useState(false);

  useEffect(() => {
    const fetchExistingFiles = async () => {
      if (leadId && projectName) {
        setLoading(true);
        try {
          const response = await axios.get(
            `http://localhost:5000/api/leads/${leadId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.data.projectName === projectName) {
            setExistingFiles(response.data.deliverables || []);
            setValidLead(true);
          } else {
            setExistingFiles([]);
            setValidLead(false);
          }
        } catch (error) {
          console.error("Error fetching files:", error);
          setExistingFiles([]);
          setValidLead(false);
        }
        setLoading(false);
      }
    };

    fetchExistingFiles();
  }, [leadId, projectName, token]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!files || !leadId || !projectName) {
      alert("Please enter both Lead ID and Project Name, and select files.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("leadId", leadId);
    formData.append("projectName", projectName);
    for (let i = 0; i < files.length; i++) {
      formData.append("deliverables", files[i]);
    }

    try {
      const res = await axios.post(
        "http://localhost:5000/api/upload/multiple",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setExistingFiles([...existingFiles, ...res.data.keys]);
      setFiles(null);

      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = "";

      alert("Files uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      alert("Error uploading files.");
    }
    setLoading(false);
  };

  const handleSendSelected = async () => {
    if (selectedFiles.length === 0) {
      alert("Please select files to send");
      return;
    }
  
    try {
      const paymentStatusRes = await axios.get(
        `http://localhost:5000/api/leads/${leadId}/paymentstatus`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      const paymentStatus = paymentStatusRes.data.paymentStatus;
  
      if (paymentStatus !== "full") {
        const confirm = window.confirm(
          `The payment status is '${paymentStatus}'. Are you sure you want to send the deliverables?`
        );
  
        if (!confirm) {
          return;
        }
      }
  
      setLoading(true);
        const res = await axios.post(
        "http://localhost:5000/api/upload/send",
        {
          leadId,
          projectName,
          files: selectedFiles,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      alert(`Deliverables sent. File Count: ${res.data.fileCount}`);
      setSelectedFiles([]);
    } catch (error) {
      console.error("Error checking payment status or sending files:", error);
      alert("Error processing your request.");
    } finally {
      setLoading(false);
    }
  };
  

  const toggleFileSelection = (fileKey) => {
    setSelectedFiles((prev) =>
      prev.includes(fileKey)
        ? prev.filter((key) => key !== fileKey)
        : [...prev, fileKey]
    );
  };

  const getFileName = (path) => path.split("/").pop();

  return (
    <div className="container">
      <h3 className="title">File Upload & Management</h3>

      {/* Lead ID and Project Name Inputs */}
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
          {/* Existing Files Section */}
          <div className="file-section">
            <h4 className="section-title">Existing Files</h4>
            {existingFiles.map((fileKey) => (
              <div
                key={fileKey}
                className={`file-item ${
                  selectedFiles.includes(fileKey) ? "selected" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedFiles.includes(fileKey)}
                  onChange={() => toggleFileSelection(fileKey)}
                />
                <FileIcon />
                <span>{getFileName(fileKey)}</span>
              </div>
            ))}
          </div>

          {/* Upload New Files Section */}
          <form onSubmit={handleUpload} className="upload-section">
            <input
              type="file"
              multiple
              onChange={(e) => setFiles(e.target.files)}
              className="file-input"
            />
            <button type="submit" className="upload-btn">
              <Upload />
              Upload Files
            </button>
          </form>

          {/* Send Selected Files */}
          <button
            onClick={handleSendSelected}
            disabled={!selectedFiles.length || loading}
            className="send-btn"
          >
            <Send />
            Send Selected Files ({selectedFiles.length})
          </button>
        </>
      )}
    </div>
  );
};

export default MultipleFileUpload;
