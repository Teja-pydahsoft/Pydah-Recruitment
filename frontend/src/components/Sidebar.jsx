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
  FaCog
} from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const SidebarContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: ${props => props.$isOpen ? '300px' : '70px'};
  background: linear-gradient(180deg, #7f1d1d 0%, #431407 100%);
  color: white;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1000;
  box-shadow: 6px 0 24px rgba(127, 29, 29, 0.3);
  overflow: hidden;
  overflow-x: hidden;
  overflow-y: auto;

  @media (max-width: 768px) {
    width: ${props => props.$isOpen ? '280px' : '60px'};
    transform: ${props => props.$isOpen ? 'translateX(0)' : 'translateX(0)'};
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @media (max-width: 480px) {
    width: ${props => props.$isOpen ? '100%' : '60px'};
    transform: ${props => props.$isOpen ? 'translateX(0)' : 'translateX(0)'};
  }

  /* Custom scrollbar for sidebar */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const SidebarHeader = styled.div`
  padding: ${props => props.$isOpen ? '1.5rem' : '1rem'};
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: ${props => props.$isOpen ? 'space-between' : 'center'};
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  transition: padding 0.3s ease;
  position: relative;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  flex-shrink: 0;
  min-height: ${props => props.$isOpen ? 'auto' : '60px'};

  @media (max-width: 768px) {
    padding: ${props => props.$isOpen ? '1.25rem' : '0.75rem'};
    justify-content: center;
    min-height: 60px;
  }

  @media (max-width: 480px) {
    padding: ${props => props.$isOpen ? '1rem' : '0.75rem'};
    justify-content: center;
    min-height: 60px;
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
    transform: scale(1.05);
  }

  @media (max-width: 768px) {
    display: ${props => props.$isOpen ? 'flex' : 'none'};
  }

  @media (max-width: 480px) {
    display: ${props => props.$isOpen ? 'flex' : 'none'};
  }
`;

const LogoIcon = styled(FaUserTie)`
  font-size: 1.5rem;
  color: #f97316;
  filter: drop-shadow(0 2px 6px rgba(249, 115, 22, 0.35));
`;

const LogoText = styled.span`
  font-size: 1.1rem;
  font-weight: 700;
  white-space: nowrap;
  opacity: ${props => props.$isOpen ? 1 : 0};
  width: ${props => props.$isOpen ? 'auto' : '0'};
  overflow: hidden;
  transition: opacity 0.3s ease, width 0.3s ease;
  background: linear-gradient(135deg, #ef4444, #f97316);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const ToggleButton = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.85);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.3s ease;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: ${props => props.$isOpen ? 'static' : 'absolute'};
  left: ${props => props.$isOpen ? 'auto' : '50%'};
  top: ${props => props.$isOpen ? 'auto' : '50%'};
  transform: ${props => props.$isOpen ? 'none' : 'translate(-50%, -50%)'};
  z-index: 10;
  width: ${props => props.$isOpen ? 'auto' : '40px'};
  height: ${props => props.$isOpen ? 'auto' : '40px'};

  &:hover {
    background: rgba(255, 255, 255, 0.18);
    transform: ${props => props.$isOpen ? 'scale(1.1)' : 'translate(-50%, -50%) scale(1.1)'};
  }

  @media (max-width: 768px) {
    position: static;
    transform: none;
    width: 40px;
    height: 40px;
    margin: 0 auto;
  }

  @media (max-width: 480px) {
    position: static;
    transform: none;
    width: 40px;
    height: 40px;
    margin: 0 auto;
  }
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
  padding: ${props => props.$isOpen ? '0 1rem' : '0 0.5rem'};
  overflow-y: auto;
  overflow-x: hidden;
  transition: padding 0.3s ease;
  width: 100%;
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;

  @media (max-width: 768px) {
    padding: ${props => props.$isOpen ? '0 0.75rem' : '0 0.5rem'};
  }

  @media (max-width: 480px) {
    padding: ${props => props.$isOpen ? '0 0.75rem' : '0 0.5rem'};
  }
`;

const NavSection = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h6`
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.75rem;
  padding: 0 1rem;
  opacity: ${props => props.$isOpen ? 1 : 0};
  transition: opacity 0.3s ease;
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
  padding: ${props => props.$isOpen ? '0.875rem 1rem' : '0.875rem 0'};
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: visible;
  width: 100%;
  box-sizing: border-box;
  max-width: 100%;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
    transition: left 0.5s ease;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.18);
    color: #fff7ed;
    transform: ${props => props.$isOpen ? 'translateX(4px)' : 'scale(1.05)'};
  }

  &:hover::before {
    left: 100%;
  }

  &.active {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.35), rgba(249, 115, 22, 0.3));
    color: #fff7ed;
    border-left: ${props => props.$isOpen ? '3px solid #f97316' : 'none'};
    box-shadow: 0 6px 16px rgba(239, 68, 68, 0.3);
  }

  svg {
    font-size: ${props => props.$isOpen ? '1.1rem' : '1.25rem'};
    margin-right: ${props => props.$isOpen ? '0.75rem' : '0'};
    margin-left: ${props => props.$isOpen ? '0' : '0'};
    min-width: ${props => props.$isOpen ? '20px' : '24px'};
    width: ${props => props.$isOpen ? 'auto' : '24px'};
    text-align: center;
    transition: transform 0.3s ease, font-size 0.3s ease, margin 0.3s ease;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &:hover svg {
    transform: scale(1.15);
    color: #f97316;
  }
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
  left: ${props => props.$sidebarWidth ? `${props.$sidebarWidth + 10}px` : 'calc(100% + 10px)'};
  top: ${props => props.$top ? `${props.$top}px` : '50%'};
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  white-space: nowrap;
  opacity: ${props => props.$show ? 1 : 0};
  pointer-events: none;
  transition: opacity 0.2s ease;
  z-index: 1001;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  visibility: ${props => props.$show ? 'visible' : 'hidden'};

  &::before {
    content: '';
    position: absolute;
    right: 100%;
    top: 50%;
    transform: translateY(-50%);
    border: 6px solid transparent;
    border-right-color: rgba(0, 0, 0, 0.9);
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
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.4);
  line-height: 1;
`;

const UserSection = styled.div`
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  padding: ${props => props.$isOpen ? '1rem' : '1rem 0.5rem'};
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  transition: padding 0.3s ease;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  flex-shrink: 0;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  justify-content: ${props => props.$isOpen ? 'flex-start' : 'center'};
  gap: ${props => props.$isOpen ? '0.75rem' : '0'};
  margin-bottom: 1rem;
  padding: ${props => props.$isOpen ? '0.75rem' : '0.75rem 0'};
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  transition: all 0.3s ease;
  width: 100%;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }
`;

const UserAvatar = styled.div`
  width: ${props => props.$isOpen ? '45px' : '40px'};
  height: ${props => props.$isOpen ? '45px' : '40px'};
  border-radius: 50%;
  background: linear-gradient(135deg, #ef4444, #f97316);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${props => props.$isOpen ? '1.2rem' : '1rem'};
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(249, 115, 22, 0.35);
  position: relative;
  flex-shrink: 0;
  transition: all 0.3s ease;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    right: 0;
    width: ${props => props.$isOpen ? '12px' : '10px'};
    height: ${props => props.$isOpen ? '12px' : '10px'};
    background: #16a34a;
    border: 2px solid #431407;
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
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
  color: white;
`;

const UserRole = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  text-transform: capitalize;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const LogoutButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: ${props => props.$isOpen ? 'flex-start' : 'center'};
  padding: ${props => props.$isOpen ? '0.875rem 1rem' : '0.875rem 0'};
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #fecaca;
  text-decoration: none;
  border-radius: 12px;
  transition: all 0.3s ease;
  cursor: pointer;
  font-size: 0.9rem;
  position: relative;
  overflow: visible;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.1), transparent);
    transition: left 0.5s ease;
  }

  &:hover {
    background: rgba(239, 68, 68, 0.25);
    color: #fff5f5;
    transform: ${props => props.$isOpen ? 'translateX(4px)' : 'scale(1.05)'};
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }

  &:hover::before {
    left: 100%;
  }

  svg {
    font-size: ${props => props.$isOpen ? '1rem' : '1.1rem'};
    margin-right: ${props => props.$isOpen ? '0.75rem' : '0'};
    margin-left: ${props => props.$isOpen ? '0' : '0'};
    min-width: ${props => props.$isOpen ? '16px' : '20px'};
    width: ${props => props.$isOpen ? 'auto' : '20px'};
    transition: transform 0.3s ease, margin 0.3s ease;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &:hover svg {
    transform: scale(1.15);
  }
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
  }, [user]);

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
                {currentNavItems.map((item) => (
                  <NavItem key={item.path} $isOpen={isOpen}>
                    <NavLink
                      to={item.path}
                      className={location.pathname === item.path ? 'active' : ''}
                      $isOpen={isOpen}
                      onMouseEnter={() => !isOpen && setHoveredItem(item.path)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <item.icon />
                      <NavText $isOpen={isOpen}>{item.label}</NavText>
                      {!isOpen && (
                        <Tooltip 
                          $show={hoveredItem === item.path}
                          $sidebarWidth={isOpen ? 300 : 70}
                        >
                          {item.label}
                          {item.badge && item.badge > 0 && ` (${item.badge > 99 ? '99+' : item.badge})`}
                        </Tooltip>
                      )}
                      {item.badge !== undefined && item.badge > 0 && (
                        <NotificationBadge count={item.badge} $isOpen={isOpen}>
                          {item.badge > 99 ? '99+' : item.badge}
                        </NotificationBadge>
                      )}
                    </NavLink>
                  </NavItem>
                ))}
              </NavList>
            </NavSection>
          </Navigation>

          <UserSection $isOpen={isOpen}>
            <UserInfo 
              $isOpen={isOpen}
              onMouseEnter={() => !isOpen && setHoveredItem('user')}
              onMouseLeave={() => setHoveredItem(null)}
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
              {!isOpen && (
                <Tooltip $show={hoveredItem === 'user'}>
                  {user?.name || 'User'}
                </Tooltip>
              )}
            </UserInfo>


            <LogoutButton 
              onClick={handleLogout} 
              $isOpen={isOpen}
              onMouseEnter={() => !isOpen && setHoveredItem('logout')}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <FaSignOutAlt />
              <LogoutText $isOpen={isOpen}>Logout</LogoutText>
              {!isOpen && (
                <Tooltip $show={hoveredItem === 'logout'}>
                  Logout
                </Tooltip>
              )}
            </LogoutButton>
          </UserSection>
        </SidebarContent>
      </SidebarContainer>
    </>
  );
};

export default Sidebar;
