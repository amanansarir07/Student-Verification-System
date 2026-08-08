const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');

const students = require('./student.json');
const compareRecords = require('./compare');
const { summarizeVerification } = require('./compare');
const db = require('./db');

const app = express();
const PORT = Number(process.env.PORT || 5000);
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:5173';
const DEMO_ADMIN_USERNAME = process.env.DEMO_ADMIN_USERNAME || 'admin';
const DEMO_ADMIN_PASSWORD = process.env.DEMO_ADMIN_PASSWORD || 'admin123';
const DEMO_ADMIN_TOKEN = process.env.DEMO_ADMIN_TOKEN || 'demo-admin-token';
const DEMO_ADMIN_NAME = process.env.DEMO_ADMIN_NAME || 'School Verification Admin';
const DEMO_SCHOOL_CODE = process.env.DEMO_SCHOOL_CODE || 'SCH-1029';
const STUDENT_LINK_TTL_DAYS = Number(process.env.STUDENT_LINK_TTL_DAYS || 7);
const SESSION_SECRET = process.env.SESSION_SECRET || 'hackathon-local-session-secret';

const demoUsers = [
  {
    username: DEMO_ADMIN_USERNAME,
    password: DEMO_ADMIN_PASSWORD,
    name: DEMO_ADMIN_NAME,
    role: 'school_admin',
    school_code: DEMO_SCHOOL_CODE,
    province_code: 'P1',
    permissions: ['dashboard:read', 'submission:create', 'case:review', 'board:read', 'audit:read', 'workspace:reset']
  },
  {
    username: 'neb',
    password: 'neb123',
    name: 'NEB Board Officer',
    role: 'neb_board',
    school_code: null,
    province_code: null,
    permissions: ['dashboard:read', 'board:read', 'audit:read']
  },
  {
    username: 'province',
    password: 'province123',
    name: 'Province Education Officer',
    role: 'province_officer',
    school_code: null,
    province_code: 'P1',
    permissions: ['dashboard:read', 'case:review', 'board:read', 'audit:read']
  },
  {
    username: 'verifier',
    password: 'verifier123',
    name: 'Verification Officer',
    role: 'verification_officer',
    school_code: DEMO_SCHOOL_CODE,
    province_code: 'P1',
    permissions: ['dashboard:read', 'case:review', 'board:read', 'audit:read']
  }
];

const rateLimitBuckets = new Map();

const uploadDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const allowedProofMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png'
]);

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const proofUpload = multer({
  dest: uploadDir,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (allowedProofMimeTypes.has(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(new Error('Proof document must be a PDF, JPG, or PNG file'));
  }
});

const fieldLabels = {
  see_symbol_no: 'SEE symbol number',
  name_en: 'student name in English',
  name_np: 'student name in Nepali',
  father_name: 'father name',
  mother_name: 'mother name',
  dob_bs: 'date of birth B.S.',
  dob_ad: 'date of birth A.D.',
  gender: 'gender',
  school_code: 'school code',
  permanent_address: 'permanent address'
};

const requiredCsvHeaders = [
  'student_id',
  'see_symbol_no',
  'name_en',
  'name_np',
  'father_name',
  'mother_name',
  'dob_bs',
  'dob_ad',
  'gender',
  'school_code',
  'permanent_address'
];

const requiredEmailCsvHeaders = [
  'student_id',
  'name_en',
  'student_email'
];

function sendError(res, status, code, message, details = {}) {
  return res.status(status).json({
    error: {
      code,
      message,
      details
    }
  });
}

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());
app.use('/uploads', express.static(uploadDir));

function createSessionToken(user) {
  const payload = {
    sub: user.username,
    name: user.name,
    role: user.role,
    school_code: user.school_code,
    province_code: user.province_code,
    permissions: user.permissions,
    exp: Date.now() + (8 * 60 * 60 * 1000)
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
}

function verifySessionToken(token) {
  if (token === DEMO_ADMIN_TOKEN) {
    return demoUsers[0];
  }

  const [encodedPayload, signature] = String(token || '').split('.');
  if (!encodedPayload || !signature) return null;

  const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(encodedPayload).digest('base64url');
  if (Buffer.byteLength(signature) !== Buffer.byteLength(expectedSignature)) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) return null;

  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  if (payload.exp < Date.now()) return null;
  return payload;
}

function requireRole(permissions = []) {
  return (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = verifySessionToken(token);

    if (!user) {
      return sendError(res, 401, 'ADMIN_AUTH_REQUIRED', 'Authorized portal login required');
    }

    const userPermissions = new Set(user.permissions || []);
    const missingPermission = permissions.find(permission => !userPermissions.has(permission));
    if (missingPermission) {
      return sendError(res, 403, 'RBAC_PERMISSION_DENIED', 'This role is not allowed to perform the requested action', {
        required_permission: missingPermission,
        role: user.role
      });
    }

    req.user = user;
    next();
  };
}

