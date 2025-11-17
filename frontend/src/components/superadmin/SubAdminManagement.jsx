import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import api from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';

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
  margin-bottom: 2rem;
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
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 24px;
  width: 100%;
  max-width: 1400px;
  padding: 2.5rem 3rem;
  box-shadow: 0 25px 60px rgba(15, 23, 42, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  flex-direction: column;
  
  @media (max-width: 1200px) {
    max-width: 95vw;
  }
  
  @media (max-width: 768px) {
    padding: 2rem 1.5rem;
    border-radius: 20px;
  }
`;

const SectionsContainer = styled.div`
  display: grid;
  grid-template-columns: 0.4fr 1.6fr;
  gap: 2.5rem;
  margin-bottom: 2rem;
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
`;

const SectionWrapper = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100%;
`;

const SectionContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const ModalTitle = styled.h3`
  margin: 0;
  color: #0f172a;
  font-size: 1.75rem;
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
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const Label = styled.label`
  font-weight: 600;
  color: #1e293b;
  font-size: 0.95rem;
  letter-spacing: -0.01em;
`;

const Input = styled.input`
  padding: 0.875rem 1.125rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.2s ease;
  background: #ffffff;

  &:focus {
    outline: none;
    border-color: #f97316;
    box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.1);
    background: #fff;
  }

  &:hover:not(:focus) {
    border-color: #cbd5e1;
  }
