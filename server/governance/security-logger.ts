// Stub - Security Logger disabled
export function logSecurityEvent(..._args: unknown[]) {
  /* empty */
}
export function logSecurityWarning(..._args: unknown[]) {
  /* empty */
}
export function logSecurityError(..._args: unknown[]) {
  /* empty */
}
export function logAdminEvent(..._args: unknown[]) {
  /* empty */
}
export function logDataAccessEvent(..._args: unknown[]) {
  /* empty */
}
export const securityLogger = {
  log: (..._args: unknown[]) => {},
  warn: (..._args: unknown[]) => {},
  error: (..._args: unknown[]) => {},
  info: (..._args: unknown[]) => {},
};
