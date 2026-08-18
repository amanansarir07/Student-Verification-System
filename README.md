# Student Record Verification System

A hackathon prototype for verifying Class 12 student registration records against local SEE/Class 10 master-record data before simulated board dispatch.

## Credit

Originally conceptualized and built by Aman Ansari and Faishal Miya for WCBT Hackathon 2026.

## Problem

Student registration data is often entered manually by schools. Small mistakes in names, dates of birth, SEE symbol numbers, addresses, or parent details can later create certificate and board-registration issues.

This system helps identify those issues early through strict and fuzzy verification, secure student correction links, proof upload, admin review, and an audit trail.

## Core Workflow

1. School admin logs in.
2. Admin submits a single student record or uploads a bulk CSV.
3. Backend verifies submitted fields against local SEE master-record data.
4. Exact records are auto-approved for simulated board dispatch.
5. Mismatched records become flagged cases.
6. System generates a secure correction link with token and expiry.
7. Student opens the link, corrects the issue, adds a description, and uploads proof.
8. Admin reviews the correction and proof.
9. Admin re-verifies the record and submits approved data to simulated board dispatch.
10. Audit trail records the lifecycle.

## Features

- Verification Control Center dashboard for school administration workflows
- Admin login
- Single student registration verification
- Bulk CSV upload with required-header validation
- Strict and fuzzy field verification
- Secure student correction links with token and expiry
- Student correction portal without student login
- Proof document upload with file validation
- Admin correction review
- Audit trail
- SQLite persistence
- SHA-256 payload hash for dispatched records
- Simulated board dispatch
- Simulated SMS/email and NEB/IEMIS integration points

## Verification Rules

Strict exact-match fields:

- SEE symbol number
- DOB B.S.
- DOB A.D.
- Gender
- School code

Fuzzy review fields:

- Student name
- Student name in Nepali
- Father name
- Mother name
- Permanent address

A spelling variation in a name can be marked for review, while a one-day DOB difference is treated as a critical mismatch.

## Tech Stack

Frontend:

- React
- Vite
- Vitest
- CSS

Backend:

- Node.js
- Express
- SQLite through Node built-in `node:sqlite`
- Multer
- csv-parse
- string-similarity

## Setup

Install backend dependencies:

```bash
cd backend
npm install
```

Install frontend dependencies:

```bash
cd frontend
npm install
```

Environment files:

```bash
cd backend
copy .env.example .env
```

```bash
cd frontend
copy .env.example .env
```

The defaults work locally even without `.env` files.

Start backend:

```bash
cd backend
npm start
```

Start frontend:

```bash
cd frontend
npm run dev
```

Open:

```txt
http://127.0.0.1:5173
```

Evaluation login:

```txt
Username: admin
Password: admin123
```

## Tests

Backend tests:

```bash
cd backend
npm test
```

Frontend tests:

```bash
cd frontend
npm test
```

Frontend lint and build:

```bash
cd frontend
npm run lint
npm run build
```

## Security Notes

Implemented in the current build:

- Admin-only protected routes
- Secure random student correction token
- Correction link expiry
- Upload file type validation
- Upload size limit
- Structured API errors
- Audit logging

Production improvements:

- Real role-based authentication
- Password hashing and account management
- SMS gateway integration
- SMTP/mail gateway integration
- PostgreSQL or government-managed database
- Object storage for proof files
- Rate limiting
- HTTPS-only deployment
- Stronger signed payload infrastructure

## Hackathon Scope

This is a hackathon build of a verification workflow prototype. SMS delivery, email delivery, NEB submission, and IEMIS submission are represented as simulated production integration points. The implemented scope focuses on local data flow, validation, audit trail, correction links, proof upload, admin review, SHA-256 dispatch payload hashing, and board dispatch simulation.

## Authors

Aman Ansari and Faishal Miya

## License

Licensed under the MIT License. Copyright (c) 2026 Aman Ansari and Faishal Miya.
