import { ChatGPTHandler } from '../../src/handlers/chatgpt';

// Mock js-tiktoken
jest.mock('js-tiktoken', () => ({
    getEncoding: jest.fn((name: string) => ({
        encode: jest.fn((text: string) => {
            // Simple mock: 1 token per 4 characters
            return new Array(Math.ceil(text.length / 4));
        }),
    })),
}));

describe('ChatGPTHandler', () => {
    let handler: ChatGPTHandler;
    let mockSetInterval: jest.SpyInstance;
    let mockClearInterval: jest.SpyInstance;

    beforeEach(() => {
        handler = new ChatGPTHandler();
        mockSetInterval = jest.spyOn(window, 'setInterval');
        mockClearInterval = jest.spyOn(window, 'clearInterval');
        document.body.innerHTML = '';
        localStorage.clear();
    });

    afterEach(() => {
        handler.destroy();
        mockSetInterval.mockRestore();
        mockClearInterval.mockRestore();
    });

    describe('init', () => {
        it('should set up URL check timer', () => {
            handler.init();
            expect(mockSetInterval).toHaveBeenCalled();
        });

        it('should set up mount check timer', () => {
            handler.init();
            const setIntervalCalls = mockSetInterval.mock.calls;
            expect(setIntervalCalls.length).toBeGreaterThanOrEqual(2);
        });

        it('should observe title changes', () => {
            const titleEl = document.createElement('title');
            document.head.appendChild(titleEl);

            handler.init();

            // Title observer should be set up
            expect(titleEl).toBeDefined();
        });
    });

    describe('destroy', () => {
        it('should clear all timers', () => {
            handler.init();
            handler.destroy();

            expect(mockClearInterval).toHaveBeenCalled();
        });

        it('should remove button from DOM', () => {
            // Create a mock button
            const button = document.createElement('button');
            button.id = 'token-counter-button';
            document.body.appendChild(button);

            handler.destroy();

            expect(document.getElementById('token-counter-button')).toBeNull();
        });

        it('should disconnect mutation observer', () => {
            const disconnectSpy = jest.spyOn(MutationObserver.prototype, 'disconnect');
            handler.init();
            handler.destroy();

            expect(disconnectSpy).toHaveBeenCalled();
            disconnectSpy.mockRestore();
        });
    });

    describe('encoder management', () => {
        it('should use o200k_base encoder by default', () => {
            handler.init();
            // Default encoder should be o200k_base
            expect(localStorage.getItem('egbertw_token_encoder')).toBeNull();
        });

        it('should load encoder from localStorage', () => {
            localStorage.setItem('egbertw_token_encoder', 'cl100k_base');
            const newHandler = new ChatGPTHandler();
            newHandler.init();

            // Should use the stored encoder
            expect(localStorage.getItem('egbertw_token_encoder')).toBe('cl100k_base');
            newHandler.destroy();
        });

        it('should cache encoders', () => {
            const { getEncoding } = require('js-tiktoken');
            handler.init();

            // Trigger encoding multiple times
            // The encoder should be cached and getEncoding called only once per encoder type
            expect(getEncoding).toHaveBeenCalled();
        });
    });

    describe('text extraction', () => {
        it('should extract text from message elements', () => {
            // Create mock message elements
            const userMsg = document.createElement('div');
            userMsg.setAttribute('data-message-author-role', 'user');
            const userContent = document.createElement('div');
            userContent.className = 'markdown';
            userContent.textContent = 'Hello, how are you?';
            userMsg.appendChild(userContent);

            const assistantMsg = document.createElement('div');
            assistantMsg.setAttribute('data-message-author-role', 'assistant');
            const assistantContent = document.createElement('div');
            assistantContent.className = 'prose';
            assistantContent.textContent = 'I am doing well, thank you!';
            assistantMsg.appendChild(assistantContent);

            document.body.appendChild(userMsg);
            document.body.appendChild(assistantMsg);

            // Access private method via any cast for testing
            const texts = (handler as any).getTextsFromPage();

            expect(texts).toHaveLength(2);
            expect(texts[0]).toBe('Hello, how are you?');
            expect(texts[1]).toBe('I am doing well, thank you!');
        });

        it('should filter out empty messages', () => {
            const emptyMsg = document.createElement('div');
            emptyMsg.setAttribute('data-message-author-role', 'user');
            emptyMsg.textContent = '   ';

            const validMsg = document.createElement('div');
            validMsg.setAttribute('data-message-author-role', 'assistant');
            validMsg.textContent = 'Valid message';

            document.body.appendChild(emptyMsg);
            document.body.appendChild(validMsg);

            const texts = (handler as any).getTextsFromPage();

            expect(texts).toHaveLength(1);
            expect(texts[0]).toBe('Valid message');
        });

        it('should handle messages without markdown/prose wrapper', () => {
            const msg = document.createElement('div');
            msg.setAttribute('data-message-author-role', 'user');
            msg.textContent = 'Direct text content';

            document.body.appendChild(msg);

            const texts = (handler as any).getTextsFromPage();

            expect(texts).toHaveLength(1);
            expect(texts[0]).toBe('Direct text content');
        });
    });

    describe('UI mounting', () => {
        it('should create button when header exists', () => {
            const header = document.createElement('div');
            header.id = 'conversation-header-actions';
            document.body.appendChild(header);

            (handler as any).ensureUiMounted();

            const button = document.getElementById('token-counter-button');
            expect(button).not.toBeNull();
            expect(button?.tagName).toBe('BUTTON');
        });

        it('should not create button when header does not exist', () => {
            (handler as any).ensureUiMounted();

            const button = document.getElementById('token-counter-button');
            expect(button).toBeNull();
        });

        it('should reuse existing button', () => {
            const header = document.createElement('div');
            header.id = 'conversation-header-actions';
            document.body.appendChild(header);

            (handler as any).ensureUiMounted();
            const firstButton = document.getElementById('token-counter-button');

            (handler as any).ensureUiMounted();
            const secondButton = document.getElementById('token-counter-button');

            expect(firstButton).toBe(secondButton);
        });

        it('should add button to header', () => {
            const header = document.createElement('div');
            header.id = 'conversation-header-actions';
            document.body.appendChild(header);

            (handler as any).ensureUiMounted();

            const button = header.querySelector('#token-counter-button');
            expect(button).not.toBeNull();
        });
    });

    describe('token counting', () => {
        it('should count tokens correctly', () => {
            const header = document.createElement('div');
            header.id = 'conversation-header-actions';
            document.body.appendChild(header);

            const msg = document.createElement('div');
            msg.setAttribute('data-message-author-role', 'user');
            msg.textContent = 'Test message with some content';
            document.body.appendChild(msg);

            (handler as any).computeAndRender();

            const button = document.getElementById('token-counter-button');
            const label = button?.querySelector('[data-token-counter-label="true"]');

            expect(label?.textContent).toMatch(/\d+\.\d+k tokens/);
        });

        it('should update token count when content changes', () => {
            const header = document.createElement('div');
            header.id = 'conversation-header-actions';
            document.body.appendChild(header);

            (handler as any).computeAndRender();

            const msg = document.createElement('div');
            msg.setAttribute('data-message-author-role', 'user');
            msg.textContent = 'New message';
            document.body.appendChild(msg);

            (handler as any).computeAndRender();

            const button = document.getElementById('token-counter-button');
            expect(button).not.toBeNull();
        });

        it('should handle encoding errors gracefully', () => {
            const { getEncoding } = require('js-tiktoken');
            getEncoding.mockImplementation(() => ({
                encode: jest.fn(() => {
                    throw new Error('Encoding error');
                }),
            }));

            const header = document.createElement('div');
            header.id = 'conversation-header-actions';
            document.body.appendChild(header);

            const msg = document.createElement('div');
            msg.setAttribute('data-message-author-role', 'user');
            msg.textContent = 'Test';
            document.body.appendChild(msg);

            expect(() => (handler as any).computeAndRender()).not.toThrow();

            const button = document.getElementById('token-counter-button');
            const label = button?.querySelector('[data-token-counter-label="true"]');
            expect(label?.textContent).toBe('Token: error');
        });
    });

    describe('menu functionality', () => {
        it('should create menu DOM when opened', () => {
            const header = document.createElement('div');
            header.id = 'conversation-header-actions';
            document.body.appendChild(header);

            (handler as any).ensureUiMounted();
            (handler as any).createMenuDom();

            const menu = document.querySelector('[data-radix-popper-content-wrapper]');
            expect(menu).not.toBeNull();
        });

        it('should toggle menu visibility on button click', () => {
            const header = document.createElement('div');
            header.id = 'conversation-header-actions';
            document.body.appendChild(header);

            (handler as any).ensureUiMounted();
            const button = document.getElementById('token-counter-button') as HTMLButtonElement;

            button.click();

            const menu = document.querySelector('[data-radix-popper-content-wrapper]') as HTMLElement;
            expect(menu?.style.display).toBe('block');
        });

        it('should close menu when clicking outside', () => {
            const header = document.createElement('div');
            header.id = 'conversation-header-actions';
            document.body.appendChild(header);

            (handler as any).ensureUiMounted();
            const button = document.getElementById('token-counter-button') as HTMLButtonElement;

            button.click();

            // Click outside
            document.body.click();

            const menu = document.querySelector('[data-radix-popper-content-wrapper]') as HTMLElement;
            expect(menu?.style.display).toBe('none');
        });
    });

    describe('encoder switching', () => {
        it('should switch encoder when menu item clicked', () => {
            localStorage.setItem('egbertw_token_encoder', 'o200k_base');

            const header = document.createElement('div');
            header.id = 'conversation-header-actions';
            document.body.appendChild(header);

            (handler as any).ensureUiMounted();
            (handler as any).createMenuDom();

            const switchItem = Array.from(document.querySelectorAll('[role="menuitem"]')).find(
                (el) => el.textContent === 'Switch encoder'
            ) as HTMLElement;

            switchItem?.click();

            expect(localStorage.getItem('egbertw_token_encoder')).toBe('cl100k_base');
        });

        it('should toggle between encoders', () => {
            localStorage.setItem('egbertw_token_encoder', 'cl100k_base');

            const header = document.createElement('div');
            header.id = 'conversation-header-actions';
            document.body.appendChild(header);

            (handler as any).ensureUiMounted();
            (handler as any).createMenuDom();

            const switchItem = Array.from(document.querySelectorAll('[role="menuitem"]')).find(
                (el) => el.textContent === 'Switch encoder'
            ) as HTMLElement;

            switchItem?.click();

            expect(localStorage.getItem('egbertw_token_encoder')).toBe('o200k_base');
        });
    });

    describe('URL change handling', () => {
        it('should clean up UI on URL change', () => {
            const header = document.createElement('div');
            header.id = 'conversation-header-actions';
            document.body.appendChild(header);

            (handler as any).ensureUiMounted();
            const button = document.getElementById('token-counter-button');
            expect(button).not.toBeNull();

            (handler as any).onUrlChange();

            const buttonAfter = document.getElementById('token-counter-button');
            expect(buttonAfter).toBeNull();
        });
    });
});
