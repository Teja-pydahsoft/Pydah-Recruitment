import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { FaFileAlt, FaUser, FaPaperPlane, FaCheckCircle, FaExclamationTriangle, FaUpload, FaSpinner, FaTimes, FaCloudUploadAlt } from 'react-icons/fa';
import api, { uploadWithProgress } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const slideInUp = keyframes`
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const shimmer = keyframes`
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
`;

const progressFill = keyframes`
  0% { width: 0%; }
`;

const bounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
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

  &:hover:not(:disabled) {
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

  &.processing {
    background: linear-gradient(135deg, #f59e0b, #d97706);
    animation: ${pulse} 2s ease-in-out infinite;
  }

  &.uploading {
    background: linear-gradient(135deg, #10b981, #059669);
  }
`;

const FilePreviewCard = styled.div`
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.3s ease;
  animation: ${slideInUp} 0.4s ease-out;

  &:hover {
    border-color: #0ea5e9;
    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.1);
  }

  &.uploading {
    border-color: #10b981;
    background: #f0fdf4;
  }

  &.uploaded {
    border-color: #10b981;
    background: #f0fdf4;
  }

  &.error {
    border-color: #dc2626;
    background: #fef2f2;
  }
`;

const FileIcon = styled.div`
  font-size: 2rem;
  color: #64748b;
  flex-shrink: 0;

  &.uploading {
    color: #10b981;
    animation: ${spin} 1s linear infinite;
  }

  &.uploaded {
    color: #10b981;
  }

  &.error {
    color: #dc2626;
  }
`;

const FileInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const FileName = styled.div`
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const FileSize = styled.div`
  font-size: 0.875rem;
  color: #64748b;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
  margin-top: 0.5rem;
  position: relative;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #10b981, #059669);
  border-radius: 3px;
  transition: width 0.3s ease;
  width: ${props => props.progress || 0}%;
  animation: ${progressFill} 0.3s ease-out;

  &.indeterminate {
    width: 30%;
    animation: ${shimmer} 1.5s ease-in-out infinite;
    background: linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.8), transparent);
    background-size: 200% 100%;
  }
`;

const StatusBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-top: 0.5rem;

  &.uploading {
    background: #dbeafe;
    color: #1e40af;
  }

  &.uploaded {
    background: #d1fae5;
    color: #065f46;
  }

  &.error {
    background: #fee2e2;
    color: #991b1b;
  }
`;

const UploadProgressContainer = styled.div`
  margin: 2rem 0;
  padding: 1.5rem;
  background: #f8fafc;
  border-radius: 12px;
  border: 2px dashed #cbd5e1;
  animation: ${slideInUp} 0.4s ease-out;
`;

