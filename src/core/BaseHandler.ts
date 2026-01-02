import { TokenHandler } from './types';

/**
 * Base class for all token counter handlers
 * Manages common lifecycle operations like timers and observers
 */
export abstract class BaseHandler implements TokenHandler {
    protected timers: number[] = [];
    protected observers: MutationObserver[] = [];

    /**
     * Initialize the handler
     * Must be implemented by subclasses
     */
    abstract init(): void | Promise<void>;

    /**
     * Clean up all resources
     * Subclasses can override to add custom cleanup
     */
    destroy(): void {
        this.cleanupTimers();
        this.cleanupObservers();
    }

    /**
     * Register a timer for automatic cleanup
     */
    protected registerTimer(timer: number): void {
        this.timers.push(timer);
    }

    /**
     * Register an observer for automatic cleanup
     */
    protected registerObserver(observer: MutationObserver): void {
        this.observers.push(observer);
    }

    /**
     * Clean up all registered timers
     */
    private cleanupTimers(): void {
        this.timers.forEach(timer => clearInterval(timer));
        this.timers = [];
    }

    /**
     * Clean up all registered observers
     */
    private cleanupObservers(): void {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
    }
}
