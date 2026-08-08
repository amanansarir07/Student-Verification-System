import { demoApproved, demoMismatch } from '../constants';
import RecordFields from './RecordFields';
import { ProcessingIndicator, SubmissionReceipt } from './shared';

export default function RegistrationEntry({
  record,
  setRecord,
  isSubmitting,
  submissionReceipt,
  submitRecord,
  uploadCsv,
  downloadSampleCsv,
  onViewCases,
  onViewBoard
}) {
  return (
    <>
      {isSubmitting && <ProcessingIndicator text="Verifying submitted registration records..." />}
      {submissionReceipt && (
        <SubmissionReceipt
          receipt={submissionReceipt}
          onViewCases={onViewCases}
          onViewBoard={onViewBoard}
        />
      )}
      <div className="registration-layout">
        <form className="panel inset-panel" onSubmit={submitRecord}>
          <h2>Individual registration verification</h2>
          <div className="sample-tools">
            <span>Quick entry presets</span>
            <div className="button-row">
              <button type="button" onClick={() => setRecord(demoMismatch)}>Use record requiring review</button>
              <button type="button" onClick={() => setRecord(demoApproved)}>Use verified record</button>
            </div>
          </div>
          <RecordFields record={record} onChange={setRecord} />
          <button className="primary-action" disabled={isSubmitting}>
            {isSubmitting ? 'Verifying record...' : 'Submit for verification'}
          </button>
        </form>
        <section className="panel inset-panel">
          <h2>Bulk upload</h2>
          <p className="muted">Upload a school registration CSV to verify multiple students in one batch.</p>
          <button type="button" onClick={downloadSampleCsv}>Download CSV template</button>
          <div className="upload-line stacked">
            <span>Bulk registration CSV</span>
            <input type="file" accept=".csv" onChange={uploadCsv} />
          </div>
          <p className="hint">CSV headers: student_id, see_symbol_no, name_en, name_np, student_email, father_name, mother_name, dob_bs, dob_ad, gender, school_code, permanent_address</p>
        </section>
      </div>
    </>
  );
}
