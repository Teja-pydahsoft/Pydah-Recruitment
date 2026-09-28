import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Modal, Tabs, Tab, Alert, Spinner, Image, Form, Offcanvas, ProgressBar, InputGroup, Pagination } from 'react-bootstrap';
import { FaFilePdf, FaFileImage, FaDownload, FaUser, FaSearch, FaKeyboard, FaEye, FaFilter, FaChevronUp, FaChevronDown, FaUsers, FaCheckCircle } from 'react-icons/fa';
import api from '../../services/api';
import SkeletonLoader from '../SkeletonLoader';
import { useAuth } from '../../contexts/AuthContext';
import ToastNotificationContainer from '../ToastNotificationContainer';
import DataValueRenderer from '../DataValueRenderer';

const PAGE_SIZE = 10;

const WORKFLOW_STAGE_META = {
  application_review: { label: 'Application Review', variant: 'secondary' },
  awaiting_test_assignment: { label: 'Awaiting Test Assignment', variant: 'info' },
  test_assigned: { label: 'Test Assigned', variant: 'primary' },
  test_in_progress: { label: 'Test In Progress', variant: 'warning' },
  awaiting_interview: { label: 'Awaiting Interview', variant: 'info' },
  interview_scheduled: { label: 'Interview Scheduled', variant: 'primary' },
  awaiting_decision: { label: 'Awaiting Decision', variant: 'warning' },
  selected: { label: 'Candidate Selected', variant: 'success' },
  rejected: { label: 'Candidate Rejected', variant: 'danger' },
  on_hold: { label: 'On Hold', variant: 'secondary' }
};

const PIPELINE_SEQUENCE = [
  'application_review',
  'awaiting_test_assignment',
  'test_assigned',
  'test_in_progress',
  'awaiting_interview',
  'interview_scheduled',
  'awaiting_decision',
  'selected'
];

const SPECIAL_STAGE_PROGRESS = {
  on_hold: 55,
  rejected: 0
};

const buildWorkflowSnapshot = (candidate, testAssignments = [], interviewAssignments = []) => {
  if (!candidate) {
    return {
      stage: 'application_review',
      label: 'Application in Review',
      nextAction: 'Review application details',
      tests: {
        assigned: 0,
        pending: 0,
        completed: 0,
        expired: 0,
        passed: 0,
        failed: 0
      },
      interviews: {
        scheduled: 0,
        completed: 0,
        cancelled: 0
      },
      finalDecision: null
    };
  }

  const tests = testAssignments || [];
  const interviews = interviewAssignments || [];
  const testResults = candidate.testResults || [];
  const finalDecision = candidate.finalDecision?.decision || null;

  const testsPending = tests.filter(t => ['invited', 'started'].includes(t.status)).length;
  const testsCompleted = tests.filter(t => t.status === 'completed').length;
  const testsExpired = tests.filter(t => t.status === 'expired').length;
  const testsAssigned = tests.length;

  const passedTests = testResults.filter(tr => tr.status === 'passed').length;
  const failedTests = testResults.filter(tr => tr.status === 'failed').length;

  // Count scheduled interviews: includes both 'scheduled' and 'completed' (since completed interviews were previously scheduled)
  const interviewsScheduled = interviews.filter(i => ['scheduled', 'completed'].includes(i.status)).length;
  const interviewsCompleted = interviews.filter(i => i.status === 'completed').length;
  const interviewsCancelled = interviews.filter(i => ['cancelled', 'no_show'].includes(i.status)).length;

  let stage = 'application_review';
  let label = 'Application in Review';
  let nextAction = 'Review application details';

  const candidateStatus = candidate.status;

  if (candidateStatus === 'rejected' || finalDecision === 'rejected') {
    stage = 'rejected';
    label = 'Application Rejected';
    nextAction = 'Notify candidate of decision';
  } else if (finalDecision === 'selected' || candidateStatus === 'selected') {
    stage = 'selected';
    label = 'Candidate Selected';
    nextAction = 'Proceed with onboarding';
  } else if (finalDecision === 'on_hold' || candidateStatus === 'on_hold') {
    stage = 'on_hold';
    label = 'Candidate On Hold';
    nextAction = 'Review hold status regularly';
  } else if (interviewsCompleted > 0 && !finalDecision) {
    stage = 'awaiting_decision';
    label = 'Awaiting Final Decision';
    nextAction = 'Record final decision';
  } else if (interviewsScheduled > 0) {
    stage = 'interview_scheduled';
    label = 'Interview Scheduled';
    nextAction = 'Conduct interview and capture feedback';
  } else if (passedTests > 0) {
    stage = 'awaiting_interview';
    label = 'Awaiting Interview Scheduling';
    nextAction = 'Schedule next interview round';
  } else if (testsCompleted > 0) {
    // Tests are completed but none have passed yet - still move to awaiting interview
    stage = 'awaiting_interview';
    label = 'Awaiting Interview Scheduling';
    nextAction = 'Schedule next interview round';
  } else if (testsPending > 0) {
    stage = 'test_in_progress';
    label = 'Test In Progress';
    nextAction = 'Monitor test completion';
  } else if (testsAssigned > 0) {
    stage = 'test_assigned';
    label = 'Test Assigned';
    nextAction = 'Ensure candidate starts the test';
  } else if (['approved', 'shortlisted'].includes(candidateStatus)) {
    stage = 'awaiting_test_assignment';
    label = 'Awaiting Test Assignment';
    nextAction = 'Assign appropriate assessment';
  } else if (candidateStatus === 'pending') {
    stage = 'application_review';
    label = 'Application in Review';
    nextAction = 'Review application details';
  }

  return {
    stage,
    label,
    nextAction,
    tests: {
      assigned: testsAssigned,
      pending: testsPending,
      completed: testsCompleted,
      expired: testsExpired,
      passed: passedTests,
      failed: failedTests
    },
    interviews: {
      scheduled: interviewsScheduled,
      completed: interviewsCompleted,
      cancelled: interviewsCancelled
    },
    finalDecision: candidate.finalDecision || null
  };
};

