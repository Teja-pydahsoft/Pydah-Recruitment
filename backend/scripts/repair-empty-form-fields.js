require('dotenv').config();
const mongoose = require('mongoose');
const { repairEmptyFormFields } = require('../utils/repairEmptyFormFields');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await repairEmptyFormFields();
  console.log('\nRepair summary:', JSON.stringify(result, null, 2));
  await mongoose.disconnect();
})().catch((error) => {
  console.error('Repair failed:', error);
  process.exit(1);
});
