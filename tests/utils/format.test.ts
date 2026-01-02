import { formatTokenCount, clearTimer } from '../../src/utils/format';

describe('format utilities', () => {
    describe('formatTokenCount', () => {
        it('should format counts < 1000 without k suffix', () => {
            expect(formatTokenCount(0)).toBe('0 tokens');
            expect(formatTokenCount(1)).toBe('1 tokens');
            expect(formatTokenCount(500)).toBe('500 tokens');
            expect(formatTokenCount(999)).toBe('999 tokens');
        });

        it('should format counts >= 1000 with k suffix', () => {
            expect(formatTokenCount(1000)).toBe('1.0k tokens');
            expect(formatTokenCount(1234)).toBe('1.2k tokens');
            expect(formatTokenCount(5678)).toBe('5.7k tokens');
            expect(formatTokenCount(10000)).toBe('10.0k tokens');
        });

        it('should round to 1 decimal place', () => {
            expect(formatTokenCount(1249)).toBe('1.2k tokens');
            expect(formatTokenCount(1250)).toBe('1.3k tokens');
        });
    });

    describe('clearTimer', () => {
        it('should clear timer when timer is not null', () => {
            const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
            const timer = 123;

            clearTimer(timer);

            expect(clearIntervalSpy).toHaveBeenCalledWith(timer);
            clearIntervalSpy.mockRestore();
        });

        it('should not throw when timer is null', () => {
            expect(() => clearTimer(null)).not.toThrow();
        });

        it('should not call clearInterval when timer is null', () => {
            const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

            clearTimer(null);

            expect(clearIntervalSpy).not.toHaveBeenCalled();
            clearIntervalSpy.mockRestore();
        });
    });
});
