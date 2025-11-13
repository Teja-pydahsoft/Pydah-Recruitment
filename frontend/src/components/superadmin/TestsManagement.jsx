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
  FaDownload
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
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [bulkUploadState, setBulkUploadState] = useState({ file: null });
  const [bulkUploading, setBulkUploading] = useState(false);
  const [templateDownloading, setTemplateDownloading] = useState(false);

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
      <div>
        <div className="mb-4">
          <h5 className="mb-1">{profileData.personalDetails?.name || profileData.user?.name}</h5>
          {profileData.personalDetails?.email && (
            <div className="text-muted">{profileData.personalDetails.email}</div>
          )}
          {profileData.personalDetails?.phone && (
            <div className="text-muted">Phone: {profileData.personalDetails.phone}</div>
          )}
          <div className="text-muted">
            {profileData.form?.position || '—'}
            {profileData.form?.department ? ` • ${profileData.form.department}` : ''}
          </div>
          {profileData.workflow?.label && (
            <Badge bg="info" className="mt-2 text-uppercase">
              {profileData.workflow.label}
            </Badge>
          )}
        </div>

        <Row className="g-3 mb-4">
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h6 className="text-muted text-uppercase mb-2">Total Tests</h6>
                <h3 className="mb-0 text-primary">{totalTests}</h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h6 className="text-muted text-uppercase mb-2">Tests Passed</h6>
                <h3 className="mb-0 text-success">{passedTests}</h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h6 className="text-muted text-uppercase mb-2">Average Score</h6>
                <h3 className="mb-0 text-info">{averageScoreValue.toFixed(1)}%</h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <h6 className="text-muted text-uppercase mb-2">First Submission</h6>
                {firstSubmission ? (
                  <>
                    <div className="fw-semibold">{firstSubmission.testTitle || 'Assessment'}</div>
                    <small className="text-muted">{formatDateTime(firstSubmission.submittedAt)}</small>
                  </>
                ) : (
                  <p className="text-muted mb-0">Not submitted yet</p>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <h6 className="mb-2">Completed Tests</h6>
        {completedTests.length > 0 ? (
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
                      <td colSpan={6}>
                        <div className="p-3 bg-light rounded">
                          <div className="d-flex flex-wrap gap-3 mb-3">
                            <div><strong>Score:</strong> {scoreFormatter(test.score, test.totalScore)}</div>
                            <div><strong>Percentage:</strong> {percentageFormatter(test.percentage)}</div>
                            <div><strong>Started:</strong> {formatDateTime(test.startedAt)}</div>
                            <div><strong>Submitted:</strong> {formatDateTime(test.submittedAt)}</div>
                            {test.duration && (
                              <div><strong>Test Duration:</strong> {test.duration} minutes</div>
                            )}
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
                                    <td>{formatDateTime(answer.answeredAt)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                          ) : (
                            <Alert variant="info" className="mb-0">
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
          <Alert variant="info">No completed tests yet.</Alert>
        )}

        {assignments.length > 0 && (
          <div className="mt-4">
            <h6 className="mb-2">Assigned Tests</h6>
            <Table striped bordered hover responsive>
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
                {assignments.map(assignment => (
                  <tr key={assignment.testId}>
                    <td>{assignment.title}</td>
                    <td>{renderResultBadge(assignment.status)}</td>
                    <td>{formatDateTime(assignment.invitedAt)}</td>
                    <td>{formatDateTime(assignment.completedAt)}</td>
                    <td>{percentageFormatter(assignment.percentage)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
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

  const handleRefreshData = async () => {
    try {
      await Promise.all([fetchTopics(), fetchCandidates()]);
    } catch (error) {
      console.error('Refresh data error:', error);
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

      await api.post('/tests/questions', payload);
      setToast({ type: 'success', message: 'Question added to the bank.' });
      setQuestionForm(defaultQuestionForm);
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
    } catch (error) {
      console.error('Question delete error:', error);
      setToast({ type: 'danger', message: 'Unable to remove question.' });
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
    }
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

      await api.post('/tests/auto-generate', payload);
      setToast({ type: 'success', message: 'Assessment generated and assigned successfully.' });
      closeBuilderModal();
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
      const testsMeta = candidate.workflow?.tests || {};
      const testsCompletedCount = Number(testsMeta.completed) || 0;

      const matchesCategory = candidateFilters.category === 'all' || category === candidateFilters.category;
      const matchesPosition = candidateFilters.position === 'all' || position === candidateFilters.position;
      const matchesSearch =
        !search ||
        name.toLowerCase().includes(search) ||
        position.toLowerCase().includes(search) ||
        department.toLowerCase().includes(search);

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
      <Row className="mb-4">
        <Col>
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
            <div>
              <h2 className="mb-1">Assessments & Question Bank</h2>
              <p className="text-muted mb-0">
                Build reusable topics, curate MCQ banks, and launch assessments that match your recruitment workflow.
              </p>
            </div>
            <div className="d-flex gap-2">
              <Button variant="outline-secondary" onClick={handleRefreshData}>
                <FaSync className="me-2" />Refresh Data
              </Button>
              <Button variant="primary" onClick={() => openBuilderModal()}>
                <FaPlus className="me-2" />Quick Assessment
              </Button>
            </div>
          </div>
        </Col>
      </Row>

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
            <Col lg={4}>
              <div className="d-flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={candidateFilters.category === 'all' ? 'primary' : 'outline-primary'}
                  onClick={() => setCandidateFilters(prev => ({ ...prev, category: 'all' }))}
                >
                  All ({candidates.length})
                </Button>
                <Button
                  size="sm"
                  variant={candidateFilters.category === 'teaching' ? 'primary' : 'outline-primary'}
                  onClick={() => setCandidateFilters(prev => ({ ...prev, category: 'teaching' }))}
                >
                  Teaching ({categoryCounts.teaching})
                </Button>
                <Button
                  size="sm"
                  variant={candidateFilters.category === 'non_teaching' ? 'primary' : 'outline-primary'}
                  onClick={() => setCandidateFilters(prev => ({ ...prev, category: 'non_teaching' }))}
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
            <Col lg={3}>
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
                  placeholder="Search candidate, role, or department..."
                  value={candidateFilters.search}
                  onChange={(event) => setCandidateFilters(prev => ({ ...prev, search: event.target.value }))}
                />
                <Button
                  variant="outline-secondary"
                  onClick={() => {
                    setCandidateFilters({ category: 'all', position: 'all', search: '' });
                    setTestStatusFilter('all');
                  }}
                >
                  Reset
                </Button>
              </InputGroup>
            </Col>
          </Row>
          <Row className="g-4">
            <Col lg={12}>
              <Card className="h-100">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-0">Approved Candidate Pool</h5>
                    <small className="text-muted">Launch topic-driven assessments directly</small>
                  </div>
                  <Badge bg="primary">{filteredAssessmentCandidates.length}</Badge>
                </Card.Header>
                <Card.Body style={{ maxHeight: '420px', overflowY: 'auto' }}>
                  {candidatesLoading ? (
                    <div className="text-center py-4">
                      <Spinner animation="border" />
                    </div>
                  ) : filteredAssessmentCandidates.length === 0 ? (
                    <Alert variant="light">No candidates match the current filters.</Alert>
                  ) : (
                    <Table responsive striped hover size="sm">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Candidate ID</th>
                          <th>Position</th>
                          <th>Department</th>
                          <th>Stage</th>
                          <th className="text-end">Actions</th>
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
                <h5 className="mb-1">Reusable Question Topics</h5>
                <span className="text-muted">Organise MCQ templates by department & stream</span>
              </div>
              <Button onClick={() => openTopicModal()}>
                <FaPlus className="me-2" />Add Topic
              </Button>
            </Col>
          </Row>
          <Row className="g-4">
            {CATEGORY_OPTIONS.map(category => {
              const items = topicsByCategory[category.value] || [];
              return (
                <Col key={category.value} md={6}>
                  <Card className="h-100">
                    <Card.Header className="d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center gap-2">
                        <FaLayerGroup />
                        <span>{category.label}</span>
                      </div>
                      <Badge bg="secondary">{items.length}</Badge>
                    </Card.Header>
                    <Card.Body style={{ maxHeight: '420px', overflowY: 'auto' }}>
                      {topicsLoading ? (
                        <div className="text-center py-4">
                          <Spinner animation="border" size="sm" />
                        </div>
                      ) : items.length === 0 ? (
                        <Alert variant="light" className="mb-0">No topics created yet.</Alert>
                      ) : (
                        items.map(topic => (
                          <Card key={topic._id} className="mb-3 shadow-sm">
                            <Card.Body>
                              <div className="d-flex justify-content-between align-items-start">
                                <div>
                                  <h6 className="mb-1">{topic.name}</h6>
                                  {topic.description && (
                                    <p className="text-muted mb-1" style={{ fontSize: '0.9rem' }}>{topic.description}</p>
                                  )}
                                  <Badge bg="info" className="me-2">
                                    <FaListUl className="me-1" />{topic.questionCount || 0} questions
                                  </Badge>
                                  <Badge bg={topic.isActive ? 'success' : 'secondary'}>
                                    {topic.isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                                </div>
                                <div className="d-flex flex-column gap-2">
                                  <Button variant="outline-secondary" size="sm" onClick={() => openTopicModal(topic)}>
                                    <FaEdit className="me-1" />Edit
                                  </Button>
                                  <Button
                                    variant={topic.isActive ? 'outline-danger' : 'outline-success'}
                                    size="sm"
                                    onClick={() => handleToggleTopicActive(topic)}
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
                  setBulkUploadState({ file: null });
                  setBulkModalVisible(true);
                }}
              >
                <FaUpload className="me-2" />Bulk Upload (Excel)
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
              <Card className="h-100">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-0">Question Library</h5>
                    <small className="text-muted">Curated MCQs grouped by topics</small>
                  </div>
                  <Button variant="outline-secondary" size="sm" onClick={fetchQuestions}>
                    <FaSync className="me-2" />Refresh
                  </Button>
                </Card.Header>
                <Card.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
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
                          <th>Question</th>
                          <th>Topic</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {questions.map(question => (
                          <tr key={question._id}>
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
                            <td className="text-end">
                              <Button variant="outline-danger" size="sm" onClick={() => handleDeleteQuestion(question._id)}>
                                <FaTrash />
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
      <Modal show={profileModalVisible} onHide={closeProfileModal} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Candidate Test Overview</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {profileLoading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
            </div>
          ) : (
            renderCandidateProfileContent()
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeProfileModal} disabled={profileLoading}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Assessment Builder Modal */}
      <Modal show={builderModalVisible} onHide={closeBuilderModal} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Build Topic-Based Assessment</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleGenerateAssessment}>
          <Modal.Body>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Assign to Candidate<span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    value={builderState.candidateId}
                    onChange={(event) => setBuilderState(prev => ({ ...prev, candidateId: event.target.value }))}
                    required
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
                  <Form.Label>Assessment Title<span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    value={builderState.title}
                    onChange={(event) => setBuilderState(prev => ({ ...prev, title: event.target.value }))}
                    placeholder="e.g., CSE Technical Screening"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Duration (minutes)<span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="number"
                    min={10}
                    value={builderState.duration}
                    onChange={(event) => setBuilderState(prev => ({ ...prev, duration: Number(event.target.value) }))}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Passing %</Form.Label>
                  <Form.Control
                    type="number"
                    min={0}
                    max={100}
                    value={builderState.passingPercentage}
                    onChange={(event) => setBuilderState(prev => ({ ...prev, passingPercentage: Number(event.target.value) }))}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Cutoff %</Form.Label>
                  <Form.Control
                    type="number"
                    min={0}
                    max={100}
                    value={builderState.cutoffPercentage}
                    onChange={(event) => setBuilderState(prev => ({ ...prev, cutoffPercentage: Number(event.target.value) }))}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={builderState.description}
                onChange={(event) => setBuilderState(prev => ({ ...prev, description: event.target.value }))}
                placeholder="Purpose and overview of the assessment"
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>Candidate Instructions</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={builderState.instructions}
                onChange={(event) => setBuilderState(prev => ({ ...prev, instructions: event.target.value }))}
                placeholder="Any instructions to show before the assessment begins"
              />
            </Form.Group>

            <Card className="mb-3">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="mb-0">Topic Mix</h6>
                  <small className="text-muted">Total Questions: {totalSelectedQuestions}</small>
                </div>
                <Button variant="outline-primary" size="sm" onClick={addBuilderSelection}>
                  <FaPlus className="me-1" />Add Topic
                </Button>
              </Card.Header>
              <Card.Body className="p-3">
                {builderState.selections.map((selection, index) => {
                  const topic = getTopicById(selection.topicId);
                  const available = topic?.questionCount || 0;
                  return (
                    <Row className="align-items-end mb-3" key={index}>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Topic<span className="text-danger">*</span></Form.Label>
                          <Form.Select
                            value={selection.topicId}
                            onChange={(event) => updateBuilderSelection(index, 'topicId', event.target.value)}
                            required
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
                          <Form.Label>Question Count<span className="text-danger">*</span></Form.Label>
                          <Form.Control
                            type="number"
                            min={1}
                            value={selection.questionCount}
                            onChange={(event) => updateBuilderSelection(index, 'questionCount', Number(event.target.value))}
                            required
                          />
                          {selection.topicId && (
                            <Form.Text className={available < selection.questionCount ? 'text-danger' : 'text-muted'}>
                              {available} available in bank
                            </Form.Text>
                          )}
                        </Form.Group>
                      </Col>
                      <Col md={2} className="text-end">
                        {builderState.selections.length > 1 && (
                          <Button variant="outline-danger" onClick={() => removeBuilderSelection(index)}>
                            <FaTrash />
                          </Button>
                        )}
                      </Col>
                    </Row>
                  );
                })}
              </Card.Body>
            </Card>
          </Modal.Body>
          <Modal.Footer className="d-flex justify-content-between align-items-center">
            <div className="text-muted d-flex align-items-center gap-2">
              <FaClipboardCheck />
              <span>{totalSelectedQuestions} question(s) will be included.</span>
            </div>
            <div className="d-flex gap-2">
              <Button variant="secondary" onClick={closeBuilderModal} disabled={builderSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={builderSaving}>
                {builderSaving ? <Spinner animation="border" size="sm" className="me-2" /> : <FaCheckCircle className="me-2" />}Generate Assessment
              </Button>
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
          }
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Add MCQ</Modal.Title>
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
              }}
              disabled={questionSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={questionSaving}>
              {questionSaving ? <Spinner animation="border" size="sm" className="me-2" /> : <FaPlus className="me-2" />}
              {questionSaving ? 'Saving...' : 'Add Question'}
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
            setBulkUploadState({ file: null });
          }
        }}
        centered
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
            setBulkUploading(true);
            try {
              const formData = new FormData();
              formData.append('file', bulkUploadState.file);
              const response = await api.post('/tests/questions/bulk-upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
              });
              const { message } = response.data || {};
              setToast({ type: 'success', message: message || 'Questions uploaded successfully.' });
              setBulkUploadState({ file: null });
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
                setBulkUploadState({ file: null });
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
    </Container>
  );
};

export default TestsManagement;
