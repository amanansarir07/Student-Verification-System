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
            <th>Source</th>
            <th>Payload Hash</th>
            <th>Certificate</th>
          </tr>
        </thead>
        <tbody>
          {dispatches.length === 0 ? (
            <tr><td colSpan="7">No board dispatches yet.</td></tr>
          ) : dispatches.map(item => (
            <tr key={item.dispatch_id}>
              <td>{item.dispatch_id}</td>
              <td>{item.payload.name_en}</td>
              <td>{item.payload.see_symbol_no}</td>
              <td><StatusBadge status={item.status} /></td>
              <td>{item.source}</td>
              <td>
                <strong>{item.signature_preview || 'Pending'}</strong>
                <span className="cell-subtext">{item.payload_hash?.slice(0, 24) || '-'}</span>
              </td>
              <td>
                <strong>{item.verification_certificate?.certificate_id || 'Pending'}</strong>
                <span className="cell-subtext">{item.verification_certificate?.qr_payload || '-'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
