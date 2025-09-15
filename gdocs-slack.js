/**
 * Class representing a document link answer with rich text, plain text, and comparison capabilities
 */
class DocumentLinkAnswer {
  /**
   * @param {string} title - Document title
   * @param {string} url - Document URL
   * @param {string|null} headingText - Optional heading text
   */
  constructor(title, url, headingText = null) {
    this.title = title;
    this.url = url;
    this.headingText = headingText;
  }

  /**
   * Get the title without heading
   * @returns {string} The title stripped of heading
   */
  getStrippedTitle() {
    return this.title;
  }

  /**
   * Convert to rich HTML format
   * @param {Object} [options={}] - Configuration options
   * @param {boolean} [options.includeHeader=false] - Whether to include heading in link text
   * @returns {string} HTML formatted link
   */
  toRichText(options = {}) {
    return `<a href="${this.url}">${this.getFinalTitle(options)}</a>`;
  }

  /**
   * Convert to plain text format (with heading if available)
   * @param {Object} [options={}] - Configuration options
   * @param {boolean} [options.includeHeader=true] - Whether to include heading in plain text
   * @returns {string} Plain text with title and URL
   */
  toPlainText(options = {}) {
    const {includeHeader = true} = options;
    const title = includeHeader ? this.getFinalTitle(options) : this.title;
    return `${title}: ${this.url}`;
  }

  /**
   * Get the final title (with heading if available)
   * @param {Object} [options={}] - Configuration options
   * @param {boolean} [options.includeHeader=true] - Whether to include heading
   * @returns {string} The complete title
   */
  getFinalTitle(options = {}) {
    const {includeHeader = true} = options;
    return (includeHeader && this.headingText) ? `${this.title} #${this.headingText}` : this.title;
  }

  /**
   * Get preview text for notifications (first 50 chars of plain text)
   * @param {Object} [options={}] - Configuration options
   * @param {boolean} [options.includeHeader=true] - Whether to include heading
   * @returns {string} Truncated preview text
   */
  getPreview(options = {}) {
    const plainText = this.toPlainText(options);
    return plainText.length > 50 ? plainText.substring(0, 47) + '...' : plainText;
  }

  /**
   * Check if this answer equals another answer
   * @param {DocumentLinkAnswer} other - Other answer to compare
   * @returns {boolean} True if answers are equal
   */
  equals(other) {
    if (!(other instanceof DocumentLinkAnswer)) {
      return false;
    }
    return this.toRichText() === other.toRichText();
  }

  /**
   * Fallback function for older browsers or when rich text fails
   * @param {Object} [options={}] - Configuration options
   * @returns {Object} Success object with result information
   * @throws {Error} May throw DOM manipulation errors
   */
  fallbackTextCopy(options = {}) {
    const text = this.toPlainText(options);
    const title = this.getFinalTitle(options);

    try {
      // Try modern clipboard API as fallback
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text)
          .then(() => {
            console.log('📋 Plain text copied:', {
              URL: this.url,
              TEXT: title,
              RICHLINK: null
            });
            NotificationSystem.showSuccess('📋 Link copied (plain text)');
            return {success: true, title, fallback: true};
          })
          .catch(() => {
            NotificationSystem.showError('❌ Copy failed');
            return {success: false, error: 'Clipboard API failed'};
          });
      } else {
        NotificationSystem.showError('❌ Copy failed - clipboard not supported');
        return {success: false, error: 'Clipboard API not available'};
      }
    } catch (error) {
      NotificationSystem.showError('❌ Copy failed');
      return {success: false, error: error.message};
    }
  }

  /**
   * Copy this answer to clipboard with rich text support
   * @param {Object} [options={}] - Configuration options
   * @param {boolean} [options.includeHeader=true] - Whether to include heading in plain text
   * @returns {Promise} Promise resolving to success object
   * @throws {Error} May throw clipboard API errors
   */
  async toClipboard(options = {}) {
    const richHtml = this.toRichText(options);
    const plainText = this.toPlainText(options);
    const finalTitle = this.getFinalTitle(options);
    const docUrl = this.url;

    // Check for modern Clipboard API support
    if (!navigator.clipboard || !navigator.clipboard.write || !window.ClipboardItem) {
      NotificationSystem.showWarning('⚠️ Browser lacks rich link support, using plain text');
      return this.fallbackTextCopy(options);
    }

    try {
      const clipboardItem = new ClipboardItem({
        'text/html': new Blob([richHtml], {type: 'text/html'}),
        'text/plain': new Blob([plainText], {type: 'text/plain'})
      });

      try {
        await navigator.clipboard.write([clipboardItem]);
        console.log('📋 Rich link copied:', {
          URL: docUrl,
          TEXT: finalTitle,
          RICHLINK: richHtml
        });

        NotificationSystem.showSuccess(`✅ Rich link copied for Slack! "${this.getPreview(options)}"`);
        return {success: true, title: finalTitle};
      } catch (error) {
        // Check for document focus errors and try workaround
        if (error.message && error.message.includes('Document is not focused')) {
          return await this._attemptFocusWorkaround(clipboardItem, options);
        }
        NotificationSystem.showWarning('⚠️ Rich link failed, using plain text: ' + (error.message || 'Clipboard API error'));
        return this.fallbackTextCopy(options);
      }
    } catch (clipboardError) {
      NotificationSystem.showWarning('⚠️ Rich link not supported, using plain text: ' + (clipboardError.message || 'ClipboardItem error'));
      return this.fallbackTextCopy(options);
    }
  }

  /**
   * Private method to attempt focus workaround
   * @param {ClipboardItem} clipboardItem - The clipboard item to write
   * @param {Object} [options={}] - Configuration options
   * @returns {Promise} Promise resolving to success object
   * @throws {Error} May throw focus or clipboard errors
   */
  async _attemptFocusWorkaround(clipboardItem, options = {}) {
    try {
      // Try to focus the document window first
      window.focus();

      // Focus on the document body or any clickable element
      if (document.body) {
        document.body.focus();
      }

      // Try to find and focus the Google Docs editor
      const editor = document.querySelector('.kix-appview-editor') ||
        document.querySelector('[role="textbox"]') ||
        document.querySelector('.docs-texteventtarget-iframe');

      if (editor) {
        editor.focus();
      }

      // Small delay to allow focus to take effect, then retry clipboard
      await new Promise(resolve => setTimeout(resolve, 100));

      try {
        await navigator.clipboard.write([clipboardItem]);
        console.log('📋 Rich link copied (after focus):', {
          URL: this.url,
          TEXT: this.getFinalTitle(options),
          RICHLINK: this.toRichText(options)
        });

        NotificationSystem.showSuccess(`✅ Rich link copied for Slack! (auto-focused) "${this.getPreview(options)}"`);
        return {success: true, title: this.getFinalTitle(options)};
      } catch {
        // Focus workaround failed, fall back to plain text
        NotificationSystem.showWarning('⚠️ Focus workaround failed, using plain text');
        return this.fallbackTextCopy(options);
      }

    } catch (error) {
      // Workaround failed, fall back to plain text
      NotificationSystem.showWarning('⚠️ Focus workaround failed, using plain text');
      return this.fallbackTextCopy(options);
    }
  }
}

/**
 * Class representing a notification system with smooth animations
 */
class NotificationSystem {
  /**
   * Shows a success notification
   * @param {string} message - Message to display
   */
  static showSuccess(message) {
    this.show(message, '#28a745');
  }

  /**
   * Shows an error notification
   * @param {string} message - Message to display
   */
  static showError(message) {
    this.show(message, '#f8d7da');
  }

  /**
   * Shows a warning notification
   * @param {string} message - Message to display
   */
  static showWarning(message) {
    this.show(message, '#fff3cd');
  }

  /**
   * Generic notification display with smooth animations
   * @param {string} message - Message to display
   * @param {string} bgColor - Background color for notification
   * @throws {Error} May throw DOM manipulation errors
   */
  static show(message, bgColor) {
    // Log to console
    console.log(message);

    // Remove any existing notifications
    const existing = document.querySelector('#gdocs-slack-notification');
    if (existing) {
      existing.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'gdocs-slack-notification';
    notification.textContent = message;

    // Apply professional styling
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${bgColor};
      color: ${bgColor === '#f8d7da' ? '#721c24' : bgColor === '#fff3cd' ? '#856404' : 'white'};
      padding: 12px 20px;
      border-radius: 8px;
      border: 1px solid black;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      transform: translateX(100%);
      transition: transform 0.3s ease, opacity 0.3s ease;
      opacity: 0;
      max-width: 300px;
      word-wrap: break-word;
    `;

    document.body.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
      notification.style.opacity = '1';
    });

    // Auto-remove after 3 seconds with fade out
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
}

/**
 * Dereferences a heading ID to actual heading text by searching the DOM
 * @param {string} headingId - The heading ID to search for
 * @returns {string|null} The heading text if found, null otherwise
 * @throws {Error} May throw DOM query errors
 */
function dereferenceHeading() {
  console.log(`🔍 dereferenceHeading: Looking for highlighted navigation item`);

  // Look for the highlighted navigation item in Google Docs outline
  const highlightedItem = document.querySelector('.navigation-item.location-indicator-highlight');
  if (!highlightedItem) {
    console.log('🔍 No highlighted navigation item found');
    console.log(`❌ dereferenceHeading: FAILED - No heading text found`);
    return null;
  }
  console.log('🔍 Found highlighted navigation item:', highlightedItem);

  // Extract the heading text from the tooltip or content
  const contentContainer = highlightedItem.querySelector('.navigation-item-content-container');
  const content = highlightedItem.querySelector('.navigation-item-content');

  // Try to get text from data-tooltip first (most reliable)
  if (content && content.dataset.tooltip) {
    const headingText = content.dataset.tooltip;
    console.log(`🔍 Found heading text from tooltip: "${headingText}"`);
    console.log(`✅ dereferenceHeading: SUCCESS - Found heading: "${headingText}"`);
    return headingText;
  }

  // Fallback to text content
  if (content) {
    const headingText = content.textContent?.trim();
    if (headingText) {
      console.log(`🔍 Found heading text from content: "${headingText}"`);
      console.log(`✅ dereferenceHeading: SUCCESS - Found heading: "${headingText}"`);
      return headingText;
    }
  }

  // Fallback to aria-label
  if (contentContainer) {
    const ariaLabel = contentContainer.getAttribute('aria-label');
    if (ariaLabel) {
      // Remove the level information (e.g., "Team rituals level 2" -> "Team rituals")
      const headingText = ariaLabel.replace(/ level \d+$/, '');
      console.log(`🔍 Found heading text from aria-label: "${headingText}"`);
      console.log(`✅ dereferenceHeading: SUCCESS - Found heading: "${headingText}"`);
      return headingText;
    }
  }

  console.log(`❌ dereferenceHeading: FAILED - No heading text found`);
  return null;
}

/**
 * Extracts heading information from the current URL hash
 * @returns {Object|null} Object with id and text properties, or null if no heading found
 */
function getHeadingFromUrl() {
  console.log('🔗 getHeadingFromUrl: Checking URL for heading anchor...');
  console.log('🔗 Current URL:', window.location.href);
  console.log('🔗 URL hash:', window.location.hash);

  const hash = window.location.hash;
  if (hash && hash.includes('heading=')) {
    const headingId = hash.split('heading=')[1];
    console.log('🔗 Extracted heading ID:', headingId);

    let headingText = null;
    try {
      headingText = dereferenceHeading();
    } catch (error) {
      console.log('🔗 Error dereferencing heading:', error);
    }

    const heading = {
      id: headingId,
      text: headingText
    };

    if (headingText) {
      console.log(`✅ User has selected header ${headingText}`);
    } else {
      console.log(`⚠️ User has selected header with ID: ${headingId}`);
    }

    return heading;
  }

  console.log('🔗 No heading found in URL');
  return null;
}



/**
 * Validation function to check if we're on Google Docs
 * @returns {boolean} True if on Google Docs page
 */
function isGoogleDocsPage() {
  return window.location.hostname === 'docs.google.com' &&
    window.location.pathname.includes('/document/');
}

/**
 * Part 1: Get the answer from the current Google Doc
 * @returns {DocumentLinkAnswer} The document link answer
 */
function getAnswer() {
  // Extract clean document title (remove " - Google Docs" suffix)
  const rawTitle = document.title;
  const cleanTitle = rawTitle.replace(' - Google Docs', '').trim();
  const docUrl = window.location.href;

  // Check if URL contains a heading anchor
  const heading = getHeadingFromUrl();
  const headingText = heading && heading.text ? heading.text : null;

  return new DocumentLinkAnswer(cleanTitle, docUrl, headingText);
}

/**
 * Check if the answer is a duplicate of what's already in the clipboard
 * @param {DocumentLinkAnswer} answer - The answer to check
 * @returns {Promise<boolean>} True if clipboard contains the same content
 */
async function isDuplicate(answer) {
  console.log('🔍 isDuplicate: Starting duplicate check');

  if (!navigator.clipboard || !navigator.clipboard.read) {
    console.log('🔍 isDuplicate: Clipboard read API not available');
    return false;
  }

  try {
    console.log('🔍 isDuplicate: Reading clipboard content...');
    const clipboardItems = await navigator.clipboard.read();

    for (const clipboardItem of clipboardItems) {
      console.log('🔍 isDuplicate: Available clipboard types:', [...clipboardItem.types]);

      // Try to read HTML content first
      if (clipboardItem.types.includes('text/html')) {
        const htmlBlob = await clipboardItem.getType('text/html');
        const htmlText = await htmlBlob.text();
        const expectedHtml = answer.toRichText();

        console.log('🔍 isDuplicate: Clipboard HTML:', JSON.stringify(htmlText));
        console.log('🔍 isDuplicate: Expected HTML:', JSON.stringify(expectedHtml));
        console.log('🔍 isDuplicate: HTML equal?', htmlText === expectedHtml);

        if (htmlText === expectedHtml) {
          console.log('🔄 Same content detected - clipboard HTML matches');
          return true;
        }
      }

      // Fallback to plain text
      if (clipboardItem.types.includes('text/plain')) {
        const textBlob = await clipboardItem.getType('text/plain');
        const plainText = await textBlob.text();
        const expectedText = answer.toPlainText();

        console.log('🔍 isDuplicate: Clipboard plain text:', JSON.stringify(plainText));
        console.log('🔍 isDuplicate: Expected plain text:', JSON.stringify(expectedText));
        console.log('🔍 isDuplicate: Plain text equal?', plainText === expectedText);

        if (plainText === expectedText) {
          console.log('🔄 Same content detected - clipboard plain text matches');
          return true;
        }
      }
    }

    console.log('🔍 isDuplicate: No matching content found');
  } catch (error) {
    // Clipboard read failed, try fallback with readText
    console.log('📋 Clipboard read failed, trying readText fallback:', error.message);

    try {
      if (navigator.clipboard.readText) {
        const clipboardText = await navigator.clipboard.readText();
        const expectedText = answer.toPlainText();

        console.log('🔍 isDuplicate: Fallback clipboard content:', JSON.stringify(clipboardText));
        console.log('🔍 isDuplicate: Fallback expected content:', JSON.stringify(expectedText));

        if (clipboardText === expectedText) {
          console.log('🔄 Same content detected - fallback match');
          return true;
        }
      }
    } catch (fallbackError) {
      console.log('📋 Fallback readText also failed:', fallbackError.message);
    }
  }

  console.log('🔍 isDuplicate: Returning false');
  return false;
}

/**
 * Main function to copy Google Doc as rich link for Slack
 * @returns {Promise} Promise resolving to success object
 */
async function copyDocAsRichLink() {
  // Part 1: Get the answer
  const answer = getAnswer();

  // Part 2: Check if it's a duplicate and copy accordingly
  const duplicate = await isDuplicate(answer);
  return await answer.toClipboard({includeHeader: !duplicate});
}


/**
 * Main execution function with error handling
 * @throws {Error} May throw various execution errors
 */
function execute() {
  // Only run on Google Docs pages
  if (!isGoogleDocsPage()) {
    NotificationSystem.showError('❌ This only works on Google Docs');
    return;
  }

  // Execute the main copy function with error handling
  try {
    copyDocAsRichLink().catch(() => {
      NotificationSystem.showError('❌ Copy failed');
    });
  } catch (error) {
    NotificationSystem.showError('❌ Copy failed: ' + error.message);
  }
}

// Auto-execute when bookmarklet is run
execute();
