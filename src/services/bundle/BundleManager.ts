import { PackageInfo } from "@/common/types/model";

interface BundleInfo {
  bundle: string;
  version: string;
}

export class BundleManager {
  private static DB_NAME = "npm_modules";
  private static STORE_NAME = "bundles";
  private static DB_VERSION = 1;

  private static async initDB(): Promise<IDBDatabase> {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
      };
    });
  }

  public static async getAllBundles(): Promise<PackageInfo[]> {
    const db = await this.initDB();
    return new Promise<PackageInfo[]>((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], "readonly");
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const bundleInfos = request.result as BundleInfo[];
        const packages: PackageInfo[] = [];

        // Get all keys from the store
        const getAllKeysRequest = store.getAllKeys();
        getAllKeysRequest.onsuccess = () => {
          const keys = getAllKeysRequest.result;
          keys.forEach((key, index) => {
            if (bundleInfos[index]) {
              packages.push({
                name: key.toString(),
                version: bundleInfos[index].version,
                script: bundleInfos[index].bundle,
              });
            }
          });
          resolve(packages);
        };
        getAllKeysRequest.onerror = () => reject(getAllKeysRequest.error);
      };
    });
  }

  public static async saveBundle(
    name: string,
    bundle: string,
    version: string
  ): Promise<void> {
    const db = await this.initDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], "readwrite");
      const store = transaction.objectStore(this.STORE_NAME);
      const bundleInfo: BundleInfo = {
        bundle,
        version,
      };
      const request = store.put(bundleInfo, name);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  public static async getBundle(name: string): Promise<string | null> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], "readonly");
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(name);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const bundleInfo = request.result as BundleInfo;
        resolve(bundleInfo?.bundle || null);
      };
    });
  }

  public static async deleteBundle(name: string): Promise<void> {
    const db = await this.initDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], "readwrite");
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(name);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}
