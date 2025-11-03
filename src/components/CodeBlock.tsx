'use client';

import { useState } from 'react';

type CodeBlockProps = {
    rawCode: string;
    label?: string;
    codeHtml?: string;
    codeHtmlLight?: string;
    codeHtmlDark?: string;
};

export function CodeBlock({ codeHtml, codeHtmlLight, codeHtmlDark, rawCode, label }: CodeBlockProps) {
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
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b px-4 py-2 text-sm dark:border-zinc-700">
                <span className="text-zinc-700 dark:text-zinc-300">{label ?? 'code'}</span>
                <div className="flex items-center gap-2">
                    {/* Visible feedback pill */}
                    <span
                        className={`select-none rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-500/20 transition-all duration-200 dark:text-emerald-400 ${copied ? 'opacity-100 translate-y-0' : 'pointer-events-none -translate-y-0.5 opacity-0'
                            }`}
                        aria-hidden="true"
                    >
                        コピーしました！
                    </span>
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-300 hover:bg-zinc-200 active:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-600 dark:hover:bg-zinc-700"
                        aria-label={copied ? 'コピーしました' : 'コピー'}
                        title={copied ? 'コピーしました' : 'コピー'}
                    >
                        {copied ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
                                <path fillRule="evenodd" d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.5a1 1 0 0 1-1.445.03L3.29 10.758a1 1 0 1 1 1.42-1.405l3.07 3.098 6.54-6.768a1 1 0 0 1 1.384-.394z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="h-4 w-4">
                                <rect x="9" y="9" width="13" height="13" rx="2" />
                                <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                            </svg>
                        )}
                        <span className="sr-only" aria-live="polite">{copied ? 'コピーしました' : 'コピー'}</span>
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                {/* Shiki の <pre> をそのまま描画するため、ラッパーに挿入します */}
                {codeHtmlLight || codeHtmlDark ? (
                    <>
                        {codeHtmlLight && (
                            <div className="only-light p-0 text-sm leading-6" dangerouslySetInnerHTML={{ __html: codeHtmlLight }} />
                        )}
                        {codeHtmlDark && (
                            <div className="only-dark p-0 text-sm leading-6" dangerouslySetInnerHTML={{ __html: codeHtmlDark }} />
                        )}
                    </>
                ) : (
                    <div className="p-0 text-sm leading-6" dangerouslySetInnerHTML={{ __html: codeHtml ?? '' }} />
                )}
            </div>
        </div>
    );
}
