import { demoApproved, demoMismatch } from '../constants';
import { Download, FileCheck2, UploadCloud } from 'lucide-react';
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
          <details className="sample-tools">
            <summary>Evaluation shortcuts</summary>
            <p className="sample-tools-note">For presentation walkthroughs only. These options populate representative records for verification.</p>
            <div className="button-row">
              <button type="button" onClick={() => setRecord(demoMismatch)}>Load review scenario</button>
              <button type="button" onClick={() => setRecord(demoApproved)}>Load matched scenario</button>
            </div>
          </details>
          <RecordFields record={record} onChange={setRecord} />
          <button className="primary-action" disabled={isSubmitting}>
            <FileCheck2 size={16} aria-hidden="true" />
            {isSubmitting ? 'Verifying record...' : 'Submit for verification'}
          </button>
        </form>
        <section className="panel inset-panel">
          <h2>Bulk upload</h2>
          <p className="muted">Upload a school registration CSV to verify multiple students in one batch.</p>
          <button type="button" onClick={downloadSampleCsv}><Download size={16} aria-hidden="true" />Download CSV template</button>
          <div className="upload-line stacked">
            <span><UploadCloud size={16} aria-hidden="true" />Bulk registration CSV</span>
            <input type="file" accept=".csv" onChange={uploadCsv} />
          </div>
          <details className="upload-details">
            <summary>View required CSV columns</summary>
            <p className="hint">student_id, see_symbol_no, name_en, name_np, student_email, father_name, mother_name, dob_bs, dob_ad, gender, school_code, permanent_address</p>
          </details>
        </section>
      </div>
    </>
  );
}
