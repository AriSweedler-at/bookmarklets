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