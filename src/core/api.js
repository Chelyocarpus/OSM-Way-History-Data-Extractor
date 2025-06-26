class OSMApi {
    constructor(config = {}) {
        this.config = {
            baseUrl: 'https://api.openstreetmap.org/api/0.6',
            timeout: 30000,
            maxRetries: 3,
            retryDelay: 1000,
            rateLimit: 500,
            ...config
        };
        
        this.lastRequestTime = 0;
        this.requestQueue = [];
        this.processing = false;
        
        // Input validation patterns
        this.validationPatterns = {
            wayId: /^[1-9]\d{0,18}$/,
            nodeId: /^[1-9]\d{0,18}$/
        };
        
        // Check if dependencies are available
        if (typeof window.cache === 'undefined') {
            console.warn('Cache not available, requests will not be cached');
        }
        if (typeof window.logger === 'undefined') {
            console.warn('Logger not available, using console logging');
        }
    }
    
    log(level, message, data = null) {
        if (window.logger && typeof window.logger.log === 'function') {
            window.logger.log(level, message, data);
        } else {
            console[level] || console.log(`[${level.toUpperCase()}] ${message}`, data || '');
        }
    }
    
    async cacheGet(key) {
        if (window.cache && typeof window.cache.get === 'function') {
            return await window.cache.get(key);
        }
        return null;
    }
    
    async cacheSet(key, value) {
        if (window.cache && typeof window.cache.set === 'function') {
            await window.cache.set(key, value);
        }
    }
    
    validateInput(value, type) {
        if (!value || typeof value !== 'string') {
            throw new Error(`Invalid ${type}: must be a non-empty string`);
        }
        
        const cleanValue = value.toString().replace(/^#+/, '').trim();
        
        if (!this.validationPatterns[type] || !this.validationPatterns[type].test(cleanValue)) {
            throw new Error(`Invalid ${type}: must be a positive integer`);
        }
        
        const numValue = parseInt(cleanValue, 10);
        if (numValue > Number.MAX_SAFE_INTEGER) {
            throw new Error(`Invalid ${type}: value too large`);
        }
        
        return cleanValue;
    }
    
    sanitizeUrl(url) {
        try {
            const urlObj = new URL(url);
            
            // Only allow HTTPS to OSM API
            if (urlObj.protocol !== 'https:' || !urlObj.hostname.endsWith('openstreetmap.org')) {
                throw new Error('Invalid URL: only HTTPS OSM API URLs are allowed');
            }
            
            return urlObj.toString();
        } catch (error) {
            throw new Error(`Invalid URL: ${error.message}`);
        }
    }
    
    async rateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.config.rateLimit) {
            const delay = this.config.rateLimit - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        this.lastRequestTime = Date.now();
    }
    
    async makeRequest(url, options = {}) {
        // Validate and sanitize URL
        const sanitizedUrl = this.sanitizeUrl(url);
        
        // Check cache first
        const cachedData = await this.cacheGet(sanitizedUrl);
        if (cachedData) {
            return cachedData;
        }
        
        await this.rateLimit();
        this.log('debug', `Making request to: ${sanitizedUrl}`);
        
        let lastError;
        for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
                
                const response = await fetch(sanitizedUrl, {
                    ...options,
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'OSM-History-Extractor/1.0',
                        'Accept': 'application/xml, text/xml',
                        ...options.headers
                    },
                    credentials: 'omit',
                    mode: 'cors'
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                // Validate content type
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('xml')) {
                    throw new Error('Invalid response: expected XML content');
                }
                
                const data = await response.text();
                
                // Basic XML validation
                if (!data.trim().startsWith('<?xml') && !data.trim().startsWith('<osm')) {
                    throw new Error('Invalid response: not valid XML');
                }
                
                // Cache the response
                await this.cacheSet(sanitizedUrl, data);
                
                return data;
                
            } catch (error) {
                lastError = error;
                
                if (attempt < this.config.maxRetries - 1) {
                    this.log('warn', `Request failed (attempt ${attempt + 1}/${this.config.maxRetries}): ${error.message}`);
                    await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
                } else {
                    this.log('error', `Request failed after ${this.config.maxRetries} attempts: ${error.message}`);
                }
            }
        }
        
        throw lastError;
    }
    
    async getWayHistory(wayId) {
        const cleanWayId = this.validateInput(wayId, 'wayId');
        const url = `${this.config.baseUrl}/way/${cleanWayId}/history`;
        
        try {
            const data = await this.makeRequest(url);
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data, 'text/xml');
            
            // Check for XML parsing errors
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                throw new Error('XML parsing error: invalid response format');
            }
            
            const ways = Array.from(xmlDoc.querySelectorAll('way'));
            return ways.sort((a, b) => {
                const versionA = parseInt(a.getAttribute('version') || '0');
                const versionB = parseInt(b.getAttribute('version') || '0');
                return versionA - versionB;
            });
            
        } catch (error) {
            this.log('error', `Failed to fetch way history for ${wayId}: ${error.message}`);
            throw error;
        }
    }
    
    async getNodeHistory(nodeId) {
        const cleanNodeId = this.validateInput(nodeId, 'nodeId');
        const url = `${this.config.baseUrl}/node/${cleanNodeId}/history`;
        
        try {
            const data = await this.makeRequest(url);
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data, 'text/xml');
            
            // Check for XML parsing errors
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                throw new Error('XML parsing error: invalid response format');
            }
            
            return Array.from(xmlDoc.querySelectorAll('node'));
            
        } catch (error) {
            if (error.message.includes('410')) {
                this.log('warn', `Node ${nodeId} has been deleted`);
                return null;
            } else if (error.message.includes('404')) {
                this.log('warn', `Node ${nodeId} not found`);
                return null;
            }
            throw error;
        }
    }
    
    async getCurrentNode(nodeId) {
        const cleanNodeId = this.validateInput(nodeId, 'nodeId');
        const url = `${this.config.baseUrl}/node/${cleanNodeId}`;
        
        try {
            const data = await this.makeRequest(url);
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data, 'text/xml');
            
            // Check for XML parsing errors
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                throw new Error('XML parsing error: invalid response format');
            }
            
            return xmlDoc.querySelector('node');
            
        } catch (error) {
            this.log('warn', `Failed to fetch current node ${nodeId}: ${error.message}`);
            return null;
        }
    }
    
    // Batch process node requests to improve performance
    async batchProcessNodes(nodeIds, wayTimestamp, progressCallback) {
        const coords = [];
        const total = nodeIds.length;
        const startTime = Date.now();
        
        for (let i = 0; i < nodeIds.length; i++) {
            const nodeId = nodeIds[i];
            
            // Calculate ETA
            let eta = null;
            if (i > 0) {
                const elapsed = Date.now() - startTime;
                const avgTimePerNode = elapsed / i;
                const remaining = total - i;
                eta = (avgTimePerNode * remaining) / 1000; // Convert to seconds
            }
            
            // Update progress
            if (progressCallback) {
                progressCallback({
                    current: i,
                    total,
                    eta,
                    nodeId
                });
            }
            
            try {
                const coord = await this.getNodeCoordinate(nodeId, wayTimestamp);
                if (coord) {
                    coords.push(coord);
                }
            } catch (error) {
                this.log('error', `Error processing node ${nodeId}: ${error.message}`);
            }
        }
        
        return coords;
    }
    
    async getNodeCoordinate(nodeId, wayTimestamp) {
        const cleanNodeId = this.validateInput(nodeId, 'nodeId');
        
        try {
            // Get the node history
            const nodeHistory = await this.getNodeHistory(cleanNodeId);
            
            if (!nodeHistory || nodeHistory.length === 0) {
                this.log('warn', `No history found for node ${cleanNodeId}`);
                return null;
            }
            
            let selectedNode = null;
            
            if (wayTimestamp) {
                // Find the node version that was current at the time of the way's timestamp
                const wayTime = new Date(wayTimestamp);
                
                // Sort nodes by timestamp (oldest first)
                const sortedNodes = nodeHistory.sort((a, b) => {
                    const timeA = new Date(a.getAttribute('timestamp') || '1970-01-01');
                    const timeB = new Date(b.getAttribute('timestamp') || '1970-01-01');
                    return timeA - timeB;
                });
                
                // Find the last node version that was created before or at the way's timestamp
                for (let i = sortedNodes.length - 1; i >= 0; i--) {
                    const node = sortedNodes[i];
                    const nodeTimestamp = node.getAttribute('timestamp');
                    
                    if (nodeTimestamp) {
                        const nodeTime = new Date(nodeTimestamp);
                        if (nodeTime <= wayTime) {
                            selectedNode = node;
                            break;
                        }
                    }
                }
                
                // If no node was found before the way timestamp, use the oldest one
                if (!selectedNode && sortedNodes.length > 0) {
                    selectedNode = sortedNodes[0];
                    this.log('warn', `No node version found before way timestamp for node ${cleanNodeId}, using oldest version`);
                }
            } else {
                // No timestamp provided, use the most recent version
                const sortedNodes = nodeHistory.sort((a, b) => {
                    const versionA = parseInt(a.getAttribute('version') || '0');
                    const versionB = parseInt(b.getAttribute('version') || '0');
                    return versionB - versionA;
                });
                selectedNode = sortedNodes[0];
            }
            
            if (!selectedNode) {
                this.log('error', `No suitable node version found for node ${cleanNodeId}`);
                return null;
            }
            
            // Extract coordinates
            const lat = selectedNode.getAttribute('lat');
            const lon = selectedNode.getAttribute('lon');
            
            if (!lat || !lon) {
                this.log('error', `Node ${cleanNodeId} has no coordinates in selected version`);
                return null;
            }
            
            const latNum = parseFloat(lat);
            const lonNum = parseFloat(lon);
            
            if (isNaN(latNum) || isNaN(lonNum)) {
                this.log('error', `Invalid coordinates for node ${cleanNodeId}: lat=${lat}, lon=${lon}`);
                return null;
            }
            
            // Validate coordinate ranges
            if (latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
                this.log('error', `Coordinates out of range for node ${cleanNodeId}: lat=${latNum}, lon=${lonNum}`);
                return null;
            }
            
            const selectedVersion = selectedNode.getAttribute('version');
            const selectedTimestamp = selectedNode.getAttribute('timestamp');
            
            this.log('debug', `Selected node ${cleanNodeId} version ${selectedVersion} (${selectedTimestamp}) for way timestamp ${wayTimestamp}`);
            
            return { 
                lat: latNum, 
                lon: lonNum,
                nodeId: cleanNodeId,
                version: selectedVersion,
                timestamp: selectedTimestamp
            };
            
        } catch (error) {
            this.log('error', `Failed to fetch coordinates for node ${cleanNodeId}: ${error.message}`);
            throw error;
        }
    }
}

// Mark API as loaded
if (window.APP_STATE) {
    window.APP_STATE.dependencies.api = true;
}
