class OSMHistoryApp {
    constructor() {
        this.state = {
            wayId: null,
            wayVersions: [],
            selectedVersion: null,
            coordinates: [],
            originalCoordinates: [], // Store original before merge
            mergedWays: [], // Track merged way IDs
            isLoading: false,
            configExpanded: false,
            logExpanded: false,
            isMerging: false
        };
        
        this.dependenciesReady = false;
        this.initializeApp();
    }
    
    initializeApp() {
        // Wait for dependencies to be ready
        if (!window.APP_STATE || !window.APP_STATE.initialized) {
            document.addEventListener('appReady', () => {
                this.dependenciesReady = true;
                this.setupApp();
            });
            return;
        }
        
        this.dependenciesReady = true;
        this.setupApp();
    }
    
    setupApp() {
        // Debug available dependencies
        console.log('Available dependencies:', {
            logger: !!window.logger,
            osmApi: !!window.osmApi,
            wayMerger: !!window.wayMerger,
            exporter: !!window.exporter,
            WayMerger: !!window.WayMerger
        });
        
        // Ensure global instances are available
        if (!window.logger) {
            console.error('Logger not initialized');
            return;
        }
        if (!window.osmApi) {
            console.error('OSM API not initialized');
            return;
        }
        if (!window.wayMerger) {
            console.error('Way Merger not initialized');
            // Try to create it manually if the class is available
            if (window.WayMerger) {
                window.wayMerger = new window.WayMerger();
                console.log('Created wayMerger manually');
            } else {
                return;
            }
        }
        if (!window.exporter) {
            console.error('Exporter not initialized');
            return;
        }
        
        // Set up logger
        window.logger.setOutputElement(document.getElementById('log-output'));
        window.logger.info('OSM Way History Data Extractor initialized');
        
        // Bind event listeners
        this.bindEventListeners();
        
        // Initialize configuration from UI
        this.updateConfigFromUI();
        
        window.logger.info('Application ready');
    }
    
