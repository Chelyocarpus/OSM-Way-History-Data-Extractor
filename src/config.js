const CONFIG = {
    api: {
        baseUrl: 'https://api.openstreetmap.org/api/0.6',
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
        rateLimit: 500
    },
    cache: {
        expiryDays: 7,
        storageKey: 'osm_cache',
        maxSize: 100 * 1024 * 1024 // 100MB
    },
    ui: {
        progressUpdateInterval: 100,
        toastDuration: 5000,
        debounceDelay: 300
    },
    logging: {
        level: 'info',
        maxEntries: 1000,
        timestampFormat: 'HH:mm:ss'
    },
    exports: {
        gpx: {
            version: '1.1',
            creator: 'OSM-history-extractor'
        },
        kml: {
            version: '2.2'
        }
    }
};

// Application state to track initialization
window.APP_STATE = {
    initialized: false,
    dependencies: {
        config: false,
        logger: false,
        cache: false,
        api: false,
        wayMerger: false,
        exports: false
    }
};

// Mark config as loaded
window.APP_STATE.dependencies.config = true;

// Utility function to check if all dependencies are loaded
const checkDependencies = () => {
    const { dependencies } = window.APP_STATE;
    return Object.values(dependencies).every(loaded => loaded);
};

// Initialize app when all dependencies are ready
const initializeWhenReady = () => {
    if (checkDependencies() && !window.APP_STATE.initialized) {
        window.APP_STATE.initialized = true;
        
        // Initialize global instances
        if (typeof Logger !== 'undefined') {
            window.logger = new Logger(CONFIG.logging);
        }
        if (typeof Cache !== 'undefined') {
            window.cache = new Cache(CONFIG.cache);
        }
        if (typeof OSMApi !== 'undefined') {
            window.osmApi = new OSMApi(CONFIG.api);
        }
        if (typeof WayMerger !== 'undefined') {
            window.wayMerger = new WayMerger();
        }
        if (typeof Exporter !== 'undefined') {
            window.exporter = new Exporter(CONFIG.exports);
        }
        
        // Dispatch ready event
        document.dispatchEvent(new CustomEvent('appReady'));
    }
};

// Check dependencies periodically
const dependencyChecker = setInterval(() => {
    if (checkDependencies()) {
        clearInterval(dependencyChecker);
        initializeWhenReady();
    }
}, 50);

// Make config reactive
const createReactiveConfig = (config) => {
    const handlers = new Map();
    
    return new Proxy(config, {
        set(target, property, value) {
            const oldValue = target[property];
            target[property] = value;
            
            if (handlers.has(property)) {
                handlers.get(property).forEach(handler => handler(value, oldValue));
            }
            
            return true;
        }
    });
};

const reactiveConfig = createReactiveConfig(CONFIG);

// Configuration change listeners
const onConfigChange = (property, handler) => {
    if (!CONFIG.handlers) {
        CONFIG.handlers = new Map();
    }
    if (!CONFIG.handlers.has(property)) {
        CONFIG.handlers.set(property, []);
    }
    CONFIG.handlers.get(property).push(handler);
};
