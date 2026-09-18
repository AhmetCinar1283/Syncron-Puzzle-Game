/**
 * DOSYA AMACI: `services/securityEvents` modülünün tek public API'si.
 * Modülün dışından `lib/*` doğrudan import EDİLMEZ.
 */

export {
  SECURITY_EVENTS,
  SECURITY_EVENT_TYPES,
  isSecurityEventType,
  collectsFingerprint,
  type SecurityEventType,
  type SecurityEventDefinition,
  type SecuritySensitivity,
  type SecuritySeverity,
} from './lib/eventCatalog';

export {
  buildFingerprint,
  hashIp,
  readClientIp,
  readUserAgent,
  IP_HASH_HEX_LENGTH,
  USER_AGENT_MAX_LENGTH,
  type RequestFingerprint,
} from './lib/fingerprint';

export {
  recordSecurityEvent,
  type SecurityEventInput,
  type SecurityEventDeps,
} from './recordSecurityEvent';

export {
  insertSecurityEvent,
  querySecurityEventsByUid,
  deleteSecurityEventsOlderThan,
  type SecurityEventEntry,
  type SecurityEventInsert,
  type SecurityEventRow,
} from './securityEventStore';
