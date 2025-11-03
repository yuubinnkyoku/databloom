'use client';

import { useSyncExternalStore } from 'react';

import { CalibrationPoints } from './types';

const STORAGE_KEY = 'databloom:calibration:v1';

let calibration: CalibrationPoints = {
    dry: null,
    wet: null,
};

const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((listener) => listener());
}

function readFromStorage(): CalibrationPoints {
    if (typeof window === 'undefined') {
        return calibration;
    }

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return calibration;
        }
        const parsed = JSON.parse(raw) as CalibrationPoints;
        if (
            typeof parsed === 'object' &&
            parsed !== null &&
            ('dry' in parsed || 'wet' in parsed)
        ) {
            return {
                dry: typeof parsed.dry === 'number' ? parsed.dry : null,
                wet: typeof parsed.wet === 'number' ? parsed.wet : null,
            };
        }
    } catch (error) {
        console.warn('[calibration] failed to read calibration from storage', error);
    }

    return calibration;
}

if (typeof window !== 'undefined') {
    calibration = readFromStorage();
}

export function getCalibration(): CalibrationPoints {
    return calibration;
}

export function setCalibration(next: CalibrationPoints) {
    calibration = next;
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(calibration));
        } catch (error) {
            console.warn('[calibration] failed to persist calibration', error);
        }
    }
    notify();
}

export function updateCalibration(partial: Partial<CalibrationPoints>) {
    setCalibration({
        dry: partial.dry ?? calibration.dry,
        wet: partial.wet ?? calibration.wet,
    });
}

export function resetCalibration() {
    setCalibration({ dry: null, wet: null });
}

export function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function isCalibrated(value: CalibrationPoints = calibration): boolean {
    return typeof value.dry === 'number' && typeof value.wet === 'number' && value.dry !== value.wet;
}

export function applyCalibrationToRaw(raw: number, current: CalibrationPoints = calibration): number | null {
    if (!isCalibrated(current)) {
        return null;
    }

    const { dry, wet } = current;
    if (dry === null || wet === null) {
        return null;
    }

    const span = wet - dry;
    if (span === 0) {
        return null;
    }

    const percent = ((raw - dry) / span) * 100;
    if (Number.isNaN(percent)) {
        return null;
    }
    return Math.min(100, Math.max(0, percent));
}

export function useCalibration() {
    return useSyncExternalStore(subscribe, getCalibration, getCalibration);
}
