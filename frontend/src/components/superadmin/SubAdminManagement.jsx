import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import api from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';

const Container = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
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
`;

const Subtitle = styled.p`
  margin: 0;
  color: #64748b;
  max-width: 760px;
`;

const Toolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const AddButton = styled.button`
  background: linear-gradient(135deg, #ef4444, #f97316);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 24px rgba(249, 115, 22, 0.35);
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 15px 35px rgba(15, 23, 42, 0.08);
`;

const Th = styled.th`
  background: #f8fafc;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #334155;
  border-bottom: 1px solid #e2e8f0;
`;

const Td = styled.td`
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
  color: #475569;
  vertical-align: top;
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
        return '#e2e8f0';
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
  border: none;
  padding: 0.45rem 0.9rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-1px);
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
  border-radius: 16px;
  width: 100%;
  max-width: 560px;
  padding: 2rem;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.25);
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
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 600;
  color: #334155;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid #cbd5f5;
  border-radius: 10px;
  font-size: 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus {
    outline: none;
    border-color: #f97316;
    box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.15);
  }
`;

const PermissionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
`;

const PermissionCard = styled.label`
  border: 1px solid ${({ checked }) => (checked ? 'rgba(249, 115, 22, 0.5)' : '#e2e8f0')};
  border-radius: 12px;
  padding: 0.75rem 1rem;
  display: flex;
  gap: 0.75rem;
  background: ${({ checked }) => (checked ? 'rgba(249, 115, 22, 0.07)' : 'white')};
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;

  &:hover {
    border-color: rgba(249, 115, 22, 0.5);
  }
`;

const PermissionCheckbox = styled.input`
  margin-top: 0.3rem;
`;

const PermissionDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const PermissionLabel = styled.span`
  font-weight: 600;
  color: #1f2937;
`;

const PermissionHint = styled.span`
  font-size: 0.85rem;
  color: #64748b;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
`;

const SubmitButton = styled.button`
  flex: 1;
  border: none;
  border-radius: 10px;
  padding: 0.85rem 1.5rem;
  font-weight: 600;
  cursor: pointer;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 24px rgba(16, 185, 129, 0.25);
  }

  &:disabled {
    background: #a7f3d0;
    cursor: not-allowed;
    box-shadow: none;
  }
`;

const CancelButton = styled.button`
  flex: 1;
  border: none;
  border-radius: 10px;
  padding: 0.85rem 1.5rem;
  font-weight: 600;
  cursor: pointer;
  background: #e2e8f0;
  color: #475569;
  transition: background 0.2s ease;

  &:hover {
    background: #cbd5f5;
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
    permissions: []
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
      permissions: []
    });
    setEditingSubAdmin(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (subAdmin) => {
    setEditingSubAdmin(subAdmin);
    setFormState({
      name: subAdmin.name,
      email: subAdmin.email,
      password: '',
      permissions: subAdmin.permissions || [],
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
      const current = new Set(prev.permissions || []);
      if (current.has(permissionKey)) {
        current.delete(permissionKey);
      } else {
        current.add(permissionKey);
      }
      return {
        ...prev,
        permissions: Array.from(current)
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
        <Subtitle>
          Create focused sub admin roles to run day-to-day recruitment workflows while you retain full oversight.
          Assign module-level permissions to align responsibilities with your governance model.
        </Subtitle>
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
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Sub Admin</div>
              </Td>
              <Td>{subAdmin.email}</Td>
              <Td>
                <StatusPill active={subAdmin.isActive}>
                  {subAdmin.isActive ? 'Active' : 'Inactive'}
                </StatusPill>
              </Td>
              <Td>
                {subAdmin.permissions?.length ? (
                  <PermissionList>
                    {subAdmin.permissions.map((permission) => (
                      <li key={permission}>
                        {permissionDetails[permission]?.label || permission}
                      </li>
                    ))}
                  </PermissionList>
                ) : (
                  <span style={{ color: '#ef4444', fontWeight: 600 }}>No permissions assigned</span>
                )}
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
              <FormGroup>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formState.name}
                  onChange={handleInputChange}
                  required
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
                  placeholder={editingSubAdmin ? 'Leave blank to keep existing password' : ''}
                  required={!editingSubAdmin}
                />
              </FormGroup>

              <FormGroup>
                <Label>Assign Permissions</Label>
                <PermissionsGrid>
                  {availablePermissions.map((permission) => {
                    const checked = formState.permissions.includes(permission.key);
                    return (
                      <PermissionCard key={permission.key} checked={checked}>
                        <PermissionCheckbox
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermission(permission.key)}
                        />
                        <PermissionDetails>
                          <PermissionLabel>{permission.label}</PermissionLabel>
                          <PermissionHint>{permission.description || permission.key}</PermissionHint>
                        </PermissionDetails>
                      </PermissionCard>
                    );
                  })}
                </PermissionsGrid>
              </FormGroup>

              {editingSubAdmin && (
                <FormGroup>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569' }}>
                    <input
                      type="checkbox"
                      checked={!!formState.isActive}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, isActive: event.target.checked }))
                      }
                    />
                    Active
                  </label>
                </FormGroup>
              )}

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

