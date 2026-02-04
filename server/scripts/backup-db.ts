// Stub - backup script disabled
export interface BackupResult {
  success: boolean;
  filename?: string;
  error?: string;
}
export async function runBackup(): Promise<BackupResult> {
  return { success: true };
}
export async function createBackup(name?: string): Promise<BackupResult> {
  return { success: true };
}
export async function rotateBackups(): Promise<BackupResult> {
  return { success: true };
}
