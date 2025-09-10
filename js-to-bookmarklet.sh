#!/bin/bash

# js-to-bookmarklet.sh
# Converts JavaScript from stdin to a bookmarklet format
# Usage: cat script.js | ./js-to-bookmarklet.sh
# Or: ./js-to-bookmarklet.sh < script.js

set -e

# Configuration - use environment variable or default
BOOKMARKLET_NAME="${BOOKMARKLET_NAME:-"📋 Copy Doc Link"}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we have input from stdin or file
if [ -t 0 ] && [ $# -eq 0 ]; then
    print_error "No input provided. Please pipe JavaScript code to this script."
    echo "Usage: cat script.js | $0"
    echo "   or: $0 < script.js"
    exit 1
fi

# Create temporary files for processing
TEMP_FILE=$(mktemp)
INPUT_FILE=$(mktemp)

# Read stdin to temp file
cat > "$INPUT_FILE"

print_status "Processing JavaScript input..."

# Check if the input file has content
if [ ! -s "$INPUT_FILE" ]; then
    print_error "Input is empty"
    rm -f "$TEMP_FILE" "$INPUT_FILE"
    exit 1
fi

# Show input size
INPUT_SIZE=$(wc -c < "$INPUT_FILE")
print_status "Input size: ${INPUT_SIZE} bytes"

# Try to minify with different tools (in order of preference)
MINIFIED=false

# Method 1: Try terser (best option)
if command -v terser >/dev/null 2>&1; then
    print_status "Minifying with terser..."
    if terser "$INPUT_FILE" --compress --mangle --output "$TEMP_FILE" 2>/dev/null; then
        MINIFIED=true
        MINIFIER="terser"
    fi
fi

# Method 2: Try uglifyjs if terser failed
if [ "$MINIFIED" = false ] && command -v uglifyjs >/dev/null 2>&1; then
    print_status "Minifying with uglifyjs..."
    if uglifyjs "$INPUT_FILE" --compress --mangle --output "$TEMP_FILE" 2>/dev/null; then
        MINIFIED=true
        MINIFIER="uglifyjs"
    fi
fi

# Method 3: Try node with a simple minifier
if [ "$MINIFIED" = false ] && command -v node >/dev/null 2>&1; then
    print_status "Minifying with node (basic)..."
    MINIFY_SCRIPT=$(mktemp)
    cat > "$MINIFY_SCRIPT" << 'EOF'
const fs = require('fs');
const input = fs.readFileSync(process.argv[1], 'utf8');

// Basic minification: remove comments, extra whitespace, and newlines
const minified = input
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\/\/.*$/gm, '')         // Remove line comments
    .replace(/\s+/g, ' ')             // Replace multiple whitespace with single space
    .replace(/;\s*}/g, '}')           // Remove semicolons before }
    .replace(/{\s*/g, '{')            // Remove space after {
    .replace(/}\s*/g, '}')            // Remove space after }
    .replace(/,\s*/g, ',')            // Remove space after ,
    .replace(/;\s*/g, ';')            // Remove space after ;
    .trim();

fs.writeFileSync(process.argv[2], minified);
EOF

    if node "$MINIFY_SCRIPT" "$INPUT_FILE" "$TEMP_FILE" 2>/dev/null; then
        MINIFIED=true
        MINIFIER="node (basic)"
    fi
    rm -f "$MINIFY_SCRIPT"
fi

# Method 4: If all else fails, just use the original (with safe cleanup)
if [ "$MINIFIED" = false ]; then
    print_warning "No minifier available, using safe cleanup..."
    # Safe cleanup: only remove leading whitespace and compress newlines to spaces
    sed 's/^[[:space:]]*//g' "$INPUT_FILE" | tr '\n' ' ' > "$TEMP_FILE"
    MINIFIER="safe cleanup"
fi

# Check if minification worked
if [ ! -s "$TEMP_FILE" ]; then
    print_error "Minification failed, using original"
    cp "$INPUT_FILE" "$TEMP_FILE"
fi

# Show minified size
MINIFIED_SIZE=$(wc -c < "$TEMP_FILE")
if [ "$INPUT_SIZE" -gt 0 ]; then
    COMPRESSION_RATIO=$(echo "scale=1; ($INPUT_SIZE - $MINIFIED_SIZE) * 100 / $INPUT_SIZE" | bc 2>/dev/null || echo "N/A")
    print_success "Minified with $MINIFIER: ${MINIFIED_SIZE} bytes (${COMPRESSION_RATIO}% smaller)"
else
    print_success "Minified with $MINIFIER: ${MINIFIED_SIZE} bytes"
fi

# Create the bookmarklet
print_status "Creating bookmarklet..."

# Read the minified content and URL encode it properly
MINIFIED_CONTENT=$(cat "$TEMP_FILE")

# Create bookmarklet with proper encoding
# We need to wrap the code in an IIFE and handle encoding
BOOKMARKLET="javascript:(function(){${MINIFIED_CONTENT}})();"

# URL encode special characters properly for bookmarklets
if command -v python3 >/dev/null 2>&1; then
    ENCODED_BOOKMARKLET=$(echo "$BOOKMARKLET" | python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read().strip(), safe='():;,'))")
elif command -v node >/dev/null 2>&1; then
    ENCODED_BOOKMARKLET=$(echo "$BOOKMARKLET" | node -e "console.log(encodeURIComponent(require('fs').readFileSync(0, 'utf8').trim()))")
else
    # Fallback to basic sed encoding
    ENCODED_BOOKMARKLET=$(echo "$BOOKMARKLET" | sed 's/ /%20/g' | sed 's/"/%22/g' | sed 's/</%3C/g' | sed 's/>/%3E/g' | sed 's/#/%23/g')
