const Brevo = require('@getbrevo/brevo');

// ---------------------------
// Get Brevo API key
// ---------------------------
const getBrevoApiKey = () => {
  return process.env.BREVO_API_KEY || process.env.BREVO_SMTP_KEY;
};

// ---------------------------
// Validate environment variables
// ---------------------------
const validateBrevoConfig = () => {
  const apiKey = getBrevoApiKey();
  const requiredVars = {
    BREVO_API_KEY: apiKey,
    EMAIL_FROM: process.env.EMAIL_FROM
  };

  const missing = Object.entries(requiredVars)
    .filter(([key, value]) => !value)
    .map(([key]) =>
      key === 'BREVO_API_KEY'
        ? 'BREVO_API_KEY (or BREVO_SMTP_KEY)'
        : key
    );

  if (missing.length > 0) {
    console.error('❌ Missing required Brevo email configuration:');
    missing.forEach(key => console.error(`   - ${key} is not set`));
    console.error('\nPlease set environment variables:');
    console.error('   BREVO_API_KEY=xkeysib-xxxxx');
    console.error('   EMAIL_FROM=your-email@domain.com\n');
    return false;
  }

  // Debug mode
  if (process.env.EMAIL_DEBUG === 'true') {
    const apiKeyValue = getBrevoApiKey();
    console.log('📧 Brevo Email Configuration (REST API):');
    console.log(`   API Key: ${apiKeyValue.substring(0, 20)}...`);
    console.log(`   From: ${process.env.EMAIL_FROM}\n`);
  }

  return true;
};

// Validate on load
if (!validateBrevoConfig()) {
  console.warn('⚠️  Email service will not work until configuration is complete.');
}

// ---------------------------
// Create Brevo API instance
// ---------------------------
const getApiInstance = () => {
  const apiKey = getBrevoApiKey();
  if (!apiKey) throw new Error('BREVO_API_KEY is not set');

  const defaultClient = Brevo.ApiClient.instance;
  const apiKeyAuth = defaultClient.authentications['api-key'];
  apiKeyAuth.apiKey = apiKey;

  return new Brevo.TransactionalEmailsApi();
};

let apiInstance = null;
try {
  apiInstance = getApiInstance();
} catch (err) {}

// ---------------------------
// Verify configuration
// ---------------------------
const verifyEmailConfig = async () => {
  if (!validateBrevoConfig()) return false;

  console.log('✅ Email service is ready (Brevo REST API)');
  return true;
};

// ---------------------------
// Send Email (Brevo REST API)
// ---------------------------
const sendEmail = async (to, subject, html, text = '', retries = 2) => {

  // Validate config before sending
  if (!validateBrevoConfig()) {
    throw new Error(
      'Email configuration incomplete. Set BREVO_API_KEY and EMAIL_FROM.'
    );
  }

  // Re-initialize instance
  const apiInstance = getApiInstance();

  const sendSmtpEmail = {
    sender: {
      name: "Pydah Staff Recruitment",
      email: process.env.EMAIL_FROM
    },
    to: [{ email: to }],
    subject,
    htmlContent: html,
    textContent: text || ''
  };

  console.log('\n--- Sending Email (Brevo REST API) ---');
  console.log(`From: ${process.env.EMAIL_FROM}`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log('--- --- ---\n');

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`Retrying... ${attempt}/${retries + 1}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }

      const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log(`✓ Email sent successfully! Message ID: ${response.messageId}\n`);
      return { success: true, messageId: response.messageId, response };

    } catch (error) {
      const errorMessage =
        error.response?.body?.message || error.message || 'Unknown error';

      console.error(`✗ Email send error (attempt ${attempt}):`, errorMessage);

      // Authentication issues should not retry
      if (error.response?.statusCode === 401 || error.response?.statusCode === 403) {
        console.error('❌ Authentication failed. Check API key + verified sender.');
        throw error;
      }

      // Last attempt fail
      if (attempt === retries + 1) {
        console.error('✗ Email failed after all retries');
        if (error.response?.body) {
          console.error(
            '   API Error:',
            JSON.stringify(error.response.body, null, 2)
          );
        }
        throw error;
      }

      // Handle rate limits / server errors
      if (
        error.response?.statusCode === 429 ||
        (error.response?.statusCode >= 500 && error.response?.statusCode < 600)
      ) {
        const waitTime =
          error.response?.statusCode === 429
            ? (error.response.headers['retry-after']
                ? parseInt(error.response.headers['retry-after']) * 1000
                : 2000 * attempt)
            : 2000 * attempt;

        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
};

module.exports = {
  verifyEmailConfig,
  sendEmail
};
