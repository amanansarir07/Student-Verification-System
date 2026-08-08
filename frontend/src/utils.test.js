import { describe, expect, it } from 'vitest';
import {
  formatAction,
  formatAuditDetails,
  formatDateTime,
  getApiErrorMessage,
  getStudentTicketFromPath,
  getStudentTicketToken
} from './utils';

describe('getApiErrorMessage', () => {
  it('reads legacy string errors', () => {
    expect(getApiErrorMessage({ error: 'Student not found' })).toBe('Student not found');
  });

  it('reads structured API errors', () => {
    expect(getApiErrorMessage({
      error: {
        code: 'INVALID_CSV',
        message: 'CSV is missing required headers'
      }
    })).toBe('CSV is missing required headers');
  });

  it('returns fallback when no error message exists', () => {
    expect(getApiErrorMessage({}, 'Unable to load')).toBe('Unable to load');
  });
});

describe('student ticket parsing', () => {
  it('extracts ticket id from student correction path', () => {
    expect(getStudentTicketFromPath('/student/ticket/TICKET-123')).toBe('TICKET-123');
  });

  it('returns empty ticket id for admin paths', () => {
    expect(getStudentTicketFromPath('/admin')).toBe('');
  });

  it('extracts secure token from query string', () => {
    expect(getStudentTicketToken('?token=abc123&source=sms')).toBe('abc123');
  });

  it('returns empty token when query is missing', () => {
    expect(getStudentTicketToken('?source=sms')).toBe('');
  });
});

describe('audit formatting', () => {
  it('formats action labels for table display', () => {
    expect(formatAction('student_sms_link_generated')).toBe('Student SMS Link Generated');
  });

  it('prefers student id details when available', () => {
    expect(formatAuditDetails({ details: { student_id: 'SEE-2081-0001' } })).toBe('SEE-2081-0001');
  });

  it('formats bulk upload details', () => {
    expect(formatAuditDetails({ details: { imported: 5, flagged: 2 } })).toBe('5 imported, 2 flagged');
  });

  it('formats username details', () => {
    expect(formatAuditDetails({ details: { username: 'admin' } })).toBe('Username: admin');
  });

  it('falls back to dash for empty details', () => {
    expect(formatAuditDetails({ details: {} })).toBe('-');
  });
});

describe('formatDateTime', () => {
  it('formats a valid date string', () => {
    expect(formatDateTime('2026-08-02T18:36:47.565Z')).toMatch(/Aug/);
  });
});
