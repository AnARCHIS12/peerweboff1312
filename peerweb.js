/// <reference path="./types.d.ts" />
// @ts-check

// APACHE-2.0 BRANISLAV DJALIC

// Logging configuration
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
};

// Detect environment
const IS_PRODUCTION = window.location.hostname !== 'localhost' && !window.location.hostname.startsWith('127.');
const CURRENT_LOG_LEVEL = IS_PRODUCTION ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG;

// Configuration constants
const PEERWEB_CONFIG = {
    // Processing thresholds
    EARLY_PROCESS_THRESHOLD: 0.95, // 95% download threshold for early processing
    ESSENTIAL_FILES_THRESHOLD: 0.8, // 80% of files must be ready
    FILE_PROGRESS_THRESHOLD_REGULAR: 0.8, // 80% for regular files
    FILE_PROGRESS_THRESHOLD_ESSENTIAL: 0.9, // 90% for essential files (HTML/CSS)
    FILE_PROGRESS_THRESHOLD_MEDIA: 0.7, // 70% for media files

    // Base timeouts (will be scaled dynamically)
    PROCESSING_TIMEOUT_BASE: 15000, // 15 seconds base timeout
    PROCESSING_TIMEOUT_PER_MB: 2000, // Add 2 seconds per MB
    PROCESSING_TIMEOUT_PER_FILE: 500, // Add 500ms per file
    PROCESSING_TIMEOUT_MIN: 15000, // Minimum 15 seconds
    PROCESSING_TIMEOUT_MAX: 300000, // Maximum 5 minutes
    
    SW_WAIT_TIMEOUT_BASE: 10000, // 10 seconds base timeout for SW
    SW_WAIT_TIMEOUT_PER_MB: 1000, // Add 1 second per MB
    SW_WAIT_TIMEOUT_MIN: 10000, // Minimum 10 seconds
    SW_WAIT_TIMEOUT_MAX: 120000, // Maximum 2 minutes
    
    SCRIPT_LOAD_TIMEOUT: 10000, // 10 seconds timeout for script loading
    READY_CHECK_INTERVAL: 500, // 500ms interval for checking ready state
    INIT_DELAY: 100, // 100ms delay before initializing site viewer
    INIT_RETRY_DELAY: 1000, // 1 second delay before retrying initialization
    
    FILE_TIMEOUT_BASE: 5000, // 5 seconds base timeout
    FILE_TIMEOUT_PER_MB: 1000, // Add 1 second per MB of file
    FILE_TIMEOUT_MIN: 5000, // Minimum 5 seconds
    FILE_TIMEOUT_MAX: 60000, // Maximum 1 minute
    
    FILE_RETRY_DELAY: 2000, // 2 seconds delay before retrying file
    FILE_RETRY_TIMEOUT: 15000, // 15 seconds timeout for retry

    // Cache settings
    CACHE_MAX_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds

    // Media detection
    MEDIA_CACHE_SIZE_THRESHOLD: 102400, // 100KB threshold for media caching

    // Piece size thresholds (in bytes)
    PIECE_SIZE_THRESHOLD_16MB: 16 * 1024 * 1024,
    PIECE_SIZE_THRESHOLD_256MB: 256 * 1024 * 1024,
    PIECE_SIZE_THRESHOLD_1GB: 1024 * 1024 * 1024,
    PIECE_SIZE_16KB: 16 * 1024,
    PIECE_SIZE_32KB: 32 * 1024,
    PIECE_SIZE_256KB: 256 * 1024,
    PIECE_SIZE_1MB: 1024 * 1024
};

/**
 * Toast Notification System
 * Provides non-blocking notifications with different severity levels
 */
