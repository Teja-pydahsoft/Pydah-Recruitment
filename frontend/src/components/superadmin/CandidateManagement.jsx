import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Modal, Tabs, Tab, Alert, Spinner, Image, Form, Offcanvas, ProgressBar, InputGroup, Pagination } from 'react-bootstrap';
import { FaFilePdf, FaFileImage, FaDownload, FaExternalLinkAlt, FaUser, FaSearch } from 'react-icons/fa';
import api from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import ToastNotificationContainer from '../ToastNotificationContainer';

const PAGE_SIZE = 10;

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

  // Count scheduled interviews: includes both 'scheduled' and 'completed' (since completed interviews were previously scheduled)
  const interviewsScheduled = interviews.filter(i => ['scheduled', 'completed'].includes(i.status)).length;
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
  const { hasWritePermission } = useAuth();
  const canWrite = hasWritePermission('candidates.manage');
  
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [toast, setToast] = useState({ type: '', message: '' });
  const [searchTerm, setSearchTerm] = useState(''); // Applied search
  const [searchInput, setSearchInput] = useState(''); // Input value (not applied until button click)
  const [statusFilter, setStatusFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [stageDrawerStage, setStageDrawerStage] = useState(null);
  const [stageDrawerOpen, setStageDrawerOpen] = useState(false);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionCandidate, setDecisionCandidate] = useState(null);
  const [decisionType, setDecisionType] = useState('selected');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [finalizationData, setFinalizationData] = useState({
    bond: '',
    conditions: '',
    salary: '',
    designation: ''
  });
  const [expandedTestResults, setExpandedTestResults] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const toggleTestResultDetails = (testId) => {
    setExpandedTestResults(prev => ({
      ...prev,
      [testId]: !prev[testId]
    }));
  };

  const formatDurationSeconds = (value) => {
    const seconds = Number(value);
    if (!Number.isFinite(seconds) || seconds < 0) {
      return '--';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const formatOptionList = (options, emptyLabel = 'Not answered') => {
    if (!options || options.length === 0) {
      return emptyLabel;
    }
    return options
      .map(option => {
        if (!option) {
          return '—';
        }
        const label = option.label || (typeof option.index === 'number' ? String.fromCharCode(65 + option.index) : '');
        const text = option.text || '—';
        return `${label}${label ? '. ' : ''}${text}`;
      })
      .join(', ');
  };

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const response = await api.get('/candidates');
      setCandidates(response.data.candidates || []);
    } catch (error) {
      setToast({ type: 'danger', message: 'Failed to fetch candidates' });
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
      setExpandedTestResults({});
    } catch (error) {
      setToast({ type: 'danger', message: 'Failed to fetch candidate profile' });
      console.error('Profile fetch error:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const closeProfileModal = () => {
    setShowProfileModal(false);
    setSelectedCandidate(null);
    setExpandedTestResults({});
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
      const candidateId = candidate.candidateNumber?.toLowerCase() || '';

      const matchesTerm = !term ||
        name.includes(term) ||
        email.includes(term) ||
        position.includes(term) ||
        department.includes(term) ||
        candidateId.includes(term);

      return matchesStatus && matchesStage && matchesTerm;
    });
  }, [candidates, searchTerm, statusFilter, stageFilter]);

  // Paginated candidates
  const paginatedCandidates = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredCandidates.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredCandidates, currentPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredCandidates.length / PAGE_SIZE);
  }, [filteredCandidates.length]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, stageFilter]);

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
    setFinalizationData({
      bond: '',
      conditions: '',
      salary: '',
      designation: ''
    });
  };

  const handleDecisionSubmit = async () => {
    if (!decisionCandidate) return;
    
    // Validate: Notes are mandatory for non-finalization decisions
    if (decisionType !== 'selected' && !decisionNotes.trim()) {
      setToast({ type: 'danger', message: 'Note is mandatory when promoting candidate to next step' });
      return;
    }
    
    // Validate: Finalization form fields are required when finalizing
    if (decisionType === 'selected') {
      if (!finalizationData.bond.trim() || !finalizationData.conditions.trim() || 
          !finalizationData.salary.trim() || !finalizationData.designation.trim()) {
        setToast({ type: 'danger', message: 'All finalization fields (Bond, Conditions, Salary, Designation) are required' });
        return;
      }
    }
    
    setDecisionLoading(true);
    try {
      const payload = {
        decision: decisionType,
        notes: decisionNotes
      };
      
      // Include finalization data when finalizing
      if (decisionType === 'selected') {
        payload.finalizationData = finalizationData;
      }
      
      const response = await api.put(`/candidates/${decisionCandidate._id}/final-decision`, payload);

      let decisionLabel = 'updated';
      if (decisionType === 'selected') {
        decisionLabel = 'finalized';
      } else if (decisionType === 'rejected') {
        decisionLabel = 'rejected';
      } else if (decisionType === 'on_hold') {
        decisionLabel = 'put on hold';
      }
      setToast({ type: 'success', message: `Candidate ${decisionCandidate.user?.name || ''} ${decisionLabel} successfully.` });

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
      setToast({ type: 'danger', message: 'Failed to update candidate decision' });
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

    // Extract key information
    const currentDesignation = applicationData.designation || applicationData.lastDesignation || 'Not provided';
    const qualification = applicationData.highestQualification || applicationData.qualification || 'Not provided';
    const currentCTC = applicationData.currentSalary || applicationData.currentCTC || 'Not provided';
    const expectedCTC = applicationData.expectedSalary || applicationData.expectedCTC || 'Not provided';
    const experience = applicationData.experience || applicationData.totalExperienceYears || 'Not provided';
    
    // Parse experience and education (if stored as textarea)
    const experienceEntries = typeof experience === 'string' && experience.includes('\n') 
      ? experience.split('\n').filter(e => e.trim()) 
      : [experience];

    return (
      <div>
        <Row className="mb-4">
          {/* Left Column - Key Information */}
          <Col md={4}>
            <Card className="shadow-sm mb-3">
              <Card.Header style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <h5 className="mb-0" style={{ color: '#495057', fontWeight: '600' }}>Key Information</h5>
              </Card.Header>
              <Card.Body style={{ backgroundColor: '#ffffff' }}>
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
                {workflow && (
                  <Alert variant="light" className="mb-3">
                    <div style={{ fontWeight: 600, color: '#1f2937' }}>Workflow Stage</div>
                    <div style={{ color: '#475569', fontSize: '0.9rem' }}>{workflow.label}</div>
                    {workflow.nextAction && (
                      <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                        Next: {workflow.nextAction}
                      </div>
                    )}
                  </Alert>
                )}
                <p style={{ marginBottom: '0.75rem' }}>
                  <strong style={{ color: '#495057', minWidth: '120px', display: 'inline-block' }}>Name:</strong> 
                  <span style={{ color: '#212529' }}> {candidate.personalDetails.name}</span>
                </p>
                <p style={{ marginBottom: '0.75rem' }}>
                  <strong style={{ color: '#495057', minWidth: '120px', display: 'inline-block' }}>Email:</strong> 
                  <span style={{ color: '#212529' }}> {candidate.personalDetails.email}</span>
                </p>
                <p style={{ marginBottom: '0.75rem' }}>
                  <strong style={{ color: '#495057', minWidth: '120px', display: 'inline-block' }}>Phone:</strong> 
                  <span style={{ color: phone === 'Not provided' ? '#6c757d' : '#212529' }}> {phone}</span>
                </p>
                <p style={{ marginBottom: '0.75rem' }}>
                  <strong style={{ color: '#495057', minWidth: '120px', display: 'inline-block' }}>Current Designation:</strong> 
                  <span style={{ color: '#212529' }}> {currentDesignation}</span>
                </p>
                <p style={{ marginBottom: '0.75rem' }}>
                  <strong style={{ color: '#495057', minWidth: '120px', display: 'inline-block' }}>Qualification:</strong> 
                  <span style={{ color: '#212529' }}> {qualification}</span>
                </p>
                <p style={{ marginBottom: '0.75rem' }}>
                  <strong style={{ color: '#495057', minWidth: '120px', display: 'inline-block' }}>Current CTC:</strong> 
                  <span style={{ color: '#212529' }}> {currentCTC}</span>
                </p>
                <p style={{ marginBottom: '0.75rem' }}>
                  <strong style={{ color: '#495057', minWidth: '120px', display: 'inline-block' }}>Expected CTC:</strong> 
                  <span style={{ color: '#212529' }}> {expectedCTC}</span>
                </p>
              </Card.Body>
            </Card>

            {/* Experience Section */}
            <Card className="shadow-sm mb-3">
              <Card.Header style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <h5 className="mb-0" style={{ color: '#495057', fontWeight: '600' }}>Experience</h5>
              </Card.Header>
              <Card.Body style={{ backgroundColor: '#ffffff', maxHeight: '300px', overflowY: 'auto' }}>
                {experienceEntries.length > 0 && experienceEntries[0] !== 'Not provided' ? (
                  experienceEntries.map((exp, idx) => (
                    <div key={idx} className="mb-3 p-2" style={{ backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                      <div style={{ color: '#212529', whiteSpace: 'pre-wrap' }}>{exp}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted">No experience details provided</p>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Right Column - Remaining Details */}
          <Col md={8}>
            <Card className="shadow-sm mb-3">
              <Card.Header style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <h5 className="mb-0" style={{ color: '#495057', fontWeight: '600' }}>Application Form Details</h5>
              </Card.Header>
              <Card.Body style={{ maxHeight: '500px', overflowY: 'auto', backgroundColor: '#ffffff' }}>
                {filteredApplicationData.length > 0 ? (
                  filteredApplicationData.map(([key, value]) => {
                    if (typeof value === 'string' && (value.startsWith('http') || value.startsWith('https'))) {
                      return null;
                    }
                    if (value === null || value === undefined || value === '') {
                      return null;
                    }
                    // Skip experience and education as they're shown separately
                    if (key.toLowerCase() === 'experience' || key.toLowerCase() === 'education') {
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
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Test Title</th>
              <th>Score</th>
              <th>Percentage</th>
              <th>Status</th>
              <th>Submitted At</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {candidate.testResults.tests.map((test, index) => {
              const testKey = test.testId || index;
              return (
              <React.Fragment key={testKey}>
                <tr>
                  <td>{test.testTitle}</td>
                  <td>{test.score}/{test.totalScore}</td>
                  <td>{test.percentage.toFixed(1)}%</td>
                  <td>{getStatusBadge(test.status)}</td>
                  <td>{test.submittedAt ? new Date(test.submittedAt).toLocaleString() : '--'}</td>
                  <td>
                    <Button
                      variant={expandedTestResults[testKey] ? 'primary' : 'outline-primary'}
                      size="sm"
                      onClick={() => toggleTestResultDetails(testKey)}
                    >
                      {expandedTestResults[testKey] ? 'Hide Answers' : 'View Answers'}
                    </Button>
                  </td>
                </tr>
                {expandedTestResults[testKey] && (
                  <tr>
                    <td colSpan={6}>
                      <div className="p-3 bg-light rounded">
                        <div className="d-flex flex-wrap gap-3 mb-3">
                          <div><strong>Score:</strong> {test.score}/{test.totalScore}</div>
                          <div><strong>Percentage:</strong> {test.percentage.toFixed(1)}%</div>
                          {test.duration && <div><strong>Duration:</strong> {test.duration} minutes</div>}
                          {test.startedAt && <div><strong>Started:</strong> {new Date(test.startedAt).toLocaleString()}</div>}
                          {test.submittedAt && <div><strong>Submitted:</strong> {new Date(test.submittedAt).toLocaleString()}</div>}
                        </div>
                        {test.answers && test.answers.length > 0 ? (
                          <Table size="sm" bordered hover responsive>
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Question</th>
                                <th>Your Answer</th>
                                <th>Correct Answer</th>
                                <th>Result</th>
                                <th>Marks</th>
                                <th>Time Taken</th>
                                <th>Answered At</th>
                              </tr>
                            </thead>
                            <tbody>
                              {test.answers.map((answer, answerIndex) => (
                                <tr key={`${testKey}-${answer.questionId || answerIndex}`}>
                                  <td>{answerIndex + 1}</td>
                                  <td>{answer.questionText}</td>
                                  <td>{formatOptionList(answer.selectedOptions)}</td>
                                  <td>{formatOptionList(answer.correctOptions, 'Not available')}</td>
                                  <td>
                                    {answer.isCorrect === true ? (
                                      <Badge bg="success">Correct</Badge>
                                    ) : answer.isCorrect === false ? (
                                      <Badge bg="danger">Incorrect</Badge>
                                    ) : (
                                      <Badge bg="secondary">Pending</Badge>
                                    )}
                                  </td>
                                  <td>{typeof answer.marksAwarded === 'number' ? answer.marksAwarded : '--'}</td>
                                  <td>{formatDurationSeconds(answer.timeTaken)}</td>
                                  <td>{answer.answeredAt ? new Date(answer.answeredAt).toLocaleString() : '--'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        ) : (
                          <Alert variant="info" className="mb-0">No answer details available for this test.</Alert>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );})}
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

  const renderInterviewFeedbackTab = (candidate) => {
    const { summary, feedback } = candidate.interviewFeedback || { summary: {}, feedback: [] };
    const totalInterviews = summary?.totalInterviews || 0;
    const averageRating = typeof summary?.averageRating === 'number' && !Number.isNaN(summary.averageRating)
      ? summary.averageRating
      : 0;
    const feedbackCount = summary?.feedbackCount || 0;

    const formatRating = (value) => {
      if (typeof value === 'number' && !Number.isNaN(value)) {
        return `${value.toFixed(1)}/5`;
      }
      return '—';
    };

    return (
      <div>
        <Row className="mb-4">
          <Col md={4}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-primary">{totalInterviews}</h3>
                <p className="text-muted mb-0">Total Interviews</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-success">{averageRating.toFixed(1)}</h3>
                <p className="text-muted mb-0">Average Rating</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-info">{feedbackCount}</h3>
                <p className="text-muted mb-0">Feedback Count</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {feedback && feedback.length > 0 ? (
          <div>
            {feedback.map((entry, index) => {
              const ratings = entry.ratings || {};
              const hasRatings = Object.values(ratings).some(value => typeof value === 'number' && !Number.isNaN(value));

              return (
                <Card key={index} className="mb-3 shadow-sm">
                  <Card.Header>
                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
                      <div>
                        <h6 className="mb-1">{entry.interviewTitle} - Round {entry.round}</h6>
                        <small className="text-muted">Panel Member: {entry.panelMember?.name || 'Unknown'}</small>
                      </div>
                      <div className="mt-2 mt-sm-0 text-sm-end">
                        <Badge bg="secondary">{entry.type || 'Interview'}</Badge>
                        {entry.submittedAt && (
                          <div className="text-muted small mt-1">
                            Submitted: {new Date(entry.submittedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card.Header>
                  <Card.Body>
                    <Row className="gy-3">
                      {hasRatings && (
                        <Col md={6}>
                          <h6 className="fw-semibold">Ratings</h6>
                          <div className="d-flex flex-column gap-1">
                            <span>Technical Skills: {formatRating(ratings.technicalSkills)}</span>
                            <span>Communication: {formatRating(ratings.communication)}</span>
                            <span>Problem Solving: {formatRating(ratings.problemSolving)}</span>
                            <span className="fw-semibold">Overall: {formatRating(ratings.overallRating)}</span>
                            {typeof entry.ratingAverage === 'number' && !Number.isNaN(entry.ratingAverage) && (
                              <span className="text-muted small">
                                Average of submitted ratings: {entry.ratingAverage.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </Col>
                      )}
                      {entry.comments && (
                        <Col md={hasRatings ? 6 : 12}>
                          <h6 className="fw-semibold">Comments</h6>
                          <p className="mb-0">{entry.comments}</p>
                        </Col>
                      )}
                    </Row>

                    {entry.questionAnswers && entry.questionAnswers.length > 0 && (
                      <div className="mt-4">
                        <h6 className="fw-semibold mb-3">Feedback Form Responses</h6>
                        <Table striped bordered hover responsive size="sm">
                          <thead>
                            <tr>
                              <th>Question</th>
                              <th>Response</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entry.questionAnswers
                              .filter(answer => {
                                // Filter out recommendation-related questions
                                const questionText = (answer.question || '').toLowerCase();
                                return !questionText.includes('recommend');
                              })
                              .map((answer, answerIdx) => (
                              <tr key={answerIdx}>
                                <td>{answer.question || 'Question'}</td>
                                <td>
                                  {answer.type === 'rating' && typeof answer.displayAnswer === 'number'
                                    ? `${answer.displayAnswer}/5`
                                    : (answer.displayAnswer ?? answer.answer ?? '—')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              );
            })}
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
  };


  if (loading) {
    return <LoadingSpinner message="Loading candidates..." />;
  }

  return (
    <Container fluid className="super-admin-fluid">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2>Candidate Management</h2>
            <Button
              variant="outline-primary"
              onClick={async () => {
                try {
                  // Download all candidates as PDF
                  const response = await api.get('/candidates/export/pdf', { responseType: 'blob' });
                  const url = window.URL.createObjectURL(new Blob([response.data]));
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', `candidates_${new Date().toISOString().split('T')[0]}.pdf`);
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                } catch (error) {
                  setToast({ type: 'danger', message: 'Failed to download candidate details' });
                  console.error('PDF download error:', error);
                }
              }}
            >
              <FaDownload className="me-2" />
              Download Candidate Details
            </Button>
          </div>
          <p>Manage approved candidates, monitor their progress, and review test results and interview feedback.</p>
        </Col>
      </Row>


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
          <InputGroup size="sm">
            <Form.Control
              placeholder="Search by name, candidate ID, email, position..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  setSearchTerm(searchInput);
                }
              }}
            />
            <Button
              variant="primary"
              onClick={() => {
                setSearchTerm(searchInput);
              }}
              style={{ 
                borderRadius: '0 8px 8px 0',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none'
              }}
            >
              <FaSearch />
            </Button>
            {(searchTerm || searchInput) && (
              <Button 
                variant="outline-secondary" 
                onClick={() => {
                  setSearchInput('');
                  setSearchTerm('');
                }}
                style={{ borderRadius: '8px', marginLeft: '0.5rem' }}
              >
                Reset
              </Button>
            )}
          </InputGroup>
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
                    {paginatedCandidates.map((candidate) => (
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
                        <td>
                          {candidate.finalDecision?.decision === 'selected' 
                            ? <Badge bg="success">finalized</Badge>
                            : getStatusBadge(candidate.status)}
                        </td>
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
                          {canWrite && (
                            <>
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
                                disabled={
                                  candidate.status === 'on_hold' || 
                                  candidate.finalDecision?.decision === 'on_hold' ||
                                  candidate.status === 'selected' ||
                                  candidate.finalDecision?.decision === 'selected'
                                }
                                onClick={() => openDecisionModal(candidate, 'on_hold')}
                              >
                                Put On Hold
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                disabled={
                                  candidate.status === 'rejected' || 
                                  candidate.finalDecision?.decision === 'rejected' ||
                                  candidate.status === 'selected' ||
                                  candidate.finalDecision?.decision === 'selected'
                                }
                                onClick={() => openDecisionModal(candidate, 'rejected')}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
              {totalPages > 1 && (
                <div className="d-flex justify-content-end align-items-center mt-3">
                  <Pagination size="sm" className="mb-0">
                    <Pagination.Prev
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    />
                    {Array.from({ length: totalPages }).map((_, index) => (
                      <Pagination.Item
                        key={index + 1}
                        active={currentPage === index + 1}
                        onClick={() => setCurrentPage(index + 1)}
                      >
                        {index + 1}
                      </Pagination.Item>
                    ))}
                    <Pagination.Next
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    />
                  </Pagination>
                </div>
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
                        <span><strong>Status:</strong> {candidate.finalDecision?.decision === 'selected' ? 'finalized' : candidate.status}</span>
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
                        {canWrite && (
                          <>
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
                              disabled={
                                candidate.status === 'on_hold' || 
                                candidate.finalDecision?.decision === 'on_hold' ||
                                candidate.status === 'selected' ||
                                candidate.finalDecision?.decision === 'selected'
                              }
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
                              disabled={
                                candidate.status === 'rejected' || 
                                candidate.finalDecision?.decision === 'rejected' ||
                                candidate.status === 'selected' ||
                                candidate.finalDecision?.decision === 'selected'
                              }
                              onClick={() => {
                                openDecisionModal(candidate, 'rejected');
                                closeStageDrawer();
                              }}
                            >
                              Reject
                            </Button>
                          </>
                        )}
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
        onHide={closeProfileModal}
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
          {selectedCandidate && canWrite && (
            <>
              <Button
                variant="success"
                onClick={() => {
                  openDecisionModal(selectedCandidate, 'selected');
                  closeProfileModal();
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
                  closeProfileModal();
                }}
                disabled={
                  selectedCandidate.status === 'on_hold' ||
                  selectedCandidate.finalDecision?.decision === 'on_hold' ||
                  selectedCandidate.status === 'selected' ||
                  selectedCandidate.finalDecision?.decision === 'selected'
                }
              >
                Put On Hold
              </Button>
              <Button
                variant="outline-danger"
                onClick={() => {
                  openDecisionModal(selectedCandidate, 'rejected');
                  closeProfileModal();
                }}
                disabled={
                  selectedCandidate.status === 'rejected' ||
                  selectedCandidate.finalDecision?.decision === 'rejected' ||
                  selectedCandidate.status === 'selected' ||
                  selectedCandidate.finalDecision?.decision === 'selected'
                }
              >
                Reject
              </Button>
            </>
          )}
          <Button 
            variant="secondary" 
            onClick={closeProfileModal}
            style={{ borderRadius: '6px', padding: '0.5rem 1.5rem' }}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={decisionModalOpen} onHide={closeDecisionModal} centered size={decisionType === 'selected' ? 'lg' : undefined}>
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
          
          {decisionType === 'selected' ? (
            <>
              <Form.Group className="mt-3">
                <Form.Label>Bond *</Form.Label>
                <Form.Control
                  type="text"
                  value={finalizationData.bond}
                  onChange={(e) => setFinalizationData(prev => ({ ...prev, bond: e.target.value }))}
                  placeholder="Enter bond details"
                  required
                />
              </Form.Group>
              <Form.Group className="mt-3">
                <Form.Label>Conditions *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={finalizationData.conditions}
                  onChange={(e) => setFinalizationData(prev => ({ ...prev, conditions: e.target.value }))}
                  placeholder="Enter conditions"
                  required
                />
              </Form.Group>
              <Form.Group className="mt-3">
                <Form.Label>Salary *</Form.Label>
                <Form.Control
                  type="text"
                  value={finalizationData.salary}
                  onChange={(e) => setFinalizationData(prev => ({ ...prev, salary: e.target.value }))}
                  placeholder="Enter salary"
                  required
                />
              </Form.Group>
              <Form.Group className="mt-3">
                <Form.Label>Designation *</Form.Label>
                <Form.Control
                  type="text"
                  value={finalizationData.designation}
                  onChange={(e) => setFinalizationData(prev => ({ ...prev, designation: e.target.value }))}
                  placeholder="Enter designation"
                  required
                />
              </Form.Group>
              <Form.Group className="mt-3">
                <Form.Label>Notes *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder="Add notes about finalization..."
                  required
                />
              </Form.Group>
            </>
          ) : (
            <Form.Group className="mt-3">
              <Form.Label>Notes *</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder="Note is mandatory when promoting candidate to next step..."
                required
              />
            </Form.Group>
          )}
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
      <ToastNotificationContainer 
        toast={toast} 
        onClose={() => setToast({ type: '', message: '' })} 
      />
    </Container>
  );
};

export default CandidateManagement;

