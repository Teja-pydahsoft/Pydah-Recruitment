import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { FaFileAlt, FaUser, FaPaperPlane, FaCheckCircle, FaExclamationTriangle, FaUpload, FaSpinner, FaTimes, FaCloudUploadAlt, FaBriefcase, FaCalendarAlt, FaInfoCircle, FaClock } from 'react-icons/fa';
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

const FormContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #fee2e2 0%, #fff7ed 100%);
  padding: clamp(1.5rem, 4vw, 3rem) 0;
  animation: ${fadeIn} 0.6s ease-out;
`;

const FormWrapper = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 clamp(0.75rem, 3vw, 2rem);
`;

const FormCard = styled.div`
  background: #ffffff;
  border-radius: 24px;
  box-shadow: 0 24px 45px rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.2);
  overflow: hidden;
  animation: ${slideInUp} 0.8s ease-out;
`;

const FormHeader = styled.div`
  background: linear-gradient(135deg, #ef4444, #f97316);
  color: #fff7ed;
  padding: clamp(2.5rem, 5vw, 3.5rem) clamp(1.5rem, 4vw, 3rem);
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
  font-size: clamp(3.2rem, 6vw, 4rem);
  margin-bottom: clamp(1rem, 2.5vw, 1.75rem);
  opacity: 0.9;
`;

const FormTitle = styled.h1`
  font-size: clamp(1.9rem, 4vw, 2.4rem);
  font-weight: 800;
  margin-bottom: clamp(0.5rem, 1.5vw, 1rem);
`;

const FormDescription = styled.p`
  font-size: clamp(1rem, 2.3vw, 1.1rem);
  opacity: 0.9;
  max-width: 600px;
  margin: 0 auto;
`;

const FormBody = styled.div`
  padding: clamp(2rem, 4.5vw, 3rem) clamp(1.5rem, 3.5vw, 2.5rem);
  background: #fffaf5;
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
  font-size: clamp(1.25rem, 3vw, 1.45rem);
  font-weight: 700;
  color: #9f1239;
  margin-bottom: clamp(1rem, 2vw, 1.5rem);
  display: flex;
  align-items: center;
  gap: 0.75rem;

  &::before {
    content: '';
    width: 4px;
    height: 24px;
    background: linear-gradient(135deg, #ef4444, #f97316);
    border-radius: 2px;
  }
`;

const JobDetailsCard = styled.div`
  background: linear-gradient(135deg, #fff7ed 0%, #ffe4e6 100%);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 20px;
  padding: clamp(1.25rem, 3vw, 2rem);
  margin-bottom: clamp(1.75rem, 3vw, 2.5rem);
  box-shadow: 0 12px 24px rgba(239, 68, 68, 0.08);
`;

const JobDetailRow = styled.div`
  display: flex;
  align-items: center;
  gap: clamp(0.75rem, 2vw, 1.25rem);
  margin-bottom: clamp(0.75rem, 2vw, 1.1rem);
  padding: clamp(0.65rem, 1.8vw, 0.9rem);
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  border-left: 4px solid #f97316;

  &:last-child {
    margin-bottom: 0;
  }
`;

const JobDetailLabel = styled.span`
  font-weight: 600;
  color: #9f1239;
  min-width: clamp(120px, 18vw, 150px);
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const JobDetailValue = styled.span`
  color: #1f2937;
  flex: 1;
  font-size: clamp(0.95rem, 2.4vw, 1rem);
`;

const RequirementsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0 0;
  
  li {
    padding: 0.5rem 0;
    padding-left: 1.5rem;
    position: relative;
    
    &::before {
      content: '•';
      position: absolute;
      left: 0;
      color: #ef4444;
      font-weight: bold;
      font-size: 1.2rem;
    }
  }
`;

const ClosingDateBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: ${props => props.isUrgent ? '#fee2e2' : '#fef3c7'};
  border: 1px solid ${props => props.isUrgent ? '#fca5a5' : '#facc15'};
  border-radius: 8px;
  color: ${props => props.isUrgent ? '#b91c1c' : '#b45309'};
  font-weight: 600;
  margin-top: 0.5rem;
`;

const FormSection = styled.div`
  margin-bottom: clamp(1.75rem, 3vw, 2.5rem);
`;

const TwoColumnGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(1rem, 2vw, 1.5rem);

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
`;

const FieldsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(1rem, 2.4vw, 1.6rem);
  margin-top: clamp(0.75rem, 2vw, 1.1rem);

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: clamp(0.5rem, 1.5vw, 0.75rem);
`;

const FieldLabel = styled.label`
  display: block;
  font-weight: 600;
  color: #7f1d1d;
  margin-bottom: 0.35rem;
  font-size: clamp(0.85rem, 2vw, 0.95rem);

  span {
    color: #b91c1c;
    margin-left: 0.25rem;
  }
`;

const StyledInput = styled.input`
  width: 100%;
  padding: clamp(0.75rem, 1.8vw, 0.9rem) clamp(0.85rem, 2vw, 1rem);
  border: 1.5px solid rgba(249, 115, 22, 0.25);
  border-radius: 10px;
  font-size: clamp(0.92rem, 2.2vw, 1rem);
  transition: all 0.3s ease;
  background: white;
  color: #1e293b;

  &:focus {
    outline: none;
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const StyledTextarea = styled.textarea`
  width: 100%;
  padding: clamp(0.75rem, 1.8vw, 0.9rem) clamp(0.85rem, 2vw, 1rem);
  border: 1.5px solid rgba(249, 115, 22, 0.25);
  border-radius: 10px;
  font-size: clamp(0.92rem, 2.2vw, 1rem);
  transition: all 0.3s ease;
  background: white;
  color: #1e293b;
  resize: vertical;
  min-height: 100px;

  &:focus {
    outline: none;
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const StyledSelect = styled.select`
  width: 100%;
  padding: clamp(0.75rem, 1.8vw, 0.9rem) clamp(0.85rem, 2vw, 1rem);
  border: 1.5px solid rgba(249, 115, 22, 0.25);
  border-radius: 10px;
  font-size: clamp(0.92rem, 2.1vw, 1rem);
  transition: all 0.3s ease;
  background: white;
  color: #1e293b;

  &:focus {
    outline: none;
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
  }
`;

const FileInput = styled.input`
  width: 100%;
  padding: clamp(0.75rem, 1.8vw, 0.9rem) clamp(0.85rem, 2vw, 1rem);
  border: 1.5px solid rgba(249, 115, 22, 0.25);
  border-radius: 10px;
  font-size: clamp(0.92rem, 2.2vw, 1rem);
  transition: all 0.3s ease;
  background: white;
  color: #1e293b;

  &:focus {
    outline: none;
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  background: linear-gradient(135deg, #ef4444, #f97316);
  color: white;
  border: none;
  border-radius: 12px;
  padding: clamp(0.85rem, 2.4vw, 1.05rem) clamp(1.2rem, 3vw, 2rem);
  font-size: clamp(1rem, 2.5vw, 1.1rem);
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(0.6rem, 1.5vw, 0.75rem);
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
    box-shadow: 0 12px 28px rgba(239, 68, 68, 0.35);
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
    background: linear-gradient(135deg, #fb923c, #ea580c);
    animation: ${pulse} 2s ease-in-out infinite;
  }

  &.uploading {
    background: linear-gradient(135deg, #f97316, #ea580c);
  }
`;

const FileUploadShell = styled.div`
  position: relative;
  border: 2px dashed rgba(249, 115, 22, 0.35);
  border-radius: 12px;
  padding: clamp(1rem, 2.5vw, 1.5rem);
  background: rgba(255, 247, 237, 0.6);
  transition: border-color 0.3s ease, background 0.3s ease;

  &:hover {
    border-color: rgba(249, 115, 22, 0.6);
    background: rgba(255, 247, 237, 0.85);
  }

  input[type="file"] {
    background: transparent;
    border: none;
    padding: 0;
  }
`;

const FilePreviewCard = styled.div`
  background: #fffaf5;
  border: 2px solid rgba(249, 115, 22, 0.2);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.3s ease;
  animation: ${slideInUp} 0.4s ease-out;

  &:hover {
    border-color: #f97316;
    box-shadow: 0 4px 12px rgba(249, 115, 22, 0.2);
  }

  &.uploading {
    border-color: #f97316;
    background: #fff7ed;
  }

  &.uploaded {
    border-color: #f97316;
    background: #fff7ed;
  }

  &.error {
    border-color: #b91c1c;
    background: #fee2e2;
  }
`;

const FileIcon = styled.div`
  font-size: 2rem;
  color: #b75b1f;
  flex-shrink: 0;

  &.uploading {
    color: #f97316;
  }

  &.uploaded {
    color: #f97316;
  }

  &.error {
    color: #b91c1c;
  }
`;

const FileInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const FileName = styled.div`
  font-weight: 600;
  color: #7f1d1d;
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const FileSize = styled.div`
  font-size: 0.875rem;
  color: #b75b1f;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(249, 115, 22, 0.15);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 0.5rem;
  position: relative;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #ef4444, #f97316);
  border-radius: 3px;
  transition: width 0.3s ease;
  width: ${props => props.progress || 0}%;
  animation: ${progressFill} 0.3s ease-out;

  &.indeterminate {
    width: 30%;
    animation: ${shimmer} 1.5s ease-in-out infinite;
    background: linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.7), transparent);
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
    background: #fff7ed;
    color: #b75b1f;
  }

  &.uploaded {
    background: #fef3c7;
    color: #b45309;
  }

  &.error {
    background: #fee2e2;
    color: #991b1b;
  }

  &.pending {
    background: #fee2e2;
    color: #b91c1c;
  }
`;

const UploadProgressContainer = styled.div`
  margin: 2rem 0;
  padding: 1.5rem;
  background: #fff7ed;
  border-radius: 12px;
  border: 2px dashed rgba(249, 115, 22, 0.35);
  animation: ${slideInUp} 0.4s ease-out;
`;

const UploadProgressTitle = styled.h4`
  font-size: 1.1rem;
  font-weight: 700;
  color: #b91c1c;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SubmissionStatus = styled.div`
  background: linear-gradient(135deg, #fee2e2, #fecdd3);
  border: 2px solid rgba(239, 68, 68, 0.35);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  animation: ${slideInUp} 0.4s ease-out;

  &.processing {
    background: linear-gradient(135deg, #ffe4e6, #fecdd3);
    border-color: rgba(239, 68, 68, 0.45);
  }

  &.uploading {
    background: linear-gradient(135deg, #fef3c7, #fde68a);
    border-color: #f59e0b;
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
  color: #7f1d1d;
  margin-bottom: 0.25rem;
`;

const StatusDescription = styled.div`
  font-size: 0.9rem;
  color: #b75b1f;
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
  border-radius: 24px;
  box-shadow: 0 24px 45px rgba(239, 68, 68, 0.12);
  animation: ${slideInUp} 0.6s ease-out;
`;

const SuccessIcon = styled.div`
  font-size: 4rem;
  color: #f97316;
  margin-bottom: 1.5rem;
`;

const SuccessTitle = styled.h2`
  font-size: 2rem;
  font-weight: 800;
  color: #9f1239;
  margin-bottom: 1rem;
`;

const SuccessText = styled.p`
  font-size: 1.1rem;
  color: #b75b1f;
  margin-bottom: 2rem;
`;

const BackButton = styled.button`
  background: linear-gradient(135deg, #ef4444, #f97316);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 14px rgba(239, 68, 68, 0.3);
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

  const fetchForm = useCallback(async () => {
    try {
      const response = await api.get(`/forms/public/${uniqueLink}`);
      const formData = response.data.form;
      setForm(formData);

      // Check if form is closed
      if (formData.closingDate) {
        const closingDate = new Date(formData.closingDate);
        const now = new Date();
        if (closingDate < now) {
          setError('Form submission deadline has passed. This form is no longer accepting applications.');
          setLoading(false);
          return;
        }
      }

      // Initialize form data
      const initialData = {};
      formData.formFields.forEach(field => {
        initialData[field.fieldName] = '';
      });
      setFormData(initialData);
    } catch (error) {
      setError(error.response?.data?.message || 'Form not found or no longer available.');
    } finally {
      setLoading(false);
    }
  }, [uniqueLink]);

  useEffect(() => {
    fetchForm();
  }, [fetchForm]);

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
            // Update individual file progress
            setFileUploads(prevUploads => {
              const updatedUploads = { ...prevUploads };
              const fileIds = Object.keys(updatedUploads);
              const progressPerFile = 100 / fileIds.length;
              
              fileIds.forEach((fileId, index) => {
                // Calculate progress for each file more accurately
                const startProgress = index * progressPerFile;
                const endProgress = (index + 1) * progressPerFile;
                let fileProgress = 0;
                
                if (progress >= endProgress) {
                  // File is fully uploaded
                  fileProgress = 100;
                } else if (progress > startProgress) {
                  // File is partially uploaded
                  fileProgress = ((progress - startProgress) / progressPerFile) * 100;
                }
                
                updatedUploads[fileId] = {
                  ...updatedUploads[fileId],
                  status: fileProgress >= 100 ? 'uploaded' : 'uploading',
                  progress: Math.min(100, Math.max(0, fileProgress))
                };
              });
              
              // If overall progress is 100%, ensure all files are marked as uploaded
              if (progress >= 100) {
                Object.keys(updatedUploads).forEach((fileId) => {
                  updatedUploads[fileId] = {
                    ...updatedUploads[fileId],
                    status: 'uploaded',
                    progress: 100
                  };
                });
              }
              
              return updatedUploads;
            });
          }
        );

        // Ensure all files are marked as uploaded after successful upload
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
        setUploadProgress(100);

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

      // Ensure all file uploads are marked as complete before showing completion state
      setFileUploads(prevUploads => {
        const completedUploads = { ...prevUploads };
        Object.keys(completedUploads).forEach((fileId) => {
          if (completedUploads[fileId].status !== 'uploaded') {
            completedUploads[fileId] = {
              ...completedUploads[fileId],
              status: 'uploaded',
              progress: 100
            };
          }
        });
        return completedUploads;
      });
      
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
      case 'file_multiple':
        return (
          <FileUploadShell>
            <FileInput
              type="file"
              onChange={(e) => handleFormDataChange(field.fieldName, field.fieldType === 'file_multiple' ? Array.from(e.target.files) : e.target.files[0])}
              required={field.required}
              multiple={field.fieldType === 'file_multiple'}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
          </FileUploadShell>
        );

      case 'radio':
        return (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {(field.options || []).map((opt, idx) => (
              <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
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

      case 'checkbox': {
        const options = field.options && field.options.length > 0 ? field.options : ['Yes'];
        const selected = Array.isArray(value) ? value : (value ? [options[0]] : []);
        return (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {options.map((opt, idx) => {
              const checked = selected.includes(opt);
              return (
                <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(opt); else next.delete(opt);
                      const arr = Array.from(next);
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
      }

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
              {/* Job Details Section */}
              {form.formType === 'candidate_profile' && (
                <FormSection>
                  <SectionTitle>
                    <FaBriefcase />
                    Job Details
                  </SectionTitle>
                  <JobDetailsCard>
                    {form.position && (
                      <JobDetailRow>
                        <JobDetailLabel>
                          <FaBriefcase />
                          {form.formCategory === 'teaching' ? 'Department' : 'Position'}
                        </JobDetailLabel>
                        <JobDetailValue>{form.position}</JobDetailValue>
                      </JobDetailRow>
                    )}
                    {form.department && (
                      <JobDetailRow>
                        <JobDetailLabel>
                          <FaInfoCircle />
                          {form.formCategory === 'teaching' ? 'Subject' : 'Department'}
                        </JobDetailLabel>
                        <JobDetailValue>{form.department}</JobDetailValue>
                      </JobDetailRow>
                    )}
                    {form.description && (
                      <JobDetailRow>
                        <JobDetailLabel>
                          <FaInfoCircle />
                          Description
                        </JobDetailLabel>
                        <JobDetailValue>{form.description}</JobDetailValue>
                      </JobDetailRow>
                    )}
                    {form.requirements && (
                      <>
                        {form.requirements.experience && (form.requirements.experience.min || form.requirements.experience.max) && (
                          <JobDetailRow>
                            <JobDetailLabel>
                              <FaInfoCircle />
                              Experience
                            </JobDetailLabel>
                            <JobDetailValue>
                              {form.requirements.experience.min || 0} - {form.requirements.experience.max || 'N/A'} years
                              {form.requirements.experience.preferred && ` (${form.requirements.experience.preferred})`}
                            </JobDetailValue>
                          </JobDetailRow>
                        )}
                        {form.requirements.qualifications && form.requirements.qualifications.length > 0 && (
                          <JobDetailRow>
                            <JobDetailLabel>
                              <FaInfoCircle />
                              Qualifications
                            </JobDetailLabel>
                            <JobDetailValue>
                              <RequirementsList>
                                {form.requirements.qualifications.map((qual, idx) => (
                                  <li key={idx}>{qual}</li>
                                ))}
                              </RequirementsList>
                            </JobDetailValue>
                          </JobDetailRow>
                        )}
                        {form.requirements.skills && form.requirements.skills.length > 0 && (
                          <JobDetailRow>
                            <JobDetailLabel>
                              <FaInfoCircle />
                              Skills
                            </JobDetailLabel>
                            <JobDetailValue>
                              <RequirementsList>
                                {form.requirements.skills.map((skill, idx) => (
                                  <li key={idx}>{skill}</li>
                                ))}
                              </RequirementsList>
                            </JobDetailValue>
                          </JobDetailRow>
                        )}
                        {form.requirements.responsibilities && form.requirements.responsibilities.length > 0 && (
                          <JobDetailRow>
                            <JobDetailLabel>
                              <FaInfoCircle />
                              Responsibilities
                            </JobDetailLabel>
                            <JobDetailValue>
                              <RequirementsList>
                                {form.requirements.responsibilities.map((resp, idx) => (
                                  <li key={idx}>{resp}</li>
                                ))}
                              </RequirementsList>
                            </JobDetailValue>
                          </JobDetailRow>
                        )}
                      </>
                    )}
                    {form.vacancies && (
                      <JobDetailRow>
                        <JobDetailLabel>
                          <FaBriefcase />
                          Vacancies
                        </JobDetailLabel>
                        <JobDetailValue>
                          {form.filledVacancies || 0} / {form.vacancies} positions filled
                          {form.filledVacancies >= form.vacancies && (
                            <ClosingDateBadge isUrgent={true}>
                              <FaClock />
                              All positions filled
                            </ClosingDateBadge>
                          )}
                        </JobDetailValue>
                      </JobDetailRow>
                    )}
                    {form.closingDate && (
                      <JobDetailRow>
                        <JobDetailLabel>
                          <FaCalendarAlt />
                          Closing Date
                        </JobDetailLabel>
                        <JobDetailValue>
                          {new Date(form.closingDate).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                          {(() => {
                            const closingDate = new Date(form.closingDate);
                            const now = new Date();
                            const daysLeft = Math.ceil((closingDate - now) / (1000 * 60 * 60 * 24));
                            if (daysLeft <= 3 && daysLeft > 0) {
                              return (
                                <ClosingDateBadge isUrgent={daysLeft <= 1}>
                                  <FaClock />
                                  {daysLeft === 1 ? '1 day left!' : `${daysLeft} days left`}
                                </ClosingDateBadge>
                              );
                            }
                            return null;
                          })()}
                        </JobDetailValue>
                      </JobDetailRow>
                    )}
                  </JobDetailsCard>
                </FormSection>
              )}

              {/* User Details Section */}
              <FormSection>
                <SectionTitle>
                  <FaUser />
                  Personal Information
                </SectionTitle>
                <TwoColumnGrid style={{ marginBottom: '1rem' }}>
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
                </TwoColumnGrid>
              </FormSection>

              {/* Dynamic Form Fields */}
              <FormSection>
                <SectionTitle>
                  <FaFileAlt />
                  Application Details
                </SectionTitle>
                <FieldsGrid>
                  {form.formFields.map((field, index) => {
                    const fullWidthTypes = ['textarea', 'file', 'file_multiple', 'radio', 'checkbox'];
                    const isFullWidth = fullWidthTypes.includes(field.fieldType);

                    return (
                      <FieldGroup
                        key={index}
                        style={isFullWidth ? { gridColumn: 'span 2' } : undefined}
                      >
                        <FieldLabel>
                          {field.fieldName}
                          {field.required && <span>*</span>}
                        </FieldLabel>
                        {renderFormField(field)}
                      </FieldGroup>
                    );
                  })}
                </FieldsGrid>
              </FormSection>


              <SubmitButton 
                type="submit" 
                disabled={submitting || (form?.closingDate && new Date(form.closingDate) < new Date())}
                className={submissionState === 'processing' ? 'processing' : submissionState === 'uploading' ? 'uploading' : ''}
              >
                {submitting ? (
                  <>
                    {submissionState === 'pending' && (
                      <>
                        <FaSpinner style={{ animation: 'spin 1s linear infinite', color: '#b91c1c' }} />
                        Preparing...
                      </>
                    )}
                    {submissionState === 'processing' && (
                      <>
                        <FaSpinner style={{ animation: 'spin 1s linear infinite', color: '#b91c1c' }} />
                        Processing...
                      </>
                    )}
                    {submissionState === 'uploading' && (
                      <>
                        <FaCloudUploadAlt style={{ animation: 'bounce 1s ease-in-out infinite', color: '#f97316' }} />
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
                        <FaSpinner style={{ animation: 'spin 1s linear infinite', color: '#b91c1c' }} />
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
                    {submissionState === 'pending' && <FaSpinner color="#b91c1c" />}
                    {submissionState === 'processing' && <FaSpinner color="#b91c1c" />}
                    {submissionState === 'uploading' && <FaCloudUploadAlt color="#f97316" />}
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
                <SubmissionStatus
                  className="uploading"
                  style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', borderColor: '#f59e0b' }}
                >
                  <StatusIcon style={{ animation: 'none' }}>
                    <FaCheckCircle style={{ color: '#f97316', fontSize: '2rem' }} />
                  </StatusIcon>
                  <StatusText>
                    <StatusTitle style={{ color: '#92400e' }}>Application Submitted Successfully!</StatusTitle>
                    <StatusDescription style={{ color: '#b45309' }}>
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
                        {fileInfo.status === 'uploading' && <FaCloudUploadAlt />}
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
                              <FaClock />
                              Waiting...
                            </>
                          )}
                          {fileInfo.status === 'uploading' && (
                            <>
                              <FaCloudUploadAlt />
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
