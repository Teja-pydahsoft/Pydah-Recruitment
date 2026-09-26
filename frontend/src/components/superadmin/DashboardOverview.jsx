import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  FaFileAlt,
  FaCalendarCheck,
  FaBullseye,
  FaChartLine,
  FaSync,
  FaBuilding
} from 'react-icons/fa';
import SkeletonLoader from '../SkeletonLoader';
import PushNotificationInline from '../PushNotificationInline';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
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
  awaiting_decision: { label: 'Awaiting Decision', color: '#06b6d4' },
  selected: { label: 'Selected', color: '#0f766e' },
  on_hold: { label: 'On Hold', color: '#64748b' },
  rejected: { label: 'Rejected', color: '#dc2626' }
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
  gap: 1.25rem;
  animation: ${fadeInUp} 0.5s ease-out;
  background: #f8fafc;
`;

const OverviewWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
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
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 0.25rem 0;
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: #475569;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
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
  background: #0ea5e9;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.25);

  &:hover:enabled {
    background: #0284c7;
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
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const StatsCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 4px 16px rgba(14, 165, 233, 0.05);
  border: 1px solid #e0f2fe;
  position: relative;
  overflow: hidden;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${({ $variant }) => {
      switch ($variant) {
        case 'primary':
          return 'linear-gradient(90deg, #0ea5e9, #38bdf8)';
        case 'success':
          return 'linear-gradient(90deg, #10b981, #059669)';
        case 'info':
          return 'linear-gradient(90deg, #0284c7, #06b6d4)';
        case 'warning':
          return 'linear-gradient(90deg, #f59e0b, #d97706)';
        case 'danger':
          return 'linear-gradient(90deg, #ef4444, #dc2626)';
        default:
          return '#64748b';
      }
    }};
  }

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(14, 165, 233, 0.12);
  }
`;

const StatsIconContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
`;

const StatsIcon = styled.div`
  font-size: 1.35rem;
  color: ${({ $variant }) => {
    switch ($variant) {
      case 'primary':
        return '#0ea5e9';
      case 'success':
        return '#10b981';
      case 'info':
        return '#0284c7';
      case 'warning':
        return '#b45309';
      case 'danger':
        return '#ef4444';
      default:
        return '#475569';
    }
  }};
`;

const StatsCountBadge = styled.div`
  background: ${({ $variant }) => {
    switch ($variant) {
      case 'primary':
        return '#0ea5e9';
      case 'success':
        return '#10b981';
      case 'info':
        return '#0284c7';
      case 'warning':
        return '#f59e0b';
      case 'danger':
        return '#ef4444';
      default:
        return '#64748b';
    }
  }};
  color: white;
  font-size: 1.1rem;
  font-weight: 800;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  line-height: 1.2;
`;

const StatsLabel = styled.span`
  font-size: 0.78rem;
  color: #475569;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;

const StatsMeta = styled.span`
  font-size: 0.78rem;
  color: #94a3b8;
  font-weight: 500;
`;

const SectionCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 4px 16px rgba(14, 165, 233, 0.05);
  border: 1px solid #e0f2fe;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
`;

const SectionSubtitle = styled.p`
  margin: -0.35rem 0 0;
  font-size: 0.82rem;
  color: #64748b;
`;

const ProgressTrack = styled.div`
  height: 8px;
  background: #f1f5f9;
  border-radius: 9999px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  width: ${({ $value }) => Math.min(100, Math.max(0, $value)).toFixed(1)}%;
  background: ${({ $color }) => $color || '#0ea5e9'};
  border-radius: inherit;
  transition: width 0.4s ease;
`;

const StageBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.3rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ $color }) => $color || '#1e293b'};
  background-color: ${({ $color }) => ($color ? `${$color}20` : 'rgba(148, 163, 184, 0.2)')};
`;

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.3rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ $variant }) => CHIP_VARIANTS[$variant]?.text || CHIP_VARIANTS.neutral.text};
  background: ${({ $variant }) => CHIP_VARIANTS[$variant]?.bg || CHIP_VARIANTS.neutral.bg};
`;

const EmptyState = styled.div`
  padding: 1.5rem;
  border-radius: 10px;
  background: #f8fafc;
  color: #64748b;
  text-align: center;
  font-weight: 500;
  font-size: 0.875rem;
`;

const ErrorBanner = styled.div`
  background: #fee2e2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-weight: 500;
