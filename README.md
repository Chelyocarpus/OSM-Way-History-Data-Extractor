# 🗺️ OSM Way History Data Extractor

A powerful web application for extracting and analyzing historical coordinate data from OpenStreetMap (OSM) ways. This tool allows you to fetch way versions, extract coordinates with temporal accuracy, merge multiple ways, and export data in various formats.

## ✨ Features

### 🔍 Core Functionality
- **Way History Extraction**: Fetch complete version history for any OSM way
- **Temporal Coordinate Matching**: Extract node coordinates that were current at specific way timestamps
- **Multi-Way Merging**: Combine multiple ways with intelligent connection detection
- **Multiple Export Formats**: Export data as GPX, KML, GeoJSON, or JSON

### 🚀 Performance & Reliability
- **Smart Caching**: IndexedDB-based caching with configurable expiry
- **Rate Limiting**: Respectful API usage with configurable delays
- **Batch Processing**: Efficient handling of large node datasets
- **Progress Tracking**: Real-time progress updates with ETA calculations
- **Error Handling**: Robust error handling with retry mechanisms

### 🎨 User Experience
- **Modern UI**: Clean, responsive interface built with Tailwind CSS
- **Accessibility**: WCAG-compliant design with proper ARIA labels
- **Mobile-Friendly**: Touch-optimized controls and responsive layout
- **Real-time Logging**: Configurable logging system with multiple levels
- **Toast Notifications**: User-friendly feedback for all operations

## 🛠️ Technical Architecture

### Core Components
- **`OSMApi`**: Handles all OpenStreetMap API interactions with caching and rate limiting
- **`WayMerger`**: Intelligent way merging with automatic connection detection
- **`Exporter`**: Multi-format data export with validation and sanitization
- **`Cache`**: IndexedDB-based caching system for API responses
- **`Logger`**: Configurable logging system with multiple output levels

### Security Features
- **Content Security Policy**: Strict CSP headers for XSS protection
- **Input Validation**: Comprehensive validation for all user inputs
- **URL Sanitization**: Secure handling of API endpoints
- **Safe Export**: Sanitized filenames and content for downloads

## 🚀 Getting Started

### Prerequisites
- Modern web browser with ES6+ support
- Internet connection for OSM API access

### Installation
1. **Clone or download** the repository
2. **Ensure file structure** is preserved (especially the `src/` and `assets/` directories)
3. **Open `index.html`** in your web browser
4. **Start extracting** OSM way history data!

No build process or server setup required - it's a pure client-side application with organized, modular architecture.

## 📖 Usage Guide

### Basic Way Extraction
1. **Enter a Way ID**: Input any valid OSM way ID (e.g., `12345678`)
2. **Fetch History**: Click "Fetch History" to retrieve all way versions
3. **Select Version**: Choose the specific version you want to analyze
4. **Extract Coordinates**: The app automatically extracts coordinates with temporal accuracy
5. **Export Data**: Choose from GPX, KML, GeoJSON, or JSON formats

### Advanced Way Merging
1. **Extract Base Way**: Start with a primary way as described above
2. **Add Additional Ways**: Enter comma-separated way IDs in the merger section
   - Format: `wayId` or `wayId:version` (e.g., `12345,67890:3,11111:latest`)
3. **Configure Options**:
   - **Auto-reverse**: Automatically reverse ways for better connections
   - **Remove duplicates**: Eliminate duplicate coordinate points
4. **Merge Ways**: Click "Merge Ways" to combine all ways intelligently
5. **Export Merged Data**: Export the combined coordinate set

### Configuration Options
- **Log Level**: Control verbosity (Error, Warning, Info, Debug)
- **Rate Limit**: Adjust API request delay (100-5000ms)
- **Cache Expiry**: Set cache duration (1-30 days)
- **Clear Cache**: Manual cache cleanup when needed

## 🔧 API Integration

### OpenStreetMap API
The application uses the official OSM API v0.6:
- **Base URL**: `https://api.openstreetmap.org/api/0.6`
- **Endpoints Used**:
  - `GET /way/{id}/history` - Fetch way version history
  - `GET /node/{id}/history` - Fetch node version history
  - `GET /node/{id}` - Fetch current node data

### Rate Limiting
- Default: 500ms between requests
- Configurable from 100ms to 5000ms
- Respectful usage to avoid API limits

## 📁 Project Structure

