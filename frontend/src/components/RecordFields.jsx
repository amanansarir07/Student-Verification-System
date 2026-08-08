import { fieldLabels } from '../constants';

export default function RecordFields({ record, onChange, compact = false }) {
  const groups = [
    { title: 'Registration identifiers', keys: ['student_id', 'see_symbol_no'] },
    { title: 'Student name details', keys: ['name_en', 'name_np'] },
    { title: 'Contact details', keys: ['student_email'] },
    { title: 'Parent details', keys: ['father_name', 'mother_name'] },
    { title: 'Birth details', keys: ['dob_bs', 'dob_ad', 'gender'] },
    { title: 'Institution and address', keys: ['school_code', 'permanent_address'] }
  ];

  return (
    <div className={compact ? 'record-sections compact' : 'record-sections'}>
      {groups.map(group => (
        <section className="record-section" key={group.title}>
          <h3>{group.title}</h3>
          <div className="record-grid">
            {group.keys.map(key => (
              <label key={key}>
                {fieldLabels[key]}
                <input value={record[key] || ''} onChange={event => onChange({ ...record, [key]: event.target.value })} />
              </label>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
