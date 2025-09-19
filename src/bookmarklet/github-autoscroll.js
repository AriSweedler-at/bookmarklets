//ARI_include notifications.js

/**
 * Validation function to check if we're on GitHub PR files page
 * @returns {boolean} True if on GitHub PR files page
 */
function isGitHubPRPage() {
  const url = window.location.href;
  const parts = url.split('/');

  // Check: https://github.com/owner/repo/pull/123/files (or just /pull/123)
  return parts[2] === 'github.com' &&
    parts.length >= 7 &&
    parts[5] === 'pull' &&
    !isNaN(parseInt(parts[6]));
}

/**
 * Get all file elements
 * @returns {Element[]} Array of file elements
 */
function getFiles() {
  // Look for GitHub's CSS module classes with dynamic suffixes
  // Target: class starting with 'Diff-module__diffHeaderWrapper--'
  // Inside: Files-module__Content container
  const container = document.querySelector('[data-hpc="true"] .d-flex.flex-column.gap-3');

  if (container) {
    // Find all elements with class starting with 'Diff-module__diffHeaderWrapper--'
    const diffHeaders = Array.from(container.querySelectorAll('[class*="Diff-module__diffHeaderWrapper--"]'));
    if (diffHeaders.length > 0) {
      return diffHeaders;
    }
  }

  // Fallback: search globally for the diff header wrapper pattern
  const globalDiffHeaders = Array.from(document.querySelectorAll('[class*="Diff-module__diffHeaderWrapper--"]'));
  if (globalDiffHeaders.length > 0) {
    return globalDiffHeaders;
  }

  // Final fallback selectors
  const fallbackSelectors = [
    '[data-testid*="file"]',
    '[data-tagsearch-path]',
    '[data-path]',
    '.file-header',
    '.file',
    '.js-file'
  ];

  for (const selector of fallbackSelectors) {
    const files = Array.from(document.querySelectorAll(selector));
    if (files.length > 0) {
      return files;
    }
  }
  return [];
}

/**
 * Get filename from file element
 * @param {Element} fileEl - File element
 * @returns {string} Filename or empty string
 */
function getFileName(fileEl) {
  // Try various ways to extract filename from GitHub's current DOM

  // Method 1: data attributes
  const dataPath = fileEl.getAttribute('data-path') || fileEl.getAttribute('data-tagsearch-path');
  if (dataPath) return dataPath;

  // Method 2: Look for file path in links or spans with title attributes
  const titleEl = fileEl.querySelector('[title]');
  if (titleEl && titleEl.getAttribute('title')) {
    const title = titleEl.getAttribute('title');
    // Skip generic titles like "Viewed" or "Toggle diff"
    if (!title.includes('Viewed') && !title.includes('Toggle') && !title.includes('diff')) {
      return title;
    }
  }

  // Method 3: Look for filename in text content of specific selectors
  const filenameSelectors = [
    'a[href*="/blob/"]',
    '.file-info a',
    '[data-testid="file-header"] a',
    '.js-file-line-container a'
  ];

  for (const selector of filenameSelectors) {
    const el = fileEl.querySelector(selector);
    if (el && el.textContent && el.textContent.trim()) {
      return el.textContent.trim();
    }
  }

  // Method 4: Look for any link that looks like a file path
  const links = fileEl.querySelectorAll('a');
  for (const link of links) {
    const text = link.textContent?.trim();
    if (text && (text.includes('/') || text.includes('.'))) {
      return text;
    }
  }

  return 'unknown file';
}

/**
 * Check if a file has been marked as viewed
 * @param {Element} fileEl - File element to check
 * @returns {boolean} True if file is marked as viewed
 */
function isViewed(fileEl) {
  // Look for GitHub's new button-based "viewed" system
  const viewedButton = fileEl.querySelector('button[aria-pressed="true"]') ||
    fileEl.closest('div').querySelector('button[aria-pressed="true"]') ||
    fileEl.parentElement?.querySelector('button[aria-pressed="true"]');

  if (viewedButton && viewedButton.textContent?.includes('Viewed')) {
    return true;
  }

  // Check for the CSS class pattern that indicates viewed state (module class changes each refresh)
  const viewedByClass = fileEl.querySelector('[class*="MarkAsViewedButton-module__viewed--"]') ||
    fileEl.closest('div').querySelector('[class*="MarkAsViewedButton-module__viewed--"]') ||
    fileEl.parentElement?.querySelector('[class*="MarkAsViewedButton-module__viewed--"]');

  if (viewedByClass) return true;

  // Fallback to old checkbox system (if still exists)
  const checkboxSelectors = [
    'input[type="checkbox"][name="viewed"]',
    'input.js-reviewed-checkbox',
    'input[type="checkbox"]'
  ];

  for (const selector of checkboxSelectors) {
    const cb = fileEl.querySelector(selector) ||
      fileEl.closest('div').querySelector(selector) ||
      fileEl.parentElement?.querySelector(selector);
    if (cb && cb.checked) return true;
  }
  return false;
}

/**
 * Find the next unviewed file after the specified element
 * @param {Element} afterEl - Element to search after
 * @returns {Element|null} Next unviewed file element or null
 */
