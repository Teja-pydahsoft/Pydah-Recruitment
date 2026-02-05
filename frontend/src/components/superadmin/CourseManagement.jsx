import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { FaPlus, FaEdit, FaTrash, FaTag, FaBuilding } from 'react-icons/fa';
import api from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';
import ToastNotificationContainer from '../ToastNotificationContainer';

// Permanent campuses - these are fixed and cannot be added/removed, only renamed
const PERMANENT_CAMPUSES = ['Btech', 'Degree', 'Pharmacy', 'Diploma'];

const Container = styled.div`
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: clamp(1.5rem, 2vw, 2.5rem);
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const Title = styled.h2`
  color: #1e293b;
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
`;

const Subtitle = styled.p`
  margin: 0;
  color: #6b7280;
  font-size: 1rem;
`;

const CampusGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const CampusCard = styled.div`
  background: white;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12);
    transform: translateY(-2px);
  }
`;

const CampusHeader = styled.div`
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 2px solid #e2e8f0;
  padding: 1.25rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

const CampusTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
`;

const CampusIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #06b6d4, #22d3ee);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.25rem;
  flex-shrink: 0;
`;

const CampusName = styled.h3`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
`;

const ActionButton = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  flex-shrink: 0;
  
  background: ${({ variant }) => {
    switch (variant) {
      case 'primary':
        return '#3b82f6';
      case 'danger':
        return '#06b6d4';
      case 'secondary':
        return '#6b7280';
      default:
        return '#e2e8f0';
    }
  }};
  color: white;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const CampusBody = styled.div`
  padding: 1.25rem 1.5rem;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

const DepartmentsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 0.5rem;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;

const DepartmentItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
    transform: translateX(2px);
  }
`;

const DepartmentName = styled.span`
  font-weight: 500;
  color: #334155;
  font-size: 0.9rem;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 0.75rem;
`;

const DepartmentActions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
`;

const IconButton = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.8rem;
  background: ${({ variant }) => {
    switch (variant) {
      case 'primary':
        return '#dbeafe';
      case 'danger':
        return '#fee2e2';
      default:
        return '#f1f5f9';
    }
  }};
  color: ${({ variant }) => {
    switch (variant) {
      case 'primary':
        return '#1e40af';
      case 'danger':
        return '#0891b2';
      default:
        return '#475569';
    }
  }};
  
  &:hover {
    transform: scale(1.1);
    background: ${({ variant }) => {
      switch (variant) {
        case 'primary':
          return '#bfdbfe';
        case 'danger':
          return '#fecaca';
        default:
          return '#e2e8f0';
      }
    }};
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem 1rem;
  color: #64748b;
  
  p {
    margin: 0 0 1rem 0;
    font-size: 0.9rem;
  }
`;

