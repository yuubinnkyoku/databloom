'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { t, translateError } from '../lib/i18n';
import {
    MicrobitClient,
    getRememberedMicrobitDevices,
    isWebBluetoothSupported,
} from '../lib/nus';
import { sampleStore, useSampleState } from '../lib/store';

const AUTO_RECONNECT_SILENCE_MS = 5000;

export function BLEConnect() {
    const state = useSampleState();
    const [error, setError] = useState<string | null>(null);
    const [autoConnecting, setAutoConnecting] = useState(false);
    const clientRef = useRef<MicrobitClient | null>(null);
    const reconnectRef = useRef<number>(0);
    const autoAttemptRef = useRef(false);
    const supported = useMemo(() => isWebBluetoothSupported(), []);

    useEffect(() => {
        const client = new MicrobitClient({
            onSample: (payload) => sampleStore.ingest(payload),
            onConnected: () => {
                sampleStore.setConnection('connected');
                sampleStore.setPermissionGranted(true);
                setError(null);
            },
            onDisconnected: () => {
                sampleStore.setConnection('disconnected');
            },
            onError: (err) => {
                const message = err instanceof Error ? err.message : String(err);
                setError(translateError(message));
            },
        });
        clientRef.current = client;

        return () => {
            clientRef.current = null;
            void client.disconnect().catch(() => undefined);
        };
    }, []);

    useEffect(() => {
        if (
            !supported ||
            autoAttemptRef.current ||
            state.connection !== 'disconnected' ||
            state.usingSimulator
        ) {
            return;
        }
        autoAttemptRef.current = true;
        let cancelled = false;

        void (async () => {
            try {
                const devices = await getRememberedMicrobitDevices();
                if (cancelled || devices.length === 0) {
                    return;
                }
                sampleStore.setPermissionGranted(true);
                const client = clientRef.current;
                if (!client) {
                    return;
                }
                sampleStore.setConnection('connecting');
                setAutoConnecting(true);
                await client.connect(devices[0]);
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                setError(translateError(message));
                sampleStore.setConnection('disconnected');
            } finally {
                setAutoConnecting(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [supported, state.connection, state.usingSimulator]);

    useEffect(() => {
        if (state.connection !== 'connected' || state.usingSimulator) {
            return;
        }
        if (state.silenceMs < AUTO_RECONNECT_SILENCE_MS) {
            return;
        }
        const now = Date.now();
        if (now - reconnectRef.current < AUTO_RECONNECT_SILENCE_MS) {
            return;
        }
        const client = clientRef.current;
        if (!client) {
            return;
        }
        reconnectRef.current = now;
        console.info('[ble] attempting auto reconnect after silence');
        sampleStore.setConnection('connecting');
        client
            .reconnect()
            .then(() => {
                // handled by onConnected callback
            })
            .catch((err) => {
                const message = err instanceof Error ? err.message : String(err);
                setError(`${t('statusConnecting')}: ${translateError(message)}`);
                sampleStore.setConnection('disconnected');
            });
    }, [state.connection, state.silenceMs, state.usingSimulator]);

    const handleConnect = async () => {
        setError(null);
        const client = clientRef.current;
        if (!client) {
            return;
        }
        try {
            sampleStore.setConnection('connecting');
            await client.connect();
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError(translateError(message));
            sampleStore.setConnection('disconnected');
        }
    };

    const handleDisconnect = async () => {
        const client = clientRef.current;
        if (!client) {
            return;
        }
        try {
            await client.disconnect();
        } finally {
            sampleStore.setConnection('disconnected');
        }
    };

    const statusLabel = (() => {
        if (!supported) {
            return t('statusUnsupported');
        }
        if (state.connection === 'connecting' || autoConnecting) {
            return t('statusConnecting');
        }
        if (state.connection === 'connected') {
            return t('statusConnected');
        }
        return t('statusDisconnected');
    })();

    return (
        <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/70">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{t('microbit')}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{statusLabel}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={handleConnect}
                        disabled=
                        {!supported ||
                            state.connection === 'connecting' ||
                            state.connection === 'connected' ||
                            state.usingSimulator}
                        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    >
                        {t('connect')}
                    </button>
                    <button
                        type="button"
                        onClick={handleDisconnect}
                        disabled={state.connection !== 'connected'}
                        className="rounded-md border border-transparent bg-zinc-800 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-white"
                    >
                        {t('disconnect')}
                    </button>
                </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-xs text-zinc-500 dark:text-zinc-400 sm:grid-cols-4">
                <div>
                    <dt className="font-medium text-zinc-600 dark:text-zinc-200">{t('hz')}</dt>
                    <dd>{state.hz.toFixed(2)}</dd>
                </div>
                <div>
                    <dt className="font-medium text-zinc-600 dark:text-zinc-200">{t('drops')}</dt>
                    <dd>{state.dropCount}</dd>
                </div>
                <div>
                    <dt className="font-medium text-zinc-600 dark:text-zinc-200">{t('silence')}</dt>
                    <dd>
                        {Number.isFinite(state.silenceMs)
                            ? `${Math.round(state.silenceMs / 1000)}s`
                            : '—'}
                    </dd>
                </div>
                <div>
                    <dt className="font-medium text-zinc-600 dark:text-zinc-200">{t('permission')}</dt>
                    <dd>{state.permissionGranted ? t('granted') : t('pending')}</dd>
                </div>
            </dl>
            {error ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300">
                    {error}
                </p>
            ) : null}
            {!supported ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    {t('webBluetoothWarning')}
                </p>
            ) : null}
        </section>
    );
}
