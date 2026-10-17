# Audio to MIDI — Acceptance results

## 2026-10-17: approved bounded v1.0 release scope

The owner approved completing v1.0 around Windows and Android Chrome rather than extending the broad all-platform audit. The authoritative final decision checklist is [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md). Its four owner checks are still pending; approval of scope is not evidence of passing them.

For this release, the broad historical matrix remains an evidence inventory, not a requirement to certify every browser/device, actual DAW, screen reader, low-memory device, sleep/BFCache scenario, codec or 100 physical cancellation cycles. These unverified areas stay explicitly unverified; no historical row is relabeled PASS or N/A. Core local-processing, correct exports, permission boundaries, safe interruption and edit-preservation requirements remain blocking if a known failure exists. No model tuning, longer input support or pitch bends are added.


更新日: **2026-10-17 UTC** / 対象: **0.9.0-rc.1（未検証項目を残した開発版として統合済み）**
判定契約: [ACCEPTANCE_MATRIX.md](ACCEPTANCE_MATRIX.md) / [APP_SPEC.md](../APP_SPEC.md)

## 結論と記録の読み方

**v0.9 / v1.0 の正式リリース受け入れは未完了。** 2026-10-17、利用者は未検証項目を明記した開発版としての統合を承認し、PR9をマージした。正式リリースゲートの免除・合格を意味しない。 この文書は全92項目を既存の実行証跡へ対応付ける台帳であり、92項目合格の宣言ではない。

- 「判定」は各項目の最新の確定証跡に基づく。`PASS` 行は明記した過去のSHA・環境で確認された範囲に限る。**PR8の成功を、変更中のv0.9最終SHAの成功へ読み替えない。** v0.9最終headの自動回帰は下記E09で成功。物理端末の受け入れとは区別する。
- `A+M` は自動と手動の両方が必要。自動部分が成功していても、必須の実機・手動部分が残る行は `BLOCKED`。`M` 項目に対する自動検証は補助証跡であり、手動合格への代用にはしない。
- `BLOCKED` は必要な実機・ソフト・支援技術等で未確認。`NOT RUN` は当該試験または最終リリース判定を未実施。`FAIL` が未記録でも未確認項目が合格するわけではない。
- `N/A` は非搭載とした条件付き5分音源・ピッチベンドONだけ。通常MIDIのベンドなし、公開説明の一致、必須環境は免除しない。
- 原音・ノートはセッションだけで保持し、再読込で消える。ダウンロードの開始・テスト用ファイル読戻しは、実利用端末の保存先への永続保存確認とは分ける。

## 1. 確定した証跡

### E08: v0.8 の最終PR head（基準回帰）

