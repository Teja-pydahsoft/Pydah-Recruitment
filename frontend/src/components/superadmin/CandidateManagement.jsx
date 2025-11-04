import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Modal, Tabs, Tab, Alert, Spinner, Image, Form } from 'react-bootstrap';
import { FaFilePdf, FaFileImage, FaDownload, FaExternalLinkAlt, FaUser } from 'react-icons/fa';
import api from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';

const CandidateManagement = () => {
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState('');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [availableTests, setAvailableTests] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const response = await api.get('/candidates');
      // Filter only approved candidates (for test management)
      const approvedCandidates = response.data.candidates.filter(c => c.status === 'approved');
      setCandidates(approvedCandidates);
    } catch (error) {
      setError('Failed to fetch candidates');
      console.error('Candidates fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAssignTestModal = async (candidateId) => {
    setAssignModalOpen(true);
    setSelectedCandidate({ _id: candidateId });
    try {
      const resp = await api.get('/tests');
      setAvailableTests(resp.data.tests || []);
    } catch (err) {
      console.error('Fetch tests error:', err);
      setAvailableTests([]);
    }
  };

  const assignTestToCandidate = async () => {
    if (!selectedCandidate || !selectedTestId) return;
    setAssignLoading(true);
    try {
      await api.post(`/tests/${selectedTestId}/assign`, {
        candidateIds: [selectedCandidate._id],
        scheduledDate: new Date(),
        scheduledTime: '00:00'
      });
      setAssignModalOpen(false);
      setSelectedTestId('');
      fetchCandidates();
    } catch (err) {
      console.error('Assign test error:', err);
      setError('Failed to assign test');
    } finally {
      setAssignLoading(false);
    }
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
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              href={cert.url} 
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <FaExternalLinkAlt />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  const renderTestResultsTab = (candidate) => (
    <div>
      <Row className="mb-4">
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-primary">{candidate.testResults.summary.totalTests}</h3>
              <p className="text-muted mb-0">Total Tests</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-success">{candidate.testResults.summary.passedTests}</h3>
              <p className="text-muted mb-0">Passed Tests</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-info">{candidate.testResults.summary.averageScore.toFixed(1)}%</h3>
              <p className="text-muted mb-0">Average Score</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {candidate.testResults.tests.length > 0 ? (
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Test Title</th>
              <th>Score</th>
              <th>Percentage</th>
              <th>Status</th>
              <th>Submitted At</th>
            </tr>
          </thead>
          <tbody>
            {candidate.testResults.tests.map((test, index) => (
              <tr key={index}>
                <td>{test.testTitle}</td>
                <td>{test.score}/{test.totalScore}</td>
                <td>{test.percentage.toFixed(1)}%</td>
                <td>{getStatusBadge(test.status)}</td>
                <td>{new Date(test.submittedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Alert variant="info">No test results available yet.</Alert>
      )}
    </div>
  );

  const renderInterviewFeedbackTab = (candidate) => (
    <div>
      <Row className="mb-4">
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-primary">{candidate.interviewFeedback.summary.totalInterviews}</h3>
              <p className="text-muted mb-0">Total Interviews</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-success">{candidate.interviewFeedback.summary.averageRating.toFixed(1)}</h3>
              <p className="text-muted mb-0">Average Rating</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-info">{candidate.interviewFeedback.summary.feedbackCount}</h3>
              <p className="text-muted mb-0">Feedback Count</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {candidate.interviewFeedback.feedback.length > 0 ? (
        <div>
          {candidate.interviewFeedback.feedback.map((feedback, index) => (
            <Card key={index} className="mb-3">
              <Card.Header>
                <h6>{feedback.interviewTitle} - Round {feedback.round}</h6>
                <small className="text-muted">Panel Member: {feedback.panelMember.name}</small>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <h6>Ratings:</h6>
                    <p>Technical Skills: {feedback.ratings.technicalSkills}/5</p>
                    <p>Communication: {feedback.ratings.communication}/5</p>
                    <p>Problem Solving: {feedback.ratings.problemSolving}/5</p>
                    <p><strong>Overall: {feedback.ratings.overallRating}/5</strong></p>
                  </Col>
                  <Col md={6}>
                    <h6>Recommendation:</h6>
                    <p>{getStatusBadge(feedback.recommendation)}</p>
                    {feedback.comments && (
                      <>
                        <h6>Comments:</h6>
                        <p>{feedback.comments}</p>
                      </>
                    )}
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          ))}
        </div>
      ) : (
        <Alert variant="info">No interview feedback available yet.</Alert>
      )}
    </div>
  );

  if (loading) {
    return <LoadingSpinner message="Loading candidates..." />;
  }

  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <h2>Candidate Management</h2>
          <p>Manage approved candidates and assign tests. View test results and interview feedback.</p>
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

      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5>Approved Candidates</h5>
            </Card.Header>
            <Card.Body>
              {candidates.length === 0 ? (
                <Alert variant="info">No approved candidates yet.</Alert>
              ) : (
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>Photo</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Position</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((candidate) => (
                      <tr key={candidate._id}>
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
                        <td>{candidate.user.name}</td>
                        <td>{candidate.user.email}</td>
                        <td>{candidate.form.position}</td>
                        <td>{candidate.form.department}</td>
                        <td>{getStatusBadge(candidate.status)}</td>
                        <td>
                          <Button
                            variant="primary"
                            size="sm"
                            className="me-2"
                            onClick={() => fetchCandidateProfile(candidate._id)}
                            disabled={profileLoading}
                          >
                            {profileLoading ? <Spinner as="span" animation="border" size="sm" /> : 'View Profile'}
                          </Button>
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => openAssignTestModal(candidate._id)}
                          >
                            Assign Test
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
              <Tab eventKey="tests" title="Test Results">
                {renderTestResultsTab(selectedCandidate)}
              </Tab>
              <Tab eventKey="interviews" title="Interview Feedback">
                {renderInterviewFeedbackTab(selectedCandidate)}
              </Tab>
            </Tabs>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowProfileModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Assign Test Modal */}
      <Modal show={assignModalOpen} onHide={() => setAssignModalOpen(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Assign Test to Candidate</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Select Test</Form.Label>
              <Form.Select value={selectedTestId} onChange={(e) => setSelectedTestId(e.target.value)}>
                <option value="">-- Choose a test --</option>
                {availableTests.map(t => (
                  <option key={t._id} value={t._id}>{t.title} ({t.duration} min)</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={assignTestToCandidate} disabled={!selectedTestId || assignLoading}>
            {assignLoading ? 'Assigning...' : 'Assign Test'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default CandidateManagement;

