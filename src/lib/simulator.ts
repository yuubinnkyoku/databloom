'use client';

import { NusPayload } from './types';

const SEQ_MODULUS = 0xffff + 1;

interface SimulatorHandle {
    stop: () => void;
}

export function startSimulator(onSample: (payload: NusPayload) => void): SimulatorHandle {
    let cancelled = false;
    let seq = Math.floor(Math.random() * SEQ_MODULUS);
    let moisture = 600;
    let temperature = 22;
    let light = 120;
    let timeout: number | null = null;

    const tick = () => {
        if (cancelled) {
            return;
        }

        const intervalHz = 2 + Math.random() * 3; // 2-5 Hz
        const intervalMs = 1000 / intervalHz;

        seq = (seq + 1) % SEQ_MODULUS;
        moisture = clamp(moisture + (Math.random() - 0.5) * 50, 0, 1023);
        temperature = clamp(temperature + (Math.random() - 0.5) * 0.5, -10, 50);
        light = clamp(light + (Math.random() - 0.5) * 20, 0, 255);

        onSample({
            seq,
            moistureRaw: Math.round(moisture),
            tempC: Math.round(temperature * 10) / 10,
            lightRaw: Math.round(light),
        });

        timeout = window.setTimeout(tick, intervalMs);
    };

    tick();

    return {
        stop: () => {
            cancelled = true;
            if (timeout !== null) {
                window.clearTimeout(timeout);
            }
        },
    };
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}
