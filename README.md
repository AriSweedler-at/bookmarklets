# Google Docs to Slack Rich Link Bookmarklet

Creates clickable links in Slack from Google Docs with the document title as link text.

## Quick Start

```bash
cat gdocs-slack.js | ./js-to-bookmarklet.sh
```

1. Chrome opens with installation page
2. Drag the button to your bookmarks bar
3. Go to any Google Doc and click your bookmark
4. Paste in Slack and you get a rich formatted link!

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

## Troubleshooting

- **"This only works on Google Docs"**: Make sure you're on `docs.google.com/document/...`
- **"Copy failed"**: Try refreshing the page, fallback copies plain text
- **Browser compatibility**: Works best in Chrome/Edge, may fall back to plain text in Firefox
- **"npm is required"**: Install Node.js to get npm and npx
