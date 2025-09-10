// Google Docs to Slack Rich Link Script
// This script extracts the document title and URL, then copies as rich text for Slack

function copyDocAsRichLink() {
  try {
    // Step 1: Extract clean document title
    const rawTitle = document.title;
    const cleanTitle = rawTitle.replace(' - Google Docs', '').trim();

    // Step 2: Get current URL
    const docUrl = window.location.href;

    // Step 3: Create rich text formats
    const richHtml = `<a href="${docUrl}">${cleanTitle}</a>`;
    const plainText = `${cleanTitle}: ${docUrl}`;

    // Step 4: Try modern clipboard API first (supports rich text)
    if (navigator.clipboard && navigator.clipboard.write) {
      const htmlBlob = new Blob([richHtml], { type: 'text/html' });
      const textBlob = new Blob([plainText], { type: 'text/plain' });

      const clipboardItem = new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob
      });

      return navigator.clipboard.write([clipboardItem])
        .then(() => {
          showSuccessNotification('✅ Rich link copied for Slack!');
          return { success: true, title: cleanTitle };
        })
        .catch(() => {
          // Fallback to plain text if rich text fails
          return fallbackTextCopy(plainText, cleanTitle);
        });
    } else {
      // Fallback for older browsers
      return Promise.resolve(fallbackTextCopy(plainText, cleanTitle));
    }

  } catch (error) {
    console.error('Copy failed:', error);
    showErrorNotification('❌ Copy failed: ' + error.message);
    return Promise.resolve({ success: false, error: error.message });
  }
}

// Fallback function for older browsers or when rich text fails
function fallbackTextCopy(text, title) {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const success = document.execCommand('copy');
    document.body.removeChild(textarea);

    if (success) {
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
  showNotification(message, '#dc3545', '❌');
}

// Generic notification function
function showNotification(message, bgColor, icon) {
  // Remove any existing notifications
  const existing = document.querySelector('#gdocs-slack-notification');
  if (existing) {
    existing.remove();
  }

  const notification = document.createElement('div');
  notification.id = 'gdocs-slack-notification';
  notification.innerHTML = `${icon} ${message}`;

  // Styling
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${bgColor};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
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

  // Remove after 3 seconds
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

// Main execution function
function execute() {
  if (!isGoogleDocsPage()) {
    showErrorNotification('❌ This only works on Google Docs');
    return Promise.resolve({ success: false, error: 'Not on Google Docs' });
  }

  return copyDocAsRichLink();
}

// Export the main function for bookmarklet
// When converted to bookmarklet, this will be the entry point
execute();