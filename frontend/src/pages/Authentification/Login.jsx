import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';
import { ROLE_DEFAULT_ROUTE } from '../../config/roleConfig';
import '../../styles/Auth.css';

import { toast } from "react-toastify";

const Login = () => {
  const navigate      = useNavigate();
  const { setLoggedInUser } = useAuth();

  const [form, setForm]           = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pendingApproval, setPendingApproval] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await login(form); // authApi s'occupe de stocker token & refreshToken

      toast.success(response.message || "Login successful");
      // Hydrate global auth state (so DashboardLayout can read user immediately)
      setLoggedInUser(response.user);

      // Redirect to the role-specific dashboard
      const destination = ROLE_DEFAULT_ROUTE[response.user?.role] ?? '/';
      navigate(destination, { replace: true });

    } catch (error) {
      const message = error.response?.data?.message || error.message || "Login failed";
      
      // Check if this is a pending approval error
      if (error.response?.status === 403 && error.response?.data?.isApproved === false) {
        setPendingApproval(true);
      } else {
        setError(message);
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show pending approval message
  if (pendingApproval) {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <div className="pending-approval">
            <div className="pending-icon">⏳</div>
            <h2>Account Pending Approval</h2>
            <p>
              Your salesman account is waiting for approval from a sales leader.
            </p>
            <p className="pending-subtitle">
              You will receive an email notification once your account has been approved.
            </p>
            <button
              onClick={() => setPendingApproval(false)}
              className="auth-link-btn"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <h1>Welcome Back</h1>
          <p>Sign in to your CRM account</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="your@email.com"
              value={form.email}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-links">
            <Link to="/forgot-password" className="link">Forgot your password?</Link>
          </div>

          <button type="submit" disabled={isSubmitting} className="submit-button">
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/signup" className="link-bold">
              Sign up here
            </Link>
          </p>
          <p>
            <Link to="/forgot-password" className="link">
              Forgot your password?
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;