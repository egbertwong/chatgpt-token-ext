import { DeepSeekHandler } from '../../src/handlers/deepseek';

// Mock the DeepSeek tokenizer
jest.mock('../../src/tokenizers/deepseek', () => ({
    fromPreTrained: jest.fn(() =>
        Promise.resolve({
            encode: jest.fn((text: string) => ({
                ids: new Array(Math.ceil(text.length / 4)),
            })),
        })
    ),
}));

describe('DeepSeekHandler', () => {
    let handler: DeepSeekHandler;
    let mockSetInterval: jest.SpyInstance;
    let mockClearInterval: jest.SpyInstance;

    beforeEach(() => {
        handler = new DeepSeekHandler();
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
            const { fromPreTrained } = require('../../src/tokenizers/deepseek');

            await handler.init();

            expect(fromPreTrained).toHaveBeenCalled();
        });

        it('should set up URL check timer', async () => {
            await handler.init();

            expect(mockSetInterval).toHaveBeenCalled();
        });

        it('should handle tokenizer loading error gracefully', async () => {
            const { fromPreTrained } = require('../../src/tokenizers/deepseek');
            fromPreTrained.mockRejectedValueOnce(new Error('Failed to load'));

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            await handler.init();

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('[DeepSeekToken] Failed to load tokenizer'),
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
            const button = document.createElement('div');
            button.id = 'deepseek-token-counter';
            document.body.appendChild(button);

            handler.destroy();

            expect(document.getElementById('deepseek-token-counter')).toBeNull();
        });
    });

    describe('text extraction', () => {
        it('should extract text from conversation containers', () => {
            const scrollArea = document.createElement('div');
            scrollArea.className = '_0f72b0b ds-scroll-area';

            const conversation1 = document.createElement('div');
            conversation1.className = 'dad65929';
            conversation1.textContent = 'First message';
            scrollArea.appendChild(conversation1);

            const conversation2 = document.createElement('div');
            conversation2.className = 'dad65929';
            conversation2.textContent = 'Second message';
            scrollArea.appendChild(conversation2);

            document.body.appendChild(scrollArea);

            const texts = (handler as any).getTextsFromPage();

            expect(texts).toHaveLength(2);
            expect(texts).toContain('First message');
            expect(texts).toContain('Second message');
        });

        it('should extract text from textarea input', () => {
            const textarea = document.createElement('textarea');
            textarea.value = 'User typing...';
            document.body.appendChild(textarea);

            const texts = (handler as any).getTextsFromPage();

            expect(texts).toContain('User typing...');
        });

        it('should filter out empty texts', () => {
            const scrollArea = document.createElement('div');
            scrollArea.className = '_0f72b0b ds-scroll-area';

            const emptyConv = document.createElement('div');
            emptyConv.className = 'dad65929';
            emptyConv.textContent = '   ';
            scrollArea.appendChild(emptyConv);

            const validConv = document.createElement('div');
            validConv.className = 'dad65929';
            validConv.textContent = 'Valid message';
            scrollArea.appendChild(validConv);

            document.body.appendChild(scrollArea);

            const texts = (handler as any).getTextsFromPage();

            expect(texts).toHaveLength(1);
            expect(texts[0]).toBe('Valid message');
        });

        it('should handle missing scroll area gracefully', () => {
            const texts = (handler as any).getTextsFromPage();

            expect(texts).toEqual([]);
        });
    });

    describe('UI mounting', () => {
        it('should create button when upload button exists', () => {
            const uploadButton = document.createElement('div');
            uploadButton.className = '_57370c5 _5dedc1e ds-icon-button';
            document.body.appendChild(uploadButton);

            // Mock getBoundingClientRect
            uploadButton.getBoundingClientRect = jest.fn(() => ({
                left: 100,
                top: 50,
                right: 150,
                bottom: 84,
                width: 50,
                height: 34,
                x: 100,
                y: 50,
                toJSON: () => { },
            }));

            (handler as any).ensureUiMounted();

            const button = document.getElementById('deepseek-token-counter');
            expect(button).not.toBeNull();
            expect(button?.className).toContain('ds-icon-button');
        });

        it('should not create button when upload button does not exist', () => {
            (handler as any).ensureUiMounted();

            const button = document.getElementById('deepseek-token-counter');
            expect(button).toBeNull();
        });

        it('should reuse existing button', () => {
            const uploadButton = document.createElement('div');
            uploadButton.className = '_57370c5 _5dedc1e ds-icon-button';
            document.body.appendChild(uploadButton);

            uploadButton.getBoundingClientRect = jest.fn(() => ({
                left: 100,
                top: 50,
                right: 150,
                bottom: 84,
                width: 50,
                height: 34,
                x: 100,
                y: 50,
                toJSON: () => { },
            }));

            (handler as any).ensureUiMounted();
            const firstButton = document.getElementById('deepseek-token-counter');

            (handler as any).ensureUiMounted();
            const secondButton = document.getElementById('deepseek-token-counter');

            expect(firstButton).toBe(secondButton);
        });

        it('should position button relative to upload button', () => {
            const uploadButton = document.createElement('div');
            uploadButton.className = '_57370c5 _5dedc1e ds-icon-button';
            document.body.appendChild(uploadButton);

            uploadButton.getBoundingClientRect = jest.fn(() => ({
                left: 200,
                top: 100,
                right: 250,
                bottom: 134,
                width: 50,
                height: 34,
                x: 200,
                y: 100,
                toJSON: () => { },
            }));

            (handler as any).ensureUiMounted();

            const button = document.getElementById('deepseek-token-counter') as HTMLElement;
            expect(button.style.position).toBe('fixed');
            expect(button.style.top).toBe('100px');
        });

        it('should apply DeepSeek styling to button', () => {
            const uploadButton = document.createElement('div');
            uploadButton.className = '_57370c5 _5dedc1e ds-icon-button';
            document.body.appendChild(uploadButton);

            uploadButton.getBoundingClientRect = jest.fn(() => ({
                left: 100,
                top: 50,
                right: 150,
                bottom: 84,
                width: 50,
                height: 34,
                x: 100,
                y: 50,
                toJSON: () => { },
            }));

            (handler as any).ensureUiMounted();

            const button = document.getElementById('deepseek-token-counter') as HTMLElement;
            expect(button.style.borderRadius).toBe('20px');
            expect(button.style.height).toBe('34px');
        });
    });

    describe('token counting', () => {
        it('should count tokens correctly', async () => {
            await handler.init();

            const uploadButton = document.createElement('div');
            uploadButton.className = '_57370c5 _5dedc1e ds-icon-button';
            document.body.appendChild(uploadButton);

            uploadButton.getBoundingClientRect = jest.fn(() => ({
                left: 100,
                top: 50,
                right: 150,
                bottom: 84,
                width: 50,
                height: 34,
                x: 100,
                y: 50,
                toJSON: () => { },
            }));

            const scrollArea = document.createElement('div');
            scrollArea.className = '_0f72b0b ds-scroll-area';
            const conversation = document.createElement('div');
            conversation.className = 'dad65929';
            conversation.textContent = 'Test message with some content';
            scrollArea.appendChild(conversation);
            document.body.appendChild(scrollArea);

            await (handler as any).computeAndRender();

            const button = document.getElementById('deepseek-token-counter');
            const label = button?.querySelector('.token-label');

            expect(label?.textContent).toMatch(/\d+ tokens/);
        });

        it('should display loading state when tokenizer not ready', () => {
            const uploadButton = document.createElement('div');
            uploadButton.className = '_57370c5 _5dedc1e ds-icon-button';
            document.body.appendChild(uploadButton);

            uploadButton.getBoundingClientRect = jest.fn(() => ({
                left: 100,
                top: 50,
                right: 150,
                bottom: 84,
                width: 50,
                height: 34,
                x: 100,
                y: 50,
                toJSON: () => { },
            }));

            (handler as any).computeAndRender();

            const button = document.getElementById('deepseek-token-counter');
            const label = button?.querySelector('.token-label');

            expect(label?.textContent).toBe('Loading...');
        });

        it('should format large token counts with k suffix', async () => {
            await handler.init();

            const uploadButton = document.createElement('div');
            uploadButton.className = '_57370c5 _5dedc1e ds-icon-button';
            document.body.appendChild(uploadButton);

            uploadButton.getBoundingClientRect = jest.fn(() => ({
                left: 100,
                top: 50,
                right: 150,
                bottom: 84,
                width: 50,
                height: 34,
                x: 100,
                y: 50,
                toJSON: () => { },
            }));

            const scrollArea = document.createElement('div');
            scrollArea.className = '_0f72b0b ds-scroll-area';
            const conversation = document.createElement('div');
            conversation.className = 'dad65929';
            conversation.textContent = 'a'.repeat(5000); // ~1250 tokens
            scrollArea.appendChild(conversation);
            document.body.appendChild(scrollArea);

            await (handler as any).computeAndRender();

            const button = document.getElementById('deepseek-token-counter');
            const label = button?.querySelector('.token-label');

            expect(label?.textContent).toMatch(/\d+\.\d+k tokens/);
        });

        it('should handle array-format encode result', async () => {
            const { fromPreTrained } = require('../../src/tokenizers/deepseek');
            fromPreTrained.mockResolvedValueOnce({
                encode: jest.fn(() => [1, 2, 3, 4, 5]), // Array format
            });

            await handler.init();

            const uploadButton = document.createElement('div');
            uploadButton.className = '_57370c5 _5dedc1e ds-icon-button';
            document.body.appendChild(uploadButton);

            uploadButton.getBoundingClientRect = jest.fn(() => ({
                left: 100,
                top: 50,
                right: 150,
                bottom: 84,
                width: 50,
                height: 34,
                x: 100,
                y: 50,
                toJSON: () => { },
            }));

            const scrollArea = document.createElement('div');
            scrollArea.className = '_0f72b0b ds-scroll-area';
            const conversation = document.createElement('div');
            conversation.className = 'dad65929';
            conversation.textContent = 'Test';
            scrollArea.appendChild(conversation);
            document.body.appendChild(scrollArea);

            await (handler as any).computeAndRender();

            const button = document.getElementById('deepseek-token-counter');
            const label = button?.querySelector('.token-label');

            expect(label?.textContent).toMatch(/\d+ tokens/);
        });
    });

    describe('button positioning', () => {
        it('should update button position when called', () => {
            const uploadButton = document.createElement('div');
            uploadButton.className = '_57370c5 _5dedc1e ds-icon-button';
            document.body.appendChild(uploadButton);

            uploadButton.getBoundingClientRect = jest.fn(() => ({
                left: 100,
                top: 50,
                right: 150,
                bottom: 84,
                width: 50,
                height: 34,
                x: 100,
                y: 50,
                toJSON: () => { },
            }));

            (handler as any).ensureUiMounted();

            const button = document.getElementById('deepseek-token-counter') as HTMLElement;
            const initialTop = button.style.top;

            // Change upload button position
            uploadButton.getBoundingClientRect = jest.fn(() => ({
                left: 100,
                top: 150,
                right: 150,
                bottom: 184,
                width: 50,
                height: 34,
                x: 100,
                y: 150,
                toJSON: () => { },
            }));

            (handler as any).updateButtonPosition();

            expect(button.style.top).toBe('150px');
            expect(button.style.top).not.toBe(initialTop);
        });
    });

    describe('URL change handling', () => {
        it('should clean up UI on URL change', () => {
            const uploadButton = document.createElement('div');
            uploadButton.className = '_57370c5 _5dedc1e ds-icon-button';
            document.body.appendChild(uploadButton);

            uploadButton.getBoundingClientRect = jest.fn(() => ({
                left: 100,
                top: 50,
                right: 150,
                bottom: 84,
                width: 50,
                height: 34,
                x: 100,
                y: 50,
                toJSON: () => { },
            }));

            (handler as any).ensureUiMounted();
            const button = document.getElementById('deepseek-token-counter');
            expect(button).not.toBeNull();

            (handler as any).onUrlChange();

            const buttonAfter = document.getElementById('deepseek-token-counter');
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
});
