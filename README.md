# Student Record Verification System

A web-based verification workflow for checking Class 11/12 student registration records against official SEE/Class 10 master records before final submission to NEB/IEMIS.

The system is designed for a government or education-board workflow where schools submit student data, mismatches are flagged early, students can correct issues through secure links, and only verified records are dispatched to the board.

## Problem

Student registration data is often entered manually by schools. Small mistakes in English/Nepali names, dates of birth, SEE symbol numbers, addresses, or parent details can later create certificate and board-registration problems.

This system reduces that risk by checking submitted registration data before final board dispatch.

## Core Workflow

1. School admin logs in.
2. School admin submits a single student record or uploads a bulk CSV.
3. Backend verifies submitted fields against SEE master records.
4. Exact records are auto-approved and sent to board dispatch.
5. Mismatched records become flagged cases.
6. System generates a secure student correction link with expiry.
7. Student opens the link, corrects the issue, adds a description, and uploads proof.
8. School admin reviews the correction and proof.
9. Admin re-verifies and submits final approved data to board dispatch.
10. Audit trail records the full lifecycle.

## Features

- Government-style admin portal
- Admin login
- Student correction portal without student login
- Secure student ticket links with token and expiry
- Single student registration verification
- Bulk CSV upload
- Real CSV parser with required-header validation
- Field-specific verification rules
- Nepali full name and permanent address verification
- Proof document upload with file validation
- Student email notice campaign from CSV exported from Excel
- SQLite persistence
- Audit trail
- Board dispatch simulation
- SHA-256 payload hash for dispatched records
- Workspace reset endpoint
- Backend and frontend tests

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

This means a spelling variation in a name can be marked for review, but a one-day DOB difference is treated as a critical mismatch.

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
- Multer for uploads
- csv-parse for CSV handling
- string-similarity for fuzzy name comparison

## Project Structure

```txt
Student-Verification-System/
  backend/
    compare.js
    compare.test.js
    db.js
    server.js
    student.json
    uploads/
    data/
  frontend/
    src/
      App.jsx
      App.css
      utils.js
      utils.test.js
```

`backend/data/` and `backend/uploads/` are runtime folders and are ignored by Git.

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

## Environment Variables

Backend example:

```bash
cd backend
copy .env.example .env
```

Frontend example:

```bash
cd frontend
copy .env.example .env
```

The defaults work locally even without `.env` files.

## Run Locally

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

## Evaluation Login

```txt
Username: admin
Password: admin123
```

## Bulk CSV Format

Required headers:

```txt
student_id,see_symbol_no,name_en,name_np,father_name,mother_name,dob_bs,dob_ad,gender,school_code,permanent_address
```

The admin portal includes a `Download CSV template` button.

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
- SMTP/mail gateway integration for prepared email campaigns
- PostgreSQL or government-managed database
- Object storage for proof files
- Rate limiting
- HTTPS-only deployment
- Stronger signed payload infrastructure

## Hackathon Scope

This is a hackathon build of a deployable verification workflow. SMS delivery and NEB/IEMIS integration are represented as production integration points, while the data flow, validation, audit trail, correction portal, and dispatch model are implemented.