const requireAdmin = requireRole(['dashboard:read']);
const requireSubmissionCreate = requireRole(['submission:create']);
const requireCaseReview = requireRole(['case:review']);
const requireBoardRead = requireRole(['board:read']);
const requireAuditRead = requireRole(['audit:read']);
const requireWorkspaceReset = requireRole(['workspace:reset']);

function rateLimit(name, limit, windowMs) {
  return (req, res, next) => {
    const key = `${name}:${req.ip}`;
    const now = Date.now();
    const bucket = rateLimitBuckets.get(key) || { count: 0, resetAt: now + windowMs };

    if (bucket.resetAt < now) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    rateLimitBuckets.set(key, bucket);

    if (bucket.count > limit) {
      return sendError(res, 429, 'RATE_LIMITED', 'Too many requests. Please try again shortly.');
    }

    next();
  };
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

function createStudentAccessToken() {
  return crypto.randomBytes(24).toString('hex');
}

function createStudentLinkExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + STUDENT_LINK_TTL_DAYS);
  return expiresAt.toISOString();
}

function buildStudentTicketUrl(caseRecord) {
  return `${PUBLIC_BASE_URL}/student/ticket/${caseRecord.ticket_id}?token=${caseRecord.access_token}`;
}

function logAudit({ actorType, actorName, action, entityType, entityId, details = {} }) {
  return db.saveAuditEvent({
    event_id: createId('AUDIT'),
    timestamp: new Date().toISOString(),
    actor_type: actorType,
    actor_name: actorName,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details
  });
}

function saveRecordVersion({ entityType, entityId, actorType, actorName, reason, snapshot }) {
  return db.saveRecordVersion({
    version_id: createId('VERSION'),
    entity_type: entityType,
    entity_id: entityId,
    created_at: new Date().toISOString(),
    actor_type: actorType,
    actor_name: actorName,
    reason,
    snapshot
  });
}

function normalizeRecord(record) {
  return {
    student_id: record.student_id || '',
    see_symbol_no: record.see_symbol_no || '',
    name_en: record.name_en || '',
    name_np: record.name_np || '',
    student_email: record.student_email || '',
    father_name: record.father_name || '',
    mother_name: record.mother_name || '',
    dob_bs: record.dob_bs || '',
    dob_ad: record.dob_ad || '',
    gender: record.gender || '',
    school_code: record.school_code || '',
    permanent_address: record.permanent_address || ''
  };
}

function findMasterRecord(record) {
  return students.find(student =>
    student.student_id === record.student_id || student.see_symbol_no === record.see_symbol_no
  );
}

function validateRegistrationRecord(record) {
  const requiredFields = ['student_id', 'see_symbol_no', 'name_en', 'name_np', 'father_name', 'mother_name', 'dob_bs', 'dob_ad', 'gender', 'school_code', 'permanent_address'];
  return requiredFields.filter(field => !String(record[field] || '').trim());
}

function findDuplicateSignals(submitted) {
  return db.listSubmissions()
    .filter(item => item.student_id === submitted.student_id || item.see_symbol_no === submitted.see_symbol_no)
    .map(item => ({
      submission_id: item.submission_id,
      status: item.status,
      matched_on: item.student_id === submitted.student_id ? 'student_id' : 'see_symbol_no',
      created_at: item.created_at
    }));
}

function buildSms(caseRecord) {
  const fields = caseRecord.flagged_fields.map(field => fieldLabels[field.field] || field.field).join(', ');
  return `Dear ${caseRecord.master.name_en}, mismatch found in your Class 12 registration: ${fields}. Correct here: ${buildStudentTicketUrl(caseRecord)}`;
}

function buildEmailNotification(caseRecord) {
  const fields = caseRecord.flagged_fields.map(field => fieldLabels[field.field] || field.field).join(', ');
  return {
    recipient: caseRecord.submitted.student_email || '',
    subject: 'Class 12 Registration Correction Required',
    body: [
      `Dear ${caseRecord.master.name_en},`,
      '',
      `A mismatch was found in your Class 12 registration: ${fields}.`,
      `Please review and correct your details using this secure link: ${buildStudentTicketUrl(caseRecord)}`,
      '',
      'If the submitted information is correct, please contact your school administration office with supporting proof.',
      '',
      'Student Record Verification System'
    ].join('\n'),
    status: caseRecord.submitted.student_email ? 'gmail_preview_ready' : 'missing_email'
  };
}

