# Audio to MIDI — APP_SPEC.md

> Browser Kitty / 新規Webアプリ 正式仕様書（実装用プロダクト契約）
> 策定日: 2026-10-16 / 対象: v0.1.0〜v1.0.0 / 仕様状態: 開発着手用確定案
> Working repository: `ttomohisa/htmlapps-audio-to-midi` （2026-10-16確認済み）

## 0. この仕様の位置付け・参照元

- **製品の目的と動作仕様は本書が正**。各バージョンの実装順は `docs/DEVELOPMENT_PLAN.md`、検証ケースは `docs/ACCEPTANCE_MATRIX.md` に記載する。
- 実装開始時には実際の対象リポジトリ、作業時点の [`htmlapps-template`](https://github.com/ttomohisa/htmlapps-template) の `AGENTS.md`・`APP_SPEC.md`・`docs/ARCHITECTURE.md`・`docs/LLM_WORKFLOW.md` を読み、テンプレートを更新せずに推測でディレクトリやビルド成果物を決めない。
- モデル仕様の一次資料は [`spotify/basic-pitch`](https://github.com/spotify/basic-pitch) と [`spotify/basic-pitch-ts`](https://github.com/spotify/basic-pitch-ts)。採用するnpm/WASM/モデルの具体的なバージョン・ライセンスは実装時に固定し、ロックと第三者告知に記録する。
- この文書は**実装予定仕様**であり、精度や処理速度を実測済みと意味しない。満たせない機能は黙って代替せず、技術検証ゲートを経て仕様を改訂する。

## 1. プロダクト定義

| 項目 | 内容 |
|---|---|
| 正式名称 | **Audio to MIDI / 音声→MIDI** |
| 目的 | 鼻歌や単一楽器の録音から音符を抽出し、聴き比べて必要な修正を加えたうえでMIDIとして保存する |
| 利用者 | 鼻歌を記録する人、楽器学習者、作曲・編曲のメモを残したい人 |
| 最重要の成果 | 入力音声 → 音符の可視化 → 修正可能なノート列 → `.mid` 保存 |
| 価値の中心 | 変換結果の**確認・修正・聴き比べ**。自動変換だけを競合との差別化としない |
| 主なモデル | Spotify **Basic Pitch**（1つの楽器の演奏を主対象。和音は対応するが精度保証はしない） |
| 利用条件 | 登録不要・インストール不要・基本操作はブラウザ内完結 |
| 対応言語 | 日本語 / 英語。同一HTML内で即時切り替え |
| テーマ | 明色のみ。Browser Kitty `#16624F`、SVGアイコン、過剰な装飾・グラデーションなし |

### 1.1 成功した1セッションの姿

1. 利用者は短い鼻歌または1つの楽器の演奏音声をファイルとして指定するか、マイクで録音する（録音はv0.3.0から）。
2. アプリが音声をローカルで解析し、音符の高さ・開始時刻・終了時刻を推定する。
3. 波形とピアノロールを見ながら、元の音声と音符合成音を切り替えて確認する（比較はv0.2.0から）。
4. 誤認識した音符を追加・削除・移動・長さ変更する（v0.4.0から）。
5. 利用者がファイル名を指定し、最終ノート列をMIDIファイルとして保存する。

### 1.2 重点と制限

- **できること:** 単一楽器の単音旋律、鼻歌、ある程度の和音を含む音声からノート候補を得る。誤認識を確認・手動修正する。
- **できないこと:** 歌声と伴奏の分離、バンド音源からの楽器別分離、話し言葉の文字起こし、正確な採譜・譜面PDFの自動完成、コード進行の正確な推定、リアルタイム伴奏追従。
- **重要:** ノート推定に誤りがあることを明示し、「完全な採譜」「必ず正確」などと説明しない。
- 既存の [Music Practice Kit](https://github.com/ttomohisa/htmlapps-music-practice-kit) は演奏中のチューナー・メトロノーム・録音等を主用途とするため、**別アプリ**として実装する。将来の連携はファイルの受け渡しで十分。

## 2. リリース時のスコープ

### 必須（v1.0.0までに必要）

- ファイル入力 → ローカル推論 → ピアノロール表示 → 元音声と推定ノートの試聴 → 基本編集 → MIDI保存。
- 録音・停止・聴き直し → 同じ解析手順への投入。
- 検出感度のプリセット、音域制限、Undo/Redo、不要ノートの除去、音符の分割・結合（適用不能時は明確に無効化）。
- ファイルの入力制限、段階的な進捗、キャンセル、失敗/無音/無音符結果、異常回復。
- PC・スマホの直接操作、日英、オフライン/単一HTML、ファイル名編集、第三者ライセンス表記。

### 条件付き（精度・互換性・性能のゲート通過時）

- 長時間音声の処理上限拡大（v0.7.0）。
- ピッチベンドを含むMIDI（v0.8.0）。和音が同じMIDIチャンネルを共有すると独立したベンドを忠実に再現できないため、**既定OFF**。無理な出力をしない。
- ONNX / TFLiteなどの軽量実行系への切り替え。公式TypeScript/TF.js版と出力を比較し、単一HTML・CSP・端末性能で優位な場合のみ採用。

### 対象外

- クラウドアップロード、アカウント、他人との共同編集、音源分離、DAW全機能、VST、五線譜・PDF、サーバー側処理、ライブ入力中のリアルタイム推論、多トラック編集、音響効果、音源販売・検索。
- 元音声をMIDIに埋め込むこと（MIDIは音声を含まない）。

## 3. 画面と情報構成（UX契約）

### 3.1 画面の基本順

1. **読み込む** — 画像ではなく音声ファイルを選択・D&D。対応形式と処理場所を明示。v0.3.0以降「録音する」を併記。
2. **解析する** — ファイル名・長さ・容量、処理進捗。モデル準備/デコード/推論/変換を区別。キャンセル可。
3. **音符を確認する** — 元音声の波形、再生位置、ピアノロール。検出した音符数と「自動推定結果」のラベル。
4. **修正する** — 選択ノートの音名/開始時刻/終了時刻を編集。読み取り用の詳細技術設定は折りたたむ。
5. **書き出す** — MIDI保存、v0.8.0以降CSV任意保存。MIDIには元音声が入らない旨を短く表示。

### 3.2 PC

- 解析後は上部に音声波形/再生コントロール、下部に横幅の広いピアノロールを配置。再生位置を両方で同期。
- ノートは複数選択せず**初期版では単一選択**。キーボード/マウスでノートの選択・移動が可能。
- ピアノロールは縦方向で音高をスクロール、横方向で時間を移動。再生、ズーム、編集、保存の操作を混在させない。

### 3.3 スマートフォン

- PCレイアウトの単純な縦積みは禁止。読み込み / 音符 / 書き出しを必要に応じてテンプレートの `components/mobile-bottom-bar.html` のページタブで切り替える。
- ピアノロールは縦に無理に全音域を表示しない。横方向は**画面内の専用スクロール領域**とし、ページ全体に横スクロールを出さない。
- 音符タップで選択後、直下または近接する編集パネルに「音程 −/＋」「開始 −/＋」「終了 −/＋」を表示。細いノート端のドラッグを唯一の操作手段にしない。
- ピンチズームは可能なら対応、必須では拡大縮小ボタンで代替。2本指スクロールとページスクロールの競合を避ける。
- 下部UIはセーフエリアを尊重し、保存ボタンは有効なノートがあるときのみ押せる。固定UIの二重化禁止。
- 幅320/360/390px、短い画面、長いファイル名、モーダル表示中も操作可能。

### 3.4 共通

- ヘッダーの `EN / JA` とヘルプ。ヘルプを開いている間は背景スクロール停止。モーダル本文は独立スクロールでき、最下部まで到達できる。
- 見た目の良い波形・ノートより**読める軸ラベルと確実な操作**を優先。音名（例: C4）と秒数を分かりやすく表示。
- 音声プレーヤーは再生ボタン押下時のみ再生。録音中のマイク信号をスピーカーにループバックしない。
- 全操作にフォーカス表示、キーボード操作、ラベル、`aria-live`、`prefers-reduced-motion`対応。

## 4. 機能要件

### 4.1 入力・音声前処理

| ID | 要件 | 導入 |
|---|---|---|
| FR-001 | 音声ファイル1つを選択・ドラッグ&ドロップできる。初期版で複数ファイル同時解析はしない | v0.1 |
| FR-002 | WAV・MP3を基本対応形式とし、実際のデコード対応はブラウザに依存すると明示。M4A/AAC・OGG・FLACは対応するブラウザに限って読み込み、非対応時は説明を出す | v0.1 |
| FR-003 | 初期上限: 1ファイル50MiB、**デコード後の音声長0.5〜60.0秒**。長さ不正・ファイル不正・音声デコード失敗は別エラー | v0.1 |
| FR-004 | 選択されたファイルだけをローカルで読み込み、ファイル名・容量・再生時間を表示 | v0.1 |
| FR-005 | 推論用データは公式実装と整合した**22,050Hz / モノラル**に変換する。ステレオ→モノラルの規則とリサンプリング方式を検証・文書化する | v0.1 |
| FR-006 | 元音声の再生用データとモデル用音声は別管理。元音声ファイルのバイト列・タグ等のメタデータを改変・保存し直さない | v0.2 |
| FR-007 | マイク権限は「録音する」を押したときだけ要求。利用不可/拒否時でもファイル解析を使える | v0.3 |
| FR-008 | マイク録音は開始・停止・再生・破棄。録音後に明示操作で解析。非対応時は音声ファイル入力を案内 | v0.3 |

### 4.2 推論・ノート生成

| ID | 要件 | 導入 |
|---|---|---|
| FR-009 | Basic Pitchの固定した学習済みモデルを**HTMLに内包**し、ランタイム外部取得なく推論を実行 | v0.1 |
| FR-010 | モデルロード/音声デコード/推論/後処理を進捗上で区別し、遅い端末でも画面を固めない | v0.1→v0.7 |
| FR-011 | ノートの**開始秒・終了秒・MIDI音高（整数）**を生成する。入力長外の値、NaN、0以下の長さを検証で排除 | v0.1 |
| FR-012 | 初期プリセットはモデル由来の適切な標準しきい値。内部のOnset/Frameしきい値は仕様として記録し、再現可能にする | v0.1 |
| FR-013 | 音符0件でも正常な結果画面を表示。「検出されませんでした」と改善方法を示し、空MIDIの保存は無効 | v0.1 |
| FR-014 | 感度は「少なめ・標準・多め」の3プリセット。詳細には検出しきい値、最短音符長、音域上限下限をまとめる | v0.5 |
| FR-015 | 感度変更による再解析は**手動編集を黙って破棄しない**。変更前の結果を保持して確認を取り、成功後に切り替える | v0.5 |
| FR-016 | 誤認識を減らすため、短すぎるノートの除去、音符の結合/分割、時間位置調整を任意操作として提供。勝手な自動補正はしない | v0.6 |
| FR-017 | 60秒を超える音源は分割処理の技術検証通過後に上限拡大する。ウィンドウ境界にまたがるノートの重複・欠落を検証する | v0.7 |

### 4.3 可視化・再生・編集

| ID | 要件 | 導入 |
|---|---|---|
| FR-018 | ピアノロールにノートを音高と時間に沿って表示。推定ノートが多い場合でも表示を仮想化/可視範囲描画する | v0.2→v0.7 |
| FR-019 | 波形/タイムラインとピアノロールの再生位置を同期し、拡大縮小と左右スクロールを可能にする | v0.2 |
| FR-020 | **元音声**と**ノート列から生成した試聴音**を切り替えて再生できる。両方を同時再生しないのが既定 | v0.2 |
| FR-021 | 再生は停止・一時停止・再開・任意位置への移動が可能。再選択/破棄時には古い音を停止する | v0.2 |
| FR-022 | ノートを単独選択し、音名、MIDI番号、開始・終了時刻を確認できる | v0.2 |
| FR-023 | ノートの追加・削除・半音上下変更、開始・終了時刻の修正ができる | v0.4 |
| FR-024 | ノートは原則 `0 ≤ start < end ≤ clipDuration`。重なったノートは**合法**で勝手に削除しない。編集刻みは既定0.05秒、任意数値入力も許可 | v0.4 |
| FR-025 | 削除はUndoできる。編集履歴はUndo/Redo各最大100操作（上限超過時は古い履歴から破棄） | v0.4→v0.5 |
| FR-026 | ユーザーの手動編集と自動推定ノートを区別。解析し直しても古いジョブが編集結果を上書きしない | v0.4 |
| FR-027 | ノートの結合・分割では選択対象と変更結果を事前に明示。異なる音高の結合は不可 | v0.6 |
| FR-028 | タイミング補正/クオンタイズは初期状態でOFF。明示操作時だけ適用し、Undo可能にする | v0.6 |

### 4.4 保存・取り扱い

| ID | 要件 | 導入 |
|---|---|---|
| FR-029 | 最終ノート列から**標準MIDIファイル（`.mid`）**を書き出す。元音声、歌詞、推定できない楽器パートは含まれない | v0.1 |
| FR-030 | ファイル名を保存前に編集できる。既定は `<入力名>-notes.mid`、録音なら `audio-to-midi-YYYYMMDD-HHmmss.mid`。不正文字除去・空名フォールバック・拡張子重複防止 | v0.1 |
| FR-031 | v0.1のMIDIは**音符中心**。内部秒数に合わせて既定テンポ120BPMへ正しく換算、未推定の拍子/調/小節を推定済みと表示しない | v0.1 |
| FR-032 | v0.1の標準書き出しは1ノートトラック、チャンネル1、一般的なピアノ音色、**ベロシティ96/127の固定値**とする。自動音量推定と誤解させない | v0.1 |
| FR-033 | 出力したMIDIを独立デコーダで再読込し、音高・発音数・タイミング・長さが許容丸め誤差内で一致すること | v0.1→v1.0 |
| FR-034 | ピッチベンド出力は既定OFF。単音に限定する等の安全条件を満たし、DAWで検証された場合にのみオプション提供 | v0.8（条件付き） |
| FR-035 | 編集済みノートCSVを `start_seconds,end_seconds,pitch_midi,velocity` のヘッダーでUTF-8保存。ファイル名編集可能 | v0.8 |
| FR-036 | 保存時は現行入力・現行編集の結果からファイルを作り、古いセッションのMIDIを誤保存しない | v0.1 |

### 4.5 状態・エラー・言語

| ID | 要件 | 導入 |
|---|---|---|
| FR-037 | 空/準備完了/モデル準備中/解析中/成功（ノートあり）/成功（ノートなし）/失敗/キャンセルを別状態として扱う | v0.1 |
| FR-038 | 入力の入替え・再解析・リセット時は**単調増加する世代トークン**で古い非同期結果を無効化。Blob URL、音声バッファ、テンソル、音源、Worker等を適切に解放 | v0.1→v0.7 |
| FR-039 | 処理キャンセルは新しいUI状態を即反映し、実行中推論は次の安全な区切りで停止する。安全な停止が不可なら結果破棄・処理再開防止・理由を表示 | v0.1 |
| FR-040 | 編集内容や未保存録音を消す操作には確認またはUndoを提供。ページ再読み込み時に音声・ノートは保持されないことを説明 | v0.3→v0.5 |
| FR-041 | 日英UIを同じHTMLで切り替え、処理中も編集状態と再生位置を保持する | v0.1→v0.9 |
| FR-042 | エラーメッセージは原因と次の行動を示す。コンソールの技術用語を一般画面に露出しない | v0.1 |
| FR-043 | 設定は言語と軽量なプリセットのみブラウザのローカル設定保存を許可。**元音声・解析結果・編集済みノートは自動永続化しない** | v0.1→v0.9 |

## 5. ノートデータの内部契約

`Note` は原則以下に正規化し、描画・再生・編集・MIDI出力は同じデータを参照する。

```ts
interface Note {
  id: string;               // セッション内で一意、再計算してもUIの一意性を守る
  pitchMidi: number;        // 整数 0〜127。初期モデルの主な検出レンジはA0〜C8
  startSeconds: number;     // 有限数、0以上
  endSeconds: number;       // 有限数、startより大、入力長以下
  velocity: number;         // 出力用整数1〜127。初期仕様は96
  origin: 'detected' | 'manual';
  pitchBends?: number[];    // v0.8以降の任意フィールド
}
```

- タイムライン座標は**常に元の音声の秒数**とする。表示座標、モデルフレーム数、MIDI tick数と混同しない。
- 変換時に `startSeconds`/`endSeconds` を一定精度で丸めても元の保存モデルは変更しない。重なるノートは許容。
- 表示上の C4 は**MIDI 60**。日本語/英語でも音名の基準は統一。
- ノートの音高/長さはAI推定であり、音の強弱を正確に採譜したとは主張しない。
- ピッチベンドを編集・加工する機能は初期スコープ外。ピッチ移動などの編集後は古いベンド列をそのまま適用しない。

## 6. 推論とランタイム構成

### 6.1 推奨の第1実装

- 公式 [`@spotify/basic-pitch`](https://github.com/spotify/basic-pitch-ts)（TF.js版）を最初の候補とする。使用するnpm版とGraphModelをビルド時に固定。
- 公式APIは**22,050HzのモノラルAudioBufferまたはFloat32Array**を入力とし、フレーム・オンセット・輪郭の推定を順次返す。推論の時間補正・後処理は**公式に整合**させる。
- 公式 `BasicPitch` クラスは読み込み済み `Promise<GraphModel>` を受け付ける。したがってGraphModelのJSON/重みはHTMLに埋め、**ネットワークfetchに頼らないインメモリのIOHandler**等で読ませる設計を技術検証する。
- 公式GraphModelファイル（2026-10-16 GitHub確認）は `model.json` 約175KB と重み `.bin` 約742KB。`ONNX` 約230KB・`TFLite` 約204KBは比較用であり、**モデルの小ささだけでランタイムを決定しない**。
- TF.jsへのメモリ負荷、処理中断、後処理の配列サイズを測定する。推論の中間Tensorは公式コードでも完全に自動解放されると仮定せず、測定して必要なら安全なラッパーを用意する。

### 6.2 第2候補（検証で優位な場合）

- ONNX Runtime WebまたはTFLiteのWASM。**モデル+ランタイム+前後処理**の実測サイズ、メモリ、正解ノートとの比較、モバイルCPU性能を総合して採用を判断。
- `file://` 開始、`connect-src 'none'`、Worker/WASM用CSP、モデル読み込み方法を実際のブラウザで確認する。Blob URLへの`fetch()`や外部WASM配布パスを前提としない。
- 特定ブラウザでGPU系が利用できない場合も、初期版の必須動線はCPU側で完結させる。

### 6.3 音声の読み込み制約

- Web Audioの `decodeAudioData()` は**ファイル全体を渡してデコード**するAPI。将来の長時間処理では「任意の切断済み圧縮データをそのまま断片的にデコードできる」と考えず、ブラウザのデコーダー/メモリ制約を考慮する。
- v0.7の延長対応では、前後重複を持つ解析ウィンドウを使用。境界でノートを重複・切断しないよう結合ルールと回帰テストを設ける。

## 7. MIDI出力仕様

- 既定: **Standard MIDI File（SMF）タイプ1**。テンポメタデータ120BPMを固定して秒数→tickへ換算。推定テンポではない旨を明示。
- 音符は専用1トラック、チャンネル1（内部0）、Program 0（Acoustic Grand Piano）の試聴・互換性確認用設定。和音など複数の重なりを維持。
- 固定velocityは96（MIDI整数値）。入力音量からの忠実なベロシティ推定はしない。
- Note On/Offはそれぞれの秒数で作成。連続する同音の境界、極短音、重なり、最終ノート終了などでノート欠落や鳴りっぱなしを防ぐ。
- ライブラリが異なるSMF構造を出す場合は、**独立パーサーでの受け入れ条件**を優先し、外形を変更するなら仕様を明示改訂する。
- MIDIには元音声、音源そのもの、元ファイルのメタデータは含まない。録音済みファイルの保存は別操作。
- 試聴時の簡易合成はWeb Audioで行う。シンセサイザーの音色が原音と異なることを説明。

## 8. 状態遷移・事故防止

| 現在状態 | 操作 | 次の状態 | 必須処理 |
|---|---|---|---|
| empty | ファイル選択 | decoding | 世代トークン更新。旧セッションを開放 |
| decoding | デコード完了 | loading-model / analyzing | 制限・PCM等を検証 |
| loading-model | モデル準備完了 | analyzing | 進捗、モデル再利用 |
| analyzing | ノートありで完了 | result | ノート・音声・タイムラインの整合を検証 |
| analyzing | ノート0件で完了 | no-notes | 理由候補/改善策を表示、MIDI保存無効 |
| decoding/loading-model/analyzing | 失敗 | error | リトライ可能・技術詳細は折りたたむ |
| analyzing | 中止/ファイル変更 | cancelled / decoding | 古い世代の更新を遮断 |
| result | 編集 | dirty | ノート変更を即時反映・Undo対象 |
| dirty | 再解析要求 | confirmation → analyzing | 変更が消えることを通知。承認まで現結果を維持 |
| result/dirty | MIDI保存 | result/dirty | 保存が完了しても元データはそのまま保持 |
| 任意 | リセット | empty | 未保存データ破棄の確認、音停止、Blob/Tensor解放 |

- 古い解析があとから終わっても、新しい入力や編集中ノートに適用してはならない。
- 録音中に入力ファイルを変更しようとした場合、先に録音を停止し、未保存録音の扱いを明示する。
- タブ閉鎖/再読み込みで音声・未保存ノートが失われる。可能なら未保存変更時のみ`beforeunload`を補助的に使うが、特にモバイルでは必ず警告できると約束しない。

## 9. プライバシー・セキュリティ・配布

- **完全ローカル処理:** 推論・録音・編集中データをサーバーへ送らない。ランタイムの`fetch`/XHR/WebSocket/外部CDN/外部フォント/telemetry/analyticsは禁止。初回ページ配信は別。
- CSP: 少なくとも `connect-src 'none'`。Worker/WASM/Blobの必要権限のみ、動作検証を伴って最小限許可。ブラウザのNetworkログで外部通信ゼロを確認する。
- 保存は利用者の明示操作。録音時の権限は自動要求せず、停止時はMediaStreamTrackを確実に停止する。マイクをスピーカーへ直結しない。
- `file://` の単一HTMLでは**ファイル入力・解析・編集・MIDI保存**を必須動線とする。マイクはブラウザの安全なコンテキスト/権限仕様により使えない場合があるため、その際はHTTPS版の利用等を案内。
- 現在のテンプレート構成（確認日2026-10-16）では `dist/index.html`、`dist/index.self-extract.html`、リポジトリ直下の`audio-to-midi.html`（**提案リポジトリ名を採用した場合の生成名**）。実装時にテンプレートで再確認。
- 正規のfaviconは `assets/favicon.svg`（64×64、`rx=16`、背景 `#16624F`、白の図形）。ヘッダーと埋め込みfaviconを一致。
- npmとモデル資産は完全にバージョン固定し`dependencies.json`と`dependencies.lock.json`に記録。`THIRD_PARTY_NOTICES.md`にライセンスと帰属を記載。
- 標準のテンプレートビルド、self-extract復元一致、`build-size-report.json`、単一HTMLの`file://`操作、日英UIをCI/手動で確認。
- 音声・ノートはセッションメモリだけに置く。ログにファイル内容・音声断片・文字列を出さない。

## 10. 解析精度・性能の評価原則

**いずれも目標値であり未達/未検証**。実装時に端末名、ブラウザ、録音条件、モデル版を記録する。

- 受け入れテストの音源は、合成単音（音名/開始/終了の正解あり）、鼻歌、ギター単音、ピアノ和音、ノイズ/無音、短い録音を含む。音源の提供権利と個人情報に注意。
- **推論品質:** 合成単音は正解に近いことを最低ゲートとし、実音源では精度指標（音高一致、発音時刻誤差、偽陽性、修正操作数）をバージョン間で比較。未測定の「高精度」文言禁止。
- **表示・保存の正確性:** 表示ノートとMIDI再読込ノートの音高は完全一致、時間・長さはtick量子化の丸め誤差内（目標20ms以下）。元音声解析結果そのものの推定誤差とは区別する。
- **処理目標（初期ベンチ）:** 10秒・30秒・60秒の入力で処理完走/キャンセルを記録。基準端末を固定するまで絶対的な秒数SLAは約束しない。UI操作・処理進捗が固まらないことを必須。
- **上限:** v0.1〜v0.6では最大60秒 / 50MiB。v0.7以降の上限増加はメモリ・端末・境界検証が通った場合のみ公開（暫定候補: 5分）。通らなければ上限据置きでv1.0に進める。
- **品質改善:** 複雑な楽曲での完全一致をゴールにせず、MIDIの確認・手動修正が完了できることを重視する。

## 11. v1.0.0のリリース基準

1. WAV/MP3の対応端末で、読み込み→解析→試聴→修正→MIDI保存が端末内で完走する。
2. マイク非対応/拒否でもファイル変換は動き、録音中の権限・停止状態が分かる。
3. MIDIの独立パーサー検証で音高・開始・長さが所定誤差以内。保存ファイル名を編集できる。
4. ピアノロールはPC/スマホで読めて選択/編集でき、操作のUndo/Redoが破綻しない。
5. 無音、短すぎる入力、長すぎる入力、未対応形式、デコード失敗、0ノート、メモリ不足、キャンセル、再読込・入力切替などが案内付きで復帰できる。
6. 日本語/英語、320/360/390px、PC、iOS Safari/Android Chrome/PC Chrome/Edge/Firefox/Safariで確認。未対応は明示。
7. 通常版と自己展開版が`file://`で主動線を完走し、Network観測でデータ送信なし。
8. `APP_SPEC.md`、README（日英）、CHANGELOG、LICENSE、THIRD_PARTY_NOTICES、favicon、実アプリのスクリーンショット（日英）とCI結果が揃う。
9. 条件付きの長時間処理・ピッチベンドが不十分なら、**隠してリリース**。未実装の機能を宣伝しない。

検証の詳細は `docs/ACCEPTANCE_MATRIX.md` を参照。

## 12. 公式参照先

- Basic Pitch Python: https://github.com/spotify/basic-pitch
- Basic Pitch TypeScript: https://github.com/spotify/basic-pitch-ts
- 公式モデル/変換例: https://github.com/spotify/basic-pitch-ts/tree/main/model
- 公式説明: https://www.engineering.atspotify.com/2022/6/meet-basic-pitch
- Browser Kitty template: https://github.com/ttomohisa/htmlapps-template
- Music Practice Kit: https://github.com/ttomohisa/htmlapps-music-practice-kit
- Web Audio decodeAudioData: https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData

### PR preview UI refinement (2026-10-16)

- Header subtitle: “音声から音符を見つけてMIDIに” / “Find notes in audio and turn them into MIDI”.
- Input and MIDI output use the canonical white workspace surface, border, corner radius and responsive spacing.
- Help and reset confirmation keep the background fixed at its previous scroll position. Close, Escape, backdrop and native dialog closure restore scrolling; opening failures must not leave a lock.

### v0.2 implementation boundary (2026-10-16)

- Original decoded AudioBuffer remains separate from model mono PCM. The original/synth comparison is read-only and shares the source-seconds timeline; selecting, zooming and scrolling do not change exported notes.
- Waveform displays min/max energy across decoded channels, rather than modifying or exporting the original recording.
- Short-lookahead Web Audio synthesis uses a simple triangle tone; it is not a piano sample or an instrument estimate. Playback uses an explicit Play gesture and pauses on hidden/pagehide.
- The review workspace keeps waveform, transport, piano roll and selection details together. The dedicated piano viewport scrolls both axes; note selection also has a native keyboard-accessible list.
- Physical audible-device and touch interaction gates remain explicitly unverified until tested.

### v0.3 implementation boundary (2026-10-16)

- Explicit Record is the only microphone permission trigger. Native MediaRecorder selects a supported and playable MIME type at runtime; the complete Blob must also pass the same actual decode/duration validation as file input before use. Stop never starts inference.
- Recording stops at 59 seconds, leaving margin below the 60-second decoded input limit; encoded capture is capped at 50 MiB. Native chunks are retained only in session memory. An incomplete take is discarded on capture errors/device loss with a clear retry/file fallback.
- Stop/cancel/discard release tracks and the analysis-only meter graph. Pending permission grants are generation-checked and late tracks stopped. The meter is never connected to a speaker destination.
- Unsaved take replacement/reset uses the canonical confirmation. Mobile navigation away from active capture asks to stop and keep the take. Hidden/pagehide stops capture for privacy; native unload warning is best effort and not guaranteed on mobile.
- The optional original-recording download has its own editable filename and actual MIME extension. A generated recording defaults to audio-to-midi-YYYYMMDD-HHmmss; its MIDI uses the same base. Downloading MIDI does not mark the original recording as saved.
- At <=600px the canonical bottom bar switches Input / Notes / Export pages; desktop retains all framed workspaces. Notes and export use real disabled states until available. Header, hero, fully-local badge and modal scroll-position restoration are retained.
- WebM is accepted for reloading browser recordings when the browser can decode it. File conversion remains usable if microphone permission/API/MIME/secure-context support is unavailable. file:// availability varies by browser; HTTPS is the recording fallback.
- No additional model/library dependency or runtime network access is introduced. Physical device permission prompts, microphone quality, audible listening, mobile touch and Safari/Firefox codecs remain manual acceptance gates.

### v0.4 implementation boundary (2026-10-16)

- Analysis creates an immutable detection snapshot and a separate session-owned editable list. Piano roll, simple synth and MIDI share that list; original audio is never changed.
- Single-note selection has adjacent 44px controls for add/delete, semitone pitch steps and 0.05-second start/end steps. Direct note-name/MIDI and second inputs apply atomically after validation; overlap is legal.
- Manual additions have distinct IDs and origin. Editing a detected note retains its detected provenance. No tempo, velocity or pitch-bend estimation is introduced.
- Delete uses the canonical Undo toast and a persistent deletion-undo button (up to 100 deleted notes). General edit Undo/Redo is reserved for v0.5.
- Unsaved edited note content is fingerprinted against the latest download. Reanalysis, audio replacement, recording replacement and reset guard data loss. Download initiates browser saving; the app cannot establish that the file reached storage.
- Edits are session-only. beforeunload is best effort; physical mobile/device acceptance remains unverified.

### v0.5 implementation boundary (2026-10-16)

- Explicit Analyze applies the selected sensitivity. Fixed onset/frame/minimum-second presets: Fewer 0.7/0.5/0.12, Standard 0.5/0.3/0.059, More 0.3/0.15/0.03; all default to MIDI21–108. Advanced values permit finite thresholds0–1, minimum0.01–2 seconds, integer pitch0–127 with low<=high. Model predictions remain A0–C8.
- Settings drafts do not mutate existing notes. Reanalysis confirms unsaved edits and replaces the detection/editor only on success. Failure or cancel preserves previous notes, saved fingerprint and history.
- Undo/Redo records each valid changed edit atomically, retains100 operations and clears Redo after a new edit. No-op/invalid edits do not consume history. Text controls keep native undo; elsewhere Ctrl/⌘+Z and Ctrl/⌘+Shift+Z apply note history (Ctrl+Y also supported).
- Warn above1000 notes or above100 notes and three times the previous result count. This is a review hint, not an accuracy judgment or automatic deletion.
- The exact supplied SVG is embedded in header, readable favicon and self-extract favicon. No extra dependency, persistence, network, duration or model change.