const UploadProgressTitle = styled.h4`
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SubmissionStatus = styled.div`
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border: 2px solid #fbbf24;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  animation: ${slideInUp} 0.4s ease-out;

  &.processing {
    background: linear-gradient(135deg, #dbeafe, #bfdbfe);
    border-color: #3b82f6;
  }

  &.uploading {
    background: linear-gradient(135deg, #d1fae5, #a7f3d0);
    border-color: #10b981;
  }
`;

const StatusIcon = styled.div`
  font-size: 2rem;
  animation: ${spin} 1s linear infinite;

  &.pulse {
    animation: ${pulse} 2s ease-in-out infinite;
  }
`;

const StatusText = styled.div`
  flex: 1;
`;

const StatusTitle = styled.div`
  font-weight: 700;
  font-size: 1.1rem;
  color: #1e293b;
  margin-bottom: 0.25rem;
`;

const StatusDescription = styled.div`
  font-size: 0.9rem;
  color: #64748b;
`;

const SubmissionModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: ${fadeIn} 0.3s ease-out;
  padding: 1rem;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 20px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: ${slideInUp} 0.4s ease-out;
  position: relative;
`;

const ModalHeader = styled.div`
  padding: 2rem 2rem 1rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ModalTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ModalBody = styled.div`
  padding: 2rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #64748b;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: #f1f5f9;
    color: #1e293b;
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
  const [submissionState, setSubmissionState] = useState('idle'); // 'idle', 'pending', 'processing', 'uploading', 'complete'
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileUploads, setFileUploads] = useState({}); // Track individual file uploads

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

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return <FaFileAlt />;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    setSubmissionState('pending');
    setUploadProgress(0);
    setFileUploads({});

    try {
      // Get all files from form data
      const files = [];
      Object.entries(formData).forEach(([key, value]) => {
        if (value instanceof File) {
          files.push({ key, file: value });
        } else if (Array.isArray(value) && value.length > 0 && value[0] instanceof File) {
          value.forEach((f) => files.push({ key, file: f }));
        }
      });

      // Initialize file upload tracking
      const initialFileUploads = {};
      files.forEach(({ key, file }) => {
        const fileId = `${key}-${file.name}-${file.size}`;
        initialFileUploads[fileId] = {
          name: file.name,
          size: file.size,
          status: 'pending',
          progress: 0
        };
      });
      setFileUploads(initialFileUploads);

      const hasFile = files.length > 0;

      if (hasFile) {
        // Set state to processing
        setSubmissionState('processing');
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UI

        // Set state to uploading
        setSubmissionState('uploading');

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

        // Upload with progress tracking
        const resp = await uploadWithProgress(
          `/forms/public/${uniqueLink}/submit`,
          fd,
          (progress) => {
            setUploadProgress(progress);
            // Update individual file progress (simulated)
            setFileUploads(prevUploads => {
              const updatedUploads = { ...prevUploads };
              const fileIds = Object.keys(updatedUploads);
              fileIds.forEach((fileId, index) => {
                const fileProgress = Math.min(100, (progress / fileIds.length) + (index * (100 / fileIds.length)));
                updatedUploads[fileId] = {
                  ...updatedUploads[fileId],
                  status: fileProgress >= 100 ? 'uploaded' : 'uploading',
                  progress: Math.min(100, fileProgress)
                };
              });
              return updatedUploads;
            });
          }
        );

        // Mark all files as uploaded
        setFileUploads(prevUploads => {
          const completedUploads = { ...prevUploads };
          Object.keys(completedUploads).forEach((fileId) => {
            completedUploads[fileId] = {
              ...completedUploads[fileId],
              status: 'uploaded',
              progress: 100
            };
          });
          return completedUploads;
        });

        if (resp?.data?.warnings?.length) {
          console.warn('Upload warnings:', resp.data.warnings);
          setError(resp.data.warnings.join('\n'));
        }
      } else {
        setSubmissionState('processing');
        const resp = await api.post(`/forms/public/${uniqueLink}/submit`, {
          candidateData: formData,
          userDetails
        });
        if (resp?.data?.warnings?.length) {
          console.warn('Upload warnings:', resp.data.warnings);
          setError(resp.data.warnings.join('\n'));
        }
      }

      setSubmissionState('complete');
      setUploadProgress(100);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Show completion state briefly
      setSuccess(true);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to submit form. Please try again.');
      // Mark files as error
      setFileUploads(prevUploads => {
        const errorUploads = { ...prevUploads };
        Object.keys(errorUploads).forEach((fileId) => {
          errorUploads[fileId] = {
            ...errorUploads[fileId],
            status: 'error'
          };
        });
        return errorUploads;
      });
      setSubmissionState('idle');
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


              <SubmitButton 
                type="submit" 
                disabled={submitting}
                className={submissionState === 'processing' ? 'processing' : submissionState === 'uploading' ? 'uploading' : ''}
              >
                {submitting ? (
                  <>
                    {submissionState === 'pending' && (
                      <>
                        <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
                        Preparing...
                      </>
                    )}
                    {submissionState === 'processing' && (
                      <>
                        <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
                        Processing...
                      </>
                    )}
                    {submissionState === 'uploading' && (
                      <>
                        <FaCloudUploadAlt style={{ animation: 'bounce 1s ease-in-out infinite' }} />
                        Uploading... {uploadProgress}%
                      </>
                    )}
                    {submissionState === 'complete' && (
                      <>
                        <FaCheckCircle />
                        Completing...
                      </>
                    )}
                    {(!submissionState || submissionState === 'idle') && (
                      <>
                        <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
                        Submitting Application...
                      </>
                    )}
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

      {/* Submission Progress Modal */}
      {(submissionState === 'pending' || submissionState === 'processing' || submissionState === 'uploading' || submissionState === 'complete') && (
        <SubmissionModal>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>
                {submissionState === 'complete' ? (
                  <>
                    <FaCheckCircle style={{ color: '#10b981' }} />
                    Submission Complete!
                  </>
                ) : (
                  <>
                    <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
                    Submitting Application
                  </>
                )}
              </ModalTitle>
              {submissionState === 'complete' && (
                <CloseButton onClick={() => setSuccess(true)}>
                  <FaTimes />
                </CloseButton>
              )}
            </ModalHeader>
            <ModalBody>
              {/* Submission Status */}
              {(submissionState === 'pending' || submissionState === 'processing' || submissionState === 'uploading') && (
                <SubmissionStatus className={submissionState}>
                  <StatusIcon className={submissionState === 'pending' ? 'pulse' : ''}>
                    {submissionState === 'pending' && <FaSpinner />}
                    {submissionState === 'processing' && <FaSpinner />}
                    {submissionState === 'uploading' && <FaCloudUploadAlt />}
                  </StatusIcon>
                  <StatusText>
                    <StatusTitle>
                      {submissionState === 'pending' && 'Preparing Submission...'}
                      {submissionState === 'processing' && 'Processing Application...'}
                      {submissionState === 'uploading' && `Uploading Files... ${uploadProgress}%`}
                    </StatusTitle>
                    <StatusDescription>
                      {submissionState === 'pending' && 'Please wait while we prepare your application for submission.'}
                      {submissionState === 'processing' && 'Validating your information and preparing files for upload.'}
                      {submissionState === 'uploading' && 'Your files are being uploaded to Google Drive. Please do not close this page.'}
                    </StatusDescription>
                  </StatusText>
                </SubmissionStatus>
              )}

              {/* Completion Status */}
              {submissionState === 'complete' && (
                <SubmissionStatus className="uploading" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', borderColor: '#10b981' }}>
                  <StatusIcon style={{ animation: 'none' }}>
                    <FaCheckCircle style={{ color: '#10b981', fontSize: '2rem' }} />
                  </StatusIcon>
                  <StatusText>
                    <StatusTitle style={{ color: '#065f46' }}>Application Submitted Successfully!</StatusTitle>
                    <StatusDescription style={{ color: '#047857' }}>
                      Your application has been submitted. You will receive further updates via email.
                    </StatusDescription>
                  </StatusText>
                </SubmissionStatus>
              )}

              {/* File Upload Progress */}
              {Object.keys(fileUploads).length > 0 && (
                <UploadProgressContainer>
                  <UploadProgressTitle>
                    <FaUpload />
                    File Upload Progress
                  </UploadProgressTitle>
                  {Object.entries(fileUploads).map(([fileId, fileInfo]) => (
                    <FilePreviewCard key={fileId} className={fileInfo.status}>
                      <FileIcon className={fileInfo.status}>
                        {fileInfo.status === 'uploading' && <FaSpinner />}
                        {fileInfo.status === 'uploaded' && <FaCheckCircle />}
                        {fileInfo.status === 'error' && <FaTimes />}
                        {(fileInfo.status === 'pending' || !['uploading', 'uploaded', 'error'].includes(fileInfo.status)) && <FaFileAlt />}
                      </FileIcon>
                      <FileInfo>
                        <FileName>{fileInfo.name}</FileName>
                        <FileSize>{formatFileSize(fileInfo.size)}</FileSize>
                        {(fileInfo.status === 'uploading' || fileInfo.status === 'pending') && (
                          <ProgressBar>
                            <ProgressFill 
                              progress={fileInfo.progress} 
                              className={fileInfo.status === 'pending' ? 'indeterminate' : ''}
                            />
                          </ProgressBar>
                        )}
                        <StatusBadge className={fileInfo.status}>
                          {fileInfo.status === 'pending' && (
                            <>
                              <FaSpinner />
                              Waiting...
                            </>
                          )}
                          {fileInfo.status === 'uploading' && (
                            <>
                              <FaSpinner />
                              Uploading {fileInfo.progress}%
                            </>
                          )}
                          {fileInfo.status === 'uploaded' && (
                            <>
                              <FaCheckCircle />
                              Uploaded
                            </>
                          )}
                          {fileInfo.status === 'error' && (
                            <>
                              <FaTimes />
                              Failed
                            </>
                          )}
                        </StatusBadge>
                      </FileInfo>
                    </FilePreviewCard>
                  ))}
                </UploadProgressContainer>
              )}
            </ModalBody>
          </ModalContent>
        </SubmissionModal>
      )}
    </FormContainer>
  );
};

export default PublicForm;
