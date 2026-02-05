import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Badge, Spinner, ListGroup } from 'react-bootstrap';
import { FaEnvelope, FaSms, FaWhatsapp, FaInfoCircle } from 'react-icons/fa';
import api from '../../services/api';

const themeColors = {
  primary: '#164e63',
  secondary: '#0e7490',
  accent: '#06b6d4',
};

const defaultTemplateSettings = {
  email: {
    testInvitation: true,
    testResultsPassed: true,
    testResultsNotSelected: true,
    interviewScheduleUpdate: true,
  },
  sms: {
    testInvitation: true,
    testResultStatus: true,
    interviewScheduleUpdate: true,
  },
  whatsapp: {
    testInvitation: true,
    testResultStatus: true,
    interviewScheduleUpdate: true,
  },
};

const buildCandidateState = (incoming = {}) => ({
  email: incoming.email ?? true,
  sms: incoming.sms ?? false,
  whatsapp: incoming.whatsapp ?? false,
  templates: {
    email: {
      ...defaultTemplateSettings.email,
      ...(incoming.templates?.email || {}),
    },
    sms: {
      ...defaultTemplateSettings.sms,
      ...(incoming.templates?.sms || {}),
    },
    whatsapp: {
      ...defaultTemplateSettings.whatsapp,
      ...(incoming.templates?.whatsapp || {}),
    },
  },
});

const channelMeta = {
  email: {
    title: 'Email Notifications',
    description: 'Send detailed emails for test invites, interview updates, and results.',
    icon: FaEnvelope,
  },
  sms: {
    title: 'SMS Notifications',
    description: 'Send concise SMS alerts alongside emails using the BulkSMS gateway.',
    icon: FaSms,
  },
  whatsapp: {
    title: 'WhatsApp Notifications',
    description: 'Deliver WhatsApp messages through a connected WhatsApp Business account.',
    icon: FaWhatsapp,
  },
};

const channelStyles = {
  email: {
    cardBg: 'rgba(127, 29, 29, 0.08)',
    border: `4px solid ${themeColors.primary}`,
    accent: themeColors.primary,
  },
  sms: {
    cardBg: 'rgba(249, 115, 22, 0.08)',
    border: `4px solid ${themeColors.accent}`,
    accent: themeColors.accent,
  },
  whatsapp: {
    cardBg: 'rgba(67, 20, 7, 0.08)',
    border: `4px solid ${themeColors.secondary}`,
    accent: themeColors.secondary,
  },
};

const channelDetails = {
  email: {
    summary:
      'Rich HTML + plain text emails keep candidates informed with full context, credentials, and actionable links.',
    types: [
      {
        key: 'testInvitation',
        title: 'Test Invitation',
        description: 'Invitation email with login credentials, assessment details, and direct launch link.',
        triggers: ['Conduct test from topics (auto-generated tests)', 'Conduct test from CSV upload'],
      },
      {
        key: 'testResultsPassed',
        title: 'Test Results – Passed',
        description: 'Success email confirming test completion and next steps. Includes interview schedule when available.',
        triggers: ['Release test results with promotion to interview'],
      },
      {
        key: 'testResultsNotSelected',
        title: 'Test Results – Not Selected',
        description: 'Polite rejection email summarising assessment outcome and optional reviewer notes.',
        triggers: ['Release test results without promotion'],
      },
      {
        key: 'interviewScheduleUpdate',
        title: 'Interview Schedule Update',
        description: 'Reschedule email highlighting old vs new slots, meeting link, and interview metadata.',
        triggers: ['Update candidate interview schedule (reschedule flow)'],
      },
    ],
  },
  sms: {
    summary:
      'Short transactional SMS messages mirror the most critical candidate updates to ensure high visibility.',
    types: [
      {
        key: 'testInvitation',
        title: 'Test Invitation',
        description: 'Heads-up SMS with assessment title, duration, and login credentials.',
        triggers: ['Conduct test from topics', 'Conduct test from CSV upload'],
      },
      {
        key: 'testResultStatus',
        title: 'Test Results – Status Update',
        description: 'Outcome SMS noting pass/fail status and percentage scored.',
        triggers: ['Release test results (both selected and not selected scenarios)'],
      },
      {
        key: 'interviewScheduleUpdate',
        title: 'Interview Schedule / Reschedule',
        description: 'Schedule confirmation or change notification with position, date, and time.',
        triggers: ['Release test results with interview details', 'Reschedule interview via candidate update'],
      },
    ],
  },
  whatsapp: {
    summary:
      'WhatsApp notifications will mirror email/SMS templates once a Business API provider is connected and approved.',
    types: [
      {
        key: 'testInvitation',
        title: 'Test Invitation (Planned)',
        description: 'Rich WhatsApp template with login link and credentials for quick access.',
        triggers: ['Same as email/SMS once provider is configured'],
      },
      {
        key: 'testResultStatus',
        title: 'Test Result Status (Planned)',
        description: 'Pass/fail summary with guidance on next steps delivered via WhatsApp.',
        triggers: ['Release test results'],
      },
      {
        key: 'interviewScheduleUpdate',
        title: 'Interview Schedule Alerts (Planned)',
        description: 'WhatsApp reminder or reschedule confirmation with meeting details.',
        triggers: ['Interview scheduling and rescheduling actions'],
      },
    ],
  },
};

const NotificationSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [candidate, setCandidate] = useState(buildCandidateState());
  const [capabilities, setCapabilities] = useState({ sms: false, whatsapp: false });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [selectedChannel, setSelectedChannel] = useState('email');

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/settings/notifications');
      setCandidate(buildCandidateState(data?.settings?.candidate));
      setCapabilities(data?.capabilities || { sms: false, whatsapp: false });
    } catch (error) {
      console.error('Failed to load notification settings:', error);
      setStatus({
        type: 'danger',
        message: error?.response?.data?.message || 'Unable to load notification settings. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!channelDetails[selectedChannel]) {
      setSelectedChannel('email');
    }
  }, [selectedChannel]);

  const handleToggle = (channel) => {
    setCandidate((prev) => ({
      ...prev,
      [channel]: !prev[channel],
    }));
  };

  const handleToggleFromList = (event, channel) => {
    event.stopPropagation();
    handleToggle(channel);
  };

  const handleTemplateToggle = (channel, templateKey) => {
    setCandidate((prev) => ({
      ...prev,
      templates: {
        ...prev.templates,
        [channel]: {
          ...prev.templates?.[channel],
          [templateKey]: !prev.templates?.[channel]?.[templateKey],
        },
      },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setStatus({ type: '', message: '' });
      const { data } = await api.put('/settings/notifications', {
        candidate,
      });

      setCandidate(buildCandidateState(data?.settings?.candidate));
      setCapabilities(data?.capabilities || { sms: false, whatsapp: false });

      setStatus({
        type: 'success',
        message: 'Notification preferences updated successfully.',
      });
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      setStatus({
        type: 'danger',
        message: error?.response?.data?.message || 'Unable to update notification settings. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const renderCapabilityBadge = (channel) => {
    if (channel === 'email') {
      return (
        <Badge style={{ backgroundColor: themeColors.primary }} pill>
          Active
        </Badge>
      );
    }

    if (channel === 'sms') {
      return (
        <Badge bg={capabilities.sms ? 'success' : 'warning'} pill>
          {capabilities.sms ? 'Configured' : 'Needs Setup'}
        </Badge>
      );
    }

    if (channel === 'whatsapp') {
      return (
        <Badge bg={capabilities.whatsapp ? 'success' : 'secondary'} pill>
          {capabilities.whatsapp ? 'Connected' : 'Not Connected'}
        </Badge>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <Container fluid className="py-4 super-admin-fluid">
      <Row className="mb-4">
        <Col>
          <h2 className="fw-bold">Candidate Notification Settings</h2>
          <p className="text-muted mb-0">
            Decide which channels the recruitment platform uses when reaching out to candidates.
          </p>
        </Col>
      </Row>

      {status.message && (
        <Row className="mb-3">
          <Col md={8} lg={6}>
            <Alert variant={status.type}>{status.message}</Alert>
          </Col>
        </Row>
      )}

      <Row>
        <Col md={4} lg={3}>
          <Card className="shadow-sm h-100">
            <Card.Header
              className="fw-semibold"
              style={{ backgroundColor: themeColors.primary, color: '#fff' }}
            >
              Notification Channels
            </Card.Header>
            <ListGroup variant="flush">
              {Object.keys(channelMeta).map((channel) => {
                const meta = channelMeta[channel];
                const Icon = meta.icon;
                const details = channelDetails[channel];
                const isActive = selectedChannel === channel;
                return (
                  <ListGroup.Item
                    key={channel}
                    action
                    active={isActive}
                    onClick={() => setSelectedChannel(channel)}
                    className="py-3"
                    style={
                      isActive
                        ? {
                            borderLeft: `4px solid ${channelStyles[channel].accent}`,
                            background: channelStyles[channel].cardBg,
                          }
                        : undefined
                    }
                  >
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="d-flex align-items-center fw-semibold">
                           <Icon className="me-2" style={{ color: channelStyles[channel].accent }} />
                          {meta.title}
                        </div>
                        <div className="text-muted small">{details.types.length} notification templates</div>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        {renderCapabilityBadge(channel)}
                        <Form.Check
                          type="switch"
                          id={`candidate-${channel}`}
                          checked={Boolean(candidate[channel])}
                          onClick={(event) => handleToggleFromList(event, channel)}
                          onChange={() => {}}
                          disabled={saving || loading}
                        />
                      </div>
                    </div>
                    <div className="text-muted small mt-2">{meta.description}</div>
                  </ListGroup.Item>
                );
              })}
            </ListGroup>
          </Card>
        </Col>
        <Col md={8} lg={9}>
          <Card className="mb-4 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="fw-semibold mb-1 d-flex align-items-center">
                    {(() => {
                      const Icon = channelMeta[selectedChannel].icon;
                      return <Icon className="me-3" size={22} style={{ color: channelStyles[selectedChannel].accent }} />;
                    })()}
                    {channelMeta[selectedChannel].title}
                  </h4>
                  <p className="text-muted mb-0">{channelDetails[selectedChannel].summary}</p>
                </div>
                <div className="text-end">
                  <Badge
                    className="mb-2"
                    style={{
                      backgroundColor: channelStyles[selectedChannel].accent,
                    }}
                  >
                    {channelDetails[selectedChannel].types.length} message types
                  </Badge>
                  <div className="d-flex gap-2 justify-content-end">
                    <Button variant="primary" onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button variant="outline-secondary" onClick={fetchSettings} disabled={saving}>
                      Reset
                    </Button>
                  </div>
                </div>
              </div>

              <hr />

              <div className="mt-3">
                {channelDetails[selectedChannel].types.map((entry, index) => {
                  const isChannelEnabled = Boolean(candidate[selectedChannel]);
                  const templateEnabled =
                    candidate.templates?.[selectedChannel]?.[entry.key] !== false;
                  return (
                    <Card
                      key={`${selectedChannel}-${index}`}
                      className="mb-3 border-0"
                      style={{
                        background: channelStyles[selectedChannel].cardBg,
                        borderLeft: channelStyles[selectedChannel].border,
                      }}
                    >
                      <Card.Body className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3">
                        <div>
                          <h6 className="fw-semibold mb-2" style={{ color: channelStyles[selectedChannel].accent }}>
                            {entry.title}
                          </h6>
                          <p className="text-muted mb-2">{entry.description}</p>
                          <div className="small text-secondary">
                            <strong>Triggers:</strong> {entry.triggers.join('; ')}
                          </div>
                        </div>
                        <div className="d-flex flex-column align-items-md-end align-items-start">
                          <Form.Check
                            type="switch"
                            id={`${selectedChannel}-template-${entry.key}`}
                            label={templateEnabled ? 'Enabled' : 'Disabled'}
                            checked={templateEnabled}
                            onChange={() => handleTemplateToggle(selectedChannel, entry.key)}
                            disabled={!isChannelEnabled || saving || loading}
                          />
                          {!isChannelEnabled && (
                            <small className="text-muted">
                              Enable the {channelMeta[selectedChannel].title.toLowerCase()} channel to use this template.
                            </small>
                          )}
                        </div>
                      </Card.Body>
                    </Card>
                  );
                })}
              </div>
            </Card.Body>
          </Card>

          {selectedChannel === 'sms' && (
            <Card className="shadow-sm mb-4">
              <Card.Body>
                <h5 className="mb-3">How SMS notifications work</h5>
                <ol className="ps-3">
                  <li>Set up BulkSMS credentials in the backend `.env` file and restart the server.</li>
                  <li>Verify that DLT template IDs exactly match the templates registered with the operator.</li>
                  <li>Switch on the SMS toggle above to activate candidate alerts.</li>
                </ol>
                <Alert variant="warning" className="mb-0">
                  <FaInfoCircle className="me-2" />
                  Add `BULKSMS_API_KEY`, `BULKSMS_SENDER_ID`, and template IDs to the backend environment to start sending
                  SMS alerts.
                </Alert>
              </Card.Body>
            </Card>
          )}

          {selectedChannel === 'whatsapp' && (
            <Card className="shadow-sm">
              <Card.Body>
                <h5 className="mb-3">WhatsApp enablement checklist</h5>
                <ol className="ps-3 mb-0">
                  <li>Register a WhatsApp Business Account and obtain an access token.</li>
                  <li>Configure verified sender + approved message templates with your provider.</li>
                  <li>Add the account ID and access token to the backend environment variables.</li>
                  <li>Enable the toggle here once the integration is complete.</li>
                </ol>
                {!capabilities.whatsapp && (
                  <Alert variant="info" className="mt-3 mb-0">
                    <FaInfoCircle className="me-2" />
                    Connect a WhatsApp Business API provider (Meta Cloud API or Twilio) to enable WhatsApp notifications.
                  </Alert>
                )}
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default NotificationSettings;

