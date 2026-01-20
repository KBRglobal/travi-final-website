import { ObjectStorageAdapter } from "./services/storage-adapter";

export class StorageManager {
  private static instance: StorageManager | null = null;
  private adapter: ObjectStorageAdapter;

  private constructor() {
    this.adapter = new ObjectStorageAdapter();
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
