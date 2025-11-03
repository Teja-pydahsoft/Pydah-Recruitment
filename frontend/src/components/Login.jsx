import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Modern Color Palette
const colors = {
  primary: '#4f46e5',          // Indigo-600
  primaryHover: '#4338ca',     // Indigo-700
  primaryLight: '#6366f1',     // Indigo-500
  secondary: '#64748b',        // Slate-500
  secondaryHover: '#475569',   // Slate-600
  accent: '#0ea5e9',           // Sky-500
  success: '#10b981',          // Emerald-500
  warning: '#f59e0b',          // Amber-500
  error: '#ef4444',            // Red-500
  background: '#f8fafc',       // Slate-50
  surface: '#ffffff',          // White
  surfaceLight: '#f1f5f9',     // Slate-100
  textPrimary: '#0f172a',      // Slate-900
  textSecondary: '#475569',    // Slate-600
  textMuted: '#64748b',        // Slate-500
  borderLight: '#e2e8f0',      // Slate-200
  borderMedium: '#cbd5e1',     // Slate-300
  overlay: 'rgba(15, 23, 42, 0.6)', // Slate-900 with opacity
};

// Shadow System
const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
};

// Border Radius System
const borderRadius = {
  sm: '0.375rem',    // 6px
  md: '0.5rem',      // 8px
  lg: '0.75rem',     // 12px
  xl: '1rem',        // 16px
  '2xl': '1.5rem',   // 24px
  full: '9999px',
};

// Animation Keyframes
const slideUp = keyframes`
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
`;

const fadeIn = keyframes`
  0% { opacity: 0; }
  100% { opacity: 1; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
`;


// Styled Components
const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, ${colors.background} 0%, ${colors.surfaceLight} 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23${colors.primary.replace('#', '')}' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    opacity: 1;
  }

  @media (max-width: 640px) {
    padding: 0.5rem;
  }

  @media (prefers-reduced-motion: reduce) {
    &::before {
      animation: none;
    }
  }
`;

const Card = styled.div`
  background: ${colors.surface};
  border-radius: ${borderRadius['2xl']};
  box-shadow: ${shadows['2xl']};
  overflow: hidden;
  width: 100%;
  max-width: 400px;
  position: relative;
  z-index: 10;
  border: 1px solid ${colors.borderLight};
  animation: ${slideUp} 0.6s cubic-bezier(0.4, 0, 0.2, 1);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, ${colors.primary} 0%, ${colors.accent} 100%);
  }

  &:hover {
    box-shadow: ${shadows['2xl']}, 0 0 40px rgba(79, 70, 229, 0.15);
    transform: translateY(-2px);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @media (max-width: 640px) {
    max-width: 100%;
    border-radius: ${borderRadius.xl};
  }
`;

const Header = styled.div`
  padding: 2.5rem 2rem 2rem;
  text-align: center;
  background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryHover} 100%);
  color: ${colors.surface};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
    animation: ${float} 6s ease-in-out infinite;
  }

  @media (max-width: 640px) {
    padding: 2rem 1.5rem 1.5rem;
  }
`;

const Logo = styled.div`
  width: 64px;
  height: 64px;
  margin: 0 auto 1.5rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: ${borderRadius.xl};
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  max-width: 64px;
  max-height: 64px;

  svg {
    width: 32px;
    height: 32px;
    color: ${colors.surface};
    max-width: 32px;
    max-height: 32px;
  }

  &:hover {
    animation: ${pulse} 2s infinite;
    transform: scale(1.05);
  }
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  position: relative;
  z-index: 1;
  letter-spacing: -0.025em;

  @media (max-width: 640px) {
    font-size: 1.25rem;
  }
`;

const Subtitle = styled.p`
  font-size: 0.95rem;
  margin: 0;
  opacity: 0.9;
  position: relative;
  z-index: 1;
