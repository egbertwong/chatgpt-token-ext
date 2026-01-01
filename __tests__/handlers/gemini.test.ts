import { GeminiHandler } from '../../src/handlers/gemini';

// Mock @lenml/tokenizer-gemini
jest.mock('@lenml/tokenizer-gemini', () => ({
    fromPreTrained: jest.fn(() =>
        Promise.resolve({
            encode: jest.fn((text: string) => {
                // Simple mock: 1 token per 4 characters
                return new Array(Math.ceil(text.length / 4));
            }),
        })
    ),
}));

describe('GeminiHandler', () => {
    let handler: GeminiHandler;
    let mockSetInterval: jest.SpyInstance;
    let mockClearInterval: jest.SpyInstance;

    beforeEach(() => {
        handler = new GeminiHandler();
        mockSetInterval = jest.spyOn(window, 'setInterval');
        mockClearInterval = jest.spyOn(window, 'clearInterval');
        document.body.innerHTML = '';
    });

    afterEach(() => {
        handler.destroy();
        mockSetInterval.mockRestore();
        mockClearInterval.mockRestore();
    });

    describe('init', () => {
        it('should initialize tokenizer', async () => {
            const { fromPreTrained } = require('@lenml/tokenizer-gemini');

            await handler.init();

            expect(fromPreTrained).toHaveBeenCalled();
        });

        it('should set up URL check timer', async () => {
            await handler.init();

            expect(mockSetInterval).toHaveBeenCalled();
        });

        it('should handle tokenizer loading error gracefully', async () => {
            const { fromPreTrained } = require('@lenml/tokenizer-gemini');
            fromPreTrained.mockRejectedValueOnce(new Error('Failed to load'));

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            await handler.init();

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('[GeminiToken] Failed to load tokenizer'),
                expect.any(Error)
            );

            consoleErrorSpy.mockRestore();
        });
    });

    describe('destroy', () => {
        it('should clear URL check timer', async () => {
            await handler.init();
            handler.destroy();

            expect(mockClearInterval).toHaveBeenCalled();
        });

        it('should disconnect mutation observer', async () => {
            const disconnectSpy = jest.spyOn(MutationObserver.prototype, 'disconnect');
            await handler.init();
            handler.destroy();

            expect(disconnectSpy).toHaveBeenCalled();
            disconnectSpy.mockRestore();
        });

        it('should remove button from DOM', async () => {
            const button = document.createElement('button');
            button.id = 'gemini-token-counter';
            document.body.appendChild(button);

            handler.destroy();

            expect(document.getElementById('gemini-token-counter')).toBeNull();
        });
    });

    describe('text extraction', () => {
        it('should extract text from user-query-content elements', () => {
            const userQuery = document.createElement('user-query-content');
            userQuery.textContent = 'What is the weather today?';
            document.body.appendChild(userQuery);

            const texts = (handler as any).getTextsFromPage();

            expect(texts).toContain('What is the weather today?');
        });

        it('should extract text from message-content elements', () => {
            const messageContent = document.createElement('message-content');
            messageContent.textContent = 'The weather is sunny today.';
            document.body.appendChild(messageContent);

            const texts = (handler as any).getTextsFromPage();

            expect(texts).toContain('The weather is sunny today.');
        });

        it('should extract text from input area', () => {
            const inputArea = document.createElement('div');
            inputArea.className = 'ql-editor';
            inputArea.textContent = 'User typing...';
            document.body.appendChild(inputArea);

            const texts = (handler as any).getTextsFromPage();

            expect(texts).toContain('User typing...');
        });

        it('should extract all text sources together', () => {
            const userQuery = document.createElement('user-query-content');
            userQuery.textContent = 'Question';
            document.body.appendChild(userQuery);

            const messageContent = document.createElement('message-content');
            messageContent.textContent = 'Answer';
            document.body.appendChild(messageContent);

            const inputArea = document.createElement('div');
            inputArea.className = 'ql-editor';
            inputArea.textContent = 'Typing';
            document.body.appendChild(inputArea);

            const texts = (handler as any).getTextsFromPage();

            expect(texts).toHaveLength(3);
            expect(texts).toContain('Question');
            expect(texts).toContain('Answer');
            expect(texts).toContain('Typing');
        });

        it('should filter out empty texts', () => {
            const emptyQuery = document.createElement('user-query-content');
            emptyQuery.textContent = '   ';
            document.body.appendChild(emptyQuery);

            const validQuery = document.createElement('user-query-content');
            validQuery.textContent = 'Valid content';
            document.body.appendChild(validQuery);

            const texts = (handler as any).getTextsFromPage();

            expect(texts).toHaveLength(1);
            expect(texts[0]).toBe('Valid content');
        });
    });

    describe('UI mounting', () => {
        it('should create button when buttons container exists', () => {
            const container = document.createElement('div');
            container.className = 'buttons-container';
            const pillbox = document.createElement('div');
            pillbox.className = 'pillbox';
            container.appendChild(pillbox);
            document.body.appendChild(container);

            (handler as any).ensureUiMounted();

            const button = document.getElementById('gemini-token-counter');
            expect(button).not.toBeNull();
            expect(button?.tagName).toBe('BUTTON');
        });

        it('should not create button when container does not exist', () => {
            (handler as any).ensureUiMounted();

            const button = document.getElementById('gemini-token-counter');
            expect(button).toBeNull();
        });

        it('should reuse existing button', () => {
            const container = document.createElement('div');
            container.className = 'buttons-container';
            document.body.appendChild(container);

            (handler as any).ensureUiMounted();
            const firstButton = document.getElementById('gemini-token-counter');

            (handler as any).ensureUiMounted();
            const secondButton = document.getElementById('gemini-token-counter');

            expect(firstButton).toBe(secondButton);
        });

        it('should insert button at the beginning of container', () => {
            const container = document.createElement('div');
            container.className = 'buttons-container';
            const existingButton = document.createElement('button');
            existingButton.textContent = 'Existing';
            container.appendChild(existingButton);
            document.body.appendChild(container);

            (handler as any).ensureUiMounted();

            expect(container.firstChild?.nodeName).toBe('BUTTON');
            expect((container.firstChild as HTMLElement)?.id).toBe('gemini-token-counter');
        });

        it('should apply Gemini styling to button', () => {
            const container = document.createElement('div');
            container.className = 'buttons-container';
            document.body.appendChild(container);

            (handler as any).ensureUiMounted();

            const button = document.getElementById('gemini-token-counter') as HTMLElement;
            expect(button.style.fontFamily).toContain('Google Sans');
            expect(button.style.borderRadius).toBe('100px');
        });

        it('should handle dark mode color', () => {
            // Mock dark mode
            Object.defineProperty(window, 'matchMedia', {
                writable: true,
                value: jest.fn().mockImplementation((query: string) => ({
                    matches: query === '(prefers-color-scheme: dark)',
                    media: query,
                    onchange: null,
                    addListener: jest.fn(),
                    removeListener: jest.fn(),
                    addEventListener: jest.fn(),
                    removeEventListener: jest.fn(),
                    dispatchEvent: jest.fn(),
                })),
            });

            const container = document.createElement('div');
            container.className = 'buttons-container';
            document.body.appendChild(container);

            (handler as any).ensureUiMounted();

            const button = document.getElementById('gemini-token-counter') as HTMLElement;
            expect(button.style.color).toBe('rgb(227, 227, 227)');
        });
    });

    describe('token counting', () => {
        it('should count tokens correctly', async () => {
            await handler.init();

            const container = document.createElement('div');
            container.className = 'buttons-container';
            document.body.appendChild(container);

            const userQuery = document.createElement('user-query-content');
            userQuery.textContent = 'Test message with some content';
            document.body.appendChild(userQuery);

            await (handler as any).computeAndRender();

            const button = document.getElementById('gemini-token-counter');
            const label = button?.querySelector('.token-label');

            expect(label?.textContent).toMatch(/\d+ tokens/);
        });

        it('should display loading state when tokenizer not ready', () => {
            const container = document.createElement('div');
            container.className = 'buttons-container';
            document.body.appendChild(container);

            (handler as any).computeAndRender();

            const button = document.getElementById('gemini-token-counter');
            const label = button?.querySelector('.token-label');

            expect(label?.textContent).toBe('Loading...');
        });

        it('should format large token counts with k suffix', async () => {
            await handler.init();

            const container = document.createElement('div');
            container.className = 'buttons-container';
            document.body.appendChild(container);

            // Create a message with enough content to exceed 1000 tokens
            const userQuery = document.createElement('user-query-content');
            userQuery.textContent = 'a'.repeat(5000); // ~1250 tokens
            document.body.appendChild(userQuery);

            await (handler as any).computeAndRender();

            const button = document.getElementById('gemini-token-counter');
            const label = button?.querySelector('.token-label');

            expect(label?.textContent).toMatch(/\d+\.\d+k tokens/);
        });

        it('should handle encoding errors gracefully', async () => {
            const { fromPreTrained } = require('@lenml/tokenizer-gemini');
            fromPreTrained.mockResolvedValueOnce({
                encode: jest.fn(() => {
                    throw new Error('Encoding error');
                }),
            });

            await handler.init();

            const container = document.createElement('div');
            container.className = 'buttons-container';
            document.body.appendChild(container);

            const userQuery = document.createElement('user-query-content');
            userQuery.textContent = 'Test';
            document.body.appendChild(userQuery);

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            await (handler as any).computeAndRender();

            expect(consoleErrorSpy).toHaveBeenCalled();

            const button = document.getElementById('gemini-token-counter');
            const label = button?.querySelector('.token-label');
            expect(label?.textContent).toBe('Error');

            consoleErrorSpy.mockRestore();
        });
    });

    describe('URL change handling', () => {
        it('should clean up UI on URL change', () => {
            const container = document.createElement('div');
            container.className = 'buttons-container';
            document.body.appendChild(container);

            (handler as any).ensureUiMounted();
            const button = document.getElementById('gemini-token-counter');
            expect(button).not.toBeNull();

            (handler as any).onUrlChange();

            const buttonAfter = document.getElementById('gemini-token-counter');
            expect(buttonAfter).toBeNull();
        });

        it('should reset internal state on URL change', () => {
            (handler as any).containerEl = document.createElement('div');
            (handler as any).labelSpan = document.createElement('span');

            (handler as any).onUrlChange();

            expect((handler as any).containerEl).toBeNull();
            expect((handler as any).labelSpan).toBeNull();
        });
    });

    describe('observer management', () => {
        it('should observe multiple targets', async () => {
            const observeSpy = jest.spyOn(MutationObserver.prototype, 'observe');

            const chatHistory = document.createElement('div');
            chatHistory.id = 'chat-history';
            document.body.appendChild(chatHistory);

            const buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'buttons-container';
            document.body.appendChild(buttonsContainer);

            await handler.init();

            expect(observeSpy).toHaveBeenCalled();
            observeSpy.mockRestore();
        });
    });
});
