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
    sqcode: "",
  });
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [error, setError] = useState("");

  const handleCreateLead = async (e) => {
    e.preventDefault();
    setError("");

    // Frontend Validation
    if (!form.leadId || !form.clientName.length || !form.clientEmail.length) {
      setError("Lead ID, Client Name(s), and Client Email(s) are required.");
      return;
    }

    try {
      // Send lead data to backend
      await axios.post("http://localhost:5000/api/leads", form, {
        headers: { Authorization: `Bearer ${token}` },
      });

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
        sqcode: "",
      });
      onLeadCreated(); // Notify parent to refresh leads table
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        setError(error.response.data.message); // Show backend error
      } else {
        setError("Error creating lead. Please try again.");
      }
    }
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
      {error && <p style={{ color: "red" }}>{error}</p>}
      <Form onSubmit={handleCreateLead}>
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
                      &times;
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
                      &times;
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

        <Button type="submit" variant="primary">
          Create Lead
        </Button>
      </Form>
    </div>
  );
}

export default CreateLeadForm;
