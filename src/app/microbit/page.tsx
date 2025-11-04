import { CodeBlock } from '@/components/CodeBlock';
import { promises as fs } from 'fs';
import Link from 'next/link';
import path from 'path';
import { codeToHtml } from 'shiki';

export const dynamic = 'force-static';

export default async function MicrobitCodePage() {
    const filePath = path.join(process.cwd(), 'microbit', 'databloom_microbit.py');
    const code = await fs.readFile(filePath, 'utf8');
    const highlightedLight = await codeToHtml(code, {
        lang: 'python',
        theme: 'github-light',
    });
    const highlightedDark = await codeToHtml(code, {
        lang: 'python',
        theme: 'github-dark',
    });

    return (
        <div className="min-h-screen bg-linear-to-br from-zinc-100 via-white to-zinc-200 py-10 text-zinc-900 dark:from-black dark:via-zinc-950 dark:to-zinc-900 dark:text-zinc-100">
            <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 sm:px-8">
                <header className="flex items-baseline justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">micro:bit スクリプト</h1>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">NUSで送信するMakeCode Pythonのサンプルです。</p>
                    </div>
                    <Link href="/" className="text-sm text-blue-600 underline dark:text-blue-400">戻る</Link>
                </header>

                <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <h2 className="mb-4 text-lg font-semibold">セットアップ手順</h2>
                    
                    <div className="mb-4 space-y-2 text-sm">
                        <p className="text-zinc-700 dark:text-zinc-300">
                            このアプリは micro:bit を BLE の Nordic UART Service (NUS) で受信し、以下のCSV行を1行ずつ受け取ることを想定しています。
                        </p>
                        <ul className="list-inside list-disc space-y-1 text-zinc-600 dark:text-zinc-400">
                            <li>形式: <code className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">seq,moistureRaw,tempC,lightRaw\n</code></li>
                            <li>例: <code className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">123,612,23,120\n</code></li>
                        </ul>
                    </div>

                    <h3 className="mb-3 text-base font-semibold">手順（推奨）:</h3>
                    <ol className="mb-4 list-inside list-decimal space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                        <li>
                            <a 
                                href="https://makecode.microbit.org/" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 underline dark:text-blue-400"
                            >
                                makecode.microbit.org
                            </a> を開き、「新しいプロジェクト」→ 言語を Python に切り替え。
                        </li>
                        <li>
                            <strong className="font-semibold text-orange-600 dark:text-orange-400">重要</strong>: ツールボックスの「拡張機能」(Extensions) をクリックし、「bluetooth」を検索して追加。
                        </li>
                        <li>上記のコードをエディタに貼り付けます。</li>
                        <li>micro:bit をUSB接続して「ダウンロード」で書き込み。</li>
                        <li>センサーを使う場合は、土壌水分センサのアナログ出力を <code className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">P0</code>、GND/V3.3 に接続。</li>
                        <li>ブラウザでこのアプリを開き、「micro:bitに接続」ボタンから <code className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">BBC micro:bit</code> を選択してペアリング。</li>
                    </ol>

                    <h3 className="mb-3 text-base font-semibold">注意:</h3>
                    <ul className="list-inside list-disc space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                        <li>
                            <strong className="font-semibold text-red-600 dark:text-red-400">Bluetooth拡張機能を追加しないと、コードがエラーになります。</strong>
                        </li>
                        <li>デバイス名は <code className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">BBC micro:bit</code> プレフィックスで検出します。</li>
                        <li>Web Bluetooth 対応ブラウザ（Chrome系）が必要です。iOS Safari は未対応です。</li>
                    </ul>
                </section>

                <CodeBlock
                    label="microbit/databloom_microbit.py"
                    rawCode={code}
                    codeHtmlLight={highlightedLight}
                    codeHtmlDark={highlightedDark}
                />
            </main>
        </div>
    );
}
