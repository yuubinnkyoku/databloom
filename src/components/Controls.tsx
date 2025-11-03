'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { sampleStore, useSampleState } from '../lib/store';
import { startSimulator } from '../lib/simulator';
import {
  applyCalibrationToRaw,
  isCalibrated,
  resetCalibration,
  updateCalibration,
  useCalibration,
} from '../lib/calibration';
import { TIME_WINDOWS, TimeWindow } from '../lib/types';
import { getWindowLabel } from '../lib/timeWindow';

const WINDOW_STORAGE_KEY = 'databloom:window:v1';

type ControlsProps = {
  timeWindow: TimeWindow;
  onTimeWindowChange: (next: TimeWindow) => void;
};

export function Controls({ timeWindow, onTimeWindowChange }: ControlsProps) {
  const state = useSampleState();
  const calibration = useCalibration();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const simulatorRef = useRef<ReturnType<typeof startSimulator> | null>(null);
  const calibrated = isCalibrated(calibration);
  const latestMoisturePercent = useMemo(() => {
    if (!state.lastSample) {
      return null;
    }
    return applyCalibrationToRaw(state.lastSample.moistureRaw, calibration);
  }, [state.lastSample, calibration]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const stored = window.localStorage.getItem(WINDOW_STORAGE_KEY) as TimeWindow | null;
    if (stored && TIME_WINDOWS.includes(stored)) {
      onTimeWindowChange(stored);
    }
  }, [onTimeWindowChange]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(WINDOW_STORAGE_KEY, timeWindow);
  }, [timeWindow]);

  useEffect(() => {
    return () => {
      simulatorRef.current?.stop();
      simulatorRef.current = null;
    };
  }, []);

  const setDry = () => {
    if (!state.lastSample) {
      setStatusMessage('No sample received yet.');
      return;
    }
    updateCalibration({ dry: state.lastSample.moistureRaw });
    setStatusMessage(`Saved dry reference (${state.lastSample.moistureRaw}).`);
  };

  const setWet = () => {
    if (!state.lastSample) {
      setStatusMessage('No sample received yet.');
      return;
    }
    updateCalibration({ wet: state.lastSample.moistureRaw });
    setStatusMessage(`Saved wet reference (${state.lastSample.moistureRaw}).`);
  };

  const clearCalibration = () => {
    resetCalibration();
    setStatusMessage('Calibration cleared.');
  };

  const toggleSimulator = () => {
    if (state.usingSimulator) {
      simulatorRef.current?.stop();
      simulatorRef.current = null;
      sampleStore.setUsingSimulator(false);
      sampleStore.setConnection('disconnected');
      sampleStore.resetData();
      return;
    }

    sampleStore.resetData();
    sampleStore.setUsingSimulator(true);
    sampleStore.setConnection('connected');
    simulatorRef.current = startSimulator((payload) => sampleStore.ingest(payload));
    setStatusMessage('Simulator running (2–5 Hz).');
  };

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/70">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-100">Time Window</p>
        <div className="flex flex-wrap gap-2">
          {TIME_WINDOWS.map((window) => {
            const selected = window === timeWindow;
            return (
              <button
                key={window}
                type="button"
                onClick={() => onTimeWindowChange(window)}
                className={[
                  'rounded-md border px-3 py-1.5 text-sm font-medium transition',
                  selected
                    ? 'border-indigo-500 bg-indigo-500 text-white'
                    : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800',
                ].join(' ')}
              >
                {getWindowLabel(window)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-100">Calibration</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={setDry}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
            disabled={!state.lastSample}
          >
            Set Dry
          </button>
          <button
            type="button"
            onClick={setWet}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
            disabled={!state.lastSample}
          >
            Set Wet
          </button>
          <button
            type="button"
            onClick={clearCalibration}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950/60"
          >
            Reset
          </button>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-xs text-zinc-500 dark:text-zinc-400 sm:grid-cols-4">
          <div>
            <dt className="font-medium text-zinc-600 dark:text-zinc-200">Dry Raw</dt>
            <dd>{calibration.dry ?? '—'}</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-600 dark:text-zinc-200">Wet Raw</dt>
            <dd>{calibration.wet ?? '—'}</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-600 dark:text-zinc-200">Calibrated?</dt>
            <dd>{calibrated ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-600 dark:text-zinc-200">Last Moisture %</dt>
            <dd>{latestMoisturePercent !== null ? `${latestMoisturePercent.toFixed(1)}%` : '—'}</dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-100">Tools</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={toggleSimulator}
            className={[
              'rounded-md border px-3 py-1.5 text-sm font-medium transition',
              state.usingSimulator
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800',
            ].join(' ')}
          >
            {state.usingSimulator ? 'Stop Simulator' : 'Start Simulator'}
          </button>
          <button
            type="button"
            onClick={() => sampleStore.resetData()}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Clear Data
          </button>
        </div>
      </div>

      {statusMessage ? (
        <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          {statusMessage}
        </p>
      ) : null}
    </section>
  );
}

