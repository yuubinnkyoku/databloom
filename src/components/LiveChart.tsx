'use client';

import { useMemo } from 'react';

import type { ChartData, ChartOptions, TooltipItem } from 'chart.js';
import {
    Chart as ChartJS,
    Decimation,
    Filler,
    Legend,
    LineElement,
    LinearScale,
    PointElement,
    TimeScale,
    Tooltip,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { Line } from 'react-chartjs-2';

import { applyCalibrationToRaw, useCalibration } from '../lib/calibration';
import { t } from '../lib/i18n';
import { useSampleState } from '../lib/store';
import { getWindowDurationMs, usesMinuteBuckets } from '../lib/timeWindow';
import { TimeWindow } from '../lib/types';

ChartJS.register(TimeScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler, Decimation);

const COLORS = {
    moisturePercent: '#2563eb',
    moistureRaw: '#10b981',
    tempC: '#f97316',
    lightRaw: '#a855f7',
};

const SHARED_OPTIONS: ChartOptions<'line'> = {
    animation: false,
    responsive: true,
    maintainAspectRatio: false,
    parsing: false,
    normalized: true,
    spanGaps: true,
    interaction: {
        intersect: false,
        mode: 'nearest' as const,
    },
    scales: {
        x: {
            type: 'time' as const,
            adapters: {},
            ticks: {
                autoSkip: true,
                maxTicksLimit: 6,
                color: '#71717a',
            },
            grid: {
                color: 'rgba(113, 113, 122, 0.15)',
            },
        },
        y: {
            ticks: {
                color: '#71717a',
            },
            grid: {
                color: 'rgba(113, 113, 122, 0.1)',
            },
        },
    },
    plugins: {
        legend: {
            display: false,
        },
        decimation: {
            enabled: true,
            algorithm: 'lttb',
            samples: 500,
        },
        tooltip: {
            displayColors: false,
            mode: 'nearest' as const,
            intersect: false,
            callbacks: {
                label(context: TooltipItem<'line'>) {
                    const value = context.parsed?.y;
                    if (value === null || typeof value === 'undefined') {
                        return '';
                    }
                    return `${value}`;
                },
            },
        },
    },
};

type ChartMetric = 'moisturePercent' | 'moistureRaw' | 'tempC' | 'lightRaw';

type MetricConfig = {
    key: ChartMetric;
    label: string;
    color: string;
    formatValue?: (value: number) => string;
};

type LiveChartProps = {
    timeWindow: TimeWindow;
};

export function LiveChart({ timeWindow }: LiveChartProps) {
    const METRICS: MetricConfig[] = useMemo(() => [
        { key: 'moisturePercent', label: t('moisturePercent'), color: COLORS.moisturePercent, formatValue: (v) => `${v.toFixed(1)}%` },
        { key: 'moistureRaw', label: t('moistureRaw'), color: COLORS.moistureRaw },
        { key: 'tempC', label: t('temperatureC'), color: COLORS.tempC, formatValue: (v) => `${v.toFixed(1)}°C` },
        { key: 'lightRaw', label: t('lightRaw'), color: COLORS.lightRaw },
    ], []);
    const state = useSampleState();
    const calibration = useCalibration();
    const { rawSamples, minuteBuckets, activeBucket } = state;

    const datasetsByMetric = useMemo(() => {
        const windowMs = getWindowDurationMs(timeWindow);
        const useBuckets = usesMinuteBuckets(timeWindow);

        const minuteBucketSeries = (() => {
            const buckets = [...minuteBuckets];
            if (activeBucket) {
                buckets.push(activeBucket);
            }
            if (buckets.length === 0) {
                return buckets;
            }
            const reference = buckets[buckets.length - 1].start + 60000;
            const cutoff = reference - windowMs;
            return buckets.filter((bucket) => bucket.start + 60000 >= cutoff);
        })();

        const rawSeries = useBuckets
            ? []
            : (() => {
                if (rawSamples.length === 0) {
                    return [] as typeof rawSamples;
                }
                const reference = rawSamples[rawSamples.length - 1].ts;
                const cutoff = reference - windowMs;
                return rawSamples.filter((sample) => sample.ts >= cutoff);
            })();

        const datasets: Record<ChartMetric, { x: number; y: number }[]> = {
            moisturePercent: [],
            moistureRaw: [],
            tempC: [],
            lightRaw: [],
        };

        if (useBuckets) {
            for (const bucket of minuteBucketSeries) {
                const ts = bucket.start + 30000; // midpoint of minute bucket
                const avgMoisture = bucket.moistureRaw.count > 0 ? bucket.moistureRaw.sum / bucket.moistureRaw.count : null;
                const avgTemp = bucket.tempC.count > 0 ? bucket.tempC.sum / bucket.tempC.count : null;
                const avgLight = bucket.lightRaw.count > 0 ? bucket.lightRaw.sum / bucket.lightRaw.count : null;

                if (avgMoisture !== null) {
                    datasets.moistureRaw.push({ x: ts, y: Number(avgMoisture.toFixed(2)) });
                    const percent = applyCalibrationToRaw(avgMoisture, calibration);
                    if (percent !== null) {
                        datasets.moisturePercent.push({ x: ts, y: Number(percent.toFixed(2)) });
                    }
                }
                if (avgTemp !== null) {
                    datasets.tempC.push({ x: ts, y: Number(avgTemp.toFixed(2)) });
                }
                if (avgLight !== null) {
                    datasets.lightRaw.push({ x: ts, y: Number(avgLight.toFixed(2)) });
                }
            }
        } else {
            for (const sample of rawSeries) {
                datasets.moistureRaw.push({ x: sample.ts, y: sample.moistureRaw });
                const percent = applyCalibrationToRaw(sample.moistureRaw, calibration);
                if (percent !== null) {
                    datasets.moisturePercent.push({ x: sample.ts, y: Number(percent.toFixed(2)) });
                }
                datasets.tempC.push({ x: sample.ts, y: sample.tempC });
                datasets.lightRaw.push({ x: sample.ts, y: sample.lightRaw });
            }
        }

        return datasets;
    }, [rawSamples, minuteBuckets, activeBucket, timeWindow, calibration]);

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            {METRICS.map((metric) => {
                const points = datasetsByMetric[metric.key];
                const hasData = points.length > 0;
                const data: ChartData<'line'> = {
                    datasets: [
                        {
                            label: metric.label,
                            data: points,
                            borderColor: metric.color,
                            backgroundColor: metric.color,
                            pointRadius: 0,
                            borderWidth: 1.5,
                            tension: 0,
                            fill: false,
                        },
                    ],
                };

                const options: ChartOptions<'line'> = {
                    ...SHARED_OPTIONS,
                    plugins: {
                        ...SHARED_OPTIONS.plugins,
                        tooltip: {
                            ...SHARED_OPTIONS.plugins?.tooltip,
                            callbacks: {
                                label(context: TooltipItem<'line'>) {
                                    const value = context.parsed?.y;
                                    if (value === null || typeof value === 'undefined') {
                                        return '';
                                    }
                                    if (metric.formatValue) {
                                        return metric.formatValue(value);
                                    }
                                    return `${value}`;
                                },
                            },
                        },
                    },
                };

                return (
                    <article
                        key={metric.key}
                        className="flex flex-col rounded-lg border border-zinc-200 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/70"
                    >
                        <header className="mb-2 flex items-center justify-between text-sm font-medium text-zinc-700 dark:text-zinc-200">
                            <span>{metric.label}</span>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">{hasData ? `${points.length} ${t('points')}` : t('noData')}</span>
                        </header>
                        <div className="h-[220px]">
                            {hasData ? <Line data={data} options={options} /> : <EmptyState />}
                        </div>
                    </article>
                );
            })}
        </div>
    );
}

function EmptyState() {
    return (
        <div className="flex h-full items-center justify-center rounded-md border border-dashed border-zinc-300 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            {t('awaitingSamples')}
        </div>
    );
}
