class WayMerger {
    constructor() {
        this.tolerance = 0.0001; // Coordinate matching tolerance (~10 meters)
    }
    
    log(level, message, data = null) {
        if (window.logger && typeof window.logger.log === 'function') {
            window.logger.log(level, message, data);
        } else {
            console[level] || console.log(`[${level.toUpperCase()}] ${message}`, data || '');
        }
    }
    
    validateWayIds(wayIdsInput) {
        if (!wayIdsInput || typeof wayIdsInput !== 'string') {
            throw new Error('Way IDs input must be a string');
        }
        
        const wayEntries = wayIdsInput
            .split(',')
            .map(entry => entry.trim())
            .filter(entry => entry.length > 0);
        
        if (wayEntries.length === 0) {
            throw new Error('No valid way entries provided');
        }
        
        const validWayEntries = [];
        const wayIdPattern = /^[1-9]\d{0,18}$/;
        const versionPattern = /^([1-9]\d{0,18})(?::(\d+|latest))?$/;
        
        for (const entry of wayEntries) {
            const cleanEntry = entry.replace(/^#+/, '');
            const match = cleanEntry.match(versionPattern);
            
            if (!match) {
                throw new Error(`Invalid way entry format: ${entry}. Use format: wayId or wayId:version`);
            }
            
            const [, wayId, version] = match;
            
            if (!wayIdPattern.test(wayId)) {
                throw new Error(`Invalid way ID: ${wayId}`);
            }
            
            const numWayId = parseInt(wayId, 10);
            if (numWayId > Number.MAX_SAFE_INTEGER) {
                throw new Error(`Way ID too large: ${wayId}`);
            }
            
            // Validate version if specified
            let parsedVersion = null;
            if (version) {
                if (version === 'latest') {
                    parsedVersion = 'latest';
                } else {
                    const numVersion = parseInt(version, 10);
                    if (isNaN(numVersion) || numVersion < 1) {
                        throw new Error(`Invalid version: ${version}. Must be a positive integer or 'latest'`);
                    }
                    parsedVersion = numVersion;
                }
            } else {
                parsedVersion = 'latest'; // Default to latest if not specified
            }
            
            validWayEntries.push({ wayId, version: parsedVersion });
        }
        
        // Remove duplicates based on wayId and version combination
        const uniqueEntries = [];
        const seen = new Set();
        
        for (const entry of validWayEntries) {
            const key = `${entry.wayId}:${entry.version}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueEntries.push(entry);
            }
        }
        
        return uniqueEntries;
    }
    
    async fetchWayCoordinates(wayEntry, progressCallback) {
        const { wayId, version } = wayEntry;
        
        try {
            this.log('info', `Fetching coordinates for way ${wayId}, version ${version}`);
            
            // Get the way history
            const ways = await window.osmApi.getWayHistory(wayId);
            if (ways.length === 0) {
                throw new Error(`No versions found for way ${wayId}`);
            }
            
            // Select the appropriate version
            let selectedWay;
            if (version === 'latest') {
                // Sort by version number and get the highest
                ways.sort((a, b) => {
                    const versionA = parseInt(a.getAttribute('version') || '0');
                    const versionB = parseInt(b.getAttribute('version') || '0');
                    return versionB - versionA;
                });
                selectedWay = ways[0];
            } else {
                // Find the specific version
                selectedWay = ways.find(way => 
                    parseInt(way.getAttribute('version') || '0') === version
                );
                
                if (!selectedWay) {
                    throw new Error(`Version ${version} not found for way ${wayId}`);
                }
            }
            
            const actualVersion = selectedWay.getAttribute('version');
            const wayTimestamp = selectedWay.getAttribute('timestamp');
            const nodeRefs = Array.from(selectedWay.querySelectorAll('nd')).map(nd => nd.getAttribute('ref'));
            
            if (nodeRefs.length === 0) {
                throw new Error(`No nodes found in way ${wayId} version ${actualVersion}`);
            }
            
            this.log('info', `Way ${wayId} v${actualVersion} from ${wayTimestamp} has ${nodeRefs.length} node references`);
            
            // Fetch coordinates with proper version handling
            const coords = await window.osmApi.batchProcessNodes(nodeRefs, wayTimestamp, progressCallback);
            
            // Filter out null coordinates and validate
            const validCoords = coords.filter(coord => {
                if (!coord) {
                    return false;
                }
                
                const { lat, lon } = coord;
                const latNum = parseFloat(lat);
                const lonNum = parseFloat(lon);
                
                return !isNaN(latNum) && !isNaN(lonNum) && 
                       latNum >= -90 && latNum <= 90 && 
                       lonNum >= -180 && lonNum <= 180;
            });
            
            if (validCoords.length === 0) {
                throw new Error(`No valid coordinates found for way ${wayId} version ${actualVersion}`);
            }
            
            if (validCoords.length !== nodeRefs.length) {
                this.log('warn', `Retrieved ${validCoords.length} valid coordinates out of ${nodeRefs.length} nodes for way ${wayId} v${actualVersion}`);
            }
            
            this.log('info', `Successfully retrieved ${validCoords.length} coordinates for way ${wayId} version ${actualVersion}`);
            
            return { 
                coordinates: validCoords, 
                wayId, 
                version: actualVersion,
                timestamp: wayTimestamp,
                changeset: selectedWay.getAttribute('changeset'),
                user: selectedWay.getAttribute('user') || 'Unknown',
                nodeCount: nodeRefs.length,
                validNodeCount: validCoords.length
            };
            
        } catch (error) {
            this.log('error', `Failed to fetch coordinates for way ${wayId} version ${version}: ${error.message}`);
            throw error;
        }
    }
    
    calculateDistance(coord1, coord2) {
        const { lat: lat1, lon: lon1 } = coord1;
        const { lat: lat2, lon: lon2 } = coord2;
        
        return Math.sqrt(
            Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2)
        );
    }
    
    areCoordinatesEqual(coord1, coord2, tolerance = this.tolerance) {
        return this.calculateDistance(coord1, coord2) < tolerance;
    }
    
    findBestConnection(way1Coords, way2Coords) {
        const connections = [
            { way1End: 'start', way2End: 'start', distance: this.calculateDistance(way1Coords[0], way2Coords[0]) },
            { way1End: 'start', way2End: 'end', distance: this.calculateDistance(way1Coords[0], way2Coords[way2Coords.length - 1]) },
            { way1End: 'end', way2End: 'start', distance: this.calculateDistance(way1Coords[way1Coords.length - 1], way2Coords[0]) },
            { way1End: 'end', way2End: 'end', distance: this.calculateDistance(way1Coords[way1Coords.length - 1], way2Coords[way2Coords.length - 1]) }
        ];
        
        return connections.reduce((best, current) => 
            current.distance < best.distance ? current : best
        );
    }
    
    reverseCoordinates(coords) {
        return [...coords].reverse();
    }
    
    removeDuplicateCoordinates(coords, tolerance = this.tolerance) {
        if (coords.length <= 1) {
            return coords;
        }
        
        const filtered = [coords[0]];
        let duplicatesCount = 0;
        
        for (let i = 1; i < coords.length; i++) {
            const isDuplicate = this.areCoordinatesEqual(coords[i], filtered[filtered.length - 1], tolerance);
            
            if (!isDuplicate) {
                filtered.push(coords[i]);
            } else {
                duplicatesCount++;
            }
        }
        
        this.log('debug', `Removed ${duplicatesCount} duplicate coordinates`);
        return { coords: filtered, duplicatesRemoved: duplicatesCount };
    }
    
    async mergeWays(baseCoords, additionalWayEntries, options = {}) {
        const {
            autoReverse = true,
            removeDuplicates = true,
            progressCallback = null
        } = options;
        
        let mergedCoords = [...baseCoords];
        let totalConnections = 0;
        let totalDuplicatesRemoved = 0;
        let totalWaysProcessed = 1; // Base way counts as 1
        const processedWays = []; // Track processed way details
        
        this.log('info', `Starting merge process with ${additionalWayEntries.length} additional ways`);
        
        for (let i = 0; i < additionalWayEntries.length; i++) {
            const wayEntry = additionalWayEntries[i];
            const { wayId, version } = wayEntry;
            
            if (progressCallback) {
                progressCallback({
                    current: i,
                    total: additionalWayEntries.length,
                    wayId,
                    version,
                    phase: 'fetching'
                });
            }
            
            try {
                // Fetch coordinates for this way version
                const wayResult = await this.fetchWayCoordinates(wayEntry, (nodeProgress) => {
                    if (progressCallback) {
                        progressCallback({
                            ...nodeProgress,
                            wayId,
                            version,
                            phase: 'processing_nodes',
                            wayIndex: i,
                            totalWays: additionalWayEntries.length
                        });
                    }
                });
                
                const { coordinates: wayCoords, version: actualVersion, timestamp, changeset, user } = wayResult;
                
                if (wayCoords.length === 0) {
                    this.log('warn', `Skipping way ${wayId} version ${actualVersion} - no coordinates found`);
                    continue;
                }
                
                totalWaysProcessed++;
                processedWays.push({
                    wayId,
                    version: actualVersion,
                    timestamp,
                    changeset,
                    user,
                    coordinateCount: wayCoords.length
                });
                
                // Find the best connection point
                const connection = this.findBestConnection(mergedCoords, wayCoords);
                
                if (progressCallback) {
                    progressCallback({
                        current: i,
                        total: additionalWayEntries.length,
                        wayId,
                        version: actualVersion,
                        phase: 'merging',
                        connectionDistance: connection.distance
                    });
                }
                
                // Log connection info
                this.log('debug', `Best connection for way ${wayId} v${actualVersion}: ${connection.way1End} to ${connection.way2End}, distance: ${connection.distance.toFixed(6)}`);
                
                let coordsToAdd = [...wayCoords];
                
                // Apply auto-reverse if enabled and beneficial
                if (autoReverse) {
                    if (connection.way2End === 'end') {
                        coordsToAdd = this.reverseCoordinates(coordsToAdd);
                        this.log('debug', `Reversed coordinates for way ${wayId} v${actualVersion} for better connection`);
                    }
                }
                
                // Merge the coordinates
                if (connection.way1End === 'end') {
                    // Remove first coordinate of new way if it's very close to last coordinate of merged way
                    if (coordsToAdd.length > 0 && 
                        this.areCoordinatesEqual(mergedCoords[mergedCoords.length - 1], coordsToAdd[0])) {
                        coordsToAdd = coordsToAdd.slice(1);
                        totalDuplicatesRemoved++;
                    }
                    mergedCoords = mergedCoords.concat(coordsToAdd);
                } else {
                    // Insert at beginning
                    if (coordsToAdd.length > 0 && 
                        this.areCoordinatesEqual(coordsToAdd[coordsToAdd.length - 1], mergedCoords[0])) {
                        coordsToAdd = coordsToAdd.slice(0, -1);
                        totalDuplicatesRemoved++;
                    }
                    mergedCoords = coordsToAdd.concat(mergedCoords);
                }
                
                totalConnections++;
                this.log('info', `Successfully merged way ${wayId} v${actualVersion} (${wayCoords.length} coordinates)`);
                
            } catch (error) {
                this.log('error', `Failed to merge way ${wayId} version ${version}: ${error.message}`);
                // Continue with other ways
            }
        }
        
        // Remove duplicates if requested
        if (removeDuplicates && mergedCoords.length > 1) {
            const result = this.removeDuplicateCoordinates(mergedCoords);
            mergedCoords = result.coords;
            totalDuplicatesRemoved += result.duplicatesRemoved;
        }
        
        const summary = {
            totalWaysProcessed,
            totalCoordinates: mergedCoords.length,
            totalConnections,
            totalDuplicatesRemoved,
            coordinates: mergedCoords,
            processedWays
        };
        
        this.log('info', `Merge completed: ${totalWaysProcessed} ways, ${mergedCoords.length} total coordinates, ${totalConnections} connections, ${totalDuplicatesRemoved} duplicates removed`);
        
        return summary;
    }
    
    validateMergeResult(mergeResult) {
        const { coordinates, totalWaysProcessed, totalConnections } = mergeResult;
        
        if (!Array.isArray(coordinates) || coordinates.length === 0) {
            throw new Error('Merge resulted in no coordinates');
        }
        
        // Check for valid coordinates
        const invalidCoords = coordinates.filter(coord => {
            const { lat, lon } = coord;
            const latNum = parseFloat(lat);
            const lonNum = parseFloat(lon);
            return isNaN(latNum) || isNaN(lonNum) || 
                   latNum < -90 || latNum > 90 || 
                   lonNum < -180 || lonNum > 180;
        });
        
        if (invalidCoords.length > 0) {
            throw new Error(`Found ${invalidCoords.length} invalid coordinates after merge`);
        }
        
        this.log('info', `Merge validation passed: ${coordinates.length} valid coordinates`);
        return true;
    }
}

// Create global way merger instance
if (typeof window !== 'undefined') {
    window.WayMerger = WayMerger;
    
    // Mark way merger as loaded
    if (window.APP_STATE) {
        window.APP_STATE.dependencies.wayMerger = true;
    }
}
