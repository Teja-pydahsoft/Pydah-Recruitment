import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Alert, Button, Modal, Form, Spinner } from 'react-bootstrap';
import { FaCheckCircle, FaTimes, FaCalendarAlt } from 'react-icons/fa';
import api from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';

const TestResults = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTest, setSelectedTest] = useState(null);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [releaseAction, setReleaseAction] = useState('promote'); // 'promote' or 'reject'
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const response = await api.get('/tests');
      const testsWithResults = response.data.tests.filter(test => 
        test.candidates && test.candidates.some(c => c.status === 'completed')
      );
      
      // Fetch detailed results for each test
      const testsWithDetails = await Promise.all(
        testsWithResults.map(async (test) => {
          try {
            const resultsResponse = await api.get(`/tests/${test._id}/results`);
            return { ...test, results: resultsResponse.data.results || [] };
          } catch (err) {
            console.error(`Error fetching results for test ${test._id}:`, err);
            return { ...test, results: [] };
          }
        })
      );
      
      setTests(testsWithDetails);
    } catch (error) {
      setError('Failed to fetch test results');
      console.error('Test results fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseResults = (test, candidate) => {
    setSelectedTest(test);
    setSelectedCandidate(candidate);
    setShowReleaseModal(true);
    setReleaseAction('promote');
    setInterviewDate('');
    setInterviewTime('');
    setRejectReason('');
  };

  const handleReleaseSubmit = async () => {
    if (!selectedTest || !selectedCandidate) return;

    if (releaseAction === 'promote' && !interviewDate) {
      setError('Please select an interview date');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/tests/${selectedTest._id}/release-results`, {
        candidateId: selectedCandidate.candidate._id,
        promote: releaseAction === 'promote',
        interviewDate: releaseAction === 'promote' ? interviewDate : null,
        interviewTime: releaseAction === 'promote' ? interviewTime : null,
        rejectReason: releaseAction === 'reject' ? rejectReason : null
      });

      setShowReleaseModal(false);
      setSelectedTest(null);
      setSelectedCandidate(null);
      fetchTests(); // Refresh the list
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to release results');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'secondary',
      completed: 'info',
      passed: 'success',
      failed: 'danger'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  if (loading) {
    return <LoadingSpinner message="Loading test results..." />;
  }

  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <h2>Test Results</h2>
          <p>View all candidate test results and performance metrics.</p>
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

      {tests.length === 0 ? (
        <Alert variant="info">No test results available yet.</Alert>
      ) : (
        <Row>
          {tests.map((test) => (
            <Col md={12} key={test._id} className="mb-4">
              <Card>
                <Card.Header>
                  <h5>{test.title}</h5>
                  <small className="text-muted">
                    {test.description || 'No description'} | Duration: {test.duration} minutes | 
                    Passing: {test.passingPercentage}% | Cutoff: {test.cutoffPercentage || test.passingPercentage}%
                  </small>
                </Card.Header>
                <Card.Body>
                  {test.results.length === 0 ? (
                    <Alert variant="info">No completed submissions yet.</Alert>
                  ) : (
                    <>
                      <Table striped bordered hover responsive>
                        <thead>
                          <tr>
                            <th>Candidate Name</th>
                            <th>Email</th>
                            <th>Score</th>
                            <th>Percentage</th>
                            <th>Status</th>
                            <th>Completed At</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {test.results.map((result, index) => (
                            <tr key={index}>
                              <td>{result.candidate.name}</td>
                              <td>{result.candidate.email}</td>
                              <td>{result.score || 0}/{test.totalMarks || 0}</td>
                              <td>{result.percentage?.toFixed(1) || 0}%</td>
                              <td>
                                <Badge bg={result.passed ? 'success' : 'danger'}>
                                  {result.passed ? 'Passed' : 'Failed'}
                                </Badge>
                                {result.suggestNextRound && (
                                  <Badge bg="warning" className="ms-2">Suggested for Interview</Badge>
                                )}
                              </td>
                              <td>{result.completedAt ? new Date(result.completedAt).toLocaleString() : 'N/A'}</td>
                              <td>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleReleaseResults(test, result)}
                                >
                                  <FaCheckCircle className="me-1" />
                                  Release Results
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </>
                  )}
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Release Results Modal */}
      <Modal
        show={showReleaseModal}
        onHide={() => {
          setShowReleaseModal(false);
          setSelectedTest(null);
          setSelectedCandidate(null);
        }}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Release Test Results</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedCandidate && (
            <div className="mb-3">
              <h6>Candidate: {selectedCandidate.candidate.name}</h6>
              <p className="text-muted">{selectedCandidate.candidate.email}</p>
              <div className="mb-3">
                <strong>Score:</strong> {selectedCandidate.score || 0}/{selectedTest?.totalMarks || 0} | 
                <strong> Percentage:</strong> {selectedCandidate.percentage?.toFixed(1) || 0}%
              </div>
            </div>
          )}

          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Action</Form.Label>
              <div>
                <Form.Check
                  type="radio"
                  label="Promote to Interview"
                  name="releaseAction"
                  value="promote"
                  checked={releaseAction === 'promote'}
                  onChange={(e) => setReleaseAction(e.target.value)}
                />
                <Form.Check
                  type="radio"
                  label="Reject"
                  name="releaseAction"
                  value="reject"
                  checked={releaseAction === 'reject'}
                  onChange={(e) => setReleaseAction(e.target.value)}
                />
              </div>
            </Form.Group>

            {releaseAction === 'promote' && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Interview Date <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="date"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Interview Time</Form.Label>
                  <Form.Control
                    type="time"
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                  />
                </Form.Group>
              </>
            )}

            {releaseAction === 'reject' && (
              <Form.Group className="mb-3">
                <Form.Label>Rejection Reason (Optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Optional reason for rejection..."
                />
              </Form.Group>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowReleaseModal(false);
              setSelectedTest(null);
              setSelectedCandidate(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleReleaseSubmit}
            disabled={submitting || (releaseAction === 'promote' && !interviewDate)}
          >
            {submitting ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                Processing...
              </>
            ) : (
              <>
                <FaCheckCircle className="me-2" />
                {releaseAction === 'promote' ? 'Promote & Send Notification' : 'Reject & Send Notification'}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default TestResults;

