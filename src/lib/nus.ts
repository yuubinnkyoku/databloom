'use client';

import { NusPayload } from './types';

export const MICROBIT_NAME_PREFIX = 'BBC micro:bit';
export const MICROBIT_NAME_PREFIXES = [
    'BBC micro:bit',
    'micro:bit',
    'BBC microbit',
    'microbit',
];
export const NUS_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const NUS_RX_CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
export const NUS_TX_CHARACTERISTIC_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

// micro:bit UART (MakeCode bluetooth.start_uart_service())
export const MICROBIT_UART_SERVICE_UUID = 'e95d0000-251d-470a-a062-fa1922dfa9a8';
export const MICROBIT_UART_RX_CHARACTERISTIC_UUID = 'e95d0001-251d-470a-a062-fa1922dfa9a8'; // write
export const MICROBIT_UART_TX_CHARACTERISTIC_UUID = 'e95d0002-251d-470a-a062-fa1922dfa9a8'; // notify

// サービス候補をプロファイル化（NUS と micro:bit UART の両対応）
const UART_PROFILES: Array<{
    name: string;
    service: string;
    candidates: string[]; // 通知可能な特性（TX のみ。RX は書き込み専用なので除外）
}> = [
        {
            name: 'Nordic NUS',
            service: NUS_SERVICE_UUID,
            candidates: [NUS_TX_CHARACTERISTIC_UUID], // RX を削除
        },
        {
            name: 'micro:bit UART',
            service: MICROBIT_UART_SERVICE_UUID,
            candidates: [MICROBIT_UART_TX_CHARACTERISTIC_UUID], // RX を削除
        },
    ];

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
        // 1) Prefer strict filter: namePrefix + any known UART service
        const filters: Array<{ services?: BluetoothServiceUUID[]; namePrefix?: string }> = [];
        for (const p of MICROBIT_NAME_PREFIXES) {
            for (const prof of UART_PROFILES) {
                filters.push({ namePrefix: p, services: [prof.service] });
            }
        }
        return await navigator.bluetooth.requestDevice({
            filters,
        });
    } catch (error) {
        try {
            stripCancelMessage(error);
        } catch (retryable) {
            if (retryable instanceof RetryableRequestError) {
                // 2) Fallback: name-only filter + optional service (broader)
                try {
                    return await navigator.bluetooth.requestDevice({
                        filters: MICROBIT_NAME_PREFIXES.map((p) => ({ namePrefix: p })),
                        optionalServices: UART_PROFILES.map((u) => u.service),
                    });
                } catch (e2) {
                    try {
                        stripCancelMessage(e2);
                    } catch (retryable2) {
                        if (retryable2 instanceof RetryableRequestError) {
                            // 3) Last resort: accept all devices and filter later
                            return navigator.bluetooth.requestDevice({
                                acceptAllDevices: true,
                                optionalServices: UART_PROFILES.map((u) => u.service),
                            });
                        }
                        throw retryable2;
                    }
                    throw e2;
                }
            }
            throw retryable;
        }
        throw error;
    }
}

// Broad scan helper: opens chooser with acceptAllDevices and requests NUS later
export async function requestMicrobitDeviceBroad(): Promise<BluetoothDevice> {
    if (!isWebBluetoothSupported()) {
        throw new Error('Web Bluetooth API is not available in this browser.');
    }
    return navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: UART_PROFILES.map((u) => u.service),
    });
}

