import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FaUserTie,
  FaFileAlt,
  FaUsers,
  FaClipboardList,
  FaCalendarAlt,
  FaChartBar,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaUser,
  FaHome,
  FaUserShield,
  FaCog,
  FaComments
} from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const SidebarContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: ${props => props.$isOpen ? '264px' : '64px'};
  background: linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 60%, #f0f9ff 100%);
  color: #0f172a;
  border-right: 1px solid #bae6fd;
  transition: width 0.3s cubic-bezier(0.4,0,0.2,1);
  z-index: 1000;
  box-shadow: 4px 0 24px rgba(14, 165, 233, 0.12);
  overflow: hidden;
  overflow-x: hidden;
  overflow-y: auto;

  @media (max-width: 768px) {
    width: ${props => props.$isOpen ? '260px' : '56px'};
  }

  @media (max-width: 480px) {
    width: ${props => props.$isOpen ? '100%' : '56px'};
  }

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: #e0f2fe; }
  &::-webkit-scrollbar-thumb { background: #0ea5e9; border-radius: 4px; }
  &::-webkit-scrollbar-thumb:hover { background: #0284c7; }
`;

const SidebarHeader = styled.div`
  padding: ${props => props.$isOpen ? '1.25rem 1.25rem' : '0.875rem 0'};
  border-bottom: 1px solid #bae6fd;
  display: flex;
  align-items: center;
  justify-content: ${props => props.$isOpen ? 'space-between' : 'center'};
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  transition: padding 0.3s ease;
  position: relative;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  flex-shrink: 0;
  min-height: 64px;

  @media (max-width: 768px) {
    padding: ${props => props.$isOpen ? '1rem' : '0.75rem 0'};
    min-height: 56px;
  }
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  justify-content: ${props => props.$isOpen ? 'flex-start' : 'center'};
  gap: ${props => props.$isOpen ? '0.75rem' : '0'};
  width: ${props => props.$isOpen ? 'auto' : '0'};
  max-width: 100%;
  transition: all 0.3s ease;
  flex-shrink: 0;
  overflow: hidden;
  opacity: ${props => props.$isOpen ? 1 : 0};
  pointer-events: ${props => props.$isOpen ? 'auto' : 'none'};

  &:hover {
    transform: scale(1.03);
  }

  @media (max-width: 768px) {
    display: ${props => props.$isOpen ? 'flex' : 'none'};
  }

  @media (max-width: 480px) {
    display: ${props => props.$isOpen ? 'flex' : 'none'};
  }
`;

const LogoIcon = styled(FaUserTie)`
  font-size: 1.4rem;
  color: #0284c7;
  flex-shrink: 0;
`;

const LogoText = styled.span`
  font-size: 1.1rem;
  font-weight: 800;
  white-space: nowrap;
  opacity: ${props => props.$isOpen ? 1 : 0};
  width: ${props => props.$isOpen ? 'auto' : '0'};
  overflow: hidden;
  transition: opacity 0.3s ease, width 0.3s ease;
  background: linear-gradient(135deg, #0369a1 0%, #0284c7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 0.5px;
`;

const ToggleButton = styled.button`
  background: #ffffff;
  border: 1px solid #0ea5e9;
  color: #0284c7;
  font-size: 1rem;
  cursor: pointer;
  padding: 0.45rem;
  border-radius: 8px;
  transition: all 0.2s ease;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  box-shadow: 0 2px 6px rgba(14, 165, 233, 0.15);

  &:hover {
    background: #0ea5e9;
    color: #ffffff;
  }

  @media (max-width: 768px) { width: 34px; height: 34px; }
  @media (max-width: 480px) { width: 34px; height: 34px; }
`;

const SidebarContent = styled.div`
  padding: 1rem 0;
  height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
`;

const Navigation = styled.nav`
  flex: 1;
  padding: ${props => props.$isOpen ? '0 0.75rem' : '0 0.375rem'};
  overflow-y: auto;
  overflow-x: hidden;
  transition: padding 0.3s ease;
  width: 100%;
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;

  @media (max-width: 768px) {
    padding: ${props => props.$isOpen ? '0 0.625rem' : '0 0.375rem'};
  }

  @media (max-width: 480px) {
    padding: ${props => props.$isOpen ? '0 0.625rem' : '0 0.375rem'};
  }
`;

const NavSection = styled.div`
  margin-bottom: 0.75rem;
`;

const SectionTitle = styled.h6`
  font-size: 0.68rem;
  font-weight: 800;
  color: #0369a1;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 0.4rem;
  padding: 0 0.875rem;
  opacity: ${props => props.$isOpen ? 1 : 0};
  height: ${props => props.$isOpen ? 'auto' : '0'};
  overflow: hidden;
  transition: opacity 0.3s ease;
`;

const Divider = styled.div`
  height: 1px;
  background: #bae6fd;
  margin: 0.625rem 0.875rem;
  transition: margin 0.3s ease;
`;

const NavList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
`;

const NavItem = styled.li`
  margin-bottom: 0.25rem;
  position: relative;
  width: 100%;
  box-sizing: border-box;
  overflow: visible;

  &:hover {
    transform: ${props => props.$isOpen ? 'translateX(2px)' : 'none'};
  }
`;

const NavLink = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: ${props => props.$isOpen ? 'flex-start' : 'center'};
  padding: ${props => props.$isOpen ? '0.7rem 0.875rem' : '0.7rem 0'};
  color: #1e293b;
  text-decoration: none;
  border-radius: 10px;
  transition: all 0.2s ease;
  position: relative;
  width: 100%;
  box-sizing: border-box;
  font-weight: 600;
  font-size: 0.875rem;

  &:hover {
    background: #ffffff;
    color: #0284c7;
    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.12);
  }

  &.active {
    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
    color: #ffffff;
    font-weight: 700;
    box-shadow: 0 4px 14px rgba(14, 165, 233, 0.35);
  }

  svg {
    font-size: 0.95rem;
    margin-right: ${props => props.$isOpen ? '0.7rem' : '0'};
    min-width: 16px;
    width: ${props => props.$isOpen ? 'auto' : '16px'};
    height: ${props => props.$isOpen ? 'auto' : '16px'};
    transition: all 0.2s ease;
    flex-shrink: 0;
    color: #0284c7;
  }

  &:hover svg { color: #0ea5e9; }
  &.active svg { color: #ffffff; }
`;

const NavText = styled.span`
  opacity: ${props => props.$isOpen ? 1 : 0};
  width: ${props => props.$isOpen ? 'auto' : '0'};
  overflow: hidden;
  transition: opacity 0.3s ease, width 0.3s ease;
  white-space: nowrap;
  font-weight: 500;
  pointer-events: ${props => props.$isOpen ? 'auto' : 'none'};
  margin: 0;
`;

const Tooltip = styled.div`
  position: fixed;
  left: ${props => props.$left ? `${props.$left}px` : '74px'};
  top: ${props => props.$top ? `${props.$top}px` : '50%'};
  transform: translateY(-50%);
  background: #1e293b;
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  opacity: ${props => props.$show ? 1 : 0};
  pointer-events: none;
  transition: opacity 0.15s ease;
  z-index: 9999;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  visibility: ${props => props.$show ? 'visible' : 'hidden'};

  &::before {
    content: '';
    position: absolute;
    right: 100%;
    top: 50%;
    transform: translateY(-50%);
    border: 6px solid transparent;
    border-right-color: #1e293b;
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const NotificationBadge = styled.div`
  position: absolute;
  top: 6px;
  right: ${props => props.$isOpen ? '8px' : '6px'};
  background: #ef4444;
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.15rem 0.35rem;
  border-radius: 8px;
  min-width: ${props => props.count > 9 ? '20px' : '16px'};
  height: 16px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: ${props => props.count > 0 ? 1 : 0};
  transition: opacity 0.3s ease;
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);
  line-height: 1;
`;

const UserSection = styled.div`
  border-top: 1px solid #bae6fd;
  padding: ${props => props.$isOpen ? '0.875rem' : '0.5rem 0.375rem'};
  background: linear-gradient(180deg, #e0f2fe 0%, #f0f9ff 100%);
  transition: padding 0.3s ease;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  flex-shrink: 0;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${props => props.$isOpen ? '0.75rem' : '0'};
  margin-bottom: ${props => props.$isOpen ? '0.75rem' : '0'};
  padding: ${props => props.$isOpen ? '0.75rem' : '0'};
  border-radius: 10px;
  background: ${props => props.$isOpen ? '#ffffff' : 'transparent'};
  border: ${props => props.$isOpen ? '1px solid #bae6fd' : 'none'};
  box-shadow: ${props => props.$isOpen ? '0 2px 8px rgba(14, 165, 233, 0.08)' : 'none'};
  transition: all 0.3s ease;
  width: 100%;
  height: ${props => props.$isOpen ? 'auto' : '0'};
  overflow: ${props => props.$isOpen ? 'visible' : 'hidden'};
  max-height: ${props => props.$isOpen ? '120px' : '0'};
  opacity: ${props => props.$isOpen ? 1 : 0};

  &:hover {
    background: ${props => props.$isOpen ? '#ffffff' : 'transparent'};
    box-shadow: ${props => props.$isOpen ? '0 4px 12px rgba(14, 165, 233, 0.15)' : 'none'};
  }
`;

const UserAvatar = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #0ea5e9;
  border: 2px solid #bae6fd;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
  transition: all 0.3s ease;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 10px;
    height: 10px;
    background: #10b981;
    border: 2px solid #ffffff;
    border-radius: 50%;
    transition: all 0.3s ease;
  }
`;

const UserDetails = styled.div`
  opacity: ${props => props.$isOpen ? 1 : 0};
  width: ${props => props.$isOpen ? 'auto' : '0'};
  overflow: hidden;
  transition: opacity 0.3s ease, width 0.3s ease;
  flex-shrink: 0;
`;

const UserName = styled.div`
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 0.15rem;
  color: #0f172a;
  white-space: nowrap;
`;

const UserRole = styled.div`
  font-size: 0.72rem;
  color: #0284c7;
  text-transform: capitalize;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const LogoutButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: ${props => props.$isOpen ? 'flex-start' : 'center'};
  padding: ${props => props.$isOpen ? '0.65rem 0.875rem' : '0.45rem 0'};
  background: ${props => props.$isOpen ? '#fef2f2' : 'transparent'};
  border: ${props => props.$isOpen ? '1px solid #fecaca' : 'none'};
  color: #ef4444;
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.2s ease;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  position: relative;
  box-sizing: border-box;

  &:hover {
    background: #fee2e2;
    color: #dc2626;
  }

  svg {
    font-size: ${props => props.$isOpen ? '0.9rem' : '0.85rem'};
    margin-right: ${props => props.$isOpen ? '0.6rem' : '0'};
    min-width: 14px;
    width: ${props => props.$isOpen ? '14px' : '14px'};
    height: ${props => props.$isOpen ? '14px' : '14px'};
    transition: all 0.2s ease;
    flex-shrink: 0;
    color: #ef4444;
  }

  &:hover svg { color: #dc2626; }
`;

const LogoutText = styled.span`
  opacity: ${props => props.$isOpen ? 1 : 0};
  width: ${props => props.$isOpen ? 'auto' : '0'};
  overflow: hidden;
  transition: opacity 0.3s ease, width 0.3s ease;
  font-weight: 500;
  margin: 0;
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: ${props => props.$isOpen && props.$showOnMobile ? 'block' : 'none'};
  backdrop-filter: blur(4px);

  @media (min-width: 768px) {
    display: none;
  }
`;

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasPermission } = useAuth();
  const [notifications, setNotifications] = useState({ feedback: 0, interviews: 0 });
  const [dashboardCounts, setDashboardCounts] = useState({
    pendingApprovals: 0,
    upcomingInterviews: 0,
    newSubmissions: 0,
    activeForms: 0
  });
  const [hoveredItem, setHoveredItem] = useState(null);

  useEffect(() => {
    if (user?.role === 'panel_member') {
      fetchNotifications();
    } else if (user?.role === 'super_admin' || user?.role === 'sub_admin') {
      fetchDashboardCounts();
      // Refresh counts every 30 seconds
      const interval = setInterval(fetchDashboardCounts, 30000);
      return () => clearInterval(interval);
    }
    
    // Also fetch notifications for super_admin or sub_admin with panel access when viewing panel member pages
    if ((user?.role === 'super_admin' || (user?.role === 'sub_admin' && user?.hasPanelMemberAccess)) && location.pathname.startsWith('/panel-member')) {
      fetchNotifications();
    }
  }, [user, location.pathname]);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/interviews/panel-member/notifications');
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchDashboardCounts = async () => {
    try {
      const [formsRes, candidatesRes, interviewsRes] = await Promise.allSettled([
        api.get('/forms'),
        api.get('/candidates'),
        api.get('/interviews')
      ]);

      const forms = formsRes.status === 'fulfilled' ? formsRes.value.data?.forms || [] : [];
      const candidates = candidatesRes.status === 'fulfilled' ? candidatesRes.value.data?.candidates || [] : [];
      const interviews = interviewsRes.status === 'fulfilled' ? interviewsRes.value.data?.interviews || [] : [];

      // Calculate counts
      const candidateForms = forms.filter(f => f.formType === 'candidate_profile');
      const activeForms = candidateForms.filter(f => f.isActive !== false).length;
      const pendingApprovals = candidates.filter(c => c.status === 'pending' || c.status === 'application_review').length;
      
      const now = new Date();
      const fourteenDaysFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const upcomingInterviews = interviews.filter(i => {
        if (!i.scheduledDate) return false;
        const scheduled = new Date(i.scheduledDate);
        return scheduled >= now && scheduled <= fourteenDaysFromNow;
      }).length;

      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const newSubmissions = candidates.filter(c => {
        if (!c.createdAt) return false;
        return new Date(c.createdAt) >= sevenDaysAgo;
      }).length;

      setDashboardCounts({
        pendingApprovals,
        upcomingInterviews,
        newSubmissions,
        activeForms
      });
    } catch (error) {
      console.error('Error fetching dashboard counts:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigationItems = {
    super_admin: [
      { path: '/super-admin', icon: FaUserTie, label: 'Dashboard' },
      { path: '/super-admin/creation', icon: FaFileAlt, label: 'Candidate Application', badge: dashboardCounts.activeForms },
      { path: '/super-admin/submissions', icon: FaFileAlt, label: 'Application Submissions', badge: dashboardCounts.pendingApprovals },
      { path: '/super-admin/tests', icon: FaClipboardList, label: 'Test Management' },
      { path: '/super-admin/users', icon: FaUserTie, label: 'Panel Members' },
      { path: '/super-admin/sub-admins', icon: FaUserShield, label: 'User Management' },
      { path: '/super-admin/courses', icon: FaCog, label: 'Campus Management' },
      { path: '/super-admin/interviews', icon: FaCalendarAlt, label: 'Interview Management', badge: dashboardCounts.upcomingInterviews },
      { path: '/super-admin/candidates', icon: FaUsers, label: 'Candidate Management', badge: dashboardCounts.newSubmissions },
      { path: '/super-admin/settings', icon: FaCog, label: 'Notifications' },
      { path: '/panel-member/feedback', icon: FaComments, label: 'Panel Member View', divider: true },
    ],
    panel_member: [
      { path: '/panel-member', icon: FaHome, label: 'Dashboard' },
      { path: '/panel-member/interviews', icon: FaCalendarAlt, label: 'My Interviews', badge: notifications.interviews },
      { path: '/panel-member/reports', icon: FaChartBar, label: 'Reports & Analytics' },
      { path: '/panel-member/profile', icon: FaUser, label: 'Profile Settings' },
    ],
    candidate: [
      { path: '/candidate', icon: FaUserTie, label: 'Dashboard' },
      { path: '/candidate/profile', icon: FaUser, label: 'My Profile' },
      { path: '/candidate/tests', icon: FaClipboardList, label: 'My Tests' },
    ]
  };

  const subAdminNavigation = [
    { path: '/sub-admin', icon: FaHome, label: 'Dashboard' },
    { path: '/sub-admin/forms', icon: FaFileAlt, label: 'Forms & Applications', permission: 'forms.manage', badge: dashboardCounts.activeForms },
    { path: '/sub-admin/submissions', icon: FaFileAlt, label: 'Application Submissions', permission: 'forms.manage', badge: dashboardCounts.pendingApprovals },
    { path: '/sub-admin/candidates', icon: FaUsers, label: 'Candidate Management', permission: 'candidates.manage', badge: dashboardCounts.newSubmissions },
    { path: '/sub-admin/tests', icon: FaClipboardList, label: 'Test Management', permission: 'tests.manage' },
    { path: '/sub-admin/interviews', icon: FaCalendarAlt, label: 'Interview Management', permission: 'interviews.manage', badge: dashboardCounts.upcomingInterviews },
    { path: '/sub-admin/users', icon: FaUserTie, label: 'Panel Members', permission: 'panel_members.manage' },
  ];

  let currentNavItems = navigationItems[user?.role] || [];

  if (user?.role === 'sub_admin') {
    currentNavItems = subAdminNavigation.filter(item => !item.permission || hasPermission(item.permission));
  }

  // If super_admin or sub_admin with panel access is viewing panel member pages, show panel member navigation
  if ((user?.role === 'super_admin' || (user?.role === 'sub_admin' && user?.hasPanelMemberAccess)) && location.pathname.startsWith('/panel-member')) {
    currentNavItems = [
      ...navigationItems.panel_member,
      { path: user?.role === 'super_admin' ? '/super-admin' : '/sub-admin', icon: FaUserShield, label: `Back to ${user?.role === 'super_admin' ? 'Admin' : 'Sub Admin'} View`, divider: true }
    ];
  }

  const formatUserRole = (role) => {
    return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <>
      <Overlay $isOpen={isOpen} $showOnMobile={true} onClick={toggleSidebar} />
      <SidebarContainer $isOpen={isOpen}>
        <SidebarHeader $isOpen={isOpen}>
          <Logo $isOpen={isOpen}>
            <LogoIcon />
            <LogoText $isOpen={isOpen}>SRS</LogoText>
          </Logo>
          <ToggleButton onClick={toggleSidebar} $isOpen={isOpen}>
            {isOpen ? <FaTimes /> : <FaBars />}
          </ToggleButton>
        </SidebarHeader>

        <SidebarContent>
          <Navigation $isOpen={isOpen}>
            <NavSection>
              <SectionTitle $isOpen={isOpen}>Navigation</SectionTitle>
              <NavList>
                {currentNavItems.map((item, index) => (
                  <React.Fragment key={item.path}>
                    {item.divider && index > 0 && <Divider $isOpen={isOpen} />}
                    <NavItem $isOpen={isOpen}>
                      <NavLink
                        to={item.path}
                        className={location.pathname === item.path || (item.path === '/panel-member/feedback' && location.pathname.startsWith('/panel-member')) ? 'active' : ''}
                        $isOpen={isOpen}
                        onMouseEnter={(e) => {
                          if (!isOpen) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredItem({
                              id: item.path,
                              top: rect.top + rect.height / 2,
                              left: rect.right + 10,
                              label: item.label,
                              badge: item.badge
                            });
                          }
                        }}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        <item.icon />
                        <NavText $isOpen={isOpen}>{item.label}</NavText>
                        {item.badge !== undefined && item.badge > 0 && (
                          <NotificationBadge count={item.badge} $isOpen={isOpen}>
                            {item.badge > 99 ? '99+' : item.badge}
                          </NotificationBadge>
                        )}
                      </NavLink>
                    </NavItem>
                  </React.Fragment>
                ))}
              </NavList>
            </NavSection>
          </Navigation>

          <UserSection $isOpen={isOpen}>
            {isOpen && (
              <UserInfo 
                $isOpen={isOpen}
              >
                <UserAvatar $isOpen={isOpen}>
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </UserAvatar>
                <UserDetails $isOpen={isOpen}>
                  <UserName>{user?.name || 'User'}</UserName>
                  <UserRole>
                    <FaUserTie style={{ fontSize: '0.7rem' }} />
                    {formatUserRole(user?.role || 'User')}
                  </UserRole>
                </UserDetails>
              </UserInfo>
            )}

            <LogoutButton 
              onClick={handleLogout} 
              $isOpen={isOpen}
              onMouseEnter={(e) => {
                if (!isOpen) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredItem({
                    id: 'logout',
                    top: rect.top + rect.height / 2,
                    left: rect.right + 10,
                    label: 'Logout'
                  });
                }
              }}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <FaSignOutAlt />
              <LogoutText $isOpen={isOpen}>Logout</LogoutText>
            </LogoutButton>
          </UserSection>
        </SidebarContent>

        {!isOpen && hoveredItem && (
          <Tooltip 
            $show={!!hoveredItem}
            $top={hoveredItem.top}
            $left={hoveredItem.left}
          >
            {hoveredItem.label}
            {hoveredItem.badge && hoveredItem.badge > 0 && ` (${hoveredItem.badge > 99 ? '99+' : hoveredItem.badge})`}
          </Tooltip>
        )}
      </SidebarContainer>
    </>
  );
};

export default Sidebar;
