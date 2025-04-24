import { StorageAdapter, IndexedDBConfig } from "./types";

/**
 * IndexedDB 存储适配器
 */
export class IndexedDBAdapter<T = any> implements StorageAdapter<T> {
  private db: IDBDatabase | null = null;
  private objectStoreName: string;
  private databaseName: string;
  name: string;

  constructor(config: IndexedDBConfig) {
    this.databaseName = config.database;
    this.objectStoreName = config.object || "echo-state";
    this.name = config.name;
  }

  /**
   * 获取当前数据库名称
   */
  getDatabaseName(): string {
    return this.databaseName;
  }

  /**
   * 获取当前对象仓库名称
   */
  getObjectStoreName(): string {
    return this.objectStoreName;
  }

  getKeyName(): string {
    return this.name;
  }

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(this.databaseName, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.objectStoreName)) {
          db.createObjectStore(this.objectStoreName);
        }
      };
    });
  }

  async getItem(): Promise<T | null> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        this.objectStoreName,
        "readonly",
      );
      const store = transaction.objectStore(this.objectStoreName);
      const request = store.get(this.name);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async setItem(value: T): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        this.objectStoreName,
        "readwrite",
      );
      const store = transaction.objectStore(this.objectStoreName);
      const request = store.put(value, this.name);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async removeItem(): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        this.objectStoreName,
        "readwrite",
      );
      const store = transaction.objectStore(this.objectStoreName);
      const request = store.delete(this.name);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除指定的 key
   * @param key 要删除的 key
   */
  async discard(): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        this.objectStoreName,
        "readwrite",
      );
      const store = transaction.objectStore(this.objectStoreName);
      const request = store.delete(this.name);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  destroy(): void {
    this.removeItem();
    this.close();
    indexedDB.deleteDatabase(this.databaseName);
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }
}
