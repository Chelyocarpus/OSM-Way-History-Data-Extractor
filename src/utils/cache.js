class Cache {
    constructor(config = {}) {
        this.config = {
            storageKey: 'osm_cache',
            expiryDays: 7,
            maxSize: 100 * 1024 * 1024,
            ...config
        };
        
        this.db = null;
        this.initPromise = this.init();
    }
    
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('OSMCache', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('cache')) {
                    const store = db.createObjectStore('cache', { keyPath: 'key' });
                    store.createIndex('timestamp', 'timestamp');
                }
            };
        });
    }
    
    generateKey(url) {
        return btoa(url).replace(/[^a-zA-Z0-9]/g, '_');
    }
    
    async set(url, data) {
        await this.initPromise;
        
        const key = this.generateKey(url);
        const entry = {
            key,
            url,
            data,
            timestamp: Date.now(),
            size: this.estimateSize(data)
        };
        
        const transaction = this.db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        
        await new Promise((resolve, reject) => {
            const request = store.put(entry);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
        
        logger.debug(`Cached data for URL: ${url}`);
    }
    
    async get(url) {
        await this.initPromise;
        
        const key = this.generateKey(url);
        const transaction = this.db.transaction(['cache'], 'readonly');
        const store = transaction.objectStore('cache');
        
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => {
                const entry = request.result;
                if (!entry) {
                    resolve(null);
                    return;
                }
                
                // Check if entry is expired
                const maxAge = this.config.expiryDays * 24 * 60 * 60 * 1000;
                if (Date.now() - entry.timestamp > maxAge) {
                    this.delete(url);
                    resolve(null);
                    return;
                }
                
                logger.debug(`Cache hit for URL: ${url}`);
                resolve(entry.data);
            };
            request.onerror = () => reject(request.error);
        });
    }
    
    async delete(url) {
        await this.initPromise;
        
        const key = this.generateKey(url);
        const transaction = this.db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        
        return new Promise((resolve, reject) => {
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    
    async clear() {
        await this.initPromise;
        
        const transaction = this.db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        
        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => {
                logger.info('Cache cleared');
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }
    
    estimateSize(data) {
        return new Blob([JSON.stringify(data)]).size;
    }
}

// Create global cache instance
const cache = new Cache(CONFIG.cache);

// Mark cache as loaded
if (window.APP_STATE) {
    window.APP_STATE.dependencies.cache = true;
}
