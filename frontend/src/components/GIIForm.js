import React, { useState } from 'react';
import '../styles/GIIForm.css'; // Adjust the path as necessary

const GIIForm = ({ token }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    querySource: '',
    reportIndustry: '',
    salesPerson: '',
    clientCompany: '',
    clientDesignation: '',
    clientDepartment: '',
    clientCountry: '',
    clientRequirement: ''
  });

  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // Add your API call here
      console.log('Form submitted:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('Form submitted successfully!');
      
      // Reset form
      setFormData({
        title: '',
        querySource: '',
        reportIndustry: '',
        salesPerson: '',
        clientCompany: '',
        clientDesignation: '',
        clientDepartment: '',
        clientCountry: '',
        clientRequirement: ''
      });
      
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error submitting form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      title: '',
      querySource: '',
      reportIndustry: '',
      salesPerson: '',
      clientCompany: '',
      clientDesignation: '',
      clientDepartment: '',
      clientCountry: '',
      clientRequirement: ''
    });
  };

  return (
    <div className="gii-container">
      <div className="gii-header">
        <h1 className="gii-title">📋 GII Management System</h1>
        <p className="gii-subtitle">Manage your client queries and requirements</p>
      </div>

      {/* GG Slider Toggle */}
      <div className="gii-toggle-section">
        <div className="toggle-container">
          <label className="toggle-label">
            <span className="toggle-text">GG Form:</span>
            <div className="slider-container">
              <input
                type="checkbox"
                checked={showForm}
                onChange={(e) => setShowForm(e.target.checked)}
                className="toggle-checkbox"
              />
              <span className="slider">
                <span className="slider-button"></span>
              </span>
            </div>
            <span className="toggle-status">{showForm ? 'Open' : 'Closed'}</span>
          </label>
        </div>
      </div>

      {/* Form Section */}
      {showForm && (
        <div className="gii-form-section">
          <div className="form-container">
            <div className="form-header">
              <h2>📝 Client Information Form</h2>
              <p>Please fill in all the required details</p>
            </div>

            <form onSubmit={handleSubmit} className="gii-form">
              <div className="form-grid">
                {/* Title */}
                <div className="form-group">
                  <label htmlFor="title" className="form-label">
                    <i className="fas fa-heading"></i>
                    Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter title"
                    required
                  />
                </div>

                {/* Query Source */}
                <div className="form-group">
                  <label htmlFor="querySource" className="form-label">
                    <i className="fas fa-source"></i>
                    Query Source *
                  </label>
                  <select
                    id="querySource"
                    name="querySource"
                    value={formData.querySource}
                    onChange={handleInputChange}
                    className="form-select"
                    required
                  >
                    <option value="">Select Source</option>
                    <option value="website">Website</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="referral">Referral</option>
                    <option value="social-media">Social Media</option>
                    <option value="trade-show">Trade Show</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Report Industry */}
                <div className="form-group">
                  <label htmlFor="reportIndustry" className="form-label">
                    <i className="fas fa-industry"></i>
                    Report Industry *
                  </label>
                  <select
                    id="reportIndustry"
                    name="reportIndustry"
                    value={formData.reportIndustry}
                    onChange={handleInputChange}
                    className="form-select"
                    required
                  >
                    <option value="">Select Industry</option>
                    <option value="technology">Technology</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="finance">Finance</option>
                    <option value="manufacturing">Manufacturing</option>
                    <option value="retail">Retail</option>
                    <option value="automotive">Automotive</option>
                    <option value="energy">Energy</option>
                    <option value="telecommunications">Telecommunications</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Sales Person */}
                <div className="form-group">
                  <label htmlFor="salesPerson" className="form-label">
                    <i className="fas fa-user-tie"></i>
                    Sales Person *
                  </label>
                  <input
                    type="text"
                    id="salesPerson"
                    name="salesPerson"
                    value={formData.salesPerson}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter sales person name"
                    required
                  />
                </div>

                {/* Client Company */}
                <div className="form-group">
                  <label htmlFor="clientCompany" className="form-label">
                    <i className="fas fa-building"></i>
                    Client Company *
                  </label>
                  <input
                    type="text"
                    id="clientCompany"
                    name="clientCompany"
                    value={formData.clientCompany}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter client company name"
                    required
                  />
                </div>

                {/* Client Designation */}
                <div className="form-group">
                  <label htmlFor="clientDesignation" className="form-label">
                    <i className="fas fa-id-badge"></i>
                    Client Designation *
                  </label>
                  <input
                    type="text"
                    id="clientDesignation"
                    name="clientDesignation"
                    value={formData.clientDesignation}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter client designation"
                    required
                  />
                </div>

                {/* Client Department */}
                <div className="form-group">
                  <label htmlFor="clientDepartment" className="form-label">
                    <i className="fas fa-sitemap"></i>
                    Client Department *
                  </label>
                  <select
                    id="clientDepartment"
                    name="clientDepartment"
                    value={formData.clientDepartment}
                    onChange={handleInputChange}
                    className="form-select"
                    required
                  >
                    <option value="">Select Department</option>
                    <option value="marketing">Marketing</option>
                    <option value="sales">Sales</option>
                    <option value="it">IT</option>
                    <option value="hr">Human Resources</option>
                    <option value="finance">Finance</option>
                    <option value="operations">Operations</option>
                    <option value="research">Research & Development</option>
                    <option value="procurement">Procurement</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Client Country */}
                <div className="form-group">
                  <label htmlFor="clientCountry" className="form-label">
                    <i className="fas fa-globe"></i>
                    Client Country *
                  </label>
                  <select
                    id="clientCountry"
                    name="clientCountry"
                    value={formData.clientCountry}
                    onChange={handleInputChange}
                    className="form-select"
                    required
                  >
                    <option value="">Select Country</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Germany">Germany</option>
                    <option value="France">France</option>
                    <option value="Japan">Japan</option>
                    <option value="Australia">Australia</option>
                    <option value="India">India</option>
                    <option value="China">China</option>
                    <option value="Brazil">Brazil</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Client Requirement - Full Width */}
              <div className="form-group full-width">
                <label htmlFor="clientRequirement" className="form-label">
                  <i className="fas fa-clipboard-list"></i>
                  Client Requirement *
                </label>
                <textarea
                  id="clientRequirement"
                  name="clientRequirement"
                  value={formData.clientRequirement}
                  onChange={handleInputChange}
                  className="form-textarea"
                  placeholder="Describe the client's requirements in detail..."
                  rows="4"
                  required
                ></textarea>
              </div>

              {/* Form Actions */}
              <div className="form-actions">
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn btn-reset"
                  disabled={submitting}
                >
                  <i className="fas fa-undo"></i>
                  Reset
                </button>
                <button
                  type="submit"
                  className="btn btn-submit"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane"></i>
                      Submit Form
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Info Section when form is closed */}
      {!showForm && (
        <div className="info-section">
          <div className="info-card">
            <i className="fas fa-info-circle info-icon"></i>
            <h3>GII Form is Currently Closed</h3>
            <p>Toggle the GG switch above to open the client information form.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GIIForm;