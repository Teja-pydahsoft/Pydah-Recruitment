import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Badge, Table } from 'react-bootstrap';
import api from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';

// Utility function to format date/time in IST
const formatISTDateTime = (dateString, timeString = '') => {
  if (!dateString) return 'Not scheduled';
  
  try {
    // Create date object and convert to IST
    const date = new Date(dateString);
    
    // Format date in IST (DD/MM/YYYY format)
    const dateOptions = { 
      timeZone: 'Asia/Kolkata',
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit'
    };
    
    const formattedDate = date.toLocaleDateString('en-IN', dateOptions);
    // en-IN format is already DD/MM/YYYY, but let's ensure it
    const dateParts = formattedDate.split('/');
    const day = dateParts[0].padStart(2, '0');
    const month = dateParts[1].padStart(2, '0');
    const year = dateParts[2];
    const formattedDateStr = `${day}/${month}/${year}`;
    
    if (timeString) {
      // Parse time string (HH:MM format)
      const [hours, minutes] = timeString.split(':');
      if (hours && minutes) {
        const hour24 = parseInt(hours, 10);
        const min = minutes.padStart(2, '0');
        
        // Convert to 12-hour format
        const hour12 = hour24 % 12 || 12;
        const ampm = hour24 >= 12 ? 'PM' : 'AM';
        
        // Format: HH:MM AM/PM IST
        const time12hr = `${hour12.toString().padStart(2, '0')}:${min} ${ampm} IST`;
        return `${formattedDateStr} ${time12hr}`;
      }
    }
    
    return formattedDateStr;
  } catch (error) {
    return dateString;
  }
};

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

const Container = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: clamp(1.5rem, 2vw, 2.5rem);
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-end;
  }
`;

const TabContainer = styled.div`
  width: 100%;
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e7eb;
`;

const TabButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #e5e7eb;
`;

const TabButton = styled.button`
  background: none;
  border: none;
  padding: 0.75rem 1.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: ${props => props.active ? '#3b82f6' : '#6b7280'};
  border-bottom: 3px solid ${props => props.active ? '#3b82f6' : 'transparent'};
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: -2px;

  &:hover {
    color: #3b82f6;
  }
`;

const FilterSelect = styled.select`
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  color: #374151;
  min-width: 200px;
`;

const Title = styled.h2`
  color: #1e293b;
  margin: 0;
`;

const InterviewCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e7eb;
  transition: box-shadow 0.3s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }
`;

const InterviewHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #f1f5f9;
`;

const InterviewTitle = styled.h3`
  margin: 0 0 0.75rem 0;
  color: #1e293b;
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.4;
`;

const InterviewMeta = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
  align-items: center;
`;

const MetaItem = styled.span`
  background: #f3f4f6;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  color: #374151;
