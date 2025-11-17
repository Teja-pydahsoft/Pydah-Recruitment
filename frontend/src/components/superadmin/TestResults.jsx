import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Badge, Alert, Button, Modal, Form, Spinner, Image, Tabs, Tab } from 'react-bootstrap';
import { FaCheckCircle, FaEye, FaCamera, FaClipboardCheck, FaListUl } from 'react-icons/fa';
import api from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';

const CATEGORY_ORDER = ['teaching', 'non_teaching', 'uncategorized'];

// Convert 24-hour time to 12-hour format object
const convertTo12Hour = (time24) => {
  if (!time24) return { hour: 12, minute: 0, ampm: 'AM' };
  const [hours, minutes] = time24.split(':');
  const hour24 = parseInt(hours, 10);
  const minute = parseInt(minutes, 10) || 0;
  const hour12 = hour24 % 12 || 12;
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  return { hour: hour12, minute, ampm };
};

// Convert 12-hour format object to 24-hour time string
const convertTo24Hour = (hour12, minute, ampm) => {
  let hour24 = parseInt(hour12, 10);
  if (ampm === 'PM' && hour24 !== 12) {
    hour24 += 12;
  } else if (ampm === 'AM' && hour24 === 12) {
    hour24 = 0;
  }
  return `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

// Custom 12-hour time input component
const TimeInput12Hour = ({ value, onChange, style }) => {
  const time12 = convertTo12Hour(value);
  const [hour, setHour] = useState(time12.hour);
  const [minute, setMinute] = useState(time12.minute);
  const [ampm, setAmpm] = useState(time12.ampm);

  useEffect(() => {
    const time12 = convertTo12Hour(value);
    setHour(time12.hour);
    setMinute(time12.minute);
    setAmpm(time12.ampm);
  }, [value]);

  const handleHourChange = (e) => {
    const newHour = parseInt(e.target.value, 10);
    if (newHour >= 1 && newHour <= 12) {
      setHour(newHour);
      const time24 = convertTo24Hour(newHour, minute, ampm);
      onChange({ target: { value: time24 } });
    }
  };

  const handleMinuteChange = (e) => {
    const newMinute = parseInt(e.target.value, 10);
    if (newMinute >= 0 && newMinute <= 59) {
      setMinute(newMinute);
      const time24 = convertTo24Hour(hour, newMinute, ampm);
      onChange({ target: { value: time24 } });
    }
  };

  const handleAmpmChange = (e) => {
    const newAmpm = e.target.value;
    setAmpm(newAmpm);
    const time24 = convertTo24Hour(hour, minute, newAmpm);
    onChange({ target: { value: time24 } });
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', ...style }}>
      <select
        value={hour}
        onChange={handleHourChange}
        style={{
          padding: '0.75rem',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          fontSize: '1rem',
          fontWeight: '500'
        }}
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
          <option key={h} value={h}>{h.toString().padStart(2, '0')}</option>
        ))}
      </select>
      <span style={{ fontSize: '1.2rem', fontWeight: '600', color: '#374151' }}>:</span>
      <select
        value={minute}
        onChange={handleMinuteChange}
        style={{
          padding: '0.75rem',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          fontSize: '1rem',
          fontWeight: '500'
        }}
      >
        {Array.from({ length: 60 }, (_, i) => i).map(m => (
          <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
        ))}
      </select>
      <select
        value={ampm}
        onChange={handleAmpmChange}
        style={{
          padding: '0.75rem 1rem',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          fontSize: '1rem',
          fontWeight: '600',
          background: ampm === 'AM' ? '#eff6ff' : '#fef3c7',
          color: ampm === 'AM' ? '#1e40af' : '#92400e'
        }}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
      <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>
        IST
      </span>
    </div>
  );
};

const TestResults = ({ embedded = false, refreshToken = 0 }) => {
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
  const [detailedResult, setDetailedResult] = useState(null);
  const [showDetailedModal, setShowDetailedModal] = useState(false);
  const [loadingDetailed, setLoadingDetailed] = useState(false);
  const [activeCategory, setActiveCategory] = useState('teaching');

  const fetchTests = useCallback(async () => {
    setLoading(true);
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
            const { results = [], summary = null } = resultsResponse.data || {};
            return { ...test, results, summary };
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
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests, refreshToken]);

  const handleViewResults = async (testId, candidateId) => {
    setLoadingDetailed(true);
    setShowDetailedModal(true);
    try {
      const response = await api.get(`/tests/${testId}/results/${candidateId}`);
      setDetailedResult(response.data);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch detailed results');
      setShowDetailedModal(false);
    } finally {
      setLoadingDetailed(false);
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

  const groupedTests = useMemo(() => {
    const initial = {
      teaching: {},
      non_teaching: {},
      uncategorized: {}
    };

    tests.forEach((test) => {
      const rawCategory = test.form?.formCategory || test.form?.category || test.formCategory;
      const categoryKey = rawCategory === 'teaching' ? 'teaching' : rawCategory === 'non_teaching' ? 'non_teaching' : 'uncategorized';
      const jobRole = test.form?.position || test.form?.title || 'General Role';

      if (!initial[categoryKey][jobRole]) {
        initial[categoryKey][jobRole] = [];
      }

      initial[categoryKey][jobRole].push(test);
    });

    Object.keys(initial).forEach((categoryKey) => {
      const roleMap = initial[categoryKey];
      Object.keys(roleMap).forEach((role) => {
        roleMap[role] = roleMap[role]
          .slice()
          .sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0));
      });
    });

    return initial;
  }, [tests]);

  const categorySummary = useMemo(() => {
    const summary = {
      teaching: { tests: 0, candidates: 0 },
      non_teaching: { tests: 0, candidates: 0 },
      uncategorized: { tests: 0, candidates: 0 }
    };

    CATEGORY_ORDER.forEach((categoryKey) => {
      const roleMap = groupedTests[categoryKey] || {};
      const testsForCategory = Object.values(roleMap).flat();
      const candidateCount = testsForCategory.reduce((total, test) => total + (test.results?.length || 0), 0);

      summary[categoryKey] = {
        tests: testsForCategory.length,
        candidates: candidateCount
      };
    });

    return summary;
  }, [groupedTests]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (categorySummary[activeCategory]?.tests > 0) {
      return;
    }

    const fallbackCategory = CATEGORY_ORDER.find((categoryKey) => categorySummary[categoryKey]?.tests > 0);
    if (fallbackCategory && fallbackCategory !== activeCategory) {
      setActiveCategory(fallbackCategory);
    }
  }, [loading, categorySummary, activeCategory]);

  const getCategoryLabel = (categoryKey) => {
    if (categoryKey === 'teaching') {
      return 'Teaching';
    }
    if (categoryKey === 'non_teaching') {
      return 'Non-Teaching';
    }
    return 'Other';
  };

  const renderTestCard = (test) => {
    const summary = test.summary || {};
    const completedCount = summary.completed ?? (test.results?.length || 0);
    const passedCount = summary.passed ?? (test.results?.filter(r => r.passed).length || 0);
    const averageScore = summary.averageScore ?? (
      completedCount > 0
        ? test.results.reduce((total, r) => total + (r.percentage || 0), 0) / completedCount
        : 0
    );

    return (
      <Card key={test._id} className="mb-4 border-0 shadow-sm">
        <Card.Header className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center">
          <div>
            <h5 className="mb-1">{test.title}</h5>
            <small className="text-muted">
              {test.description || 'No description'} | Duration: {test.duration} minutes | Passing: {test.passingPercentage}% | Cutoff: {test.cutoffPercentage || test.passingPercentage}%
            </small>
          </div>
          <div className="d-flex gap-2 mt-3 mt-lg-0">
            <Badge bg="primary">{completedCount} Completed</Badge>
            <Badge bg="success">{passedCount} Passed</Badge>
            <Badge bg="info">{averageScore.toFixed(1)}% Avg</Badge>
          </div>
        </Card.Header>
        <Card.Body>
          {test.results.length === 0 ? (
            <Alert variant="info">No completed submissions yet.</Alert>
          ) : (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Candidate Name</th>
                  <th>Email</th>
                  <th>Job Role</th>
                  <th>Department</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Status</th>
                  <th>Completed At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {test.results.map((result, index) => {
                  const candidateForm = result.candidate.form || {};
                  const jobRole = candidateForm.position || test.form?.position || '—';
                  const department = candidateForm.department || test.form?.department || '—';
                  const categoryLabel = candidateForm.formCategory ? getCategoryLabel(candidateForm.formCategory) : null;
                  const candidateStatus = (result.candidate.status || '').toLowerCase();
                  const finalDecision = (result.candidate.finalDecision || '').toLowerCase();

                  const stageBadge = (() => {
                    if (finalDecision === 'selected' || candidateStatus === 'selected') {
                      return { label: 'Selected', variant: 'success' };
                    }
                    if (finalDecision === 'rejected' || candidateStatus === 'rejected') {
                      return { label: 'Rejected', variant: 'danger' };
                    }
                    if (finalDecision === 'on_hold' || candidateStatus === 'on_hold') {
                      return { label: 'On Hold', variant: 'warning' };
                    }
                    if (candidateStatus === 'shortlisted') {
                      return { label: 'Moved to Interview', variant: 'info' };
                    }
                    if (result.completedAt) {
                      return { label: 'Test Completed', variant: 'secondary' };
                    }
                    return null;
                  })();

                  const actionConfig = (() => {
                    if (finalDecision === 'selected' || candidateStatus === 'selected') {
                      return { type: 'status', label: 'Candidate Selected', variant: 'success' };
                    }
                    if (finalDecision === 'rejected' || candidateStatus === 'rejected') {
                      return { type: 'status', label: 'Candidate Rejected', variant: 'danger' };
                    }
                    if (finalDecision === 'on_hold' || candidateStatus === 'on_hold') {
                      return { type: 'status', label: 'Candidate On Hold', variant: 'warning' };
                    }
                    if (candidateStatus === 'shortlisted') {
                      return { type: 'status', label: 'Moved to Interview', variant: 'info' };
                    }
                    return { type: 'release', label: 'Release Results', variant: 'primary' };
                  })();

                  return (
                    <tr key={index}>
                      <td>
                        <div className="fw-semibold">{result.candidate.name}</div>
                        {categoryLabel && (
                          <small className="text-muted">{categoryLabel}</small>
                        )}
                      </td>
                      <td>{result.candidate.email}</td>
                      <td>{jobRole}</td>
                      <td>{department}</td>
                      <td>{result.score || 0}/{test.totalMarks || 0}</td>
                      <td>{result.percentage?.toFixed(1) || 0}%</td>
                      <td>
                        <Badge bg={result.passed ? 'success' : 'danger'}>
                          {result.passed ? 'Passed' : 'Failed'}
                        </Badge>
                        {result.suggestNextRound && (
                          <Badge bg="warning" className="ms-2">Suggested for Interview</Badge>
                        )}
                        {stageBadge && (
                          <Badge bg={stageBadge.variant} className="ms-2">
                            {stageBadge.label}
                          </Badge>
                        )}
                      </td>
                      <td>{result.completedAt ? new Date(result.completedAt).toLocaleString() : 'N/A'}</td>
                      <td>
                        <div className="d-flex flex-column flex-sm-row gap-2">
                          <Button
                            variant="info"
                            size="sm"
                            onClick={() => handleViewResults(test._id, result.candidate._id)}
                          >
                            <FaEye className="me-1" />
                            View Results
                          </Button>
                          {actionConfig.type === 'release' ? (
                            <Button
                              variant={actionConfig.variant}
                              size="sm"
                              onClick={() => handleReleaseResults(test, result)}
                            >
                              <FaCheckCircle className="me-1" />
                              {actionConfig.label}
                            </Button>
                          ) : (
                            <Button
                              variant={actionConfig.variant}
                              size="sm"
                              disabled
                              className="text-nowrap"
                            >
                              {actionConfig.label}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    );
  };

  const renderCategoryContent = (categoryKey) => {
    const roleMap = groupedTests[categoryKey] || {};
    const jobRoles = Object.keys(roleMap).sort((a, b) => a.localeCompare(b));

    if (jobRoles.length === 0) {
      return (
        <Alert variant="light" className="mb-0">
          No test results available for {getCategoryLabel(categoryKey)} roles yet.
        </Alert>
      );
    }

    return jobRoles.map((role) => {
      const testsForRole = roleMap[role];
      const roleDepartment = testsForRole[0]?.form?.department;
      const totalCandidates = testsForRole.reduce((sum, test) => sum + (test.results?.length || 0), 0);

      return (
        <Card key={`${categoryKey}-${role}`} className="mb-4 border-0 shadow-sm">
          <Card.Header className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center">
            <div>
              <h4 className="mb-1">{role}</h4>
              <small className="text-muted">
                {roleDepartment ? `${roleDepartment} • ` : ''}
                {getCategoryLabel(categoryKey)}
              </small>
            </div>
            <div className="d-flex gap-2 mt-3 mt-lg-0">
              <Badge bg="secondary">{testsForRole.length} {testsForRole.length === 1 ? 'Test' : 'Tests'}</Badge>
              <Badge bg="info">{totalCandidates} {totalCandidates === 1 ? 'Candidate' : 'Candidates'}</Badge>
            </div>
          </Card.Header>
          <Card.Body>
            {testsForRole.map(renderTestCard)}
          </Card.Body>
        </Card>
      );
    });
  };

  const content = (
    <>
      {embedded ? (
        <Row className="mb-3">
          <Col>
            <h4 className="mb-1">Test Results Overview</h4>
            <p className="text-muted mb-0">Review completed assessments and promote candidates.</p>
          </Col>
        </Row>
      ) : (
        <Row className="mb-4">
          <Col>
            <h2>Test Results</h2>
            <p>View all candidate test results and performance metrics.</p>
          </Col>
        </Row>
      )}

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
        <>
          <Row className="mb-4 g-3">
            {CATEGORY_ORDER.map((categoryKey) => {
              const summary = categorySummary[categoryKey];
              if (!summary || (categoryKey === 'uncategorized' && summary.tests === 0)) {
                return null;
              }

              return (
                <Col md={4} key={categoryKey}>
                  <Card className="h-100 border-0 shadow-sm">
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h6 className="text-muted text-uppercase mb-2">{getCategoryLabel(categoryKey)}</h6>
                          <h3 className="mb-0">{summary.tests}</h3>
                          <small className="text-muted">Tests with completed submissions</small>
                        </div>
                        <Badge bg="primary">
                          {summary.candidates} {summary.candidates === 1 ? 'Candidate' : 'Candidates'}
                        </Badge>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>

          <Tabs
            activeKey={activeCategory}
            onSelect={(key) => setActiveCategory(key || 'teaching')}
            className="mb-4"
          >
            <Tab
              eventKey="teaching"
              title={`Teaching (${categorySummary.teaching?.tests ?? 0})`}
            >
              <div className="pt-3">
                {renderCategoryContent('teaching')}
              </div>
            </Tab>
            <Tab
              eventKey="non_teaching"
              title={`Non-Teaching (${categorySummary.non_teaching?.tests ?? 0})`}
            >
              <div className="pt-3">
                {renderCategoryContent('non_teaching')}
              </div>
            </Tab>
            {categorySummary.uncategorized?.tests > 0 && (
              <Tab
                eventKey="uncategorized"
                title={`Other (${categorySummary.uncategorized.tests})`}
              >
                <div className="pt-3">
                  {renderCategoryContent('uncategorized')}
                </div>
              </Tab>
            )}
          </Tabs>
        </>
      )}
    </>
  );

  if (loading) {
    return embedded ? (
      <div className="py-5 text-center">
        <Spinner animation="border" />
        <p className="mt-2 text-muted">Loading test results...</p>
      </div>
    ) : (
      <LoadingSpinner message="Loading test results..." />
    );
  }

  if (embedded) {
    return (
      <div>
        {content}
      </div>
    );
  }

  return (
    <Container fluid className="super-admin-fluid">
      {content}

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
                  <Form.Label>Interview Time (IST - 12 Hour Format)</Form.Label>
                  <TimeInput12Hour
                    value={interviewTime || ''}
                    onChange={(e) => setInterviewTime(e.target.value)}
                    style={{ width: '100%' }}
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

      {/* Detailed Results Modal */}
      <Modal
        show={showDetailedModal}
        onHide={() => {
          setShowDetailedModal(false);
          setDetailedResult(null);
        }}
        size="xl"
        centered
        scrollable
        style={{ maxWidth: '98vw', width: '98vw' }}
        dialogClassName="test-results-modal"
      >
        <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderBottom: 'none' }}>
          <Modal.Title style={{ color: 'white', fontWeight: '600' }}>
            <FaEye className="me-2" />
            Detailed Test Results
            {detailedResult && (
              <small className="ms-2" style={{ opacity: 0.9 }}>
                - {detailedResult.candidate?.name || 'Candidate'}
              </small>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '1.5rem', background: '#f8f9fa', maxHeight: '85vh', overflowY: 'auto' }}>
          {loadingDetailed ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">Loading detailed results...</p>
            </div>
          ) : detailedResult ? (
            <div style={{ maxWidth: '100%' }}>
              {/* Test and Candidate Info */}
              <Row className="mb-4 g-3">
                <Col md={6}>
                  <Card className="h-100 border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)' }}>
                    <Card.Body style={{ padding: '1.25rem' }}>
                      <h6 className="text-muted mb-3 text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px', fontWeight: '600' }}>
                        <FaClipboardCheck className="me-2" />
                        Test Information
                      </h6>
                      <div style={{ lineHeight: '1.8' }}>
                        <p className="mb-2">
                          <strong style={{ color: '#495057', minWidth: '140px', display: 'inline-block' }}>Title:</strong>
                          <span style={{ color: '#212529' }}> {detailedResult.test?.title}</span>
                        </p>
                        <p className="mb-2">
                          <strong style={{ color: '#495057', minWidth: '140px', display: 'inline-block' }}>Duration:</strong>
                          <span style={{ color: '#212529' }}> {detailedResult.test?.duration} minutes</span>
                        </p>
                        <p className="mb-2">
                          <strong style={{ color: '#495057', minWidth: '140px', display: 'inline-block' }}>Total Marks:</strong>
                          <span style={{ color: '#212529' }}> {detailedResult.test?.totalMarks}</span>
                        </p>
                        <p className="mb-0">
                          <strong style={{ color: '#495057', minWidth: '140px', display: 'inline-block' }}>Passing %:</strong>
                          <span style={{ color: '#212529' }}> {detailedResult.test?.passingPercentage}%</span>
                        </p>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="h-100 border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #f093fb15 0%, #f5576c15 100%)' }}>
                    <Card.Body style={{ padding: '1.25rem' }}>
                      <h6 className="text-muted mb-3 text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px', fontWeight: '600' }}>
                        <FaCheckCircle className="me-2" />
                        Candidate Performance
                      </h6>
                      <div style={{ lineHeight: '1.8' }}>
                        <p className="mb-2">
                          <strong style={{ color: '#495057', minWidth: '140px', display: 'inline-block' }}>Name:</strong>
                          <span style={{ color: '#212529' }}> {detailedResult.candidate?.name}</span>
                        </p>
                        <p className="mb-2">
                          <strong style={{ color: '#495057', minWidth: '140px', display: 'inline-block' }}>Email:</strong>
                          <span style={{ color: '#212529' }}> {detailedResult.candidate?.email}</span>
                        </p>
                        <p className="mb-2">
                          <strong style={{ color: '#495057', minWidth: '140px', display: 'inline-block' }}>Score:</strong>
                          <span style={{ color: '#212529', fontWeight: '600' }}>
                            {detailedResult.result?.score || 0}/{detailedResult.result?.totalScore || 0}
                          </span>
                        </p>
                        <p className="mb-2">
                          <strong style={{ color: '#495057', minWidth: '140px', display: 'inline-block' }}>Percentage:</strong>
                          <span style={{ color: '#212529', fontWeight: '600', fontSize: '1.1rem' }}>
                            {detailedResult.result?.percentage?.toFixed(1) || 0}%
                          </span>
                        </p>
                        <p className="mb-0">
                          <strong style={{ color: '#495057', minWidth: '140px', display: 'inline-block' }}>Status:</strong>
                          <Badge 
                            bg={detailedResult.result?.passed ? 'success' : 'danger'} 
                            className="ms-2"
                            style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                          >
                            {detailedResult.result?.passed ? 'Passed' : 'Failed'}
                          </Badge>
                        </p>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Answers Summary */}
              <Card className="mb-4 border-0 shadow-sm">
                <Card.Header style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderBottom: 'none' }}>
                  <h5 className="mb-0" style={{ color: 'white', fontWeight: '600' }}>
                    <FaListUl className="me-2" />
                    Question-wise Answers
                  </h5>
                </Card.Header>
                <Card.Body style={{ padding: '1.5rem', background: '#ffffff' }}>
                  {detailedResult.result?.answers && detailedResult.result.answers.length > 0 ? (
                    <div style={{ width: '100%' }}>
                      {detailedResult.result.answers.map((answer, index) => (
                        <Card 
                          key={index} 
                          className="mb-3 border-0 shadow-sm" 
                          style={{ 
                            borderLeft: `5px solid ${answer.isCorrect ? '#10b981' : answer.isCorrect === false ? '#ef4444' : '#f59e0b'}`,
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            width: '100%'
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
                          <Card.Body style={{ padding: '1.25rem' }}>
                            <div className="d-flex justify-content-between align-items-start mb-3">
                              <h6 className="mb-0" style={{ color: '#212529', fontWeight: '600' }}>
                                Question {index + 1}
                              </h6>
                              <Badge 
                                bg={answer.isCorrect ? 'success' : answer.isCorrect === false ? 'danger' : 'warning'}
                                style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', fontWeight: '500' }}
                              >
                                {answer.isCorrect ? 'Correct' : answer.isCorrect === false ? 'Incorrect' : 'Pending'}
                              </Badge>
                            </div>
                            <p className="mb-3" style={{ lineHeight: '1.6', color: '#495057' }}>
                              <strong style={{ color: '#212529' }}>Question:</strong> {answer.questionText}
                            </p>
                            
                            {/* Options */}
                            {answer.options && answer.options.length > 0 && (
                              <div className="mb-3" style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px' }}>
                                <strong style={{ color: '#212529', display: 'block', marginBottom: '0.75rem' }}>Options:</strong>
                                <ul className="mb-0" style={{ listStyle: 'none', paddingLeft: 0 }}>
                                  {answer.options.map((option, optIdx) => {
                                    const isCandidateAnswer = answer.candidateAnswerFormatted?.index === optIdx || 
                                                              (Array.isArray(answer.candidateAnswerFormatted?.indices) && 
                                                               answer.candidateAnswerFormatted.indices.includes(optIdx));
                                    const isCorrectAnswer = answer.correctAnswerFormatted?.index === optIdx || 
                                                           (Array.isArray(answer.correctAnswerFormatted?.indices) && 
                                                            answer.correctAnswerFormatted.indices.includes(optIdx));
                                    return (
                                      <li 
                                        key={optIdx} 
                                        style={{ 
                                          padding: '0.5rem 0.75rem',
                                          marginBottom: '0.5rem',
                                          borderRadius: '6px',
                                          background: isCandidateAnswer ? '#e7f3ff' : isCorrectAnswer ? '#d1f2eb' : '#ffffff',
                                          border: isCandidateAnswer ? '1px solid #0d6efd' : isCorrectAnswer ? '1px solid #198754' : '1px solid #dee2e6',
                                          color: isCandidateAnswer ? '#0d6efd' : isCorrectAnswer ? '#198754' : '#495057',
                                          fontWeight: isCandidateAnswer || isCorrectAnswer ? '500' : '400'
                                        }}
                                      >
                                        <span style={{ fontWeight: '600', marginRight: '0.5rem' }}>
                                          {String.fromCharCode(65 + optIdx)}.
                                        </span>
                                        {option}
                                        {isCandidateAnswer && (
                                          <Badge bg="primary" className="ms-2" style={{ fontSize: '0.75rem' }}>Your Answer</Badge>
                                        )}
                                        {isCorrectAnswer && (
                                          <Badge bg="success" className="ms-2" style={{ fontSize: '0.75rem' }}>Correct</Badge>
                                        )}
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            )}

                            {/* Answers Display */}
                            <Row className="mb-3 g-3">
                              <Col md={6}>
                                <div style={{ background: '#fff3cd', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ffc107' }}>
                                  <p className="mb-0">
                                    <strong style={{ color: '#856404' }}>Your Answer:</strong>{' '}
                                    <span style={{ color: '#856404' }}>
                                      {answer.candidateAnswerFormatted?.display || 
                                       (typeof answer.candidateAnswer === 'number' && answer.options 
                                        ? `Option ${String.fromCharCode(65 + answer.candidateAnswer)}: ${answer.options[answer.candidateAnswer]}` 
                                        : answer.candidateAnswer) || 'Not answered'}
                                    </span>
                                  </p>
                                </div>
                              </Col>
                              <Col md={6}>
                                <div style={{ background: '#d1f2eb', padding: '0.75rem', borderRadius: '6px', border: '1px solid #198754' }}>
                                  <p className="mb-0">
                                    <strong style={{ color: '#0f5132' }}>Correct Answer:</strong>{' '}
                                    <span style={{ color: '#0f5132' }}>
                                      {answer.correctAnswerFormatted?.display || 
                                       (typeof answer.correctAnswer === 'number' && answer.options 
                                        ? `Option ${String.fromCharCode(65 + answer.correctAnswer)}: ${answer.options[answer.correctAnswer]}` 
                                        : answer.correctAnswer)}
                                    </span>
                                  </p>
                                </div>
                              </Col>
                            </Row>

                            {/* Marks and Time */}
                            <Row className="g-3">
                              <Col md={6}>
                                <div style={{ background: '#f8f9fa', padding: '0.75rem', borderRadius: '6px' }}>
                                  <p className="mb-0 text-muted">
                                    <strong>Marks:</strong>{' '}
                                    <span style={{ color: '#212529', fontWeight: '600' }}>
                                      {answer.marks || 0}/{answer.questionMarks || 0}
                                    </span>
                                  </p>
                                </div>
                              </Col>
                              <Col md={6}>
                                <div style={{ background: '#f8f9fa', padding: '0.75rem', borderRadius: '6px' }}>
                                  <p className="mb-0 text-muted">
                                    <strong>Time Taken:</strong>{' '}
                                    <span style={{ color: '#212529', fontWeight: '600' }}>
                                      {answer.timeTaken || 0} seconds
                                    </span>
                                  </p>
                                </div>
                              </Col>
                            </Row>
                          </Card.Body>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Alert variant="info">No answers found.</Alert>
                  )}
                </Card.Body>
              </Card>

              {/* Candidate Photos if available */}
              {detailedResult.result?.candidatePhotos && detailedResult.result.candidatePhotos.length > 0 && (
                <Card className="mb-4 border-0 shadow-sm">
                  <Card.Header style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderBottom: 'none' }}>
                    <h5 className="mb-0" style={{ color: 'white', fontWeight: '600' }}>
                      <FaCamera className="me-2" />
                      Candidate Photos ({detailedResult.result.candidatePhotos.length})
                    </h5>
                  </Card.Header>
                  <Card.Body style={{ padding: '1.5rem', background: '#ffffff' }}>
                    <Row className="g-3">
                      {detailedResult.result.candidatePhotos.map((photo, idx) => (
                        <Col md={6} key={idx}>
                          <Card className="border-0 shadow-sm" style={{ borderRadius: '10px', overflow: 'hidden' }}>
                            <Card.Body style={{ padding: '1rem' }}>
                              <p className="text-muted mb-2" style={{ fontWeight: '500', fontSize: '0.9rem' }}>
                                {photo.description || `Photo ${idx + 1}`}
                              </p>
                              {photo.url && (
                                <div style={{ 
                                  borderRadius: '8px', 
                                  overflow: 'hidden',
                                  border: '1px solid #e9ecef',
                                  background: '#f8f9fa',
                                  display: 'flex',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  minHeight: '200px'
                                }}>
                                  <Image 
                                    src={photo.url} 
                                    fluid 
                                    rounded 
                                    style={{ 
                                      maxHeight: '200px', 
                                      width: 'auto',
                                      maxWidth: '100%',
                                      objectFit: 'contain'
                                    }} 
                                  />
                                </div>
                              )}
                              {photo.timestamp && (
                                <small className="text-muted d-block mt-2" style={{ fontSize: '0.8rem' }}>
                                  {new Date(photo.timestamp).toLocaleString()}
                                </small>
                              )}
                            </Card.Body>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </Card.Body>
                </Card>
              )}
              {/* Legacy Screenshots if available (for backward compatibility) */}
              {detailedResult.result?.screenshots && detailedResult.result.screenshots.length > 0 && (
                <Card className="mb-4 border-0 shadow-sm">
                  <Card.Header style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderBottom: 'none' }}>
                    <h5 className="mb-0" style={{ color: 'white', fontWeight: '600' }}>
                      <FaCamera className="me-2" />
                      Screenshots ({detailedResult.result.screenshots.length})
                    </h5>
                  </Card.Header>
                  <Card.Body style={{ padding: '1.5rem', background: '#ffffff' }}>
                    <Row className="g-3">
                      {detailedResult.result.screenshots.map((screenshot, idx) => (
                        <Col md={6} key={idx}>
                          <Card className="border-0 shadow-sm" style={{ borderRadius: '10px', overflow: 'hidden' }}>
                            <Card.Body style={{ padding: '1rem' }}>
                              <p className="text-muted mb-2" style={{ fontWeight: '500', fontSize: '0.9rem' }}>
                                {screenshot.description || `Screenshot ${idx + 1}`}
                              </p>
                              {screenshot.url && (
                                <div style={{ 
                                  borderRadius: '8px', 
                                  overflow: 'hidden',
                                  border: '1px solid #e9ecef',
                                  background: '#f8f9fa',
                                  display: 'flex',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  minHeight: '200px'
                                }}>
                                  <Image 
                                    src={screenshot.url} 
                                    fluid 
                                    rounded 
                                    style={{ 
                                      maxHeight: '200px', 
                                      width: 'auto',
                                      maxWidth: '100%',
                                      objectFit: 'contain'
                                    }} 
                                  />
                                </div>
                              )}
                              {screenshot.timestamp && (
                                <small className="text-muted d-block mt-2" style={{ fontSize: '0.8rem' }}>
                                  {new Date(screenshot.timestamp).toLocaleString()}
                                </small>
                              )}
                            </Card.Body>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </Card.Body>
                </Card>
              )}
            </div>
          ) : (
            <Alert variant="warning">No detailed results available.</Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowDetailedModal(false);
            setDetailedResult(null);
          }}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default TestResults;

