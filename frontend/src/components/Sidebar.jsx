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
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1000;
  box-shadow: 6px 0 24px rgba(127, 29, 29, 0.3);
  overflow: hidden;

  @media (max-width: 768px) {
    width: ${props => props.$isOpen ? '280px' : '0'};
  }
`;

const SidebarHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: ${props => props.$isOpen ? 'space-between' : 'center'};
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: transform 0.3s ease;

  &:hover {
    transform: scale(1.05);
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
  transition: opacity 0.3s ease;
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

  &:hover {
    background: rgba(255, 255, 255, 0.18);
    transform: scale(1.1);
  }
`;

const SidebarContent = styled.div`
  padding: 1rem 0;
  height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
`;

const Navigation = styled.nav`
  flex: 1;
  padding: 0 1rem;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
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
`;

const NavItem = styled.li`
  margin-bottom: 0.25rem;
  position: relative;

  &:hover {
    transform: translateX(2px);
  }
`;

const NavLink = styled(Link)`
  display: flex;
  align-items: center;
  padding: 0.875rem 1rem;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

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
    transform: translateX(4px);
  }

  &:hover::before {
    left: 100%;
  }

  &.active {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.35), rgba(249, 115, 22, 0.3));
    color: #fff7ed;
    border-left: 3px solid #f97316;
    box-shadow: 0 6px 16px rgba(239, 68, 68, 0.3);
  }

  svg {
    font-size: 1.1rem;
    margin-right: ${props => props.$isOpen ? '0.75rem' : '0'};
    min-width: 20px;
    text-align: center;
    transition: transform 0.3s ease;
  }

  &:hover svg {
    transform: scale(1.1);
    color: #f97316;
  }
`;

const NavText = styled.span`
  opacity: ${props => props.$isOpen ? 1 : 0};
  transition: opacity 0.3s ease;
  white-space: nowrap;
  font-weight: 500;
`;

const NotificationBadge = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  background: #ef4444;
  color: white;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.2rem 0.4rem;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
  opacity: ${props => props.count > 0 ? 1 : 0};
  transition: opacity 0.3s ease;
`;

const UserSection = styled.div`
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.75rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  transition: background 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }
`;

const UserAvatar = styled.div`
  width: 45px;
  height: 45px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ef4444, #f97316);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(249, 115, 22, 0.35);
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    right: 0;
    width: 12px;
    height: 12px;
    background: #16a34a;
    border: 2px solid #431407;
    border-radius: 50%;
  }
`;

const UserDetails = styled.div`
  opacity: ${props => props.$isOpen ? 1 : 0};
  transition: opacity 0.3s ease;
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
  padding: 0.875rem 1rem;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #fecaca;
  text-decoration: none;
  border-radius: 12px;
  transition: all 0.3s ease;
  cursor: pointer;
  font-size: 0.9rem;
  position: relative;
  overflow: hidden;

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
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }

  &:hover::before {
    left: 100%;
  }

  svg {
    font-size: 1rem;
    margin-right: ${props => props.$isOpen ? '0.75rem' : '0'};
    min-width: 16px;
    transition: transform 0.3s ease;
  }

  &:hover svg {
    transform: scale(1.1);
  }
`;

const LogoutText = styled.span`
  opacity: ${props => props.$isOpen ? 1 : 0};
  transition: opacity 0.3s ease;
  font-weight: 500;
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

  useEffect(() => {
    if (user?.role === 'panel_member') {
      fetchNotifications();
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigationItems = {
    super_admin: [
      { path: '/super-admin', icon: FaUserTie, label: 'Dashboard' },
      { path: '/super-admin/creation', icon: FaFileAlt, label: 'Form Creation' },
      { path: '/super-admin/submissions', icon: FaFileAlt, label: 'Form Submissions' },
      { path: '/super-admin/tests', icon: FaClipboardList, label: 'Test Management' },
      { path: '/super-admin/users', icon: FaUserTie, label: 'Panel Members' },
      { path: '/super-admin/sub-admins', icon: FaUserShield, label: 'Sub Admins' },
      { path: '/super-admin/interviews', icon: FaCalendarAlt, label: 'Interview Management' },
      { path: '/super-admin/candidates', icon: FaUsers, label: 'Candidate Management' },
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
    { path: '/sub-admin/forms', icon: FaFileAlt, label: 'Forms', permission: 'forms.manage' },
    { path: '/sub-admin/submissions', icon: FaFileAlt, label: 'Submissions', permission: 'forms.manage' },
    { path: '/sub-admin/candidates', icon: FaUsers, label: 'Candidates', permission: 'candidates.manage' },
    { path: '/sub-admin/tests', icon: FaClipboardList, label: 'Tests', permission: 'tests.manage' },
    { path: '/sub-admin/interviews', icon: FaCalendarAlt, label: 'Interview Management', permission: 'interviews.manage' },
    { path: '/sub-admin/users', icon: FaUserTie, label: 'Panel Members', permission: 'users.manage' },
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
          <Logo>
            <LogoIcon />
            <LogoText $isOpen={isOpen}>SRS</LogoText>
          </Logo>
          <ToggleButton onClick={toggleSidebar}>
            {isOpen ? <FaTimes /> : <FaBars />}
          </ToggleButton>
        </SidebarHeader>

        <SidebarContent>
          <Navigation>
            <NavSection>
              <SectionTitle $isOpen={isOpen}>Navigation</SectionTitle>
              <NavList>
                {currentNavItems.map((item) => (
                  <NavItem key={item.path}>
                    <NavLink
                      to={item.path}
                      className={location.pathname === item.path ? 'active' : ''}
                      $isOpen={isOpen}
                    >
                      <item.icon />
                      <NavText $isOpen={isOpen}>{item.label}</NavText>
                      {item.badge && item.badge > 0 && (
                        <NotificationBadge count={item.badge}>
                          {item.badge > 99 ? '99+' : item.badge}
                        </NotificationBadge>
                      )}
                    </NavLink>
                  </NavItem>
                ))}
              </NavList>
            </NavSection>
          </Navigation>

          <UserSection>
            <UserInfo>
              <UserAvatar>
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


            <LogoutButton onClick={handleLogout} $isOpen={isOpen}>
              <FaSignOutAlt />
              <LogoutText $isOpen={isOpen}>Logout</LogoutText>
            </LogoutButton>
          </UserSection>
        </SidebarContent>
      </SidebarContainer>
    </>
  );
};

export default Sidebar;
