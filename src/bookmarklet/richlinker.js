class richlinker {
    static WebpageInfo = class {
        constructor({titleText, titleUrl, headerText = null, headerUrl = null}) {
            this.titleText = titleText;
            this.titleUrl = titleUrl;
            this.headerText = headerText;
            this.headerUrl = headerUrl;
        }

        /**
         * Utility function to shorten text with ellipsis
         * @param {string} text - Text to shorten
         * @param {number} maxLength - Maximum length (default 30)
         * @returns {string} Shortened text with ellipsis if needed
         */
        shorty(text, maxLength = 30) {
            if (!text) return '';
            return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
        }

        /**
         * Returns a plain text preview for use with NotificationSystem
         * @param {boolean} [includeHeader=true] - Whether to include header in preview
         * @returns {string} Plain text preview with title and optional header
         */
        preview(includeHeader = true) {
            const title = this.titleText || 'Untitled';
            const lines = [`* title: ${this.shorty(title, 30)}`];

            if (includeHeader && this.headerText) {
                lines.push(`* header: ${this.shorty(this.headerText, 30)}`);
            }

            return lines.join('\n');
        }

        /**
         * Check if this WebpageInfo is the same as another
         * @param {WebpageInfo} other - Other WebpageInfo to compare
         * @returns {boolean} True if same title and URLs
         */
        isSameAs(other) {
            return this.titleText === other.titleText &&
                this.titleUrl === other.titleUrl &&
                this.headerText === other.headerText &&
                this.headerUrl === other.headerUrl;
        }

        /**
         * Get cached WebpageInfo from localStorage
         * @returns {WebpageInfo|null} Cached info or null if expired/missing
         */
        static getCached() {
            try {
                const cached = localStorage.getItem('richlinker-last-copy');
                if (!cached) return null;

                const data = JSON.parse(cached);
                const now = Date.now();

                // Check if expired (normal doubleclick speed is 500ms, but I'll do 1000 just to be
                // accessible)
                if (now - data.timestamp > 1000) {
                    localStorage.removeItem('richlinker-last-copy');
                    return null;
                }

                return new richlinker.WebpageInfo(data.webpageInfo);
            } catch (error) {
                localStorage.removeItem('richlinker-last-copy');
                return null;
            }
        }

        /**
         * Cache this WebpageInfo to localStorage
         */
        cache() {
            try {
                const data = {
                    timestamp: Date.now(),
                    webpageInfo: {
                        titleText: this.titleText,
                        titleUrl: this.titleUrl,
                        headerText: this.headerText,
                        headerUrl: this.headerUrl
                    }
                };
                localStorage.setItem('richlinker-last-copy', JSON.stringify(data));
            } catch (error) {
                console.log('DEBUG: Failed to cache WebpageInfo:', error.message);
            }
        }

        /**
         * Copy webpage info to clipboard as rich link
         * @returns {Promise<boolean>} True if successful
         */
        async toClipboard() {
            // Check if we just copied the same thing
            const cached = richlinker.WebpageInfo.getCached();
            const includeHeader = cached && this.isSameAs(cached);
            if (cached && this.isSameAs(cached)) {
                console.log('DEBUG: Same item detected - will include header on second copy');
            }

            const linkText = includeHeader && this.headerText ? `${this.titleText} #${this.headerText}` : this.titleText;
            const linkUrl = includeHeader && this.headerUrl ? this.headerUrl : this.titleUrl;

            const html = `<a href="${linkUrl}">${linkText}</a>`;
            const text = `${linkText} (${linkUrl})`;

            try {
                const success = await Clipboard.write({html, text});

                if (success) {
                    // Cache this copy for duplicate detection
                    this.cache();
                    NotificationSystem.showSuccess(`Copied rich link to clipboard\n${this.preview(includeHeader)}`);
                } else {
                    NotificationSystem.showError('Failed to copy to clipboard');
                }

                return success;
            } catch (error) {
                NotificationSystem.showDebug(`Clipboard error: ${error.message}`);
                NotificationSystem.showError('Failed to copy to clipboard');
                return false;
            }
        }
    };

    static Handler = class {
        constructor() {
            if (new.target === richlinker.Handler) {
                throw new Error('Handler is an abstract class');
            }
        }

        canHandle(url) {
            throw new Error('canHandle() must be implemented');
        }

        async extractInfo() {
            throw new Error('extractInfo() must be implemented');
        }

        async process() {
            return await this.extractInfo();
        }
    };
}

class GoogleDocsHandler extends richlinker.Handler {
    canHandle(url) {
        return url.includes('docs.google.com/document/d/');
    }