```
OSM-History-Extractor/
├── index.html              # Main application entry point
├── README.md               # Project documentation
├── src/                    # Source code
│   ├── config.js          # Application configuration and constants
│   ├── core/              # Core application modules
│   │   ├── app.js         # Main application logic and UI management
│   │   ├── api.js         # OSM API client with caching and error handling
│   │   └── way-merger.js  # Intelligent way merging algorithms
│   └── utils/             # Utility modules
│       ├── cache.js       # IndexedDB caching system
│       ├── exports.js     # Multi-format data export functionality
│       └── logger.js      # Configurable logging system
├── assets/                # Static assets
│   ├── css/              # Stylesheets
│   │   └── styles.css    # Custom styles and animations
│   ├── favicon.svg       # Application favicon (SVG format)
│   └── manifest.json     # Web app manifest for mobile/PWA support
└── docs/                 # Documentation
    ├── API.md           # API documentation
    └── DEVELOPMENT.md   # Development guide
```

### Core Architecture

- **`src/core/`**: Core application functionality
  - **Application Controller**: Main UI and business logic
  - **API Client**: Robust OSM API integration
  - **Way Merger**: Advanced merging algorithms

- **`src/utils/`**: Reusable utility modules
  - **Caching System**: Performance optimization
  - **Export Engine**: Multi-format data conversion
  - **Logging Framework**: Debugging and monitoring

- **`assets/`**: Static resources
  - **CSS**: Styling and responsive design

- **`docs/`**: Comprehensive documentation
  - **API Reference**: Detailed method documentation
  - **Development Guide**: Setup and contribution guidelines

## 🎯 Key Features Explained

### Temporal Coordinate Accuracy
The application doesn't just fetch current coordinates - it finds the coordinates that were valid at the time each way version was created. This ensures historical accuracy when analyzing way evolution.

### Intelligent Way Merging
- **Connection Detection**: Automatically finds connection points between ways
- **Path Optimization**: Optimizes the order and direction of merged ways
- **Duplicate Removal**: Eliminates overlapping coordinates
- **Validation**: Ensures merged paths maintain logical continuity

### Robust Caching
- **IndexedDB Storage**: Persistent browser storage for API responses
- **Smart Expiry**: Configurable cache duration with automatic cleanup
- **Size Management**: Prevents excessive storage usage
- **Cache Statistics**: Monitor cache performance and usage

### 🗂️ Archival and Historical Reconstruction

This tool is especially useful for **archival research** and **historical mapping**:

- **Export Historical Coordinates**: Retrieve and export the precise coordinates of a way or track as they existed at any point in time (in OSM).
- **Recreate Demolished Features**: Import exported data into your preferred OSM editor to redraw historical ways or tracks, and clearly mark them as demolished or removed.

## 🔒 Security & Privacy

- **Client-Side Only**: No data sent to external servers (except OSM API)
- **Secure Headers**: Comprehensive security headers including CSP
- **Input Sanitization**: All user inputs are validated and sanitized
- **No Tracking**: No analytics or tracking code included

## 🌐 Browser Compatibility

- **Chrome/Chromium**: Full support (recommended)
- **Firefox**: Full support
- **Safari**: Full support (iOS 12.2+)
- **Edge**: Full support

Requires modern browser with:
- ES6+ JavaScript support
- IndexedDB support
- Fetch API support
- CSS Grid support

## 🤝 Contributing

Contributions are welcome! The codebase follows modern JavaScript practices:

- **Modular Architecture**: Clear separation of concerns
- **ES6+ Features**: Modern JavaScript throughout
- **Error Handling**: Comprehensive error handling
- **Documentation**: Well-documented code with JSDoc-style comments
- **Security Focus**: Security-first development approach

## 📄 License

This project is open source. Feel free to use, modify, and distribute according to your needs.

## 🙏 Acknowledgments

- **OpenStreetMap**: For providing the amazing OSM API and data
- **Tailwind CSS**: For the beautiful UI framework
- **OSM Community**: For creating and maintaining the world's map

## 📞 Support & Documentation

### 📚 Documentation
- **[API Reference](docs/API.md)**: Detailed documentation of all classes and methods
- **[Development Guide](docs/DEVELOPMENT.md)**: Setup instructions and contribution guidelines
- **Built-in Logging**: The application provides detailed logging information about operations and errors

### 🐛 Troubleshooting
For issues, questions, or feature requests:
1. **Check the logs**: Enable debug logging in the configuration panel
2. **Review documentation**: Consult the API reference and development guide
3. **Verify browser compatibility**: Ensure your browser supports required features

### 💡 Feature Requests
This project welcomes contributions and feature suggestions. Please refer to the development guide for contribution guidelines.

---

**Made with ❤️ for the OpenStreetMap community**
