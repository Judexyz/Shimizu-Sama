export class CacheService {
    static store = new Map();
    /**
     * Set a value in the cache.
     * @param key The cache key
     * @param value The value to cache
     * @param ttlSeconds Optional time-to-live in seconds
     */
    static async set(key, value, ttlSeconds) {
        const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
        this.store.set(key, { value, expiry });
    }
    /**
     * Get a value from the cache.
     * @param key The cache key
     * @returns The value, or null if not found or expired
     */
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
    /**
     * Delete a value from the cache.
     * @param key The cache key
     */
    static async delete(key) {
        this.store.delete(key);
    }
    /**
     * Clear all items in the cache (useful for testing or full resets).
     */
    static async clear() {
        this.store.clear();
    }
    /**
     * Increment a numeric counter in the cache.
     * @param key The cache key
     * @param amount The amount to increment by (default 1)
     * @param ttlSeconds Optional time-to-live for the key if it doesn't exist
     * @returns The new value
     */
    static async increment(key, amount = 1, ttlSeconds) {
        let current = await this.get(key);
        if (typeof current !== 'number') {
            current = 0;
        }
        const newValue = current + amount;
        // Maintain existing expiry if updating, or set new if creating
        const item = this.store.get(key);
        const expiry = item ? item.expiry : (ttlSeconds ? Date.now() + ttlSeconds * 1000 : null);
        this.store.set(key, { value: newValue, expiry });
        return newValue;
    }
    /**
     * Specialized array append function for AutoMod tracking
     */
    static async pushToArray(key, value, ttlSeconds) {
        let currentArray = await this.get(key);
        if (!Array.isArray(currentArray)) {
            currentArray = [];
        }
        currentArray.push(value);
        const item = this.store.get(key);
        const expiry = item ? item.expiry : (ttlSeconds ? Date.now() + ttlSeconds * 1000 : null);
        this.store.set(key, { value: currentArray, expiry });
        return currentArray;
    }
}
