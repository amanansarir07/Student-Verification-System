const assert = require('assert');
const compareRecords = require('./compare');
const { summarizeVerification } = require('./compare');

const master = {
  student_id: 'SEE-2081-0001',
  see_symbol_no: '2081-1029-A001',
  name_en: 'Aman Ansari',
  name_np: 'अमन अन्सारी',
  father_name: 'Karim Ansari',
  mother_name: 'Ruksana Ansari',
  dob_bs: '2058-03-12',
  dob_ad: '2001-06-25',
  gender: 'Male',
  school_code: 'SCH-1029',
  permanent_address: 'Biratnagar-8 Morang'
};

function fieldResult(overrides, field) {
  return compareRecords(master, { ...master, ...overrides }).find(item => item.field === field);
}

function run() {
  assert(compareRecords(master, master).every(item => item.status === 'exact_match'));

  const nameTypo = fieldResult({ name_en: 'Aman Aansari' }, 'name_en');
  assert.strictEqual(nameTypo.rule, 'fuzzy');
  assert.strictEqual(nameTypo.status, 'near_match');
  assert.strictEqual(nameTypo.severity, 'review');
  assert.strictEqual(nameTypo.needs_review, true);

  const fatherTypo = fieldResult({ father_name: 'Karim Aansari' }, 'father_name');
  assert.strictEqual(fatherTypo.rule, 'fuzzy');
  assert.strictEqual(fatherTypo.needs_review, true);

  const nepaliNameTypo = fieldResult({ name_np: 'अमन अंसारी' }, 'name_np');
  assert.strictEqual(nepaliNameTypo.rule, 'fuzzy');
  assert.strictEqual(nepaliNameTypo.severity, 'review');
  assert.strictEqual(nepaliNameTypo.needs_review, true);

  const addressTypo = fieldResult({ permanent_address: 'Biratnagar-9 Morang' }, 'permanent_address');
  assert.strictEqual(addressTypo.rule, 'fuzzy');
  assert.strictEqual(addressTypo.severity, 'review');
  assert.strictEqual(addressTypo.needs_review, true);

  const dobBsTypo = fieldResult({ dob_bs: '2058-03-13' }, 'dob_bs');
  assert.strictEqual(dobBsTypo.rule, 'strict');
  assert.strictEqual(dobBsTypo.status, 'mismatch');
  assert.strictEqual(dobBsTypo.similarity, 0);
  assert.strictEqual(dobBsTypo.severity, 'critical');

  const dobAdTypo = fieldResult({ dob_ad: '2001-06-26' }, 'dob_ad');
  assert.strictEqual(dobAdTypo.rule, 'strict');
  assert.strictEqual(dobAdTypo.status, 'mismatch');

  const symbolTypo = fieldResult({ see_symbol_no: '2081-1029-A002' }, 'see_symbol_no');
  assert.strictEqual(symbolTypo.rule, 'strict');
  assert.strictEqual(symbolTypo.status, 'mismatch');
  assert.strictEqual(symbolTypo.severity, 'critical');

  const schoolCodeCaseChange = fieldResult({ school_code: 'sch-1029' }, 'school_code');
  assert.strictEqual(schoolCodeCaseChange.status, 'exact_match');

  const missingName = fieldResult({ name_en: '' }, 'name_en');
  assert.strictEqual(missingName.status, 'mismatch');
  assert.strictEqual(missingName.severity, 'critical');
  assert.strictEqual(missingName.message, 'Official and submitted values are required for verification.');

  const perfectSummary = summarizeVerification(compareRecords(master, master));
  assert.strictEqual(perfectSummary.confidence_score, 100);
  assert.strictEqual(perfectSummary.risk_level, 'low');
  assert.strictEqual(perfectSummary.board_dispatch_allowed, true);

  const riskySummary = summarizeVerification(compareRecords(master, { ...master, dob_ad: '2001-06-26' }));
  assert.strictEqual(riskySummary.risk_level, 'high');
  assert.strictEqual(riskySummary.board_dispatch_allowed, false);

  const duplicateSummary = summarizeVerification(compareRecords(master, master), [{ submission_id: 'SUB-1' }]);
  assert.strictEqual(duplicateSummary.risk_level, 'high');
  assert.strictEqual(duplicateSummary.board_dispatch_allowed, false);

  console.log('compare.test.js passed');
}

run();
