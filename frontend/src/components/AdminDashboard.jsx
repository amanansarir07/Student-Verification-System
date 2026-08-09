import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, BarChart3, ClipboardCheck, FilePlus2, History, LogOut, RefreshCcw, Send } from 'lucide-react';
import { API_URL } from '../config';
import { emptyRecord } from '../constants';
import { getApiErrorMessage } from '../utils';
import AuditTrail from './AuditTrail';
import BoardDispatch from './BoardDispatch';
import CaseReview from './CaseReview';
import RegistrationEntry from './RegistrationEntry';
import StatusBadge from './StatusBadge';
import { OfficialState, PanelTitle } from './shared';

function PipelineStatus({ icon: Icon, label, value, detail, onClick, tone = 'default', connector = true }) {
  return (
    <>
      <button type="button" className={`pipeline-status pipeline-status-${tone}`} onClick={onClick}>
        <span className="pipeline-status-icon"><Icon size={17} aria-hidden="true" /></span>
        <span className="pipeline-status-copy">
          <span className="pipeline-status-label">{label}</span>
          <strong>{value}</strong>
          <span className="pipeline-status-detail">{detail}</span>
        </span>
        <ArrowRight className="pipeline-status-arrow" size={16} aria-hidden="true" />
      </button>
      {connector && <span className="pipeline-connector" aria-hidden="true" />}
    </>
  );
}

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
          : 'The record needs review. A correction ticket with SMS and email notification messages has been prepared.'
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
    const confirmed = window.confirm('Clear all evaluation submissions, cases, board dispatches, and audit events? Master SEE records will remain.');
    if (!confirmed) return;

    try {
      await api('/demo/reset', { method: 'POST' });
      setNotice('Evaluation data cleared. Master SEE records were retained.');
      setSelectedCase(null);
      setActiveSection('dashboard');
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    }
  }

  const metrics = dashboard?.metrics || {};
  const cases = dashboard?.cases || [];
  const dispatches = dashboard?.board_dispatches || [];
  const auditEvents = dashboard?.audit_events || [];
  const flaggedCount = metrics.flagged || cases.length || 0;
  const riskRank = { low: 1, medium: 2, high: 3, critical: 4 };
  const highestRisk = cases.reduce((current, item) => {
    const caseRisk = item.verification_summary?.risk_level || 'medium';
    return (riskRank[caseRisk] || 0) > (riskRank[current] || 0) ? caseRisk : current;
  }, 'low');
  const riskLabel = flaggedCount === 0 ? 'No active risk' : `${highestRisk === 'critical' ? 'Critical' : highestRisk[0].toUpperCase() + highestRisk.slice(1)} risk`;
  const caseQueueSummary = [
    metrics.pending_admin > 0 && `${metrics.pending_admin} awaiting administrator review`,
    metrics.pending_student > 0 && `${metrics.pending_student} awaiting student response`
  ].filter(Boolean).join(' · ') || 'No cases currently awaiting action';
  const permissions = new Set(user?.permissions || ['dashboard:read', 'submission:create', 'case:review', 'board:read', 'audit:read', 'workspace:reset']);
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'registration', label: 'Registration Entry', permission: 'submission:create', icon: FilePlus2 },
    { id: 'cases', label: 'Flagged Cases', permission: 'case:review', icon: ClipboardCheck },
    { id: 'board', label: 'Board Dispatch', permission: 'board:read', icon: Send },
    { id: 'audit', label: 'Audit Trail', permission: 'audit:read', icon: History }
  ].filter(item => !item.permission || permissions.has(item.permission));

  return (
    <main className="portal-shell">
      <header className="site-header">
        <div className="emblem">NEB</div>
        <div className="site-header-identity">
          <p className="gov-mark">Government of Nepal - Education Record Service</p>
          <h1>Student Record Verification System</h1>
          <p className="site-header-user">{user?.name || 'School Administration Console'} - {user?.role?.replaceAll('_', ' ') || 'Class 11/12 Registration'}</p>
        </div>
        <div className="header-actions">
          {permissions.has('workspace:reset') && (
            <button className="maintenance-action" onClick={resetWorkspace} title="Clear evaluation data">
              <RefreshCcw size={16} aria-hidden="true" />
              Clear evaluation data
            </button>
          )}
          <button onClick={onLogout}><LogOut size={16} aria-hidden="true" />Logout</button>
        </div>
      </header>

      <nav className="portal-nav" aria-label="Portal sections">
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              className={activeSection === item.id ? 'active' : ''}
              key={item.id}
              onClick={() => setActiveSection(item.id)}
            >
              <Icon size={16} aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="section-container">
        {notice && <p className="success-message">{notice}</p>}
        {error && <p className="error-message">{error}</p>}
        {isLoading && <OfficialState title="Loading official records" text="Please wait while the verification workspace is prepared." />}

        {!isLoading && activeSection === 'dashboard' && (
          <section className="section-page dashboard-page">
            <PanelTitle
              eyebrow="System Overview"
              title="Verification Control Center"
              description="Monitor verification progress, address exceptions, and confirm board dispatch."
            />
            <div className="dashboard-overview">
              <section className="verification-pipeline" aria-labelledby="pipeline-title">
                <div className="pipeline-heading">
                  <div>
                    <p className="gov-mark">Current system state</p>
                    <h3 id="pipeline-title">Verification Pipeline</h3>
                  </div>
                  <span className="pipeline-caption">Open a stage to continue its workflow</span>
                </div>
                <div className="pipeline-flow">
                  <PipelineStatus
                    icon={FilePlus2}
                    label="Submitted"
                    value={metrics.total_submissions || 0}
                    detail="Records received"
                    onClick={() => setActiveSection('registration')}
                    tone="primary"
                  />
                  <PipelineStatus
                    icon={ClipboardCheck}
                    label="Verification"
                    value={metrics.approved || 0}
                    detail="Verified records"
                    onClick={() => setActiveSection('board')}
                    tone="verified"
                  />
                  <PipelineStatus
                    icon={Send}
                    label="Dispatch"
                    value={metrics.sent_to_board || dispatches.length || 0}
                    detail="Sent to board"
                    onClick={() => setActiveSection('board')}
                    tone="dispatch"
                    connector={false}
                  />
                </div>
              </section>
              <button type="button" className={`pipeline-exception pipeline-exception-${highestRisk}`} onClick={() => setActiveSection('cases')}>
                <span className="pipeline-exception-icon"><AlertTriangle size={17} aria-hidden="true" /></span>
                <span className="pipeline-exception-copy">
                  <span>Attention required</span>
                  <strong><b>{flaggedCount}</b> {flaggedCount === 1 ? 'case requires review' : 'cases require review'}</strong>
                  <small>{riskLabel} — review flagged records before final board dispatch.</small>
                  <small className="case-queue-summary">{caseQueueSummary}</small>
                </span>
                <span className="pipeline-exception-action">Review cases <ArrowRight size={16} aria-hidden="true" /></span>
              </button>
            </div>
          </section>
        )}

        {!isLoading && activeSection === 'registration' && (
          <section className="section-page">
            <PanelTitle
              eyebrow="Registration Entry"
              title="Submit Class 11/12 student registration"
              description="Enter one record or upload a CSV. Verified records move forward automatically."
            />
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
            <PanelTitle
              eyebrow="Verification Cases"
              title="Flagged records and corrections"
              description="Review only records that need correction before final dispatch."
            />
            <div className="case-layout">
              <div className="case-list-panel">
                <h2>Case queue</h2>
                <div className="case-list">
                  {cases.length === 0 ? (
                    <OfficialState compact title="No flagged cases" text="All submitted records are currently clear for board dispatch." />
                  ) : cases.map(item => (
                    (() => {
                      const mismatchCount = item.flagged_fields?.length || 0;
                      const riskLevel = item.verification_summary?.risk_level || 'medium';

                      return (
                        <button
                          className={`case-button ${selectedCase?.ticket_id === item.ticket_id ? 'active' : ''}`}
                          key={item.ticket_id}
                          onClick={() => setSelectedCase(item)}
                          aria-label={`${item.master.name_en}, ${mismatchCount} mismatched fields, ${riskLevel} risk, ${item.status.replaceAll('_', ' ')}`}
                        >
                          <strong>{item.master.name_en}</strong>
                          <span>{item.ticket_id}</span>
                          <div className="case-button-meta">
                            <StatusBadge status={riskLevel} />
                            <span className="case-count">{mismatchCount} {mismatchCount === 1 ? 'mismatch' : 'mismatches'}</span>
                          </div>
                          <StatusBadge status={item.status} />
                        </button>
                      );
                    })()
                  ))}
                </div>
              </div>
              <CaseReview key={selectedCase?.ticket_id || 'empty-case'} caseRecord={selectedCase} onResolve={resolveCase} />
            </div>
          </section>
        )}

        {!isLoading && activeSection === 'board' && (
          <section className="section-page">
            <PanelTitle
              eyebrow="Board Dispatch"
              title="Final approved payloads"
              description="Confirm records cleared by verification before board handoff."
            />
            <BoardDispatch dispatches={dispatches} />
          </section>
        )}

        {!isLoading && activeSection === 'audit' && (
          <section className="section-page">
            <PanelTitle
              eyebrow="Audit Trail"
              title="System activity log"
              description="Review who changed what and when."
            />
            <AuditTrail events={auditEvents} />
          </section>
        )}
      </div>
    </main>
  );
}
