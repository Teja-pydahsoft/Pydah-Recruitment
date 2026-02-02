import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Modal, Form, Alert } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaTag } from 'react-icons/fa';
import styled from 'styled-components';
import api from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';
import ToastNotificationContainer from '../ToastNotificationContainer';

// Permanent campuses - these are fixed and cannot be added/removed, only renamed
const PERMANENT_CAMPUSES = ['Btech', 'Degree', 'Pharmacy', 'Diploma'];

// Styled Components for better responsive design
const PageContainer = styled(Container)`
  padding: clamp(1rem, 2vw, 2rem);
  max-width: 100%;
  overflow-x: hidden;
`;

const PageHeader = styled.div`
  margin-bottom: clamp(1.5rem, 3vw, 2.5rem);
  
  h2 {
    font-size: clamp(1.5rem, 4vw, 2rem);
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 0.5rem;
  }
  
  p {
    font-size: clamp(0.9rem, 2vw, 1rem);
    color: #64748b;
    margin: 0;
  }
`;

const CardsRow = styled(Row)`
  margin: 0;
  gap: clamp(1rem, 2vw, 1.5rem);
  
  @media (max-width: 576px) {
    margin: 0;
  }
`;

const CampusCard = styled(Card)`
  height: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  
  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    transform: translateY(-2px);
  }
`;

const CardHeaderStyled = styled(Card.Header)`
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 2px solid #e2e8f0;
  padding: clamp(1rem, 2vw, 1.25rem);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  
  span {
    font-size: clamp(1rem, 2.5vw, 1.1rem);
    font-weight: 700;
    color: #1e293b;
    flex: 1;
    min-width: 120px;
  }
  
  div {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
`;

const CardBodyStyled = styled(Card.Body)`
  padding: clamp(1rem, 2vw, 1.25rem);
  flex: 1;
  overflow-y: auto;
  max-height: 500px;
  
  @media (max-width: 768px) {
    max-height: 400px;
  }
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;

const DepartmentList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const DepartmentItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: clamp(0.75rem, 1.5vw, 1rem);
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }
  
  span {
    font-weight: 500;
    color: #334155;
    font-size: clamp(0.9rem, 2vw, 1rem);
    flex: 1;
    word-break: break-word;
    margin-right: 0.75rem;
  }
  
  div {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
  }
`;

const ActionButton = styled(Button)`
  min-width: ${props => props.$iconOnly ? '36px' : 'auto'};
  height: ${props => props.$iconOnly ? '36px' : 'auto'};
  padding: ${props => props.$iconOnly ? '0' : '0.5rem 1rem'};
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${props => props.$iconOnly ? '50%' : '6px'};
  font-size: ${props => props.$iconOnly ? '0.875rem' : '0.875rem'};
  transition: all 0.2s ease;
  
  @media (max-width: 576px) {
    min-width: ${props => props.$iconOnly ? '40px' : 'auto'};
    height: ${props => props.$iconOnly ? '40px' : 'auto'};
    padding: ${props => props.$iconOnly ? '0' : '0.625rem 1.25rem'};
  }
  
  &:hover {
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: clamp(2rem, 4vw, 3rem) 1rem;
  
  p {
    color: #64748b;
    font-size: clamp(0.9rem, 2vw, 1rem);
    margin-bottom: 1.5rem;
  }
`;

