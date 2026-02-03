import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import api from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';
import ToastNotificationContainer from '../ToastNotificationContainer';

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
  margin-top: 1rem;
`;

const Title = styled.h2`
  color: #1e293b;
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
`;

const Toolbar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
`;

const AddButton = styled.button`
  background: linear-gradient(135deg, #ef4444, #f97316);
  color: white;
  border: none;
  padding: 0.875rem 2rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(249, 115, 22, 0.4);
    background: linear-gradient(135deg, #f97316, #fb923c);
  }

  &:active {
    transform: translateY(0);
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.08);
  border: 1px solid #e2e8f0;
`;

const Th = styled.th`
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  padding: 1.25rem 1.5rem;
  text-align: left;
  font-weight: 700;
  font-size: 0.875rem;
  color: #334155;
  border-bottom: 2px solid #e2e8f0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const Td = styled.td`
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  color: #475569;
  vertical-align: top;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #f8fafc;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button`
  background: ${({ variant }) => {
    switch (variant) {
      case 'danger':
        return '#fee2e2';
      case 'secondary':
        return '#f1f5f9';
      default:
        return '#dcfce7';
    }
  }};
  color: ${({ variant }) => {
    switch (variant) {
      case 'danger':
        return '#b91c1c';
      case 'secondary':
        return '#475569';
      default:
        return '#15803d';
    }
  }};
  border: 1px solid ${({ variant }) => {
    switch (variant) {
      case 'danger':
        return '#fecaca';
      case 'secondary':
        return '#e2e8f0';
      default:
        return '#bbf7d0';
    }
  }};
  padding: 0.5rem 1rem;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.1);
    background: ${({ variant }) => {
      switch (variant) {
        case 'danger':
          return '#fecaca';
        case 'secondary':
          return '#e2e8f0';
        default:
          return '#bbf7d0';
      }
    }};
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
  max-width: 1200px;
  max-height: 95vh;
  padding: 1.5rem 2rem;
  box-shadow: 0 25px 60px rgba(15, 23, 42, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  flex-direction: column;
  margin: auto;
  overflow: hidden;
  
  @media (max-width: 1200px) {
    max-width: 95vw;
    padding: 1.25rem 1.5rem;
  }
  
  @media (max-width: 768px) {
    padding: 1rem;
    max-height: 98vh;
  }
`;

const SectionsContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 2rem;
  margin-bottom: 1.5rem;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const SectionWrapper = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
`;

const SectionContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  overflow-y: auto;
  min-height: 0;
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

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  flex-shrink: 0;
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
  gap: 0;
  height: 100%;
  overflow: hidden;
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
  letter-spacing: -0.01em;
`;

const Input = styled.input`
  padding: 0.625rem 0.875rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  background: #ffffff;

  &:focus {
    outline: none;
    border-color: #f97316;
    box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
    background: #fff;
  }

  &:hover:not(:focus) {
    border-color: #cbd5e1;
  }
`;

const PermissionCard = styled.div`
  border: 2px solid ${({ enabled }) => (enabled ? 'rgba(249, 115, 22, 0.4)' : '#e2e8f0')};
  border-radius: 8px;
  padding: 0.75rem;
  background: ${({ enabled }) => (enabled ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, rgba(249, 115, 22, 0.03) 100%)' : 'white')};
  transition: all 0.2s ease;
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: ${({ enabled }) => (enabled ? '2px' : '0')};
    background: linear-gradient(90deg, #f97316, #fb923c);
    transition: height 0.2s ease;
    border-radius: 8px 8px 0 0;
  }

  &:hover {
    border-color: ${({ enabled }) => (enabled ? 'rgba(249, 115, 22, 0.5)' : '#cbd5e1')};
    transform: translateY(-1px);
    box-shadow: ${({ enabled }) => (enabled ? '0 2px 8px rgba(249, 115, 22, 0.12)' : '0 1px 4px rgba(15, 23, 42, 0.06)')};
  }
`;

const PermissionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex: 1;
`;

const PermissionCheckbox = styled.input`
  cursor: pointer;
  width: 16px;
  height: 16px;
  accent-color: #f97316;
  flex-shrink: 0;
  margin: 0;
  
  &:checked {
    filter: drop-shadow(0 1px 3px rgba(249, 115, 22, 0.3));
  }
`;

const PermissionDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  flex: 1;
`;

const PermissionLabel = styled.span`
  font-weight: 600;
  color: #1e293b;
  font-size: 0.875rem;
  line-height: 1.3;
`;

const PermissionAccessControl = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-shrink: 0;
`;

const AccessLevelGroup = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: auto;
  
  @media (max-width: 480px) {
    flex-direction: column;
    gap: 0.75rem;
  }
`;

const AccessLevelOption = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
  padding: 0.625rem 0.875rem;
  border-radius: 8px;
  transition: all 0.2s ease;
  flex: 1;
  justify-content: center;
  background: ${({ selected }) => (selected ? 'rgba(249, 115, 22, 0.1)' : 'transparent')};
  border: 2px solid ${({ selected }) => (selected ? 'rgba(249, 115, 22, 0.3)' : 'rgba(226, 232, 240, 0.5)')};
  
  input[type="radio"] {
    cursor: pointer;
    width: 16px;
    height: 16px;
    accent-color: #f97316;
    margin: 0;
    flex-shrink: 0;
  }
  
  span {
    white-space: nowrap;
  }
  
  &:hover {
    color: #1e293b;
    background: ${({ selected }) => (selected ? 'rgba(249, 115, 22, 0.15)' : 'rgba(15, 23, 42, 0.03)')};
    border-color: ${({ selected }) => (selected ? 'rgba(249, 115, 22, 0.4)' : 'rgba(15, 23, 42, 0.15)')};
    transform: translateY(-1px);
  }
`;

const SectionTitle = styled.h4`
  margin: 0 0 0.75rem 0;
  color: #1e293b;
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e2e8f0;
  
  &::before {
    content: '';
    width: 4px;
    height: 20px;
    background: linear-gradient(135deg, #f97316, #fb923c);
    border-radius: 2px;
  }
`;

const PermissionsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  max-height: 500px;
  overflow-y: auto;
  padding-right: 0.5rem;
  
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

const ButtonRow = styled.div`
  display: flex;
  gap: 0.875rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
  flex-shrink: 0;
`;

const SubmitButton = styled.button`
  flex: 1;
  border: none;
  border-radius: 10px;
  padding: 0.75rem 1.25rem;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
    background: linear-gradient(135deg, #059669, #047857);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    background: #cbd5e1;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }
`;

const CancelButton = styled.button`
  flex: 1;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.75rem 1.25rem;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  background: white;
  color: #475569;
  transition: all 0.2s ease;

  &:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
    color: #334155;
  }
`;

const StatusPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.75rem;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 0.85rem;
  background: ${({ active }) => (active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(248, 113, 113, 0.15)')};
  color: ${({ active }) => (active ? '#047857' : '#b91c1c')};
`;

const PermissionList = styled.ul`
  margin: 0;
  padding-left: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.9rem;
  color: #475569;
`;

const SubAdminManagement = () => {
  const [subAdmins, setSubAdmins] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [viewingPermissions, setViewingPermissions] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingSubAdmin, setEditingSubAdmin] = useState(null);
  const [toast, setToast] = useState({ type: '', message: '' });
  const [campuses, setCampuses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    password: '',
    campus: '',
    courses: [],
    permissions: {}, // Object: { 'forms.manage': 'read_only' | 'full_access', ... }
    hasPanelMemberAccess: false
  });

  const permissionDetails = useMemo(() => {
    return availablePermissions.reduce((acc, permission) => {
      acc[permission.key] = permission;
      return acc;
    }, {});
  }, [availablePermissions]);

  useEffect(() => {
    fetchSubAdmins();
    fetchCampuses();
  }, []);

  const fetchSubAdmins = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/auth/sub-admins');
      setSubAdmins(data.subAdmins || []);
      setAvailablePermissions(data.availablePermissions || []);
    } catch (error) {
      console.error('Failed to fetch sub admins', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampuses = async () => {
    try {
      const response = await api.get('/courses/campuses/list');
      const fetchedCampuses = response.data.campuses || [];
      setCampuses(fetchedCampuses);
      console.log('Campuses fetched:', fetchedCampuses);
    } catch (error) {
      console.error('Error fetching campuses:', error);
      setToast({ type: 'danger', message: 'Failed to load campuses. Please refresh the page.' });
    }
  };

  const fetchCoursesForCampus = async (campus) => {
    if (!campus) {
      setCourses([]);
      return;
    }
    try {
      const response = await api.get(`/courses/campus/${campus}`);
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setCourses([]);
    }
  };

  const resetForm = () => {
    setFormState({
      name: '',
      email: '',
      password: '',
      campus: '',
      courses: [],
      permissions: {},
      hasPanelMemberAccess: false
    });
    setEditingSubAdmin(null);
    setCourses([]);
  };

  const openCreateModal = async () => {
    // Ensure campuses are loaded before opening modal
    if (campuses.length === 0) {
      await fetchCampuses();
    }
    resetForm();
    setShowModal(true);
  };

  const openEditModal = async (subAdmin) => {
    setEditingSubAdmin(subAdmin);
    
    // Ensure campuses are loaded before opening modal
    if (campuses.length === 0) {
      await fetchCampuses();
    }
    
    // Convert permissions from array (old format) or object (new format) to object format
    let permissionsObj = {};
    if (Array.isArray(subAdmin.permissions)) {
      // Old format: convert array to object with full_access (legacy support)
      subAdmin.permissions.forEach(key => {
        permissionsObj[key] = 'full_access';
      });
    } else if (typeof subAdmin.permissions === 'object' && subAdmin.permissions !== null) {
      permissionsObj = subAdmin.permissions;
    }
    
    const subAdminCourses = subAdmin.courses ? subAdmin.courses.map(c => typeof c === 'object' ? c._id : c) : [];
    
    setFormState({
      name: subAdmin.name,
      email: subAdmin.email,
      password: '',
      campus: subAdmin.campus || '',
      courses: subAdminCourses,
      permissions: permissionsObj,
      isActive: subAdmin.isActive,
      hasPanelMemberAccess: subAdmin.hasPanelMemberAccess === true
    });
    
    // Fetch courses for the sub-admin's campus
    if (subAdmin.campus) {
      await fetchCoursesForCampus(subAdmin.campus);
    }
    
    setShowModal(true);
  };

  const closeModal = () => {
    if (!saving) {
      setShowModal(false);
      resetForm();
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    if (name === 'campus') {
      // When campus changes, fetch courses for that campus and reset selected courses
      setFormState((prev) => ({
        ...prev,
        campus: value,
        courses: [] // Reset courses when campus changes
      }));
      fetchCoursesForCampus(value);
    } else {
      setFormState((prev) => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const togglePermission = (permissionKey) => {
    setFormState((prev) => {
      const current = prev.permissions || {};
      const newPermissions = { ...current };
      
      if (newPermissions[permissionKey]) {
        // Remove permission if it exists
        delete newPermissions[permissionKey];
      } else {
        // Add permission with default 'view_only' access
        newPermissions[permissionKey] = 'view_only';
      }
      
      return {
        ...prev,
        permissions: newPermissions
      };
    });
  };

  const setPermissionAccess = (permissionKey, accessLevel) => {
    setFormState((prev) => {
      const current = prev.permissions || {};
      return {
        ...prev,
        permissions: {
          ...current,
          [permissionKey]: accessLevel
        }
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      const payload = {
        name: formState.name,
        email: formState.email,
        campus: formState.campus || null,
        courses: formState.courses && formState.courses.length > 0 ? formState.courses : undefined,
        permissions: formState.permissions,
        hasPanelMemberAccess: formState.hasPanelMemberAccess
      };

      if (!editingSubAdmin) {
        payload.password = formState.password;
        await api.post('/auth/sub-admins', payload);
      } else {
        if (formState.password) {
          payload.password = formState.password;
        }
        payload.isActive = formState.isActive;
        await api.put(`/auth/sub-admins/${editingSubAdmin._id}`, payload);
      }

      await fetchSubAdmins();
      setShowModal(false);
      resetForm();
      setToast({ type: 'success', message: editingSubAdmin ? 'Sub admin updated successfully.' : 'Sub admin created successfully.' });
    } catch (error) {
      console.error('Failed to save sub admin', error);
      setToast({ type: 'danger', message: error.response?.data?.message || 'Unable to save sub admin' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (subAdminId) => {
    if (!window.confirm('Are you sure you want to remove this sub admin? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/auth/sub-admins/${subAdminId}`);
      await fetchSubAdmins();
      setToast({ type: 'success', message: 'Sub admin deleted successfully.' });
    } catch (error) {
      console.error('Failed to delete sub admin', error);
      setToast({ type: 'danger', message: error.response?.data?.message || 'Unable to delete sub admin' });
    }
  };

  const handleStatusToggle = async (subAdmin) => {
    try {
      await api.put(`/auth/users/${subAdmin._id}/status`, { isActive: !subAdmin.isActive });
      await fetchSubAdmins();
      setToast({ type: 'success', message: `Sub admin is now ${!subAdmin.isActive ? 'active' : 'inactive'}.` });
    } catch (error) {
      console.error('Failed to update sub admin status', error);
      setToast({ type: 'danger', message: error.response?.data?.message || 'Unable to update status' });
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Container>
      <Header>
        <Title>Delegated Access & Sub Admins</Title>
      </Header>

      <Toolbar>
        <div>
          <strong>{subAdmins.length}</strong> sub admin{subAdmins.length === 1 ? '' : 's'} configured
        </div>
        <AddButton onClick={openCreateModal}>Add Sub Admin</AddButton>
      </Toolbar>

      <Table>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Campus</Th>
            <Th>Status</Th>
            <Th style={{ width: '220px' }}>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {subAdmins.map((subAdmin) => (
            <tr key={subAdmin._id}>
              <Td>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>{subAdmin.name}</div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  User Management
                  {subAdmin.hasPanelMemberAccess && (
                    <span style={{ 
                      marginLeft: '0.5rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      backgroundColor: '#dbeafe',
                      color: '#1e40af',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      + Panel Member
                    </span>
                  )}
                </div>
              </Td>
              <Td>{subAdmin.email}</Td>
              <Td>
                {subAdmin.campus ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.625rem', 
                      borderRadius: '6px', 
                      backgroundColor: '#dbeafe', 
                      color: '#1e40af',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      display: 'inline-block',
                      width: 'fit-content'
                    }}>
                      {subAdmin.campus}
                    </span>
                    {subAdmin.courses && subAdmin.courses.length > 0 ? (
                      <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: '0.25rem',
                        fontSize: '0.75rem',
                        color: '#64748b'
                      }}>
                        <span style={{ fontWeight: 500 }}>Depts:</span>
                        {subAdmin.courses.slice(0, 3).map((course, idx) => (
                          <span
                            key={typeof course === 'object' ? course._id : course}
                            style={{
                              background: '#e0e7ff',
                              color: '#3730a3',
                              padding: '0.15rem 0.4rem',
                              borderRadius: '4px',
                              fontWeight: '500'
                            }}
                          >
                            {typeof course === 'object' ? course.department : 'N/A'}
                          </span>
                        ))}
                        {subAdmin.courses.length > 3 && (
                          <span style={{ 
                            color: '#64748b',
                            fontWeight: 500,
                            padding: '0.15rem 0.4rem'
                          }}>
                            +{subAdmin.courses.length - 3} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ 
                        fontSize: '0.75rem', 
                        color: '#94a3b8',
                        fontStyle: 'italic'
                      }}>
                        All departments
                      </span>
                    )}
                  </div>
                ) : (
                  <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>All Campuses</span>
                )}
              </Td>
              <Td>
                <StatusPill active={subAdmin.isActive}>
                  {subAdmin.isActive ? 'Active' : 'Inactive'}
                </StatusPill>
              </Td>
              <Td>
                <Actions>
                  <ActionButton 
                    variant="secondary" 
                    onClick={() => {
                      setViewingPermissions(subAdmin);
                      setShowPermissionsModal(true);
                    }}
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                  >
                    View
                  </ActionButton>
                  <ActionButton onClick={() => openEditModal(subAdmin)}>Edit</ActionButton>
                  <ActionButton variant="secondary" onClick={() => handleStatusToggle(subAdmin)}>
                    {subAdmin.isActive ? 'Deactivate' : 'Activate'}
                  </ActionButton>
                  <ActionButton variant="danger" onClick={() => handleDelete(subAdmin._id)}>
                    Remove
                  </ActionButton>
                </Actions>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      {showModal && (
        <Modal>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>{editingSubAdmin ? 'Update Sub Admin' : 'Create Sub Admin'}</ModalTitle>
              <CloseButton onClick={closeModal}>&times;</CloseButton>
            </ModalHeader>

            <Form onSubmit={handleSubmit}>
              <SectionsContainer>
                {/* Section 1: User Details */}
                <SectionWrapper>
                  <SectionTitle>User Details</SectionTitle>
                  <SectionContent>
                    <FormGroup>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        value={formState.name}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter full name"
                      />
                    </FormGroup>

                    <FormGroup>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formState.email}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter email address"
                      />
                    </FormGroup>

                    <FormGroup>
                      <Label htmlFor="password">
                        {editingSubAdmin ? 'New Password (optional)' : 'Password'}
                      </Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={formState.password}
                        onChange={handleInputChange}
                        placeholder={editingSubAdmin ? 'Leave blank to keep existing password' : 'Enter password'}
                        required={!editingSubAdmin}
                      />
                    </FormGroup>

                    <FormGroup>
                      <Label htmlFor="campus">Campus (Optional)</Label>
                      <select
                        id="campus"
                        name="campus"
                        value={formState.campus}
                        onChange={handleInputChange}
                        style={{
                          width: '100%',
                          padding: '0.625rem 0.875rem',
                          border: '2px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          transition: 'all 0.2s ease',
                          background: '#ffffff',
                          cursor: 'pointer'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#f97316';
                          e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#e2e8f0';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        <option value="">All Campuses (No Restriction)</option>
                        {campuses && campuses.length > 0 ? (
                          campuses.map(campus => (
                            <option key={campus} value={campus}>{campus}</option>
                          ))
                        ) : (
                          <option value="" disabled>Loading campuses...</option>
                        )}
                      </select>
                    </FormGroup>

                    {formState.campus && courses.length > 0 && (
                      <FormGroup>
                        <Label>Department Restriction (Optional)</Label>
                        <div style={{
                          border: '2px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          background: '#ffffff',
                          maxHeight: '200px',
                          overflowY: 'auto',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem'
                        }}>
                          {courses.map(course => {
                            const isSelected = formState.courses.includes(course._id);
                            return (
                              <label
                                key={course._id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.625rem',
                                  padding: '0.5rem',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  background: isSelected ? 'rgba(249, 115, 22, 0.05)' : 'transparent',
                                  border: `1px solid ${isSelected ? 'rgba(249, 115, 22, 0.2)' : 'transparent'}`,
                                  fontSize: '0.875rem',
                                  color: '#1e293b',
                                  fontWeight: isSelected ? 500 : 400
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.background = '#f8fafc';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.background = 'transparent';
                                  }
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormState((prev) => ({
                                        ...prev,
                                        courses: [...prev.courses, course._id]
                                      }));
                                    } else {
                                      setFormState((prev) => ({
                                        ...prev,
                                        courses: prev.courses.filter(id => id !== course._id)
                                      }));
                                    }
                                  }}
                                  style={{
                                    cursor: 'pointer',
                                    width: '16px',
                                    height: '16px',
                                    accentColor: '#f97316',
                                    flexShrink: 0
                                  }}
                                />
                                <span>{course.department}</span>
                              </label>
                            );
                          })}
                        </div>
                      </FormGroup>
                    )}

                  </SectionContent>
                </SectionWrapper>

                {/* Section 2: Permissions & Access Levels */}
                <SectionWrapper>
                  <SectionTitle>Permissions & Access Levels</SectionTitle>
                  <PermissionsSection>
                    {availablePermissions.map((permission) => {
                      const isEnabled = !!formState.permissions[permission.key];
                      const accessLevel = formState.permissions[permission.key] || 'view_only';
                      return (
                        <PermissionCard 
                          key={permission.key} 
                          enabled={isEnabled}
                          onClick={() => !isEnabled && togglePermission(permission.key)}
                        >
                          <PermissionHeader>
                            <PermissionCheckbox
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() => togglePermission(permission.key)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <PermissionDetails>
                              <PermissionLabel>{permission.label}</PermissionLabel>
                            </PermissionDetails>
                          </PermissionHeader>
                          {isEnabled && (
                            <PermissionAccessControl onClick={(e) => e.stopPropagation()}>
                              <AccessLevelGroup>
                                <AccessLevelOption selected={accessLevel === 'view_only'}>
                                  <input
                                    type="radio"
                                    name={`access-${permission.key}`}
                                    value="view_only"
                                    checked={accessLevel === 'view_only'}
                                    onChange={() => setPermissionAccess(permission.key, 'view_only')}
                                  />
                                  <span>View Only</span>
                                </AccessLevelOption>
                                <AccessLevelOption selected={accessLevel === 'full_access'}>
                                  <input
                                    type="radio"
                                    name={`access-${permission.key}`}
                                    value="full_access"
                                    checked={accessLevel === 'full_access'}
                                    onChange={() => setPermissionAccess(permission.key, 'full_access')}
                                  />
                                  <span>Full Access</span>
                                </AccessLevelOption>
                              </AccessLevelGroup>
                            </PermissionAccessControl>
                          )}
                        </PermissionCard>
                      );
                    })}
                  </PermissionsSection>
                  
                  {/* Panel Member Access - Below Permissions */}
                  <div style={{ 
                    marginTop: '1rem', 
                    paddingTop: '1rem',
                    borderTop: '1px solid #e2e8f0'
                  }}>
                    <div style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: `2px solid ${formState.hasPanelMemberAccess ? 'rgba(249, 115, 22, 0.3)' : '#e2e8f0'}`,
                      background: formState.hasPanelMemberAccess ? 'rgba(249, 115, 22, 0.05)' : 'white',
                      transition: 'all 0.2s ease'
                    }}>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.625rem', 
                        color: '#1e293b', 
                        cursor: 'pointer', 
                        fontSize: '0.875rem',
                        fontWeight: 600
                      }}>
                        <input
                          type="checkbox"
                          checked={!!formState.hasPanelMemberAccess}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, hasPanelMemberAccess: event.target.checked }))
                          }
                          style={{ 
                            cursor: 'pointer', 
                            width: '18px', 
                            height: '18px',
                            accentColor: '#f97316'
                          }}
                        />
                        <span>Grant Panel Member Access</span>
                      </label>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: '#64748b', 
                        marginTop: '0.25rem',
                        marginLeft: '1.75rem',
                        lineHeight: '1.4'
                      }}>
                        Allows access to panel member features with same credentials
                      </div>
                    </div>
                  </div>
                </SectionWrapper>
              </SectionsContainer>

              <ButtonRow>
                <CancelButton type="button" onClick={closeModal}>
                  Cancel
                </CancelButton>
                <SubmitButton type="submit" disabled={saving}>
                  {saving ? 'Saving...' : editingSubAdmin ? 'Update Sub Admin' : 'Create Sub Admin'}
                </SubmitButton>
              </ButtonRow>
            </Form>
          </ModalContent>
        </Modal>
      )}
      {/* Permissions View Modal */}
      {showPermissionsModal && viewingPermissions && (
        <Modal>
          <ModalContent style={{ maxWidth: '600px' }}>
            <ModalHeader>
              <ModalTitle>Permissions - {viewingPermissions.name}</ModalTitle>
              <CloseButton onClick={() => {
                setShowPermissionsModal(false);
                setViewingPermissions(null);
              }}>&times;</CloseButton>
            </ModalHeader>
            
            <div style={{ marginTop: '1rem' }}>
              {(() => {
                let permissionsList = [];
                if (Array.isArray(viewingPermissions.permissions)) {
                  permissionsList = viewingPermissions.permissions.map(key => ({
                    key,
                    accessLevel: 'full_access'
                  }));
                } else if (typeof viewingPermissions.permissions === 'object' && viewingPermissions.permissions !== null) {
                  permissionsList = Object.entries(viewingPermissions.permissions).map(([key, accessLevel]) => ({
                    key,
                    accessLevel
                  }));
                }
                
                return permissionsList.length > 0 ? (
                  <PermissionList style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {permissionsList.map(({ key, accessLevel }) => (
                      <li key={key} style={{ marginBottom: '0.75rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{permissionDetails[key]?.label || key}</span>
                          <span style={{ 
                            fontSize: '0.8rem',
                            color: accessLevel === 'full_access' ? '#059669' : '#f59e0b',
                            fontWeight: 600,
                            padding: '0.25rem 0.5rem',
                            background: accessLevel === 'full_access' ? '#d1fae5' : '#fef3c7',
                            borderRadius: '4px'
                          }}>
                            {accessLevel === 'full_access' ? 'Full Access' : 'View Only'}
                          </span>
                        </div>
                      </li>
                    ))}
                  </PermissionList>
                ) : (
                  <div style={{ 
                    padding: '2rem', 
                    textAlign: 'center', 
                    color: '#94a3b8',
                    backgroundColor: '#f8fafc',
                    borderRadius: '12px',
                    border: '2px dashed #e2e8f0'
                  }}>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>No permissions assigned</p>
                  </div>
                );
              })()}
            </div>

            <ButtonRow>
              <CancelButton type="button" onClick={() => {
                setShowPermissionsModal(false);
                setViewingPermissions(null);
              }}>
                Close
              </CancelButton>
            </ButtonRow>
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

export default SubAdminManagement;

