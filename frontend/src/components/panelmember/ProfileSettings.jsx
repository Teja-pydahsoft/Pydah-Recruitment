import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import styled from 'styled-components';
import { FaUser, FaEnvelope, FaPhone, FaBriefcase, FaSave, FaExclamationTriangle, FaCheckCircle, FaEdit } from 'react-icons/fa';
import api from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';

const Container = styled.div`
  padding: 2rem 0;
  min-height: 100vh;
  background: linear-gradient(135deg, #fef7ed 0%, #fed7aa 100%);
  width: 100%;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 0.75rem 0;
  }

  @media (max-width: 480px) {
    padding: 0.5rem 0;
  }
`;

const Wrapper = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 0 1rem;
  width: 100%;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 0 0.5rem;
    max-width: 100%;
  }

  @media (max-width: 480px) {
    padding: 0 0.5rem;
    max-width: 100%;
  }
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 3rem;

  @media (max-width: 768px) {
    margin-bottom: 1.5rem;
  }

  @media (max-width: 480px) {
    margin-bottom: 1rem;
  }
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #ea580c, #f97316);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: 768px) {
    font-size: 1.75rem;
    margin-bottom: 0.75rem;
  }

  @media (max-width: 480px) {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: #64748b;
  max-width: 600px;
  margin: 0 auto;

  @media (max-width: 768px) {
    font-size: 0.9rem;
    padding: 0 0.5rem;
  }

  @media (max-width: 480px) {
    font-size: 0.8rem;
    padding: 0;
  }
`;

const ProfileCard = styled.div`
  background: white;
  border-radius: 16px;
  padding: 2.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    padding: 2rem;
    border-radius: 12px;
    margin-bottom: 1.5rem;
  }

  @media (max-width: 480px) {
    padding: 1.5rem;
    border-radius: 8px;
    margin-bottom: 1rem;
  }
