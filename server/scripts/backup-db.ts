export interface BackupResult {
  success: boolean;
  error?: string;
  filename?: string;
}

export async function createBackup(): Promise<BackupResult> {
  return { success: true };
}

export async function rotateBackups(): Promise<void> {
  return;
}