export async function getRememberedMicrobitDevices(): Promise<BluetoothDevice[]> {
    if (!isWebBluetoothSupported()) {
        return [];
    }
    if (!('getDevices' in navigator.bluetooth)) {
        return [];
    }
    const devices = await navigator.bluetooth.getDevices();
    return devices.filter((device) => {
        const name = device.name ?? '';
        return MICROBIT_NAME_PREFIXES.some((p) => name.startsWith(p));
    });
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

        this.device = requestedDevice ?? (await requestMicrobitDevice());

        if (!this.device.gatt) {
            throw new Error('No GATT server available on the selected device.');
        }

        try {
            this.server = await this.device.gatt.connect();

            // 任意のUARTサービスを順に試す
            let foundService: BluetoothRemoteGATTService | null = null;
            let triedDetails: Array<{ uuid: string; notify: boolean; service: string }> = [];

            for (const profile of UART_PROFILES) {
                try {
                    const svc = await this.server.getPrimaryService(profile.service);
                    const picked = await pickNotifyCharacteristic(svc, profile.candidates);
                    triedDetails = triedDetails.concat(
                        picked.tried.map((t) => ({ ...t, service: profile.service }))
                    );
                    if (picked.characteristic) {
                        foundService = svc;
                        this.txCharacteristic = picked.characteristic;
                        console.info('[nus] Using service', profile.name, profile.service, 'characteristic', this.txCharacteristic.uuid);
                        break;
                    }
                } catch {
                    // 次のプロファイルへ
                }
            }

            if (!this.txCharacteristic || !foundService) {
                const detail = triedDetails.map((t) => `${t.service}/${t.uuid}:${t.notify ? 'notify' : '-'}`).join(', ');
                throw new Error(`No UART/NUS characteristic with notifications. Tried: ${detail}`);
            }

            // 通知開始（環境で未対応なら明示エラーへ差し替え）
            try {
                await this.txCharacteristic.startNotifications();
                console.info('[nus] Notifications started on', this.txCharacteristic.uuid);
            } catch (e) {
                if (e instanceof DOMException && e.name === 'NotSupportedError') {
                    throw new Error('GATT Error: Not supported (TX notify unavailable or requires pairing).');
                }
                throw e;
            }

            this.txCharacteristic.addEventListener('characteristicvaluechanged', this.handleValueChanged);
            this.device.addEventListener('gattserverdisconnected', this.handleDisconnected);
            this.options.onConnected?.(this.device);
        } catch (error) {
            this.options.onError?.(error);
            this.cleanup();
            throw error;
        }
    }

    // Connect using broad scan flow (acceptAllDevices). Useful when strict filters find nothing.
    async connectBroad() {
        const device = await requestMicrobitDeviceBroad();
        const name = device.name ?? '';
        const isMicrobit = MICROBIT_NAME_PREFIXES.some((p) => name.startsWith(p));
        if (!isMicrobit) {
            throw new Error(`Selected device is not a micro:bit: "${name || 'Unnamed'}"`);
        }
        return this.connect(device);
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
                // 軽い診断ログ（最初の数行のみ）
                const w = window as unknown as { __nus_seen__?: number };
                if (w.__nus_seen__ === undefined) w.__nus_seen__ = 0;
                if ((w.__nus_seen__ ?? 0) < 5) {
                    w.__nus_seen__ = (w.__nus_seen__ ?? 0) + 1;
                    console.info('[nus] line', w.__nus_seen__, line);
                }
            }
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

// 追加: NUS内でnotify可能な特性を選ぶユーティリティ
async function pickNotifyCharacteristic(
    service: BluetoothRemoteGATTService,
    candidates?: string[]
): Promise<{ characteristic: BluetoothRemoteGATTCharacteristic | null; tried: Array<{ uuid: string; notify: boolean }> }> {
    const tried: Array<{ uuid: string; notify: boolean }> = [];

    // 候補UUIDを優先的に確認（未指定ならNUS TX のみ）
    const uuids = candidates ?? [NUS_TX_CHARACTERISTIC_UUID];
    for (const uuid of uuids) {
        try {
            const c = await service.getCharacteristic(uuid);
            const canNotify = !!(c.properties?.notify || c.properties?.indicate);
            tried.push({ uuid: c.uuid, notify: canNotify });
            if (canNotify) return { characteristic: c, tried };
        } catch {
            // 無視して次へ
        }
    }

    // 全特性走査して notify/indicate 可能なものを拾う（実装差異の保険）
    try {
        const all = await service.getCharacteristics();
        for (const c of all) {
            const canNotify = !!(c.properties?.notify || c.properties?.indicate);
            tried.push({ uuid: c.uuid, notify: canNotify });
        }
        // 候補が指定されている場合は、候補順でnotify/indicate可の特性を優先
        if (candidates && candidates.length > 0) {
            for (const pref of candidates) {
                const match = all.find((c) => c.uuid.toLowerCase() === pref.toLowerCase() && (c.properties?.notify || c.properties?.indicate));
                if (match) return { characteristic: match, tried };
            }
        }
        const withNotify = all.find((c) => c.properties?.notify || c.properties?.indicate);
        if (withNotify) return { characteristic: withNotify, tried };
    } catch {
        // getCharacteristics未対応環境の可能性 → そのまま継続
    }

    // プロパティにnotify/indicateが付かない環境への最後の保険として、
    // TX候補（通知専用）に対して startNotifications を試みる
    // RX（書き込み専用）は通知不可なので candidates から除外済み
    for (const uuid of uuids) {
        try {
            const c = await service.getCharacteristic(uuid);
            try {
                await c.startNotifications();
                // 成功したら停止して返す（呼び出し側で再度開始する）
                await c.stopNotifications().catch(() => undefined);
                tried.push({ uuid: c.uuid, notify: true });
                return { characteristic: c, tried };
            } catch {
                tried.push({ uuid: c.uuid, notify: false });
            }
        } catch {
            // 無視
        }
    }

    return { characteristic: null, tried };
}
