import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  FaFileAlt,
  FaCalendarCheck,
  FaUserPlus,
  FaBullseye,
  FaChartLine,
  FaSync
} from 'react-icons/fa';
import LoadingSpinner from '../LoadingSpinner';
import api from '../../services/api';

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const STAGE_META = {
  application_review: { label: 'Application Review', color: '#6b7280' },
  awaiting_test_assignment: { label: 'Awaiting Test Assignment', color: '#2563eb' },
  test_assigned: { label: 'Test Assigned', color: '#6366f1' },
  test_in_progress: { label: 'Test In Progress', color: '#f59e0b' },
  awaiting_interview: { label: 'Awaiting Interview', color: '#0ea5e9' },
  interview_scheduled: { label: 'Interview Scheduled', color: '#14b8a6' },
  awaiting_decision: { label: 'Awaiting Decision', color: '#f97316' },
  selected: { label: 'Selected', color: '#0f766e' },
  on_hold: { label: 'On Hold', color: '#64748b' },
  rejected: { label: 'Rejected', color: '#dc2626' }
};

// STAGE_ORDER removed - no longer used after dashboard redesign

const STATUS_VARIANTS = {
  selected: 'success',
  approved: 'info',
  shortlisted: 'info',
  pending: 'neutral',
  on_hold: 'warning',
  rejected: 'danger',
  awaiting_decision: 'warning'
};

const CHIP_VARIANTS = {
  success: { text: '#047857', bg: 'rgba(16, 185, 129, 0.18)' },
  info: { text: '#1d4ed8', bg: 'rgba(37, 99, 235, 0.18)' },
  warning: { text: '#b45309', bg: 'rgba(245, 158, 11, 0.2)' },
  danger: { text: '#b91c1c', bg: 'rgba(239, 68, 68, 0.18)' },
  neutral: { text: '#475569', bg: 'rgba(148, 163, 184, 0.2)' }
};

const OverviewContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: clamp(1.5rem, 2.5vw, 2.5rem);
  animation: ${fadeInUp} 0.6s ease-out;
  background: #f8fafc;
`;

const OverviewWrapper = styled.div`
  width: 100%;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(1.5rem, 2.5vw, 2.5rem);
`;

const HeaderRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
  }
`;

const Title = styled.h1`
  font-size: 1.875rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 0.35rem 0;
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 1rem;
  color: #475569;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: flex-start;
`;

const Timestamp = styled.span`
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 500;
`;

const RefreshButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 9999px;
  padding: 0.5rem 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
  box-shadow: 0 8px 16px -6px rgba(37, 99, 235, 0.4);

  &:hover:enabled {
    background: #1d4ed8;
    transform: translateY(-1px);
  }

  &:disabled {
    background: #94a3b8;
    cursor: not-allowed;
    box-shadow: none;
  }
`;

const RefreshIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    animation: none;
  }

  ${({ $spinning }) =>
    $spinning &&
    css`
      svg {
        animation: ${spin} 0.8s linear infinite;
      }
    `}
`;

const StatsGrid = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: clamp(1rem, 2vw, 1.5rem);
`;

const StatsCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.06);
  border: 1px solid #e2e8f0;
  position: relative;
  overflow: hidden;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${({ $variant }) => {
      switch ($variant) {
        case 'primary':
          return 'linear-gradient(90deg, #2563eb, #3b82f6)';
        case 'success':
          return 'linear-gradient(90deg, #10b981, #059669)';
        case 'info':
          return 'linear-gradient(90deg, #06b6d4, #0891b2)';
        case 'warning':
          return 'linear-gradient(90deg, #f59e0b, #d97706)';
        case 'danger':
          return 'linear-gradient(90deg, #ef4444, #dc2626)';
        default:
          return 'linear-gradient(90deg, #6b7280, #4b5563)';
      }
    }};
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 30px -12px rgba(15, 23, 42, 0.2);
  }
`;

const StatsIcon = styled.div`
  font-size: 2rem;
  color: ${({ $variant }) => {
    switch ($variant) {
      case 'primary':
        return '#2563eb';
      case 'success':
        return '#047857';
      case 'info':
        return '#0f766e';
      case 'warning':
        return '#b45309';
      case 'danger':
        return '#b91c1c';
      default:
        return '#475569';
    }
  }};
  margin-bottom: 1rem;
  opacity: 0.85;
`;

