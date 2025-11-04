This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## micro:bit セットアップ（BLE/UART）

このアプリは micro:bit を BLE の Nordic UART Service (NUS) で受信し、以下のCSV行を1行ずつ受け取ることを想定しています。

- 形式: `seq,moistureRaw,tempC,lightRaw\n`
- 例: `123,612,23,120\n`

リポジトリに MakeCode Python 用のサンプルを用意しています。

- ファイル: `microbit/databloom_microbit.py`
- 挙動: 250ms間隔で `P0` のアナログ値（0-1023）、内蔵温度（摂氏）、内蔵光レベル（0-255）を読み取り、CSVで `bluetooth.uart_write_line` 送信します。

手順（推奨）:

1. <https://makecode.microbit.org/> を開き、「新しいプロジェクト」→ 言語を Python に切り替え。
2. **重要**: ツールボックスの「拡張機能」(Extensions) をクリックし、「bluetooth」を検索して追加。
3. `microbit/databloom_microbit.py` の中身をエディタに貼り付けます。
4. micro:bit をUSB接続して「ダウンロード」で書き込み。
5. センサーを使う場合は、土壌水分センサのアナログ出力を `P0`、GND/V3.3 に接続。
6. ブラウザでこのアプリを開き、「micro:bitに接続」ボタンから `BBC micro:bit` を選択してペアリング。

注意:

- **Bluetooth拡張機能を追加しないと、コードがエラーになります。**
- デバイス名は `BBC micro:bit` プレフィックスで検出します。
- Web Bluetooth 対応ブラウザ（Chrome系）が必要です。iOS Safari は未対応です。
