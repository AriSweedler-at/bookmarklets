// Main function to copy Google Doc as rich link for Slack
function copyDocAsRichLink() {
  try {
    // Extract clean document title (remove " - Google Docs" suffix)
    const rawTitle = document.title;
    const cleanTitle = rawTitle.replace(' - Google Docs', '').trim();
    const docUrl = window.location.href;

    // Create rich HTML format for Slack and plain text fallback
    const richHtml = `<a href="${docUrl}">${cleanTitle}</a>`;
    const plainText = `${cleanTitle}: ${docUrl}`;

    // Try modern Clipboard API first (supports rich text)
    if (navigator.clipboard && navigator.clipboard.write && window.ClipboardItem) {
      try {
        const clipboardItem = new ClipboardItem({
          'text/html': new Blob([richHtml], { type: 'text/html' }),
          'text/plain': new Blob([plainText], { type: 'text/plain' })
        });

        return navigator.clipboard.write([clipboardItem])
          .then(() => {
            console.log('📋 Rich link copied:', {
              URL: docUrl,
              TEXT: cleanTitle,
              RICHLINK: richHtml
            });
            showSuccessNotification('✅ Rich link copied for Slack!');
            return { success: true, title: cleanTitle };
          })
          .catch((error) => {
            // Check for document focus errors and try workaround
            if (error.message && error.message.includes('Document is not focused')) {
              return attemptFocusWorkaround(clipboardItem, plainText, cleanTitle, richHtml, docUrl);
            }
            showWarningNotification('⚠️ Rich link failed, using plain text: ' + (error.message || 'Clipboard API error'));
            return fallbackTextCopy(plainText, cleanTitle);
          });
      } catch (clipboardError) {
        showWarningNotification('⚠️ Rich link not supported, using plain text: ' + (clipboardError.message || 'ClipboardItem error'));
        return Promise.resolve(fallbackTextCopy(plainText, cleanTitle));
      }
    } else {
      // Fallback for older browsers
      showWarningNotification('⚠️ Browser lacks rich link support, using plain text');
      return Promise.resolve(fallbackTextCopy(plainText, cleanTitle));
    }

  } catch (error) {
    showErrorNotification('❌ Copy failed: ' + error.message);
    return Promise.resolve({ success: false, error: error.message });
  }
}

// Fallback function for older browsers or when rich text fails
function fallbackTextCopy(text, title) {
  try {
    // Create hidden textarea for legacy copy method
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    // Use deprecated but widely supported execCommand
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);

    if (success) {
      const url = text.split(': ')[1];
      console.log('📋 Plain text copied:', {
        URL: url,
        TEXT: title,
        RICHLINK: null
      });
      showSuccessNotification('📋 Link copied (plain text)');
      return { success: true, title, fallback: true };
    } else {
      throw new Error('execCommand failed');
    }
  } catch (error) {
    showErrorNotification('❌ Copy failed');
    return { success: false, error: error.message };
  }
}

// Show success notification
function showSuccessNotification(message) {
  showNotification(message, '#28a745', '✅');
}

// Show error notification
function showErrorNotification(message) {
  showNotification(message, '#f8d7da', '❌');
}

// Show warning notification
function showWarningNotification(message) {
  showNotification(message, '#fff3cd', '⚠️');
}

// Attempt to workaround focus issues by temporarily focusing the document
function attemptFocusWorkaround(clipboardItem, plainText, cleanTitle, richHtml, docUrl) {
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
    return new Promise((resolve) => {
      setTimeout(() => {
        navigator.clipboard.write([clipboardItem])
          .then(() => {
            console.log('📋 Rich link copied (after focus):', {
              URL: docUrl,
              TEXT: cleanTitle,
              RICHLINK: richHtml
            });
            showSuccessNotification('✅ Rich link copied for Slack! (auto-focused)');
            resolve({ success: true, title: cleanTitle });
          })
          .catch(() => {
            // Focus workaround failed, fall back to plain text
            showWarningNotification('⚠️ Focus workaround failed, using plain text');
            resolve(fallbackTextCopy(plainText, cleanTitle));
          });
      }, 100); // 100ms delay
    });

  } catch (error) {
    // Workaround failed, fall back to plain text
    showWarningNotification('⚠️ Focus workaround failed, using plain text');
    return Promise.resolve(fallbackTextCopy(plainText, cleanTitle));
  }
}

// Clear clipboard content
function clearClipboard() {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText('').catch(() => {
        // Fallback for clearing clipboard
        try {
          const textarea = document.createElement('textarea');
          textarea.value = '';
          textarea.style.position = 'fixed';
          textarea.style.left = '-9999px';
          textarea.style.opacity = '0';

          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        } catch (fallbackError) {
          // Silent fail - clipboard clearing is not critical
        }
      });
    }
  } catch (error) {
    // Silent fail - clipboard clearing is not critical
  }
}

// Generic notification function with smooth animations
function showNotification(message, bgColor, icon) {
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

// Validation function to check if we're on Google Docs
function isGoogleDocsPage() {
  return window.location.hostname === 'docs.google.com' &&
         window.location.pathname.includes('/document/');
}

// Main execution function with error handling
function execute() {
  // Only run on Google Docs pages
  if (!isGoogleDocsPage()) {
    showErrorNotification('❌ This only works on Google Docs');
    return;
  }

  // Execute the main copy function with error handling
  copyDocAsRichLink().catch(() => {
    showErrorNotification('❌ Copy failed');
  });
}

// Auto-execute when bookmarklet is run
execute();