const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

function getCredentials() {
  // Service account credentials are optional if using OAuth 2.0
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) {
    // Try reading from env variables directly
    if (process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL && 
        process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
      return {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
        project_id: process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID || 'gen-lang-client-0406219143'
      };
    }
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS is not set. Either set GOOGLE_APPLICATION_CREDENTIALS or use OAuth 2.0 with GOOGLE_DRIVE_OAUTH_CLIENT_ID and GOOGLE_DRIVE_OAUTH_CLIENT_SECRET');
  }
  const resolved = path.isAbsolute(credentialsPath)
    ? credentialsPath
    : path.join(process.cwd(), credentialsPath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`Service account credentials file not found: ${resolved}`);
  }

  const file = fs.readFileSync(resolved, 'utf8');
  return JSON.parse(file);
}

function getOAuthCredentials() {
  // Try reading from environment variables first (preferred)
  const clientId = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_DRIVE_OAUTH_REDIRECT_URI || 'http://localhost:5000/api/drive/oauth/callback';
  
  if (clientId && clientSecret) {
    return {
      web: {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uris: [redirectUri]
      }
    };
  }
  
  // Fallback to JSON file (for backward compatibility)
  const oauthPath = process.env.GOOGLE_DRIVE_OAUTH_CREDENTIALS;
  if (!oauthPath) return null;
  
  const resolved = path.isAbsolute(oauthPath)
    ? oauthPath
    : path.join(process.cwd(), oauthPath);
    
  if (!fs.existsSync(resolved)) return null;
  
  try {
    return JSON.parse(fs.readFileSync(resolved, 'utf8'));
  } catch {
    return null;
  }
}

function getAuthClient(userEmail) {
  // Check if OAuth 2.0 is configured (preferred for personal accounts)
  const oauthCreds = getOAuthCredentials();
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  
  if (oauthCreds && refreshToken) {
    const { client_secret, client_id, redirect_uris } = oauthCreds.web || oauthCreds.installed || {};
    if (client_id && client_secret) {
      const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris?.[0] || 'http://localhost:5000/api/drive/oauth/callback'
      );
      oAuth2Client.setCredentials({ refresh_token: refreshToken });
      return oAuth2Client;
    }
  }
  
  // Fall back to service account with domain-wide delegation
  const credentials = getCredentials();
  
  // If userEmail is provided, use domain-wide delegation (JWT) to impersonate the user
  // This is required because service accounts cannot upload to My Drive folders
  if (userEmail) {
    const jwtClient = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive'
      ],
      userEmail // Impersonate this user
    );
    return jwtClient;
  }
  
  // Otherwise use service account directly
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive'
    ]
  });
  return auth;
}

async function getFolderOwner(folderId) {
  const auth = getAuthClient();
  const drive = google.drive({ version: 'v3', auth });
  try {
    const folder = await drive.files.get({
      fileId: folderId,
      fields: 'owners(emailAddress)',
      supportsAllDrives: true
    });
    const ownerEmail = folder.data.owners?.[0]?.emailAddress;
    if (ownerEmail) {
      console.log(`✓ Folder owner: ${ownerEmail}`);
      return ownerEmail;
    }
  } catch (error) {
    console.warn(`⚠ Could not get folder owner:`, error.message);
  }
  // Fallback to environment variable or default
  return process.env.GOOGLE_DRIVE_OWNER_EMAIL || null;
}

async function verifyFolderAccess(folderId) {
  const auth = getAuthClient();
  const drive = google.drive({ version: 'v3', auth });
  try {
    const folder = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, mimeType, permissions',
      supportsAllDrives: true
    });
    console.log(`✓ Verified access to folder: ${folder.data.name} (${folderId})`);
    return true;
  } catch (error) {
    console.error(`✗ Cannot access folder ${folderId}:`, error.message);
    throw new Error(`Cannot access folder ${folderId}. Make sure it's shared with the service account. ${error.message}`);
  }
}

