import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Alert, Badge, Tabs, Tab, Form, Modal, Spinner } from 'react-bootstrap';
import api from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';

const TestsManagement = () => {
  // const { user } = useAuth(); // Temporarily unused for ESLint compliance
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bankQuestions, setBankQuestions] = useState([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [topicFilter, setTopicFilter] = useState('');
  const [newQuestion, setNewQuestion] = useState({ topic: '', subTopic: '', questionText: '', options: ['', ''], correctAnswer: 0, difficulty: 'medium', tags: '' });
  const [createTest, setCreateTest] = useState({ title: '', description: '', form: '', duration: 60, passingPercentage: 50, cutoffPercentage: 60, questionIds: [] });
  const [uploadPaper, setUploadPaper] = useState({ title: '', description: '', year: '', subject: '', topic: '', questionsJson: '' });
  const [prevPapers, setPrevPapers] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const response = await api.get('/tests');
      setTests(response.data.tests);
    } catch (error) {
      setError('Failed to fetch tests');
      console.error('Tests fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBank = async () => {
    setBankLoading(true);
    try {
      const response = await api.get('/tests/questions', { params: { topic: topicFilter } });
      setBankQuestions(response.data.questions || []);
    } catch (error) {
      console.error('Question bank fetch error:', error);
    } finally {
      setBankLoading(false);
    }
  };

  const fetchPrevPapers = async () => {
    try {
      const response = await api.get('/tests'); // placeholder: reuse tests list for now
      setPrevPapers([]);
    } catch (error) {
      console.error('Prev papers fetch error:', error);
    }
  };

  const addBankQuestion = async () => {
    setActionLoading(true);
    try {
      const payload = {
        ...newQuestion,
        options: newQuestion.options.filter(o => o.trim() !== ''),
        tags: newQuestion.tags ? newQuestion.tags.split(',').map(t => t.trim()) : []
      };
      const res = await api.post('/tests/questions', payload);
      setNewQuestion({ topic: '', subTopic: '', questionText: '', options: ['', ''], correctAnswer: 0, difficulty: 'medium', tags: '' });
      fetchBank();
    } catch (err) {
      console.error('Add question error:', err);
      setError(err.response?.data?.message || 'Failed to add question');
    } finally {
      setActionLoading(false);
    }
  };

  const createTestFromBank = async () => {
    setActionLoading(true);
    try {
      const payload = { ...createTest };
      const res = await api.post('/tests/create-from-bank', payload);
      setCreateTest({ title: '', description: '', form: '', duration: 60, passingPercentage: 50, cutoffPercentage: 60, questionIds: [] });
      fetchTests();
    } catch (err) {
      console.error('Create test from bank error:', err);
      setError(err.response?.data?.message || 'Failed to create test');
    } finally {
      setActionLoading(false);
    }
  };

  const uploadPreviousPaper = async () => {
    setActionLoading(true);
    try {
      const { title, description, year, subject, topic, questionsJson } = uploadPaper;
      const questions = JSON.parse(questionsJson);
      await api.post('/tests/previous-papers/upload', { title, description, year, subject, topic, questions });
      setUploadPaper({ title: '', description: '', year: '', subject: '', topic: '', questionsJson: '' });
      fetchPrevPapers();
    } catch (err) {
      console.error('Upload paper error:', err);
      setError(err.response?.data?.message || 'Failed to upload previous paper');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading tests..." />;
  }

  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>Tests Management</h2>
              <p>Create tests from question bank or upload previous papers. Configure cutoff.</p>
            </div>
          </div>
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

      <Tabs defaultActiveKey="tests" className="mb-3">
        <Tab eventKey="tests" title="All Tests">
          <Row>
            <Col>
              <Card>
                <Card.Header>
                  <h5>All Tests</h5>
                </Card.Header>
                <Card.Body>
                  {tests.length > 0 ? (
                    <Table striped bordered hover responsive>
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Duration</th>
                          <th>Passing %</th>
                          <th>Cutoff %</th>
                          <th>Status</th>
                          <th>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tests.map((test) => (
                          <tr key={test._id}>
                            <td>{test.title}</td>
                            <td>{test.duration} min</td>
                            <td>{test.passingPercentage}%</td>
                            <td>{test.cutoffPercentage ?? test.passingPercentage}%</td>
                            <td>
                              <Badge bg={test.isActive ? 'success' : 'secondary'}>
                                {test.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td>{new Date(test.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted">No tests found.</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
        <Tab eventKey="bank" title="Question Bank" onEnter={fetchBank}>
          <Row className="mb-3">
            <Col md={4}>
              <Form.Control
                placeholder="Filter by topic"
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
                onBlur={fetchBank}
              />
            </Col>
            <Col md="auto">
              <Button onClick={fetchBank} disabled={bankLoading}>{bankLoading ? 'Loading...' : 'Refresh'}</Button>
            </Col>
          </Row>
          <Row>
            <Col md={7}>
              <Card>
                <Card.Header>Questions</Card.Header>
                <Card.Body style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>Topic</th>
                        <th>Question</th>
                        <th>Options</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bankQuestions.map(q => (
                        <tr key={q._id}>
                          <td>{q.topic}</td>
                          <td>{q.questionText}</td>
                          <td>{q.options.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
            <Col md={5}>
              <Card>
                <Card.Header>Add Question</Card.Header>
                <Card.Body>
                  <Form>
                    <Form.Group className="mb-2">
                      <Form.Label>Topic</Form.Label>
                      <Form.Control value={newQuestion.topic} onChange={(e) => setNewQuestion({ ...newQuestion, topic: e.target.value })} />
                    </Form.Group>
                    <Form.Group className="mb-2">
                      <Form.Label>Subtopic</Form.Label>
                      <Form.Control value={newQuestion.subTopic} onChange={(e) => setNewQuestion({ ...newQuestion, subTopic: e.target.value })} />
                    </Form.Group>
                    <Form.Group className="mb-2">
                      <Form.Label>Question</Form.Label>
                      <Form.Control as="textarea" rows={3} value={newQuestion.questionText} onChange={(e) => setNewQuestion({ ...newQuestion, questionText: e.target.value })} />
                    </Form.Group>
                    <Form.Group className="mb-2">
                      <Form.Label>Options</Form.Label>
                      {newQuestion.options.map((opt, idx) => (
                        <Form.Control key={idx} className="mb-1" value={opt} onChange={(e) => {
                          const next = [...newQuestion.options]; next[idx] = e.target.value; setNewQuestion({ ...newQuestion, options: next });
                        }} />
                      ))}
                      <Button size="sm" variant="link" onClick={() => setNewQuestion({ ...newQuestion, options: [...newQuestion.options, ''] })}>+ Add option</Button>
                    </Form.Group>
                    <Form.Group className="mb-2">
                      <Form.Label>Correct Answer (index)</Form.Label>
                      <Form.Control type="number" value={newQuestion.correctAnswer} onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: Number(e.target.value) })} />
                    </Form.Group>
                    <Form.Group className="mb-2">
                      <Form.Label>Difficulty</Form.Label>
                      <Form.Select value={newQuestion.difficulty} onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: e.target.value })}>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Tags (comma separated)</Form.Label>
                      <Form.Control value={newQuestion.tags} onChange={(e) => setNewQuestion({ ...newQuestion, tags: e.target.value })} />
                    </Form.Group>
                    <Button onClick={addBankQuestion} disabled={actionLoading}>{actionLoading ? 'Saving...' : 'Add Question'}</Button>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
        <Tab eventKey="create" title="Create Test from Bank" onEnter={fetchBank}>
          <Card>
            <Card.Body>
              <Form>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Label>Title</Form.Label>
                      <Form.Control value={createTest.title} onChange={(e) => setCreateTest({ ...createTest, title: e.target.value })} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Label>Form ID</Form.Label>
                      <Form.Control value={createTest.form} onChange={(e) => setCreateTest({ ...createTest, form: e.target.value })} placeholder="RecruitmentForm ID" />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group className="mb-2">
                  <Form.Label>Description</Form.Label>
                  <Form.Control as="textarea" rows={2} value={createTest.description} onChange={(e) => setCreateTest({ ...createTest, description: e.target.value })} />
                </Form.Group>
                <Row>
                  <Col md={3}>
                    <Form.Group className="mb-2">
                      <Form.Label>Duration (min)</Form.Label>
                      <Form.Control type="number" value={createTest.duration} onChange={(e) => setCreateTest({ ...createTest, duration: Number(e.target.value) })} />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-2">
                      <Form.Label>Passing %</Form.Label>
                      <Form.Control type="number" value={createTest.passingPercentage} onChange={(e) => setCreateTest({ ...createTest, passingPercentage: Number(e.target.value) })} />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-2">
                      <Form.Label>Cutoff %</Form.Label>
                      <Form.Control type="number" value={createTest.cutoffPercentage} onChange={(e) => setCreateTest({ ...createTest, cutoffPercentage: Number(e.target.value) })} />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group className="mb-3">
                  <Form.Label>Select Questions</Form.Label>
                  <div style={{ maxHeight: '30vh', overflowY: 'auto', border: '1px solid #eee', borderRadius: 4, padding: 8 }}>
                    {bankQuestions.map(q => (
                      <Form.Check key={q._id} type="checkbox" id={`q-${q._id}`} label={`${q.topic}: ${q.questionText}`} checked={createTest.questionIds.includes(q._id)} onChange={(e) => {
                        const next = new Set(createTest.questionIds);
                        if (e.target.checked) next.add(q._id); else next.delete(q._id);
                        setCreateTest({ ...createTest, questionIds: Array.from(next) });
                      }} />
                    ))}
                  </div>
                </Form.Group>
                <Button onClick={createTestFromBank} disabled={actionLoading || createTest.questionIds.length === 0}>
                  {actionLoading ? 'Creating...' : 'Create Test'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Tab>
        <Tab eventKey="upload" title="Upload Previous Paper">
          <Card>
            <Card.Body>
              <Form>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Label>Title</Form.Label>
                      <Form.Control value={uploadPaper.title} onChange={(e) => setUploadPaper({ ...uploadPaper, title: e.target.value })} />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-2">
                      <Form.Label>Year</Form.Label>
                      <Form.Control value={uploadPaper.year} onChange={(e) => setUploadPaper({ ...uploadPaper, year: e.target.value })} />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-2">
                      <Form.Label>Subject</Form.Label>
                      <Form.Control value={uploadPaper.subject} onChange={(e) => setUploadPaper({ ...uploadPaper, subject: e.target.value })} />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Label>Topic</Form.Label>
                      <Form.Control value={uploadPaper.topic} onChange={(e) => setUploadPaper({ ...uploadPaper, topic: e.target.value })} />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group className="mb-3">
                  <Form.Label>Questions JSON</Form.Label>
                  <Form.Control as="textarea" rows={8} placeholder='[ { "questionText": "...", "options": ["A","B","C","D"], "correctAnswer": 0 } ]' value={uploadPaper.questionsJson} onChange={(e) => setUploadPaper({ ...uploadPaper, questionsJson: e.target.value })} />
                </Form.Group>
                <Button onClick={uploadPreviousPaper} disabled={actionLoading}>
                  {actionLoading ? 'Uploading...' : 'Upload'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default TestsManagement;
