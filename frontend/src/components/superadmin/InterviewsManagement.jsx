import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Badge } from 'react-bootstrap';
import api from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';

const Container = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h2`
  color: #1e293b;
  margin: 0;
`;


const InterviewCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
`;

const InterviewHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const InterviewTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  color: #1e293b;
`;

const InterviewMeta = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
`;

const MetaItem = styled.span`
  background: #f3f4f6;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  color: #374151;
`;

const PanelMembersSection = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
`;

const SectionTitle = styled.h4`
  margin: 0 0 0.75rem 0;
  color: #374151;
  font-size: 1rem;
`;

const PanelMemberList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const PanelMemberTag = styled.span`
  background: #dbeafe;
  color: #1e40af;
  padding: 0.25rem 0.75rem;
  border-radius: 16px;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const AssignButton = styled.button`
  background: #10b981;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.3s ease;

  &:hover {
    background: #059669;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  flex-wrap: wrap;
`;

const StyledButton = styled.button`
  background: ${props => props.danger ? '#ef4444' : props.variant === 'info' ? '#3b82f6' : '#6b7280'};
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.3s ease;

  &:hover {
    background: ${props => props.danger ? '#dc2626' : props.variant === 'info' ? '#2563eb' : '#4b5563'};
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 8px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const ModalTitle = styled.h3`
  margin: 0;
  color: #1e293b;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
`;

const PanelMemberGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const PanelMemberCard = styled.div`
  border: 2px solid ${props => props.selected ? '#3b82f6' : '#e5e7eb'};
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  background: ${props => props.selected ? '#eff6ff' : 'white'};

  &:hover {
    border-color: #3b82f6;
    background: #eff6ff;
  }
`;

const PanelMemberName = styled.div`
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.25rem;
`;

const PanelMemberEmail = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
`;

const Checkbox = styled.input`
  margin-right: 0.5rem;
`;

const ModalActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`;

const CancelButton = styled.button`
  background: #6b7280;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background: #4b5563;
  }
`;

const SubmitButton = styled.button`
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background: #2563eb;
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

const InterviewsManagement = () => {
  const [interviews, setInterviews] = useState([]);
  const [panelMembers, setPanelMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [selectedPanelMembers, setSelectedPanelMembers] = useState([]);
  const [feedbackSummary, setFeedbackSummary] = useState(null);

  useEffect(() => {
    fetchInterviews();
    fetchPanelMembers();
  }, []);

  const fetchInterviews = async () => {
    try {
      const response = await api.get('/interviews');
      setInterviews(response.data.interviews);
    } catch (error) {
      console.error('Error fetching interviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPanelMembers = async () => {
    try {
      const response = await api.get('/auth/panel-members');
      setPanelMembers(response.data.panelMembers);
    } catch (error) {
      console.error('Error fetching panel members:', error);
    }
  };

  const handleAssignPanelMembers = (interview) => {
    setSelectedInterview(interview);
    setSelectedPanelMembers(interview.panelMembers?.map(pm => pm.panelMember._id) || []);
    setShowAssignModal(true);
  };

  const handlePanelMemberToggle = (panelMemberId) => {
    setSelectedPanelMembers(prev =>
      prev.includes(panelMemberId)
        ? prev.filter(id => id !== panelMemberId)
        : [...prev, panelMemberId]
    );
  };

  const handleAssignSubmit = async () => {
      try {
        const response = await api.post(`/interviews/${selectedInterview._id}/assign-panel-members`, {
          panelMemberIds: selectedPanelMembers
        });
  
        setShowAssignModal(false);
        setSelectedInterview(null);
        setSelectedPanelMembers([]);
        fetchInterviews();
        
        // Show detailed feedback
        const { successful, failed } = response.data.emailNotifications;
        alert(`Panel members assigned successfully!\n\nEmail notifications:\n✅ Successful: ${successful}\n❌ Failed: ${failed}`);
      } catch (error) {
        console.error('Error assigning panel members:', error);
        alert('Error assigning panel members. Please try again.');
      }
    };
  
    const handleViewFeedback = async (interview) => {
      try {
        setSelectedInterview(interview);
        const response = await api.get(`/interviews/${interview._id}/feedback-summary`);
        setFeedbackSummary(response.data);
        setShowFeedbackModal(true);
      } catch (error) {
        console.error('Error fetching feedback:', error);
        alert('Error fetching feedback data.');
      }
    };
  
    const handleDeleteInterview = async (interviewId) => {
      if (window.confirm('Are you sure you want to delete this interview?')) {
        try {
          await api.delete(`/interviews/${interviewId}`);
          fetchInterviews();
        } catch (error) {
          console.error('Error deleting interview:', error);
          alert('Error deleting interview. Please try again.');
        }
      }
    };
  
    const getInterviewStatusBadge = (interview) => {
      const allCompleted = interview.candidates?.every(c => c.status === 'completed');
      const anyInProgress = interview.candidates?.some(c => c.status === 'scheduled');
      
      if (allCompleted) {
        return <Badge bg="success">Completed</Badge>;
      } else if (anyInProgress) {
        return <Badge bg="warning">In Progress</Badge>;
      } else {
        return <Badge bg="secondary">Pending</Badge>;
      }
    };
  
    // eslint-disable-next-line no-unused-vars
    const getFeedbackProgress = (interview) => {
      if (!interview.candidates || !interview.panelMembers) return { submitted: 0, total: 0 };
      
      let totalExpectedFeedback = interview.candidates.length * interview.panelMembers.length;
      // eslint-disable-next-line no-unused-vars
      let submittedFeedback = 0;
      
      // This would need to be calculated based on actual feedback data
      // For now, we'll show a placeholder
      return { submitted: 0, total: totalExpectedFeedback };
    };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Container>
      <Header>
        <div>
          <Title>Interview Scheduling</Title>
          <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280' }}>Step 4: Schedule interviews and assign panel members for candidate evaluation.</p>
        </div>
      </Header>

      {interviews.map(interview => (
        <InterviewCard key={interview._id}>
          <InterviewHeader>
            <div>
              <InterviewTitle>{interview.title}</InterviewTitle>
              <InterviewMeta>
                              <MetaItem>{interview.form?.title}</MetaItem>
                              <MetaItem>{interview.form?.department}</MetaItem>
                              <MetaItem>Round {interview.round}</MetaItem>
                              <MetaItem>{interview.type}</MetaItem>
                              {getInterviewStatusBadge(interview)}
                            </InterviewMeta>
                          </div>
                        </InterviewHeader>

          {interview.description && (
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              {interview.description}
            </p>
          )}

          <PanelMembersSection>
                      <SectionTitle>Panel Members</SectionTitle>
                      {interview.panelMembers && interview.panelMembers.length > 0 ? (
                        <PanelMemberList>
                          {interview.panelMembers.map(pm => (
                            <PanelMemberTag key={pm._id}>
                              {pm.panelMember.name}
                              {pm.notificationSent && <span title="Notification sent">📧</span>}
                            </PanelMemberTag>
                          ))}
                        </PanelMemberList>
                      ) : (
                        <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
                          No panel members assigned
                        </p>
                      )}
                    </PanelMembersSection>
          
                    {/* Feedback Progress Section */}
                    {interview.candidates && interview.candidates.length > 0 && (
                      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                        <SectionTitle>Feedback Progress</SectionTitle>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                            Candidates: {interview.candidates.length}
                          </span>
                          <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                            Panel Members: {interview.panelMembers?.length || 0}
                          </span>
                          <StyledButton
                            variant="info"
                            size="sm"
                            onClick={() => handleViewFeedback(interview)}
                          >
                            View Feedback Details
                          </StyledButton>
                        </div>
                      </div>
                    )}
           
                    <ActionButtons>
                      <AssignButton onClick={() => handleAssignPanelMembers(interview)}>
                        Assign Panel Members
                      </AssignButton>
                      <StyledButton
                        variant="info"
                        onClick={() => handleViewFeedback(interview)}
                      >
                        View Feedback
                      </StyledButton>
                      <StyledButton danger onClick={() => handleDeleteInterview(interview._id)}>
                        Delete
                      </StyledButton>
                    </ActionButtons>
                  </InterviewCard>
      ))}

      {showAssignModal && (
        <ModalOverlay>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>
                Assign Panel Members to {selectedInterview?.title}
              </ModalTitle>
              <CloseButton onClick={() => setShowAssignModal(false)}>×</CloseButton>
            </ModalHeader>

            <PanelMemberGrid>
              {panelMembers.map(member => (
                <PanelMemberCard
                  key={member._id}
                  selected={selectedPanelMembers.includes(member._id)}
                  onClick={() => handlePanelMemberToggle(member._id)}
                >
                  <Checkbox
                    type="checkbox"
                    checked={selectedPanelMembers.includes(member._id)}
                    onChange={() => handlePanelMemberToggle(member._id)}
                  />
                  <PanelMemberName>{member.name}</PanelMemberName>
                  <PanelMemberEmail>{member.email}</PanelMemberEmail>
                </PanelMemberCard>
              ))}
            </PanelMemberGrid>

            <ModalActions>
              <CancelButton onClick={() => setShowAssignModal(false)}>
                Cancel
              </CancelButton>
              <SubmitButton onClick={handleAssignSubmit}>
                Assign & Send Notifications
              </SubmitButton>
            </ModalActions>
          </ModalContent>
                  </ModalOverlay>
                )}
          
                {/* Feedback Details Modal */}
                {showFeedbackModal && feedbackSummary && (
                  <ModalOverlay>
                    <ModalContent style={{ maxWidth: '800px' }}>
                      <ModalHeader>
                        <ModalTitle>
                          Feedback Summary - {selectedInterview?.title}
                        </ModalTitle>
                        <CloseButton onClick={() => setShowFeedbackModal(false)}>×</CloseButton>
                      </ModalHeader>
          
                      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        {feedbackSummary.feedbackSummary && feedbackSummary.feedbackSummary.length > 0 ? (
                          feedbackSummary.feedbackSummary.map((candidateData, index) => (
                            <div key={index} style={{
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              padding: '1rem',
                              marginBottom: '1rem'
                            }}>
                              <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>
                                {candidateData.candidate.name || 'Unknown Candidate'}
                              </h4>
                              
                              {candidateData.feedbacks && candidateData.feedbacks.length > 0 ? (
                                <div>
                                  {candidateData.feedbacks.map((feedback, fbIndex) => (
                                    <div key={fbIndex} style={{
                                      background: '#f8fafc',
                                      padding: '0.75rem',
                                      borderRadius: '6px',
                                      marginBottom: '0.5rem'
                                    }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <strong>{feedback.panelMember?.name || 'Unknown Panel Member'}</strong>
                                        <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                                          {feedback.submittedAt ? new Date(feedback.submittedAt).toLocaleDateString() : 'Not submitted'}
                                        </span>
                                      </div>
                                      
                                      {feedback.ratings && Object.keys(feedback.ratings).length > 0 && (
                                        <div style={{ marginBottom: '0.5rem' }}>
                                          <strong>Ratings:</strong>
                                          {Object.entries(feedback.ratings).map(([criterion, rating]) => (
                                            <div key={criterion} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                              <span>{criterion}:</span>
                                              <span>{rating}/5</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {feedback.comments && (
                                        <div>
                                          <strong>Comments:</strong>
                                          <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', fontStyle: 'italic' }}>
                                            {feedback.comments}
                                          </p>
                                        </div>
                                      )}
                                      
                                      {feedback.recommendation && (
                                        <div>
                                          <strong>Recommendation:</strong>
                                          <Badge
                                            bg={
                                              feedback.recommendation === 'Strongly Recommend' ? 'success' :
                                              feedback.recommendation === 'Recommend' ? 'info' :
                                              feedback.recommendation === 'Neutral' ? 'warning' : 'danger'
                                            }
                                            style={{ marginLeft: '0.5rem' }}
                                          >
                                            {feedback.recommendation}
                                          </Badge>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
                                  No feedback submitted yet
                                </p>
                              )}
                            </div>
                          ))
                        ) : (
                          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                            <p>No feedback data available</p>
                          </div>
                        )}
                      </div>
          
                      <ModalActions>
                        <CancelButton onClick={() => setShowFeedbackModal(false)}>
                          Close
                        </CancelButton>
                      </ModalActions>
                    </ModalContent>
                  </ModalOverlay>
                )}
              </Container>
            );
          };
          
          export default InterviewsManagement;