    bindEventListeners() {
        // Configuration toggle
        document.getElementById('config-toggle').addEventListener('click', () => {
            this.toggleConfiguration();
        });
        
        // Log toggle
        document.getElementById('log-toggle').addEventListener('click', () => {
            this.toggleLog();
        });
        
        // Configuration changes
        document.getElementById('log-level').addEventListener('change', (e) => {
            if (window.logger) {
                window.logger.setLevel(e.target.value);
                window.logger.info(`Log level changed to: ${e.target.value}`);
            }
        });
        
        document.getElementById('rate-limit').addEventListener('change', (e) => {
            CONFIG.api.rateLimit = parseInt(e.target.value);
            if (window.logger) {
                window.logger.info(`Rate limit changed to: ${e.target.value}ms`);
            }
        });
        
        document.getElementById('cache-expiry').addEventListener('change', (e) => {
            CONFIG.cache.expiryDays = parseInt(e.target.value);
            if (window.logger) {
                window.logger.info(`Cache expiry changed to: ${e.target.value} days`);
            }
        });
        
        // Clear cache button
        document.getElementById('clear-cache').addEventListener('click', async () => {
            try {
                if (window.cache) {
                    await window.cache.clear();
                    this.showToast('Cache cleared successfully', 'success');
                } else {
                    this.showToast('Cache not available', 'warning');
                }
            } catch (error) {
                if (window.logger) {
                    window.logger.error('Failed to clear cache', error);
                }
                this.showToast('Failed to clear cache', 'error');
            }
        });
        
        // Fetch history button
        document.getElementById('fetch-history').addEventListener('click', () => {
            this.fetchWayHistory();
        });
        
        // Way ID input (Enter key)
        document.getElementById('way-id').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.fetchWayHistory();
            }
        });
        
        // Export buttons
        document.getElementById('export-gpx').addEventListener('click', () => {
            this.exportData('gpx');
        });
        
        document.getElementById('export-kml').addEventListener('click', () => {
            this.exportData('kml');
        });
        
        document.getElementById('export-geojson').addEventListener('click', () => {
            this.exportData('geojson');
        });
        
        document.getElementById('export-json').addEventListener('click', () => {
            this.exportData('json');
        });
        
        // Merger buttons
        document.getElementById('merge-ways').addEventListener('click', () => {
            this.mergeAdditionalWays();
        });
        
        document.getElementById('reset-merger').addEventListener('click', () => {
            this.resetToSingleWay();
        });
    }
    
    toggleConfiguration() {
        const { configExpanded } = this.state;
        const configPanel = document.getElementById('config-panel');
        const toggleButton = document.getElementById('config-toggle');
        const toggleIcon = document.getElementById('config-toggle-icon');
        
        this.state.configExpanded = !configExpanded;
        
        if (this.state.configExpanded) {
            configPanel.classList.remove('hidden');
            toggleButton.setAttribute('aria-expanded', 'true');
            toggleIcon.style.transform = 'rotate(180deg)';
            if (window.logger) {
                window.logger.debug('Configuration panel opened');
            }
        } else {
            configPanel.classList.add('hidden');
            toggleButton.setAttribute('aria-expanded', 'false');
            toggleIcon.style.transform = 'rotate(0deg)';
            if (window.logger) {
                window.logger.debug('Configuration panel closed');
            }
        }
    }
    
    toggleLog() {
        const { logExpanded } = this.state;
        const logPanel = document.getElementById('log-panel');
        const toggleButton = document.getElementById('log-toggle');
        const toggleIcon = document.getElementById('log-toggle-icon');
        
        this.state.logExpanded = !logExpanded;
        
        if (this.state.logExpanded) {
            logPanel.classList.remove('hidden');
            toggleButton.setAttribute('aria-expanded', 'true');
            toggleIcon.style.transform = 'rotate(180deg)';
            if (window.logger) {
                window.logger.debug('Log panel opened');
            }
        } else {
            logPanel.classList.add('hidden');
            toggleButton.setAttribute('aria-expanded', 'false');
            toggleIcon.style.transform = 'rotate(0deg)';
            if (window.logger) {
                window.logger.debug('Log panel closed');
            }
        }
    }
    
    updateConfigFromUI() {
        const logLevel = document.getElementById('log-level').value;
        const rateLimit = parseInt(document.getElementById('rate-limit').value);
        const cacheExpiry = parseInt(document.getElementById('cache-expiry').value);
        
        window.logger.setLevel(logLevel);
        CONFIG.api.rateLimit = rateLimit;
        CONFIG.cache.expiryDays = cacheExpiry;
    }
    
    resetUI() {
        // Hide all dynamic sections
        document.getElementById('version-section').classList.add('hidden');
        document.getElementById('merger-section').classList.add('hidden');
        document.getElementById('export-section').classList.add('hidden');
        document.getElementById('progress-section').classList.add('hidden');
        
        // Reset progress
        this.updateProgress({ current: 0, total: 0, eta: null });
        
        // Clear previous selections
        this.state.wayVersions = [];
        this.state.selectedVersion = null;
        this.state.coordinates = [];
        this.state.originalCoordinates = [];
        this.state.mergedWays = [];
        
        // Reset merger UI
        document.getElementById('additional-ways').value = '';
        document.getElementById('merge-info').classList.add('hidden');
        
        // Update export info
        document.getElementById('coord-count').textContent = '0';
    }
    
    async fetchWayHistory() {
        if (!this.dependenciesReady || !window.osmApi) {
            this.showToast('Application not ready. Please wait...', 'warning');
            return;
        }
        
        const wayId = document.getElementById('way-id').value.trim();
        
        if (!wayId) {
            this.showToast('Please enter a way ID', 'error');
            return;
        }
        
        // Reset UI for new fetch - this will scroll to top
        this.resetUI();
        
        this.state.wayId = wayId;
        this.state.isLoading = true;
        this.updateUI();
        
        try {
            if (window.logger) {
                window.logger.info(`Fetching way history for ID: ${wayId}`);
            }
            
            const ways = await window.osmApi.getWayHistory(wayId);
            
            if (ways.length === 0) {
                throw new Error('No way versions found');
            }
            
            // Sort by timestamp (most recent first), fallback to version number if no timestamp
            ways.sort((a, b) => {
                const timestampA = a.getAttribute('timestamp');
                const timestampB = b.getAttribute('timestamp');
                
                if (timestampA && timestampB) {
                    return new Date(timestampB) - new Date(timestampA);
                }
                
                // Fallback to version number (highest first)
                const versionA = parseInt(a.getAttribute('version') || '0');
                const versionB = parseInt(b.getAttribute('version') || '0');
                return versionB - versionA;
            });
            
            this.state.wayVersions = ways;
            this.displayWayVersions();
            
            if (window.logger) {
                window.logger.info(`Found ${ways.length} versions of way ${wayId} (sorted by most recent)`);
            }
            this.showToast(`Found ${ways.length} way versions`, 'success');
            
        } catch (error) {
            if (window.logger) {
                window.logger.error(`Failed to fetch way history: ${error.message}`);
            }
            this.showToast('Failed to fetch way history', 'error');
        } finally {
            this.state.isLoading = false;
            this.updateUI();
        }
    }
    
    displayWayVersions() {
        const versionList = document.getElementById('version-list');
        versionList.innerHTML = '';
        
        this.state.wayVersions.forEach((way, index) => {
            const version = way.getAttribute('version');
            const changeset = way.getAttribute('changeset');
            const timestamp = way.getAttribute('timestamp');
            const user = way.getAttribute('user') || 'Unknown';
            
            const button = document.createElement('button');
            button.className = 'w-full text-left p-4 border border-gray-200 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors';
            
            const timestampDisplay = timestamp ? 
                new Date(timestamp).toLocaleString() : 'Unknown';
            
            // Add visual indicator for most recent version
            const isLatest = index === 0;
            const latestBadge = isLatest ? 
                '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 ml-2">Latest</span>' : '';
            
            button.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <div class="font-semibold">
                            Version ${version}${latestBadge}
                        </div>
                        <div class="text-sm text-gray-600">Changeset: ${changeset}</div>
                        <div class="text-sm text-gray-600">User: ${user}</div>
                    </div>
                    <div class="text-sm text-gray-500 text-right">
                        ${timestampDisplay}
                    </div>
                </div>
            `;
            
            button.addEventListener('click', () => {
                this.selectWayVersion(way, index);
            });
            
            versionList.appendChild(button);
        });
        
        document.getElementById('version-section').classList.remove('hidden');
        
        // Reset scroll position of the version list to top
        versionList.scrollTop = 0;
        
        // Don't auto-scroll to version section - let user scroll naturally
        // or they can scroll down to see the versions if needed
    }
    
    async selectWayVersion(wayElement, index) {
        this.state.selectedVersion = { element: wayElement, index };
        
        // Highlight selected version
        const versionButtons = document.querySelectorAll('#version-list button');
        versionButtons.forEach((btn, i) => {
            if (i === index) {
                btn.classList.add('bg-blue-50', 'border-blue-300');
            } else {
                btn.classList.remove('bg-blue-50', 'border-blue-300');
            }
        });
        
        const version = wayElement.getAttribute('version');
        if (window.logger) {
            window.logger.info(`Selected way version ${version}`);
        }
        
        // Reset coordinates before extracting new ones
        this.state.coordinates = [];
        document.getElementById('export-section').classList.add('hidden');
        
        await this.extractCoordinates(wayElement);
    }
    
    async extractCoordinates(wayElement) {
        const nodeRefs = Array.from(wayElement.querySelectorAll('nd')).map(nd => nd.getAttribute('ref'));
        const wayTimestamp = wayElement.getAttribute('timestamp');
        const version = wayElement.getAttribute('version');
        const wayId = this.state.wayId;
        
        if (nodeRefs.length === 0) {
            if (window.logger) {
                window.logger.warn('No node references found in way');
            }
            this.showToast('No nodes found in this way version', 'warning');
            return;
        }
        
        this.state.isLoading = true;
        this.updateUI();
        this.showProgress(true);
        
        try {
            if (window.logger) {
                window.logger.info(`Extracting coordinates from way ${wayId} v${version} (${wayTimestamp}) with ${nodeRefs.length} nodes`);
            }
            
            const coords = await window.osmApi.batchProcessNodes(nodeRefs, wayTimestamp, (progress) => {
                this.updateProgress(progress);
            });
            
            // Validate coordinates
            const validCoords = coords.filter(coord => {
                if (!coord) return false;
                const { lat, lon } = coord;
                const latNum = parseFloat(lat);
                const lonNum = parseFloat(lon);
                return !isNaN(latNum) && !isNaN(lonNum) && 
                       latNum >= -90 && latNum <= 90 && 
                       lonNum >= -180 && lonNum <= 180;
            });
            
            if (validCoords.length === 0) {
                throw new Error('No valid coordinates found');
            }
            
            this.state.coordinates = validCoords;
            this.state.originalCoordinates = [...validCoords]; // Store original
            
            if (window.logger) {
                const coordsInfo = validCoords.length !== nodeRefs.length ? 
                    ` (${validCoords.length} valid out of ${nodeRefs.length} nodes)` : '';
                window.logger.info(`Successfully extracted ${validCoords.length} coordinates for way ${wayId} v${version}${coordsInfo}`);
            }
            
            this.showToast(`Extracted ${validCoords.length} coordinates`, 'success');
            
            this.showMergerSection();
            this.showExportSection();
            
        } catch (error) {
            if (window.logger) {
                window.logger.error(`Failed to extract coordinates: ${error.message}`);
            }
            this.showToast('Failed to extract coordinates', 'error');
        } finally {
            this.state.isLoading = false;
            this.updateUI();
            this.showProgress(false);
        }
    }
    
    updateProgress(progress) {
        const { current, total, eta, complete } = progress;
        
        const progressBar = document.getElementById('progress-bar');
        const progressLabel = document.getElementById('progress-label');
        const progressETA = document.getElementById('progress-eta');
        const progressCurrent = document.getElementById('progress-current');
        const progressTotal = document.getElementById('progress-total');
        
        const percentage = total > 0 ? (current / total) * 100 : 0;
        
        progressBar.style.width = `${percentage}%`;
        progressCurrent.textContent = current;
        progressTotal.textContent = total;
        
        if (complete) {
            progressLabel.textContent = 'Complete!';
            progressETA.textContent = '';
        } else {
            progressLabel.textContent = `Processing node ${current + 1} of ${total}`;
            
            if (eta && eta > 0) {
                const minutes = Math.floor(eta / 60);
                const seconds = Math.floor(eta % 60);
                const etaText = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
                progressETA.textContent = `ETA: ${etaText}`;
            } else {
                progressETA.textContent = '';
            }
        }
    }
    
    showProgress(show) {
        const section = document.getElementById('progress-section');
        if (show) {
            section.classList.remove('hidden');
        } else {
            section.classList.add('hidden');
        }
    }
    
    showMergerSection() {
        const section = document.getElementById('merger-section');
        section.classList.remove('hidden');
    }
    
    showExportSection() {
        const section = document.getElementById('export-section');
        const coordCount = document.getElementById('coord-count');
        
        coordCount.textContent = this.state.coordinates.length;
        section.classList.remove('hidden');
    }
    
    async mergeAdditionalWays() {
        if (!this.state.originalCoordinates.length) {
            this.showToast('No base coordinates available for merging', 'error');
            return;
        }
        
        const additionalWaysInput = document.getElementById('additional-ways').value.trim();
        
        if (!additionalWaysInput) {
            this.showToast('Please enter additional way IDs to merge', 'error');
            return;
        }
        
        this.state.isMerging = true;
        this.updateUI();
        this.showProgress(true);
        
        try {
            // Validate way entries (now returns objects with wayId and version)
            const additionalWayEntries = window.wayMerger.validateWayIds(additionalWaysInput);
            
            if (window.logger) {
                window.logger.info(`Starting merge process with ${additionalWayEntries.length} additional way versions`);
            }
            
            // Get merge options
            const autoReverse = document.getElementById('auto-reverse').checked;
            const removeDuplicates = document.getElementById('remove-duplicates').checked;
            
            // Perform the merge
            const mergeResult = await window.wayMerger.mergeWays(
                this.state.originalCoordinates,
                additionalWayEntries,
                {
                    autoReverse,
                    removeDuplicates,
                    progressCallback: (progress) => {
                        this.updateMergeProgress(progress);
                    }
                }
            );
            
            // Validate merge result
            window.wayMerger.validateMergeResult(mergeResult);
            
            // Update state
            this.state.coordinates = mergeResult.coordinates;
            this.state.mergedWays = [this.state.wayId, ...additionalWayEntries.map(entry => entry.wayId)];
            
            // Update UI
            this.updateMergeInfo(mergeResult);
            this.showExportSection();
            
            if (window.logger) {
                window.logger.info(`Merge completed successfully: ${mergeResult.totalCoordinates} total coordinates`);
            }
            this.showToast(`Successfully merged ${mergeResult.totalWaysProcessed} ways`, 'success');
            
        } catch (error) {
            if (window.logger) {
                window.logger.error(`Failed to merge ways: ${error.message}`);
            }
            this.showToast('Failed to merge ways', 'error');
        } finally {
            this.state.isMerging = false;
            this.updateUI();
            this.showProgress(false);
        }
    }
    
    updateMergeProgress(progress) {
        const { phase, wayId, version, current, total, wayIndex, totalWays } = progress;
        
        let progressLabel = '';
        let percentage = 0;
        
        const versionText = version ? ` v${version}` : '';
        
        if (phase === 'fetching') {
            progressLabel = `Fetching way ${wayId}${versionText} (${wayIndex + 1}/${totalWays})`;
            percentage = totalWays > 0 ? ((wayIndex / totalWays) * 100) : 0;
        } else if (phase === 'processing_nodes') {
            progressLabel = `Processing nodes for way ${wayId}${versionText} (${current + 1}/${total})`;
            const wayProgress = total > 0 ? (current / total) : 0;
            const overallProgress = totalWays > 0 ? (wayIndex / totalWays) : 0;
            percentage = (overallProgress + (wayProgress / totalWays)) * 100;
        } else if (phase === 'merging') {
            progressLabel = `Merging way ${wayId}${versionText}`;
            percentage = totalWays > 0 ? (((wayIndex + 1) / totalWays) * 100) : 100;
        }
        
        const progressBar = document.getElementById('progress-bar');
        const progressLabelElement = document.getElementById('progress-label');
        
        progressBar.style.width = `${Math.min(percentage, 100)}%`;
        progressLabelElement.textContent = progressLabel;
    }
    
    updateMergeInfo(mergeResult) {
        const { totalWaysProcessed, totalCoordinates, totalConnections, totalDuplicatesRemoved, processedWays } = mergeResult;
        
        document.getElementById('merge-ways-count').textContent = totalWaysProcessed;
        document.getElementById('merge-coords-count').textContent = totalCoordinates;
        document.getElementById('merge-connections-count').textContent = totalConnections;
        document.getElementById('merge-duplicates-count').textContent = totalDuplicatesRemoved;
        
        // Update version information
        if (processedWays && processedWays.length > 0) {
            const versionsList = document.getElementById('merge-versions-list');
            versionsList.innerHTML = processedWays.map(way => {
                const timestampText = way.timestamp ? 
                    new Date(way.timestamp).toLocaleDateString() : 'Unknown date';
                return `• Way ${way.wayId} v${way.version} (${way.coordinateCount} coords, ${timestampText}, by ${way.user})`;
            }).join('<br>');
        }
        
        document.getElementById('merge-info').classList.remove('hidden');
    }
    
    resetToSingleWay() {
        if (!this.state.originalCoordinates.length) {
            this.showToast('No original coordinates to restore', 'warning');
            return;
        }
        
        // Restore original coordinates
        this.state.coordinates = [...this.state.originalCoordinates];
        this.state.mergedWays = [];
        
        // Reset merger UI
        document.getElementById('additional-ways').value = '';
        document.getElementById('merge-info').classList.add('hidden');
        
        // Update export section
        this.showExportSection();
        
        this.showToast('Reset to single way coordinates', 'success');
        
        if (window.logger) {
            window.logger.info('Reset to original single way coordinates');
        }
    }
    
    exportData(format) {
        if (this.state.coordinates.length === 0) {
            this.showToast('No coordinates to export', 'warning');
            return;
        }
        
        const { wayId, selectedVersion, coordinates, mergedWays } = this.state;
        const version = selectedVersion.element.getAttribute('version');
        
        // Create appropriate filename for merged ways
        const filename = mergedWays.length > 1 ? 
            `merged_ways_${mergedWays.join('_')}_v${version}` :
            `way_${wayId}_v${version}`;
        
        try {
            switch (format) {
                case 'gpx':
                    window.exporter.exportGPX(coordinates, filename.replace('way_', '').replace('merged_ways_', ''), version);
                    break;
                case 'kml':
                    window.exporter.exportKML(coordinates, filename.replace('way_', '').replace('merged_ways_', ''), version);
                    break;
                case 'geojson':
                    window.exporter.exportGeoJSON(coordinates, filename.replace('way_', '').replace('merged_ways_', ''), version);
                    break;
                case 'json':
                    window.exporter.exportJSON(coordinates, filename.replace('way_', '').replace('merged_ways_', ''), version);
                    break;
                default:
                    throw new Error(`Unknown format: ${format}`);
            }
            
            this.showToast(`Exported ${format.toUpperCase()} file`, 'success');
            
        } catch (error) {
            window.logger.error(`Failed to export ${format}: ${error.message}`);
            this.showToast(`Failed to export ${format.toUpperCase()}`, 'error');
        }
    }
    
    updateUI() {
        const fetchButton = document.getElementById('fetch-history');
        const wayIdInput = document.getElementById('way-id');
        const exportButtons = document.querySelectorAll('.export-btn');
        const mergeButton = document.getElementById('merge-ways');
        const resetButton = document.getElementById('reset-merger');
        const additionalWaysInput = document.getElementById('additional-ways');
        
        // Disable inputs when loading or merging
        const isDisabled = this.state.isLoading || this.state.isMerging;
        
        fetchButton.disabled = isDisabled;
        wayIdInput.disabled = isDisabled;
        mergeButton.disabled = isDisabled || !this.state.originalCoordinates.length;
        additionalWaysInput.disabled = isDisabled;
        
        resetButton.disabled = this.state.mergedWays.length === 0;
        
        exportButtons.forEach(btn => {
            btn.disabled = isDisabled || this.state.coordinates.length === 0;
        });
        
        // Update button text
        if (this.state.isLoading) {
            fetchButton.innerHTML = '<div class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>Loading...';
        } else {
            fetchButton.textContent = 'Fetch History';
        }
        
        if (this.state.isMerging) {
            mergeButton.innerHTML = '<div class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>Merging...';
        } else {
            mergeButton.innerHTML = '🔗 Merge Ways';
        }
    }
    
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        
        const bgColors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };
        
        toast.className = `${bgColors[type]} text-white px-6 py-3 rounded-md shadow-lg toast-enter`;
        toast.textContent = message;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        
        container.appendChild(toast);
        
        // Trigger enter animation
        requestAnimationFrame(() => {
            toast.classList.remove('toast-enter');
            toast.classList.add('toast-enter-active');
        });
        
        // Auto remove after duration
        setTimeout(() => {
            toast.classList.remove('toast-enter-active');
            toast.classList.add('toast-exit-active');
            
            setTimeout(() => {
                if (container.contains(toast)) {
                    container.removeChild(toast);
                }
            }, 300);
        }, CONFIG.ui.toastDuration);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new OSMHistoryApp();
});
