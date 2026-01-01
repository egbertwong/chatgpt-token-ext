import { getHandler, start } from '../../src/core';
import { ChatGPTHandler } from '../../src/handlers/chatgpt';
import { GeminiHandler } from '../../src/handlers/gemini';
import { DeepSeekHandler } from '../../src/handlers/deepseek';

// Mock the handlers
jest.mock('../../src/handlers/chatgpt');
jest.mock('../../src/handlers/gemini');
jest.mock('../../src/handlers/deepseek');

describe('Core Module', () => {
    let consoleLogSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        jest.clearAllMocks();
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        consoleWarnSpy.mockRestore();
    });

    describe('getHandler', () => {
        it('should return ChatGPTHandler for chatgpt.com', () => {
            Object.defineProperty(window, 'location', {
                value: { hostname: 'chatgpt.com' },
                writable: true,
            });

            const handler = getHandler();
            expect(handler).toBeInstanceOf(ChatGPTHandler);
        });

        it('should return ChatGPTHandler for chat.openai.com', () => {
            Object.defineProperty(window, 'location', {
                value: { hostname: 'chat.openai.com' },
                writable: true,
            });

            const handler = getHandler();
            expect(handler).toBeInstanceOf(ChatGPTHandler);
        });

        it('should return GeminiHandler for gemini.google.com', () => {
            Object.defineProperty(window, 'location', {
                value: { hostname: 'gemini.google.com' },
                writable: true,
            });

            const handler = getHandler();
            expect(handler).toBeInstanceOf(GeminiHandler);
        });

        it('should return DeepSeekHandler for chat.deepseek.com', () => {
            Object.defineProperty(window, 'location', {
                value: { hostname: 'chat.deepseek.com' },
                writable: true,
            });

            const handler = getHandler();
            expect(handler).toBeInstanceOf(DeepSeekHandler);
        });

        it('should return null for unsupported domains', () => {
            Object.defineProperty(window, 'location', {
                value: { hostname: 'example.com' },
                writable: true,
            });

            const handler = getHandler();
            expect(handler).toBeNull();
        });

        it('should handle subdomains correctly for chatgpt.com', () => {
            Object.defineProperty(window, 'location', {
                value: { hostname: 'www.chatgpt.com' },
                writable: true,
            });

            const handler = getHandler();
            expect(handler).toBeInstanceOf(ChatGPTHandler);
        });

        it('should handle subdomains correctly for gemini.google.com', () => {
            Object.defineProperty(window, 'location', {
                value: { hostname: 'beta.gemini.google.com' },
                writable: true,
            });

            const handler = getHandler();
            expect(handler).toBeInstanceOf(GeminiHandler);
        });
    });

    describe('start', () => {
        it('should initialize handler for supported domain', () => {
            Object.defineProperty(window, 'location', {
                value: { hostname: 'chatgpt.com' },
                writable: true,
            });

            const mockInit = jest.fn();
            (ChatGPTHandler as jest.Mock).mockImplementation(() => ({
                init: mockInit,
                destroy: jest.fn(),
            }));

            start();

            expect(mockInit).toHaveBeenCalledTimes(1);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('[TokenCounter] Started handler for chatgpt.com')
            );
        });

        it('should log warning for unsupported domain', () => {
            Object.defineProperty(window, 'location', {
                value: { hostname: 'example.com' },
                writable: true,
            });

            start();

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('[TokenCounter] No handler found for example.com')
            );
        });

        it('should not throw error if handler is null', () => {
            Object.defineProperty(window, 'location', {
                value: { hostname: 'unsupported.com' },
                writable: true,
            });

            expect(() => start()).not.toThrow();
        });
    });
});
