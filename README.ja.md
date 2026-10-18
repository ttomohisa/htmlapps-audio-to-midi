# Audio to MIDI

[![GitHub Pages](https://github.com/ttomohisa/htmlapps-audio-to-midi/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/ttomohisa/htmlapps-audio-to-midi/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Single HTML](https://img.shields.io/badge/distribution-single%20HTML-0ea5e9)](https://ttomohisa.github.io/htmlapps-audio-to-midi/)

[English README](README.md)

短い録音をSpotify Basic Pitchで解析し、編集できる音符とMIDIへ変換する単一HTMLアプリです。音声を外部へアップロードせず、端末内だけで処理します。

## 🚀 デモ

### [GitHub PagesでAudio to MIDIを開く](https://ttomohisa.github.io/htmlapps-audio-to-midi/)

GitHub Pagesから最初のHTMLを読み込んだ後、録音・音符検出・編集・再生・保存は端末内で処理されます。モデルも内包しているため、インストールやアカウント登録は不要です。

[![合成メロディーと検出した音符を表示したAudio to MIDIの画面](assets/screenshot-ja.png)](https://ttomohisa.github.io/htmlapps-audio-to-midi/)

## 主な機能

- **ファイルでもマイクでも** — 短い音声ファイルを読み込むか、音量メーターを見ながら録音し、試聴してから解析できます。
- **端末内で音符を検出** — 内包したBasic Pitchモデルで音高と時刻を推定。進捗表示とキャンセルに対応します。
- **聴き比べながら修正** — 元音声と音符の合成音を比較し、ピアノロールで音程や時刻を直せます。
- **必要な音符に整える** — 追加・削除・分割・結合、短音削除や任意の秒単位グリッド補正をプレビュー。元に戻す／やり直すは最大100操作です。
- **用途に合わせて保存** — 音楽アプリ向けMIDIと、正確な開始・終了秒数を持つCSV音符表を、好きなファイル名で保存できます。
- **ファイルを外へ出さない単一HTML** — モデル・ランタイム・ライセンスを内包。日本語／英語UIと、スマートフォン向け「入力・音符・保存」タブに対応します。

## すぐに使う

### Webで使う

WindowsまたはAndroidのChromeで[デモを開く](https://ttomohisa.github.io/htmlapps-audio-to-midi/)だけで利用できます。

### ダウンロードして使う

1. [audio-to-midi.html](https://github.com/ttomohisa/htmlapps-audio-to-midi/blob/main/audio-to-midi.html)をGitHubのダウンロードボタンから保存します。
2. 保存したHTMLをChromeで開きます。通信を切った状態でも、音声ファイルの選択・解析・保存ができます。

通常版と、小さく配布できる[自己展開版](https://ttomohisa.github.io/htmlapps-audio-to-midi/index.self-extract.html)の両方に必要な資産を内包しています。自己展開版は、開いた後のページを保存せず、リンクを右クリックして「名前を付けてリンク先を保存」を使ってください。両版ともDecompressionStream対応が必要です。ローカルHTMLでマイクを使えない場合は、HTTPSのデモで録音してください。

### ビルドして使う

リポジトリをダウンロードまたはクローンし、Windowsで `build-standalone.bat` を実行します。初回は固定バージョンの依存パッケージを取得し、ハッシュを検証します。`dist/index.html`、同一内容の `audio-to-midi.html`、`dist/index.self-extract.html` が生成されます。生成したHTMLをコピーすれば、オフラインで利用できます。

## 使い方

1. 音声ファイルを1つ選ぶか、「録音」を押してマイクを許可し、短いメロディーを録ります。「録音を停止」して、解析前に試聴してください。
2. 「音声を解析」を押します。処理中はページを表示したままにします。
3. 「元音声」と「音符の合成音」を、再生・一時停止・停止・シークで聴き比べます。
4. ピアノロールを拡大・スクロールして音符を選び、音程や時刻を修正します。足りない音符の追加や、余計な音符の削除もできます。
5. MIDIまたはCSV音符表を選び、保存名を編集して保存します。
6. MIDIを音楽アプリで開いて採譜結果を確認してください。MIDIに元の録音は含まれません。

### 検出設定

まずは「標準」で解析します。余計な音符が多いときは「少なめ」にして再解析を試してください。ただし、必要な弱い音や短い音も見落とす場合があります。「多め」は検出感度を上げます。詳細設定では、しきい値・最短長さ・音域を指定できます。変更は次の解析時に適用されます。

ごく小さな雑音でも音符が出ることがあります。雑音除去を保証する設定ではないため、元音声と聴き比べてください。

### 音符の編集

音符を選び、近くのボタンや直接入力で音高・開始時刻・終了時刻を修正します。C4はMIDI 60、時刻ボタンは0.05秒刻みです。追加すると再生位置にC4の音符を置きます。

選択音符の分割や、同じ音高で間隔0.05秒以内の隣接音符の結合ができます。短音削除と任意の秒単位グリッド補正は、変更内容をプレビューしてから適用し、まとめて1回で元に戻せます。グリッド補正は初期OFFで、テンポは推定しません。

入力欄以外では **Ctrl/⌘+Z** で元に戻す、**Ctrl/⌘+Shift+Z** でやり直す操作ができます。再生とMIDI／CSV保存には編集後の音符を使います。再解析や入力変更で編集を破棄する前には確認があり、再解析の失敗・中止では前の結果と履歴を保持します。

### 録音と中断

録音は最大59秒です。マイクの許可、MediaRecorder、端末で録音・デコードできる形式が必要です。録音できない環境でもファイル変換は使えます。停止時にマイクを解放し、録音中の音声をスピーカーには流しません。

ページを隠すと再生を一時停止し、録音を停止して、進行中の解析を中止します。戻ってから明示的に解析し直してください。完成済みの前の結果は保持します。終了・再読み込みの前に必要な録音や出力を保存してください。セッションは復元されません。

## GitHub Pagesで公開する

[Pagesワークフロー](.github/workflows/deploy-pages.yml)は `main` へのプッシュ時に両HTMLをビルド・検証し、GitHub Pagesが有効な場合に `dist` を公開します。リポジトリの初期設定では **Settings → Pages → Source → GitHub Actions** を選びます。

## 開発とビルド

変更前に [AGENTS.md](AGENTS.md) と [APP_SPEC.md](APP_SPEC.md) を確認してください。

```text
src/                         # テンプレート、UI、純粋関数、Worker推論
app.config.json              # アプリ情報とバージョン（1.0.0）
dependencies.json            # 固定依存バージョンと内包対象
dependencies.lock.json       # 検証済みパッケージハッシュ
scripts/                     # PowerShellのビルド・検証
tests/                       # 契約・モデル・ブラウザー試験
dist/                        # 生成HTMLとマニフェスト
```

PowerShellの構文検査を先に実行し、その後リポジトリを検証します。

```powershell
./scripts/check-powershell-syntax.ps1
./scripts/check-repository.ps1
```

Node 24でのテスト：

```sh
npm ci --ignore-scripts
npm test
npm run test:model
npx playwright install chromium
npm run test:browser
```

モデル試験には通常ビルドで検証したパッケージキャッシュが必要です。`npm run test:performance` と `npm run test:noise` は任意の特性測定で、通常の文書修正ごとに実行する必要はありません。生成HTMLを直接編集せず、開発用ソースを変更して再ビルドしてください。依存更新には `scripts/update-dependency.ps1` を使い、固定バージョンとハッシュの検証を維持します。

## プライバシーと通信防止

- 音声・音符・推論はブラウザー内で完結し、アップロード・アクセス解析・実行時のモデル取得はありません。
- Content Security Policyに `connect-src 'none'` を含みます。
- モデル・ランタイム・Worker・ライセンスをHTMLに内包しています。
- 保存する設定は言語のみです。音声・編集・録音は現在のページセッション内に保持します。

Web版では最初のHTML配信が発生します。通信を完全に切って使う場合は、保存済みHTMLをローカルで開いてください。終了や再読み込みでセッションデータは失われ、スマートフォンでは終了警告が出ない場合があります。

## 制限事項

- **バージョン1.0.0**の対象は、Web Audio・Worker・DecompressionStream対応のWindows／AndroidのChromeです。他のOS／ブラウザー、DAW再生、読み上げ支援は未検証です。[リリース判断と検証範囲](docs/RELEASE_CHECKLIST.md)を参照してください。
- ファイルは1つずつ、**0.5〜60秒・最大50 MiB**です。WAV／MP3に加え、M4A／AAC／OGG／FLAC／WebMもブラウザーがデコードできる場合に使えます。
- 採譜は推定です。複数楽器の楽曲・雑音・倍音などで誤検出が起きます。簡易合成音は元の楽器の音色を再現しません。
- MIDIは秒数を保持するための固定120 BPM、チャンネル1、ピアノ音色0、ベロシティ96で保存します。テンポ・強弱は推定せず、ピッチベンドは出力しません。
- 同じ音高の重なったMIDI音符は、音楽アプリによって長さの解釈が異なる場合があります。CSVは各音符の開始・終了秒数を保持します。どちらにも元音声は含みません。
- ファイル全体のデコードには、圧縮ファイル容量を大きく超えるメモリが必要になる場合があります。余裕のない端末では短い音声を使ってください。[性能測定](docs/ACCEPTANCE_RESULTS.md#performance-evidence)と[合成雑音の測定](docs/NOISE_CHARACTERIZATION.md)は、実端末の速度や一般的な雑音除去の保証ではありません。

## 使用ライブラリ

| ライブラリ | バージョン | ライセンス | 用途 |
| --- | ---: | --- | --- |
| Spotify Basic Pitch | 1.0.1 | Apache-2.0 | 内包モデルと音符の後処理 |
| TensorFlow.js | 3.21.0 | Apache-2.0 | 端末内CPU推論 |
| Tonejs MIDI | 2.0.28 | MIT | MIDI出力 |

詳細は [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) を参照してください。ランタイムのライセンス全文はアプリ内ヘルプでも確認できます。

## ライセンス

Copyright © 2026 ttomohisa

このプロジェクトは [MIT License](LICENSE) で公開されています。
