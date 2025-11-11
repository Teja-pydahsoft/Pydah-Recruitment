import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Modal, Tabs, Tab, Alert, Spinner, Image, Form, Offcanvas, ProgressBar } from 'react-bootstrap';
import { FaFilePdf, FaFileImage, FaDownload, FaExternalLinkAlt, FaUser } from 'react-icons/fa';
import api from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';

const WORKFLOW_STAGE_META = {
  application_review: { label: 'Application Review', variant: 'secondary' },
  awaiting_test_assignment: { label: 'Awaiting Test Assignment', variant: 'info' },
  test_assigned: { label: 'Test Assigned', variant: 'primary' },
  test_in_progress: { label: 'Test In Progress', variant: 'warning' },
  awaiting_interview: { label: 'Awaiting Interview', variant: 'info' },
  interview_scheduled: { label: 'Interview Scheduled', variant: 'primary' },
  awaiting_decision: { label: 'Awaiting Decision', variant: 'warning' },
  selected: { label: 'Candidate Selected', variant: 'success' },
  rejected: { label: 'Candidate Rejected', variant: 'danger' },
  on_hold: { label: 'On Hold', variant: 'secondary' }
};

const PIPELINE_SEQUENCE = [
  'application_review',
  'awaiting_test_assignment',
  'test_assigned',
  'test_in_progress',
  'awaiting_interview',
  'interview_scheduled',
  'awaiting_decision',
  'selected'
];

const SPECIAL_STAGE_PROGRESS = {
  on_hold: 55,
  rejected: 0
};

const STATUS_OPTIONS = ['pending', 'approved', 'shortlisted', 'selected', 'rejected', 'on_hold'];

const buildWorkflowSnapshot = (candidate, testAssignments = [], interviewAssignments = []) => {
  if (!candidate) {
    return {
      stage: 'application_review',
      label: 'Application in Review',
      nextAction: 'Review application details',
      tests: {
        assigned: 0,
        pending: 0,
        completed: 0,
        expired: 0,
        passed: 0,
        failed: 0
      },
      interviews: {
        scheduled: 0,
        completed: 0,
        cancelled: 0
      },
      finalDecision: null
    };
  }

  const tests = testAssignments || [];
  const interviews = interviewAssignments || [];
  const testResults = candidate.testResults || [];
  const finalDecision = candidate.finalDecision?.decision || null;

  const testsPending = tests.filter(t => ['invited', 'started'].includes(t.status)).length;
  const testsCompleted = tests.filter(t => t.status === 'completed').length;
  const testsExpired = tests.filter(t => t.status === 'expired').length;
  const testsAssigned = tests.length;

  const passedTests = testResults.filter(tr => tr.status === 'passed').length;
  const failedTests = testResults.filter(tr => tr.status === 'failed').length;

  const interviewsScheduled = interviews.filter(i => i.status === 'scheduled').length;
  const interviewsCompleted = interviews.filter(i => i.status === 'completed').length;
  const interviewsCancelled = interviews.filter(i => ['cancelled', 'no_show'].includes(i.status)).length;

  let stage = 'application_review';
  let label = 'Application in Review';
  let nextAction = 'Review application details';

  const candidateStatus = candidate.status;

  if (candidateStatus === 'rejected' || finalDecision === 'rejected') {
    stage = 'rejected';
    label = 'Application Rejected';
    nextAction = 'Notify candidate of decision';
  } else if (finalDecision === 'selected' || candidateStatus === 'selected') {
    stage = 'selected';
    label = 'Candidate Selected';
    nextAction = 'Proceed with onboarding';
  } else if (finalDecision === 'on_hold' || candidateStatus === 'on_hold') {
    stage = 'on_hold';
    label = 'Candidate On Hold';
    nextAction = 'Review hold status regularly';
  } else if (interviewsCompleted > 0 && !finalDecision) {
    stage = 'awaiting_decision';
    label = 'Awaiting Final Decision';
    nextAction = 'Record final decision';
  } else if (interviewsScheduled > 0) {
    stage = 'interview_scheduled';
    label = 'Interview Scheduled';
    nextAction = 'Conduct interview and capture feedback';
  } else if (passedTests > 0) {
    stage = 'awaiting_interview';
    label = 'Awaiting Interview Scheduling';
    nextAction = 'Schedule next interview round';
  } else if (testsPending > 0) {
    stage = 'test_in_progress';
    label = 'Test In Progress';
    nextAction = 'Monitor test completion';
  } else if (testsAssigned > 0) {
    stage = 'test_assigned';
    label = 'Test Assigned';
    nextAction = 'Ensure candidate starts the test';
  } else if (['approved', 'shortlisted'].includes(candidateStatus)) {
    stage = 'awaiting_test_assignment';
    label = 'Awaiting Test Assignment';
    nextAction = 'Assign appropriate assessment';
  } else if (candidateStatus === 'pending') {
    stage = 'application_review';
    label = 'Application in Review';
    nextAction = 'Review application details';
  }

  return {
    stage,
    label,
    nextAction,
    tests: {
      assigned: testsAssigned,
      pending: testsPending,
      completed: testsCompleted,
      expired: testsExpired,
      passed: passedTests,
      failed: failedTests
    },
    interviews: {
      scheduled: interviewsScheduled,
      completed: interviewsCompleted,
      cancelled: interviewsCancelled
    },
    finalDecision: candidate.finalDecision || null
  };
};

