export default function StatusBadge({ status }) {
  const labels = {
    approved: 'Approved',
    flagged: 'Flagged',
    waiting_student: 'Waiting Student',
    student_submitted: 'Pending Admin',
    sent_to_board: 'Sent to Board',
    resolved: 'Resolved',
    review: 'Review',
    critical: 'Critical',
    needs_manual_board_review: 'Board Review',
    gmail_preview_ready: 'Gmail Ready',
    missing_email: 'Missing Email',
    official_reference: 'Official Reference',
    school_entry: 'School Entry',
    low: 'Low Risk',
    medium: 'Medium Risk',
    high: 'High Risk',
    duplicate_detected: 'Duplicate'
  };
  const label = labels[status] || String(status || 'unknown').replaceAll('_', ' ');
  return <span className={`status-badge status-${status || 'unknown'}`}>{label}</span>;
}
