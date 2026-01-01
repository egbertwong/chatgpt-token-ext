import { TokenizerLoader } from '@lenml/tokenizers';

// Mock Chrome runtime API
global.chrome = {
    runtime: {
        getURL: jest.fn((path: string) => `chrome-extension://fake-id/${path}`),
    },
} as any;

// Mock fetch
global.fetch = jest.fn();

// Mock TokenizerLoader
jest.mock('@lenml/tokenizers', () => ({
    TokenizerLoader: {
        fromPreTrained: jest.fn(() => ({
            encode: jest.fn((text: string) => ({
                ids: new Array(Math.ceil(text.length / 4)),
            })),
        })),
    },
}));

describe('DeepSeek Tokenizer', () => {
    let fromPreTrained: any;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules(); // Reset module cache to clear cached tokenizer
        (global.fetch as jest.Mock).mockClear();

        // Re-import the module after reset
        fromPreTrained = require('../../src/tokenizers/deepseek').fromPreTrained;
    });

    describe('fromPreTrained', () => {
        it('should load tokenizer from bundled files', async () => {
            const mockTokenizerJSON = { version: '1.0' };
            const mockTokenizerConfig = { model_type: 'deepseek' };

            (global.fetch as jest.Mock)
                .mockResolvedValueOnce({
                    json: jest.fn().mockResolvedValue(mockTokenizerJSON),
                })
                .mockResolvedValueOnce({
                    json: jest.fn().mockResolvedValue(mockTokenizerConfig),
                });

            const tokenizer = await fromPreTrained();

            expect(chrome.runtime.getURL).toHaveBeenCalledWith(
                'src/tokenizers/deepseek/tokenizer.json'
            );
            expect(chrome.runtime.getURL).toHaveBeenCalledWith(
                'src/tokenizers/deepseek/tokenizer_config.json'
            );
            expect(global.fetch).toHaveBeenCalledTimes(2);
            expect(TokenizerLoader.fromPreTrained).toHaveBeenCalledWith({
                tokenizerJSON: mockTokenizerJSON,
                tokenizerConfig: mockTokenizerConfig,
            });
            expect(tokenizer).toBeDefined();
        });

        it('should cache tokenizer on subsequent calls', async () => {
            const mockTokenizerJSON = { version: '1.0' };
            const mockTokenizerConfig = { model_type: 'deepseek' };

            (global.fetch as jest.Mock)
                .mockResolvedValueOnce({
                    json: jest.fn().mockResolvedValue(mockTokenizerJSON),
                })
                .mockResolvedValueOnce({
                    json: jest.fn().mockResolvedValue(mockTokenizerConfig),
                });

            const tokenizer1 = await fromPreTrained();
            const tokenizer2 = await fromPreTrained();

            expect(tokenizer1).toBe(tokenizer2);
            expect(global.fetch).toHaveBeenCalledTimes(2); // Only called for first load
        });

        it('should handle fetch errors', async () => {
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            await expect(fromPreTrained()).rejects.toThrow('Network error');

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('[DeepSeekTokenizer] Failed to load tokenizer'),
                expect.any(Error)
            );

            consoleErrorSpy.mockRestore();
        });

        it('should handle JSON parsing errors', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
            });

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            await expect(fromPreTrained()).rejects.toThrow('Invalid JSON');

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('[DeepSeekTokenizer] Failed to load tokenizer'),
                expect.any(Error)
            );

            consoleErrorSpy.mockRestore();
        });

        it('should use correct Chrome extension URLs', async () => {
            const mockTokenizerJSON = { version: '1.0' };
            const mockTokenizerConfig = { model_type: 'deepseek' };

            (global.fetch as jest.Mock)
                .mockResolvedValueOnce({
                    json: jest.fn().mockResolvedValue(mockTokenizerJSON),
                })
                .mockResolvedValueOnce({
                    json: jest.fn().mockResolvedValue(mockTokenizerConfig),
                });

            await fromPreTrained();

            expect(global.fetch).toHaveBeenCalledWith(
                'chrome-extension://fake-id/src/tokenizers/deepseek/tokenizer.json'
            );
            expect(global.fetch).toHaveBeenCalledWith(
                'chrome-extension://fake-id/src/tokenizers/deepseek/tokenizer_config.json'
            );
        });

        it('should load both files in parallel', async () => {
            const mockTokenizerJSON = { version: '1.0' };
            const mockTokenizerConfig = { model_type: 'deepseek' };

            let fetchCall1Resolved = false;
            let fetchCall2Resolved = false;

            (global.fetch as jest.Mock)
                .mockImplementationOnce(() => {
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            fetchCall1Resolved = true;
                            resolve({
                                json: jest.fn().mockResolvedValue(mockTokenizerJSON),
                            });
                        }, 10);
                    });
                })
                .mockImplementationOnce(() => {
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            fetchCall2Resolved = true;
                            resolve({
                                json: jest.fn().mockResolvedValue(mockTokenizerConfig),
                            });
                        }, 10);
                    });
                });

            await fromPreTrained();

            expect(fetchCall1Resolved).toBe(true);
            expect(fetchCall2Resolved).toBe(true);
        });
    });
});
