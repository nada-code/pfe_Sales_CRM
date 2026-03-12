import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../../api/authApi';
import '../../styles/Auth.css';
import { toast } from "react-toastify";

const AnimatedBg = () => (
  <>
    <div className="auth-bg-layer" />
    <div className="auth-grid-overlay" />
    <div className="auth-rays" />
    <div className="auth-particles">
      {Array.from({ length: 12 }).map((_, i) => <span key={i} />)}
    </div>
  </>
);

const ForgetPassword = () => {
  const [form, setForm] = useState({ email: '' });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await forgotPassword(form);
      toast.success(response.message || "Reset link sent successfully");
      setSubmitted(true);
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Server error";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="auth-container">
        <AnimatedBg />
        <div className="auth-box">
          <div className="auth-header">
            <h1>Check Your Email</h1>
          </div>
          <div className="auth-footer">
            <p>
              Remember your password?{' '}
              <Link to="/login" className="link-bold">Sign in instead</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <AnimatedBg />
      <div className="auth-box">
        <div className="auth-header">
          <h1>Reset Your Password</h1>
          <p>Enter your email to receive a password reset link</p>
        </div>

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

          <button type="submit" disabled={isSubmitting} className="submit-button">
            {isSubmitting ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Remember your password?{' '}
            <Link to="/login" className="link-bold">Sign in instead</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgetPassword;