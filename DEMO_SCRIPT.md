# Demo Script

Use this as a 2-3 minute judging flow. Keep the explanation focused on the problem, the workflow, and the safeguards.

## Opening

This project solves a common registration problem in the education system: schools submit Class 11/12 student records manually, and small mistakes in English/Nepali names, DOB, SEE symbol numbers, addresses, or parent details can create certificate problems later.

Our system verifies school-submitted records against SEE/Class 10 master records before the final board submission.

## Demo Flow

1. Open the admin portal.

```txt
http://127.0.0.1:5173
```

2. Login as school admin.

```txt
Username: admin
Password: admin123
```

3. Show the Dashboard.

Say:

The dashboard shows master records, submitted records, active flags, pending admin cases, and records sent to board dispatch.

4. Go to Registration Entry.

Say:

The school can enter one student manually or upload a CSV for bulk registration, including English name, Nepali name, parent details, DOB, SEE symbol number, school code, and permanent address.

5. Submit a verified record.

Use:

```txt
Use verified record
Submit for verification
```

Say:

Because every field matches the official SEE master record, the system auto-approves this record and sends it to board dispatch.

6. Open Board Dispatch.

Show:

- dispatch ID
- status
- source
- payload hash

Say:

The payload hash represents a tamper-evident dispatch record. In production this can integrate with NEB/IEMIS or a stronger signing system.

7. Go back to Registration Entry and submit a record requiring review.

Use:

```txt
Use record requiring review
Submit for verification
```

Say:

This record has spelling differences in the student name fields. Names and address are allowed fuzzy review, but exact identifiers and DOB must match strictly.

8. Open Flagged Cases.

Show:

- status badge
- mismatch table
- school entry
- official record
- rule
- severity
- SMS correction link

Say:

The system creates a flagged case and generates a secure student correction link. The link contains a private token and expires after a fixed period.

9. Copy the correction link and open it.

Say:

The student does not need a full account. They can open the secure link sent by SMS and see only the fields that need correction.

10. In Student Portal, submit correction.

Fill corrected name and upload a PDF/JPG/PNG proof.

Say:

The student adds a description and proof document. The backend validates upload type and size.

11. Return to Admin Flagged Cases.

Show:

- student correction received
- proof file link
- final verified record form

Say:

The school admin reviews the proof and can confirm the final verified data. This also handles cases where a student does not respond, because the admin can verify offline documents and resolve the case.

12. Click Re-verify and send to board.

Say:

Once the corrected record matches the master data, it is marked resolved and dispatched to board.

13. Open Audit Trail.

Show:

- login
- registration flagged
- SMS link generated
- student correction submitted
- case resolved
- board dispatch sent

Say:

Every important action is logged. For a government system, this audit trail is critical for accountability.

14. Optional: Open Notifications.

Show:

- upload student email CSV
- local delivery record for email notices
- prepared/skipped counts
- email preview table

Say:

Schools can also upload a student email list exported from Excel and prepare verification notices for all listed students. In production, this connects to SMTP or a government mail gateway.

## Important Talking Points

- This is not only a form. It is a full verification workflow.
- Exact fields like DOB and SEE symbol number are strict.
- English/Nepali name fields allow review because spelling variations happen.
- Permanent address differences are flagged for admin review.
- Student correction links are token-protected and expire.
- Proof uploads are restricted to PDF/JPG/PNG.
- Final board dispatch includes a payload hash.
- SQLite is used for local persistence; production can use PostgreSQL.
- SMS and NEB/IEMIS integrations are represented through local delivery records and dispatch hashes, with clear production integration points.
- Email notices can be prepared from school-uploaded CSV files; real SMTP delivery is a production integration layer.

## If Asked About Production

Answer:

For production, we would add role-based authentication, official school accounts, real SMS gateway integration, PostgreSQL, object storage for proof documents, rate limiting, HTTPS-only deployment, and integration with NEB/IEMIS APIs.

## Backup Plan

If the live walkthrough has a problem:

1. Restart backend.
2. Restart frontend.
3. Use Reset Workspace.
4. Follow the same flow again.

Commands:

```bash
cd backend
npm start
```

```bash
cd frontend
npm run dev
```
