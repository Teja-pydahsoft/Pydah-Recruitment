import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Table, Badge, Alert, Button, Modal, Form, InputGroup } from 'react-bootstrap';
import { FaKeyboard, FaSearch, FaEye, FaDownload } from 'react-icons/fa';
import api from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';

/**
 * TypingTestResults Component
 * Admin interface to view all typing test results for non-teaching candidates
 */
const TypingTestResults = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [typingTests, setTypingTests] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTestId, setFilterTestId] = useState('all');
  const [sortBy, setSortBy] = useState('submittedAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Fetch typing test results
  const fetchResults = async () => {
    setLoading(true);
    try {
      const response = await api.get('/typing-test/results');
      setResults(response.data.results || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch typing test results');
      console.error('Typing test results fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch typing tests for filter
  const fetchTypingTests = async () => {
    try {
      const response = await api.get('/typing-test');
      setTypingTests(response.data.typingTests || []);
    } catch (err) {
      console.error('Typing tests fetch error:', err);
    }
  };

  useEffect(() => {
    fetchResults();
    fetchTypingTests();
  }, []);

  // Filter and sort results
  const filteredAndSortedResults = useMemo(() => {
    let filtered = results;

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(result => {
        const name = result.candidate?.user?.name?.toLowerCase() || '';
        const email = result.candidate?.user?.email?.toLowerCase() || '';
        const candidateNumber = result.candidate?.candidateNumber?.toLowerCase() || '';
        return name.includes(term) || email.includes(term) || candidateNumber.includes(term);
      });
    }

    // Filter by typing test
    if (filterTestId !== 'all') {
      filtered = filtered.filter(result => 
        result.typingTest?._id?.toString() === filterTestId
      );
    }

    // Sort results
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
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
          aValue = a[sortBy] || 0;
          bValue = b[sortBy] || 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [results, searchTerm, filterTestId, sortBy, sortOrder]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (filteredAndSortedResults.length === 0) {
      return {
        total: 0,
        avgWpm: 0,
        avgAccuracy: 0,
        totalErrors: 0
      };
    }

    const total = filteredAndSortedResults.length;
    const avgWpm = filteredAndSortedResults.reduce((sum, r) => sum + (r.wpm || 0), 0) / total;
    const avgAccuracy = filteredAndSortedResults.reduce((sum, r) => sum + (r.accuracy || 0), 0) / total;
    const totalErrors = filteredAndSortedResults.reduce((sum, r) => sum + (r.totalErrors || 0), 0);

    return {
      total,
      avgWpm: Math.round(avgWpm * 10) / 10,
      avgAccuracy: Math.round(avgAccuracy * 10) / 10,
      totalErrors
    };
  }, [filteredAndSortedResults]);

  // Handle view details
  const handleViewDetails = (result) => {
    setSelectedResult(result);
    setShowDetailModal(true);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Candidate Name', 'Email', 'Candidate Number', 'Test Title', 'WPM', 'Accuracy (%)', 'Total Errors', 'Time Taken (s)', 'Duration (min)', 'Submitted At'];
    const rows = filteredAndSortedResults.map(result => [
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

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  // Get accuracy badge variant
  const getAccuracyBadge = (accuracy) => {
    if (accuracy >= 90) return 'success';
    if (accuracy >= 70) return 'warning';
    return 'danger';
  };

  // Get WPM badge variant
  const getWPMBadge = (wpm) => {
    if (wpm >= 40) return 'success';
    if (wpm >= 25) return 'warning';
    return 'danger';
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h2 className="mb-1">
                <FaKeyboard className="me-2" />
                Typing Test Results
              </h2>
              <p className="text-muted mb-0">View and manage typing test results for non-teaching candidates</p>
            </div>
            <Button variant="primary" onClick={handleExportCSV} disabled={filteredAndSortedResults.length === 0}>
              <FaDownload className="me-2" />
              Export CSV
            </Button>
          </div>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center h-100 border-0 shadow-sm">
            <Card.Body>
              <h6 className="text-muted text-uppercase mb-2" style={{ fontSize: '0.75rem' }}>
                Total Results
              </h6>
              <h3 className="mb-0 text-primary" style={{ fontWeight: '700', fontSize: '2rem' }}>
                {stats.total}
              </h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100 border-0 shadow-sm">
            <Card.Body>
              <h6 className="text-muted text-uppercase mb-2" style={{ fontSize: '0.75rem' }}>
                Average WPM
              </h6>
              <h3 className="mb-0 text-success" style={{ fontWeight: '700', fontSize: '2rem' }}>
                {stats.avgWpm}
              </h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100 border-0 shadow-sm">
            <Card.Body>
              <h6 className="text-muted text-uppercase mb-2" style={{ fontSize: '0.75rem' }}>
                Average Accuracy
              </h6>
              <h3 className="mb-0 text-info" style={{ fontWeight: '700', fontSize: '2rem' }}>
                {stats.avgAccuracy}%
              </h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100 border-0 shadow-sm">
            <Card.Body>
              <h6 className="text-muted text-uppercase mb-2" style={{ fontSize: '0.75rem' }}>
                Total Errors
              </h6>
              <h3 className="mb-0 text-danger" style={{ fontWeight: '700', fontSize: '2rem' }}>
                {stats.totalErrors}
              </h3>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={4}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by name, email, or candidate number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={3}>
              <Form.Select
                value={filterTestId}
                onChange={(e) => setFilterTestId(e.target.value)}
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
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="submittedAt">Sort by Date</option>
                <option value="wpm">Sort by WPM</option>
                <option value="accuracy">Sort by Accuracy</option>
                <option value="candidateName">Sort by Name</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Results Table */}
      <Card>
        <Card.Body>
          {filteredAndSortedResults.length === 0 ? (
            <Alert variant="info" className="text-center">
              {results.length === 0 
                ? 'No typing test results found.' 
                : 'No results match your filters.'}
            </Alert>
          ) : (
            <div className="table-responsive">
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Test</th>
                    <th>WPM</th>
                    <th>Accuracy</th>
                    <th>Errors</th>
                    <th>Time Taken</th>
                    <th>Duration</th>
                    <th>Submitted At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedResults.map((result, index) => (
                    <tr key={index}>
                      <td>
                        <div>
                          <strong>{result.candidate?.user?.name || 'N/A'}</strong>
                          <br />
                          <small className="text-muted">{result.candidate?.user?.email || 'N/A'}</small>
                          <br />
                          {result.candidate?.candidateNumber && (
                            <Badge bg="secondary">{result.candidate.candidateNumber}</Badge>
                          )}
                        </div>
                      </td>
                      <td>{result.typingTest?.title || 'N/A'}</td>
                      <td>
                        <Badge bg={getWPMBadge(result.wpm)}>
                          {result.wpm || 0} WPM
                        </Badge>
                      </td>
                      <td>
                        <Badge bg={getAccuracyBadge(result.accuracy)}>
                          {result.accuracy || 0}%
                        </Badge>
                      </td>
                      <td>{result.totalErrors || 0}</td>
                      <td>{result.timeTaken || 0}s</td>
                      <td>{result.duration || 0} min</td>
                      <td>{formatDate(result.submittedAt)}</td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleViewDetails(result)}
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
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Typing Test Result Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedResult && (
            <div>
              <Row className="mb-3">
                <Col md={6}>
                  <Card>
                    <Card.Header>Candidate Information</Card.Header>
                    <Card.Body>
                      <p><strong>Name:</strong> {selectedResult.candidate?.user?.name || 'N/A'}</p>
                      <p><strong>Email:</strong> {selectedResult.candidate?.user?.email || 'N/A'}</p>
                      <p><strong>Candidate Number:</strong> {selectedResult.candidate?.candidateNumber || 'N/A'}</p>
                      <p><strong>Position:</strong> {selectedResult.candidate?.form?.position || 'N/A'}</p>
                      <p><strong>Department:</strong> {selectedResult.candidate?.form?.department || 'N/A'}</p>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card>
                    <Card.Header>Test Information</Card.Header>
                    <Card.Body>
                      <p><strong>Test Title:</strong> {selectedResult.typingTest?.title || 'N/A'}</p>
                      <p><strong>Duration:</strong> {selectedResult.duration || 0} minute(s)</p>
                      <p><strong>Started At:</strong> {formatDate(selectedResult.startedAt)}</p>
                      <p><strong>Submitted At:</strong> {formatDate(selectedResult.submittedAt)}</p>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
              <Row>
                <Col>
                  <Card>
                    <Card.Header>Performance Metrics</Card.Header>
                    <Card.Body>
                      <Row>
                        <Col md={3} className="text-center mb-3">
                          <h4 className="text-primary">{selectedResult.wpm || 0}</h4>
                          <p className="text-muted mb-0">Words Per Minute</p>
                        </Col>
                        <Col md={3} className="text-center mb-3">
                          <h4 className="text-success">{selectedResult.accuracy || 0}%</h4>
                          <p className="text-muted mb-0">Accuracy</p>
                        </Col>
                        <Col md={3} className="text-center mb-3">
                          <h4 className="text-danger">{selectedResult.totalErrors || 0}</h4>
                          <p className="text-muted mb-0">Total Errors</p>
                        </Col>
                        <Col md={3} className="text-center mb-3">
                          <h4 className="text-info">{selectedResult.timeTaken || 0}s</h4>
                          <p className="text-muted mb-0">Time Taken</p>
                        </Col>
                      </Row>
                      <hr />
                      <Row>
                        <Col md={6}>
                          <p><strong>Total Characters:</strong> {selectedResult.totalCharacters || 0}</p>
                          <p><strong>Correct Characters:</strong> {selectedResult.correctCharacters || 0}</p>
                        </Col>
                        <Col md={6}>
                          <p><strong>Status:</strong> 
                            <Badge bg="success" className="ms-2">
                              {selectedResult.status || 'completed'}
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
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default TypingTestResults;

