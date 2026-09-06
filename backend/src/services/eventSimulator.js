const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

/**
 * Event Simulator
 * Generates anonymized synthetic user journey events.
 * Only anonymized hashes are stored — no PII.
 */

/**
 * Generate a privacy-safe anonymous session hash.
 * Uses SHA-256 of a random UUID — not reversible to any real user.
 */
const generateAnonymousHash = () => {
  return crypto.createHash('sha256').update(uuidv4()).digest('hex');
};

/**
 * Get a random date within the last N days.
 */
const randomDateWithinDays = (days = 30) => {
  const now = Date.now();
  const start = now - days * 24 * 60 * 60 * 1000;
  return new Date(start + Math.random() * (now - start));
};

/**
 * Simulate a user journey through workflow stages.
 *
 * @param {Object} options
 * @param {string} options.tenantId
 * @param {Array}  options.stages - Array of { stage_id, stage_name, stage_order }
 * @param {number} options.numUsers - Number of users to simulate
 * @param {number} options.dropOffProbability - Per-stage drop-off rate (0-1)
 * @param {number} options.consentPercentage - % of users who give consent (0-100)
 * @returns {Array} Array of event objects ready for DB insertion
 */
const simulateJourney = (options) => {
  const {
    tenantId,
    stages,
    numUsers = 5000,
    dropOffProbability = 0.3,
    consentPercentage = 70,
  } = options;

  if (!stages || stages.length === 0) {
    throw new Error('No workflow stages defined. Please create stages first.');
  }

  const sortedStages = [...stages].sort((a, b) => a.stage_order - b.stage_order);
  const events = [];
  const consentRate = consentPercentage / 100;

  for (let u = 0; u < numUsers; u++) {
    const userHash = generateAnonymousHash();
    const consentGiven = Math.random() < consentRate;
    const baseTimestamp = randomDateWithinDays(30);
    let currentTime = new Date(baseTimestamp);

    for (let s = 0; s < sortedStages.length; s++) {
      const stage = sortedStages[s];
      const sessionDuration = Math.floor(Math.random() * 290) + 10; // 10-300s

      // Enter event
      events.push({
        tenant_id: tenantId,
        stage_id: stage.stage_id,
        event_timestamp: new Date(currentTime),
        event_type: 'enter',
        consent_given: consentGiven,
        anonymized_user_hash: userHash,
        session_duration_seconds: sessionDuration,
      });

      currentTime = new Date(currentTime.getTime() + sessionDuration * 1000);

      // First stage has lower drop-off (most users get past signup)
      const effectiveDropOff = s === 0
        ? dropOffProbability * 0.5
        : dropOffProbability * (1 + s * 0.15); // Higher stages have higher drop-off

      const cappedDropOff = Math.min(effectiveDropOff, 0.95);

      if (Math.random() < cappedDropOff) {
        // User abandons at this stage
        events.push({
          tenant_id: tenantId,
          stage_id: stage.stage_id,
          event_timestamp: new Date(currentTime),
          event_type: 'abandon',
          consent_given: consentGiven,
          anonymized_user_hash: userHash,
          session_duration_seconds: Math.floor(sessionDuration * 0.4),
        });
        break; // User doesn't progress further
      } else {
        // User completes this stage
        events.push({
          tenant_id: tenantId,
          stage_id: stage.stage_id,
          event_timestamp: new Date(currentTime),
          event_type: 'complete',
          consent_given: consentGiven,
          anonymized_user_hash: userHash,
          session_duration_seconds: sessionDuration,
        });

        currentTime = new Date(currentTime.getTime() + 5000); // 5s gap between stages

        // Occasional timeout event (5% chance)
        if (Math.random() < 0.05 && s < sortedStages.length - 1) {
          events.push({
            tenant_id: tenantId,
            stage_id: stage.stage_id,
            event_timestamp: new Date(currentTime),
            event_type: 'timeout',
            consent_given: consentGiven,
            anonymized_user_hash: userHash,
            session_duration_seconds: 300,
          });
        }
      }
    }
  }

  return events;
};

/**
 * Generate a summary of simulated events before DB insertion.
 */
const summarizeEvents = (events, stages) => {
  const byStage = {};
  const byType = { enter: 0, complete: 0, abandon: 0, timeout: 0 };
  const consentedHashes = new Set();
  const totalHashes = new Set();

  events.forEach((e) => {
    const stageName = stages.find((s) => s.stage_id === e.stage_id)?.stage_name || e.stage_id;
    if (!byStage[stageName]) {
      byStage[stageName] = { enter: 0, complete: 0, abandon: 0, timeout: 0 };
    }
    byStage[stageName][e.event_type] = (byStage[stageName][e.event_type] || 0) + 1;
    byType[e.event_type] = (byType[e.event_type] || 0) + 1;
    totalHashes.add(e.anonymized_user_hash);
    if (e.consent_given) consentedHashes.add(e.anonymized_user_hash);
  });

  const completionRate = totalHashes.size > 0
    ? Math.round((byType.complete / Math.max(byType.enter, 1)) * 100 * 10) / 10
    : 0;

  return {
    totalEvents: events.length,
    uniqueUsers: totalHashes.size,
    consentedUsers: consentedHashes.size,
    consentRate: totalHashes.size > 0
      ? Math.round((consentedHashes.size / totalHashes.size) * 100)
      : 0,
    byType,
    byStage,
    completionRate,
  };
};

module.exports = { simulateJourney, summarizeEvents, generateAnonymousHash };
