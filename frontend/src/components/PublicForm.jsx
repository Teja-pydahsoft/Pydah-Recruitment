import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaFileAlt,
  FaUser,
  FaPaperPlane,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUpload,
  FaSpinner,
  FaTimes,
  FaCloudUploadAlt,
  FaBriefcase,
  FaInfoCircle,
  FaClock,
  FaPlus,
  FaEdit,
  FaTrash
} from 'react-icons/fa';
import api, { uploadWithProgress } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import styles from './PublicForm.module.css';

const cx = (...classes) => classes.filter(Boolean).join(' ');

// Fields to exclude from Application Details (already in Personal Information section)
const EXCLUDED_FIELDS = ['fullname', 'email', 'name'];

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
  const [fileUploads, setFileUploads] = useState({});
  const [educationEntries, setEducationEntries] = useState([{ type: 'Graduation', college: '', percentage: '' }]);
  const [experienceEntries, setExperienceEntries] = useState([]);
  const [showEducationModal, setShowEducationModal] = useState(false);
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [editingEducationIndex, setEditingEducationIndex] = useState(null);
  const [editingExperienceIndex, setEditingExperienceIndex] = useState(null);
  const [tempEducationEntry, setTempEducationEntry] = useState({ type: 'Graduation', college: '', percentage: '' });
  const [tempExperienceEntry, setTempExperienceEntry] = useState({ organization: '', designation: '', duration: '', responsibilities: '' });

  const fetchForm = useCallback(async () => {
    try {
      const response = await api.get(`/forms/public/${uniqueLink}`);
      const formData = response.data.form;
      setForm(formData);

      if (formData.closingDate) {
        const closingDate = new Date(formData.closingDate);
        if (closingDate < new Date()) {
          setError('Form submission deadline has passed. This form is no longer accepting applications.');
          setLoading(false);
          return;
        }
      }

      const initialData = {};
      formData.formFields.forEach(field => {
        initialData[field.fieldName] = '';
      });
      setFormData(initialData);
    } catch (err) {
      setError(err.response?.data?.message || 'Form not found or no longer available.');
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

  const formatFileSize = bytes => {
    if (bytes === 0) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${sizes[i]}`;
  };

  // Education field handlers
  const handleAddEducation = () => {
    setTempEducationEntry({ type: 'Graduation', college: '', percentage: '' });
    setEditingEducationIndex(null);
    setShowEducationModal(true);
  };

  const handleEditEducation = (index) => {
    setTempEducationEntry(educationEntries[index]);
    setEditingEducationIndex(index);
    setShowEducationModal(true);
  };

  const handleDeleteEducation = (index) => {
    const newEntries = educationEntries.filter((_, i) => i !== index);
    setEducationEntries(newEntries);
    // Update form data
    const educationField = form?.formFields?.find(f => f.fieldName.toLowerCase().includes('education'));
    if (educationField) {
      handleFormDataChange(educationField.fieldName, JSON.stringify(newEntries));
    }
  };

  const handleSaveEducation = () => {
    if (!tempEducationEntry.college.trim() || !tempEducationEntry.percentage.trim()) {
      setError('Please fill in all required fields');
      return;
    }
    
    let newEntries;
    if (editingEducationIndex !== null) {
      newEntries = [...educationEntries];
      newEntries[editingEducationIndex] = { ...tempEducationEntry };
    } else {
      newEntries = [...educationEntries, { ...tempEducationEntry }];
    }
    
    setEducationEntries(newEntries);
    setShowEducationModal(false);
    setTempEducationEntry({ type: 'Graduation', college: '', percentage: '' });
    setEditingEducationIndex(null);
    
    // Update form data
    const educationField = form?.formFields?.find(f => f.fieldName.toLowerCase().includes('education'));
    if (educationField) {
      handleFormDataChange(educationField.fieldName, JSON.stringify(newEntries));
    }
  };

  // Experience field handlers
  const handleAddExperience = () => {
    setTempExperienceEntry({ organization: '', designation: '', duration: '', responsibilities: '' });
    setEditingExperienceIndex(null);
    setShowExperienceModal(true);
  };

  const handleEditExperience = (index) => {
    setTempExperienceEntry(experienceEntries[index]);
    setEditingExperienceIndex(index);
    setShowExperienceModal(true);
  };

  const handleDeleteExperience = (index) => {
    const newEntries = experienceEntries.filter((_, i) => i !== index);
    setExperienceEntries(newEntries);
    // Update form data
    const experienceField = form?.formFields?.find(f => f.fieldName.toLowerCase().includes('experience') && !f.fieldName.toLowerCase().includes('teaching'));
    if (experienceField) {
      handleFormDataChange(experienceField.fieldName, JSON.stringify(newEntries));
    }
  };

  const handleSaveExperience = () => {
    if (!tempExperienceEntry.organization.trim() || !tempExperienceEntry.designation.trim() || !tempExperienceEntry.duration.trim()) {
      setError('Please fill in all required fields');
      return;
    }
    
    let newEntries;
    if (editingExperienceIndex !== null) {
      newEntries = [...experienceEntries];
      newEntries[editingExperienceIndex] = { ...tempExperienceEntry };
    } else {
      newEntries = [...experienceEntries, { ...tempExperienceEntry }];
    }
    
    setExperienceEntries(newEntries);
    setShowExperienceModal(false);
    setTempExperienceEntry({ organization: '', designation: '', duration: '', responsibilities: '' });
    setEditingExperienceIndex(null);
    
    // Update form data
    const experienceField = form?.formFields?.find(f => f.fieldName.toLowerCase().includes('experience') && !f.fieldName.toLowerCase().includes('teaching'));
    if (experienceField) {
      handleFormDataChange(experienceField.fieldName, JSON.stringify(newEntries));
    }
  };

  // Load education entries from formData
  useEffect(() => {
    const educationField = form?.formFields?.find(f => f.fieldName.toLowerCase().includes('education'));
    if (educationField) {
      const data = formData[educationField.fieldName];
      if (data && typeof data === 'string') {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setEducationEntries(parsed);
          }
        } catch (e) {
          // Not JSON, ignore
        }
      }
    }
  }, [form, formData]);

  // Load experience entries from formData
  useEffect(() => {
    const experienceField = form?.formFields?.find(f => f.fieldName.toLowerCase().includes('experience') && !f.fieldName.toLowerCase().includes('teaching'));
    if (experienceField) {
      const data = formData[experienceField.fieldName];
      if (data && typeof data === 'string') {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setExperienceEntries(parsed);
          }
        } catch (e) {
          // Not JSON, ignore
        }
      }
    }
  }, [form, formData]);

  // Render education field with Add button system
  const renderEducationField = (field) => {

    return (
      <div className={styles.entryContainer}>
        {educationEntries.map((entry, index) => (
          <div key={index} className={styles.entryCard}>
            <div className={styles.entryContent}>
              <div className={styles.entryHeader}>
                <span className={styles.entryType}>{entry.type}</span>
                <div className={styles.entryActions}>
                  <button
                    type="button"
                    className={styles.entryEditButton}
                    onClick={() => handleEditEducation(index)}
                  >
                    <FaEdit />
                  </button>
                  <button
                    type="button"
                    className={styles.entryDeleteButton}
                    onClick={() => handleDeleteEducation(index)}
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
              <div className={styles.entryDetails}>
                <span><strong>College:</strong> {entry.college || 'Not specified'}</span>
                <span><strong>Percentage:</strong> {entry.percentage || 'Not specified'}</span>
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          className={styles.addEntryButton}
          onClick={handleAddEducation}
        >
          <FaPlus /> Add Education Entry
        </button>
      </div>
    );
  };

  // Render experience field with Add button system
  const renderExperienceField = (field) => {

    return (
      <div className={styles.entryContainer}>
        {experienceEntries.map((entry, index) => (
          <div key={index} className={styles.entryCard}>
            <div className={styles.entryContent}>
              <div className={styles.entryHeader}>
                <span className={styles.entryType}>{entry.organization || 'Organization'}</span>
                <div className={styles.entryActions}>
                  <button
                    type="button"
                    className={styles.entryEditButton}
                    onClick={() => handleEditExperience(index)}
                  >
                    <FaEdit />
                  </button>
                  <button
                    type="button"
                    className={styles.entryDeleteButton}
                    onClick={() => handleDeleteExperience(index)}
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
              <div className={styles.entryDetails}>
                <span><strong>Designation:</strong> {entry.designation || 'Not specified'}</span>
                <span><strong>Duration:</strong> {entry.duration || 'Not specified'}</span>
                {entry.responsibilities && (
                  <span><strong>Responsibilities:</strong> {entry.responsibilities}</span>
                )}
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          className={styles.addEntryButton}
          onClick={handleAddExperience}
        >
          <FaPlus /> Add Experience Entry
        </button>
      </div>
    );
  };

  const renderFormField = (field) => {
    const value = formData[field.fieldName] || '';
    const fieldNameLower = field.fieldName.toLowerCase();

    switch (field.fieldType) {
      case 'text':
      case 'email':
      case 'number':
      case 'date':
        // Enhanced placeholders for specific fields
        let enhancedTextPlaceholder = field.placeholder;
        if (!enhancedTextPlaceholder) {
          if (fieldNameLower.includes('religion')) {
            enhancedTextPlaceholder = 'Enter your religion';
          } else if (fieldNameLower.includes('caste')) {
            enhancedTextPlaceholder = 'Enter your caste';
          } else if (fieldNameLower.includes('salary') || fieldNameLower.includes('ctc')) {
            enhancedTextPlaceholder = 'Enter amount (e.g., 500000)';
          } else if (fieldNameLower.includes('mobile') || fieldNameLower.includes('phone')) {
            enhancedTextPlaceholder = 'Enter 10-digit mobile number';
          } else if (fieldNameLower.includes('aadhaar')) {
            enhancedTextPlaceholder = 'Enter 12-digit Aadhaar number';
          }
        }
        return (
          <input
            className={styles.input}
            type={field.fieldType === 'text' ? 'text' : field.fieldType === 'email' ? 'email' : field.fieldType}
            placeholder={enhancedTextPlaceholder}
            value={value}
            onChange={(e) => handleFormDataChange(field.fieldName, e.target.value)}
            required={field.required}
          />
        );

      case 'textarea':
        // Handle education and experience fields specially with Add button system
        if (fieldNameLower.includes('education')) {
          return renderEducationField(field);
        } else if (fieldNameLower.includes('experience') && !fieldNameLower.includes('teaching')) {
          return renderExperienceField(field);
        }
        // Regular textarea for other fields
        return (
          <textarea
            className={styles.textarea}
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleFormDataChange(field.fieldName, e.target.value)}
            required={field.required}
            rows={4}
          />
        );

      case 'select':
        // Enhanced default option text based on field name
        let defaultOptionText = 'Select an option';
        if (fieldNameLower.includes('experience') || fieldNameLower.includes('year')) {
          defaultOptionText = 'Select experience range';
        } else if (fieldNameLower.includes('designation')) {
          defaultOptionText = 'Select designation';
        } else {
          defaultOptionText = 'Please select';
        }
        
        return (
          <select
            className={styles.select}
            value={value}
            onChange={(e) => handleFormDataChange(field.fieldName, e.target.value)}
            required={field.required}
          >
            <option value="">{defaultOptionText}</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'file':
      case 'file_multiple': {
        let selectedLabel = 'No file selected';
        if (field.fieldType === 'file_multiple') {
          if (Array.isArray(value) && value.length > 0) {
            selectedLabel = `${value.length} file${value.length > 1 ? 's' : ''} selected`;
          }
        } else if (value instanceof File) {
          selectedLabel = value.name;
        }

        return (
          <label className={styles.fileInputWrapper}>
            <input
              className={styles.fileInputHidden}
              type="file"
              onChange={(e) =>
                handleFormDataChange(
                  field.fieldName,
                  field.fieldType === 'file_multiple' ? Array.from(e.target.files) : e.target.files[0]
                )
              }
              required={field.required}
              multiple={field.fieldType === 'file_multiple'}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
            <div className={styles.fileInputVisual}>
              <FaUpload />
              <span className={styles.fileInputPrimary}>
                {field.fieldName.toLowerCase().includes('resume') ? 'Upload Resume/CV' :
                 field.fieldName.toLowerCase().includes('photo') ? 'Upload Passport Photo' :
                 field.fieldName.toLowerCase().includes('certificate') ? 'Upload Certificate(s)' :
                 `Choose file${field.fieldType === 'file_multiple' ? 's' : ''}`}
              </span>
              <span className={styles.fileInputMeta}>
                {selectedLabel === 'No file selected' ? 
                  (field.fieldType === 'file_multiple' ? 'PDF, DOC, DOCX, JPG, PNG (Multiple files allowed)' : 'PDF, DOC, DOCX, JPG, PNG') :
                  selectedLabel}
              </span>
            </div>
          </label>
        );
      }

      case 'radio':
        return (
          <div className={styles.radioGroup}>
            {(field.options || []).map((opt, idx) => (
              <label key={idx} className={styles.radioOption}>
                <input
                  type="radio"
                  name={field.fieldName}
                  value={opt}
                  checked={value === opt}
                  onChange={(e) => handleFormDataChange(field.fieldName, e.target.value)}
                  required={field.required}
                />
                <span className={styles.radioLabel}>{opt}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox': {
        const options = field.options && field.options.length > 0 ? field.options : ['Yes'];
        const selected = Array.isArray(value) ? value : (value ? [options[0]] : []);
        return (
          <div className={styles.checkboxGroup}>
            {options.map((opt, idx) => {
              const checked = selected.includes(opt);
              return (
                <label key={idx} className={styles.checkboxOption}>
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
          <input
            className={styles.input}
            type="text"
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleFormDataChange(field.fieldName, e.target.value)}
            required={field.required}
          />
        );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    setSubmissionState('pending');
    setUploadProgress(0);
    setFileUploads({});

    try {
      const normalize = (name) => name?.toString().toLowerCase() || '';
      
      // Filter out excluded fields from formData (already in userDetails)
      const cleanedFormData = {};
      Object.entries(formData).forEach(([key, value]) => {
        const normalizedKey = normalize(key);
        if (!EXCLUDED_FIELDS.includes(normalizedKey)) {
          cleanedFormData[key] = value;
        }
      });

      const files = [];
      Object.entries(cleanedFormData).forEach(([key, value]) => {
        if (value instanceof File) {
          files.push({ key, file: value });
        } else if (Array.isArray(value) && value.length > 0 && value[0] instanceof File) {
          value.forEach((f) => files.push({ key, file: f }));
        }
      });

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
        setSubmissionState('processing');
        await new Promise(resolve => setTimeout(resolve, 500));
        setSubmissionState('uploading');

        const fd = new FormData();
        const nonFileData = {};
        Object.entries(cleanedFormData).forEach(([key, value]) => {
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

        const resp = await uploadWithProgress(
          `/forms/public/${uniqueLink}/submit`,
          fd,
          (progress) => {
            setUploadProgress(progress);
            setFileUploads(prevUploads => {
              const updated = { ...prevUploads };
              const fileIds = Object.keys(updated);
              const progressPerFile = fileIds.length ? 100 / fileIds.length : 100;

              fileIds.forEach((fileId, index) => {
                const startProgress = index * progressPerFile;
                const endProgress = (index + 1) * progressPerFile;
                let fileProgress = 0;

                if (progress >= endProgress) {
                  fileProgress = 100;
                } else if (progress > startProgress) {
                  fileProgress = ((progress - startProgress) / progressPerFile) * 100;
                }

                updated[fileId] = {
                  ...updated[fileId],
                  status: fileProgress >= 100 ? 'uploaded' : 'uploading',
                  progress: Math.min(100, Math.max(0, fileProgress))
                };
              });

              if (progress >= 100) {
                Object.keys(updated).forEach((fileId) => {
                  updated[fileId] = {
                    ...updated[fileId],
                    status: 'uploaded',
                    progress: 100
                  };
                });
              }

              return updated;
            });
          }
        );

        setFileUploads(prevUploads => {
          const completed = { ...prevUploads };
          Object.keys(completed).forEach((fileId) => {
            completed[fileId] = {
              ...completed[fileId],
              status: 'uploaded',
              progress: 100
            };
          });
          return completed;
        });
        setUploadProgress(100);

        if (resp?.data?.warnings?.length) {
          setError(resp.data.warnings.join('\n'));
        }
      } else {
        setSubmissionState('processing');
        const resp = await api.post(`/forms/public/${uniqueLink}/submit`, {
          candidateData: cleanedFormData,
          userDetails
        });
        if (resp?.data?.warnings?.length) {
          setError(resp.data.warnings.join('\n'));
        }
      }

      setFileUploads(prevUploads => {
        const completed = { ...prevUploads };
        Object.keys(completed).forEach((fileId) => {
          if (completed[fileId].status !== 'uploaded') {
            completed[fileId] = {
              ...completed[fileId],
              status: 'uploaded',
              progress: 100
            };
          }
        });
        return completed;
      });

      setSubmissionState('complete');
      setUploadProgress(100);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit form. Please try again.');
      setFileUploads(prevUploads => {
        const errors = { ...prevUploads };
        Object.keys(errors).forEach((fileId) => {
          errors[fileId] = {
            ...errors[fileId],
            status: 'error'
          };
        });
        return errors;
      });
      setSubmissionState('idle');
    } finally {
      setSubmitting(false);
    }
  };

  const prioritizedFieldNames = useMemo(
    () => ['gender', 'dateofbirth', 'mobile', 'mobilenumber', 'aadhaarnumber'],
    []
  );

  const sortedFields = useMemo(() => {
    if (!form?.formFields) return [];

    const normalize = (name) => name?.toString().toLowerCase() || '';

    return form.formFields
      .filter((field) => {
        const normalized = normalize(field.fieldName);
        // Exclude fields that match excluded field names (exact match only)
        return !EXCLUDED_FIELDS.includes(normalized);
      })
      .map((field, index) => {
        const normalized = normalize(field.fieldName);
        const priorityIndex = prioritizedFieldNames.findIndex((key) =>
          normalized === key || normalized.startsWith(key)
        );
        return {
          field,
          priority: priorityIndex > -1 ? priorityIndex : Number.MAX_SAFE_INTEGER,
          originalIndex: index
        };
      })
      .sort((a, b) => {
        if (a.priority === b.priority) {
          return a.originalIndex - b.originalIndex;
        }
        return a.priority - b.priority;
      })
      .map((item) => item.field);
  }, [form, prioritizedFieldNames]);

  if (loading) {
    return <LoadingSpinner message="Loading form..." />;
  }

  if (error && !form) {
    return (
      <div className={styles.layout}>
        <header className={styles.headerBar}>
          <h1 className={styles.title}>Form Unavailable</h1>
          <p className={styles.subtitle}>{error}</p>
        </header>
        <div className={styles.centeredPanel}>
          <FaExclamationTriangle style={{ fontSize: '3rem', color: '#dc2626' }} />
          <h2 className={styles.successTitle} style={{ color: '#b91c1c' }}>We’re Sorry</h2>
          <p className={styles.successText}>{error}</p>
          <button className={styles.backButton} onClick={() => navigate('/')}>Back to Home</button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.layout}>
        <header className={styles.headerBar}>
          <h1 className={styles.title}>Application Submitted</h1>
          <p className={styles.subtitle}>Thank you for applying. Our recruitment team will review your profile shortly.</p>
        </header>
        <div className={styles.centeredPanel}>
          <div className={styles.successIcon}>
            <FaCheckCircle />
          </div>
          <h2 className={styles.successTitle}>Success!</h2>
          <p className={styles.successText}>We’ve received your application and sent a confirmation to your email. We’ll be in touch soon.</p>
          <button className={styles.backButton} onClick={() => navigate('/')}>Back to Home</button>
        </div>
      </div>
    );
  }

  const closingDate = form?.closingDate ? new Date(form.closingDate) : null;
  const daysLeft = closingDate ? Math.ceil((closingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className={styles.layout}>
      <header className={styles.headerBar}>
        <h1 className={styles.title}>{form.title}</h1>
        {form.description && <p className={styles.subtitle}>{form.description}</p>}
      </header>

      <div className={styles.pageGrid}>
        <section className={styles.jobSummaryCard}>
          <div className={styles.jobSummaryHeader}>
            <h2 className={styles.jobSummaryTitle}>Position Overview</h2>
            {form.requirements?.experience?.preferred && (
              <p className={styles.sectionSubtitle}>{form.requirements.experience.preferred}</p>
            )}
          </div>

          <div className={styles.jobMeta}>
            {form.formCategory && (
              <div className={styles.jobTag}>
                <FaBriefcase />
                {form.formCategory === 'teaching' ? 'Teaching Role' : 'Administrative Role'}
              </div>
            )}
            {form.department && (
              <div className={styles.jobTag}>
                <FaInfoCircle />
                {form.department}
              </div>
            )}
            {form.vacancies && (
              <div className={styles.jobTag}>
                <FaUser />
                {form.filledVacancies || 0}/{form.vacancies} filled
              </div>
            )}
            {daysLeft !== null && daysLeft > 0 && (
              <div className={styles.jobTag}>
                <FaClock />
                {daysLeft === 1 ? '1 day left' : `${daysLeft} days left`}
              </div>
            )}
          </div>

          <dl className={styles.jobDetailsList}>
            {form.position && (
              <div className={styles.jobDetailItem}>
                <dt className={styles.jobDetailTerm}>{form.formCategory === 'teaching' ? 'Subject' : 'Position'}</dt>
                <dd className={styles.jobDetailDescription}>{form.position}</dd>
              </div>
            )}
            {form.description && (
              <div className={styles.jobDetailItem}>
                <dt className={styles.jobDetailTerm}>Summary</dt>
                <dd className={styles.jobDetailDescription}>{form.description}</dd>
              </div>
            )}
            {closingDate && (
              <div className={styles.jobDetailItem}>
                <dt className={styles.jobDetailTerm}>Closing Date</dt>
                <dd className={styles.jobDetailDescription}>
                  {closingDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                  {daysLeft !== null && daysLeft <= 3 && daysLeft > 0 && (
                    <span className={cx(styles.closingBadge, daysLeft <= 1 && styles.closingBadgeUrgent)} style={{ marginLeft: '0.5rem' }}>
                      <FaClock />
                      {daysLeft === 1 ? '1 day remaining' : `${daysLeft} days remaining`}
                    </span>
                  )}
                </dd>
              </div>
            )}
          </dl>

          {form.requirements && (
            <div className={styles.requirementsCard}>
              {form.requirements.experience && (form.requirements.experience.min || form.requirements.experience.max) && (
                <div>
                  <h4 className={cx(styles.sectionTitle, styles.sectionTitleSmall)}>
                    <FaBriefcase />
                    Experience
                  </h4>
                  <p className={styles.sectionSubtitle} style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                    {form.requirements.experience.min || 0} - {form.requirements.experience.max || 'N/A'} years
                  </p>
                </div>
              )}
              {form.requirements.qualifications && form.requirements.qualifications.length > 0 && (
                <div>
                  <h4 className={cx(styles.sectionTitle, styles.sectionTitleSmall)}>
                    <FaInfoCircle />
                    Qualifications
                  </h4>
                  <ul className={styles.requirementsList}>
                    {form.requirements.qualifications.map((qual, idx) => (
                      <li key={idx}>{qual}</li>
                    ))}
                  </ul>
                </div>
              )}
              {form.requirements.skills && form.requirements.skills.length > 0 && (
                <div>
                  <h4 className={cx(styles.sectionTitle, styles.sectionTitleSmall)}>
                    <FaInfoCircle />
                    Skills
                  </h4>
                  <ul className={styles.requirementsList}>
                    {form.requirements.skills.map((skill, idx) => (
                      <li key={idx}>{skill}</li>
                    ))}
                  </ul>
                </div>
              )}
              {form.requirements.responsibilities && form.requirements.responsibilities.length > 0 && (
                <div>
                  <h4 className={cx(styles.sectionTitle, styles.sectionTitleSmall)}>
                    <FaInfoCircle />
                    Responsibilities
                  </h4>
                  <ul className={styles.requirementsList}>
                    {form.requirements.responsibilities.map((resp, idx) => (
                      <li key={idx}>{resp}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        <section className={styles.formWorkspace}>
          {error && (
            <div className={styles.errorAlert}>
              <FaExclamationTriangle />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className={styles.formSection}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>
                  <FaUser />
                  <span>Personal Information</span>
                </h3>
                <p className={styles.sectionSubtitle}>We’ll use these details to contact you.</p>
              </div>
              <div className={styles.twoColumnGrid} style={{ marginTop: '1rem' }}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    Full Name<span>*</span>
                  </label>
                  <input
                    className={styles.input}
                    type="text"
                    value={userDetails.name}
                    onChange={(e) => handleUserDetailsChange('name', e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    Email Address<span>*</span>
                  </label>
                  <input
                    className={styles.input}
                    type="email"
                    value={userDetails.email}
                    onChange={(e) => handleUserDetailsChange('email', e.target.value)}
                    placeholder="Enter your email address"
                    required
                  />
                </div>
              </div>
            </div>

            <div className={styles.formSection}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>
                  <FaFileAlt />
                  <span>Application Details</span>
                </h3>
                <p className={styles.sectionSubtitle}>Provide the required information and upload supporting documents.</p>
              </div>
              <div className={cx(styles.fieldsGrid, styles.fieldsGridSpacing)}>
                {sortedFields.map((field, index) => {
                  const fullWidthTypes = ['textarea', 'radio', 'checkbox'];
                  const isFullWidth = fullWidthTypes.includes(field.fieldType);

                  // Format field name for display
                  const formatFieldName = (name) => {
                    if (!name) return '';
                    // Handle special cases
                    const specialCases = {
                      'ratifiedByUniversity': 'Ratified by University',
                      'nbaNccExperience': 'NBA/NCC Experience',
                      'nssExperience': 'NSS Experience',
                      'dateOfBirth': 'Date of Birth',
                      'mobileNumber': 'Mobile Number',
                      'aadhaarNumber': 'Aadhaar Number',
                      'totalExperienceYears': 'Total Experience (Years)',
                      'teachingExperience': 'Teaching Experience (Years)',
                      'salaryInCTC': 'Salary in CTC',
                      'currentSalary': 'Current Salary',
                      'expectedSalary': 'Expected Salary',
                      'passportPhoto': 'Passport Size Photo'
                    };
                    
                    if (specialCases[name]) {
                      return specialCases[name];
                    }
                    
                    // Convert camelCase to Title Case
                    return name
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/^./, str => str.toUpperCase())
                      .trim();
                  };

                  const displayName = formatFieldName(field.fieldName);

                  return (
                    <div
                      key={index}
                      className={cx(styles.fieldGroup, isFullWidth && styles.fieldGroupFull)}
                    >
                      <label className={styles.fieldLabel}>
                        {displayName}
                        {field.required && <span>*</span>}
                      </label>
                      {renderFormField(field)}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className={cx(
                styles.submitButton,
                submissionState === 'processing' && 'processing',
                submissionState === 'uploading' && 'uploading'
              )}
              disabled={submitting || (form?.closingDate && new Date(form.closingDate) < new Date())}
            >
              {submitting ? (
                <>
                  {submissionState === 'pending' && (
                    <>
                      <FaSpinner className={styles.spin} style={{ color: '#b91c1c' }} />
                      Preparing...
                    </>
                  )}
                  {submissionState === 'processing' && (
                    <>
                      <FaSpinner className={styles.spin} style={{ color: '#b91c1c' }} />
                      Processing...
                    </>
                  )}
                  {submissionState === 'uploading' && (
                    <>
                      <FaCloudUploadAlt className={styles.bounce} style={{ color: '#f97316' }} />
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
                      <FaSpinner className={styles.spin} style={{ color: '#b91c1c' }} />
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
            </button>
          </form>
        </section>
      </div>

      {(submissionState === 'pending' || submissionState === 'processing' || submissionState === 'uploading' || submissionState === 'complete') && (
        <div className={styles.submissionModal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h4 className={styles.modalTitle}>
                {submissionState === 'complete' ? (
                  <>
                    <FaCheckCircle style={{ color: '#10b981' }} />
                    Submission Complete!
                  </>
                ) : (
                  <>
                    <FaSpinner className={styles.spin} />
                    Submitting Application
                  </>
                )}
              </h4>
              {submissionState === 'complete' && (
                <button className={styles.closeButton} onClick={() => setSuccess(true)}>
                  <FaTimes />
                </button>
              )}
            </div>
            <div className={styles.modalBody}>
              {(submissionState === 'pending' || submissionState === 'processing' || submissionState === 'uploading') && (
                <div
                  className={cx(
                    styles.submissionStatus,
                    submissionState === 'pending' && styles.statusPending,
                    submissionState === 'processing' && styles.statusProcessing,
                    submissionState === 'uploading' && styles.statusUploading
                  )}
                >
                  <div className={cx(styles.statusIcon, submissionState === 'pending' && styles.pulse)}>
                    {submissionState === 'pending' && <FaSpinner className={styles.spin} color="#b91c1c" />}
                    {submissionState === 'processing' && <FaSpinner className={styles.spin} color="#b91c1c" />}
                    {submissionState === 'uploading' && <FaCloudUploadAlt color="#f97316" />}
                  </div>
                  <div className={styles.statusText}>
                    <p className={styles.statusTitle}>
                      {submissionState === 'pending' && 'Preparing Submission...'}
                      {submissionState === 'processing' && 'Processing Application...'}
                      {submissionState === 'uploading' && `Uploading Files... ${uploadProgress}%`}
                    </p>
                    <p className={styles.statusDescription}>
                      {submissionState === 'pending' && 'Please wait while we prepare your application for submission.'}
                      {submissionState === 'processing' && 'Validating your information and preparing files for upload.'}
                      {submissionState === 'uploading' && 'Your files are being uploaded to Google Drive. Please do not close this page.'}
                    </p>
                  </div>
                </div>
              )}

              {submissionState === 'complete' && (
                <div
                  className={cx(styles.submissionStatus, styles.statusUploading)}
                  style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', borderColor: '#f59e0b' }}
                >
                  <div className={styles.statusIcon} style={{ animation: 'none' }}>
                    <FaCheckCircle style={{ color: '#f97316', fontSize: '2rem' }} />
                  </div>
                  <div className={styles.statusText}>
                    <p className={styles.statusTitle} style={{ color: '#92400e' }}>Application Submitted Successfully!</p>
                    <p className={styles.statusDescription} style={{ color: '#b45309' }}>
                      Your application has been submitted. You will receive further updates via email.
                    </p>
                  </div>
                </div>
              )}

              {Object.keys(fileUploads).length > 0 && (
                <div className={styles.uploadProgressContainer}>
                  <div className={styles.uploadProgressTitle}>
                    <FaUpload />
                    File Upload Progress
                  </div>
                  {Object.entries(fileUploads).map(([fileId, fileInfo]) => {
                    const safeProgress = Math.max(0, Math.min(100, fileInfo.progress || 0));
                    return (
                      <div key={fileId} className={`${styles.filePreviewCard} ${fileInfo.status}`}>
                        <div className={`${styles.fileIcon} ${fileInfo.status}`}>
                          {fileInfo.status === 'uploading' && <FaCloudUploadAlt />}
                          {fileInfo.status === 'uploaded' && <FaCheckCircle />}
                          {fileInfo.status === 'error' && <FaTimes />}
                          {(fileInfo.status === 'pending' || !['uploading', 'uploaded', 'error'].includes(fileInfo.status)) && <FaFileAlt />}
                        </div>
                        <div className={styles.fileInfo}>
                          <div className={styles.fileName}>{fileInfo.name}</div>
                          <div className={styles.fileSize}>{formatFileSize(fileInfo.size)}</div>
                          {(fileInfo.status === 'uploading' || fileInfo.status === 'pending') && (
                            <div className={styles.progressBar}>
                              <div
                                className={cx(styles.progressFill, fileInfo.status === 'pending' && 'indeterminate')}
                                style={fileInfo.status === 'pending' ? undefined : { width: `${safeProgress}%` }}
                              />
                            </div>
                          )}
                          <div className={`${styles.statusBadge} ${fileInfo.status}`}>
                            {fileInfo.status === 'pending' && (
                              <>
                                <FaClock />
                                Waiting...
                              </>
                            )}
                            {fileInfo.status === 'uploading' && (
                              <>
                                <FaCloudUploadAlt />
                                Uploading {safeProgress}%
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
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Education Entry Modal */}
      {showEducationModal && (
        <div className={styles.modalOverlay} onClick={() => setShowEducationModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {editingEducationIndex !== null ? 'Edit Education Entry' : 'Add Education Entry'}
              </h3>
              <button className={styles.closeButton} onClick={() => setShowEducationModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  Qualification Type *
                </label>
                <select
                  className={styles.select}
                  value={tempEducationEntry.type}
                  onChange={(e) => setTempEducationEntry({ ...tempEducationEntry, type: e.target.value })}
                  required
                >
                  <option value="Graduation">Graduation</option>
                  <option value="Post Graduation">Post Graduation</option>
                  <option value="Ph.D">Ph.D</option>
                  <option value="Diploma">Diploma</option>
                  <option value="Certificate">Certificate</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  College/University *
                </label>
                <input
                  className={styles.input}
                  type="text"
                  value={tempEducationEntry.college}
                  onChange={(e) => setTempEducationEntry({ ...tempEducationEntry, college: e.target.value })}
                  placeholder="Enter college or university name"
                  required
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  Percentage/CGPA *
                </label>
                <input
                  className={styles.input}
                  type="text"
                  value={tempEducationEntry.percentage}
                  onChange={(e) => setTempEducationEntry({ ...tempEducationEntry, percentage: e.target.value })}
                  placeholder="Enter percentage or CGPA"
                  required
                />
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.modalCancelButton}
                  onClick={() => setShowEducationModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.modalSaveButton}
                  onClick={handleSaveEducation}
                >
                  {editingEducationIndex !== null ? 'Update' : 'Add'} Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Experience Entry Modal */}
      {showExperienceModal && (
        <div className={styles.modalOverlay} onClick={() => setShowExperienceModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {editingExperienceIndex !== null ? 'Edit Experience Entry' : 'Add Experience Entry'}
              </h3>
              <button className={styles.closeButton} onClick={() => setShowExperienceModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  Organization/Company *
                </label>
                <input
                  className={styles.input}
                  type="text"
                  value={tempExperienceEntry.organization}
                  onChange={(e) => setTempExperienceEntry({ ...tempExperienceEntry, organization: e.target.value })}
                  placeholder="Enter organization or company name"
                  required
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  Designation *
                </label>
                <input
                  className={styles.input}
                  type="text"
                  value={tempExperienceEntry.designation}
                  onChange={(e) => setTempExperienceEntry({ ...tempExperienceEntry, designation: e.target.value })}
                  placeholder="Enter your designation"
                  required
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  Duration *
                </label>
                <input
                  className={styles.input}
                  type="text"
                  value={tempExperienceEntry.duration}
                  onChange={(e) => setTempExperienceEntry({ ...tempExperienceEntry, duration: e.target.value })}
                  placeholder="e.g., Jan 2020 - Dec 2023 or 3 years"
                  required
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  Key Responsibilities
                </label>
                <textarea
                  className={styles.textarea}
                  value={tempExperienceEntry.responsibilities}
                  onChange={(e) => setTempExperienceEntry({ ...tempExperienceEntry, responsibilities: e.target.value })}
                  placeholder="Describe your key responsibilities (optional)"
                  rows={3}
                />
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.modalCancelButton}
                  onClick={() => setShowExperienceModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.modalSaveButton}
                  onClick={handleSaveExperience}
                >
                  {editingExperienceIndex !== null ? 'Update' : 'Add'} Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicForm;
