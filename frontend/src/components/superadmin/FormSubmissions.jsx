import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Modal, Tabs, Tab, Alert, Spinner, Image, FormCheck, Form } from 'react-bootstrap';
import { FaFilePdf, FaFileImage, FaDownload, FaExternalLinkAlt, FaUser, FaCheckCircle, FaTimes } from 'react-icons/fa';
import api from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';

const FormSubmissions = () => {
  const [allCandidates, setAllCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCandidates, setSelectedCandidates] = useState(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('teaching');
  const [selectedJobRole, setSelectedJobRole] = useState('all');

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const response = await api.get('/candidates');
      // Get all candidates with their form details
      const candidatesWithForms = response.data.candidates;
      setAllCandidates(candidatesWithForms);
    } catch (error) {
      setError('Failed to fetch form submissions');
      console.error('Candidates fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get filtered candidates based on active tab and job role
  const getFilteredCandidates = () => {
    let filtered = allCandidates.filter(c => {
      // Filter by form category
      if (activeTab === 'teaching') {
        return c.form?.formCategory === 'teaching';
      } else if (activeTab === 'non_teaching') {
        return c.form?.formCategory === 'non_teaching';
      }
      return true; // 'all' tab
    });

    // Filter by job role (position/department)
    if (selectedJobRole !== 'all' && selectedJobRole) {
      filtered = filtered.filter(c => {
        const jobRole = `${c.form?.position || ''} - ${c.form?.department || ''}`;
        return jobRole === selectedJobRole;
      });
    }

    return filtered;
  };

  // Get unique job roles for the current tab
  const getJobRoles = () => {
    let candidates = allCandidates.filter(c => {
      if (activeTab === 'teaching') {
        return c.form?.formCategory === 'teaching';
      } else if (activeTab === 'non_teaching') {
        return c.form?.formCategory === 'non_teaching';
      }
      return true;
    });

    const roles = new Set();
    candidates.forEach(c => {
      if (c.form?.position && c.form?.department) {
        roles.add(`${c.form.position} - ${c.form.department}`);
      }
    });

    return Array.from(roles).sort();
  };

  const candidates = getFilteredCandidates();

  const fetchCandidateProfile = async (candidateId) => {
    setProfileLoading(true);
    try {
      const response = await api.get(`/candidates/${candidateId}`);
      setSelectedCandidate(response.data.candidate);
      setShowProfileModal(true);
    } catch (error) {
      setError('Failed to fetch candidate profile');
      console.error('Profile fetch error:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleApprove = async (candidateId) => {
    try {
      await api.put(`/candidates/${candidateId}/status`, { status: 'approved' });
      // Update selected candidate if modal is open
      if (selectedCandidate && (selectedCandidate._id === candidateId || selectedCandidate.candidate?._id === candidateId)) {
        setSelectedCandidate({ ...selectedCandidate, status: 'approved' });
      }
      fetchCandidates();
      setSelectedCandidates(new Set());
    } catch (error) {
      setError('Failed to approve candidate');
      console.error('Approve error:', error);
    }
  };

  const handleReject = async (candidateId) => {
    try {
      await api.put(`/candidates/${candidateId}/status`, { status: 'rejected' });
      // Update selected candidate if modal is open
      if (selectedCandidate && (selectedCandidate._id === candidateId || selectedCandidate.candidate?._id === candidateId)) {
        setSelectedCandidate({ ...selectedCandidate, status: 'rejected' });
      }
      fetchCandidates();
      setSelectedCandidates(new Set());
    } catch (error) {
      setError('Failed to reject candidate');
      console.error('Reject error:', error);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedCandidates.size === 0) return;
    setBulkActionLoading(true);
    try {
      await api.put('/candidates/bulk/status', {
        candidateIds: Array.from(selectedCandidates),
        status: 'approved'
      });
      fetchCandidates();
      setSelectedCandidates(new Set());
    } catch (error) {
      setError('Failed to approve candidates');
      console.error('Bulk approve error:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedCandidates.size === 0) return;
    setBulkActionLoading(true);
    try {
      await api.put('/candidates/bulk/status', {
        candidateIds: Array.from(selectedCandidates),
        status: 'rejected'
      });
      fetchCandidates();
      setSelectedCandidates(new Set());
    } catch (error) {
      setError('Failed to reject candidates');
      console.error('Bulk reject error:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleSelectCandidate = (candidateId) => {
    const newSelected = new Set(selectedCandidates);
    if (newSelected.has(candidateId)) {
      newSelected.delete(candidateId);
    } else {
      newSelected.add(candidateId);
    }
    setSelectedCandidates(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedCandidates.size === candidates.length) {
      setSelectedCandidates(new Set());
    } else {
      setSelectedCandidates(new Set(candidates.map(c => c._id)));
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'secondary',
      approved: 'info',
      rejected: 'danger',
      shortlisted: 'warning',
      selected: 'success'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const renderPersonalDetailsTab = (candidate) => {
    const applicationData = candidate.personalDetails?.applicationData || {};
    const documents = candidate.personalDetails?.documents || [];
    const passportPhoto = candidate.personalDetails?.passportPhoto;
    
    const resume = documents.find(d => d.name?.toLowerCase().includes('resume') || d.name?.toLowerCase().includes('cv'));
    const certificates = documents.filter(d => 
      d.name?.toLowerCase().includes('certificate') || 
      d.name?.toLowerCase().includes('certification')
    );
    const otherDocs = documents.filter(d => 
      !d.name?.toLowerCase().includes('resume') && 
      !d.name?.toLowerCase().includes('cv') && 
      !d.name?.toLowerCase().includes('certificate') &&
      !d.name?.toLowerCase().includes('certification') &&
      !d.name?.toLowerCase().includes('photo') &&
      !d.name?.toLowerCase().includes('passport')
    );

    return (
      <div>
        <Row className="mb-4">
          <Col md={6}>
            <Card>
              <Card.Header>
                <h5>Personal Information</h5>
              </Card.Header>
              <Card.Body>
                {passportPhoto && (
                  <div className="text-center mb-3">
                    <Image 
                      src={passportPhoto} 
                      alt="Profile Photo" 
                      rounded 
                      style={{ maxWidth: '150px', maxHeight: '150px', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <p><strong>Name:</strong> {candidate.personalDetails.name}</p>
                <p><strong>Email:</strong> {candidate.personalDetails.email}</p>
                <p><strong>Phone:</strong> {candidate.personalDetails.phone || 'Not provided'}</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6}>
            <Card>
              <Card.Header>
                <h5>Application Form Details</h5>
              </Card.Header>
              <Card.Body style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {Object.keys(applicationData).length > 0 ? (
                  Object.entries(applicationData).map(([key, value]) => {
                    if (typeof value === 'string' && (value.startsWith('http') || value.startsWith('https'))) {
                      return null;
                    }
                    return (
                      <p key={key}>
                        <strong>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong>{' '}
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </p>
                    );
                  })
                ) : (
                  <p className="text-muted">No application data available</p>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="mb-4">
          <Col md={12}>
            <Card>
              <Card.Header>
                <h5>Documents</h5>
              </Card.Header>
              <Card.Body>
                {resume && (
                  <div className="mb-3">
                    <h6><FaFilePdf className="me-2" />Resume</h6>
                    <div className="d-flex align-items-center gap-2">
                      <span>{resume.name}</span>
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        href={resume.url} 
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FaExternalLinkAlt className="me-1" />
                        View
                      </Button>
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        href={resume.url} 
                        download
                      >
                        <FaDownload className="me-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                )}

                {certificates.length > 0 && (
                  <div className="mb-3">
                    <h6><FaFileImage className="me-2" />Certificates ({certificates.length})</h6>
                    <div className="d-flex flex-wrap gap-2">
                      {certificates.map((cert, index) => (
                        <div key={index} className="border rounded p-2" style={{ minWidth: '200px' }}>
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="text-truncate" style={{ maxWidth: '150px' }}>{cert.name}</span>
                            <div>
                              <Button 
                                variant="outline-primary" 
                                size="sm"
                                href={cert.url} 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="me-1"
                              >
                                <FaExternalLinkAlt />
                              </Button>
                              <Button 
                                variant="outline-secondary" 
                                size="sm"
                                href={cert.url} 
                                download
                              >
                                <FaDownload />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {otherDocs.length > 0 && (
                  <div className="mb-3">
                    <h6>Other Documents ({otherDocs.length})</h6>
                    <div className="d-flex flex-wrap gap-2">
                      {otherDocs.map((doc, index) => (
                        <div key={index} className="border rounded p-2" style={{ minWidth: '200px' }}>
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="text-truncate" style={{ maxWidth: '150px' }}>{doc.name}</span>
                            <div>
                              <Button 
                                variant="outline-primary" 
                                size="sm"
                                href={doc.url} 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="me-1"
                              >
                                <FaExternalLinkAlt />
                              </Button>
                              <Button 
                                variant="outline-secondary" 
                                size="sm"
                                href={doc.url} 
                                download
                              >
                                <FaDownload />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!resume && certificates.length === 0 && otherDocs.length === 0 && (
                  <p className="text-muted">No documents available</p>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Loading form submissions..." />;
  }

  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <h2>Form Submissions</h2>
          <p>Review candidate applications and approve/reject them to move to the testing phase.</p>
        </Col>
      </Row>

      {/* Category Tabs */}
      <Row className="mb-3">
        <Col>
          <Card>
            <Card.Header>
              <Tabs activeKey={activeTab} onSelect={(k) => { setActiveTab(k); setSelectedJobRole('all'); }} className="mb-0">
                <Tab eventKey="teaching" title="Teaching Positions" />
                <Tab eventKey="non_teaching" title="Non-Teaching Positions" />
                <Tab eventKey="all" title="All Submissions" />
              </Tabs>
            </Card.Header>
            <Card.Body>
              <Row className="align-items-center">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Filter by Job Role:</Form.Label>
                    <Form.Select
                      value={selectedJobRole}
                      onChange={(e) => setSelectedJobRole(e.target.value)}
                    >
                      <option value="all">All Job Roles</option>
                      {getJobRoles().map((role, idx) => (
                        <option key={idx} value={role}>{role}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={8} className="text-end">
                  <Alert variant="info" className="mb-0">
                    Showing <strong>{candidates.length}</strong> candidate(s) for {activeTab === 'teaching' ? 'Teaching' : activeTab === 'non_teaching' ? 'Non-Teaching' : 'All'} positions
                    {selectedJobRole !== 'all' && ` - ${selectedJobRole}`}
                  </Alert>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {error && (
        <Row className="mb-3">
          <Col>
            <Alert variant="danger" dismissible onClose={() => setError('')}>
              {error}
            </Alert>
          </Col>
        </Row>
      )}

      {/* Bulk Actions */}
      {selectedCandidates.size > 0 && (
        <Row className="mb-3">
          <Col>
            <Card className="bg-light">
              <Card.Body>
                <div className="d-flex align-items-center justify-content-between">
                  <span>
                    <strong>{selectedCandidates.size}</strong> candidate(s) selected
                  </span>
                  <div>
                    <Button
                      variant="success"
                      size="sm"
                      className="me-2"
                      onClick={handleBulkApprove}
                      disabled={bulkActionLoading}
                    >
                      <FaCheckCircle className="me-1" />
                      Approve Selected
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleBulkReject}
                      disabled={bulkActionLoading}
                    >
                      <FaTimes className="me-1" />
                      Reject Selected
                    </Button>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      <Row>
        <Col>
          <Card>
            <Card.Header>
              <div className="d-flex align-items-center justify-content-between">
                <h5 className="mb-0">
                  Submissions
                  {activeTab === 'teaching' && ' - Teaching'}
                  {activeTab === 'non_teaching' && ' - Non-Teaching'}
                </h5>
                {candidates.length > 0 && (
                  <FormCheck
                    type="checkbox"
                    checked={selectedCandidates.size === candidates.length && candidates.length > 0}
                    onChange={handleSelectAll}
                    label="Select All"
                  />
                )}
              </div>
            </Card.Header>
            <Card.Body>
              {candidates.length === 0 ? (
                <Alert variant="info">
                  No submissions found for {activeTab === 'teaching' ? 'Teaching' : activeTab === 'non_teaching' ? 'Non-Teaching' : 'this category'}
                  {selectedJobRole !== 'all' && ` in ${selectedJobRole}`}.
                </Alert>
              ) : (
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>Select</th>
                      <th style={{ width: '60px' }}>Photo</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Position</th>
                      <th>Department</th>
                      <th>Category</th>
                      <th>Applied Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((candidate) => (
                      <tr key={candidate._id}>
                        <td className="text-center">
                          <FormCheck
                            type="checkbox"
                            checked={selectedCandidates.has(candidate._id)}
                            onChange={() => handleSelectCandidate(candidate._id)}
                          />
                        </td>
                        <td className="text-center">
                          {candidate.passportPhotoUrl ? (
                            <Image
                              src={candidate.passportPhotoUrl}
                              alt={candidate.user.name}
                              roundedCircle
                              style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            style={{ 
                              width: '40px', 
                              height: '40px', 
                              borderRadius: '50%', 
                              background: '#e2e8f0',
                              display: candidate.passportPhotoUrl ? 'none' : 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              margin: '0 auto'
                            }}
                          >
                            <FaUser style={{ color: '#64748b' }} />
                          </div>
                        </td>
                        <td>{candidate.user?.name || 'N/A'}</td>
                        <td>{candidate.user?.email || 'N/A'}</td>
                        <td>{candidate.form?.position || 'N/A'}</td>
                        <td>{candidate.form?.department || 'N/A'}</td>
                        <td>{candidate.form?.formCategory && (
                          <Badge bg={candidate.form.formCategory === 'teaching' ? 'primary' : 'secondary'} className="me-1">
                            {candidate.form.formCategory === 'teaching' ? 'Teaching' : 'Non-Teaching'}
                          </Badge>
                        )}</td>
                        <td>{new Date(candidate.createdAt).toLocaleDateString()}</td>
                        <td>
                          <Button
                            variant="primary"
                            size="sm"
                            className="me-2"
                            onClick={() => fetchCandidateProfile(candidate._id)}
                            disabled={profileLoading}
                          >
                            {profileLoading ? <Spinner as="span" animation="border" size="sm" /> : 'View'}
                          </Button>
                          <Button
                            variant="success"
                            size="sm"
                            className="me-2"
                            onClick={() => handleApprove(candidate._id)}
                          >
                            <FaCheckCircle className="me-1" />
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleReject(candidate._id)}
                          >
                            <FaTimes className="me-1" />
                            Reject
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Candidate Profile Modal */}
      <Modal
        show={showProfileModal}
        onHide={() => setShowProfileModal(false)}
        size="xl"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Candidate Profile - {selectedCandidate?.personalDetails?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {selectedCandidate && (
            <Tabs defaultActiveKey="personal" className="mb-3">
              <Tab eventKey="personal" title="Personal & Form Details">
                {renderPersonalDetailsTab(selectedCandidate)}
              </Tab>
            </Tabs>
          )}
        </Modal.Body>
        <Modal.Footer>
          {selectedCandidate && (selectedCandidate.status === 'pending' || !selectedCandidate.status) && (
            <>
              <Button
                variant="success"
                onClick={() => {
                  const candidateId = selectedCandidate._id || selectedCandidate.candidate?._id;
                  if (candidateId) {
                    handleApprove(candidateId);
                    setShowProfileModal(false);
                  }
                }}
              >
                <FaCheckCircle className="me-1" />
                Approve
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  const candidateId = selectedCandidate._id || selectedCandidate.candidate?._id;
                  if (candidateId) {
                    handleReject(candidateId);
                    setShowProfileModal(false);
                  }
                }}
              >
                <FaTimes className="me-1" />
                Reject
              </Button>
            </>
          )}
          {selectedCandidate && selectedCandidate.status && selectedCandidate.status !== 'pending' && (
            <Badge bg={selectedCandidate.status === 'approved' ? 'success' : selectedCandidate.status === 'rejected' ? 'danger' : 'secondary'} className="me-2" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
              {selectedCandidate.status === 'approved' ? '✓ Approved' : selectedCandidate.status === 'rejected' ? '✗ Rejected' : selectedCandidate.status}
            </Badge>
          )}
          <Button variant="secondary" onClick={() => setShowProfileModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default FormSubmissions;

