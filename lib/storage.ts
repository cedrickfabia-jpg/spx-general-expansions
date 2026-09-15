import fs from "node:fs";
import path from "node:path";
import { env } from "@/lib/env";

export interface StorageProvider {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}

class LocalStorageProvider implements StorageProvider {
  private root: string;

  constructor(root: string) {
    this.root = root;
    fs.mkdirSync(this.root, { recursive: true });
  }

  private resolve(key: string): string {
    const safe = key.replace(/[^a-zA-Z0-9/_.-]/g, "_");
    const resolved = path.resolve(this.root, safe);
    if (!resolved.startsWith(path.resolve(this.root))) {
      throw new Error("Invalid storage key");
    }
    return resolved;
  }

  async put(key: string, data: Buffer, _contentType: string): Promise<void> {
    const target = this.resolve(key);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    await fs.promises.writeFile(target, data);
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await fs.promises.readFile(this.resolve(key));
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.promises.unlink(this.resolve(key));
    } catch {
      // missing files are already deleted
    }
  }
}

let provider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (provider) return provider;
  if (env.storageProvider === "local") {
    provider = new LocalStorageProvider(path.resolve(process.cwd(), env.storagePath));
  } else {
    throw new Error(`Storage provider "${env.storageProvider}" is not configured in this environment`);
  }
  return provider;
}
