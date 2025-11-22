import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Modal, Form, Alert } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaTag } from 'react-icons/fa';
import api from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';
import ToastNotificationContainer from '../ToastNotificationContainer';

const CourseManagement = () => {
  // Permanent campuses - these are fixed and cannot be added/removed, only renamed
  const PERMANENT_CAMPUSES = ['Btech', 'Degree', 'Pharmacy', 'Diploma'];
  
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

  // Get the actual campus name from database (in case it was renamed)
  // Maps permanent campus names to their actual names in the database
  const getActualCampusName = (permanentCampus) => {
    // Get unique campus names from courses
    const actualCampusNames = [...new Set(courses.map(c => c.campus))];
    
    // Check if there's a course that matches the permanent campus name
    // This handles cases where campus was renamed - we'll use the first match
    // or fallback to the permanent name if no courses exist yet
    const matchingCampus = actualCampusNames.find(actual => 
      actual.toLowerCase() === permanentCampus.toLowerCase() || 
      actual === permanentCampus
    );
    
    return matchingCampus || permanentCampus;
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
      await api.put('/courses/campuses/rename', {
        oldCampusName: campusToRename,
        newCampusName: newCampusName.trim()
      });
      
      setToast({ type: 'success', message: 'Campus renamed successfully!' });
      setShowRenameCampusModal(false);
      setCampusToRename('');
      setNewCampusName('');
      // Refresh courses to show updated campus names
      await fetchCourses();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to rename campus';
      setToast({ type: 'danger', message: errorMessage });
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
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>Campus Management</h2>
              <p className="text-muted">Manage campuses and their departments</p>
            </div>
          </div>
        </Col>
      </Row>


      <Row>
        {PERMANENT_CAMPUSES.map((permanentCampus) => {
          // Get actual campus name (handles renamed campuses)
          const actualCampusName = getActualCampusName(permanentCampus);
          const campusCourses = getDepartmentsForCampus(permanentCampus);
          const allDepartments = campusCourses.map(course => ({
            dept: course.department,
            courseId: course._id
          }));

          return (
            <Col md={6} lg={3} key={permanentCampus} className="mb-4">
              <Card className="h-100 shadow-sm">
                <Card.Header 
                  style={{ 
                    backgroundColor: '#f8f9fa', 
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span>{actualCampusName}</span>
                  <div>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => handleRenameCampus(actualCampusName)}
                      className="me-1"
                      style={{ padding: '0.25rem 0.5rem' }}
                      title="Rename Campus"
                    >
                      <FaTag />
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleAddDepartment(actualCampusName)}
                      style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
                      title="Add Department"
                    >
                      <FaPlus />
                    </Button>
                  </div>
                </Card.Header>
                <Card.Body>
                  {allDepartments.length > 0 ? (
                    <ul className="list-unstyled mb-0">
                      {allDepartments.map((item) => (
                        <li 
                          key={item.courseId} 
                          className="mb-2 d-flex justify-content-between align-items-center"
                          style={{ 
                            padding: '0.5rem',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '6px'
                          }}
                        >
                          <span style={{ fontWeight: 500 }}>{item.dept}</span>
                          <div>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-1"
                              onClick={() => {
                                const course = courses.find(c => c._id === item.courseId);
                                if (course) {
                                  handleEditDepartment(course);
                                }
                              }}
                              style={{ padding: '0.25rem 0.5rem' }}
                            >
                              <FaEdit />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteDepartment(item.courseId)}
                              style={{ padding: '0.25rem 0.5rem' }}
                            >
                              <FaTrash />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-center py-3">
                      <p className="text-muted mb-3">No departments added</p>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleAddDepartment(actualCampusName)}
                      >
                        <FaPlus className="me-1" />
                        Add Department
                      </Button>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

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
    </Container>
  );
};

export default CourseManagement;
