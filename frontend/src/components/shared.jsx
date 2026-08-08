import { fieldLabels } from '../constants';
import { formatDateTime } from '../utils';
import StatusBadge from './StatusBadge';

export function Metric({ label, value }) {
  return (
    <article className="metric-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

export function PanelTitle({ eyebrow, title }) {
  return (
    <div className="panel-title">
      <p className="gov-mark">{eyebrow}</p>
      <h2>{title}</h2>
    </div>
  );
}

export function ProcessingIndicator({ text, compact = false }) {
  return (
    <div className={compact ? 'processing-indicator compact' : 'processing-indicator'} role="status" aria-live="polite">
      <span className="loading-ring" aria-hidden="true" />
      <strong>{text}</strong>
    </div>
  );
}

export function OfficialState({ title, text, compact = false }) {
  return (
    <div className={compact ? 'official-state compact' : 'official-state'}>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

export function MismatchTable({ fields }) {
  if (!fields.length) {
    return <OfficialState compact title="No mismatched fields" text="The submitted values match the official record." />;
  }

  return (
    <div className="table-wrap mismatch-table">
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>School Entry</th>
            <th>Official Record</th>
            <th>Rule</th>
            <th>Confidence</th>
            <th>Risk</th>
            <th>Severity</th>
          </tr>
        </thead>
        <tbody>
          {fields.map(field => (
            <tr key={field.field}>
              <td>{fieldLabels[field.field] || field.field}</td>
              <td>{field.submitted_value || '-'}</td>
              <td>{field.master_value || '-'}</td>
              <td>{field.rule}</td>
              <td>{field.confidence_score ?? Math.round((field.similarity || 0) * 100)}%</td>
              <td><StatusBadge status={field.risk_level || 'medium'} /></td>
              <td><StatusBadge status={field.severity} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RecordSummary({ title, source, record, variant = 'submitted' }) {
  const rows = [
    ['Student ID', record.student_id],
    ['SEE Symbol No.', record.see_symbol_no],
    ['Name (English)', record.name_en],
    ['Name (Nepali)', record.name_np],
    ['DOB B.S.', record.dob_bs],
    ['DOB A.D.', record.dob_ad],
    ['School Code', record.school_code],
    ['Permanent Address', record.permanent_address]
  ];

  return (
    <article className={`record-summary ${variant}`}>
      <div className="record-summary-head">
        <div>
          <h4>{title}</h4>
          <span>{source}</span>
        </div>
        <StatusBadge status={variant === 'official' ? 'official_reference' : 'school_entry'} />
      </div>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value || '-'}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

export function SubmissionReceipt({ receipt, onViewCases, onViewBoard }) {
  const hasFlagged = receipt.flagged > 0;
  const hasApproved = receipt.approved > 0;

  return (
    <section className="submission-receipt" aria-live="polite">
      <div className="success-animation" aria-hidden="true">
        <div className="success-document">
          <span />
          <span />
          <span />
        </div>
        <div className="success-seal">✓</div>
      </div>
      <div className="receipt-main">
        <div>
          <p className="gov-mark">Submission Acknowledgement</p>
          <h3>{receipt.title}</h3>
          {receipt.studentName && <p className="muted">{receipt.studentName}</p>}
          <p>{receipt.message}</p>
        </div>
        <div className="receipt-details">
          <span><strong>Reference</strong>{receipt.reference}</span>
          <span><strong>Source</strong>{receipt.mode}</span>
          <span><strong>Submitted</strong>{formatDateTime(receipt.submittedAt)}</span>
        </div>
        <div className="receipt-metrics">
          <Metric label="Records Received" value={receipt.imported} />
          <Metric label="Approved" value={receipt.approved} />
          <Metric label="Flagged" value={receipt.flagged} />
          <Metric label="Skipped" value={receipt.skipped || 0} />
        </div>
      </div>
      <div className="receipt-actions">
        {hasFlagged && <button type="button" className="primary-action" onClick={onViewCases}>Review flagged cases</button>}
        {hasApproved && <button type="button" onClick={onViewBoard}>View board dispatch</button>}
      </div>
    </section>
  );
}
