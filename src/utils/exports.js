class Exporter {
    constructor(config = {}) {
        this.config = {
            gpx: {
                version: '1.1',
                creator: 'OSM-history-extractor'
            },
            kml: {
                version: '2.2'
            },
            ...config
        };
    }
    
    validateCoordinates(coords) {
        if (!Array.isArray(coords)) {
            throw new Error('Invalid coordinates: must be an array');
        }
        
        return coords.filter(coord => {
            if (!coord || typeof coord !== 'object') {
                return false;
            }
            
            const { lat, lon } = coord;
            const latNum = parseFloat(lat);
            const lonNum = parseFloat(lon);
            
            // Validate latitude and longitude ranges
            if (isNaN(latNum) || isNaN(lonNum) || 
                latNum < -90 || latNum > 90 || 
                lonNum < -180 || lonNum > 180) {
                logger.warn(`Invalid coordinate: lat=${lat}, lon=${lon}`);
                return false;
            }
            
            return true;
        });
    }
    
    sanitizeName(name) {
        if (!name || typeof name !== 'string') {
            return 'OSM Way';
        }
        
        // Remove potential XSS characters and limit length
        return name
            .replace(/[<>&"']/g, '')
            .substring(0, 100)
            .trim() || 'OSM Way';
    }
    
    coordsToGPX(coords, name = "OSM Way") {
        const validCoords = this.validateCoordinates(coords);
        const safeName = this.sanitizeName(name);
        const { version, creator } = this.config.gpx;
        
        if (validCoords.length === 0) {
            throw new Error('No valid coordinates to export');
        }
        
        const header = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="${version}" creator="${this.escapeXml(creator)}" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${this.escapeXml(safeName)}</name>
    <trkseg>`;
        
        const footer = `    </trkseg>
  </trk>
</gpx>`;
        
        const points = validCoords.map(({ lat, lon }) => 
            `      <trkpt lat="${parseFloat(lat).toFixed(7)}" lon="${parseFloat(lon).toFixed(7)}"></trkpt>`
        ).join('\n');
        
        return header + '\n' + points + '\n' + footer;
    }
    
    coordsToKML(coords, name = "OSM Way") {
        const validCoords = this.validateCoordinates(coords);
        const safeName = this.sanitizeName(name);
        
        if (validCoords.length === 0) {
            throw new Error('No valid coordinates to export');
        }
        
        const header = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${this.escapeXml(safeName)}</name>
    <Placemark>
      <LineString>
        <coordinates>`;
        
        const footer = `        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;
        
        const coordinates = validCoords.map(({ lat, lon }) => 
            `${parseFloat(lon).toFixed(7)},${parseFloat(lat).toFixed(7)}`
        ).join('\n          ');
        
        return header + '\n          ' + coordinates + '\n' + footer;
    }
    
    coordsToGeoJSON(coords, name = "OSM Way") {
        const validCoords = this.validateCoordinates(coords);
        const safeName = this.sanitizeName(name);
        
        if (validCoords.length === 0) {
            throw new Error('No valid coordinates to export');
        }
        
        const geojson = {
            type: "FeatureCollection",
            features: [{
                type: "Feature",
                properties: { name: safeName },
                geometry: {
                    type: "LineString",
                    coordinates: validCoords.map(({ lat, lon }) => [
                        parseFloat(lon), 
                        parseFloat(lat)
                    ])
                }
            }]
        };
        
        return JSON.stringify(geojson, null, 2);
    }
    
    coordsToJSON(coords) {
        const validCoords = this.validateCoordinates(coords);
        
        if (validCoords.length === 0) {
            throw new Error('No valid coordinates to export');
        }
        
        return JSON.stringify(validCoords, null, 2);
    }
    
    escapeXml(text) {
        if (!text || typeof text !== 'string') {
            return '';
        }
        
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
    
    validateFilename(filename) {
        // Remove potentially dangerous characters
        return filename
            .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
            .substring(0, 100)
            .trim();
    }
    
    downloadFile(content, filename, mimeType = 'text/plain') {
        const safeFilename = this.validateFilename(filename);
        
        if (!safeFilename) {
            throw new Error('Invalid filename');
        }
        
        try {
            const blob = new Blob([content], { type: mimeType });
            
            // Check blob size (limit to 50MB)
            if (blob.size > 50 * 1024 * 1024) {
                throw new Error('File too large (max 50MB)');
            }
            
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = safeFilename;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the URL object
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            logger.info(`Downloaded ${safeFilename}`);
            
        } catch (error) {
            logger.error(`Failed to download file: ${error.message}`);
            throw error;
        }
    }
    
    exportGPX(coords, wayId, version) {
        const content = this.coordsToGPX(coords, `Way ${wayId} v${version}`);
        const filename = `way_${wayId}_v${version}.gpx`;
        this.downloadFile(content, filename, 'application/gpx+xml');
    }
    
    exportKML(coords, wayId, version) {
        const content = this.coordsToKML(coords, `Way ${wayId} v${version}`);
        const filename = `way_${wayId}_v${version}.kml`;
        this.downloadFile(content, filename, 'application/vnd.google-earth.kml+xml');
    }
    
    exportGeoJSON(coords, wayId, version) {
        const content = this.coordsToGeoJSON(coords, `Way ${wayId} v${version}`);
        const filename = `way_${wayId}_v${version}.geojson`;
        this.downloadFile(content, filename, 'application/geo+json');
    }
    
    exportJSON(coords, wayId, version) {
        const content = this.coordsToJSON(coords);
        const filename = `way_${wayId}_v${version}.json`;
        this.downloadFile(content, filename, 'application/json');
    }
}

// Create global exporter instance
const exporter = new Exporter(CONFIG.exports);

// Mark exports as loaded
if (window.APP_STATE) {
    window.APP_STATE.dependencies.exports = true;
}