const StatsNumber = styled.span`
  display: block;
  font-size: 2.5rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 0.25rem;
`;

const StatsLabel = styled.span`
  font-size: 0.9rem;
  color: #475569;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
`;

const StatsMeta = styled.span`
  display: block;
  margin-top: 0.25rem;
  font-size: 0.85rem;
  color: #94a3b8;
  font-weight: 500;
`;

const ErrorBanner = styled.div`
  background: #fee2e2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  padding: 1rem 1.25rem;
  border-radius: 10px;
  font-weight: 500;
  margin-bottom: 1.5rem;
`;

const InsightGrid = styled.div`
  display: grid;
  width: 100%;
  gap: clamp(1rem, 2vw, 1.75rem);
  grid-template-columns: 1fr;

  @media (min-width: 1024px) {
    grid-template-columns: minmax(0, 1.8fr) minmax(0, 1.2fr);
  }

  @media (min-width: 1360px) {
    grid-template-columns: minmax(0, 2fr) minmax(0, 1.3fr);
  }
`;

const SectionCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.75rem;
  box-shadow: 0 10px 25px -18px rgba(15, 23, 42, 0.5);
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-height: 0;
`;

const SectionTitle = styled.h2`
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
`;

const SectionSubtitle = styled.p`
  margin: -0.5rem 0 0;
  font-size: 0.9rem;
  color: #64748b;
`;

const ProgressTrack = styled.div`
  height: 8px;
  background: #e2e8f0;
  border-radius: 9999px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  width: ${({ $value }) => Math.min(100, Math.max(0, $value)).toFixed(1)}%;
  background: ${({ $color }) => $color || '#2563eb'};
  border-radius: inherit;
  transition: width 0.4s ease;
`;

const VacancySummary = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const VacancyNumber = styled.span`
  font-size: 2.25rem;
  font-weight: 800;
  color: #b45309;
`;

const VacancyMeta = styled.span`
  font-size: 0.95rem;
  color: #64748b;
  font-weight: 600;
`;

const VacancyListTitle = styled.span`
  font-size: 0.85rem;
  color: #94a3b8;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  font-weight: 600;
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const ListItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid #e2e8f0;

  &:first-child {
    padding-top: 0;
  }

  &:last-child {
    padding-bottom: 0;
    border-bottom: none;
  }
`;

const ListItemContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
`;

const ListItemTitle = styled.span`
  font-weight: 600;
  color: #0f172a;
`;

const ListItemSub = styled.span`
  font-size: 0.9rem;
  color: #64748b;
`;

const ListItemAside = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.4rem;
`;

const SmallText = styled.span`
  font-size: 0.8rem;
  color: #94a3b8;
  font-weight: 500;
`;

const EmptyState = styled.div`
  padding: 1.5rem;
  border-radius: 10px;
  background: #f8fafc;
  color: #64748b;
  text-align: center;
  font-weight: 500;
`;

const StageBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.65rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ $color }) => $color || '#1e293b'};
  background-color: ${({ $color }) => ($color ? `${$color}20` : 'rgba(148, 163, 184, 0.2)')};
  text-transform: none;
`;

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.65rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ $variant }) => CHIP_VARIANTS[$variant]?.text || CHIP_VARIANTS.neutral.text};
  background: ${({ $variant }) => CHIP_VARIANTS[$variant]?.bg || CHIP_VARIANTS.neutral.bg};
  text-transform: capitalize;
`;

const ActivityGrid = styled.div`
  display: grid;
  width: 100%;
  gap: clamp(1rem, 2vw, 1.75rem);
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));

  @media (min-width: 1360px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatCount = (value) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(value || 0)));

