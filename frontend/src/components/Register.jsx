import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const Register = ({ onToggleView }) => {
  const { register, error, setError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setError(null);

    if (!username.trim() || !password || !confirmPassword) {
      setLocalError('Please fill in all fields.');
      return;
    }

    if (username.trim().length < 3) {
      setLocalError('Username must be at least 3 characters long.');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register(username, password);
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
        <p className="auth-subtitle">Create an Account to start messaging.</p>

        {displayedError && <div className="error-message">{displayedError}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="register-username">USERNAME</label>
            <input
              className="input-field"
              type="text"
              id="register-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-password">PASSWORD</label>
            <input
              className="input-field"
              type="password"
              id="register-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Choose a password (min 6 chars)"
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-confirm">CONFIRM PASSWORD</label>
            <input
              className="input-field"
              type="password"
              id="register-confirm"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              autoComplete="new-password"
            />
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Creating Account...' : 'Register Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already registered?{' '}
          <a
            className="auth-link"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setError(null);
              onToggleView();
            }}
          >
            Sign In
          </a>
        </div>
      </div>
    </div>
  );
};
