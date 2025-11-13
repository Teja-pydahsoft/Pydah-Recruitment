import React from 'react';
import { Navbar, Nav, NavDropdown, Container } from 'react-bootstrap';
import { FaUser, FaCog, FaSignOutAlt, FaUserTie, FaUsers, FaFileAlt, FaClipboardList, FaCalendarAlt, FaUserShield } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Navbar.css';

const NavigationBar = () => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardPath = () => {
    switch (user?.role) {
      case 'super_admin':
        return '/super-admin';
      case 'sub_admin':
        return '/sub-admin';
      case 'panel_member':
        return '/panel-member';
      case 'candidate':
        return '/candidate';
      default:
        return '/';
    }
  };

  return (
    <Navbar expand="lg" className="mb-4 shadow">
      <Container>
        <Navbar.Brand href={getDashboardPath()} className="d-flex align-items-center">
          <FaUserTie className="me-2 text-primary" size={24} />
          <span className="fw-bold">Staff Recruitment System</span>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link href={getDashboardPath()} className="d-flex align-items-center">
              <FaUserTie className="me-2" size={16} />
              Dashboard
            </Nav.Link>

            {user?.role === 'super_admin' && (
              <>
                <Nav.Link href="/super-admin/creation" className="d-flex align-items-center">
                  <FaFileAlt className="me-2" size={16} />
                  Form Creation
                </Nav.Link>
                <Nav.Link href="/super-admin/candidates" className="d-flex align-items-center">
                  <FaUsers className="me-2" size={16} />
                  Candidate Management
                </Nav.Link>
                <Nav.Link href="/super-admin/tests" className="d-flex align-items-center">
                  <FaClipboardList className="me-2" size={16} />
                  Test Management
                </Nav.Link>
                <Nav.Link href="/super-admin/users" className="d-flex align-items-center">
                  <FaUserTie className="me-2" size={16} />
                  Panel Members
                </Nav.Link>
                <Nav.Link href="/super-admin/sub-admins" className="d-flex align-items-center">
                  <FaUserShield className="me-2" size={16} />
                  Sub Admins
                </Nav.Link>
                <Nav.Link href="/super-admin/interviews" className="d-flex align-items-center">
                  <FaCalendarAlt className="me-2" size={16} />
                  Interview Management
                </Nav.Link>
              </>
            )}

            {user?.role === 'panel_member' && (
              <>
                <Nav.Link href="/panel-member/interviews" className="d-flex align-items-center">
                  <FaCalendarAlt className="me-2" size={16} />
                  My Interviews
                </Nav.Link>
              </>
            )}

            {user?.role === 'sub_admin' && (
              <>
                <Nav.Link href="/sub-admin" className="d-flex align-items-center">
                  <FaUserTie className="me-2" size={16} />
                  Dashboard
                </Nav.Link>
                {hasPermission('forms.manage') && (
                  <Nav.Link href="/sub-admin/forms" className="d-flex align-items-center">
                    <FaFileAlt className="me-2" size={16} />
                    Forms
                  </Nav.Link>
                )}
                {hasPermission('forms.manage') && (
                  <Nav.Link href="/sub-admin/submissions" className="d-flex align-items-center">
                    <FaFileAlt className="me-2" size={16} />
                    Submissions
                  </Nav.Link>
                )}
                {hasPermission('candidates.manage') && (
                  <Nav.Link href="/sub-admin/candidates" className="d-flex align-items-center">
                    <FaUsers className="me-2" size={16} />
                    Candidates
                  </Nav.Link>
                )}
                {hasPermission('tests.manage') && (
                  <Nav.Link href="/sub-admin/tests" className="d-flex align-items-center">
                    <FaClipboardList className="me-2" size={16} />
                    Tests
                  </Nav.Link>
                )}
                {hasPermission('interviews.manage') && (
                  <Nav.Link href="/sub-admin/interviews" className="d-flex align-items-center">
                    <FaCalendarAlt className="me-2" size={16} />
                    Interviews
                  </Nav.Link>
                )}
                {hasPermission('users.manage') && (
                  <Nav.Link href="/sub-admin/users" className="d-flex align-items-center">
                    <FaUserShield className="me-2" size={16} />
                    Panel Members
                  </Nav.Link>
                )}
              </>
            )}

            {user?.role === 'candidate' && (
              <>
                <Nav.Link href="/candidate/profile" className="d-flex align-items-center">
                  <FaUser className="me-2" size={16} />
                  My Profile
                </Nav.Link>
                <Nav.Link href="/candidate/tests" className="d-flex align-items-center">
                  <FaClipboardList className="me-2" size={16} />
                  My Tests
                </Nav.Link>
              </>
            )}
          </Nav>

          <Nav>
            <NavDropdown
              title={
                <span className="d-flex align-items-center">
                  <FaUser className="me-2" size={16} />
                  <span className="d-none d-sm-inline">{user?.name}</span>
                </span>
              }
              id="user-dropdown"
              align="end"
              className="border-0"
            >
              <NavDropdown.Item href={`${getDashboardPath()}/profile`} className="d-flex align-items-center">
                <FaUser className="me-2" size={14} />
                Profile
              </NavDropdown.Item>
              <NavDropdown.Item href={`${getDashboardPath()}/settings`} className="d-flex align-items-center">
                <FaCog className="me-2" size={14} />
                Settings
              </NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={handleLogout} className="d-flex align-items-center text-danger">
                <FaSignOutAlt className="me-2" size={14} />
                Logout
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default NavigationBar;
