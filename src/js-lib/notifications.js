/**
 * Class representing a notification system with smooth animations
 */
class NotificationSystem {
  /**
   * Shows a success notification
   * @param {string} message - Message to display
   */
  static showSuccess(message) {
    console.log('SUCCESS:', message);
    this.show(message, '#28a745');
  }

  /**
   * Shows an error notification
   * @param {string} message - Message to display
   */
  static showError(message) {
    console.error('ERROR:', message);
    this.show(message, '#f8d7da');
  }

  /**
   * Shows a warning notification
   * @param {string} message - Message to display
   */
  static showWarning(message) {
    console.warn('WARNING:', message);
    this.show(message, '#fff3cd');
  }

  /**
   * Shows a dege info extracted successfully
   * bug notification - always logs to console, shows UI only if debug mode enabled
   * @param {string} message - Message to display
   */
  static showDebug(message) {
    console.log('DEBUG:', message);
    // Only show UI notification if debug mode is enabled
    if (sessionStorage.getItem('at bookmarklet debug')) {
      this.show(message, '#6c757d'); // Grey color for debug
    }
  }

  /**
   * Turn on debug mode for this session only (cleared on page refresh)
   */
  static turnOnDebugMode() {
    sessionStorage.setItem('at bookmarklet debug', 'true');
    this.showDebug('Debug mode enabled for this session');
  }

  /**
   * Generic notification display with smooth animations
   * @param {string} message - Message to display
   * @param {string} bgColor - Background color for notification
   * @throws {Error} May throw DOM manipulation errors
   */
  static show(message, bgColor) {
    // Remove any existing notifications
    const existing = document.querySelector('#gdocs-slack-notification');
    if (existing) {
      existing.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'gdocs-slack-notification';

    // Handle newlines by creating text nodes and br elements to avoid TrustedHTML issues
    const parts = message.split('\n');
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        notification.appendChild(document.createElement('br'));
      }
      if (parts[i]) {
        notification.appendChild(document.createTextNode(parts[i]));
      }
    }

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

    // Auto-remove after 2 seconds with fade out
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 2000);
  }
}
