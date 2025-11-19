import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Alert,
  Badge,
  Tabs,
  Tab,
  Form,
  Modal,
  Spinner,
  InputGroup,
  Pagination
} from 'react-bootstrap';
import {
  FaPlus,
  FaLayerGroup,
  FaListUl,
  FaEdit,
  FaTrash,
  FaSync,
  FaSearch,
  FaClipboardCheck,
  FaCheckCircle,
  FaUpload,
  FaEye,
  FaDownload,
  FaCopy,
  FaUser
} from 'react-icons/fa';
import api from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';

const CATEGORY_OPTIONS = [
  { value: 'teaching', label: 'Teaching' },
  { value: 'non_teaching', label: 'Non-Teaching' }
];

const DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard'];

const PAGE_SIZE = 10;

const defaultQuestionForm = {
  topicId: '',
  subTopic: '',
  questionText: '',
  options: ['', ''],
  correctAnswer: 0,
  difficulty: 'medium'
};

const defaultBuilderState = {
  candidateId: '',
  title: '',
  description: '',
  instructions: '',
  duration: 60,
  passingPercentage: 50,
  cutoffPercentage: 60,
  selections: [{ topicId: '', questionCount: 5 }]
};

const TestsManagement = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assessments');

  const [topics, setTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicModalVisible, setTopicModalVisible] = useState(false);
  const [topicSaving, setTopicSaving] = useState(false);
  const [topicForm, setTopicForm] = useState({ id: null, name: '', category: 'teaching', description: '', isActive: true });

  const [questionFilters, setQuestionFilters] = useState({ topicId: 'all', search: '' });
  const [questionLoading, setQuestionLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [questionForm, setQuestionForm] = useState(defaultQuestionForm);
  const [questionSaving, setQuestionSaving] = useState(false);
  const [questionModalVisible, setQuestionModalVisible] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [bulkTextModalVisible, setBulkTextModalVisible] = useState(false);
  const [bulkUploadState, setBulkUploadState] = useState({ 
    file: null,
    campus: '',
    department: '',
    topicOption: 'none', // 'none', 'existing', or 'new'
    topicId: '',
    newTopicName: '',
    category: 'teaching'
  });
  const [bulkTextUploadState, setBulkTextUploadState] = useState({
    file: null,
    campus: '',
    department: '',
    topicOption: 'none',
    topicId: '',
    newTopicName: '',
    category: 'teaching'
  });
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkTextUploading, setBulkTextUploading] = useState(false);
  const [templateDownloading, setTemplateDownloading] = useState(false);
  const [bulkDepartments, setBulkDepartments] = useState([]);
  const [bulkDepartmentsLoading, setBulkDepartmentsLoading] = useState(false);
  const [bulkTextDepartments, setBulkTextDepartments] = useState([]);
  const [bulkTextDepartmentsLoading, setBulkTextDepartmentsLoading] = useState(false);
  const [previewQuestions, setPreviewQuestions] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [candidates, setCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);

  const [builderModalVisible, setBuilderModalVisible] = useState(false);
  const [builderSaving, setBuilderSaving] = useState(false);
  const [builderState, setBuilderState] = useState(defaultBuilderState);
  const [promoteModalVisible, setPromoteModalVisible] = useState(false);
  const [promoteSubmitting, setPromoteSubmitting] = useState(false);
  const [promotionForm, setPromotionForm] = useState({
    candidate: null,
    interviewDate: '',
    interviewTime: '',
    notes: ''
  });
  const [testStatusFilter, setTestStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [expandedTestResults, setExpandedTestResults] = useState({});

  const [toast, setToast] = useState({ type: '', message: '' });
  const [candidateFilters, setCandidateFilters] = useState({ category: 'all', position: 'all', search: '' });
  const [searchInput, setSearchInput] = useState(''); // Separate state for input value
  const [assignmentDetails, setAssignmentDetails] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const formatDateTime = (value) => {
    if (!value) {
      return '--';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '--';
    }
    return date.toLocaleString();
  };

  const formatTo12Hour = useCallback((time24) => {
    if (!time24) {
      return '';
    }
    const [hoursPart, minutesPart] = time24.split(':');
    if (hoursPart === undefined || minutesPart === undefined) {
      return time24;
    }
    let hours = Number(hoursPart);
    const suffix = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutesPart} ${suffix}`;
  }, []);

  const istTimeOptions = useMemo(() => {
    const options = [{ value: '', label: 'Select time (IST)' }];
    for (let hour = 0; hour < 24; hour += 1) {
      for (const minute of [0, 30]) {
        const value = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push({ value, label: formatTo12Hour(value) });
      }
    }
    return options;
  }, [formatTo12Hour]);

  const interviewTimeOptions = useMemo(() => {
    if (!promotionForm.interviewTime) {
      return istTimeOptions;
    }
    if (istTimeOptions.some(option => option.value === promotionForm.interviewTime)) {
      return istTimeOptions;
    }
    return [
      ...istTimeOptions,
      {
        value: promotionForm.interviewTime,
        label: formatTo12Hour(promotionForm.interviewTime)
      }
    ];
  }, [istTimeOptions, promotionForm.interviewTime, formatTo12Hour]);

  const renderResultBadge = (status) => {
    const normalized = (status || '').toLowerCase();

    switch (normalized) {
      case 'passed':
        return <Badge bg="success">Passed</Badge>;
      case 'failed':
        return <Badge bg="danger">Failed</Badge>;
      case 'completed':
        return <Badge bg="primary">Completed</Badge>;
      case 'started':
        return <Badge bg="info">In Progress</Badge>;
      case 'invited':
      case 'assigned':
        return <Badge bg="secondary">{status}</Badge>;
      default:
        return <Badge bg="secondary">{status || '—'}</Badge>;
    }
  };

  const renderCandidateProfileContent = () => {
    if (!profileData) {
      return <Alert variant="light">Select a candidate to view test insights.</Alert>;
    }

    const summary = profileData.testResults?.summary || {};
    const totalTests = Number(summary.totalTests || 0);
    const passedTests = Number(summary.passedTests || 0);
    const averageScoreValue =
      typeof summary.averageScore === 'number' ? summary.averageScore : Number(summary.averageScore || 0);

    const completedTests = Array.isArray(profileData.testResults?.tests)
      ? profileData.testResults.tests
      : [];

    const sortedSubmissions = [...completedTests].sort((a, b) => {
      const aTime = a?.submittedAt ? new Date(a.submittedAt).getTime() : Number.POSITIVE_INFINITY;
      const bTime = b?.submittedAt ? new Date(b.submittedAt).getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    });
    const firstSubmission = sortedSubmissions.find(test => test?.submittedAt);

    const assignments = Array.isArray(profileData.assignments?.tests)
      ? profileData.assignments.tests
      : [];

    const scoreFormatter = (score, total) => {
      if (typeof score === 'number' && typeof total === 'number') {
        return `${score}/${total}`;
      }
      return '—';
    };

    const percentageFormatter = (value) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return `${value.toFixed(1)}%`;
      }
      return '—';
    };

    return (
      <div style={{ width: '100%' }}>
        <div className="mb-4" style={{ 
          padding: '1rem 1.5rem', 
          background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
          borderRadius: '10px',
          border: '1px solid rgba(102, 126, 234, 0.2)'
        }}>
          <div className="d-flex flex-wrap align-items-center gap-3" style={{ flexWrap: 'wrap' }}>
            <h5 className="mb-0" style={{ color: '#212529', fontWeight: '600', marginRight: '1.5rem' }}>
              {profileData.personalDetails?.name || profileData.user?.name}
            </h5>
            {profileData.personalDetails?.email && (
              <div className="text-muted" style={{ fontSize: '0.95rem' }}>
                <FaUser className="me-2" />
                {profileData.personalDetails.email}
              </div>
            )}
            {profileData.personalDetails?.phone && (
              <div className="text-muted" style={{ fontSize: '0.95rem' }}>
                Phone: {profileData.personalDetails.phone}
              </div>
            )}
            <div className="text-muted" style={{ fontSize: '0.95rem' }}>
              {profileData.form?.position || '—'}
              {profileData.form?.department ? ` • ${profileData.form.department}` : ''}
            </div>
            {profileData.workflow?.label && (
              <Badge 
                bg="info" 
                className="text-uppercase"
                style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', fontWeight: '500' }}
              >
                {profileData.workflow.label}
              </Badge>
            )}
          </div>
        </div>

        <Row className="g-3 mb-4">
          <Col md={3}>
            <Card className="text-center h-100 border-0 shadow-sm" style={{ borderRadius: '10px' }}>
              <Card.Body style={{ padding: '1.25rem' }}>
                <h6 className="text-muted text-uppercase mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.5px', fontWeight: '600' }}>
                  Total Tests
                </h6>
                <h3 className="mb-0 text-primary" style={{ fontWeight: '700', fontSize: '2rem' }}>{totalTests}</h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center h-100 border-0 shadow-sm" style={{ borderRadius: '10px' }}>
              <Card.Body style={{ padding: '1.25rem' }}>
                <h6 className="text-muted text-uppercase mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.5px', fontWeight: '600' }}>
                  Tests Passed
                </h6>
                <h3 className="mb-0 text-success" style={{ fontWeight: '700', fontSize: '2rem' }}>{passedTests}</h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center h-100 border-0 shadow-sm" style={{ borderRadius: '10px' }}>
              <Card.Body style={{ padding: '1.25rem' }}>
                <h6 className="text-muted text-uppercase mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.5px', fontWeight: '600' }}>
                  Average Score
                </h6>
                <h3 className="mb-0 text-info" style={{ fontWeight: '700', fontSize: '2rem' }}>{averageScoreValue.toFixed(1)}%</h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center h-100 border-0 shadow-sm" style={{ borderRadius: '10px' }}>
              <Card.Body style={{ padding: '1.25rem' }}>
                <h6 className="text-muted text-uppercase mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.5px', fontWeight: '600' }}>
                  First Submission
                </h6>
                {firstSubmission ? (
                  <>
                    <div className="fw-semibold mb-1" style={{ color: '#212529', fontSize: '0.95rem' }}>
                      {firstSubmission.testTitle || 'Assessment'}
                    </div>
                    <small className="text-muted" style={{ fontSize: '0.8rem' }}>
                      {formatDateTime(firstSubmission.submittedAt)}
                    </small>
                  </>
                ) : (
                  <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>Not submitted yet</p>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Card className="mb-4 border-0 shadow-sm">
          <Card.Header style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderBottom: 'none' }}>
            <h6 className="mb-0" style={{ color: 'white', fontWeight: '600' }}>
              <FaClipboardCheck className="me-2" />
              Completed Tests
            </h6>
          </Card.Header>
          <Card.Body style={{ padding: '1.5rem', background: '#ffffff' }}>
            {completedTests.length > 0 ? (
              <Table striped bordered hover responsive style={{ marginBottom: 0 }}>
                <thead style={{ background: '#f8f9fa' }}>
                  <tr>
                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Test Title</th>
                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Score</th>
                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Percentage</th>
                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Status</th>
                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Submitted At</th>
                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Details</th>
                  </tr>
                </thead>
            <tbody>
              {completedTests.map((test, index) => {
                const testKey = test.testId || index;
                return (
                <React.Fragment key={testKey}>
                  <tr>
                    <td>{test.testTitle}</td>
                    <td>{scoreFormatter(test.score, test.totalScore)}</td>
                    <td>{percentageFormatter(test.percentage)}</td>
                    <td>{renderResultBadge(test.status)}</td>
                    <td>{formatDateTime(test.submittedAt)}</td>
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
                      <td colSpan={6} style={{ padding: 0, border: 'none' }}>
                        <div className="p-4" style={{ background: '#f8f9fa', borderRadius: '8px', margin: '0.5rem' }}>
                          <div className="d-flex flex-wrap gap-3 mb-3" style={{ 
                            background: '#ffffff', 
                            padding: '1rem', 
                            borderRadius: '8px',
                            border: '1px solid #e9ecef'
                          }}>
                            <div style={{ flex: '1 1 auto', minWidth: '150px' }}>
                              <strong style={{ color: '#495057', display: 'block', marginBottom: '0.25rem' }}>Score:</strong>
                              <span style={{ color: '#212529', fontWeight: '600' }}>{scoreFormatter(test.score, test.totalScore)}</span>
                            </div>
                            <div style={{ flex: '1 1 auto', minWidth: '150px' }}>
                              <strong style={{ color: '#495057', display: 'block', marginBottom: '0.25rem' }}>Percentage:</strong>
                              <span style={{ color: '#212529', fontWeight: '600' }}>{percentageFormatter(test.percentage)}</span>
                            </div>
                            <div style={{ flex: '1 1 auto', minWidth: '150px' }}>
                              <strong style={{ color: '#495057', display: 'block', marginBottom: '0.25rem' }}>Started:</strong>
                              <span style={{ color: '#212529' }}>{formatDateTime(test.startedAt)}</span>
                            </div>
                            <div style={{ flex: '1 1 auto', minWidth: '150px' }}>
                              <strong style={{ color: '#495057', display: 'block', marginBottom: '0.25rem' }}>Submitted:</strong>
                              <span style={{ color: '#212529' }}>{formatDateTime(test.submittedAt)}</span>
                            </div>
                            {test.duration && (
                              <div style={{ flex: '1 1 auto', minWidth: '150px' }}>
                                <strong style={{ color: '#495057', display: 'block', marginBottom: '0.25rem' }}>Test Duration:</strong>
                                <span style={{ color: '#212529' }}>{test.duration} minutes</span>
                              </div>
                            )}
                          </div>
                          {test.answers && test.answers.length > 0 ? (
                            <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                              <Table size="sm" bordered hover responsive style={{ marginBottom: 0 }}>
                                <thead style={{ background: '#f8f9fa' }}>
                                  <tr>
                                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>#</th>
                                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Question</th>
                                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Your Answer</th>
                                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Correct Answer</th>
                                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Result</th>
                                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Marks</th>
                                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Time Taken</th>
                                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Answered At</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {test.answers.map((answer, answerIndex) => (
                                    <tr key={`${testKey}-${answer.questionId || answerIndex}`}>
                                      <td>{answerIndex + 1}</td>
                                      <td style={{ maxWidth: '300px', wordWrap: 'break-word' }}>{answer.questionText}</td>
                                      <td style={{ maxWidth: '200px', wordWrap: 'break-word' }}>{formatOptionList(answer.selectedOptions)}</td>
                                      <td style={{ maxWidth: '200px', wordWrap: 'break-word' }}>{formatOptionList(answer.correctOptions, 'Not available')}</td>
                                      <td>
                                        {answer.isCorrect === true ? (
                                          <Badge bg="success" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>Correct</Badge>
                                        ) : answer.isCorrect === false ? (
                                          <Badge bg="danger" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>Incorrect</Badge>
                                        ) : (
                                          <Badge bg="secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>Pending</Badge>
                                        )}
                                      </td>
                                      <td>{typeof answer.marksAwarded === 'number' ? answer.marksAwarded : '--'}</td>
                                      <td>{formatDurationSeconds(answer.timeTaken)}</td>
                                      <td>{formatDateTime(answer.answeredAt)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </Table>
                            </div>
                          ) : (
                            <Alert variant="info" className="mb-0" style={{ borderRadius: '8px' }}>
                              No answer details available for this test.
                            </Alert>
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
              <Alert variant="info" className="mb-0">No completed tests yet.</Alert>
            )}
          </Card.Body>
        </Card>

        {assignments.length > 0 && (
          <Card className="border-0 shadow-sm">
            <Card.Header style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderBottom: 'none' }}>
              <h6 className="mb-0" style={{ color: 'white', fontWeight: '600' }}>
                <FaListUl className="me-2" />
                Assigned Tests
              </h6>
            </Card.Header>
            <Card.Body style={{ padding: '1.5rem', background: '#ffffff' }}>
              <Table striped bordered hover responsive style={{ marginBottom: 0 }}>
                <thead style={{ background: '#f8f9fa' }}>
                  <tr>
                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Title</th>
                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Status</th>
                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Invited</th>
                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Completed</th>
                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment, idx) => (
                    <tr key={assignment.testId || `assignment-${idx}`}>
                      <td>{assignment.title}</td>
                      <td>{renderResultBadge(assignment.status)}</td>
                      <td>{formatDateTime(assignment.invitedAt)}</td>
                      <td>{formatDateTime(assignment.completedAt)}</td>
                      <td>{percentageFormatter(assignment.percentage)}</td>
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

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await Promise.all([fetchTopics(), fetchCandidates()]);
      } catch (error) {
        console.error('Initial load error', error);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const fetchTopics = async () => {
    setTopicsLoading(true);
    try {
      const response = await api.get('/tests/topics', {
        params: {
          includeInactive: true,
          includeCounts: true
        }
      });
      setTopics(response.data.topics || []);
    } catch (error) {
      console.error('Topic fetch error:', error);
      setToast({ type: 'danger', message: 'Unable to load topics. Please try again.' });
    } finally {
      setTopicsLoading(false);
    }
  };

  const fetchBulkDepartments = async (campus) => {
    if (!campus) {
      setBulkDepartments([]);
      return;
    }
    setBulkDepartmentsLoading(true);
    try {
      const response = await api.get(`/courses/departments/${campus}`);
      // API returns array of department strings, convert to array format
      const deptArray = response.data.departments || [];
      setBulkDepartments(deptArray);
    } catch (error) {
      console.error('Error fetching departments:', error);
      setBulkDepartments([]);
    } finally {
      setBulkDepartmentsLoading(false);
    }
  };

  const fetchBulkTextDepartments = async (campus) => {
    if (!campus) {
      setBulkTextDepartments([]);
      return;
    }
    setBulkTextDepartmentsLoading(true);
    try {
      const response = await api.get(`/courses/departments/${campus}`);
      const deptArray = response.data.departments || [];
      setBulkTextDepartments(deptArray);
    } catch (error) {
      console.error('Error fetching departments:', error);
      setBulkTextDepartments([]);
    } finally {
      setBulkTextDepartmentsLoading(false);
    }
  };

  const handlePreviewQuestions = async () => {
    if (!bulkTextUploadState.file) {
      setToast({ type: 'danger', message: 'Please select a Word file first.' });
      return;
    }
    setPreviewLoading(true);
    setShowPreview(false);
    try {
      const formData = new FormData();
      formData.append('file', bulkTextUploadState.file);
      const response = await api.post('/tests/questions/preview-word', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPreviewQuestions(response.data.questions || []);
      setShowPreview(true);
      if (response.data.errors && response.data.errors.length > 0) {
        setToast({ type: 'warning', message: `Preview generated with ${response.data.errors.length} error(s). Check preview below.` });
      } else {
        setToast({ type: 'success', message: `Preview: ${response.data.questions?.length || 0} question(s) parsed successfully.` });
      }
    } catch (error) {
      console.error('Preview error:', error);
      const message = error.response?.data?.message || 'Failed to preview questions.';
      setToast({ type: 'danger', message });
      setPreviewQuestions([]);
      setShowPreview(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const fetchQuestions = useCallback(async () => {
    setQuestionLoading(true);
    try {
      const params = {
        limit: 200
      };

      if (questionFilters.topicId !== 'all') {
        params.topicId = questionFilters.topicId;
      }
      if (questionFilters.search.trim()) {
        params.search = questionFilters.search.trim();
      }

      const response = await api.get('/tests/questions', { params });
      setQuestions(response.data.questions || []);
    } catch (error) {
      console.error('Question bank fetch error:', error);
      setToast({ type: 'danger', message: 'Unable to load question bank. Please try again.' });
    } finally {
      setQuestionLoading(false);
    }
  }, [questionFilters]);

  useEffect(() => {
    if (activeTab === 'questionBank') {
      fetchQuestions();
      // Clear selections when filters change
      setSelectedQuestions([]);
    }
  }, [activeTab, fetchQuestions]);

  const fetchCandidates = async () => {
    setCandidatesLoading(true);
    try {
      const response = await api.get('/candidates');
      const candidatePoolStatuses = ['approved', 'shortlisted', 'selected', 'on_hold'];
      const pool = (response.data.candidates || []).filter(candidate => candidatePoolStatuses.includes(candidate.status));
      setCandidates(pool);
    } catch (error) {
      console.error('Candidates fetch error:', error);
      setToast({ type: 'danger', message: 'Unable to load candidate pool.' });
    } finally {
      setCandidatesLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setTemplateDownloading(true);
    try {
      const response = await api.get('/tests/questions/bulk-template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'mcq-bulk-template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Template download error:', error);
      setToast({ type: 'danger', message: 'Unable to download the template. Please try again.' });
    } finally {
      setTemplateDownloading(false);
    }
  };

  const resetTopicForm = () => {
    setTopicForm({ id: null, name: '', category: 'teaching', description: '', isActive: true });
  };

  const openTopicModal = (topic = null) => {
    if (topic) {
      setTopicForm({
        id: topic._id,
        name: topic.name,
        category: topic.category,
        description: topic.description || '',
        isActive: topic.isActive
      });
    } else {
      resetTopicForm();
    }
    setTopicModalVisible(true);
  };

  const closeTopicModal = () => {
    if (!topicSaving) {
      setTopicModalVisible(false);
      resetTopicForm();
    }
  };

  const handleTopicSave = async (event) => {
    event.preventDefault();
    setTopicSaving(true);

    try {
      const payload = {
        name: topicForm.name?.trim(),
        category: topicForm.category,
        description: topicForm.description?.trim() || undefined,
        isActive: topicForm.isActive
      };

      if (!payload.name) {
        setToast({ type: 'danger', message: 'Topic name is required.' });
        setTopicSaving(false);
        return;
      }

      if (topicForm.id) {
        await api.put(`/tests/topics/${topicForm.id}`, payload);
        setToast({ type: 'success', message: 'Topic updated successfully.' });
      } else {
        await api.post('/tests/topics', payload);
        setToast({ type: 'success', message: 'Topic created successfully.' });
      }

      await fetchTopics();
      closeTopicModal();
    } catch (error) {
      console.error('Topic save error:', error);
      const message = error.response?.data?.message || 'Unable to save topic. Please try again.';
      setToast({ type: 'danger', message });
    } finally {
      setTopicSaving(false);
    }
  };

  const handleToggleTopicActive = async (topic) => {
    try {
      await api.put(`/tests/topics/${topic._id}`, { isActive: !topic.isActive });
      await fetchTopics();
      setToast({ type: 'success', message: `${topic.name} is now ${!topic.isActive ? 'active' : 'inactive'}.` });
    } catch (error) {
      console.error('Topic toggle error:', error);
      setToast({ type: 'danger', message: 'Unable to update topic status.' });
    }
  };

  const updateQuestionFormOption = (index, value) => {
    setQuestionForm(prev => {
      const next = [...prev.options];
      next[index] = value;
      return { ...prev, options: next };
    });
  };

  const addQuestionOption = () => {
    setQuestionForm(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  const removeQuestionOption = (index) => {
    setQuestionForm(prev => {
      if (prev.options.length <= 2) {
        return prev;
      }
      const next = prev.options.filter((_, idx) => idx !== index);
      const nextCorrectAnswer = Math.min(prev.correctAnswer, next.length - 1);
      return { ...prev, options: next, correctAnswer: nextCorrectAnswer };
    });
  };

  const handleEditQuestion = (question) => {
    setEditingQuestionId(question._id);
    setQuestionForm({
      topicId: question.topic?._id || question.topic || '',
      subTopic: question.subTopic || '',
      questionText: question.questionText || '',
      options: question.options && question.options.length > 0 
        ? question.options 
        : ['', ''],
      correctAnswer: question.correctAnswer !== undefined && question.correctAnswer !== null 
        ? question.correctAnswer 
        : 0,
      difficulty: question.difficulty || 'medium'
    });
    setQuestionModalVisible(true);
  };

  const handleQuestionSave = async (event) => {
    event.preventDefault();

    if (!questionForm.topicId) {
      setToast({ type: 'danger', message: 'Please select a topic for this question.' });
      return;
    }

    const cleanedOptions = questionForm.options.map(option => option.trim()).filter(Boolean);
    if (cleanedOptions.length < 2) {
      setToast({ type: 'danger', message: 'Provide at least two answer options.' });
      return;
    }

    if (questionForm.correctAnswer >= cleanedOptions.length) {
      setToast({ type: 'danger', message: 'Select a valid correct answer.' });
      return;
    }

    setQuestionSaving(true);
    try {
      const payload = {
        topicId: questionForm.topicId,
        subTopic: questionForm.subTopic?.trim() || undefined,
        questionText: questionForm.questionText?.trim(),
        options: cleanedOptions,
        correctAnswer: questionForm.correctAnswer,
        difficulty: questionForm.difficulty
      };

      if (!payload.questionText) {
        setToast({ type: 'danger', message: 'Question text is required.' });
        return;
      }

      if (editingQuestionId) {
        // Update existing question
        await api.put(`/tests/questions/${editingQuestionId}`, payload);
        setToast({ type: 'success', message: 'Question updated successfully.' });
      } else {
        // Create new question
        await api.post('/tests/questions', payload);
        setToast({ type: 'success', message: 'Question added to the bank.' });
      }
      
      setQuestionForm(defaultQuestionForm);
      setEditingQuestionId(null);
      fetchQuestions();
      fetchTopics();
      setQuestionModalVisible(false);
    } catch (error) {
      console.error('Question save error:', error);
      const message = error.response?.data?.message || 'Unable to save question. Please try again.';
      setToast({ type: 'danger', message });
    } finally {
      setQuestionSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Are you sure you want to remove this question from the active bank?')) {
      return;
    }
    try {
      await api.delete(`/tests/questions/${questionId}`);
      fetchQuestions();
      fetchTopics();
      setToast({ type: 'success', message: 'Question removed from the bank.' });
      // Remove from selected if it was selected
      setSelectedQuestions(prev => prev.filter(id => id !== questionId));
    } catch (error) {
      console.error('Question delete error:', error);
      setToast({ type: 'danger', message: 'Unable to remove question.' });
    }
  };

  const handleBulkDeleteQuestions = async () => {
    if (selectedQuestions.length === 0) {
      setToast({ type: 'warning', message: 'Please select at least one question to delete.' });
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${selectedQuestions.length} question(s)? This action cannot be undone.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setBulkDeleting(true);
    try {
      await api.post('/tests/questions/bulk-delete', { questionIds: selectedQuestions });
      setToast({ type: 'success', message: `${selectedQuestions.length} question(s) deleted successfully.` });
      setSelectedQuestions([]);
      fetchQuestions();
      fetchTopics();
    } catch (error) {
      console.error('Bulk delete error:', error);
      const message = error.response?.data?.message || 'Unable to delete questions. Please try again.';
      setToast({ type: 'danger', message });
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleSelectQuestion = (questionId) => {
    setSelectedQuestions(prev => {
      if (prev.includes(questionId)) {
        return prev.filter(id => id !== questionId);
      } else {
        return [...prev, questionId];
      }
    });
  };

  const handleSelectAllQuestions = () => {
    if (selectedQuestions.length === questions.length) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(questions.map(q => q._id));
    }
  };

  const openBuilderModal = (candidate) => {
    setBuilderState({
      ...defaultBuilderState,
      candidateId: candidate?._id || '',
      title: candidate ? `${candidate.form?.title || candidate.form?.position || 'Assessment'} - ${candidate.user?.name}` : ''
    });
    setBuilderModalVisible(true);
  };

  const closeBuilderModal = () => {
    if (!builderSaving) {
      setBuilderModalVisible(false);
      setBuilderState(defaultBuilderState);
      setAssignmentDetails(null);
      setCopySuccess(false);
    }
  };

  const copyTestLink = () => {
    if (!assignmentDetails) return;
    
    const textToCopy = `Candidate Name: ${assignmentDetails.candidateName}\nTest Name: ${assignmentDetails.testName}\nTime Duration: ${assignmentDetails.duration} minutes\nTest Link: ${assignmentDetails.testLink}`;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    }).catch(err => {
      console.error('Failed to copy:', err);
      setToast({ type: 'danger', message: 'Failed to copy test link' });
    });
  };

  const updateBuilderSelection = (index, key, value) => {
    setBuilderState(prev => {
      const selections = prev.selections.map((selection, idx) => idx === index ? { ...selection, [key]: value } : selection);
      return { ...prev, selections };
    });
  };

  const addBuilderSelection = () => {
    setBuilderState(prev => ({
      ...prev,
      selections: [...prev.selections, { topicId: '', questionCount: 5 }]
    }));
  };

  const removeBuilderSelection = (index) => {
    setBuilderState(prev => ({
      ...prev,
      selections: prev.selections.filter((_, idx) => idx !== index)
    }));
  };

  const totalSelectedQuestions = useMemo(() => {
    return builderState.selections.reduce((total, selection) => total + (Number(selection.questionCount) || 0), 0);
  }, [builderState.selections]);

  const handleGenerateAssessment = async (event) => {
    event.preventDefault();

    if (!builderState.candidateId) {
      setToast({ type: 'danger', message: 'Select a candidate to assign this assessment.' });
      return;
    }

    if (!builderState.title.trim()) {
      setToast({ type: 'danger', message: 'Assessment title is required.' });
      return;
    }

    const topicSelections = builderState.selections
      .map(selection => ({
        topicId: selection.topicId,
        questionCount: Number(selection.questionCount || 0)
      }))
      .filter(selection => selection.topicId && selection.questionCount > 0);

    if (topicSelections.length === 0) {
      setToast({ type: 'danger', message: 'Select at least one topic with a question count greater than zero.' });
      return;
    }

    setBuilderSaving(true);
    try {
      const payload = {
        title: builderState.title.trim(),
        description: builderState.description?.trim() || '',
        instructions: builderState.instructions?.trim() || '',
        duration: Number(builderState.duration),
        passingPercentage: Number(builderState.passingPercentage),
        cutoffPercentage: Number(builderState.cutoffPercentage),
        topicSelections,
        candidateIds: [builderState.candidateId]
      };

      const response = await api.post('/tests/auto-generate', payload);
      // Store assignment details for copy functionality
      if (response.data.assignments && response.data.assignments.length > 0) {
        setAssignmentDetails(response.data.assignments[0]);
      }
      setToast({ type: 'success', message: 'Assessment generated and assigned successfully.' });
      // Keep modal open to show copy button
      fetchCandidates();
    } catch (error) {
      console.error('Auto-generate assessment error:', error);
      const message = error.response?.data?.message || 'Unable to generate assessment. Please review your selections.';
      setToast({ type: 'danger', message });
    } finally {
      setBuilderSaving(false);
    }
  };

  const topicsByCategory = useMemo(() => {
    return topics.reduce((acc, topic) => {
      if (!acc[topic.category]) {
        acc[topic.category] = [];
      }
      acc[topic.category].push(topic);
      return acc;
    }, { teaching: [], non_teaching: [] });
  }, [topics]);

  const activeTopicOptions = useMemo(() => topics.filter(topic => topic.isActive), [topics]);

  const categoryCounts = useMemo(() => {
    const counts = { teaching: 0, non_teaching: 0 };
    candidates.forEach(candidate => {
      const category = candidate.form?.formCategory || candidate.form?.category;
      if (category && counts[category] !== undefined) {
        counts[category] += 1;
      }
    });
    return counts;
  }, [candidates]);

  const availablePositions = useMemo(() => {
    const set = new Set();
    candidates.forEach(candidate => {
      const position = candidate.form?.position;
      if (position) {
        set.add(position);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [candidates]);

  const filteredAssessmentCandidates = useMemo(() => {
    const search = candidateFilters.search.trim().toLowerCase();
    return candidates.filter(candidate => {
      const category = candidate.form?.formCategory || candidate.form?.category || '';
      const position = candidate.form?.position || '';
      const department = candidate.form?.department || '';
      const name = candidate.user?.name || '';
      const candidateId = candidate.candidateNumber || '';
      const testsMeta = candidate.workflow?.tests || {};
      const testsCompletedCount = Number(testsMeta.completed) || 0;

      const matchesCategory = candidateFilters.category === 'all' || category === candidateFilters.category;
      const matchesPosition = candidateFilters.position === 'all' || position === candidateFilters.position;
      const matchesSearch =
        !search ||
        name.toLowerCase().includes(search) ||
        position.toLowerCase().includes(search) ||
        department.toLowerCase().includes(search) ||
        candidateId.toLowerCase().includes(search);

      const matchesTestStatus =
        testStatusFilter === 'all' ||
        (testStatusFilter === 'pending' && testsCompletedCount === 0) ||
        (testStatusFilter === 'conducted' && testsCompletedCount > 0);

      return matchesCategory && matchesPosition && matchesSearch && matchesTestStatus;
    });
  }, [candidates, candidateFilters, testStatusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAssessmentCandidates.length / PAGE_SIZE));

  const paginatedAssessmentCandidates = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredAssessmentCandidates.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredAssessmentCandidates, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [candidateFilters, testStatusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const getTopicById = (topicId) => topics.find(topic => topic._id === topicId);

  const openPromoteModal = (candidate) => {
    setPromotionForm({
      candidate,
      interviewDate: '',
      interviewTime: '',
      notes: ''
    });
    setPromoteModalVisible(true);
  };

  const closePromoteModal = () => {
    if (!promoteSubmitting) {
      setPromoteModalVisible(false);
      setPromotionForm({
        candidate: null,
        interviewDate: '',
        interviewTime: '',
        notes: ''
      });
    }
  };

  const handlePromoteCandidate = async (event) => {
    event.preventDefault();
    if (!promotionForm.candidate?._id) {
      setToast({ type: 'danger', message: 'Candidate information is missing.' });
      return;
    }

    if (!promotionForm.interviewDate) {
      setToast({ type: 'danger', message: 'Select an interview date to continue.' });
      return;
    }

    setPromoteSubmitting(true);
    try {
      await api.post(`/candidates/${promotionForm.candidate._id}/promote-to-interview`, {
        interviewDate: promotionForm.interviewDate,
        interviewTime: promotionForm.interviewTime || null,
        notes: promotionForm.notes || null
      });

      setToast({ type: 'success', message: 'Candidate promoted to interview successfully.' });
      closePromoteModal();
      fetchCandidates();
    } catch (error) {
      console.error('Candidate promotion error:', error);
      const message = error.response?.data?.message || 'Unable to promote candidate. Please try again.';
      setToast({ type: 'danger', message });
    } finally {
      setPromoteSubmitting(false);
    }
  };

  const openProfileModal = async (candidateId) => {
    setProfileModalVisible(true);
    setProfileLoading(true);
    setExpandedTestResults({});
    try {
      const response = await api.get(`/candidates/${candidateId}`);
      setProfileData(response.data.candidate || null);
    } catch (error) {
      console.error('Candidate profile fetch error:', error);
      setToast({ type: 'danger', message: 'Unable to load candidate profile.' });
      setProfileData(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const closeProfileModal = () => {
    if (!profileLoading) {
      setProfileModalVisible(false);
      setProfileData(null);
      setExpandedTestResults({});
    }
  };

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

  if (loading) {
    return <LoadingSpinner message="Loading assessment workspace..." />;
  }

  return (
    <Container fluid className="super-admin-fluid">

      {toast.message && (
        <Row className="mb-3">
          <Col>
            <Alert variant={toast.type} dismissible onClose={() => setToast({ type: '', message: '' })}>
              {toast.message}
            </Alert>
          </Col>
        </Row>
      )}

      <Tabs activeKey={activeTab} onSelect={(key) => setActiveTab(key || 'assessments')} className="mb-4">
        <Tab eventKey="assessments" title="Candidate Assessments">
          <Row className="g-3 align-items-end mb-3">
            <Col lg={3}>
              <div className="d-flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={candidateFilters.category === 'all' ? 'primary' : 'outline-primary'}
                  onClick={() => setCandidateFilters(prev => ({ ...prev, category: 'all' }))}
                  style={{ 
                    borderRadius: '8px',
                    fontWeight: '500',
                    transition: 'all 0.3s',
                    ...(candidateFilters.category === 'all' && {
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none'
                    })
                  }}
                  onMouseEnter={(e) => {
                    if (candidateFilters.category !== 'all') {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (candidateFilters.category !== 'all') {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  All ({candidates.length})
                </Button>
                <Button
                  size="sm"
                  variant={candidateFilters.category === 'teaching' ? 'primary' : 'outline-primary'}
                  onClick={() => setCandidateFilters(prev => ({ ...prev, category: 'teaching' }))}
                  style={{ 
                    borderRadius: '8px',
                    fontWeight: '500',
                    transition: 'all 0.3s',
                    ...(candidateFilters.category === 'teaching' && {
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none'
                    })
                  }}
                  onMouseEnter={(e) => {
                    if (candidateFilters.category !== 'teaching') {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (candidateFilters.category !== 'teaching') {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  Teaching ({categoryCounts.teaching})
                </Button>
                <Button
                  size="sm"
                  variant={candidateFilters.category === 'non_teaching' ? 'primary' : 'outline-primary'}
                  onClick={() => setCandidateFilters(prev => ({ ...prev, category: 'non_teaching' }))}
                  style={{ 
                    borderRadius: '8px',
                    fontWeight: '500',
                    transition: 'all 0.3s',
                    ...(candidateFilters.category === 'non_teaching' && {
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none'
                    })
                  }}
                  onMouseEnter={(e) => {
                    if (candidateFilters.category !== 'non_teaching') {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (candidateFilters.category !== 'non_teaching') {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  Non-Teaching ({categoryCounts.non_teaching})
                </Button>
              </div>
            </Col>
            <Col lg={2}>
              <Form.Select
                size="sm"
                value={testStatusFilter}
                onChange={(event) => setTestStatusFilter(event.target.value)}
              >
                <option value="all">All Test States</option>
                <option value="pending">Pending Tests</option>
                <option value="conducted">Test Conducted</option>
              </Form.Select>
            </Col>
            <Col lg={2}>
              <Form.Select
                size="sm"
                value={candidateFilters.position}
                onChange={(event) => setCandidateFilters(prev => ({ ...prev, position: event.target.value }))}
              >
                <option value="all">All Job Roles</option>
                {availablePositions.map(position => (
                  <option key={position} value={position}>{position}</option>
                ))}
              </Form.Select>
            </Col>
            <Col lg={4}>
              <InputGroup size="sm">
                <Form.Control
                  placeholder="Search by name, candidate ID, role, or department..."
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      setCandidateFilters(prev => ({ ...prev, search: searchInput }));
                    }
                  }}
                />
                <Button
                  variant="primary"
                  onClick={() => {
                    setCandidateFilters(prev => ({ ...prev, search: searchInput }));
                  }}
                  style={{ 
                    borderRadius: '0 8px 8px 0',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none'
                  }}
                >
                  <FaSearch />
                </Button>
                <Button
                  variant="outline-secondary"
                  onClick={() => {
                    setSearchInput('');
                    setCandidateFilters({ category: 'all', position: 'all', search: '' });
                    setTestStatusFilter('all');
                  }}
                  style={{ borderRadius: '8px', marginLeft: '0.5rem' }}
                >
                  Reset
                </Button>
              </InputGroup>
            </Col>
          </Row>
          <Row className="g-4">
            <Col lg={12}>
              <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                <Card.Header 
                  className="d-flex justify-content-between align-items-center"
                  style={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    borderBottom: 'none',
                    padding: '1.25rem'
                  }}
                >
                  <div>
                    <h5 className="mb-0" style={{ color: 'white', fontWeight: '600' }}>
                      <FaClipboardCheck className="me-2" />
                      Approved Candidate Pool
                    </h5>
                    <small style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem' }}>
                      Launch topic-driven assessments directly
                    </small>
                  </div>
                  <Badge 
                    bg="light" 
                    text="dark"
                    style={{ 
                      fontSize: '0.9rem', 
                      padding: '0.5rem 1rem',
                      fontWeight: '600',
                      borderRadius: '20px'
                    }}
                  >
                    {filteredAssessmentCandidates.length}
                  </Badge>
                </Card.Header>
                <Card.Body style={{ maxHeight: '420px', overflowY: 'auto', padding: '1.25rem', background: '#ffffff' }}>
                  {candidatesLoading ? (
                    <div className="text-center py-4">
                      <Spinner animation="border" />
                    </div>
                  ) : filteredAssessmentCandidates.length === 0 ? (
                    <Alert variant="light">No candidates match the current filters.</Alert>
                  ) : (
                    <Table responsive striped hover size="sm" style={{ marginBottom: 0 }}>
                      <thead style={{ background: '#f8f9fa' }}>
                        <tr>
                          <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Name</th>
                          <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Candidate ID</th>
                          <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Position</th>
                          <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Department</th>
                          <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Stage</th>
                          <th className="text-end" style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedAssessmentCandidates.map(candidate => (
                          <tr key={candidate._id}>
                            <td>{candidate.user?.name}</td>
                            <td>{candidate.candidateNumber || '—'}</td>
                            <td>{candidate.form?.position}</td>
                            <td>{candidate.form?.department}</td>
                            <td>
                              {(() => {
                                const status = (candidate.status || '').toLowerCase();
                                const workflowStage = candidate.workflow?.stage;
                                const finalDecision = candidate.workflow?.finalDecision?.decision || candidate.finalDecision?.decision || null;
                                const tests = candidate.workflow?.tests || {};
                                const testsCompleted = Number(tests.completed) || 0;
                                const testsAssigned = Number(tests.assigned) || 0;
                                const interviews = candidate.workflow?.interviews || {};
                                const interviewsScheduled = Number(interviews.scheduled) || 0;
                                const interviewsCompleted = Number(interviews.completed) || 0;

                                let label = 'Awaiting Action';
                                let variant = 'secondary';

                                if (finalDecision === 'selected' || status === 'selected') {
                                  label = 'Selected';
                                  variant = 'success';
                                } else if (finalDecision === 'rejected' || status === 'rejected') {
                                  label = 'Rejected';
                                  variant = 'danger';
                                } else if (finalDecision === 'on_hold' || status === 'on_hold') {
                                  label = 'On Hold';
                                  variant = 'warning';
                                } else if (workflowStage === 'awaiting_decision') {
                                  label = 'Awaiting Decision';
                                  variant = 'info';
                                } else if (
                                  workflowStage === 'interview_scheduled' ||
                                  workflowStage === 'awaiting_interview' ||
                                  interviewsScheduled > 0 ||
                                  interviewsCompleted > 0 ||
                                  status === 'shortlisted'
                                ) {
                                  label = 'Moved to Interview';
                                  variant = 'info';
                                } else if (testsCompleted > 0) {
                                  label = 'Test Completed';
                                  variant = 'primary';
                                } else if (testsAssigned > 0) {
                                  label = 'Test Assigned';
                                  variant = 'secondary';
                                } else if (status === 'approved') {
                                  label = 'Approved';
                                  variant = 'success';
                                } else if (status === 'pending') {
                                  label = 'Pending Review';
                                  variant = 'light';
                                }

                                return (
                                  <Badge bg={variant} className="text-uppercase" style={{ letterSpacing: '0.03em' }}>
                                    {label}
                                  </Badge>
                                );
                              })()}
                            </td>
                            <td className="text-end">
                              {(() => {
                                const status = (candidate.status || '').toLowerCase();
                                const finalDecision = candidate.workflow?.finalDecision?.decision || candidate.finalDecision?.decision || null;
                                const workflowStage = candidate.workflow?.stage;
                                const tests = candidate.workflow?.tests || {};
                                const testsCompleted = Number(tests.completed) || 0;
                                const testsAssigned = Number(tests.assigned) || 0;
                                const hasCompletedTests = testsCompleted > 0;
                                const isFinalised = ['selected', 'rejected'].includes(status) || ['selected', 'rejected'].includes((finalDecision || '').toLowerCase());
                                const movedToInterview =
                                  workflowStage === 'interview_scheduled' ||
                                  workflowStage === 'awaiting_interview' ||
                                  workflowStage === 'awaiting_decision' ||
                                  status === 'shortlisted';

                                const decisionLabel = () => {
                                  if (['selected', 'rejected'].includes((finalDecision || '').toLowerCase())) {
                                    return finalDecision === 'selected' ? 'Candidate Selected' : 'Candidate Rejected';
                                  }
                                  if (['selected', 'rejected'].includes(status)) {
                                    return status === 'selected' ? 'Candidate Selected' : 'Candidate Rejected';
                                  }
                                  if (movedToInterview) {
                                    return 'Moved to Interview';
                                  }
                                  if (hasCompletedTests) {
                                    return 'Test Completed';
                                  }
                                  if (testsAssigned > 0) {
                                    return 'Test Assigned';
                                  }
                                  return 'Awaiting Assignment';
                                };

                                const decisionVariant = () => {
                                  if ((finalDecision || '').toLowerCase() === 'selected' || status === 'selected') return 'success';
                                  if ((finalDecision || '').toLowerCase() === 'rejected' || status === 'rejected') return 'danger';
                                  if (movedToInterview) return 'info';
                                  if (hasCompletedTests || testsAssigned > 0) return 'secondary';
                                  return 'outline-secondary';
                                };

                                const primaryLabel = hasCompletedTests ? 'Conduct Test Again' : (testsAssigned > 0 ? 'Conduct Test Again' : 'Build Assessment');
                                const primaryVariant = hasCompletedTests || testsAssigned > 0 ? 'warning' : 'primary';
                                const showPrimaryAction = !movedToInterview;
                                const canPromoteDirectly = !isFinalised && !movedToInterview;

                                return (
                                  <div className="d-flex flex-column flex-sm-row gap-2 justify-content-end">
                                    <Button size="sm" variant={decisionVariant()} disabled className="text-nowrap">
                                      {decisionLabel()}
                                    </Button>
                                    {!isFinalised && (
                                      <>
                                        {showPrimaryAction && (
                                          <Button
                                            size="sm"
                                            variant={primaryVariant}
                                            onClick={() => openBuilderModal(candidate)}
                                            className="text-nowrap"
                                          >
                                            {primaryLabel}
                                          </Button>
                                        )}
                                        {canPromoteDirectly && (
                                          <Button
                                            size="sm"
                                            variant="success"
                                            onClick={() => openPromoteModal(candidate)}
                                            className="text-nowrap"
                                          >
                                            Promote to Interview
                                          </Button>
                                        )}
                                      </>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="outline-primary"
                                      onClick={() => openProfileModal(candidate._id)}
                                      className="text-nowrap"
                                    >
                                      <FaEye className="me-1" />
                                      View Test Results
                                    </Button>
                                  </div>
                                );
                              })()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
                {totalPages > 1 && (
                  <div className="d-flex justify-content-end align-items-center px-3 pb-3">
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
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="topics" title="Topic Library">
          <Row className="mb-3">
            <Col className="d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-1" style={{ fontWeight: '600', color: '#212529' }}>Reusable Question Topics</h5>
                <span className="text-muted" style={{ fontSize: '0.9rem' }}>Organise MCQ templates by department & stream</span>
              </div>
              <Button 
                onClick={() => openTopicModal()}
                style={{ 
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  fontWeight: '500',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 12px rgba(102, 126, 234, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <FaPlus className="me-2" />Add Topic
              </Button>
            </Col>
          </Row>
          <Row className="g-4">
            {CATEGORY_OPTIONS.map(category => {
              const items = topicsByCategory[category.value] || [];
              return (
                <Col key={category.value} md={6}>
                  <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                    <Card.Header 
                      className="d-flex justify-content-between align-items-center"
                      style={{ 
                        background: category.value === 'teaching' 
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        color: 'white',
                        borderBottom: 'none',
                        padding: '1.25rem'
                      }}
                    >
                      <div className="d-flex align-items-center gap-2">
                        <FaLayerGroup style={{ fontSize: '1.2rem' }} />
                        <span style={{ fontWeight: '600' }}>{category.label}</span>
                      </div>
                      <Badge 
                        bg="light" 
                        text="dark"
                        style={{ 
                          fontSize: '0.9rem', 
                          padding: '0.5rem 1rem',
                          fontWeight: '600',
                          borderRadius: '20px'
                        }}
                      >
                        {items.length}
                      </Badge>
                    </Card.Header>
                    <Card.Body style={{ maxHeight: '420px', overflowY: 'auto', padding: '1.25rem', background: '#ffffff' }}>
                      {topicsLoading ? (
                        <div className="text-center py-4">
                          <Spinner animation="border" size="sm" />
                        </div>
                      ) : items.length === 0 ? (
                        <Alert variant="light" className="mb-0">No topics created yet.</Alert>
                      ) : (
                        items.map(topic => (
                          <Card 
                            key={topic._id} 
                            className="mb-3 border-0 shadow-sm"
                            style={{ 
                              borderRadius: '10px',
                              transition: 'transform 0.2s, box-shadow 0.2s',
                              border: '1px solid #e9ecef'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                            }}
                          >
                            <Card.Body style={{ padding: '1rem' }}>
                              <div className="d-flex justify-content-between align-items-start">
                                <div style={{ flex: 1 }}>
                                  <h6 className="mb-1" style={{ fontWeight: '600', color: '#212529' }}>{topic.name}</h6>
                                  {topic.description && (
                                    <p className="text-muted mb-2" style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>{topic.description}</p>
                                  )}
                                  <div className="d-flex gap-2 flex-wrap">
                                    <Badge 
                                      bg="info" 
                                      className="me-2"
                                      style={{ 
                                        fontSize: '0.8rem', 
                                        padding: '0.4rem 0.8rem',
                                        borderRadius: '6px',
                                        fontWeight: '500'
                                      }}
                                    >
                                      <FaListUl className="me-1" />{topic.questionCount || 0} questions
                                    </Badge>
                                    <Badge 
                                      bg={topic.isActive ? 'success' : 'secondary'}
                                      style={{ 
                                        fontSize: '0.8rem', 
                                        padding: '0.4rem 0.8rem',
                                        borderRadius: '6px',
                                        fontWeight: '500'
                                      }}
                                    >
                                      {topic.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="d-flex flex-column gap-2 ms-3">
                                  <Button 
                                    variant="outline-secondary" 
                                    size="sm" 
                                    onClick={() => openTopicModal(topic)}
                                    style={{ borderRadius: '6px', fontWeight: '500' }}
                                  >
                                    <FaEdit className="me-1" />Edit
                                  </Button>
                                  <Button
                                    variant={topic.isActive ? 'outline-danger' : 'outline-success'}
                                    size="sm"
                                    onClick={() => handleToggleTopicActive(topic)}
                                    style={{ borderRadius: '6px', fontWeight: '500' }}
                                  >
                                    {topic.isActive ? 'Deactivate' : 'Activate'}
                                  </Button>
                                </div>
                              </div>
                            </Card.Body>
                          </Card>
                        ))
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </Tab>

        <Tab eventKey="questionBank" title="Question Bank">
          <Row className="mb-3 g-3 align-items-center">
            <Col md={4} sm={6}>
              <Form.Select
                value={questionFilters.topicId}
                onChange={(event) => setQuestionFilters(prev => ({ ...prev, topicId: event.target.value }))}
              >
                <option value="all">All Topics</option>
                {topics.map(topic => (
                  <option key={topic._id} value={topic._id}>
                    {topic.name} {topic.questionCount ? `(${topic.questionCount})` : ''}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={4} sm={6}>
              <InputGroup>
                <Form.Control
                  placeholder="Search question text..."
                  value={questionFilters.search}
                  onChange={(event) => setQuestionFilters(prev => ({ ...prev, search: event.target.value }))}
                />
                <Button variant="outline-secondary" onClick={fetchQuestions}>
                  <FaSearch />
                </Button>
              </InputGroup>
            </Col>
            <Col md={4} sm={12} className="d-flex justify-content-md-end align-items-center gap-2">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => {
                  setBulkUploadState({ 
                    file: null,
                    campus: '',
                    department: '',
                    topicOption: 'none',
                    topicId: '',
                    newTopicName: '',
                    category: 'teaching'
                  });
                  setBulkModalVisible(true);
                }}
              >
                <FaUpload className="me-2" />Bulk Upload (Excel)
              </Button>
              <Button
                variant="outline-success"
                size="sm"
                className="ms-2"
                onClick={() => {
                  setBulkTextUploadState({
                    file: null,
                    campus: '',
                    department: '',
                    topicOption: 'none',
                    topicId: '',
                    newTopicName: '',
                    category: 'teaching'
                  });
                  setBulkTextModalVisible(true);
                }}
              >
                <FaUpload className="me-2" />Bulk Upload (Word)
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setQuestionForm(defaultQuestionForm);
                  setQuestionModalVisible(true);
                }}
              >
                <FaPlus className="me-2" />Add MCQ
              </Button>
            </Col>
          </Row>

          <Row>
            <Col>
              <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                <Card.Header 
                  className="d-flex justify-content-between align-items-center"
                  style={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    borderBottom: 'none',
                    padding: '1.25rem'
                  }}
                >
                  <div>
                    <h5 className="mb-0" style={{ color: 'white', fontWeight: '600' }}>
                      <FaListUl className="me-2" />
                      Question Library
                    </h5>
                    <small style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem' }}>
                      Curated MCQs grouped by topics
                      {selectedQuestions.length > 0 && (
                        <span className="ms-2">({selectedQuestions.length} selected)</span>
                      )}
                    </small>
                  </div>
                  <div className="d-flex gap-2">
                    {selectedQuestions.length > 0 && (
                      <Button 
                        variant="danger" 
                        size="sm" 
                        onClick={handleBulkDeleteQuestions}
                        disabled={bulkDeleting}
                        style={{ 
                          borderRadius: '6px',
                          fontWeight: '500',
                          transition: 'all 0.3s'
                        }}
                      >
                        {bulkDeleting ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <FaTrash className="me-2" />
                            Delete Selected ({selectedQuestions.length})
                          </>
                        )}
                      </Button>
                    )}
                    <Button 
                      variant="light" 
                      size="sm" 
                      onClick={fetchQuestions}
                      style={{ 
                        borderRadius: '6px',
                        fontWeight: '500',
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <FaSync className="me-2" />Refresh
                    </Button>
                  </div>
                </Card.Header>
                <Card.Body style={{ maxHeight: '500px', overflowY: 'auto', padding: '1.25rem', background: '#ffffff' }}>
                  {questionLoading ? (
                    <div className="text-center py-4">
                      <Spinner animation="border" />
                    </div>
                  ) : questions.length === 0 ? (
                    <Alert variant="light">No questions match the selected filters.</Alert>
                  ) : (
                    <Table responsive bordered hover size="sm" className="align-middle">
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}>
                            <Form.Check
                              type="checkbox"
                              checked={questions.length > 0 && selectedQuestions.length === questions.length}
                              onChange={handleSelectAllQuestions}
                              title="Select All"
                            />
                          </th>
                          <th>Question</th>
                          <th>Topic</th>
                          <th>Correct Answer</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {questions.map(question => {
                          const correctAnswerIndex = question.correctAnswer !== undefined && question.correctAnswer !== null 
                            ? question.correctAnswer 
                            : null;
                          const correctAnswerLetter = correctAnswerIndex !== null 
                            ? String.fromCharCode(65 + correctAnswerIndex) 
                            : '—';
                          const correctAnswerText = correctAnswerIndex !== null && question.options?.[correctAnswerIndex]
                            ? question.options[correctAnswerIndex]
                            : '';
                          const isSelected = selectedQuestions.includes(question._id);
                          
                          return (
                            <tr key={question._id} className={isSelected ? 'table-active' : ''}>
                              <td>
                                <Form.Check
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleSelectQuestion(question._id)}
                                  title="Select Question"
                                />
                              </td>
                              <td style={{ maxWidth: '320px' }}>
                                <div style={{ whiteSpace: 'pre-wrap' }}>{question.questionText}</div>
                                <small className="text-muted">
                                  {question.options?.map((option, index) => (
                                    <div key={index}>
                                      <strong>{String.fromCharCode(65 + index)}.</strong> {option}
                                    </div>
                                  ))}
                                </small>
                              </td>
                              <td>{question.topicName || getTopicById(question.topic)?.name || '—'}</td>
                              <td>
                                {correctAnswerIndex !== null ? (
                                  <div>
                                    <Badge bg="success" className="me-1">
                                      {correctAnswerLetter}
                                    </Badge>
                                    <small className="text-muted">
                                      {correctAnswerText.length > 30 
                                        ? `${correctAnswerText.substring(0, 30)}...` 
                                        : correctAnswerText}
                                    </small>
                                  </div>
                                ) : (
                                  <Badge bg="secondary">Not Set</Badge>
                                )}
                              </td>
                              <td className="text-end">
                                <Button 
                                  variant="outline-primary" 
                                  size="sm" 
                                  className="me-2"
                                  onClick={() => handleEditQuestion(question)}
                                  title="Edit Question"
                                >
                                  <FaEdit />
                                </Button>
                                <Button 
                                  variant="outline-danger" 
                                  size="sm" 
                                  onClick={() => handleDeleteQuestion(question._id)}
                                  title="Delete Question"
                                >
                                  <FaTrash />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
      </Tabs>

      {/* Create / Edit Topic Modal */}
      <Modal show={topicModalVisible} onHide={closeTopicModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{topicForm.id ? 'Update Topic' : 'Create Topic'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleTopicSave}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Topic Name<span className="text-danger">*</span></Form.Label>
              <Form.Control
                value={topicForm.name}
                onChange={(event) => setTopicForm(prev => ({ ...prev, name: event.target.value }))}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Category<span className="text-danger">*</span></Form.Label>
              <Form.Select
                value={topicForm.category}
                onChange={(event) => setTopicForm(prev => ({ ...prev, category: event.target.value }))}
                required
              >
                {CATEGORY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={topicForm.description}
                onChange={(event) => setTopicForm(prev => ({ ...prev, description: event.target.value }))}
              />
            </Form.Group>
            {topicForm.id && (
              <Form.Check
                type="switch"
                id="topic-active"
                label="Active"
                checked={topicForm.isActive}
                onChange={(event) => setTopicForm(prev => ({ ...prev, isActive: event.target.checked }))}
              />
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeTopicModal} disabled={topicSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={topicSaving}>
              {topicSaving ? <Spinner animation="border" size="sm" className="me-2" /> : <FaCheckCircle className="me-2" />}Save Topic
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Promote Candidate Modal */}
      <Modal show={promoteModalVisible} onHide={closePromoteModal} centered>
        <Form onSubmit={handlePromoteCandidate}>
          <Modal.Header closeButton>
            <Modal.Title>Promote Candidate to Interview</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {promotionForm.candidate && (
              <div className="mb-3">
                <h5 className="mb-1">{promotionForm.candidate.user?.name}</h5>
                <div className="text-muted">
                  {promotionForm.candidate.user?.email || 'No email available'}
                </div>
                {promotionForm.candidate.form?.position && (
                  <div className="text-muted">
                    {promotionForm.candidate.form.position}
                    {promotionForm.candidate.form.department ? ` • ${promotionForm.candidate.form.department}` : ''}
                  </div>
                )}
              </div>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Interview Date<span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={promotionForm.interviewDate}
                onChange={(event) => setPromotionForm(prev => ({ ...prev, interviewDate: event.target.value }))}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Interview Time (IST)</Form.Label>
              <Form.Select
                value={promotionForm.interviewTime}
                onChange={(event) => setPromotionForm(prev => ({ ...prev, interviewTime: event.target.value }))}
              >
                {interviewTimeOptions.map(option => (
                  <option key={option.value || 'blank'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">Optional. Times are shown in IST (UTC+5:30) with 12-hour format.</Form.Text>
            </Form.Group>

            <Form.Group>
              <Form.Label>Notes to Candidate</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Optional message that will be included in the email..."
                value={promotionForm.notes}
                onChange={(event) => setPromotionForm(prev => ({ ...prev, notes: event.target.value }))}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closePromoteModal} disabled={promoteSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={promoteSubmitting}>
              {promoteSubmitting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Promoting...
                </>
              ) : (
                <>
                  <FaCheckCircle className="me-2" />
                  Promote Candidate
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Candidate Profile Modal */}
      <Modal 
        show={profileModalVisible} 
        onHide={closeProfileModal} 
        size="xl" 
        centered
        scrollable
        style={{ maxWidth: '98vw', width: '98vw' }}
        dialogClassName="candidate-test-overview-modal"
      >
        <Modal.Header 
          closeButton 
          style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
            color: 'white', 
            borderBottom: 'none' 
          }}
        >
          <Modal.Title style={{ color: 'white', fontWeight: '600' }}>
            <FaEye className="me-2" />
            Candidate Test Overview
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '1.5rem', background: '#f8f9fa', maxHeight: '85vh', overflowY: 'auto' }}>
          {profileLoading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">Loading candidate test data...</p>
            </div>
          ) : (
            renderCandidateProfileContent()
          )}
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '1px solid #dee2e6', background: '#ffffff' }}>
          <Button 
            variant="secondary" 
            onClick={closeProfileModal} 
            disabled={profileLoading}
            style={{ borderRadius: '8px', fontWeight: '500' }}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Assessment Builder Modal */}
      <Modal 
        show={builderModalVisible} 
        onHide={closeBuilderModal} 
        size="lg" 
        centered
        scrollable
        style={{ maxWidth: '90vw' }}
        dialogClassName="assessment-builder-modal"
      >
        <Modal.Header 
          closeButton
          style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
            color: 'white', 
            borderBottom: 'none' 
          }}
        >
          <Modal.Title style={{ color: 'white', fontWeight: '600' }}>
            <FaClipboardCheck className="me-2" />
            Build Topic-Based Assessment
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleGenerateAssessment}>
          <Modal.Body style={{ padding: '1.5rem', background: '#f8f9fa', maxHeight: '75vh', overflowY: 'auto' }}>
            <Row className="mb-3 g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label style={{ fontWeight: '600', color: '#495057', marginBottom: '0.5rem' }}>
                    Assign to Candidate<span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Select
                    value={builderState.candidateId}
                    onChange={(event) => setBuilderState(prev => ({ ...prev, candidateId: event.target.value }))}
                    required
                    style={{ 
                      borderRadius: '8px',
                      border: '1px solid #dee2e6',
                      padding: '0.75rem'
                    }}
                  >
                    <option value="">Select candidate</option>
                    {candidates.map(candidate => (
                      <option key={candidate._id} value={candidate._id}>
                        {candidate.user?.name} — {candidate.form?.position}{candidate.candidateNumber ? ` (${candidate.candidateNumber})` : ''}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label style={{ fontWeight: '600', color: '#495057', marginBottom: '0.5rem' }}>
                    Assessment Title<span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    value={builderState.title}
                    onChange={(event) => setBuilderState(prev => ({ ...prev, title: event.target.value }))}
                    placeholder="e.g., CSE Technical Screening"
                    required
                    style={{ 
                      borderRadius: '8px',
                      border: '1px solid #dee2e6',
                      padding: '0.75rem'
                    }}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-3 g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label style={{ fontWeight: '600', color: '#495057', marginBottom: '0.5rem' }}>
                    Duration (minutes)<span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="number"
                    min={10}
                    value={builderState.duration}
                    onChange={(event) => setBuilderState(prev => ({ ...prev, duration: Number(event.target.value) }))}
                    required
                    style={{ 
                      borderRadius: '8px',
                      border: '1px solid #dee2e6',
                      padding: '0.75rem'
                    }}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label style={{ fontWeight: '600', color: '#495057', marginBottom: '0.5rem' }}>
                    Passing %
                  </Form.Label>
                  <Form.Control
                    type="number"
                    min={0}
                    max={100}
                    value={builderState.passingPercentage}
                    onChange={(event) => setBuilderState(prev => ({ ...prev, passingPercentage: Number(event.target.value) }))}
                    style={{ 
                      borderRadius: '8px',
                      border: '1px solid #dee2e6',
                      padding: '0.75rem'
                    }}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label style={{ fontWeight: '600', color: '#495057', marginBottom: '0.5rem' }}>
                    Cutoff %
                  </Form.Label>
                  <Form.Control
                    type="number"
                    min={0}
                    max={100}
                    value={builderState.cutoffPercentage}
                    onChange={(event) => setBuilderState(prev => ({ ...prev, cutoffPercentage: Number(event.target.value) }))}
                    style={{ 
                      borderRadius: '8px',
                      border: '1px solid #dee2e6',
                      padding: '0.75rem'
                    }}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label style={{ fontWeight: '600', color: '#495057', marginBottom: '0.5rem' }}>
                Description
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={builderState.description}
                onChange={(event) => setBuilderState(prev => ({ ...prev, description: event.target.value }))}
                placeholder="Purpose and overview of the assessment"
                style={{ 
                  borderRadius: '8px',
                  border: '1px solid #dee2e6',
                  padding: '0.75rem'
                }}
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label style={{ fontWeight: '600', color: '#495057', marginBottom: '0.5rem' }}>
                Candidate Instructions
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={builderState.instructions}
                onChange={(event) => setBuilderState(prev => ({ ...prev, instructions: event.target.value }))}
                placeholder="Any instructions to show before the assessment begins"
                style={{ 
                  borderRadius: '8px',
                  border: '1px solid #dee2e6',
                  padding: '0.75rem'
                }}
              />
            </Form.Group>

            <Card className="mb-3 border-0 shadow-sm" style={{ borderRadius: '12px', overflow: 'hidden' }}>
              <Card.Header 
                className="d-flex justify-content-between align-items-center"
                style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  borderBottom: 'none',
                  padding: '1rem 1.25rem'
                }}
              >
                <div className="d-flex align-items-center gap-3">
                  <div>
                    <h6 className="mb-0" style={{ color: 'white', fontWeight: '600' }}>
                      <FaLayerGroup className="me-2" />
                      Topic Mix
                    </h6>
                  </div>
                  <div style={{ 
                    background: 'rgba(255,255,255,0.2)', 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: '500'
                  }}>
                    Total Questions: <strong>{totalSelectedQuestions}</strong>
                  </div>
                </div>
                <Button 
                  variant="light" 
                  size="sm" 
                  onClick={addBuilderSelection}
                  style={{ 
                    borderRadius: '6px',
                    fontWeight: '500',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <FaPlus className="me-1" />Add Topic
                </Button>
              </Card.Header>
              <Card.Body className="p-3" style={{ background: '#ffffff', padding: '1.25rem' }}>
                {builderState.selections.map((selection, index) => {
                  const topic = getTopicById(selection.topicId);
                  const available = topic?.questionCount || 0;
                  return (
                    <Row className="align-items-end mb-3 g-3" key={index} style={{ 
                      padding: '1rem', 
                      background: '#f8f9fa', 
                      borderRadius: '8px',
                      border: '1px solid #e9ecef',
                      marginBottom: '1rem'
                    }}>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label style={{ fontWeight: '600', color: '#495057', marginBottom: '0.5rem' }}>
                            Topic<span className="text-danger">*</span>
                          </Form.Label>
                          <Form.Select
                            value={selection.topicId}
                            onChange={(event) => updateBuilderSelection(index, 'topicId', event.target.value)}
                            required
                            style={{ 
                              borderRadius: '8px',
                              border: '1px solid #dee2e6',
                              padding: '0.75rem'
                            }}
                          >
                            <option value="">Select topic</option>
                            {activeTopicOptions.map(item => (
                              <option key={item._id} value={item._id}>
                                {item.name} ({item.category === 'teaching' ? 'Teaching' : 'Non-Teaching'})
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label style={{ fontWeight: '600', color: '#495057', marginBottom: '0.5rem' }}>
                            Question Count<span className="text-danger">*</span>
                          </Form.Label>
                          <div className="d-flex align-items-center gap-2">
                            <Form.Control
                              type="number"
                              min={1}
                              value={selection.questionCount}
                              onChange={(event) => updateBuilderSelection(index, 'questionCount', Number(event.target.value))}
                              required
                              style={{ 
                                borderRadius: '8px',
                                border: '1px solid #dee2e6',
                                padding: '0.75rem',
                                flex: 1
                              }}
                            />
                            {selection.topicId && (
                              <span 
                                className={available < selection.questionCount ? 'text-danger' : 'text-muted'}
                                style={{ 
                                  fontSize: '0.85rem', 
                                  fontWeight: '500',
                                  whiteSpace: 'nowrap',
                                  minWidth: 'fit-content'
                                }}
                              >
                                {available} available
                              </span>
                            )}
                          </div>
                        </Form.Group>
                      </Col>
                      <Col md={2} className="text-end">
                        {builderState.selections.length > 1 && (
                          <Button 
                            variant="outline-danger" 
                            onClick={() => removeBuilderSelection(index)}
                            style={{ borderRadius: '8px', fontWeight: '500' }}
                          >
                            <FaTrash />
                          </Button>
                        )}
                      </Col>
                    </Row>
                  );
                })}
              </Card.Body>
            </Card>
            {assignmentDetails && (
              <Alert variant="success" className="mt-3">
                <Alert.Heading>Assessment Generated Successfully!</Alert.Heading>
                <p className="mb-2">
                  <strong>Candidate:</strong> {assignmentDetails.candidateName}<br />
                  <strong>Test:</strong> {assignmentDetails.testName}<br />
                  <strong>Duration:</strong> {assignmentDetails.duration} minutes
                </p>
                <Button 
                  variant="primary" 
                  onClick={copyTestLink}
                  className="mt-2"
                >
                  <FaCopy className="me-2" />
                  {copySuccess ? 'Copied!' : 'Copy Test Link'}
                </Button>
              </Alert>
            )}
          </Modal.Body>
          <Modal.Footer 
            className="d-flex justify-content-between align-items-center"
            style={{ borderTop: '1px solid #dee2e6', background: '#ffffff', padding: '1.25rem' }}
          >
            <div className="text-muted d-flex align-items-center gap-2" style={{ fontWeight: '500' }}>
              <FaClipboardCheck style={{ color: '#667eea' }} />
              <span>{totalSelectedQuestions} question(s) will be included.</span>
            </div>
            <div className="d-flex gap-2">
              <Button 
                variant="secondary" 
                onClick={closeBuilderModal} 
                disabled={builderSaving}
                style={{ borderRadius: '8px', fontWeight: '500' }}
              >
                {assignmentDetails ? 'Close' : 'Cancel'}
              </Button>
              {!assignmentDetails && (
                <Button 
                  type="submit" 
                  disabled={builderSaving}
                  style={{ 
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    fontWeight: '500',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    if (!builderSaving) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 12px rgba(102, 126, 234, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!builderSaving) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  {builderSaving ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FaCheckCircle className="me-2" />
                      Generate Assessment
                    </>
                  )}
                </Button>
              )}
            </div>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Add Single Question Modal */}
      <Modal
        show={questionModalVisible}
        onHide={() => {
          if (!questionSaving) {
            setQuestionModalVisible(false);
            setQuestionForm(defaultQuestionForm);
            setEditingQuestionId(null);
          }
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>{editingQuestionId ? 'Edit MCQ' : 'Add MCQ'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleQuestionSave}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Topic<span className="text-danger">*</span></Form.Label>
              <Form.Select
                value={questionForm.topicId}
                onChange={(event) => setQuestionForm(prev => ({ ...prev, topicId: event.target.value }))}
                required
              >
                <option value="">Select a topic</option>
                {activeTopicOptions.map(topic => (
                  <option key={topic._id} value={topic._id}>
                    {topic.name} ({topic.category === 'teaching' ? 'Teaching' : 'Non-Teaching'})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Sub Topic</Form.Label>
              <Form.Control
                value={questionForm.subTopic}
                onChange={(event) => setQuestionForm(prev => ({ ...prev, subTopic: event.target.value }))}
                placeholder="Optional sub-topic name"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Question Text<span className="text-danger">*</span></Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={questionForm.questionText}
                onChange={(event) => setQuestionForm(prev => ({ ...prev, questionText: event.target.value }))}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Answer Options<span className="text-danger">*</span></Form.Label>
              {questionForm.options.map((option, index) => (
                <InputGroup className="mb-2" key={index}>
                  <InputGroup.Text>{String.fromCharCode(65 + index)}</InputGroup.Text>
                  <Form.Control
                    value={option}
                    onChange={(event) => updateQuestionFormOption(index, event.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    required
                  />
                  {questionForm.options.length > 2 && (
                    <Button variant="outline-danger" onClick={() => removeQuestionOption(index)}>
                      <FaTrash />
                    </Button>
                  )}
                </InputGroup>
              ))}
              <Button variant="link" size="sm" onClick={addQuestionOption}>
                <FaPlus className="me-1" />Add option
              </Button>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Correct Answer<span className="text-danger">*</span></Form.Label>
              <Form.Select
                value={questionForm.correctAnswer}
                onChange={(event) => setQuestionForm(prev => ({ ...prev, correctAnswer: Number(event.target.value) }))}
              >
                {questionForm.options.map((option, index) => (
                  <option key={index} value={index}>
                    Option {String.fromCharCode(65 + index)} {option ? `- ${option}` : ''}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Difficulty</Form.Label>
              <Form.Select
                value={questionForm.difficulty}
                onChange={(event) => setQuestionForm(prev => ({ ...prev, difficulty: event.target.value }))}
              >
                {DIFFICULTY_OPTIONS.map(option => (
                  <option key={option} value={option}>{option.replace('_', ' ')}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => {
                setQuestionModalVisible(false);
                setQuestionForm(defaultQuestionForm);
                setEditingQuestionId(null);
              }}
              disabled={questionSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={questionSaving}>
              {questionSaving ? <Spinner animation="border" size="sm" className="me-2" /> : <FaCheckCircle className="me-2" />}
              {questionSaving ? 'Saving...' : editingQuestionId ? 'Update Question' : 'Add Question'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Bulk Upload Modal */}
      <Modal
        show={bulkModalVisible}
        onHide={() => {
          if (!bulkUploading) {
            setBulkModalVisible(false);
            setBulkUploadState({ 
              file: null,
              campus: '',
              department: '',
              topicOption: 'existing',
              topicId: '',
              newTopicName: '',
              category: 'teaching'
            });
            setBulkDepartments([]);
          }
        }}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Bulk Upload MCQs</Modal.Title>
        </Modal.Header>
        <Form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!bulkUploadState.file) {
              setToast({ type: 'danger', message: 'Please select an Excel file to upload.' });
              return;
            }
            if (!bulkUploadState.campus) {
              setToast({ type: 'danger', message: 'Please select a campus.' });
              return;
            }
            if (!bulkUploadState.department) {
              setToast({ type: 'danger', message: 'Please select a department.' });
              return;
            }
            // Topic is optional - validate only if user selected to use a topic
            if (bulkUploadState.topicOption === 'existing' && !bulkUploadState.topicId) {
              setToast({ type: 'danger', message: 'Please select a topic or choose a different option.' });
              return;
            }
            if (bulkUploadState.topicOption === 'new' && !bulkUploadState.newTopicName.trim()) {
              setToast({ type: 'danger', message: 'Please enter a topic name.' });
              return;
            }
            setBulkUploading(true);
            try {
              const formData = new FormData();
              formData.append('file', bulkUploadState.file);
              formData.append('campus', bulkUploadState.campus);
              formData.append('department', bulkUploadState.department);
              formData.append('category', bulkUploadState.category);
              // Topic is optional
              if (bulkUploadState.topicOption === 'existing' && bulkUploadState.topicId) {
                formData.append('topicId', bulkUploadState.topicId);
              } else if (bulkUploadState.topicOption === 'new' && bulkUploadState.newTopicName.trim()) {
                formData.append('newTopicName', bulkUploadState.newTopicName.trim());
              }
              const response = await api.post('/tests/questions/bulk-upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
              });
              const { message } = response.data || {};
              setToast({ type: 'success', message: message || 'Questions uploaded successfully.' });
              setBulkUploadState({ 
                file: null,
                campus: '',
                department: '',
                topicOption: 'none',
                topicId: '',
                newTopicName: '',
                category: 'teaching'
              });
              setBulkDepartments([]);
              setBulkModalVisible(false);
              fetchQuestions();
              fetchTopics();
            } catch (error) {
              console.error('Bulk upload error:', error);
              const message = error.response?.data?.message || 'Unable to upload questions. Please check the file format.';
              setToast({ type: 'danger', message });
            } finally {
              setBulkUploading(false);
            }
          }}
        >
          <Modal.Body>
            <Alert variant="light">
              Upload an Excel sheet with columns like <strong>Question</strong>, <strong>OptionA</strong>, <strong>OptionB</strong>,
              <strong>OptionC</strong>, <strong>OptionD</strong>, and <strong>CorrectAnswer</strong>.
            </Alert>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span className="text-muted small">Need a sample file? Download the latest template.</span>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleDownloadTemplate}
                disabled={templateDownloading}
              >
                {templateDownloading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Preparing...
                  </>
                ) : (
                  <>
                    <FaDownload className="me-2" />
                    Download Template
                  </>
                )}
              </Button>
            </div>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Campus<span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    value={bulkUploadState.campus}
                    onChange={(e) => {
                      const campus = e.target.value;
                      setBulkUploadState(prev => ({ ...prev, campus, department: '' }));
                      fetchBulkDepartments(campus);
                    }}
                    required
                  >
                    <option value="">Select Campus</option>
                    <option value="Btech">Btech</option>
                    <option value="Degree">Degree</option>
                    <option value="Pharmacy">Pharmacy</option>
                    <option value="Diploma">Diploma</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Department<span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    value={bulkUploadState.department}
                    onChange={(e) => setBulkUploadState(prev => ({ ...prev, department: e.target.value }))}
                    required
                    disabled={!bulkUploadState.campus || bulkDepartmentsLoading}
                  >
                    <option value="">
                      {bulkDepartmentsLoading ? 'Loading...' : bulkUploadState.campus ? 'Select Department' : 'Select Campus first'}
                    </option>
                    {bulkDepartments.map((dept, index) => (
                      <option key={index} value={typeof dept === 'string' ? dept : dept.department}>
                        {typeof dept === 'string' ? dept : dept.department}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Category<span className="text-danger">*</span></Form.Label>
              <Form.Select
                value={bulkUploadState.category}
                onChange={(e) => setBulkUploadState(prev => ({ ...prev, category: e.target.value, topicId: '' }))}
                required
              >
                <option value="teaching">Teaching</option>
                <option value="non_teaching">Non-Teaching</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Topic (Optional)</Form.Label>
              <Form.Check
                type="radio"
                name="topicOption"
                id="topicNone"
                label="Upload without topic"
                checked={bulkUploadState.topicOption === 'none'}
                onChange={() => setBulkUploadState(prev => ({ ...prev, topicOption: 'none', topicId: '', newTopicName: '' }))}
                className="mb-2"
              />
              <Form.Check
                type="radio"
                name="topicOption"
                id="topicExisting"
                label="Select Existing Topic"
                checked={bulkUploadState.topicOption === 'existing'}
                onChange={() => setBulkUploadState(prev => ({ ...prev, topicOption: 'existing', newTopicName: '' }))}
                className="mb-2"
              />
              <Form.Check
                type="radio"
                name="topicOption"
                id="topicNew"
                label="Create New Topic"
                checked={bulkUploadState.topicOption === 'new'}
                onChange={() => setBulkUploadState(prev => ({ ...prev, topicOption: 'new', topicId: '' }))}
                className="mb-2"
              />
            </Form.Group>

            {bulkUploadState.topicOption === 'existing' && (
              <Form.Group className="mb-3">
                <Form.Label>Select Topic</Form.Label>
                <Form.Select
                  value={bulkUploadState.topicId}
                  onChange={(e) => setBulkUploadState(prev => ({ ...prev, topicId: e.target.value }))}
                >
                  <option value="">Select a topic</option>
                  {topics
                    .filter(topic => topic.category === bulkUploadState.category && topic.isActive)
                    .map(topic => (
                      <option key={topic._id} value={topic._id}>{topic.name}</option>
                    ))}
                </Form.Select>
              </Form.Group>
            )}
            {bulkUploadState.topicOption === 'new' && (
              <Form.Group className="mb-3">
                <Form.Label>New Topic Name</Form.Label>
                <Form.Control
                  type="text"
                  value={bulkUploadState.newTopicName}
                  onChange={(e) => setBulkUploadState(prev => ({ ...prev, newTopicName: e.target.value }))}
                  placeholder="Enter topic name"
                />
              </Form.Group>
            )}

            <Form.Group>
              <Form.Label>Excel File<span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="file"
                accept=".xlsx,.xls"
                onChange={(event) => setBulkUploadState(prev => ({ ...prev, file: event.target.files?.[0] || null }))}
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => {
                setBulkModalVisible(false);
                setBulkUploadState({ 
                  file: null,
                  campus: '',
                  department: '',
                  topicOption: 'existing',
                  topicId: '',
                  newTopicName: '',
                  category: 'teaching'
                });
                setBulkDepartments([]);
              }}
              disabled={bulkUploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={bulkUploading}>
              {bulkUploading ? <Spinner animation="border" size="sm" className="me-2" /> : <FaUpload className="me-2" />}
              {bulkUploading ? 'Uploading...' : 'Upload Questions'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Bulk Text Upload Modal */}
      <Modal
        show={bulkTextModalVisible}
        onHide={() => {
          setBulkTextModalVisible(false);
          setBulkTextUploadState({
            file: null,
            campus: '',
            department: '',
            topicOption: 'none',
            topicId: '',
            newTopicName: '',
            category: 'teaching'
          });
          setBulkTextDepartments([]);
          setShowPreview(false);
          setPreviewQuestions([]);
        }}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Bulk Upload MCQs (Word Document)</Modal.Title>
        </Modal.Header>
        <Form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!bulkTextUploadState.file) {
              setToast({ type: 'danger', message: 'Please select a Word file.' });
              return;
            }
            if (!bulkTextUploadState.campus) {
              setToast({ type: 'danger', message: 'Please select a campus.' });
              return;
            }
            if (!bulkTextUploadState.department) {
              setToast({ type: 'danger', message: 'Please select a department.' });
              return;
            }
            // Topic is optional - validate only if user selected to use a topic
            if (bulkTextUploadState.topicOption === 'existing' && !bulkTextUploadState.topicId) {
              setToast({ type: 'danger', message: 'Please select a topic or choose a different option.' });
              return;
            }
            if (bulkTextUploadState.topicOption === 'new' && !bulkTextUploadState.newTopicName.trim()) {
              setToast({ type: 'danger', message: 'Please enter a topic name.' });
              return;
            }
            setBulkTextUploading(true);
            try {
              const formData = new FormData();
              formData.append('file', bulkTextUploadState.file);
              formData.append('campus', bulkTextUploadState.campus);
              formData.append('department', bulkTextUploadState.department);
              formData.append('category', bulkTextUploadState.category);
              // Topic is optional
              if (bulkTextUploadState.topicOption === 'existing' && bulkTextUploadState.topicId) {
                formData.append('topicId', bulkTextUploadState.topicId);
              } else if (bulkTextUploadState.topicOption === 'new' && bulkTextUploadState.newTopicName.trim()) {
                formData.append('newTopicName', bulkTextUploadState.newTopicName.trim());
              }
              const response = await api.post('/tests/questions/bulk-upload-word', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
              });
              const { message } = response.data || {};
              setToast({ type: 'success', message: message || 'Questions uploaded successfully.' });
              setBulkTextUploadState({
                file: null,
                campus: '',
                department: '',
                topicOption: 'none',
                topicId: '',
                newTopicName: '',
                category: 'teaching'
              });
              setBulkTextDepartments([]);
              setShowPreview(false);
              setPreviewQuestions([]);
              setBulkTextModalVisible(false);
              fetchQuestions();
              fetchTopics();
            } catch (error) {
              console.error('Bulk Word upload error:', error);
              const message = error.response?.data?.message || 'Unable to upload questions. Please check the Word file format.';
              setToast({ type: 'danger', message });
            } finally {
              setBulkTextUploading(false);
            }
          }}
        >
          <Modal.Body>
            <Alert variant="light">
              <strong>Format:</strong> Your Word document should contain questions in the following format:
              <pre style={{ marginTop: '10px', fontSize: '12px', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>
{`51: The mating of individuals related by common ancestry is known as:

A Cross breeding
B Out breeding
C In breeding
D Close breeding

Ans: 3`}
              </pre>
              <small className="text-muted">
                Question number is optional. Answer should be the option number (1-4) or letter (A-D). Only .docx files are supported.
              </small>
            </Alert>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Campus<span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    value={bulkTextUploadState.campus}
                    onChange={(e) => {
                      const campus = e.target.value;
                      setBulkTextUploadState(prev => ({ ...prev, campus, department: '' }));
                      fetchBulkTextDepartments(campus);
                    }}
                    required
                  >
                    <option value="">Select Campus</option>
                    <option value="Btech">Btech</option>
                    <option value="Degree">Degree</option>
                    <option value="Pharmacy">Pharmacy</option>
                    <option value="Diploma">Diploma</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Department<span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    value={bulkTextUploadState.department}
                    onChange={(e) => setBulkTextUploadState(prev => ({ ...prev, department: e.target.value }))}
                    required
                    disabled={!bulkTextUploadState.campus || bulkTextDepartmentsLoading}
                  >
                    <option value="">
                      {bulkTextDepartmentsLoading ? 'Loading...' : bulkTextUploadState.campus ? 'Select Department' : 'Select Campus first'}
                    </option>
                    {bulkTextDepartments.map((dept, index) => (
                      <option key={index} value={typeof dept === 'string' ? dept : dept.department}>
                        {typeof dept === 'string' ? dept : dept.department}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Category<span className="text-danger">*</span></Form.Label>
              <Form.Select
                value={bulkTextUploadState.category}
                onChange={(e) => setBulkTextUploadState(prev => ({ ...prev, category: e.target.value, topicId: '' }))}
                required
              >
                <option value="teaching">Teaching</option>
                <option value="non_teaching">Non-Teaching</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Topic (Optional)</Form.Label>
              <Form.Check
                type="radio"
                name="topicOptionText"
                id="topicNoneText"
                label="Upload without topic"
                checked={bulkTextUploadState.topicOption === 'none'}
                onChange={() => setBulkTextUploadState(prev => ({ ...prev, topicOption: 'none', topicId: '', newTopicName: '' }))}
                className="mb-2"
              />
              <Form.Check
                type="radio"
                name="topicOptionText"
                id="topicExistingText"
                label="Select Existing Topic"
                checked={bulkTextUploadState.topicOption === 'existing'}
                onChange={() => setBulkTextUploadState(prev => ({ ...prev, topicOption: 'existing', newTopicName: '' }))}
                className="mb-2"
              />
              <Form.Check
                type="radio"
                name="topicOptionText"
                id="topicNewText"
                label="Create New Topic"
                checked={bulkTextUploadState.topicOption === 'new'}
                onChange={() => setBulkTextUploadState(prev => ({ ...prev, topicOption: 'new', topicId: '' }))}
                className="mb-2"
              />
            </Form.Group>

            {bulkTextUploadState.topicOption === 'existing' && (
              <Form.Group className="mb-3">
                <Form.Label>Select Topic</Form.Label>
                <Form.Select
                  value={bulkTextUploadState.topicId}
                  onChange={(e) => setBulkTextUploadState(prev => ({ ...prev, topicId: e.target.value }))}
                >
                  <option value="">Select a topic</option>
                  {topics
                    .filter(topic => topic.category === bulkTextUploadState.category && topic.isActive)
                    .map(topic => (
                      <option key={topic._id} value={topic._id}>{topic.name}</option>
                    ))}
                </Form.Select>
              </Form.Group>
            )}
            {bulkTextUploadState.topicOption === 'new' && (
              <Form.Group className="mb-3">
                <Form.Label>New Topic Name</Form.Label>
                <Form.Control
                  type="text"
                  value={bulkTextUploadState.newTopicName}
                  onChange={(e) => setBulkTextUploadState(prev => ({ ...prev, newTopicName: e.target.value }))}
                  placeholder="Enter topic name"
                />
              </Form.Group>
            )}

            <Form.Group>
              <Form.Label>Word Document (.docx)<span className="text-danger">*</span></Form.Label>
              <div className="d-flex gap-2 mb-2">
                <Form.Control
                  type="file"
                  accept=".docx,.doc"
                  onChange={(e) => {
                    setBulkTextUploadState(prev => ({ ...prev, file: e.target.files?.[0] || null }));
                    setShowPreview(false);
                    setPreviewQuestions([]);
                  }}
                  required
                />
                <Button
                  variant="outline-info"
                  onClick={handlePreviewQuestions}
                  disabled={!bulkTextUploadState.file || previewLoading}
                >
                  {previewLoading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Parsing...
                    </>
                  ) : (
                    <>
                      <FaEye className="me-2" />
                      Preview
                    </>
                  )}
                </Button>
              </div>
              <Form.Text className="text-muted">
                Upload a Word document (.docx) containing questions in the format shown above. Click "Preview" to see parsed questions before uploading.
              </Form.Text>
            </Form.Group>

            {showPreview && previewQuestions.length > 0 && (
              <div className="mt-3">
                <Alert variant="info">
                  <strong>Preview: {previewQuestions.length} question(s) parsed</strong>
                </Alert>
                <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '4px', padding: '15px', backgroundColor: '#f8f9fa' }}>
                  {previewQuestions.map((q, idx) => (
                    <div key={idx} className="mb-4 p-3" style={{ backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <strong style={{ color: '#495057' }}>Question {idx + 1}</strong>
                        <Badge bg={q.correctAnswer !== null ? 'success' : 'danger'}>
                          {q.correctAnswer !== null ? 'Valid' : 'Invalid'}
                        </Badge>
                      </div>
                      <p style={{ marginBottom: '10px', fontWeight: '500' }}>{q.questionText}</p>
                      <div className="ms-3">
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className={optIdx === q.correctAnswer ? 'text-success fw-bold' : ''}>
                            {String.fromCharCode(65 + optIdx)}. {opt}
                            {optIdx === q.correctAnswer && ' ✓ (Correct)'}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showPreview && previewQuestions.length === 0 && (
              <Alert variant="warning" className="mt-3">
                No questions were parsed from the document. Please check the format.
              </Alert>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => {
                setBulkTextModalVisible(false);
                setBulkTextUploadState({
                  textContent: '',
                  campus: '',
                  department: '',
                  topicOption: 'none',
                  topicId: '',
                  newTopicName: '',
                  category: 'teaching'
                });
                setBulkTextDepartments([]);
              }}
              disabled={bulkTextUploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={bulkTextUploading}>
              {bulkTextUploading ? <Spinner animation="border" size="sm" className="me-2" /> : <FaUpload className="me-2" />}
              {bulkTextUploading ? 'Uploading...' : 'Upload Questions'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default TestsManagement;
