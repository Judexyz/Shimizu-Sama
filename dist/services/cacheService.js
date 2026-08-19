export class CacheService {
    static store = new Map();
    static async set(key, value, ttlSeconds) {
        const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
        this.store.set(key, { value, expiry });
    }
    static async get(key) {
        const item = this.store.get(key);
        if (!item)
            return null;
        if (item.expiry && Date.now() > item.expiry) {
            this.store.delete(key);
            return null;
        }
        return item.value;
    }
    static async delete(key) {
        this.store.delete(key);
    }
    static async clear() {
        this.store.clear();
    }
    static async increment(key, amount = 1, ttlSeconds) {
        let current = await this.get(key);
        if (typeof current !== 'number') {
            current = 0;
        }
        const newValue = current + amount;
        const item = this.store.get(key);
        const expiry = item ? item.expiry : ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
        this.store.set(key, { value: newValue, expiry });
        return newValue;
    }
    static async pushToArray(key, value, ttlSeconds) {
        let currentArray = await this.get(key);
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
