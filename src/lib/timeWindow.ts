import { TimeWindow } from './types';

const WINDOW_DURATION_MS: Record<TimeWindow, number> = {
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
};

const LONG_WINDOWS: TimeWindow[] = ['6h', '24h'];

export function getWindowDurationMs(window: TimeWindow): number {
    return WINDOW_DURATION_MS[window];
}

export function usesMinuteBuckets(window: TimeWindow): boolean {
    return LONG_WINDOWS.includes(window);
}

export function getWindowLabel(window: TimeWindow): string {
    switch (window) {
        case '5m':
            return '5 minutes';
        case '15m':
            return '15 minutes';
        case '1h':
            return '1 hour';
        case '6h':
            return '6 hours';
        case '24h':
            return '24 hours';
        default:
            return window;
    }
}