const CandidateManagement = () => {
  const { hasWritePermission } = useAuth();
  const canWrite = hasWritePermission('candidates.manage');

  const [candidates, setCandidates] = useState(() => {
    try {
      const cached = sessionStorage.getItem('candidates_cache_data');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [loading, setLoading] = useState(() => candidates.length === 0);
  const [profileLoading, setProfileLoading] = useState(false);
  const [toast, setToast] = useState({ type: '', message: '' });
  const [searchTerm, setSearchTerm] = useState(''); // Applied search
  const [searchInput, setSearchInput] = useState(''); // Input value (not applied until button click)
  const [statusFilter, setStatusFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [campusFilter, setCampusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [positionFilter, setPositionFilter] = useState('all');
  const [testStatusFilter, setTestStatusFilter] = useState('all');
  const [interviewStatusFilter, setInterviewStatusFilter] = useState('all');
  const [stageDrawerStage, setStageDrawerStage] = useState(null);
  const [stageDrawerOpen, setStageDrawerOpen] = useState(false);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionCandidate, setDecisionCandidate] = useState(null);
  const [decisionType, setDecisionType] = useState('selected');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [finalizationData, setFinalizationData] = useState({
    bond: '',
    conditions: '',
    salary: '',
    designation: ''
  });
  const [expandedTestResults, setExpandedTestResults] = useState({});
  const [testResultPdfDownloadingKey, setTestResultPdfDownloadingKey] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [typingTestResultsForCandidate, setTypingTestResultsForCandidate] = useState([]);
  const [selectedTypingResult, setSelectedTypingResult] = useState(null);
  const [showTypingResultModal, setShowTypingResultModal] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [applicationPdfDownloading, setApplicationPdfDownloading] = useState(false);



  const resetAllFilters = () => {
    setSearchInput('');
    setSearchTerm('');
    setCampusFilter('all');
    setCategoryFilter('all');
    setDepartmentFilter('all');
    setPositionFilter('all');
    setStatusFilter('all');
    setStageFilter('all');
    setTestStatusFilter('all');
    setInterviewStatusFilter('all');
  };

  // 1. Available Campuses
  const availableCampuses = useMemo(() => {
    const set = new Set(['Btech', 'Pharmacy', 'Degree', 'Diploma']);
    candidates.forEach(c => {
      const val = c.form?.campus || c.personalDetails?.college;
      if (val) set.add(val);
    });
    return Array.from(set).sort();
  }, [candidates]);

  // Candidates after Campus Filter
  const candidatesAfterCampus = useMemo(() => {
    if (campusFilter === 'all') return candidates;
    return candidates.filter(c => {
      const campus = (c.form?.campus || c.personalDetails?.college || '').toLowerCase();
      return campus.includes(campusFilter.toLowerCase());
    });
  }, [candidates, campusFilter]);

  // 2. Available Categories based on selected Campus
  const availableCategories = useMemo(() => {
    const set = new Set();
    candidatesAfterCampus.forEach(c => {
      const val = c.form?.formCategory || c.personalDetails?.formCategory;
      if (val) set.add(val);
    });
    return Array.from(set).sort();
  }, [candidatesAfterCampus]);

  // Candidates after Category Filter
  const candidatesAfterCategory = useMemo(() => {
    if (categoryFilter === 'all') return candidatesAfterCampus;
    return candidatesAfterCampus.filter(c => {
      const cat = (c.form?.formCategory || c.personalDetails?.formCategory || '').toLowerCase();
      return cat.includes(categoryFilter.toLowerCase());
    });
  }, [candidatesAfterCampus, categoryFilter]);

  // 3. Available Departments based on selected Campus + Category
  const availableDepartments = useMemo(() => {
    const set = new Set();
    candidatesAfterCategory.forEach(c => {
      const val = c.form?.department || c.personalDetails?.department;
      if (val) set.add(val);
    });
    return Array.from(set).sort();
  }, [candidatesAfterCategory]);

  // Candidates after Department Filter
  const candidatesAfterDept = useMemo(() => {
    if (departmentFilter === 'all') return candidatesAfterCategory;
    return candidatesAfterCategory.filter(c => {
      const dept = (c.form?.department || c.personalDetails?.department || '').toLowerCase();
      return dept.includes(departmentFilter.toLowerCase());
    });
  }, [candidatesAfterCategory, departmentFilter]);

  // 4. Available Positions based on selected Campus + Category + Department
  const availablePositions = useMemo(() => {
    const set = new Set();
    candidatesAfterDept.forEach(c => {
      const val = c.form?.position;
      if (val) set.add(val);
    });
    return Array.from(set).sort();
  }, [candidatesAfterDept]);

  // Auto reset dependent filters when parent selections change
  useEffect(() => {
    if (categoryFilter !== 'all' && !availableCategories.includes(categoryFilter)) {
      setCategoryFilter('all');
    }
  }, [availableCategories, categoryFilter]);

  useEffect(() => {
    if (departmentFilter !== 'all' && !availableDepartments.includes(departmentFilter)) {
      setDepartmentFilter('all');
    }
  }, [availableDepartments, departmentFilter]);

  useEffect(() => {
    if (positionFilter !== 'all' && !availablePositions.includes(positionFilter)) {
      setPositionFilter('all');
    }
  }, [availablePositions, positionFilter]);

  const toggleTestResultDetails = (testId) => {
    setExpandedTestResults(prev => ({
      ...prev,
      [testId]: !prev[testId]
    }));
  };

  const downloadTestResultPdf = async (test, candidateId, rowKey) => {
    const key = String(rowKey);
    const testId = test.testId;
    if (!testId || !candidateId) {
      setToast({ type: 'danger', message: 'Missing test or candidate information for this export.' });
      return;
    }
    setTestResultPdfDownloadingKey(key);
    try {
      const response = await api.get(`/tests/export/candidate-result-pdf/${testId}/${candidateId}`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safe = (s) => String(s || 'test_result').replace(/[^a-z0-9-_]+/gi, '_').slice(0, 80);
      link.setAttribute('download', `${safe(test.testTitle)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setToast({ type: 'success', message: 'PDF downloaded successfully.' });
    } catch (error) {
      console.error('Test result PDF download error:', error);
      let message = 'Unable to download test result PDF. Please try again.';
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed.message) message = parsed.message;
        } catch {
          // keep default message
        }
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      }
      setToast({ type: 'danger', message });
    } finally {
      setTestResultPdfDownloadingKey(null);
    }
  };

  const formatDurationSeconds = (value) => {
    const seconds = Number(value);
    if (!Number.isFinite(seconds) || seconds < 0) {
      return '--';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const formatOptionList = (options, emptyLabel = 'Not answered') => {
    if (!options || options.length === 0) {
      return emptyLabel;
    }
    return options
      .map(option => {
        if (!option) {
          return '—';
        }
        const label = option.label || (typeof option.index === 'number' ? String.fromCharCode(65 + option.index) : '');
        const text = option.text || '—';
        return `${label}${label ? '. ' : ''}${text}`;
      })
      .join(', ');
  };

  const fetchCandidates = useCallback(async () => {
    if (candidates.length === 0) setLoading(true);
    try {
      const response = await api.get('/candidates');
      const data = response.data.candidates || [];
      setCandidates(data);
      try {
        sessionStorage.setItem('candidates_cache_data', JSON.stringify(data));
      } catch (e) {}
    } catch (error) {
      setToast({ type: 'danger', message: 'Failed to fetch candidates' });
      console.error('Candidates fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [candidates.length]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const refreshCandidates = async () => {
    try {
      await fetchCandidates();
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidateProfile = async (candidateId) => {
    setProfileLoading(true);
    try {
      const [candidateResponse, typingResultsResponse] = await Promise.all([
        api.get(`/candidates/${candidateId}`),
        api.get(`/typing-test/results/${candidateId}`).catch(() => ({ data: { typingTestResults: [] } }))
      ]);
      setSelectedCandidate(candidateResponse.data.candidate);
      setTypingTestResultsForCandidate(typingResultsResponse.data.typingTestResults || []);
      setShowProfileModal(true);
      setExpandedTestResults({});
      setTestResultPdfDownloadingKey(null);
    } catch (error) {
      setToast({ type: 'danger', message: 'Failed to fetch candidate profile' });
      console.error('Profile fetch error:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const closeProfileModal = () => {
    setShowProfileModal(false);
    setSelectedCandidate(null);
    setExpandedTestResults({});
    setTestResultPdfDownloadingKey(null);
    setApplicationPdfDownloading(false);
    setTypingTestResultsForCandidate([]);
    setSelectedTypingResult(null);
    setShowTypingResultModal(false);
  };

  const downloadApplicationPdf = async (candidate) => {
    const candidateId = candidate?._id;
    if (!candidateId) {
      setToast({ type: 'danger', message: 'Unable to download PDF for this application.' });
      return;
    }

    setApplicationPdfDownloading(true);
    try {
      const response = await api.get(`/candidates/${candidateId}/application-pdf`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = (candidate.personalDetails?.name || candidate.user?.name || 'application')
        .replace(/[^a-z0-9]/gi, '_');
      link.setAttribute('download', `application_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setToast({ type: 'success', message: 'Application PDF downloaded successfully.' });
    } catch (error) {
      console.error('Application PDF download error:', error);
      setToast({ type: 'danger', message: 'Failed to download application PDF. Please try again.' });
    } finally {
      setApplicationPdfDownloading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'secondary',
      approved: 'info',
      rejected: 'danger',
      shortlisted: 'warning',
      selected: 'success'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getWorkflowBadge = (workflow) => {
    if (!workflow) {
      return <Badge bg="secondary">Unknown</Badge>;
    }
    const meta = WORKFLOW_STAGE_META[workflow.stage] || { label: workflow.label || 'Workflow', variant: 'secondary' };
    return <Badge bg={meta.variant}>{workflow.label || meta.label}</Badge>;
  };

  const stageStats = useMemo(() => {
    const stats = {};
    candidates.forEach(candidate => {
      const stage = candidate.workflow?.stage || 'application_review';
      stats[stage] = (stats[stage] || 0) + 1;
    });
    return stats;
  }, [candidates]);

  const stageGroups = useMemo(() => {
    const groups = {};
    Object.keys(WORKFLOW_STAGE_META).forEach(stage => {
      groups[stage] = [];
    });

    candidates.forEach(candidate => {
      const stage = candidate.workflow?.stage || 'application_review';
      if (!groups[stage]) {
        groups[stage] = [];
      }
      groups[stage].push(candidate);
    });

    return groups;
  }, [candidates]);

  const completedProfilesCount = useMemo(() => {
    return candidates.filter(c => c.status === 'selected' || c.status === 'approved' || c.personalDetails?.isProfileDone).length;
  }, [candidates]);

  const completionPercentage = useMemo(() => {
    return candidates.length > 0 ? Math.round((completedProfilesCount / candidates.length) * 100) : 0;
  }, [candidates.length, completedProfilesCount]);

  const filteredCandidates = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return candidatesAfterDept.filter(candidate => {
      // Position Filter
      if (positionFilter !== 'all') {
        const pos = (candidate.form?.position || '').toLowerCase();
        if (!pos.includes(positionFilter.toLowerCase())) return false;
      }

      // Search term match
      const name = (candidate.user?.name || candidate.personalDetails?.name || '').toLowerCase();
      const email = (candidate.user?.email || candidate.personalDetails?.email || '').toLowerCase();
      const position = (candidate.form?.position || '').toLowerCase();
      const department = (candidate.form?.department || '').toLowerCase();
      const candidateId = (candidate.candidateNumber || '').toLowerCase();
      const phone = (candidate.personalDetails?.phone || candidate.user?.mobileNumber || '').toLowerCase();

      const matchesTerm = !term ||
        name.includes(term) ||
        email.includes(term) ||
        position.includes(term) ||
        department.includes(term) ||
        candidateId.includes(term) ||
        phone.includes(term);

      if (!matchesTerm) return false;

      // Status Filter
      if (statusFilter !== 'all') {
        const status = (candidate.status || 'pending').toLowerCase();
        if (status !== statusFilter.toLowerCase()) return false;
      }

      // Workflow Stage Filter
      if (stageFilter !== 'all') {
        if (candidate.workflow?.stage !== stageFilter) return false;
      }

      // Test Status Filter
      if (testStatusFilter !== 'all') {
        const tests = candidate.workflow?.tests || {};
        if (testStatusFilter === 'passed' && (tests.passed || 0) === 0) return false;
        if (testStatusFilter === 'failed' && (tests.failed || 0) === 0) return false;
        if (testStatusFilter === 'pending' && (tests.pending || 0) === 0) return false;
        if (testStatusFilter === 'assigned' && (tests.assigned || 0) === 0) return false;
        if (testStatusFilter === 'none' && (tests.assigned || 0) > 0) return false;
      }

      // Interview Status Filter
      if (interviewStatusFilter !== 'all') {
        const interviews = candidate.workflow?.interviews || {};
        if (interviewStatusFilter === 'scheduled' && (interviews.scheduled || 0) === 0) return false;
        if (interviewStatusFilter === 'completed' && (interviews.completed || 0) === 0) return false;
        if (interviewStatusFilter === 'none' && (interviews.scheduled || 0) > 0) return false;
      }

      return true;
    });
  }, [
    candidatesAfterDept,
    positionFilter,
    searchTerm,
    statusFilter,
    stageFilter,
    testStatusFilter,
    interviewStatusFilter
  ]);

  const downloadFilteredCandidatesCSV = () => {
    if (filteredCandidates.length === 0) {
      setToast({ type: 'danger', message: 'No candidates match the selected filters to download.' });
      return;
    }

    const headers = [
      'Candidate Number',
      'Name',
      'Email',
      'Phone',
      'Position',
      'Department',
      'Campus',
      'Category',
      'Status',
      'Workflow Stage',
      'Tests Assigned',
      'Tests Passed',
      'Interviews Scheduled'
    ];

    const rows = filteredCandidates.map(c => [
      `"${c.candidateNumber || ''}"`,
      `"${c.user?.name || c.personalDetails?.name || ''}"`,
      `"${c.user?.email || c.personalDetails?.email || ''}"`,
      `"${c.personalDetails?.phone || c.user?.mobileNumber || ''}"`,
      `"${c.form?.position || ''}"`,
      `"${c.form?.department || ''}"`,
      `"${c.form?.campus || c.personalDetails?.college || ''}"`,
      `"${c.form?.formCategory || ''}"`,
      `"${c.finalDecision?.decision === 'selected' ? 'finalized' : c.status || ''}"`,
      `"${c.workflow?.label || c.workflow?.stage || ''}"`,
      `"${c.workflow?.tests?.assigned || 0}"`,
      `"${c.workflow?.tests?.passed || 0}"`,
      `"${c.workflow?.interviews?.scheduled || 0}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `filtered_candidates_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setToast({ type: 'success', message: `Downloaded CSV with ${filteredCandidates.length} filtered candidate(s).` });
  };

  // Paginated candidates
  const paginatedCandidates = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredCandidates.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredCandidates, currentPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredCandidates.length / PAGE_SIZE);
  }, [filteredCandidates.length]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    statusFilter,
    stageFilter,
    campusFilter,
    categoryFilter,
    departmentFilter,
    positionFilter,
    testStatusFilter,
    interviewStatusFilter
  ]);

  const getStageProgressPercentage = (stage) => {
    if (!stage) {
      return 0;
    }
    if (Object.prototype.hasOwnProperty.call(SPECIAL_STAGE_PROGRESS, stage)) {
      return SPECIAL_STAGE_PROGRESS[stage];
    }
    const index = PIPELINE_SEQUENCE.indexOf(stage);
    if (index === -1) {
      return 0;
    }
    return Math.round(((index + 1) / PIPELINE_SEQUENCE.length) * 100);
  };

  const getProgressVariant = (stage) => {
    switch (stage) {
      case 'selected':
        return 'success';
      case 'test_in_progress':
      case 'awaiting_decision':
        return 'warning';
      case 'awaiting_interview':
      case 'interview_scheduled':
      case 'test_assigned':
        return 'info';
      case 'rejected':
        return 'danger';
      case 'on_hold':
        return 'secondary';
      default:
        return 'primary';
    }
  };

  const openStageDrawer = (stage) => {
    setStageDrawerStage(stage);
    setStageDrawerOpen(true);
  };

  const closeStageDrawer = () => {
    setStageDrawerOpen(false);
  };

  const openDecisionModal = (candidate, type) => {
    if (!candidate) return;
    setDecisionCandidate(candidate);
    setDecisionType(type);
    setDecisionNotes(candidate.finalDecision?.notes || '');
    setDecisionModalOpen(true);
  };

  const closeDecisionModal = () => {
    setDecisionModalOpen(false);
    setDecisionCandidate(null);
    setDecisionNotes('');
    setDecisionLoading(false);
    setFinalizationData({
      bond: '',
      conditions: '',
      salary: '',
      designation: ''
    });
  };

  const handleDecisionSubmit = async () => {
    if (!decisionCandidate) return;

    // Validate: Notes are mandatory for non-finalization decisions
    if (decisionType !== 'selected' && !decisionNotes.trim()) {
      setToast({ type: 'danger', message: 'Note is mandatory when promoting candidate to next step' });
      return;
    }

    // Validate: Finalization form fields are required when finalizing
    if (decisionType === 'selected') {
      if (!finalizationData.bond.trim() || !finalizationData.conditions.trim() ||
        !finalizationData.salary.trim() || !finalizationData.designation.trim()) {
        setToast({ type: 'danger', message: 'All finalization fields (Bond, Conditions, Salary, Designation) are required' });
        return;
      }
    }

    setDecisionLoading(true);
    try {
      const payload = {
        decision: decisionType,
        notes: decisionNotes
      };

      // Include finalization data when finalizing
      if (decisionType === 'selected') {
        payload.finalizationData = finalizationData;
      }

      const response = await api.put(`/candidates/${decisionCandidate._id}/final-decision`, payload);

      let decisionLabel = 'updated';
      if (decisionType === 'selected') {
        decisionLabel = 'finalized';
      } else if (decisionType === 'rejected') {
        decisionLabel = 'rejected';
      } else if (decisionType === 'on_hold') {
        decisionLabel = 'put on hold';
      }
      setToast({ type: 'success', message: `Candidate ${decisionCandidate.user?.name || ''} ${decisionLabel} successfully.` });

      if (response?.data?.candidate) {
        setCandidates(prevCandidates =>
          prevCandidates.map(candidate =>
            candidate._id === response.data.candidate._id
              ? {
                ...candidate,
                ...response.data.candidate,
                assignments: {
                  tests: candidate.assignments?.tests || [],
                  interviews: candidate.assignments?.interviews || []
                },
                workflow: buildWorkflowSnapshot(
                  response.data.candidate,
                  candidate.assignments?.tests || [],
                  candidate.assignments?.interviews || []
                )
              }
              : candidate
          )
        );
      } else {
        await refreshCandidates();
      }
    } catch (err) {
      setToast({ type: 'danger', message: 'Failed to update candidate decision' });
      console.error('Decision update error:', err);
    } finally {
      setDecisionLoading(false);
      closeDecisionModal();
    }
  };

  const renderPersonalDetailsTab = (candidate) => {
    const applicationData = candidate.personalDetails?.applicationData || {};
    const documents = candidate.personalDetails?.documents || [];
    const passportPhoto = candidate.personalDetails?.passportPhoto;

    // Fields to exclude from Application Form Details
    const excludedFields = ['name', 'fullName', 'email', 'phone', 'mobileNumber', 'mobile', 'passportPhoto'];

    const resume = documents.find(d => {
      const name = d.name?.toLowerCase() || '';
      return name.includes('resume') || name.includes('cv');
    });
    const certificates = documents.filter(d => (d.name?.toLowerCase() || '').includes('certificate'));
    const otherDocs = documents.filter(d => {
      const name = d.name?.toLowerCase() || '';
      const isResume = resume ? (d.name === resume.name && d.url === resume.url) : false;
      return !isResume && !name.includes('certificate');
    });

    const filteredApplicationData = Object.entries(applicationData).filter(([key, value]) => {
      const lowerKey = key.toLowerCase();
      // Skip excluded fields and file URLs
      if (excludedFields.some(excluded => lowerKey.includes(excluded.toLowerCase()))) return false;
      if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) return false;
      if (value === null || value === undefined || value === '') return false;
      return true;
    });

    return (
      <div className="pb-3">
        <Row className="g-4 mb-4">
          <Col xs={12} lg={passportPhoto ? 9 : 12}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body>
                <h4 className="mb-1" style={{ fontWeight: 600 }}>{candidate.personalDetails?.name}</h4>
                <div className="d-flex flex-wrap gap-2">
                  <Badge bg="light" text="dark">{candidate.personalDetails?.email}</Badge>
                  {candidate.personalDetails?.phone && (
                    <Badge bg="light" text="dark">📞 {candidate.personalDetails.phone}</Badge>
                  )}
                  {candidate.candidateNumber && (
                    <Badge bg="dark">{candidate.candidateNumber}</Badge>
                  )}
                  <Badge bg={candidate.workflow?.variant || 'secondary'}>{candidate.workflow?.label}</Badge>
                </div>
              </Card.Body>
            </Card>
          </Col>
          {passportPhoto && (
            <Col xs={12} lg={3} className="d-flex justify-content-lg-end">
              <Card className="border-0 shadow-sm w-100" style={{ maxWidth: '220px' }}>
                <Card.Body className="text-center p-3">
                  <div className="text-muted text-uppercase mb-2" style={{ fontSize: '0.7rem', letterSpacing: '0.08em' }}>
                    Candidate Photo
                  </div>
                  <Image
                    src={passportPhoto}
                    alt="Candidate"
                    roundedCircle
                    style={{ width: '80px', height: '80px', objectFit: 'cover', border: '2px solid #eef2f6' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </Card.Body>
              </Card>
            </Col>
          )}
        </Row>

        <h6 className="text-uppercase text-muted mb-3" style={{ letterSpacing: '0.08em', fontSize: '0.75rem', fontWeight: 700 }}>
          Application Responses
        </h6>
        <Row className="g-3 mb-4">
          {filteredApplicationData.map(([key, value]) => (
            <Col xs={12} md={6} lg={4} key={key}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body style={{ fontSize: '0.9rem' }}>
                  <div className="text-muted text-uppercase mb-1" style={{ fontSize: '0.7rem', letterSpacing: '0.08em', fontWeight: 600 }}>
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </div>
                  <div>
                    <DataValueRenderer value={value} />
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
          {filteredApplicationData.length === 0 && (
            <Col xs={12}>
              <Alert variant="light" className="mb-0">No additional application data available.</Alert>
            </Col>
          )}
        </Row>

        {/* Documents section matching FormSubmissions UI */}
        <h6 className="text-uppercase text-muted mb-3" style={{ letterSpacing: '0.08em', fontSize: '0.75rem', fontWeight: 700 }}>
          Documents
        </h6>
        <Row className="g-3">
          {resume && (
            <Col xs={12} md={6} lg={4}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body>
                  <h6 className="d-flex align-items-center gap-2 mb-2" style={{ fontSize: '0.95rem' }}>
                    <FaFilePdf /> Resume / CV
                  </h6>
                  <div className="d-flex flex-wrap gap-2 text-truncate">
                    <small className="text-muted w-100 mb-2 d-block text-truncate">{resume.name}</small>
                    <Button variant="outline-primary" size="sm" href={resume.url} target="_blank" rel="noopener noreferrer">
                      View
                    </Button>
                    <Button variant="outline-secondary" size="sm" href={resume.url} download>
                      Download
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          )}

          {certificates.map((cert, index) => (
            <Col xs={12} md={6} lg={4} key={`cert-${index}`}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body>
                  <h6 className="d-flex align-items-center gap-2 mb-2" style={{ fontSize: '0.95rem' }}>
                    <FaFileImage /> Certificate
                  </h6>
                  <div className="d-flex flex-wrap gap-2 text-truncate">
                    <small className="text-muted w-100 mb-2 d-block text-truncate">{cert.name}</small>
                    <Button variant="outline-primary" size="sm" href={cert.url} target="_blank" rel="noopener noreferrer">
                      View
                    </Button>
                    <Button variant="outline-secondary" size="sm" href={cert.url} download>
                      Download
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}

          {otherDocs.map((doc, index) => (
            <Col xs={12} md={6} lg={4} key={`doc-${index}`}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body>
                  <h6 className="mb-2" style={{ fontSize: '0.95rem' }}>{doc.name}</h6>
                  <div className="d-flex flex-wrap gap-2">
                    <Button variant="outline-primary" size="sm" href={doc.url} target="_blank" rel="noopener noreferrer">
                      View
                    </Button>
                    <Button variant="outline-secondary" size="sm" href={doc.url} download>
                      Download
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}

          {!resume && certificates.length === 0 && otherDocs.length === 0 && (
            <Col xs={12}>
              <Alert variant="light" className="mb-0">No supporting documents available.</Alert>
            </Col>
          )}
        </Row>
      </div>
    );
  };

  const renderTestResultsTab = (candidate) => {
    // Include typing test results in counts
    const summary = candidate.testResults?.summary || {};
    const completedTests = Array.isArray(candidate.testResults?.tests) ? candidate.testResults.tests : [];

    const typingTestsCount = typingTestResultsForCandidate.length;
    const typingTestsPassed = typingTestResultsForCandidate.filter(t => t.accuracy >= 70).length; // Consider 70%+ accuracy as passed
    const typingTestsAvgScore = typingTestsCount > 0
      ? typingTestResultsForCandidate.reduce((sum, t) => sum + (t.accuracy || 0), 0) / typingTestsCount
      : 0;

    // Combine MCQ and typing test counts
    const totalTests = Number(summary.totalTests || 0) + typingTestsCount;
    const passedTests = Number(summary.passedTests || 0) + typingTestsPassed;

    // Calculate combined average score
    const mcqTestsCount = completedTests.length;
    const mcqAvgScore = typeof summary.averageScore === 'number'
      ? summary.averageScore
      : Number(summary.averageScore || 0);

    let averageScoreValue = 0;
    if (totalTests > 0) {
      const mcqTotal = mcqAvgScore * mcqTestsCount;
      const typingTotal = typingTestsAvgScore * typingTestsCount;
      averageScoreValue = (mcqTotal + typingTotal) / totalTests;
    }

    const formatTypingDate = (dateString) => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleString();
    };

    const getTypingAccuracyBadge = (accuracy) => {
      if (accuracy >= 90) return 'success';
      if (accuracy >= 70) return 'warning';
      return 'danger';
    };

    const getTypingWPMBadge = (wpm) => {
      if (wpm >= 40) return 'success';
      if (wpm >= 25) return 'warning';
      return 'danger';
    };

    return (
      <div>
        <Row className="mb-4">
          <Col md={4}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-primary">{totalTests}</h3>
                <p className="text-muted mb-0">Total Tests</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-success">{passedTests}</h3>
                <p className="text-muted mb-0">Passed Tests</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-info">{averageScoreValue.toFixed(1)}%</h3>
                <p className="text-muted mb-0">Average Score</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {candidate.testResults.tests.length > 0 ? (
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Test Title</th>
                <th>Score</th>
                <th>Percentage</th>
                <th>Status</th>
                <th>Submitted At</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {candidate.testResults.tests.map((test, index) => {
                const testKey = test.testId || index;
                return (
                  <React.Fragment key={testKey}>
                    <tr>
                      <td>{test.testTitle}</td>
                      <td>{test.score}/{test.totalScore}</td>
                      <td>{test.percentage.toFixed(1)}%</td>
                      <td>{getStatusBadge(test.status)}</td>
                      <td>{test.submittedAt ? new Date(test.submittedAt).toLocaleString() : '--'}</td>
                      <td>
                        <div className="d-flex flex-wrap gap-2 align-items-center">
                          <Button
                            variant={expandedTestResults[testKey] ? 'primary' : 'outline-primary'}
                            size="sm"
                            onClick={() => toggleTestResultDetails(testKey)}
                          >
                            {expandedTestResults[testKey] ? 'Hide Answers' : 'View Answers'}
                          </Button>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => downloadTestResultPdf(test, candidate._id, testKey)}
                            disabled={!test.testId || testResultPdfDownloadingKey === String(testKey)}
                          >
                            {testResultPdfDownloadingKey === String(testKey) ? (
                              <>
                                <Spinner animation="border" size="sm" className="me-1" />
                                Preparing...
                              </>
                            ) : (
                              <>
                                <FaFilePdf className="me-1" />
                                Print PDF
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {expandedTestResults[testKey] && (
                      <tr>
                        <td colSpan={6}>
                          <div className="p-3 bg-light rounded">
                            <div className="d-flex flex-wrap gap-3 mb-3">
                              <div><strong>Score:</strong> {test.score}/{test.totalScore}</div>
                              <div><strong>Percentage:</strong> {test.percentage.toFixed(1)}%</div>
                              {test.duration && <div><strong>Duration:</strong> {test.duration} minutes</div>}
                              {test.startedAt && <div><strong>Started:</strong> {new Date(test.startedAt).toLocaleString()}</div>}
                              {test.submittedAt && <div><strong>Submitted:</strong> {new Date(test.submittedAt).toLocaleString()}</div>}
                            </div>
                            {test.answers && test.answers.length > 0 ? (
                              <Table size="sm" bordered hover responsive>
                                <thead>
                                  <tr>
                                    <th>#</th>
                                    <th>Question</th>
                                    <th>Your Answer</th>
                                    <th>Correct Answer</th>
                                    <th>Result</th>
                                    <th>Marks</th>
                                    <th>Time Taken</th>
                                    <th>Answered At</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {test.answers.map((answer, answerIndex) => (
                                    <tr key={`${testKey}-${answer.questionId || answerIndex}`}>
                                      <td>{answerIndex + 1}</td>
                                      <td>{answer.questionText}</td>
                                      <td>{formatOptionList(answer.selectedOptions)}</td>
                                      <td>{formatOptionList(answer.correctOptions, 'Not available')}</td>
                                      <td>
                                        {answer.isCorrect === true ? (
                                          <Badge bg="success">Correct</Badge>
                                        ) : answer.isCorrect === false ? (
                                          <Badge bg="danger">Incorrect</Badge>
                                        ) : (
                                          <Badge bg="secondary">Pending</Badge>
                                        )}
                                      </td>
                                      <td>{typeof answer.marksAwarded === 'number' ? answer.marksAwarded : '--'}</td>
                                      <td>{formatDurationSeconds(answer.timeTaken)}</td>
                                      <td>{answer.answeredAt ? new Date(answer.answeredAt).toLocaleString() : '--'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </Table>
                            ) : (
                              <Alert variant="info" className="mb-0">No answer details available for this test.</Alert>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <Alert variant="info">No test results available yet.</Alert>
        )}

        {/* Typing Test Results Section */}
        {typingTestResultsForCandidate.length > 0 && (
          <Card className="mt-3">
            <Card.Header style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderBottom: 'none' }}>
              <h6 className="mb-0" style={{ color: 'white', fontWeight: '600' }}>
                <FaKeyboard className="me-2" />
                Typing Test Results
              </h6>
            </Card.Header>
            <Card.Body style={{ padding: '1.5rem', background: '#ffffff' }}>
              <Table striped bordered hover responsive style={{ marginBottom: 0 }}>
                <thead style={{ background: '#f8f9fa' }}>
                  <tr>
                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Test Title</th>
                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>WPM</th>
                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Accuracy</th>
                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Errors</th>
                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Time Taken</th>
                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Duration</th>
                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Submitted At</th>
                    <th style={{ fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {typingTestResultsForCandidate.map((result, index) => (
                    <tr key={result._id || index}>
                      <td>{result.typingTest?.title || 'N/A'}</td>
                      <td>
                        <Badge bg={getTypingWPMBadge(result.wpm)}>
                          {result.wpm || 0} WPM
                        </Badge>
                      </td>
                      <td>
                        <Badge bg={getTypingAccuracyBadge(result.accuracy)}>
                          {result.accuracy || 0}%
                        </Badge>
                      </td>
                      <td>{result.totalErrors || 0}</td>
                      <td>{result.timeTaken || 0}s</td>
                      <td>{result.duration || 0} min</td>
                      <td>{formatTypingDate(result.submittedAt)}</td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => {
                            setSelectedTypingResult(result);
                            setShowTypingResultModal(true);
                          }}
                        >
                          <FaEye className="me-1" />
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        )}

        {candidate.assignments?.tests?.length > 0 && (
          <Card className="mt-3">
            <Card.Header>Test Assignments</Card.Header>
            <Card.Body style={{ padding: 0 }}>
              <Table striped bordered hover responsive className="mb-0">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Invited</th>
                    <th>Completed</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {candidate.assignments.tests.map(assignment => (
                    <tr key={assignment.testId}>
                      <td>{assignment.title}</td>
                      <td><Badge bg="secondary">{assignment.status}</Badge></td>
                      <td>{assignment.invitedAt ? new Date(assignment.invitedAt).toLocaleString() : '--'}</td>
                      <td>{assignment.completedAt ? new Date(assignment.completedAt).toLocaleString() : '--'}</td>
                      <td>{assignment.percentage ? `${assignment.percentage.toFixed(1)}%` : '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        )}
      </div>
    );
  };

  const renderInterviewFeedbackTab = (candidate) => {
    const { summary, feedback } = candidate.interviewFeedback || { summary: {}, feedback: [] };
    const totalInterviews = summary?.totalInterviews || 0;
    const averageRating = typeof summary?.averageRating === 'number' && !Number.isNaN(summary.averageRating)
      ? summary.averageRating
      : 0;
    const feedbackCount = summary?.feedbackCount || 0;

    const formatRating = (value) => {
      if (typeof value === 'number' && !Number.isNaN(value)) {
        return `${value.toFixed(1)}/5`;
      }
      return '—';
    };

    return (
      <div>
        <Row className="mb-4">
          <Col md={4}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-primary">{totalInterviews}</h3>
                <p className="text-muted mb-0">Total Interviews</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-success">{averageRating.toFixed(1)}</h3>
                <p className="text-muted mb-0">Average Rating</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-info">{feedbackCount}</h3>
                <p className="text-muted mb-0">Feedback Count</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {feedback && feedback.length > 0 ? (
          <div>
            {feedback.map((entry, index) => {
              const ratings = entry.ratings || {};
              const hasRatings = Object.values(ratings).some(value => typeof value === 'number' && !Number.isNaN(value));

              return (
                <Card key={index} className="mb-3 shadow-sm">
                  <Card.Header>
                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
                      <div>
                        <h6 className="mb-1">{entry.interviewTitle} - Round {entry.round}</h6>
                        <small className="text-muted">Panel Member: {entry.panelMember?.name || 'Unknown'}</small>
                      </div>
                      <div className="mt-2 mt-sm-0 text-sm-end">
                        <Badge bg="secondary">{entry.type || 'Interview'}</Badge>
                        {entry.submittedAt && (
                          <div className="text-muted small mt-1">
                            Submitted: {new Date(entry.submittedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card.Header>
                  <Card.Body>
                    <Row className="gy-3">
                      {hasRatings && (
                        <Col md={6}>
                          <h6 className="fw-semibold">Ratings</h6>
                          <div className="d-flex flex-column gap-1">
                            <span>Technical Skills: {formatRating(ratings.technicalSkills)}</span>
                            <span>Communication: {formatRating(ratings.communication)}</span>
                            <span>Problem Solving: {formatRating(ratings.problemSolving)}</span>
                            <span className="fw-semibold">Overall: {formatRating(ratings.overallRating)}</span>
                            {typeof entry.ratingAverage === 'number' && !Number.isNaN(entry.ratingAverage) && (
                              <span className="text-muted small">
                                Average of submitted ratings: {entry.ratingAverage.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </Col>
                      )}
                      {entry.comments && (
                        <Col md={hasRatings ? 6 : 12}>
                          <h6 className="fw-semibold">Comments</h6>
                          <p className="mb-0">{entry.comments}</p>
                        </Col>
                      )}
                    </Row>

                    {entry.questionAnswers && entry.questionAnswers.length > 0 && (
                      <div className="mt-4">
                        <h6 className="fw-semibold mb-3">Feedback Form Responses</h6>
                        <Table striped bordered hover responsive size="sm">
                          <thead>
                            <tr>
                              <th>Question</th>
                              <th>Response</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entry.questionAnswers
                              .filter(answer => {
                                // Filter out recommendation-related questions
                                const questionText = (answer.question || '').toLowerCase();
                                return !questionText.includes('recommend');
                              })
                              .map((answer, answerIdx) => (
                                <tr key={answerIdx}>
                                  <td>{answer.question || 'Question'}</td>
                                  <td>
                                    {answer.type === 'rating' && typeof answer.displayAnswer === 'number'
                                      ? `${answer.displayAnswer}/5`
                                      : (answer.displayAnswer ?? answer.answer ?? '—')}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </Table>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              );
            })}
          </div>
        ) : (
          <Alert variant="info">No interview feedback available yet.</Alert>
        )}

        {candidate.assignments?.interviews?.length > 0 && (
          <Card className="mt-3">
            <Card.Header>Interview Assignments</Card.Header>
            <Card.Body style={{ padding: 0 }}>
              <Table striped bordered hover responsive className="mb-0">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Round</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Scheduled</th>
                  </tr>
                </thead>
                <tbody>
                  {candidate.assignments.interviews.map(assignment => (
                    <tr key={assignment.interviewId}>
                      <td>{assignment.title}</td>
                      <td>{assignment.round}</td>
                      <td>{assignment.type}</td>
                      <td><Badge bg="secondary">{assignment.status}</Badge></td>
                      <td>
                        {assignment.scheduledDate
                          ? `${new Date(assignment.scheduledDate).toLocaleDateString()} ${assignment.scheduledTime || ''}`.trim()
                          : '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        )}
      </div>
    );
  };


  return (
    <Container fluid className="super-admin-fluid">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2>Candidate Management</h2>
            <Button
              variant="outline-primary"
              onClick={() => setShowDownloadDialog(true)}
            >
              <FaDownload className="me-2" />
              Download Candidate Details
            </Button>
          </div>
          <p>Manage approved candidates, monitor their progress, and review test results and interview feedback.</p>
        </Col>
      </Row>


      {/* 8 Stage Analytics Cards in 1 Single Line (Count Only) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        width: '100%',
        overflowX: 'auto',
        paddingBottom: '0.25rem'
      }}>
        {['awaiting_test_assignment', 'test_assigned', 'test_in_progress', 'awaiting_interview', 'interview_scheduled', 'awaiting_decision', 'selected', 'rejected'].map(stage => {
          const meta = WORKFLOW_STAGE_META[stage];
          if (!meta) return null;
          const count = stageStats[stage] || 0;
          
          const variantColors = {
            primary: '#0ea5e9',
            secondary: '#64748b',
            info: '#0284c7',
            warning: '#f59e0b',
            success: '#10b981',
            danger: '#ef4444'
          };
          const accentColor = variantColors[meta.variant] || '#0ea5e9';

          return (
            <Card
              key={stage}
              role="button"
              style={{
                cursor: 'pointer',
                background: '#ffffff',
                border: '1px solid #e0f2fe',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(14, 165, 233, 0.05)',
                transition: 'all 0.2s ease',
                padding: '0.875rem 0.6rem',
                minWidth: '110px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}
              onClick={() => openStageDrawer(stage)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(14, 165, 233, 0.12)';
                e.currentTarget.style.borderColor = accentColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(14, 165, 233, 0.05)';
                e.currentTarget.style.borderColor = '#e0f2fe';
              }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: accentColor
              }} />
              <div style={{
                fontSize: '1.6rem',
                fontWeight: '800',
                color: count > 0 ? accentColor : '#94a3b8',
                lineHeight: '1.2',
                marginBottom: '0.25rem'
              }}>
                {count}
              </div>
              <div style={{
                fontSize: '0.72rem',
                fontWeight: '700',
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                lineHeight: '1.25',
                whiteSpace: 'normal',
                wordBreak: 'break-word'
              }}>
                {meta.label.replace('Candidate ', '')}
              </div>
            </Card>
          );
        })}
      </div>

      {/* ── Top Full-Width Search Bar ────────────────────────────── */}
      <Row className="mb-3">
        <Col xs={12}>
          <InputGroup style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)', borderRadius: '10px', overflow: 'hidden' }}>
            <InputGroup.Text style={{ background: '#ffffff', borderRight: 'none', color: '#94a3b8' }}>
              <FaSearch />
            </InputGroup.Text>
            <Form.Control
              placeholder="Search by name, admission no, PIN, or roll number..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  setSearchTerm(searchInput);
                }
              }}
              style={{ borderLeft: 'none', borderRight: 'none', padding: '0.65rem 0.75rem', fontSize: '0.92rem' }}
            />
            <Button
              variant="primary"
              onClick={() => setSearchTerm(searchInput)}
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)',
                border: 'none',
                fontWeight: '600',
                padding: '0 1.25rem'
              }}
            >
              Search
            </Button>
            {(searchTerm || searchInput) && (
              <Button
                variant="outline-secondary"
                onClick={() => {
                  setSearchInput('');
                  setSearchTerm('');
                }}
                style={{ borderLeft: '1px solid #cbd5e1' }}
              >
                Reset
              </Button>
            )}
          </InputGroup>
        </Col>
      </Row>

      {/* ── Top Summary Stat Badges (Total Candidates & Profiles Done) ──── */}
      <Row className="mb-3 g-3">
        <Col md={6}>
          <Card style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  TOTAL CANDIDATES
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0284c7', marginTop: '0.2rem' }}>
                  {filteredCandidates.length.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '500', marginTop: '0.1rem' }}>
                  {statusFilter !== 'all' ? statusFilter.toUpperCase() : 'Regular'}
                </div>
              </div>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaUsers style={{ color: '#0284c7', fontSize: '1.2rem' }} />
              </div>
            </div>
          </Card>
        </Col>

        <Col md={6}>
          <Card style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  PROFILES DONE
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0ea5e9', marginTop: '0.2rem' }}>
                  {completedProfilesCount.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '500', marginTop: '0.1rem' }}>
                  {completionPercentage}% completion
                </div>
              </div>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaCheckCircle style={{ color: '#0ea5e9', fontSize: '1.2rem' }} />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* ── Expandable Filter Box Matching User Screenshot ───────────────── */}
      <Card style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '1.5rem', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <div style={{
          padding: '0.875rem 1.25rem',
          background: '#f8fafc',
          borderBottom: filtersOpen ? '1px solid #e2e8f0' : 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div
            onClick={() => setFiltersOpen(!filtersOpen)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700', fontSize: '0.85rem', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            <FaFilter style={{ color: '#0ea5e9' }} /> FILTERS {filtersOpen ? <FaChevronUp /> : <FaChevronDown />}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={downloadFilteredCandidatesCSV}
              style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '6px' }}
            >
              <FaDownload /> Download Filtered Candidates ({filteredCandidates.length})
            </Button>
            {(campusFilter !== 'all' || categoryFilter !== 'all' || departmentFilter !== 'all' || positionFilter !== 'all' || statusFilter !== 'all' || stageFilter !== 'all' || testStatusFilter !== 'all' || interviewStatusFilter !== 'all' || searchTerm) && (
              <Button
                variant="light"
                size="sm"
                onClick={resetAllFilters}
                style={{ fontWeight: '600', color: '#64748b', borderRadius: '6px' }}
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>

        {filtersOpen && (
          <Card.Body style={{ padding: '1.25rem' }}>
            <Row className="g-3">
              {/* 1. CAMPUS / STREAM */}
              <Col xs={12} sm={6} md={3}>
                <Form.Group>
                  <Form.Label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                    CAMPUS / STREAM
                  </Form.Label>
                  <Form.Select
                    size="sm"
                    value={campusFilter}
                    onChange={(e) => setCampusFilter(e.target.value)}
                    style={{ borderRadius: '6px', fontSize: '0.85rem' }}
                  >
                    <option value="all">All Campuses ({candidates.length})</option>
                    {availableCampuses.map(c => {
                      const count = candidates.filter(cand => (cand.form?.campus || cand.personalDetails?.college || '').toLowerCase().includes(c.toLowerCase())).length;
                      return <option key={c} value={c}>{c} ({count})</option>;
                    })}
                  </Form.Select>
                </Form.Group>
              </Col>

              {/* 2. CATEGORY (Teaching vs Non-Teaching) */}
              <Col xs={12} sm={6} md={3}>
                <Form.Group>
                  <Form.Label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                    RECRUITMENT CATEGORY
                  </Form.Label>
                  <Form.Select
                    size="sm"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    style={{ borderRadius: '6px', fontSize: '0.85rem' }}
                  >
                    <option value="all">All Categories ({candidatesAfterCampus.length})</option>
                    {availableCategories.map(cat => {
                      const count = candidatesAfterCampus.filter(cand => (cand.form?.formCategory || cand.personalDetails?.formCategory || '').toLowerCase().includes(cat.toLowerCase())).length;
                      const label = cat === 'teaching' ? 'Teaching Staff' : cat === 'non_teaching' ? 'Non-Teaching Staff' : cat;
                      return <option key={cat} value={cat}>{label} ({count})</option>;
                    })}
                  </Form.Select>
                </Form.Group>
              </Col>

              {/* 3. DEPARTMENT */}
              <Col xs={12} sm={6} md={3}>
                <Form.Group>
                  <Form.Label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                    DEPARTMENT
                  </Form.Label>
                  <Form.Select
                    size="sm"
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    style={{ borderRadius: '6px', fontSize: '0.85rem' }}
                  >
                    <option value="all">All Departments ({candidatesAfterCategory.length})</option>
                    {availableDepartments.map(d => {
                      const count = candidatesAfterCategory.filter(cand => (cand.form?.department || cand.personalDetails?.department || '').toLowerCase().includes(d.toLowerCase())).length;
                      return <option key={d} value={d}>{d} ({count})</option>;
                    })}
                  </Form.Select>
                </Form.Group>
              </Col>

              {/* 4. POSITION */}
              <Col xs={12} sm={6} md={3}>
                <Form.Group>
                  <Form.Label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                    POSITION / DESIGNATION
                  </Form.Label>
                  <Form.Select
                    size="sm"
                    value={positionFilter}
                    onChange={(e) => setPositionFilter(e.target.value)}
                    style={{ borderRadius: '6px', fontSize: '0.85rem' }}
                  >
                    <option value="all">All Positions ({candidatesAfterDept.length})</option>
                    {availablePositions.map(p => {
                      const count = candidatesAfterDept.filter(cand => (cand.form?.position || '').toLowerCase().includes(p.toLowerCase())).length;
                      return <option key={p} value={p}>{p} ({count})</option>;
                    })}
                  </Form.Select>
                </Form.Group>
              </Col>

              {/* 5. CANDIDATE STATUS */}
              <Col xs={12} sm={6} md={3}>
                <Form.Group>
                  <Form.Label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                    CANDIDATE STATUS
                  </Form.Label>
                  <Form.Select
                    size="sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ borderRadius: '6px', fontSize: '0.85rem' }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending Review</option>
                    <option value="approved">Approved</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="selected">Selected / Finalized</option>
                    <option value="rejected">Rejected</option>
                    <option value="on_hold">On Hold</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              {/* 6. WORKFLOW STAGE */}
              <Col xs={12} sm={6} md={3}>
                <Form.Group>
                  <Form.Label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                    WORKFLOW STAGE
                  </Form.Label>
                  <Form.Select
                    size="sm"
                    value={stageFilter}
                    onChange={(e) => setStageFilter(e.target.value)}
                    style={{ borderRadius: '6px', fontSize: '0.85rem' }}
                  >
                    <option value="all">All Workflow Stages</option>
                    {Object.entries(WORKFLOW_STAGE_META).map(([stageKey, meta]) => (
                      <option key={stageKey} value={stageKey}>{meta.label}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              {/* 7. TEST ASSESSMENT STATUS */}
              <Col xs={12} sm={6} md={3}>
                <Form.Group>
                  <Form.Label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                    TEST ASSESSMENT
                  </Form.Label>
                  <Form.Select
                    size="sm"
                    value={testStatusFilter}
                    onChange={(e) => setTestStatusFilter(e.target.value)}
                    style={{ borderRadius: '6px', fontSize: '0.85rem' }}
                  >
                    <option value="all">All Test Statuses</option>
                    <option value="passed">Test Passed</option>
                    <option value="failed">Test Failed</option>
                    <option value="pending">Test Pending / In Progress</option>
                    <option value="assigned">Test Assigned</option>
                    <option value="none">No Test Assigned</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              {/* 8. INTERVIEW STATUS */}
              <Col xs={12} sm={6} md={3}>
                <Form.Group>
                  <Form.Label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                    INTERVIEW STATUS
                  </Form.Label>
                  <Form.Select
                    size="sm"
                    value={interviewStatusFilter}
                    onChange={(e) => setInterviewStatusFilter(e.target.value)}
                    style={{ borderRadius: '6px', fontSize: '0.85rem' }}
                  >
                    <option value="all">All Interview Statuses</option>
                    <option value="scheduled">Interview Scheduled</option>
                    <option value="completed">Interview Completed</option>
                    <option value="none">No Interview Scheduled</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        )}
      </Card>

      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5>Candidate Pipeline</h5>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <SkeletonLoader loading={true} variant="table" rows={8} columns="0.5fr 1.5fr 1.5fr 1fr 1fr 1fr 1.2fr" />
              ) : filteredCandidates.length === 0 ? (
                <Alert variant="info">No candidates match the current filters.</Alert>
              ) : (
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>Photo</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Position</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>Workflow</th>
                      <th>Tests</th>
                      <th>Interviews</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCandidates.map((candidate) => (
                      <tr key={candidate._id}>
                        <td className="text-center">
                          {candidate.passportPhotoUrl ? (
                            <Image
                              src={candidate.passportPhotoUrl}
                              alt={candidate.user?.name || 'Candidate'}
                              roundedCircle
                              style={{
                                width: '40px',
                                height: '40px',
                                objectFit: 'cover',
                                border: '2px solid #e2e8f0',
                                display: 'block',
                                margin: '0 auto'
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                const placeholder = e.target.nextElementSibling;
                                if (placeholder) {
                                  placeholder.style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: '#e2e8f0',
                              display: candidate.passportPhotoUrl ? 'none' : 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              margin: '0 auto',
                              border: '2px solid #cbd5e1'
                            }}
                          >
                            <FaUser style={{ color: '#64748b', fontSize: '18px' }} />
                          </div>
                        </td>
                        <td>{candidate.user?.name || 'N/A'}</td>
                        <td>{candidate.user?.email || 'N/A'}</td>
                        <td>{candidate.form?.position || 'N/A'}</td>
                        <td>{candidate.form?.department || 'N/A'}</td>
                        <td>
                          {candidate.finalDecision?.decision === 'selected'
                            ? <Badge bg="success">finalized</Badge>
                            : getStatusBadge(candidate.status)}
                        </td>
                        <td>
                          <div className="mb-1">
                            {getWorkflowBadge(candidate.workflow)}
                          </div>
                          <ProgressBar
                            now={getStageProgressPercentage(candidate.workflow?.stage)}
                            variant={getProgressVariant(candidate.workflow?.stage)}
                            style={{ height: '6px' }}
                          />
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{candidate.workflow?.tests?.assigned || 0} assigned</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {candidate.workflow?.tests?.completed || 0} completed · {candidate.workflow?.tests?.passed || 0} passed
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{candidate.workflow?.interviews?.scheduled || 0} scheduled</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {candidate.workflow?.interviews?.completed || 0} completed
                          </div>
                        </td>
                        <td>
                          <Button
                            variant="primary"
                            size="sm"
                            className="me-2"
                            onClick={() => fetchCandidateProfile(candidate._id)}
                            disabled={profileLoading}
                          >
                            {profileLoading ? <Spinner as="span" animation="border" size="sm" /> : 'View Profile'}
                          </Button>
                          {canWrite && (
                            <>
                              <Button
                                variant="success"
                                size="sm"
                                className="me-2"
                                disabled={candidate.status === 'selected' || candidate.finalDecision?.decision === 'selected'}
                                onClick={() => openDecisionModal(candidate, 'selected')}
                              >
                                Finalize
                              </Button>
                              <Button
                                variant="outline-warning"
                                size="sm"
                                className="me-2"
                                disabled={
                                  candidate.status === 'on_hold' ||
                                  candidate.finalDecision?.decision === 'on_hold' ||
                                  candidate.status === 'selected' ||
                                  candidate.finalDecision?.decision === 'selected'
                                }
                                onClick={() => openDecisionModal(candidate, 'on_hold')}
                              >
                                Put On Hold
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                disabled={
                                  candidate.status === 'rejected' ||
                                  candidate.finalDecision?.decision === 'rejected' ||
                                  candidate.status === 'selected' ||
                                  candidate.finalDecision?.decision === 'selected'
                                }
                                onClick={() => openDecisionModal(candidate, 'rejected')}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
              {totalPages > 1 && (
                <div className="d-flex justify-content-end align-items-center mt-3">
                  <Pagination size="sm" className="mb-0">
                    <Pagination.Prev
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    />
                    {Array.from({ length: totalPages }).map((_, index) => (
                      <Pagination.Item
                        key={index + 1}
                        active={currentPage === index + 1}
                        onClick={() => setCurrentPage(index + 1)}
                      >
                        {index + 1}
                      </Pagination.Item>
                    ))}
                    <Pagination.Next
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    />
                  </Pagination>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Offcanvas show={stageDrawerOpen} onHide={closeStageDrawer} placement="end">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>
            {stageDrawerStage ? WORKFLOW_STAGE_META[stageDrawerStage]?.label || 'Pipeline Stage' : 'Pipeline Stage'}
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {stageDrawerStage ? (
            <>
              <p className="text-muted" style={{ marginBottom: '1rem' }}>
                {stageGroups[stageDrawerStage]?.length || 0} candidate(s) currently tracked in this stage.
              </p>
              {stageGroups[stageDrawerStage] && stageGroups[stageDrawerStage].length > 0 ? (
                stageGroups[stageDrawerStage].map(candidate => (
                  <Card className="mb-3 shadow-sm" key={candidate._id}>
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h5 className="mb-1">{candidate.user?.name}</h5>
                          <div className="text-muted" style={{ fontSize: '0.9rem' }}>{candidate.user?.email}</div>
                        </div>
                        <Badge bg={WORKFLOW_STAGE_META[candidate.workflow?.stage]?.variant || 'secondary'}>
                          {WORKFLOW_STAGE_META[candidate.workflow?.stage]?.label || 'In Pipeline'}
                        </Badge>
                      </div>

                      <div className="d-flex flex-wrap gap-3 mt-3" style={{ fontSize: '0.85rem', color: '#475569' }}>
                        <span><strong>Tests:</strong> {candidate.workflow?.tests?.completed || 0} / {candidate.workflow?.tests?.assigned || 0}</span>
                        <span><strong>Interviews:</strong> {candidate.workflow?.interviews?.completed || 0} / {candidate.workflow?.interviews?.scheduled || 0}</span>
                        <span><strong>Status:</strong> {candidate.finalDecision?.decision === 'selected' ? 'finalized' : candidate.status}</span>
                      </div>

                      <div className="d-flex gap-2 mt-3">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => {
                            fetchCandidateProfile(candidate._id);
                            closeStageDrawer();
                          }}
                        >
                          View Profile
                        </Button>
                        {canWrite && (
                          <>
                            <Button
                              variant="success"
                              size="sm"
                              disabled={candidate.status === 'selected' || candidate.finalDecision?.decision === 'selected'}
                              onClick={() => {
                                openDecisionModal(candidate, 'selected');
                                closeStageDrawer();
                              }}
                            >
                              Finalize
                            </Button>
                            <Button
                              variant="outline-warning"
                              size="sm"
                              disabled={
                                candidate.status === 'on_hold' ||
                                candidate.finalDecision?.decision === 'on_hold' ||
                                candidate.status === 'selected' ||
                                candidate.finalDecision?.decision === 'selected'
                              }
                              onClick={() => {
                                openDecisionModal(candidate, 'on_hold');
                                closeStageDrawer();
                              }}
                            >
                              Put On Hold
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              disabled={
                                candidate.status === 'rejected' ||
                                candidate.finalDecision?.decision === 'rejected' ||
                                candidate.status === 'selected' ||
                                candidate.finalDecision?.decision === 'selected'
                              }
                              onClick={() => {
                                openDecisionModal(candidate, 'rejected');
                                closeStageDrawer();
                              }}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                ))
              ) : (
                <Alert variant="light">No candidates found in this stage yet.</Alert>
              )}
            </>
          ) : (
            <Alert variant="light">Select a stage to view candidate details.</Alert>
          )}
        </Offcanvas.Body>
      </Offcanvas>

      {/* Candidate Profile Modal */}
      <Modal
        show={showProfileModal}
        onHide={closeProfileModal}
        size="xl"
        centered
        style={{ zIndex: 1050 }}
      >
        <Modal.Header
          closeButton
          style={{
            backgroundColor: '#f8f9fa',
            borderBottom: '2px solid #dee2e6',
            padding: '1.25rem 1.5rem'
          }}
        >
          <Modal.Title style={{ color: '#212529', fontWeight: '700', fontSize: '1.5rem' }}>
            Candidate Profile - {selectedCandidate?.personalDetails?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body
          style={{
            maxHeight: '70vh',
            overflowY: 'auto',
            backgroundColor: '#f8fafc',
            padding: '1.5rem'
          }}
        >
          {selectedCandidate && (
            <Tabs
              defaultActiveKey="personal"
              className="mb-3"
              style={{ borderBottom: '2px solid #dee2e6' }}
            >
              <Tab
                eventKey="personal"
                title="Personal & Form Details"
                style={{ paddingTop: '1rem' }}
              >
                {renderPersonalDetailsTab(selectedCandidate)}
              </Tab>
              <Tab eventKey="tests" title="Test Results">
                {renderTestResultsTab(selectedCandidate)}
              </Tab>
              <Tab eventKey="interviews" title="Interview Feedback">
                {renderInterviewFeedbackTab(selectedCandidate)}
              </Tab>
            </Tabs>
          )}
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#f8f9fa', borderTop: '2px solid #dee2e6' }}>
          {selectedCandidate && (
            <Button
              variant="outline-primary"
              className="me-auto"
              onClick={() => downloadApplicationPdf(selectedCandidate)}
              disabled={applicationPdfDownloading}
            >
              {applicationPdfDownloading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Preparing PDF...
                </>
              ) : (
                <>
                  <FaDownload className="me-1" />
                  Download PDF
                </>
              )}
            </Button>
          )}
          {selectedCandidate && canWrite && (
            <>
              <Button
                variant="success"
                onClick={() => {
                  openDecisionModal(selectedCandidate, 'selected');
                  closeProfileModal();
                }}
                disabled={
                  selectedCandidate.status === 'selected' ||
                  selectedCandidate.finalDecision?.decision === 'selected'
                }
              >
                Finalize
              </Button>
              <Button
                variant="outline-warning"
                onClick={() => {
                  openDecisionModal(selectedCandidate, 'on_hold');
                  closeProfileModal();
                }}
                disabled={
                  selectedCandidate.status === 'on_hold' ||
                  selectedCandidate.finalDecision?.decision === 'on_hold' ||
                  selectedCandidate.status === 'selected' ||
                  selectedCandidate.finalDecision?.decision === 'selected'
                }
              >
                Put On Hold
              </Button>
              <Button
                variant="outline-danger"
                onClick={() => {
                  openDecisionModal(selectedCandidate, 'rejected');
                  closeProfileModal();
                }}
                disabled={
                  selectedCandidate.status === 'rejected' ||
                  selectedCandidate.finalDecision?.decision === 'rejected' ||
                  selectedCandidate.status === 'selected' ||
                  selectedCandidate.finalDecision?.decision === 'selected'
                }
              >
                Reject
              </Button>
            </>
          )}
          <Button
            variant="secondary"
            onClick={closeProfileModal}
            style={{ borderRadius: '6px', padding: '0.5rem 1.5rem' }}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={decisionModalOpen} onHide={closeDecisionModal} centered size={decisionType === 'selected' ? 'lg' : undefined}>
        <Modal.Header closeButton>
          <Modal.Title>
            {decisionType === 'selected'
              ? 'Finalize Candidate'
              : decisionType === 'rejected'
                ? 'Reject Candidate'
                : 'Put Candidate On Hold'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Confirm you want to{' '}
            {decisionType === 'selected'
              ? 'finalize'
              : decisionType === 'rejected'
                ? 'reject'
                : 'put on hold'}{' '}
            <strong>{decisionCandidate?.user?.name}</strong> for the role of{' '}
            <strong>{decisionCandidate?.form?.position}</strong>.
          </p>

          {decisionType === 'selected' ? (
            <>
              <Form.Group className="mt-3">
                <Form.Label>Bond *</Form.Label>
                <Form.Control
                  type="text"
                  value={finalizationData.bond}
                  onChange={(e) => setFinalizationData(prev => ({ ...prev, bond: e.target.value }))}
                  placeholder="Enter bond details"
                  required
                />
              </Form.Group>
              <Form.Group className="mt-3">
                <Form.Label>Conditions *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={finalizationData.conditions}
                  onChange={(e) => setFinalizationData(prev => ({ ...prev, conditions: e.target.value }))}
                  placeholder="Enter conditions"
                  required
                />
              </Form.Group>
              <Form.Group className="mt-3">
                <Form.Label>Salary *</Form.Label>
                <Form.Control
                  type="text"
                  value={finalizationData.salary}
                  onChange={(e) => setFinalizationData(prev => ({ ...prev, salary: e.target.value }))}
                  placeholder="Enter salary"
                  required
                />
              </Form.Group>
              <Form.Group className="mt-3">
                <Form.Label>Designation *</Form.Label>
                <Form.Control
                  type="text"
                  value={finalizationData.designation}
                  onChange={(e) => setFinalizationData(prev => ({ ...prev, designation: e.target.value }))}
                  placeholder="Enter designation"
                  required
                />
              </Form.Group>
              <Form.Group className="mt-3">
                <Form.Label>Notes *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder="Add notes about finalization..."
                  required
                />
              </Form.Group>
            </>
          ) : (
            <Form.Group className="mt-3">
              <Form.Label>Notes *</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder="Note is mandatory when promoting candidate to next step..."
                required
              />
            </Form.Group>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeDecisionModal} disabled={decisionLoading}>
            Cancel
          </Button>
          <Button
            variant={
              decisionType === 'selected'
                ? 'success'
                : decisionType === 'rejected'
                  ? 'danger'
                  : 'warning'
            }
            onClick={handleDecisionSubmit}
            disabled={decisionLoading}
          >
            {decisionLoading ? <Spinner as="span" animation="border" size="sm" /> : 'Confirm'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Typing Test Result Details Modal */}
      <Modal
        show={showTypingResultModal}
        onHide={() => {
          setShowTypingResultModal(false);
          setSelectedTypingResult(null);
        }}
        size="lg"
        centered
        scrollable
        dialogClassName="typing-test-result-modal"
      >
        <style>{`
          .typing-test-result-modal .modal-dialog {
            max-width: 90vw !important;
            width: 90vw !important;
          }
          @media (min-width: 992px) {
            .typing-test-result-modal .modal-dialog {
              max-width: 800px !important;
              width: 800px !important;
            }
          }
          @media (max-width: 768px) {
            .typing-test-result-modal .modal-dialog {
              max-width: 95vw !important;
              width: 95vw !important;
              margin: 0.5rem auto;
            }
          }
        `}</style>
        <Modal.Header
          closeButton
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderBottom: 'none'
          }}
        >
          <Modal.Title style={{ color: 'white', fontWeight: '600' }}>
            <FaKeyboard className="me-2" />
            Typing Test Result Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '1.5rem', background: '#f8f9fa', maxHeight: '85vh', overflowY: 'auto' }}>
          {selectedTypingResult ? (
            <div>
              <Row className="mb-3 g-3">
                <Col md={6}>
                  <Card className="h-100 border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)' }}>
                    <Card.Body style={{ padding: '1.25rem' }}>
                      <h6 className="text-muted mb-3 text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px', fontWeight: '600' }}>
                        Candidate Information
                      </h6>
                      <div style={{ lineHeight: '1.8' }}>
                        <p className="mb-2">
                          <strong style={{ color: '#495057', minWidth: '140px', display: 'inline-block' }}>Name:</strong>
                          <span style={{ color: '#212529' }}> {selectedCandidate?.personalDetails?.name || selectedCandidate?.user?.name || 'N/A'}</span>
                        </p>
                        <p className="mb-2">
                          <strong style={{ color: '#495057', minWidth: '140px', display: 'inline-block' }}>Email:</strong>
                          <span style={{ color: '#212529' }}> {selectedCandidate?.personalDetails?.email || selectedCandidate?.user?.email || 'N/A'}</span>
                        </p>
                        <p className="mb-0">
                          <strong style={{ color: '#495057', minWidth: '140px', display: 'inline-block' }}>Candidate Number:</strong>
                          <span style={{ color: '#212529' }}> {selectedCandidate?.candidateNumber || 'N/A'}</span>
                        </p>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="h-100 border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #f093fb15 0%, #f5576c15 100%)' }}>
                    <Card.Body style={{ padding: '1.25rem' }}>
                      <h6 className="text-muted mb-3 text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px', fontWeight: '600' }}>
                        Test Information
                      </h6>
                      <div style={{ lineHeight: '1.8' }}>
                        <p className="mb-2">
                          <strong style={{ color: '#495057', minWidth: '140px', display: 'inline-block' }}>Test Title:</strong>
                          <span style={{ color: '#212529' }}> {selectedTypingResult.typingTest?.title || 'N/A'}</span>
                        </p>
                        <p className="mb-2">
                          <strong style={{ color: '#495057', minWidth: '140px', display: 'inline-block' }}>Duration:</strong>
                          <span style={{ color: '#212529' }}> {selectedTypingResult.duration || 0} minute(s)</span>
                        </p>
                        <p className="mb-2">
                          <strong style={{ color: '#495057', minWidth: '140px', display: 'inline-block' }}>Started At:</strong>
                          <span style={{ color: '#212529' }}> {selectedTypingResult.startedAt ? new Date(selectedTypingResult.startedAt).toLocaleString() : 'N/A'}</span>
                        </p>
                        <p className="mb-0">
                          <strong style={{ color: '#495057', minWidth: '140px', display: 'inline-block' }}>Submitted At:</strong>
                          <span style={{ color: '#212529' }}> {selectedTypingResult.submittedAt ? new Date(selectedTypingResult.submittedAt).toLocaleString() : 'N/A'}</span>
                        </p>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
              <Row>
                <Col>
                  <Card className="border-0 shadow-sm">
                    <Card.Header style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderBottom: 'none' }}>
                      <h5 className="mb-0" style={{ color: 'white', fontWeight: '600' }}>
                        Performance Metrics
                      </h5>
                    </Card.Header>
                    <Card.Body style={{ padding: '1.5rem', background: '#ffffff' }}>
                      <Row>
                        <Col md={3} className="text-center mb-3">
                          <h4 className="text-primary">{selectedTypingResult.wpm || 0}</h4>
                          <p className="text-muted mb-0">Words Per Minute</p>
                        </Col>
                        <Col md={3} className="text-center mb-3">
                          <h4 className="text-success">{selectedTypingResult.accuracy || 0}%</h4>
                          <p className="text-muted mb-0">Accuracy</p>
                        </Col>
                        <Col md={3} className="text-center mb-3">
                          <h4 className="text-danger">{selectedTypingResult.totalErrors || 0}</h4>
                          <p className="text-muted mb-0">Total Errors</p>
                        </Col>
                        <Col md={3} className="text-center mb-3">
                          <h4 className="text-info">{selectedTypingResult.timeTaken || 0}s</h4>
                          <p className="text-muted mb-0">Time Taken</p>
                        </Col>
                      </Row>
                      <hr />
                      <Row>
                        <Col md={6}>
                          <p><strong>Total Characters:</strong> {selectedTypingResult.totalCharacters || 0}</p>
                          <p><strong>Correct Characters:</strong> {selectedTypingResult.correctCharacters || 0}</p>
                        </Col>
                        <Col md={6}>
                          <p><strong>Backspace Count:</strong> {selectedTypingResult.backspaceCount || 0}</p>
                          <p><strong>Status:</strong>
                            <Badge bg="success" className="ms-2">
                              {selectedTypingResult.status || 'completed'}
                            </Badge>
                          </p>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </div>
          ) : (
            <Alert variant="warning">No typing test result details available.</Alert>
          )}
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '1px solid #dee2e6', background: '#ffffff' }}>
          <Button
            variant="secondary"
            onClick={() => {
              setShowTypingResultModal(false);
              setSelectedTypingResult(null);
            }}
            style={{ borderRadius: '8px', fontWeight: '500' }}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Full Pop-up Modal for Candidate Search & Download ─────────────────── */}
      <Modal
        show={showDownloadDialog}
        onHide={() => setShowDownloadDialog(false)}
        size="xl"
        centered
        scrollable
        dialogClassName="download-candidate-full-modal"
      >
        <style>{`
          .download-candidate-full-modal .modal-dialog {
            max-width: 92vw !important;
            width: 92vw !important;
            margin: 1.5rem auto;
          }
          @media (max-width: 768px) {
            .download-candidate-full-modal .modal-dialog {
              max-width: 98vw !important;
              width: 98vw !important;
              margin: 0.5rem auto;
            }
          }
        `}</style>
        <Modal.Header
          closeButton
          style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)',
            color: 'white',
            borderBottom: 'none',
            padding: '1.25rem 1.5rem'
          }}
        >
          <Modal.Title style={{ color: 'white', fontWeight: '700', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FaDownload /> Download Candidate Details & Export Filtered Records
          </Modal.Title>
        </Modal.Header>

        <Modal.Body style={{ padding: '1.5rem', background: '#f8fafc', maxHeight: '80vh', overflowY: 'auto' }}>
          {/* Top Search Input inside Modal */}
          <Row className="mb-3">
            <Col xs={12}>
              <InputGroup style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)', borderRadius: '10px', overflow: 'hidden' }}>
                <InputGroup.Text style={{ background: '#ffffff', borderRight: 'none', color: '#94a3b8' }}>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search by name, admission no, PIN, or roll number..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      setSearchTerm(searchInput);
                    }
                  }}
                  style={{ borderLeft: 'none', borderRight: 'none', padding: '0.65rem 0.75rem', fontSize: '0.92rem' }}
                />
                <Button
                  variant="primary"
                  onClick={() => setSearchTerm(searchInput)}
                  style={{
                    background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)',
                    border: 'none',
                    fontWeight: '600',
                    padding: '0 1.25rem'
                  }}
                >
                  Search
                </Button>
                {(searchTerm || searchInput) && (
                  <Button
                    variant="outline-secondary"
                    onClick={() => {
                      setSearchInput('');
                      setSearchTerm('');
                    }}
                    style={{ borderLeft: '1px solid #cbd5e1' }}
                  >
                    Reset
                  </Button>
                )}
              </InputGroup>
            </Col>
          </Row>

          {/* Full Grid Filters Panel inside Modal */}
          <Card style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div style={{ padding: '0.875rem 1.25rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FaFilter style={{ color: '#0ea5e9' }} /> Filter Options
              </div>
              <Button variant="light" size="sm" onClick={resetAllFilters} style={{ fontWeight: '600', color: '#64748b' }}>
                Reset All Filters
              </Button>
            </div>
            <Card.Body style={{ padding: '1.25rem' }}>
              <Row className="g-3">
                {/* 1. CAMPUS / STREAM */}
                <Col xs={12} sm={6} md={3}>
                  <Form.Group>
                    <Form.Label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>CAMPUS / STREAM</Form.Label>
                    <Form.Select size="sm" value={campusFilter} onChange={(e) => setCampusFilter(e.target.value)}>
                      <option value="all">All Campuses ({candidates.length})</option>
                      {availableCampuses.map(c => {
                        const count = candidates.filter(cand => (cand.form?.campus || cand.personalDetails?.college || '').toLowerCase().includes(c.toLowerCase())).length;
                        return <option key={c} value={c}>{c} ({count})</option>;
                      })}
                    </Form.Select>
                  </Form.Group>
                </Col>

                {/* 2. CATEGORY (Teaching vs Non-Teaching) */}
                <Col xs={12} sm={6} md={3}>
                  <Form.Group>
                    <Form.Label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>CATEGORY</Form.Label>
                    <Form.Select size="sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                      <option value="all">All Categories ({candidatesAfterCampus.length})</option>
                      {availableCategories.map(cat => {
                        const count = candidatesAfterCampus.filter(cand => (cand.form?.formCategory || cand.personalDetails?.formCategory || '').toLowerCase().includes(cat.toLowerCase())).length;
                        const label = cat === 'teaching' ? 'Teaching Staff' : cat === 'non_teaching' ? 'Non-Teaching Staff' : cat;
                        return <option key={cat} value={cat}>{label} ({count})</option>;
                      })}
                    </Form.Select>
                  </Form.Group>
                </Col>

                {/* 3. DEPARTMENT */}
                <Col xs={12} sm={6} md={3}>
                  <Form.Group>
                    <Form.Label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>DEPARTMENT</Form.Label>
                    <Form.Select size="sm" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
                      <option value="all">All Departments ({candidatesAfterCategory.length})</option>
                      {availableDepartments.map(d => {
                        const count = candidatesAfterCategory.filter(cand => (cand.form?.department || cand.personalDetails?.department || '').toLowerCase().includes(d.toLowerCase())).length;
                        return <option key={d} value={d}>{d} ({count})</option>;
                      })}
                    </Form.Select>
                  </Form.Group>
                </Col>

                {/* 4. POSITION */}
                <Col xs={12} sm={6} md={3}>
                  <Form.Group>
                    <Form.Label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>POSITION</Form.Label>
                    <Form.Select size="sm" value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)}>
                      <option value="all">All Positions ({candidatesAfterDept.length})</option>
                      {availablePositions.map(p => {
                        const count = candidatesAfterDept.filter(cand => (cand.form?.position || '').toLowerCase().includes(p.toLowerCase())).length;
                        return <option key={p} value={p}>{p} ({count})</option>;
                      })}
                    </Form.Select>
                  </Form.Group>
                </Col>

                {/* 5. CANDIDATE STATUS */}
                <Col xs={12} sm={6} md={3}>
                  <Form.Group>
                    <Form.Label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>STATUS</Form.Label>
                    <Form.Select size="sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                      <option value="all">All Statuses</option>
                      <option value="pending">Pending Review</option>
                      <option value="approved">Approved</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="selected">Selected / Finalized</option>
                      <option value="rejected">Rejected</option>
                      <option value="on_hold">On Hold</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                {/* 6. WORKFLOW STAGE */}
                <Col xs={12} sm={6} md={3}>
                  <Form.Group>
                    <Form.Label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>WORKFLOW STAGE</Form.Label>
                    <Form.Select size="sm" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
                      <option value="all">All Stages</option>
                      {Object.entries(WORKFLOW_STAGE_META).map(([stageKey, meta]) => (
                        <option key={stageKey} value={stageKey}>{meta.label}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>

                {/* 7. TEST ASSESSMENT STATUS */}
                <Col xs={12} sm={6} md={3}>
                  <Form.Group>
                    <Form.Label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>TEST ASSESSMENT</Form.Label>
                    <Form.Select size="sm" value={testStatusFilter} onChange={(e) => setTestStatusFilter(e.target.value)}>
                      <option value="all">All Test Statuses</option>
                      <option value="passed">Test Passed</option>
                      <option value="failed">Test Failed</option>
                      <option value="pending">Test Pending / In Progress</option>
                      <option value="assigned">Test Assigned</option>
                      <option value="none">No Test Assigned</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                {/* 8. INTERVIEW STATUS */}
                <Col xs={12} sm={6} md={3}>
                  <Form.Group>
                    <Form.Label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>INTERVIEW STATUS</Form.Label>
                    <Form.Select size="sm" value={interviewStatusFilter} onChange={(e) => setInterviewStatusFilter(e.target.value)}>
                      <option value="all">All Interview Statuses</option>
                      <option value="scheduled">Interview Scheduled</option>
                      <option value="completed">Interview Completed</option>
                      <option value="none">No Interview Scheduled</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Filtered Candidates Preview Table inside Modal */}
          <Card style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
            <Card.Header style={{ background: '#f8fafc', padding: '0.875rem 1.25rem', fontWeight: '700', fontSize: '0.85rem', color: '#334155' }}>
              Preview Matching Candidates ({filteredCandidates.length})
            </Card.Header>
            <Card.Body style={{ padding: 0 }}>
              {filteredCandidates.length === 0 ? (
                <Alert variant="info" style={{ margin: '1rem' }}>No candidates match the current filter selection.</Alert>
              ) : (
                <Table striped bordered hover responsive style={{ marginBottom: 0, fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Candidate ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Position</th>
                      <th>Campus</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Download PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCandidates.slice(0, 15).map((candidate) => (
                      <tr key={candidate._id}>
                        <td style={{ fontWeight: '700', color: '#0ea5e9' }}>{candidate.candidateNumber || '—'}</td>
                        <td style={{ fontWeight: '600' }}>{candidate.user?.name || candidate.personalDetails?.name || '—'}</td>
                        <td>{candidate.user?.email || '—'}</td>
                        <td>{candidate.form?.position || '—'}</td>
                        <td>{candidate.form?.campus || candidate.personalDetails?.college || '—'}</td>
                        <td>
                          <Badge bg={candidate.status === 'selected' ? 'success' : candidate.status === 'rejected' ? 'danger' : 'info'}>
                            {candidate.status || 'pending'}
                          </Badge>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={async () => {
                              try {
                                const response = await api.get(`/candidates/${candidate._id}/pdf`, { responseType: 'blob' });
                                const url = window.URL.createObjectURL(new Blob([response.data]));
                                const link = document.createElement('a');
                                link.href = url;
                                const candidateName = candidate.user?.name || candidate.personalDetails?.name || 'candidate';
                                link.setAttribute('download', `candidate_${candidateName}_${new Date().toISOString().split('T')[0]}.pdf`);
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                                setToast({ type: 'success', message: `Downloaded PDF for ${candidateName}` });
                              } catch (error) {
                                setToast({ type: 'danger', message: 'Failed to download candidate details.' });
                                console.error('PDF download error:', error);
                              }
                            }}
                            style={{ borderRadius: '6px', fontWeight: '600', padding: '0.25rem 0.65rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          >
                            <FaDownload style={{ fontSize: '0.75rem' }} /> Download PDF
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
              {filteredCandidates.length > 15 && (
                <div style={{ padding: '0.5rem 1rem', background: '#f8fafc', fontSize: '0.78rem', color: '#64748b', textAlign: 'center' }}>
                  Showing first 15 of {filteredCandidates.length} candidates.
                </div>
              )}
            </Card.Body>
          </Card>
        </Modal.Body>

        <Modal.Footer style={{ background: '#ffffff', borderTop: '1px solid #e2e8f0', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Button
            variant="secondary"
            onClick={() => setShowDownloadDialog(false)}
            style={{ fontWeight: '600', padding: '0.45rem 1.5rem', borderRadius: '6px' }}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <ToastNotificationContainer
        toast={toast}
        onClose={() => setToast({ type: '', message: '' })}
      />
    </Container>
  );
};

export default CandidateManagement;

