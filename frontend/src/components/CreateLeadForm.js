import React, { useState } from "react";
import axios from "axios";
import { Form, Button, Row, Col ,Spinner } from "react-bootstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

function CreateLeadForm({ token, onLeadCreated }) {
  const [form, setForm] = useState({
    leadType: "",
    leadId: "",
    clientName: [],
    clientEmail: [],
    clientCompany: "",
    projectName: "",
    projectDescription: "",
    paymentStatus: "not_received",
    deliveryDate: null,
    paymentDate: null,
    sqcode: "",
  });
  const [contracts, setContracts] = useState([]);
  const [researchRequirements, setResearchRequirements] = useState([]); // New state for research requirements
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchNextLeadId = async (leadType) => {
    if (!leadType) return;
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/api/leads/next-lead-id?leadType=${leadType}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setForm((prevForm) => ({
        ...prevForm,
        leadId: response.data.nextLeadId,
        leadType,
      }));
    } catch (error) {
      console.error("Error fetching next lead ID:", error);
    }
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    setError("");
    setUploadProgress(0);
    setIsSubmitting(true);

    if (!form.leadId || !form.clientName.length || !form.clientEmail.length) {
      setError("Lead ID, Client Name(s), and Client Email(s) are required.");
      setIsSubmitting(false);
      return;
    }

    try {
      const leadResponse = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/api/leads`,
        form,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Upload contracts if any
      if (contracts.length > 0) {
        const contractFormData = new FormData();
        contractFormData.append("leadId", form.leadId);
        contracts.forEach((file) => {
          contractFormData.append("contracts", file);
        });

        await axios.post(
          `${process.env.REACT_APP_API_BASE_URL}/api/leads/upload-contracts`,
          contractFormData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
            onUploadProgress: (progressEvent) => {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 50) / progressEvent.total // 50% for contracts
              );
              setUploadProgress(percentCompleted);
            },
          }
        );
      }

      // Upload research requirements if any
      if (researchRequirements.length > 0) {
        const researchFormData = new FormData();
        researchFormData.append("leadId", form.leadId);
        researchRequirements.forEach((file) => {
          researchFormData.append("researchRequirements", file);
        });

        await axios.post(
          `${process.env.REACT_APP_API_BASE_URL}/api/leads/upload-research-requirements`,
          researchFormData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
            onUploadProgress: (progressEvent) => {
              const percentCompleted = Math.round(
                50 + (progressEvent.loaded * 50) / progressEvent.total // 50-100% for research requirements
              );
              setUploadProgress(percentCompleted);
            },
          }
        );
      }

      alert("Lead created successfully!");
      setForm({
        leadType: "",
        leadId: "",
        clientName: [],
        clientEmail: [],
        clientCompany: "",
        projectName: "",
        projectDescription: "",
        paymentStatus: "not_received",
        deliveryDate: null,
        paymentDate: null,
        sqcode: "",
      });
      setContracts([]);
      setResearchRequirements([]);
      setUploadProgress(0);
      onLeadCreated();
    } catch (error) {
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError("Error creating lead. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      setError("Maximum 5 files can be uploaded at once");
      return;
    }
    setContracts(files);
  };

  const handleResearchRequirementsChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      setError("Maximum 5 files can be uploaded at once");
      return;
    }
    setResearchRequirements(files);
  };

  const removeFile = (index) => {
    setContracts(contracts.filter((_, i) => i !== index));
  };

  const removeResearchFile = (index) => {
    setResearchRequirements(researchRequirements.filter((_, i) => i !== index));
  };

  const addClientName = (e) => {
    if (e.key === "," && nameInput.trim()) {
      e.preventDefault();
      setForm((prevForm) => ({
        ...prevForm,
        clientName: [...prevForm.clientName, nameInput.trim()],
      }));
      setNameInput("");
    }
  };

  const addClientEmail = (e) => {
    if (e.key === "," && emailInput.trim()) {
      e.preventDefault();
      setForm((prevForm) => ({
        ...prevForm,
        clientEmail: [...prevForm.clientEmail, emailInput.trim()],
      }));
      setEmailInput("");
    }
  };

  const handleDateChange = (date, field) => {
    if (!date) {
      setForm(prev => ({ ...prev, [field]: null }));
      return;
    }

    // Create date at midnight UTC
    const utcDate = new Date(Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0, 0, 0, 0
    ));

    setForm(prev => ({
      ...prev,
      [field]: utcDate
    }));
  };
 
  return (
    // CHANGED: Removed .container class and added full-width styling
    <div style={{ width: '100%', padding: '90px', boxSizing: 'border-box' }}>
      <h3>Create Lead</h3>
      {error && <p className="text-danger">{error}</p>}
      {uploadProgress > 0 && (
        <div className="mb-3">
          <div className="progress">
            <div
              className="progress-bar"
              role="progressbar"
              style={{ width: `${uploadProgress}%` }}
              aria-valuenow={uploadProgress}
              aria-valuemin="0"
              aria-valuemax="100"
            >
              {uploadProgress}%
            </div>
          </div>
        </div>
      )}
      <Form onSubmit={handleCreateLead}>
        
        <Row>
        <Col md={2}>
            <Form.Group className="mb-3">
              <Form.Label>Lead Type</Form.Label>
              <Form.Select
                value={form.leadType}
                onChange={(e) => fetchNextLeadId(e.target.value)}
              >
                <option value="">Select Lead Type</option>
                <option value="SQ">SQ</option>
                <option value="GII">GII</option>
                <option value="MK">MK</option>
              </Form.Select>
            </Form.Group>
          </Col>

          <Col md={5}>
            <Form.Group className="mb-3">
              <Form.Label>Generated Lead ID</Form.Label>
              <Form.Control type="text" value={form.leadId} readOnly />
            </Form.Group>
          </Col>
          <Col md={5}>
            <Form.Group className="mb-3">
              <Form.Label>Client Company</Form.Label>
              <Form.Control
                placeholder="Enter Client Company"
                value={form.clientCompany}
                onChange={(e) => setForm({ ...form, clientCompany: e.target.value })}
                onBlur={(e) => setForm({ ...form, clientCompany: e.target.value.trim() })}
              />
            </Form.Group>
          </Col>
        </Row>

        {/* Client Names and Emails section */}
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Client Names</Form.Label>
              <div className="tags-input">
                {form.clientName.map((name, index) => (
                  <span key={index} className="tag">
                    {name}
                    <Button
                      variant="link"
                      onClick={() =>
                        setForm((prevForm) => ({
                          ...prevForm,
                          clientName: prevForm.clientName.filter(
                            (_, i) => i !== index
                          ),
                        }))
                      }
                    >
                      ×
                    </Button>
                  </span>
                ))}
                <Form.Control
                  placeholder="Add client name (Press ',' to add)"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={addClientName}
                />
              </div>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Client Emails</Form.Label>
              <div className="tags-input">
                {form.clientEmail.map((email, index) => (
                  <span key={index} className="tag">
                    {email}
                    <Button
                      variant="link"
                      onClick={() =>
                        setForm((prevForm) => ({
                          ...prevForm,
                          clientEmail: prevForm.clientEmail.filter(
                            (_, i) => i !== index
                          ),
                        }))
                      }
                    >
                      ×
                    </Button>
                  </span>
                ))}
                <Form.Control
                  placeholder="Add client email (Press ',' to add)"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={addClientEmail}
                />
              </div>
            </Form.Group>
          </Col>
        </Row>

        {/* Project Details */}
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Project Name</Form.Label>
              <Form.Control
                placeholder="Enter Project Name"
                value={form.projectName}
                onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                onBlur={(e) => setForm({ ...form, projectName: e.target.value.trim() })}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Sqcode</Form.Label>
              <Form.Control
                placeholder="Enter Sqcode"
                value={form.sqcode}
                onChange={(e) => setForm({ ...form, sqcode: e.target.value })}
                onBlur={(e) => setForm({ ...form, sqcode: e.target.value.trim() })}
              />
            </Form.Group>
          </Col>
        </Row>

        <Form.Group className="mb-3">
          <Form.Label>Project Description</Form.Label>
          <Form.Control
            as="textarea"
            placeholder="Enter Project Description"
            value={form.projectDescription}
            onChange={(e) => setForm({ ...form, projectDescription: e.target.value })}
            onBlur={(e) => setForm({ ...form, projectDescription: e.target.value.trim() })}
          />
        </Form.Group>

        {/* Dates */}
        <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Delivery Date</Form.Label>
            <DatePicker
              selected={form.deliveryDate}
              onChange={(date) => handleDateChange(date, 'deliveryDate')}
              dateFormat="yyyy-MM-dd"
              placeholderText="Select Delivery Date"
              className="form-control"
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Payment Date</Form.Label>
            <DatePicker
              selected={form.paymentDate}
              onChange={(date) => handleDateChange(date, 'paymentDate')}
              dateFormat="yyyy-MM-dd"
              placeholderText="Select Payment Date"
              className="form-control"
            />
          </Form.Group>
        </Col>
      </Row>

        {/* Contracts Section */}
        <Form.Group className="mb-3">
          <Form.Label>Upload Contracts (Max 5 files)</Form.Label>
          <Form.Control
            type="file"
            multiple
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx"
          />
          {contracts.length > 0 && (
            <div className="mt-2">
              <h6>Selected Contract Files:</h6>
              <ul className="list-unstyled">
                {contracts.map((file, index) => (
                  <li key={index} className="mb-1">
                    {file.name}
                    <Button
                      variant="link"
                      className="text-danger p-0 ms-2"
                      onClick={() => removeFile(index)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Form.Group>

        {/* Research Requirements Section */}
        <Form.Group className="mb-3">
          <Form.Label>Upload Research Requirements (Max 5 files)</Form.Label>
          <Form.Control
            type="file"
            multiple
            onChange={handleResearchRequirementsChange}
            accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
          />
          {researchRequirements.length > 0 && (
            <div className="mt-2">
              <h6>Selected Research Requirement Files:</h6>
              <ul className="list-unstyled">
                {researchRequirements.map((file, index) => (
                  <li key={index} className="mb-1">
                    {file.name}
                    <Button
                      variant="link"
                      className="text-danger p-0 ms-2"
                      onClick={() => removeResearchFile(index)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Form.Group>

        <Button 
          type="submit" 
          variant="primary" 
          disabled={isSubmitting}
          className="position-relative"
        >
          {isSubmitting ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              Creating Lead...
            </>
          ) : (
            'Create Lead'
          )}
        </Button>
      </Form>

      {/* Add overlay when submitting */}
      {isSubmitting && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            zIndex: 1050,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <div className="bg-white p-4 rounded shadow-lg">
            <Spinner animation="border" role="status" className="me-2" />
            <span>Creating Lead...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreateLeadForm;