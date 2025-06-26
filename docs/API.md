# API Documentation

## OSMApi Class

The `OSMApi` class handles all interactions with the OpenStreetMap API v0.6.

### Constructor

```javascript
new OSMApi(config = {})
```

**Parameters:**
- `config` (Object): Configuration options
  - `baseUrl` (string): OSM API base URL (default: 'https://api.openstreetmap.org/api/0.6')
  - `timeout` (number): Request timeout in milliseconds (default: 30000)
  - `maxRetries` (number): Maximum retry attempts (default: 3)
  - `retryDelay` (number): Delay between retries in milliseconds (default: 1000)
  - `rateLimit` (number): Minimum delay between requests in milliseconds (default: 500)

### Methods

#### `getWayHistory(wayId)`
Fetches the complete version history for a way.

**Parameters:**
- `wayId` (string): The OSM way ID

**Returns:** Promise<Array<Element>> - Array of way XML elements sorted by version

#### `getNodeHistory(nodeId)`
Fetches the complete version history for a node.

**Parameters:**
- `nodeId` (string): The OSM node ID

**Returns:** Promise<Array<Element>|null> - Array of node XML elements or null if deleted

#### `getNodeCoordinate(nodeId, wayTimestamp)`
Extracts coordinates for a node at a specific timestamp.

**Parameters:**
- `nodeId` (string): The OSM node ID
- `wayTimestamp` (string): ISO timestamp to find the correct node version

**Returns:** Promise<Object|null> - Coordinate object with lat, lon, nodeId, version, timestamp

#### `batchProcessNodes(nodeIds, wayTimestamp, progressCallback)`
Efficiently processes multiple nodes with progress tracking.

**Parameters:**
- `nodeIds` (Array<string>): Array of node IDs to process
- `wayTimestamp` (string): Timestamp for coordinate extraction
- `progressCallback` (Function): Progress update callback

**Returns:** Promise<Array<Object>> - Array of coordinate objects

## WayMerger Class

The `WayMerger` class handles intelligent merging of multiple ways.

### Methods

#### `validateWayIds(wayIdsInput)`
Validates and parses way ID input string.

**Parameters:**
- `wayIdsInput` (string): Comma-separated way IDs with optional versions

**Returns:** Array<Object> - Parsed way entries with wayId and version

#### `mergeWays(baseCoordinates, additionalWayEntries, options)`
Merges multiple ways into a single coordinate array.

**Parameters:**
- `baseCoordinates` (Array): Base way coordinates
- `additionalWayEntries` (Array): Additional ways to merge
- `options` (Object): Merge options (autoReverse, removeDuplicates, progressCallback)

**Returns:** Promise<Object> - Merge result with coordinates and statistics

## Exporter Class

The `Exporter` class handles data export in multiple formats.

### Methods

#### `exportGPX(coords, wayId, version)`
Exports coordinates as GPX file.

#### `exportKML(coords, wayId, version)`
Exports coordinates as KML file.

#### `exportGeoJSON(coords, wayId, version)`
Exports coordinates as GeoJSON file.

#### `exportJSON(coords, wayId, version)`
Exports coordinates as JSON file.

## Cache Class

The `Cache` class provides IndexedDB-based caching for API responses.

### Methods

#### `get(url)`
Retrieves cached data for a URL.

#### `set(url, data)`
Stores data in cache for a URL.

#### `clear()`
Clears all cached data.

## Logger Class

The `Logger` class provides configurable logging functionality.

### Methods

#### `setLevel(level)`
Sets the logging level ('debug', 'info', 'warn', 'error').

#### `log(level, message, data)`
Logs a message with optional data.
