import { useState } from 'react';
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
        <p className="gov-mark">Government Registration Verification Portal</p>
        <h1>Student Record Verification System</h1>
        <p className="muted">Role-based access for Class 11/12 registration screening.</p>
        <form onSubmit={handleLogin}>
          <label>
            Username
            <input value={credentials.username} onChange={event => setCredentials({ ...credentials, username: event.target.value })} />
          </label>
          <label>
            Password
            <input type="password" value={credentials.password} onChange={event => setCredentials({ ...credentials, password: event.target.value })} />
          </label>
          <button className="primary-action">Sign in</button>
          {error && <p className="error-message">{error}</p>}
        </form>
      </section>
    </main>
  );
}
