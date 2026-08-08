import { useState } from 'react';
import './App.css';
import AdminDashboard from './components/AdminDashboard';
import LoginScreen from './components/LoginScreen';
import StudentPortal from './components/StudentPortal';
import { getStudentTicketFromPath, getStudentTicketToken } from './utils';

function App() {
  const ticketId = getStudentTicketFromPath();
  const ticketToken = getStudentTicketToken();
  const [token, setToken] = useState(localStorage.getItem('svs_admin_token') || '');
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('svs_admin_user') || 'null');
    } catch {
      return null;
    }
  });

  if (ticketId) {
    return <StudentPortal ticketId={ticketId} ticketToken={ticketToken} />;
  }

  if (!token) {
    return <LoginScreen onLogin={(nextToken, nextUser) => {
      setToken(nextToken);
      setUser(nextUser);
    }} />;
  }

  return (
    <AdminDashboard
      token={token}
      user={user}
      onLogout={() => {
        localStorage.removeItem('svs_admin_token');
        localStorage.removeItem('svs_admin_user');
        setToken('');
        setUser(null);
      }}
    />
  );
}

export default App;
