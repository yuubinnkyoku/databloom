'use client';

import { useState } from 'react';

export function CodeBlock({ codeHtml, rawCode, label }: { codeHtml: string; rawCode: string; label?: string }) {
    const [copied, setCopied] = useState(false);

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(rawCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        } catch {
            // Fallback: select text approach could be added if needed
            alert('クリップボードにコピーできませんでした');
        }
    }

    return (
        <div className="rounded-lg border border-zinc-300 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b px-4 py-2 text-sm dark:border-zinc-700">
                <span className="text-zinc-700 dark:text-zinc-300">{label ?? 'code'}</span>
                <button
                    type="button"
                    onClick={handleCopy}
                    className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-700 ring-1 ring-inset ring-zinc-300 hover:bg-zinc-200 active:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-600 dark:hover:bg-zinc-700"
                    aria-label="コピー"
                >
                    {copied ? 'コピーしました' : 'コピー'}
                </button>
            </div>
            <div className="overflow-x-auto">
                <pre className="p-4 text-sm leading-6" dangerouslySetInnerHTML={{ __html: codeHtml }} />
            </div>
        </div>
    );
}
