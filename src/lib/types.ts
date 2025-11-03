export type RawSample = {
  seq: number;
  moistureRaw: number;
  tempC: number;
  lightRaw: number;
  ts: number; // browser timestamp in ms
};

export type CalibratedSample = RawSample & {
  moisturePercent: number | null;
};

export type CalibrationPoints = {
  dry: number | null;
  wet: number | null;
};

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

export type DeviceStats = {
  hz: number;
  dropCount: number;
  lastSeq: number | null;
  silenceMs: number;
};

export type TimeWindow = "5m" | "15m" | "1h" | "6h" | "24h";

export interface AggregateStats {
  min: number;
  max: number;
  sum: number;
  last: number;
  count: number;
}

export interface MinuteBucket {
  start: number; // bucket start time (ms since epoch)
  moistureRaw: AggregateStats;
  tempC: AggregateStats;
  lightRaw: AggregateStats;
}

export interface SampleStateSnapshot {
  connection: ConnectionStatus;
  permissionGranted: boolean;
  usingSimulator: boolean;
  lastSample: RawSample | null;
  rawSamples: RawSample[];
  minuteBuckets: MinuteBucket[];
  activeBucket: MinuteBucket | null;
  dropCount: number;
  hz: number;
  silenceMs: number;
}

export type NusPayload = {
  seq: number;
  moistureRaw: number;
  tempC: number;
  lightRaw: number;
};

export const TIME_WINDOWS: TimeWindow[] = ["5m", "15m", "1h", "6h", "24h"];
