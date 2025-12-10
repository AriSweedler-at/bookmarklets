//ARI_include notifications.js
//ARI_include clipboard.js

class richlinker {
    static WebpageInfo = class {
        constructor({titleText, titleUrl, headerText = null, headerUrl = null, style = "normal"}) {
            this.titleText = titleText;
            this.titleUrl = titleUrl;
            this.headerText = headerText;
            this.headerUrl = headerUrl;
            this.style = style; // "normal" or "spinnaker"
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
         * Get the link text and URL based on style and whether to include header
         * @param {boolean} includeHeader - Whether to include header in the link
         * @returns {{linkText: string, linkUrl: string}} The formatted link text and URL
         */
        getLinkTextAndUrl(includeHeader) {
            switch (this.style) {
                case "spinnaker": {
                    // Spinnaker style: first click shows header, second click shows base (inverted)
                    const useHeader = !includeHeader;

                    if (useHeader && this.headerText) {
                        // Format: "spinnaker: ${headerText}" (strip everything before '#')
                        return {
                            linkText: `spinnaker: ${this.headerText}`,
                            linkUrl: this.headerUrl
                        };
                    }

                    return {
                        linkText: this.titleText,
                        linkUrl: this.titleUrl
                    };
                }

                case "normal": {
                    // Normal style: first click shows base, second click includes header
                    const useHeader = includeHeader;
                    const linkText = useHeader && this.headerText ? `${this.titleText} #${this.headerText}` : this.titleText;
                    const linkUrl = useHeader && this.headerUrl ? this.headerUrl : this.titleUrl;

                    return { linkText, linkUrl };
                }

                default: {
                    console.error(`Unknown style: "${this.style}". Falling back to "normal" style.`);
                    const useHeader = includeHeader;
                    const linkText = useHeader && this.headerText ? `${this.titleText} #${this.headerText}` : this.titleText;
                    const linkUrl = useHeader && this.headerUrl ? this.headerUrl : this.titleUrl;

                    return { linkText, linkUrl };
                }
            }
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

            // Get link text and URL based on style
            const { linkText, linkUrl } = this.getLinkTextAndUrl(includeHeader);

            const html = `<a href="${linkUrl}">${linkText}</a>`;
            const text = `${linkText} (${linkUrl})`;

            try {
                const success = await Clipboard.write({html, text});

                if (success) {
                    // Cache this copy for duplicate detection
                    this.cache();
                    // For notification preview, show header if it's included in the link
                    const showHeaderInPreview = linkUrl === this.headerUrl;
                    NotificationSystem.showSuccess(`Copied rich link to clipboard\n${this.preview(showHeaderInPreview)}`);
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

class SpinnakerHandler extends richlinker.Handler {
    parseSpinnakerUrl(url) {
        // Remove protocol and split by '/'
        // Expected format: https://spinnaker.k8s.{env}.cloud/#/applications/{app}/executions[/{executionId}]

        // Check domain pattern
        if (!url.includes('spinnaker.k8s.') || !url.includes('.cloud')) {
            return null;
        }

        // Split URL into parts
        const hashIndex = url.indexOf('#/');
        if (hashIndex === -1) return null;

        const pathPart = url.substring(hashIndex + 2); // Skip '#/'
        const parts = pathPart.split('/');

        // Validate structure: ['applications', '{app}', 'executions', ...optional executionId]
        if (parts.length < 3) return null;
        if (parts[0] !== 'applications') return null;
        if (parts[2] !== 'executions') return null;

        const applicationName = parts[1];
        if (!applicationName) return null;

        // Check if there's an execution ID (4th part before any query params)
        let executionId = null;
        if (parts.length >= 4 && parts[3]) {
            // Remove query params from execution ID
            executionId = parts[3].split('?')[0];
        }

        return {
            applicationName,
            executionId
        };
    }

    extractPipelineName(executionId) {
        try {
            const executionDiv = document.getElementById(`execution-${executionId}`);
            if (!executionDiv) {
                NotificationSystem.showDebug(`SpinnakerHandler: Could not find execution div for ID ${executionId}`);
                return null;
            }

            NotificationSystem.showDebug('SpinnakerHandler: Found execution div');

            // Traverse up to find the execution-group (the top-level container with showing-details)
            const executionGroup = executionDiv.closest('.execution-group');
            if (!executionGroup) {
                NotificationSystem.showDebug('SpinnakerHandler: Could not find execution-group');
                return null;
            }

            NotificationSystem.showDebug('SpinnakerHandler: Found execution-group');

            // The h4 is inside the sticky-header at the top of the execution-group
            const titleElement = executionGroup.querySelector('h4.execution-group-title');
            if (!titleElement) {
                NotificationSystem.showDebug('SpinnakerHandler: Could not find h4.execution-group-title');
                return null;
            }

            const pipelineName = titleElement.textContent.trim();
            NotificationSystem.showDebug(`SpinnakerHandler: Found pipeline name: ${pipelineName}`);
            return pipelineName;
        } catch (error) {
            NotificationSystem.showDebug(`SpinnakerHandler: Error extracting pipeline name: ${error.message}`);
            return null;
        }
    }

    canHandle(url) {
        return this.parseSpinnakerUrl(url) !== null;
    }

    async extractInfo() {
        const currentUrl = window.location.href;
        NotificationSystem.showDebug(`SpinnakerHandler: Processing URL: ${currentUrl}`);

        const parsed = this.parseSpinnakerUrl(currentUrl);
        if (!parsed) {
            NotificationSystem.showDebug('SpinnakerHandler: Failed to parse URL');
            throw new Error('Could not parse Spinnaker URL');
        }

        const { applicationName, executionId } = parsed;
        NotificationSystem.showDebug(`SpinnakerHandler: Application name: ${applicationName}`);

        // If no execution ID, we're on the executions list page
        if (!executionId) {
            NotificationSystem.showDebug('SpinnakerHandler: On executions list page');
            const titleUrl = currentUrl.split('?')[0]; // Clean any query params
            return new richlinker.WebpageInfo({
                titleText: applicationName,
                titleUrl: titleUrl,
                headerText: null,
                headerUrl: null
            });
        }

        NotificationSystem.showDebug(`SpinnakerHandler: Execution ID: ${executionId}`);

        // Extract pipeline name from DOM
        const pipelineName = this.extractPipelineName(executionId);

        // Use spinnaker style:
        // First click: show header as "spinnaker: ${pipelineName}" with full execution URL
        // Second click: show base application name with executions list URL
        const baseUrl = currentUrl.split('/executions')[0] + '/executions';

        return new richlinker.WebpageInfo({
            titleText: applicationName,
            titleUrl: baseUrl,
            headerText: pipelineName,
            headerUrl: currentUrl,
            style: "spinnaker"
        });
    }
}

const handlers = [
    new GoogleDocsHandler(),
    new AtlassianHandler(),
    new AirtableHandler(),
    new GitHubHandler(),
    new SpinnakerHandler(),
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
