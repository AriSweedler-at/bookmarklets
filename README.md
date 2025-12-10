# Bookmarklet Compiler & RichLinker

A modular system for creating JavaScript bookmarklets with shared libraries. Includes RichLinker - a multi-platform rich link generator with smart duplicate detection.

## Supported Platforms

RichLinker works on:
- **Google Docs** - Copy document title with optional heading links
- **Atlassian Confluence** - Copy wiki page titles
- **Airtable** - Copy task/record titles from specific bases
- **GitHub Pull Requests** - Copy PR titles with links
- **Spinnaker** - Copy pipeline execution links with double-click for executions list

## Quick Start

```bash
bin/js-to-bookmarklet richlinker
```

## Project Structure

```
📁 src/                           # Source code directory
  ├── bookmarklet/                # Individual bookmarklet files
  │   ├── richlinker.js          # Multi-platform rich link generator
  │   └── ...                    # Additional bookmarklets
  └── js-lib/                    # Shared libraries (auto-included)
      ├── notifications.js       # Notification system with debug mode
      └── clipboard.js           # Modern clipboard utilities

📁 bin/                          # Executable scripts
  └── js-to-bookmarklet          # Bookmarklet compiler

🔧 .recent-bookmarklet           # Tracks most recently compiled file
```

1. Chrome opens with installation page
2. Drag the button to your bookmarks bar
3. Go to any supported site and click your bookmark
4. Paste anywhere and you get a rich formatted link!

## Customization

### Environment Variables
Customize the compiler behavior with these environment variables:

```bash
# Custom emoji for bookmarklet names
JS2BM_EMOJI="🔗" bin/js-to-bookmarklet src/bookmarklet/richlinker

# Default usage (requires `fzf`)
bin/js-to-bookmarklet
```

### Edit the JavaScript
Modify files in `src/bookmarklet/` to change behavior, then regenerate with the command above.

Notice the `//ARI_include` directives, those add library files like
`notifications.js`, which is really handy

You can create any bookmarklet with `bin/js-to-bookmarklet`

## Requirements

- Node.js and npm (required for minification with terser)

### Build Pipeline
The shell script provides a complete build and installation pipeline:
- **Minification**: Optimizes JavaScript for bookmarklet size limits
- **Cross-platform**: Works on macOS, Linux, and Windows
- **Browser Detection**: Auto-opens Chrome/Chromium for installation
- **Size Warnings**: Alerts if bookmarklet exceeds browser limits

## Troubleshooting

### Common Issues
- **"No handler found for this page"**: Make sure you're on a supported platform (see Supported Platforms section above)
- **"Copy failed"**: Try refreshing the page, check browser clipboard permissions
- **"Focus required"**: Click inside the document first, then try the bookmarklet

## Demo

### richlinker

![Demo](resources/richlink.gif)

### github-autoscroll

This only makes sense for refactoring changes where the changes are within 1
screen-length and very repetitive. Lmao. Anyway.

![Demo](resources/github-autoscroll.gif)
