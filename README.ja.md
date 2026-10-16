# 音声→MIDI / Audio to MIDI

Spotify Basic Pitchで短い録音から音符を検出し、端末内だけでMIDIへ変換します。

## 主な機能

- 音声ファイル1つ、0.5〜60秒・最大50 MiB
- WAV/MP3と、ブラウザーが対応するM4A/AAC/OGG/FLAC
- CPUによる端末内解析、進捗表示、即時キャンセル
- 音符数・音域・開始/終了時刻の確認
- 保存名の編集と標準MIDIタイプ1出力
- 日本語/英語、PC/スマートフォン向けの明色UI

## 使い方

1. 生成された `audio-to-midi.html` または `dist/index.html` を開きます。
2. 短いメロディーや1つの楽器の録音を選びます。
3. 「音声を解析」を押します。速度は端末によります。
4. 結果と保存名を確認し、「MIDIを保存」を押します。
5. 音楽アプリで採譜結果を確認してください。

## プライバシー

音声・音符・推論はブラウザー内で完結し、外部送信や解析時のダウンロードはありません。保存する設定は言語のみです。ページを再読み込み・終了すると音声と音符は失われます。

## 対応環境・制限

現在は **v0.1の開発段階**です。Web Audio・Worker・DecompressionStream対応のChrome/Edge/Firefox/Safariを対象にしています。Windows・Android・iOS実機での受け入れ確認は未完了です。[検証記録](docs/VERIFICATION.md)を参照してください。

採譜は推定です。複数楽器の楽曲、雑音、倍音などで誤検出があります。MIDIは音声ではありません。時間を保持するための固定120 BPM、チャンネル1、ピアノ音色0、ベロシティ96で保存します。テンポ・強弱は推定せず、ピッチベンドも出力しません。

ピアノロール・試聴・マイク録音・編集は今後の段階で追加予定です。v0.1では誤検出を修正できないため、保存後に音楽アプリで確認してください。

## 単一HTML・オフライン

ビルドは `dist/index.html`、同一内容の `audio-to-midi.html`、自己展開版 `dist/index.self-extract.html` を生成します。モデル・ランタイム・Worker・ライセンスも内包し、配布後のサーバーは不要です。資産を圧縮しているため両版ともDecompressionStream対応が必要です。

## 開発

[AGENTS.md](AGENTS.md)・[APP_SPEC.md](APP_SPEC.md)を先に確認してください。[開発計画](docs/DEVELOPMENT_PLAN.md)と[受け入れマトリクス](docs/ACCEPTANCE_MATRIX.md)はv0.1〜v1.0を対象にしています。

Windowsでは `build-standalone.bat` を実行します。PowerShellの構文検査と `scripts/check-repository.ps1` が正式なビルド検証です。Node 24で `npm ci --ignore-scripts`、`npm test`、`npm run test:model`、Chromium導入後に `npm run test:browser` を実行できます。

生成HTMLは直接編集せず、`src/`から再ビルドしてください。

## ライセンス

アプリはMIT。Basic Pitchとモデル、TensorFlow.jsはApache-2.0、Tonejs MIDIはMITです。[第三者告知](THIRD_PARTY_NOTICES.md)とアプリ内ヘルプの全文を参照してください。