`;

const PermissionsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.875rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const PermissionCard = styled.div`
  border: 2px solid ${({ enabled }) => (enabled ? 'rgba(249, 115, 22, 0.4)' : '#e2e8f0')};
  border-radius: 12px;
  padding: 1rem;
  background: ${({ enabled }) => (enabled ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, rgba(249, 115, 22, 0.03) 100%)' : 'white')};
  transition: all 0.2s ease;
  position: relative;
  cursor: pointer;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: ${({ enabled }) => (enabled ? '3px' : '0')};
    background: linear-gradient(90deg, #f97316, #fb923c);
    transition: height 0.2s ease;
    border-radius: 12px 12px 0 0;
  }

  &:hover {
    border-color: ${({ enabled }) => (enabled ? 'rgba(249, 115, 22, 0.5)' : '#cbd5e1')};
    transform: translateY(-1px);
    box-shadow: ${({ enabled }) => (enabled ? '0 4px 12px rgba(249, 115, 22, 0.12)' : '0 2px 8px rgba(15, 23, 42, 0.06)')};
  }
`;

const PermissionHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
`;

const PermissionCheckbox = styled.input`
  margin-top: 0.2rem;
  cursor: pointer;
  width: 18px;
  height: 18px;
  accent-color: #f97316;
  flex-shrink: 0;
  
  &:checked {
    filter: drop-shadow(0 2px 4px rgba(249, 115, 22, 0.3));
  }
`;

const PermissionDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
`;

const PermissionLabel = styled.span`
  font-weight: 700;
  color: #1e293b;
  font-size: 0.95rem;
  line-height: 1.3;
`;

const PermissionHint = styled.span`
  font-size: 0.8rem;
  color: #64748b;
  line-height: 1.4;
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

const SectionDescription = styled.p`
  margin: 0 0 1.25rem 0;
  color: #64748b;
  font-size: 0.875rem;
  line-height: 1.5;
`;

const PermissionsAndAccessSection = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  
  @media (max-width: 1400px) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
`;

const PermissionsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
`;

const AccessLevelsSection = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  
  @media (max-width: 1400px) {
    grid-template-columns: 1fr;
  }
`;

const AccessLevelCard = styled.div`
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem;
  background: white;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  
  &:hover {
    border-color: #cbd5e1;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
    transform: translateY(-1px);
  }
`;

const AccessLevelCardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e2e8f0;
`;

const AccessLevelCardTitle = styled.span`
  font-weight: 700;
  color: #1e293b;
  font-size: 0.8rem;
  flex: 1;
  line-height: 1.3;
`;

const AccessLevelCardDescription = styled.span`
  font-size: 0.7rem;
  color: #64748b;
  margin-bottom: 0.75rem;
  display: block;
  line-height: 1.3;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
`;

const SubmitButton = styled.button`
  flex: 1;
  border: none;
  border-radius: 12px;
  padding: 1rem 1.5rem;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(16, 185, 129, 0.35);
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
  border-radius: 12px;
  padding: 1rem 1.5rem;
  font-weight: 600;
  font-size: 1rem;
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
  const [saving, setSaving] = useState(false);
  const [editingSubAdmin, setEditingSubAdmin] = useState(null);
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    password: '',
    permissions: {} // Object: { 'forms.manage': 'read_only' | 'full_access', ... }
  });

  const permissionDetails = useMemo(() => {
    return availablePermissions.reduce((acc, permission) => {
      acc[permission.key] = permission;
      return acc;
    }, {});
  }, [availablePermissions]);

  useEffect(() => {
    fetchSubAdmins();
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

  const resetForm = () => {
    setFormState({
      name: '',
      email: '',
      password: '',
      permissions: {}
    });
    setEditingSubAdmin(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (subAdmin) => {
    setEditingSubAdmin(subAdmin);
    
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
    
    setFormState({
      name: subAdmin.name,
      email: subAdmin.email,
      password: '',
      permissions: permissionsObj,
      isActive: subAdmin.isActive
    });
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
    setFormState((prev) => ({
      ...prev,
      [name]: value
    }));
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
        permissions: formState.permissions
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
    } catch (error) {
      console.error('Failed to save sub admin', error);
      alert(error.response?.data?.message || 'Unable to save sub admin');
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
    } catch (error) {
      console.error('Failed to delete sub admin', error);
      alert(error.response?.data?.message || 'Unable to delete sub admin');
    }
  };

  const handleStatusToggle = async (subAdmin) => {
    try {
      await api.put(`/auth/users/${subAdmin._id}/status`, { isActive: !subAdmin.isActive });
      await fetchSubAdmins();
    } catch (error) {
      console.error('Failed to update sub admin status', error);
      alert(error.response?.data?.message || 'Unable to update status');
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
            <Th>Status</Th>
            <Th>Permissions</Th>
            <Th style={{ width: '200px' }}>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {subAdmins.map((subAdmin) => (
            <tr key={subAdmin._id}>
              <Td>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>{subAdmin.name}</div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>User Management</div>
              </Td>
              <Td>{subAdmin.email}</Td>
              <Td>
                <StatusPill active={subAdmin.isActive}>
                  {subAdmin.isActive ? 'Active' : 'Inactive'}
                </StatusPill>
              </Td>
              <Td>
                {(() => {
                  // Handle both old format (array) and new format (object)
                  let permissionsList = [];
                  if (Array.isArray(subAdmin.permissions)) {
                    // Old format: convert to display format
                    permissionsList = subAdmin.permissions.map(key => ({
                      key,
                      accessLevel: 'full_access'
                    }));
                  } else if (typeof subAdmin.permissions === 'object' && subAdmin.permissions !== null) {
                    // New format: convert object to array
                    permissionsList = Object.entries(subAdmin.permissions).map(([key, accessLevel]) => ({
                      key,
                      accessLevel
                    }));
                  }
                  
                  return permissionsList.length > 0 ? (
                    <PermissionList>
                      {permissionsList.map(({ key, accessLevel }) => (
                        <li key={key}>
                          {permissionDetails[key]?.label || key}
                          <span style={{ 
                            marginLeft: '0.5rem', 
                            fontSize: '0.75rem',
                            color: accessLevel === 'full_access' ? '#059669' : '#f59e0b',
                            fontWeight: 600
                          }}>
                            ({accessLevel === 'full_access' ? 'Full Access' : 'View Only'})
                          </span>
                        </li>
                      ))}
                    </PermissionList>
                  ) : (
                    <span style={{ color: '#ef4444', fontWeight: 600 }}>No permissions assigned</span>
                  );
                })()}
              </Td>
              <Td>
                <Actions>
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
                  <SectionDescription>Enter the basic information for the sub-admin account.</SectionDescription>
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

                    {editingSubAdmin && (
                      <FormGroup>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={!!formState.isActive}
                            onChange={(event) =>
                              setFormState((prev) => ({ ...prev, isActive: event.target.checked }))
                            }
                            style={{ cursor: 'pointer' }}
                          />
                          <span>Active Account</span>
                        </label>
                      </FormGroup>
                    )}
                  </SectionContent>
                </SectionWrapper>

                {/* Section 2: Permissions & Access Levels */}
                <SectionWrapper>
                  <PermissionsAndAccessSection>
                    {/* Permissions Section */}
                    <div>
                      <SectionTitle>Permissions</SectionTitle>
                      <SectionDescription>Select which modules the sub-admin can access.</SectionDescription>
                      <PermissionsSection>
                        <PermissionsGrid>
                          {availablePermissions.map((permission) => {
                            const isEnabled = !!formState.permissions[permission.key];
                            return (
                              <PermissionCard 
                                key={permission.key} 
                                enabled={isEnabled}
                                onClick={() => togglePermission(permission.key)}
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
                                    <PermissionHint>{permission.description || permission.key}</PermissionHint>
                                  </PermissionDetails>
                                </PermissionHeader>
                              </PermissionCard>
                            );
                          })}
                        </PermissionsGrid>
                      </PermissionsSection>
                    </div>

                    {/* Access Levels Section */}
                    <div>
                      <SectionTitle>Access Levels</SectionTitle>
                      <SectionDescription>
                        {Object.keys(formState.permissions).length > 0 
                          ? 'Set the access level for each enabled module.' 
                          : 'Select permissions first to set access levels.'}
                      </SectionDescription>
                      {Object.keys(formState.permissions).length > 0 ? (
                        <AccessLevelsSection>
                          {availablePermissions
                            .filter(permission => formState.permissions[permission.key])
                            .map((permission) => {
                              const accessLevel = formState.permissions[permission.key] || 'view_only';
                              return (
                                <AccessLevelCard key={permission.key}>
                                  <AccessLevelCardHeader>
                                    <AccessLevelCardTitle>{permission.label}</AccessLevelCardTitle>
                                  </AccessLevelCardHeader>
                                  <AccessLevelCardDescription>{permission.description || permission.key}</AccessLevelCardDescription>
                                  <AccessLevelGroup enabled={true}>
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
                                </AccessLevelCard>
                              );
                            })}
                        </AccessLevelsSection>
                      ) : (
                        <div style={{ 
                          padding: '2rem', 
                          textAlign: 'center', 
                          color: '#94a3b8',
                          backgroundColor: '#f8fafc',
                          borderRadius: '12px',
                          border: '2px dashed #e2e8f0',
                          marginTop: '1rem'
                        }}>
                          <p style={{ margin: 0, fontSize: '0.9rem' }}>
                            No permissions selected yet.<br />
                            Select modules in the Permissions section.
                          </p>
                        </div>
                      )}
                    </div>
                  </PermissionsAndAccessSection>
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
    </Container>
  );
};

export default SubAdminManagement;

