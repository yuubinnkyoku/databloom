export const translations = {
    ja: {
        // Page
        title: 'Databloom Dashboard',
        subtitle: 'micro:bit v2をWeb Bluetoothで接続し、土壌水分、温度、環境光をリアルタイムでモニタリングします。',

        // BLE Connect
        microbit: 'micro:bit',
        statusUnsupported: 'Web Bluetoothは未対応です',
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
        timeWindow: '時間',
        calibration: '調整',
        setDry: '乾燥に設定',
        setWet: '湿潤に設定',
        reset: 'リセットする',
        dryRaw: '乾燥(Raw)',
        wetRaw: '湿潤(Raw)',
        calibrated: '調整済みかどうか',
        yes: 'はい',
        no: 'いいえ',
        lastMoisturePercent: '最新の水分(%)',
        tools: 'ツール',
        startSimulator: 'シミュレータを開始',
        stopSimulator: 'シミュレータを停止',
        clearData: 'クリアする',
        noSampleReceived: 'まだサンプルを受信していません。',
        savedDryReference: '乾燥参照値を保存しました',
        savedWetReference: '湿潤参照値を保存しました',
        calibrationCleared: '調整をクリアしました。',
        simulatorRunning: 'シミュレータ実行中(2~5 Hz)',

        // Chart
        moisturePercent: '水分(%)',
        moistureRaw: '水分(Raw)',
        temperatureC: '温度(°C)',
        lightRaw: '光(Raw)',
        points: '件',
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

// エラーメッセージの翻訳マッピング
const errorTranslations: Record<string, { ja: string; en: string }> = {
    'Web Bluetooth API globally disabled': {
        ja: 'Web Bluetooth APIがグローバルに無効化されています',
        en: 'Web Bluetooth API globally disabled'
    },
    'Web Bluetooth API is not available in this browser': {
        ja: 'このブラウザではWeb Bluetooth APIが利用できません',
        en: 'Web Bluetooth API is not available in this browser'
    },
    'User cancelled the requestDevice': {
        ja: 'ユーザーがデバイス選択をキャンセルしました',
        en: 'User cancelled the requestDevice'
    },
    'Bluetooth adapter not available': {
        ja: 'Bluetoothアダプターが利用できません',
        en: 'Bluetooth adapter not available'
    },
};

export function translateError(errorMessage: string): string {
    const lang = getLanguage();

    // 完全一致を試す
    for (const [key, translations] of Object.entries(errorTranslations)) {
        if (errorMessage.includes(key)) {
            return translations[lang];
        }
    }

    // 一致しない場合は元のメッセージを返す
    return errorMessage;
}
