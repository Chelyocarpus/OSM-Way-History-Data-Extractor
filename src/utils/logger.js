class Logger {
    constructor(config = {}) {
        this.config = {
            level: 'info',
            maxEntries: 1000,
            timestampFormat: 'HH:mm:ss',
            ...config
        };
        
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
        
        this.entries = [];
        this.outputElement = null;
    }
    
    setOutputElement(element) {
        this.outputElement = element;
    }
    
    setLevel(level) {
        if (this.levels.hasOwnProperty(level)) {
            this.config.level = level;
        }
    }
    
    formatTimestamp() {
        const now = new Date();
        return now.toTimeString().split(' ')[0];
    }
    
    shouldLog(level) {
        return this.levels[level] >= this.levels[this.config.level];
    }
    
    log(level, message, data = null) {
        if (!this.shouldLog(level)) {
            return;
        }
        
        const timestamp = this.formatTimestamp();
        const entry = {
            timestamp,
            level,
            message,
            data
        };
        
        this.entries.push(entry);
        
        // Limit entries to prevent memory issues
        if (this.entries.length > this.config.maxEntries) {
            this.entries.shift();
        }
        
        this.render(entry);
        
        // Also log to browser console
        const consoleMethod = console[level] || console.log;
        consoleMethod(`[${timestamp}] ${message}`, data || '');
    }
    
    render(entry) {
        if (!this.outputElement) {
            return;
        }
        
        const { timestamp, level, message } = entry;
        const colorClass = this.getLevelColor(level);
        
        const logLine = document.createElement('div');
        logLine.className = `${colorClass} mb-1`;
        logLine.innerHTML = `
            <span class="text-gray-400">[${timestamp}]</span>
            <span class="font-semibold">[${level.toUpperCase()}]</span>
            <span>${this.escapeHtml(message)}</span>
        `;
        
        this.outputElement.appendChild(logLine);
        this.outputElement.scrollTop = this.outputElement.scrollHeight;
    }
    
    getLevelColor(level) {
        const colors = {
            debug: 'text-gray-300',
            info: 'text-green-400',
            warn: 'text-yellow-400',
            error: 'text-red-400'
        };
        return colors[level] || 'text-green-400';
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    debug(message, data) {
        this.log('debug', message, data);
    }
    
    info(message, data) {
        this.log('info', message, data);
    }
    
    warn(message, data) {
        this.log('warn', message, data);
    }
    
    error(message, data) {
        this.log('error', message, data);
    }
    
    clear() {
        this.entries = [];
        if (this.outputElement) {
            this.outputElement.innerHTML = '';
        }
    }
}

// Create global logger instance
const logger = new Logger(CONFIG.logging);

// Mark logger as loaded
if (window.APP_STATE) {
    window.APP_STATE.dependencies.logger = true;
}
