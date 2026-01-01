// Manual Chrome API mock (jest-chrome has initialization issues)
global.chrome = {
    runtime: {
        getURL: jest.fn((path: string) => `chrome-extension://mock-id/${path}`),
        onMessage: {
            addListener: jest.fn(),
            removeListener: jest.fn(),
        },
    },
    storage: {
        local: {
            get: jest.fn(),
            set: jest.fn(),
            remove: jest.fn(),
            clear: jest.fn(),
        },
        sync: {
            get: jest.fn(),
            set: jest.fn(),
            remove: jest.fn(),
            clear: jest.fn(),
        },
    },
    tabs: {
        query: jest.fn(),
        sendMessage: jest.fn(),
    },
} as any;

// Mock performance.now() for timing tests
if (!global.performance) {
    global.performance = {} as Performance;
}
global.performance.now = jest.fn(() => Date.now());

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value.toString();
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// Mock MutationObserver
global.MutationObserver = class MutationObserver {
    constructor(public callback: MutationCallback) { }
    disconnect() { }
    observe() { }
    takeRecords(): MutationRecord[] {
        return [];
    }
} as any;

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
    constructor(public callback: IntersectionObserverCallback) { }
    disconnect() { }
    observe() { }
    unobserve() { }
    takeRecords(): IntersectionObserverEntry[] {
        return [];
    }
    root = null;
    rootMargin = '';
    thresholds = [];
} as any;

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => {
    cb(0);
    return 0;
});

global.cancelAnimationFrame = jest.fn();

// Reset mocks before each test
beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
});
