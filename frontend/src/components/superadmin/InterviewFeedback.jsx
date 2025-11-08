import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Badge, Alert, Form, ButtonGroup, ToggleButton } from 'react-bootstrap';
import api from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';

const InterviewFeedback = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('teaching');
  const [selectedRole, setSelectedRole] = useState('all');

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const response = await api.get('/candidates');
      // Filter candidates who have interview feedback and fetch full profile for each
      const candidatesWithFeedback = response.data.candidates.filter(c => 
        c.interviewFeedback && c.interviewFeedback.length > 0
      );
      
      // Fetch full profile for each candidate to get detailed feedback
      const candidatesWithDetails = await Promise.all(
        candidatesWithFeedback.map(async (candidate) => {
          try {
            const profileResponse = await api.get(`/candidates/${candidate._id}`);
            return profileResponse.data.candidate;
          } catch (err) {
            console.error(`Error fetching profile for ${candidate._id}:`, err);
            return candidate;
          }
        })
      );
      
      setCandidates(candidatesWithDetails);
    } catch (error) {
      setError('Failed to fetch interview feedback');
      console.error('Interview feedback fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (recommendation) => {
    const variants = {
      strong_reject: 'danger',
      reject: 'warning',
      neutral: 'secondary',
      accept: 'info',
      strong_accept: 'success'
    };
    return <Badge bg={variants[recommendation] || 'secondary'}>{recommendation?.replace('_', ' ')}</Badge>;
  };

  const teachingCount = useMemo(
    () => candidates.filter(c => c.form?.formCategory === 'teaching').length,
    [candidates]
  );
  const nonTeachingCount = useMemo(
    () => candidates.filter(c => c.form?.formCategory === 'non_teaching').length,
    [candidates]
  );

  const roleOptions = useMemo(() => {
    const roles = new Set();
    candidates.forEach(candidate => {
      const category = candidate.form?.formCategory || 'other';
      if (activeTab === 'all' || category === activeTab) {
        const roleKey = `${candidate.form?.position || ''} - ${candidate.form?.department || ''}`;
        if (roleKey.trim()) {
          roles.add(roleKey);
        }
      }
    });
    return Array.from(roles).sort();
  }, [candidates, activeTab]);

  const filteredCandidates = useMemo(
    () =>
      candidates.filter(candidate => {
        const category = candidate.form?.formCategory || 'other';
        if (activeTab !== 'all' && category !== activeTab) {
          return false;
        }
        if (selectedRole !== 'all') {
          const roleKey = `${candidate.form?.position || ''} - ${candidate.form?.department || ''}`;
          if (roleKey !== selectedRole) {
            return false;
          }
        }
        return true;
      }),
    [candidates, activeTab, selectedRole]
  );

  if (loading) {
    return <LoadingSpinner message="Loading interview feedback..." />;
  }

  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <h2>Interview Feedback</h2>
          <p>View all candidate interview feedback and panel member evaluations.</p>
        </Col>
      </Row>

      <Row className="mb-3 align-items-end g-2">
        <Col xs="auto">
          <ButtonGroup size="sm">
            <ToggleButton
              type="radio"
              id="toggle-teaching"
              name="feedback-category"
              value="teaching"
              checked={activeTab === 'teaching'}
              variant={activeTab === 'teaching' ? 'primary' : 'outline-primary'}
              onChange={() => { setActiveTab('teaching'); setSelectedRole('all'); }}
            >
              Teaching ({teachingCount})
            </ToggleButton>
            <ToggleButton
              type="radio"
              id="toggle-nonteaching"
              name="feedback-category"
              value="non_teaching"
              checked={activeTab === 'non_teaching'}
              variant={activeTab === 'non_teaching' ? 'primary' : 'outline-primary'}
              onChange={() => { setActiveTab('non_teaching'); setSelectedRole('all'); }}
            >
              Non-Teaching ({nonTeachingCount})
            </ToggleButton>
            <ToggleButton
              type="radio"
              id="toggle-all"
              name="feedback-category"
              value="all"
              checked={activeTab === 'all'}
              variant={activeTab === 'all' ? 'primary' : 'outline-primary'}
              onChange={() => { setActiveTab('all'); setSelectedRole('all'); }}
            >
              All ({candidates.length})
            </ToggleButton>
          </ButtonGroup>
        </Col>
        <Col xs={12} md={4} className="mt-2 mt-md-0">
          <Form.Select
            size="sm"
            value={selectedRole}
            onChange={(event) => setSelectedRole(event.target.value)}
          >
            <option value="all">All Roles</option>
            {roleOptions.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </Form.Select>
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

      {filteredCandidates.length === 0 ? (
        <Alert variant="info">No interview feedback available yet.</Alert>
      ) : (
        <Row>
          {filteredCandidates.map((candidate) => {
            const totalInterviews = candidate.interviewFeedback?.length || 0;
            const averageRating = candidate.consolidatedInterviewRating || 0;

            return (
              <Col md={12} key={candidate._id} className="mb-4">
                <Card>
                  <Card.Header>
                    <h5>{candidate.user.name} - {candidate.form.position}</h5>
                    <small className="text-muted">{candidate.user.email}</small>
                  </Card.Header>
                  <Card.Body>
                    <Row className="mb-3">
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
                            <h3 className="text-info">{totalInterviews}</h3>
                            <p className="text-muted mb-0">Feedback Count</p>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>

                    {(candidate.interviewFeedback?.feedback || candidate.interviewFeedback)?.map((feedback, index) => {
                      const fb = feedback.interviewTitle ? feedback : candidate.interviewFeedback[index];
                      return (
                        <Card key={index} className="mb-3">
                          <Card.Header>
                            <h6>{fb?.interviewTitle || fb?.interview?.title || 'Interview'} - Round {fb?.round || fb?.interview?.round || 'N/A'}</h6>
                            <small className="text-muted">
                              Panel Member: {fb?.panelMember?.name || 'N/A'} | 
                              Type: {fb?.type || fb?.interview?.type || 'N/A'}
                            </small>
                          </Card.Header>
                          <Card.Body>
                            <Row>
                              <Col md={6}>
                                <h6>Ratings:</h6>
                                <p>Technical Skills: {fb?.ratings?.technicalSkills || 0}/5</p>
                                <p>Communication: {fb?.ratings?.communication || 0}/5</p>
                                <p>Problem Solving: {fb?.ratings?.problemSolving || 0}/5</p>
                                <p><strong>Overall: {fb?.ratings?.overallRating || 0}/5</strong></p>
                              </Col>
                              <Col md={6}>
                                <h6>Recommendation:</h6>
                                <p>{getStatusBadge(fb?.recommendation)}</p>
                                {fb?.comments && (
                                  <>
                                    <h6>Comments:</h6>
                                    <p>{fb.comments}</p>
                                  </>
                                )}
                                <small className="text-muted">
                                  Submitted: {fb?.submittedAt ? new Date(fb.submittedAt).toLocaleDateString() : 'N/A'}
                                </small>
                              </Col>
                            </Row>
                          </Card.Body>
                        </Card>
                      );
                    })}
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </Container>
  );
};

export default InterviewFeedback;

