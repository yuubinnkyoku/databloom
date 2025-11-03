'use client';

import { NusPayload } from './types';

export const MICROBIT_NAME_PREFIX = 'BBC micro:bit';
export const NUS_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const NUS_RX_CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
export const NUS_TX_CHARACTERISTIC_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

const decoder = new TextDecoder();

export function isWebBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

class RetryableRequestError extends Error {
    constructor(public readonly cause: DOMException) {
        super(cause.message);
        this.name = 'RetryableRequestError';
    }
}

function stripCancelMessage(error: unknown) {
    if (error instanceof DOMException) {
        if (error.name === 'NotFoundError') {
            const message = error.message?.toLowerCase?.() ?? '';
            const cancelled = message.includes('cancel');
            if (!cancelled) {
                throw new RetryableRequestError(error);
            }
            return;
        }
    }
    throw error;
}

export async function requestMicrobitDevice(): Promise<BluetoothDevice> {
    if (!isWebBluetoothSupported()) {
        throw new Error('Web Bluetooth API is not available in this browser.');
    }

    try {
        return await navigator.bluetooth.requestDevice({
            filters: [{ namePrefix: MICROBIT_NAME_PREFIX }],
            optionalServices: [NUS_SERVICE_UUID],
        });
    } catch (error) {
        try {
            stripCancelMessage(error);
        } catch (retryable) {
            if (retryable instanceof RetryableRequestError) {
                return navigator.bluetooth.requestDevice({
                    acceptAllDevices: true,
                    optionalServices: [NUS_SERVICE_UUID],
                });
            }
            throw retryable;
        }
        throw error;
    }
}

export async function getRememberedMicrobitDevices(): Promise<BluetoothDevice[]> {
    if (!isWebBluetoothSupported()) {
        return [];
    }
    if (!('getDevices' in navigator.bluetooth)) {
        return [];
    }
    const devices = await navigator.bluetooth.getDevices();
    return devices.filter((device) => device.name?.startsWith(MICROBIT_NAME_PREFIX));
}

export interface MicrobitClientOptions {
    onSample: (payload: NusPayload) => void;
    onConnected?: (device: BluetoothDevice) => void;
    onDisconnected?: (device: BluetoothDevice) => void;
    onError?: (error: unknown) => void;
}

export class MicrobitClient {
    private device: BluetoothDevice | null = null;
    private server: BluetoothRemoteGATTServer | null = null;
    private txCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
    private buffer = '';
    private readonly handleValueChanged = (event: Event) => {
        const characteristic = event.target as BluetoothRemoteGATTCharacteristic;
        if (!characteristic?.value) {
            return;
        }
        const decoded = decoder.decode(characteristic.value);
        this.buffer += decoded;
        this.drainBuffer();
    };
    private readonly handleDisconnected = () => {
        const { device } = this;
        this.cleanup();
        if (device && this.options.onDisconnected) {
            this.options.onDisconnected(device);
        }
    };

    constructor(private readonly options: MicrobitClientOptions) { }

    async connect(requestedDevice?: BluetoothDevice) {
        if (!isWebBluetoothSupported()) {
            throw new Error('Web Bluetooth API is not available in this browser.');
        }

        if (requestedDevice) {
            this.device = requestedDevice;
        } else {
            this.device = await requestMicrobitDevice();
        }

        if (!this.device.gatt) {
            throw new Error('No GATT server available on the selected device.');
        }

        try {
            this.server = await this.device.gatt.connect();
            const service = await this.server.getPrimaryService(NUS_SERVICE_UUID);
            this.txCharacteristic = await service.getCharacteristic(NUS_TX_CHARACTERISTIC_UUID);
            await this.txCharacteristic.startNotifications();
            this.txCharacteristic.addEventListener('characteristicvaluechanged', this.handleValueChanged);
            this.device.addEventListener('gattserverdisconnected', this.handleDisconnected);
            if (this.options.onConnected) {
                this.options.onConnected(this.device);
            }
        } catch (error) {
            this.options.onError?.(error);
            this.cleanup();
            throw error;
        }
    }

    async reconnect() {
        if (!this.device) {
            throw new Error('No cached device to reconnect to.');
        }
        if (this.device.gatt?.connected) {
            try {
                this.device.gatt.disconnect();
            } catch (error) {
                console.warn('[nus] disconnect before reconnect failed', error);
            }
        }
        return this.connect(this.device);
    }

    async disconnect() {
        const device = this.device;
        this.cleanup();
        if (device?.gatt?.connected) {
            await device.gatt.disconnect();
        }
    }

    getConnectedDevice() {
        return this.device;
    }

    private drainBuffer() {
        let newline = this.buffer.indexOf('\n');
        while (newline !== -1) {
            const line = this.buffer.slice(0, newline).replace(/\r$/, '').trim();
            this.buffer = this.buffer.slice(newline + 1);
            if (line.length > 0) {
                const payload = this.parseLine(line);
                if (payload) {
                    this.options.onSample(payload);
                }
            }
            newline = this.buffer.indexOf('\n');
        }
    }

    private parseLine(line: string): NusPayload | null {
        const parts = line.split(',');
        if (parts.length < 4) {
            console.warn('[nus] expected 4 comma-separated fields, got', line);
            return null;
        }

        const seq = Number(parts[0]);
        const moistureRaw = Number(parts[1]);
        const tempC = Number(parts[2]);
        const lightRaw = Number(parts[3]);

        if ([seq, moistureRaw, tempC, lightRaw].some((value) => Number.isNaN(value))) {
            console.warn('[nus] invalid numeric value in line', line);
            return null;
        }

        return { seq, moistureRaw, tempC, lightRaw };
    }

    private cleanup() {
        if (this.txCharacteristic) {
            try {
                this.txCharacteristic.removeEventListener('characteristicvaluechanged', this.handleValueChanged);
                void this.txCharacteristic.stopNotifications().catch(() => undefined);
            } catch (error) {
                console.warn('[nus] cleanup error', error);
            }
        }
        if (this.device) {
            this.device.removeEventListener('gattserverdisconnected', this.handleDisconnected);
        }
        this.server = null;
        this.txCharacteristic = null;
        this.buffer = '';
    }
}