function findNextUnviewedAfter(afterEl) {
  const files = getFiles();
  const idx = files.indexOf(afterEl);

  for (let i = idx + 1; i < files.length; i++) {
    if (!isViewed(files[i])) return files[i];
  }

  // Fallback: just the next file (even if viewed)
  return files[idx + 1] || null;
}

/**
 * Scroll element so its center aligns with the top of the viewport (with small border)
 * @param {Element} el - Element to position
 * @param {Object} [options={}] - Scroll options
 * @param {number} [options.offsetTop=100] - Distance from top of viewport
 * @param {string} [options.behavior='smooth'] - Scroll behavior
 */
function scrollElementCenter(el, {offsetTop = 100, behavior = 'smooth'} = {}) {
  const rect = el.getBoundingClientRect();
  const elementCenter = rect.top + rect.height / 2;
  const targetPosition = offsetTop; // Position from top of window
  const delta = elementCenter - targetPosition;
  window.scrollBy({top: delta, behavior});
}

/**
 * Flash highlight a file element by adding/removing CSS class to parent
 * @param {Element} el - File element to flash
 */
function flashFile(el) {
  const cl = el.parentElement.classList
  cl.add('gh-autoscroll-flash');
  setTimeout(() => {
    cl.remove('gh-autoscroll-flash');
  }, 1500);
}

/**
 * Handle button click events (GitHub's "viewed" system)
 * @param {Event} e - Click event
 */
function onButtonClick(e) {
  // Check if this is a "Viewed" button
  const button = e.target.closest('button');
  if (!button || !button.textContent?.includes('Viewed')) {
    return;
  }

  // Look for the file element using the same patterns as getFiles()
  const fileEl = button.closest('[class*="Diff-module__diffHeaderWrapper--"]') ||
    button.closest('[data-tagsearch-path], [data-path], .file-header, .Box-row, .file, .js-file');

  if (!fileEl) {
    return;
  }

  const currentFileName = getFileName(fileEl);

  // Let GitHub update the UI first, then check if file was marked as viewed
  setTimeout(() => {
    if (!isViewed(fileEl)) {
      console.log('🔍 File unmarked as viewed:', currentFileName);
      return;
    }

    console.log('🔍 File marked as viewed:', currentFileName);
    const next = findNextUnviewedAfter(fileEl);
    if (!next) {
      console.log('🔍 All files reviewed!');
      NotificationSystem.showSuccess('All files reviewed! 🎉');
    }

    const nextFileName = getFileName(next);
    console.log('🔍 Next unviewed file:', nextFileName);
    scrollElementCenter(next);
    flashFile(next);
  }, 200);
}

/**
 * Initialize the auto-scroll system
 * @returns {Function} Stop function to disable auto-scroll
 */
function initializeAutoScroll() {
  // Add or update CSS for file highlighting
  let style = document.getElementById('gh-autoscroll-styles');
  if (!style) {
    style = document.createElement('style');
    style.id = 'gh-autoscroll-styles';
    document.head.appendChild(style);
  }

  style.textContent = `
.gh-autoscroll-flash {
  position: relative; /* ensures the pseudo-element positions correctly */
}

.gh-autoscroll-flash::after {
  content: "";
  position: absolute;
  z-index: 10;
  inset: 0; /* covers the whole element */
  border: 8px solid #ffffff;
  pointer-events: none; /* don’t block interaction */
  animation: flashBorder 0.75s ease alternate 2;
}

@keyframes flashBorder {
  0% { opacity: 0; }
  100% { opacity: 1 }
}
`;

  // Add event listener for button clicks
  document.addEventListener('click', onButtonClick, true);

  // Check for files
  const files = getFiles();

  if (files.length === 0) {
    NotificationSystem.showError('No files found. Make sure you\'re on a GitHub PR page.');
    return null;
  }

  NotificationSystem.showSuccess('GitHub PR auto-scroll enabled! Click again to disable');

  // Scroll to first unviewed file
  const firstUnviewed = files.find(file => !isViewed(file));
  if (firstUnviewed) {
    const fileName = getFileName(firstUnviewed);
    console.log('🔍 Scrolling to first unviewed file:', fileName);
    scrollElementCenter(firstUnviewed);
    flashFile(firstUnviewed);
  }

  // Return stop function
  return () => {
    document.removeEventListener('click', onButtonClick, true);

    // Clean up CSS
    const style = document.getElementById('gh-autoscroll-styles');
    if (style) {
      style.remove();
    }

    delete window.__ghAutoScrollStop;
    NotificationSystem.showWarning('GitHub PR auto-scroll disabled');
  };
}

/**
 * Main execution function with error handling
 * @throws {Error} May throw various execution errors
 */
function execute() {
  // Check if we're on a GitHub PR files page
  if (!isGitHubPRPage()) {
    NotificationSystem.showError('GitHub autoscroll only works on PR pages like: github.com/owner/repo/pull/123/files');
    return;
  }

  // Toggle if already running
  if (window.__ghAutoScrollStop) {
    window.__ghAutoScrollStop();
    return;
  }

  // Execute the main initialization with error handling
  try {
    const stopFunction = initializeAutoScroll();
    if (stopFunction) {
      window.__ghAutoScrollStop = stopFunction;
    }
  } catch (error) {
    NotificationSystem.showError('GitHub autoscroll failed: ' + error.message);
    console.error('🔍 Error:', error);
  }
}

// Auto-execute when bookmarklet is run
execute();
