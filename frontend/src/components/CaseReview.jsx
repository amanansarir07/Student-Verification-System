import { useState } from 'react';
import { API_URL } from '../config';
import { emptyRecord } from '../constants';
import RecordFields from './RecordFields';
import StatusBadge from './StatusBadge';
import { Metric, MismatchTable, OfficialState, ProcessingIndicator, RecordSummary } from './shared';

export default function CaseReview({ caseRecord, onResolve }) {
  const [finalRecord, setFinalRecord] = useState(() => ({
    ...emptyRecord,
    ...(caseRecord?.submitted || {}),
    ...(caseRecord?.correction?.corrected || {})
  }));
  const [copyStatus, setCopyStatus] = useState('');
  const [emailCopyStatus, setEmailCopyStatus] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  async function copySmsLink() {
    const link = caseRecord.sms.match(/https?:\/\/\S+/)?.[0] || caseRecord.sms;
    try {
      await navigator.clipboard.writeText(link);
      setCopyStatus('Correction link copied.');
    } catch {
      setCopyStatus('Unable to copy link automatically.');
    }
  }

  async function copyEmailMessage() {
    const email = caseRecord.email;
    const message = `To: ${email.recipient || 'Student email not provided'}\nSubject: ${email.subject}\n\n${email.body}`;
    try {
      await navigator.clipboard.writeText(message);
      setEmailCopyStatus('Gmail message copied.');
    } catch {
      setEmailCopyStatus('Unable to copy email message automatically.');
    }
  }

  if (!caseRecord) {
    return (
      <div className="case-detail">
        <OfficialState title="No case selected" text="Select a flagged student record from the list to review mismatch details." />
      </div>
    );
  }

  return (
    <div className="case-detail">
      <div className="ticket-summary">
        <div>
          <strong>{caseRecord.master.name_en}</strong>
          <span className="cell-subtext">{caseRecord.ticket_id}</span>
        </div>
        <StatusBadge status={caseRecord.status} />
      </div>

      <section className="case-section">
        <h3>Record identity</h3>
        <div className="identity-compare">
          <RecordSummary
            title="Official SEE master record"
            source="Trusted reference used by verification engine"
            record={caseRecord.master}
            variant="official"
          />
          <RecordSummary
            title="School submitted record"
            source="Data entered or uploaded by school admin"
            record={caseRecord.submitted}
            variant="submitted"
          />
        </div>
      </section>

      <section className="case-section">
        <h3>Student notification messages</h3>
        <div className="notification-preview-grid">
          <div className="sms-box">
            <strong>SMS notification message</strong>
            <p>{caseRecord.sms}</p>
            <button type="button" onClick={copySmsLink}>Copy correction link</button>
            {copyStatus && <span>{copyStatus}</span>}
          </div>
          {caseRecord.email && (
            <div className="email-box">
              <div className="email-header">
                <strong>Gmail notification message</strong>
                <StatusBadge status={caseRecord.email.status} />
              </div>
              <p><strong>To:</strong> {caseRecord.email.recipient || 'Student email not provided'}</p>
              <p><strong>Subject:</strong> {caseRecord.email.subject}</p>
              <pre>{caseRecord.email.body}</pre>
              <button type="button" onClick={copyEmailMessage}>Copy Gmail message</button>
              {emailCopyStatus && <span>{emailCopyStatus}</span>}
            </div>
          )}
        </div>
      </section>

      <section className="case-section">
        <h3>Mismatch evidence</h3>
        {caseRecord.verification_summary && (
          <div className="receipt-metrics">
            <Metric label="Confidence" value={`${caseRecord.verification_summary.confidence_score}%`} />
            <Metric label="Risk Level" value={caseRecord.verification_summary.risk_level} />
            <Metric label="Review Issues" value={caseRecord.verification_summary.review_issues} />
            <Metric label="Duplicate Signals" value={caseRecord.verification_summary.duplicate_signals} />
          </div>
        )}
        <MismatchTable fields={caseRecord.flagged_fields} />
      </section>

      {caseRecord.correction ? (
        <section className="case-section correction-box">
          <strong>Student correction received</strong>
          <p>{caseRecord.correction.description || 'No description provided.'}</p>
          {caseRecord.correction.proof_file ? (
            <>
              <a href={`${API_URL}${caseRecord.correction.proof_file.url}`} target="_blank" rel="noreferrer">
                View proof: {caseRecord.correction.proof_file.original_name}
              </a>
              {caseRecord.correction.proof_file.sha256 && (
                <span>SHA-256: {caseRecord.correction.proof_file.sha256.slice(0, 32)}...</span>
              )}
            </>
          ) : (
            <span>No proof file attached</span>
          )}
        </section>
      ) : (
        <section className="case-section">
          <p className="hint">Student has not responded yet. Admin can still correct and submit after verifying documents offline.</p>
        </section>
      )}

      <section className="case-section">
        <h3>Final admin re-verification</h3>
        <RecordFields record={finalRecord} onChange={setFinalRecord} compact />
        <button
          className="primary-action"
          disabled={isResolving}
          onClick={async () => {
            setIsResolving(true);
            try {
              await onResolve(caseRecord, finalRecord);
            } finally {
              setIsResolving(false);
            }
          }}
        >
          {isResolving ? 'Re-verifying record...' : 'Re-verify and send to board'}
        </button>
        {isResolving && <ProcessingIndicator text="Checking final record and preparing board dispatch..." compact />}
      </section>
    </div>
  );
}
