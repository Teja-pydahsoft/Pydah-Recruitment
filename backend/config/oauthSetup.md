# OAuth 2.0 Setup for Google Drive (No Admin Access Required)

Since you don't have Google Workspace Admin access, we'll use OAuth 2.0 instead of Domain-Wide Delegation.

## Step 1: Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
4. If prompted, configure OAuth consent screen:
   - User Type: **External** (for personal accounts)
   - App name: **Staff Recruitment System**
   - User support email: Your email
   - Developer contact: Your email
   - Click **Save and Continue**
   - Add scopes: `https://www.googleapis.com/auth/drive.file` and `https://www.googleapis.com/auth/drive`
   - Click **Save and Continue**
   - Add test users: Your email (teja@pydahsoft.in)
   - Click **Save and Continue**
   - Click **Back to Dashboard**
5. Back in Credentials:
   - Application type: **Web application**
   - Name: **Staff Recruitment Web Client**
   - Authorized redirect URIs: `http://localhost:5000/api/drive/oauth/callback`
   - Click **Create**
6. **Download the JSON file** - Save it as `backend/config/oauth-credentials.json`

## Step 2: Get Authorization Token (One-Time)

1. Run this in your terminal:
```bash
cd backend
node scripts/getOAuthToken.js
```

2. This will open a browser window where you need to:
   - Sign in with your Google account (teja@pydahsoft.in)
   - Grant permission to access Google Drive
   - Copy the authorization code that appears
   - Paste it back in the terminal

3. The script will save your refresh token to `.env`

## Step 3: Update .env File

Add these lines to your `.env`:
```env
GOOGLE_DRIVE_OAUTH_CREDENTIALS=./config/oauth-credentials.json
GOOGLE_DRIVE_REFRESH_TOKEN=your_refresh_token_here
GOOGLE_DRIVE_OWNER_EMAIL=teja@pydahsoft.in
```

That's it! The system will now use OAuth 2.0 instead of service account.

