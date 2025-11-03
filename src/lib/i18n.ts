export const translations = {
    ja: {
        // Page
        title: 'Databloom ダッシュボード',
        subtitle: 'micro:bit v2をWeb Bluetooth（ペアリング不要）で接続し、土壌水分、温度、環境光をリアルタイムでモニタリング。',

        // BLE Connect
        microbit: 'micro:bit',
        statusUnsupported: 'Web Bluetoothは未対応',
        statusConnecting: '接続中…',
        statusConnected: '接続済み',
        statusDisconnected: '未接続',
        connect: '接続',
        disconnect: '切断',
        hz: 'Hz',
        drops: 'ドロップ',
        silence: '無音',
        permission: '権限',
        granted: '許可済み',
        pending: '保留中',
        webBluetoothWarning: 'Web Bluetoothにはデスクトップ版Chromium系ブラウザが必要です。恐らく、あなたのブラウザではサポートされていません',

        // Controls
        timeWindow: '時間ウィンドウ',
        calibration: 'キャリブレーション',
        setDry: '乾燥を設定',
        setWet: '湿潤を設定',
        reset: 'リセット',
        dryRaw: '乾燥Raw',
        wetRaw: '湿潤Raw',
        calibrated: 'キャリブレーション済み?',
        yes: 'はい',
        no: 'いいえ',
        lastMoisturePercent: '最新の水分%',
        tools: 'ツール',
        startSimulator: 'シミュレータ開始',
        stopSimulator: 'シミュレータ停止',
        clearData: 'データクリア',
        noSampleReceived: 'まだサンプルを受信していません。',
        savedDryReference: '乾燥参照値を保存しました',
        savedWetReference: '湿潤参照値を保存しました',
        calibrationCleared: 'キャリブレーションをクリアしました。',
        simulatorRunning: 'シミュレータ実行中（2–5 Hz）。',

        // Chart
        moisturePercent: '水分 %',
        moistureRaw: '水分 Raw',
        temperatureC: '温度 °C',
        lightRaw: '光 Raw',
        points: 'ポイント',
        noData: 'データなし',
        awaitingSamples: 'サンプルを待機中…',
    },
    en: {
        // Page
        title: 'Databloom Dashboard',
        subtitle: 'Connect a micro:bit v2 over Web Bluetooth (No Pairing) to monitor soil moisture, temperature, and ambient light in real time.',

        // BLE Connect
        microbit: 'micro:bit',
        statusUnsupported: 'Web Bluetooth unsupported',
        statusConnecting: 'Connecting…',
        statusConnected: 'Connected',
        statusDisconnected: 'Disconnected',
        connect: 'Connect',
        disconnect: 'Disconnect',
        hz: 'Hz',
        drops: 'Drops',
        silence: 'Silence',
        permission: 'Permission',
        granted: 'Granted',
        pending: 'Pending',
        webBluetoothWarning: 'Web Bluetooth requires Chrome on desktop with HTTPS (including localhost via `chrome://flags` ➝ insecure origins treated as secure).',

        // Controls
        timeWindow: 'Time Window',
        calibration: 'Calibration',
        setDry: 'Set Dry',
        setWet: 'Set Wet',
        reset: 'Reset',
        dryRaw: 'Dry Raw',
        wetRaw: 'Wet Raw',
        calibrated: 'Calibrated?',
        yes: 'Yes',
        no: 'No',
        lastMoisturePercent: 'Last Moisture %',
        tools: 'Tools',
        startSimulator: 'Start Simulator',
        stopSimulator: 'Stop Simulator',
        clearData: 'Clear Data',
        noSampleReceived: 'No sample received yet.',
        savedDryReference: 'Saved dry reference',
        savedWetReference: 'Saved wet reference',
        calibrationCleared: 'Calibration cleared.',
        simulatorRunning: 'Simulator running (2–5 Hz).',

        // Chart
        moisturePercent: 'Moisture %',
        moistureRaw: 'Moisture Raw',
        temperatureC: 'Temperature °C',
        lightRaw: 'Light Raw',
        points: 'pts',
        noData: 'No data',
        awaitingSamples: 'Awaiting samples…',
    },
} as const;

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations['ja'];

let currentLanguage: Language = 'ja'; // デフォルトは日本語

export function setLanguage(lang: Language) {
    currentLanguage = lang;
    if (typeof window !== 'undefined') {
        localStorage.setItem('databloom:language', lang);
    }
}

export function getLanguage(): Language {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('databloom:language') as Language | null;
        if (stored && (stored === 'ja' || stored === 'en')) {
            return stored;
        }
    }
    return currentLanguage;
}

export function t(key: TranslationKey): string {
    const lang = getLanguage();
    return translations[lang][key];
}
