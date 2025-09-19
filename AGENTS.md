# Bookmarklet Collection & Build System

## Overview
A 2-tiered system for creating and deploying JavaScript bookmarklets. The system includes a compiler that converts JavaScript files into drag-and-drop installation webpages, plus a collection of useful bookmarklet scripts for various web automation tasks.

## System Architecture

### Tier 1: Compiler (js-to-bookmarklet)
The build pipeline that transforms JavaScript into deployable bookmarklets:

- **Input**: JavaScript source files with bookmarklet logic
- **Processing**: Minification, URL encoding, HTML generation
- **Output**: Interactive webpage with drag-and-drop bookmarklet installation

### Tier 2: Bookmarklet Collection
A curated set of JavaScript files, each implementing specific web automation functionality:

- **Domain-specific scripts**: Google Docs, web scraping, clipboard utilities
- **Cross-platform compatibility**: Modern browser support
- **Rich interaction**: Clipboard APIs, notifications, DOM manipulation
- **Error handling**: Graceful degradation and user feedback

## Core Library (lib.js)

The shared library provides common functionality across all bookmarklets:

### NotificationSystem Class
Unified user feedback with professional styling:
- `showSuccess()`, `showError()`, `showWarning()`: Contextual notifications
- `show()`: Generic notification with animated slide-in/out and auto-cleanup
- CSS injection for consistent cross-site styling

### Clipboard Utilities
Modern clipboard operations:
- **Modern API**: `navigator.clipboard.write()` with `ClipboardItem` support
- **Rich Text**: HTML formatting for platforms like Slack
- **Error Handling**: Clear messaging for unsupported browsers

### DOM Helpers
Common DOM manipulation and detection:
- Page validation utilities
- Element selection and content extraction
- Focus management and event handling

### Data Structures
Reusable classes for common bookmarklet patterns:
- Link formatting and clipboard integration
- Duplicate detection and caching
- Content transformation pipelines

## Build Pipeline (bin/js-to-bookmarklet)

### Processing Steps
1. **Input Validation**: Check for JavaScript source and required tools
2. **Library Integration**: Automatically include lib.js for shared functionality
3. **Minification**: Use terser for optimal compression with fallbacks
4. **Encoding**: URL encode for `javascript:` protocol compatibility
5. **HTML Generation**: Create drag-and-drop installation webpage
6. **Browser Launch**: Auto-open with bookmarklet ready for installation

### Features
- **Multi-platform Minification**: Prefers terser, graceful fallbacks to uglifyjs/node
- **Size Optimization**: Warns about browser limits and provides compression stats
- **Cross-platform Browser Detection**: Chrome/Chromium/Safari across macOS/Linux/Windows
- **Professional Installation UX**: Beautiful HTML page with clear instructions
- **Customizable Naming**: Environment variables for bookmarklet titles and descriptions

## Development Workflow

### Creating New Bookmarklets
1. **Write JavaScript**: Focus on core functionality, leverage lib.js for common tasks
2. **Test Locally**: Verify functionality in target browser environments
3. **Compile**: Use `bin/js-to-bookmarklet <script-name>` to generate installation page
4. **Deploy**: Drag from generated webpage to browser bookmarks bar
5. **Distribute**: Share HTML installation page for easy user adoption

### Library Usage Patterns
```javascript
// Import shared functionality
const notifications = new NotificationSystem();
const clipboardUtils = new ClipboardUtilities();

// Use common patterns
if (!validatePageContext()) {
    notifications.showError('Invalid page context');
    return;
}

// Leverage clipboard utilities
await clipboardUtils.copyRichText(content, fallback);
notifications.showSuccess('Copied to clipboard');
```

## Technical Specifications

### Bookmarklet Structure
```javascript
// Standard bookmarklet pattern:
(function() {
    // Include lib.js functionality automatically
    // Implement specific bookmarklet logic
    // Handle errors gracefully with notifications
    // Provide user feedback on completion
})();
```

### Clipboard API Handling (lib.js)
- **Modern Only**: `navigator.clipboard.write()` with `ClipboardItem`
- **Rich Text**: HTML formatting for platforms like Slack, Teams, etc.
- **Error Handling**: Clear error messages for unsupported browsers

### Build Script Features
```bash
# Input: JavaScript file
# Output: Interactive installation webpage

# Capabilities:
- Multi-platform minification (terser > uglifyjs > node > basic)
- URL encoding for javascript: protocol
- Size optimization with browser limit warnings
- Cross-platform browser detection and launch
- Professional HTML installation pages
- Customizable titles and descriptions
```

### Installation Page Components
- **Visual Design**: Clean, professional styling with intuitive icons
- **Drag-and-Drop**: One-click bookmark installation
- **Information Display**: File size, compression stats, usage instructions
- **Responsive Layout**: Works on desktop and mobile browsers

## File Structure
```
/
├── lib.js                  # Shared utility library
├── bookmarklets/
│   ├── gdocs-slack.js      # Google Docs to Slack links
│   ├── scraper.js          # Web content extraction
│   └── ...                 # Additional bookmarklet scripts
├── bin/js-to-bookmarklet   # Build and deployment script
└── AGENTS.md              # This architecture document
```

## Usage Examples

### Basic Development
```bash
# Create new bookmarklet installation page
bin/js-to-bookmarklet bookmarklets/gdocs-slack

# With custom naming
BOOKMARKLET_NAME="📋 Copy Doc Link" bin/js-to-bookmarklet bookmarklets/gdocs-slack
```

### User Installation Flow
1. Developer runs build script → generates installation webpage
2. User visits webpage → sees drag-and-drop button
3. User drags to bookmarks bar → bookmarklet installed
4. User clicks bookmark on target site → functionality executes
5. User receives notification feedback → confirms success

## Browser Compatibility
- **Primary**: Chrome, Edge, Safari (full modern API support)
- **Secondary**: Firefox, Opera (modern browsers only)
- **Mobile**: iOS Safari, Android Chrome (where bookmarklets supported)

## Extension Points
- **New Bookmarklets**: Add JavaScript files, leverage lib.js utilities
- **Custom Notifications**: Extend NotificationSystem for specialized feedback
- **Platform Integration**: Add clipboard format support for new platforms
- **Build Customization**: Environment variables for titles, descriptions, styling
