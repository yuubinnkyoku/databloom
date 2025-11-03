import { CodeBlock } from '@/components/CodeBlock';
import { promises as fs } from 'fs';
import Link from 'next/link';
import path from 'path';
import { codeToHtml } from 'shiki';

export const dynamic = 'force-static';

export default async function MicrobitCodePage() {
    const filePath = path.join(process.cwd(), 'microbit', 'databloom_microbit.py');
    const code = await fs.readFile(filePath, 'utf8');
    const highlighted = await codeToHtml(code, {
        lang: 'python',
        theme: 'github-light',
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

                <CodeBlock label="microbit/databloom_microbit.py" rawCode={code} codeHtml={highlighted} />

                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    手順は README の「micro:bit セットアップ（BLE/UART）」をご覧ください。
                </p>
            </main>
        </div>
    );
}
