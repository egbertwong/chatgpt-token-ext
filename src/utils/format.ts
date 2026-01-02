/**
 * Format token count for display
 * @param count - Number of tokens
 * @returns Formatted string (e.g., "1.2k tokens" or "500 tokens")
 */
export function formatTokenCount(count: number): string {
    if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}k tokens`;
    }
    return `${count} tokens`;
}

/**
 * Clear a timer safely
 * @param timer - Timer ID or null
 */
export function clearTimer(timer: number | null): void {
    if (timer !== null) {
        clearInterval(timer);
    }
}
