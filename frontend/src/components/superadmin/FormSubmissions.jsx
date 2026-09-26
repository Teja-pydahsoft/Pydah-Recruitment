import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Badge, Modal, Tabs, Tab, Alert, Spinner, Image, FormCheck, Form, InputGroup, Pagination, Table } from 'react-bootstrap';
import { FaFilePdf, FaFileImage, FaUser, FaCheckCircle, FaTimes, FaSearch, FaDownload, FaClipboardList } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import SkeletonLoader from '../SkeletonLoader';
import ToastNotificationContainer from '../ToastNotificationContainer';
import DataValueRenderer from '../DataValueRenderer';

const PAGE_SIZE = 12;

const FormSubmissions = () => {
  const [allCandidates, setAllCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('teaching');
  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending', 'selected', 'all'
  const [selectedJobRole, setSelectedJobRole] = useState('all');
  const [quickSearch, setQuickSearch] = useState(''); // Applied search
  const [searchInput, setSearchInput] = useState(''); // Input value (not applied until button click)
  const [pendingPage, setPendingPage] = useState(1);
  const [toast, setToast] = useState({ type: '', message: '' });
  const [downloadingPdfId, setDownloadingPdfId] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const response = await api.get('/candidates');
      // Get all candidates with their form details
      const candidatesWithForms = response.data.candidates;
      setAllCandidates(candidatesWithForms);
    } catch (error) {
      setToast({ type: 'danger', message: 'Failed to fetch form submissions' });
      console.error('Candidates fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCandidates = useMemo(() => {
    let filtered = allCandidates.filter(c => {
      if (activeTab === 'teaching') {
        return c.form?.formCategory === 'teaching';
      } else if (activeTab === 'non_teaching') {
        return c.form?.formCategory === 'non_teaching';
      }
      return true;
    });

    if (selectedJobRole !== 'all' && selectedJobRole) {
      filtered = filtered.filter(c => {
        const jobRole = `${c.form?.position || ''} - ${c.form?.department || ''}`.trim();
        return jobRole === selectedJobRole;
      });
    }

    if (quickSearch.trim()) {
      const term = quickSearch.trim().toLowerCase();
      filtered = filtered.filter(candidate => {
        const name = candidate.user?.name?.toLowerCase() || '';
        const email = candidate.user?.email?.toLowerCase() || '';
        const position = candidate.form?.position?.toLowerCase() || '';
        const department = candidate.form?.department?.toLowerCase() || '';
        const candidateId = candidate.candidateNumber?.toLowerCase() || '';
        return (
          name.includes(term) ||
          email.includes(term) ||
          position.includes(term) ||
          department.includes(term) ||
          candidateId.includes(term)
        );
      });
    }

    return filtered;
  }, [allCandidates, activeTab, selectedJobRole, quickSearch]);

  const pendingCandidates = useMemo(() => (
    filteredCandidates.filter(candidate => {
      const status = candidate.status || 'pending';
      return status === 'pending' || status === 'on_hold';
    })
  ), [filteredCandidates]);

  const progressedCandidates = useMemo(() => (
    filteredCandidates.filter(candidate => {
      const status = candidate.status || '';
      return ['approved', 'shortlisted', 'selected'].includes(status);
    })
  ), [filteredCandidates]);

  // Unified candidate list based on status filter
  const activeCandidatesList = useMemo(() => {
    if (statusFilter === 'pending') {
      return pendingCandidates;
    } else if (statusFilter === 'selected') {
      return progressedCandidates;
    }
    return filteredCandidates;
  }, [statusFilter, pendingCandidates, progressedCandidates, filteredCandidates]);

  const totalPages = useMemo(() => {
    return Math.ceil(activeCandidatesList.length / PAGE_SIZE);
  }, [activeCandidatesList.length]);

  const paginatedCandidates = useMemo(() => {
    const startIndex = (pendingPage - 1) * PAGE_SIZE;
    return activeCandidatesList.slice(startIndex, startIndex + PAGE_SIZE);
  }, [activeCandidatesList, pendingPage]);

  // Reset page when filters change
  useEffect(() => {
    setPendingPage(1);
  }, [activeTab, selectedJobRole, quickSearch, statusFilter]);

  // Get unique job roles for the current tab
  const getJobRoles = () => {
    let candidates = allCandidates.filter(c => {
      if (activeTab === 'teaching') {
        return c.form?.formCategory === 'teaching';
      } else if (activeTab === 'non_teaching') {
        return c.form?.formCategory === 'non_teaching';
      }
      return true;
    });

    const roles = new Set();
    candidates.forEach(c => {
      if (c.form?.position && c.form?.department) {
        roles.add(`${c.form.position} - ${c.form.department}`);
      }
    });

    return Array.from(roles).sort();
  };

  const fetchCandidateProfile = async (candidateId) => {
    setProfileLoading(true);
    try {
      const response = await api.get(`/candidates/${candidateId}`);
      setSelectedCandidate(response.data.candidate);
      setShowProfileModal(true);
    } catch (error) {
      setToast({ type: 'danger', message: 'Failed to fetch candidate profile' });
      console.error('Profile fetch error:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const downloadApplicationPdf = async (candidate) => {
    const candidateId = candidate?._id || candidate?.candidate?._id;
    if (!candidateId) {
      setToast({ type: 'danger', message: 'Unable to download PDF for this application.' });
      return;
    }

    setDownloadingPdfId(candidateId);
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
      setDownloadingPdfId(null);
    }
  };

  const handleApprove = async (candidateId) => {
    try {
      await api.put(`/candidates/${candidateId}/status`, { status: 'approved' });
      // Update selected candidate if modal is open
      if (selectedCandidate && (selectedCandidate._id === candidateId || selectedCandidate.candidate?._id === candidateId)) {
        setSelectedCandidate({ ...selectedCandidate, status: 'approved' });
      }
      fetchCandidates();
      setSelectedCandidates(new Set());
      setToast({ type: 'success', message: 'Candidate approved successfully.' });
    } catch (error) {
      setToast({ type: 'danger', message: 'Failed to approve candidate' });
      console.error('Approve error:', error);
    }
  };

  const handleReject = async (candidateId) => {
    try {
      await api.put(`/candidates/${candidateId}/status`, { status: 'rejected' });
      // Update selected candidate if modal is open
      if (selectedCandidate && (selectedCandidate._id === candidateId || selectedCandidate.candidate?._id === candidateId)) {
        setSelectedCandidate({ ...selectedCandidate, status: 'rejected' });
      }
      fetchCandidates();
      setSelectedCandidates(new Set());
      setToast({ type: 'success', message: 'Candidate rejected successfully.' });
    } catch (error) {
      setToast({ type: 'danger', message: 'Failed to reject candidate' });
      console.error('Reject error:', error);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedCandidates.size === 0) return;
    setBulkActionLoading(true);
    try {
      await api.put('/candidates/bulk/status', {
        candidateIds: Array.from(selectedCandidates),
        status: 'approved'
      });
      fetchCandidates();
      setSelectedCandidates(new Set());
      setToast({ type: 'success', message: `${selectedCandidates.size} candidate(s) approved successfully.` });
    } catch (error) {
      setToast({ type: 'danger', message: 'Failed to approve candidates' });
      console.error('Bulk approve error:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedCandidates.size === 0) return;
    setBulkActionLoading(true);
    try {
      await api.put('/candidates/bulk/status', {
        candidateIds: Array.from(selectedCandidates),
        status: 'rejected'
      });
      fetchCandidates();
      setSelectedCandidates(new Set());
      setToast({ type: 'success', message: `${selectedCandidates.size} candidate(s) rejected successfully.` });
    } catch (error) {
      setToast({ type: 'danger', message: 'Failed to reject candidates' });
      console.error('Bulk reject error:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleSelectCandidate = (candidateId) => {
    const newSelected = new Set(selectedCandidates);
    if (newSelected.has(candidateId)) {
      newSelected.delete(candidateId);
    } else {
      newSelected.add(candidateId);
    }
    setSelectedCandidates(newSelected);
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

  const renderPersonalDetailsTab = (candidate) => {
    const applicationData = candidate.personalDetails?.applicationData || {};
    const documents = candidate.personalDetails?.documents || [];
    const passportPhoto = candidate.personalDetails?.passportPhoto;
    const excludedFields = ['name', 'fullName', 'email', 'phone', 'mobileNumber', 'mobile', 'passportPhoto'];
    const resume = documents.find(doc => {
      const name = doc.name?.toLowerCase() || '';
      return name.includes('resume') || name.includes('cv');
    });
    const certificates = documents.filter(doc => (doc.name?.toLowerCase() || '').includes('certificate'));
    const otherDocs = documents.filter(doc => {
      const name = doc.name?.toLowerCase() || '';
      const isResume = resume ? (doc.name === resume.name && doc.url === resume.url) : false;
      return !isResume && !name.includes('certificate');
    });

    const filteredApplicationData = Object.entries(applicationData).filter(([key, value]) => {
      const lowerKey = key.toLowerCase();
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
                <div style={{ fontWeight: 600, fontSize: '1.25rem' }} className="mb-2">
                  {candidate.personalDetails?.name}
                </div>
                <div className="d-flex flex-wrap gap-2 mb-2">
                  <Badge bg="light" text="dark">{candidate.personalDetails?.email}</Badge>
                  {candidate.personalDetails?.phone && (
                    <Badge bg="light" text="dark">📞 {candidate.personalDetails.phone}</Badge>
                  )}
                  {candidate.candidateNumber && (
                    <Badge bg="dark">{candidate.candidateNumber}</Badge>
                  )}
                  {getStatusBadge(candidate.status || 'pending')}
                </div>
                {(candidate.form?.position || candidate.form?.department) && (
                  <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                    {[candidate.form?.position, candidate.form?.department, candidate.form?.campus].filter(Boolean).join(' · ')}
                  </div>
                )}
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
                    rounded
                    style={{ width: '100%', maxHeight: '260px', objectFit: 'cover', border: '2px solid #e2e8f0' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </Card.Body>
              </Card>
            </Col>
          )}
        </Row>

        <h6 className="text-uppercase text-muted mb-2" style={{ letterSpacing: '0.08em', fontSize: '0.75rem' }}>Application Responses</h6>
        <Row className="g-3 mb-4">
          {filteredApplicationData.map(([key, value]) => (
            <Col xs={12} md={6} lg={4} key={key}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body style={{ fontSize: '0.9rem' }}>
                  <div className="text-muted text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.08em' }}>
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
            <Col>
              <Alert variant="light" className="mb-0">No additional application data provided.</Alert>
            </Col>
          )}
        </Row>

        <h6 className="text-uppercase text-muted mb-2" style={{ letterSpacing: '0.08em', fontSize: '0.75rem' }}>Documents</h6>
        <Row className="g-3">
          {resume && (
            <Col xs={12} md={6} lg={4}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body>
                  <h6 className="d-flex align-items-center gap-2 mb-2" style={{ fontSize: '0.95rem' }}>
                    <FaFilePdf /> Resume
                  </h6>
                  <div className="d-flex flex-wrap gap-2">
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
                  <div className="d-flex flex-wrap gap-2">
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
            <Col>
              <Alert variant="light" className="mb-0">No supporting documents were uploaded.</Alert>
            </Col>
          )}
        </Row>
      </div>
    );
  };

  const teachingCount = useMemo(() => allCandidates.filter(c => c.form?.formCategory === 'teaching').length, [allCandidates]);
  const nonTeachingCount = useMemo(() => allCandidates.filter(c => c.form?.formCategory === 'non_teaching').length, [allCandidates]);

  if (loading) {
    return <SkeletonLoader loading={true} variant="card-grid" count={6} />;
  }

  return (
    <Container fluid className="super-admin-fluid">
      <Row className="mb-3 align-items-center">
        <Col xs={12} md={8}>
          <h2 className="mb-1" style={{ fontSize: '1.8rem', fontWeight: 600 }}>Form Submissions</h2>
          <p className="text-muted mb-0" style={{ fontSize: '0.95rem' }}>Review, shortlist, or reject submissions before moving candidates to assessments.</p>
        </Col>
        <Col xs={12} md={4} className="mt-2 mt-md-0 text-md-end">
          <Button
            variant="outline-primary"
            onClick={() => navigate('/super-admin/creation/forms')}
          >
            Create / Upload Submission
          </Button>
        </Col>
      </Row>

      {/* Row 1: Category Tabs, Job Role Filter, Search Bar & Select All */}
      <Row className="mb-3 g-2 align-items-end">
        <Col xs="auto">
          <Button
            size="sm"
            variant={activeTab === 'teaching' ? 'primary' : 'outline-primary'}
            onClick={() => { setActiveTab('teaching'); setSelectedJobRole('all'); }}
          >
            Teaching ({teachingCount})
          </Button>
        </Col>
        <Col xs="auto">
          <Button
            size="sm"
            variant={activeTab === 'non_teaching' ? 'primary' : 'outline-primary'}
            onClick={() => { setActiveTab('non_teaching'); setSelectedJobRole('all'); }}
          >
            Non-Teaching ({nonTeachingCount})
          </Button>
        </Col>
        <Col xs="auto">
          <Button
            size="sm"
            variant={activeTab === 'all' ? 'primary' : 'outline-primary'}
            onClick={() => { setActiveTab('all'); setSelectedJobRole('all'); }}
          >
            All Categories ({allCandidates.length})
          </Button>
        </Col>
        <Col xs={12} md={3} className="mt-2 mt-md-0">
          <Form.Select
            size="sm"
            value={selectedJobRole}
            onChange={(e) => setSelectedJobRole(e.target.value)}
          >
            <option value="all">All Job Roles</option>
            {getJobRoles().map((role, idx) => (
              <option key={idx} value={role}>{role}</option>
            ))}
          </Form.Select>
        </Col>
        <Col xs={12} md={4} className="mt-2 mt-md-0">
          <InputGroup size="sm">
            <Form.Control
              placeholder="Search by name, candidate ID, email, position, or department"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  setQuickSearch(searchInput);
                }
              }}
            />
            <Button
              variant="primary"
              onClick={() => {
                setQuickSearch(searchInput);
              }}
              style={{
                borderRadius: '0 8px 8px 0',
                background: '#0ea5e9',
                border: 'none'
              }}
            >
              <FaSearch />
            </Button>
            {(quickSearch || searchInput) && (
              <Button
                variant="outline-secondary"
                onClick={() => {
                  setSearchInput('');
                  setQuickSearch('');
                }}
                style={{ borderRadius: '8px', marginLeft: '0.5rem' }}
              >
                Reset
              </Button>
            )}
          </InputGroup>
        </Col>
      </Row>

      {/* Row 2: Status View Toggle Buttons (Placed below Category & Search controls) */}
      <Row className="mb-4 g-2 align-items-center">
        <Col xs="auto">
          <span className="fw-semibold me-1" style={{ fontSize: '0.9rem', color: '#0284c7' }}>Status View:</span>
        </Col>
        <Col xs="auto">
          <Button
            size="sm"
            variant={statusFilter === 'pending' ? 'primary' : 'outline-primary'}
            onClick={() => setStatusFilter('pending')}
            style={{ borderRadius: '20px', fontWeight: 600, padding: '0.35rem 1.1rem' }}
          >
            <FaClipboardList className="me-1" />
            Pending Candidates ({pendingCandidates.length})
          </Button>
        </Col>
        <Col xs="auto">
          <Button
            size="sm"
            variant={statusFilter === 'selected' ? 'success' : 'outline-success'}
            onClick={() => setStatusFilter('selected')}
            style={{ borderRadius: '20px', fontWeight: 600, padding: '0.35rem 1.1rem' }}
          >
            <FaCheckCircle className="me-1" />
            Selected Candidates ({progressedCandidates.length})
          </Button>
        </Col>
        <Col xs="auto">
          <Button
            size="sm"
            variant={statusFilter === 'all' ? 'info' : 'outline-info'}
            onClick={() => setStatusFilter('all')}
            style={{ borderRadius: '20px', fontWeight: 600, padding: '0.35rem 1.1rem' }}
          >
            All Candidates ({pendingCandidates.length + progressedCandidates.length})
          </Button>
        </Col>
      </Row>

      {/* Bulk Actions */}
      {selectedCandidates.size > 0 && (
        <Row className="mb-3">
          <Col>
            <Card className="bg-light">
              <Card.Body>
                <div className="d-flex align-items-center justify-content-between">
                  <span>
                    <strong>{selectedCandidates.size}</strong> candidate(s) selected
                  </span>
                  <div>
                    <Button
                      variant="success"
                      size="sm"
                      className="me-2"
                      onClick={handleBulkApprove}
                      disabled={bulkActionLoading}
                    >
                      <FaCheckCircle className="me-1" />
                      Approve Selected
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleBulkReject}
                      disabled={bulkActionLoading}
                    >
                      <FaTimes className="me-1" />
                      Reject Selected
                    </Button>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* SINGLE UNIFIED CANDIDATES TABLE */}
      <Row className="mb-2">
        <Col>
          <h4 className="mb-1" style={{ fontWeight: 600, color: '#0284c7' }}>
            {statusFilter === 'pending' ? 'Pending Submissions' : statusFilter === 'selected' ? 'Selected Candidates' : 'All Application Submissions'}
          </h4>
          <p className="text-muted mb-2" style={{ fontSize: '0.9rem' }}>
            {statusFilter === 'pending'
              ? 'Review, shortlist, or reject submissions before moving candidates to assessments.'
              : statusFilter === 'selected'
              ? 'Approved candidates ready for assessments and interview scheduling.'
              : 'Complete view of candidate applications across all review stages.'}
          </p>
        </Col>
      </Row>

      {activeCandidatesList.length === 0 ? (
        <Row className="mb-4">
          <Col>
            <Alert variant="info">
              No candidates found matching the selected status and category filters.
            </Alert>
          </Col>
        </Row>
      ) : (
        <>
          <Card className="shadow-sm border-0 mb-4">
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }} className="text-center">
                      <FormCheck
                        type="checkbox"
                        checked={
                          paginatedCandidates.length > 0 &&
                          paginatedCandidates.every(c => selectedCandidates.has(c._id))
                        }
                        onChange={() => {
                          const allSelected = paginatedCandidates.every(c => selectedCandidates.has(c._id));
                          if (allSelected) {
                            setSelectedCandidates(new Set());
                          } else {
                            const newSelected = new Set(selectedCandidates);
                            paginatedCandidates.forEach(c => newSelected.add(c._id));
                            setSelectedCandidates(newSelected);
                          }
                        }}
                      />
                    </th>
                    <th>Candidate</th>
                    <th>Position & Department</th>
                    <th>Applied Date</th>
                    <th>Category & ID</th>
                    <th>Status</th>
                    <th className="text-end" style={{ minWidth: '240px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCandidates.map(candidate => {
                    const isPending = candidate.status === 'pending' || candidate.status === 'on_hold' || !candidate.status;
                    return (
                      <tr key={candidate._id}>
                        <td className="text-center">
                          <FormCheck
                            type="checkbox"
                            checked={selectedCandidates.has(candidate._id)}
                            onChange={() => handleSelectCandidate(candidate._id)}
                          />
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            {candidate.passportPhotoUrl ? (
                              <Image
                                src={candidate.passportPhotoUrl}
                                alt={candidate.user?.name}
                                roundedCircle
                                style={{ width: '38px', height: '38px', objectFit: 'cover' }}
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '50%',
                                  background: '#e0f2fe',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <FaUser style={{ color: '#0284c7' }} />
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#0f172a' }}>{candidate.user?.name || 'N/A'}</div>
                              <small className="text-muted" style={{ fontSize: '0.8rem' }}>{candidate.user?.email || 'N/A'}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>{candidate.form?.position || 'N/A'}</div>
                          <small className="text-muted" style={{ fontSize: '0.8rem' }}>{candidate.form?.department || 'N/A'}</small>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: '#475569' }}>
                          {candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td>
                          <div className="d-flex flex-wrap gap-1">
                            <Badge bg={candidate.form?.formCategory === 'teaching' ? 'primary' : 'secondary'}>
                              {candidate.form?.formCategory === 'teaching' ? 'Teaching' : 'Non-Teaching'}
                            </Badge>
                            {candidate.candidateNumber ? (
                              <Badge bg="dark">{candidate.candidateNumber}</Badge>
                            ) : (
                              <Badge bg="light" text="dark">No Candidate ID</Badge>
                            )}
                          </div>
                        </td>
                        <td>
                          {getStatusBadge(candidate.status || 'pending')}
                        </td>
                        <td className="text-end">
                          <div className="d-inline-flex gap-1 flex-wrap justify-content-end">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => fetchCandidateProfile(candidate._id)}
                              disabled={profileLoading}
                            >
                              {profileLoading ? <Spinner as="span" animation="border" size="sm" /> : 'View'}
                            </Button>
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => downloadApplicationPdf(candidate)}
                              disabled={downloadingPdfId === candidate._id}
                            >
                              {downloadingPdfId === candidate._id ? (
                                <Spinner as="span" animation="border" size="sm" />
                              ) : (
                                <>
                                  <FaDownload className="me-1" />
                                  Download
                                </>
                              )}
                            </Button>
                            {isPending ? (
                              <>
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => handleApprove(candidate._id)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleReject(candidate._id)}
                                >
                                  Reject
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => navigate('/super-admin/candidates')}
                              >
                                Next Steps
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          </Card>
          {totalPages > 1 && (
            <Row className="mt-3 mb-4">
              <Col className="d-flex justify-content-center">
                <Pagination size="sm">
                  <Pagination.Prev
                    disabled={pendingPage === 1}
                    onClick={() => setPendingPage(prev => Math.max(prev - 1, 1))}
                  />
                  {Array.from({ length: totalPages }).map((_, index) => (
                    <Pagination.Item
                      key={index + 1}
                      active={pendingPage === index + 1}
                      onClick={() => setPendingPage(index + 1)}
                    >
                      {index + 1}
                    </Pagination.Item>
                  ))}
                  <Pagination.Next
                    disabled={pendingPage === totalPages}
                    onClick={() => setPendingPage(prev => Math.min(prev + 1, totalPages))}
                  />
                </Pagination>
              </Col>
            </Row>
          )}
        </>
      )}

      {/* Candidate Profile Modal */}
      <Modal
        show={showProfileModal}
        onHide={() => setShowProfileModal(false)}
        size="xl"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Candidate Profile - {selectedCandidate?.personalDetails?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto', background: '#f8fafc' }}>
          {selectedCandidate && (
            <Tabs defaultActiveKey="application" className="mb-3">
              <Tab eventKey="application" title="Application Details">
                {renderPersonalDetailsTab(selectedCandidate)}
              </Tab>
            </Tabs>
          )}
        </Modal.Body>
        <Modal.Footer>
          {selectedCandidate && (
            <Button
              variant="outline-primary"
              className="me-auto"
              onClick={() => downloadApplicationPdf(selectedCandidate)}
              disabled={downloadingPdfId === (selectedCandidate?._id || selectedCandidate?.candidate?._id)}
            >
              {downloadingPdfId === (selectedCandidate?._id || selectedCandidate?.candidate?._id) ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Downloading...
                </>
              ) : (
                <>
                  <FaDownload className="me-1" />
                  Download
                </>
              )}
            </Button>
          )}
          {selectedCandidate && (selectedCandidate.status === 'pending' || !selectedCandidate.status) && (
            <>
              <Button
                variant="success"
                onClick={() => {
                  const candidateId = selectedCandidate._id || selectedCandidate.candidate?._id;
                  if (candidateId) {
                    handleApprove(candidateId);
                    setShowProfileModal(false);
                  }
                }}
              >
                <FaCheckCircle className="me-1" />
                Approve
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  const candidateId = selectedCandidate._id || selectedCandidate.candidate?._id;
                  if (candidateId) {
                    handleReject(candidateId);
                    setShowProfileModal(false);
                  }
                }}
              >
                <FaTimes className="me-1" />
                Reject
              </Button>
            </>
          )}
          {selectedCandidate && selectedCandidate.status && selectedCandidate.status !== 'pending' && (
            <Badge bg={selectedCandidate.status === 'approved' ? 'success' : selectedCandidate.status === 'rejected' ? 'danger' : 'secondary'} className="me-2" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
              {selectedCandidate.status === 'approved' ? '✓ Approved' : selectedCandidate.status === 'rejected' ? '✗ Rejected' : selectedCandidate.status}
            </Badge>
          )}
          <Button variant="secondary" onClick={() => setShowProfileModal(false)}>
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

export default FormSubmissions;

