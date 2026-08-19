export class CacheService {
  private static store = new Map<string, { value: any; expiry: number | null }>();

  static async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiry });
  }

  static async get<T>(key: string): Promise<T | null> {
    const item = this.store.get(key);
    if (!item) return null;

    if (item.expiry && Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }

    return item.value as T;
  }

  static async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  static async clear(): Promise<void> {
    this.store.clear();
  }

  static async increment(key: string, amount: number = 1, ttlSeconds?: number): Promise<number> {
    let current = await this.get<number>(key);
    if (typeof current !== 'number') {
      current = 0;
    }

    const newValue = current + amount;

    const item = this.store.get(key);
    const expiry = item ? item.expiry : ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;

    this.store.set(key, { value: newValue, expiry });

    return newValue;
  }

  static async pushToArray<T>(key: string, value: T, ttlSeconds?: number): Promise<T[]> {
    let currentArray = await this.get<T[]>(key);
    if (!Array.isArray(currentArray)) {
      currentArray = [];
    }

    currentArray.push(value);

    const item = this.store.get(key);
    const expiry = item ? item.expiry : ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;

    this.store.set(key, { value: currentArray, expiry });

    return currentArray;
  }
}
