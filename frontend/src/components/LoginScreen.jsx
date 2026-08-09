import { useState } from 'react';
import { LogIn, ShieldCheck } from 'lucide-react';
import { API_URL } from '../config';
import { getApiErrorMessage } from '../utils';

export default function LoginScreen({ onLogin }) {
  const [credentials, setCredentials] = useState({ username: 'admin', password: 'admin123' });
  const [error, setError] = useState('');

  async function handleLogin(event) {
    event.preventDefault();
    setError('');

    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    const data = await response.json();

    if (!response.ok) {
      setError(getApiErrorMessage(data, 'Login failed'));
      return;
    }

    localStorage.setItem('svs_admin_token', data.token);
    localStorage.setItem('svs_admin_user', JSON.stringify(data.user));
    onLogin(data.token, data.user);
  }

  return (
    <main className="auth-page">
      <section className="login-card">
        <div className="login-identity">
          <div className="login-emblem"><ShieldCheck size={22} aria-hidden="true" /></div>
          <div>
            <p className="gov-mark">Government of Nepal</p>
            <p className="login-service">Education Record Service</p>
          </div>
        </div>
        <div className="login-intro">
          <h1>Student Record Verification System</h1>
          <p className="muted">Authorized access for Class 11/12 registration verification.</p>
        </div>
        <form className="login-form" onSubmit={handleLogin}>
          <h2>Sign in to portal</h2>
          <label>
            Username
            <input name="username" autoComplete="username" value={credentials.username} onChange={event => setCredentials({ ...credentials, username: event.target.value })} />
          </label>
          <label>
            Password
            <input name="password" autoComplete="current-password" type="password" value={credentials.password} onChange={event => setCredentials({ ...credentials, password: event.target.value })} />
          </label>
          <button className="primary-action"><LogIn size={16} aria-hidden="true" />Sign in</button>
          {error && <p className="error-message">{error}</p>}
        </form>
        <p className="login-footer">Protected education record service</p>
      </section>
    </main>
  );
}
