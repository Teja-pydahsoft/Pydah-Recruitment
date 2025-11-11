const { uploadToDrive, ensureFolder, verifyFolderAccess } = require('../config/googleDrive');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function debug() {
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  console.log('Root folder ID:', rootFolderId || '(not set)');

  const hasOAuth = Boolean(
    process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET &&
    process.env.GOOGLE_DRIVE_REFRESH_TOKEN
  );
  console.log('OAuth credentials present:', hasOAuth);

  const hasServiceAccount = Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  );
  console.log('Service account credentials present:', hasServiceAccount);

  try {
    console.log('\nAttempting verifyFolderAccess...');
    await verifyFolderAccess(rootFolderId);
    console.log('✓ verifyFolderAccess succeeded');
  } catch (err) {
    console.error('✗ verifyFolderAccess failed:', err.message);
    if (err.response?.data) {
      console.error('Response data:', err.response.data);
    }
  }
}

debug().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
