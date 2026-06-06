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
      {/* Decorative ambient glowing blur blobs */}
      <div className="ambient-blob blob-1"></div>
      <div className="ambient-blob blob-2"></div>

      <div className="auth-container">
        
        {/* Left Side: Brand Panel */}
        <div className="auth-panel-brand">
          <div className="brand-logo-container">
            <span className="brand-badge">TLKM Stock DW</span>
            <h2>Advanced Stock Intelligence</h2>
            <p className="brand-tagline">
              Pantau pergerakan harga saham, analisis MA7 & MA30, visualisasi bulanan, dan ramalkan harga penutupan dengan model Machine Learning otomatis.
            </p>
          </div>
          
          <div className="brand-features-list">
            <div className="feature-item">
              <span className="feature-icon">📈</span>
              <div>
                <h4>Konektivitas Data Warehouse</h4>
                <p>Verifikasi harga historis, volume puncak, dan rentang 52 minggu secara terpusat.</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🤖</span>
              <div>
                <h4>Prediksi Algoritma ML</h4>
                <p>Uji keandalan model regresi SVM, MLP Neural Network, dan XGBoost.</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <div>
                <h4>Sinkronisasi Cepat</h4>
                <p>Sistem ETL mini memperbarui feed harga simulasi secara berkala.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Form Panel */}
        <div className="auth-panel-form">
          <div className="form-header">
            <h3>{isLogin ? 'Sign In' : 'Create Account'}</h3>
            <p>{isLogin ? 'Masukkan kredensial Anda untuk masuk ke sistem' : 'Daftar akun untuk mengonfigurasi privilese akses'}</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="alert-message alert-error">⚠️ {error}</div>}
            {success && <div className="alert-message alert-success">✅ {success}</div>}

            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                className="form-input"
                placeholder="Username admin"
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
              {isLogin ? 'Masuk' : 'Daftar Sekarang'}
            </button>
          </form>

          <div className="form-footer">
            <span>
              {isLogin ? "Belum punya akun? " : "Sudah punya akun? "}
            </span>
            <button onClick={handleToggle} className="toggle-auth-btn">
              {isLogin ? 'Buat baru di sini' : 'Masuk di sini'}
            </button>
          </div>
          
          <div className="default-credentials-hint">
            <p>💡 Petunjuk: Gunakan kredensial default <strong>admin / admin</strong> untuk uji coba cepat.</p>
          </div>
        </div>

      </div>

      <style jsx>{`
        .auth-wrapper {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background-color: #030712;
          background: radial-gradient(circle at 50% 50%, #1e1b4b 0%, #030712 100%);
          overflow: hidden;
        }

        .ambient-blob {
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.12;
          pointer-events: none;
          z-index: 0;
        }

        .blob-1 {
          background: #0ea5e9;
          top: -10%;
          left: 10%;
        }

        .blob-2 {
          background: #8b5cf6;
          bottom: -10%;
          right: 10%;
        }

        .auth-container {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          width: 1050px;
          min-height: 640px;
          background: rgba(15, 23, 42, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.8), inset 0 1px 1px 0 rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }

        @media (max-width: 900px) {
          .auth-container {
            grid-template-columns: 1fr;
            width: 480px;
            min-height: auto;
          }
          .auth-panel-brand {
            display: none;
          }
        }

        /* Brand Panel Styling */
        .auth-panel-brand {
          background: linear-gradient(135deg, rgba(12, 21, 39, 0.5) 0%, rgba(21, 34, 60, 0.2) 100%);
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          padding: 56px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .brand-badge {
          background-color: rgba(14, 165, 233, 0.15);
          color: var(--accent-color-hover);
          border: 1px solid rgba(14, 165, 233, 0.25);
          padding: 6px 14px;
          font-size: 0.75rem;
          font-weight: 700;
          border-radius: 50px;
          display: inline-block;
          margin-bottom: 24px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .auth-panel-brand h2 {
          font-size: 2.25rem;
          font-weight: 800;
          margin-bottom: 16px;
          line-height: 1.25;
          letter-spacing: -0.03em;
          background: linear-gradient(to right, #ffffff, #9ca3af);
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
          gap: 28px;
          margin-top: 48px;
        }

        .feature-item {
          display: flex;
          gap: 20px;
          align-items: flex-start;
        }

        .feature-icon {
          font-size: 1.6rem;
          background: rgba(255, 255, 255, 0.03);
          padding: 10px;
          border-radius: var(--radius-sm);
          border: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition-smooth);
        }
        
        .feature-item:hover .feature-icon {
          background: rgba(14, 165, 233, 0.1);
          border-color: rgba(14, 165, 233, 0.3);
          transform: scale(1.05);
        }

        .feature-item h4 {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 6px;
        }

        .feature-item p {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.45;
        }

        /* Form Panel Styling */
        .auth-panel-form {
          padding: 56px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .form-header {
          margin-bottom: 32px;
        }

        .form-header h3 {
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: 8px;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #ffffff 30%, #9ca3af 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .form-header p {
          font-size: 0.88rem;
          color: var(--text-secondary);
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-label {
          margin-bottom: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .form-input {
          width: 100%;
          padding: 12px 16px;
          background-color: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-sm);
          color: var(--text-primary);
          font-family: var(--font-sans);
          font-size: 0.9rem;
          transition: var(--transition-smooth);
        }
        
        .form-input:focus {
          outline: none;
          background-color: rgba(255, 255, 255, 0.05);
          border-color: var(--accent-color);
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
        }

        .auth-submit-btn {
          margin-top: 12px;
          width: 100%;
          padding: 14px;
          font-size: 1rem;
          font-weight: 700;
        }

        .alert-message {
          padding: 14px 18px;
          border-radius: var(--radius-sm);
          font-size: 0.88rem;
          font-weight: 600;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .alert-error {
          background-color: rgba(244, 63, 94, 0.12);
          color: #fca5a5;
          border: 1px solid rgba(244, 63, 94, 0.25);
        }

        .alert-success {
          background-color: rgba(16, 185, 129, 0.12);
          color: #a7f3d0;
          border: 1px solid rgba(16, 185, 129, 0.25);
        }

        .form-footer {
          margin-top: 28px;
          text-align: center;
          font-size: 0.88rem;
          color: var(--text-secondary);
        }

        .toggle-auth-btn {
          background: none;
          border: none;
          color: var(--accent-color);
          font-weight: 700;
          cursor: pointer;
          font-size: 0.88rem;
          transition: var(--transition-smooth);
          padding: 0 4px;
        }

        .toggle-auth-btn:hover {
          color: var(--accent-color-hover);
          text-decoration: underline;
        }

        .default-credentials-hint {
          margin-top: 36px;
          background-color: rgba(255, 255, 255, 0.02);
          border: 1px dashed rgba(255, 255, 255, 0.08);
          padding: 14px;
          border-radius: var(--radius-sm);
          text-align: center;
        }

        .default-credentials-hint p {
          font-size: 0.78rem;
          color: var(--text-secondary);
          margin: 0;
        }
      `}</style>
    </div>
  );
}
