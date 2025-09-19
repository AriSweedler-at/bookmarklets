/**
 * Clipboard utility class for reading and writing clipboard content
 */
class Clipboard {
    /**
     * Write content to clipboard with rich text support
     * @param {Object} content - Content to write
     * @param {string} content.html - HTML formatted content
     * @param {string} content.text - Plain text content
     * @returns {Promise<boolean>} True if successful
     */
    static async write(content) {
        const {html, text} = content;

        console.log('INFO: Clipboard.write called with:', {html, text});

        if (!navigator.clipboard) {
            console.log('DEBUG: navigator.clipboard not available');
            return false;
        }

        // Try rich text first if both formats provided
        if (html && text && navigator.clipboard.write && window.ClipboardItem) {
            console.log('DEBUG: Attempting rich text clipboard write');
            try {
                const clipboardItem = new ClipboardItem({
                    'text/html': new Blob([html], {type: 'text/html'}),
                    'text/plain': new Blob([text], {type: 'text/plain'})
                });

                await navigator.clipboard.write([clipboardItem]);
                console.log('DEBUG: Rich text clipboard write succeeded');
                return true;
            } catch (error) {
                console.log('DEBUG: Rich text clipboard write failed:', error.message);

                // Try focus workaround if document not focused
                if (error.message && error.message.includes('Document is not focused')) {
                    console.log('DEBUG: Attempting simple focus workaround for rich text');
                    try {
                        window.focus();
                        await new Promise(resolve => setTimeout(resolve, 100));

                        // Recreate clipboardItem for retry
                        const retryClipboardItem = new ClipboardItem({
                            'text/html': new Blob([html], {type: 'text/html'}),
                            'text/plain': new Blob([text], {type: 'text/plain'})
                        });
                        await navigator.clipboard.write([retryClipboardItem]);
                        console.log('DEBUG: Rich text clipboard write succeeded after focus workaround');
                        return true;
                    } catch (retryError) {
                        console.log('DEBUG: Rich text clipboard write still failed after focus:', retryError.message);
                    }
                }
                // Fall through to plain text
            }
        } else {
            console.log('DEBUG: Rich text clipboard not supported - missing:', {
                html: !!html,
                text: !!text,
                write: !!navigator.clipboard.write,
                ClipboardItem: !!window.ClipboardItem
            });
        }

        // Fall back to plain text only
        if (navigator.clipboard.writeText) {
            console.log('DEBUG: Attempting plain text clipboard write');
            try {
                await navigator.clipboard.writeText(text || html);
                console.log('DEBUG: Plain text clipboard write succeeded');
                return true;
            } catch (error) {
                console.log('DEBUG: Plain text clipboard write failed:', error.message);

                // Try focus workaround if document not focused
                if (error.message && error.message.includes('Document is not focused')) {
                    console.log('DEBUG: Attempting simple focus workaround for plain text');
                    try {
                        window.focus();
                        await new Promise(resolve => setTimeout(resolve, 100));

                        await navigator.clipboard.writeText(text || html);
                        console.log('DEBUG: Plain text clipboard write succeeded after focus workaround');
                        return true;
                    } catch (retryError) {
                        console.log('DEBUG: Plain text clipboard write still failed after focus:', retryError.message);
                        return false;
                    }
                }
                return false;
            }
        }

        console.log('DEBUG: No clipboard methods available');
        return false;
    }


    /**
     * Read content from clipboard
     * @returns {Promise<Object|null>} Object with html and text properties, or null if failed
     */
    static async read() {
        if (!navigator.clipboard) {
            return null;
        }

        let result = {html: null, text: null};

        // Try to read rich content first
        if (navigator.clipboard.read) {
            try {
                const clipboardItems = await navigator.clipboard.read();

                for (const clipboardItem of clipboardItems) {
                    // Try to get HTML content
                    if (clipboardItem.types.includes('text/html')) {
                        try {
                            const htmlBlob = await clipboardItem.getType('text/html');
                            result.html = await htmlBlob.text();
                        } catch (error) {
                            // Continue to try other formats
                        }
                    }

                    // Try to get plain text content
                    if (clipboardItem.types.includes('text/plain')) {
                        try {
                            const textBlob = await clipboardItem.getType('text/plain');
                            result.text = await textBlob.text();
                        } catch (error) {
                            // Continue to try other formats
                        }
                    }
                }
            } catch (error) {
                // Fall through to readText fallback
            }
        }

        // Fallback to plain text only
        if (!result.text && navigator.clipboard.readText) {
            try {
                result.text = await navigator.clipboard.readText();
            } catch (error) {
                return null;
            }
        }

        // Return null if we got nothing
        if (!result.html && !result.text) {
            return null;
        }

        return result;
    }
}
