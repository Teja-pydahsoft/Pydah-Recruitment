/**
 * Default candidate profile field definitions (teaching / non-teaching).
 * Kept in sync with FormsManagement.jsx templates.
 */

const TEACHING_CANDIDATE_FORM_FIELDS = [
  { fieldName: 'designation', fieldType: 'select', required: true, options: ['Assistant Professor', 'Associate Professor', 'Professor'] },
  { fieldName: 'gender', fieldType: 'radio', required: true, options: ['Male', 'Female', 'Other'] },
  { fieldName: 'dateOfBirth', fieldType: 'date', required: true },
  { fieldName: 'mobileNumber', fieldType: 'text', required: true, placeholder: '10-digit mobile number' },
  { fieldName: 'address', fieldType: 'textarea', required: true, placeholder: 'Full postal address' },
  { fieldName: 'aadhaarNumber', fieldType: 'text', required: true, placeholder: 'Aadhaar Number' },
  { fieldName: 'religion', fieldType: 'text', required: true, placeholder: 'Religion' },
  { fieldName: 'caste', fieldType: 'text', required: true, placeholder: 'Caste' },
  { fieldName: 'ratifiedByUniversity', fieldType: 'radio', required: true, options: ['Yes', 'No'] },
  { fieldName: 'nbaNccExperience', fieldType: 'radio', required: true, options: ['Yes', 'No'] },
  { fieldName: 'nssExperience', fieldType: 'radio', required: true, options: ['Yes', 'No'] },
  { fieldName: 'education', fieldType: 'textarea', required: true, placeholder: 'Education Details (can add multiple entries)' },
  { fieldName: 'experience', fieldType: 'textarea', required: true, placeholder: 'Experience Details (can add multiple entries)' },
  { fieldName: 'totalExperienceYears', fieldType: 'select', required: true, options: ['0-1 years', '1-3 years', '3-5 years', '5-10 years', '10+ years'] },
  { fieldName: 'teachingExperience', fieldType: 'select', required: true, options: ['0-1 years', '1-3 years', '3-5 years', '5-10 years', '10+ years'] },
  { fieldName: 'salaryInCTC', fieldType: 'number', required: false, placeholder: 'Salary in CTC (if has experience)' },
  { fieldName: 'currentSalary', fieldType: 'number', required: false, placeholder: 'Current Salary' },
  { fieldName: 'expectedSalary', fieldType: 'number', required: false, placeholder: 'Expected Salary' },
  { fieldName: 'resume', fieldType: 'file', required: true },
  { fieldName: 'passportPhoto', fieldType: 'file', required: true },
  { fieldName: 'certificates', fieldType: 'file_multiple', required: false },
  { fieldName: 'declarationAgreed', fieldType: 'checkbox', required: true, options: ['I hereby declare that all information provided is true.'] }
];

const NON_TEACHING_CANDIDATE_FORM_FIELDS = [
  { fieldName: 'designation', fieldType: 'select', required: true, options: ['Clerk', 'Accountant', 'Librarian', 'Administrative Assistant', 'IT Support', 'Other'] },
  { fieldName: 'gender', fieldType: 'radio', required: true, options: ['Male', 'Female', 'Other'] },
  { fieldName: 'dateOfBirth', fieldType: 'date', required: true },
  { fieldName: 'mobileNumber', fieldType: 'text', required: true, placeholder: '10-digit mobile number' },
  { fieldName: 'address', fieldType: 'textarea', required: true, placeholder: 'Full postal address' },
  { fieldName: 'aadhaarNumber', fieldType: 'text', required: true, placeholder: 'Aadhaar Number' },
  { fieldName: 'religion', fieldType: 'text', required: true, placeholder: 'Religion' },
  { fieldName: 'caste', fieldType: 'text', required: true, placeholder: 'Caste' },
  { fieldName: 'ratifiedByUniversity', fieldType: 'radio', required: true, options: ['Yes', 'No'] },
  { fieldName: 'nbaNccExperience', fieldType: 'radio', required: true, options: ['Yes', 'No'] },
  { fieldName: 'nssExperience', fieldType: 'radio', required: true, options: ['Yes', 'No'] },
  { fieldName: 'education', fieldType: 'textarea', required: true, placeholder: 'Education Details (can add multiple entries)' },
  { fieldName: 'experience', fieldType: 'textarea', required: true, placeholder: 'Experience Details (can add multiple entries)' },
  { fieldName: 'totalExperienceYears', fieldType: 'select', required: true, options: ['0-1 years', '1-3 years', '3-5 years', '5-10 years', '10+ years'] },
  { fieldName: 'salaryInCTC', fieldType: 'number', required: false, placeholder: 'Salary in CTC (if has experience)' },
  { fieldName: 'currentSalary', fieldType: 'number', required: false, placeholder: 'Current Salary' },
  { fieldName: 'expectedSalary', fieldType: 'number', required: false, placeholder: 'Expected Salary' },
  { fieldName: 'resume', fieldType: 'file', required: true },
  { fieldName: 'passportPhoto', fieldType: 'file', required: true },
  { fieldName: 'certificates', fieldType: 'file_multiple', required: false },
  { fieldName: 'declarationAgreed', fieldType: 'checkbox', required: true, options: ['I hereby declare that all information provided is true.'] }
];

const getDefaultFormFieldsForCategory = (formCategory) => {
  if (formCategory === 'non_teaching') {
    return NON_TEACHING_CANDIDATE_FORM_FIELDS.map((field) => ({ ...field }));
  }
  return TEACHING_CANDIDATE_FORM_FIELDS.map((field) => ({ ...field }));
};

module.exports = {
  TEACHING_CANDIDATE_FORM_FIELDS,
  NON_TEACHING_CANDIDATE_FORM_FIELDS,
  getDefaultFormFieldsForCategory
};
