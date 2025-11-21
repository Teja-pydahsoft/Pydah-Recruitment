import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Badge, Spinner, Tabs, Tab } from 'react-bootstrap';
import api from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import ToastNotificationContainer from '../ToastNotificationContainer';

const FormsManagement = () => {
  const { hasWritePermission } = useAuth();
  const canWrite = hasWritePermission('forms.manage');
  
  const [forms, setForms] = useState([]);
  const [teachingForms, setTeachingForms] = useState([]);
  const [nonTeachingForms, setNonTeachingForms] = useState([]);
  const [feedbackForms, setFeedbackForms] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ type: '', message: '' });
  const [activeTab, setActiveTab] = useState('teaching');
  const [editingForm, setEditingForm] = useState(null);

  // Form creation state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    formType: 'candidate_profile',
    formCategory: 'teaching', // 'teaching' or 'non_teaching'
    campus: '',
    position: '',
    department: '',
    closingDate: '',
    vacancies: 1,
    requirements: {
      experience: { min: 0, max: 0, preferred: '' },
      skills: [],
      qualifications: [],
      responsibilities: []
    },
    formFields: []
  });

  const [departments, setDepartments] = useState([]);

  useEffect(() => {
      fetchForms();
    }, []);

  useEffect(() => {
    // Only fetch departments for teaching forms
    if (formData.campus && formData.formCategory === 'teaching') {
      fetchDepartments(formData.campus);
    } else {
      setDepartments([]);
    }
  }, [formData.campus, formData.formCategory]);

  useEffect(() => {
    // Auto-load template when category changes (only if not editing and formFields is empty)
    if (formData.formCategory && !editingForm && formData.formFields.length === 0) {
      if (formData.formCategory === 'teaching') {
        loadTeachingTemplate();
      } else if (formData.formCategory === 'non_teaching') {
        loadNonTeachingTemplate();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.formCategory]);


  const fetchDepartments = async (campus) => {
    try {
      const response = await api.get(`/courses/departments/${campus}`);
      setDepartments(response.data.departments || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      setDepartments([]);
    }
  };
  
    const fetchForms = async () => {
      try {
        const [allFormsResponse, teachingFormsResponse, nonTeachingFormsResponse, feedbackFormsResponse] = await Promise.all([
          api.get('/forms'),
          api.get('/forms/category/teaching'),
          api.get('/forms/category/non_teaching'),
          api.get('/forms/type/feedback_form')
        ]);
        
        setForms(allFormsResponse.data.forms);
        setTeachingForms(teachingFormsResponse.data.forms);
        setNonTeachingForms(nonTeachingFormsResponse.data.forms);
        setFeedbackForms(feedbackFormsResponse.data.forms);
      } catch (error) {
        setToast({ type: 'danger', message: 'Failed to fetch forms' });
        console.error('Forms fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
  
    const handleCreateForm = async (e) => {
      e.preventDefault();
      setSubmitting(true);

      try {
        // Validate required fields for candidate_profile forms
        if (formData.formType === 'candidate_profile') {
          if (!formData.campus || !formData.campus.trim()) {
            setToast({ type: 'danger', message: 'Campus is required for candidate profile forms' });
            setSubmitting(false);
            return;
          }
          // Department is only required for teaching forms, not for non-teaching
          if (formData.formCategory === 'teaching' && (!formData.department || !formData.department.trim())) {
            setToast({ type: 'danger', message: 'Department is required for teaching forms' });
            setSubmitting(false);
            return;
          }
          if (!formData.position || !formData.position.trim()) {
            setToast({ type: 'danger', message: 'Position is required for candidate profile forms' });
            setSubmitting(false);
            return;
          }
        }

        // Build form submission data
        const formSubmissionData = {
          title: formData.title,
          description: formData.description,
          formType: formData.formType,
          formFields: formData.formFields,
          requirements: formData.requirements
        };

        // Only include position, campus, department, closingDate, vacancies, and formCategory for candidate profile forms
        if (formData.formType === 'candidate_profile') {
          formSubmissionData.position = formData.position.trim();
          formSubmissionData.campus = formData.campus.trim();
          // Department is only required for teaching forms
          if (formData.formCategory === 'teaching' && formData.department) {
            formSubmissionData.department = formData.department.trim();
          } else if (formData.formCategory === 'non_teaching') {
            // For non-teaching, department is optional - set to empty string or omit
            formSubmissionData.department = formData.department?.trim() || '';
          }
          formSubmissionData.formCategory = formData.formCategory;
          if (formData.closingDate) {
            formSubmissionData.closingDate = formData.closingDate;
          }
          formSubmissionData.vacancies = formData.vacancies;
        }

        // Debug log to verify campus is included
        console.log('📤 [FORM SUBMISSION] Submitting form data:', {
          title: formSubmissionData.title,
          formType: formSubmissionData.formType,
          campus: formSubmissionData.campus,
          department: formSubmissionData.department,
          position: formSubmissionData.position,
          formCategory: formSubmissionData.formCategory
        });

        if (editingForm) {
          // Update existing form
          await api.put(`/forms/${editingForm._id}`, formSubmissionData);
          setToast({ type: 'success', message: 'Form updated successfully!' });
        } else {
          // Create new form
          await api.post('/forms', formSubmissionData);
          setToast({ type: 'success', message: 'Form created successfully!' });
        }

        setShowCreateModal(false);
        setEditingForm(null);
        resetFormData();
        fetchForms();
      } catch (error) {
        const errorMessage = error.response?.data?.message || error.message || (editingForm ? 'Failed to update form' : 'Failed to create form');
        setToast({ type: 'danger', message: errorMessage });
        console.error('Form creation/update error:', error);
        console.error('Error details:', error.response?.data);
      } finally {
        setSubmitting(false);
      }
    };

    const handleEditForm = async (form) => {
      try {
        // Fetch full form details
        const response = await api.get(`/forms/${form._id}`);
        const fullForm = response.data.form;

        // Populate form data with existing form values
        const closingDateValue = fullForm.closingDate 
          ? new Date(fullForm.closingDate).toISOString().split('T')[0]
          : '';
        setFormData({
          title: fullForm.title || '',
          description: fullForm.description || '',
          formType: fullForm.formType || 'candidate_profile',
          formCategory: fullForm.formCategory || 'teaching',
          campus: fullForm.campus || '',
          position: fullForm.position || '',
          department: fullForm.department || '',
          closingDate: closingDateValue,
          vacancies: fullForm.vacancies || 1,
          requirements: fullForm.requirements || {
            experience: { min: 0, max: 0, preferred: '' },
            skills: [],
            qualifications: [],
            responsibilities: []
          },
          formFields: fullForm.formFields || []
        });

        setEditingForm(fullForm);
        setShowCreateModal(true);
      } catch (error) {
        setToast({ type: 'danger', message: 'Failed to load form for editing' });
        console.error('Error loading form:', error);
      }
    };
  
    const resetFormData = () => {
      setFormData({
        title: '',
        description: '',
        formType: 'candidate_profile',
        formCategory: 'teaching',
        campus: '',
        position: '',
        department: '',
        closingDate: '',
        vacancies: 1,
        requirements: {
          experience: { min: 0, max: 0, preferred: '' },
          skills: [],
          qualifications: [],
          responsibilities: []
        },
        formFields: []
      });
    };

    // Load default template for Teaching form
    const loadTeachingTemplate = () => {
      setFormData(prev => ({
        ...prev,
        formCategory: 'teaching',
        title: prev.title || 'Teaching Staff Registration Form',
        description: prev.description || 'Registration form for teaching positions',
        formFields: [
          // Application Details - Designation at top
          { fieldName: 'designation', fieldType: 'select', required: true, options: ['Assistant Professor', 'Associate Professor', 'Professor'] },
          
          // Basic Information
          { fieldName: 'gender', fieldType: 'radio', required: true, options: ['Male', 'Female', 'Other'] },
          { fieldName: 'dateOfBirth', fieldType: 'date', required: true },
          { fieldName: 'mobileNumber', fieldType: 'text', required: true, placeholder: '10-digit mobile number' },
          { fieldName: 'address', fieldType: 'textarea', required: true, placeholder: 'Full postal address' },
          { fieldName: 'aadhaarNumber', fieldType: 'text', required: true, placeholder: 'Aadhaar Number' },
          { fieldName: 'religion', fieldType: 'text', required: true, placeholder: 'Religion' },
          { fieldName: 'caste', fieldType: 'text', required: true, placeholder: 'Caste' },
          { fieldName: 'ratifiedByUniversity', fieldType: 'radio', required: true, options: ['Yes', 'No'] },
          { fieldName: 'nbaNccExperience', fieldType: 'radio', required: true, options: ['Yes', 'No'] },
          { fieldName: 'nssExperience', fieldType: 'radio', required: true, options: ['Yes', 'No'] },
          
          // Academic Qualifications (multiple entries allowed)
          { fieldName: 'education', fieldType: 'textarea', required: true, placeholder: 'Education Details (can add multiple entries)' },
          
          // Experience Details (multiple entries allowed)
          { fieldName: 'experience', fieldType: 'textarea', required: true, placeholder: 'Experience Details (can add multiple entries)' },
          { fieldName: 'totalExperienceYears', fieldType: 'select', required: true, options: ['0-1 years', '1-3 years', '3-5 years', '5-10 years', '10+ years'] },
          { fieldName: 'teachingExperience', fieldType: 'select', required: true, options: ['0-1 years', '1-3 years', '3-5 years', '5-10 years', '10+ years'] },
          { fieldName: 'salaryInCTC', fieldType: 'number', required: false, placeholder: 'Salary in CTC (if has experience)' },
          
          // Salary Details
          { fieldName: 'currentSalary', fieldType: 'number', required: false, placeholder: 'Current Salary' },
          { fieldName: 'expectedSalary', fieldType: 'number', required: false, placeholder: 'Expected Salary' },
          
          // Documents Upload
          { fieldName: 'resume', fieldType: 'file', required: true },
          { fieldName: 'passportPhoto', fieldType: 'file', required: true },
          { fieldName: 'certificates', fieldType: 'file_multiple', required: false },
          
          // Declaration
          { fieldName: 'declarationAgreed', fieldType: 'checkbox', required: true, options: ['I hereby declare that all information provided is true.'] }
        ]
      }));
    };

    // Load default template for Non-Teaching form
    const loadNonTeachingTemplate = () => {
      setFormData(prev => ({
        ...prev,
        formCategory: 'non_teaching',
        title: prev.title || 'Non-Teaching Staff Registration Form',
        description: prev.description || 'Registration form for non-teaching positions',
        formFields: [
          // Application Details
          { fieldName: 'designation', fieldType: 'select', required: true, options: ['Clerk', 'Accountant', 'Librarian', 'Administrative Assistant', 'IT Support', 'Other'] },
          
          // Basic Information
          { fieldName: 'gender', fieldType: 'radio', required: true, options: ['Male', 'Female', 'Other'] },
          { fieldName: 'dateOfBirth', fieldType: 'date', required: true },
          { fieldName: 'mobileNumber', fieldType: 'text', required: true, placeholder: '10-digit mobile number' },
          { fieldName: 'address', fieldType: 'textarea', required: true, placeholder: 'Full postal address' },
          { fieldName: 'aadhaarNumber', fieldType: 'text', required: true, placeholder: 'Aadhaar Number' },
          { fieldName: 'religion', fieldType: 'text', required: true, placeholder: 'Religion' },
          { fieldName: 'caste', fieldType: 'text', required: true, placeholder: 'Caste' },
          { fieldName: 'ratifiedByUniversity', fieldType: 'radio', required: true, options: ['Yes', 'No'] },
          { fieldName: 'nbaNccExperience', fieldType: 'radio', required: true, options: ['Yes', 'No'] },
          { fieldName: 'nssExperience', fieldType: 'radio', required: true, options: ['Yes', 'No'] },
          
          // Academic Qualifications (multiple entries allowed)
          { fieldName: 'education', fieldType: 'textarea', required: true, placeholder: 'Education Details (can add multiple entries)' },
          
          // Experience Details (multiple entries allowed)
          { fieldName: 'experience', fieldType: 'textarea', required: true, placeholder: 'Experience Details (can add multiple entries)' },
          { fieldName: 'totalExperienceYears', fieldType: 'select', required: true, options: ['0-1 years', '1-3 years', '3-5 years', '5-10 years', '10+ years'] },
          { fieldName: 'salaryInCTC', fieldType: 'number', required: false, placeholder: 'Salary in CTC (if has experience)' },
          
          // Salary Details
          { fieldName: 'currentSalary', fieldType: 'number', required: false, placeholder: 'Current Salary' },
          { fieldName: 'expectedSalary', fieldType: 'number', required: false, placeholder: 'Expected Salary' },
          
          // Documents Upload
          { fieldName: 'resume', fieldType: 'file', required: true },
          { fieldName: 'passportPhoto', fieldType: 'file', required: true },
          { fieldName: 'certificates', fieldType: 'file_multiple', required: false },
          
          // Declaration
          { fieldName: 'declarationAgreed', fieldType: 'checkbox', required: true, options: ['I hereby declare that all information provided is true.'] }
        ]
      }));
    };
  
    const handleDeleteForm = async (formId) => {
      if (window.confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
        try {
          await api.delete(`/forms/${formId}`);
          setToast({ type: 'success', message: 'Form deleted successfully!' });
          fetchForms();
        } catch (error) {
          setToast({ type: 'danger', message: error.response?.data?.message || 'Failed to delete form' });
        }
      }
    };

    const handleToggleStatus = async (formId, currentStatus) => {
      try {
        await api.put(`/forms/${formId}`, { isActive: !currentStatus });
        setToast({ type: 'success', message: `Form ${!currentStatus ? 'activated' : 'deactivated'} successfully!` });
        fetchForms();
      } catch (error) {
        setToast({ type: 'danger', message: error.response?.data?.message || 'Failed to update form status' });
      }
    };
  
    const handleShowQRCode = async (form) => {
      try {
        const response = await api.get(`/forms/${form._id}/qr-code`);
        setSelectedForm(response.data.form);
        setShowQRModal(true);
      } catch (error) {
        setToast({ type: 'danger', message: 'Failed to fetch QR code' });
      }
    };

    const handleRegenerateQR = async (formId) => {
      try {
        await api.post(`/forms/${formId}/qr-code`);
        setToast({ type: 'success', message: 'QR code regenerated successfully!' });
        const response = await api.get(`/forms/${formId}/qr-code`);
        setSelectedForm(response.data.form);
      } catch (error) {
        setToast({ type: 'danger', message: 'Failed to regenerate QR code' });
      }
    };

    const copyToClipboard = (text) => {
      navigator.clipboard.writeText(text);
      setToast({ type: 'success', message: 'Link copied to clipboard!' });
    };

  const addFormField = () => {
      setFormData(prev => ({
        ...prev,
        formFields: [...prev.formFields, {
          fieldName: '',
          fieldType: 'text',
          required: false,
          options: [],
          placeholder: ''
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
        case 'teaching':
          return teachingForms;
        case 'non_teaching':
          return nonTeachingForms;
        case 'feedback':
          return feedbackForms;
        default:
          return forms;
      }
    };

    const getFormCategoryBadge = (form) => {
      if (form.formType === 'candidate_profile' && form.formCategory) {
        const category = form.formCategory === 'teaching' ? 'Teaching' : 'Non-Teaching';
        const variant = form.formCategory === 'teaching' ? 'primary' : 'secondary';
        return <Badge bg={variant} className="me-1">{category}</Badge>;
      }
      return null;
    };

  if (loading) {
    return <LoadingSpinner message="Loading forms..." />;
  }

  return (
    <Container fluid className="super-admin-fluid">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>Form Creation & Management</h2>
              <p>Step 1: Create recruitment forms and generate submission links for candidates.</p>
            </div>
            {canWrite && (
              <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                Create New Form
              </Button>
            )}
          </div>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card>
            <Card.Header>
              <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-0">
                <Tab eventKey="teaching" title="Teaching Forms" />
                <Tab eventKey="non_teaching" title="Non-Teaching Forms" />
                <Tab eventKey="feedback" title="Feedback Forms" />
                <Tab eventKey="all" title="All Forms" />
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
                            {form.formCategory === 'teaching' && form.department && (
                              <small className="text-muted">{form.department}</small>
                            )}
                            {form.formCategory === 'non_teaching' && (
                              <small className="text-muted">Non-Teaching</small>
                            )}
                          </>
                        ) : (
                          <Badge bg="info">N/A</Badge>
                        )}
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          {getFormCategoryBadge(form)}
                          {getFormTypeBadge(form.formType)}
                        </div>
                      </td>
                      <td>{form.submissionCount}</td>
                      <td>{getStatusBadge(form.isActive)}</td>
                      <td>{new Date(form.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          {canWrite && (
                            <Button
                              variant="primary"
                              size="sm"
                              className="me-1"
                              onClick={() => handleEditForm(form)}
                            >
                              Edit
                            </Button>
                          )}
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
                          {canWrite && (
                            <>
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
                            </>
                          )}
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
                     activeTab === 'teaching' ? 'No teaching forms found.' :
                     activeTab === 'non_teaching' ? 'No non-teaching forms found.' :
                     activeTab === 'feedback' ? 'No feedback forms found.' :
                     'No forms found.'}
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
        onHide={() => {
          setShowCreateModal(false);
          setEditingForm(null);
          resetFormData();
        }}
        size="xl"
        centered
        className="form-modal"
      >
        <style>{`
          .form-modal .modal-dialog {
            max-width: 1400px !important;
            width: 95% !important;
          }
        `}</style>
        <Modal.Header 
          closeButton 
          style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            padding: '1.5rem'
          }}
        >
          <Modal.Title style={{ fontSize: '1.5rem', fontWeight: 600 }}>
            {editingForm ? '✏️ Edit Recruitment Form' : '➕ Create New Recruitment Form'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ 
          maxHeight: '80vh', 
          overflowY: 'auto',
          padding: '2rem',
          background: '#f8f9fa'
        }}>
          <Form onSubmit={handleCreateForm} className="form-creation-form">
                      <div style={{ 
                        background: 'white', 
                        padding: '1.5rem', 
                        borderRadius: '10px', 
                        marginBottom: '1.5rem',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        <h6 style={{ 
                          color: '#667eea', 
                          fontWeight: 600, 
                          marginBottom: '1.25rem',
                          paddingBottom: '0.75rem',
                          borderBottom: '2px solid #e9ecef'
                        }}>
                          📋 Basic Information
                        </h6>
                        <Row>
                          <Col md={8}>
                            <Form.Group className="mb-3">
                              <Form.Label style={{ fontWeight: 600, color: '#495057' }}>Form Title *</Form.Label>
                              <Form.Control
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                required
                                style={{ 
                                  border: '1px solid #ced4da',
                                  borderRadius: '6px',
                                  padding: '0.75rem'
                                }}
                              />
                            </Form.Group>
                          </Col>
                          <Col md={4}>
                            <Form.Group className="mb-3">
                              <Form.Label style={{ fontWeight: 600, color: '#495057' }}>Form Type *</Form.Label>
                              <Form.Select
                                value={formData.formType}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  formType: e.target.value,
                                  position: e.target.value === 'candidate_profile' ? prev.position : '',
                                  department: e.target.value === 'candidate_profile' ? prev.department : ''
                                }))}
                                required
                                disabled={!!editingForm}
                                style={{ 
                                  border: '1px solid #ced4da',
                                  borderRadius: '6px',
                                  padding: '0.75rem',
                                  backgroundColor: editingForm ? '#e9ecef' : 'white'
                                }}
                              >
                                <option value="candidate_profile">Candidate Profile Form</option>
                                <option value="feedback_form">Feedback Form</option>
                              </Form.Select>
                              {editingForm && (
                                <Form.Text className="text-muted">
                                  Form type cannot be changed after creation
                                </Form.Text>
                              )}
                            </Form.Group>
                          </Col>
                        </Row>
                      </div>
          
                      {formData.formType === 'candidate_profile' && (
                        <div style={{ 
                          background: 'white', 
                          padding: '1.5rem', 
                          borderRadius: '10px', 
                          marginBottom: '1.5rem',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                          <h6 style={{ 
                            color: '#667eea', 
                            fontWeight: 600, 
                            marginBottom: '1.25rem',
                            paddingBottom: '0.75rem',
                            borderBottom: '2px solid #e9ecef'
                          }}>
                            🎯 Candidate Profile Details
                          </h6>
                          <Row>
                            <Col md={editingForm ? 12 : 6}>
                              <Form.Group className="mb-3">
                                <Form.Label style={{ fontWeight: 600, color: '#495057' }}>Form Category *</Form.Label>
                                <Form.Select
                                  value={formData.formCategory}
                                  onChange={(e) => setFormData(prev => ({ ...prev, formCategory: e.target.value }))}
                                  required
                                  disabled={!!editingForm}
                                  style={{ 
                                    border: '1px solid #ced4da',
                                    borderRadius: '6px',
                                    padding: '0.75rem',
                                    backgroundColor: editingForm ? '#e9ecef' : 'white'
                                  }}
                                >
                                  <option value="teaching">Teaching</option>
                                  <option value="non_teaching">Non-Teaching</option>
                                </Form.Select>
                              </Form.Group>
                            </Col>
                            {!editingForm && (
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label style={{ fontWeight: 600, color: '#495057' }}>Quick Templates</Form.Label>
                                  <div className="d-flex gap-2">
                                    <Button
                                      variant="outline-primary"
                                      size="sm"
                                      onClick={loadTeachingTemplate}
                                      type="button"
                                      style={{ 
                                        borderRadius: '6px',
                                        borderWidth: '1.5px',
                                        fontWeight: 500
                                      }}
                                    >
                                      📚 Teaching Template
                                    </Button>
                                    <Button
                                      variant="outline-secondary"
                                      size="sm"
                                      onClick={loadNonTeachingTemplate}
                                      type="button"
                                      style={{ 
                                        borderRadius: '6px',
                                        borderWidth: '1.5px',
                                        fontWeight: 500
                                      }}
                                    >
                                      💼 Non-Teaching Template
                                    </Button>
                                  </div>
                                </Form.Group>
                              </Col>
                            )}
                          </Row>
                          <Row>
                            <Col md={formData.formCategory === 'teaching' ? 4 : 6}>
                              <Form.Group className="mb-3">
                                <Form.Label style={{ fontWeight: 600, color: '#495057' }}>Campus *</Form.Label>
                                <Form.Select
                                  value={formData.campus}
                                  onChange={(e) => setFormData(prev => ({ ...prev, campus: e.target.value, department: '' }))}
                                  required={formData.formType === 'candidate_profile'}
                                  isInvalid={formData.formType === 'candidate_profile' && !formData.campus}
                                  style={{ 
                                    border: '1px solid #ced4da',
                                    borderRadius: '6px',
                                    padding: '0.75rem'
                                  }}
                                >
                                  <option value="">Select Campus</option>
                                  <option value="Btech">Btech</option>
                                  <option value="Degree">Degree</option>
                                  <option value="Pharmacy">Pharmacy</option>
                                  <option value="Diploma">Diploma</option>
                                </Form.Select>
                              </Form.Group>
                            </Col>
                            {/* Department field - only shown for teaching forms */}
                            {formData.formCategory === 'teaching' && (
                              <Col md={4}>
                                <Form.Group className="mb-3">
                                  <Form.Label style={{ fontWeight: 600, color: '#495057' }}>
                                    Department *
                                  </Form.Label>
                                  {formData.campus && departments.length > 0 ? (
                                    <Form.Select
                                      value={formData.department}
                                      onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                                      required={formData.formType === 'candidate_profile'}
                                      style={{ 
                                        border: '1px solid #ced4da',
                                        borderRadius: '6px',
                                        padding: '0.75rem'
                                      }}
                                    >
                                      <option value="">Select Department</option>
                                      {departments.map((dept, idx) => (
                                        <option key={idx} value={dept}>{dept}</option>
                                      ))}
                                    </Form.Select>
                                  ) : (
                                    <Form.Control
                                      type="text"
                                      value={formData.department}
                                      onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                                      required={formData.formType === 'candidate_profile'}
                                      placeholder={formData.campus ? 'Select campus first' : 'Enter department'}
                                      style={{ 
                                        border: '1px solid #ced4da',
                                        borderRadius: '6px',
                                        padding: '0.75rem'
                                      }}
                                    />
                                  )}
                                </Form.Group>
                              </Col>
                            )}
                            <Col md={formData.formCategory === 'teaching' ? 4 : 6}>
                              <Form.Group className="mb-3">
                                <Form.Label style={{ fontWeight: 600, color: '#495057' }}>
                                  {formData.formCategory === 'teaching' ? 'Subject/Position' : 'Position/Designation'} *
                                </Form.Label>
                                <Form.Control
                                  type="text"
                                  value={formData.position}
                                  onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                                  required={formData.formType === 'candidate_profile'}
                                  style={{ 
                                    border: '1px solid #ced4da',
                                    borderRadius: '6px',
                                    padding: '0.75rem'
                                  }}
                                />
                              </Form.Group>
                            </Col>
                          </Row>
                          {formData.formType === 'candidate_profile' && (
                            <Row className="mt-3">
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label style={{ fontWeight: 600, color: '#495057' }}>Closing Date *</Form.Label>
                                  <Form.Control
                                    type="date"
                                    value={formData.closingDate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, closingDate: e.target.value }))}
                                    required={formData.formType === 'candidate_profile'}
                                    min={new Date().toISOString().split('T')[0]}
                                    style={{ 
                                      border: '1px solid #ced4da',
                                      borderRadius: '6px',
                                      padding: '0.75rem'
                                    }}
                                  />
                                  <Form.Text className="text-muted">
                                    Form will automatically be disabled after this date
                                  </Form.Text>
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label style={{ fontWeight: 600, color: '#495057' }}>Number of Vacancies *</Form.Label>
                                  <Form.Control
                                    type="number"
                                    min="1"
                                    value={formData.vacancies}
                                    onChange={(e) => setFormData(prev => ({ ...prev, vacancies: parseInt(e.target.value) || 1 }))}
                                    required={formData.formType === 'candidate_profile'}
                                    style={{ 
                                      border: '1px solid #ced4da',
                                      borderRadius: '6px',
                                      padding: '0.75rem'
                                    }}
                                  />
                                  <Form.Text className="text-muted">
                                    Total number of positions available for this role
                                  </Form.Text>
                                </Form.Group>
                              </Col>
                            </Row>
                          )}
                        </div>
                      )}
          
                      <div style={{ 
                        background: 'white', 
                        padding: '1.5rem', 
                        borderRadius: '10px', 
                        marginBottom: '1.5rem',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        <Form.Group className="mb-3">
                          <Form.Label style={{ fontWeight: 600, color: '#495057' }}>Description</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder={
                              formData.formType === 'candidate_profile'
                                ? "Describe the job requirements and expectations..."
                                : "Describe the purpose and criteria for this feedback form..."
                            }
                            style={{ 
                              border: '1px solid #ced4da',
                              borderRadius: '6px',
                              padding: '0.75rem',
                              resize: 'vertical'
                            }}
                          />
                        </Form.Group>
                      </div>

            {/* Form Fields Section */}
            <div className="mb-4" style={{ 
              background: 'white', 
              padding: '1.5rem', 
              borderRadius: '10px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '2px solid #e9ecef'
              }}>
                <h5 style={{ 
                  color: '#667eea', 
                  fontWeight: 600, 
                  margin: 0
                }}>
                  📝 Form Fields
                </h5>
              </div>

              {formData.formFields.map((field, index) => (
                <Card 
                  key={index} 
                  className="mb-3"
                  style={{
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Card.Body style={{ padding: '1.25rem' }}>
                    <Row className="align-items-end">
                      <Col md={3}>
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
                      <Col md={3}>
                        <Form.Group className="mb-2">
                          <Form.Label>Placeholder</Form.Label>
                          <Form.Control
                            type="text"
                            value={field.placeholder}
                            onChange={(e) => updateFormField(index, 'placeholder', e.target.value)}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={1}>
                        <Form.Group className="mb-2">
                          <Form.Label style={{ visibility: 'hidden' }}>Remove</Form.Label>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => removeFormField(index)}
                            style={{
                              borderRadius: '6px',
                              borderWidth: '1.5px',
                              fontWeight: 600,
                              width: '100%',
                              height: '38px'
                            }}
                          >
                            🗑️
                          </Button>
                        </Form.Group>
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
                                        
                                        {/* Add Field Button at Bottom */}
                                        <div className="mt-3 mb-3" style={{ textAlign: 'center' }}>
                                          <Button 
                                            variant="primary" 
                                            size="md" 
                                            onClick={addFormField}
                                            style={{
                                              borderRadius: '8px',
                                              fontWeight: 600,
                                              padding: '0.75rem 2rem',
                                              boxShadow: '0 2px 8px rgba(102, 126, 234, 0.4)',
                                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                              border: 'none',
                                              fontSize: '1rem'
                                            }}
                                          >
                                            ➕ Add Field
                                          </Button>
                                        </div>
                                      </div>

            <div className="d-flex justify-content-end gap-2" style={{
              paddingTop: '1.5rem',
              borderTop: '2px solid #e9ecef',
              marginTop: '1.5rem',
              background: 'white',
              padding: '1.5rem',
              borderRadius: '10px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <Button 
                variant="secondary" 
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingForm(null);
                  resetFormData();
                }}
                style={{
                  borderRadius: '6px',
                  padding: '0.75rem 1.5rem',
                  fontWeight: 500,
                  minWidth: '120px'
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                type="submit" 
                disabled={submitting}
                style={{
                  borderRadius: '6px',
                  padding: '0.75rem 1.5rem',
                  fontWeight: 500,
                  minWidth: '150px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  boxShadow: '0 4px 6px rgba(102, 126, 234, 0.3)'
                }}
              >
                {submitting ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" className="me-2" />
                    {editingForm ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editingForm ? '✏️ Update Form' : '➕ Create Form'
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
            <ToastNotificationContainer 
              toast={toast} 
              onClose={() => setToast({ type: '', message: '' })} 
            />
          </Container>
        );
      };
      
      export default FormsManagement;
