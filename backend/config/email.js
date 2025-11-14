const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  // Connection timeout settings (in milliseconds)
  connectionTimeout: parseInt(process.env.EMAIL_CONNECTION_TIMEOUT) || 60000, // 60 seconds
  greetingTimeout: parseInt(process.env.EMAIL_GREETING_TIMEOUT) || 30000, // 30 seconds
  socketTimeout: parseInt(process.env.EMAIL_SOCKET_TIMEOUT) || 60000, // 60 seconds
  // Connection pool settings
  pool: process.env.EMAIL_POOL === 'true',
  maxConnections: parseInt(process.env.EMAIL_MAX_CONNECTIONS) || 5,
  maxMessages: parseInt(process.env.EMAIL_MAX_MESSAGES) || 100,
  // TLS/SSL options
  tls: {
    // Do not fail on invalid certificates
    rejectUnauthorized: process.env.EMAIL_TLS_REJECT_UNAUTHORIZED !== 'false',
    // Allow legacy TLS versions if needed
    minVersion: 'TLSv1.2'
  },
  // Debug mode (set to true for verbose logging)
  debug: process.env.EMAIL_DEBUG === 'true',
  logger: process.env.EMAIL_DEBUG === 'true'
});

// Verify email configuration
const verifyEmailConfig = async () => {
  try {
    await transporter.verify();
    console.log('Email service is ready');
    return true;
  } catch (error) {
    console.error('Email service error:', error);
    return false;
  }
};

// Send email function with retry logic
const sendEmail = async (to, subject, html, text = '', retries = 2) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
    text
  };

  console.log('\n--- Sending Email ---');
  console.log(`From: ${mailOptions.from}`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log('--- --- ---\n');

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`Retrying email send (attempt ${attempt}/${retries + 1})...`);
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }

      const info = await transporter.sendMail(mailOptions);
      console.log(`✓ Email sent successfully! Message ID: ${info.messageId}\n`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`✗ Email send error (attempt ${attempt}/${retries + 1}):`, error.message);
      
      // If it's the last attempt, throw the error
      if (attempt === retries + 1) {
        console.error('✗ Email send failed after all retry attempts');
        throw error;
      }
      
      // If it's a connection timeout, wait a bit longer before retry
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
        console.log('Connection issue detected, waiting before retry...');
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
  }
};

module.exports = {
  transporter,
  verifyEmailConfig,
  sendEmail
};