    getCurrentHeading() {
        // Look for the highlighted navigation item in Google Docs outline
        const highlightedItem = document.querySelector('.navigation-item.location-indicator-highlight');
        if (!highlightedItem) {
            return null;
        }

        // Extract the heading text from the tooltip or content
        const contentContainer = highlightedItem.querySelector('.navigation-item-content-container');
        const content = highlightedItem.querySelector('.navigation-item-content');

        // Try to get text from data-tooltip first (most reliable)
        if (content && content.dataset.tooltip) {
            return content.dataset.tooltip;
        }

        // Fallback to text content
        if (content) {
            const headingText = content.textContent?.trim();
            if (headingText) {
                return headingText;
            }
        }

        // Fallback to aria-label
        if (contentContainer) {
            const ariaLabel = contentContainer.getAttribute('aria-label');
            if (ariaLabel) {
                // Remove the level information (e.g., "Team rituals level 2" -> "Team rituals")
                return ariaLabel.replace(/ level \d+$/, '');
            }
        }

        return null;
    }

    async extractInfo() {
        const titleText = document.title.replace(' - Google Docs', '') || 'Untitled Document';
        const titleUrl = window.location.href.split('#')[0];
        const headerUrl = window.location.href;

        NotificationSystem.showDebug(`GoogleDocsHandler: Extracting from title="${titleText}"`);
        NotificationSystem.showDebug(`GoogleDocsHandler: titleUrl="${titleUrl}"`);

        // Get current heading from navigation, if available
        let headerText = null;
        try {
            headerText = this.getCurrentHeading();
            if (headerText) {
                NotificationSystem.showDebug(`GoogleDocsHandler: Found heading="${headerText}"`);
            } else {
                NotificationSystem.showDebug('GoogleDocsHandler: No current heading detected');
            }
        } catch (error) {
            console.error("GoogleDocsHandler: Failed to retrieve current heading", error);
            NotificationSystem.showDebug(`GoogleDocsHandler: Heading extraction failed: ${error.message}`);
            headerUrl = null;
        }

        return new richlinker.WebpageInfo({titleText, titleUrl, headerText, headerUrl});
    }
}

class AtlassianHandler extends richlinker.Handler {
    canHandle(url) {
        return url.includes('.atlassian.net/');
    }

    async extractInfo() {
        const titleText = document.title || 'Atlassian Page';
        const titleUrl = window.location.href;

        // TODO: Add issue number, project, status extraction for headerText/headerUrl

        return new richlinker.WebpageInfo({titleText, titleUrl});
    }
}

class AirtableListableHandler extends richlinker.Handler {
    canHandle(url) {
        // You must be in the '✅ Task Detail (Sidesheet+Fullscreen, Global, v2025.04.24)' page for
        // this to work
        const good_page = "✅ Task Detail (Sidesheet+Fullscreen, Global, v2025.04.24) page"
        const is_good_page = url.includes('https://airtable.com/apptivTqaoebkrmV1/pagYS8GHSAS9swLLI/')
        console.log(`AirtableListableHandler: ${is_good_page ? "YES ✅" : "NOT ❌"} in page='${good_page}'`)
        return is_good_page
    }

    async extractInfo() {
        // Get the record title from the page
        const titleElement = document.querySelector('.heading-size-default')
        if (!titleElement) {
            console.log("Failed to find title element")
        }
        const titleText = titleElement.textContent.trim()
        const titleUrl = window.location.href;

        NotificationSystem.showDebug(`AirtableListableHandler: Extracting from title="${titleText}"`);
        NotificationSystem.showDebug(`AirtableListableHandler: titleUrl="${titleUrl}"`);

        return new richlinker.WebpageInfo({titleText, titleUrl, headerText: null, headerUrl: null});
    }
}

const handlers = [
    new GoogleDocsHandler(),
    new AtlassianHandler(),
    new AirtableListableHandler()
];

async function execute() {
    // Enable debug mode at start
    NotificationSystem.turnOnDebugMode();

    // Dispatch to proper handler
    const currentUrl = window.location.href;
    NotificationSystem.showDebug(`RichLinker: Processing URL: ${currentUrl}`);

    const handler = handlers.find(h => h.canHandle(currentUrl));
    if (!handler) {
        NotificationSystem.showDebug('RichLinker: No matching handler found');
        NotificationSystem.showError('No handler found for this page');
        return;
    }

    NotificationSystem.showDebug(`RichLinker: Using handler: ${handler.constructor.name}`);

    const webpageInfo = await handler.process();
    NotificationSystem.showDebug(`RichLinker: Extracted info - Title: "${webpageInfo.titleText}", Header: "${webpageInfo.headerText || 'none'}"`);

    // Copy to clipboard
    await webpageInfo.toClipboard();
}

try {
    execute();
} catch (error) {
    console.error('RichLinker error:', error);
    NotificationSystem.showError('Failed to extract page information');
}
