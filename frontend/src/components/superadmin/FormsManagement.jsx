import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Alert, Badge, Spinner, Tabs, Tab } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';

const FormsManagement = () => {
  // const { user } = useAuth(); // Temporarily unused for ESLint compliance
  const [forms, setForms] = useState([]);
  const [candidateForms, setCandidateForms] = useState([]);
  const [feedbackForms, setFeedbackForms] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Form creation state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    formType: 'candidate_profile',
    position: '',
    department: '',
    requirements: {
      experience: { min: 0, max: 0, preferred: '' },
      skills: [],
      qualifications: [],
      responsibilities: []
    },
    formFields: []
  });

  useEffect(() => {
      fetchForms();
    }, []);
  
    const fetchForms = async () => {
      try {
        const [allFormsResponse, candidateFormsResponse, feedbackFormsResponse] = await Promise.all([
          api.get('/forms'),
          api.get('/forms/type/candidate_profile'),
          api.get('/forms/type/feedback_form')
        ]);
        
        setForms(allFormsResponse.data.forms);
        setCandidateForms(candidateFormsResponse.data.forms);
        setFeedbackForms(feedbackFormsResponse.data.forms);
      } catch (error) {
        setError('Failed to fetch forms');
        console.error('Forms fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
  
    const handleCreateForm = async (e) => {
      e.preventDefault();
      setSubmitting(true);
      setError('');
  
      try {
        const formSubmissionData = {
          ...formData,
          // Only include position and department for candidate profile forms
          position: formData.formType === 'candidate_profile' ? formData.position : undefined,
          department: formData.formType === 'candidate_profile' ? formData.department : undefined
        };
  
        await api.post('/forms', formSubmissionData);
        setSuccess('Form created successfully!');
        setShowCreateModal(false);
        resetFormData();
        fetchForms();
      } catch (error) {
        setError(error.response?.data?.message || 'Failed to create form');
        console.error('Form creation error:', error);
      } finally {
        setSubmitting(false);
      }
    };
  
    const resetFormData = () => {
      setFormData({
        title: '',
        description: '',
        formType: 'candidate_profile',
        position: '',
        department: '',
        requirements: {
          experience: { min: 0, max: 0, preferred: '' },
          skills: [],
          qualifications: [],
          responsibilities: []
        },
        formFields: []
      });
    };
  
    const handleDeleteForm = async (formId) => {
      if (window.confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
        try {
          await api.delete(`/forms/${formId}`);
          setSuccess('Form deleted successfully!');
          fetchForms();
        } catch (error) {
          setError(error.response?.data?.message || 'Failed to delete form');
        }
      }
    };
  
    const handleToggleStatus = async (formId, currentStatus) => {
      try {
        await api.put(`/forms/${formId}`, { isActive: !currentStatus });
        setSuccess(`Form ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
        fetchForms();
      } catch (error) {
        setError(error.response?.data?.message || 'Failed to update form status');
      }
    };
  
    const handleShowQRCode = async (form) => {
      try {
        const response = await api.get(`/forms/${form._id}/qr-code`);
        setSelectedForm(response.data.form);
        setShowQRModal(true);
      } catch (error) {
        setError('Failed to fetch QR code');
      }
    };
  
    const handleRegenerateQR = async (formId) => {
      try {
        await api.post(`/forms/${formId}/qr-code`);
        setSuccess('QR code regenerated successfully!');
        const response = await api.get(`/forms/${formId}/qr-code`);
        setSelectedForm(response.data.form);
      } catch (error) {
        setError('Failed to regenerate QR code');
      }
    };
  
    const copyToClipboard = (text) => {
      navigator.clipboard.writeText(text);
      setSuccess('Link copied to clipboard!');
      setTimeout(() => setSuccess(''), 3000);
    };

  const addFormField = () => {
      setFormData(prev => ({
        ...prev,
        formFields: [...prev.formFields, {
          fieldName: '',
          fieldType: 'text',
          required: false,
          options: [],
          placeholder: '',
          weight: 1
        }]
      }));
    };
  
    const updateFormField = (index, field, value) => {
      setFormData(prev => ({
        ...prev,
        formFields: prev.formFields.map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        )
      }));
    };
  
    const removeFormField = (index) => {
      setFormData(prev => ({
        ...prev,
        formFields: prev.formFields.filter((_, i) => i !== index)
      }));
    };
  
    const getFormTypeBadge = (formType) => {
      const badgeConfig = {
        'candidate_profile': { variant: 'primary', text: 'Candidate Profile' },
        'feedback_form': { variant: 'info', text: 'Feedback Form' }
      };
      const config = badgeConfig[formType] || { variant: 'secondary', text: formType };
      return <Badge bg={config.variant}>{config.text}</Badge>;
    };
  
    const getStatusBadge = (isActive) => {
      return <Badge bg={isActive ? 'success' : 'secondary'}>{isActive ? 'Active' : 'Inactive'}</Badge>;
    };
  
    const getCurrentForms = () => {
      switch (activeTab) {
        case 'candidate':
          return candidateForms;
        case 'feedback':
          return feedbackForms;
        default:
          return forms;
      }
    };

  if (loading) {
    return <LoadingSpinner message="Loading forms..." />;
  }

  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>Form Creation & Management</h2>
              <p>Step 1: Create recruitment forms and generate submission links for candidates.</p>
            </div>
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              Create New Form
            </Button>
          </div>
        </Col>
      </Row>

      {(error || success) && (
        <Row className="mb-3">
          <Col>
            {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
            {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}
          </Col>
        </Row>
      )}

<Row>
        <Col>
          <Card>
            <Card.Header>
              <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-0">
                <Tab eventKey="all" title="All Forms" />
                <Tab eventKey="candidate" title="Candidate Profiles" />
                <Tab eventKey="feedback" title="Feedback Forms" />
              </Tabs>
            </Card.Header>
            <Card.Body>
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Position/Department</th>
                    <th>Type</th>
                    <th>Submissions</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getCurrentForms().map((form) => (
                    <tr key={form._id}>
                      <td>
                        <div>
                          <strong>{form.title}</strong>
                          {form.description && (
                            <>
                              <br />
                              <small className="text-muted">{form.description.substring(0, 50)}...</small>
                            </>
                          )}
                        </div>
                      </td>
                      <td>
                        {form.formType === 'candidate_profile' ? (
                          <>
                            <div>{form.position}</div>
                            <small className="text-muted">{form.department}</small>
                          </>
                        ) : (
                          <Badge bg="info">N/A</Badge>
                        )}
                      </td>
                      <td>{getFormTypeBadge(form.formType)}</td>
                      <td>{form.submissionCount}</td>
                      <td>{getStatusBadge(form.isActive)}</td>
                      <td>{new Date(form.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          <Button
                            variant="info"
                            size="sm"
                            className="me-1"
                            onClick={() => handleShowQRCode(form)}
                          >
                            QR Code
                          </Button>
                          <Button
                            variant="success"
                            size="sm"
                            className="me-1"
                            onClick={() => copyToClipboard(`${window.location.origin}/form/${form.uniqueLink}`)}
                          >
                            Copy Link
                          </Button>
                          <Button
                            variant={form.isActive ? "warning" : "success"}
                            size="sm"
                            className="me-1"
                            onClick={() => handleToggleStatus(form._id, form.isActive)}
                          >
                            {form.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteForm(form._id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              {getCurrentForms().length === 0 && (
                <div className="text-center py-4">
                  <p className="text-muted">
                    {activeTab === 'all' ? 'No forms found.' :
                     activeTab === 'candidate' ? 'No candidate profile forms found.' :
                     'No feedback forms found.'}
                  </p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Create Form Modal */}
      <Modal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Create New Recruitment Form</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <Form onSubmit={handleCreateForm}>
                      <Row>
                        <Col md={8}>
                          <Form.Group className="mb-3">
                            <Form.Label>Form Title *</Form.Label>
                            <Form.Control
                              type="text"
                              value={formData.title}
                              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                              required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>Form Type *</Form.Label>
                            <Form.Select
                              value={formData.formType}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                formType: e.target.value,
                                position: e.target.value === 'candidate_profile' ? prev.position : '',
                                department: e.target.value === 'candidate_profile' ? prev.department : ''
                              }))}
                              required
                            >
                              <option value="candidate_profile">Candidate Profile Form</option>
                              <option value="feedback_form">Feedback Form</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                      </Row>
          
                      {formData.formType === 'candidate_profile' && (
                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Position *</Form.Label>
                              <Form.Control
                                type="text"
                                value={formData.position}
                                onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                                required={formData.formType === 'candidate_profile'}
                              />
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Department *</Form.Label>
                              <Form.Control
                                type="text"
                                value={formData.department}
                                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                                required={formData.formType === 'candidate_profile'}
                              />
                            </Form.Group>
                          </Col>
                        </Row>
                      )}
          
                      <Row>
                        <Col>
                          <Form.Group className="mb-3">
                            <Form.Label>Description</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={2}
                              value={formData.description}
                              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                              placeholder={
                                formData.formType === 'candidate_profile'
                                  ? "Describe the job requirements and expectations..."
                                  : "Describe the purpose and criteria for this feedback form..."
                              }
                            />
                          </Form.Group>
                        </Col>
                      </Row>

            {/* Form Fields Section */}
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5>Form Fields</h5>
                <Button variant="outline-primary" size="sm" onClick={addFormField}>
                  Add Field
                </Button>
              </div>

              {formData.formFields.map((field, index) => (
                <Card key={index} className="mb-3">
                  <Card.Body>
                    <Row>
                      <Col md={4}>
                        <Form.Group className="mb-2">
                          <Form.Label>Field Name *</Form.Label>
                          <Form.Control
                            type="text"
                            value={field.fieldName}
                            onChange={(e) => updateFormField(index, 'fieldName', e.target.value)}
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col md={3}>
                        <Form.Group className="mb-2">
                          <Form.Label>Field Type *</Form.Label>
                          <Form.Select
                                                      value={field.fieldType}
                                                      onChange={(e) => updateFormField(index, 'fieldType', e.target.value)}
                                                      required
                                                    >
                                                      <option value="text">Text</option>
                                                      <option value="email">Email</option>
                                                      <option value="number">Number</option>
                                                      <option value="date">Date</option>
                                                      <option value="textarea">Textarea</option>
                                                      <option value="select">Select</option>
                                                      <option value="file">File</option>
                                                      {formData.formType === 'feedback_form' && (
                                                        <>
                                                          <option value="rating">Rating (1-5)</option>
                                                          <option value="yes_no">Yes/No</option>
                                                        </>
                                                      )}
                                                    </Form.Select>
                                                  </Form.Group>
                                                </Col>
                                                <Col md={2}>
                                                  <Form.Group className="mb-2">
                                                    <Form.Label>Required</Form.Label>
                                                    <Form.Check
                                                      type="checkbox"
                                                      checked={field.required}
                                                      onChange={(e) => updateFormField(index, 'required', e.target.checked)}
                                                    />
                                                  </Form.Group>
                                                </Col>
                                                <Col md={2}>
                                                  <Form.Group className="mb-2">
                                                    <Form.Label>Placeholder</Form.Label>
                                                    <Form.Control
                                                      type="text"
                                                      value={field.placeholder}
                                                      onChange={(e) => updateFormField(index, 'placeholder', e.target.value)}
                                                    />
                                                  </Form.Group>
                                                </Col>
                                                <Col md={2}>
                                                  <Form.Group className="mb-2">
                                                    <Form.Label>Weight</Form.Label>
                                                    <Form.Select
                                                      value={field.weight}
                                                      onChange={(e) => updateFormField(index, 'weight', parseInt(e.target.value))}
                                                    >
                                                      <option value={1}>1 (Low)</option>
                                                      <option value={2}>2 (Medium)</option>
                                                      <option value={3}>3 (High)</option>
                                                      <option value={4}>4 (Very High)</option>
                                                      <option value={5}>5 (Critical)</option>
                                                    </Form.Select>
                                                  </Form.Group>
                                                </Col>
                                                <Col md={1}>
                                                  <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    className="mt-4"
                                                    onClick={() => removeFormField(index)}
                                                  >
                                                    ×
                                                  </Button>
                                                </Col>
                                              </Row>
                                              {field.fieldType === 'select' && (
                                                <Row className="mt-2">
                                                  <Col>
                                                    <Form.Group>
                                                      <Form.Label>Options (comma-separated)</Form.Label>
                                                      <Form.Control
                                                        type="text"
                                                        placeholder="Option 1, Option 2, Option 3"
                                                        value={field.options?.join(', ') || ''}
                                                        onChange={(e) => updateFormField(index, 'options', e.target.value.split(',').map(opt => opt.trim()).filter(opt => opt))}
                                                      />
                                                    </Form.Group>
                                                  </Col>
                                                </Row>
                                              )}
                                            </Card.Body>
                                          </Card>
                                        ))}
                                      </div>

            <div className="d-flex justify-content-end">
              <Button variant="secondary" onClick={() => setShowCreateModal(false)} className="me-2">
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" className="me-2" />
                    Creating...
                  </>
                ) : (
                  'Create Form'
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
      
            {/* QR Code Modal */}
            <Modal
              show={showQRModal}
              onHide={() => setShowQRModal(false)}
              size="md"
              centered
            >
              <Modal.Header closeButton>
                <Modal.Title>QR Code & Form Access</Modal.Title>
              </Modal.Header>
              <Modal.Body className="text-center">
                {selectedForm && (
                  <div>
                    <h5 className="mb-3">{selectedForm.title}</h5>
                    {selectedForm.qrCode?.data ? (
                      <div>
                        <img
                          src={selectedForm.qrCode.data}
                          alt="QR Code"
                          className="img-fluid mb-3"
                          style={{ maxWidth: '300px' }}
                        />
                        <div className="mb-3">
                          <strong>Form Link:</strong>
                          <br />
                          <code className="bg-light p-2 d-block mt-2">
                            {selectedForm.qrCode.url}
                          </code>
                        </div>
                        <Button
                          variant="success"
                          className="me-2"
                          onClick={() => copyToClipboard(selectedForm.qrCode.url)}
                        >
                          Copy Link
                        </Button>
                        <Button
                          variant="info"
                          onClick={() => handleRegenerateQR(selectedForm._id)}
                        >
                          Regenerate QR
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-muted mb-3">No QR code generated yet.</p>
                        <Button
                          variant="primary"
                          onClick={() => handleRegenerateQR(selectedForm._id)}
                        >
                          Generate QR Code
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowQRModal(false)}>
                  Close
                </Button>
              </Modal.Footer>
            </Modal>
          </Container>
        );
      };
      
      export default FormsManagement;
