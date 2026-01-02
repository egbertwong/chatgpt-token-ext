import { BaseHandler } from '../../src/core/BaseHandler';

// Create a concrete test implementation
class TestHandler extends BaseHandler {
    init() {
        // Empty implementation for testing
    }
}

describe('BaseHandler', () => {
    let handler: TestHandler;

    beforeEach(() => {
        handler = new TestHandler();
    });

    afterEach(() => {
        handler.destroy();
    });

    describe('timer management', () => {
        it('should register and cleanup timers', () => {
            const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

            const timer1 = setInterval(() => { }, 1000);
            const timer2 = setInterval(() => { }, 2000);

            handler['registerTimer'](timer1);
            handler['registerTimer'](timer2);

            handler.destroy();

            expect(clearIntervalSpy).toHaveBeenCalledWith(timer1);
            expect(clearIntervalSpy).toHaveBeenCalledWith(timer2);
            expect(clearIntervalSpy).toHaveBeenCalledTimes(2);

            clearIntervalSpy.mockRestore();
        });

        it('should clear timers array after cleanup', () => {
            const timer = setInterval(() => { }, 1000);
            handler['registerTimer'](timer);

            handler.destroy();

            expect(handler['timers']).toHaveLength(0);
        });

        it('should handle multiple destroy calls safely', () => {
            const timer = setInterval(() => { }, 1000);
            handler['registerTimer'](timer);

            expect(() => {
                handler.destroy();
                handler.destroy();
            }).not.toThrow();
        });
    });

    describe('observer management', () => {
        it('should register and cleanup observers', () => {
            const observer1 = new MutationObserver(() => { });
            const observer2 = new MutationObserver(() => { });

            const disconnectSpy1 = jest.spyOn(observer1, 'disconnect');
            const disconnectSpy2 = jest.spyOn(observer2, 'disconnect');

            handler['registerObserver'](observer1);
            handler['registerObserver'](observer2);

            handler.destroy();

            expect(disconnectSpy1).toHaveBeenCalled();
            expect(disconnectSpy2).toHaveBeenCalled();

            disconnectSpy1.mockRestore();
            disconnectSpy2.mockRestore();
        });

        it('should clear observers array after cleanup', () => {
            const observer = new MutationObserver(() => { });
            handler['registerObserver'](observer);

            handler.destroy();

            expect(handler['observers']).toHaveLength(0);
        });
    });

    describe('combined cleanup', () => {
        it('should cleanup both timers and observers', () => {
            const timer = setInterval(() => { }, 1000);
            const observer = new MutationObserver(() => { });

            const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
            const disconnectSpy = jest.spyOn(observer, 'disconnect');

            handler['registerTimer'](timer);
            handler['registerObserver'](observer);

            handler.destroy();

            expect(clearIntervalSpy).toHaveBeenCalledWith(timer);
            expect(disconnectSpy).toHaveBeenCalled();
            expect(handler['timers']).toHaveLength(0);
            expect(handler['observers']).toHaveLength(0);

            clearIntervalSpy.mockRestore();
            disconnectSpy.mockRestore();
        });
    });

    describe('abstract methods', () => {
        it('should require init() implementation', () => {
            expect(handler.init).toBeDefined();
            expect(typeof handler.init).toBe('function');
        });

        it('should have destroy() method', () => {
            expect(handler.destroy).toBeDefined();
            expect(typeof handler.destroy).toBe('function');
        });
    });
});