const formatStatus = (status) => {
  if (!status) return 'Unknown';
  return status
    .toString()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatDateTime = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const formatDaysRemaining = (days) => {
  if (days === null || days === undefined) return '—';
  if (days < 0) {
    const count = Math.abs(days);
    return `${count} day${count === 1 ? '' : 's'} ago`;
  }
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `${days} days`;
};

const getStageMeta = (stage) => {
  if (stage && STAGE_META[stage]) {
    return STAGE_META[stage];
  }
  return { label: formatStatus(stage || 'Unknown'), color: '#2563eb' };
};

const getStatusVariant = (status) => STATUS_VARIANTS[status] || 'neutral';

const DashboardOverview = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchDashboardData = useCallback(async (withRefresh = false) => {
    if (withRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');
    try {
      const results = await Promise.allSettled([
        api.get('/forms'),
        api.get('/candidates'),
        api.get('/tests'),
        api.get('/interviews')
      ]);

      const forms = results[0].status === 'fulfilled' ? results[0].value.data.forms || [] : [];
      const candidates = results[1].status === 'fulfilled' ? results[1].value.data.candidates || [] : [];
      const tests = results[2].status === 'fulfilled' ? results[2].value.data.tests || [] : [];
      const interviews = results[3].status === 'fulfilled' ? results[3].value.data.interviews || [] : [];

      if (results.some((res) => res.status === 'rejected')) {
        setError('Some dashboard data failed to load. Displaying available information.');
      }

      const now = new Date();
      const msPerDay = 24 * 60 * 60 * 1000;

      const candidateForms = forms.filter((form) => form.formType === 'candidate_profile');
      const activeForms = candidateForms.filter((form) => form.isActive !== false).length;
      const totalForms = candidateForms.length;

      // Group by campus and department for dashboard
      const campusDeptStats = {};
      candidateForms.forEach(form => {
        const campus = form.campus || 'Not Set';
        const dept = form.department || 'Not Set';
        const key = `${campus}::${dept}`;
        if (!campusDeptStats[key]) {
          campusDeptStats[key] = {
            campus,
            department: dept,
            posted: 0,
            finalized: 0
          };
        }
        campusDeptStats[key].posted += toNumber(form.vacancies);
        campusDeptStats[key].finalized += toNumber(form.filledVacancies);
      });

      const totalVacancies = candidateForms.reduce((sum, form) => sum + toNumber(form.vacancies), 0);
      const filledVacancies = candidateForms.reduce((sum, form) => sum + toNumber(form.filledVacancies), 0);
      const remainingVacancies = Math.max(totalVacancies - filledVacancies, 0);
      const fillRate = totalVacancies > 0 ? Math.min(100, Math.round((filledVacancies / totalVacancies) * 100)) : 0;

      const statusCounts = candidates.reduce((acc, candidate) => {
        const status = candidate.status || 'pending';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      // pipelineStages removed - no longer used after dashboard redesign

      const totalCandidates = candidates.length;
      const selectedCount = statusCounts.selected || 0;
      const pendingApprovals = statusCounts.pending || 0;

      const sevenDaysAgo = new Date(now.getTime() - 7 * msPerDay);
      const newSubmissions = candidates.filter((candidate) => {
        if (!candidate.createdAt) return false;
        return new Date(candidate.createdAt) >= sevenDaysAgo;
      }).length;

      const recentCandidates = candidates
        .slice()
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 6)
        .map((candidate) => {
          const stageMeta = getStageMeta(candidate.workflow?.stage);
          return {
            id: candidate._id,
            name: candidate.user?.name || 'Candidate',
            email: candidate.user?.email || '',
            position: candidate.form?.position || candidate.form?.title || 'Role not set',
            department: candidate.form?.department || '',
            createdAt: candidate.createdAt ? new Date(candidate.createdAt) : null,
            status: candidate.status || 'pending',
            stage: candidate.workflow?.stage,
            stageLabel: stageMeta.label,
            stageColor: stageMeta.color
          };
        });

      const upperBound = new Date(now.getTime() + 14 * msPerDay);
      const upcomingInterviewsAll = [];

      interviews.forEach((interview) => {
        (interview.candidates || []).forEach((entry, idx) => {
          if (!entry.scheduledDate) {
            return;
          }

          const scheduledAt = new Date(entry.scheduledDate);
          if (entry.scheduledTime) {
            const [hours, minutes] = entry.scheduledTime.split(':');
            const hour = Number(hours);
            const minute = Number(minutes);
            if (!Number.isNaN(hour)) {
              scheduledAt.setHours(hour, Number.isNaN(minute) ? 0 : minute, 0, 0);
            }
          }

          if (scheduledAt < now || scheduledAt > upperBound) {
            return;
          }

          upcomingInterviewsAll.push({
            id: `${interview._id}_${entry.candidate?._id || idx}`,
            interviewTitle: interview.title || 'Interview',
            candidateName: entry.candidate?.user?.name || 'Candidate',
            role:
              entry.candidate?.form?.position ||
              interview.form?.position ||
              interview.form?.title ||
              'Role not set',
            scheduledAt,
            status: entry.status || 'scheduled'
          });
        });
      });

      const upcomingInterviews = upcomingInterviewsAll
        .sort((a, b) => a.scheduledAt - b.scheduledAt)
        .slice(0, 5);

      const formsClosingSoon = candidateForms
        .filter((form) => form.isActive !== false && form.closingDate)
        .map((form) => {
          const closingDate = new Date(form.closingDate);
          const diff = closingDate.setHours(23, 59, 59, 999) - now.getTime();
          const daysLeft = Math.ceil(diff / msPerDay);
          return {
            id: form._id,
            title: form.title || form.position || 'Untitled Form',
            department: form.department || '',
            closingDate: new Date(form.closingDate),
            daysLeft,
            remainingVacancies: Math.max(toNumber(form.vacancies) - toNumber(form.filledVacancies), 0)
          };
        })
        .filter((item) => item.daysLeft >= 0 && item.daysLeft <= 30)
        .sort((a, b) => a.daysLeft - b.daysLeft || b.remainingVacancies - a.remainingVacancies)
        .slice(0, 5);

      const topOpenRoles = candidateForms
        .filter((form) => toNumber(form.vacancies) > toNumber(form.filledVacancies))
        .map((form) => {
          const remaining = Math.max(toNumber(form.vacancies) - toNumber(form.filledVacancies), 0);
          const closingDate = form.closingDate ? new Date(form.closingDate) : null;
          const daysLeft = closingDate
            ? Math.ceil((closingDate.setHours(23, 59, 59, 999) - now.getTime()) / msPerDay)
            : null;
          return {
            id: form._id,
            title: form.position || form.title || 'Untitled Role',
            department: form.department || '',
            remaining,
            closingDate,
            daysLeft
          };
        })
        .sort(
          (a, b) =>
            b.remaining - a.remaining ||
            (a.daysLeft ?? Number.POSITIVE_INFINITY) - (b.daysLeft ?? Number.POSITIVE_INFINITY)
        )
        .slice(0, 4);

      const stats = {
        activeForms,
        totalForms,
        newSubmissions,
        totalCandidates,
        remainingVacancies,
        fillRate,
        upcomingInterviewsCount: upcomingInterviewsAll.length,
        selectedCount,
        pendingApprovals,
        testsCount: tests.length
      };

      setDashboardData({
        stats,
        statusCounts,
        recentCandidates,
        upcomingInterviews,
        formsClosingSoon,
        vacancyOverview: {
          totalVacancies,
          filledVacancies,
          remainingVacancies,
          fillRate,
          topOpenRoles
        },
        lastUpdated: new Date(),
        totalCandidates,
        candidateForms
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Unable to load dashboard data right now. Please try again shortly.');
      setDashboardData(null);
    } finally {
      if (withRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  if (!dashboardData) {
    return (
      <OverviewContainer>
        <OverviewWrapper>
          {error && <ErrorBanner>{error}</ErrorBanner>}
          <HeaderRow>
            <div>
              <Title>Recruitment Pulse</Title>
              <Subtitle>Supercharge your hiring workflow with live insights.</Subtitle>
            </div>
            <HeaderActions>
              <RefreshButton onClick={handleRefresh} disabled={refreshing}>
                <RefreshIcon $spinning={refreshing}>
                  <FaSync />
                </RefreshIcon>
                {refreshing ? 'Refreshing' : 'Refresh'}
              </RefreshButton>
            </HeaderActions>
          </HeaderRow>
          <EmptyState>No dashboard data available at the moment.</EmptyState>
        </OverviewWrapper>
      </OverviewContainer>
    );
  }

  const { stats, recentCandidates, upcomingInterviews, formsClosingSoon, vacancyOverview, lastUpdated, totalCandidates, candidateForms } =
    dashboardData;

  const selectedPercent =
    totalCandidates > 0 ? Math.round((stats.selectedCount / totalCandidates) * 100) : 0;

  const statsCards = [
    {
      key: 'forms',
      label: 'Active Forms',
      value: stats.activeForms,
      variant: 'primary',
      icon: <FaFileAlt />,
      meta: `${formatCount(stats.totalForms)} total forms • ${formatCount(stats.pendingApprovals)} pending approvals`
    },
    {
      key: 'submissions',
      label: 'New Submissions (7d)',
      value: stats.newSubmissions,
      variant: 'info',
      icon: <FaUserPlus />,
      meta: 'Week-to-date intake'
    },
    {
      key: 'vacancies',
      label: 'Remaining Vacancies',
      value: stats.remainingVacancies,
      variant: 'warning',
      icon: <FaBullseye />,
      meta: `${stats.fillRate}% fill rate`
    },
    {
      key: 'interviews',
      label: 'Upcoming Interviews',
      value: stats.upcomingInterviewsCount,
      variant: 'danger',
      icon: <FaCalendarCheck />,
      meta: 'Next 14 days'
    },
    {
      key: 'selected',
      label: 'Selected Candidates',
      value: stats.selectedCount,
      variant: 'success',
      icon: <FaChartLine />,
      meta: `${selectedPercent}% of candidate pool`
    }
  ];

  // Pipeline entries removed - no longer used after dashboard redesign

  return (
    <OverviewContainer>
      <OverviewWrapper>
        <HeaderRow>
          <div>
            <Title>Recruitment Pulse</Title>
            <Subtitle>Stay ahead with live stats, vacancy progress, and interview schedules.</Subtitle>
          </div>
          <HeaderActions>
            {lastUpdated && <Timestamp>Last updated {formatDateTime(lastUpdated)}</Timestamp>}
            <RefreshButton onClick={handleRefresh} disabled={refreshing}>
              <RefreshIcon $spinning={refreshing}>
                <FaSync />
              </RefreshIcon>
              {refreshing ? 'Refreshing' : 'Refresh'}
            </RefreshButton>
          </HeaderActions>
        </HeaderRow>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        <StatsGrid>
          {statsCards.map((card) => (
            <StatsCard key={card.key} $variant={card.variant}>
              <StatsIcon $variant={card.variant}>{card.icon}</StatsIcon>
              <StatsNumber>{formatCount(card.value)}</StatsNumber>
              <StatsLabel>{card.label}</StatsLabel>
              <StatsMeta>{card.meta}</StatsMeta>
            </StatsCard>
          ))}
        </StatsGrid>

        <InsightGrid>
          <SectionCard>
            <SectionTitle>Job Applications by Campus & Department</SectionTitle>
            <SectionSubtitle>Active positions and finalized candidates.</SectionSubtitle>
            {(() => {
              // Group forms by campus and department
              const campusDeptMap = {};
              candidateForms.forEach(form => {
                const campus = form.campus || 'Not Set';
                const dept = form.department || 'Not Set';
                const key = `${campus}::${dept}`;
                if (!campusDeptMap[key]) {
                  campusDeptMap[key] = {
                    campus,
                    department: dept,
                    posted: 0,
                    finalized: 0,
                    forms: []
                  };
                }
                campusDeptMap[key].posted += toNumber(form.vacancies);
                campusDeptMap[key].finalized += toNumber(form.filledVacancies);
                campusDeptMap[key].forms.push(form);
              });

              const campusDeptList = Object.values(campusDeptMap).sort((a, b) => {
                if (a.campus !== b.campus) return a.campus.localeCompare(b.campus);
                return a.department.localeCompare(b.department);
              });

              if (campusDeptList.length === 0) {
                return <EmptyState>No job applications posted yet.</EmptyState>;
              }

              return (
                <List>
                  {campusDeptList.map((item, idx) => (
                    <ListItem key={idx}>
                      <ListItemContent>
                        <ListItemTitle>{item.campus} - {item.department}</ListItemTitle>
                        <ListItemSub>
                          {formatCount(item.posted)} vacancies posted • {formatCount(item.finalized)} finalized
                        </ListItemSub>
                      </ListItemContent>
                      <ListItemAside>
                        <Chip $variant="success">{formatCount(item.finalized)}</Chip>
                        <SmallText>of {formatCount(item.posted)}</SmallText>
                      </ListItemAside>
                    </ListItem>
                  ))}
                </List>
              );
            })()}
          </SectionCard>

          <SectionCard>
            <SectionTitle>Vacancy Summary</SectionTitle>
            <SectionSubtitle>Overall recruitment progress.</SectionSubtitle>
            <VacancySummary>
              <VacancyNumber>{formatCount(vacancyOverview.filledVacancies)}</VacancyNumber>
              <VacancyMeta>
                finalized of {formatCount(vacancyOverview.totalVacancies)} posted
              </VacancyMeta>
            </VacancySummary>
            <ProgressTrack>
              <ProgressFill $value={vacancyOverview.fillRate} $color="#10b981" />
            </ProgressTrack>
            <SmallText>{vacancyOverview.fillRate}% completion rate</SmallText>
            <VacancyListTitle>Remaining Vacancies</VacancyListTitle>
            <VacancyNumber style={{ fontSize: '2rem', color: '#b45309' }}>
              {formatCount(vacancyOverview.remainingVacancies)}
            </VacancyNumber>
          </SectionCard>
        </InsightGrid>

        <ActivityGrid>
          <SectionCard>
            <SectionTitle>Recent Submissions</SectionTitle>
            <SectionSubtitle>Latest candidate entries across all roles.</SectionSubtitle>
            {recentCandidates.length === 0 ? (
              <EmptyState>No recent submissions.</EmptyState>
            ) : (
              <List>
                {recentCandidates.map((candidate) => (
                  <ListItem key={candidate.id}>
                    <ListItemContent>
                      <ListItemTitle>{candidate.name}</ListItemTitle>
                      <ListItemSub>
                        {candidate.position}
                        {candidate.department ? ` • ${candidate.department}` : ''}
                      </ListItemSub>
                      <SmallText>Applied {formatDate(candidate.createdAt)}</SmallText>
                    </ListItemContent>
                    <ListItemAside>
                      <StageBadge $color={candidate.stageColor}>{candidate.stageLabel}</StageBadge>
                      <Chip $variant={getStatusVariant(candidate.status)}>
                        {formatStatus(candidate.status)}
                      </Chip>
                    </ListItemAside>
                  </ListItem>
                ))}
              </List>
            )}
          </SectionCard>

          <SectionCard>
            <SectionTitle>Upcoming Interviews</SectionTitle>
            <SectionSubtitle>Next scheduled conversations.</SectionSubtitle>
            {upcomingInterviews.length === 0 ? (
              <EmptyState>No interviews scheduled for the next 14 days.</EmptyState>
            ) : (
              <List>
                {upcomingInterviews.map((interview) => (
                  <ListItem key={interview.id}>
                    <ListItemContent>
                      <ListItemTitle>{interview.candidateName}</ListItemTitle>
                      <ListItemSub>
                        {interview.interviewTitle} • {interview.role}
                      </ListItemSub>
                      <SmallText>{formatDateTime(interview.scheduledAt)}</SmallText>
                    </ListItemContent>
                    <ListItemAside>
                      <Chip $variant={getStatusVariant(interview.status)}>
                        {formatStatus(interview.status)}
                      </Chip>
                    </ListItemAside>
                  </ListItem>
                ))}
              </List>
            )}
          </SectionCard>

          <SectionCard>
            <SectionTitle>Closing Soon</SectionTitle>
            <SectionSubtitle>Active forms nearing their deadlines.</SectionSubtitle>
            {formsClosingSoon.length === 0 ? (
              <EmptyState>No forms closing within the next 30 days.</EmptyState>
            ) : (
              <List>
                {formsClosingSoon.map((form) => (
                  <ListItem key={form.id}>
                    <ListItemContent>
                      <ListItemTitle>{form.title}</ListItemTitle>
                      <ListItemSub>
                        {form.department ? `${form.department} • ` : ''}
                        Closes {formatDate(form.closingDate)}
                      </ListItemSub>
                    </ListItemContent>
                    <ListItemAside>
                      <Chip $variant={form.daysLeft <= 3 ? 'danger' : 'warning'}>
                        {formatDaysRemaining(form.daysLeft)}
                      </Chip>
                      <SmallText>{formatCount(form.remainingVacancies)} open</SmallText>
                    </ListItemAside>
                  </ListItem>
                ))}
              </List>
            )}
          </SectionCard>
        </ActivityGrid>
      </OverviewWrapper>
    </OverviewContainer>
  );
};

export default DashboardOverview;
