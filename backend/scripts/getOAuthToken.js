const { google } = require('googleapis');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive'
];

async function getOAuthToken() {
  // Try reading from environment variables first
  let client_id = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID;
  let client_secret = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET;
  let redirect_uri = process.env.GOOGLE_DRIVE_OAUTH_REDIRECT_URI || 'http://localhost:5000/api/drive/oauth/callback';

  // Fallback to JSON file
  if (!client_id || !client_secret) {
    const credentialsPath = process.env.GOOGLE_DRIVE_OAUTH_CREDENTIALS || './config/oauth-credentials.json';
    const resolved = path.isAbsolute(credentialsPath)
      ? credentialsPath
      : path.join(process.cwd(), credentialsPath);

    if (!fs.existsSync(resolved)) {
      console.error(`❌ OAuth credentials not found.`);
      console.error('Please set GOOGLE_DRIVE_OAUTH_CLIENT_ID and GOOGLE_DRIVE_OAUTH_CLIENT_SECRET in .env file');
      console.error('Or create OAuth 2.0 credentials in Google Cloud Console and save as oauth-credentials.json');
      process.exit(1);
    }

    const credentials = JSON.parse(fs.readFileSync(resolved, 'utf8'));
    const creds = credentials.web || credentials.installed || {};
    client_id = client_id || creds.client_id;
    client_secret = client_secret || creds.client_secret;
    redirect_uri = redirect_uri || creds.redirect_uris?.[0] || 'http://localhost:5000/api/drive/oauth/callback';
  }

  if (!client_id || !client_secret) {
    console.error('❌ Invalid OAuth credentials. Missing client_id or client_secret.');
    console.error('Set GOOGLE_DRIVE_OAUTH_CLIENT_ID and GOOGLE_DRIVE_OAUTH_CLIENT_SECRET in .env file');
    process.exit(1);
  }

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uri
  );

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });

  console.log('\n🔗 Authorize this app by visiting this url:\n');
  console.log(authUrl);
  console.log('\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve, reject) => {
    rl.question('Enter the code from that page here: ', async (code) => {
      rl.close();

      try {
        const { tokens } = await oAuth2Client.getToken(code);
        console.log('\n✅ Authorization successful!\n');
        console.log('Add these to your .env file:\n');
        console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token || tokens.access_token}`);
        if (!process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID) {
          console.log(`GOOGLE_DRIVE_OAUTH_CLIENT_ID=${client_id}`);
          console.log(`GOOGLE_DRIVE_OAUTH_CLIENT_SECRET=${client_secret}`);
          console.log(`GOOGLE_DRIVE_OAUTH_REDIRECT_URI=${redirect_uri}`);
        }
        console.log(`GOOGLE_DRIVE_OWNER_EMAIL=${process.env.GOOGLE_DRIVE_OWNER_EMAIL || 'your-email@gmail.com'}\n`);
        
        // Also try to save to .env automatically
        const envPath = path.join(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
          let envContent = fs.readFileSync(envPath, 'utf8');
          let updated = false;
          
          if (!envContent.includes('GOOGLE_DRIVE_REFRESH_TOKEN')) {
            envContent += `\nGOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token || tokens.access_token}\n`;
            updated = true;
          }
          
          if (!envContent.includes('GOOGLE_DRIVE_OAUTH_CLIENT_ID') && !process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID) {
            envContent += `GOOGLE_DRIVE_OAUTH_CLIENT_ID=${client_id}\n`;
            envContent += `GOOGLE_DRIVE_OAUTH_CLIENT_SECRET=${client_secret}\n`;
            envContent += `GOOGLE_DRIVE_OAUTH_REDIRECT_URI=${redirect_uri}\n`;
            updated = true;
          }
          
          if (updated) {
            fs.writeFileSync(envPath, envContent);
            console.log('✓ Saved to .env file automatically\n');
          }
        }

        resolve(tokens);
      } catch (error) {
        console.error('❌ Error getting token:', error.message);
        reject(error);
      }
    });
  });
}

getOAuthToken().catch(console.error);

