# Google Docs to Slack Rich Link Bookmarklet

## Overview
Create a JavaScript bookmarklet that extracts a Google Doc's title and URL, then copies it as rich text that pastes beautifully in Slack with the document title as clickable display text.

## Requirements

### Core Functionality
- Extract clean document title (remove " - Google Docs" suffix)
- Get current document URL
- Copy as rich HTML for Slack + plain text fallback
- Show user feedback notifications
- Only work on actual Google Docs pages
- Handle modern and legacy clipboard APIs gracefully

### Bookmarklet Pipeline
1. **JavaScript Development**: Core script with proper error handling
2. **Minification**: Compress JavaScript for bookmarklet size limits
3. **Encoding**: URL encode for `javascript:` protocol
4. **HTML Generation**: Create drag-and-drop installation page
5. **Browser Launch**: Auto-open Chrome with installation page

### User Experience
- One-keystroke activation (via Karabiner/Raycast integration)
- Clean notifications (no console errors)
- Graceful fallbacks for different browser capabilities
- Professional bookmarklet naming with copy icon

## Technical Specifications

### JavaScript Requirements
```javascript
// Core functions needed:
- copyDocAsRichLink() // Main copying logic
- fallbackTextCopy() // Legacy browser support
- showNotification() // User feedback
- isGoogleDocsPage() // Validation
- execute() // Entry point with error handling
```

### Clipboard API Handling
- **Modern**: `navigator.clipboard.write()` with `ClipboardItem`
- **Fallback**: `document.execCommand('copy')` with textarea
- **Error handling**: Try/catch with graceful degradation
- **Rich text format**: HTML `<a>` tag for Slack recognition

### Shell Script Pipeline
```bash
# Input: JavaScript from stdin
# Output: Chrome opens with drag-ready bookmarklet

# Features needed:
- Multi-platform minification (terser > uglifyjs > node > basic)
- URL encoding for bookmarklet format
- Size optimization and warnings
- Cross-platform Chrome detection and launch
- Beautiful HTML installation page
- Customizable bookmarklet naming
```

### Installation Page Requirements
- **Visual**: Clean, professional design with copy icon
- **Functional**: Drag-and-drop to bookmarks bar
- **Informative**: Size stats, installation instructions
- **Interactive**: Success detection and cleanup guidance

## File Structure
```
/
├── gdocs-slack.js          # Core JavaScript functionality
├── js-to-bookmarklet.sh    # Conversion and installation script
└── AGENTS.md              # This specification file
```

## Implementation Steps

### Phase 1: Core JavaScript
1. Create main copying function with rich text support
2. Add clipboard API detection and fallbacks
3. Implement user notifications with animations
4. Add Google Docs page validation
5. Handle all error cases gracefully

### Phase 2: Bookmarklet Pipeline
1. Create shell script with minification options
2. Add proper URL encoding for javascript: protocol
3. Implement cross-platform Chrome detection
4. Generate beautiful HTML installation page
5. Add user customization options

### Phase 3: Integration & Testing
1. Test on different browsers (Chrome, Safari, Firefox)
2. Verify Slack rich link formatting
3. Test with various Google Docs (shared, private, etc.)
4. Validate bookmarklet size limits
5. Test cross-platform shell script

## Usage Workflow
```bash
# Development
cat gdocs-slack.js | ./js-to-bookmarklet.sh

# User Experience
1. Script prompts for bookmarklet name
2. Chrome opens with installation page
3. User drags button to bookmarks bar
4. User goes to Google Doc and clicks bookmark
5. User pastes in Slack → sees rich formatted link
```

## Success Criteria
- ✅ One-click copying from Google Docs
- ✅ Rich text paste in Slack (title as link text)
- ✅ No console errors or warnings
- ✅ Works across modern browsers
- ✅ Professional installation experience
- ✅ Automated build and deployment pipeline
- ✅ Integration with Karabiner/Raycast for keyboard shortcuts

## Browser Compatibility
- **Modern**: Chrome/Edge/Safari with full Clipboard API
- **Legacy**: Firefox, older browsers with execCommand fallback
- **Mobile**: iOS Safari, Android Chrome (where bookmarklets supported)

## Future Enhancements
- Support for other Google Workspace apps (Sheets, Slides)
- Custom link formatting options
- Bulk document link generation
- Integration with other chat platforms (Teams, Discord)
- Browser extension version for enhanced functionality