- 実行日: 2026-10-16。SHA: `d7e0c5a105cb32fee94aa4c6a8d51f36cb4c519c`。[PR8の検証記録](https://github.com/ttomohisa/htmlapps-audio-to-midi/pull/8)
- [Standalone CI](https://github.com/ttomohisa/htmlapps-audio-to-midi/actions/runs/38944230350): **243単体/契約テスト、実Basic Pitch C4/無音、36オフラインChromiumテストが成功**。HTTPS専用10件はこのjobでは意図的skipで、次のjobで実行。
- [HTTPS preview CI](https://github.com/ttomohisa/htmlapps-audio-to-midi/actions/runs/38944232162): **10件成功**。配信HTMLと同jobのビルドを照合後にofflineへ切替。試験した動線で初回HTML配信後のHTTP要求・page errorなし。
- PowerShell構文/encoding、リポジトリビルド、CSP、埋込資産integrity、root/readable一致、自己展開のbyte復元成功。
- 実行環境: GitHub Actions `windows-latest` のホスト型Windows runner、Node 24、Playwright 1.57.0のheadless Chromium。**物理Windows 11、Edge、スマートフォンではない。** OS/buildとChromium実版の詳細はrunログが一次証跡。固定した製品ブラウザ版として推測記載しない。
- [Offline/model証跡](https://github.com/ttomohisa/htmlapps-audio-to-midi/actions/runs/38944230350/artifacts/12064323666) / [HTTPS証跡](https://github.com/ttomohisa/htmlapps-audio-to-midi/actions/runs/38944232162/artifacts/12064836240): browser report、実描画スクリーンショット、CSV/MIDI添付。Actions artifactには保存期限があるため、期限切れ後は再実行・証跡再保存が必要。
- native virtual microphone は合成C4をChromiumのMediaRecorderで録音・decodeした試験。実マイクの権限UI、機器抜去、音質、スピーカーでの聴取を証明しない。

<a id="performance-evidence"></a>

### E07: v0.7 の性能・リソース検証

- 実行日: 2026-10-16。[PR7の確定記録](https://github.com/ttomohisa/htmlapps-audio-to-midi/pull/7)。最終head: `81678d687d814ed8602c02b8fec1d130c0f2eb35`。
- [Build/offline CI](https://github.com/ttomohisa/htmlapps-audio-to-midi/actions/runs/38941215888): 229単体/契約、実モデルsmoke、34オフラインChromium成功。[HTTPS CI](https://github.com/ttomohisa/htmlapps-audio-to-midi/actions/runs/38941215921): 9件成功。これらはE08で継続回帰した既存機能の履歴。
- 実モデル性能測定: Linux x64 / kernel 6.18.44 / Node **24.19.0** / AMD EPYC **9V74** / TF.js **3.21.0 CPU** / Basic Pitch **1.0.1**。ブラウザなし。レポート開始時刻 `2026-10-16T17:33:14.524Z`。
- 再現: 標準ビルド後 `npm run test:performance`。生成物は `test-results/inference-performance.json` と `inference-performance-progress.jsonl`。検査対象は [tests/inference-performance.cjs](../tests/inference-performance.cjs)。元測定は作業ツリー上で実行され、レポートのGit HEADは基点 `b46dde29124acf0c2ea35388b09e0908ec3f2c20`。**最終headで測定したとの主張ではない。** 実測workerのSHA-256 `3c6d302818224575fea2da87b4aee9c8015a0722ff834b64a022d1614fd0387f` が最終headでも同一であることをPR7で記録。

| 合成PCM長 | eager参照時間 | bounded時間 | eager tracked tensor peak | bounded tracked tensor peak | 出力比較 |
|---|---:|---:|---:|---:|---|
| 10秒 | 13.32秒 | 11.34秒 | 7,484,280 B | 6,256,648 B | frame/onset hashと最終5音が完全一致 |
| 30秒 | 33.40秒 | 32.82秒 | 16,236,920 B | 6,256,648 B | frame/onset hashと最終13音が完全一致 |
| 60秒 | 69.13秒 | 68.04秒 | 30,999,224 B | 6,256,648 B | frame/onset hashと最終26音が完全一致 |

- 同じloaded modelでeager→boundedの順に実行。profileの負荷を含み、端末間速度比較・速度SLAには使わない。初回0.5秒推論は別に記録されているが、各長さのcold/warm実機ペアを測ったものではない。
- 実モデル100 jobs = **50完了 + 50キャンセル**（1 window後のruntime cancellation seam）、156.02秒。各job後 **245 tensors / 742,392 tracked bytes** に戻り、故障注入後の再試行も成功。model dispose後 **0 tensors / 0 tracked bytes**。
- これを「実ブラウザで実モデルを100回キャンセル」とは呼ばない。ブラウザの100-cycle試験はprotocol test doubleによるworker終了/URL解放と、その後の実モデル復帰を検証する別試験。
- TF.jsはmemory計測をupper boundと表示。tracked tensor peakはprocess/browser/deviceのpeakではない。RSSはwindow境界のsampleで過渡peakを見逃し、GC/profileの影響を含む。Blob URL破棄呼出しの確認も、全ブラウザheapの漏れがない証明ではない。

### E-PUB: v0.8 の実配信基準

PR8のmergeは `ae195fa273a235dc52303460553b947cdff9ce54`。[Pages run 38947534682](https://github.com/ttomohisa/htmlapps-audio-to-midi/actions/runs/38947534682) 成功。配信HTMLは同runのvalidated standalone artifact **12066872243** とbyte一致し、SHA-256は `f5cbe08cbb5853d98d5aa6c13626687b74930db70655663be531ec6fe1ff11bf`。source checkoutの別build時刻の生成物ではなく、実際の配信run成果物と比較した。**これはv0.8配信確認であり、v0.9リリースの公開・合格証拠ではない。**

### E09: v0.9 最終PR headの自動回帰

- SHA: `411c3d935d06c1488e7965ba88ee579a351e9cff`。[PR9](https://github.com/ttomohisa/htmlapps-audio-to-midi/pull/9)
- [Build/engine CI 38957816212](https://github.com/ttomohisa/htmlapps-audio-to-midi/actions/runs/38957816212): 247単体/契約、実Basic Pitch C4/無音、40オフラインChromium、4 Firefox、4 WebKitが成功。
- [HTTPS CI 38957816079](https://github.com/ttomohisa/htmlapps-audio-to-midi/actions/runs/38957816079): 12成功。offline jobでskipしたHTTPS専用ケースはこのjobで実行。構文/build/CSP/埋込integrity/通常版root一致/自己展開復元成功。
- 最終EN/JA実画像とkeyboard focus、独立source/test reviewをPR9で記録。実7音推論→編集→CSV/MIDIの3engine出力一致: CSV SHA-256 `65bace86b3cef4ee0bdd0b42baf0b8506281459d34681f89a67847f8b2dc4c4c`、MIDI `ff0cdad390bdc1c1d1e694f34c7fb2e7d503b8109bd12cc481d138470c7114f4`。
- 54a1617候補のFirefox CSP/TabとWebKit file読込失敗は過去の失敗。最終headではoptional WASM probeを局所的に抑制、focus/可視性判定を修正した。CSP・モデル・固定runtime bytesは変更しない。
- WebKitの4件はHTTP(S) abort routingによるnetwork-blocked試験。protocol-offlineのFile読込診断はoff→成功/on→NotReadableError/off→成功。**実Safari/iOSや物理offlineの合格ではない。** Chromium/Firefoxはdocument読込後protocol-offlineも使用。
- E08表内の各自動範囲はE09で回帰済み。ただしA+M/Mの必須手動範囲はBLOCKEDのまま。古いE08実行をE09の実行と取り違えない。

### E-PUB09: 統合済み開発版の実配信

利用者がPR9をmergeしたSHAは `76660bf40b1f5b0ae71fa5348bde7a558dce40c8`。[自動Pages run 39004911835](https://github.com/ttomohisa/htmlapps-audio-to-midi/actions/runs/39004911835) のbuild/deployが成功。2026-10-17 UTCに [公開HTML](https://ttomohisa.github.io/htmlapps-audio-to-midi/) を同runのstandalone artifact **12090253623** 内 `dist/index.html` と比較し、**1,298,537 bytes、完全一致**。SHA-256 `6e0f4b6c4f6f37f30797c26386089dcbcd658c02d9e54bb8152f68c2cd959d7a`。これは配信整合の確認であり、未検証の手動ゲートやv1.0合格を意味しない。

### M09-OWNER: Android / Windows Chrome の主要動線（利用者報告）

2026-10-17 UTC、公開開発版の確認依頼に利用者が「Android・windows、Chrome、1〜4 OK」と回答した。次の4項目を両環境で確認したという**利用者申告**として記録する。端末型番、OS/Chrome実版、テスト時刻、画面/保存物の個別証跡は未提供。配信基準はE-PUB09だが、各端末のキャッシュを含む実行HTML hashは取得していない。

1. 「録音」で鼻歌/単音を5〜10秒録り「録音を停止」、マイク使用表示が消える。
2. 「音声を解析」後、「元音声」「音符の合成音」をそれぞれ再生/停止し、音が出て停止後に鳴り続けない。
3. 音符を1つ選んで半音上げ、元に戻す。スマホでボタンが押せ、表示がはみ出さない。
4. 保存名を変更して「MIDIを保存」、ダウンロード先に.midがある。

DAWでの読込/試聴は依頼の**任意追加項目**。その後利用者がDAWを持っていないため未確認と明言したので、ATM-070等のDAW互換性は未確認として残す。Undoの使用方法、全編集操作、録音拒否/喪失、ブラウザー再起動、local file両variant、支援技術、low-memory/sleep/BFCache、他のOS/ブラウザーも未確認。全ENV/ATM行の一括PASSにはしない。M09-OWNERはATM-027/028/034/037/039/042/045/047/072/090等の**主要動線の部分証跡**であり、版情報・詳細条件・追加ゲートが必要な行はBLOCKEDを維持する。

## 2. 証跡コードと試験範囲

下表のコードはE08で成功した該当test群を指す。ファイルへのリンクは試験内容を追うためのもので、存在するだけでは実行証拠にならない。実行はE08/E07のrunへ紐付ける。E09で新設・変更されたassertionはE08に遡って成功扱いにしない。

| コード | 試験ソース / 範囲 |
|---|---|
| T-IN | [core](../tests/core.test.cjs)、[browser app](../tests/browser/app.spec.cjs)、[model smoke](../tests/model-smoke.cjs): ファイル境界、平均mono、実推論、無音、入力置換、MP3/drop、MIDI基本 |
| T-MIDI | [export core](../tests/export-core.test.cjs)、[export UI](../tests/export-ui.test.cjs)、[browser export](../tests/browser/export.spec.cjs): independent SMF parser、CSV、filename、現行結果guard |
| T-REVIEW | [timeline](../tests/timeline.test.cjs)、[playback](../tests/playback.test.cjs)、[review UI](../tests/review-ui.test.cjs)、[browser review](../tests/browser/review-check.cjs): 座標、再生状態、波形/ロール同期、実OfflineAudioContext |
| T-REC | [recording](../tests/recording.test.cjs)、[recording UI](../tests/recording-ui.test.cjs)、[browser recording](../tests/browser/recording.spec.cjs): native virtual mic、拒否/喪失の注入、late track、代替入力 |
| T-EDIT | [editing core](../tests/editing-core.test.cjs)、[browser editing](../tests/browser/editing.spec.cjs): 境界・重なり・編集・保存・100履歴・Undo/Redo |
| T-SET | [detection settings](../tests/detection-settings.test.cjs)、[browser settings/history](../tests/browser/settings-history.spec.cjs): preset、境界、再解析/履歴、icon |
| T-CLEAN | [editing core](../tests/editing-core.test.cjs)、[browser cleanup](../tests/browser/cleanup.spec.cjs): preview/Apply/Cancel、split/merge、short notes、opt-in grid |
| T-LIFE | [inference](../tests/inference.test.cjs)、[app lifecycle](../tests/app-lifecycle.test.cjs)、[worker lifecycle](../tests/browser/worker-lifecycle.spec.cjs)、[browser performance](../tests/browser/performance.spec.cjs): tensor/worker/source guard、protocol stress、仮想描画 |
| T-SHELL | [UI contract](../tests/ui-contract.test.cjs)、[dialog](../tests/dialog.test.cjs)、[browser dialog](../tests/browser/dialog-check.cjs)、[HTTPS preview](../tests/browser/preview.spec.cjs): 日英key、modal、CSP/offline、配信byte比較 |
| T-AUDIT | [release audit unit](../tests/release-audit.test.cjs)、[release audit browser](../tests/browser/release-audit.spec.cjs): **v0.9新設。E08未実行**。E09最終headで単体・Chromium/HTTPS/Firefox/WebKit audit成功 |

## 3. 全92項目の判定

### v0.1 — 入力・モデル・MIDI

| ID | 種別 | 判定 | 自動検証・既存証跡 | 未確認 / 次の判定条件 |
|---|---|---|---|---|
| ATM-001 | A+M | BLOCKED | E08 T-IN: WAV選択→実解析、名前/長さ表示 | 容量を含む表示と実OSファイル選択をENV-01〜06で確認 |
| ATM-002 | A+M | BLOCKED | E08 T-IN: 合成c4.mp3をChromiumでdecode/推論 | 各対応実機/codecで同じ動線 |
| ATM-003 | A+M | BLOCKED | E08 T-IN: DataTransferのdrop経由MP3実解析 | 実OSからのD&D操作 |
| ATM-004 | A | PASS | E08 T-IN: 44.1kHz mono / 48kHz stereoから実推論。workerは22,050Hz mono契約 | 確定SHA範囲の自動合格。E09で最終回帰済み |
| ATM-005 | A | PASS | E08 T-IN: 左右の異なる値を等重み平均、malformed PCM拒否 | 同上。左右相殺は平均化の仕様 |
| ATM-006 | A+M | BLOCKED | E08 T-IN: 50MiB超を拒否し旧結果/保存状態を維持 | 実機表示/回復。compressed sizeはdecodeメモリ上限を保証しない |
| ATM-007 | A+M | BLOCKED | E08 T-IN: 0.4/60.1秒拒否、native-rate 0.5秒でretry | 実機エラー理解と境界。制限はdecode後の長さ |
| ATM-008 | A+M | BLOCKED | E08 T-IN: unsupported/empty純粋検証、破損WAV後retry | 実機で形式不明/破損の案内と再選択 |
| ATM-009 | A+M | BLOCKED | E08 T-IN: 実C4とC4/D4/E4旋律、有限範囲のノートとSMF | 実機完走。実鼻歌/楽器の精度評価は別の未確認ゲート |
| ATM-010 | A+M | BLOCKED | E08 T-IN: 完全無音は0件専用状態、MIDI無効 | 合成near-silenceのNode測定は完了。実録音のほぼ無音と実機の案内は未確認 |
| ATM-011 | A+M | BLOCKED | [Node合成雑音/微小音測定](NOISE_CHARACTERIZATION.md): 5入力×3preset完走。noiseの音符数は0保証せず実測を保存 | browser表示/復帰と実機での案内理解は未確認。Node測定だけで項目全体を合格にしない |
| ATM-012 | A+M | BLOCKED | E08 T-IN/T-LIFE: active worker取消、結果無効、再試行 | 実機の操作応答と回復 |
| ATM-013 | A+M | BLOCKED | E08 T-IN/T-LIFE: A→Bと遅延/世代/job/worker違いを排除 | 実機で高速置換、ファイル選択の中断も確認 |
| ATM-014 | A | PASS | E08 T-IN/T-EDIT: NaN/∞/負時刻/逆転等を除外・拒否 | E09で最終SHA回帰済み |
| ATM-015 | A | PASS | E08 T-IN/T-MIDI: midi-file独立parser、pitch/time/duration比較 | 同音重複のidentity制約は後述。実DAWはATM-070 |
| ATM-016 | A | PASS | E08 T-IN/T-MIDI: 連続同音、和音、重複のOn/Off境界と個数 | 単一channelのnested同音はpairing曖昧。interval identityを保証しない |
| ATM-017 | A | PASS | E08 T-IN/T-MIDI: 無音/全削除/無効状態では保存不可 | E09で最終SHA回帰済み |
| ATM-018 | A+M | BLOCKED | E08 T-IN/T-MIDI: 日本語編集名、unsafe/空/予約名、固定拡張子 | 実端末の保存UI・実保存名 |
| ATM-019 | A | PASS | E08 T-IN/T-MIDI: SMF1/2tracks/480PPQ/120BPM/channel1/program0/velocity96 | E09で最終SHA回帰済み。120BPMは推定tempoではない |
| ATM-020 | A+M | BLOCKED | E08 T-IN: 通常HTMLを初回file読込からoffline、実モデル→MIDI | ENV-01〜06の実機offline完走 |
| ATM-021 | A+M | BLOCKED | E08 T-IN: self-extract file→復元→実モデル→MIDI | 同上。DecompressionStream等の環境要件も確認 |
| ATM-022 | A+M | BLOCKED | E08 T-IN/T-REC/T-SET: reload/reset/cancel/失敗後retry | 実機再起動/保存先を含む回復 |
| ATM-023 | A | PASS | E08 build: CSP connect-src none、外部参照/placeholder/asset integrity検査 | v0.9最終生成物で再実行 |
| ATM-024 | A+M | BLOCKED | E08 T-SHELL/T-IN/T-SET: 日英keyと状態/再生位置/編集維持 | 全状態の自然な翻訳・実表示はATM-076と併せ確認 |

### v0.2 — 表示・試聴

| ID | 種別 | 判定 | 自動検証・既存証跡 | 未確認 / 次の判定条件 |
|---|---|---|---|---|
| ATM-025 | A+M | BLOCKED | E08 T-REVIEW: C4=MIDI60の行・秒座標、F-02音高列 | 複数音の描画を実機で目視 |
| ATM-026 | M | BLOCKED | E08 T-REVIEW/T-LIFE補助: scroll/zoom後のnote/MIDI不変 | 実マウス/touchでzoom・横scroll |
| ATM-027 | M | BLOCKED | E08 T-REVIEW補助: 再生/seek/stopとsource数0、自然終了 | 実speaker/headphoneで停止後の残音がないこと |
| ATM-028 | M | BLOCKED | E08 T-REVIEW補助: 排他的mode、実OfflineAudioContextのpitch/end | 実聴取で原音/synth切替と同時再生なし |
| ATM-029 | A+M | BLOCKED | E08 T-REVIEW: 両playheadとscroll端の同期 | 実機の視認性/seek操作 |
| ATM-030 | M | BLOCKED | E08 T-REVIEW補助: 選択C4情報とpicker | 実画面で音名/開始/終了/MIDI番号が読めること |
| ATM-031 | M | BLOCKED | E08 T-IN/T-REVIEW補助: 320px長名、page overflow検査 | 実phone表示・safe area・固定UI |
| ATM-032 | A+M | BLOCKED | E08 T-REVIEW/T-LIFE: 入力変更時source数0、旧note削除 | 実機で旧音の停止と描画消去 |

### v0.3 — 録音

| ID | 種別 | 判定 | 自動検証・既存証跡 | 未確認 / 次の判定条件 |
|---|---|---|---|---|
| ATM-033 | M | BLOCKED | E08 T-REC補助: 初回getUserMedia呼出しなし | 実ブラウザ権限UIが勝手に出ないこと |
| ATM-034 | M | BLOCKED | E08 T-REC補助: 明示操作のnative virtual mic→停止/decode/試聴 | 物理マイクの権限許可→録音→実聴取 |
| ATM-035 | M | BLOCKED | E08 T-REC補助: controlled拒否で説明/file fallback | 実権限拒否と設定復帰 |
| ATM-036 | M | BLOCKED | E08 T-REC補助: missing device/track喪失/error注入 | 物理デバイス抜去・権限喪失・再試行 |
| ATM-037 | A+M | BLOCKED | E08 T-REC: stop/late grantで全track終了 | 実OS/ブラウザの録音indicatorが消えること |
| ATM-038 | A+M | BLOCKED | E08 T-REC: replacement/reset/navの確認Cancel/保持 | 実機録音中の選択/リセット確認 |
| ATM-039 | A+M | BLOCKED | E08 T-REC: native MediaRecorderのC4 Blob→共通decode→実推論→MIDI | 実録音の同一完走・実保存 |
| ATM-040 | M | BLOCKED | E08 T-REC補助: insecure/unsupported注入でfile fallback | fileマイク不可の実端末で代替案内 |
| ATM-041 | M | BLOCKED | E08 T-REC補助: meter graphにspeaker接続なし、観測HTTPなし | 実機でloopbackなしを聴取し権限/通信も観測 |

### v0.4 — 基本編集

| ID | 種別 | 判定 | 自動検証・既存証跡 | 未確認 / 次の判定条件 |
|---|---|---|---|---|
| ATM-042 | A+M | BLOCKED | E08 T-EDIT/T-MIDI: 追加/削除/半音、現行note描画とSMF一致 | 編集後synthの実聴取、実機操作 |
| ATM-043 | A | PASS | E08 T-EDIT: 0≤start<end≤duration、invalid入力のatomic拒否 | E09で最終SHA回帰済み |
| ATM-044 | A | PASS | E08 T-EDIT/T-MIDI: overlap/duplicate保持、On/Off境界一致 | 同音nestedのpairing保証は対象外。CSVは正確なintervalを保持 |
| ATM-045 | M | BLOCKED | E08 T-EDIT補助: 320/360/390px、近接44pxボタン/数値入力 | 実touchでdragを使わず半音/時刻調整 |
| ATM-046 | A+M | BLOCKED | E08 T-EDIT: 削除Undoでexact note復元、0件後Undo | 実機で復元と再試聴 |
| ATM-047 | A+M | BLOCKED | E08 T-EDIT/T-MIDI: 編集後現行notesと独立SMF/CSV比較 | 実端末保存から再読込 |
| ATM-048 | M | BLOCKED | E08 T-EDIT/T-LIFE補助: 未保存の置換確認・Cancel保持 | 実ファイルpicker/録音置換で誤破棄防止 |

### v0.5 — 設定・履歴

| ID | 種別 | 判定 | 自動検証・既存証跡 | 未確認 / 次の判定条件 |
|---|---|---|---|---|
| ATM-049 | A+M | BLOCKED | E08 T-SET: 3presetの固定値、公式postprocess fixtureで1/2/3音 | 実機でpreset操作と説明の理解 |
| ATM-050 | A | PASS | E09 T-AUDIT: offending field識別、focus/aria-invalid/説明の単体・browser検証成功 | 実screen readerはATM-087で未確認 |
| ATM-051 | A+M | BLOCKED | E08 T-SET: 確認Cancel、cancel/failure後にnotes/history/fingerprint保持 | 実機の再解析失敗/復旧 |
| ATM-052 | A | PASS | E08 T-EDIT: 100操作cap、mixed履歴、800状態遷移 | E09で最終SHA回帰済み |
| ATM-053 | A | PASS | E08 T-EDIT: Undo後new editでRedo分岐破棄 | E09で最終SHA回帰済み |
| ATM-054 | M | BLOCKED | E08 T-SET補助: Control+Z/Shift+Z。フォームはnative undo契約 | 実Windows/macOS keyboard、⌘、入力欄/IMEとの非衝突 |
| ATM-055 | M | BLOCKED | E08 T-EDIT/T-REC/T-SET補助: reset/discard確認、dirty/Undo | 実操作で未保存と破棄結果が分かること |

### v0.6 — ノート整理

| ID | 種別 | 判定 | 自動検証・既存証跡 | 未確認 / 次の判定条件 |
|---|---|---|---|---|
| ATM-056 | A+M | BLOCKED | E08 T-CLEAN: split preview、2音extent/pitch、Apply/Undo/Redo | 実機で境界の確認と聴取 |
| ATM-057 | A+M | BLOCKED | E08 T-CLEAN: 同音/隣接gap条件、merge範囲とUndo | 実機で対象と結果が分かること |
| ATM-058 | A | PASS | E08 T-CLEAN: 異音高/overlap/不適切neighborは結合不可 | E09で最終SHA回帰済み |
| ATM-059 | A+M | BLOCKED | E08 T-CLEAN: short-note件数/preview/Cancel/Applyとatomic Undo | 実機で候補対象を理解し誤削除を防げること |
| ATM-060 | A | PASS | E08 T-CLEAN: grid既定OFF、無操作では時刻不変 | E09で最終SHA回帰済み |
| ATM-061 | M | BLOCKED | E08 T-CLEAN補助: 明示Applyだけで変更、Undoで復元 | 実機でopt-inとpreviewが明確なこと |

### v0.7 — 性能・寿命

| ID | 種別 | 判定 | 自動検証・既存証跡 | 未確認 / 次の判定条件 |
|---|---|---|---|---|
| ATM-062 | A+M | BLOCKED | E07: 実モデル10/30/60秒・CPU/timing/tracked memory記録 | 実機/browserのcold/warm・操作応答・memory計測 |
| ATM-063 | A+M | BLOCKED | E07: 実モデル50完了+50取消。E08 T-LIFE: protocol100取消後に実モデル復帰 | 実機の連続100回UI解析→取消。異なる2種の試験を合算して達成扱いにしない |
| ATM-064 | A+M | BLOCKED | E08 T-LIFE: shared confirmation/latest-only、遅延job/source/worker排除 | 実機の高速変更で音声/保存も旧状態にならないこと |
| ATM-065 | A+M | BLOCKED | E08 T-LIFE: worker進捗、dense viewportの描画/scroll回帰 | 10/30/60秒実解析中に再生/scrollの体感応答を記録 |
| ATM-066 | A | BLOCKED | E07: tensor baseline安定/解放。E08 T-LIFE: worker終了とURL revoke所有権 | 実browser heap/Blobの反復計測は不足。tracked tensorsだけで全面メモリ合格にしない |
| ATM-067 | A+M | N/A | E07/E08: 5分拡大は非搭載、最大60秒/50MiBを維持 | 公開UI/ヘルプの非露出はATM-091で再確認 |
| ATM-068 | M | BLOCKED | input上限とworker解放はあるが、whole-file decodeは先に走る | 物理低メモリ端末で大きな圧縮入力、crash回避/安全errorを測定 |

### v0.8 — 出力互換性

| ID | 種別 | 判定 | 自動検証・既存証跡 | 未確認 / 次の判定条件 |
|---|---|---|---|---|
| ATM-069 | A | PASS | E08 T-MIDI: independent parserでpitch一致。start≤0.5/960秒、end<1.5/960秒（短音1tick含む） | 非曖昧fixtureの上限は20ms以内。nested同音はevent境界比較のみでpairing保証なし |
| ATM-070 | M | BLOCKED | 独立parserは成功したがDAW/playerの実聴取なし | 実DAW/再生ソフト名・版、MIDI音/終了/欠落/重なりを記録 |
| ATM-071 | A | PASS | E08 T-MIDI: 4列/UTF-8/CRLF、編集後exact seconds/96、数値のみ | E09で最終SHA回帰済み |
| ATM-072 | A+M | BLOCKED | E08 T-MIDI: 日本語/unsafe/空/予約名/混合拡張子、反復download | 実OSの保存名・format切替・保存先確認 |
| ATM-073 | M | BLOCKED | E08 export screenshot/説明の既存目視。MIDIとCSVはnote data、原録音別操作 | v0.9全言語で説明・original/synthの実利用理解を確認 |
| ATM-074 | A+M | BLOCKED | E08 T-MIDI/T-EDIT: bend eventなし、編集にbendを持込まない | 実DAWで通常MIDI互換性。条件付きON不採用でも本項は必須 |
| ATM-075 | A+M | N/A | E08: pitch bend ONは非搭載、toggleなし、固定note出力 | 公開説明はATM-091で再確認 |

### v0.9 — 総点検

| ID | 種別 | 判定 | 自動検証・既存証跡 | 未確認 / 次の判定条件 |
|---|---|---|---|---|
| ATM-076 | M | NOT RUN | E08日英key/部分画像、E09文言修正・最終EN/JA画像確認（全状態の人手受け入れは別） | v0.9全画面/状態/エラー/ヘルプの自然さと見切れを人が確認 |
| ATM-077 | M | BLOCKED | E08: 320/360/390pxの主要画面とcontrols。E09 T-AUDIT成功（自動範囲のみ） | 実phoneのsafe area/keyboard/touchを含め全操作確認 |
| ATM-078 | M | BLOCKED | E08 T-SHELL: desktop/320px・高さ480px、末尾scroll/背景固定/各close | E09短画面audit成功（自動範囲のみ）。実touch/短画面で末尾とfocus復帰 |
| ATM-079 | M | BLOCKED | E08: Analyze Enter、編集/history/export選択の部分keyboard | 最初から入力/編集/保存までmouseなし、実OSでvisible focus。E09 T-AUDIT成功（自動範囲のみ） |
| ATM-080 | M | BLOCKED | E08 T-REVIEW/T-LIFE: gain0、hidden/pagehideの状態/解放を自動確認 | 実volume0・background・端末sleep/wake・actual BFCacheで実聴取 |
| ATM-081 | A+M | BLOCKED | E08: 通常/自己展開とも初回file読込からoffline→実推論→保存 | E09最終SHA自動回帰済み。実機の両variant完走は未確認 |
| ATM-082 | A+M | BLOCKED | E08: CSP/static検査、試験動線のHTTP要求/page errorなし | v0.9最終artifactと実機のNetwork監査。未試験全経路をゼロと断定しない |
| ATM-083 | A | PASS | E09: 最終head全CI・構文/build・生成物/placeholder/復元成功 | 配信整合はE-PUB09。正式リリース手動ゲートは別 |
| ATM-084 | M | NOT RUN | E08: canonical SVG byte一致、実EN desktop/JA mobile画像を目視済み | v0.9更新後の実日英画像、crop/個人情報/debugなし、favicon/header確認 |
| ATM-085 | M | NOT RUN | E08: model/license/dependency/CSP固定。既存告知あり | v0.9 README日英・ヘルプ・告知・形式/制限の最終相互照合 |
| ATM-086 | M | BLOCKED | E08 T-IN/T-REC/T-SET: failure/no-notes/拒否/cancel/retry自動動線 | v0.9人による案内理解、実権限/codec/復帰。E09 T-AUDIT成功（自動範囲のみ） |
| ATM-087 | M | BLOCKED | E09: status再告知抑制/label/focus単体成功。E09 reduced-motion browser成功 | 実screen reader（製品/版記録）とkeyboardで状態/エラー読上げ |

### v1.0 — 公開判定

| ID | 種別 | 判定 | 自動検証・既存証跡 | 未確認 / 次の判定条件 |
|---|---|---|---|---|
| ATM-088 | A+M | BLOCKED | 本台帳で92項目を対応付けた。E08基準回帰は成功 | 必須BLOCKED/NOT RUNを解消、または未対応範囲を明示した承認済み仕様判断が必要 |
| ATM-089 | A | NOT RUN | E09/E-PUB09: 0.9.0-rc.1開発版を統合/配信。v1.0最終版ではない | final config/package/CHANGELOG/README/HTMLのSemVer整合、公開版との区別 |
| ATM-090 | M | BLOCKED | E09 synthetic/virtual micに加え、M09-OWNERはAndroid/Windows Chromeの実録音→解析→聴取→半音修正→保存OK申告 | 詳細な端末/版・fixture・操作証跡は未提供。定量精度評価と全指定環境は未確認 |
| ATM-091 | M | NOT RUN | E07/E08で長時間/pitch bend非搭載。制限は60秒/50MiB、録音59秒 | v0.9最終UI・ヘルプ・READMEで未検証option非表示/説明一致を確認 |
| ATM-092 | M | NOT RUN | PR7/8のレビュー/CIは過去履歴。E09最終レビュー/CI成功、PR9 merge済み | final PR・独立レビュー・exact-head CI・手順を確認。正式受け入れ未完了。利用者は未検証を明記した開発版として統合承認しPR9をmerge済み |

## 4. 環境・音源の不足を明示する

| Matrix環境 | 現在ある証拠 | 未確認の必須範囲 |
|---|---|---|
| ENV-01 Windows 11 / Chrome | E09 hosted Windows + headless Chromium。M09-OWNER: Windows/Chromeで主要4動線OK申告 | Windows版・端末/Chrome版不明。拒否/喪失・詳細受け入れは未確認 |
| ENV-02 Windows 11 / Edge | PowerShell build（E08） | 物理Windows 11 / branded Edge動線全体 |
| ENV-03 Windows/macOS / Firefox | E09 Firefox engine audit成功（過去54a1617失敗を修正） | 実Windows/macOS Firefox、codec/権限/音声/保存 |
| ENV-04 macOS / Safari | E09 WebKit route-blocked audit成功。protocol-offlineは未合格 | actual Safari/macOS。Linux WebKitはSafari認証ではない |
| ENV-05 iPhone / Safari | desktop Chromium viewport 320/360/390px | 物理iPhone、touch、safe area、権限、codec、音声、保存 |
| ENV-06 Android / Chrome | E09 viewport/virtual microphone。M09-OWNER: Android/Chromeで主要4動線OK申告 | 端末/OS/Chrome版不明。拒否/喪失・codec範囲・低メモリ等は未確認 |
| ENV-07 offline file / readable | E08自動完走 | 実対象端末とv0.9最終生成物で完走 |
| ENV-08 offline file / self-extract | E08自動完走・復元byte一致 | 同上。単一HTMLでも両variantがDecompressionStreamを必要とする |

評価fixtureは [tests/fixtures.cjs](../tests/fixtures.cjs) と [fixture説明](../tests/fixtures/README.md) で再現できる。F-01相当の実装fixtureは**2.5秒clip内0.25–2.25秒のC4**（発音2秒）。F-02は3.5秒clipのC4/D4/E4。F-08完全無音に加え、合成near-silenceはNode測定済み（実マイクのほぼ無音は未確認）。F-10は44.1kHz monoと48kHz stereo、F-11/13は破損・長さ境界・50MiB超を試験した。

F-03同音反復/F-04和音はMIDIへの**既知ノート注入**のserializer試験があり、音源→モデル精度試験と同一視しない。F-05鼻歌/F-06ギター/F-07ピアノの許諾済み実音源による定量精度評価は未実施。F-09の一つのseed雑音と合成near-silenceは[Node測定](NOISE_CHARACTERIZATION.md)済み。実音源の精度とbrowser/実機の雑音表示は未完了。F-12の10/30/60秒はE07のNode PCM測定であり端末性能matrixは未完了。F-14は条件付き非搭載のためN/A。

## 5. 公開前に残すゲート

1. **最終候補を固定する:** E09でexact-head自動検証・画像・独立レビュー、E-PUB09で公開run byte照合は完了。今後の製品変更では影響範囲を再検証する。engine成功で物理端末ゲートは閉じない。
2. **実機・操作:** ENV-01〜06でファイル→推論→試聴→編集→保存、両file variant、実権限/拒否/喪失と保存先、keyboard/IME、touch/safe areaを確認。実Edge/Safariを一般Chromium/WebKitで代用しない。利用不可環境は利用者が承認した明示的なサポート範囲へ仕様・案内を整合させる。
3. **音・互換性・精度:** 許諾済み鼻歌/単一楽器とnoise/near-silenceの結果、pitch/onset/offset・偽陽性・修正負担を記録。実DAW/playerのnote-off/欠落/重複と原音/synthを聴取。SMFの同音nested pairing制限を残す。
4. **寿命・資源:** 実低メモリ端末、大きな圧縮ファイルのdecode、10/30/60秒の初回/再実行、実解析取消100回、browser heap/Blob、background/sleep/wake、actual BFCache navigationを確認。synthetic persisted eventだけでBFCache合格にしない。
5. **アクセシビリティ・説明:** 全日英状態/ヘルプ、短画面、keyboard focus、実screen reader、reduced motion、ライセンス/プライバシー/形式/制限の一致、実UI画像を確認。
6. **公開承認:** 必須の未確認を黙ってN/Aにしない。全項目の環境・SHA・証跡を揃えるか、明示的なサポート範囲変更を先に決定する。0.9.0-rc.1は完成版ではない。利用者承認による開発版統合と正式リリース判定を区別し、v1.0合格をこの台帳だけで宣言しない。

### 次の実行記録に必要な項目

各追加試験に `ATM ID / UTC日時 / exact SHAまたはsource hash / OSと端末名 / browser・DAW・screen readerの実版 / fixture IDと生成条件 / 手順 / 観測結果 / PASS・FAIL・BLOCKED・NOT RUN・N/A / log・画像・出力ファイル / 残存制限` を残す。モデル推定精度とSMF/CSV出力精度、headless engineと物理実機、virtual microphoneと実録音を別欄で扱う。