`;

const SectionTitle = styled.h4`
  margin: 0 0 1rem 0;
  color: #1e293b;
  font-size: 1.1rem;
  font-weight: 600;
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
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCandidatesModal, setShowCandidatesModal] = useState(false);
  const [showFeedbackFormModal, setShowFeedbackFormModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [selectedPanelMembers, setSelectedPanelMembers] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [scheduleFormData, setScheduleFormData] = useState({});
  const [feedbackSummary, setFeedbackSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('teaching');
  const [selectedJobRole, setSelectedJobRole] = useState('all');
  const [interviewFormData, setInterviewFormData] = useState({
    title: '',
    description: '',
    form: '',
    round: 1,
    type: 'technical',
    feedbackForm: {
      questions: []
    },
    evaluationCriteria: []
  });

  const getDefaultFeedbackForm = useCallback(() => ({
    questions: [
      {
        question: 'How would you rate the candidate\'s communication skills?',
        type: 'rating',
        required: true
      },
      {
        question: 'How would you rate the candidate\'s technical knowledge?',
        type: 'rating',
        required: true
      },
      {
        question: 'How would you rate the candidate\'s problem-solving abilities?',
        type: 'rating',
        required: true
      },
      {
        question: 'Overall rating for this candidate?',
        type: 'rating',
        required: true
      },
      {
        question: 'Additional comments or observations?',
        type: 'text',
        required: false
      },
      {
        question: 'Would you recommend this candidate?',
        type: 'yes_no',
        required: true,
        options: ['Yes', 'No']
      }
    ]
  }), []);

  const fetchInterviews = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/interviews');
      if (response.data && response.data.interviews) {
        const interviewsWithFeedback = await Promise.all(
          response.data.interviews.map(async (interview) => {
            const hasFeedback =
              interview.feedbackForm &&
              Array.isArray(interview.feedbackForm.questions) &&
              interview.feedbackForm.questions.length > 0;

            if (hasFeedback) {
              return interview;
            }

            try {
              const defaultFeedback = getDefaultFeedbackForm();
              await api.put(`/interviews/${interview._id}`, {
                feedbackForm: defaultFeedback
              });
              return {
                ...interview,
                feedbackForm: defaultFeedback
              };
            } catch (error) {
              return interview;
            }
          })
        );
        setInterviews(interviewsWithFeedback);
      } else {
        setInterviews([]);
      }
    } catch (error) {
      setInterviews([]);
      alert('Failed to load interviews. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [getDefaultFeedbackForm]);

  const fetchPanelMembers = useCallback(async () => {
    try {
      const response = await api.get('/auth/panel-members');
      setPanelMembers(response.data.panelMembers);
    } catch (error) {
      setPanelMembers([]);
    }
  }, []);

  useEffect(() => {
    fetchInterviews();
    fetchPanelMembers();
  }, [fetchInterviews, fetchPanelMembers]);

  const handleAssignPanelMembers = (interview, candidateEntry) => {
    setSelectedInterview(interview);
    setSelectedCandidate(candidateEntry);
    // Get panel members for this specific candidate if available, otherwise use interview-level panel members
    const candidatePanelMembers = candidateEntry?.panelMembers || interview.panelMembers || [];
    setSelectedPanelMembers(
      candidatePanelMembers
        .filter(pm => pm.panelMember && pm.panelMember._id) // Filter out null panelMember references
        .map(pm => pm.panelMember._id) || []
    );
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
        if (!selectedInterview || !selectedInterview._id) {
          alert('Error: Interview not selected');
          return;
        }

        const response = await api.post(`/interviews/${selectedInterview._id}/assign-panel-members`, {
          panelMemberIds: selectedPanelMembers,
          candidateId: selectedCandidate?.candidate?._id || null // Include candidate ID if assigning to specific candidate
        });
  
        setShowAssignModal(false);
        setSelectedInterview(null);
        setSelectedCandidate(null);
        setSelectedPanelMembers([]);
        // Refresh interviews list
        await fetchInterviews();
        
        // Show detailed feedback
        const { successful, failed, skipped, total, warning } = response.data.emailNotifications || {};
        let message = 'Panel members assigned successfully!';
        
        if (warning) {
          message += `\n\n⚠️ Warning: ${warning}`;
        }
        
        if (total !== undefined) {
          message += `\n\nEmail notifications:\n✅ Successful: ${successful || 0}\n❌ Failed: ${failed || 0}`;
          if (skipped && skipped > 0) {
            message += `\n⚠️ Skipped: ${skipped} (no email address or panel member not found)`;
          }
          message += `\n📊 Total: ${total}`;
        } else if (successful !== undefined || failed !== undefined) {
          message += `\n\nEmail notifications:\n✅ Successful: ${successful || 0}\n❌ Failed: ${failed || 0}`;
        }
        
        alert(message);
      } catch (error) {
        const errorMessage = error.response?.data?.message || error.message || 'Error assigning panel members. Please try again.';
        alert(errorMessage);
      }
    };
  
    const handleDeleteInterview = async (interviewId) => {
      if (window.confirm('Are you sure you want to delete this interview?')) {
        try {
          await api.delete(`/interviews/${interviewId}`);
          // Refresh interviews list
          await fetchInterviews();
        } catch (error) {
          alert('Error deleting interview. Please try again.');
        }
      }
    };

    const handleScheduleUpdate = async () => {
      try {
        // Check if schedule is being changed (for reschedule notification)
        const oldDate = selectedCandidate.scheduledDate ? new Date(selectedCandidate.scheduledDate).toISOString().split('T')[0] : '';
        const oldTime = selectedCandidate.scheduledTime || '';
        const newDate = scheduleFormData.scheduledDate || '';
        const newTime = scheduleFormData.scheduledTime || '';
        
        const isReschedule = (newDate && oldDate && newDate !== oldDate) || (newTime && oldTime && newTime !== oldTime);
        
        // Ask user if they want to send notification for reschedule
        let sendNotification = true;
        if (isReschedule) {
          sendNotification = window.confirm(
            'The interview schedule is being changed. Do you want to send a reschedule notification email to the candidate?'
          );
        }
        
        const updateData = {
          ...scheduleFormData,
          sendNotification: sendNotification
        };
        
        const response = await api.put(`/interviews/${selectedInterview._id}/candidate/${selectedCandidate.candidate._id}/schedule`, updateData);
        setShowScheduleModal(false);
        setSelectedCandidate(null);
        setScheduleFormData({});
        // Refresh interviews list
        await fetchInterviews();
        
        if (isReschedule && sendNotification && response.data.notificationSent) {
          alert('Schedule updated successfully! Reschedule notification email has been sent to the candidate.');
        } else if (isReschedule && sendNotification) {
          alert('Schedule updated successfully! However, the notification email could not be sent. Please notify the candidate manually.');
        } else {
          alert('Schedule updated successfully!');
        }
      } catch (error) {
        alert('Error updating schedule. Please try again.');
      }
    };

    const handleConfigureFeedbackForm = async (interview) => {
      setSelectedInterview(interview);
      
      // Initialize feedback form from interview or use default
      let feedbackFormData;
      
      if (interview.feedbackForm && interview.feedbackForm.questions && interview.feedbackForm.questions.length > 0) {
        // Use existing feedback form from interview
        feedbackFormData = { questions: [...interview.feedbackForm.questions] };
      } else {
        // Use default feedback form
        feedbackFormData = getDefaultFeedbackForm();
      }
      
      setInterviewFormData(prev => ({
        ...prev,
        feedbackForm: feedbackFormData
      }));
      setShowFeedbackFormModal(true);
    };

    const handleAddFeedbackQuestion = () => {
      setInterviewFormData({
        ...interviewFormData,
        feedbackForm: {
          questions: [
            ...interviewFormData.feedbackForm.questions,
            { question: '', type: 'rating', required: true, options: [] }
          ]
        }
      });
    };

    const handleRemoveFeedbackQuestion = (index) => {
      const newQuestions = interviewFormData.feedbackForm.questions.filter((_, i) => i !== index);
      setInterviewFormData({
        ...interviewFormData,
        feedbackForm: { questions: newQuestions }
      });
    };

    const handleUpdateFeedbackQuestion = (index, field, value) => {
      const newQuestions = [...interviewFormData.feedbackForm.questions];
      newQuestions[index] = { ...newQuestions[index], [field]: value };
      setInterviewFormData({
        ...interviewFormData,
        feedbackForm: { questions: newQuestions }
      });
    };

    const handleSaveFeedbackForm = async () => {
      try {
        await api.put(`/interviews/${selectedInterview._id}`, {
          feedbackForm: interviewFormData.feedbackForm
        });
        setShowFeedbackFormModal(false);
        await fetchInterviews();
        alert('Feedback form updated successfully!');
      } catch (error) {
        alert('Error updating feedback form. Please try again.');
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
  
    // Get filtered interviews based on active tab and job role
    const getFilteredInterviews = () => {
      let filtered = interviews.filter(interview => {
        if (!interview.form) return false;
        
        // Filter by form category
        if (activeTab === 'teaching') {
          return interview.form.formCategory === 'teaching';
        } else if (activeTab === 'non_teaching') {
          return interview.form.formCategory === 'non_teaching';
        }
        return true; // 'all' tab
      });

      // Filter by job role if selected
      if (selectedJobRole !== 'all' && selectedJobRole) {
        filtered = filtered.filter(interview => {
          const jobRole = `${interview.form?.position || ''} - ${interview.form?.department || ''}`;
          return jobRole === selectedJobRole;
        });
      }

      return filtered;
    };

    // Get unique job roles for the current tab
    const getJobRoles = () => {
      let filteredInterviews = interviews.filter(interview => {
        if (!interview.form) return false;
        if (activeTab === 'teaching') {
          return interview.form.formCategory === 'teaching';
        } else if (activeTab === 'non_teaching') {
          return interview.form.formCategory === 'non_teaching';
        }
        return true;
      });

      const roles = new Set();
      filteredInterviews.forEach(interview => {
        if (interview.form?.position && interview.form?.department) {
          roles.add(`${interview.form.position} - ${interview.form.department}`);
        }
      });

      return Array.from(roles).sort();
    };

    const filteredInterviews = getFilteredInterviews();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Container>
      <Header>
        <div>
          <Title>Interview Management</Title>
          <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280' }}>
            Coordinate interview schedules, assign panel members, and review candidate progress in one place.
          </p>
        </div>
      </Header>

      {/* Category Tabs */}
      <TabContainer>
        <TabButtons style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <TabButton
              active={activeTab === 'teaching'}
              onClick={() => {
                setActiveTab('teaching');
                setSelectedJobRole('all');
              }}
            >
              Teaching Positions
            </TabButton>
            <TabButton
              active={activeTab === 'non_teaching'}
              onClick={() => {
                setActiveTab('non_teaching');
                setSelectedJobRole('all');
              }}
            >
              Non-Teaching Positions
            </TabButton>
            <TabButton
              active={activeTab === 'all'}
              onClick={() => {
                setActiveTab('all');
                setSelectedJobRole('all');
              }}
            >
              All Interviews
            </TabButton>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <label style={{ fontWeight: '600', color: '#374151', margin: 0 }}>Job Role:</label>
            <FilterSelect
              value={selectedJobRole}
              onChange={(e) => setSelectedJobRole(e.target.value)}
            >
              <option value="all">All Job Roles</option>
              {getJobRoles().map((role, idx) => (
                <option key={idx} value={role}>{role}</option>
              ))}
            </FilterSelect>
          </div>
        </TabButtons>
        <div style={{
          padding: '0.75rem 1rem',
          background: '#eff6ff',
          borderRadius: '6px',
          color: '#1e40af',
          fontWeight: '500',
          fontSize: '0.875rem',
          display: 'inline-flex',
          flexWrap: 'wrap',
          gap: '0.35rem'
        }}>
          Showing <strong>{filteredInterviews.length}</strong> interview(s) for {activeTab === 'teaching' ? 'Teaching' : activeTab === 'non_teaching' ? 'Non-Teaching' : 'All'} positions
          {selectedJobRole !== 'all' && <> - <span>{selectedJobRole}</span></>}
        </div>
      </TabContainer>

      {filteredInterviews.length === 0 && !loading && (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ color: '#6b7280', marginBottom: '1rem' }}>No Interviews Found</h3>
          <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>
            {activeTab === 'teaching' ? 'No teaching position interviews found.' : 
             activeTab === 'non_teaching' ? 'No non-teaching position interviews found.' : 
             'There are no interviews scheduled yet.'} 
            {selectedJobRole !== 'all' && ` for ${selectedJobRole}`}
            <br />
            Adjust the filters or assign shortlisted candidates to interviews from the candidate management workspace.
          </p>
        </div>
      )}

      {filteredInterviews.map(interview => (
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
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              {interview.description}
            </p>
          )}

          {/* Candidates Section */}
                    {interview.candidates && interview.candidates.length > 0 && (
                      <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
                        <SectionTitle>
                          <span>Candidates</span>
                          <Badge bg="info" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                            {interview.candidates.length}
                          </Badge>
                        </SectionTitle>
                        <div className="mt-3">
                          <Table responsive bordered hover size="sm" className="align-middle">
                            <thead>
                              <tr>
                                <th>Candidate</th>
                                <th>Email</th>
                                <th>Job Role</th>
                                <th>Department</th>
                                <th>Scheduled</th>
                                <th>Status</th>
                                <th className="text-end">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {interview.candidates.map((candidateEntry, idx) => {
                                const candidate = candidateEntry.candidate || {};
                                const candidateForm = candidate.form || interview.form || {};
                                const scheduledDisplay = candidateEntry.scheduledDate
                                  ? formatISTDateTime(candidateEntry.scheduledDate, candidateEntry.scheduledTime)
                                  : 'Not scheduled';

                                return (
                                  <tr key={candidateEntry._id || candidate?._id || `${interview._id}_${idx}`}>
                                    <td>
                                      <div className="fw-semibold">{candidate.user?.name || 'Unknown Candidate'}</div>
                                      {candidate.candidateNumber && (
                                        <div className="text-muted small">{candidate.candidateNumber}</div>
                                      )}
                                    </td>
                                    <td>{candidate.user?.email || '—'}</td>
                                    <td>{candidateForm.position || '—'}</td>
                                    <td>{candidateForm.department || '—'}</td>
                                    <td>
                                      <div>{scheduledDisplay}</div>
                                      {candidateEntry.duration && (
                                        <div className="text-muted small">Duration: {candidateEntry.duration} min</div>
                                      )}
                                      {candidateEntry.notes && (
                                        <div className="text-muted small">Notes: {candidateEntry.notes}</div>
                                      )}
                                    </td>
                                    <td>
                                      <Badge
                                        bg={
                                          candidateEntry.status === 'completed'
                                            ? 'success'
                                            : candidateEntry.status === 'scheduled'
                                              ? 'warning'
                                              : candidateEntry.status === 'cancelled'
                                                ? 'danger'
                                                : 'secondary'
                                        }
                                      >
                                        {candidateEntry.status || 'pending'}
                                      </Badge>
                                    </td>
                                    <td>
                                      <div className="d-flex flex-wrap gap-2 justify-content-end">
                                        <AssignButton
                                          style={{ fontSize: '0.875rem', padding: '0.4rem 0.9rem' }}
                                          onClick={() => handleAssignPanelMembers(interview, candidateEntry)}
                                        >
                                          Assign Panel Members
                                        </AssignButton>
                                        <StyledButton
                                          variant="info"
                                          style={{ fontSize: '0.875rem', padding: '0.4rem 0.9rem' }}
                                          onClick={() => {
                                            setSelectedInterview(interview);
                                            setSelectedCandidate(candidateEntry);
                                            // Fix date conversion to handle timezone properly
                                            let formattedDate = '';
                                            if (candidateEntry.scheduledDate) {
                                              const date = new Date(candidateEntry.scheduledDate);
                                              // Get local date string in YYYY-MM-DD format
                                              const year = date.getFullYear();
                                              const month = String(date.getMonth() + 1).padStart(2, '0');
                                              const day = String(date.getDate()).padStart(2, '0');
                                              formattedDate = `${year}-${month}-${day}`;
                                            }
                                            setScheduleFormData({
                                              scheduledDate: formattedDate,
                                              scheduledTime: candidateEntry.scheduledTime || '',
                                              duration: candidateEntry.duration || 30,
                                              meetingLink: candidateEntry.meetingLink || '',
                                              notes: candidateEntry.notes || '',
                                              status: candidateEntry.status || 'scheduled'
                                            });
                                            setShowScheduleModal(true);
                                          }}
                                        >
                                          Edit Schedule
                                        </StyledButton>
                                        <StyledButton
                                          variant="info"
                                          style={{ fontSize: '0.875rem', padding: '0.4rem 0.9rem' }}
                                          onClick={async () => {
                                            try {
                                              setSelectedInterview(interview);
                                              setSelectedCandidate(candidateEntry);
                                              // Pass candidateId to get feedback for this specific candidate only
                                              const candidateId = candidateEntry.candidate?._id || candidateEntry.candidate;
                                              const response = await api.get(`/interviews/${interview._id}/feedback-summary${candidateId ? `?candidateId=${candidateId}` : ''}`);
                                              setFeedbackSummary(response.data);
                                              setShowFeedbackModal(true);
                                            } catch {
                                              alert('Error fetching feedback data.');
                                            }
                                          }}
                                        >
                                          View Feedback
                                        </StyledButton>
                                        <StyledButton
                                          variant="info"
                                          style={{ fontSize: '0.875rem', padding: '0.4rem 0.9rem' }}
                                          onClick={() => {
                                            setSelectedInterview(interview);
                                            handleConfigureFeedbackForm(interview);
                                          }}
                                        >
                                          Configure Feedback Form
                                        </StyledButton>
                                        <StyledButton
                                          danger
                                          style={{ fontSize: '0.875rem', padding: '0.4rem 0.9rem' }}
                                          onClick={async () => {
                                            if (window.confirm(`Are you sure you want to remove ${candidate.user?.name || 'this candidate'} from this interview?`)) {
                                              try {
                                                await api.delete(`/interviews/${interview._id}/candidate/${candidate._id}`);
                                                await fetchInterviews();
                                                alert('Candidate removed from interview successfully!');
                                              } catch {
                                                alert('Error removing candidate from interview. Please try again.');
                                              }
                                            }
                                          }}
                                        >
                                          Remove
                                        </StyledButton>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </Table>
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                        Interview ID: {interview._id.toString().slice(-8)}
                      </div>
                      <StyledButton 
                        danger 
                        style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                        onClick={() => handleDeleteInterview(interview._id)}
                      >
                        Delete Interview
                      </StyledButton>
                    </div>
                  </InterviewCard>
      ))}

      {showAssignModal && (
        <ModalOverlay>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>
                Assign Panel Members {selectedCandidate ? `to ${selectedCandidate.candidate?.user?.name || 'Candidate'}` : `to ${selectedInterview?.title}`}
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

                {/* Schedule Edit Modal */}
                {showScheduleModal && selectedInterview && selectedCandidate && (
                  <ModalOverlay>
                    <ModalContent>
                      <ModalHeader>
                        <ModalTitle>
                          Edit Schedule - {selectedCandidate.candidate?.user?.name || 'Candidate'}
                        </ModalTitle>
                        <CloseButton onClick={() => {
                          setShowScheduleModal(false);
                          setSelectedCandidate(null);
                          setScheduleFormData({});
                        }}>×</CloseButton>
                      </ModalHeader>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                            Scheduled Date
                          </label>
                          <input
                            type="date"
                            value={scheduleFormData.scheduledDate || ''}
                            onChange={(e) => setScheduleFormData({ ...scheduleFormData, scheduledDate: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px'
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                            Scheduled Time (IST - 12 Hour Format)
                          </label>
                          <TimeInput12Hour
                            value={scheduleFormData.scheduledTime || ''}
                            onChange={(e) => setScheduleFormData({ ...scheduleFormData, scheduledTime: e.target.value })}
                            style={{ width: '100%' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                            Duration (minutes)
                          </label>
                          <input
                            type="number"
                            value={scheduleFormData.duration || 30}
                            onChange={(e) => setScheduleFormData({ ...scheduleFormData, duration: parseInt(e.target.value) })}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px'
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                            Meeting Link
                          </label>
                          <input
                            type="url"
                            value={scheduleFormData.meetingLink || ''}
                            onChange={(e) => setScheduleFormData({ ...scheduleFormData, meetingLink: e.target.value })}
                            placeholder="https://meet.google.com/..."
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px'
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                            Status
                          </label>
                          <select
                            value={scheduleFormData.status || 'scheduled'}
                            onChange={(e) => setScheduleFormData({ ...scheduleFormData, status: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px'
                            }}
                          >
                            <option value="scheduled">Scheduled</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="no_show">No Show</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                            Notes
                          </label>
                          <textarea
                            value={scheduleFormData.notes || ''}
                            onChange={(e) => setScheduleFormData({ ...scheduleFormData, notes: e.target.value })}
                            rows={3}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              resize: 'vertical'
                            }}
                          />
                        </div>
                      </div>

                      <ModalActions style={{ marginTop: '1.5rem' }}>
                        <CancelButton onClick={() => {
                          setShowScheduleModal(false);
                          setSelectedCandidate(null);
                          setScheduleFormData({});
                        }}>
                          Cancel
                        </CancelButton>
                        <SubmitButton onClick={handleScheduleUpdate}>
                          Update Schedule
                        </SubmitButton>
                      </ModalActions>
                    </ModalContent>
                  </ModalOverlay>
                )}

                {/* Candidates List Modal */}
                {showCandidatesModal && selectedInterview && (
                  <ModalOverlay>
                    <ModalContent style={{ maxWidth: '900px' }}>
                      <ModalHeader>
                        <ModalTitle>
                          Candidates - {selectedInterview.title}
                        </ModalTitle>
                        <CloseButton onClick={() => {
                          setShowCandidatesModal(false);
                          setSelectedInterview(null);
                        }}>×</CloseButton>
                      </ModalHeader>

                      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        {selectedInterview.candidates && selectedInterview.candidates.length > 0 ? (
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
                                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Candidate Number</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Name</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Job Role</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Department</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Scheduled Date/Time</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Status</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedInterview.candidates.map((candidateEntry, idx) => {
                                const candidate = candidateEntry.candidate;
                                const candidateForm = candidate?.form || selectedInterview.form;
                                return (
                                  <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '0.75rem' }}>
                                      {candidate?.candidateNumber ? (
                                        <Badge bg="secondary">{candidate.candidateNumber}</Badge>
                                      ) : (
                                        <span style={{ color: '#9ca3af' }}>N/A</span>
                                      )}
                                    </td>
                                    <td style={{ padding: '0.75rem' }}>{candidate?.user?.name || 'Unknown'}</td>
                                    <td style={{ padding: '0.75rem' }}>{candidateForm?.position || 'N/A'}</td>
                                    <td style={{ padding: '0.75rem' }}>{candidateForm?.department || 'N/A'}</td>
                                    <td style={{ padding: '0.75rem' }}>
                                      {candidateEntry.scheduledDate ? (
                                        <div style={{ color: '#3b82f6', fontWeight: '500' }}>
                                          {formatISTDateTime(candidateEntry.scheduledDate, candidateEntry.scheduledTime)}
                                        </div>
                                      ) : (
                                        <span style={{ color: '#9ca3af' }}>Not scheduled</span>
                                      )}
                                    </td>
                                    <td style={{ padding: '0.75rem' }}>
                                      <Badge bg={
                                        candidateEntry.status === 'completed' ? 'success' :
                                        candidateEntry.status === 'scheduled' ? 'warning' :
                                        candidateEntry.status === 'cancelled' ? 'danger' : 'secondary'
                                      }>
                                        {candidateEntry.status || 'pending'}
                                      </Badge>
                                    </td>
                                    <td style={{ padding: '0.75rem' }}>
                                      <StyledButton
                                        variant="info"
                                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                        onClick={() => {
                                          setSelectedInterview(selectedInterview);
                                          setSelectedCandidate(candidateEntry);
                                          // Fix date conversion to handle timezone properly
                                          let formattedDate = '';
                                          if (candidateEntry.scheduledDate) {
                                            const date = new Date(candidateEntry.scheduledDate);
                                            // Get local date string in YYYY-MM-DD format
                                            const year = date.getFullYear();
                                            const month = String(date.getMonth() + 1).padStart(2, '0');
                                            const day = String(date.getDate()).padStart(2, '0');
                                            formattedDate = `${year}-${month}-${day}`;
                                          }
                                          setScheduleFormData({
                                            scheduledDate: formattedDate,
                                            scheduledTime: candidateEntry.scheduledTime || '',
                                            duration: candidateEntry.duration || 30,
                                            meetingLink: candidateEntry.meetingLink || '',
                                            notes: candidateEntry.notes || '',
                                            status: candidateEntry.status || 'scheduled'
                                          });
                                          setShowCandidatesModal(false);
                                          setShowScheduleModal(true);
                                        }}
                                      >
                                        Edit
                                      </StyledButton>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                            <p>No candidates assigned to this interview</p>
                          </div>
                        )}
                      </div>

                      <ModalActions style={{ marginTop: '1.5rem' }}>
                        <CancelButton onClick={() => {
                          setShowCandidatesModal(false);
                          setSelectedInterview(null);
                        }}>
                          Close
                        </CancelButton>
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
                          Feedback Summary - {selectedCandidate?.candidate?.user?.name || selectedCandidate?.candidate?.name || 'Candidate'} 
                          {selectedInterview?.title ? ` (${selectedInterview.title})` : ''}
                        </ModalTitle>
                        <CloseButton onClick={() => {
                          setShowFeedbackModal(false);
                          setSelectedCandidate(null);
                        }}>×</CloseButton>
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
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                marginBottom: '1rem',
                                paddingBottom: '0.75rem',
                                borderBottom: '2px solid #e5e7eb'
                              }}>
                                <div>
                                  <h4 style={{ margin: '0 0 0.25rem 0', color: '#1e293b', fontSize: '1.25rem' }}>
                                    {candidateData.candidate.name || 'Unknown Candidate'}
                                  </h4>
                                  {candidateData.candidate.candidateNumber && (
                                    <span style={{ 
                                      color: '#6b7280', 
                                      fontSize: '0.875rem',
                                      background: '#f3f4f6',
                                      padding: '0.25rem 0.5rem',
                                      borderRadius: '4px'
                                    }}>
                                      ID: {candidateData.candidate.candidateNumber}
                                    </span>
                                  )}
                                  {candidateData.candidate.email && (
                                    <div style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                                      {candidateData.candidate.email}
                                    </div>
                                  )}
                                </div>
                                {candidateData.averageRating > 0 && (
                                  <div style={{
                                    background: '#f0f9ff',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '8px',
                                    textAlign: 'center'
                                  }}>
                                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                                      Average Rating
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e40af' }}>
                                      {candidateData.averageRating.toFixed(1)}/5
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {candidateData.feedbacks && candidateData.feedbacks.length > 0 ? (
                                <div>
                                  {candidateData.feedbacks.map((feedback, fbIndex) => (
                                    <div key={fbIndex} style={{
                                      background: '#f8fafc',
                                      padding: '0.75rem',
                                      borderRadius: '6px',
                                      marginBottom: '0.5rem'
                                    }}>
                                      <div style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center',
                                        marginBottom: '0.75rem',
                                        paddingBottom: '0.5rem',
                                        borderBottom: '2px solid #e5e7eb'
                                      }}>
                                        <div>
                                          <strong style={{ fontSize: '1rem', color: '#1e293b' }}>
                                            {feedback.panelMember?.name || 'Unknown Panel Member'}
                                          </strong>
                                          {feedback.panelMember?.email && (
                                            <div style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                              {feedback.panelMember.email}
                                            </div>
                                          )}
                                        </div>
                                        <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                                          {feedback.submittedAt ? new Date(feedback.submittedAt).toLocaleDateString('en-IN', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          }) : 'Not submitted'}
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
                                      
                                      {feedback.questionAnswers && feedback.questionAnswers.length > 0 && (
                                        <div style={{ marginBottom: '0.5rem' }}>
                                          <strong>Feedback Form Answers:</strong>
                                          {feedback.questionAnswers
                                            .filter(qa => {
                                              // Filter out recommendation-related questions
                                              const questionText = (qa.question || '').toLowerCase();
                                              return !questionText.includes('recommend');
                                            })
                                            .map((qa, qaIndex) => (
                                            <div key={qaIndex} style={{ 
                                              marginTop: '0.5rem', 
                                              padding: '0.5rem', 
                                              background: 'white', 
                                              borderRadius: '4px',
                                              fontSize: '0.875rem'
                                            }}>
                                              <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                                                {qa.question}:
                                              </div>
                                              <div style={{ color: '#6b7280' }}>
                                                {qa.type === 'rating' ? `${qa.answer}/5` : 
                                                 qa.type === 'yes_no' ? (qa.answer ? 'Yes' : 'No') : 
                                                 qa.answer}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {feedback.recommendation && (
                                        <div style={{ marginBottom: '0.5rem' }}>
                                          <strong>Recommendation:</strong>
                                          <div style={{ 
                                            display: 'inline-block',
                                            marginLeft: '0.5rem',
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '4px',
                                            fontSize: '0.875rem',
                                            fontWeight: '600',
                                            background: feedback.recommendation === 'strong_accept' || feedback.recommendation === 'accept' 
                                              ? '#dcfce7' 
                                              : feedback.recommendation === 'reject' || feedback.recommendation === 'strong_reject'
                                              ? '#fee2e2'
                                              : '#fef3c7',
                                            color: feedback.recommendation === 'strong_accept' || feedback.recommendation === 'accept'
                                              ? '#166534'
                                              : feedback.recommendation === 'reject' || feedback.recommendation === 'strong_reject'
                                              ? '#991b1b'
                                              : '#92400e'
                                          }}>
                                            {feedback.recommendation === 'strong_accept' ? 'Strong Accept' :
                                             feedback.recommendation === 'accept' ? 'Accept' :
                                             feedback.recommendation === 'neutral' ? 'Neutral' :
                                             feedback.recommendation === 'reject' ? 'Reject' :
                                             feedback.recommendation === 'strong_reject' ? 'Strong Reject' :
                                             feedback.recommendation}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {feedback.comments && (
                                        <div>
                                          <strong>Comments:</strong>
                                          <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', fontStyle: 'italic', color: '#374151' }}>
                                            {feedback.comments}
                                          </p>
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

                {/* Configure Feedback Form Modal */}
                {showFeedbackFormModal && selectedInterview && (
                  <ModalOverlay>
                    <ModalContent style={{ maxWidth: '800px', maxHeight: '90vh' }}>
                      <ModalHeader>
                        <ModalTitle>Configure Feedback Form - {selectedInterview.title}</ModalTitle>
                        <CloseButton onClick={() => {
                          setShowFeedbackFormModal(false);
                          setSelectedInterview(null);
                        }}>×</CloseButton>
                      </ModalHeader>

                      <div style={{ maxHeight: '70vh', overflowY: 'auto', marginBottom: '1.5rem' }}>
                        <div style={{ marginBottom: '1rem' }}>
                          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
                            Configure the feedback form questions for offline interviews. Panel members will use this form to provide feedback.
                          </p>
                          <StyledButton
                            variant="info"
                            onClick={handleAddFeedbackQuestion}
                            style={{ marginBottom: '1rem' }}
                          >
                            + Add Question
                          </StyledButton>
                        </div>

                        {interviewFormData.feedbackForm.questions.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                            <p>No questions added yet. Click "Add Question" to create feedback questions.</p>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {interviewFormData.feedbackForm.questions.map((question, index) => (
                              <div key={index} style={{
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                padding: '1rem',
                                background: '#f9fafb'
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                  <strong style={{ color: '#1e293b' }}>Question {index + 1}</strong>
                                  <StyledButton
                                    danger
                                    onClick={() => handleRemoveFeedbackQuestion(index)}
                                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                  >
                                    Remove
                                  </StyledButton>
                                </div>

                                <div style={{ marginBottom: '0.75rem' }}>
                                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
                                    Question Text *
                                  </label>
                                  <input
                                    type="text"
                                    value={question.question}
                                    onChange={(e) => handleUpdateFeedbackQuestion(index, 'question', e.target.value)}
                                    placeholder="e.g., Rate the candidate's technical skills"
                                    style={{
                                      width: '100%',
                                      padding: '0.75rem',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '4px'
                                    }}
                                  />
                                </div>

                                <div style={{ marginBottom: '0.75rem' }}>
                                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
                                    Question Type *
                                  </label>
                                  <select
                                    value={question.type}
                                    onChange={(e) => handleUpdateFeedbackQuestion(index, 'type', e.target.value)}
                                    style={{
                                      width: '100%',
                                      padding: '0.75rem',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '4px'
                                    }}
                                  >
                                    <option value="rating">Rating (1-5)</option>
                                    <option value="text">Text/Paragraph</option>
                                    <option value="yes_no">Yes/No</option>
                                  </select>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <input
                                    type="checkbox"
                                    checked={question.required}
                                    onChange={(e) => handleUpdateFeedbackQuestion(index, 'required', e.target.checked)}
                                    id={`required-${index}`}
                                  />
                                  <label htmlFor={`required-${index}`} style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
                                    Required field
                                  </label>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <ModalActions>
                        <CancelButton onClick={() => {
                          setShowFeedbackFormModal(false);
                          setSelectedInterview(null);
                        }}>
                          Cancel
                        </CancelButton>
                        <SubmitButton onClick={handleSaveFeedbackForm}>
                          Save Feedback Form
                        </SubmitButton>
                      </ModalActions>
                    </ModalContent>
                  </ModalOverlay>
                )}
              </Container>
            );
          };
          
          export default InterviewsManagement;