`;

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatCount = (value) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(value || 0)));

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

const DashboardOverview = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedCampusFilter, setSelectedCampusFilter] = useState('all');

  const fetchDashboardData = useCallback(async (withRefresh = false) => {
    if (withRefresh) setRefreshing(true);
    else setLoading(true);
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

      const candidateForms = forms.filter((form) => form.formType === 'candidate_profile');
      const activeForms = candidateForms.filter((form) => form.isActive !== false).length;
      const totalForms = candidateForms.length;

      const totalVacancies = candidateForms.reduce((sum, form) => sum + toNumber(form.vacancies), 0);
      const filledVacancies = candidateForms.reduce((sum, form) => sum + toNumber(form.filledVacancies), 0);
      const remainingVacancies = Math.max(totalVacancies - filledVacancies, 0);
      const fillRate = totalVacancies > 0 ? Math.min(100, Math.round((filledVacancies / totalVacancies) * 100)) : 0;

      const statusCounts = candidates.reduce((acc, candidate) => {
        const status = candidate.status || 'pending';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      const totalCandidates = candidates.length;
      const selectedCount = statusCounts.selected || 0;
      const pendingApprovals = statusCounts.pending || 0;

      const stats = {
        activeForms,
        totalForms,
        totalCandidates,
        remainingVacancies,
        fillRate,
        upcomingInterviewsCount: interviews.length,
        selectedCount,
        pendingApprovals,
        testsCount: tests.length
      };

      setDashboardData({
        stats,
        statusCounts,
        vacancyOverview: { totalVacancies, filledVacancies, remainingVacancies, fillRate },
        lastUpdated: new Date(),
        totalCandidates,
        candidateForms,
        candidates
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Unable to load dashboard data right now.');
      setDashboardData(null);
    } finally {
      if (withRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return <SkeletonLoader loading={true} variant="dashboard" />;
  }

  if (!dashboardData) {
    return (
      <OverviewContainer>
        <OverviewWrapper>
          {error && <ErrorBanner>{error}</ErrorBanner>}
          <HeaderRow>
            <div>
              <Title>Data Analytics Dashboard</Title>
              <Subtitle>Live graphical analytics and metrics</Subtitle>
            </div>
            <HeaderActions>
              <RefreshButton onClick={() => fetchDashboardData(true)} disabled={refreshing}>
                <RefreshIcon $spinning={refreshing}><FaSync /></RefreshIcon>
                {refreshing ? 'Refreshing' : 'Refresh'}
              </RefreshButton>
            </HeaderActions>
          </HeaderRow>
          <EmptyState>No analytics data available at the moment.</EmptyState>
        </OverviewWrapper>
      </OverviewContainer>
    );
  }

  const { stats, statusCounts = {}, lastUpdated, totalCandidates, candidateForms, candidates } = dashboardData;
  const selectedPercent = totalCandidates > 0 ? Math.round((stats.selectedCount / totalCandidates) * 100) : 0;

  const statsCards = [
    { key: 'forms', label: 'Active Forms', value: stats.activeForms, variant: 'primary', icon: <FaFileAlt />, meta: `${stats.totalForms} total forms` },
    { key: 'vacancies', label: 'Remaining Vacancies', value: stats.remainingVacancies, variant: 'warning', icon: <FaBullseye />, meta: `${stats.fillRate}% fill rate` },
    { key: 'interviews', label: 'Scheduled Interviews', value: stats.upcomingInterviewsCount, variant: 'danger', icon: <FaCalendarCheck />, meta: 'Total scheduled' },
    { key: 'selected', label: 'Selected Candidates', value: stats.selectedCount, variant: 'success', icon: <FaChartLine />, meta: `${selectedPercent}% of candidate pool` }
  ];

  return (
    <OverviewContainer>
      <OverviewWrapper>
        <HeaderRow>
          <div>
            <Title>Recruitment Analytics Dashboard</Title>
            <Subtitle>Graphical visualizer for campus performance, candidate distribution, and vacancy analytics.</Subtitle>
          </div>
          <HeaderActions>
            {lastUpdated && <Timestamp>Updated {formatDateTime(lastUpdated)}</Timestamp>}
            {user && (user.role === 'super_admin' || user.role === 'sub_admin' || user.role === 'panel_member') && (
              <PushNotificationInline user={user} />
            )}
            <RefreshButton onClick={() => fetchDashboardData(true)} disabled={refreshing}>
              <RefreshIcon $spinning={refreshing}><FaSync /></RefreshIcon>
              {refreshing ? 'Refreshing' : 'Refresh'}
            </RefreshButton>
          </HeaderActions>
        </HeaderRow>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        {/* ── Key Metrics Analytics Badges ─────────────────────────────── */}
        <StatsGrid>
          {statsCards.map((card) => (
            <StatsCard key={card.key} $variant={card.variant}>
              <StatsIconContainer>
                <StatsIcon $variant={card.variant}>{card.icon}</StatsIcon>
                <StatsCountBadge $variant={card.variant}>{formatCount(card.value)}</StatsCountBadge>
              </StatsIconContainer>
              <StatsLabel>{card.label}</StatsLabel>
              <StatsMeta>{card.meta}</StatsMeta>
            </StatsCard>
          ))}
        </StatsGrid>

        {/* ── Campus Management Reference & Stream Analytics ────────────────── */}
        <SectionCard style={{ padding: '1.25rem', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid #e0f2fe', paddingBottom: '0.875rem' }}>
            <div>
              <SectionTitle style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaBuilding style={{ color: '#0ea5e9' }} /> Campus Reference & Stream Analytics
              </SectionTitle>
              <SectionSubtitle>Visual analytics categorized by Btech, Degree, Pharmacy, and Diploma streams</SectionSubtitle>
            </div>
            
            {/* Campus Stream Filter Buttons */}
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b', marginRight: '0.25rem' }}>Stream Filter:</span>
              {['all', 'Btech', 'Pharmacy', 'Degree', 'Diploma'].map(campusKey => {
                const isActive = selectedCampusFilter === campusKey;
                const label = campusKey === 'all' ? 'All Campuses (Total)' : campusKey;

                return (
                  <button
                    key={campusKey}
                    onClick={() => setSelectedCampusFilter(campusKey)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      border: isActive ? '1px solid #0ea5e9' : '1px solid #cbd5e1',
                      background: isActive ? '#e0f2fe' : '#ffffff',
                      color: isActive ? '#0284c7' : '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isActive ? '0 2px 6px rgba(14, 165, 233, 0.15)' : 'none'
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Campus Stream Analytics Content */}
          {(() => {
            const permanentCampuses = ['Btech', 'Pharmacy', 'Degree', 'Diploma'];

            const getCampusStats = (campusName) => {
              const forms = candidateForms.filter(f => {
                const cName = (f.campus || '').toLowerCase();
                const target = campusName.toLowerCase();
                return cName.includes(target) || (target === 'btech' && cName.includes('b.tech'));
              });

              const posted = forms.reduce((sum, f) => sum + toNumber(f.vacancies), 0);
              const finalized = forms.reduce((sum, f) => sum + toNumber(f.filledVacancies), 0);
              const open = Math.max(posted - finalized, 0);
              const fillRate = posted > 0 ? Math.min(100, Math.round((finalized / posted) * 100)) : 0;

              const deptsMap = {};
              forms.forEach(f => {
                const dName = f.department || 'General';
                if (!deptsMap[dName]) {
                  deptsMap[dName] = { name: dName, posted: 0, finalized: 0 };
                }
                deptsMap[dName].posted += toNumber(f.vacancies);
                deptsMap[dName].finalized += toNumber(f.filledVacancies);
              });

              return {
                name: campusName,
                formsCount: forms.length,
                posted,
                finalized,
                open,
                fillRate,
                departments: Object.values(deptsMap)
              };
            };

            const allCampusStats = permanentCampuses.map(c => getCampusStats(c));
            const totalCampusPosted = allCampusStats.reduce((sum, c) => sum + c.posted, 0);
            const totalCampusFinalized = allCampusStats.reduce((sum, c) => sum + c.finalized, 0);
            const totalCampusOpen = Math.max(totalCampusPosted - totalCampusFinalized, 0);
            const totalCampusFillRate = totalCampusPosted > 0 ? Math.round((totalCampusFinalized / totalCampusPosted) * 100) : 0;

            if (selectedCampusFilter === 'all') {
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.75rem' }}>
                  {/* Total All Campuses Summary Card */}
                  <div style={{
                    background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)',
                    color: 'white',
                    padding: '1.1rem',
                    borderRadius: '12px',
                    boxShadow: '0 6px 20px rgba(14, 165, 233, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', fontSize: '1rem', color: '#ffffff' }}>Total Campus Overview (All Streams)</span>
                      <Chip style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff', fontWeight: '700' }}>
                        {permanentCampuses.length} Campus Streams
                      </Chip>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.9, textTransform: 'uppercase', fontWeight: '600' }}>Total Posted Vacancies</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: '800' }}>{totalCampusPosted}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.9, textTransform: 'uppercase', fontWeight: '600' }}>Total Finalized Candidates</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: '800' }}>{totalCampusFinalized}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.9, textTransform: 'uppercase', fontWeight: '600' }}>Total Open Vacancies</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#fef08a' }}>{totalCampusOpen}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.9, textTransform: 'uppercase', fontWeight: '600' }}>Overall Fill Rate</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: '800' }}>{totalCampusFillRate}%</div>
                      </div>
                    </div>

                    <ProgressTrack style={{ height: '8px', background: 'rgba(255,255,255,0.3)' }}>
                      <ProgressFill $value={totalCampusFillRate} $color="#ffffff" />
                    </ProgressTrack>
                  </div>

                  {/* Individual Stream Cards Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem' }}>
                    {allCampusStats.map(cStats => {
                      const colorMap = {
                        Btech: '#0ea5e9',
                        Pharmacy: '#10b981',
                        Degree: '#8b5cf6',
                        Diploma: '#f59e0b'
                      };
                      const color = colorMap[cStats.name] || '#0ea5e9';

                      return (
                        <div
                          key={cStats.name}
                          onClick={() => setSelectedCampusFilter(cStats.name)}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '1rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: color }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#0f172a' }}>{cStats.name} Stream</span>
                            <Chip $variant="info" style={{ fontSize: '0.7rem' }}>{cStats.formsCount} Forms</Chip>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.6rem', fontWeight: '800', color: color }}>{cStats.finalized}</span>
                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}>finalized of {cStats.posted} posted</span>
                          </div>

                          <ProgressTrack style={{ height: '7px', background: '#e2e8f0' }}>
                            <ProgressFill $value={cStats.fillRate} $color={color} />
                          </ProgressTrack>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
                            <span>Fill Rate: {cStats.fillRate}%</span>
                            <span style={{ color: '#b45309' }}>{cStats.open} Open Vacancies</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // Single Campus Detailed Analytics View
            const activeStats = getCampusStats(selectedCampusFilter);
            const colorMap = {
              Btech: '#0ea5e9',
              Pharmacy: '#10b981',
              Degree: '#8b5cf6',
              Diploma: '#f59e0b'
            };
            const accentColor = colorMap[activeStats.name] || '#0ea5e9';

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.875rem' }}>
                  <div style={{ background: '#eff6ff', padding: '0.875rem', borderRadius: '10px', border: '1px solid #dbeafe' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#1e40af', textTransform: 'uppercase' }}>Posted Vacancies</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e3a8a', marginTop: '0.2rem' }}>{activeStats.posted}</div>
                  </div>
                  <div style={{ background: '#ecfdf5', padding: '0.875rem', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#047857', textTransform: 'uppercase' }}>Finalized Candidates</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#064e3b', marginTop: '0.2rem' }}>{activeStats.finalized}</div>
                  </div>
                  <div style={{ background: '#fffbeb', padding: '0.875rem', borderRadius: '10px', border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#b45309', textTransform: 'uppercase' }}>Remaining Open</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#78350f', marginTop: '0.2rem' }}>{activeStats.open}</div>
                  </div>
                  <div style={{ background: '#f3e8ff', padding: '0.875rem', borderRadius: '10px', border: '1px solid #e9d5ff' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6b21a8', textTransform: 'uppercase' }}>Stream Fill Rate</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#581c87', marginTop: '0.2rem' }}>{activeStats.fillRate}%</div>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#334155', marginBottom: '0.5rem' }}>
                    {activeStats.name} Departmental Vacancy Analytics:
                  </h4>
                  {activeStats.departments.length === 0 ? (
                    <EmptyState>No department positions registered for {activeStats.name} campus.</EmptyState>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {activeStats.departments.map((dept, idx) => {
                        const dRate = dept.posted > 0 ? Math.min(100, Math.round((dept.finalized / dept.posted) * 100)) : 0;
                        return (
                          <div key={idx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '0.65rem 0.875rem', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.25rem' }}>
                              <span style={{ fontWeight: '600', color: '#0f172a' }}>{dept.name}</span>
                              <span style={{ fontWeight: '700', color: accentColor }}>
                                {dept.finalized} / {dept.posted} filled ({dRate}%)
                              </span>
                            </div>
                            <ProgressTrack style={{ height: '6px', background: '#f1f5f9' }}>
                              <ProgressFill $value={dRate} $color={accentColor} />
                            </ProgressTrack>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </SectionCard>

        {/* ── Graphical Visual Charts Grid ────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem',
          width: '100%'
        }}>
          {/* Donut Analytics Chart */}
          <SectionCard style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div>
                <SectionTitle>Candidate Outcome Distribution</SectionTitle>
                <SectionSubtitle>Status breakdown of total applicant pool</SectionSubtitle>
              </div>
              <StageBadge $color="#0ea5e9">{totalCandidates} Total</StageBadge>
            </div>

            {totalCandidates === 0 ? (
              <EmptyState>No candidate data available for analytics.</EmptyState>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: '1rem', paddingTop: '0.5rem' }}>
                {(() => {
                  const statusList = [
                    { label: 'Selected', count: statusCounts.selected || 0, color: '#10b981' },
                    { label: 'Approved', count: statusCounts.approved || 0, color: '#0284c7' },
                    { label: 'Shortlisted', count: statusCounts.shortlisted || 0, color: '#38bdf8' },
                    { label: 'Pending', count: statusCounts.pending || 0, color: '#64748b' },
                    { label: 'On Hold', count: statusCounts.on_hold || 0, color: '#f59e0b' },
                    { label: 'Rejected', count: statusCounts.rejected || 0, color: '#ef4444' }
                  ].filter(item => item.count > 0);

                  const radius = 60;
                  const circumference = 2 * Math.PI * radius;
                  let accumulatedPercent = 0;

                  return (
                    <div style={{ position: 'relative', width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="160" height="160" viewBox="0 0 160 160">
                        <circle cx="80" cy="80" r={radius} fill="none" stroke="#e0f2fe" strokeWidth="20" />
                        {statusList.map((item, idx) => {
                          const percent = item.count / totalCandidates;
                          const strokeDasharray = `${percent * circumference} ${circumference}`;
                          const strokeDashoffset = -accumulatedPercent * circumference;
                          accumulatedPercent += percent;

                          return (
                            <circle
                              key={idx}
                              cx="80" cy="80" r={radius}
                              fill="none" stroke={item.color} strokeWidth="20"
                              strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset}
                              transform="rotate(-90 80 80)"
                              style={{ transition: 'all 0.5s ease' }}
                            />
                          );
                        })}
                      </svg>
                      <div style={{ position: 'absolute', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', lineHeight: '1' }}>{totalCandidates}</div>
                        <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Applicants</div>
                      </div>
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: '1', minWidth: '150px' }}>
                  {[
                    { label: 'Selected', count: statusCounts.selected || 0, color: '#10b981' },
                    { label: 'Approved', count: statusCounts.approved || 0, color: '#0284c7' },
                    { label: 'Shortlisted', count: statusCounts.shortlisted || 0, color: '#38bdf8' },
                    { label: 'Pending', count: statusCounts.pending || 0, color: '#64748b' },
                    { label: 'On Hold', count: statusCounts.on_hold || 0, color: '#f59e0b' },
                    { label: 'Rejected', count: statusCounts.rejected || 0, color: '#ef4444' }
                  ].map((item, idx) => {
                    const pct = totalCandidates > 0 ? Math.round((item.count / totalCandidates) * 100) : 0;
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: item.color }} />
                          <span style={{ fontWeight: '500', color: '#334155' }}>{item.label}</span>
                        </div>
                        <span style={{ fontWeight: '700', color: item.color }}>{item.count} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </SectionCard>

          {/* Task Pipeline Stage Visualizer */}
          <SectionCard style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div>
                <SectionTitle>Task Pipeline Funnel Analytics</SectionTitle>
                <SectionSubtitle>Volume breakdown by active workflow stage</SectionSubtitle>
              </div>
              <Chip $variant="info">8 Stages</Chip>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingTop: '0.25rem' }}>
              {Object.entries(STAGE_META).map(([stageKey, meta]) => {
                const stageCandidatesCount = candidates.filter(c => c.workflow?.stage === stageKey).length;
                const pct = totalCandidates > 0 ? Math.round((stageCandidatesCount / totalCandidates) * 100) : 0;

                return (
                  <div key={stageKey} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                      <span style={{ fontWeight: '600', color: '#334155' }}>{meta.label}</span>
                      <span style={{ fontWeight: '700', color: meta.color }}>
                        {stageCandidatesCount} candidate{stageCandidatesCount === 1 ? '' : 's'} ({pct}%)
                      </span>
                    </div>
                    <ProgressTrack style={{ height: '7px', background: '#f1f5f9' }}>
                      <ProgressFill $value={pct > 0 ? Math.max(pct, 6) : 0} $color={meta.color} />
                    </ProgressTrack>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>
      </OverviewWrapper>
    </OverviewContainer>
  );
};

export default DashboardOverview;