const AddButton = styled.button`
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const Modal = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 1000;
  overflow-y: auto;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 500px;
  padding: 2rem;
  box-shadow: 0 25px 60px rgba(15, 23, 42, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ModalTitle = styled.h3`
  margin: 0;
  color: #0f172a;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.75rem;
  line-height: 1;
  cursor: pointer;
  color: #94a3b8;
  
  &:hover {
    color: #475569;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 600;
  color: #1e293b;
  font-size: 0.875rem;
`;

const Input = styled.input`
  padding: 0.75rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  background: #ffffff;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  }
  
  &:disabled {
    background: #f8fafc;
    cursor: not-allowed;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
`;

const Button = styled.button`
  flex: 1;
  border: none;
  border-radius: 10px;
  padding: 0.75rem 1.25rem;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${({ variant }) => {
    if (variant === 'primary') {
      return `
        background: linear-gradient(135deg, #3b82f6, #2563eb);
        color: white;
        &:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }
      `;
    }
    return `
      background: white;
      color: #475569;
      border: 2px solid #e2e8f0;
      &:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
      }
    `;
  }}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }
`;

const Alert = styled.div`
  padding: 0.875rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  background: ${({ variant }) => {
    switch (variant) {
      case 'info':
        return '#dbeafe';
      case 'warning':
        return '#fef3c7';
      default:
        return '#f1f5f9';
    }
  }};
  color: ${({ variant }) => {
    switch (variant) {
      case 'info':
        return '#1e40af';
      case 'warning':
        return '#92400e';
      default:
        return '#475569';
    }
  }};
  border-left: 3px solid ${({ variant }) => {
    switch (variant) {
      case 'info':
        return '#3b82f6';
      case 'warning':
        return '#f59e0b';
      default:
        return '#94a3b8';
    }
  }};
`;

const CourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [showEditDeptModal, setShowEditDeptModal] = useState(false);
  const [showRenameCampusModal, setShowRenameCampusModal] = useState(false);
  const [selectedCampus, setSelectedCampus] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [campusToRename, setCampusToRename] = useState('');
  const [newCampusName, setNewCampusName] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ type: '', message: '' });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses');
      setCourses(response.data.courses || []);
    } catch (error) {
      setToast({ type: 'danger', message: 'Failed to fetch departments' });
      console.error('Courses fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create a mapping from permanent campus names to actual campus names
  const campusMapping = useMemo(() => {
    const mapping = {};
    const actualCampusNames = [...new Set(courses.map(c => c.campus))];
    const usedActualNames = new Set();
    
    PERMANENT_CAMPUSES.forEach((permanentCampus, index) => {
      if (actualCampusNames.includes(permanentCampus)) {
        mapping[permanentCampus] = permanentCampus;
        usedActualNames.add(permanentCampus);
        return;
      }
      
      const caseInsensitiveMatch = actualCampusNames.find(actual => 
        actual.toLowerCase() === permanentCampus.toLowerCase() && !usedActualNames.has(actual)
      );
      
      if (caseInsensitiveMatch) {
        mapping[permanentCampus] = caseInsensitiveMatch;
        usedActualNames.add(caseInsensitiveMatch);
        return;
      }
    });
    
    const sortedUnusedActual = actualCampusNames
      .filter(name => !usedActualNames.has(name))
      .sort();
    
    PERMANENT_CAMPUSES.forEach((permanentCampus, index) => {
      if (!mapping[permanentCampus]) {
        if (index < sortedUnusedActual.length) {
          mapping[permanentCampus] = sortedUnusedActual[index];
        } else {
          mapping[permanentCampus] = permanentCampus;
        }
      }
    });
    
    return mapping;
  }, [courses]);

  const getActualCampusName = (permanentCampus) => {
    return campusMapping[permanentCampus] || permanentCampus;
  };

  const getDepartmentsForCampus = (permanentCampus) => {
    const actualCampusName = getActualCampusName(permanentCampus);
    return courses.filter(course => course.campus === actualCampusName);
  };

  const handleAddDepartment = (campus) => {
    setSelectedCampus(campus);
    setNewDepartment('');
    setShowAddDeptModal(true);
  };

  const handleEditDepartment = (course) => {
    setSelectedCampus(course.campus);
    setSelectedDepartment(course);
    setNewDepartment(course.department || '');
    setShowEditDeptModal(true);
  };

  const handleSaveDepartment = async (e) => {
    e.preventDefault();
    if (!newDepartment.trim()) {
      setToast({ type: 'danger', message: 'Department name is required' });
      return;
    }

    setSubmitting(true);

    try {
      const existingCourse = courses.find(c => 
        c.campus === selectedCampus && c.department === newDepartment.trim()
      );
      
      if (existingCourse) {
        setToast({ type: 'danger', message: 'This department already exists for this campus' });
        setSubmitting(false);
        return;
      }
      
      await api.post('/courses', {
        campus: selectedCampus,
        department: newDepartment.trim()
      });
      
      setToast({ type: 'success', message: 'Department added successfully!' });
      setShowAddDeptModal(false);
      setNewDepartment('');
      setSelectedCampus('');
      fetchCourses();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to add department';
      setToast({ type: 'danger', message: errorMessage });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateDepartment = async (e) => {
    e.preventDefault();
    if (!newDepartment.trim()) {
      setToast({ type: 'danger', message: 'Department name is required' });
      return;
    }

    setSubmitting(true);

    try {
      const existingCourse = courses.find(c => 
        c._id !== selectedDepartment._id &&
        c.campus === selectedCampus && 
        c.department === newDepartment.trim()
      );
      
      if (existingCourse) {
        setToast({ type: 'danger', message: 'This department name already exists for this campus' });
        setSubmitting(false);
        return;
      }
      
      await api.put(`/courses/${selectedDepartment._id}`, {
        campus: selectedCampus,
        department: newDepartment.trim()
      });
      
      setToast({ type: 'success', message: 'Department updated successfully!' });
      setShowEditDeptModal(false);
      setSelectedDepartment(null);
      setNewDepartment('');
      setSelectedCampus('');
      fetchCourses();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update department';
      setToast({ type: 'danger', message: errorMessage });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDepartment = async (courseId) => {
    const course = courses.find(c => c._id === courseId);
    if (!course) return;

    const departmentName = course.department;
    if (window.confirm(`Are you sure you want to delete "${departmentName}" from ${course.campus}? This action cannot be undone.`)) {
      try {
        await api.delete(`/courses/${courseId}`);
        setToast({ type: 'success', message: 'Department deleted successfully!' });
        fetchCourses();
      } catch (error) {
        setToast({ type: 'danger', message: error.response?.data?.message || 'Failed to delete department' });
      }
    }
  };

  const handleRenameCampus = (campus) => {
    setCampusToRename(campus);
    setNewCampusName(campus);
    setShowRenameCampusModal(true);
  };

  const handleSaveCampusRename = async (e) => {
    e.preventDefault();
    if (!newCampusName.trim()) {
      setToast({ type: 'danger', message: 'Campus name is required' });
      return;
    }

    if (campusToRename.trim() === newCampusName.trim()) {
      setToast({ type: 'warning', message: 'New campus name must be different from current name' });
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.put('/courses/campuses/rename', {
        oldCampusName: campusToRename,
        newCampusName: newCampusName.trim()
      });
      
      setToast({ 
        type: 'success', 
        message: `Campus renamed successfully! ${response.data?.updatedCount || 0} departments updated.` 
      });
      setShowRenameCampusModal(false);
      setCampusToRename('');
      setNewCampusName('');
      await fetchCourses();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to rename campus';
      setToast({ type: 'danger', message: errorMessage });
      console.error('Campus rename error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowAddDeptModal(false);
    setShowEditDeptModal(false);
    setShowRenameCampusModal(false);
    setSelectedCampus('');
    setSelectedDepartment(null);
    setCampusToRename('');
    setNewCampusName('');
    setNewDepartment('');
  };

  if (loading) {
    return <LoadingSpinner message="Loading campus management..." />;
  }

  return (
    <Container>
      <Header>
        <Title>Campus Management</Title>
        <Subtitle>Manage campuses and their departments</Subtitle>
      </Header>

      <CampusGrid>
        {PERMANENT_CAMPUSES.map((permanentCampus) => {
          const actualCampusName = getActualCampusName(permanentCampus);
          const campusCourses = getDepartmentsForCampus(permanentCampus);

          return (
            <CampusCard key={permanentCampus}>
              <CampusHeader>
                <CampusTitle>
                  <CampusIcon>
                    <FaBuilding />
                  </CampusIcon>
                  <CampusName>{actualCampusName}</CampusName>
                </CampusTitle>
                <HeaderActions>
                  <ActionButton
                    variant="secondary"
                    onClick={() => handleRenameCampus(actualCampusName)}
                    title="Rename Campus"
                  >
                    <FaTag />
                  </ActionButton>
                  <ActionButton
                    variant="primary"
                    onClick={() => handleAddDepartment(actualCampusName)}
                    title="Add Department"
                  >
                    <FaPlus />
                  </ActionButton>
                </HeaderActions>
              </CampusHeader>
              <CampusBody>
                {campusCourses.length > 0 ? (
                  <DepartmentsList>
                    {campusCourses.map((course) => (
                      <DepartmentItem key={course._id}>
                        <DepartmentName>{course.department}</DepartmentName>
                        <DepartmentActions>
                          <IconButton
                            variant="primary"
                            onClick={() => handleEditDepartment(course)}
                            title="Edit Department"
                          >
                            <FaEdit />
                          </IconButton>
                          <IconButton
                            variant="danger"
                            onClick={() => handleDeleteDepartment(course._id)}
                            title="Delete Department"
                          >
                            <FaTrash />
                          </IconButton>
                        </DepartmentActions>
                      </DepartmentItem>
                    ))}
                  </DepartmentsList>
                ) : (
                  <EmptyState>
                    <p>No departments added</p>
                    <AddButton onClick={() => handleAddDepartment(actualCampusName)}>
                      <FaPlus />
                      Add Department
                    </AddButton>
                  </EmptyState>
                )}
              </CampusBody>
            </CampusCard>
          );
        })}
      </CampusGrid>

      {/* Add Department Modal */}
      {showAddDeptModal && (
        <Modal onClick={(e) => e.target === e.currentTarget && handleCloseModal()}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Add Department</ModalTitle>
              <CloseButton onClick={handleCloseModal}>&times;</CloseButton>
            </ModalHeader>
            <Form onSubmit={handleSaveDepartment}>
              <FormGroup>
                <Label>Campus</Label>
                <Input
                  type="text"
                  value={selectedCampus}
                  disabled
                />
              </FormGroup>
              <FormGroup>
                <Label>Department Name *</Label>
                <Input
                  type="text"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  required
                  placeholder="Enter department name (e.g., CSE, ECE, Mechanical)"
                  autoFocus
                />
              </FormGroup>
              <ButtonRow>
                <Button type="button" onClick={handleCloseModal} disabled={submitting}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Department'}
                </Button>
              </ButtonRow>
            </Form>
          </ModalContent>
        </Modal>
      )}

      {/* Edit Department Modal */}
      {showEditDeptModal && (
        <Modal onClick={(e) => e.target === e.currentTarget && handleCloseModal()}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Edit Department</ModalTitle>
              <CloseButton onClick={handleCloseModal}>&times;</CloseButton>
            </ModalHeader>
            <Form onSubmit={handleUpdateDepartment}>
              <FormGroup>
                <Label>Campus</Label>
                <Input
                  type="text"
                  value={selectedCampus}
                  disabled
                />
              </FormGroup>
              <FormGroup>
                <Label>Department Name *</Label>
                <Input
                  type="text"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  required
                  placeholder="Enter department name"
                  autoFocus
                />
              </FormGroup>
              <ButtonRow>
                <Button type="button" onClick={handleCloseModal} disabled={submitting}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={submitting}>
                  {submitting ? 'Updating...' : 'Update Department'}
                </Button>
              </ButtonRow>
            </Form>
          </ModalContent>
        </Modal>
      )}

      {/* Rename Campus Modal */}
      {showRenameCampusModal && (
        <Modal onClick={(e) => e.target === e.currentTarget && handleCloseModal()}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Rename Campus</ModalTitle>
              <CloseButton onClick={handleCloseModal}>&times;</CloseButton>
            </ModalHeader>
            <Form onSubmit={handleSaveCampusRename}>
              <Alert variant="info">
                <strong>Note:</strong> Renaming a campus will update all departments under this campus. This action cannot be undone easily.
              </Alert>
              <FormGroup>
                <Label>Current Campus Name</Label>
                <Input
                  type="text"
                  value={campusToRename}
                  disabled
                />
              </FormGroup>
              <FormGroup>
                <Label>New Campus Name *</Label>
                <Input
                  type="text"
                  value={newCampusName}
                  onChange={(e) => setNewCampusName(e.target.value)}
                  required
                  placeholder="Enter new campus name"
                  autoFocus
                />
              </FormGroup>
              <ButtonRow>
                <Button type="button" onClick={handleCloseModal} disabled={submitting}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={submitting}>
                  {submitting ? 'Renaming...' : 'Rename Campus'}
                </Button>
              </ButtonRow>
            </Form>
          </ModalContent>
        </Modal>
      )}

      <ToastNotificationContainer 
        toast={toast} 
        onClose={() => setToast({ type: '', message: '' })} 
      />
    </Container>
  );
};

export default CourseManagement;
