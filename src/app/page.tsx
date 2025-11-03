'use client';

import { useState } from 'react';

import { BLEConnect } from '../components/BLEConnect';
import { Controls } from '../components/Controls';
import { LiveChart } from '../components/LiveChart';
import { TimeWindow } from '../lib/types';

const DEFAULT_WINDOW: TimeWindow = '1h';

export default function Home() {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>(DEFAULT_WINDOW);

  return (
    <div className="min-h-screen bg-linear-to-br from-zinc-100 via-white to-zinc-200 py-10 text-zinc-900 dark:from-black dark:via-zinc-950 dark:to-zinc-900 dark:text-zinc-100">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 sm:px-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Databloom Dashboard</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Connect a micro:bit v2 over Web Bluetooth (No Pairing) to monitor soil moisture, temperature, and ambient light in real time.
          </p>
        </header>

        <BLEConnect />
        <Controls timeWindow={timeWindow} onTimeWindowChange={setTimeWindow} />
        <LiveChart timeWindow={timeWindow} />
      </main>
    </div>
  );
}
