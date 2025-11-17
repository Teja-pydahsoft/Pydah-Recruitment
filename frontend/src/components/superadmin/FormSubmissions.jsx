import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Badge, Modal, Tabs, Tab, Alert, Spinner, Image, FormCheck, Form, InputGroup } from 'react-bootstrap';
import { FaFilePdf, FaFileImage, FaUser, FaCheckCircle, FaTimes, FaSearch } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
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
  const [quickSearch, setQuickSearch] = useState(''); // Applied search
  const [searchInput, setSearchInput] = useState(''); // Input value (not applied until button click)

  const navigate = useNavigate();

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

  const filteredCandidates = useMemo(() => {
    let filtered = allCandidates.filter(c => {
      if (activeTab === 'teaching') {
        return c.form?.formCategory === 'teaching';
      } else if (activeTab === 'non_teaching') {
        return c.form?.formCategory === 'non_teaching';
      }
      return true;
    });

    if (selectedJobRole !== 'all' && selectedJobRole) {
      filtered = filtered.filter(c => {
        const jobRole = `${c.form?.position || ''} - ${c.form?.department || ''}`.trim();
        return jobRole === selectedJobRole;
      });
    }

    if (quickSearch.trim()) {
      const term = quickSearch.trim().toLowerCase();
      filtered = filtered.filter(candidate => {
        const name = candidate.user?.name?.toLowerCase() || '';
        const email = candidate.user?.email?.toLowerCase() || '';
        const position = candidate.form?.position?.toLowerCase() || '';
        const department = candidate.form?.department?.toLowerCase() || '';
        const candidateId = candidate.candidateNumber?.toLowerCase() || '';
        return (
          name.includes(term) ||
          email.includes(term) ||
          position.includes(term) ||
          department.includes(term) ||
          candidateId.includes(term)
        );
      });
    }

    return filtered;
  }, [allCandidates, activeTab, selectedJobRole, quickSearch]);

  const pendingCandidates = useMemo(() => (
    filteredCandidates.filter(candidate => {
      const status = candidate.status || 'pending';
      return status === 'pending' || status === 'on_hold';
    })
  ), [filteredCandidates]);

  const progressedCandidates = useMemo(() => (
    filteredCandidates.filter(candidate => {
      const status = candidate.status || '';
      return ['approved', 'shortlisted', 'selected'].includes(status);
    })
  ), [filteredCandidates]);

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
    if (selectedCandidates.size === pendingCandidates.length) {
      setSelectedCandidates(new Set());
    } else {
      setSelectedCandidates(new Set(pendingCandidates.map(c => c._id)));
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
    const resume = documents.find(doc => {
      const name = doc.name?.toLowerCase() || '';
      return name.includes('resume') || name.includes('cv');
    });
    const certificates = documents.filter(doc => (doc.name?.toLowerCase() || '').includes('certificate'));
    const otherDocs = documents.filter(doc => {
      const name = doc.name?.toLowerCase() || '';
      const isResume = resume ? (doc.name === resume.name && doc.url === resume.url) : false;
      return !isResume && !name.includes('certificate');
    });

    return (
      <div className="pb-3">
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body className="d-flex flex-wrap gap-3 align-items-center">
            <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{candidate.personalDetails?.name}</div>
            <Badge bg="light" text="dark">{candidate.personalDetails?.email}</Badge>
            {candidate.personalDetails?.phone && (
              <Badge bg="light" text="dark">📞 {candidate.personalDetails.phone}</Badge>
            )}
          </Card.Body>
        </Card>

        <h6 className="text-uppercase text-muted mb-2" style={{ letterSpacing: '0.08em', fontSize: '0.75rem' }}>Application Responses</h6>
        <Row className="g-3 mb-4">
          {Object.entries(applicationData).filter(([_, value]) => !(typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://')))).map(([key, value]) => (
            <Col xs={12} md={6} lg={4} key={key}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body style={{ fontSize: '0.9rem' }}>
                  <div className="text-muted text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.08em' }}>
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </div>
                  <div>
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
          {Object.keys(applicationData).length === 0 && (
            <Col>
              <Alert variant="light" className="mb-0">No additional application data provided.</Alert>
            </Col>
          )}
        </Row>

        <h6 className="text-uppercase text-muted mb-2" style={{ letterSpacing: '0.08em', fontSize: '0.75rem' }}>Documents</h6>
        <Row className="g-3">
          {resume && (
            <Col xs={12} md={6} lg={4}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body>
                  <h6 className="d-flex align-items-center gap-2 mb-2" style={{ fontSize: '0.95rem' }}>
                    <FaFilePdf /> Resume
                  </h6>
                  <div className="d-flex flex-wrap gap-2">
                    <Button variant="outline-primary" size="sm" href={resume.url} target="_blank" rel="noopener noreferrer">
                      View
                    </Button>
                    <Button variant="outline-secondary" size="sm" href={resume.url} download>
                      Download
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          )}

          {certificates.map((cert, index) => (
            <Col xs={12} md={6} lg={4} key={`cert-${index}`}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body>
                  <h6 className="d-flex align-items-center gap-2 mb-2" style={{ fontSize: '0.95rem' }}>
                    <FaFileImage /> Certificate
                  </h6>
                  <div className="d-flex flex-wrap gap-2">
                    <Button variant="outline-primary" size="sm" href={cert.url} target="_blank" rel="noopener noreferrer">
                      View
                    </Button>
                    <Button variant="outline-secondary" size="sm" href={cert.url} download>
                      Download
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}

          {otherDocs.map((doc, index) => (
            <Col xs={12} md={6} lg={4} key={`doc-${index}`}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body>
                  <h6 className="mb-2" style={{ fontSize: '0.95rem' }}>{doc.name}</h6>
                  <div className="d-flex flex-wrap gap-2">
                    <Button variant="outline-primary" size="sm" href={doc.url} target="_blank" rel="noopener noreferrer">
                      View
                    </Button>
                    <Button variant="outline-secondary" size="sm" href={doc.url} download>
                      Download
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}

          {!resume && certificates.length === 0 && otherDocs.length === 0 && (
            <Col>
              <Alert variant="light" className="mb-0">No supporting documents were uploaded.</Alert>
            </Col>
          )}
        </Row>
      </div>
    );
  };

  const teachingCount = useMemo(() => allCandidates.filter(c => c.form?.formCategory === 'teaching').length, [allCandidates]);
  const nonTeachingCount = useMemo(() => allCandidates.filter(c => c.form?.formCategory === 'non_teaching').length, [allCandidates]);

  if (loading) {
    return <LoadingSpinner message="Loading form submissions..." />;
  }

  return (
    <Container fluid className="super-admin-fluid">
      <Row className="mb-3 align-items-center">
        <Col xs={12} md={8}>
          <h2 className="mb-1" style={{ fontSize: '1.8rem', fontWeight: 600 }}>Form Submissions</h2>
          <p className="text-muted mb-0" style={{ fontSize: '0.95rem' }}>Review, shortlist, or reject submissions before moving candidates to assessments.</p>
        </Col>
        <Col xs={12} md={4} className="mt-2 mt-md-0 text-md-end">
          <Button
            variant="outline-primary"
            onClick={() => navigate('/super-admin/creation/forms')}
          >
            Create / Upload Submission
          </Button>
        </Col>
      </Row>

      {/* Category Tabs */}
      <Row className="mb-3 g-2 align-items-end">
        <Col xs="auto">
          <Button
            size="sm"
            variant={activeTab === 'teaching' ? 'primary' : 'outline-primary'}
            onClick={() => { setActiveTab('teaching'); setSelectedJobRole('all'); }}
          >
            Teaching ({teachingCount})
          </Button>
        </Col>
        <Col xs="auto">
          <Button
            size="sm"
            variant={activeTab === 'non_teaching' ? 'primary' : 'outline-primary'}
            onClick={() => { setActiveTab('non_teaching'); setSelectedJobRole('all'); }}
          >
            Non-Teaching ({nonTeachingCount})
          </Button>
        </Col>
        <Col xs="auto">
          <Button
            size="sm"
            variant={activeTab === 'all' ? 'primary' : 'outline-primary'}
            onClick={() => { setActiveTab('all'); setSelectedJobRole('all'); }}
          >
            All ({allCandidates.length})
          </Button>
        </Col>
        <Col xs={12} md={4} className="mt-2 mt-md-0">
          <Form.Select
            size="sm"
            value={selectedJobRole}
            onChange={(e) => setSelectedJobRole(e.target.value)}
          >
            <option value="all">All Job Roles</option>
            {getJobRoles().map((role, idx) => (
              <option key={idx} value={role}>{role}</option>
            ))}
          </Form.Select>
        </Col>
        <Col xs={12} md={4} className="mt-2 mt-md-0">
          <InputGroup size="sm">
            <Form.Control
              placeholder="Search by name, candidate ID, email, position, or department"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  setQuickSearch(searchInput);
                }
              }}
            />
            <Button
              variant="primary"
              onClick={() => {
                setQuickSearch(searchInput);
              }}
              style={{ 
                borderRadius: '0 8px 8px 0',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none'
              }}
            >
              <FaSearch />
            </Button>
            {(quickSearch || searchInput) && (
              <Button 
                variant="outline-secondary" 
                onClick={() => {
                  setSearchInput('');
                  setQuickSearch('');
                }}
                style={{ borderRadius: '8px', marginLeft: '0.5rem' }}
              >
                Reset
              </Button>
            )}
          </InputGroup>
        </Col>
        <Col xs="auto" className="mt-2 mt-md-0">
          {pendingCandidates.length > 0 && (
            <FormCheck
              type="checkbox"
              label="Select all pending"
              checked={selectedCandidates.size === pendingCandidates.length}
              onChange={handleSelectAll}
            />
          )}
        </Col>
        <Col xs={12} md className="mt-2 mt-md-0 text-md-end">
          <small className="text-muted">
            Showing <strong>{pendingCandidates.length}</strong> pending candidate(s){selectedJobRole !== 'all' ? ` for ${selectedJobRole}` : ''}
          </small>
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

      {pendingCandidates.length === 0 ? (
        <Row>
          <Col>
            <Alert variant="info">
              No pending submissions found for {activeTab === 'teaching' ? 'Teaching' : activeTab === 'non_teaching' ? 'Non-Teaching' : 'the selected filters'}.
            </Alert>
          </Col>
        </Row>
      ) : (
        <Row className="g-3">
          {pendingCandidates.map(candidate => (
            <Col xs={12} md={6} lg={4} key={candidate._id}>
              <Card className="h-100 shadow-sm border-0">
                <Card.Body className="d-flex flex-column">
                  <div className="d-flex align-items-start justify-content-between mb-2">
                    <div className="d-flex align-items-center gap-2">
                      {candidate.passportPhotoUrl ? (
                        <Image
                          src={candidate.passportPhotoUrl}
                          alt={candidate.user?.name}
                          roundedCircle
                          style={{ width: '42px', height: '42px', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            background: '#e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <FaUser style={{ color: '#64748b' }} />
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '1rem' }}>{candidate.user?.name || 'N/A'}</div>
                        <small className="text-muted">{candidate.user?.email || 'N/A'}</small>
                      </div>
                    </div>
                    <FormCheck
                      type="checkbox"
                      checked={selectedCandidates.has(candidate._id)}
                      onChange={() => handleSelectCandidate(candidate._id)}
                    />
                  </div>
                  <div className="mb-2 text-muted" style={{ fontSize: '0.85rem' }}>
                    <div><strong>Position:</strong> {candidate.form?.position || 'N/A'}</div>
                    <div><strong>Department:</strong> {candidate.form?.department || 'N/A'}</div>
                    <div><strong>Applied:</strong> {new Date(candidate.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="mb-3 d-flex flex-wrap gap-2">
                    <Badge bg={candidate.form?.formCategory === 'teaching' ? 'primary' : 'secondary'}>
                      {candidate.form?.formCategory === 'teaching' ? 'Teaching' : 'Non-Teaching'}
                    </Badge>
                    {candidate.candidateNumber ? (
                      <Badge bg="dark">{candidate.candidateNumber}</Badge>
                    ) : (
                      <Badge bg="light" text="dark">No Candidate ID</Badge>
                    )}
                    {getStatusBadge(candidate.status || 'pending')}
                  </div>
                  <div className="mt-auto d-flex gap-2">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => fetchCandidateProfile(candidate._id)}
                      disabled={profileLoading}
                    >
                      {profileLoading ? <Spinner as="span" animation="border" size="sm" /> : 'View'}
                    </Button>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleApprove(candidate._id)}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleReject(candidate._id)}
                    >
                      Reject
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {progressedCandidates.length > 0 && (
        <>
          <Row className="mt-4">
            <Col>
              <h4 className="mb-1" style={{ fontWeight: 600 }}>Selected Candidates</h4>
              <p className="text-muted mb-0" style={{ fontSize: '0.95rem' }}>
                Candidates approved from submissions appear here so you can coordinate assessments and interviews.
              </p>
            </Col>
          </Row>
          <Row className="g-3 mt-1">
            {progressedCandidates.map(candidate => (
              <Col xs={12} md={6} lg={4} key={candidate._id}>
                <Card className="h-100 shadow-sm border-0 bg-light">
                  <Card.Body className="d-flex flex-column">
                    <div className="d-flex align-items-start justify-content-between mb-2">
                      <div className="d-flex align-items-center gap-2">
                        {candidate.passportPhotoUrl ? (
                          <Image
                            src={candidate.passportPhotoUrl}
                            alt={candidate.user?.name}
                            roundedCircle
                            style={{ width: '42px', height: '42px', objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '50%',
                              background: '#e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <FaUser style={{ color: '#64748b' }} />
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '1rem' }}>{candidate.user?.name || 'N/A'}</div>
                          <small className="text-muted">{candidate.user?.email || 'N/A'}</small>
                        </div>
                      </div>
                    </div>
                    <div className="mb-2 text-muted" style={{ fontSize: '0.85rem' }}>
                      <div><strong>Position:</strong> {candidate.form?.position || 'N/A'}</div>
                      <div><strong>Department:</strong> {candidate.form?.department || 'N/A'}</div>
                      <div><strong>Approved:</strong> {candidate.updatedAt ? new Date(candidate.updatedAt).toLocaleDateString() : '—'}</div>
                    </div>
                    <div className="mb-3 d-flex flex-wrap gap-2">
                      <Badge bg={candidate.form?.formCategory === 'teaching' ? 'primary' : 'secondary'}>
                        {candidate.form?.formCategory === 'teaching' ? 'Teaching' : 'Non-Teaching'}
                      </Badge>
                      {candidate.candidateNumber ? (
                        <Badge bg="dark">{candidate.candidateNumber}</Badge>
                      ) : (
                        <Badge bg="light" text="dark">Awaiting ID</Badge>
                      )}
                      {['approved', 'selected'].includes(candidate.status) ? (
                        <Badge bg="success">Selected Candidate</Badge>
                      ) : (
                        <Badge bg="warning" text="dark">Shortlisted</Badge>
                      )}
                      {getStatusBadge(candidate.status || 'approved')}
                    </div>
                    <div className="mt-auto d-flex gap-2">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => fetchCandidateProfile(candidate._id)}
                        disabled={profileLoading}
                      >
                        {profileLoading ? <Spinner as="span" animation="border" size="sm" /> : 'View'}
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => navigate('/super-admin/candidates')}
                      >
                        Next Steps
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </>
      )}

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
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto', background: '#f8fafc' }}>
          {selectedCandidate && (
            <Tabs defaultActiveKey="application" className="mb-3">
              <Tab eventKey="application" title="Application Details">
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

