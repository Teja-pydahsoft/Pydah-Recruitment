import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import api from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';

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

const HeaderContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  max-width: 680px;
`;

const Title = styled.h2`
  color: #1e293b;
  margin: 0;
`;

const Subtitle = styled.p`
  margin: 0;
  color: #6b7280;
`;

const AddButton = styled.button`
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s ease;
  align-self: flex-start;

  @media (min-width: 768px) {
    align-self: auto;
  }

  &:hover {
    background: #2563eb;
  }
`;

const TableWrapper = styled.div`
  width: 100%;
  border-radius: 12px;
  background: white;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  overflow: hidden;
`;

const TableScrollArea = styled.div`
  width: 100%;
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
  background: white;
`;

const Th = styled.th`
  background: #f8fafc;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
`;

const Td = styled.td`
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  color: #374151;
`;

const ActionButton = styled.button`
  background: ${props => props.danger ? '#ef4444' : '#10b981'};
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  margin-right: 0.5rem;
  transition: background 0.3s ease;

  &:hover {
    background: ${props => props.danger ? '#dc2626' : '#059669'};
  }
`;

const Modal = styled.div`
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
  max-width: 500px;
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

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

// const Select = styled.select`
//   padding: 0.75rem;
//   border: 1px solid #d1d5db;
//   border-radius: 4px;
//   font-size: 1rem;

//   &:focus {
//     outline: none;
//     border-color: #3b82f6;
//     box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
//   }
// `;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
`;

const CancelButton = styled.button`
  background: #6b7280;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  flex: 1;

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
  flex: 1;

  &:hover {
    background: #2563eb;
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

const UsersManagement = () => {
  const [panelMembers, setPanelMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({
    campus: '',
    name: '',
    email: '',
    password: '',
    profile: {
      phone: '',
      designation: ''
    }
  });

  useEffect(() => {
    fetchPanelMembers();
  }, []);

  const fetchPanelMembers = async () => {
    try {
      const response = await api.get('/auth/panel-members');
      setPanelMembers(response.data.panelMembers);
    } catch (error) {
      console.error('Error fetching panel members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Clean profile object - remove empty strings
      const cleanedProfile = Object.fromEntries(
        Object.entries(formData.profile).filter(([_, value]) => value !== '' && value != null)
      );

      const submitData = {
        campus: formData.campus,
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: 'panel_member',
        profile: Object.keys(cleanedProfile).length > 0 ? cleanedProfile : undefined
      };

      if (editingMember) {
        // Remove password from update if it's empty
        if (!submitData.password) {
          delete submitData.password;
        }
        await api.put(`/auth/panel-members/${editingMember._id}`, submitData);
      } else {
        await api.post('/auth/register', submitData);
      }

      setShowModal(false);
      setEditingMember(null);
      resetForm();
      fetchPanelMembers();
    } catch (error) {
      console.error('Error saving panel member:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save panel member';
      alert(errorMessage);
    }
  };

  const handleEdit = (member) => {
    setEditingMember(member);
    setFormData({
      campus: member.campus || '',
      name: member.name,
      email: member.email,
      password: '',
      profile: {
        phone: member.profile?.phone || '',
        designation: member.profile?.designation || ''
      }
    });
    setShowModal(true);
  };

  const handleDelete = async (memberId) => {
    if (window.confirm('Are you sure you want to delete this panel member?')) {
      try {
        await api.delete(`/auth/panel-members/${memberId}`);
        fetchPanelMembers();
      } catch (error) {
        console.error('Error deleting panel member:', error);
      }
    }
  };

  const handleStatusToggle = async (memberId, currentStatus) => {
    try {
      await api.put(`/auth/users/${memberId}/status`, { isActive: !currentStatus });
      fetchPanelMembers();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      campus: '',
      name: '',
      email: '',
      password: '',
      profile: {
        phone: '',
        designation: ''
      }
    });
  };

  const openAddModal = () => {
    setEditingMember(null);
    resetForm();
    setShowModal(true);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Container>
      <Header>
        <HeaderContent>
          <Title>Panel Members Database</Title>
          <Subtitle>Step 3: Manage interview panel members for candidate evaluation.</Subtitle>
        </HeaderContent>
        <AddButton onClick={openAddModal}>Add Panel Member</AddButton>
      </Header>

      <TableWrapper>
        <TableScrollArea>
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Designation</Th>
                <Th>Phone</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {panelMembers.map(member => (
                <tr key={member._id}>
                  <Td>{member.name}</Td>
                  <Td>{member.email}</Td>
                  <Td>{member.profile?.designation || 'N/A'}</Td>
                  <Td>{member.profile?.phone || 'N/A'}</Td>
                  <Td>
                    <span
                      style={{
                        color: member.isActive ? '#10b981' : '#ef4444',
                        fontWeight: '600'
                      }}
                    >
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </Td>
                  <Td>
                    <ActionButton onClick={() => handleEdit(member)}>
                      Edit
                    </ActionButton>
                    <ActionButton
                      danger={true}
                      onClick={() => handleStatusToggle(member._id, member.isActive)}
                    >
                      {member.isActive ? 'Deactivate' : 'Activate'}
                    </ActionButton>
                    <ActionButton
                      danger={true}
                      onClick={() => handleDelete(member._id)}
                    >
                      Delete
                    </ActionButton>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableScrollArea>
      </TableWrapper>

      {showModal && (
        <Modal>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>
                {editingMember ? 'Edit Panel Member' : 'Add Panel Member'}
              </ModalTitle>
              <CloseButton onClick={() => setShowModal(false)}>×</CloseButton>
            </ModalHeader>

            <Form onSubmit={handleSubmit}>
              <FormGroup>
                <Label htmlFor="campus">Campus *</Label>
                <select
                  id="campus"
                  name="campus"
                  value={formData.campus}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                >
                  <option value="">Select Campus</option>
                  <option value="Btech">Btech</option>
                  <option value="Degree">Degree</option>
                  <option value="Pharmacy">Pharmacy</option>
                  <option value="Diploma">Diploma</option>
                </select>
              </FormGroup>

              <FormGroup>
                <Label htmlFor="name">Name</Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="email">Email</Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </FormGroup>

              {!editingMember ? (
                <FormGroup>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                </FormGroup>
              ) : (
                <FormGroup>
                  <Label htmlFor="password">New Password (leave blank to keep current)</Label>
                  <Input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter new password to update"
                  />
                </FormGroup>
              )}

              <FormGroup>
                <Label htmlFor="profile.phone">Phone</Label>
                <Input
                  type="tel"
                  id="profile.phone"
                  name="profile.phone"
                  value={formData.profile.phone}
                  onChange={handleInputChange}
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="profile.designation">Designation</Label>
                <Input
                  type="text"
                  id="profile.designation"
                  name="profile.designation"
                  value={formData.profile.designation}
                  onChange={handleInputChange}
                  placeholder="e.g., Professor, HR Manager"
                />
              </FormGroup>

              <ButtonGroup>
                <CancelButton type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </CancelButton>
                <SubmitButton type="submit">
                  {editingMember ? 'Update' : 'Create'}
                </SubmitButton>
              </ButtonGroup>
            </Form>
          </ModalContent>
        </Modal>
      )}
    </Container>
  );
};

export default UsersManagement;
