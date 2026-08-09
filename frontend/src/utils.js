export function getApiErrorMessage(data, fallback = 'Request failed') {
  if (typeof data?.error === 'string') {
    return data.error;
  }

  if (data?.error?.message) {
    return data.error.message;
  }

  return fallback;
}

export function getStudentTicketFromPath(pathname = window.location.pathname) {
  const match = pathname.match(/\/student\/ticket\/([^/]+)/);
  return match?.[1] || '';
}

export function getStudentTicketToken(search = window.location.search) {
  return new URLSearchParams(search).get('token') || '';
}

export function formatDateTime(value) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

export function formatAction(action) {
  const acronyms = {
    sms: 'SMS',
    csv: 'CSV',
    gmail: 'Email'
  };

  return action.split('_').map(word => {
    if (acronyms[word]) return acronyms[word];
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

export function formatAuditDetails(event) {
  const details = event.details || {};

  if (details.student_id) {
    return details.student_id;
  }

  if (details.imported !== undefined) {
    return `${details.imported} imported, ${details.flagged} flagged`;
  }

  if (details.prepared !== undefined) {
    return `${details.prepared} prepared, ${details.skipped} skipped`;
  }

  if (details.username) {
    return `Username: ${details.username}`;
  }

  if (details.source) {
    return details.source;
  }

  return '-';
}
