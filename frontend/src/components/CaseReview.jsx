import { useState } from 'react';
import { Clipboard, ExternalLink, Send } from 'lucide-react';
import { API_URL } from '../config';
import { emptyRecord } from '../constants';
import RecordFields from './RecordFields';
import StatusBadge from './StatusBadge';
import { MismatchTable, OfficialState, ProcessingIndicator, RecordSummary } from './shared';

function formatFileSize(bytes) {
  if (!bytes) return 'Size unavailable';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
      setEmailCopyStatus('Email message copied.');
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
        <p className="section-summary">Official reference compared with the school-submitted record.</p>
        <details className="compact-details record-identity-details">
          <summary>View record comparison</summary>
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
        </details>
      </section>

      <section className="case-section">
        <h3>Correction notice</h3>
        <div className="notification-preview-grid">
          <div className="sms-box">
            <strong>SMS correction notice</strong>
            <p className="notification-summary">Secure correction link generated for the student.</p>
            <details className="compact-details">
              <summary>View SMS content</summary>
              <p>{caseRecord.sms}</p>
            </details>
            <button type="button" onClick={copySmsLink}><Clipboard size={16} aria-hidden="true" />Copy correction link</button>
            {copyStatus && <span>{copyStatus}</span>}
          </div>
          {caseRecord.email && (
            <div className="email-box">
              <div className="email-header">
                <strong>Email correction notice</strong>
                <StatusBadge status={caseRecord.email.status} />
              </div>
              <p><strong>To:</strong> {caseRecord.email.recipient || 'Student email not provided'}</p>
              <p><strong>Subject:</strong> {caseRecord.email.subject}</p>
              <details className="compact-details">
                <summary>View email content</summary>
                <pre>{caseRecord.email.body}</pre>
              </details>
              <button type="button" onClick={copyEmailMessage}><Clipboard size={16} aria-hidden="true" />Copy email message</button>
              {emailCopyStatus && <span>{emailCopyStatus}</span>}
            </div>
          )}
        </div>
      </section>

      <section className="case-section">
        <h3>Verification findings</h3>
        <MismatchTable fields={caseRecord.flagged_fields} />
      </section>

      {caseRecord.correction ? (
        <section className="case-section correction-box">
          <strong>Student correction received</strong>
          <p className="correction-description">{caseRecord.correction.description || 'No description provided.'}</p>
          {caseRecord.correction.proof_file ? (
            <div className="proof-file-card">
              <div className="proof-file-heading">
                <strong>Proof document</strong>
                <StatusBadge status={caseRecord.correction.proof_file.validation_status || 'accepted_for_school_review'} />
              </div>
              <p className="proof-file-name">{caseRecord.correction.proof_file.original_name}</p>
              <div className="proof-file-meta">
                <span>{caseRecord.correction.proof_file.mime_type?.split('/').pop()?.toUpperCase() || 'Document'}</span>
                <span>{formatFileSize(caseRecord.correction.proof_file.size_bytes)}</span>
              </div>
              <div className="proof-file-actions">
                <a href={`${API_URL}${caseRecord.correction.proof_file.url}`} target="_blank" rel="noreferrer">
                  <ExternalLink size={16} aria-hidden="true" />
                  Open preview
                </a>
                <a href={`${API_URL}${caseRecord.correction.proof_file.url}`} download={caseRecord.correction.proof_file.original_name}>
                  Download copy
                </a>
              </div>
              {caseRecord.correction.proof_file.sha256 && (
                <span className="proof-file-hash">SHA-256: {caseRecord.correction.proof_file.sha256.slice(0, 32)}...</span>
              )}
            </div>
          ) : (
            <span className="proof-missing">No proof file attached</span>
          )}
        </section>
      ) : (
        <section className="case-section">
          <p className="hint">Student has not responded yet. Admin can still correct and submit after verifying documents offline.</p>
        </section>
      )}

      <section className="case-section">
        <h3>School re-verification decision</h3>
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
          <Send size={16} aria-hidden="true" />
          {isResolving ? 'Re-verifying record...' : 'Re-verify and send to board'}
        </button>
        {isResolving && <ProcessingIndicator text="Checking final record and preparing board dispatch..." compact />}
      </section>
    </div>
  );
}
