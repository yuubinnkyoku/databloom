'use client';

import { useSyncExternalStore } from 'react';

import {
    AggregateStats,
    ConnectionStatus,
    MinuteBucket,
    NusPayload,
    RawSample,
    SampleStateSnapshot,
} from './types';

const RAW_CAPACITY = 60 * 60 * 2; // 1h at 2 Hz => 7,200 samples
const BUCKET_CAPACITY = 24 * 60; // 24h at 1 bucket per minute
const SEQ_MODULUS = 0xffff + 1;
const NOTIFY_INTERVAL_MS = 200;

function createAggregate(value: number): AggregateStats {
    return {
        min: value,
        max: value,
        sum: value,
        last: value,
        count: 1,
    };
}

function extendAggregate(aggregate: AggregateStats, value: number) {
    aggregate.min = Math.min(aggregate.min, value);
    aggregate.max = Math.max(aggregate.max, value);
    aggregate.sum += value;
    aggregate.last = value;
    aggregate.count += 1;
}

function cloneBucket(bucket: MinuteBucket): MinuteBucket {
    return {
        start: bucket.start,
        moistureRaw: { ...bucket.moistureRaw },
        tempC: { ...bucket.tempC },
        lightRaw: { ...bucket.lightRaw },
    };
}

class SampleStore {
    private snapshot: SampleStateSnapshot = {
        connection: 'disconnected',
        permissionGranted: false,
        usingSimulator: false,
        lastSample: null,
        rawSamples: [],
        minuteBuckets: [],
        activeBucket: null,
        dropCount: 0,
        hz: 0,
        silenceMs: Number.POSITIVE_INFINITY,
    };

    private rawSamples: RawSample[] = [];
    private minuteBuckets: MinuteBucket[] = [];
    private activeBucket: MinuteBucket | null = null;
    private listeners = new Set<() => void>();
    private notifyTimer: number | null = null;
    private lastEmit = 0;
    private lastSeq: number | null = null;
    private dropCount = 0;
    private arrivalTimes: number[] = [];

    constructor() {
        if (typeof window !== 'undefined') {
            window.setInterval(() => {
                this.updateSilence();
            }, 1000);
        }
    }

    subscribe(listener: () => void) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    getSnapshot(): SampleStateSnapshot {
        return this.snapshot;
    }

    ingest(payload: NusPayload) {
        const ts = Date.now();
        const sample: RawSample = {
            seq: payload.seq,
            moistureRaw: payload.moistureRaw,
            tempC: payload.tempC,
            lightRaw: payload.lightRaw,
            ts,
        };

        this.handleSequence(sample.seq);
        this.pushRawSample(sample);
        this.pushMinuteBucket(sample);
        this.recordArrival(ts);

        this.snapshot = {
            ...this.snapshot,
            lastSample: sample,
            rawSamples: this.rawSamples,
            minuteBuckets: this.minuteBuckets,
            activeBucket: this.activeBucket,
            dropCount: this.dropCount,
            hz: this.calculateHz(),
            silenceMs: 0,
        };

        this.scheduleNotify();
    }

    setConnection(status: ConnectionStatus) {
        if (this.snapshot.connection === status) {
            return;
        }

        if (status === 'disconnected') {
            this.finalizeActiveBucket();
        }

        this.snapshot = {
            ...this.snapshot,
            connection: status,
            minuteBuckets: this.minuteBuckets,
            activeBucket: this.activeBucket,
            silenceMs: status === 'disconnected' ? Number.POSITIVE_INFINITY : this.snapshot.silenceMs,
        };
        this.scheduleNotify();
    }

    setPermissionGranted(granted: boolean) {
        if (this.snapshot.permissionGranted === granted) {
            return;
        }
        this.snapshot = {
            ...this.snapshot,
            permissionGranted: granted,
        };
        this.scheduleNotify();
    }

    setUsingSimulator(usingSimulator: boolean) {
        if (this.snapshot.usingSimulator === usingSimulator) {
            return;
        }
        this.snapshot = {
            ...this.snapshot,
            usingSimulator,
        };
        this.scheduleNotify();
    }

    resetData() {
        this.rawSamples = [];
        this.minuteBuckets = [];
        this.activeBucket = null;
        this.arrivalTimes = [];
        this.lastSeq = null;
        this.dropCount = 0;
        this.snapshot = {
            ...this.snapshot,
            lastSample: null,
            rawSamples: this.rawSamples,
            minuteBuckets: this.minuteBuckets,
            activeBucket: this.activeBucket,
            dropCount: this.dropCount,
            hz: 0,
            silenceMs: Number.POSITIVE_INFINITY,
        };
        this.scheduleNotify();
    }