async function ensureFolder({ name, parentId }) {
  // For OAuth: no impersonation needed. For service account: need to impersonate owner
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const oauthCreds = getOAuthCredentials();
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  
  let auth;
  if (oauthCreds && refreshToken) {
    // OAuth 2.0 - no impersonation needed
    auth = getAuthClient();
  } else {
    // Service account - need to impersonate folder owner
    const ownerEmail = await getFolderOwner(rootFolderId);
    if (!ownerEmail) {
      throw new Error('Cannot determine folder owner. Please set GOOGLE_DRIVE_OWNER_EMAIL in .env file or use OAuth 2.0');
    }
    auth = getAuthClient(ownerEmail);
  }
  
  const drive = google.drive({ version: 'v3', auth });
  const query = `mimeType='application/vnd.google-apps.folder' and name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed=false`;
  const res = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    corpora: 'allDrives'
  });
  if (res.data.files && res.data.files.length > 0) {
    console.log(`✓ Found existing folder: ${name} (${res.data.files[0].id})`);
    return res.data.files[0];
  }
  console.log(`Creating folder: ${name} in parent ${parentId}`);
  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    },
    fields: 'id, name',
    supportsAllDrives: true
  });
  console.log(`✓ Created folder: ${name} (${folder.data.id})`);
  
  // Explicitly share the folder with the service account to ensure upload access
  try {
    const credentials = getCredentials();
    const serviceAccountEmail = credentials.client_email;
    await drive.permissions.create({
      fileId: folder.data.id,
      requestBody: {
        role: 'writer',
        type: 'user',
        emailAddress: serviceAccountEmail
      },
      supportsAllDrives: true,
      sendNotificationEmail: false
    });
    console.log(`✓ Shared folder ${name} with service account`);
  } catch (shareError) {
    console.warn(`⚠ Could not explicitly share folder ${name} (this might be OK if parent is already shared):`, shareError.message);
  }
  
  return folder.data;
}

async function uploadToDrive({ filePath, mimeType, originalName, parentFolderId }) {
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!rootFolderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set');
  }

  // Strategy: Upload to root shared folder first, then move to target subfolder
  const targetFolderId = parentFolderId || rootFolderId;
  
  console.log(`📤 Uploading ${originalName} (target: ${targetFolderId === rootFolderId ? 'root' : 'subfolder'})`);

  // For OAuth: no impersonation needed. For service account: need to impersonate owner
  const oauthCreds = getOAuthCredentials();
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  
  let auth;
  if (oauthCreds && refreshToken) {
    // OAuth 2.0 - uses your account directly, no impersonation needed
    auth = getAuthClient();
    console.log('✓ Using OAuth 2.0 authentication');
  } else {
    // Service account - need to impersonate folder owner (requires domain-wide delegation)
    const ownerEmail = await getFolderOwner(rootFolderId);
    if (!ownerEmail) {
      throw new Error('Cannot determine folder owner. Please set GOOGLE_DRIVE_OWNER_EMAIL in .env file or use OAuth 2.0');
    }
    auth = getAuthClient(ownerEmail);
    console.log(`✓ Using service account with domain-wide delegation (impersonating ${ownerEmail})`);
  }
  
  const drive = google.drive({ version: 'v3', auth });

  // Always upload to root shared folder first
  const fileMetadata = {
    name: originalName,
    parents: [rootFolderId]
  };
  const media = {
    mimeType,
    body: fs.createReadStream(filePath)
  };

  try {
    // Upload file to root shared folder (as the folder owner)
    const res = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id, name, webViewLink, webContentLink, parents',
      supportsAllDrives: true
    });

    console.log(`✓ Successfully uploaded ${originalName} to root folder (ID: ${res.data.id})`);

    // If target is a subfolder (not root), move the file there
    if (targetFolderId !== rootFolderId) {
      try {
        await drive.files.update({
          fileId: res.data.id,
          addParents: targetFolderId,
          removeParents: rootFolderId,
          supportsAllDrives: true,
          fields: 'id, name, webViewLink, webContentLink, parents'
        });
        console.log(`✓ Moved ${originalName} to subfolder ${targetFolderId}`);
      } catch (moveError) {
        console.warn(`⚠ Could not move ${originalName} to subfolder (file is in root folder):`, moveError.message);
        // File stays in root folder, which is fine
      }
    }

    // Get final file info
    const fileInfo = await drive.files.get({
      fileId: res.data.id,
      fields: 'id, name, webViewLink, webContentLink, parents',
      supportsAllDrives: true
    });

    // Optionally set permissions so link is viewable by link holders
    try {
      await drive.permissions.create({
        fileId: res.data.id,
        requestBody: { role: 'reader', type: 'anyone' },
        supportsAllDrives: true
      });
    } catch (e) {
      console.warn(`⚠ Could not set public permissions for ${originalName}:`, e.message);
    }

    return fileInfo.data;
  } catch (error) {
    console.error(`❌ Failed to upload ${originalName}:`, error.message);
    if (error.message.includes('domain-wide delegation') || error.message.includes('impersonation')) {
      throw new Error(`Domain-wide delegation not enabled. Please enable it in Google Cloud Console for the service account ${getCredentials().client_email}. See: https://developers.google.com/identity/protocols/oauth2/service-account#delegatingauthority`);
    }
    if (error.message.includes('storage quota') || error.message.includes('Service Accounts')) {
      throw new Error(`Cannot upload file. Service account cannot upload to My Drive. Domain-wide delegation is required.`);
    }
    throw error;
  }
}

module.exports = { uploadToDrive, ensureFolder, verifyFolderAccess };


