const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
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

// Send email function
const sendEmail = async (to, subject, html, text = '') => {
  try {
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

    const info = await transporter.sendMail(mailOptions);
    console.log(`✓ Email sent successfully! Message ID: ${info.messageId}\n`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('✗ Email send error:', error);
    throw error;
  }
};

module.exports = {
  transporter,
  verifyEmailConfig,
  sendEmail
};