`;

const Section = styled.div`
  margin-bottom: 2rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e2e8f0;

  @media (max-width: 768px) {
    font-size: 1.1rem;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
  }

  @media (max-width: 480px) {
    font-size: 1rem;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const Label = styled.label`
  display: block;
  font-size: 0.95rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  @media (max-width: 768px) {
    font-size: 0.9rem;
    margin-bottom: 0.4rem;
  }

  @media (max-width: 480px) {
    font-size: 0.85rem;
    margin-bottom: 0.35rem;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  color: #1e293b;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #ea580c;
    box-shadow: 0 0 0 3px rgba(234, 88, 12, 0.1);
  }

  &:disabled {
    background-color: #f3f4f6;
    color: #6b7280;
    cursor: not-allowed;
  }
`;

const Button = styled.button`
  background: linear-gradient(135deg, #ea580c, #f97316);
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgba(234, 88, 12, 0.4);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 768px) {
    padding: 0.65rem 1.5rem;
    font-size: 0.9rem;
  }

  @media (max-width: 480px) {
    padding: 0.6rem 1.25rem;
    font-size: 0.85rem;
    width: 100%;
    justify-content: center;
  }
`;

const InfoRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  @media (max-width: 480px) {
    gap: 0.75rem;
  }
`;

const InfoItem = styled.div`
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
`;

const InfoLabel = styled.div`
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 600;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const InfoValue = styled.div`
  font-size: 1.1rem;
  color: #1e293b;
  font-weight: 600;

  @media (max-width: 768px) {
    font-size: 1rem;
  }

  @media (max-width: 480px) {
    font-size: 0.9rem;
  }
`;

const Alert = styled.div`
  padding: 1rem 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 600;
  background: ${props => props.type === 'success' ? '#dcfce7' : '#fef2f2'};
  color: ${props => props.type === 'success' ? '#166534' : '#dc2626'};
  border: 1px solid ${props => props.type === 'success' ? '#bbf7d0' : '#fecaca'};
`;

const EditButton = styled.button`
  background: transparent;
  border: 2px solid #ea580c;
  color: #ea580c;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: #ea580c;
    color: white;
  }
`;

const ProfileSettings = () => {
  const { user, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    profile: {
      phone: '',
      designation: ''
    }
  });

  const fetchProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const response = await api.get('/auth/profile');
      const fetchedUser = response.data.user;
      setUserProfile(fetchedUser);
      setFormData({
        name: fetchedUser.name || '',
        email: fetchedUser.email || '',
        profile: {
          phone: fetchedUser.profile?.phone || '',
          designation: fetchedUser.profile?.designation || ''
        }
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Fallback to user from context if API fails
      if (user) {
        setUserProfile(user);
        setFormData({
          name: user.name || '',
          email: user.email || '',
          profile: {
            phone: user.profile?.phone || '',
            designation: user.profile?.designation || ''
          }
        });
      }
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || '',
        email: userProfile.email || '',
        profile: {
          phone: userProfile.profile?.phone || '',
          designation: userProfile.profile?.designation || ''
        }
      });
    }
  }, [userProfile]);

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
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      // Clean profile object - remove empty strings
      const cleanedProfile = Object.fromEntries(
        Object.entries(formData.profile).filter(([_, value]) => value !== '' && value != null)
      );

      const updateData = {
        name: formData.name,
        profile: Object.keys(cleanedProfile).length > 0 ? cleanedProfile : undefined
      };

      const result = await updateProfile(updateData);
      
      if (result.success) {
        setSuccessMessage('Profile updated successfully!');
        setEditing(false);
        // Refresh profile data
        await fetchProfile();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(result.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user || profileLoading) {
    return (
      <Container>
        <Wrapper>
          <LoadingSpinner />
        </Wrapper>
      </Container>
    );
  }

  return (
    <Container>
      <Wrapper>
        <Header>
          <Title>Profile Settings</Title>
          <Subtitle>Manage your profile information and preferences</Subtitle>
        </Header>

        <ProfileCard>
          {successMessage && (
            <Alert type="success">
              <FaCheckCircle />
              {successMessage}
            </Alert>
          )}

          {errorMessage && (
            <Alert type="error">
              <FaExclamationTriangle />
              {errorMessage}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Section>
              <SectionTitle>
                <FaUser />
                Basic Information
              </SectionTitle>

              <InfoRow>
                <InfoItem>
                  <InfoLabel>Role</InfoLabel>
                  <InfoValue>{(userProfile || user)?.role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Panel Member'}</InfoValue>
                </InfoItem>
                <InfoItem>
                  <InfoLabel>Account Status</InfoLabel>
                  <InfoValue style={{ color: (userProfile || user)?.isActive !== false ? '#10b981' : '#ef4444' }}>
                    {(userProfile || user)?.isActive !== false ? 'Active' : 'Inactive'}
                  </InfoValue>
                </InfoItem>
              </InfoRow>

              <FormGroup>
                <Label>
                  <FaUser />
                  Full Name
                </Label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={!editing}
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label>
                  <FaEnvelope />
                  Email Address
                </Label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={true}
                  style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                />
                <small style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                  Email cannot be changed
                </small>
              </FormGroup>
            </Section>

            <Section>
              <SectionTitle>
                <FaBriefcase />
                Profile Details
              </SectionTitle>

              <FormGroup>
                <Label>
                  <FaPhone />
                  Phone Number
                </Label>
                <Input
                  type="tel"
                  name="profile.phone"
                  value={formData.profile.phone}
                  onChange={handleInputChange}
                  disabled={!editing}
                  placeholder="Enter your phone number"
                />
              </FormGroup>

              <FormGroup>
                <Label>
                  <FaBriefcase />
                  Designation
                </Label>
                <Input
                  type="text"
                  name="profile.designation"
                  value={formData.profile.designation}
                  onChange={handleInputChange}
                  disabled={!editing}
                  placeholder="Enter your designation"
                />
              </FormGroup>
            </Section>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
              {!editing ? (
                <EditButton type="button" onClick={() => setEditing(true)}>
                  <FaEdit />
                  Edit Profile
                </EditButton>
              ) : (
                <>
                  <Button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      const currentUser = userProfile || user;
                      setFormData({
                        name: currentUser.name || '',
                        email: currentUser.email || '',
                        profile: {
                          phone: currentUser.profile?.phone || '',
                          designation: currentUser.profile?.designation || ''
                        }
                      });
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    style={{ background: '#6b7280', marginRight: '0.5rem' }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    <FaSave />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </>
              )}
            </div>
          </form>
        </ProfileCard>
      </Wrapper>
    </Container>
  );
};

export default ProfileSettings;

