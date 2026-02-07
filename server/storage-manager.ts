import { R2StorageAdapter } from "./services/storage-adapter";

export class StorageManager {
  private static instance: StorageManager | null = null;
  private readonly adapter: R2StorageAdapter;

  private constructor() {
    this.adapter = new R2StorageAdapter();
  }

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  async uploadBuffer(buffer: Buffer, path: string, contentType: string): Promise<string> {
    return this.adapter.upload(path, buffer);
  }

  getPublicUrl(path: string): string {
    return this.adapter.getUrl(path);
  }

  async delete(path: string): Promise<void> {
    return this.adapter.delete(path);
  }

  async exists(path: string): Promise<boolean> {
    return this.adapter.exists(path);
  }
}
