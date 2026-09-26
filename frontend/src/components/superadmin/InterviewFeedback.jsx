import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Badge, Alert, Form, ButtonGroup, ToggleButton, Table } from 'react-bootstrap';
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
        c.interviewFeedback && (
          (Array.isArray(c.interviewFeedback) && c.interviewFeedback.length > 0) ||
          (c.interviewFeedback.feedback && c.interviewFeedback.feedback.length > 0)
        )
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
    return <Badge bg={variants[recommendation] || 'secondary'}>{recommendation?.replace('_', ' ') || 'N/A'}</Badge>;
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
    <Container fluid className="super-admin-fluid p-4">
      <Row className="mb-4">
        <Col>
          <h2 className="fw-bold text-dark mb-1">Interview Feedback & Evaluations</h2>
          <p className="text-muted mb-0">View candidate evaluation metrics, scores, and panel feedback in structured table format.</p>
        </Col>
      </Row>

      <Row className="mb-3 align-items-center justify-content-between g-2">
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
            <option value="all">All Job Roles</option>
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
        <Alert variant="info" className="text-center py-4">No interview feedback available for the selected filters.</Alert>
      ) : (
        <div className="table-responsive bg-white rounded shadow-sm border">
          <Table hover className="align-middle mb-0">
            <thead className="bg-light">
              <tr>
                <th className="py-3 px-3">Candidate</th>
                <th className="py-3 px-3">Position & Dept</th>
                <th className="py-3 px-3">Interview & Round</th>
                <th className="py-3 px-3">Panel Member</th>
                <th className="py-3 px-3">Ratings</th>
                <th className="py-3 px-3">Recommendation</th>
                <th className="py-3 px-3">Comments & Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.flatMap((candidate) => {
                const rawFeedback = candidate.interviewFeedback;
                const feedbackItems = Array.isArray(rawFeedback)
                  ? rawFeedback
                  : rawFeedback?.feedback || [];

                if (feedbackItems.length === 0) {
                  return [(
                    <tr key={candidate._id}>
                      <td className="px-3">
                        <div className="fw-semibold text-dark">{candidate.user?.name || 'N/A'}</div>
                        <div className="text-muted small">{candidate.user?.email || ''}</div>
                      </td>
                      <td className="px-3">
                        <div className="fw-medium">{candidate.form?.position || 'N/A'}</div>
                        <div className="text-muted small">{candidate.form?.department || 'N/A'}</div>
                      </td>
                      <td colSpan={5} className="text-muted px-3 fst-italic">
                        No detailed evaluations recorded yet
                      </td>
                    </tr>
                  )];
                }

                return feedbackItems.map((fb, fbIndex) => (
                  <tr key={`${candidate._id}-${fbIndex}`}>
                    <td className="px-3">
                      <div className="fw-semibold text-dark">{candidate.user?.name || 'N/A'}</div>
                      <div className="text-muted small">{candidate.user?.email || ''}</div>
                      {candidate.candidateNumber && (
                        <Badge bg="light" text="dark" className="border mt-1">
                          {candidate.candidateNumber}
                        </Badge>
                      )}
                    </td>
                    <td className="px-3">
                      <div className="fw-medium text-dark">{candidate.form?.position || 'N/A'}</div>
                      <div className="text-muted small">{candidate.form?.department || 'N/A'}</div>
                    </td>
                    <td className="px-3">
                      <div className="fw-medium">{fb?.interviewTitle || fb?.interview?.title || 'Interview'}</div>
                      <Badge bg="secondary" className="mt-1">Round {fb?.round || fb?.interview?.round || '1'}</Badge>
                    </td>
                    <td className="px-3">
                      <div className="fw-medium">{fb?.panelMember?.name || 'Panel Member'}</div>
                      <small className="text-muted">{fb?.type || fb?.interview?.type || 'Online'}</small>
                    </td>
                    <td className="px-3">
                      <div className="small">Tech: <strong>{fb?.ratings?.technicalSkills || 0}/5</strong></div>
                      <div className="small">Comm: <strong>{fb?.ratings?.communication || 0}/5</strong></div>
                      <div className="small">Problem: <strong>{fb?.ratings?.problemSolving || 0}/5</strong></div>
                      <div className="fw-bold text-primary mt-1">Overall: {fb?.ratings?.overallRating || 0}/5</div>
                    </td>
                    <td className="px-3">{getStatusBadge(fb?.recommendation)}</td>
                    <td className="px-3">
                      <div className="small text-dark mb-1" style={{ maxWidth: '280px' }}>{fb?.comments || 'No comments'}</div>
                      <div className="text-muted small" style={{ fontSize: '0.8rem' }}>
                        Submitted: {fb?.submittedAt ? new Date(fb.submittedAt).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </Table>
        </div>
      )}
    </Container>
  );
};

export default InterviewFeedback;

