import StatusBadge from './StatusBadge';

export default function DashboardTables({ cases, dispatches, submissions }) {
  return (
    <div className="dashboard-summary-grid">
      <section className="summary-panel">
        <h3>Latest flagged cases</h3>
        {cases.length === 0 ? (
          <p className="empty-copy">No active flagged cases.</p>
        ) : cases.slice(0, 4).map(item => (
          <div className="summary-row" key={item.ticket_id}>
            <strong>{item.master.name_en}</strong>
            <StatusBadge status={item.status} />
          </div>
        ))}
      </section>
      <section className="summary-panel">
        <h3>Recent board dispatch</h3>
        {dispatches.length === 0 ? (
          <p className="empty-copy">No records sent to board yet.</p>
        ) : dispatches.slice(0, 4).map(item => (
          <div className="summary-row" key={item.dispatch_id}>
            <strong>{item.payload.name_en}</strong>
            <StatusBadge status={item.status} />
          </div>
        ))}
      </section>
      <section className="summary-panel">
        <h3>Recent submissions</h3>
        {submissions.length === 0 ? (
          <p className="empty-copy">No submissions yet.</p>
        ) : submissions.slice(0, 4).map(item => (
          <div className="summary-row" key={item.submission_id}>
            <strong>{item.submitted?.name_en || item.student_id}</strong>
            <StatusBadge status={item.status} />
          </div>
        ))}
      </section>
    </div>
  );
}
