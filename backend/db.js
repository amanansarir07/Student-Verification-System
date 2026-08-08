const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'verification.sqlite'));

db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    submission_id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS verification_cases (
    ticket_id TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS board_dispatches (
    dispatch_id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    source TEXT NOT NULL,
    submitted_at TEXT NOT NULL,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_events (
    event_id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    actor_type TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS email_campaigns (
    campaign_id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS record_versions (
    version_id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    version_no INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    actor_type TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    reason TEXT NOT NULL,
    data TEXT NOT NULL
  );
`);

function parseRow(row) {
  return JSON.parse(row.data);
}

function listSubmissions() {
  return db.prepare('SELECT data FROM submissions ORDER BY created_at DESC').all().map(parseRow);
}

function getSubmission(submissionId) {
  const row = db.prepare('SELECT data FROM submissions WHERE submission_id = ?').get(submissionId);
  return row ? parseRow(row) : null;
}

function saveSubmission(submission) {
  db.prepare(`
    INSERT INTO submissions (submission_id, status, created_at, data)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(submission_id) DO UPDATE SET
      status = excluded.status,
      data = excluded.data
  `).run(
    submission.submission_id,
    submission.status,
    submission.created_at,
    JSON.stringify(submission)
  );
  return submission;
}

function listCases() {
  return db.prepare('SELECT data FROM verification_cases ORDER BY updated_at DESC').all().map(parseRow);
}

function getCase(ticketId) {
  const row = db.prepare('SELECT data FROM verification_cases WHERE ticket_id = ?').get(ticketId);
  return row ? parseRow(row) : null;
}

function saveCase(caseRecord) {
  db.prepare(`
    INSERT INTO verification_cases (ticket_id, submission_id, status, created_at, updated_at, data)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(ticket_id) DO UPDATE SET
      status = excluded.status,
      updated_at = excluded.updated_at,
      data = excluded.data
  `).run(
    caseRecord.ticket_id,
    caseRecord.submission_id,
    caseRecord.status,
    caseRecord.created_at,
    caseRecord.updated_at,
    JSON.stringify(caseRecord)
  );
  return caseRecord;
}

function listDispatches() {
  return db.prepare('SELECT data FROM board_dispatches ORDER BY submitted_at DESC').all().map(parseRow);
}

function saveDispatch(dispatch) {
  db.prepare(`
    INSERT INTO board_dispatches (dispatch_id, status, source, submitted_at, data)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(dispatch_id) DO UPDATE SET
      status = excluded.status,
      data = excluded.data
  `).run(
    dispatch.dispatch_id,
    dispatch.status,
    dispatch.source,
    dispatch.submitted_at,
    JSON.stringify(dispatch)
  );
  return dispatch;
}

function listAuditEvents(limit = 100) {
  return db.prepare(`
    SELECT data FROM audit_events
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(limit).map(parseRow);
}

function saveAuditEvent(event) {
  db.prepare(`
    INSERT INTO audit_events (
      event_id,
      timestamp,
      actor_type,
      actor_name,
      action,
      entity_type,
      entity_id,
      data
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    event.event_id,
    event.timestamp,
    event.actor_type,
    event.actor_name,
    event.action,
    event.entity_type,
    event.entity_id,
    JSON.stringify(event)
  );
  return event;
}

function listRecordVersions(entityType, entityId) {
  return db.prepare(`
    SELECT data FROM record_versions
    WHERE entity_type = ? AND entity_id = ?
    ORDER BY version_no ASC
  `).all(entityType, entityId).map(parseRow);
}

function saveRecordVersion(version) {
  const latest = db.prepare(`
    SELECT version_no FROM record_versions
    WHERE entity_type = ? AND entity_id = ?
    ORDER BY version_no DESC
    LIMIT 1
  `).get(version.entity_type, version.entity_id);
  const versionNo = latest ? latest.version_no + 1 : 1;
  const record = {
    ...version,
    version_no: versionNo
  };

  db.prepare(`
    INSERT INTO record_versions (
      version_id,
      entity_type,
      entity_id,
      version_no,
      created_at,
      actor_type,
      actor_name,
      reason,
      data
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    record.version_id,
    record.entity_type,
    record.entity_id,
    record.version_no,
    record.created_at,
    record.actor_type,
    record.actor_name,
    record.reason,
    JSON.stringify(record)
  );
  return record;
}

function listEmailCampaigns() {
  return db.prepare('SELECT data FROM email_campaigns ORDER BY created_at DESC').all().map(parseRow);
}

function saveEmailCampaign(campaign) {
  db.prepare(`
    INSERT INTO email_campaigns (campaign_id, status, created_at, data)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(campaign_id) DO UPDATE SET
      status = excluded.status,
      data = excluded.data
  `).run(
    campaign.campaign_id,
    campaign.status,
    campaign.created_at,
    JSON.stringify(campaign)
  );
  return campaign;
}

function resetDemoData() {
  db.exec(`
    DELETE FROM audit_events;
    DELETE FROM board_dispatches;
    DELETE FROM verification_cases;
    DELETE FROM submissions;
    DELETE FROM email_campaigns;
    DELETE FROM record_versions;
  `);
}

module.exports = {
  getCase,
  getSubmission,
  listAuditEvents,
  listCases,
  listDispatches,
  listEmailCampaigns,
  listRecordVersions,
  listSubmissions,
  saveAuditEvent,
  saveCase,
  saveDispatch,
  saveEmailCampaign,
  saveRecordVersion,
  saveSubmission,
  resetDemoData
};
