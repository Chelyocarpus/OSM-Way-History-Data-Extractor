# Development Guide

## Project Structure

The project follows a modular architecture with clear separation of concerns:

```
OSM-History-Extractor/
├── index.html              # Main application entry point
├── README.md               # Project documentation
├── src/                    # Source code
│   ├── config.js          # Application configuration
│   ├── core/              # Core application modules
│   │   ├── app.js         # Main application logic and UI
│   │   ├── api.js         # OSM API client
│   │   └── way-merger.js  # Way merging algorithms
│   └── utils/             # Utility modules
│       ├── cache.js       # Caching system
│       ├── exports.js     # Data export functionality
│       └── logger.js      # Logging system
├── assets/                # Static assets
│   └── css/              # Stylesheets
│       └── styles.css    # Custom styles
└── docs/                 # Documentation
    ├── API.md           # API documentation
    └── DEVELOPMENT.md   # This file
```

## Core Modules

### src/core/app.js
- Main application controller
- UI management and event handling
- State management
- Progress tracking

### src/core/api.js
- OSM API client with error handling
- Request caching and rate limiting
- Input validation and sanitization
- Temporal coordinate extraction

### src/core/way-merger.js
- Intelligent way merging algorithms
- Connection detection and optimization
- Coordinate validation and deduplication

## Utility Modules

### src/utils/cache.js
- IndexedDB-based caching system
- Automatic cache expiry
- Storage size management

### src/utils/exports.js
- Multi-format data export (GPX, KML, GeoJSON, JSON)
- Data validation and sanitization
- Secure file downloads

### src/utils/logger.js
- Configurable logging levels
- Browser console and UI output
- Message formatting and filtering

## Development Setup

1. **Clone the repository**
2. **Open index.html in a modern browser**
3. **Start developing!**

No build process or dependencies required - this is a pure client-side application.

## Code Style Guidelines

### JavaScript
- Use ES6+ features (classes, arrow functions, destructuring)
- Follow camelCase naming convention
- Include comprehensive error handling
- Add JSDoc comments for public methods
- Use async/await for asynchronous operations

### HTML
- Semantic HTML5 elements
- ARIA labels for accessibility
- Responsive design with Tailwind CSS

### CSS
- Utility-first approach with Tailwind
- Custom styles in assets/css/styles.css
- Mobile-first responsive design

## Security Considerations

- **Content Security Policy**: Strict CSP headers in HTML
- **Input Validation**: All user inputs validated and sanitized
- **XSS Prevention**: Proper escaping and sanitization
- **HTTPS Only**: Only secure connections to OSM API

## Testing

The application includes built-in error handling and logging for debugging:

1. **Enable Debug Logging**: Set log level to "Debug" in configuration
2. **Monitor Network**: Check browser dev tools for API requests
3. **Validate Exports**: Test exported files in mapping software

## Performance Optimization

- **Caching**: Aggressive caching of API responses
- **Rate Limiting**: Respectful API usage
- **Batch Processing**: Efficient handling of large datasets
- **Progress Tracking**: Real-time feedback for long operations

## Contributing

1. **Follow existing code patterns**
2. **Test thoroughly across browsers**
3. **Update documentation for new features**
4. **Ensure accessibility compliance**
5. **Maintain security best practices**

## Browser Support

- Chrome/Chromium 70+
- Firefox 65+
- Safari 12.2+
- Edge 79+

Required features:
- ES6+ JavaScript
- IndexedDB
- Fetch API
- CSS Grid
