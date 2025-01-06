import React, { useState } from "react";
import axios from "axios";

function MultipleFileUpload({ token }) {
  const [leadId, setLeadId] = useState("");
  const [projectName, setProjectName] = useState(""); // Added projectName
  const [files, setFiles] = useState(null);

  async function handleUpload(e) {
    e.preventDefault();
    if (!files || !leadId || !projectName) {
      alert("Please enter both Lead ID and Project Name, and select files.");
      return;
    }

    const formData = new FormData();
    formData.append("leadId", leadId);
    formData.append("projectName", projectName); // Include projectName
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
    if (!leadId || !projectName) {
      alert("Please enter both Lead ID and Project Name.");
      return;
    }
    try {
      const res = await axios.post(
        "http://localhost:5000/api/upload/send",
        { leadId, projectName }, // Include projectName
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      alert(`Deliverables sent. File Count: ${res.data.fileCount}`);
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
          placeholder="Project Name"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)} // Added projectName input
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
