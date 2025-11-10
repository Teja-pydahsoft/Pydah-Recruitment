const mongoose = require('mongoose');

const DEFAULT_CANDIDATE_TEMPLATE_SETTINGS = {
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

const applyCandidateDefaults = (candidate = {}) => {
  const merged = {
    email: candidate.email !== undefined ? candidate.email : true,
    sms: candidate.sms !== undefined ? candidate.sms : false,
    whatsapp: candidate.whatsapp !== undefined ? candidate.whatsapp : false,
    templates: {
      email: {
        ...DEFAULT_CANDIDATE_TEMPLATE_SETTINGS.email,
        ...(candidate.templates?.email || {}),
      },
      sms: {
        ...DEFAULT_CANDIDATE_TEMPLATE_SETTINGS.sms,
        ...(candidate.templates?.sms || {}),
      },
      whatsapp: {
        ...DEFAULT_CANDIDATE_TEMPLATE_SETTINGS.whatsapp,
        ...(candidate.templates?.whatsapp || {}),
      },
    },
  };

  return merged;
};

const notificationSettingsSchema = new mongoose.Schema(
  {
    scope: {
      type: String,
      enum: ['global'],
      default: 'global',
      unique: true,
    },
    candidate: {
      email: {
        type: Boolean,
        default: true,
      },
      sms: {
        type: Boolean,
        default: false,
      },
      whatsapp: {
        type: Boolean,
        default: false,
      },
      templates: {
        email: {
          testInvitation: { type: Boolean, default: true },
          testResultsPassed: { type: Boolean, default: true },
          testResultsNotSelected: { type: Boolean, default: true },
          interviewScheduleUpdate: { type: Boolean, default: true },
        },
        sms: {
          testInvitation: { type: Boolean, default: true },
          testResultStatus: { type: Boolean, default: true },
          interviewScheduleUpdate: { type: Boolean, default: true },
        },
        whatsapp: {
          testInvitation: { type: Boolean, default: true },
          testResultStatus: { type: Boolean, default: true },
          interviewScheduleUpdate: { type: Boolean, default: true },
        },
      },
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  },
);

notificationSettingsSchema.statics.getGlobalSettings = async function () {
  let settingsDoc = await this.findOne({ scope: 'global' });

  if (!settingsDoc) {
    settingsDoc = await this.create({});
  }

  const settingsObject = settingsDoc.toObject();
  settingsObject.candidate = applyCandidateDefaults(settingsObject.candidate);

  if (!settingsDoc.candidate || !settingsDoc.candidate.templates) {
    settingsDoc.candidate = applyCandidateDefaults(settingsDoc.candidate);
    await settingsDoc.save();
  }

  return settingsObject;
};

notificationSettingsSchema.statics.updateGlobalSettings = async function (candidateSettings, userId) {
  let settingsDoc = await this.findOne({ scope: 'global' });
  if (!settingsDoc) {
    settingsDoc = new this({ scope: 'global' });
  }

  settingsDoc.candidate = applyCandidateDefaults(settingsDoc.candidate);

  if (candidateSettings) {
    if (candidateSettings.email !== undefined) {
      settingsDoc.candidate.email = Boolean(candidateSettings.email);
    }
    if (candidateSettings.sms !== undefined) {
      settingsDoc.candidate.sms = Boolean(candidateSettings.sms);
    }
    if (candidateSettings.whatsapp !== undefined) {
      settingsDoc.candidate.whatsapp = Boolean(candidateSettings.whatsapp);
    }

    if (candidateSettings.templates) {
      const templateUpdates = candidateSettings.templates;
      ['email', 'sms', 'whatsapp'].forEach((channel) => {
        if (templateUpdates[channel]) {
          Object.entries(templateUpdates[channel]).forEach(([key, value]) => {
            settingsDoc.candidate.templates[channel][key] = Boolean(value);
          });
        }
      });
    }
  }

  if (userId) {
    settingsDoc.updatedBy = userId;
  }

  await settingsDoc.save();
  const result = settingsDoc.toObject();
  result.candidate = applyCandidateDefaults(result.candidate);
  return result;
};

module.exports = mongoose.model('NotificationSettings', notificationSettingsSchema);

