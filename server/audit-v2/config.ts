/**
 * Audit Log v2 - Configuration
 * Feature Flag: ENABLE_AUDIT_V2=true
 */

export function isAuditV2Enabled(): boolean {
  return process.env.ENABLE_AUDIT_V2 === 'true';
}

export const AUDIT_V2_CONFIG = {
  // Maximum events to store in memory
  maxEventsStored: parseInt(process.env.AUDIT_MAX_EVENTS || '10000', 10),

  // Enable redaction
  redactionEnabled: process.env.AUDIT_REDACTION_ENABLED !== 'false',
} as const;

// Fields to redact in payloads
export const REDACTED_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'authorization',
  'cookie',
  'sessionId',
  'session_id',
  'creditCard',
  'credit_card',
  'ssn',
  'socialSecurity',
  'privateKey',
  'private_key',
];
