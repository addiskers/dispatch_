// src/components/MultipleFileUpload.js
import React, { useState } from "react";
import axios from "axios";

function MultipleFileUpload({ token }) {
  const [leadId, setLeadId] = useState("");
  const [files, setFiles] = useState(null);

  async function handleUpload(e) {
    e.preventDefault();
    if (!files || !leadId) {
      alert("Please select files and enter a lead ID");
      return;
    }

    // We can pass an array of files using FormData
    const formData = new FormData();
    formData.append("leadId", leadId);
    for (let i = 0; i < files.length; i++) {
      formData.append("deliverables", files[i]);
    }

    try {
      const res = await axios.post("http://localhost:5000/api/upload/multiple", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      alert("Files uploaded: " + JSON.stringify(res.data.keys));
    } catch (error) {
      console.error("Upload error:", error);
      alert("Error uploading files");
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!leadId) {
      alert("Enter a lead ID to send deliverables");
      return;
    }
    try {
      const res = await axios.post(
        "http://localhost:5000/api/upload/send",
        { leadId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      alert(`Deliverables sent. FileCount: ${res.data.fileCount}`);
    } catch (error) {
      console.error("Send error:", error);
      alert("Error sending deliverables");
    }
  }

  return (
    <div style={{ marginTop: 30 }}>
      <h3>Multiple File Upload</h3>
      <form onSubmit={handleUpload}>
        <input
          placeholder="Lead ID"
          value={leadId}
          onChange={(e) => setLeadId(e.target.value)}
        />
        <input
          type="file"
          multiple
          onChange={(e) => setFiles(e.target.files)}
        />
        <button type="submit">Upload Files</button>
      </form>

      <button onClick={handleSend} style={{ marginTop: 10 }}>
        Send All Deliverables
      </button>
    </div>
  );
}

export default MultipleFileUpload;
