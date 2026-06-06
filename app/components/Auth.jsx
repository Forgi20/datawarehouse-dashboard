"use client";

import { useState, useEffect } from 'react';

export default function Auth({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Initialize default admin user if not present
  useEffect(() => {
    const existingUsers = localStorage.getItem('tlkm_users');
    if (!existingUsers) {
      const defaultUsers = [{ username: 'admin', password: 'admin' }];
      localStorage.setItem('tlkm_users', JSON.stringify(defaultUsers));
    }
  }, []);

  const handleToggle = () => {
    setIsLogin(!isLogin);
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    const users = JSON.parse(localStorage.getItem('tlkm_users') || '[]');

    if (isLogin) {
      // Login flow
      const user = users.find(
        (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
      );

      if (user) {
        localStorage.setItem('tlkm_logged_user', JSON.stringify({ username: user.username }));
        onLoginSuccess(user.username);
      } else {
        setError('Invalid username or password.');
      }
    } else {
      // Register flow
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      if (password.length < 4) {
        setError('Password must be at least 4 characters long.');
        return;
      }

      const userExists = users.some(
        (u) => u.username.toLowerCase() === username.toLowerCase()
      );

      if (userExists) {
        setError('Username is already taken.');
        return;
      }

      const newUser = { username, password };
      users.push(newUser);
      localStorage.setItem('tlkm_users', JSON.stringify(users));
      setSuccess('Registration successful! You can now log in.');
      
      // Auto-toggle back to login after short delay
      setTimeout(() => {
        setIsLogin(true);
        setPassword('');
        setConfirmPassword('');
        setError('');
        setSuccess('');
      }, 1500);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        
        {/* Left Side: Brand Panel */}
        <div className="auth-panel-brand">
          <div className="brand-logo-container">
            <span className="brand-badge">TLKM Stock DW</span>
            <h2>Advanced Stock Intelligence</h2>
            <p className="brand-tagline">
              Access real-time price monitoring, predictive trend modeling, and consolidated data warehouse dimensions in a singular workspace.
            </p>
          </div>
          
          <div className="brand-features-list">
            <div className="feature-item">
              <span className="feature-icon">📈</span>
              <div>
                <h4>Consolidated Analytics</h4>
                <p>Verify historical close prices, volume peaks, and 52-week ranges.</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🤖</span>
              <div>
                <h4>Trend Extrapolations</h4>
                <p>Review automated 3-day forecasting generated from recent trading runs.</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <div>
                <h4>Real-Time Sync</h4>
                <p>Enabled for auto-refreshes every 30 seconds to lock in market adjustments.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Form Panel */}
        <div className="auth-panel-form">
          <div className="form-header">
            <h3>{isLogin ? 'Sign In' : 'Create Account'}</h3>
            <p>{isLogin ? 'Enter your details to access the dashboard' : 'Sign up to configure access privileges'}</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="alert-message alert-error">{error}</div>}
            {success && <div className="alert-message alert-success">{success}</div>}

            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                className="form-input"
                placeholder="e.g. admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {!isLogin && (
              <div className="form-group">
                <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}

            <button type="submit" className="btn-primary auth-submit-btn">
              {isLogin ? 'Log In' : 'Register'}
            </button>
          </form>

          <div className="form-footer">
            <span>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button onClick={handleToggle} className="toggle-auth-btn">
              {isLogin ? 'Create one now' : 'Sign in here'}
            </button>
          </div>
          
          <div className="default-credentials-hint">
            <p>💡 Tip: Use default credentials <strong>admin / admin</strong> to test quickly.</p>
          </div>
        </div>

      </div>

      <style jsx>{`
        .auth-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: radial-gradient(circle at 10% 20%, rgba(15, 22, 38, 1) 0%, rgba(8, 12, 20, 1) 90.1%);
        }

        .auth-container {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          width: 1000px;
          min-height: 600px;
          background-color: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        @media (max-width: 868px) {
          .auth-container {
            grid-template-columns: 1fr;
            width: 480px;
          }
          .auth-panel-brand {
            display: none;
          }
        }

        /* Brand Panel Styling */
        .auth-panel-brand {
          background: linear-gradient(135deg, #0c1527 0%, #15223c 100%);
          border-right: 1px solid var(--border-color);
          padding: 48px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .brand-badge {
          background-color: var(--accent-glow);
          color: var(--accent-color-hover);
          border: 1px solid rgba(14, 165, 233, 0.3);
          padding: 4px 10px;
          font-size: 0.75rem;
          font-weight: 700;
          border-radius: 50px;
          display: inline-block;
          margin-bottom: 16px;
        }

        .auth-panel-brand h2 {
          font-size: 2rem;
          margin-bottom: 12px;
          line-height: 1.2;
          background: linear-gradient(to right, #ffffff, #94a3b8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .brand-tagline {
          color: var(--text-secondary);
          font-size: 0.95rem;
          line-height: 1.6;
        }

        .brand-features-list {
          display: flex;
          flex-direction: column;
          gap: 24px;
          margin-top: 40px;
        }

        .feature-item {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .feature-icon {
          font-size: 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          padding: 8px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
        }

        .feature-item h4 {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .feature-item p {
          font-size: 0.8rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        /* Form Panel Styling */
        .auth-panel-form {
          padding: 48px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .form-header {
          margin-bottom: 28px;
        }

        .form-header h3 {
          font-size: 1.75rem;
          margin-bottom: 8px;
        }

        .form-header p {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .auth-submit-btn {
          margin-top: 10px;
          width: 100%;
          font-size: 1rem;
        }

        .alert-message {
          padding: 12px 16px;
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .alert-error {
          background-color: var(--color-down-glow);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .alert-success {
          background-color: var(--color-up-glow);
          color: #a7f3d0;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .form-footer {
          margin-top: 24px;
          text-align: center;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .toggle-auth-btn {
          background: none;
          border: none;
          color: var(--accent-color);
          font-weight: 600;
          cursor: pointer;
          font-size: 0.85rem;
          transition: var(--transition-smooth);
          padding: 0 4px;
        }

        .toggle-auth-btn:hover {
          color: var(--accent-color-hover);
          text-decoration: underline;
        }

        .default-credentials-hint {
          margin-top: 32px;
          background-color: rgba(255, 255, 255, 0.02);
          border: 1px dashed var(--border-color);
          padding: 12px;
          border-radius: var(--radius-sm);
          text-align: center;
        }

        .default-credentials-hint p {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin: 0;
        }
      `}</style>
    </div>
  );
}
