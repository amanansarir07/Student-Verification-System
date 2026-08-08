import { useEffect, useState } from 'react';
import { API_URL } from '../config';
import { emptyRecord } from '../constants';
import { formatDateTime, getApiErrorMessage } from '../utils';
import RecordFields from './RecordFields';
import StatusBadge from './StatusBadge';
import { MismatchTable, OfficialState, ProcessingIndicator } from './shared';

export default function StudentPortal({ ticketId, ticketToken }) {
  const [ticket, setTicket] = useState(null);
  const [form, setForm] = useState(emptyRecord);
  const [description, setDescription] = useState('');
  const [proof, setProof] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadTicket() {
      const response = await fetch(`${API_URL}/student/ticket/${ticketId}?token=${encodeURIComponent(ticketToken)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, 'Ticket not found'));
      }

      setTicket(data);
      setForm({ ...emptyRecord, ...data.submitted });
    }

    loadTicket()
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [ticketId, ticketToken]);

  async function submitCorrection(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setIsSubmitting(true);

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, value));
    formData.append('description', description);
    if (proof) formData.append('proof', proof);

    const response = await fetch(`${API_URL}/student/ticket/${ticketId}/correction?token=${encodeURIComponent(ticketToken)}`, {
      method: 'POST',
      body: formData
    });
    const data = await response.json();

    if (!response.ok) {
      setError(getApiErrorMessage(data, 'Correction failed'));
      setIsSubmitting(false);
      return;
    }

    setNotice('Correction submitted to school admin for re-verification.');
    setTicket(data);
    setIsSubmitting(false);
  }

  return (
    <main className="student-shell">
      <section className="student-card">
        <p className="gov-mark">Secure Student Correction Portal</p>
        <h1>Review flagged registration details</h1>
        {error && <p className="error-message">{error}</p>}
        {isLoading ? (
          <OfficialState title="Loading correction ticket" text="Please wait while your secure correction link is verified." />
        ) : !ticket ? (
          <OfficialState title="Ticket unavailable" text="This correction ticket could not be opened. Please contact your school administration office." />
        ) : (
          <>
            <div className="ticket-summary">
              <strong>{ticket.student_name}</strong>
              <span>{ticket.ticket_id}</span>
              <StatusBadge status={ticket.status} />
              <span>Expires {formatDateTime(ticket.expires_at)}</span>
            </div>
            <MismatchTable fields={ticket.flagged_fields} />
            <form onSubmit={submitCorrection}>
              <h2>Corrected information</h2>
              <p className="muted">Enter the correct details exactly as shown on your official document.</p>
              <RecordFields record={form} onChange={setForm} />
              <label>
                Description of correction
                <textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="Explain why the submitted detail was incorrect." />
              </label>
              <label>
                Proof document
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={event => setProof(event.target.files?.[0] || null)} />
              </label>
              <button className="primary-action" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting correction...' : 'Submit correction'}
              </button>
              {isSubmitting && <ProcessingIndicator text="Submitting correction for school re-verification..." compact />}
              {notice && <p className="success-message">{notice}</p>}
            </form>
          </>
        )}
      </section>
    </main>
  );
}