const CandidateManagement = () => {
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [stageDrawerStage, setStageDrawerStage] = useState(null);
  const [stageDrawerOpen, setStageDrawerOpen] = useState(false);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionCandidate, setDecisionCandidate] = useState(null);
  const [decisionType, setDecisionType] = useState('selected');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [decisionLoading, setDecisionLoading] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const response = await api.get('/candidates');
      setCandidates(response.data.candidates || []);
      setError('');
    } catch (error) {
      setError('Failed to fetch candidates');
      console.error('Candidates fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshCandidates = async () => {
    try {
      await fetchCandidates();
    } finally {
      setLoading(false);
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

  const getWorkflowBadge = (workflow) => {
    if (!workflow) {
      return <Badge bg="secondary">Unknown</Badge>;
    }
    const meta = WORKFLOW_STAGE_META[workflow.stage] || { label: workflow.label || 'Workflow', variant: 'secondary' };
    return <Badge bg={meta.variant}>{workflow.label || meta.label}</Badge>;
  };

  const stageStats = useMemo(() => {
    const stats = {};
    candidates.forEach(candidate => {
      const stage = candidate.workflow?.stage || 'application_review';
      stats[stage] = (stats[stage] || 0) + 1;
    });
    return stats;
  }, [candidates]);

  const stageGroups = useMemo(() => {
    const groups = {};
    Object.keys(WORKFLOW_STAGE_META).forEach(stage => {
      groups[stage] = [];
    });

    candidates.forEach(candidate => {
      const stage = candidate.workflow?.stage || 'application_review';
      if (!groups[stage]) {
        groups[stage] = [];
      }
      groups[stage].push(candidate);
    });

    return groups;
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return candidates.filter(candidate => {
      const matchesStatus = statusFilter === 'all' || candidate.status === statusFilter;
      const matchesStage = stageFilter === 'all' || candidate.workflow?.stage === stageFilter;

      const name = candidate.user?.name?.toLowerCase() || '';
      const email = candidate.user?.email?.toLowerCase() || '';
      const position = candidate.form?.position?.toLowerCase() || '';
      const department = candidate.form?.department?.toLowerCase() || '';

      const matchesTerm = !term ||
        name.includes(term) ||
        email.includes(term) ||
        position.includes(term) ||
        department.includes(term);

      return matchesStatus && matchesStage && matchesTerm;
    });
  }, [candidates, searchTerm, statusFilter, stageFilter]);

  const getStageProgressPercentage = (stage) => {
    if (!stage) {
      return 0;
    }
    if (Object.prototype.hasOwnProperty.call(SPECIAL_STAGE_PROGRESS, stage)) {
      return SPECIAL_STAGE_PROGRESS[stage];
    }
    const index = PIPELINE_SEQUENCE.indexOf(stage);
    if (index === -1) {
      return 0;
    }
    return Math.round(((index + 1) / PIPELINE_SEQUENCE.length) * 100);
  };

  const getProgressVariant = (stage) => {
    switch (stage) {
      case 'selected':
        return 'success';
      case 'test_in_progress':
      case 'awaiting_decision':
        return 'warning';
      case 'awaiting_interview':
      case 'interview_scheduled':
      case 'test_assigned':
        return 'info';
      case 'rejected':
        return 'danger';
      case 'on_hold':
        return 'secondary';
      default:
        return 'primary';
    }
  };

  const openStageDrawer = (stage) => {
    setStageDrawerStage(stage);
    setStageDrawerOpen(true);
  };

  const closeStageDrawer = () => {
    setStageDrawerOpen(false);
  };

  const openDecisionModal = (candidate, type) => {
    if (!candidate) return;
    setDecisionCandidate(candidate);
    setDecisionType(type);
    setDecisionNotes(candidate.finalDecision?.notes || '');
    setDecisionModalOpen(true);
  };

  const closeDecisionModal = () => {
    setDecisionModalOpen(false);
    setDecisionCandidate(null);
    setDecisionNotes('');
    setDecisionLoading(false);
  };

  const handleDecisionSubmit = async () => {
    if (!decisionCandidate) return;
    setDecisionLoading(true);
    try {
      const response = await api.put(`/candidates/${decisionCandidate._id}/final-decision`, {
        decision: decisionType,
        notes: decisionNotes
      });

      let decisionLabel = 'updated';
      if (decisionType === 'selected') {
        decisionLabel = 'finalized';
      } else if (decisionType === 'rejected') {
        decisionLabel = 'rejected';
      } else if (decisionType === 'on_hold') {
        decisionLabel = 'put on hold';
      }
      setSuccessMessage(`Candidate ${decisionCandidate.user?.name || ''} ${decisionLabel} successfully.`);
      setError('');

      if (response?.data?.candidate) {
        setCandidates(prevCandidates =>
          prevCandidates.map(candidate =>
            candidate._id === response.data.candidate._id
              ? {
                  ...candidate,
                  ...response.data.candidate,
                  assignments: {
                    tests: candidate.assignments?.tests || [],
                    interviews: candidate.assignments?.interviews || []
                  },
                  workflow: buildWorkflowSnapshot(
                    response.data.candidate,
                    candidate.assignments?.tests || [],
                    candidate.assignments?.interviews || []
                  )
                }
              : candidate
          )
        );
      } else {
        await refreshCandidates();
      }
    } catch (err) {
      setError('Failed to update candidate decision');
      console.error('Decision update error:', err);
    } finally {
      setDecisionLoading(false);
      closeDecisionModal();
    }
  };

  const renderPersonalDetailsTab = (candidate) => {
    const applicationData = candidate.personalDetails?.applicationData || {};
    const documents = candidate.personalDetails?.documents || [];
    const passportPhoto = candidate.personalDetails?.passportPhoto;
    const workflow = candidate.workflow;
    
    // Get phone number - check application data for mobile number if phone not provided
    const phone = candidate.personalDetails.phone || 
                  applicationData.mobileNumber || 
                  applicationData.mobile || 
                  applicationData.phone ||
                  'Not provided';
    
    // Fields to exclude from Application Form Details (already shown in Personal Information)
    const excludedFields = ['name', 'fullName', 'email', 'phone', 'mobileNumber', 'mobile', 'passportPhoto'];
    
    const resume = documents.find(d => d.name?.toLowerCase().includes('resume') || d.name?.toLowerCase().includes('cv'));
    const certificates = documents.filter(d => 
      d.name?.toLowerCase().includes('certificate') || 
      d.name?.toLowerCase().includes('certification')
    );

    // Filter application data to exclude duplicate fields
    const filteredApplicationData = Object.entries(applicationData).filter(([key]) => {
      const lowerKey = key.toLowerCase();
      return !excludedFields.some(excluded => lowerKey.includes(excluded.toLowerCase()));
    });

    return (
      <div>
        <Row className="mb-4">
          <Col md={6}>
            <Card className="shadow-sm">
              <Card.Header style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <h5 className="mb-0" style={{ color: '#495057', fontWeight: '600' }}>Personal Information</h5>
              </Card.Header>
              <Card.Body style={{ backgroundColor: '#ffffff' }}>
                {workflow && (
                  <Alert variant="light" className="d-flex align-items-center justify-content-between">
                    <div>
                      <div style={{ fontWeight: 600, color: '#1f2937' }}>Workflow Stage</div>
                      <div style={{ color: '#475569', fontSize: '0.9rem' }}>{workflow.label}</div>
                      {workflow.nextAction && (
                        <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                          Next action: {workflow.nextAction}
                        </div>
                      )}
                    </div>
                    {getWorkflowBadge(workflow)}
                  </Alert>
                )}
                {passportPhoto && (
                  <div className="text-center mb-3">
                    <Image 
                      src={passportPhoto} 
                      alt="Profile Photo" 
                      rounded 
                      style={{ 
                        maxWidth: '150px', 
                        maxHeight: '150px', 
                        objectFit: 'cover',
                        border: '3px solid #e9ecef',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <p style={{ marginBottom: '0.75rem' }}>
                  <strong style={{ color: '#495057', minWidth: '100px', display: 'inline-block' }}>Name:</strong> 
                  <span style={{ color: '#212529' }}> {candidate.personalDetails.name}</span>
                </p>
                <p style={{ marginBottom: '0.75rem' }}>
                  <strong style={{ color: '#495057', minWidth: '100px', display: 'inline-block' }}>Email:</strong> 
                  <span style={{ color: '#212529' }}> {candidate.personalDetails.email}</span>
                </p>
                <p style={{ marginBottom: '0.75rem' }}>
                  <strong style={{ color: '#495057', minWidth: '100px', display: 'inline-block' }}>Phone:</strong> 
                  <span style={{ color: phone === 'Not provided' ? '#6c757d' : '#212529' }}> {phone}</span>
                </p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6}>
            <Card className="shadow-sm">
              <Card.Header style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <h5 className="mb-0" style={{ color: '#495057', fontWeight: '600' }}>Application Form Details</h5>
              </Card.Header>
              <Card.Body style={{ maxHeight: '400px', overflowY: 'auto', backgroundColor: '#ffffff' }}>
                {filteredApplicationData.length > 0 ? (
                  filteredApplicationData.map(([key, value]) => {
                    if (typeof value === 'string' && (value.startsWith('http') || value.startsWith('https'))) {
                      return null;
                    }
                    if (value === null || value === undefined || value === '') {
                      return null;
                    }
                    return (
                      <p key={key} style={{ marginBottom: '0.75rem' }}>
                        <strong style={{ color: '#495057', minWidth: '150px', display: 'inline-block' }}>
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                        </strong>{' '}
                        <span style={{ color: '#212529' }}>
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </p>
                    );
                  })
                ) : (
                  <p className="text-muted">No additional application data available</p>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="mb-4">
          <Col md={12}>
            <Card className="shadow-sm">
              <Card.Header style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <h5 className="mb-0" style={{ color: '#495057', fontWeight: '600' }}>Documents</h5>
              </Card.Header>
              <Card.Body style={{ backgroundColor: '#ffffff' }}>
                {resume && (
                  <div className="mb-3 p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                    <h6 style={{ color: '#495057', marginBottom: '0.75rem' }}>
                      <FaFilePdf className="me-2" style={{ color: '#dc3545' }} />Resume
                    </h6>
                    <div className="d-flex align-items-center gap-2">
                      <span style={{ color: '#212529', flex: 1 }}>{resume.name}</span>
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        href={resume.url} 
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ borderRadius: '6px' }}
                      >
                        <FaExternalLinkAlt className="me-1" />
                        View
                      </Button>
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        href={resume.url} 
                        download
                        style={{ borderRadius: '6px' }}
                      >
                        <FaDownload className="me-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                )}

                {certificates.length > 0 && (
                  <div className="mb-3">
                    <h6 style={{ color: '#495057', marginBottom: '0.75rem' }}>
                      <FaFileImage className="me-2" style={{ color: '#0d6efd' }} />Certificates ({certificates.length})
                    </h6>
                    <div className="d-flex flex-wrap gap-2">
                      {certificates.map((cert, index) => (
                        <div 
                          key={index} 
                          className="border rounded p-2" 
                          style={{ 
                            minWidth: '200px', 
                            backgroundColor: '#f8f9fa',
                            border: '1px solid #dee2e6',
                            borderRadius: '8px'
                          }}
                        >
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="text-truncate" style={{ maxWidth: '150px', color: '#212529' }}>{cert.name}</span>
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              href={cert.url} 
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ borderRadius: '6px' }}
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

      {candidate.assignments?.tests?.length > 0 && (
        <Card className="mt-3">
          <Card.Header>Test Assignments</Card.Header>
          <Card.Body style={{ padding: 0 }}>
            <Table striped bordered hover responsive className="mb-0">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Invited</th>
                  <th>Completed</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {candidate.assignments.tests.map(assignment => (
                  <tr key={assignment.testId}>
                    <td>{assignment.title}</td>
                    <td><Badge bg="secondary">{assignment.status}</Badge></td>
                    <td>{assignment.invitedAt ? new Date(assignment.invitedAt).toLocaleString() : '--'}</td>
                    <td>{assignment.completedAt ? new Date(assignment.completedAt).toLocaleString() : '--'}</td>
                    <td>{assignment.percentage ? `${assignment.percentage.toFixed(1)}%` : '--'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
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

      {candidate.assignments?.interviews?.length > 0 && (
        <Card className="mt-3">
          <Card.Header>Interview Assignments</Card.Header>
          <Card.Body style={{ padding: 0 }}>
            <Table striped bordered hover responsive className="mb-0">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Round</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Scheduled</th>
                </tr>
              </thead>
              <tbody>
                {candidate.assignments.interviews.map(assignment => (
                  <tr key={assignment.interviewId}>
                    <td>{assignment.title}</td>
                    <td>{assignment.round}</td>
                    <td>{assignment.type}</td>
                    <td><Badge bg="secondary">{assignment.status}</Badge></td>
                    <td>
                      {assignment.scheduledDate
                        ? `${new Date(assignment.scheduledDate).toLocaleDateString()} ${assignment.scheduledTime || ''}`.trim()
                        : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </div>
  );

  if (loading) {
    return <LoadingSpinner message="Loading candidates..." />;
  }

  return (
    <Container fluid className="super-admin-fluid">
      <Row className="mb-4">
        <Col>
          <h2>Candidate Management</h2>
          <p>Manage approved candidates, monitor their progress, and review test results and interview feedback.</p>
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

      {successMessage && (
        <Row className="mb-3">
          <Col>
            <Alert variant="success" dismissible onClose={() => setSuccessMessage('')}>
              {successMessage}
            </Alert>
          </Col>
        </Row>
      )}

      <Row className="mb-4 g-3">
        {['awaiting_test_assignment', 'test_assigned', 'test_in_progress', 'awaiting_interview', 'interview_scheduled', 'awaiting_decision', 'selected', 'rejected'].map(stage => {
          const meta = WORKFLOW_STAGE_META[stage];
          if (!meta) return null;
          const stageCandidates = stageGroups[stage] || [];
          const topCandidateNames = stageCandidates.slice(0, 3).map(candidate => candidate.user?.name || 'Candidate');
          const remainingCount = Math.max(stageCandidates.length - topCandidateNames.length, 0);

          return (
            <Col xs={12} md={6} lg={3} key={stage}>
              <Card
                className="h-100 shadow-sm"
                role="button"
                style={{ cursor: 'pointer', borderLeft: `4px solid var(--bs-${meta.variant})` }}
                onClick={() => openStageDrawer(stage)}
              >
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span style={{ color: '#6b7280', fontWeight: 600 }}>{meta.label}</span>
                    <Badge bg={meta.variant}>{stageStats[stage] || 0}</Badge>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#94a3b8', minHeight: '40px' }}>
                    {stageCandidates.length === 0 ? (
                      meta.label === 'Candidate Selected'
                        ? 'No candidates selected yet'
                        : 'No candidates in this stage currently'
                    ) : (
                      <>
                        <div style={{ fontWeight: 500, color: '#475569' }}>
                          {topCandidateNames.join(', ')}
                          {remainingCount > 0 ? ` +${remainingCount} more` : ''}
                        </div>
                        <small style={{ color: '#94a3b8' }}>Click to view pipeline details</small>
                      </>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Row className="mb-3 g-3">
        <Col md={4}>
          <Form.Control
            placeholder="Search by name, email, position..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Col>
        <Col md={4}>
          <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Candidate Statuses</option>
            {STATUS_OPTIONS.map(status => (
              <option key={status} value={status}>
                {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={4}>
          <Form.Select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
            <option value="all">All Workflow Stages</option>
            {Object.entries(WORKFLOW_STAGE_META).map(([stage, meta]) => (
              <option key={stage} value={stage}>{meta.label}</option>
            ))}
          </Form.Select>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5>Candidate Pipeline</h5>
            </Card.Header>
            <Card.Body>
              {filteredCandidates.length === 0 ? (
                <Alert variant="info">No candidates match the current filters.</Alert>
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
                      <th>Workflow</th>
                      <th>Tests</th>
                      <th>Interviews</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCandidates.map((candidate) => (
                      <tr key={candidate._id}>
                        <td className="text-center">
                          {candidate.passportPhotoUrl ? (
                            <Image
                              src={candidate.passportPhotoUrl}
                              alt={candidate.user?.name || 'Candidate'}
                              roundedCircle
                              style={{ 
                                width: '40px', 
                                height: '40px', 
                                objectFit: 'cover',
                                border: '2px solid #e2e8f0',
                                display: 'block',
                                margin: '0 auto'
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                const placeholder = e.target.nextElementSibling;
                                if (placeholder) {
                                  placeholder.style.display = 'flex';
                                }
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
                              margin: '0 auto',
                              border: '2px solid #cbd5e1'
                            }}
                          >
                            <FaUser style={{ color: '#64748b', fontSize: '18px' }} />
                          </div>
                        </td>
                        <td>{candidate.user.name}</td>
                        <td>{candidate.user.email}</td>
                        <td>{candidate.form.position}</td>
                        <td>{candidate.form.department}</td>
                        <td>{getStatusBadge(candidate.status)}</td>
                        <td>
                          <div className="mb-1">
                            {getWorkflowBadge(candidate.workflow)}
                          </div>
                          <ProgressBar
                            now={getStageProgressPercentage(candidate.workflow?.stage)}
                            variant={getProgressVariant(candidate.workflow?.stage)}
                            style={{ height: '6px' }}
                          />
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{candidate.workflow?.tests?.assigned || 0} assigned</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {candidate.workflow?.tests?.completed || 0} completed · {candidate.workflow?.tests?.passed || 0} passed
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{candidate.workflow?.interviews?.scheduled || 0} scheduled</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {candidate.workflow?.interviews?.completed || 0} completed
                          </div>
                        </td>
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
                            className="me-2"
                            disabled={candidate.status === 'selected' || candidate.finalDecision?.decision === 'selected'}
                            onClick={() => openDecisionModal(candidate, 'selected')}
                          >
                            Finalize
                          </Button>
                          <Button
                            variant="outline-warning"
                            size="sm"
                            className="me-2"
                            disabled={candidate.status === 'on_hold' || candidate.finalDecision?.decision === 'on_hold'}
                            onClick={() => openDecisionModal(candidate, 'on_hold')}
                          >
                            Put On Hold
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            disabled={candidate.status === 'rejected' || candidate.finalDecision?.decision === 'rejected'}
                            onClick={() => openDecisionModal(candidate, 'rejected')}
                          >
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

      <Offcanvas show={stageDrawerOpen} onHide={closeStageDrawer} placement="end">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>
            {stageDrawerStage ? WORKFLOW_STAGE_META[stageDrawerStage]?.label || 'Pipeline Stage' : 'Pipeline Stage'}
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {stageDrawerStage ? (
            <>
              <p className="text-muted" style={{ marginBottom: '1rem' }}>
                {stageGroups[stageDrawerStage]?.length || 0} candidate(s) currently tracked in this stage.
              </p>
              {stageGroups[stageDrawerStage] && stageGroups[stageDrawerStage].length > 0 ? (
                stageGroups[stageDrawerStage].map(candidate => (
                  <Card className="mb-3 shadow-sm" key={candidate._id}>
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h5 className="mb-1">{candidate.user?.name}</h5>
                          <div className="text-muted" style={{ fontSize: '0.9rem' }}>{candidate.user?.email}</div>
                        </div>
                        <Badge bg={WORKFLOW_STAGE_META[candidate.workflow?.stage]?.variant || 'secondary'}>
                          {WORKFLOW_STAGE_META[candidate.workflow?.stage]?.label || 'In Pipeline'}
                        </Badge>
                      </div>

                      <div className="d-flex flex-wrap gap-3 mt-3" style={{ fontSize: '0.85rem', color: '#475569' }}>
                        <span><strong>Tests:</strong> {candidate.workflow?.tests?.completed || 0} / {candidate.workflow?.tests?.assigned || 0}</span>
                        <span><strong>Interviews:</strong> {candidate.workflow?.interviews?.completed || 0} / {candidate.workflow?.interviews?.scheduled || 0}</span>
                        <span><strong>Status:</strong> {candidate.status}</span>
                      </div>

                      <div className="d-flex gap-2 mt-3">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => {
                            fetchCandidateProfile(candidate._id);
                            closeStageDrawer();
                          }}
                        >
                          View Profile
                        </Button>
                        <Button
                          variant="success"
                          size="sm"
                          disabled={candidate.status === 'selected' || candidate.finalDecision?.decision === 'selected'}
                          onClick={() => {
                            openDecisionModal(candidate, 'selected');
                            closeStageDrawer();
                          }}
                        >
                          Finalize
                        </Button>
                        <Button
                          variant="outline-warning"
                          size="sm"
                          disabled={candidate.status === 'on_hold' || candidate.finalDecision?.decision === 'on_hold'}
                          onClick={() => {
                            openDecisionModal(candidate, 'on_hold');
                            closeStageDrawer();
                          }}
                        >
                          Put On Hold
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          disabled={candidate.status === 'rejected' || candidate.finalDecision?.decision === 'rejected'}
                          onClick={() => {
                            openDecisionModal(candidate, 'rejected');
                            closeStageDrawer();
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                ))
              ) : (
                <Alert variant="light">No candidates found in this stage yet.</Alert>
              )}
            </>
          ) : (
            <Alert variant="light">Select a stage to view candidate details.</Alert>
          )}
        </Offcanvas.Body>
      </Offcanvas>

      {/* Candidate Profile Modal */}
      <Modal
        show={showProfileModal}
        onHide={() => setShowProfileModal(false)}
        size="xl"
        centered
        style={{ zIndex: 1050 }}
      >
        <Modal.Header 
          closeButton 
          style={{ 
            backgroundColor: '#f8f9fa', 
            borderBottom: '2px solid #dee2e6',
            padding: '1.25rem 1.5rem'
          }}
        >
          <Modal.Title style={{ color: '#212529', fontWeight: '700', fontSize: '1.5rem' }}>
            Candidate Profile - {selectedCandidate?.personalDetails?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body 
          style={{ 
            maxHeight: '70vh', 
            overflowY: 'auto',
            backgroundColor: '#f8fafc',
            padding: '1.5rem'
          }}
        >
          {selectedCandidate && (
            <Tabs 
              defaultActiveKey="personal" 
              className="mb-3"
              style={{ borderBottom: '2px solid #dee2e6' }}
            >
              <Tab 
                eventKey="personal" 
                title="Personal & Form Details"
                style={{ paddingTop: '1rem' }}
              >
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
        <Modal.Footer style={{ backgroundColor: '#f8f9fa', borderTop: '2px solid #dee2e6' }}>
          {selectedCandidate && (
            <>
              <Button
                variant="success"
                onClick={() => {
                  openDecisionModal(selectedCandidate, 'selected');
                  setShowProfileModal(false);
                }}
                disabled={
                  selectedCandidate.status === 'selected' ||
                  selectedCandidate.finalDecision?.decision === 'selected'
                }
              >
                Finalize
              </Button>
              <Button
                variant="outline-warning"
                onClick={() => {
                  openDecisionModal(selectedCandidate, 'on_hold');
                  setShowProfileModal(false);
                }}
                disabled={
                  selectedCandidate.status === 'on_hold' ||
                  selectedCandidate.finalDecision?.decision === 'on_hold'
                }
              >
                Put On Hold
              </Button>
              <Button
                variant="outline-danger"
                onClick={() => {
                  openDecisionModal(selectedCandidate, 'rejected');
                  setShowProfileModal(false);
                }}
                disabled={
                  selectedCandidate.status === 'rejected' ||
                  selectedCandidate.finalDecision?.decision === 'rejected'
                }
              >
                Reject
              </Button>
            </>
          )}
          <Button 
            variant="secondary" 
            onClick={() => setShowProfileModal(false)}
            style={{ borderRadius: '6px', padding: '0.5rem 1.5rem' }}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={decisionModalOpen} onHide={closeDecisionModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {decisionType === 'selected'
              ? 'Finalize Candidate'
              : decisionType === 'rejected'
              ? 'Reject Candidate'
              : 'Put Candidate On Hold'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Confirm you want to{' '}
            {decisionType === 'selected'
              ? 'finalize'
              : decisionType === 'rejected'
              ? 'reject'
              : 'put on hold'}{' '}
            <strong>{decisionCandidate?.user?.name}</strong> for the role of{' '}
            <strong>{decisionCandidate?.form?.position}</strong>.
          </p>
          <Form.Group className="mt-3">
            <Form.Label>Notes (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              placeholder="Add any notes about this decision..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeDecisionModal} disabled={decisionLoading}>
            Cancel
          </Button>
          <Button
            variant={
              decisionType === 'selected'
                ? 'success'
                : decisionType === 'rejected'
                ? 'danger'
                : 'warning'
            }
            onClick={handleDecisionSubmit}
            disabled={decisionLoading}
          >
            {decisionLoading ? <Spinner as="span" animation="border" size="sm" /> : 'Confirm'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default CandidateManagement;

