import React, { useState } from "react";
import { Loader2, FileIcon, Search, Download, Eye } from "lucide-react";
import "../styles/sample.css";

const SampleManagementPage = ({ token }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState({});
  const [previewLoading, setPreviewLoading] = useState({});
  const [previewFile, setPreviewFile] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return alert("Please enter a search query.");

    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/onedrive/search?query=${encodeURIComponent(searchQuery)}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch documents");
      }
      
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error("Error searching for documents:", error);
      alert("Error retrieving documents. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (fileId, fileName) => {
    try {
      setDownloadLoading((prev) => ({ ...prev, [fileId]: true }));
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/onedrive/download?fileId=${fileId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (!response.ok) {
        throw new Error("Failed to download file");
      }
      
      const blob = await response.blob();  
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading document:", error);
      alert("Error downloading the file. Please try again.");
    } finally {
      setDownloadLoading((prev) => ({ ...prev, [fileId]: false }));
    }
  };

  const handlePreview = async (fileId, fileName) => {
    try {
      setPreviewLoading((prev) => ({ ...prev, [fileId]: true }));
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/onedrive/download?fileId=${fileId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (!response.ok) {
        throw new Error("Failed to preview file");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      setPreviewFile({
        url,
        name: fileName,
        id: fileId
      });
    } catch (error) {
      console.error("Error previewing document:", error);
      alert("Error previewing the file. Please try again.");
    } finally {
      setPreviewLoading((prev) => ({ ...prev, [fileId]: false }));
    }
  };

  const closePreview = () => {
    if (previewFile && previewFile.url) {
      window.URL.revokeObjectURL(previewFile.url);
    }
    setPreviewFile(null);
  };

  return (
    <div className="contract-container">
      <div className="contract-card">
        {/* Header */}
        <div className="card-header">
          <h2>Document Management</h2>
          <p>Search and download documents</p>
        </div>

        {/* Search Bar */}
        <form className="search-section" onSubmit={handleSearch}>
            <div>
          <div className="input-group">
            <label htmlFor="search-input">Search Documents</label>
            <div className="search-input">
              <Search className="search-icon" />
              <input
                id="search-input"
                type="text"
                placeholder="Enter search query"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              
            </div>
          </div>
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? <Loader2 className="loading-spinner" /> : "Search"}
          </button>
         </div>
        </form>

        {/* Results Section */}
        {documents.length > 0 && (
          <div className="contracts-section">
            <div className="section-header">
              <h3>Search Results</h3>
              <span className="contract-count">{documents.length} Files Found</span>
            </div>

            <div className="contracts-table">
              <div className="contracts-table-header">
                <div className="name-column">File Name</div>
                <div className="actions-column">Actions</div>
              </div>

              <div className="contracts-table-body">
                {documents.map((document) => (
                  <div key={document.id} className="contract-row">
                    <div className="name-column">
                      <FileIcon className="file-icon" />
                      <span className="file-name">{document.name}</span>
                    </div>
                    <div className="actions-column">
                    <span className="file-name">{document.lastModifiedDateTime.split("T")[0]}</span>

                      <button
                        className="preview-button"
                        onClick={() => handlePreview(document.id, document.name)}
                        disabled={previewLoading[document.id]}
                      >
                        {previewLoading[document.id] ? (
                          <Loader2 className="loading-spinner-small" />
                        ) : (
                          <>
                            <Eye className="button-icon" />
                            Preview
                          </>
                        )}
                      </button>
                      <button
                        className="download-button"
                        onClick={() => handleDownload(document.id, document.name)}
                        disabled={downloadLoading[document.id]}
                      >
                        {downloadLoading[document.id] ? (
                          <Loader2 className="loading-spinner-small" />
                        ) : (
                          <>
                            <Download className="button-icon" /></>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* No Results */}
        {documents.length === 0 && !loading && searchQuery && (
          <div className="no-contracts">
            <p>No documents found. Try a different search.</p>
          </div>
        )}

        {/* PDF Preview Modal */}
        {previewFile && (
          <div className="pdf-preview-modal">
            <div className="pdf-preview-content">
              <div className="pdf-preview-header">
                <h3>{previewFile.name}</h3>
                <button className="close-button" onClick={closePreview}>×</button>
              </div>
              <div className="pdf-preview-body">
                <iframe 
                  src={previewFile.url} 
                  title={`Preview of ${previewFile.name}`}
                  className="pdf-preview-iframe"
                ></iframe>
              </div>
              <div className="pdf-preview-footer">
                <button 
                  className="download-button"
                  onClick={() => handleDownload(previewFile.id, previewFile.name)}
                >
                  <Download className="button-icon" />
                  Download
                </button>
                <button className="close-button-text" onClick={closePreview}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SampleManagementPage;