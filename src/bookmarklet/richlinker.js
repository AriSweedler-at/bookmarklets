//ARI_include notifications.js
//ARI_include clipboard.js

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

        canHandle(_) {
            throw new Error('canHandle() must be implemented');
        }

        async extractInfo() {
            throw new Error('extractInfo() must be implemented');
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
        return url.includes('.atlassian.net/wiki/spaces/');
    }

    async extractInfo() {
        const rawTitle = document.title || 'Atlassian Wiki Page';
        const titleUrl = window.location.href;

        // Remove "space name" and "Confluence" suffix by splitting on ' - ' and removing last 2 elements
        const titleParts = rawTitle.split(' - ');
        const titleText = titleParts.length > 2 ? titleParts.slice(0, -2).join(' - ') : rawTitle;

        NotificationSystem.showDebug(`AtlassianHandler: Raw title="${rawTitle}"`);
        NotificationSystem.showDebug(`AtlassianHandler: Cleaned title="${titleText}"`);
        NotificationSystem.showDebug(`AtlassianHandler: titleUrl="${titleUrl}"`);

        return new richlinker.WebpageInfo({titleText, titleUrl, headerText: null, headerUrl: null});
    }
}

class AirtableHandler extends richlinker.Handler {
    canHandle(url) {
        // You must be in one of these pages for this to work
        const airtable_applications = [
            {
                base: "listable",
                url: "https://airtable.com/apptivTqaoebkrmV1/pagYS8GHSAS9swLLI",
                page: "✅ Task Detail (Sidesheet+Fullscreen, Global, v2025.04.24) page",
            },
            {
                base: "escalations",
                url: "https://airtable.com/appWh5G6JXbHDKC2b/paguOM7Eb387ZUnRE" ,
                page: "UNKNOWN",
            },
        ]

        // We can handle it if we find a match
        const match = airtable_applications.find(app => url.startsWith(app.url));
        if (match) {
            console.log(
                `AirtableHandler: YES ✅ matched | base='${match.base}' page='${match.page}'`
            );
            return true;
        }

        console.log(`AirtableHandler: NOT ❌ matched in any known page`);
        return false;
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

class GitHubHandler extends richlinker.Handler {
    canHandle(url) {
        // Match GitHub PR URLs: github.com/org/repo/pull/number
        if (!url.includes('github.com/')) {
            return false;
        }
        
        const parts = url.split('/');
        // Expected format: https://github.com/org/repo/pull/number
        // parts: ['https:', '', 'github.com', 'org', 'repo', 'pull', 'number', ...]
        
        if (parts.length < 7) {
            return false;
        }
        
        // Check that we have github.com, org, repo, 'pull', and a number
        const domain = parts[2];
        const org = parts[3];
        const repo = parts[4];
        const pullKeyword = parts[5];
        const prNumber = parts[6];
        
        return domain === 'github.com' && 
               org && org !== '' &&
               repo && repo !== '' &&
               pullKeyword === 'pull' &&
               prNumber && /^\d+$/.test(prNumber);
    }

    async extractInfo() {
        const titleText = document.querySelector('.gh-header-title').textContent.trim();
        return new richlinker.WebpageInfo({titleText, titleUrl: window.location.href, headerText: null, headerUrl: null});
    }
}

const handlers = [
    new GoogleDocsHandler(),
    new AtlassianHandler(),
    new AirtableHandler(),
    new GitHubHandler(),
];

async function execute() {
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

    const webpageInfo = await handler.extractInfo();
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