    getSilenceMs() {
        return this.snapshot.silenceMs;
    }

    private scheduleNotify() {
        if (typeof window === 'undefined') {
            this.emit();
            return;
        }
        const now = Date.now();
        const elapsed = now - this.lastEmit;
        if (elapsed >= NOTIFY_INTERVAL_MS) {
            this.emit();
            return;
        }

        if (this.notifyTimer) {
            return;
        }

        this.notifyTimer = window.setTimeout(() => {
            this.notifyTimer = null;
            this.emit();
        }, NOTIFY_INTERVAL_MS - elapsed);
    }

    private emit() {
        this.lastEmit = Date.now();
        this.listeners.forEach((listener) => listener());
    }

    private handleSequence(nextSeq: number) {
        if (this.lastSeq === null) {
            this.lastSeq = nextSeq;
            return;
        }

        const delta = (nextSeq - this.lastSeq + SEQ_MODULUS) % SEQ_MODULUS;
        if (delta > 0 && delta < SEQ_MODULUS / 2) {
            this.dropCount += delta - 1;
        } else if (delta === 0) {
            // duplicate frame, ignore drop counting but keep lastSeq updated below
        } else {
            // likely reset, do not count as drops
            this.dropCount = this.dropCount;
        }

        this.lastSeq = nextSeq;
    }

    private pushRawSample(sample: RawSample) {
        const next = [...this.rawSamples, sample];
        if (next.length > RAW_CAPACITY) {
            next.splice(0, next.length - RAW_CAPACITY);
        }
        this.rawSamples = next;
    }

    private pushMinuteBucket(sample: RawSample) {
        const minuteStart = Math.floor(sample.ts / 60000) * 60000;

        if (!this.activeBucket || this.activeBucket.start !== minuteStart) {
            this.finalizeActiveBucket();
            this.activeBucket = {
                start: minuteStart,
                moistureRaw: createAggregate(sample.moistureRaw),
                tempC: createAggregate(sample.tempC),
                lightRaw: createAggregate(sample.lightRaw),
            };
            return;
        }

        extendAggregate(this.activeBucket.moistureRaw, sample.moistureRaw);
        extendAggregate(this.activeBucket.tempC, sample.tempC);
        extendAggregate(this.activeBucket.lightRaw, sample.lightRaw);
        // ensure we keep reference updated for snapshot consumers
        this.activeBucket = cloneBucket(this.activeBucket);
    }

    private finalizeActiveBucket() {
        if (!this.activeBucket) {
            return;
        }
        const next = [...this.minuteBuckets, cloneBucket(this.activeBucket)];
        if (next.length > BUCKET_CAPACITY) {
            next.splice(0, next.length - BUCKET_CAPACITY);
        }
        this.minuteBuckets = next;
        this.activeBucket = null;
    }

    private recordArrival(ts: number) {
        const next = [...this.arrivalTimes, ts];
        if (next.length > 20) {
            next.splice(0, next.length - 20);
        }
        this.arrivalTimes = next;
    }

    private calculateHz() {
        if (this.arrivalTimes.length < 2) {
            return 0;
        }
        const first = this.arrivalTimes[0];
        const last = this.arrivalTimes[this.arrivalTimes.length - 1];
        const durationSeconds = (last - first) / 1000;
        if (durationSeconds <= 0) {
            return 0;
        }
        const hz = (this.arrivalTimes.length - 1) / durationSeconds;
        return Math.round(hz * 100) / 100;
    }

    private updateSilence() {
        const lastTs = this.snapshot.lastSample?.ts ?? null;
        if (lastTs === null) {
            if (this.snapshot.silenceMs !== Number.POSITIVE_INFINITY) {
                this.snapshot = {
                    ...this.snapshot,
                    silenceMs: Number.POSITIVE_INFINITY,
                };
                this.scheduleNotify();
            }
            return;
        }

        const silence = Date.now() - lastTs;
        if (Math.abs(silence - this.snapshot.silenceMs) > 500) {
            this.snapshot = {
                ...this.snapshot,
                silenceMs: silence,
            };
            this.scheduleNotify();
        }
    }
}

export const sampleStore = new SampleStore();

export function useSampleState() {
    return useSyncExternalStore(
        (listener) => sampleStore.subscribe(listener),
        () => sampleStore.getSnapshot(),
        () => sampleStore.getSnapshot(),
    );
}
