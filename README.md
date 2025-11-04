
# Getting Started

推奨：

```bash
bun dev
```

代替：

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

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
