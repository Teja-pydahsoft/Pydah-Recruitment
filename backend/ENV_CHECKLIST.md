# Environment Variables Checklist

## Required Email Configuration (lines 8-13 in .env)

Your `.env` file should have these email-related variables:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
EMAIL_FROM=your-email@gmail.com
FRONTEND_URL=http://localhost:3000
```

## Recommended SMS Configuration

Add the following BulkSMS credentials to enable candidate SMS notifications:

```env
BULKSMS_API_KEY=your-bulksms-api-key
BULKSMS_SENDER_ID=PYDAHK
BULKSMS_ENGLISH_API_URL=https://www.bulksmsapps.com/api/apismsv2.aspx
BULKSMS_UNICODE_API_URL=https://www.bulksmsapps.com/api/apibulkv2.aspx
BULKSMS_TEMPLATE_ID_TEST_INVITE=1707XXXXXXXXXXXXX
BULKSMS_TEMPLATE_ID_TEST_RESULT=1707XXXXXXXXXXXXX
BULKSMS_TEMPLATE_ID_INTERVIEW_SCHEDULE=1707XXXXXXXXXXXXX
BULKSMS_TEMPLATE_ID_INTERVIEW_RESCHEDULE=1707XXXXXXXXXXXXX
SMS_TIMEOUT_MS=30000
```

> 💡 Make sure the template IDs exactly match the DLT-approved templates in your BulkSMS account.

## Optional WhatsApp Integration

Configure these variables once you connect a WhatsApp Business API provider (Meta Cloud API, Twilio, etc.):

```env
WHATSAPP_BUSINESS_ACCOUNT_ID=your-whatsapp-business-account-id
WHATSAPP_ACCESS_TOKEN=your-whatsapp-access-token
```

## How to Verify Your Configuration

### ✅ Check 1: Format
- **EMAIL_HOST**: Should be `smtp.gmail.com` (no quotes)
- **EMAIL_PORT**: Should be `587` (number only, no quotes)
- **EMAIL_SECURE**: Should be `false` (lowercase, no quotes)
- **EMAIL_USER**: Your full Gmail address (no quotes)
- **EMAIL_PASS**: Your 16-character App Password (no spaces, no quotes)
- **EMAIL_FROM**: Same as EMAIL_USER (no quotes)
- **FRONTEND_URL**: Your frontend URL (no quotes)

### ✅ Check 2: No Quotes
❌ **Wrong**: `EMAIL_USER="your-email@gmail.com"`  
✅ **Correct**: `EMAIL_USER=your-email@gmail.com`

### ✅ Check 3: No Spaces
❌ **Wrong**: `EMAIL_PASS=abcd efgh ijkl mnop`  
✅ **Correct**: `EMAIL_PASS=abcdefghijklmnop`

### ✅ Check 4: App Password (not regular password)
- Must be a Gmail App Password (16 characters)
- Generated from Google Account → Security → App passwords
- NOT your regular Gmail password

## What You Should See in Backend Logs

After creating a test, you should now see:

```
=== Test Created Successfully ===
Test ID: 507f1f77bcf86cd799439011
Test Title: Technical Assessment Test
Test Link: http://localhost:3000/test/test_507f1f77bcf86cd799439011_1234567890
Candidate: John Doe (john@example.com)
Username: 1234567890
Password: 1234567890
Phone: 1234567890
===================================

--- Sending Email ---
From: your-email@gmail.com
To: john@example.com
Subject: Test Invitation: Technical Assessment Test
--- --- ---

✓ Email sent successfully! Message ID: <abc123@mail.gmail.com>
```

## Troubleshooting

### If you don't see the test details:
1. Make sure you restarted the backend server after adding logging
2. Check that the test creation was successful
3. Look for any error messages in the console

### If email is sent but details are missing:
- The details are now logged BEFORE the email is sent
- You should see them in the console output

