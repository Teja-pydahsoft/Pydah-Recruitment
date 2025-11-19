import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Modal, Form, Alert } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import api from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';

const CourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [showEditDeptModal, setShowEditDeptModal] = useState(false);
  const [selectedCampus, setSelectedCampus] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [newDepartment, setNewDepartment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const campuses = ['Btech', 'Degree', 'Pharmacy', 'Diploma'];

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses');
      setCourses(response.data.courses || []);
      setError('');
    } catch (error) {
      setError('Failed to fetch departments');
      console.error('Courses fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentsForCampus = (campus) => {
    return courses.filter(course => course.campus === campus);
  };

  const handleAddDepartment = (campus) => {
    setSelectedCampus(campus);
    setNewDepartment('');
    setError('');
    setSuccess('');
    setShowAddDeptModal(true);
  };

  const handleEditDepartment = (course) => {
    setSelectedCampus(course.campus);
    setSelectedDepartment(course);
    setNewDepartment(course.department || '');
    setError('');
    setSuccess('');
    setShowEditDeptModal(true);
  };

  const handleSaveDepartment = async (e) => {
    e.preventDefault();
    if (!newDepartment.trim()) {
      setError('Department name is required');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Check if this campus-department combination already exists
      const existingCourse = courses.find(c => 
        c.campus === selectedCampus && c.department === newDepartment.trim()
      );
      
      if (existingCourse) {
        setError('This department already exists for this campus');
        setSubmitting(false);
        return;
      }
      
      // Create new course (campus-department combination)
      await api.post('/courses', {
        campus: selectedCampus,
        department: newDepartment.trim()
      });
      
      setSuccess('Department added successfully!');
      setShowAddDeptModal(false);
      setNewDepartment('');
      setSelectedCampus('');
      fetchCourses();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to add department';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateDepartment = async (e) => {
    e.preventDefault();
    if (!newDepartment.trim()) {
      setError('Department name is required');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Check if new name already exists for this campus
      const existingCourse = courses.find(c => 
        c._id !== selectedDepartment._id &&
        c.campus === selectedCampus && 
        c.department === newDepartment.trim()
      );
      
      if (existingCourse) {
        setError('This department name already exists for this campus');
        setSubmitting(false);
        return;
      }
      
      await api.put(`/courses/${selectedDepartment._id}`, {
        campus: selectedCampus,
        department: newDepartment.trim()
      });
      
      setSuccess('Department updated successfully!');
      setShowEditDeptModal(false);
      setSelectedDepartment(null);
      setNewDepartment('');
      setSelectedCampus('');
      fetchCourses();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update department';
      setError(errorMessage);
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
        setSuccess('Department deleted successfully!');
        fetchCourses();
      } catch (error) {
        setError(error.response?.data?.message || 'Failed to delete department');
      }
    }
  };

  const handleCloseModal = () => {
    setShowAddDeptModal(false);
    setShowEditDeptModal(false);
    setSelectedCampus('');
    setSelectedDepartment(null);
    setNewDepartment('');
    setError('');
    setSuccess('');
  };

  if (loading) {
    return <LoadingSpinner message="Loading departments..." />;
  }

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>Departments</h2>
              <p className="text-muted">Manage campuses and their departments</p>
            </div>
          </div>
        </Col>
      </Row>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Row>
        {campuses.map((campus) => {
          const campusCourses = getDepartmentsForCampus(campus);
          const allDepartments = campusCourses.map(course => ({
            dept: course.department,
            courseId: course._id
          }));

          return (
            <Col md={6} lg={3} key={campus} className="mb-4">
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
                  <span>{campus}</span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleAddDepartment(campus)}
                    style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
                  >
                    <FaPlus />
                  </Button>
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
                        onClick={() => handleAddDepartment(campus)}
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
            {error && <Alert variant="danger">{error}</Alert>}
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
            {error && <Alert variant="danger">{error}</Alert>}
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
    </Container>
  );
};

export default CourseManagement;
