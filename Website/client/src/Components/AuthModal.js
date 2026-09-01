import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../Context/AuthContext';
import { useAuthModal } from '../Context/AuthModalContext';
import './AuthModal.css';

function debounce(func, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
}

const emptyRegisterForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};

export default function AuthModal() {
  const { isOpen, mode, setMode, close } = useAuthModal();
  const { login } = useAuth();
  const navigate = useNavigate();

  // Login state
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Register state
  const [registerData, setRegisterData] = useState(emptyRegisterForm);
  const [registerError, setRegisterError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [passwordMatchError, setPasswordMatchError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Reset transient state whenever the modal closes, so reopening starts fresh.
  useEffect(() => {
    if (!isOpen) {
      setLoginData({ username: '', password: '' });
      setLoginError('');
      setShowPassword(false);
      setRegisterData(emptyRegisterForm);
      setRegisterError('');
      setPasswordMatchError('');
      setPasswordError('');
      setEmailError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (registerData.confirmPassword && registerData.password !== registerData.confirmPassword) {
      setPasswordMatchError('Passwords do not match');
    } else {
      setPasswordMatchError('');
    }
  }, [registerData.password, registerData.confirmPassword]);

  const checkEmailExists = debounce(async (email) => {
    if (!email) return;
    try {
      setCheckingEmail(true);
      const res = await api.get('/api/auth/check-email', { params: { email } });
      setEmailError(res.data.exists ? 'Email is already registered' : '');
    } catch (err) {
      setEmailError('Could not check email');
    } finally {
      setCheckingEmail(false);
    }
  }, 500);

  if (!isOpen) return null;

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));
    setLoginError('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const response = await api.post('/api/auth/customer/login', {
        username: loginData.username,
        password: loginData.password,
      });
      if (response.data.success) {
        if (response.data.customer) {
          login(response.data.customer, response.data.token, 'customer');
        } else if (response.data.employee) {
          login(response.data.employee, response.data.token, 'employee');
        }
        close();
        navigate('/customer-home');
      }
    } catch (err) {
      setLoginError(err.response?.data?.message || 'An error occurred during login.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterError('');
    setRegisterData((prev) => ({ ...prev, [name]: value }));

    if (name === 'email') {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(value)) {
        setEmailError('Please enter a valid email address');
      } else {
        setEmailError('');
        checkEmailExists(value);
      }
    }

    if (name === 'password') {
      const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
      setPasswordError(
        pattern.test(value)
          ? ''
          : 'Password must be at least 8 characters and include at least 1 uppercase, 1 lowercase, 1 number, and 1 symbol.'
      );
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterLoading(true);
    setRegisterError('');

    if (registerData.password !== registerData.confirmPassword) {
      setRegisterError('Passwords do not match');
      setRegisterLoading(false);
      return;
    }

    try {
      const response = await api.post('/api/auth/customer/register', {
        name: registerData.name,
        email: registerData.email,
        password: registerData.password,
      });

      if (response.data.success) {
        // Account is created and usable right away, even unverified — the OTP
        // check only happens later, at order time (not blocking here).
        localStorage.setItem('verificationEmail', registerData.email);
        login(response.data.customer, response.data.token, 'customer');
        close();
        navigate('/customer-home');
      }
    } catch (err) {
      const message = err.response?.data?.message;
      if (message === 'Email already registered') {
        setEmailError(message);
      } else {
        setRegisterError(message || 'Registration failed. Please try again.');
      }
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={close} role="presentation">
      <div className="auth-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={close} aria-label="Close dialog">
          &times;
        </button>

        <div className="auth-modal-tabs">
          <button
            type="button"
            className={`auth-modal-tab${mode === 'login' ? ' active' : ''}`}
            onClick={() => setMode('login')}
          >
            Log in
          </button>
          <button
            type="button"
            className={`auth-modal-tab${mode === 'register' ? ' active' : ''}`}
            onClick={() => setMode('register')}
          >
            Sign up
          </button>
        </div>

        {mode === 'login' ? (
          <div className="auth-modal-panel" key="login">
            <h2 className="auth-modal-title">Welcome back</h2>
            <p className="auth-modal-subtitle">Sign in to your Pensée account</p>
            {loginError && <div className="auth-modal-error">{loginError}</div>}
            <form onSubmit={handleLoginSubmit} className="auth-modal-form">
              <div className="auth-modal-field">
                <label htmlFor="am-username">Email</label>
                <input
                  type="text"
                  id="am-username"
                  name="username"
                  value={loginData.username}
                  onChange={handleLoginChange}
                  placeholder="Enter your email"
                  required
                  disabled={loginLoading}
                />
              </div>
              <div className="auth-modal-field">
                <label htmlFor="am-password">Password</label>
                <div className="auth-modal-password-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="am-password"
                    name="password"
                    value={loginData.password}
                    onChange={handleLoginChange}
                    placeholder="Enter your password"
                    required
                    disabled={loginLoading}
                  />
                  <button
                    type="button"
                    className="auth-modal-password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={loginLoading}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9.36 5.11A9.94 9.94 0 0 1 12 4.75c5 0 9 4 10.25 7.25a11.4 11.4 0 0 1-2.61 3.87M6.53 6.53C4.4 8 2.9 10 1.75 12c1.25 3.25 5.25 7.25 10.25 7.25 1.4 0 2.71-.31 3.9-.84" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1.75 12c1.25-3.25 5.25-7.25 10.25-7.25S21.25 8.75 22.25 12c-1.25 3.25-5.25 7.25-10.25 7.25S3 15.25 1.75 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="auth-modal-forgot">
                <a href="/forgot-password">Forgot password?</a>
              </div>
              <button type="submit" className="auth-modal-submit" disabled={loginLoading}>
                {loginLoading ? 'Logging in…' : 'Log in'}
              </button>
            </form>
            <p className="auth-modal-switch">
              New to Pensée?{' '}
              <button type="button" onClick={() => setMode('register')}>
                Create an account
              </button>
            </p>
          </div>
        ) : (
          <div className="auth-modal-panel" key="register">
            <h2 className="auth-modal-title">Create your account</h2>
            <p className="auth-modal-subtitle">Join Pensée Gifting Studio and start curating thoughtful gifts</p>
            {registerError && <div className="auth-modal-error">{registerError}</div>}
            <form onSubmit={handleRegisterSubmit} className="auth-modal-form auth-modal-form-scroll">
              <div className="auth-modal-field">
                <label htmlFor="am-r-name">Full name</label>
                <input
                  type="text"
                  id="am-r-name"
                  name="name"
                  value={registerData.name}
                  onChange={handleRegisterChange}
                  required
                />
              </div>

              <div className="auth-modal-field">
                <label htmlFor="am-r-email">Email</label>
                <input
                  type="email"
                  id="am-r-email"
                  name="email"
                  value={registerData.email}
                  onChange={handleRegisterChange}
                  required
                />
                {checkingEmail && <small className="auth-modal-hint">Checking email…</small>}
                {emailError && <div className="auth-modal-error">{emailError}</div>}
              </div>

              <div className="auth-modal-field">
                <label htmlFor="am-r-password">Password</label>
                <input
                  type="password"
                  id="am-r-password"
                  name="password"
                  value={registerData.password}
                  onChange={handleRegisterChange}
                  required
                />
                {passwordError && <div className="auth-modal-error">{passwordError}</div>}
              </div>

              <div className="auth-modal-field">
                <label htmlFor="am-r-confirm">Confirm password</label>
                <input
                  type="password"
                  id="am-r-confirm"
                  name="confirmPassword"
                  value={registerData.confirmPassword}
                  onChange={handleRegisterChange}
                  required
                />
                {passwordMatchError && <div className="auth-modal-error">{passwordMatchError}</div>}
              </div>

              <button type="submit" className="auth-modal-submit" disabled={registerLoading}>
                {registerLoading ? 'Creating account…' : 'Create account'}
              </button>
            </form>
            <p className="auth-modal-switch">
              Already have an account?{' '}
              <button type="button" onClick={() => setMode('login')}>
                Log in here
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