fi

# Show final size
FINAL_SIZE=${#ENCODED_BOOKMARKLET}
print_success "Final bookmarklet size: ${FINAL_SIZE} characters"

# Warn if it's getting large (browsers have limits)
if [ "$FINAL_SIZE" -gt 2000 ]; then
    print_warning "Bookmarklet is large (${FINAL_SIZE} chars). Some browsers may have issues."
    if [ "$FINAL_SIZE" -gt 4000 ]; then
        print_warning "Consider breaking this into smaller functions or using a different approach."
    fi
fi

# Output the bookmarklet
echo
print_success "Bookmarklet ready:"
echo
echo "$ENCODED_BOOKMARKLET"
echo

# Use configured bookmarklet name
print_status "Using bookmarklet name: $BOOKMARKLET_NAME"

# Create HTML file for easy drag-and-drop
HTML_FILE=$(mktemp).html

# Create a simple SVG favicon for copy/paste
FAVICON_SVG='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>'

cat > "$HTML_FILE" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Bookmarklet - Ready to Install</title>
    <link rel="icon" href="$FAVICON_SVG" type="image/svg+xml">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 40px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 2px 20px rgba(0,0,0,0.1);
            text-align: center;
        }
        h1 {
            color: #1a73e8;
            margin-bottom: 30px;
        }
        .bookmarklet-link {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px 40px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 18px;
            margin: 20px 0;
            transition: transform 0.2s ease;
            border: 2px solid rgba(255,255,255,0.2);
        }
        .bookmarklet-link:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }
        .copy-icon {
            width: 20px;
            height: 20px;
            stroke: currentColor;
        }
        .instructions {
            background: #e8f5e8;
            border-left: 4px solid #28a745;
            padding: 20px;
            margin: 30px 0;
            border-radius: 0 8px 8px 0;
            text-align: left;
        }
        .stats {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .code {
            background: #f1f3f4;
            padding: 15px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 12px;
            word-break: break-all;
            margin: 15px 0;
            max-height: 200px;
            overflow-y: auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Your Bookmarklet is Ready!</h1>

        <p>Drag the button below to your bookmarks bar in Chrome:</p>

        <a href="$ENCODED_BOOKMARKLET" class="bookmarklet-link">
            <svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            $BOOKMARKLET_NAME
        </a>

        <div class="instructions">
            <h3>🚀 How to Install:</h3>
            <ol>
                <li><strong>Show bookmarks bar:</strong> Press <code>Ctrl+Shift+B</code> (or <code>Cmd+Shift+B</code> on Mac)</li>
                <li><strong>Drag the button:</strong> Click and drag the blue button above to your bookmarks bar</li>
                <li><strong>Test it:</strong> Go to a Google Doc and click your new bookmark</li>
            </ol>
        </div>

        <div class="stats">
            <h3>📊 Bookmarklet Stats:</h3>
            <p><strong>Final size:</strong> ${FINAL_SIZE} characters</p>
            <p><strong>Minified with:</strong> ${MINIFIER}</p>
            <p><strong>Original size:</strong> ${INPUT_SIZE} bytes</p>
            <p><strong>Compressed size:</strong> ${MINIFIED_SIZE} bytes</p>
        </div>

        <details>
            <summary>🔧 Raw Code (for manual creation)</summary>
            <div class="code">$ENCODED_BOOKMARKLET</div>
        </details>

        <p><em>This page will auto-close after you drag the bookmarklet</em></p>
    </div>

    <script>
        // Optional: Auto-close after successful drag (when focus returns)
        let dragStarted = false;
        document.querySelector('.bookmarklet-link').addEventListener('dragstart', () => {
            dragStarted = true;
        });

        window.addEventListener('focus', () => {
            if (dragStarted) {
                setTimeout(() => {
                    alert('Bookmarklet installed! You can now close this tab.');
                }, 500);
            }
        });
    </script>
</body>
</html>
EOF

print_status "HTML file created: $HTML_FILE"

# Try to open in Chrome
if command -v google-chrome >/dev/null 2>&1; then
    print_status "Opening in Chrome..."
    google-chrome "$HTML_FILE" >/dev/null 2>&1 &
elif command -v chrome >/dev/null 2>&1; then
    print_status "Opening in Chrome..."
    chrome "$HTML_FILE" >/dev/null 2>&1 &
elif command -v chromium >/dev/null 2>&1; then
    print_status "Opening in Chromium..."
    chromium "$HTML_FILE" >/dev/null 2>&1 &
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if [ -d "/Applications/Google Chrome.app" ]; then
        print_status "Opening in Chrome (macOS)..."
        open -a "Google Chrome" "$HTML_FILE"
    else
        print_status "Opening in default browser (macOS)..."
        open "$HTML_FILE"
    fi
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    # Windows
    print_status "Opening in default browser (Windows)..."
    start "$HTML_FILE"
else
    # Linux fallback
    if command -v xdg-open >/dev/null 2>&1; then
        print_status "Opening in default browser (Linux)..."
        xdg-open "$HTML_FILE" >/dev/null 2>&1 &
    else
        print_warning "Could not automatically open browser."
        echo "Please open this file manually: $HTML_FILE"
    fi
fi

# Cleanup the temp JS files but keep HTML file for now
rm -f "$TEMP_FILE" "$INPUT_FILE"

print_success "Done! Chrome should open with your bookmarklet ready to drag."
print_status "HTML file will be cleaned up automatically, or delete manually: $HTML_FILE"