import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Alert, Badge, Tabs, Tab, Form, Modal, Spinner, Image } from 'react-bootstrap';
import { FaDownload, FaUpload, FaUser, FaFileCsv } from 'react-icons/fa';
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
  const [actionLoading, setActionLoading] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [showConductTestModal, setShowConductTestModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [testDetails, setTestDetails] = useState({ title: '', description: '', duration: 60, passingPercentage: 50, cutoffPercentage: 60 });
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchTests();
    fetchApprovedCandidates();
  }, []);

  const fetchApprovedCandidates = async () => {
    setCandidatesLoading(true);
    try {
      const response = await api.get('/candidates');
      const approvedCandidates = response.data.candidates.filter(c => c.status === 'approved');
      setCandidates(approvedCandidates);
    } catch (error) {
      console.error('Candidates fetch error:', error);
    } finally {
      setCandidatesLoading(false);
    }
  };

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


  const downloadCSVTemplate = () => {
    // Proper CSV format with separate columns: Question, A, B, C, D, Answer
    const csvContent = `Question,A,B,C,D,Answer
"What is the next number in the sequence: 2, 4, 8, 16, ?",24,32,30,28,B
"If a train travels 120 km in 2 hours, what is its speed?",40 km/h,50 km/h,60 km/h,70 km/h,C`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'test_question_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVUpload = async () => {
    // Clear previous messages
    setError('');
    setSuccessMessage('');

    // Validate required fields
    if (!selectedCandidate) {
      setError('Please select a candidate');
      return;
    }

    if (!testDetails.title || !testDetails.title.trim()) {
      setError('Test Title is required');
      return;
    }

    if (!testDetails.duration || testDetails.duration <= 0) {
      setError('Duration must be greater than 0');
      return;
    }

    if (!testDetails.passingPercentage || testDetails.passingPercentage < 0 || testDetails.passingPercentage > 100) {
      setError('Passing Percentage must be between 0 and 100');
      return;
    }

    if (!testDetails.cutoffPercentage || testDetails.cutoffPercentage < 0 || testDetails.cutoffPercentage > 100) {
      setError('Cutoff Percentage must be between 0 and 100');
      return;
    }

    if (!csvFile) {
      setError('Please upload a CSV file');
      return;
    }

    // Validate file type
    if (!csvFile.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a valid CSV file');
      return;
    }

    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('csvFile', csvFile);
      formData.append('candidateId', selectedCandidate._id);
      formData.append('title', testDetails.title.trim());
      formData.append('description', testDetails.description.trim() || '');
      formData.append('duration', testDetails.duration.toString());
      formData.append('passingPercentage', testDetails.passingPercentage.toString());
      formData.append('cutoffPercentage', testDetails.cutoffPercentage.toString());

      const response = await api.post('/tests/conduct-from-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Success - show message and reset form
      setSuccessMessage(`Test "${testDetails.title}" has been created and notification sent to ${selectedCandidate.user?.name || 'the candidate'}`);
      
      // Reset form
      setShowConductTestModal(false);
      setCsvFile(null);
      setTestDetails({ title: '', description: '', duration: 60, passingPercentage: 50, cutoffPercentage: 60 });
      setSelectedCandidate(null);
      
      // Refresh data
      fetchTests();
      fetchApprovedCandidates();

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (err) {
      console.error('CSV upload error:', err);
      const errorMsg = err.response?.data?.message || 'Failed to create test and send notification. Please try again.';
      setError(errorMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const openConductTestModal = (candidate) => {
    setSelectedCandidate(candidate);
    setError(''); // Clear any previous errors
    setSuccessMessage(''); // Clear any previous success messages
    setCsvFile(null); // Reset file
    setTestDetails({ title: '', description: '', duration: 60, passingPercentage: 50, cutoffPercentage: 60 }); // Reset form
    setShowConductTestModal(true);
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
              <p>Manage tests and conduct assessments for approved candidates. Configure cutoff and pass percentages.</p>
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

      {successMessage && (
        <Row className="mb-3">
          <Col>
            <Alert variant="success" dismissible onClose={() => setSuccessMessage('')}>
              {successMessage}
            </Alert>
          </Col>
        </Row>
      )}

      <Tabs defaultActiveKey="candidates" className="mb-3">
        <Tab eventKey="candidates" title="Approved Candidates">
          <Row>
            <Col>
              <Card>
                <Card.Header>
                  <h5>Approved Candidates for Testing</h5>
                </Card.Header>
                <Card.Body>
                  {candidatesLoading ? (
                    <div className="text-center py-4">
                      <Spinner animation="border" />
                    </div>
                  ) : candidates.length === 0 ? (
                    <Alert variant="info">No approved candidates available for testing.</Alert>
                  ) : (
                    <Table striped bordered hover responsive>
                      <thead>
                        <tr>
                          <th style={{ width: '60px' }}>Photo</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Position</th>
                          <th>Department</th>
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
                            <td>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => openConductTestModal(candidate)}
                              >
                                Conduct Test
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
      </Tabs>

      {/* Conduct Test Modal */}
      <Modal
        show={showConductTestModal}
        onHide={() => {
          setShowConductTestModal(false);
          setError('');
          setCsvFile(null);
          setTestDetails({ title: '', description: '', duration: 60, passingPercentage: 50, cutoffPercentage: 60 });
          setSelectedCandidate(null);
        }}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Conduct Test - {selectedCandidate?.user?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Alert variant="danger" className="mb-3" dismissible onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          <Form>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Test Title <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    value={testDetails.title}
                    onChange={(e) => setTestDetails({ ...testDetails, title: e.target.value })}
                    placeholder="e.g., Technical Assessment Test"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Duration (minutes) <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="number"
                    value={testDetails.duration}
                    onChange={(e) => setTestDetails({ ...testDetails, duration: Number(e.target.value) })}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={testDetails.description}
                onChange={(e) => setTestDetails({ ...testDetails, description: e.target.value })}
                placeholder="Test description and instructions..."
              />
            </Form.Group>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Passing Percentage <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="number"
                    value={testDetails.passingPercentage}
                    onChange={(e) => setTestDetails({ ...testDetails, passingPercentage: Number(e.target.value) })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Cutoff Percentage <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="number"
                    value={testDetails.cutoffPercentage}
                    onChange={(e) => setTestDetails({ ...testDetails, cutoffPercentage: Number(e.target.value) })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <hr className="my-4" />

            <div className="mb-3">
              <h6>Question Paper Upload</h6>
              <div className="d-flex gap-2 mb-3">
                <Button variant="outline-primary" onClick={downloadCSVTemplate}>
                  <FaDownload className="me-2" />
                  Download CSV Template
                </Button>
              </div>
              <Form.Group>
                <Form.Label>Upload CSV File <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files[0])}
                />
                <Form.Text className="text-muted">
                  Format: Question, A, B, C, D, Answer (comma-separated CSV) or pipe-separated (|)
                </Form.Text>
              </Form.Group>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowConductTestModal(false);
              setError('');
              setCsvFile(null);
              setTestDetails({ title: '', description: '', duration: 60, passingPercentage: 50, cutoffPercentage: 60 });
              setSelectedCandidate(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCSVUpload}
            disabled={
              actionLoading || 
              !csvFile || 
              !testDetails.title?.trim() || 
              !testDetails.duration || 
              !testDetails.passingPercentage || 
              !testDetails.cutoffPercentage || 
              !selectedCandidate
            }
          >
            {actionLoading ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                Creating Test & Sending Notification...
              </>
            ) : (
              <>
                <FaUpload className="me-2" />
                Create Test & Send Notification
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default TestsManagement;
