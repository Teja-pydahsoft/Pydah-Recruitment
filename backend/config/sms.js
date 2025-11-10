const axios = require('axios');

const BULKSMS_API_KEY = process.env.BULKSMS_API_KEY || '';
const BULKSMS_SENDER_ID = process.env.BULKSMS_SENDER_ID || '';
const BULKSMS_ENGLISH_API_URL =
  process.env.BULKSMS_ENGLISH_API_URL || 'https://www.bulksmsapps.com/api/apismsv2.aspx';
const BULKSMS_UNICODE_API_URL =
  process.env.BULKSMS_UNICODE_API_URL || 'https://www.bulksmsapps.com/api/apibulkv2.aspx';

const DEFAULT_TIMEOUT = Number(process.env.SMS_TIMEOUT_MS) || 30000;

const smsTemplates = {
  candidateTestInvitation: {
    templateId: process.env.BULKSMS_TEMPLATE_ID_TEST_INVITE || '',
    language: 'english',
    message:
      'Hi {name}, you are invited to take the {testTitle} assessment. Duration {duration} mins. Login with {username} / {password}. Start here: {link} -Pydah Recruitment',
  },
  candidateTestResult: {
    templateId: process.env.BULKSMS_TEMPLATE_ID_TEST_RESULT || '',
    language: 'english',
    message:
      'Hi {name}, your {testTitle} result is {status}. Score {percentage}%. Check mail for details. -Pydah Recruitment',
  },
  candidateInterviewSchedule: {
    templateId: process.env.BULKSMS_TEMPLATE_ID_INTERVIEW_SCHEDULE || '',
    language: 'english',
    message:
      'Hi {name}, your interview for {position} is scheduled on {date} at {time}. {mode}. Check email for more info. -Pydah Recruitment',
  },
  candidateInterviewReschedule: {
    templateId: process.env.BULKSMS_TEMPLATE_ID_INTERVIEW_RESCHEDULE || '',
    language: 'english',
    message:
      'Hi {name}, your interview for {position} is rescheduled to {date} at {time}. Please confirm. -Pydah Recruitment',
  },
};

const ensureSMSConfigured = () => {
  return Boolean(BULKSMS_API_KEY && BULKSMS_SENDER_ID);
};

const isValidSMSResponse = (responseData) => {
  if (!responseData || typeof responseData !== 'string') return false;

  const trimmed = responseData.trim();
  if (!trimmed) return false;

  if (trimmed.includes('MessageId-')) return true;
  if (!Number.isNaN(Number(trimmed))) return true;

  if (trimmed.includes('<!DOCTYPE') || trimmed.includes('<html')) {
    const messageIdMatch = trimmed.match(/MessageId-(\d+)/);
    return Boolean(messageIdMatch);
  }

  return false;
};

const extractMessageId = (responseData) => {
  if (!responseData || typeof responseData !== 'string') return null;

  const match = responseData.match(/MessageId-(\d+)/);
  if (match) return match[1];

  const trimmed = responseData.trim();
  if (!Number.isNaN(Number(trimmed))) return trimmed;

  if (responseData.includes('MessageId-')) {
    return responseData.split('MessageId-')[1].split('\n')[0].trim();
  }

  return null;
};

const sendSMSRequest = async (params, { isUnicode = false } = {}) => {
  const apiUrl = isUnicode ? BULKSMS_UNICODE_API_URL : BULKSMS_ENGLISH_API_URL;

  try {
    const response = await axios.post(apiUrl, null, {
      params,
      timeout: DEFAULT_TIMEOUT,
      headers: {
        Accept: 'text/plain',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response;
  } catch (postError) {
    const response = await axios.get(apiUrl, {
      params,
      timeout: DEFAULT_TIMEOUT,
      headers: {
        Accept: 'text/plain',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response;
  }
};

const formatTemplateMessage = (templateMessage, variables = {}) => {
  if (!templateMessage) return '';
  return Object.entries(variables).reduce((acc, [key, value]) => {
    const placeholder = new RegExp(`{${key}}`, 'g');
    return acc.replace(placeholder, value ?? '');
  }, templateMessage);
};

const maskPhoneNumber = (phoneNumber = '') => {
  if (!phoneNumber) return '';
  if (phoneNumber.length <= 4) return '*'.repeat(phoneNumber.length);
  const visible = phoneNumber.slice(-4);
  return `${'*'.repeat(Math.max(0, phoneNumber.length - 4))}${visible}`;
};

const sendTemplateSMS = async ({ templateKey, phoneNumber, variables = {} }) => {
  if (!ensureSMSConfigured()) {
    throw new Error('SMS service configuration missing');
  }

  if (!phoneNumber) {
    throw new Error('Recipient phone number is required');
  }

  const template = smsTemplates[templateKey];
  if (!template) {
    throw new Error(`SMS template "${templateKey}" not found`);
  }

  const isUnicode = template.language === 'unicode';
  const message = formatTemplateMessage(template.message, variables);

  console.log('[SMS] Preparing to send template SMS', {
    templateKey,
    phone: maskPhoneNumber(phoneNumber),
    isUnicode,
  });

  const params = {
    apikey: BULKSMS_API_KEY,
    sender: BULKSMS_SENDER_ID,
    number: phoneNumber,
    message,
  };

  if (template.templateId) {
    params.templateid = template.templateId;
  }

  if (isUnicode) {
    params.coding = '3';
  }

  const response = await sendSMSRequest(params, { isUnicode });

  if (!isValidSMSResponse(response.data)) {
    const error = new Error('Invalid SMS response from provider');
    error.providerResponse = response.data;
    console.error('[SMS] Provider returned invalid response', {
      templateKey,
      phone: maskPhoneNumber(phoneNumber),
      response: response.data,
    });
    throw error;
  }

  const messageId = extractMessageId(response.data);

  console.log('[SMS] Template SMS sent successfully', {
    templateKey,
    phone: maskPhoneNumber(phoneNumber),
    messageId,
  });

  return {
    success: true,
    messageId,
    providerResponse: response.data,
  };
};

const sendRawSMS = async ({ phoneNumber, message, templateId, isUnicode = false }) => {
  if (!ensureSMSConfigured()) {
    throw new Error('SMS service configuration missing');
  }

  if (!phoneNumber) {
    throw new Error('Recipient phone number is required');
  }

  const params = {
    apikey: BULKSMS_API_KEY,
    sender: BULKSMS_SENDER_ID,
    number: phoneNumber,
    message,
  };

  console.log('[SMS] Preparing to send raw SMS', {
    hasTemplateId: Boolean(templateId),
    isUnicode,
    phone: maskPhoneNumber(phoneNumber),
  });

  if (templateId) {
    params.templateid = templateId;
  }

  if (isUnicode) {
    params.coding = '3';
  }

  const response = await sendSMSRequest(params, { isUnicode });

  if (!isValidSMSResponse(response.data)) {
    const error = new Error('Invalid SMS response from provider');
    error.providerResponse = response.data;
    console.error('[SMS] Provider returned invalid response', {
      phone: maskPhoneNumber(phoneNumber),
      response: response.data,
    });
    throw error;
  }

  const messageId = extractMessageId(response.data);

  console.log('[SMS] Raw SMS sent successfully', {
    phone: maskPhoneNumber(phoneNumber),
    messageId,
  });

  return {
    success: true,
    messageId,
    providerResponse: response.data,
  };
};

module.exports = {
  ensureSMSConfigured,
  smsTemplates,
  sendTemplateSMS,
  sendRawSMS,
};

