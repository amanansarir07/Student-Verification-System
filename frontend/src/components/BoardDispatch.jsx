import StatusBadge from './StatusBadge';

export default function BoardDispatch({ dispatches }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Dispatch ID</th>
            <th>Student</th>
            <th>SEE Symbol No.</th>
            <th>Status</th>
            <th>Certificate</th>
          </tr>
        </thead>
        <tbody>
          {dispatches.length === 0 ? (
            <tr><td colSpan="5">No board dispatches yet.</td></tr>
          ) : dispatches.map(item => (
            <tr key={item.dispatch_id}>
              <td>{item.dispatch_id}</td>
              <td>{item.payload.name_en}</td>
              <td>{item.payload.see_symbol_no}</td>
              <td><StatusBadge status={item.status} /></td>
              <td>
                <strong>{item.verification_certificate?.certificate_id || 'Pending'}</strong>
                {item.verification_certificate && (
                  <details className="table-details">
                    <summary>Technical details</summary>
                    <span>Source: {item.source}</span>
                    <span>Signature: {item.signature_preview || '-'}</span>
                    <span>Hash: {item.payload_hash?.slice(0, 24) || '-'}</span>
                    <span>QR payload: {item.verification_certificate.qr_payload || '-'}</span>
                  </details>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
