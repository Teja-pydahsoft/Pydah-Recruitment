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
  InputGroup
} from 'react-bootstrap';
import {
  FaPlus,
  FaLayerGroup,
  FaListUl,
  FaFilter,
  FaEdit,
  FaTrash,
  FaSync,
  FaSearch,
  FaClipboardCheck,
  FaCheckCircle,
  FaUpload
} from 'react-icons/fa';
import api from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';

const CATEGORY_OPTIONS = [
  { value: 'teaching', label: 'Teaching' },
  { value: 'non_teaching', label: 'Non-Teaching' }
];

const DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard'];

const defaultQuestionForm = {
  topicId: '',
  subTopic: '',
  questionText: '',
  options: ['', ''],
  correctAnswer: 0,
  difficulty: 'medium',
  tags: '',
  explanation: ''
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

  const [tests, setTests] = useState([]);

  const [topics, setTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicModalVisible, setTopicModalVisible] = useState(false);
  const [topicSaving, setTopicSaving] = useState(false);
  const [topicForm, setTopicForm] = useState({ id: null, name: '', category: 'teaching', description: '', isActive: true });

  const [questionFilters, setQuestionFilters] = useState({ category: 'all', topicId: 'all', search: '', includeInactive: false });
  const [questionLoading, setQuestionLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [questionForm, setQuestionForm] = useState(defaultQuestionForm);
  const [questionSaving, setQuestionSaving] = useState(false);
  const [questionModalVisible, setQuestionModalVisible] = useState(false);
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [bulkUploadState, setBulkUploadState] = useState({ topicId: '', file: null });
  const [bulkUploading, setBulkUploading] = useState(false);

  const [candidates, setCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);

  const [builderModalVisible, setBuilderModalVisible] = useState(false);
  const [builderSaving, setBuilderSaving] = useState(false);
  const [builderState, setBuilderState] = useState(defaultBuilderState);

  const [toast, setToast] = useState({ type: '', message: '' });
  const [candidateFilters, setCandidateFilters] = useState({ category: 'all', position: 'all', search: '' });

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await Promise.all([fetchTests(), fetchTopics(), fetchCandidates()]);
      } catch (error) {
        console.error('Initial load error', error);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const fetchTests = async () => {
    try {
      const response = await api.get('/tests');
      setTests(response.data.tests || []);
    } catch (error) {
      console.error('Tests fetch error:', error);
      setToast({ type: 'danger', message: 'Unable to load assessments. Please try again later.' });
    }
  };

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

      if (questionFilters.category !== 'all') {
        params.category = questionFilters.category;
      }
      if (questionFilters.topicId !== 'all') {
        params.topicId = questionFilters.topicId;
      }
      if (questionFilters.includeInactive) {
        params.includeInactive = 'true';
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
        difficulty: questionForm.difficulty,
        tags: questionForm.tags ? questionForm.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        explanation: questionForm.explanation?.trim() || undefined
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
      fetchTests();
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

      const matchesCategory = candidateFilters.category === 'all' || category === candidateFilters.category;
      const matchesPosition = candidateFilters.position === 'all' || position === candidateFilters.position;
      const matchesSearch =
        !search ||
        name.toLowerCase().includes(search) ||
        position.toLowerCase().includes(search) ||
        department.toLowerCase().includes(search);

      return matchesCategory && matchesPosition && matchesSearch;
    });
  }, [candidates, candidateFilters]);

  const getTopicById = (topicId) => topics.find(topic => topic._id === topicId);

  if (loading) {
    return <LoadingSpinner message="Loading assessment workspace..." />;
  }

  return (
    <Container>
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
              <Button variant="outline-secondary" onClick={() => fetchTests()}>
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
            <Col lg={5}>
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
                  onClick={() => setCandidateFilters({ category: 'all', position: 'all', search: '' })}
                >
                  Reset
                </Button>
              </InputGroup>
            </Col>
          </Row>
          <Row className="g-4">
            <Col lg={6}>
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
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAssessmentCandidates.map(candidate => (
                          <tr key={candidate._id}>
                            <td>{candidate.user?.name}</td>
                            <td>{candidate.candidateNumber || '—'}</td>
                            <td>{candidate.form?.position}</td>
                            <td>{candidate.form?.department}</td>
                            <td className="text-end">
                              <Button size="sm" onClick={() => openBuilderModal(candidate)}>
                                Build Assessment
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
            <Col lg={6}>
              <Card className="h-100">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-0">Recent Assessments</h5>
                    <small className="text-muted">Generated tests and their origin</small>
                  </div>
                  <Badge bg="info">{tests.length}</Badge>
                </Card.Header>
                <Card.Body style={{ maxHeight: '420px', overflowY: 'auto' }}>
                  {tests.length === 0 ? (
                    <Alert variant="light">No assessments created yet.</Alert>
                  ) : (
                    <Table responsive striped hover size="sm">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Duration</th>
                          <th>Source</th>
                          <th>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tests.map(test => (
                          <tr key={test._id}>
                            <td>{test.title}</td>
                            <td>{test.duration} min</td>
                            <td>
                              <Badge bg={test.questionSource === 'bank' ? 'success' : test.questionSource === 'uploaded' ? 'warning' : 'secondary'}>
                                {test.questionSource === 'bank' ? 'Question Bank' : test.questionSource === 'uploaded' ? 'CSV Upload' : 'Manual'}
                              </Badge>
                            </td>
                            <td>{new Date(test.createdAt).toLocaleDateString()}</td>
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
          <Row className="mb-3 g-3">
            <Col md={4}>
              <Form.Select
                value={questionFilters.category}
                onChange={(event) => setQuestionFilters(prev => ({ ...prev, category: event.target.value, topicId: 'all' }))}
              >
                <option value="all">All Categories</option>
                {CATEGORY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Select
                value={questionFilters.topicId}
                onChange={(event) => setQuestionFilters(prev => ({ ...prev, topicId: event.target.value }))}
              >
                <option value="all">All Topics</option>
                {topics
                  .filter(topic => questionFilters.category === 'all' || topic.category === questionFilters.category)
                  .map(topic => (
                    <option key={topic._id} value={topic._id}>
                      {topic.name} {topic.questionCount ? `(${topic.questionCount})` : ''}
                    </option>
                  ))}
              </Form.Select>
            </Col>
            <Col md={4}>
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
            <Col md={4} className="d-flex align-items-center gap-2">
              <Form.Check
                type="switch"
                id="include-inactive"
                label="Include inactive"
                checked={questionFilters.includeInactive}
                onChange={(event) => setQuestionFilters(prev => ({ ...prev, includeInactive: event.target.checked }))}
              />
              <Button variant="outline-secondary" size="sm" onClick={fetchQuestions}>
                <FaFilter className="me-2" />Apply Filters
              </Button>
            </Col>
            <Col md={4} className="d-flex justify-content-md-end align-items-center gap-2">
              <Button variant="outline-primary" size="sm" onClick={() => { setBulkUploadState({ topicId: '', file: null }); setBulkModalVisible(true); }}>
                <FaUpload className="me-2" />Bulk Upload (Excel)
              </Button>
              <Button variant="primary" size="sm" onClick={() => { setQuestionForm(defaultQuestionForm); setQuestionModalVisible(true); }}>
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
                    <Table responsive hover>
                      <thead>
                        <tr>
                          <th>Question</th>
                          <th>Topic</th>
                          <th>Difficulty</th>
                          <th>Actions</th>
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
                            <td><Badge bg="secondary">{question.difficulty || 'medium'}</Badge></td>
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

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
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
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Tags</Form.Label>
                  <Form.Control
                    placeholder="Comma separated"
                    value={questionForm.tags}
                    onChange={(event) => setQuestionForm(prev => ({ ...prev, tags: event.target.value }))}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Explanation (optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={questionForm.explanation}
                onChange={(event) => setQuestionForm(prev => ({ ...prev, explanation: event.target.value }))}
              />
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
            setBulkUploadState({ topicId: '', file: null });
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
              if (bulkUploadState.topicId) {
                formData.append('topicId', bulkUploadState.topicId);
              }
              const response = await api.post('/tests/questions/bulk-upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
              });
              const { message } = response.data || {};
              setToast({ type: 'success', message: message || 'Questions uploaded successfully.' });
              setBulkUploadState({ topicId: '', file: null });
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
              Upload an Excel sheet with columns like <strong>Question, OptionA, OptionB, OptionC, OptionD, CorrectAnswer</strong>.
              Optionally include <strong>Difficulty</strong>, <strong>Explanation</strong>, and <strong>Tags</strong>.
            </Alert>
            <Form.Group className="mb-3">
              <Form.Label>Topic</Form.Label>
              <Form.Select
                value={bulkUploadState.topicId}
                onChange={(event) => setBulkUploadState(prev => ({ ...prev, topicId: event.target.value }))}
              >
                <option value="">Use topic from spreadsheet</option>
                {activeTopicOptions.map(topic => (
                  <option key={topic._id} value={topic._id}>
                    {topic.name} ({topic.category === 'teaching' ? 'Teaching' : 'Non-Teaching'})
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Leave blank if the spreadsheet includes a <em>Topic</em> column for each row.
              </Form.Text>
            </Form.Group>
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
                setBulkUploadState({ topicId: '', file: null });
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
