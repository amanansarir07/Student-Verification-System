export default function DashboardTables({ cases, dispatches, submissions, onViewCases, onViewBoard, onViewRegistration }) {
  return (
    <div className="dashboard-secondary-grid">
      <button type="button" className="dashboard-summary-link" onClick={onViewCases}>
        <span>Flagged case register</span>
        <strong>{cases.length} active cases</strong>
        <small>Open case review</small>
      </button>
      <button type="button" className="dashboard-summary-link" onClick={onViewBoard}>
        <span>Board dispatch register</span>
        <strong>{dispatches.length} dispatched records</strong>
        <small>View approved payloads</small>
      </button>
      <button type="button" className="dashboard-summary-link" onClick={onViewRegistration}>
        <span>Submission register</span>
        <strong>{submissions.length} submitted records</strong>
        <small>Open registration entry</small>
      </button>
    </div>
  );
}
