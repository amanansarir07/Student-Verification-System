const stringSimilarity = require('string-similarity');

function normalizeValue(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function normalizeForComparison(value) {
  return normalizeValue(value).toLowerCase();
}

function getRiskLevel(fieldResult) {
  if (fieldResult.status === 'exact_match') return 'low';
  if (fieldResult.severity === 'critical') return 'high';
  if (fieldResult.status === 'near_match') return 'medium';
  return 'medium';
}

const fieldPolicies = {
  see_symbol_no: {
    rule: 'strict',
    severity: 'critical',
    message: 'SEE symbol number must match the official SEE master record exactly.'
  },
  name_en: {
    rule: 'fuzzy',
    threshold: 0.9,
    severity: 'review',
    message: 'Student name allows spelling review, but must be approved if it differs.'
  },
  name_np: {
    rule: 'fuzzy',
    threshold: 0.9,
    severity: 'review',
    message: 'Nepali student name allows spelling review, but must be approved if it differs.'
  },
  father_name: {
    rule: 'fuzzy',
    threshold: 0.9,
    severity: 'review',
    message: 'Father name allows spelling review, but must be approved if it differs.'
  },
  mother_name: {
    rule: 'fuzzy',
    threshold: 0.9,
    severity: 'review',
    message: 'Mother name allows spelling review, but must be approved if it differs.'
  },
  dob_bs: {
    rule: 'strict',
    severity: 'critical',
    message: 'Date of birth in B.S. must match exactly.'
  },
  dob_ad: {
    rule: 'strict',
    severity: 'critical',
    message: 'Date of birth in A.D. must match exactly.'
  },
  gender: {
    rule: 'strict',
    severity: 'critical',
    message: 'Gender must match the official SEE master record exactly.'
  },
  school_code: {
    rule: 'strict',
    severity: 'critical',
    message: 'School code must match the official SEE master record exactly.'
  },
  permanent_address: {
    rule: 'fuzzy',
    threshold: 0.85,
    severity: 'review',
    message: 'Permanent address differences require school admin review.'
  }
};

function compareRecords(master, submitted) {
  const fieldsToCheck = [
    'see_symbol_no',
    'name_en',
    'name_np',
    'father_name',
    'mother_name',
    'dob_bs',
    'dob_ad',
    'gender',
    'school_code',
    'permanent_address'
  ];
  const result = [];

  fieldsToCheck.forEach((field) => {
    const masterValue = normalizeValue(master[field]);
    const submittedValue = normalizeValue(submitted[field]);
    const policy = fieldPolicies[field];
    const normalizedMaster = normalizeForComparison(masterValue);
    const normalizedSubmitted = normalizeForComparison(submittedValue);
    const missingValue = !normalizedMaster || !normalizedSubmitted;
    let similarity = 0;
    let status = 'mismatch';
    let isMatch = false;

    if (!missingValue && policy.rule === 'strict') {
      isMatch = normalizedMaster === normalizedSubmitted;
      similarity = isMatch ? 1 : 0;
      status = isMatch ? 'exact_match' : 'mismatch';
    }

    if (!missingValue && policy.rule === 'fuzzy') {
      similarity = stringSimilarity.compareTwoStrings(normalizedMaster, normalizedSubmitted);
      isMatch = similarity === 1;

      if (isMatch) {
        status = 'exact_match';
      } else if (similarity >= policy.threshold) {
        status = 'near_match';
      } else {
        status = 'mismatch';
      }
    }

    const confidenceScore = policy.rule === 'strict'
      ? (isMatch ? 100 : 0)
      : Math.round(similarity * 100);
    const fieldResult = {
      field: field,
      master_value: masterValue,
      submitted_value: submittedValue,
      match: isMatch,
      similarity: Number(similarity.toFixed(3)),
      confidence_score: confidenceScore,
      status: status,
      rule: policy.rule,
      severity: missingValue ? 'critical' : policy.severity,
      message: missingValue ? 'Official and submitted values are required for verification.' : policy.message,
      needs_review: status !== 'exact_match'
    };

    fieldResult.risk_level = getRiskLevel(fieldResult);
    result.push(fieldResult);
  });

  return result;
}

function summarizeVerification(comparison, duplicateSignals = []) {
  const fieldCount = comparison.length || 1;
  const averageConfidence = Math.round(
    comparison.reduce((total, field) => total + (field.confidence_score || 0), 0) / fieldCount
  );
  const criticalIssues = comparison.filter(field => field.severity === 'critical' && field.needs_review).length;
  const reviewIssues = comparison.filter(field => field.needs_review).length;

  let riskLevel = 'low';
  if (criticalIssues > 0 || duplicateSignals.length > 0 || averageConfidence < 80) {
    riskLevel = 'high';
  } else if (reviewIssues > 0 || averageConfidence < 95) {
    riskLevel = 'medium';
  }

  return {
    confidence_score: averageConfidence,
    risk_level: riskLevel,
    critical_issues: criticalIssues,
    review_issues: reviewIssues,
    duplicate_signals: duplicateSignals.length,
    verification_required: reviewIssues > 0 || duplicateSignals.length > 0,
    board_dispatch_allowed: reviewIssues === 0 && duplicateSignals.length === 0
  };
}

module.exports = compareRecords;
module.exports.fieldPolicies = fieldPolicies;
module.exports.summarizeVerification = summarizeVerification;