const StyledCol = styled(Col)`
  margin-bottom: clamp(1rem, 2vw, 1.5rem);
  
  @media (max-width: 576px) {
    margin-bottom: 1.5rem;
  }
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
  // This handles renamed campuses by maintaining a consistent mapping
  const campusMapping = useMemo(() => {
    const mapping = {};
    const actualCampusNames = [...new Set(courses.map(c => c.campus))];
    const usedActualNames = new Set();
    
    // First pass: exact and case-insensitive matches
    PERMANENT_CAMPUSES.forEach((permanentCampus, index) => {
      // Try exact match first
      if (actualCampusNames.includes(permanentCampus)) {
        mapping[permanentCampus] = permanentCampus;
        usedActualNames.add(permanentCampus);
        return;
      }
      
      // Try case-insensitive match
      const caseInsensitiveMatch = actualCampusNames.find(actual => 
        actual.toLowerCase() === permanentCampus.toLowerCase() && !usedActualNames.has(actual)
      );
      
      if (caseInsensitiveMatch) {
        mapping[permanentCampus] = caseInsensitiveMatch;
        usedActualNames.add(caseInsensitiveMatch);
        return;
      }
    });
    
    // Second pass: map remaining permanent campuses to remaining actual campuses by index
    const sortedUnusedActual = actualCampusNames
      .filter(name => !usedActualNames.has(name))
      .sort();
    
    PERMANENT_CAMPUSES.forEach((permanentCampus, index) => {
      if (!mapping[permanentCampus]) {
        // If we have an unused actual campus at this index, use it
        if (index < sortedUnusedActual.length) {
          mapping[permanentCampus] = sortedUnusedActual[index];
        } else {
          // No matching actual campus found, use permanent name
          mapping[permanentCampus] = permanentCampus;
        }
      }
    });
    
    return mapping;
  }, [courses]);

  // Get the actual campus name from database (in case it was renamed)
  const getActualCampusName = (permanentCampus) => {
    return campusMapping[permanentCampus] || permanentCampus;
  };

  const getDepartmentsForCampus = (permanentCampus) => {
    // Get the actual campus name (handles renamed campuses)
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
      // Check if this campus-department combination already exists
      const existingCourse = courses.find(c => 
        c.campus === selectedCampus && c.department === newDepartment.trim()
      );
      
      if (existingCourse) {
        setToast({ type: 'danger', message: 'This department already exists for this campus' });
        setSubmitting(false);
        return;
      }
      
      // Create new course (campus-department combination)
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
      // Check if new name already exists for this campus
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
      // Refresh courses to show updated campus names and departments
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
    <PageContainer fluid>
      <PageHeader>
        <h2>Campus Management</h2>
        <p>Manage campuses and their departments</p>
      </PageHeader>

      <CardsRow>
        {PERMANENT_CAMPUSES.map((permanentCampus, index) => {
          // Get actual campus name (handles renamed campuses)
          const actualCampusName = getActualCampusName(permanentCampus);
          const campusCourses = getDepartmentsForCampus(permanentCampus);
          const allDepartments = campusCourses.map(course => ({
            dept: course.department,
            courseId: course._id
          }));

          return (
            <StyledCol xs={12} sm={6} md={6} lg={3} xl={3} key={permanentCampus}>
              <CampusCard>
                <CardHeaderStyled>
                  <span>{actualCampusName}</span>
                  <div>
                    <ActionButton
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => handleRenameCampus(actualCampusName)}
                      title="Rename Campus"
                      $iconOnly
                    >
                      <FaTag />
                    </ActionButton>
                    <ActionButton
                      variant="primary"
                      size="sm"
                      onClick={() => handleAddDepartment(actualCampusName)}
                      title="Add Department"
                      $iconOnly
                    >
                      <FaPlus />
                    </ActionButton>
                  </div>
                </CardHeaderStyled>
                <CardBodyStyled>
                  {allDepartments.length > 0 ? (
                    <DepartmentList>
                      {allDepartments.map((item) => (
                        <DepartmentItem key={item.courseId}>
                          <span>{item.dept}</span>
                          <div>
                            <ActionButton
                              variant="outline-primary"
                              size="sm"
                              onClick={() => {
                                const course = courses.find(c => c._id === item.courseId);
                                if (course) {
                                  handleEditDepartment(course);
                                }
                              }}
                              title="Edit Department"
                              $iconOnly
                            >
                              <FaEdit />
                            </ActionButton>
                            <ActionButton
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteDepartment(item.courseId)}
                              title="Delete Department"
                              $iconOnly
                            >
                              <FaTrash />
                            </ActionButton>
                          </div>
                        </DepartmentItem>
                      ))}
                    </DepartmentList>
                  ) : (
                    <EmptyState>
                      <p>No departments added</p>
                      <ActionButton
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleAddDepartment(actualCampusName)}
                      >
                        <FaPlus style={{ marginRight: '0.5rem' }} />
                        Add Department
                      </ActionButton>
                    </EmptyState>
                  )}
                </CardBodyStyled>
              </CampusCard>
            </StyledCol>
          );
        })}
      </CardsRow>

      {/* Add Department Modal */}
      <Modal show={showAddDeptModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add Department to {selectedCampus}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveDepartment}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Campus</Form.Label>
              <Form.Control
                type="text"
                value={selectedCampus}
                disabled
                style={{ backgroundColor: '#f8f9fa' }}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Department Name *</Form.Label>
              <Form.Control
                type="text"
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                required
                placeholder="Enter department name (e.g., CSE, ECE, Mechanical)"
                autoFocus
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Department'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Edit Department Modal */}
      <Modal show={showEditDeptModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Department in {selectedCampus}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdateDepartment}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Campus</Form.Label>
              <Form.Control
                type="text"
                value={selectedCampus}
                disabled
                style={{ backgroundColor: '#f8f9fa' }}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Department Name *</Form.Label>
              <Form.Control
                type="text"
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                required
                placeholder="Enter department name"
                autoFocus
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Updating...' : 'Update Department'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Rename Campus Modal */}
      <Modal show={showRenameCampusModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Rename Campus</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveCampusRename}>
          <Modal.Body>
            <Alert variant="info" className="mb-3">
              <strong>Note:</strong> Renaming a campus will update all departments under this campus. This action cannot be undone easily.
            </Alert>
            <Form.Group className="mb-3">
              <Form.Label>Current Campus Name</Form.Label>
              <Form.Control
                type="text"
                value={campusToRename}
                disabled
                style={{ backgroundColor: '#f8f9fa' }}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>New Campus Name *</Form.Label>
              <Form.Control
                type="text"
                value={newCampusName}
                onChange={(e) => setNewCampusName(e.target.value)}
                required
                placeholder="Enter new campus name"
                autoFocus
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Renaming...' : 'Rename Campus'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
      <ToastNotificationContainer 
        toast={toast} 
        onClose={() => setToast({ type: '', message: '' })} 
      />
    </PageContainer>
  );
};

export default CourseManagement;
