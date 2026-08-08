import { formatAction, formatAuditDetails, formatDateTime } from '../utils';
import StatusBadge from './StatusBadge';
import { Metric, OfficialState } from './shared';

export default function AuditTrail({ events }) {
  const totalEvents = events.length;
  const studentActions = events.filter(event => event.actor_type === 'student').length;
  const boardActions = events.filter(event => event.entity_type === 'board_dispatch').length;
  const exceptionEvents = events.filter(event => {
    const action = event.action || '';
    return action.includes('rejected') || action.includes('manual_board_review') || action.includes('failed');
  }).length;

  if (events.length === 0) {
    return (
      <OfficialState
        title="No audit events recorded"
        text="System activity will appear here after login, registration submission, correction, review, and board dispatch actions."
      />
    );
  }

  return (
    <div className="audit-trail">
      <section className="audit-summary" aria-label="Audit summary">
        <Metric label="Total Events" value={totalEvents} />
        <Metric label="Student Actions" value={studentActions} />
        <Metric label="Board Dispatch Events" value={boardActions} />
        <Metric label="Exceptions" value={exceptionEvents} />
      </section>

      <section className="audit-ledger">
        {events.map(event => (
          <AuditEventCard event={event} key={event.event_id} />
        ))}
      </section>
    </div>
  );
}

function AuditEventCard({ event }) {
  const category = getAuditCategory(event);
  const severity = getAuditSeverity(event);

  return (
    <article className={`audit-event audit-${severity}`}>
      <div className="audit-marker" aria-hidden="true">{category.short}</div>
      <div className="audit-event-main">
        <div className="audit-event-head">
          <div>
            <p className="gov-mark">{category.label}</p>
            <h3>{formatAction(event.action)}</h3>
          </div>
          <StatusBadge status={severity === 'exception' ? 'critical' : 'approved'} />
        </div>
        <dl className="audit-meta">
          <div>
            <dt>Time</dt>
            <dd>{formatDateTime(event.timestamp)}</dd>
          </div>
          <div>
            <dt>Actor</dt>
            <dd>{event.actor_name}<span>{event.actor_type}</span></dd>
          </div>
          <div>
            <dt>Entity</dt>
            <dd>{event.entity_type}<span>{event.entity_id}</span></dd>
          </div>
          <div>
            <dt>Details</dt>
            <dd>{formatAuditDetails(event)}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

function getAuditCategory(event) {
  const action = event.action || '';

  if (action.includes('login')) return { label: 'Access Control', short: 'AC' };
  if (action.includes('registration') || action.includes('bulk')) return { label: 'Registration Verification', short: 'RV' };
  if (action.includes('student') || action.includes('proof')) return { label: 'Student Correction', short: 'SC' };
  if (action.includes('case')) return { label: 'Admin Re-verification', short: 'AR' };
  if (action.includes('board')) return { label: 'Board Dispatch', short: 'BD' };
  if (action.includes('email')) return { label: 'Notification', short: 'NT' };
  if (action.includes('reset')) return { label: 'Workspace Control', short: 'WC' };

  return { label: 'System Event', short: 'SE' };
}

function getAuditSeverity(event) {
  const action = event.action || '';

  if (action.includes('rejected') || action.includes('failed') || action.includes('manual_board_review')) {
    return 'exception';
  }

  return 'normal';
}
