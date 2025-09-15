# Google Docs to Slack Rich Link Bookmarklet

Creates clickable links in Slack from Google Docs with the document title as link text. Automatically detects document sections and provides smart header handling.

## Quick Start

```bash
cat gdocs-slack.js | ./js-to-bookmarklet.sh
```

1. Chrome opens with installation page
2. Drag the button to your bookmarks bar
3. Go to any Google Doc and click your bookmark
4. Paste in Slack and you get a rich formatted link!

## Features

### Smart Header Detection
- **Single Click**: Copies link with header info (e.g., "My Document #Section Name")
- **Double Click**: Strips header info (just "My Document")
- Automatically detects current document section from Google Docs navigation

### Cross-Browser Support
- **Modern Browsers**: Rich HTML links that paste beautifully in Slack
- **Legacy Browsers**: Graceful fallback to formatted plain text
- **Focus Issues**: Automatic workaround for browser clipboard permissions

### Professional UX
- Animated success/error notifications
- Size-optimized bookmarklet generation
- Clean installation process with drag-and-drop

## Customization

### Change the bookmarklet name
```bash
export BOOKMARKLET_NAME="📄 My Custom Name"
cat gdocs-slack.js | ./js-to-bookmarklet.sh
```

### Edit the JavaScript
Modify `gdocs-slack.js` to change behavior, then regenerate with the command above.

You can create any bookmarklet with `./js-to-bookmarklet.sh`

## Requirements

- Node.js and npm (required for minification with terser)

## Advanced Usage

### Header Behavior
The bookmarklet intelligently handles document sections:

```
Single click → "Project Plan #Budget Analysis": https://docs.google.com/...
Double click → "Project Plan": https://docs.google.com/...
```

### Build Pipeline
The shell script provides a complete build and installation pipeline:
- **Minification**: Optimizes JavaScript for bookmarklet size limits
- **Cross-platform**: Works on macOS, Linux, and Windows
- **Browser Detection**: Auto-opens Chrome/Chromium for installation
- **Size Warnings**: Alerts if bookmarklet exceeds browser limits

## Troubleshooting

### Common Issues
- **"This only works on Google Docs"**: Make sure you're on `docs.google.com/document/...`
- **"Copy failed"**: Try refreshing the page, fallback copies plain text
- **"Focus required"**: Click inside the document first, then try the bookmarklet

### Browser Compatibility
- **Chrome/Edge**: Full rich text support with HTML links
- **Safari**: Rich text support with occasional focus workarounds
- **Firefox**: May fall back to plain text formatting
- **All Browsers**: Plain text fallback ensures universal compatibility

### Technical Requirements
- **Node.js**: Required for `npm` and `npx` (JavaScript minification)
- **Modern Clipboard API**: For rich text support (graceful fallback provided)

## Demo

![Demo](resources/richlink.gif)
