const compareRecords = require('./compare');

const master = {
  name_en: "Aman Ansari",
  dob_bs: "2058-03-12",
  dob_ad: "2001-06-25"
};

const submitted = {
  name_en: "Amman Ansari",  // typo on purpose
  dob_bs: "2058-03-12",
  dob_ad: "2001-06-25"
};

const result = compareRecords(master, submitted);
console.log(result);