function buildDashboardAnalytics(submissions, cases) {
  const fieldCounts = {};
  const riskCounts = { low: 0, medium: 0, high: 0 };

  submissions.forEach(submission => {
    const risk = submission.verification_summary?.risk_level || 'low';
    riskCounts[risk] = (riskCounts[risk] || 0) + 1;
  });

  cases.forEach(caseRecord => {
    (caseRecord.flagged_fields || []).forEach(field => {
      fieldCounts[field.field] = (fieldCounts[field.field] || 0) + 1;
    });
  });

  return {
    risk_counts: riskCounts,
    top_error_fields: Object.entries(fieldCounts)
      .map(([field, count]) => ({ field, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    average_confidence: submissions.length
      ? Math.round(submissions.reduce((total, item) => total + (item.verification_summary?.confidence_score || 0), 0) / submissions.length)
      : 0
  };
}

function dispatchToBoard(submission, source, context = {}) {
  if (!context.verificationPassed) {
    throw new Error('No verification = no board dispatch');
  }

  const payload = {
    student_id: submission.student_id,
    see_symbol_no: submission.see_symbol_no,
    name_en: submission.name_en,
    name_np: submission.name_np,
    father_name: submission.father_name,
    mother_name: submission.mother_name,
    dob_bs: submission.dob_bs,
    dob_ad: submission.dob_ad,
    gender: submission.gender,
    school_code: submission.school_code,
    permanent_address: submission.permanent_address
  };
  const payloadHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  const dispatch = {
    dispatch_id: createId('BOARD'),
    source,
    submitted_at: new Date().toISOString(),
    status: 'sent_to_board',
    payload,
    payload_hash: payloadHash,
    signature_preview: `SHA256:${payloadHash.slice(0, 16)}`,
    verification_certificate: {
      certificate_id: createId('CERT'),
      issued_at: new Date().toISOString(),
      verification_url: `${PUBLIC_BASE_URL}/verify/${payloadHash.slice(0, 24)}`,
      qr_payload: `SVS|${submission.student_id}|${submission.see_symbol_no}|${payloadHash.slice(0, 24)}`
    }
  };

  const savedDispatch = db.saveDispatch(dispatch);
  saveRecordVersion({
    entityType: 'board_dispatch',
    entityId: savedDispatch.dispatch_id,
    actorType: context.actorType || 'system',
    actorName: context.actorName || 'Verification Engine',
    reason: 'board_dispatch_created',
    snapshot: savedDispatch
  });
  logAudit({
    actorType: context.actorType || 'system',
    actorName: context.actorName || 'Verification Engine',
    action: 'board_dispatch_sent',
    entityType: 'board_dispatch',
    entityId: savedDispatch.dispatch_id,
    details: {
      source,
      student_id: submission.student_id,
      see_symbol_no: submission.see_symbol_no,
      related_ticket_id: context.ticketId || null
    }
  });

  return savedDispatch;
}

function verifySubmission(record, source = 'single_entry', actor = { type: 'school_admin', name: DEMO_ADMIN_NAME }) {
  const submitted = normalizeRecord(record);
  const missingFields = validateRegistrationRecord(submitted);

  if (missingFields.length > 0) {
    const submission = {
      submission_id: createId('SUB'),
      source,
      status: 'flagged',
      reason: 'Required registration fields are missing',
      created_at: new Date().toISOString(),
      submitted,
      validation_errors: missingFields.map(field => ({ field, message: 'Required for verification' })),
      verification_summary: {
        confidence_score: 0,
        risk_level: 'high',
        critical_issues: missingFields.length,
        review_issues: missingFields.length,
        duplicate_signals: 0,
        verification_required: true,
        board_dispatch_allowed: false
      }
    };
    const savedSubmission = db.saveSubmission(submission);
    saveRecordVersion({
      entityType: 'submission',
      entityId: savedSubmission.submission_id,
      actorType: actor.type,
      actorName: actor.name,
      reason: 'submission_rejected_missing_required_fields',
      snapshot: savedSubmission
    });
    logAudit({
      actorType: actor.type,
      actorName: actor.name,
      action: 'registration_validation_failed',
      entityType: 'submission',
      entityId: savedSubmission.submission_id,
      details: {
        source,
        student_id: submitted.student_id,
        missing_fields: missingFields
      }
    });
    return savedSubmission;
  }

  const masterRecord = findMasterRecord(submitted);
  const duplicateSignals = findDuplicateSignals(submitted);

  if (!masterRecord) {
    const submission = {
      submission_id: createId('SUB'),
      source,
      status: 'flagged',
      reason: 'No matching SEE/Class 10 master record found',
      created_at: new Date().toISOString(),
      submitted,
      duplicate_signals: duplicateSignals,
      verification_summary: {
        confidence_score: 0,
        risk_level: 'high',
        critical_issues: 1,
        review_issues: 1,
        duplicate_signals: duplicateSignals.length,
        verification_required: true,
        board_dispatch_allowed: false
      }
    };
    const savedSubmission = db.saveSubmission(submission);
    saveRecordVersion({
      entityType: 'submission',
      entityId: savedSubmission.submission_id,
      actorType: actor.type,
      actorName: actor.name,
      reason: 'submission_created_no_master_match',
      snapshot: savedSubmission
    });
    logAudit({
      actorType: actor.type,
      actorName: actor.name,
      action: 'registration_submitted_no_master_match',
      entityType: 'submission',
      entityId: savedSubmission.submission_id,
      details: {
        source,
        student_id: submitted.student_id,
        see_symbol_no: submitted.see_symbol_no,
        reason: submission.reason
      }
    });
    return savedSubmission;
  }

  const comparison = compareRecords(masterRecord, submitted);
  const duplicateFields = duplicateSignals.map(signal => ({
    field: 'duplicate_registration',
    master_value: signal.submission_id,
    submitted_value: submitted.student_id || submitted.see_symbol_no,
    match: false,
    similarity: 0,
    confidence_score: 0,
    status: 'duplicate_detected',
    rule: 'duplicate_check',
    severity: 'critical',
    risk_level: 'high',
    message: `Possible duplicate registration detected by ${signal.matched_on}.`,
    needs_review: true
  }));
  const flaggedFields = [...comparison.filter(field => field.needs_review), ...duplicateFields];
  const status = flaggedFields.length === 0 ? 'approved' : 'flagged';
  const verificationSummary = summarizeVerification(comparison, duplicateSignals);
  const submission = {
    submission_id: createId('SUB'),
    source,
    status,
    created_at: new Date().toISOString(),
    student_id: masterRecord.student_id,
    see_symbol_no: masterRecord.see_symbol_no,
    school_code: masterRecord.school_code,
    submitted,
    master: masterRecord,
    comparison,
    duplicate_signals: duplicateSignals,
    verification_summary: verificationSummary
  };

  if (status === 'approved') {
    submission.locked = true;
    submission.board_dispatch = dispatchToBoard(submitted, 'auto_approved', {
      actorType: 'system',
      actorName: 'Verification Engine',
      verificationPassed: verificationSummary.board_dispatch_allowed
    });
    const savedSubmission = db.saveSubmission(submission);
    saveRecordVersion({
      entityType: 'submission',
      entityId: savedSubmission.submission_id,
      actorType: actor.type,
      actorName: actor.name,
      reason: 'submission_auto_approved',
      snapshot: savedSubmission
    });
    logAudit({
      actorType: actor.type,
      actorName: actor.name,
      action: 'registration_auto_approved',
      entityType: 'submission',
      entityId: savedSubmission.submission_id,
      details: {
        source,
        student_id: savedSubmission.student_id,
        see_symbol_no: savedSubmission.see_symbol_no,
        board_dispatch_id: submission.board_dispatch.dispatch_id
      }
    });
    return savedSubmission;
  }

  const caseRecord = {
    ticket_id: createId('TICKET'),
    submission_id: submission.submission_id,
    status: 'waiting_student',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    master: masterRecord,
    submitted,
    comparison,
    flagged_fields: flaggedFields,
    duplicate_signals: duplicateSignals,
    verification_summary: verificationSummary,
    correction: null,
    admin_resolution: null,
    access_token: createStudentAccessToken(),
    access_expires_at: createStudentLinkExpiry()
  };

  caseRecord.sms = buildSms(caseRecord);
  caseRecord.email = buildEmailNotification(caseRecord);

  submission.ticket_id = caseRecord.ticket_id;
  submission.sms = caseRecord.sms;
  submission.email = caseRecord.email;
  submission.locked = false;

  db.saveCase(caseRecord);
  const savedSubmission = db.saveSubmission(submission);
  saveRecordVersion({
    entityType: 'submission',
    entityId: savedSubmission.submission_id,
    actorType: actor.type,
    actorName: actor.name,
    reason: 'submission_flagged_for_review',
    snapshot: savedSubmission
  });
  saveRecordVersion({
    entityType: 'verification_case',
    entityId: caseRecord.ticket_id,
    actorType: 'system',
    actorName: 'Verification Engine',
    reason: 'case_created',
    snapshot: caseRecord
  });
  logAudit({
    actorType: actor.type,
    actorName: actor.name,
    action: 'registration_flagged',
    entityType: 'verification_case',
    entityId: caseRecord.ticket_id,
    details: {
      source,
      submission_id: submission.submission_id,
      student_id: savedSubmission.student_id,
      flagged_fields: flaggedFields.map(field => ({
        field: field.field,
        rule: field.rule,
        severity: field.severity,
        status: field.status
      }))
    }
  });
  logAudit({
    actorType: 'system',
    actorName: 'SMS Notification Service',
    action: 'student_sms_link_generated',
    entityType: 'verification_case',
    entityId: caseRecord.ticket_id,
    details: {
      student_id: savedSubmission.student_id,
      correction_url: buildStudentTicketUrl(caseRecord),
      expires_at: caseRecord.access_expires_at,
      flagged_field_count: flaggedFields.length
    }
  });
  return savedSubmission;
}

function parseCsv(text) {
  const rows = parse(text, {
    bom: true,
    relax_column_count: false,
    skip_empty_lines: true,
    trim: true
  });

  if (rows.length < 2) {
    throw new Error('CSV must include a header row and at least one student record');
  }

  const headers = rows[0].map(header => String(header || '').trim());
  const missingHeaders = requiredCsvHeaders.filter(header => !headers.includes(header));

  if (missingHeaders.length > 0) {
    throw new Error(`CSV is missing required header(s): ${missingHeaders.join(', ')}`);
  }

  return rows.slice(1).map(row => {
    return headers.reduce((record, header, index) => {
      record[header] = row[index] || '';
      return record;
    }, {});
  });
}

function parseEmailCsv(text) {
  const rows = parse(text, {
    bom: true,
    relax_column_count: false,
    skip_empty_lines: true,
    trim: true
  });

  if (rows.length < 2) {
    throw new Error('Email CSV must include a header row and at least one student record');
  }

  const headers = rows[0].map(header => String(header || '').trim());
  const missingHeaders = requiredEmailCsvHeaders.filter(header => !headers.includes(header));

  if (missingHeaders.length > 0) {
    throw new Error(`Email CSV is missing required header(s): ${missingHeaders.join(', ')}`);
  }

  return rows.slice(1).map(row => {
    return headers.reduce((record, header, index) => {
      record[header] = row[index] || '';
      return record;
    }, {});
  });
}

function buildVerificationMail(row) {
  const studentName = row.name_en || row.student_id || 'Student';
  const subject = 'Class 11/12 Registration Detail Verification Notice';
  const body = [
    `Dear ${studentName},`,
    '',
    'Your school is verifying Class 11/12 registration details before final board submission.',
    'Please check your English name, Nepali name, date of birth, SEE symbol number, parent details, and permanent address in the school record.',
    '',
    'If any detail is incorrect, contact your school administration office with supporting proof such as birth certificate, citizenship, or SEE certificate.',
    '',
    'This notice is generated by the Student Record Verification System.',
    `School Code: ${row.school_code || DEMO_SCHOOL_CODE}`
  ].join('\n');

  return {
    recipient: row.student_email,
    student_id: row.student_id,
    see_symbol_no: row.see_symbol_no || '',
    student_name: studentName,
    subject,
    body,
    status: row.student_email ? 'sent_simulated' : 'missing_email'
  };
}

function handleUploadError(err, req, res, next) {
  if (!err) {
    next();
    return;
  }

  const message = err.code === 'LIMIT_FILE_SIZE'
    ? 'File size must be 5MB or less'
    : err.message;

  if (req.params.ticketId) {
    logAudit({
      actorType: 'student',
      actorName: 'Student Correction Link',
      action: 'proof_upload_rejected',
      entityType: 'verification_case',
      entityId: req.params.ticketId,
      details: { reason: message }
    });
  }

  res.status(400).json({
    error: {
      code: err.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'INVALID_UPLOAD',
      message,
      details: {}
    }
  });
}

function requireStudentTicketAccess(req, res, next) {
  const caseRecord = db.getCase(req.params.ticketId);
  const token = req.query.token || req.body?.token;

  if (!caseRecord) {
    return sendError(res, 404, 'TICKET_NOT_FOUND', 'Correction ticket not found');
  }

  if (!caseRecord.access_token || token !== caseRecord.access_token) {
    logAudit({
      actorType: 'student',
      actorName: 'Student Correction Link',
      action: 'student_ticket_access_rejected',
      entityType: 'verification_case',
      entityId: req.params.ticketId,
      details: { reason: 'invalid_or_missing_token' }
    });

    return sendError(res, 403, 'INVALID_TICKET_TOKEN', 'Correction link is invalid or missing its secure token');
  }

  if (new Date(caseRecord.access_expires_at).getTime() < Date.now()) {
    logAudit({
      actorType: 'student',
      actorName: caseRecord.master?.name_en || 'Student Correction Link',
      action: 'student_ticket_access_rejected',
      entityType: 'verification_case',
      entityId: req.params.ticketId,
      details: { reason: 'expired_token', expired_at: caseRecord.access_expires_at }
    });

    return sendError(res, 403, 'TICKET_EXPIRED', 'Correction link has expired. Please contact your school admin.');
  }

  req.caseRecord = caseRecord;
  next();
}

function buildStudentTicketResponse(caseRecord) {
  return {
    ticket_id: caseRecord.ticket_id,
    status: caseRecord.status,
    student_name: caseRecord.master.name_en,
    flagged_fields: caseRecord.flagged_fields,
    submitted: caseRecord.submitted,
    correction: caseRecord.correction
      ? {
          submitted_at: caseRecord.correction.submitted_at,
          description: caseRecord.correction.description,
          proof_file: caseRecord.correction.proof_file
            ? {
                original_name: caseRecord.correction.proof_file.original_name,
                url: caseRecord.correction.proof_file.url
              }
            : null
        }
      : null,
    expires_at: caseRecord.access_expires_at
  };
}

app.get('/', (req, res) => {
  res.json({ message: 'Student Verification backend is running' });
});

app.post('/auth/login', rateLimit('login', 20, 15 * 60 * 1000), (req, res) => {
  const { username, password } = req.body;
  const user = demoUsers.find(item => item.username === username && item.password === password);

  if (user) {
    logAudit({
      actorType: user.role,
      actorName: user.name,
      action: 'admin_login_success',
      entityType: 'session',
      entityId: `${user.role}-session`,
      details: {
        username,
        role: user.role,
        school_code: user.school_code
      }
    });

    return res.json({
      token: createSessionToken(user),
      user: {
        name: user.name,
        role: user.role,
        school_code: user.school_code,
        province_code: user.province_code,
        permissions: user.permissions
      }
    });
  }

  logAudit({
    actorType: 'unknown',
    actorName: username || 'unknown',
    action: 'admin_login_failed',
    entityType: 'session',
    entityId: 'failed-login',
    details: { username: username || '' }
  });

  return sendError(res, 401, 'INVALID_CREDENTIALS', 'Invalid admin credentials');
});

app.get('/master-records', requireAdmin, (req, res) => {
  res.json(students);
});

app.get('/dashboard', requireAdmin, (req, res) => {
  const submissions = db.listSubmissions();
  const cases = db.listCases();
  const boardDispatches = db.listDispatches();
  const auditEvents = db.listAuditEvents(100);
  const emailCampaigns = db.listEmailCampaigns();

  res.json({
    metrics: {
      master_records: students.length,
      total_submissions: submissions.length,
      approved: submissions.filter(item => item.status === 'approved').length,
      flagged: cases.filter(item => item.status !== 'resolved').length,
      pending_student: cases.filter(item => item.status === 'waiting_student').length,
      pending_admin: cases.filter(item => item.status === 'student_submitted').length,
      sent_to_board: boardDispatches.length,
      email_notices: emailCampaigns.reduce((total, campaign) => total + campaign.prepared_count, 0),
      duplicate_alerts: submissions.reduce((total, item) => total + (item.duplicate_signals?.length || 0), 0),
      average_confidence: buildDashboardAnalytics(submissions, cases).average_confidence
    },
    analytics: buildDashboardAnalytics(submissions, cases),
    submissions,
    cases,
    board_dispatches: boardDispatches,
    email_campaigns: emailCampaigns,
    audit_events: auditEvents
  });
});

app.post('/submissions', requireSubmissionCreate, (req, res) => {
  const submission = verifySubmission(req.body, 'single_entry', {
    type: req.user.role,
    name: req.user.name
  });
  res.status(201).json(submission);
});

app.post('/submissions/bulk', requireSubmissionCreate, upload.single('file'), (req, res) => {
  if (!req.file) {
    return sendError(res, 400, 'CSV_FILE_REQUIRED', 'CSV file is required');
  }

  let records = [];

  try {
    const csv = fs.readFileSync(req.file.path, 'utf8');
    records = parseCsv(csv);
  } catch (err) {
    logAudit({
      actorType: req.user.role,
      actorName: req.user.name,
      action: 'bulk_registration_rejected',
      entityType: 'bulk_upload',
      entityId: req.file.filename,
      details: {
        original_name: req.file.originalname,
        reason: err.message
      }
    });

    return sendError(res, 400, 'INVALID_CSV', err.message);
  }

  const results = records.map(record => verifySubmission(record, 'bulk_upload', {
    type: req.user.role,
    name: req.user.name
  }));
  logAudit({
    actorType: req.user.role,
    actorName: req.user.name,
    action: 'bulk_registration_uploaded',
    entityType: 'bulk_upload',
    entityId: req.file.filename,
    details: {
      original_name: req.file.originalname,
      imported: results.length,
      approved: results.filter(item => item.status === 'approved').length,
      flagged: results.filter(item => item.status === 'flagged').length
    }
  });

  res.status(201).json({
    imported: results.length,
    approved: results.filter(item => item.status === 'approved').length,
    flagged: results.filter(item => item.status === 'flagged').length,
    results
  });
});

app.get('/cases', requireCaseReview, (req, res) => {
  res.json(db.listCases());
});

app.get('/sample-csv', requireSubmissionCreate, (req, res) => {
  const csv = [
    [...requiredCsvHeaders.slice(0, 4), 'student_email', ...requiredCsvHeaders.slice(4)].join(','),
    'SEE-2081-0002,2081-1031-S014,Sita Rai,सीता राई,sita.rai@example.edu.np,Madan Rai,Laxmi Rai,2059-01-10,2002-04-23,Female,SCH-1031,Dharan-12 Sunsari',
    'SEE-2081-0001,2081-1029-A001,Aman Aansari,अमन अंसारी,aman.ansari@example.edu.np,Karim Ansari,Ruksana Ansari,2058-03-12,2001-06-25,Male,SCH-1029,Biratnagar-8 Morang'
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="student-registration-sample.csv"');
  res.send(csv);
});

app.get('/sample-email-csv', requireSubmissionCreate, (req, res) => {
  const csv = [
    ['student_id', 'see_symbol_no', 'name_en', 'student_email', 'school_code'].join(','),
    'SEE-2081-0001,2081-1029-A001,Aman Ansari,aman.ansari@example.edu.np,SCH-1029',
    'SEE-2081-0002,2081-1031-S014,Sita Rai,sita.rai@example.edu.np,SCH-1031',
    'SEE-2081-0003,2081-1029-R042,Rohan Thapa,rohan.thapa@example.edu.np,SCH-1029'
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="student-email-notice-sample.csv"');
  res.send(csv);
});

app.post('/notifications/email-campaigns', requireSubmissionCreate, upload.single('file'), (req, res) => {
  if (!req.file) {
    return sendError(res, 400, 'EMAIL_CSV_REQUIRED', 'Student email CSV file is required');
  }

  let records = [];

  try {
    const csv = fs.readFileSync(req.file.path, 'utf8');
    records = parseEmailCsv(csv);
  } catch (err) {
    logAudit({
      actorType: req.user.role,
      actorName: req.user.name,
      action: 'email_campaign_rejected',
      entityType: 'email_campaign',
      entityId: req.file.filename,
      details: {
        original_name: req.file.originalname,
        reason: err.message
      }
    });

    return sendError(res, 400, 'INVALID_EMAIL_CSV', err.message);
  }

  const messages = records.map(buildVerificationMail);
  const preparedCount = messages.filter(message => message.status === 'sent_simulated').length;
  const skippedCount = messages.length - preparedCount;
  const campaign = {
    campaign_id: createId('MAIL'),
    status: 'sent_simulated',
    delivery_mode: 'simulated_email_gateway',
    created_at: new Date().toISOString(),
    original_file: req.file.originalname,
    prepared_count: preparedCount,
    skipped_count: skippedCount,
    messages
  };

  const savedCampaign = db.saveEmailCampaign(campaign);
  logAudit({
    actorType: req.user.role,
    actorName: req.user.name,
    action: 'email_campaign_sent_simulated',
    entityType: 'email_campaign',
    entityId: savedCampaign.campaign_id,
    details: {
      original_name: req.file.originalname,
      prepared: preparedCount,
      skipped: skippedCount,
      delivery_mode: campaign.delivery_mode
    }
  });

  res.status(201).json(savedCampaign);
});

app.post('/demo/reset', requireWorkspaceReset, (req, res) => {
  db.resetDemoData();
  const resetEvent = logAudit({
    actorType: req.user.role,
    actorName: req.user.name,
    action: 'demo_data_reset',
    entityType: 'system',
    entityId: 'demo-database',
    details: {
      reset_at: new Date().toISOString(),
      retained_master_records: students.length
    }
  });

  res.json({
    status: 'reset_complete',
    retained_master_records: students.length,
    audit_event: resetEvent
  });
});

app.get('/student/ticket/:ticketId', requireStudentTicketAccess, (req, res) => {
  res.json(buildStudentTicketResponse(req.caseRecord));
});

app.post('/student/ticket/:ticketId/correction', rateLimit('student-correction', 30, 15 * 60 * 1000), requireStudentTicketAccess, proofUpload.single('proof'), handleUploadError, (req, res) => {
  const caseRecord = req.caseRecord;
  const proofHash = req.file
    ? crypto.createHash('sha256').update(fs.readFileSync(req.file.path)).digest('hex')
    : null;
  caseRecord.correction = {
    submitted_at: new Date().toISOString(),
    description: req.body.description || '',
    corrected: normalizeRecord(req.body),
    proof_file: req.file
      ? {
          original_name: req.file.originalname,
          stored_name: req.file.filename,
          url: `/uploads/${req.file.filename}`,
          mime_type: req.file.mimetype,
          size_bytes: req.file.size,
          sha256: proofHash,
          validation_status: 'accepted_for_school_review'
        }
      : null
  };
  caseRecord.status = 'student_submitted';
  caseRecord.updated_at = new Date().toISOString();

  const savedCase = db.saveCase(caseRecord);
  saveRecordVersion({
    entityType: 'verification_case',
    entityId: caseRecord.ticket_id,
    actorType: 'student',
    actorName: caseRecord.master.name_en,
    reason: 'student_correction_submitted',
    snapshot: savedCase
  });
  logAudit({
    actorType: 'student',
    actorName: caseRecord.master.name_en,
    action: 'student_correction_submitted',
    entityType: 'verification_case',
    entityId: caseRecord.ticket_id,
    details: {
      student_id: caseRecord.master.student_id,
      proof_file: caseRecord.correction.proof_file?.original_name || null,
      description_provided: Boolean(caseRecord.correction.description)
    }
  });

  res.status(201).json(buildStudentTicketResponse(savedCase));
});

app.post('/cases/:ticketId/resolve', requireCaseReview, (req, res) => {
  const caseRecord = db.getCase(req.params.ticketId);

  if (!caseRecord) {
    return sendError(res, 404, 'CASE_NOT_FOUND', 'Verification case not found');
  }

  const finalRecord = normalizeRecord(req.body);
  const masterRecord = caseRecord.master;
  const finalComparison = compareRecords(masterRecord, finalRecord);
  const stillFlagged = finalComparison.filter(field => field.needs_review);
  const finalSummary = summarizeVerification(finalComparison, []);

  caseRecord.admin_resolution = {
    resolved_at: new Date().toISOString(),
    final_record: finalRecord,
    comparison: finalComparison,
    verification_summary: finalSummary,
    note: req.body.note || ''
  };
  caseRecord.status = stillFlagged.length === 0 ? 'resolved' : 'needs_manual_board_review';
  caseRecord.updated_at = new Date().toISOString();

  if (caseRecord.status === 'resolved') {
    caseRecord.board_dispatch = dispatchToBoard(finalRecord, 'admin_reverified', {
      actorType: 'school_admin',
      actorName: req.user.name,
      ticketId: caseRecord.ticket_id,
      verificationPassed: finalSummary.board_dispatch_allowed
    });

    const submission = db.getSubmission(caseRecord.submission_id);
    if (submission) {
      submission.status = 'approved';
      submission.locked = true;
      submission.board_dispatch = caseRecord.board_dispatch;
      db.saveSubmission(submission);
    }
  }

  const savedCase = db.saveCase(caseRecord);
  saveRecordVersion({
    entityType: 'verification_case',
    entityId: caseRecord.ticket_id,
    actorType: req.user.role,
    actorName: req.user.name,
    reason: caseRecord.status === 'resolved' ? 'case_resolved' : 'case_manual_board_review_required',
    snapshot: savedCase
  });
  logAudit({
    actorType: req.user.role,
    actorName: req.user.name,
    action: caseRecord.status === 'resolved' ? 'case_resolved' : 'case_marked_for_manual_board_review',
    entityType: 'verification_case',
    entityId: caseRecord.ticket_id,
    details: {
      student_id: caseRecord.master.student_id,
      final_status: caseRecord.status,
      board_dispatch_id: caseRecord.board_dispatch?.dispatch_id || null,
      remaining_flagged_fields: stillFlagged.map(field => field.field)
    }
  });

  res.json(savedCase);
});

app.post('/submit', (req, res) => {
  const submission = verifySubmission(req.body, 'legacy_submit', {
    type: 'system',
    name: 'Legacy Submit Endpoint'
  });
  res.status(201).json(submission);
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    sendError(res, 400, 'INVALID_JSON', 'Request body must be valid JSON');
    return;
  }

  console.error(err);
  sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'Unexpected server error');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
