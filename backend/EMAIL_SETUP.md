# Email Configuration Guide

This guide will help you set up email notifications for the Staff Recruitment System.

## Required Environment Variables

Add these variables to your `.env` file in the `backend` directory:

```env
# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com

# Frontend URL (for test links in emails)
FRONTEND_URL=http://localhost:3000
```

## Optional Timeout Settings (for hosted environments)

If you're experiencing connection timeout errors on hosted platforms (like Render, Heroku, etc.), you can add these optional timeout settings:

```env
# Connection timeout settings (in milliseconds)
# Default: 60000 (60 seconds)
EMAIL_CONNECTION_TIMEOUT=60000

# Greeting timeout (in milliseconds)
# Default: 30000 (30 seconds)
EMAIL_GREETING_TIMEOUT=30000

# Socket timeout (in milliseconds)
# Default: 60000 (60 seconds)
EMAIL_SOCKET_TIMEOUT=60000

# Enable connection pooling (true/false)
# Default: false
EMAIL_POOL=false

# Maximum connections in pool
# Default: 5
EMAIL_MAX_CONNECTIONS=5

# Maximum messages per connection
# Default: 100
EMAIL_MAX_MESSAGES=100

# Enable debug logging (true/false)
# Default: false
EMAIL_DEBUG=false
```

## How to Get Gmail App Password

Since you're using Gmail, you need to create an **App Password** (not your regular Gmail password) for authentication.

### Step 1: Enable 2-Step Verification

1. Go to your [Google Account](https://myaccount.google.com/)
2. Click on **Security** in the left sidebar
3. Under "Signing in to Google", find **2-Step Verification**
4. Click **Get Started** and follow the prompts to enable it
5. You'll need to verify your identity with your phone number

### Step 2: Generate App Password

1. After enabling 2-Step Verification, go back to **Security**
2. Look for **App passwords** (you may need to search for it)
3. Click on **App passwords**
4. You might be asked to sign in again
5. Select **Mail** as the app and **Other (Custom name)** as the device
6. Enter a name like "Staff Recruitment System" and click **Generate**
7. Google will show you a 16-character password (like: `abcd efgh ijkl mnop`)
8. **Copy this password** - you won't be able to see it again!

### Step 3: Add to .env File

1. Create a `.env` file in the `backend` directory if it doesn't exist
2. Add the following:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-actual-gmail@gmail.com
EMAIL_PASS=abcdefghijklmnop
EMAIL_FROM=your-actual-gmail@gmail.com
FRONTEND_URL=http://localhost:3000
```

**Important Notes:**
- Replace `your-actual-gmail@gmail.com` with your actual Gmail address
- Replace `abcdefghijklmnop` with the 16-character App Password you generated (remove any spaces)
- Use the same email for both `EMAIL_USER` and `EMAIL_FROM`

## Alternative: Using Other Email Services

### Outlook/Hotmail

```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
EMAIL_FROM=your-email@outlook.com
```

### Yahoo Mail

```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@yahoo.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@yahoo.com
```

### Custom SMTP Server

```env
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-username
EMAIL_PASS=your-password
EMAIL_FROM=your-email@domain.com
```

## Testing Email Configuration

After setting up your `.env` file, restart your backend server. The server will automatically verify the email configuration on startup.

If you see "Email service is ready" in the console, your configuration is correct!

## Troubleshooting

### Error: "Username and Password not accepted"

**Common causes:**
1. **Using regular password instead of App Password**: Gmail requires an App Password for SMTP access
2. **2-Step Verification not enabled**: You must enable 2-Step Verification before creating App Passwords
3. **Incorrect App Password**: Make sure you copied the entire 16-character password without spaces
4. **Wrong email address**: Ensure `EMAIL_USER` matches the Gmail account where you created the App Password

### Error: "Less secure app access"

Google no longer supports "Less secure app access". You **must** use App Passwords instead.

### Error: "Connection timeout" (ETIMEDOUT)

This error typically occurs on hosted platforms (Render, Heroku, etc.) due to network restrictions or slow connections.

**Solutions:**

1. **Increase timeout settings** (already configured by default, but you can adjust):
   ```env
   EMAIL_CONNECTION_TIMEOUT=90000
   EMAIL_SOCKET_TIMEOUT=90000
   EMAIL_GREETING_TIMEOUT=45000
   ```

2. **Try port 465 with SSL** (if port 587 is blocked):
   ```env
   EMAIL_PORT=465
   EMAIL_SECURE=true
   ```

3. **Enable connection pooling**:
   ```env
   EMAIL_POOL=true
   EMAIL_MAX_CONNECTIONS=5
   ```

4. **Enable debug mode** to see detailed connection logs:
   ```env
   EMAIL_DEBUG=true
   ```

5. **Check hosting platform restrictions**: Some platforms block outbound SMTP connections. Consider:
   - Using an email service provider (SendGrid, Mailgun, AWS SES)
   - Contacting your hosting provider about SMTP port access
   - Using a different port (465 with SSL)

6. **The system automatically retries** failed email sends up to 2 times with exponential backoff, so temporary connection issues may resolve automatically.

### Still having issues?

1. Double-check all environment variables are correct
2. Make sure there are no extra spaces in your `.env` file
3. Restart your backend server after making changes
4. Check the server logs for detailed error messages
5. Enable `EMAIL_DEBUG=true` to see detailed SMTP connection logs

