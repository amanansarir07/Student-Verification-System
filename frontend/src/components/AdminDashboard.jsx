import { useEffect, useMemo, useState } from 'react';
import { API_URL } from '../config';
import { emptyRecord } from '../constants';
import { getApiErrorMessage } from '../utils';
import AuditTrail from './AuditTrail';
import BoardDispatch from './BoardDispatch';
import CaseReview from './CaseReview';
import DashboardTables from './DashboardTables';
import RegistrationEntry from './RegistrationEntry';
import StatusBadge from './StatusBadge';
import { Metric, OfficialState, PanelTitle } from './shared';

export default function AdminDashboard({ token, user, onLogout }) {
  const [dashboard, setDashboard] = useState(null);
  const [record, setRecord] = useState(emptyRecord);
  const [selectedCase, setSelectedCase] = useState(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [notice, setNotice] = useState('');
  const [submissionReceipt, setSubmissionReceipt] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  async function api(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...authHeaders,
        ...(options.headers || {})
      }
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(getApiErrorMessage(data));
    }

    return data;
  }

  async function loadDashboard() {
    setIsLoading(true);
    try {
      const data = await api('/dashboard');
      setDashboard(data);
      if (!selectedCase && data.cases.length) {
        setSelectedCase(data.cases[0]);
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    async function initialLoad() {
      try {
        const data = await fetch(`${API_URL}/dashboard`, {
          headers: authHeaders
        }).then(response => response.json().then(body => {
          if (!response.ok) throw new Error(getApiErrorMessage(body));
          return body;
        }));

        setDashboard(data);
        if (data.cases.length) {
          setSelectedCase(data.cases[0]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    initialLoad();
  }, [authHeaders]);

  async function submitRecord(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmissionReceipt(null);
    setIsSubmitting(true);

    try {
      const result = await api('/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      setNotice(result.status === 'approved'
        ? 'Record matched 100% and was sent to board dispatch.'
        : `Mismatch flagged. Student SMS link generated for ticket ${result.ticket_id}.`);
      setSubmissionReceipt({
        type: 'single',
        title: 'Registration submitted',
        mode: 'Individual entry',
        submittedAt: new Date().toISOString(),
        imported: 1,
        approved: result.status === 'approved' ? 1 : 0,
        flagged: result.status === 'flagged' ? 1 : 0,
        skipped: 0,
        reference: result.ticket_id || result.submission_id,
        studentName: result.submitted?.name_en || record.name_en || 'Student record',
        message: result.status === 'approved'
          ? 'The record matched the official master record and was dispatched for board submission.'
          : 'The record needs review. A correction ticket with SMS and Gmail notification messages has been prepared.'
      });
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function uploadCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setError('');
    setNotice('');
    setSubmissionReceipt(null);
    setIsSubmitting(true);

    try {
      const result = await api('/submissions/bulk', {
        method: 'POST',
        body: formData
      });
      setNotice('Bulk registration file submitted and verified.');
      setSubmissionReceipt({
        type: 'bulk',
        title: 'Bulk upload processed',
        mode: 'Bulk CSV upload',
        submittedAt: new Date().toISOString(),
        imported: result.imported,
        approved: result.approved,
        flagged: result.flagged,
        skipped: result.skipped || 0,
        reference: `CSV-${new Date().toISOString().slice(0, 10)}`,
        message: result.flagged > 0
          ? 'The file was accepted. Approved records moved forward, and flagged records are ready for case review.'
          : 'The file was accepted and all records were cleared for board dispatch.'
      });
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      event.target.value = '';
      setIsSubmitting(false);
    }
  }

  async function downloadSampleCsv() {
    try {
      const response = await fetch(`${API_URL}/sample-csv`, {
        headers: authHeaders
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(getApiErrorMessage(data));
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'student-registration-sample.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  }

  async function resolveCase(caseRecord, finalRecord) {
    try {
      const resolved = await api(`/cases/${caseRecord.ticket_id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalRecord)
      });
      setNotice(resolved.status === 'resolved'
        ? `Ticket ${resolved.ticket_id} approved and sent to board.`
        : `Ticket ${resolved.ticket_id} still needs manual board review.`);
      setSelectedCase(resolved);
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    }
  }

  async function resetWorkspace() {
    const confirmed = window.confirm('Reset all workspace submissions, cases, board dispatches, and audit events? Master SEE records will remain.');
    if (!confirmed) return;

    try {
      await api('/demo/reset', { method: 'POST' });
      setNotice('Workspace data reset complete. Master SEE records were retained.');
      setSelectedCase(null);
      setActiveSection('dashboard');
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    }
  }

  const metrics = dashboard?.metrics || {};
  const cases = dashboard?.cases || [];
  const submissions = dashboard?.submissions || [];
  const dispatches = dashboard?.board_dispatches || [];
  const auditEvents = dashboard?.audit_events || [];
  const permissions = new Set(user?.permissions || ['dashboard:read', 'submission:create', 'case:review', 'board:read', 'audit:read', 'workspace:reset']);
  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'registration', label: 'Registration Entry', permission: 'submission:create' },
    { id: 'cases', label: 'Flagged Cases', permission: 'case:review' },
    { id: 'board', label: 'Board Dispatch', permission: 'board:read' },
    { id: 'audit', label: 'Audit Trail', permission: 'audit:read' }
  ].filter(item => !item.permission || permissions.has(item.permission));

  return (
    <main className="portal-shell">
      <header className="site-header">
        <div className="emblem">NEB</div>
        <div>
          <p className="gov-mark">Government of Nepal - Education Record Service</p>
          <h1>Student Record Verification System</h1>
          <p>{user?.name || 'School Administration Console'} - {user?.role?.replaceAll('_', ' ') || 'Class 11/12 Registration'}</p>
        </div>
        <div className="header-actions">
          {permissions.has('workspace:reset') && <button onClick={resetWorkspace}>Reset Workspace</button>}
          <button onClick={onLogout}>Logout</button>
        </div>
      </header>

      <nav className="portal-nav" aria-label="Portal sections">
        {navItems.map(item => (
          <button
            className={activeSection === item.id ? 'active' : ''}
            key={item.id}
            onClick={() => setActiveSection(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="section-container">
        {notice && <p className="success-message">{notice}</p>}
        {error && <p className="error-message">{error}</p>}
        {isLoading && <OfficialState title="Loading official records" text="Please wait while the verification workspace is prepared." />}

        {!isLoading && activeSection === 'dashboard' && (
          <section className="section-page">
            <PanelTitle eyebrow="System Overview" title="Verification dashboard" />
            <div className="metric-grid">
              <Metric label="Master SEE Records" value={metrics.master_records || 0} />
              <Metric label="Submitted" value={metrics.total_submissions || 0} />
              <Metric label="Approved" value={metrics.approved || 0} />
              <Metric label="Active Flags" value={metrics.flagged || 0} />
              <Metric label="Pending Admin" value={metrics.pending_admin || 0} />
              <Metric label="Sent to Board" value={metrics.sent_to_board || 0} />
              <Metric label="Avg Confidence" value={`${metrics.average_confidence || 0}%`} />
              <Metric label="Duplicate Alerts" value={metrics.duplicate_alerts || 0} />
            </div>
            {dashboard?.analytics && (
              <div className="dashboard-summary-grid">
                <section className="summary-panel">
                  <h3>Risk distribution</h3>
                  <div className="summary-row"><strong>Low risk</strong><span>{dashboard.analytics.risk_counts.low || 0}</span></div>
                  <div className="summary-row"><strong>Medium risk</strong><span>{dashboard.analytics.risk_counts.medium || 0}</span></div>
                  <div className="summary-row"><strong>High risk</strong><span>{dashboard.analytics.risk_counts.high || 0}</span></div>
                </section>
                <section className="summary-panel">
                  <h3>Top error fields</h3>
                  {dashboard.analytics.top_error_fields.length === 0 ? (
                    <p className="empty-copy">No error patterns detected.</p>
                  ) : dashboard.analytics.top_error_fields.slice(0, 4).map(item => (
                    <div className="summary-row" key={item.field}>
                      <strong>{item.field.replaceAll('_', ' ')}</strong>
                      <span>{item.count}</span>
                    </div>
                  ))}
                </section>
                <section className="summary-panel">
                  <h3>Dispatch control</h3>
                  <p className="empty-copy">No Verification = No Board Dispatch is enforced by the backend before any certificate payload is created.</p>
                </section>
              </div>
            )}
            <DashboardTables cases={cases} dispatches={dispatches} submissions={submissions} />
          </section>
        )}

        {!isLoading && activeSection === 'registration' && (
          <section className="section-page">
            <PanelTitle eyebrow="Registration Entry" title="Submit Class 11/12 student registration" />
            <RegistrationEntry
              record={record}
              setRecord={setRecord}
              isSubmitting={isSubmitting}
              submissionReceipt={submissionReceipt}
              submitRecord={submitRecord}
              uploadCsv={uploadCsv}
              downloadSampleCsv={downloadSampleCsv}
              onViewCases={() => setActiveSection('cases')}
              onViewBoard={() => setActiveSection('board')}
            />
          </section>
        )}

        {!isLoading && activeSection === 'cases' && (
          <section className="section-page">
            <PanelTitle eyebrow="Verification Cases" title="Flagged records and corrections" />
            <div className="case-layout">
              <div className="case-list-panel">
                <h2>Case queue</h2>
                <div className="case-list">
                  {cases.length === 0 ? (
                    <OfficialState compact title="No flagged cases" text="All submitted records are currently clear for board dispatch." />
                  ) : cases.map(item => (
                    <button
                      className={`case-button ${selectedCase?.ticket_id === item.ticket_id ? 'active' : ''}`}
                      key={item.ticket_id}
                      onClick={() => setSelectedCase(item)}
                    >
                      <strong>{item.master.name_en}</strong>
                      <span>{item.ticket_id}</span>
                      <StatusBadge status={item.status} />
                    </button>
                  ))}
                </div>
              </div>
              <CaseReview key={selectedCase?.ticket_id || 'empty-case'} caseRecord={selectedCase} onResolve={resolveCase} />
            </div>
          </section>
        )}

        {!isLoading && activeSection === 'board' && (
          <section className="section-page">
            <PanelTitle eyebrow="Board Dispatch" title="Final approved payloads" />
            <BoardDispatch dispatches={dispatches} />
          </section>
        )}

        {!isLoading && activeSection === 'audit' && (
          <section className="section-page">
            <PanelTitle eyebrow="Audit Trail" title="System activity log" />
            <AuditTrail events={auditEvents} />
          </section>
        )}
      </div>
    </main>
  );
}