class ToastNotification {
    constructor() {
        this.container = document.getElementById('toast-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
        this.toasts = new Map();
    }

    /**
     * Show a toast notification
     * @param {string} message - Main message to display
     * @param {string} type - Type of notification: 'success', 'error', 'warning', 'info'
     * @param {string} title - Optional title for the notification
     * @param {number} duration - Duration in milliseconds (0 for persistent)
     */
    show(message, type = 'info', title = '', duration = 5000) {
        const id = Date.now() + Math.random();
        const toast = this.createToast(id, message, type, title);

        this.container.appendChild(toast);
        this.toasts.set(id, toast);

        // Auto-dismiss if duration is set
        if (duration > 0) {
            setTimeout(() => this.dismiss(id), duration);
        }

        return id;
    }

    /**
     * Create toast element
     */
    createToast(id, message, type, title) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.dataset.toastId = String(id);

        const icon = this.getIcon(type);
        const toastTitle = title || this.getDefaultTitle(type);

        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <div class="toast-title">${this.escapeHtml(toastTitle)}</div>
                <div class="toast-message">${this.escapeHtml(message)}</div>
            </div>
            <button class="toast-close" aria-label="Close">&times;</button>
        `;

        // Add close button handler
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.dismiss(id));
        }

        return toast;
    }

    /**
     * Dismiss a toast notification
     */
    dismiss(id) {
        const toast = this.toasts.get(id);
        if (!toast) return;

        toast.classList.add('toast-exit');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            this.toasts.delete(id);
        }, 300); // Match animation duration
    }

    /**
     * Get icon for toast type
     */
    getIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    /**
     * Get default title for toast type
     */
    getDefaultTitle(type) {
        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Info'
        };
        return titles[type] || titles.info;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Convenience methods
    success(message, title = '', duration = 5000) {
        return this.show(message, 'success', title, duration);
    }

    error(message, title = '', duration = 7000) {
        return this.show(message, 'error', title, duration);
    }

    warning(message, title = '', duration = 6000) {
        return this.show(message, 'warning', title, duration);
    }

    info(message, title = '', duration = 5000) {
        return this.show(message, 'info', title, duration);
    }

    /**
     * Dismiss all toasts
     */
    dismissAll() {
        this.toasts.forEach((_toast, id) => this.dismiss(id));
    }
}

class PeerWeb {
    constructor() {
        this.client = null;
        this.debug = false;
        this.cache = new PeerWebCache();
        this.toast = new ToastNotification(); // Toast notification system
        this.currentSiteData = null;
        this.currentHash = null;
        this.serviceWorkerReady = false;
        this.clientReady = false;
        this.librariesLoaded = false;
        this.currentTorrentSize = 0; // Track torrent size for dynamic timeouts
        this.currentFileCount = 0; // Track file count for dynamic timeouts
        this.objectURLs = []; // Track created object URLs to prevent memory leaks
        this.timeouts = []; // Track setTimeout IDs for cleanup
        this.processingInProgress = false; // Flag to prevent race conditions
        this.processingTimeout = null; // Track processing timeout
        this.trackers = [
            'wss://tracker.btorrent.xyz',
            'wss://tracker.openwebtorrent.com',
            'udp://tracker.leechers-paradise.org:6969',
            'udp://tracker.coppersurfer.tk:6969',
            'udp://tracker.opentrackr.org:1337',
            'udp://explodie.org:6969',
            'udp://tracker.empire-js.us:1337'
        ];

        this.init();
    }

    async init() {
        try {
            await this.loadRequiredLibraries();
            await this.initializeWebTorrent();
            await this.registerServiceWorker();
            this.setupEventListeners();
            this.setupCleanupHandlers();
            this.checkURL();
            this.updateDebugToggle();
        } catch (error) {
            console.error('PeerWeb initialization failed:', error);
            this.showError('Failed to initialize PeerWeb: ' + error.message);
        }
    }

    async loadRequiredLibraries() {
        this.log('Loading required libraries...');

        // Load WebTorrent from local scripts folder
        if (typeof WebTorrent === 'undefined') {
            await this.loadScript('scripts/webtorrent.min.js');
            this.log('WebTorrent library loaded');
        }

        // Load DOMPurify from local scripts folder
        if (typeof DOMPurify === 'undefined') {
            await this.loadScript('scripts/purify.min.js');
            this.log('DOMPurify library loaded');
        }

        // Verify libraries are available
        if (typeof WebTorrent === 'undefined') {
            throw new Error('Failed to load WebTorrent library');
        }

        if (typeof DOMPurify === 'undefined') {
            throw new Error('Failed to load DOMPurify library');
        }

        this.librariesLoaded = true;
        this.log('All required libraries loaded successfully');
    }

    loadScript(src, integrity = null, crossorigin = null) {
        return new Promise((resolve, reject) => {
            // Check if script is already loaded
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = true;

            // Add SRI integrity check if provided
            if (integrity) {
                script.integrity = integrity;
                this.log(`Adding integrity check: ${integrity.substring(0, 20)}...`);
            }

            // Add crossorigin attribute if provided
            if (crossorigin) {
                script.crossOrigin = crossorigin;
            }

            script.onload = () => {
                this.log(`Script loaded: ${src}`);
                resolve();
            };

            script.onerror = (_error) => {
                this.log(`Failed to load script: ${src}`);
                if (integrity) {
                    this.log('Integrity check may have failed. Trying without integrity...');
                    // Fallback: try loading without integrity check
                    script.integrity = '';
                    script.crossOrigin = '';
                }
                reject(new Error(`Failed to load script: ${src}`));
            };

            // Add to head
            document.head.appendChild(script);

            // Fallback timeout
            let loaded = false;
            const originalOnload = script.onload;
            script.onload = (...args) => {
                loaded = true;
                if (originalOnload) {
                    /** @type {Function} */ (originalOnload).apply(script, args);
                }
            };
            setTimeout(() => {
                if (!loaded) {
                    reject(new Error(`Script load timeout: ${src}`));
                }
            }, PEERWEB_CONFIG.SCRIPT_LOAD_TIMEOUT);
        });
    }

    async initializeWebTorrent() {
        if (!this.librariesLoaded) {
            throw new Error('Libraries not loaded yet');
        }

        return new Promise((resolve) => {
            try {
                this.client = new WebTorrent();

                this.client.on('error', (err) => {
                    this.log('WebTorrent error: ' + err.message);
                    console.error('WebTorrent error:', err);
                });

                this.client.on('ready', () => {
                    this.clientReady = true;
                    this.log('WebTorrent client ready');
                    resolve();
                });

                // Fallback in case ready event doesn't fire
                setTimeout(() => {
                    if (!this.clientReady) {
                        this.clientReady = true;
                        this.log('WebTorrent client ready (timeout fallback)');
                        resolve();
                    }
                }, 2000);
            } catch (error) {
                this.log('Error initializing WebTorrent: ' + error.message);
                console.error('WebTorrent initialization error:', error);
                // Create a mock client to prevent crashes
                this.client = {
                    add: () => console.error('WebTorrent not available'),
                    seed: () => console.error('WebTorrent not available')
                };
                resolve();
            }
        });
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                // Only unregister PeerWeb-specific service worker if it exists
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    // Check if this is our service worker by inspecting the script URL
                    if (registration.active && registration.active.scriptURL.includes('peerweb-sw.js')) {
                        await registration.unregister();
                        this.log('Unregistered existing PeerWeb service worker');
                    }
                }

                // Register new service worker with specific scope
                const registration = await navigator.serviceWorker.register('./peerweb-sw.js', {
                    scope: '/'
                });
                this.log('Service Worker registered successfully');

                // Wait for service worker to be ready
                await navigator.serviceWorker.ready;
                this.serviceWorkerReady = true;
                this.log('Service Worker is ready');

                // Listen for messages from service worker
                // In setupEventListeners, update the service worker message listener:
                navigator.serviceWorker.addEventListener('message', (event) => {
                    this.log(`SW Message: ${event.data.type}`);
                    if (event.data.type === 'RESOURCE_REQUEST') {
                        this.handleServiceWorkerResourceRequest(
                            event.data.url,
                            event.data.requestId,
                            event.data.filePath // Use the normalized file path from SW
                        );
                    }
                });

                // Force activation
                if (registration.waiting) {
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                }
            } catch (error) {
                this.log('Service Worker registration failed: ' + error.message);
                console.error('SW Error:', error);
            }
        } else {
            this.log('Service Workers not supported');
        }
    }

    handleServiceWorkerResourceRequest(url, requestId, providedFilePath = null) {
        this.log(`SW requesting: ${url} (ID: ${requestId})`);

        if (!this.currentSiteData) {
            this.log('No site data available');
            this.sendToServiceWorker('RESOURCE_RESPONSE', { requestId, url, data: null });
            return;
        }

        let filePath = providedFilePath;

        if (!filePath) {
            // Extract path from URL (fallback to old method)
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/');
            filePath = pathParts.slice(3).join('/');
            if (!filePath || filePath === '') {
                filePath = 'index.html';
            }
        }

        this.log(`Looking for file: "${filePath}"`);

        const file = this.findFileInSiteData(filePath);
        if (file) {
            this.log(`Found file: ${filePath} (${file.size} bytes, ${file.type})`);

            // Convert ArrayBuffer to Array for structured cloning
            const dataArray = Array.from(new Uint8Array(file.content));

            this.sendToServiceWorker('RESOURCE_RESPONSE', {
                requestId,
                url,
                data: dataArray,
                contentType: file.type
            });
        } else {
            this.log(`File not found: ${filePath}`);
            this.log(`Available files: ${Object.keys(this.currentSiteData).join(', ')}`);
            this.sendToServiceWorker('RESOURCE_RESPONSE', { requestId, url, data: null });
        }
    }

    async sendToServiceWorker(type, data) {
        // Ensure we have a controller
        if (!navigator.serviceWorker.controller) {
            this.log('No SW controller, waiting for controller...');
            // Wait for controller to be available
            await this.waitForController();
        }

        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type, ...data });
            this.log(`Sent to SW: ${type}`);
        } else {
            this.log('ERROR: Still no SW controller available after waiting');
        }
    }

    async waitForController(timeout = null) {
        if (navigator.serviceWorker.controller) {
            return;
        }

        // Use dynamic timeout if not specified
        if (timeout === null) {
            timeout = this.calculateSWWaitTimeout();
            this.log(`Dynamic SW wait timeout: ${(timeout / 1000).toFixed(1)} seconds`);
        }

        return new Promise((resolve) => {
            const startTime = Date.now();
            
            // Listen for controllerchange event
            const handleControllerChange = () => {
                if (navigator.serviceWorker.controller) {
                    this.log('SW controller changed and is now available');
                    navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
                    resolve();
                }
            };
            
            navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
            
            const checkController = () => {
                if (navigator.serviceWorker.controller) {
                    this.log('SW controller is now available');
                    navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    this.log('Timeout waiting for SW controller');
                    navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
                    
                    // Check if there's a waiting worker and try to activate it
                    navigator.serviceWorker.ready.then(registration => {
                        if (registration.waiting) {
                            this.log('Found waiting service worker, attempting to activate...');
                            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                            // Give it a moment to activate
                            setTimeout(() => {
                                if (navigator.serviceWorker.controller) {
                                    this.log('Service worker activated successfully');
                                } else {
                                    this.log('Service worker still not active, reloading page...');
                                    // Last resort: reload the page
                                    window.location.reload();
                                }
                                resolve();
                            }, 1000);
                        } else {
                            resolve(); // Resolve anyway to avoid blocking
                        }
                    });
                } else {
                    setTimeout(checkController, 100); // Check every 100ms
                }
            };
            checkController();
        });
    }

    /**
     * Calculate dynamic processing timeout based on torrent characteristics
     * @param {any} torrent - WebTorrent torrent object
     * @returns {number} - Timeout in milliseconds
     */
    calculateProcessingTimeout(torrent) {
        const sizeMB = torrent.length / (1024 * 1024);
        const fileCount = torrent.files.length;
        
        // Base timeout + additional time based on size and file count
        let timeout = PEERWEB_CONFIG.PROCESSING_TIMEOUT_BASE;
        timeout += sizeMB * PEERWEB_CONFIG.PROCESSING_TIMEOUT_PER_MB;
        timeout += fileCount * PEERWEB_CONFIG.PROCESSING_TIMEOUT_PER_FILE;
        
        // Clamp to min/max
        timeout = Math.max(PEERWEB_CONFIG.PROCESSING_TIMEOUT_MIN, timeout);
        timeout = Math.min(PEERWEB_CONFIG.PROCESSING_TIMEOUT_MAX, timeout);
        
        return Math.floor(timeout);
    }

    /**
     * Calculate dynamic service worker wait timeout
     * @returns {number} - Timeout in milliseconds
     */
    calculateSWWaitTimeout() {
        if (this.currentTorrentSize === 0) {
            return PEERWEB_CONFIG.SW_WAIT_TIMEOUT_BASE;
        }
        
        const sizeMB = this.currentTorrentSize / (1024 * 1024);
        
        let timeout = PEERWEB_CONFIG.SW_WAIT_TIMEOUT_BASE;
        timeout += sizeMB * PEERWEB_CONFIG.SW_WAIT_TIMEOUT_PER_MB;
        
        // Clamp to min/max
        timeout = Math.max(PEERWEB_CONFIG.SW_WAIT_TIMEOUT_MIN, timeout);
        timeout = Math.min(PEERWEB_CONFIG.SW_WAIT_TIMEOUT_MAX, timeout);
        
        return Math.floor(timeout);
    }

    /**
     * Calculate dynamic file timeout based on file size
     * @param {any} file - WebTorrent file object
     * @returns {number} - Timeout in milliseconds
     */
    calculateFileTimeout(file) {
        const sizeMB = file.length / (1024 * 1024);
        
        let timeout = PEERWEB_CONFIG.FILE_TIMEOUT_BASE;
        timeout += sizeMB * PEERWEB_CONFIG.FILE_TIMEOUT_PER_MB;
        
        // Clamp to min/max
        timeout = Math.max(PEERWEB_CONFIG.FILE_TIMEOUT_MIN, timeout);
        timeout = Math.min(PEERWEB_CONFIG.FILE_TIMEOUT_MAX, timeout);
        
        return Math.floor(timeout);
    }

    findFileInSiteData(requestedPath) {
        if (!this.currentSiteData) {
            return null;
        }

        this.log(`Searching for: "${requestedPath}"`);

        // Clean the requested path
        let cleanPath = requestedPath;
        if (cleanPath.startsWith('./')) {
            cleanPath = cleanPath.substring(2);
        }
        if (cleanPath.startsWith('/')) {
            cleanPath = cleanPath.substring(1);
        }

        // Try exact matches first
        const exactMatches = [requestedPath, cleanPath];
        for (const path of exactMatches) {
            if (this.currentSiteData[path]) {
                this.log(`Exact match: ${path}`);
                return this.currentSiteData[path];
            }
        }

        // Try all file keys for partial matches
        const allKeys = Object.keys(this.currentSiteData);
        this.log(`All available files: ${allKeys.join(', ')}`);

        // Try matching by filename
        const fileName = cleanPath.split('/').pop();
        for (const key of allKeys) {
            const keyFileName = key.split('/').pop();
            if (keyFileName === fileName) {
                this.log(`Filename match: ${key}`);
                return this.currentSiteData[key];
            }
        }

        // Try matching by ending
        for (const key of allKeys) {
            if (key.endsWith(cleanPath) || cleanPath.endsWith(key)) {
                this.log(`Partial match: ${key}`);
                return this.currentSiteData[key];
            }
        }

        return null;
    }

    setupEventListeners() {
        // Debug toggle
        const debugToggle = document.getElementById('debug-toggle');
        if (debugToggle) {
            debugToggle.addEventListener('click', () => {
                this.toggleDebug();
            });
        }

        // Clear cache
        const clearCache = document.getElementById('clear-cache');
        if (clearCache) {
            clearCache.addEventListener('click', () => {
                this.clearCache();
            });
        }

        // Create torrent
        const createTorrent = document.getElementById('create-torrent');
        if (createTorrent) {
            createTorrent.addEventListener('click', () => {
                this.showTorrentModal();
            });
        }

        // Load site
        const loadSite = document.getElementById('load-site');
        if (loadSite) {
            loadSite.addEventListener('click', () => {
                const hashInput = /** @type {HTMLInputElement} */ (document.getElementById('hash-input'));
                const hash = hashInput.value.trim();
                if (hash) {
                    this.loadSite(hash);
                }
            });
        }

        // Hash input enter key
        const hashInput = /** @type {HTMLInputElement} */ (document.getElementById('hash-input'));
        if (hashInput) {
            hashInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const target = /** @type {HTMLInputElement} */ (e.target);
                    const hash = target.value.trim();
                    if (hash) {
                        this.loadSite(hash);
                    }
                }
            });
        }

        // Back to PeerWeb
        const backButton = document.getElementById('back-to-peerweb');
        if (backButton) {
            backButton.addEventListener('click', () => {
                this.showMainContent();
            });
        }

        // Close debug panel
        const closeDebug = document.getElementById('close-debug');
        if (closeDebug) {
            closeDebug.addEventListener('click', () => {
                document.getElementById('debug-panel').classList.add('hidden');
            });
        }

        // Modal controls
        const closeModal = document.getElementById('close-modal');
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                this.hideTorrentModal();
            });
        }

        // File input
        const fileInput = /** @type {HTMLInputElement} */ (document.getElementById('file-input'));
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelection(e);
            });
        }

        // Create torrent button
        const createTorrentBtn = document.getElementById('create-torrent-btn');
        if (createTorrentBtn) {
            createTorrentBtn.addEventListener('click', () => {
                this.createTorrent();
            });
        }

        // Copy URL
        const copyUrl = document.getElementById('copy-url');
        if (copyUrl) {
            copyUrl.addEventListener('click', () => {
                const url = document.getElementById('created-url').textContent;
                navigator.clipboard.writeText(url);
                this.toast.success('You can now share this link with others!', 'URL Copied to Clipboard');
            });
        }

        // Setup drag and drop and quick upload
        this.setupDragAndDrop();
        this.setupQuickUpload();
    }

    setupDragAndDrop() {
        const dropZone = document.getElementById('drop-zone');
        const folderInput = document.getElementById('folder-input');
        const torrentInput = document.getElementById('torrent-input');

        if (!dropZone) {
            return;
        } // Exit if drop zone doesn't exist

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // Highlight drop zone when item is dragged over it
        ['dragenter', 'dragover'].forEach((eventName) => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach((eventName) => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('drag-over');
            });
        });

        // Handle dropped files
        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer ? Array.from(e.dataTransfer.files) : [];
            this.handleDroppedFiles(files);
        });

        // Folder selection button
        const selectFolder = document.getElementById('select-folder');
        if (selectFolder && folderInput) {
            selectFolder.addEventListener('click', () => {
                folderInput.click();
            });
        }

        // Torrent file selection button
        const selectTorrent = document.getElementById('select-torrent');
        if (selectTorrent && torrentInput) {
            selectTorrent.addEventListener('click', () => {
                torrentInput.click();
            });
        }

        // Handle folder input
        if (folderInput) {
            folderInput.addEventListener('change', (e) => {
                const target = /** @type {HTMLInputElement} */ (e.target);
                const files = target.files ? Array.from(target.files) : [];
                this.handleDroppedFiles(files);
            });
        }

        // Handle torrent input
        if (torrentInput) {
            torrentInput.addEventListener('change', (e) => {
                const target = /** @type {HTMLInputElement} */ (e.target);
                const files = target.files ? Array.from(target.files) : [];
                this.handleDroppedFiles(files);
            });
        }
    }

    setupQuickUpload() {
        // Open site button
        const openSite = document.getElementById('open-site');
        if (openSite) {
            openSite.addEventListener('click', () => {
                const hash = document.getElementById('result-hash').textContent;
                const url = `${window.location.origin}${window.location.pathname}?orc=${hash}`;
                window.open(url, '_blank');
            });
        }

        // Copy link button
        const copyLink = document.getElementById('copy-link');
        if (copyLink) {
            copyLink.addEventListener('click', () => {
                const url = document.getElementById('result-url').textContent;
                navigator.clipboard.writeText(url).then(() => {
                    const button = document.getElementById('copy-link');
                    const originalText = button.textContent;
                    button.textContent = '✅ Copied!';
                    setTimeout(() => {
                        button.textContent = originalText;
                    }, 2000);
                });
            });
        }

        // Desktop client links
        document.querySelectorAll('.desktop-link').forEach((link) => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = /** @type {HTMLElement} */ (e.target);
                const os = target.dataset.os;
                this.downloadDesktopClient(os);
            });
        });
    }

    handleDroppedFiles(files) {
        if (files.length === 0) {
            return;
        }

        this.log(`Dropped ${files.length} files`);

        // Check if WebTorrent client is ready
        if (!this.clientReady || !this.client) {
            this.log('WebTorrent client not ready, waiting...');
            // Show a user-friendly message
            this.showUploadProgress('WebTorrent client is loading...');
            setTimeout(() => {
                this.hideUploadProgress();
                this.handleDroppedFiles(files);
            }, 1000);
            return;
        }

        // Look for torrent files specifically
        const torrentFiles = files.filter(
            (file) => file.name.toLowerCase().endsWith('.torrent') && file.type === 'application/x-bittorrent'
        );

        // If we don't find files with the right MIME type, check by extension only
        if (torrentFiles.length === 0) {
            const torrentFilesByExt = files.filter((file) => file.name.toLowerCase().endsWith('.torrent'));

            if (torrentFilesByExt.length > 0) {
                this.log(`Found ${torrentFilesByExt.length} .torrent files (by extension)`);
                this.handleTorrentFile(torrentFilesByExt[0]);
                return;
            }
        } else {
            this.log(`Found ${torrentFiles.length} .torrent files (by MIME type)`);
            this.handleTorrentFile(torrentFiles[0]);
            return;
        }

        // Check if files have a common directory structure (folder upload)
        if (files.length > 1) {
            this.handleFolderUpload(files);
            return;
        }

        // Single file - check if it's HTML
        const singleFile = files[0];
        if (singleFile.name.toLowerCase().endsWith('.html')) {
            this.handleFolderUpload(files);
            return;
        }

        // If it's a single file that might be a torrent but doesn't have the right extension
        if (files.length === 1 && singleFile.size < 1024 * 1024) {
            // Less than 1MB
            this.log("Single small file detected, checking if it's a torrent...");
            this.readFileAsArrayBuffer(singleFile)
                .then((buffer) => {
                    if (this.isValidTorrentBuffer(buffer)) {
                        this.log('File appears to be a torrent despite extension');
                        this.handleTorrentFile(singleFile);
                    } else {
                        this.toast.warning(
                            "This doesn't appear to be a valid torrent file.\n\nPlease drop:\n• A website folder (containing HTML files)\n• A valid .torrent file",
                            'Invalid File'
                        );
                    }
                })
                .catch((error) => {
                    this.log(`Error checking file: ${error.message}`);
                    this.toast.warning(
                        "Couldn't read the dropped file.\n\nPlease try again with:\n• A website folder (containing HTML files)\n• A valid .torrent file",
                        'Unable to Process File'
                    );
                });
            return;
        }

        this.toast.warning(
            'Please drop:\n• A website folder (containing HTML files)\n• A .torrent file to load an existing site',
            'Unsupported File Type'
        );
    }

    async handleTorrentFile(torrentFile) {
        this.log(`Loading torrent file: ${torrentFile.name} (${torrentFile.size} bytes)`);

        if (!this.clientReady || !this.client) {
            this.toast.info(
                "The WebTorrent client is initializing.\nPlease wait a moment and try again.\n\nTip: You'll see the interface become active when ready.",
                'PeerWeb is Still Loading'
            );
            return;
        }

        this.showUploadProgress('Reading torrent file...');

        try {
            // Read the torrent file as ArrayBuffer
            const buffer = await this.readFileAsArrayBuffer(torrentFile);
            const bufferSize = buffer instanceof ArrayBuffer ? buffer.byteLength : buffer.length;
            this.log(`Torrent file read: ${bufferSize} bytes`);

            // Validate that this looks like a torrent file
            if (!this.isValidTorrentBuffer(buffer)) {
                throw new Error('Invalid torrent file format');
            }

            this.log('Torrent file validation passed, adding to WebTorrent...');

            // Try different approaches to add the torrent
            this.addTorrentWithFallback(buffer, torrentFile);
        } catch (error) {
            this.log(`Error loading torrent: ${error.message}`);
            console.error('Torrent loading error:', error);
            this.hideUploadProgress();

            if (error.message.includes('Invalid torrent identifier')) {
                alert(
                    "❌ Invalid Torrent File\n\nThe file appears to be corrupted or incompatible with WebTorrent.\n\n🔧 Troubleshooting:\n• Try creating a new torrent using the Advanced Torrent Creator\n• Verify the .torrent file isn't damaged\n• Make sure it's a BitTorrent v1 torrent (v2 not yet supported)"
                );
            } else if (error.message.includes('Invalid torrent file format')) {
                alert(
                    "❌ Not a Valid Torrent\n\nThis file doesn't have a valid torrent file structure.\n\n🔧 Troubleshooting:\n• Ensure the file has a .torrent extension\n• Try re-downloading the torrent file\n• Use the PeerWeb Advanced Torrent Creator to generate a new one"
                );
            } else {
                alert(
                    '❌ Torrent Loading Error\n\n' +
                        error.message +
                        "\n\n🔧 Troubleshooting:\n• Create a new torrent using the Advanced Torrent Creator\n• Verify your internet connection is stable\n• Check that the file isn't corrupted\n• Make sure you have enough available memory"
                );
            }
        }
    }

    addTorrentWithFallback(buffer, originalFile) {
        let attempts = 0;
        const maxAttempts = 3;

        const tryAddTorrent = (torrentData, method) => {
            attempts++;
            this.log(`Attempt ${attempts}: Trying to add torrent using ${method}`);

            try {
                this.client.add(
                    torrentData,
                    {
                        announce: this.trackers,
                        path: '/tmp/webtorrent/' // Temporary download path
                    },
                    (torrent) => {
                        this.log(`Torrent loaded successfully with ${method}: ${torrent.infoHash}`);
                        this.log(`Torrent name: ${torrent.name || 'Unknown'}`);
                        this.log(`Number of files: ${torrent.files.length}`);

                        // Log file names for debugging
                        torrent.files.forEach((file, index) => {
                            this.log(`File ${index + 1}: ${file.name} (${file.length} bytes)`);
                        });

                        // Show result immediately for existing torrents
                        this.showUploadResult(torrent.infoHash, buffer, torrent);
                        this.hideUploadProgress();

                        // Start downloading the torrent content
                        torrent.files.forEach((file) => file.select());
                        this.log(`Started downloading ${torrent.files.length} files`);
                    }
                );
            } catch (error) {
                this.log(`Failed with ${method}: ${error.message}`);

                if (attempts < maxAttempts) {
                    // Try next method
                    if (attempts === 1) {
                        // Method 2: Try with Uint8Array
                        const uint8Array = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
                        tryAddTorrent(uint8Array, 'Uint8Array');
                    } else if (attempts === 2) {
                        // Method 3: Try parsing as blob and reading again
                        this.tryBlobMethod(originalFile);
                    }
                } else {
                    // All methods failed
                    this.hideUploadProgress();
                    throw new Error(`All methods failed. Last error: ${error.message}`);
                }
            }
        };

        // Method 1: Try with ArrayBuffer directly
        tryAddTorrent(buffer, 'ArrayBuffer');
    }

    async tryBlobMethod(originalFile) {
        try {
            this.log('Trying blob method...');

            // Create a blob from the file
            const blob = new Blob([originalFile], { type: 'application/x-bittorrent' });

            // Read the blob as ArrayBuffer
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const result = /** @type {FileReader} */ (event.target).result;
                    const buffer = /** @type {ArrayBuffer} */ (result);
                    const uint8Array = new Uint8Array(buffer);

                    this.log(`Blob method: read ${uint8Array.length} bytes`);

                    this.client.add(
                        uint8Array,
                        {
                            announce: this.trackers
                        },
                        (torrent) => {
                            this.log(`Torrent loaded successfully with blob method: ${torrent.infoHash}`);
                            this.showUploadResult(torrent.infoHash, buffer, torrent);
                            this.hideUploadProgress();

                            torrent.files.forEach((file) => file.select());
                        }
                    );
                } catch (error) {
                    this.log(`Blob method failed: ${error.message}`);
                    this.hideUploadProgress();
                    throw error;
                }
            };

            reader.onerror = () => {
                this.log('Blob method: FileReader error');
                this.hideUploadProgress();
                throw new Error('Failed to read file with blob method');
            };

            reader.readAsArrayBuffer(blob);
        } catch (error) {
            this.log(`Blob method error: ${error.message}`);
            this.hideUploadProgress();
            throw error;
        }
    }

    isValidTorrentBuffer(buffer) {
        try {
            // Convert ArrayBuffer to Uint8Array for checking
            const uint8Array = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;

            this.log(`Validating torrent buffer: ${uint8Array.length} bytes`);

            // Torrent files should be at least 50 bytes
            if (uint8Array.length < 50) {
                this.log('Torrent file too small');
                return false;
            }

            // Check if it starts with 'd' (bencoded dictionary)
            if (uint8Array[0] !== 0x64) {
                // 'd' in ASCII
                this.log(`Invalid start byte: 0x${uint8Array[0].toString(16)} (expected 0x64 for 'd')`);
                return false;
            }

            // Check if it ends with 'e' (end of bencoded dictionary)
            if (uint8Array[uint8Array.length - 1] !== 0x65) {
                // 'e' in ASCII
                this.log(
                    `Invalid end byte: 0x${uint8Array[uint8Array.length - 1].toString(16)} (expected 0x65 for 'e')`
                );
                // Don't fail on this as some torrents might have padding
            }

            // Try to find key torrent fields in the binary data
            const dataString = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);

            // Log first 200 characters for debugging
            this.log(`Torrent content preview: ${dataString.substring(0, 200)}`);

            // Check for required fields
            const hasAnnounce = dataString.includes('announce') || this.findBencodedString(uint8Array, 'announce');
            const hasInfo = dataString.includes('info') || this.findBencodedString(uint8Array, 'info');

            this.log(`Torrent validation - announce: ${hasAnnounce}, info: ${hasInfo}`);

            if (!hasAnnounce || !hasInfo) {
                this.log('Missing required torrent fields (announce or info)');
                return false;
            }

            // Additional check: look for piece length and pieces
            const hasPieceLength =
                dataString.includes('piece length') || this.findBencodedString(uint8Array, 'piece length');
            const hasPieces = dataString.includes('pieces') || this.findBencodedString(uint8Array, 'pieces');

            this.log(`Additional validation - piece length: ${hasPieceLength}, pieces: ${hasPieces}`);

            this.log('Torrent file validation passed');
            return true;
        } catch (error) {
            this.log(`Torrent validation error: ${error.message}`);
            return false;
        }
    }

    // Helper method to find bencoded strings
    findBencodedString(uint8Array, searchString) {
        try {
            // In bencoded format, strings are prefixed with their length
            // e.g., "announce" would be "8:announce"
            const searchBytes = new TextEncoder().encode(`${searchString.length}:${searchString}`);

            // Simple search for the byte pattern
            for (let i = 0; i <= uint8Array.length - searchBytes.length; i++) {
                let match = true;
                for (let j = 0; j < searchBytes.length; j++) {
                    if (uint8Array[i + j] !== searchBytes[j]) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    return true;
                }
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            if (!file || !(file instanceof File)) {
                reject(new Error('Invalid file object'));
                return;
            }

            this.log(`Reading file: ${file.name}, size: ${file.size}, type: ${file.type}`);

            const reader = new FileReader();

            reader.onload = (event) => {
                const target = /** @type {FileReader} */ (event.target);
                const result = /** @type {ArrayBuffer} */ (target.result);
                if (result && result.byteLength > 0) {
                    this.log(`File read successfully: ${result.byteLength} bytes`);
                    resolve(result);
                } else {
                    reject(new Error('File reading returned empty result'));
                }
            };

            reader.onerror = () => {
                const error = reader.error || new Error('Unknown FileReader error');
                this.log(`FileReader error: ${error.message}`);
                reject(new Error('File reading failed: ' + error.message));
            };

            reader.onabort = () => {
                this.log('FileReader aborted');
                reject(new Error('File reading was aborted'));
            };

            // Add progress tracking for large files
            reader.onprogress = (event) => {
                if (event.lengthComputable) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    this.log(`Reading file: ${progress}%`);
                }
            };

            try {
                reader.readAsArrayBuffer(file);
            } catch (error) {
                this.log(`Failed to start file reading: ${error.message}`);
                reject(new Error('Failed to start file reading: ' + error.message));
            }
        });
    }

    async handleFolderUpload(files) {
        this.log(`Processing ${files.length} files for upload`);

        if (!this.clientReady || !this.client) {
            this.toast.info('Please wait for the WebTorrent client to initialize and try again.', 'Client Not Ready');
            return;
        }

        // Check for index.html
        const hasIndex = files.some((file) =>
            (file.webkitRelativePath || file.name).toLowerCase().includes('index.html')
        );

        if (!hasIndex) {
            if (!confirm('No index.html found. Continue anyway? (Site may not load properly)')) {
                return;
            }
        }

        this.showUploadProgress('Creating torrent...');

        try {
            // Use the same improved torrent creation logic
            this.client.seed(
                files,
                {
                    announce: this.trackers,
                    name: this.generateTorrentName(files),
                    comment: 'Created with PeerWeb - Decentralized Website Hosting',
                    createdBy: 'PeerWeb v1.0',
                    private: false,
                    pieceLength: this.calculateOptimalPieceLength(files)
                },
                (torrent) => {
                    this.log(`Torrent created: ${torrent.infoHash}`);
                    this.log(`Torrent name: ${torrent.name}`);

                    // Show result in quick upload area
                    this.showUploadResult(torrent.infoHash, torrent.torrentFile, torrent);
                    this.hideUploadProgress();
                }
            );
        } catch (error) {
            this.log(`Error creating torrent: ${error.message}`);
            console.error('Seeding error:', error);
            this.hideUploadProgress();
            alert('Error creating torrent: ' + error.message);
        }
    }

    showUploadProgress(message) {
        const progressEl = document.getElementById('upload-progress');
        const textEl = document.getElementById('upload-progress-text');
        const resultEl = document.getElementById('upload-result');

        if (progressEl) {
            progressEl.classList.remove('hidden');
        }
        if (textEl) {
            textEl.textContent = message;
        }
        if (resultEl) {
            resultEl.classList.add('hidden');
        }
    }

    hideUploadProgress() {
        const progressEl = document.getElementById('upload-progress');
        if (progressEl) {
            progressEl.classList.add('hidden');
        }
    }

    showUploadResult(hash, torrentFile, torrent) {
        // Sanitize hash before displaying
        const sanitizedHash = this.sanitizeHash(hash);
        const url = `${window.location.origin}${window.location.pathname}?orc=${sanitizedHash}`;

        const hashEl = document.getElementById('result-hash');
        const urlEl = document.getElementById('result-url');
        const resultEl = document.getElementById('upload-result');

        if (hashEl) {
            hashEl.textContent = sanitizedHash;
        }
        if (urlEl) {
            urlEl.textContent = url;
        }

        if (torrentFile) {
            const downloadLink = /** @type {HTMLAnchorElement} */ (document.getElementById('download-torrent-file'));
            if (downloadLink) {
                // Revoke previous URL if exists
                if (downloadLink.href && downloadLink.href.startsWith('blob:')) {
                    URL.revokeObjectURL(downloadLink.href);
                }
                downloadLink.href = this.createTrackedObjectURL(new Blob([torrentFile]));
                downloadLink.download = `website-${sanitizedHash.substring(0, 8)}.torrent`;
                downloadLink.style.display = 'inline-flex';
            }
        } else {
            const downloadLink = document.getElementById('download-torrent-file');
            if (downloadLink) {
                downloadLink.style.display = 'none';
            }
        }

        if (resultEl) {
            resultEl.classList.remove('hidden');
        }

        // Update seeding stats if available
        if (torrent) {
            this.updateSeedingStats(torrent);
        }
    }

    updateSeedingStats(torrent) {
        torrent.on('upload', () => {
            this.log(`Uploaded: ${this.formatBytes(torrent.uploaded)} to ${torrent.numPeers} peers`);
        });
    }

    downloadDesktopClient(os) {
        // Desktop clients are under development
        // TODO: Update URLs when desktop clients are released
        const osNames = {
            windows: 'Windows',
            mac: 'macOS',
            linux: 'Linux'
        };

        const osName = osNames[os] || os;
        this.log(`Desktop client requested for ${osName}`);
        alert(
            `🚀 PeerWeb Desktop for ${osName} - Coming Soon!\n\nDesktop clients are currently under development.\n\n💡 In the meantime:\n• Keep this browser tab open to continue hosting\n• Bookmark this page for easy access\n• Your site will remain active as long as this tab is open`
        );
    }

    // Helper method to create and track object URLs
    createTrackedObjectURL(blob) {
        const url = URL.createObjectURL(blob);
        this.objectURLs.push(url);
        this.log(`Created object URL (total: ${this.objectURLs.length})`);
        return url;
    }

    // Helper method to revoke all tracked object URLs
    revokeAllObjectURLs() {
        this.objectURLs.forEach((url) => {
            try {
                URL.revokeObjectURL(url);
            } catch (e) {
                this.log(`Error revoking URL: ${e.message}`);
            }
        });
        this.log(`Revoked ${this.objectURLs.length} object URLs`);
        this.objectURLs = [];
    }

    /**
     * Create a tracked setTimeout that can be cleaned up later
     * @param {Function} callback - Function to execute
     * @param {number} delay - Delay in milliseconds
     * @returns {number} - Timeout ID
     */
    createTimeout(callback, delay) {
        const timeoutId = setTimeout(() => {
            // Remove from tracked timeouts when it executes
            this.timeouts = this.timeouts.filter((id) => id !== timeoutId);
            callback();
        }, delay);
        this.timeouts.push(timeoutId);
        this.log(`Created timeout ${timeoutId} (total: ${this.timeouts.length})`);
        return timeoutId;
    }

    /**
     * Clear a specific tracked timeout
     * @param {number} timeoutId - Timeout ID to clear
     */
    clearTrackedTimeout(timeoutId) {
        if (timeoutId) {
            clearTimeout(timeoutId);
            this.timeouts = this.timeouts.filter((id) => id !== timeoutId);
            this.log(`Cleared timeout ${timeoutId}`);
        }
    }

    /**
     * Clear all tracked timeouts
     */
    clearAllTimeouts() {
        this.timeouts.forEach((timeoutId) => {
            try {
                clearTimeout(timeoutId);
            } catch (e) {
                this.log(`Error clearing timeout ${timeoutId}: ${e.message}`);
            }
        });
        this.log(`Cleared ${this.timeouts.length} timeouts`);
        this.timeouts = [];
    }

    /**
     * Setup cleanup handlers for page unload
     */
    setupCleanupHandlers() {
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // Also cleanup on visibility change (tab backgrounded)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.log('Page hidden, performing partial cleanup');
                // Don't cleanup everything, just reduce memory usage
            }
        });
    }

    /**
     * Cleanup method to free resources
     */
    cleanup() {
        this.log('Performing cleanup...');
        this.clearAllTimeouts();
        this.revokeAllObjectURLs();

        // Clear processing timeout specifically
        if (this.processingTimeout) {
            clearTimeout(this.processingTimeout);
            this.processingTimeout = null;
        }

        this.log('Cleanup complete');
    }

    checkURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const orcHash = urlParams.get('orc');
        const debugMode = urlParams.get('debug') === 'true';

        if (debugMode) {
            this.debug = true;
            this.updateDebugToggle();
            this.showDebugPanel();
        }

        if (orcHash) {
            // Wait for all components to be ready before loading
            const checkReady = () => {
                if (this.serviceWorkerReady && this.clientReady && this.librariesLoaded) {
                    this.loadSite(orcHash);
                } else {
                    setTimeout(checkReady, PEERWEB_CONFIG.READY_CHECK_INTERVAL);
                }
            };
            checkReady();
        }
    }

    async loadSite(hash) {
        // Sanitize hash first to prevent XSS
        const sanitizedHash = this.sanitizeHash(hash);
        this.log(`Loading site with hash: ${sanitizedHash}`);

        if (!this.serviceWorkerReady) {
            this.log('Service worker not ready, waiting...');
            setTimeout(() => this.loadSite(sanitizedHash), PEERWEB_CONFIG.READY_CHECK_INTERVAL);
            return;
        }

        if (!this.clientReady || !this.client) {
            this.log('WebTorrent client not ready, waiting...');
            setTimeout(() => this.loadSite(sanitizedHash), PEERWEB_CONFIG.READY_CHECK_INTERVAL);
            return;
        }

        // Validate hash format
        if (!this.isValidTorrentHash(sanitizedHash)) {
            alert(
                '❌ Invalid Hash Format\n\nThe torrent hash must be a 40-character hexadecimal string.\n\n🔧 Format Requirements:\n• Exactly 40 characters long\n• Only contains numbers 0-9 and letters A-F\n\nExample: d4f5e6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3'
            );
            return;
        }

        this.currentHash = sanitizedHash;

        // Check cache first
        const cachedSite = await this.cache.get(sanitizedHash);
        if (cachedSite) {
            this.log('Loading from cache...');
            this.displayCachedSite(cachedSite, sanitizedHash);
            return;
        }

        this.showLoadingOverlay();

        const magnetURI = `magnet:?xt=urn:btih:${sanitizedHash}&tr=${this.trackers.join('&tr=')}`;
        this.log(`Magnet URI: ${magnetURI}`);

        try {
            this.client.add(magnetURI, async (torrent) => {
                this.log(`Torrent added: ${torrent.name || 'Unknown'}`);
                this.updatePeerStats(torrent);

                torrent.on('download', () => {
                    this.updateProgress(torrent);
                    this.updatePeerStats(torrent);

                    // Check if we have enough data to process the site
                    if (!this.processingInProgress && this.shouldProcessSiteEarly(torrent)) {
                        this.log('Sufficient data downloaded, processing site early...');
                        this.processingInProgress = true;

                        // Clear any existing timeout
                        if (this.processingTimeout) {
                            clearTimeout(this.processingTimeout);
                            this.processingTimeout = null;
                        }

                        this.processTorrentEarly(torrent, sanitizedHash);
                    }
                });

                torrent.on('done', async () => {
                    this.log('Download completed (100%)!');
                    if (!this.processingInProgress) {
                        this.processingInProgress = true;
                        if (this.processingTimeout) {
                            clearTimeout(this.processingTimeout);
                            this.processingTimeout = null;
                        }
                        await this.processTorrent(torrent, sanitizedHash);
                    }
                });

                torrent.on('error', (error) => {
                    this.log(`Torrent error: ${error.message}`);
                    this.hideLoadingOverlay();
                    alert(
                        '❌ Torrent Load Error\n\n' +
                            error.message +
                            '\n\n🔧 Troubleshooting:\n• Check your internet connection\n• Verify the hash is correct\n• Ensure the torrent has active seeders\n• Try again in a few moments'
                    );
                });

                // Select all files for download
                torrent.files.forEach((file) => file.select());
                this.log(`Selected ${torrent.files.length} files for download`);

                // Calculate torrent characteristics for dynamic timeouts
                this.currentTorrentSize = torrent.length;
                this.currentFileCount = torrent.files.length;
                const torrentSizeMB = this.currentTorrentSize / (1024 * 1024);
                
                this.log(`Torrent size: ${this.formatBytes(this.currentTorrentSize)} (${torrentSizeMB.toFixed(2)} MB)`);
                this.log(`File count: ${this.currentFileCount}`);
                
                // Find index file
                const indexFile = this.findIndexFile(torrent.files);
                if (!indexFile) {
                    this.log('No index.html found!');
                    this.hideLoadingOverlay();
                    alert(
                        "❌ Missing index.html\n\nThis torrent doesn't contain an index.html file.\n\n🔧 Requirements:\n• Every PeerWeb site must have an index.html file\n• Make sure your website folder includes this file\n• Re-create the torrent with a proper website structure"
                    );
                    return;
                }
                this.log(`Found index file: ${indexFile.name}`);

                // Calculate dynamic timeout based on torrent size and file count
                const dynamicTimeout = this.calculateProcessingTimeout(torrent);
                this.log(`Dynamic processing timeout set to: ${(dynamicTimeout / 1000).toFixed(1)} seconds`);
                
                // Set a timeout to process the site even if it doesn't reach 100%
                this.processingTimeout = setTimeout(() => {
                    if (!this.processingInProgress && torrent.progress > 0.8) {
                        this.log('Processing site due to timeout (80%+ downloaded)');
                        this.processingInProgress = true;
                        this.processTorrentEarly(torrent, sanitizedHash);
                    }
                }, dynamicTimeout);
            });
        } catch (error) {
            this.log(`Error adding torrent: ${error.message}`);
            this.hideLoadingOverlay();
            alert(
                '❌ Failed to Add Torrent\n\n' +
                    error.message +
                    "\n\n🔧 Troubleshooting:\n• Verify the hash format is correct (40 hex characters)\n• Check that seeders are available\n• Ensure your firewall isn't blocking WebRTC connections\n• Try loading the torrent again"
            );
        }
    }

    /**
     * Sanitize hash to prevent XSS attacks
     * @param {string} hash - Hash to sanitize
     * @returns {string} - Sanitized hash (only hex characters)
     */
    sanitizeHash(hash) {
        if (!hash || typeof hash !== 'string') {
            return '';
        }
        // Remove any non-hexadecimal characters
        return hash.replace(/[^a-fA-F0-9]/g, '').toLowerCase();
    }

    // Add hash validation method
    isValidTorrentHash(hash) {
        if (!hash || typeof hash !== 'string') {
            return false;
        }

        // Remove any whitespace
        hash = hash.trim();

        // Should be exactly 40 characters (SHA-1 hash in hex)
        if (hash.length !== 40) {
            this.log(`Invalid hash length: ${hash.length}, expected 40`);
            return false;
        }

        // Should only contain hexadecimal characters
        const hexRegex = /^[a-fA-F0-9]+$/;
        if (!hexRegex.test(hash)) {
            this.log('Hash contains non-hexadecimal characters');
            return false;
        }

        return true;
    }

    shouldProcessSiteEarly(torrent) {
        // Process if we have threshold or more
        if (torrent.progress >= PEERWEB_CONFIG.EARLY_PROCESS_THRESHOLD) {
            this.log(`Progress at ${Math.round(torrent.progress * 100)}%, processing early`);
            return true;
        }

        // Or if we have the essential files (index.html and most others)
        const indexFile = this.findIndexFile(torrent.files);
        if (indexFile && this.hasEssentialFiles(torrent)) {
            this.log('Essential files available, processing early');
            return true;
        }

        return false;
    }

    hasEssentialFiles(torrent) {
        let availableFiles = 0;
        const totalFiles = torrent.files.length;

        // Check how many files have been downloaded
        torrent.files.forEach((file) => {
            if (file.progress >= 0.9) {
                // File is 90%+ downloaded
                availableFiles++;
            }
        });

        const availabilityRatio = availableFiles / totalFiles;
        this.log(`File availability: ${availableFiles}/${totalFiles} (${Math.round(availabilityRatio * 100)}%)`);

        // If we have threshold of files at 90%+ completion, that's good enough
        return availabilityRatio >= PEERWEB_CONFIG.ESSENTIAL_FILES_THRESHOLD;
    }

    // Update the processTorrentEarly method to prioritize media files
    async processTorrentEarly(torrent, hash) {
        this.log('Processing torrent early (before 100% completion)');

        const siteData = {};
        const files = torrent.files;
        let processedFiles = 0;
        let failedFiles = 0;

        // Sort files by priority (media files last, essential files first)
        const sortedFiles = files.sort((a, b) => {
            const aIsMedia = this.isMediaFile(a.name);
            const bIsMedia = this.isMediaFile(b.name);
            const aIsEssential =
                a.name.toLowerCase().includes('index.html') ||
                a.name.toLowerCase().endsWith('.css') ||
                a.name.toLowerCase().endsWith('.js');
            const bIsEssential =
                b.name.toLowerCase().includes('index.html') ||
                b.name.toLowerCase().endsWith('.css') ||
                b.name.toLowerCase().endsWith('.js');

            // Essential files first
            if (aIsEssential && !bIsEssential) {
                return -1;
            }
            if (!aIsEssential && bIsEssential) {
                return 1;
            }

            // Media files last
            if (aIsMedia && !bIsMedia) {
                return 1;
            }
            if (!aIsMedia && bIsMedia) {
                return -1;
            }

            return 0;
        });

        this.log(`Processing ${sortedFiles.length} files (early processing)...`);

        // Process files with different thresholds based on type
        for (const file of sortedFiles) {
            try {
                const isMedia = this.isMediaFile(file.name);
                const isEssential =
                    file.name.toLowerCase().includes('index.html') || file.name.toLowerCase().endsWith('.css');

                // Different download thresholds for different file types
                let requiredProgress = PEERWEB_CONFIG.FILE_PROGRESS_THRESHOLD_REGULAR;
                if (isEssential) {
                    requiredProgress = PEERWEB_CONFIG.FILE_PROGRESS_THRESHOLD_ESSENTIAL;
                } else if (isMedia) {
                    requiredProgress = PEERWEB_CONFIG.FILE_PROGRESS_THRESHOLD_MEDIA;
                }

                this.log(
                    `Processing file: ${file.name} (${Math.round(file.progress * 100)}% complete, need ${Math.round(requiredProgress * 100)}%)`
                );

                if (file.progress < requiredProgress) {
                    if (isMedia) {
                        // For media files, we'll process them even if not fully downloaded
                        this.log(`Processing media file early: ${file.name}`);
                    } else {
                        this.log(`Skipping ${file.name} - only ${Math.round(file.progress * 100)}% downloaded`);
                        continue;
                    }
                }

                // Calculate dynamic timeout based on file size
                const dynamicTimeout = this.calculateFileTimeout(file);
                this.log(`File timeout for ${file.name}: ${(dynamicTimeout / 1000).toFixed(1)} seconds (${this.formatBytes(file.length)})`);
                const buffer = await this.getFileBufferWithTimeout(file, dynamicTimeout);

                siteData[file.name] = {
                    content: buffer,
                    type: this.getContentType(file.name),
                    isText: this.isTextFile(file.name),
                    isMedia: isMedia,
                    size: buffer.length
                };

                processedFiles++;
                this.log(`Processed ${file.name} (${buffer.length} bytes, ${siteData[file.name].type})`);
            } catch (error) {
                failedFiles++;
                this.log(`Failed to process file ${file.name}: ${error.message}`);

                // For critical files, retry
                if (file.name.toLowerCase().includes('index.html')) {
                    try {
                        this.log(`Retrying critical file: ${file.name}`);
                        await new Promise((resolve) => setTimeout(resolve, PEERWEB_CONFIG.FILE_RETRY_DELAY));
                        const buffer = await this.getFileBufferWithTimeout(file, PEERWEB_CONFIG.FILE_RETRY_TIMEOUT);

                        siteData[file.name] = {
                            content: buffer,
                            type: this.getContentType(file.name),
                            isText: this.isTextFile(file.name),
                            isMedia: false,
                            size: buffer.length
                        };

                        processedFiles++;
                        this.log(`Successfully processed ${file.name} on retry`);
                    } catch (retryError) {
                        this.log(`Failed to process critical file ${file.name} even on retry: ${retryError.message}`);
                    }
                }
            }
        }

        this.log(`Processing complete: ${processedFiles} files processed, ${failedFiles} files failed`);

        // Check if we have enough files to display the site
        if (processedFiles === 0) {
            this.log('No files were processed successfully, waiting for more download progress...');
            return;
        }

        // Check if we have an index file
        const hasIndex = Object.keys(siteData).some((name) => name.toLowerCase().includes('index.html'));

        if (!hasIndex) {
            this.log('No index.html found in processed files, waiting for more download progress...');
            return;
        }

        this.log(`Successfully processed ${Object.keys(siteData).length} files with index.html present`);

        // Cache the site (even if incomplete)
        await this.cache.set(hash, siteData);

        // Display the site
        this.displaySite(siteData, hash);
        this.hideLoadingOverlay();

        // Reset processing flag
        this.processingInProgress = false;
    }

    // Add method to check if file is media
    isMediaFile(filename) {
        const mediaExtensions = [
            '.mp4',
            '.webm',
            '.avi',
            '.mov',
            '.wmv',
            '.flv',
            '.mkv',
            '.mp3',
            '.wav',
            '.ogg',
            '.aac',
            '.flac',
            '.m4a',
            '.gif'
        ]; // Include GIF as it can be large
        return mediaExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
    }

    // Get MIME type for file extension (consolidated from duplicate definitions)
    getContentType(filename) {
        const ext = filename.toLowerCase().split('.').pop();
        const mimeTypes = {
            // Documents
            html: 'text/html',
            htm: 'text/html',
            css: 'text/css',
            js: 'application/javascript',
            mjs: 'application/javascript',
            json: 'application/json',
            xml: 'application/xml',
            txt: 'text/plain',
            md: 'text/markdown',
            pdf: 'application/pdf',
            // Images
            png: 'image/png',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            gif: 'image/gif',
            svg: 'image/svg+xml',
            webp: 'image/webp',
            ico: 'image/x-icon',
            // Fonts
            woff: 'font/woff',
            woff2: 'font/woff2',
            ttf: 'font/ttf',
            otf: 'font/otf',
            eot: 'application/vnd.ms-fontobject',
            // Video formats
            mp4: 'video/mp4',
            webm: 'video/webm',
            avi: 'video/avi',
            mov: 'video/quicktime',
            wmv: 'video/x-ms-wmv',
            flv: 'video/x-flv',
            mkv: 'video/x-matroska',
            // Audio formats
            mp3: 'audio/mpeg',
            wav: 'audio/wav',
            ogg: 'audio/ogg',
            aac: 'audio/aac',
            flac: 'audio/flac',
            m4a: 'audio/mp4'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }

    getFileBufferWithTimeout(file, timeoutMs = 5000) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`File buffer timeout after ${timeoutMs}ms`));
            }, timeoutMs);

            file.getBuffer((err, buffer) => {
                clearTimeout(timeout);
                if (err) {
                    reject(err);
                } else {
                    resolve(buffer);
                }
            });
        });
    }

    findIndexFile(files) {
        return files.find((file) => {
            const name = file.name.toLowerCase();
            return name === 'index.html' || name.endsWith('/index.html');
        });
    }

    async processTorrent(torrent, hash) {
        const siteData = {};
        const files = torrent.files;

        this.log(`Processing ${files.length} files...`);

        // Process all files
        for (const file of files) {
            try {
                this.log(`Processing file: ${file.name}`);
                const buffer = await this.getFileBuffer(file);

                siteData[file.name] = {
                    content: buffer,
                    type: this.getContentType(file.name),
                    isText: this.isTextFile(file.name),
                    size: buffer.length
                };

                this.log(`Processed ${file.name} (${buffer.length} bytes, ${siteData[file.name].type})`);
            } catch (error) {
                this.log(`Error processing file ${file.name}: ${error.message}`);
            }
        }

        this.log(`Successfully processed ${Object.keys(siteData).length} files`);
        this.log(`File list: ${Object.keys(siteData).join(', ')}`);

        // Cache the site
        await this.cache.set(hash, siteData);

        // Display the site
        this.displaySite(siteData, hash);
        this.hideLoadingOverlay();

        // Reset processing flag
        this.processingInProgress = false;
    }

    async displayCachedSite(siteData, hash) {
        this.displaySite(siteData, hash, true);
    }

    displaySite(siteData, hash, fromCache = false) {
        this.log(`Displaying site with ${Object.keys(siteData).length} files`);
        this.log(`Files: ${Object.keys(siteData).join(', ')}`);

        // Store site data for service worker
        this.currentSiteData = siteData;
        this.currentHash = hash;

        // Find index.html
        const indexFileName = Object.keys(siteData).find((name) => {
            const lowerName = name.toLowerCase();
            return lowerName === 'index.html' || lowerName.endsWith('/index.html');
        });

        if (!indexFileName) {
            alert(
                "❌ No index.html Found\n\nThe site data doesn't contain an index.html file.\n\n🔧 This usually means:\n• The torrent is incomplete or corrupted\n• The website wasn't structured correctly\n• The download was interrupted\n\nTry reloading the site or creating a new torrent."
            );
            return;
        }

        this.log(`Found index file: ${indexFileName}`);

        // Get and process the HTML content
        const indexFile = siteData[indexFileName];
        let htmlContent = new TextDecoder().decode(indexFile.content);

        this.log('Processing HTML content...');

        // Process the HTML to update only internal resource URLs
        htmlContent = this.processHtmlForPeerWeb(htmlContent, siteData, indexFileName, hash);

        // Sanitize HTML content but preserve external links
        htmlContent = this.sanitizeHtml(htmlContent);

        this.log('HTML content processed and sanitized');
        // Note: htmlContent is processed for validation but Service Worker serves content directly
        void htmlContent; // Mark as intentionally unused

        // Create a virtual URL for the site (this is what we'll actually use)
        const siteUrl = `${window.location.origin}/peerweb-site/${hash}/`;

        this.log(`Site URL: ${siteUrl}`);

        // Wait for service worker to be fully ready, then send SITE_READY message
        // This ensures the SW is active and can receive the message
        const sendSiteReadyAndLoad = async () => {
            // Ensure SW controller is available and active
            await this.waitForController();
            
            // Notify service worker that site is ready BEFORE loading the iframe
            // This ensures the SW has the site data before any fetch requests arrive
            await this.sendToServiceWorker('SITE_READY', {
                hash,
                fileCount: Object.keys(siteData).length,
                fileList: Object.keys(siteData) // Send the list of available files
            });
            
            // Small delay to ensure the service worker receives the message before iframe loads
            setTimeout(() => {
                this.showSiteViewer(siteUrl, hash, fromCache);
            }, PEERWEB_CONFIG.INIT_DELAY);
        };
        
        sendSiteReadyAndLoad();
    }

    processHtmlForPeerWeb(html, siteData, indexFileName, hash) {
        this.log('Processing HTML for PeerWeb...');

        // Create a temporary DOM to process the HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Get the base path of the index file
        const indexBasePath = indexFileName.includes('/')
            ? indexFileName.substring(0, indexFileName.lastIndexOf('/') + 1)
            : '';

        // Process different types of elements
        const elementsToProcess = [
            { selector: 'link[href]', attr: 'href' },
            { selector: 'script[src]', attr: 'src' },
            { selector: 'img[src]', attr: 'src' },
            { selector: 'source[src]', attr: 'src' },
            { selector: 'source[srcset]', attr: 'srcset' },
            { selector: 'img[srcset]', attr: 'srcset' },
            { selector: 'video[src]', attr: 'src' },
            { selector: 'audio[src]', attr: 'src' },
            { selector: 'embed[src]', attr: 'src' },
            { selector: 'object[data]', attr: 'data' }
        ];

        elementsToProcess.forEach(({ selector, attr }) => {
            const elements = doc.querySelectorAll(selector);
            this.log(`Processing ${elements.length} elements with selector: ${selector}`);

            elements.forEach((element) => {
                const originalUrl = element.getAttribute(attr);

                if (originalUrl && this.isInternalResource(originalUrl)) {
                    // Only process internal resources
                    const newUrl = this.convertToVirtualUrl(originalUrl, indexBasePath, hash);
                    if (newUrl) {
                        element.setAttribute(attr, newUrl);
                        this.log(`Converted internal resource: ${originalUrl} -> ${newUrl}`);
                    } else {
                        this.log(`Could not convert internal resource: ${originalUrl}`);
                    }
                } else if (originalUrl) {
                    this.log(`Preserving external resource: ${originalUrl}`);
                }
            });
        });

        // Process navigation links (a elements) - convert internal links but preserve external ones
        const links = doc.querySelectorAll('a[href]');
        this.log(`Processing ${links.length} navigation links`);

        links.forEach((link) => {
            const href = link.getAttribute('href');

            if (href && this.isInternalNavigation(href)) {
                // Convert internal navigation to virtual PeerWeb URLs
                const newHref = this.convertNavigationToVirtualUrl(href, indexBasePath, hash);
                if (newHref) {
                    link.setAttribute('href', newHref);
                    this.log(`Converted internal navigation: ${href} -> ${newHref}`);
                }
            } else if (href) {
                this.log(`Preserving external link: ${href}`);
            }
        });

        // Process CSS content for @import and url() references
        const styleElements = doc.querySelectorAll('style');
        styleElements.forEach((styleElement) => {
            const cssContent = styleElement.textContent;
            const updatedCss = this.processCssContent(cssContent, indexBasePath, hash);
            styleElement.textContent = updatedCss;
        });

        return doc.documentElement.outerHTML;
    }

    isInternalResource(url) {
        if (!url) {
            return false;
        }

        // External URLs (keep as-is)
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return false;
        }

        // Data URLs (keep as-is)
        if (url.startsWith('data:')) {
            return false;
        }

        // Blob URLs (keep as-is)
        if (url.startsWith('blob:')) {
            return false;
        }

        // Protocol-relative URLs (keep as-is)
        if (url.startsWith('//')) {
            return false;
        }

        // Other protocols (keep as-is)
        if (url.includes(':') && !url.startsWith('./') && !url.startsWith('../')) {
            return false;
        }

        // Everything else is considered internal
        return true;
    }

    isInternalNavigation(href) {
        if (!href) {
            return false;
        }

        // Fragments (anchors) are internal
        if (href.startsWith('#')) {
            return true;
        }

        // External URLs
        if (href.startsWith('http://') || href.startsWith('https://')) {
            return false;
        }

        // Protocol-relative URLs
        if (href.startsWith('//')) {
            return false;
        }

        // Email links
        if (href.startsWith('mailto:')) {
            return false;
        }

        // Phone links
        if (href.startsWith('tel:')) {
            return false;
        }

        // Other protocols
        if (href.includes(':') && !href.startsWith('./') && !href.startsWith('../')) {
            return false;
        }

        // Everything else is internal navigation
        return true;
    }

    convertToVirtualUrl(originalUrl, basePath, hash) {
        // Clean the URL (remove query params and fragments for file matching)
        let cleanUrl = originalUrl.split('?')[0].split('#')[0];

        // Handle relative paths
        if (cleanUrl.startsWith('./')) {
            cleanUrl = cleanUrl.substring(2);
        }

        if (cleanUrl.startsWith('../')) {
            // Handle parent directory references
            cleanUrl = this.resolveParentPath(basePath, cleanUrl);
        } else if (!cleanUrl.startsWith('/')) {
            // Relative to current directory
            cleanUrl = basePath + cleanUrl;
        } else {
            // Absolute path, remove leading slash
            cleanUrl = cleanUrl.substring(1);
        }

        // Create virtual PeerWeb URL
        return `/peerweb-site/${hash}/${cleanUrl}`;
    }

    convertNavigationToVirtualUrl(href, basePath, hash) {
        // Handle fragment-only links
        if (href.startsWith('#')) {
            return href; // Keep fragments as-is
        }

        return this.convertToVirtualUrl(href, basePath, hash);
    }

    processCssContent(cssContent, basePath, hash) {
        // Process @import statements
        cssContent = cssContent.replace(/@import\s+['"]([^'"]+)['"]/g, (match, url) => {
            if (this.isInternalResource(url)) {
                const newUrl = this.convertToVirtualUrl(url, basePath, hash);
                return newUrl ? `@import "${newUrl}"` : match;
            }
            return match;
        });

        // Process url() references
        cssContent = cssContent.replace(/url\(['"]?([^'")\s]+)['"]?\)/g, (match, url) => {
            if (this.isInternalResource(url)) {
                const newUrl = this.convertToVirtualUrl(url, basePath, hash);
                return newUrl ? `url("${newUrl}")` : match;
            }
            return match;
        });

        return cssContent;
    }

    resolveParentPath(basePath, relativePath) {
        const baseParts = basePath.split('/').filter(Boolean);
        const relativeParts = relativePath.split('/');

        for (const part of relativeParts) {
            if (part === '..') {
                baseParts.pop();
            } else if (part !== '.') {
                baseParts.push(part);
            }
        }

        return baseParts.join('/');
    }

    sanitizeHtml(html) {
        // Use DOMPurify but preserve all attributes needed for external links
        /** @type {any} */
        const config = {
            ADD_TAGS: ['link', 'style', 'script'],
            ADD_ATTR: ['href', 'src', 'type', 'rel', 'crossorigin', 'integrity', 'target', 'data', 'srcset'],
            ALLOW_UNKNOWN_PROTOCOLS: true // Allow protocols like mailto:, tel:, etc.
        };
        return DOMPurify.sanitize(html, config);
    }

    getFileBuffer(file) {
        return new Promise((resolve, reject) => {
            file.getBuffer((err, buffer) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(buffer);
                }
            });
        });
    }

    isTextFile(filename) {
        const textExtensions = ['.html', '.css', '.js', '.json', '.txt', '.md', '.xml', '.svg'];
        return textExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
    }

    showSiteViewer(url, hash, fromCache) {
        const mainContent = document.getElementById('main-content');
        const siteViewer = document.getElementById('site-viewer');
        const currentHash = document.getElementById('current-hash');
        const cacheStatus = document.getElementById('cache-status');
        const iframe = /** @type {HTMLIFrameElement} */ (document.getElementById('site-frame'));

        if (mainContent) {
            mainContent.classList.add('hidden');
        }
        if (siteViewer) {
            siteViewer.classList.remove('hidden');
        }
        if (currentHash) {
            currentHash.textContent = `Hash: ${hash.substring(0, 16)}...`;
        }
        if (cacheStatus) {
            cacheStatus.textContent = fromCache ? '💾 From Cache' : '🌐 Fresh Download';
        }

        if (iframe) {
            iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals');

            // Add error handler for iframe
            iframe.onerror = (e) => {
                this.log('Iframe error: ' + e.message);
            };

            iframe.onload = () => {
                this.log('Iframe loaded successfully');
                
                // Block service worker registration in the embedded site
                // to prevent conflicts with PeerWeb's service worker
                try {
                    const iframeWindow = iframe.contentWindow;
                    if (iframeWindow && iframeWindow.navigator && iframeWindow.navigator.serviceWorker) {
                        // Override service worker registration
                        const originalRegister = iframeWindow.navigator.serviceWorker.register;
                        iframeWindow.navigator.serviceWorker.register = function() {
                            console.warn('[PeerWeb] Service worker registration blocked in embedded site');
                            // Return a rejected promise to maintain API compatibility
                            return Promise.reject(new Error('Service worker registration is disabled in PeerWeb embedded sites'));
                        };
                        this.log('Service worker registration blocked for embedded site');
                    }
                } catch (e) {
                    // Cross-origin or other errors - expected in some cases
                    this.log(`Could not block service worker (this is usually fine): ${e.message}`);
                }
            };

            iframe.src = url;
        }

        this.log(`Site loaded in iframe: ${url}`);
    }

    showMainContent() {
        const siteViewer = document.getElementById('site-viewer');
        const mainContent = document.getElementById('main-content');
        const iframe = /** @type {HTMLIFrameElement} */ (document.getElementById('site-frame'));

        if (siteViewer) {
            siteViewer.classList.add('hidden');
        }
        if (mainContent) {
            mainContent.classList.remove('hidden');
        }

        // Clear the iframe
        if (iframe) {
            iframe.src = '';
        }

        // Revoke all object URLs to prevent memory leaks
        this.revokeAllObjectURLs();

        // Clear current site data
        this.currentSiteData = null;
        this.currentHash = null;

        // Notify service worker
        this.sendToServiceWorker('SITE_UNLOADED', {});

        // Update URL
        window.history.pushState({}, '', window.location.pathname);
    }

    showLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
    }

    hideLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    updateProgress(torrent) {
        const progress = Math.round(torrent.progress * 100);
        const progressBar = document.getElementById('loading-progress-bar');
        const progressText = document.getElementById('loading-progress-text');

        // Show more detailed progress when near completion
        let displayProgress = progress;
        let statusText = `Downloading: ${progress}%`;

        if (progress >= 95 && progress < 100) {
            // Show file-level progress when stuck at high percentage
            const completedFiles = torrent.files.filter((f) => f.progress >= 0.9).length;
            const totalFiles = torrent.files.length;
            statusText = `Processing files: ${completedFiles}/${totalFiles} ready`;

            // Calculate a more realistic progress based on file availability
            // Prevent division by zero
            displayProgress = totalFiles > 0 ? Math.round((completedFiles / totalFiles) * 100) : 100;
        } else if (progress === 100) {
            statusText = 'Download complete!';
        }

        if (progressBar) {
            progressBar.style.width = `${displayProgress}%`;
        }
        if (progressText) {
            progressText.textContent = statusText;
        }

        // Debug panel progress
        if (this.debug) {
            const debugProgressBar = document.getElementById('progress-bar');
            const debugProgressText = document.getElementById('progress-text');
            if (debugProgressBar) {
                debugProgressBar.style.width = `${displayProgress}%`;
            }
            if (debugProgressText) {
                debugProgressText.textContent = `Progress: ${statusText}`;
            }
        }
    }

    updatePeerStats(torrent) {
        const peerStats = document.getElementById('peer-stats');

        // Calculate file completion stats
        const completedFiles = torrent.files.filter((f) => f.progress >= 0.9).length;
        const totalFiles = torrent.files.length;

        const stats = `Peers: ${torrent.numPeers} | Files: ${completedFiles}/${totalFiles} ready | Downloaded: ${this.formatBytes(torrent.downloaded)} | Speed: ${this.formatBytes(torrent.downloadSpeed)}/s`;

        if (peerStats) {
            peerStats.textContent = stats;
        }

        this.log(`Peer stats: ${stats}`);
    }

    formatBytes(bytes) {
        if (bytes === 0) {
            return '0 B';
        }
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    toggleDebug() {
        this.debug = !this.debug;
        this.updateDebugToggle();

        if (this.debug) {
            this.showDebugPanel();
        } else {
            this.hideDebugPanel();
        }
    }

    updateDebugToggle() {
        const button = document.getElementById('debug-toggle');
        if (button) {
            button.textContent = this.debug ? '🐛 Disable Debug Mode' : '🐛 Enable Debug Mode';
        }
    }

    showDebugPanel() {
        const panel = document.getElementById('debug-panel');
        if (panel) {
            panel.classList.remove('hidden');
        }
    }

    hideDebugPanel() {
        const panel = document.getElementById('debug-panel');
        if (panel) {
            panel.classList.add('hidden');
        }
    }

    /**
     * Leveled logging system
     * @param {string} message - Log message
     * @param {number} level - Log level (DEBUG, INFO, WARN, ERROR)
     */
    log(message, level = LOG_LEVELS.DEBUG) {
        if (level < CURRENT_LOG_LEVEL) {
            return; // Skip logs below current level
        }

        const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
        const levelName = levelNames[level] || 'DEBUG';
        const prefix = `[PeerWeb:${levelName}]`;

        // Console output based on level
        switch (level) {
            case LOG_LEVELS.ERROR:
                console.error(prefix, message);
                break;
            case LOG_LEVELS.WARN:
                console.warn(prefix, message);
                break;
            case LOG_LEVELS.INFO:
                console.info(prefix, message);
                break;
            default:
                console.log(prefix, message);
        }

        // Debug panel output
        if (this.debug) {
            const debugContent = document.getElementById('debug-content');
            if (debugContent) {
                const timestamp = new Date().toLocaleTimeString();
                const colorClass = level >= LOG_LEVELS.ERROR ? 'error' : level >= LOG_LEVELS.WARN ? 'warn' : '';
                debugContent.innerHTML += `<div class="${colorClass}">[${timestamp}] [${levelName}] ${message}</div>`;
                debugContent.scrollTop = debugContent.scrollHeight;
            }
        }
    }

    showError(message) {
        console.error('[PeerWeb Error]', message);
        alert('PeerWeb Error: ' + message);
    }

    async clearCache() {
        await this.cache.clear();
        this.log('Cache cleared');
        this.toast.success('All cached sites have been removed.', 'Cache Cleared Successfully');
    }

    showTorrentModal() {
        const modal = document.getElementById('torrent-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    hideTorrentModal() {
        const modal = document.getElementById('torrent-modal');
        if (modal) {
            modal.classList.add('hidden');
        }

        // Reset modal
        const fileInput = /** @type {HTMLInputElement} */ (document.getElementById('file-input'));
        const fileList = document.getElementById('file-list');
        const createBtn = /** @type {HTMLButtonElement} */ (document.getElementById('create-torrent-btn'));
        const result = document.getElementById('torrent-result');

        if (fileInput) {
            fileInput.value = '';
        }
        if (fileList) {
            fileList.innerHTML = '';
        }
        if (createBtn) {
            createBtn.disabled = true;
        }
        if (result) {
            result.classList.add('hidden');
        }
    }

    handleFileSelection(event) {
        const target = /** @type {HTMLInputElement} */ (event.target);
        const files = target.files ? Array.from(target.files) : [];
        const fileList = document.getElementById('file-list');
        const createBtn = /** @type {HTMLButtonElement} */ (document.getElementById('create-torrent-btn'));

        if (fileList) {
            fileList.innerHTML = '<h4>Selected Files:</h4>';
            files.forEach((file) => {
                const div = document.createElement('div');
                div.textContent = file.webkitRelativePath || file.name;
                fileList.appendChild(div);
            });
        }

        if (createBtn) {
            createBtn.disabled = files.length === 0;
        }
    }

    createTorrent() {
        const fileInput = /** @type {HTMLInputElement} */ (document.getElementById('file-input'));
        if (!fileInput || !fileInput.files) {
            alert('Please select files first!');
            return;
        }

        const files = Array.from(fileInput.files);

        if (files.length === 0) {
            alert('Please select files first!');
            return;
        }

        if (!this.clientReady || !this.client) {
            alert('WebTorrent client not ready. Please wait a moment and try again.');
            return;
        }

        // Check for index.html
        const hasIndex = files.some((file) =>
            (file.webkitRelativePath || file.name).toLowerCase().includes('index.html')
        );

        if (!hasIndex) {
            if (!confirm('No index.html found. Continue anyway? (Site may not load properly)')) {
                return;
            }
        }

        this.log(`Creating torrent with ${files.length} files...`);

        // Show progress
        const createBtn = /** @type {HTMLButtonElement} */ (document.getElementById('create-torrent-btn'));
        const originalText = createBtn ? createBtn.textContent : '';
        if (createBtn) {
            createBtn.disabled = true;
            createBtn.textContent = 'Creating Torrent...';
        }

        try {
            // Create torrent with proper options
            this.client.seed(
                files,
                {
                    announce: this.trackers,
                    name: this.generateTorrentName(files),
                    comment: 'Created with PeerWeb - Decentralized Website Hosting',
                    createdBy: 'PeerWeb v1.0',
                    private: false, // Make it a public torrent
                    pieceLength: this.calculateOptimalPieceLength(files)
                },
                (torrent) => {
                    this.log(`Torrent created successfully: ${torrent.infoHash}`);
                    this.log(`Torrent name: ${torrent.name}`);
                    this.log(`Files: ${torrent.files.length}`);

                    // Reset button
                    if (createBtn) {
                        createBtn.disabled = false;
                        createBtn.textContent = originalText;
                    }

                    // Show result in modal
                    this.showTorrentCreationResult(torrent);
                }
            );
        } catch (error) {
            this.log(`Error creating torrent: ${error.message}`);
            console.error('Torrent creation error:', error);

            // Reset button
            if (createBtn) {
                createBtn.disabled = false;
                createBtn.textContent = originalText;
            }

            alert('Error creating torrent: ' + error.message);
        }
    }

    generateTorrentName(files) {
        // Try to determine a good name from the files
        if (files.length === 1) {
            return files[0].name.replace(/\.[^/.]+$/, ''); // Remove extension
        }

        // Look for common base path
        const paths = files.map((f) => f.webkitRelativePath || f.name);
        if (paths.length > 0 && paths[0].includes('/')) {
            const basePath = paths[0].split('/')[0];
            if (paths.every((path) => path.startsWith(basePath))) {
                return basePath;
            }
        }

        return `PeerWeb-Site-${Date.now()}`;
    }

    calculateOptimalPieceLength(files) {
        // Calculate total size
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);

        // Choose piece length based on total size
        if (totalSize < PEERWEB_CONFIG.PIECE_SIZE_THRESHOLD_16MB) {
            return PEERWEB_CONFIG.PIECE_SIZE_16KB;
        } else if (totalSize < PEERWEB_CONFIG.PIECE_SIZE_THRESHOLD_256MB) {
            return PEERWEB_CONFIG.PIECE_SIZE_32KB;
        } else if (totalSize < PEERWEB_CONFIG.PIECE_SIZE_THRESHOLD_1GB) {
            return PEERWEB_CONFIG.PIECE_SIZE_256KB;
        } else {
            return PEERWEB_CONFIG.PIECE_SIZE_1MB;
        }
    }

    showTorrentCreationResult(torrent) {
        // Show result in the modal
        const resultDiv = document.getElementById('torrent-result');
        const hashSpan = document.getElementById('created-hash');
        const urlSpan = document.getElementById('created-url');
        const downloadLink = document.getElementById('download-torrent');

        // Sanitize hash before displaying
        const sanitizedHash = this.sanitizeHash(torrent.infoHash);
        const url = `${window.location.origin}${window.location.pathname}?orc=${sanitizedHash}`;

        if (hashSpan) {
            hashSpan.textContent = sanitizedHash;
        }
        if (urlSpan) {
            urlSpan.textContent = url;
        }

        // Create proper torrent file download
        const downloadLinkElement = /** @type {HTMLAnchorElement} */ (downloadLink);
        if (downloadLinkElement && torrent.torrentFile) {
            try {
                // Revoke previous URL if exists
                if (downloadLinkElement.href && downloadLinkElement.href.startsWith('blob:')) {
                    URL.revokeObjectURL(downloadLinkElement.href);
                }
                const blob = new Blob([torrent.torrentFile], {
                    type: 'application/x-bittorrent'
                });
                const downloadUrl = this.createTrackedObjectURL(blob);
                downloadLinkElement.href = downloadUrl;
                downloadLinkElement.download = `${torrent.name || 'website'}.torrent`;
                downloadLinkElement.style.display = 'inline-flex';

                const fileSize =
                    torrent.torrentFile instanceof ArrayBuffer
                        ? torrent.torrentFile.byteLength
                        : torrent.torrentFile.length;
                this.log(`Torrent file created: ${fileSize} bytes`);
            } catch (error) {
                this.log(`Error creating torrent file download: ${error.message}`);
                downloadLinkElement.style.display = 'none';
            }
        }

        if (resultDiv) {
            resultDiv.classList.remove('hidden');
        }
    }
}

// Cache management class (unchanged)
class PeerWebCache {
    constructor() {
        this.dbName = 'PeerWebCache';
        this.version = 1;
        this.storeName = 'sites';
        this.maxAge = PEERWEB_CONFIG.CACHE_MAX_AGE;
    }

    async openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const target = /** @type {IDBOpenDBRequest} */ (event.target);
                const db = target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'hash' });
                    store.createIndex('timestamp', 'timestamp');
                }
            };
        });
    }

    async set(hash, data) {
        try {
            const db = await this.openDB();
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            const record = {
                hash: hash,
                data: data,
                timestamp: Date.now()
            };

            await store.put(record);
            console.log(`[PeerWebCache] Cached site: ${hash}`);
        } catch (error) {
            console.error('[PeerWebCache] Error caching site:', error);
        }
    }

    async get(hash) {
        try {
            const db = await this.openDB();
            const transaction = db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);

            return new Promise((resolve, reject) => {
                const request = store.get(hash);
                request.onsuccess = () => {
                    const result = request.result;
                    if (result && Date.now() - result.timestamp < this.maxAge) {
                        console.log(`[PeerWebCache] Cache hit: ${hash}`);
                        resolve(result.data);
                    } else {
                        if (result) {
                            // Clean up expired entry
                            this.delete(hash);
                        }
                        resolve(null);
                    }
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('[PeerWebCache] Error retrieving from cache:', error);
            return null;
        }
    }

    async delete(hash) {
        try {
            const db = await this.openDB();
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            await store.delete(hash);
        } catch (error) {
            console.error('[PeerWebCache] Error deleting from cache:', error);
        }
    }

    async clear() {
        try {
            const db = await this.openDB();
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            await store.clear();
            console.log('[PeerWebCache] Cache cleared');
        } catch (error) {
            console.error('[PeerWebCache] Error clearing cache:', error);
        }
    }
}

// Initialize PeerWeb when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.peerWeb = new PeerWeb();
});
