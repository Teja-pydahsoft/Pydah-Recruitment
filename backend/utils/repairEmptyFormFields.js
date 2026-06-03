const RecruitmentForm = require('../models/RecruitmentForm');
const Candidate = require('../models/Candidate');
const { getDefaultFormFieldsForCategory } = require('../constants/candidateProfileFormFields');

const formHasNoFields = (form) => !Array.isArray(form.formFields) || form.formFields.length === 0;

/**
 * Backfill formFields on candidate_profile forms that were saved without fields.
 * Does not modify Candidate.applicationData — existing submissions stay intact.
 */
const repairEmptyFormFields = async () => {
  const emptyForms = await RecruitmentForm.find({
    formType: 'candidate_profile',
    $or: [{ formFields: { $exists: false } }, { formFields: { $size: 0 } }]
  });

  if (!emptyForms.length) {
    return { repaired: 0, details: [] };
  }

  const details = [];

  for (const form of emptyForms) {
    const existingSubmissions = await Candidate.countDocuments({ form: form._id });
    const templateFields = getDefaultFormFieldsForCategory(form.formCategory || 'teaching');

    form.formFields = templateFields;
    await form.save();

    details.push({
      id: form._id.toString(),
      title: form.title,
      campus: form.campus,
      category: form.formCategory,
      fieldsAdded: templateFields.length,
      existingSubmissions
    });

    console.log(
      `✅ [FORM REPAIR] "${form.title}" (${form._id}): added ${templateFields.length} fields; ${existingSubmissions} existing submission(s) unchanged`
    );
  }

  return { repaired: details.length, details };
};

module.exports = {
  repairEmptyFormFields,
  formHasNoFields
};
