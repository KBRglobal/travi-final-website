// Stub - Security Logger disabled
export function logSecurityEvent(..._args: unknown[]) {}
export function logSecurityWarning(..._args: unknown[]) {}
export function logSecurityError(..._args: unknown[]) {}
export function logAdminEvent(..._args: unknown[]) {}
export function logDataAccessEvent(..._args: unknown[]) {}
export const securityLogger = {
  log: (..._args: unknown[]) => {},
  warn: (..._args: unknown[]) => {},
  error: (..._args: unknown[]) => {},
  info: (..._args: unknown[]) => {},
};
