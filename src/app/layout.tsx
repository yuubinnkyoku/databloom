import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Databloom Dashboard",
  description: "micro:bitとWeb Bluetoothで、土壌水分と環境をリアルタイム表示できます。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <a
          href="https://github.com/yuubinnkyoku/databloom"
          target="_blank"
          rel="noopener noreferrer"
          title="Open GitHub repository"
          aria-label="Open GitHub repository"
          className="fixed right-4 top-4 inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white/80 px-3 py-1.5 text-sm text-zinc-800 shadow-sm backdrop-blur transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:bg-white/80 hover:bg-white/90 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100 dark:hover:bg-zinc-900/90 dark:focus-visible:bg-zinc-900/80"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            className="h-4 w-4"
          >
            <path fillRule="evenodd" d="M12 .5C5.73.5.97 5.26.97 11.53c0 4.86 3.15 8.98 7.52 10.43.55.1.76-.24.76-.54 0-.27-.01-1.16-.02-2.11-3.06.66-3.71-1.3-3.71-1.3-.5-1.27-1.23-1.61-1.23-1.61-1.01-.69.08-.68.08-.68 1.11.08 1.7 1.14 1.7 1.14.99 1.7 2.6 1.21 3.23.93.1-.72.39-1.21.71-1.49-2.44-.28-5-1.22-5-5.41 0-1.2.43-2.19 1.14-2.96-.11-.28-.5-1.42.11-2.96 0 0 .95-.3 3.11 1.13a10.8 10.8 0 0 1 2.83-.38c.96 0 1.94.13 2.83.38 2.16-1.43 3.1-1.13 3.1-1.13.61 1.54.22 2.68.11 2.96.71.77 1.14 1.76 1.14 2.96 0 4.2-2.56 5.12-5.01 5.4.4.35.76 1.04.76 2.1 0 1.52-.01 2.74-.01 3.11 0 .3.2.65.77.54 4.36-1.45 7.51-5.57 7.51-10.43C23.03 5.26 18.27.5 12 .5Z" clipRule="evenodd" />
          </svg>
          GitHub
        </a>
        {children}
      </body>
    </html>
  );
}
