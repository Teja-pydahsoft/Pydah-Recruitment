import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { FaFileAlt, FaUser, FaPaperPlane, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const slideInUp = keyframes`
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
`;

const FormContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  padding: 2rem 0;
  animation: ${fadeIn} 0.6s ease-out;
`;

const FormWrapper = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 0 1rem;
`;

const FormCard = styled.div`
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  border: 1px solid #e2e8f0;
  overflow: hidden;
  animation: ${slideInUp} 0.8s ease-out;
`;

const FormHeader = styled.div`
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  color: white;
  padding: 3rem 2rem;
  text-align: center;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="50" cy="10" r="0.5" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
    opacity: 0.3;
  }
`;

const HeaderIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1.5rem;
  opacity: 0.9;
`;

const FormTitle = styled.h1`
  font-size: 2.25rem;
  font-weight: 800;
  margin-bottom: 1rem;
`;

const FormDescription = styled.p`
  font-size: 1.1rem;
  opacity: 0.9;
  margin: 0;
  max-width: 600px;
  margin: 0 auto;
`;

const FormBody = styled.div`
  padding: 3rem 2rem;
`;

const ErrorAlert = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  padding: 1rem 1.5rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #dc2626;
`;

const SectionTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  &::before {
    content: '';
    width: 4px;
    height: 24px;
    background: linear-gradient(135deg, #0ea5e9, #0284c7);
    border-radius: 2px;
  }
`;

const FormSection = styled.div`
  margin-bottom: 2.5rem;
`;

const FieldGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const FieldLabel = styled.label`
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;

  span {
    color: #dc2626;
    margin-left: 0.25rem;
  }
`;

const StyledInput = styled.input`
  width: 100%;
  padding: 0.875rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: white;
  color: #1e293b;

  &:focus {
    outline: none;
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const StyledTextarea = styled.textarea`
  width: 100%;
  padding: 0.875rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: white;
  color: #1e293b;
  resize: vertical;
  min-height: 100px;

  &:focus {
    outline: none;
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const StyledSelect = styled.select`
  width: 100%;
  padding: 0.875rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: white;
  color: #1e293b;

  &:focus {
    outline: none;
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
  }
`;

const FileInput = styled.input`
  width: 100%;
  padding: 0.875rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: white;
  color: #1e293b;

  &:focus {
    outline: none;
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  &:hover::before {
    left: 100%;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px -5px rgba(14, 165, 233, 0.4);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }

  &:disabled:hover {
    transform: none;
    box-shadow: none;
  }
`;

const SuccessMessage = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  animation: ${slideInUp} 0.6s ease-out;
`;

const SuccessIcon = styled.div`
  font-size: 4rem;
  color: #10b981;
  margin-bottom: 1.5rem;
`;

const SuccessTitle = styled.h2`
  font-size: 2rem;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 1rem;
`;

const SuccessText = styled.p`
  font-size: 1.1rem;
  color: #64748b;
  margin-bottom: 2rem;
`;

const BackButton = styled.button`
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }
`;

const PublicForm = () => {
  const { uniqueLink } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [formData, setFormData] = useState({});
  const [userDetails, setUserDetails] = useState({
    name: '',
    email: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const fetchForm = async () => {
    try {
      const response = await api.get(`/forms/public/${uniqueLink}`);
      setForm(response.data.form);

      // Initialize form data
      const initialData = {};
      response.data.form.formFields.forEach(field => {
        initialData[field.fieldName] = '';
      });
      setFormData(initialData);
    } catch (error) {
      setError('Form not found or no longer available.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForm();
  }, [uniqueLink]);

  const handleFormDataChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleUserDetailsChange = (field, value) => {
    setUserDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const hasFile = Object.values(formData).some(v => v instanceof File);

      if (hasFile) {
        const fd = new FormData();
        // Append non-file fields into candidateData JSON
        const nonFileData = {};
        Object.entries(formData).forEach(([key, value]) => {
          if (value instanceof File) {
            fd.append(key, value, value.name);
          } else if (Array.isArray(value) && value.length > 0 && value[0] instanceof File) {
            value.forEach((f) => fd.append(key, f, f.name));
          } else {
            nonFileData[key] = value;
          }
        });
        fd.append('candidateData', JSON.stringify(nonFileData));
        fd.append('userDetails', JSON.stringify(userDetails));

        const resp = await api.post(`/forms/public/${uniqueLink}/submit`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (resp?.data?.warnings?.length) {
          console.warn('Upload warnings:', resp.data.warnings);
          setError(resp.data.warnings.join('\n'));
        }
      } else {
        const resp = await api.post(`/forms/public/${uniqueLink}/submit`, {
          candidateData: formData,
          userDetails
        });
        if (resp?.data?.warnings?.length) {
          console.warn('Upload warnings:', resp.data.warnings);
          setError(resp.data.warnings.join('\n'));
        }
      }

      setSuccess(true);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to submit form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderFormField = (field) => {
    const value = formData[field.fieldName] || '';

    switch (field.fieldType) {
      case 'text':
      case 'email':
        return (
          <StyledInput
            type={field.fieldType}
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleFormDataChange(field.fieldName, e.target.value)}
            required={field.required}
          />
        );

      case 'number':
        return (
          <StyledInput
            type="number"
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleFormDataChange(field.fieldName, e.target.value)}
            required={field.required}
          />
        );

      case 'date':
        return (
          <StyledInput
            type="date"
            value={value}
            onChange={(e) => handleFormDataChange(field.fieldName, e.target.value)}
            required={field.required}
          />
        );

      case 'textarea':
        return (
          <StyledTextarea
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleFormDataChange(field.fieldName, e.target.value)}
            required={field.required}
          />
        );

      case 'select':
        return (
          <StyledSelect
            value={value}
            onChange={(e) => handleFormDataChange(field.fieldName, e.target.value)}
            required={field.required}
          >
            <option value="">Select an option</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </StyledSelect>
        );

      case 'file':
        return (
          <FileInput
            type="file"
            onChange={(e) => handleFormDataChange(field.fieldName, e.target.files[0])}
            required={field.required}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          />
        );

      case 'file_multiple':
        return (
          <FileInput
            type="file"
            onChange={(e) => handleFormDataChange(field.fieldName, Array.from(e.target.files))}
            required={field.required}
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          />
        );

      case 'radio':
        return (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {(field.options || []).map((opt, idx) => (
              <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="radio"
                  name={field.fieldName}
                  value={opt}
                  checked={value === opt}
                  onChange={(e) => handleFormDataChange(field.fieldName, e.target.value)}
                  required={field.required}
                />
                {opt}
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        // Supports single checkbox declaration or multi-option selection
        const options = field.options && field.options.length > 0 ? field.options : ['Yes'];
        const selected = Array.isArray(value) ? value : (value ? [options[0]] : []);
        return (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {options.map((opt, idx) => {
              const checked = selected.includes(opt);
              return (
                <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(opt); else next.delete(opt);
                      const arr = Array.from(next);
                      // If it is a single declaration, store boolean; else store array
                      handleFormDataChange(field.fieldName, options.length === 1 ? (arr.length === 1) : arr);
                    }}
                    required={field.required && options.length === 1}
                  />
                  {opt}
                </label>
              );
            })}
          </div>
        );

      default:
        return (
          <StyledInput
            type="text"
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleFormDataChange(field.fieldName, e.target.value)}
            required={field.required}
          />
        );
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading form..." />;
  }

  if (error && !form) {
    return (
      <FormContainer>
        <FormWrapper>
          <SuccessMessage>
            <FaExclamationTriangle style={{ fontSize: '4rem', color: '#dc2626', marginBottom: '1.5rem' }} />
            <SuccessTitle style={{ color: '#dc2626' }}>Form Not Available</SuccessTitle>
            <SuccessText>{error}</SuccessText>
          </SuccessMessage>
        </FormWrapper>
      </FormContainer>
    );
  }

  if (success) {
    return (
      <FormContainer>
        <FormWrapper>
          <SuccessMessage>
            <SuccessIcon>
              <FaCheckCircle />
            </SuccessIcon>
            <SuccessTitle>Application Submitted Successfully!</SuccessTitle>
            <SuccessText>
              Thank you for your application. You will receive further updates via email.
            </SuccessText>
            <BackButton onClick={() => navigate('/')}>
              Back to Home
            </BackButton>
          </SuccessMessage>
        </FormWrapper>
      </FormContainer>
    );
  }

  return (
    <FormContainer>
      <FormWrapper>
        <FormCard>
          <FormHeader>
            <HeaderIcon>
              <FaFileAlt />
            </HeaderIcon>
            <FormTitle>{form.title}</FormTitle>
            {form.description && <FormDescription>{form.description}</FormDescription>}
          </FormHeader>

          <FormBody>
            {error && (
              <ErrorAlert>
                <FaExclamationTriangle />
                {error}
              </ErrorAlert>
            )}

            <form onSubmit={handleSubmit}>
              {/* User Details Section */}
              <FormSection>
                <SectionTitle>
                  <FaUser />
                  Personal Information
                </SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <FieldGroup>
                    <FieldLabel>
                      Full Name<span>*</span>
                    </FieldLabel>
                    <StyledInput
                      type="text"
                      value={userDetails.name}
                      onChange={(e) => handleUserDetailsChange('name', e.target.value)}
                      placeholder="Enter your full name"
                      required
                    />
                  </FieldGroup>
                  <FieldGroup>
                    <FieldLabel>
                      Email Address<span>*</span>
                    </FieldLabel>
                    <StyledInput
                      type="email"
                      value={userDetails.email}
                      onChange={(e) => handleUserDetailsChange('email', e.target.value)}
                      placeholder="Enter your email address"
                      required
                    />
                  </FieldGroup>
                </div>
              </FormSection>

              {/* Dynamic Form Fields */}
              <FormSection>
                <SectionTitle>
                  <FaFileAlt />
                  Application Details
                </SectionTitle>
                {form.formFields.map((field, index) => (
                  <FieldGroup key={index}>
                    <FieldLabel>
                      {field.fieldName}
                      {field.required && <span>*</span>}
                    </FieldLabel>
                    {renderFormField(field)}
                  </FieldGroup>
                ))}
              </FormSection>

              <SubmitButton type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <div style={{
                      width: '1rem',
                      height: '1rem',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    Submitting Application...
                  </>
                ) : (
                  <>
                    <FaPaperPlane />
                    Submit Application
                  </>
                )}
              </SubmitButton>
            </form>
          </FormBody>
        </FormCard>
      </FormWrapper>
    </FormContainer>
  );
};

export default PublicForm;
