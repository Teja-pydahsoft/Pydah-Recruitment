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
  FaUser,
  FaKeyboard
} from 'react-icons/fa';
import api from '../../services/api';
import SkeletonLoader from '../SkeletonLoader';
import ToastNotificationContainer from '../ToastNotificationContainer';

const CATEGORY_OPTIONS = [
  { value: 'teaching', label: 'Teaching' },
  { value: 'non_teaching', label: 'Non-Teaching' }
];

const DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard'];

const PAGE_SIZE = 20;

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

  const [questionFilters, setQuestionFilters] = useState({ 
    campus: 'all', 
    department: 'all', 
    set: 'all',
    topicId: 'all', 
    search: '' 
  });
  const [filterOptions, setFilterOptions] = useState({
    campuses: [],
    departments: [],
    sets: [],
    topics: []
  });
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
  const [uploadResultsModalVisible, setUploadResultsModalVisible] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);
  const [bulkUploadState, setBulkUploadState] = useState({ 
    file: null,
    campus: '',
    department: '',
    topicOption: 'none', // 'none', 'existing', or 'new'
    topicId: '',
    newTopicName: '',
    category: 'teaching',
    set: ''
  });
  const [bulkTextUploadState, setBulkTextUploadState] = useState({
    file: null,
    campus: '',
    department: '',
    topicOption: 'none',
    topicId: '',
    newTopicName: '',
    category: 'teaching',
    set: ''
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
  const [builderFilterOptions, setBuilderFilterOptions] = useState({
    campuses: [],
    departments: [],
    sets: [],
    topics: []
  });
  const [builderFilterOptionsLoading, setBuilderFilterOptionsLoading] = useState(false);
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
  const [typingTestResultsForCandidate, setTypingTestResultsForCandidate] = useState([]);
  const [selectedTypingResult, setSelectedTypingResult] = useState(null);
  const [showTypingResultModal, setShowTypingResultModal] = useState(false);

  const [toast, setToast] = useState({ type: '', message: '' });
  const [candidateFilters, setCandidateFilters] = useState({ category: 'all', position: 'all', search: '' });
  const [searchInput, setSearchInput] = useState(''); // Separate state for input value
  const [assignmentDetails, setAssignmentDetails] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Typing test creation state
  const [typingTestModalVisible, setTypingTestModalVisible] = useState(false);
  const [typingTestSaving, setTypingTestSaving] = useState(false);
  const [typingTestAssignmentDetails, setTypingTestAssignmentDetails] = useState(null);
  const [typingTestCopySuccess, setTypingTestCopySuccess] = useState(false);
  const [typingTestForm, setTypingTestForm] = useState({
    candidateId: '',
    title: '',
    description: '',
    typingParagraph: '',
    durationOptions: [1, 2],
    defaultDuration: 1,
    instructions: 'Type the given paragraph as accurately and quickly as possible. Your typing speed (WPM) and accuracy will be measured.',
    form: null,
    startDate: new Date().toISOString().split('T')[0],
    startTime: new Date().toTimeString().slice(0, 5),
    endDate: '',
    endTime: ''
  });

  // Typing test results state (for the old tab - kept for backward compatibility but tab is hidden)
  const [typingTestResults, setTypingTestResults] = useState([]);
  const [typingTestResultsLoading, setTypingTestResultsLoading] = useState(false);
  const [typingTestResultsError, setTypingTestResultsError] = useState(null);
  const [typingTests, setTypingTests] = useState([]);
  // Note: selectedTypingResult and showTypingResultModal are declared above for profile modal use
  const [showTypingDetailModal, setShowTypingDetailModal] = useState(false);
  const [typingSearchTerm, setTypingSearchTerm] = useState('');
  const [typingFilterTestId, setTypingFilterTestId] = useState('all');
  const [typingSortBy, setTypingSortBy] = useState('submittedAt');
  const [typingSortOrder, setTypingSortOrder] = useState('desc');

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
    const completedTests = Array.isArray(profileData.testResults?.tests)
      ? profileData.testResults.tests
      : [];
    
    // Include typing test results in counts
    const typingTestsCount = typingTestResultsForCandidate.length;
    const typingTestsPassed = typingTestResultsForCandidate.filter(t => t.accuracy >= 70).length; // Consider 70%+ accuracy as passed
    const typingTestsAvgScore = typingTestsCount > 0
      ? typingTestResultsForCandidate.reduce((sum, t) => sum + (t.accuracy || 0), 0) / typingTestsCount
      : 0;
    
    // Combine MCQ and typing test counts
    const totalTests = Number(summary.totalTests || 0) + typingTestsCount;
    const passedTests = Number(summary.passedTests || 0) + typingTestsPassed;
    
    // Calculate combined average score
    const mcqTestsCount = completedTests.length;
    const mcqAvgScore = typeof summary.averageScore === 'number' 
      ? summary.averageScore 
      : Number(summary.averageScore || 0);
    
    let averageScoreValue = 0;
    if (totalTests > 0) {
      const mcqTotal = mcqAvgScore * mcqTestsCount;
      const typingTotal = typingTestsAvgScore * typingTestsCount;
      averageScoreValue = (mcqTotal + typingTotal) / totalTests;
    }

    const sortedSubmissions = [...completedTests].sort((a, b) => {
      const aTime = a?.submittedAt ? new Date(a.submittedAt).getTime() : Number.POSITIVE_INFINITY;
      const bTime = b?.submittedAt ? new Date(b.submittedAt).getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    });
    
    // Include typing test submissions in first submission check
    const typingSubmissions = typingTestResultsForCandidate
      .filter(t => t.submittedAt)
      .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
    
    const firstMcqSubmission = sortedSubmissions.find(test => test?.submittedAt);
    const firstTypingSubmission = typingSubmissions[0];
    
    let firstSubmission = null;
    if (firstMcqSubmission && firstTypingSubmission) {
      firstSubmission = new Date(firstMcqSubmission.submittedAt) < new Date(firstTypingSubmission.submittedAt)
        ? firstMcqSubmission
        : { testTitle: firstTypingSubmission.typingTest?.title || 'Typing Test', submittedAt: firstTypingSubmission.submittedAt };
    } else if (firstMcqSubmission) {
      firstSubmission = firstMcqSubmission;
    } else if (firstTypingSubmission) {
      firstSubmission = { testTitle: firstTypingSubmission.typingTest?.title || 'Typing Test', submittedAt: firstTypingSubmission.submittedAt };
    }

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

        {/* Typing Test Results Section */}
        {typingTestResultsForCandidate.length > 0 && (
          <Card className="mb-4 border-0 shadow-sm">
            <Card.Header style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderBottom: 'none' }}>
              <h6 className="mb-0" style={{ color: 'white', fontWeight: '600' }}>
                <FaKeyboard className="me-2" />
                Typing Test Results
              </h6>
            </Card.Header>
            <Card.Body style={{ padding: '1.5rem', background: '#ffffff' }}>
              <Table striped bordered hover responsive style={{ marginBottom: 0 }}>
                <thead style={{ background: '#f8f9fa' }}>
                  <tr>
                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Test Title</th>
                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>WPM</th>
                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Accuracy</th>
                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Errors</th>
                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Time Taken</th>
                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Duration</th>
                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Submitted At</th>
                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {typingTestResultsForCandidate.map((result, index) => (
                    <tr key={result._id || index}>
                      <td>{result.typingTest?.title || 'N/A'}</td>
                      <td>
                        <Badge bg={getTypingWPMBadge(result.wpm)}>
                          {result.wpm || 0} WPM
                        </Badge>
                      </td>
                      <td>
                        <Badge bg={getTypingAccuracyBadge(result.accuracy)}>
                          {result.accuracy || 0}%
                        </Badge>
                      </td>
                      <td>{result.totalErrors || 0}</td>
                      <td>{result.timeTaken || 0}s</td>
                      <td>{result.duration || 0} min</td>
                      <td>{formatTypingDate(result.submittedAt)}</td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => {
                            setSelectedTypingResult(result);
                            setShowTypingResultModal(true);
                          }}
                        >
                          <FaEye className="me-1" />
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        )}

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

  const fetchFilterOptions = useCallback(async (campus = 'all', department = 'all') => {
    try {
      const params = {};
      if (campus !== 'all') params.campus = campus;
      if (department !== 'all') params.department = department;
      
      const response = await api.get('/tests/questions/filters', { params });
      setFilterOptions({
        campuses: response.data.campuses || [],
        departments: response.data.departments || [],
        sets: response.data.sets || [],
        topics: response.data.topics || []
      });
    } catch (error) {
      console.error('Filter options fetch error:', error);
    }
  }, []);

  const fetchQuestions = useCallback(async () => {
    setQuestionLoading(true);
    try {
      const params = {
        limit: 200
      };

      if (questionFilters.campus !== 'all') {
        params.campus = questionFilters.campus;
      }
      if (questionFilters.department !== 'all') {
        params.department = questionFilters.department;
      }
      if (questionFilters.set !== 'all') {
        params.set = questionFilters.set;
      }
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
      fetchFilterOptions();
      fetchQuestions();
      // Clear selections when filters change
      setSelectedQuestions([]);
    } 
    // Typing test results moved to approved candidate pool view
    // else if (activeTab === 'typingTestResults') {
    //   fetchTypingTestResults();
    //   fetchTypingTestsForFilter();
    // }
  }, [activeTab, fetchFilterOptions, fetchQuestions]);

  useEffect(() => {
    if (activeTab === 'questionBank') {
      fetchFilterOptions(questionFilters.campus, questionFilters.department);
    }
  }, [activeTab, questionFilters.campus, questionFilters.department, fetchFilterOptions]);

  const fetchCandidates = async () => {
    setCandidatesLoading(true);
    try {
      const response = await api.get('/candidates');
      const candidatePoolStatuses = ['approved', 'shortlisted', 'selected', 'on_hold'];
      const pool = (response.data.candidates || []).filter(candidate => candidatePoolStatuses.includes(candidate.status));
      // Ensure form is populated with campus and department
      const candidatesWithForm = pool.map(candidate => {
        if (candidate.form && typeof candidate.form === 'object') {
          return candidate;
        }
        return candidate;
      });
      setCandidates(candidatesWithForm);
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

  // Removed unused handleDeleteQuestion function - using bulk delete instead

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

  const openTypingTestModal = (candidate) => {
    const now = new Date();
    setTypingTestForm({
      candidateId: candidate?._id || '',
      title: candidate ? `${candidate.form?.title || candidate.form?.position || 'Typing Test'} - ${candidate.user?.name}` : '',
      description: '',
      typingParagraph: '',
      durationOptions: [1, 2],
      defaultDuration: 1,
      instructions: 'Type the given paragraph as accurately and quickly as possible. Your typing speed (WPM) and accuracy will be measured.',
      form: candidate?.form?._id || null,
      startDate: now.toISOString().split('T')[0],
      startTime: now.toTimeString().slice(0, 5),
      endDate: '',
      endTime: ''
    });
    setTypingTestModalVisible(true);
  };

  const closeTypingTestModal = () => {
    setTypingTestModalVisible(false);
    setTypingTestForm({
      candidateId: '',
      title: '',
      description: '',
      typingParagraph: '',
      durationOptions: [1, 2],
      defaultDuration: 1,
      instructions: 'Type the given paragraph as accurately and quickly as possible. Your typing speed (WPM) and accuracy will be measured.',
      form: null,
      startDate: new Date().toISOString().split('T')[0],
      startTime: new Date().toTimeString().slice(0, 5),
      endDate: '',
      endTime: ''
    });
    setTypingTestAssignmentDetails(null);
    setTypingTestCopySuccess(false);
  };

  const handleCreateTypingTest = async (e) => {
    e.preventDefault();
    
    if (!typingTestForm.typingParagraph || !typingTestForm.typingParagraph.trim()) {
      setToast({ type: 'danger', message: 'Typing paragraph is required' });
      return;
    }

    if (!typingTestForm.candidateId) {
      setToast({ type: 'danger', message: 'Please select a candidate' });
      return;
    }

    setTypingTestSaving(true);
    try {
      // Prepare start and end dates
      let startDate = null;
      let endDate = null;
      
      if (typingTestForm.startDate) {
        if (typingTestForm.startTime) {
          startDate = new Date(`${typingTestForm.startDate}T${typingTestForm.startTime}`);
        } else {
          startDate = new Date(typingTestForm.startDate);
        }
      }
      
      if (typingTestForm.endDate) {
        if (typingTestForm.endTime) {
          endDate = new Date(`${typingTestForm.endDate}T${typingTestForm.endTime}`);
        } else {
          endDate = new Date(typingTestForm.endDate);
          endDate.setHours(23, 59, 59, 999); // Set to end of day if no time specified
        }
      }

      // Create typing test
      const typingTestResponse = await api.post('/typing-test', {
        title: typingTestForm.title,
        description: typingTestForm.description,
        typingParagraph: typingTestForm.typingParagraph.trim(),
        durationOptions: typingTestForm.durationOptions,
        defaultDuration: typingTestForm.defaultDuration,
        instructions: typingTestForm.instructions,
        form: typingTestForm.form,
        startDate: startDate,
        endDate: endDate
      });

      const typingTestId = typingTestResponse.data.typingTest._id;
      let typingTest = typingTestResponse.data.typingTest;

      // Assign typing test to candidate
      await api.post(`/typing-test/${typingTestId}/assign`, {
        candidateIds: [typingTestForm.candidateId]
      });

      // Fetch the typing test again to ensure we have the testLink (it's generated in pre-save hook)
      try {
        const updatedTestResponse = await api.get(`/typing-test/${typingTestId}`);
        typingTest = updatedTestResponse.data.typingTest;
      } catch (err) {
        console.warn('Could not fetch updated typing test, using original:', err);
      }

      // Store assignment details for copy functionality
      if (typingTest && typingTest.testLink) {
        setTypingTestAssignmentDetails({
          candidateId: typingTestForm.candidateId,
          title: typingTestForm.title,
          testLink: typingTest.testLink,
          defaultDuration: typingTestForm.defaultDuration,
          durationOptions: typingTestForm.durationOptions
        });
      } else {
        // Fallback: construct testLink if not available
        const fallbackTestLink = `typing_${typingTestId}_${Date.now()}`;
        setTypingTestAssignmentDetails({
          candidateId: typingTestForm.candidateId,
          title: typingTestForm.title,
          testLink: fallbackTestLink,
          defaultDuration: typingTestForm.defaultDuration,
          durationOptions: typingTestForm.durationOptions
        });
      }

      setToast({ type: 'success', message: 'Typing test created and assigned successfully!' });
      
      // Refresh candidates list
      fetchCandidates();
    } catch (error) {
      console.error('Typing test creation error:', error);
      const message = error.response?.data?.message || 'Failed to create typing test';
      setToast({ type: 'danger', message });
    } finally {
      setTypingTestSaving(false);
    }
  };

  const fetchBuilderFilterOptions = useCallback(async (campus, department) => {
    if (!campus && !department) {
      setBuilderFilterOptions({ campuses: [], departments: [], sets: [], topics: [] });
      return;
    }
    setBuilderFilterOptionsLoading(true);
    try {
      const params = {};
      if (campus) params.campus = campus;
      if (department) params.department = department;
      
      const response = await api.get('/tests/questions/filters', { params });
      setBuilderFilterOptions({
        campuses: response.data.campuses || [],
        departments: response.data.departments || [],
        sets: response.data.sets || [],
        topics: response.data.topics || []
      });
    } catch (error) {
      console.error('Builder filter options fetch error:', error);
    } finally {
      setBuilderFilterOptionsLoading(false);
    }
  }, []);

  const closeBuilderModal = () => {
    if (!builderSaving) {
      setBuilderModalVisible(false);
      setBuilderState(defaultBuilderState);
      setBuilderFilterOptions({ campuses: [], departments: [], sets: [], topics: [] });
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

  const copyTypingTestLink = () => {
    if (!typingTestAssignmentDetails) return;
    
    const frontendUrl = window.location.origin;
    // Include candidate ID as query parameter (required for typing test)
    const testLink = `${frontendUrl}/typing-test/${typingTestAssignmentDetails.testLink}?candidate=${typingTestAssignmentDetails.candidateId}`;
    const candidate = candidates.find(c => c._id === typingTestAssignmentDetails.candidateId);
    const candidateName = candidate?.user?.name || 'Candidate';
    const durationText = typingTestAssignmentDetails.defaultDuration === 1 ? '1 minute' : '2 minutes';
    
    const textToCopy = `Candidate Name: ${candidateName}\nTyping Test: ${typingTestAssignmentDetails.title}\nDuration: ${durationText}\nTest Link: ${testLink}`;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      setTypingTestCopySuccess(true);
      setTimeout(() => setTypingTestCopySuccess(false), 3000);
    }).catch(err => {
      console.error('Failed to copy:', err);
      setToast({ type: 'danger', message: 'Failed to copy typing test link' });
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

  // Get selected candidate's campus and department
  const selectedCandidate = useMemo(() => {
    return candidates.find(c => c._id === builderState.candidateId) || null;
  }, [candidates, builderState.candidateId]);

  // Get campus and department - handle both populated form object and form ID
  const candidateCampus = useMemo(() => {
    if (!selectedCandidate?.form) return null;
    // If form is an object (populated), get campus directly
    if (typeof selectedCandidate.form === 'object' && selectedCandidate.form.campus) {
      return selectedCandidate.form.campus;
    }
    return null;
  }, [selectedCandidate]);

  const candidateDepartment = useMemo(() => {
    if (!selectedCandidate?.form) return null;
    // If form is an object (populated), get department directly
    if (typeof selectedCandidate.form === 'object' && selectedCandidate.form.department) {
      return selectedCandidate.form.department;
    }
    return null;
  }, [selectedCandidate]);

  // Filter topics for builder based on candidate's campus/department
  const builderTopicOptions = useMemo(() => {
    if (builderFilterOptions.topics.length > 0) {
      return builderFilterOptions.topics.filter(topic => topic.isActive !== false);
    }
    return activeTopicOptions;
  }, [builderFilterOptions.topics, activeTopicOptions]);

  // Fetch builder filter options when candidate is selected
  useEffect(() => {
    if (builderModalVisible && builderState.candidateId) {
      const candidate = candidates.find(c => c._id === builderState.candidateId);
      if (candidate?.form) {
        const form = candidate.form;
        const campus = (typeof form === 'object' && form.campus) ? form.campus : null;
        const department = (typeof form === 'object' && form.department) ? form.department : null;
        if (campus) {
          fetchBuilderFilterOptions(campus, department);
        } else {
          setBuilderFilterOptions({ campuses: [], departments: [], sets: [], topics: [] });
        }
      } else {
        setBuilderFilterOptions({ campuses: [], departments: [], sets: [], topics: [] });
      }
    } else if (builderModalVisible && !builderState.candidateId) {
      setBuilderFilterOptions({ campuses: [], departments: [], sets: [], topics: [] });
    }
  }, [builderModalVisible, builderState.candidateId, candidates, fetchBuilderFilterOptions]);

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

    if (!promotionForm.notes || promotionForm.notes.trim() === '') {
      setToast({ type: 'danger', message: 'Please provide notes to the candidate. This field is required.' });
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
    setTypingTestResultsForCandidate([]);
    try {
      const [candidateResponse, typingResultsResponse] = await Promise.all([
        api.get(`/candidates/${candidateId}`),
        api.get(`/typing-test/results/${candidateId}`).catch(() => ({ data: { typingTestResults: [] } }))
      ]);
      setProfileData(candidateResponse.data.candidate || null);
      setTypingTestResultsForCandidate(typingResultsResponse.data.typingTestResults || []);
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
      setTypingTestResultsForCandidate([]);
      setSelectedTypingResult(null);
      setShowTypingResultModal(false);
    }
  };

  const toggleTestResultDetails = (testId) => {
    setExpandedTestResults(prev => ({
      ...prev,
      [testId]: !prev[testId]
    }));
  };

  // Fetch typing test results
  const fetchTypingTestResults = async () => {
    setTypingTestResultsLoading(true);
    setTypingTestResultsError(null);
    try {
      const response = await api.get('/typing-test/results');
      setTypingTestResults(response.data.results || []);
    } catch (err) {
      setTypingTestResultsError(err.response?.data?.message || 'Failed to fetch typing test results');
      console.error('Typing test results fetch error:', err);
    } finally {
      setTypingTestResultsLoading(false);
    }
  };

  // Fetch typing tests for filter
  const fetchTypingTestsForFilter = async () => {
    try {
      const response = await api.get('/typing-test');
      setTypingTests(response.data.typingTests || []);
    } catch (err) {
      console.error('Typing tests fetch error:', err);
    }
  };

  // Filter and sort typing test results
  const filteredAndSortedTypingResults = useMemo(() => {
    let filtered = typingTestResults;

    // Filter by search term
    if (typingSearchTerm.trim()) {
      const term = typingSearchTerm.toLowerCase();
      filtered = filtered.filter(result => {
        const name = result.candidate?.user?.name?.toLowerCase() || '';
        const email = result.candidate?.user?.email?.toLowerCase() || '';
        const candidateNumber = result.candidate?.candidateNumber?.toLowerCase() || '';
        return name.includes(term) || email.includes(term) || candidateNumber.includes(term);
      });
    }

    // Filter by typing test
    if (typingFilterTestId !== 'all') {
      filtered = filtered.filter(result => 
        result.typingTest?._id?.toString() === typingFilterTestId
      );
    }

    // Sort results
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (typingSortBy) {
        case 'wpm':
          aValue = a.wpm || 0;
          bValue = b.wpm || 0;
          break;
        case 'accuracy':
          aValue = a.accuracy || 0;
          bValue = b.accuracy || 0;
          break;
        case 'submittedAt':
          aValue = new Date(a.submittedAt || 0).getTime();
          bValue = new Date(b.submittedAt || 0).getTime();
          break;
        case 'candidateName':
          aValue = (a.candidate?.user?.name || '').toLowerCase();
          bValue = (b.candidate?.user?.name || '').toLowerCase();
          break;
        default:
          aValue = a[typingSortBy] || 0;
          bValue = b[typingSortBy] || 0;
      }

      if (typingSortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [typingTestResults, typingSearchTerm, typingFilterTestId, typingSortBy, typingSortOrder]);

  // Calculate typing test statistics
  const typingStats = useMemo(() => {
    if (filteredAndSortedTypingResults.length === 0) {
      return {
        total: 0,
        avgWpm: 0,
        avgAccuracy: 0,
        totalErrors: 0
      };
    }

    const total = filteredAndSortedTypingResults.length;
    const avgWpm = filteredAndSortedTypingResults.reduce((sum, r) => sum + (r.wpm || 0), 0) / total;
    const avgAccuracy = filteredAndSortedTypingResults.reduce((sum, r) => sum + (r.accuracy || 0), 0) / total;
    const totalErrors = filteredAndSortedTypingResults.reduce((sum, r) => sum + (r.totalErrors || 0), 0);

    return {
      total,
      avgWpm: Math.round(avgWpm * 10) / 10,
      avgAccuracy: Math.round(avgAccuracy * 10) / 10,
      totalErrors
    };
  }, [filteredAndSortedTypingResults]);

  // Handle view typing test details
  const handleViewTypingDetails = (result) => {
    setSelectedTypingResult(result);
    setShowTypingDetailModal(true);
  };

  // Export typing test results to CSV
  const handleExportTypingCSV = () => {
    const headers = ['Candidate Name', 'Email', 'Candidate Number', 'Test Title', 'WPM', 'Accuracy (%)', 'Total Errors', 'Time Taken (s)', 'Duration (min)', 'Submitted At'];
    const rows = filteredAndSortedTypingResults.map(result => [
      result.candidate?.user?.name || 'N/A',
      result.candidate?.user?.email || 'N/A',
      result.candidate?.candidateNumber || 'N/A',
      result.typingTest?.title || 'N/A',
      result.wpm || 0,
      result.accuracy || 0,
      result.totalErrors || 0,
      result.timeTaken || 0,
      result.duration || 0,
      result.submittedAt ? new Date(result.submittedAt).toLocaleString() : 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `typing-test-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Format date for typing results
  const formatTypingDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  // Get accuracy badge variant
  const getTypingAccuracyBadge = (accuracy) => {
    if (accuracy >= 90) return 'success';
    if (accuracy >= 70) return 'warning';
    return 'danger';
  };

  // Get WPM badge variant
  const getTypingWPMBadge = (wpm) => {
    if (wpm >= 40) return 'success';
    if (wpm >= 25) return 'warning';
    return 'danger';
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
    return <SkeletonLoader loading={true} variant="table" rows={8} columns="repeat(5, 1fr)" />;
  }

  return (
    <Container fluid className="super-admin-fluid">
      <ToastNotificationContainer 
        toast={toast} 
        onClose={() => setToast({ type: '', message: '' })} 
      />

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
                <Card.Body style={{ padding: '1.25rem', background: '#ffffff', minHeight: 'calc(100vh - 450px)' }}>
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

                                const isNonTeaching = candidate.form?.formCategory === 'non_teaching';
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
                                          <>
                                            {isNonTeaching ? (
                                              <Button
                                                size="sm"
                                                variant="info"
                                                onClick={() => openTypingTestModal(candidate)}
                                                className="text-nowrap"
                                                style={{
                                                  background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
                                                  border: 'none'
                                                }}
                                              >
                                                ⌨️ Create Typing Test
                                              </Button>
                                            ) : (
                                              <Button
                                                size="sm"
                                                variant={primaryVariant}
                                                onClick={() => openBuilderModal(candidate)}
                                                className="text-nowrap"
                                              >
                                                {primaryLabel}
                                              </Button>
                                            )}
                                          </>
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
            <Col md={3} sm={6}>
              <Form.Select
                value={questionFilters.campus}
                onChange={(event) => {
                  setQuestionFilters(prev => ({ 
                    ...prev, 
                    campus: event.target.value,
                    department: 'all', // Reset department when campus changes
                    set: 'all' // Reset set when campus changes
                  }));
                }}
              >
                <option value="all">All Campuses</option>
                {filterOptions.campuses.map(campus => (
                  <option key={campus} value={campus}>
                    {campus}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={3} sm={6}>
              <Form.Select
                value={questionFilters.department}
                onChange={(event) => {
                  setQuestionFilters(prev => ({ 
                    ...prev, 
                    department: event.target.value,
                    set: 'all' // Reset set when department changes
                  }));
                }}
                disabled={questionFilters.campus === 'all'}
              >
                <option value="all">All Departments</option>
                {filterOptions.departments.map(dept => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={3} sm={6}>
              <Form.Select
                value={questionFilters.set}
                onChange={(event) => setQuestionFilters(prev => ({ ...prev, set: event.target.value }))}
                disabled={questionFilters.campus === 'all' && questionFilters.department === 'all'}
              >
                <option value="all">All Sets</option>
                {filterOptions.sets.map(set => (
                  <option key={set} value={set}>
                    {set}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={3} sm={6}>
              <Form.Select
                value={questionFilters.topicId}
                onChange={(event) => setQuestionFilters(prev => ({ ...prev, topicId: event.target.value }))}
              >
                <option value="all">All Topics</option>
                {filterOptions.topics.map(topic => (
                  <option key={topic._id} value={topic._id}>
                    {topic.name} ({topic.category === 'teaching' ? 'Teaching' : 'Non-Teaching'})
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={6} sm={12}>
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
            <Col md={6} sm={12} className="d-flex justify-content-md-end align-items-center gap-2 flex-wrap">
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
                    category: 'teaching',
                    set: ''
                  });
                  setBulkModalVisible(true);
                }}
              >
                <FaUpload className="me-2" />Bulk Upload (Excel)
              </Button>
              <Button
                variant="outline-success"
                size="sm"
                onClick={() => {
                  setBulkTextUploadState({
                    file: null,
                    campus: '',
                    department: '',
                    topicOption: 'none',
                    topicId: '',
                    newTopicName: '',
                    category: 'teaching',
                    set: ''
                  });
                  setBulkTextModalVisible(true);
                }}
              >
                <FaUpload className="me-2" />Bulk Upload (Word)
              </Button>
              <Button 
                variant="outline-secondary" 
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

          <Row className="mb-3">
            <Col>
              <div className="d-flex justify-content-between align-items-center" style={{ 
                padding: '1rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '12px',
                color: 'white',
                position: 'sticky',
                top: 0,
                zIndex: 10
              }}>
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
              </div>
            </Col>
          </Row>

          <Row>
            <Col>
              <div style={{ 
                maxHeight: 'calc(100vh - 350px)',
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '0',
                paddingTop: '1rem'
              }}>
                {questionLoading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" />
                  </div>
                ) : questions.length === 0 ? (
                  <Alert variant="light" className="text-center py-5">
                    No questions match the selected filters.
                  </Alert>
                ) : (
                  <>
                    <div className="mb-3" style={{ padding: '0.75rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                      <Form.Check
                        type="checkbox"
                        checked={questions.length > 0 && selectedQuestions.length === questions.length}
                        onChange={handleSelectAllQuestions}
                        label={`Select All (${selectedQuestions.length} selected)`}
                        style={{ fontWeight: '500' }}
                      />
                    </div>
                    <Row className="g-3">
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
                          <Col key={question._id} xs={12} sm={6}>
                            <Card 
                              style={{ 
                                height: '100%',
                                border: isSelected ? '2px solid #0d6efd' : '1px solid #dee2e6',
                                borderRadius: '12px',
                                transition: 'all 0.3s ease',
                                boxShadow: isSelected ? '0 4px 12px rgba(13, 110, 253, 0.2)' : '0 2px 4px rgba(0,0,0,0.1)'
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                }
                              }}
                            >
                              <Card.Body style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                                <div className="d-flex align-items-start justify-content-between mb-2">
                                  <Form.Check
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleSelectQuestion(question._id)}
                                    title="Select Question"
                                    style={{ marginTop: '4px' }}
                                  />
                                  <Button 
                                    variant="outline-primary" 
                                    size="sm" 
                                    onClick={() => handleEditQuestion(question)}
                                    title="Edit Question"
                                    style={{ 
                                      borderRadius: '8px',
                                      padding: '0.375rem 0.75rem',
                                      fontWeight: '500'
                                    }}
                                  >
                                    <FaEdit className="me-1" />
                                    Edit
                                  </Button>
                                </div>
                                <div style={{ flex: 1, marginBottom: '1rem' }}>
                                  <div style={{ 
                                    whiteSpace: 'pre-wrap', 
                                    fontSize: '0.95rem',
                                    fontWeight: '500',
                                    color: '#212529',
                                    marginBottom: '0.75rem',
                                    lineHeight: '1.5'
                                  }}>
                                    {question.questionText}
                                  </div>
                                  <div style={{ 
                                    marginTop: '0.5rem',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '0.5rem'
                                  }}>
                                    {question.options?.map((option, index) => (
                                      <div 
                                        key={index}
                                        style={{ 
                                          padding: '0.5rem 0.75rem',
                                          background: '#f8f9fa',
                                          borderRadius: '6px',
                                          fontSize: '0.9rem',
                                          border: '1px solid #e9ecef',
                                          whiteSpace: 'nowrap',
                                          flex: '0 1 auto'
                                        }}
                                      >
                                        <strong style={{ color: '#495057' }}>
                                          {String.fromCharCode(65 + index)}.
                                        </strong> {option}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div style={{ 
                                  marginTop: 'auto',
                                  padding: '0.75rem',
                                  background: correctAnswerIndex !== null ? '#d1e7dd' : '#e9ecef',
                                  borderRadius: '8px',
                                  border: `1px solid ${correctAnswerIndex !== null ? '#badbcc' : '#dee2e6'}`
                                }}>
                                  <div style={{ 
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    color: '#495057',
                                    marginBottom: '0.25rem'
                                  }}>
                                    Correct Answer:
                                  </div>
                                  {correctAnswerIndex !== null ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <Badge bg="success" style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}>
                                        {correctAnswerLetter}
                                      </Badge>
                                      <span style={{ fontSize: '0.9rem', color: '#155724', fontWeight: '500' }}>
                                        {correctAnswerText}
                                      </span>
                                    </div>
                                  ) : (
                                    <Badge bg="secondary" style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}>
                                      Not Set
                                    </Badge>
                                  )}
                                </div>
                              </Card.Body>
                            </Card>
                          </Col>
                        );
                      })}
                    </Row>
                  </>
                )}
              </div>
            </Col>
          </Row>
        </Tab>

        {/* Typing Test Results tab moved to Approved Candidate Pool - View Test Results */}
        {false && <Tab eventKey="typingTestResults" title={
          <span>
            <FaKeyboard className="me-2" />
            Typing Test Results
          </span>
        }>
          <Row className="mb-4">
            <Col>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h4 className="mb-1" style={{ fontWeight: '700', color: '#212529' }}>
                    <FaKeyboard className="me-2" style={{ color: '#667eea' }} />
                    Typing Test Results
                  </h4>
                  <p className="text-muted mb-0">View and manage typing test results for non-teaching candidates</p>
                </div>
                <div className="d-flex gap-2">
                  <Button 
                    variant="outline-primary" 
                    onClick={() => {
                      fetchTypingTestResults();
                      fetchTypingTestsForFilter();
                    }}
                    disabled={typingTestResultsLoading}
                  >
                    <FaSync className={`me-2 ${typingTestResultsLoading ? 'fa-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={handleExportTypingCSV} 
                    disabled={filteredAndSortedTypingResults.length === 0}
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      fontWeight: '600'
                    }}
                  >
                    <FaDownload className="me-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </Col>
          </Row>

          {typingTestResultsError && (
            <Alert variant="danger" dismissible onClose={() => setTypingTestResultsError(null)} className="mb-4">
              {typingTestResultsError}
            </Alert>
          )}

          {/* Statistics Cards */}
          <Row className="mb-4">
            <Col md={3}>
              <Card className="text-center h-100 border-0 shadow-sm" style={{ 
                borderRadius: '12px',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }}
              >
                <Card.Body style={{ padding: '1.5rem' }}>
                  <h6 className="text-muted text-uppercase mb-2" style={{ 
                    fontSize: '0.75rem', 
                    letterSpacing: '0.5px', 
                    fontWeight: '600' 
                  }}>
                    Total Results
                  </h6>
                  <h3 className="mb-0 text-primary" style={{ fontWeight: '700', fontSize: '2.5rem' }}>
                    {typingStats.total}
                  </h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center h-100 border-0 shadow-sm" style={{ 
                borderRadius: '12px',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }}
              >
                <Card.Body style={{ padding: '1.5rem' }}>
                  <h6 className="text-muted text-uppercase mb-2" style={{ 
                    fontSize: '0.75rem', 
                    letterSpacing: '0.5px', 
                    fontWeight: '600' 
                  }}>
                    Average WPM
                  </h6>
                  <h3 className="mb-0 text-success" style={{ fontWeight: '700', fontSize: '2.5rem' }}>
                    {typingStats.avgWpm.toFixed(1)}
                  </h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center h-100 border-0 shadow-sm" style={{ 
                borderRadius: '12px',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }}
              >
                <Card.Body style={{ padding: '1.5rem' }}>
                  <h6 className="text-muted text-uppercase mb-2" style={{ 
                    fontSize: '0.75rem', 
                    letterSpacing: '0.5px', 
                    fontWeight: '600' 
                  }}>
                    Average Accuracy
                  </h6>
                  <h3 className="mb-0 text-info" style={{ fontWeight: '700', fontSize: '2.5rem' }}>
                    {typingStats.avgAccuracy.toFixed(1)}%
                  </h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center h-100 border-0 shadow-sm" style={{ 
                borderRadius: '12px',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }}
              >
                <Card.Body style={{ padding: '1.5rem' }}>
                  <h6 className="text-muted text-uppercase mb-2" style={{ 
                    fontSize: '0.75rem', 
                    letterSpacing: '0.5px', 
                    fontWeight: '600' 
                  }}>
                    Total Errors
                  </h6>
                  <h3 className="mb-0 text-danger" style={{ fontWeight: '700', fontSize: '2.5rem' }}>
                    {typingStats.totalErrors}
                  </h3>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Filters */}
          <Card className="mb-4 border-0 shadow-sm" style={{ borderRadius: '12px' }}>
            <Card.Body style={{ padding: '1.5rem' }}>
              <Row className="g-3">
                <Col md={4}>
                  <InputGroup>
                    <InputGroup.Text style={{ 
                      background: '#f8f9fa', 
                      border: '2px solid #e9ecef',
                      borderRight: 'none',
                      borderRadius: '10px 0 0 10px'
                    }}>
                      <FaSearch style={{ color: '#6c757d' }} />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Search by name, email, or candidate number..."
                      value={typingSearchTerm}
                      onChange={(e) => setTypingSearchTerm(e.target.value)}
                      style={{
                        border: '2px solid #e9ecef',
                        borderLeft: 'none',
                        borderRadius: '0 10px 10px 0',
                        padding: '0.75rem 1rem'
                      }}
                    />
                  </InputGroup>
                </Col>
                <Col md={3}>
                  <Form.Select
                    value={typingFilterTestId}
                    onChange={(e) => setTypingFilterTestId(e.target.value)}
                    style={{
                      border: '2px solid #e9ecef',
                      borderRadius: '10px',
                      padding: '0.75rem 1rem'
                    }}
                  >
                    <option value="all">All Typing Tests</option>
                    {typingTests.map(test => (
                      <option key={test._id} value={test._id}>
                        {test.title}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={2}>
                  <Form.Select
                    value={typingSortBy}
                    onChange={(e) => setTypingSortBy(e.target.value)}
                    style={{
                      border: '2px solid #e9ecef',
                      borderRadius: '10px',
                      padding: '0.75rem 1rem'
                    }}
                  >
                    <option value="submittedAt">Sort by Date</option>
                    <option value="wpm">Sort by WPM</option>
                    <option value="accuracy">Sort by Accuracy</option>
                    <option value="candidateName">Sort by Name</option>
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Select
                    value={typingSortOrder}
                    onChange={(e) => setTypingSortOrder(e.target.value)}
                    style={{
                      border: '2px solid #e9ecef',
                      borderRadius: '10px',
                      padding: '0.75rem 1rem'
                    }}
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </Form.Select>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Results Table */}
          <Card className="border-0 shadow-sm" style={{ borderRadius: '12px' }}>
            <Card.Body style={{ padding: '1.5rem' }}>
              {typingTestResultsLoading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
                  <p className="mt-3 text-muted" style={{ fontSize: '1.1rem' }}>Loading typing test results...</p>
                </div>
              ) : filteredAndSortedTypingResults.length === 0 ? (
                <Alert variant="info" className="text-center border-0" style={{ 
                  borderRadius: '12px',
                  padding: '3rem 2rem',
                  background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)'
                }}>
                  <FaKeyboard style={{ fontSize: '3rem', color: '#2196f3', marginBottom: '1rem' }} />
                  <h5 className="mb-2" style={{ fontWeight: '600' }}>
                    {typingTestResults.length === 0 
                      ? 'No typing test results found' 
                      : 'No results match your filters'}
                  </h5>
                  <p className="text-muted mb-0">
                    {typingTestResults.length === 0 
                      ? 'Typing test results will appear here once candidates complete their tests.' 
                      : 'Try adjusting your search or filter criteria.'}
                  </p>
                </Alert>
              ) : (
                <div className="table-responsive">
                  <Table striped bordered hover style={{ marginBottom: 0 }}>
                    <thead style={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white'
                    }}>
                      <tr>
                        <th style={{ border: 'none', padding: '1rem', fontWeight: '600' }}>Candidate</th>
                        <th style={{ border: 'none', padding: '1rem', fontWeight: '600' }}>Test</th>
                        <th style={{ border: 'none', padding: '1rem', fontWeight: '600' }}>WPM</th>
                        <th style={{ border: 'none', padding: '1rem', fontWeight: '600' }}>Accuracy</th>
                        <th style={{ border: 'none', padding: '1rem', fontWeight: '600' }}>Errors</th>
                        <th style={{ border: 'none', padding: '1rem', fontWeight: '600' }}>Time Taken</th>
                        <th style={{ border: 'none', padding: '1rem', fontWeight: '600' }}>Duration</th>
                        <th style={{ border: 'none', padding: '1rem', fontWeight: '600' }}>Submitted At</th>
                        <th style={{ border: 'none', padding: '1rem', fontWeight: '600' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedTypingResults.map((result, index) => (
                        <tr key={index} style={{ transition: 'background-color 0.2s ease' }}>
                          <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                            <div>
                              <strong style={{ color: '#212529', fontSize: '0.95rem' }}>
                                {result.candidate?.user?.name || 'N/A'}
                              </strong>
                              <br />
                              <small className="text-muted" style={{ fontSize: '0.85rem' }}>
                                {result.candidate?.user?.email || 'N/A'}
                              </small>
                              <br />
                              {result.candidate?.candidateNumber && (
                                <Badge bg="secondary" style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>
                                  {result.candidate.candidateNumber}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                            <span style={{ fontWeight: '500', color: '#495057' }}>
                              {result.typingTest?.title || 'N/A'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                            <Badge bg={getTypingWPMBadge(result.wpm)} style={{ 
                              fontSize: '0.875rem', 
                              padding: '0.5rem 0.75rem',
                              fontWeight: '600'
                            }}>
                              {result.wpm || 0} WPM
                            </Badge>
                          </td>
                          <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                            <Badge bg={getTypingAccuracyBadge(result.accuracy)} style={{ 
                              fontSize: '0.875rem', 
                              padding: '0.5rem 0.75rem',
                              fontWeight: '600'
                            }}>
                              {result.accuracy || 0}%
                            </Badge>
                          </td>
                          <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                            <span style={{ fontWeight: '600', color: '#dc3545' }}>
                              {result.totalErrors || 0}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                            <span style={{ fontWeight: '500', color: '#495057' }}>
                              {result.timeTaken || 0}s
                            </span>
                          </td>
                          <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                            <span style={{ fontWeight: '500', color: '#495057' }}>
                              {result.duration || 0} min
                            </span>
                          </td>
                          <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                            <small className="text-muted" style={{ fontSize: '0.85rem' }}>
                              {formatTypingDate(result.submittedAt)}
                            </small>
                          </td>
                          <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleViewTypingDetails(result)}
                              style={{
                                borderRadius: '8px',
                                fontWeight: '500',
                                borderWidth: '2px',
                                transition: 'all 0.2s ease'
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
                              <FaEye className="me-1" />
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Detail Modal */}
          <Modal 
            show={showTypingDetailModal} 
            onHide={() => setShowTypingDetailModal(false)} 
            size="lg"
            centered
          >
            <Modal.Header 
              closeButton 
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px 12px 0 0'
              }}
            >
              <Modal.Title style={{ fontWeight: '700', color: 'white' }}>
                <FaKeyboard className="me-2" />
                Typing Test Result Details
              </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ padding: '2rem', background: '#f8f9fa' }}>
              {selectedTypingResult && (
                <div>
                  <Row className="mb-3 g-3">
                    <Col md={6}>
                      <Card className="border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                        <Card.Header style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px 12px 0 0',
                          fontWeight: '600'
                        }}>
                          Candidate Information
                        </Card.Header>
                        <Card.Body style={{ padding: '1.5rem' }}>
                          <p style={{ marginBottom: '0.75rem' }}>
                            <strong style={{ color: '#495057' }}>Name:</strong>{' '}
                            <span style={{ color: '#212529' }}>{selectedTypingResult.candidate?.user?.name || 'N/A'}</span>
                          </p>
                          <p style={{ marginBottom: '0.75rem' }}>
                            <strong style={{ color: '#495057' }}>Email:</strong>{' '}
                            <span style={{ color: '#212529' }}>{selectedTypingResult.candidate?.user?.email || 'N/A'}</span>
                          </p>
                          <p style={{ marginBottom: '0.75rem' }}>
                            <strong style={{ color: '#495057' }}>Candidate Number:</strong>{' '}
                            <Badge bg="secondary">{selectedTypingResult.candidate?.candidateNumber || 'N/A'}</Badge>
                          </p>
                          <p style={{ marginBottom: '0.75rem' }}>
                            <strong style={{ color: '#495057' }}>Position:</strong>{' '}
                            <span style={{ color: '#212529' }}>{selectedTypingResult.candidate?.form?.position || 'N/A'}</span>
                          </p>
                          <p style={{ marginBottom: 0 }}>
                            <strong style={{ color: '#495057' }}>Department:</strong>{' '}
                            <span style={{ color: '#212529' }}>{selectedTypingResult.candidate?.form?.department || 'N/A'}</span>
                          </p>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={6}>
                      <Card className="border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                        <Card.Header style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px 12px 0 0',
                          fontWeight: '600'
                        }}>
                          Test Information
                        </Card.Header>
                        <Card.Body style={{ padding: '1.5rem' }}>
                          <p style={{ marginBottom: '0.75rem' }}>
                            <strong style={{ color: '#495057' }}>Test Title:</strong>{' '}
                            <span style={{ color: '#212529' }}>{selectedTypingResult.typingTest?.title || 'N/A'}</span>
                          </p>
                          <p style={{ marginBottom: '0.75rem' }}>
                            <strong style={{ color: '#495057' }}>Duration:</strong>{' '}
                            <span style={{ color: '#212529' }}>{selectedTypingResult.duration || 0} minute(s)</span>
                          </p>
                          <p style={{ marginBottom: '0.75rem' }}>
                            <strong style={{ color: '#495057' }}>Started At:</strong>{' '}
                            <span style={{ color: '#212529' }}>{formatTypingDate(selectedTypingResult.startedAt)}</span>
                          </p>
                          <p style={{ marginBottom: 0 }}>
                            <strong style={{ color: '#495057' }}>Submitted At:</strong>{' '}
                            <span style={{ color: '#212529' }}>{formatTypingDate(selectedTypingResult.submittedAt)}</span>
                          </p>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                  <Row>
                    <Col>
                      <Card className="border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                        <Card.Header style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px 12px 0 0',
                          fontWeight: '600'
                        }}>
                          Performance Metrics
                        </Card.Header>
                        <Card.Body style={{ padding: '2rem' }}>
                          <Row className="mb-4">
                            <Col md={3} className="text-center mb-3">
                              <div style={{
                                background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                padding: '1.5rem',
                                borderRadius: '12px',
                                border: '2px solid #2196f3'
                              }}>
                                <h3 className="text-primary mb-2" style={{ fontWeight: '700', fontSize: '2.5rem' }}>
                                  {selectedTypingResult.wpm || 0}
                                </h3>
                                <p className="text-muted mb-0" style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                                  Words Per Minute
                                </p>
                              </div>
                            </Col>
                            <Col md={3} className="text-center mb-3">
                              <div style={{
                                background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                                padding: '1.5rem',
                                borderRadius: '12px',
                                border: '2px solid #4caf50'
                              }}>
                                <h3 className="text-success mb-2" style={{ fontWeight: '700', fontSize: '2.5rem' }}>
                                  {selectedTypingResult.accuracy || 0}%
                                </h3>
                                <p className="text-muted mb-0" style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                                  Accuracy
                                </p>
                              </div>
                            </Col>
                            <Col md={3} className="text-center mb-3">
                              <div style={{
                                background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
                                padding: '1.5rem',
                                borderRadius: '12px',
                                border: '2px solid #f44336'
                              }}>
                                <h3 className="text-danger mb-2" style={{ fontWeight: '700', fontSize: '2.5rem' }}>
                                  {selectedTypingResult.totalErrors || 0}
                                </h3>
                                <p className="text-muted mb-0" style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                                  Total Errors
                                </p>
                              </div>
                            </Col>
                            <Col md={3} className="text-center mb-3">
                              <div style={{
                                background: 'linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%)',
                                padding: '1.5rem',
                                borderRadius: '12px',
                                border: '2px solid #009688'
                              }}>
                                <h3 className="text-info mb-2" style={{ fontWeight: '700', fontSize: '2.5rem' }}>
                                  {selectedTypingResult.timeTaken || 0}s
                                </h3>
                                <p className="text-muted mb-0" style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                                  Time Taken
                                </p>
                              </div>
                            </Col>
                          </Row>
                          <hr style={{ margin: '1.5rem 0' }} />
                          <Row>
                            <Col md={6}>
                              <p style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>
                                <strong style={{ color: '#495057' }}>Total Characters:</strong>{' '}
                                <span style={{ color: '#212529', fontWeight: '600' }}>
                                  {selectedTypingResult.totalCharacters || 0}
                                </span>
                              </p>
                              <p style={{ marginBottom: 0, fontSize: '1rem' }}>
                                <strong style={{ color: '#495057' }}>Correct Characters:</strong>{' '}
                                <span style={{ color: '#212529', fontWeight: '600' }}>
                                  {selectedTypingResult.correctCharacters || 0}
                                </span>
                              </p>
                            </Col>
                            <Col md={6}>
                              <p style={{ marginBottom: 0, fontSize: '1rem' }}>
                                <strong style={{ color: '#495057' }}>Status:</strong>{' '}
                                <Badge bg="success" style={{ 
                                  fontSize: '0.9rem', 
                                  padding: '0.5rem 1rem',
                                  fontWeight: '600'
                                }}>
                                  {selectedTypingResult.status || 'completed'}
                                </Badge>
                              </p>
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer style={{
              border: 'none',
              padding: '1.5rem 2rem',
              background: '#f8f9fa',
              borderRadius: '0 0 12px 12px'
            }}>
              <Button 
                variant="secondary" 
                onClick={() => setShowTypingDetailModal(false)}
                style={{
                  borderRadius: '10px',
                  padding: '0.75rem 2rem',
                  fontWeight: '600',
                  border: 'none'
                }}
              >
                Close
              </Button>
            </Modal.Footer>
          </Modal>
        </Tab>}
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
              <div className="d-flex gap-2 align-items-center flex-wrap">
                <Form.Control
                  type="time"
                  value={promotionForm.interviewTime || ''}
                  onChange={(event) => {
                    const timeValue = event.target.value;
                    setPromotionForm(prev => ({ ...prev, interviewTime: timeValue }));
                  }}
                  style={{ flex: '1 1 200px', minWidth: '150px' }}
                  placeholder="HH:MM"
                />
                <Form.Select
                  value={promotionForm.interviewTime || ''}
                  onChange={(event) => {
                    const timeValue = event.target.value;
                    setPromotionForm(prev => ({ ...prev, interviewTime: timeValue }));
                  }}
                  style={{ flex: '1 1 200px', minWidth: '150px' }}
                >
                  <option value="">Or select from list</option>
                  {interviewTimeOptions.map(option => (
                    <option key={option.value || 'blank'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </div>
              <Form.Text className="text-muted">You can either type a custom time (24-hour format) or select from the predefined list. Times are in IST (UTC+5:30).</Form.Text>
            </Form.Group>

            <Form.Group>
              <Form.Label>Notes to Candidate<span className="text-danger">*</span></Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Message that will be included in the email..."
                value={promotionForm.notes}
                onChange={(event) => setPromotionForm(prev => ({ ...prev, notes: event.target.value }))}
                required
              />
              <Form.Text className="text-muted">This message is required and will be sent to the candidate via email.</Form.Text>
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
        dialogClassName="candidate-test-overview-modal"
      >
        <style>{`
          .candidate-test-overview-modal .modal-dialog {
            max-width: 95vw !important;
            width: 95vw !important;
          }
          @media (min-width: 1400px) {
            .candidate-test-overview-modal .modal-dialog {
              max-width: 92vw !important;
              width: 92vw !important;
            }
          }
        `}</style>
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

      {/* Typing Test Result Details Modal */}
      <Modal
        show={showTypingResultModal}
        onHide={() => {
          setShowTypingResultModal(false);
          setSelectedTypingResult(null);
        }}
        size="lg"
        centered
        scrollable
        dialogClassName="typing-test-result-modal"
      >
        <style>{`
          .typing-test-result-modal .modal-dialog {
            max-width: 90vw !important;
            width: 90vw !important;
          }
          @media (min-width: 992px) {
            .typing-test-result-modal .modal-dialog {
              max-width: 800px !important;
              width: 800px !important;
            }
          }
          @media (max-width: 768px) {
            .typing-test-result-modal .modal-dialog {
              max-width: 95vw !important;
              width: 95vw !important;
              margin: 0.5rem auto;
            }
          }
        `}</style>
        <Modal.Header
          closeButton
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderBottom: 'none'
          }}
        >
          <Modal.Title style={{ color: 'white', fontWeight: '600' }}>
            <FaKeyboard className="me-2" />
            Typing Test Result Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '1.5rem', background: '#f8f9fa', maxHeight: '85vh', overflowY: 'auto' }}>
          {selectedTypingResult ? (
            <div>
              <Row className="mb-3 g-3">
                <Col md={6}>
                  <Card className="h-100 border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)' }}>
                    <Card.Body style={{ padding: '1.25rem' }}>
                      <h6 className="text-muted mb-3 text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px', fontWeight: '600' }}>
                        Candidate Information
                      </h6>
                      <div style={{ lineHeight: '1.8' }}>
                        <p className="mb-2">
                          <strong style={{ color: '#495057', minWidth: '140px', display: 'inline-block' }}>Name:</strong>
                          <span style={{ color: '#212529' }}> {profileData?.personalDetails?.name || profileData?.user?.name || 'N/A'}</span>
                        </p>
                        <p className="mb-2">
                          <strong style={{ color: '#495057', minWidth: '140px', display: 'inline-block' }}>Email:</strong>
                          <span style={{ color: '#212529' }}> {profileData?.personalDetails?.email || profileData?.user?.email || 'N/A'}</span>
                        </p>
                        <p className="mb-0">
                          <strong style={{ color: '#495057', minWidth: '140px', display: 'inline-block' }}>Candidate Number:</strong>
                          <span style={{ color: '#212529' }}> {profileData?.candidateNumber || 'N/A'}</span>
                        </p>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="h-100 border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #f093fb15 0%, #f5576c15 100%)' }}>
                    <Card.Body style={{ padding: '1.25rem' }}>
                      <h6 className="text-muted mb-3 text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px', fontWeight: '600' }}>
                        Test Information
                      </h6>
                      <div style={{ lineHeight: '1.8' }}>
                        <p className="mb-2">
                          <strong style={{ color: '#495057', minWidth: '140px', display: 'inline-block' }}>Test Title:</strong>
                          <span style={{ color: '#212529' }}> {selectedTypingResult.typingTest?.title || 'N/A'}</span>
                        </p>
                        <p className="mb-2">
                          <strong style={{ color: '#495057', minWidth: '140px', display: 'inline-block' }}>Duration:</strong>
                          <span style={{ color: '#212529' }}> {selectedTypingResult.duration || 0} minute(s)</span>
                        </p>
                        <p className="mb-2">
                          <strong style={{ color: '#495057', minWidth: '140px', display: 'inline-block' }}>Started At:</strong>
                          <span style={{ color: '#212529' }}> {formatTypingDate(selectedTypingResult.startedAt)}</span>
                        </p>
                        <p className="mb-0">
                          <strong style={{ color: '#495057', minWidth: '140px', display: 'inline-block' }}>Submitted At:</strong>
                          <span style={{ color: '#212529' }}> {formatTypingDate(selectedTypingResult.submittedAt)}</span>
                        </p>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
              <Row>
                <Col>
                  <Card className="border-0 shadow-sm">
                    <Card.Header style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderBottom: 'none' }}>
                      <h5 className="mb-0" style={{ color: 'white', fontWeight: '600' }}>
                        Performance Metrics
                      </h5>
                    </Card.Header>
                    <Card.Body style={{ padding: '1.5rem', background: '#ffffff' }}>
                      <Row>
                        <Col md={3} className="text-center mb-3">
                          <h4 className="text-primary">{selectedTypingResult.wpm || 0}</h4>
                          <p className="text-muted mb-0">Words Per Minute</p>
                        </Col>
                        <Col md={3} className="text-center mb-3">
                          <h4 className="text-success">{selectedTypingResult.accuracy || 0}%</h4>
                          <p className="text-muted mb-0">Accuracy</p>
                        </Col>
                        <Col md={3} className="text-center mb-3">
                          <h4 className="text-danger">{selectedTypingResult.totalErrors || 0}</h4>
                          <p className="text-muted mb-0">Total Errors</p>
                        </Col>
                        <Col md={3} className="text-center mb-3">
                          <h4 className="text-info">{selectedTypingResult.timeTaken || 0}s</h4>
                          <p className="text-muted mb-0">Time Taken</p>
                        </Col>
                      </Row>
                      <hr />
                      <Row>
                        <Col md={6}>
                          <p><strong>Total Characters:</strong> {selectedTypingResult.totalCharacters || 0}</p>
                          <p><strong>Correct Characters:</strong> {selectedTypingResult.correctCharacters || 0}</p>
                        </Col>
                        <Col md={6}>
                          <p><strong>Backspace Count:</strong> {selectedTypingResult.backspaceCount || 0}</p>
                          <p><strong>Status:</strong>
                            <Badge bg="success" className="ms-2">
                              {selectedTypingResult.status || 'completed'}
                            </Badge>
                          </p>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </div>
          ) : (
            <Alert variant="warning">No typing test result details available.</Alert>
          )}
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '1px solid #dee2e6', background: '#ffffff' }}>
          <Button
            variant="secondary"
            onClick={() => {
              setShowTypingResultModal(false);
              setSelectedTypingResult(null);
            }}
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
        size="xl" 
        centered
        scrollable
        dialogClassName="assessment-builder-modal"
      >
        <style>{`
          .assessment-builder-modal .modal-dialog {
            max-width: 95vw !important;
            width: 95vw !important;
          }
          @media (min-width: 1200px) {
            .assessment-builder-modal .modal-dialog {
              max-width: 90vw !important;
              width: 90vw !important;
            }
          }
        `}</style>
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
                    onChange={(event) => {
                      const candidateId = event.target.value;
                      const candidate = candidates.find(c => c._id === candidateId);
                      setBuilderState(prev => ({ ...prev, candidateId }));
                      if (candidate?.form?.campus) {
                        fetchBuilderFilterOptions(candidate.form.campus, candidate.form.department);
                      } else {
                        setBuilderFilterOptions({ campuses: [], departments: [], sets: [], topics: [] });
                      }
                    }}
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
                  {selectedCandidate && (candidateCampus || candidateDepartment) && (
                    <div className="mt-2" style={{ fontSize: '0.875rem', color: '#6c757d' }}>
                      <strong>Campus:</strong> {candidateCampus || 'N/A'} | <strong>Department:</strong> {candidateDepartment || 'N/A'}
                    </div>
                  )}
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
                            {builderTopicOptions.map(item => (
                              <option key={item._id} value={item._id}>
                                {item.name} ({item.category === 'teaching' ? 'Teaching' : 'Non-Teaching'})
                              </option>
                            ))}
                          </Form.Select>
                          {builderFilterOptionsLoading && (
                            <div className="mt-1" style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                              Loading topics...
                            </div>
                          )}
                          {selectedCandidate && builderTopicOptions.length === 0 && !builderFilterOptionsLoading && (
                            <div className="mt-1" style={{ fontSize: '0.75rem', color: '#dc3545' }}>
                              No topics available for this candidate's campus/department
                            </div>
                          )}
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
              category: 'teaching',
              set: ''
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
              // Set is optional and only used when no topic is selected
              if (bulkUploadState.topicOption === 'none' && bulkUploadState.set.trim()) {
                formData.append('set', bulkUploadState.set.trim());
              }
              const response = await api.post('/tests/questions/bulk-upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
              });
              
              // Show results modal with detailed information
              setUploadResults(response.data);
              setBulkUploadState({ 
                file: null,
                campus: '',
                department: '',
                topicOption: 'none',
                topicId: '',
                newTopicName: '',
                category: 'teaching',
                set: ''
              });
              setBulkDepartments([]);
              setBulkModalVisible(false);
              setUploadResultsModalVisible(true);
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
                onChange={() => setBulkUploadState(prev => ({ ...prev, topicOption: 'none', topicId: '', newTopicName: '', set: prev.set }))}
                className="mb-2"
              />
              <Form.Check
                type="radio"
                name="topicOption"
                id="topicExisting"
                label="Select Existing Topic"
                checked={bulkUploadState.topicOption === 'existing'}
                onChange={() => setBulkUploadState(prev => ({ ...prev, topicOption: 'existing', newTopicName: '', set: '' }))}
                className="mb-2"
              />
              <Form.Check
                type="radio"
                name="topicOption"
                id="topicNew"
                label="Create New Topic"
                checked={bulkUploadState.topicOption === 'new'}
                onChange={() => setBulkUploadState(prev => ({ ...prev, topicOption: 'new', topicId: '', set: '' }))}
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

            {bulkUploadState.topicOption === 'none' && (
              <Form.Group className="mb-3">
                <Form.Label>Set (Optional)</Form.Label>
                <Form.Select
                  value={bulkUploadState.set}
                  onChange={(e) => setBulkUploadState(prev => ({ ...prev, set: e.target.value }))}
                >
                  <option value="">No Set</option>
                  {Array.from({ length: 10 }, (_, i) => {
                    const setNames = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
                    return (
                      <option key={i + 1} value={`Set ${setNames[i]}`}>
                        Set {setNames[i]}
                      </option>
                    );
                  })}
                </Form.Select>
                <Form.Text className="text-muted">
                  Optional: Select a set to organize questions within the department bank
                </Form.Text>
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
                  category: 'teaching',
                  set: ''
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
            category: 'teaching',
            set: ''
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
              // Set is optional and only used when no topic is selected
              if (bulkTextUploadState.topicOption === 'none' && bulkTextUploadState.set.trim()) {
                formData.append('set', bulkTextUploadState.set.trim());
              }
              const response = await api.post('/tests/questions/bulk-upload-word', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
              });
              
              // Show results modal with detailed information
              setUploadResults(response.data);
              setBulkTextUploadState({
                file: null,
                campus: '',
                department: '',
                topicOption: 'none',
                topicId: '',
                newTopicName: '',
                category: 'teaching',
                set: ''
              });
              setBulkTextDepartments([]);
              setShowPreview(false);
              setPreviewQuestions([]);
              setBulkTextModalVisible(false);
              setUploadResultsModalVisible(true);
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
                onChange={() => setBulkTextUploadState(prev => ({ ...prev, topicOption: 'none', topicId: '', newTopicName: '', set: prev.set }))}
                className="mb-2"
              />
              <Form.Check
                type="radio"
                name="topicOptionText"
                id="topicExistingText"
                label="Select Existing Topic"
                checked={bulkTextUploadState.topicOption === 'existing'}
                onChange={() => setBulkTextUploadState(prev => ({ ...prev, topicOption: 'existing', newTopicName: '', set: '' }))}
                className="mb-2"
              />
              <Form.Check
                type="radio"
                name="topicOptionText"
                id="topicNewText"
                label="Create New Topic"
                checked={bulkTextUploadState.topicOption === 'new'}
                onChange={() => setBulkTextUploadState(prev => ({ ...prev, topicOption: 'new', topicId: '', set: '' }))}
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

            {bulkTextUploadState.topicOption === 'none' && (
              <Form.Group className="mb-3">
                <Form.Label>Set (Optional)</Form.Label>
                <Form.Select
                  value={bulkTextUploadState.set}
                  onChange={(e) => setBulkTextUploadState(prev => ({ ...prev, set: e.target.value }))}
                >
                  <option value="">No Set</option>
                  {Array.from({ length: 10 }, (_, i) => {
                    const setNames = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
                    return (
                      <option key={i + 1} value={`Set ${setNames[i]}`}>
                        Set {setNames[i]}
                      </option>
                    );
                  })}
                </Form.Select>
                <Form.Text className="text-muted">
                  Optional: Select a set to organize questions within the department bank
                </Form.Text>
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

      {/* Upload Results Modal */}
      <Modal
        show={uploadResultsModalVisible}
        onHide={() => setUploadResultsModalVisible(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaCheckCircle className="me-2 text-success" />
            Upload Results
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {uploadResults && (
            <>
              {/* Success Message */}
              <Alert variant="success" className="mb-4">
                <Alert.Heading>
                  <FaCheckCircle className="me-2" />
                  {uploadResults.message || 'Upload completed successfully!'}
                </Alert.Heading>
              </Alert>

              {/* Summary Cards */}
              <Row className="mb-4">
                <Col md={6} className="mb-3">
                  <Card className="h-100 border-success">
                    <Card.Body className="text-center">
                      <h3 className="text-success mb-2">{uploadResults.summary?.successfullyImported || 0}</h3>
                      <p className="text-muted mb-0">Successfully Imported</p>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6} className="mb-3">
                  <Card className="h-100 border-warning">
                    <Card.Body className="text-center">
                      <h3 className="text-warning mb-2">{uploadResults.summary?.duplicatesRemoved || 0}</h3>
                      <p className="text-muted mb-0">Duplicates Removed</p>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Detailed Information */}
              <div className="mb-3">
                <h6 className="mb-3">
                  <strong>Summary:</strong>
                </h6>
                <ul className="list-unstyled">
                  <li className="mb-2">
                    <strong>Total Rows:</strong> {uploadResults.summary?.totalRows || 0}
                  </li>
                  <li className="mb-2">
                    <strong>Successfully Imported:</strong>{' '}
                    <span className="text-success">{uploadResults.summary?.successfullyImported || 0}</span>
                  </li>
                  <li className="mb-2">
                    <strong>Duplicates Removed:</strong>{' '}
                    <span className="text-warning">{uploadResults.summary?.duplicatesRemoved || 0}</span>
                  </li>
                  {uploadResults.summary?.errorsFound > 0 && (
                    <li className="mb-2">
                      <strong>Errors Found:</strong>{' '}
                      <span className="text-danger">{uploadResults.summary?.errorsFound || 0}</span>
                    </li>
                  )}
                </ul>
              </div>

              {/* Duplicates Section */}
              {uploadResults.details?.duplicates && uploadResults.details.duplicates.length > 0 && (
                <div className="mb-3">
                  <h6 className="mb-3">
                    <strong>Duplicate Questions (Removed):</strong>
                  </h6>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <Table striped bordered hover size="sm">
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Question</th>
                          <th>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadResults.details.duplicates.map((dup, idx) => (
                          <tr key={idx}>
                            <td className="text-center">
                              <Badge bg="warning">{dup.row}</Badge>
                            </td>
                            <td>
                              <small>{dup.questionText}</small>
                            </td>
                            <td>
                              <small className="text-muted">{dup.reason}</small>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Errors Section */}
              {uploadResults.details?.errors && uploadResults.details.errors.length > 0 && (
                <div className="mb-3">
                  <h6 className="mb-3 text-danger">
                    <strong>Errors Found:</strong>
                  </h6>
                  <Alert variant="danger">
                    <ul className="mb-0" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {uploadResults.details.errors.map((error, idx) => (
                        <li key={idx}>
                          <small>{error}</small>
                        </li>
                      ))}
                    </ul>
                  </Alert>
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setUploadResultsModalVisible(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Typing Test Creation Modal */}
      <Modal
        show={typingTestModalVisible}
        onHide={closeTypingTestModal}
        size="xl"
        centered
        scrollable
        className="typing-test-modal"
      >
        <style>{`
          .typing-test-modal .modal-dialog {
            max-width: 1200px !important;
            width: 95vw !important;
            max-height: 95vh !important;
            margin: 2.5vh auto !important;
          }
          .typing-test-modal .modal-content {
            border: none;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            display: flex;
            flex-direction: column;
            max-height: 95vh;
          }
          .typing-test-modal .modal-body {
            overflow-y: auto;
            overflow-x: hidden;
            max-height: calc(95vh - 200px);
            padding: 2rem !important;
          }
          .typing-test-modal .modal-body::-webkit-scrollbar {
            width: 8px;
          }
          .typing-test-modal .modal-body::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 10px;
          }
          .typing-test-modal .modal-body::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
            border-radius: 10px;
          }
          .typing-test-modal .modal-body::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(135deg, #138496 0%, #117a8b 100%);
          }
          .typing-test-modal .form-control:focus,
          .typing-test-modal .form-select:focus {
            border-color: #17a2b8;
            box-shadow: 0 0 0 0.2rem rgba(23, 162, 184, 0.25);
          }
          .typing-test-modal .form-check-input:checked {
            background-color: #17a2b8;
            border-color: #17a2b8;
          }
          .typing-test-modal .form-check-input:focus {
            box-shadow: 0 0 0 0.2rem rgba(23, 162, 184, 0.25);
          }
        `}</style>
        <Modal.Header
          closeButton
          style={{
            background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
            color: 'white',
            borderBottom: 'none',
            padding: '1.5rem 2rem',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{
            position: 'absolute',
            top: '-50%',
            right: '-10%',
            width: '200px',
            height: '200px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            zIndex: 0
          }}></div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <Modal.Title style={{ 
              color: 'white', 
              fontWeight: '700',
              fontSize: '1.5rem',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <span style={{
                fontSize: '2rem',
                display: 'inline-block',
                transform: 'rotate(-5deg)'
              }}>⌨️</span>
              <span>Create Typing Test</span>
            </Modal.Title>
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.9)', 
              margin: '0.5rem 0 0 0',
              fontSize: '0.9rem',
              fontWeight: '400'
            }}>
              Configure and assign a typing speed test for non-teaching candidates
            </p>
          </div>
        </Modal.Header>
        <Form onSubmit={handleCreateTypingTest}>
          <Modal.Body style={{ 
            padding: '2rem', 
            background: 'linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%)',
            overflowY: 'auto',
            overflowX: 'hidden'
          }}>
            {/* Candidate Selection Card */}
            <Card className="mb-4 border-0 shadow-sm" style={{ borderRadius: '12px', overflow: 'hidden' }}>
              <Card.Body style={{ padding: '1.5rem', background: 'white' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1.25rem',
                  paddingBottom: '1rem',
                  borderBottom: '2px solid #e9ecef'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '1.2rem'
                  }}>
                    👤
                  </div>
                  <div>
                    <h6 style={{ margin: 0, fontWeight: '600', color: '#212529' }}>Candidate Selection</h6>
                    <small style={{ color: '#6c757d' }}>Select the candidate for this typing test</small>
                  </div>
                </div>
                <Form.Group>
                  <Form.Label style={{ 
                    fontWeight: '600', 
                    color: '#495057', 
                    marginBottom: '0.75rem',
                    fontSize: '0.95rem'
                  }}>
                    Assign to Candidate<span className="text-danger ms-1">*</span>
                  </Form.Label>
                  <Form.Select
                    value={typingTestForm.candidateId}
                    onChange={(event) => {
                      const candidateId = event.target.value;
                      const candidate = candidates.find(c => c._id === candidateId);
                      setTypingTestForm(prev => ({
                        ...prev,
                        candidateId,
                        title: candidate ? `${candidate.form?.title || candidate.form?.position || 'Typing Test'} - ${candidate.user?.name}` : '',
                        form: candidate?.form?._id || null
                      }));
                    }}
                    required
                    style={{
                      borderRadius: '10px',
                      border: '2px solid #e9ecef',
                      padding: '0.875rem 1rem',
                      fontSize: '0.95rem',
                      transition: 'all 0.3s ease',
                      background: 'white'
                    }}
                  >
                    <option value="">Select a non-teaching candidate...</option>
                    {candidates
                      .filter(c => c.form?.formCategory === 'non_teaching')
                      .map(candidate => (
                        <option key={candidate._id} value={candidate._id}>
                          {candidate.user?.name} — {candidate.form?.position}{candidate.candidateNumber ? ` (${candidate.candidateNumber})` : ''}
                        </option>
                      ))}
                  </Form.Select>
                  {typingTestForm.candidateId && (() => {
                    const selectedCandidate = candidates.find(c => c._id === typingTestForm.candidateId);
                    return selectedCandidate && (
                      <div className="mt-3 p-3" style={{ 
                        background: 'linear-gradient(135deg, #e7f5f8 0%, #d1ecf1 100%)',
                        borderRadius: '10px',
                        border: '1px solid #bee5eb'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          gap: '1rem',
                          flexWrap: 'wrap'
                        }}>
                          <div style={{ fontSize: '0.9rem', color: '#0c5460' }}>
                            <strong>📚 Campus:</strong> <span style={{ fontWeight: '500' }}>{selectedCandidate.form?.campus || 'N/A'}</span>
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#0c5460' }}>
                            <strong>🏢 Department:</strong> <span style={{ fontWeight: '500' }}>{selectedCandidate.form?.department || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </Form.Group>
              </Card.Body>
            </Card>

            {/* Test Configuration Card */}
            <Card className="mb-4 border-0 shadow-sm" style={{ borderRadius: '12px', overflow: 'hidden' }}>
              <Card.Body style={{ padding: '1.5rem', background: 'white' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1.25rem',
                  paddingBottom: '1rem',
                  borderBottom: '2px solid #e9ecef'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '1.2rem'
                  }}>
                    ⚙️
                  </div>
                  <div>
                    <h6 style={{ margin: 0, fontWeight: '600', color: '#212529' }}>Test Configuration</h6>
                    <small style={{ color: '#6c757d' }}>Set up the typing test parameters</small>
                  </div>
                </div>

                <Row className="mb-3 g-3">
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label style={{ 
                        fontWeight: '600', 
                        color: '#495057', 
                        marginBottom: '0.75rem',
                        fontSize: '0.95rem'
                      }}>
                        Test Title<span className="text-danger ms-1">*</span>
                      </Form.Label>
                      <Form.Control
                        value={typingTestForm.title}
                        onChange={(event) => setTypingTestForm(prev => ({ ...prev, title: event.target.value }))}
                        placeholder="e.g., Typing Speed Test - Non-Teaching Staff"
                        required
                        style={{
                          borderRadius: '10px',
                          border: '2px solid #e9ecef',
                          padding: '0.875rem 1rem',
                          fontSize: '0.95rem',
                          transition: 'all 0.3s ease',
                          background: 'white'
                        }}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label style={{ 
                    fontWeight: '600', 
                    color: '#495057', 
                    marginBottom: '0.75rem',
                    fontSize: '0.95rem'
                  }}>
                    Description
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={typingTestForm.description}
                    onChange={(event) => setTypingTestForm(prev => ({ ...prev, description: event.target.value }))}
                    placeholder="Brief description of the typing test (optional)"
                    style={{
                      borderRadius: '10px',
                      border: '2px solid #e9ecef',
                      padding: '0.875rem 1rem',
                      fontSize: '0.95rem',
                      transition: 'all 0.3s ease',
                      background: 'white',
                      resize: 'vertical'
                    }}
                  />
                </Form.Group>

                <Row className="mb-3 g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label style={{ 
                        fontWeight: '600', 
                        color: '#495057', 
                        marginBottom: '0.75rem',
                        fontSize: '0.95rem'
                      }}>
                        Duration Options
                      </Form.Label>
                      <div className="d-flex gap-3" style={{ 
                        padding: '1rem',
                        background: '#f8f9fa',
                        borderRadius: '10px',
                        border: '2px solid #e9ecef'
                      }}>
                        <Form.Check
                          type="checkbox"
                          id="duration-1"
                          label={
                            <span style={{ 
                              fontWeight: '500',
                              fontSize: '0.95rem',
                              color: '#495057'
                            }}>
                              1 minute
                            </span>
                          }
                          checked={typingTestForm.durationOptions.includes(1)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTypingTestForm(prev => ({
                                ...prev,
                                durationOptions: [...prev.durationOptions.filter(d => d !== 1), 1].sort()
                              }));
                            } else {
                              setTypingTestForm(prev => ({
                                ...prev,
                                durationOptions: prev.durationOptions.filter(d => d !== 1),
                                defaultDuration: prev.defaultDuration === 1 ? 2 : prev.defaultDuration
                              }));
                            }
                          }}
                          style={{ margin: 0 }}
                        />
                        <Form.Check
                          type="checkbox"
                          id="duration-2"
                          label={
                            <span style={{ 
                              fontWeight: '500',
                              fontSize: '0.95rem',
                              color: '#495057'
                            }}>
                              2 minutes
                            </span>
                          }
                          checked={typingTestForm.durationOptions.includes(2)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTypingTestForm(prev => ({
                                ...prev,
                                durationOptions: [...prev.durationOptions.filter(d => d !== 2), 2].sort()
                              }));
                            } else {
                              setTypingTestForm(prev => ({
                                ...prev,
                                durationOptions: prev.durationOptions.filter(d => d !== 2),
                                defaultDuration: prev.defaultDuration === 2 ? 1 : prev.defaultDuration
                              }));
                            }
                          }}
                          style={{ margin: 0 }}
                        />
                      </div>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label style={{ 
                        fontWeight: '600', 
                        color: '#495057', 
                        marginBottom: '0.75rem',
                        fontSize: '0.95rem'
                      }}>
                        Default Duration
                      </Form.Label>
                      <Form.Select
                        value={typingTestForm.defaultDuration}
                        onChange={(event) => setTypingTestForm(prev => ({ ...prev, defaultDuration: Number(event.target.value) }))}
                        style={{
                          borderRadius: '10px',
                          border: '2px solid #e9ecef',
                          padding: '0.875rem 1rem',
                          fontSize: '0.95rem',
                          transition: 'all 0.3s ease',
                          background: 'white'
                        }}
                      >
                        {typingTestForm.durationOptions.map(duration => (
                          <option key={duration} value={duration}>{duration} minute{duration > 1 ? 's' : ''}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Typing Paragraph Card */}
            <Card className="mb-4 border-0 shadow-sm" style={{ borderRadius: '12px', overflow: 'hidden' }}>
              <Card.Body style={{ padding: '1.5rem', background: 'white' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1.25rem',
                  paddingBottom: '1rem',
                  borderBottom: '2px solid #e9ecef'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '1.2rem'
                  }}>
                    📝
                  </div>
                  <div>
                    <h6 style={{ margin: 0, fontWeight: '600', color: '#212529' }}>Typing Content</h6>
                    <small style={{ color: '#6c757d' }}>The text candidates will type during the test</small>
                  </div>
                </div>
                <Form.Group>
                  <Form.Label style={{ 
                    fontWeight: '600', 
                    color: '#495057', 
                    marginBottom: '0.75rem',
                    fontSize: '0.95rem'
                  }}>
                    Typing Paragraph<span className="text-danger ms-1">*</span>
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={8}
                    value={typingTestForm.typingParagraph}
                    onChange={(event) => setTypingTestForm(prev => ({ ...prev, typingParagraph: event.target.value }))}
                    placeholder="Enter the paragraph that candidates need to type. This should be a meaningful text of appropriate length that tests typing speed and accuracy..."
                    required
                    style={{
                      borderRadius: '10px',
                      border: '2px solid #e9ecef',
                      padding: '1rem',
                      fontSize: '0.95rem',
                      fontFamily: '"Courier New", monospace',
                      lineHeight: '1.6',
                      transition: 'all 0.3s ease',
                      background: '#f8f9fa',
                      resize: 'vertical'
                    }}
                  />
                  <Form.Text style={{ 
                    display: 'block',
                    marginTop: '0.5rem',
                    fontSize: '0.85rem',
                    color: '#6c757d',
                    fontStyle: 'italic'
                  }}>
                    💡 This is the text that candidates will be required to type during the test. Make it clear and meaningful.
                  </Form.Text>
                </Form.Group>
              </Card.Body>
            </Card>

            {/* Instructions Card */}
            <Card className="mb-3 border-0 shadow-sm" style={{ borderRadius: '12px', overflow: 'hidden' }}>
              <Card.Body style={{ padding: '1.5rem', background: 'white' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1.25rem',
                  paddingBottom: '1rem',
                  borderBottom: '2px solid #e9ecef'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '1.2rem'
                  }}>
                    📋
                  </div>
                  <div>
                    <h6 style={{ margin: 0, fontWeight: '600', color: '#212529' }}>Candidate Instructions</h6>
                    <small style={{ color: '#6c757d' }}>Guidelines to show before the test begins</small>
                  </div>
                </div>
                <Form.Group>
                  <Form.Label style={{ 
                    fontWeight: '600', 
                    color: '#495057', 
                    marginBottom: '0.75rem',
                    fontSize: '0.95rem'
                  }}>
                    Instructions for Candidates
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={typingTestForm.instructions}
                    onChange={(event) => setTypingTestForm(prev => ({ ...prev, instructions: event.target.value }))}
                    placeholder="Instructions to show before the typing test begins..."
                    style={{
                      borderRadius: '10px',
                      border: '2px solid #e9ecef',
                      padding: '0.875rem 1rem',
                      fontSize: '0.95rem',
                      transition: 'all 0.3s ease',
                      background: 'white',
                      resize: 'vertical'
                    }}
                  />
                </Form.Group>
              </Card.Body>
            </Card>

            {/* Test Schedule Card */}
            <Card className="mb-3 border-0 shadow-sm" style={{ borderRadius: '12px', overflow: 'hidden' }}>
              <Card.Body style={{ padding: '1.5rem', background: 'white' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1.25rem',
                  paddingBottom: '1rem',
                  borderBottom: '2px solid #e9ecef'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '1.2rem'
                  }}>
                    🕐
                  </div>
                  <div>
                    <h6 style={{ margin: 0, fontWeight: '600', color: '#212529' }}>Test Schedule</h6>
                    <small style={{ color: '#6c757d' }}>Set when the test becomes available and expires</small>
                  </div>
                </div>

                <Row className="mb-3 g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label style={{ 
                        fontWeight: '600', 
                        color: '#495057', 
                        marginBottom: '0.75rem',
                        fontSize: '0.95rem'
                      }}>
                        Start Date & Time<span className="text-danger ms-1">*</span>
                      </Form.Label>
                      <Row className="g-2">
                        <Col xs={7}>
                          <Form.Control
                            type="date"
                            value={typingTestForm.startDate}
                            onChange={(event) => setTypingTestForm(prev => ({ ...prev, startDate: event.target.value }))}
                            min={new Date().toISOString().split('T')[0]}
                            required
                            style={{
                              borderRadius: '10px',
                              border: '2px solid #e9ecef',
                              padding: '0.875rem 1rem',
                              fontSize: '0.95rem',
                              transition: 'all 0.3s ease',
                              background: 'white'
                            }}
                          />
                        </Col>
                        <Col xs={5}>
                          <Form.Control
                            type="time"
                            value={typingTestForm.startTime}
                            onChange={(event) => setTypingTestForm(prev => ({ ...prev, startTime: event.target.value }))}
                            required
                            style={{
                              borderRadius: '10px',
                              border: '2px solid #e9ecef',
                              padding: '0.875rem 1rem',
                              fontSize: '0.95rem',
                              transition: 'all 0.3s ease',
                              background: 'white'
                            }}
                          />
                        </Col>
                      </Row>
                      <Form.Text style={{ 
                        display: 'block',
                        marginTop: '0.5rem',
                        fontSize: '0.85rem',
                        color: '#6c757d'
                      }}>
                        When the test becomes available to candidates
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label style={{ 
                        fontWeight: '600', 
                        color: '#495057', 
                        marginBottom: '0.75rem',
                        fontSize: '0.95rem'
                      }}>
                        End Date & Time <small className="text-muted">(Optional)</small>
                      </Form.Label>
                      <Row className="g-2">
                        <Col xs={7}>
                          <Form.Control
                            type="date"
                            value={typingTestForm.endDate}
                            onChange={(event) => setTypingTestForm(prev => ({ ...prev, endDate: event.target.value }))}
                            min={typingTestForm.startDate || new Date().toISOString().split('T')[0]}
                            style={{
                              borderRadius: '10px',
                              border: '2px solid #e9ecef',
                              padding: '0.875rem 1rem',
                              fontSize: '0.95rem',
                              transition: 'all 0.3s ease',
                              background: 'white'
                            }}
                          />
                        </Col>
                        <Col xs={5}>
                          <Form.Control
                            type="time"
                            value={typingTestForm.endTime}
                            onChange={(event) => setTypingTestForm(prev => ({ ...prev, endTime: event.target.value }))}
                            disabled={!typingTestForm.endDate}
                            style={{
                              borderRadius: '10px',
                              border: '2px solid #e9ecef',
                              padding: '0.875rem 1rem',
                              fontSize: '0.95rem',
                              transition: 'all 0.3s ease',
                              background: typingTestForm.endDate ? 'white' : '#f8f9fa'
                            }}
                          />
                        </Col>
                      </Row>
                      <Form.Text style={{ 
                        display: 'block',
                        marginTop: '0.5rem',
                        fontSize: '0.85rem',
                        color: '#6c757d'
                      }}>
                        When the test expires (leave empty for no expiration)
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Assignment Success Alert */}
            {typingTestAssignmentDetails && (
              <Card className="mt-4 border-0 shadow-lg" style={{ 
                borderRadius: '12px', 
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%)',
                border: '2px solid #17a2b8'
              }}>
                <Card.Body style={{ padding: '1.5rem' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '1.2rem'
                    }}>
                      ✓
                    </div>
                    <div>
                      <h6 style={{ margin: 0, fontWeight: '700', color: '#0c5460', fontSize: '1.1rem' }}>
                        Typing Test Created Successfully!
                      </h6>
                      <small style={{ color: '#0c5460', opacity: 0.8 }}>
                        Test has been assigned to the candidate
                      </small>
                    </div>
                  </div>
                  
                  <div style={{
                    background: 'white',
                    borderRadius: '10px',
                    padding: '1rem',
                    marginBottom: '1rem',
                    border: '1px solid #bee5eb'
                  }}>
                    {(() => {
                      const candidate = candidates.find(c => c._id === typingTestAssignmentDetails.candidateId);
                      const candidateName = candidate?.user?.name || 'Candidate';
                      const frontendUrl = window.location.origin;
                      // Include candidate ID as query parameter (required for typing test)
                      const testLink = `${frontendUrl}/typing-test/${typingTestAssignmentDetails.testLink}?candidate=${typingTestAssignmentDetails.candidateId}`;
                      const durationText = typingTestAssignmentDetails.defaultDuration === 1 ? '1 minute' : '2 minutes';
                      
                      return (
                        <>
                          <div style={{ marginBottom: '0.75rem' }}>
                            <strong style={{ color: '#0c5460' }}>👤 Candidate:</strong>{' '}
                            <span style={{ color: '#495057', fontWeight: '500' }}>{candidateName}</span>
                          </div>
                          <div style={{ marginBottom: '0.75rem' }}>
                            <strong style={{ color: '#0c5460' }}>⌨️ Test:</strong>{' '}
                            <span style={{ color: '#495057', fontWeight: '500' }}>{typingTestAssignmentDetails.title}</span>
                          </div>
                          <div style={{ marginBottom: '0.75rem' }}>
                            <strong style={{ color: '#0c5460' }}>⏱️ Duration:</strong>{' '}
                            <span style={{ color: '#495057', fontWeight: '500' }}>{durationText}</span>
                          </div>
                          <div>
                            <strong style={{ color: '#0c5460' }}>🔗 Test Link:</strong>
                            <div style={{
                              background: '#f8f9fa',
                              borderRadius: '8px',
                              padding: '0.75rem',
                              marginTop: '0.5rem',
                              wordBreak: 'break-all',
                              fontSize: '0.9rem',
                              color: '#495057',
                              border: '1px solid #dee2e6',
                              fontFamily: 'monospace'
                            }}>
                              {testLink}
                            </div>
                            <small style={{ 
                              display: 'block',
                              marginTop: '0.5rem',
                              color: '#6c757d',
                              fontStyle: 'italic'
                            }}>
                              ⚠️ This link includes the candidate ID and can only be used by the assigned candidate.
                            </small>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <Button
                    variant="info"
                    onClick={copyTypingTestLink}
                    style={{
                      borderRadius: '10px',
                      fontWeight: '600',
                      padding: '0.75rem 1.5rem',
                      background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
                      border: 'none',
                      fontSize: '0.95rem',
                      width: '100%',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 15px rgba(23, 162, 184, 0.4)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(23, 162, 184, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(23, 162, 184, 0.4)';
                    }}
                  >
                    <FaCopy className="me-2" />
                    {typingTestCopySuccess ? '✓ Copied to Clipboard!' : '📋 Copy Test Link'}
                  </Button>
                </Card.Body>
              </Card>
            )}
          </Modal.Body>
          <Modal.Footer style={{
            background: 'white',
            borderTop: '2px solid #e9ecef',
            padding: '1.5rem 2rem',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '1rem'
          }}>
            <Button
              variant="secondary"
              onClick={closeTypingTestModal}
              disabled={typingTestSaving}
              style={{ 
                borderRadius: '10px', 
                fontWeight: '600',
                padding: '0.75rem 2rem',
                border: 'none',
                fontSize: '0.95rem',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {typingTestAssignmentDetails ? 'Close' : 'Cancel'}
            </Button>
            {!typingTestAssignmentDetails && (
              <Button
                type="submit"
                variant="info"
                disabled={typingTestSaving}
                style={{
                  borderRadius: '10px',
                  fontWeight: '600',
                  padding: '0.75rem 2rem',
                  background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
                  border: 'none',
                  fontSize: '0.95rem',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(23, 162, 184, 0.4)'
                }}
                onMouseEnter={(e) => {
                  if (!typingTestSaving) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(23, 162, 184, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(23, 162, 184, 0.4)';
                }}
              >
                {typingTestSaving ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Creating Test...
                  </>
                ) : (
                  <>
                    <FaCheckCircle className="me-2" />
                    Create & Assign Typing Test
                  </>
                )}
              </Button>
            )}
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default TestsManagement;
