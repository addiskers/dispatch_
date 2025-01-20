import React, { useState } from "react";
import axios from "axios";
import { Form, Button, Row, Col } from "react-bootstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

function CreateLeadForm({ token, onLeadCreated }) {
  const [form, setForm] = useState({
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
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleCreateLead = async (e) => {
    e.preventDefault();
    setError("");
    setUploadProgress(0);

    if (!form.leadId || !form.clientName.length || !form.clientEmail.length) {
      setError("Lead ID, Client Name(s), and Client Email(s) are required.");
      return;
    }

    try {
      // First create the lead
      const leadResponse = await axios.post(
        "http://localhost:5000/api/leads",
        form,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // If there are contracts to upload, handle them
      if (contracts.length > 0) {
        const formData = new FormData();
        formData.append("leadId", form.leadId);
        contracts.forEach((file) => {
          formData.append("contracts", file);
        });

        await axios.post(
          "http://localhost:5000/api/leads/upload-contracts",
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
            onUploadProgress: (progressEvent) => {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress(percentCompleted);
            },
          }
        );
      }

      alert("Lead created successfully!");
      setForm({
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
      setUploadProgress(0);
      onLeadCreated();
    } catch (error) {
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError("Error creating lead. Please try again.");
      }
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

  const removeFile = (index) => {
    setContracts(contracts.filter((_, i) => i !== index));
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

  return (
    <div className="container mt-4">
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
        {/* Existing form groups remain the same until the contracts section */}
        
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Lead ID</Form.Label>
              <Form.Control
                placeholder="Enter Lead ID"
                value={form.leadId}
                onChange={(e) => setForm({ ...form, leadId: e.target.value })}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Client Company</Form.Label>
              <Form.Control
                placeholder="Enter Client Company"
                value={form.clientCompany}
                onChange={(e) =>
                  setForm({ ...form, clientCompany: e.target.value })
                }
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
                onChange={(e) =>
                  setForm({ ...form, projectName: e.target.value })
                }
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Sqcode</Form.Label>
              <Form.Control
                placeholder="Enter Sqcode"
                value={form.sqcode}
                onChange={(e) =>
                  setForm({ ...form, sqcode: e.target.value })
                }
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
            onChange={(e) =>
              setForm({ ...form, projectDescription: e.target.value })
            }
          />
        </Form.Group>

        {/* Dates */}
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Delivery Date</Form.Label>
              <DatePicker
                selected={form.deliveryDate}
                onChange={(date) =>
                  setForm({ ...form, deliveryDate: date })
                }
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
                onChange={(date) => setForm({ ...form, paymentDate: date })}
                dateFormat="yyyy-MM-dd"
                placeholderText="Select Payment Date"
                className="form-control"
              />
            </Form.Group>
          </Col>
        </Row>

        {/* Updated Contracts Section */}
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
              <h6>Selected Files:</h6>
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

        <Button type="submit" variant="primary">
          Create Lead
        </Button>
      </Form>
    </div>
  );
}

export default CreateLeadForm;