`;

const Body = styled.div`
  padding: 2.5rem 2rem 2rem;

  @media (max-width: 640px) {
    padding: 2rem 1.5rem;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${colors.textPrimary};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const InputIcon = styled.div`
  color: ${colors.secondary};
  width: 16px;
  height: 16px;

  svg {
    width: 100%;
    height: 100%;
  }
`;

const Input = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 0.75rem 1rem;
  border: 1.5px solid ${colors.borderMedium};
  border-radius: ${borderRadius.lg};
  font-size: 0.875rem;
  background: ${colors.surface};
  color: ${colors.textPrimary};
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;

  &::placeholder {
    color: ${colors.textMuted};
  }

  &:focus {
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
    transform: translateY(-1px);
  }

  &:hover {
    border-color: ${colors.secondary};
  }

  &:disabled {
    background: ${colors.surfaceLight};
    color: ${colors.textMuted};
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    padding: 0.75rem;
  }
`;

const PasswordContainer = styled.div`
  position: relative;
  width: 100%;
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: ${colors.secondary};
  cursor: pointer;
  padding: 0.25rem;
  border-radius: ${borderRadius.sm};
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    color: ${colors.primary};
    background: rgba(79, 70, 229, 0.1);
    transform: translateY(-50%) scale(1.1);
  }

  &:focus {
    outline: 2px solid ${colors.primary};
    outline-offset: 2px;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const Alert = styled.div`
  padding: 1rem;
  border-radius: ${borderRadius.lg};
  border: 1px solid;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  animation: ${fadeIn} 0.3s ease-out;

  &.error {
    background: rgba(239, 68, 68, 0.05);
    border-color: rgba(239, 68, 68, 0.2);
    color: ${colors.error};
  }
`;

const AlertIconContainer = styled.div`
  width: 16px;
  height: 16px;
  flex-shrink: 0;

  svg {
    width: 100%;
    height: 100%;
  }
`;

const Button = styled.button`
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: ${borderRadius.lg};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }

  &:focus {
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.3);
  }

  &.primary {
    background: ${colors.primary};
    color: ${colors.surface};

    &:hover:not(:disabled) {
      background: ${colors.primaryHover};
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(79, 70, 229, 0.4);
    }

    &:active {
      transform: translateY(-1px);
    }
  }

  &.loading {
    background: ${colors.secondary};
    cursor: wait;

    &:hover {
      background: ${colors.secondary};
      transform: none;
    }
  }
`;

const ButtonIcon = styled.div`
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 100%;
    height: 100%;
  }
`;

const Spinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid ${colors.surface};
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;


const BackgroundElements = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
`;

const FloatingElement = styled.div`
  position: absolute;
  border-radius: 50%;
  background: rgba(79, 70, 229, 0.1);
  animation: ${float} 6s ease-in-out infinite;

  &.element-1 {
    width: 80px;
    height: 80px;
    top: 20%;
    left: 10%;
    animation-delay: 0s;
  }

  &.element-2 {
    width: 120px;
    height: 120px;
    top: 60%;
    right: 10%;
    animation-delay: 2s;
  }

  &.element-3 {
    width: 60px;
    height: 60px;
    bottom: 20%;
    left: 20%;
    animation-delay: 4s;
  }
`;

// SVG Icons
const UserIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const LockIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="m7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const SignInIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <path d="M10 17l5-5-5-5" />
    <path d="M15 12H3" />
  </svg>
);

const EyeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m15 18-.722-3.25" />
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
    <path d="m2 2 20 20" />
    <path d="m6.712 6.722-4.391 4.391" />
  </svg>
);

const AlertIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="m12 17 .01 0" />
  </svg>
);

// Main Component
const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        navigate('/');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <BackgroundElements>
        <FloatingElement className="element-1" />
        <FloatingElement className="element-2" />
        <FloatingElement className="element-3" />
      </BackgroundElements>

      <Card>
        <Header>
          <Logo>
            <UserIcon />
          </Logo>
          <Title>Faculty Recruitment System</Title>
          <Subtitle>Please sign in to continue</Subtitle>
        </Header>

        <Body>
          <Form onSubmit={handleSubmit}>
            {error && (
              <Alert className="error">
                <AlertIconContainer>
                  <AlertIcon />
                </AlertIconContainer>
                {error}
              </Alert>
            )}

            <InputGroup>
              <Label htmlFor="email">
                <InputIcon>
                  <UserIcon />
                </InputIcon>
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email address"
                required
                disabled={loading}
              />
            </InputGroup>

            <InputGroup>
              <Label htmlFor="password">
                <InputIcon>
                  <LockIcon />
                </InputIcon>
                Password
              </Label>
              <PasswordContainer>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
                <PasswordToggle
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </PasswordToggle>
              </PasswordContainer>
            </InputGroup>

            <Button
              type="submit"
              className={loading ? 'loading' : 'primary'}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner />
                  Signing in...
                </>
              ) : (
                <>
                  <ButtonIcon>
                    <SignInIcon />
                  </ButtonIcon>
                  Sign In
                </>
              )}
            </Button>
          </Form>
        </Body>
      </Card>
    </Container>
  );
};

export default Login;
