// Global type declarations for PeerWeb project

// WebTorrent type declarations
declare class WebTorrent {
    constructor(opts?: any);
    add(
        torrentId: string | File | Blob | Buffer,
        opts?: any,
        callback?: (torrent: any) => void
    ): any;
    seed(
        files: File[] | FileList,
        opts?: any,
        callback?: (torrent: any) => void
    ): any;
    destroy(callback?: (err?: Error) => void): void;
    on(event: string, callback: (...args: any[]) => void): void;
    torrents: any[];
}

// DOMPurify type declarations
declare const DOMPurify: {
    sanitize(
        dirty: string | Node,
        config?: {
            ALLOWED_TAGS?: string[];
            ALLOWED_ATTR?: string[];
            ALLOWED_URI_REGEXP?: RegExp;
            RETURN_DOM?: boolean;
            RETURN_DOM_FRAGMENT?: boolean;
            RETURN_DOM_IMPORT?: boolean;
            SAFE_FOR_TEMPLATES?: boolean;
            WHOLE_DOCUMENT?: boolean;
            FORCE_BODY?: boolean;
            SANITIZE_DOM?: boolean;
            KEEP_CONTENT?: boolean;
            IN_PLACE?: boolean;
            USE_PROFILES?: any;
            FORBID_CONTENTS?: string[];
            FORBID_TAGS?: string[];
            FORBID_ATTR?: string[];
            ALLOW_DATA_ATTR?: boolean;
            ALLOW_UNKNOWN_PROTOCOLS?: boolean;
            CUSTOM_ELEMENT_HANDLING?: any;
        }
    ): string;
    isSupported: boolean;
};

// Extend Window interface
interface Window {
    peerWeb?: any;
    WebTorrent?: typeof WebTorrent;
    DOMPurify?: typeof DOMPurify;
}

// Service Worker types
interface ServiceWorkerGlobalScope {
    skipWaiting(): Promise<void>;
    clients: Clients;
}

declare var self: ServiceWorkerGlobalScope;
