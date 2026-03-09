import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signup } from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';
import { ROLE_DEFAULT_ROUTE } from '../../config/roleConfig';
   import '../../styles/Auth.css'
import { toast } from 'react-toastify';

const ROLES = [
  { value: 'salesman',     label: 'Salesman' },
  { value: 'cxp',          label: 'CXP' },
  { value: 'sales_leader', label: 'Sales Leader' },
];

const Signup = () => {
  const navigate = useNavigate();
  const { setLoggedInUser } = useAuth();

  const [form, setForm] = useState({
    firstName: '',
    lastName:  '',
    email:     '',
    password:  '',
    role:      'salesman',
  });

  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [error, setError]                     = useState('');
  const [pendingApproval, setPendingApproval] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await signup(form);

      // Salesman awaiting approval
      if (response.user?.isApproved === false) {
        setPendingApproval(true);
        return;
      }

      toast.success(response.message || 'Account created successfully');
      setLoggedInUser(response.user);
      const destination = ROLE_DEFAULT_ROUTE[response.user?.role] ?? '/';
      navigate(destination, { replace: true });
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || 'Signup failed';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Pending approval screen ─────────────────────────────────────────── */
  if (pendingApproval) {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <div className="pending-approval">
            <div className="pending-icon">⏳</div>
            <h2>Account Pending Approval</h2>
            <p>
              Your salesman account has been created and is waiting for
              approval from a sales leader Check your email.
            </p>
            <p className="pending-subtitle">
              You will be able to log in once your account has been approved.
            </p>
            <Link
              to="/login"
              className="submit-button"
              style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── Signup form ─────────────────────────────────────────────────────── */
  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <h1>Create Account</h1>
          <p>Join your CRM platform</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {/* First + Last name row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
            }}
          >
            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                name="firstName"
                placeholder="John"
                value={form.firstName}
                onChange={handleChange}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                name="lastName"
                placeholder="Doe"
                value={form.lastName}
                onChange={handleChange}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="your@email.com"
              value={form.email}
              onChange={handleChange}
              disabled={isSubmitting}
              required
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
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label>Role</label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              disabled={isSubmitting}
              className="auth-select"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* {form.role === 'salesman' && (
            <div className="auth-info-banner">
              ℹ️ Salesman accounts require approval from a sales leader before
              you can log in.
            </div>
          )} */}

          <button
            type="submit"
            disabled={isSubmitting}
            className="submit-button"
          >
            {isSubmitting ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="link-bold">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;