import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const Login = ({ onToggleView }) => {
  const { login, error, setError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setError(null);

    if (!username.trim() || !password) {
      setLocalError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      // Error is set in context
    } finally {
      setLoading(false);
    }
  };

  const displayedError = localError || error;

  return (
    <div className="auth-container">
      <div className="auth-card glass-panel">
        <h1 className="auth-logo">ChatConnect</h1>
        <p className="auth-subtitle">Welcome back! Sign in to keep talking.</p>

        {displayedError && <div className="error-message">{displayedError}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-username">USERNAME</label>
            <input
              className="input-field"
              type="text"
              id="login-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">PASSWORD</label>
            <input
              className="input-field"
              type="password"
              id="login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{' '}
          <a
            className="auth-link"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setError(null);
              onToggleView();
            }}
          >
            Sign Up
          </a>
        </div>
      </div>
    </div>
  );
};
