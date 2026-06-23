# xnew 改善テーマ集

xnew のインターフェース・機能・使い方に関する改善候補をまとめた作業ドキュメント。
1テーマずつ吟味し、合意したものを具体設計 → 実装へ進める。

## 前提（このライブラリの主要ユーザー像）

`examples/` はすべて **CDN + 生 JS を HTML に直接書く** スタイル（ビルド工程なし）。
主要ユーザーはゲーム／動的シーン開発者であり、次の優先順位で評価する：

1. **後方互換** — 既存の生 JS コードを壊さない（実行時の振る舞いを変えない）
2. **実行時 DX** — タイポや誤用が「無音で失敗」せず、気付ける
3. **型安全** — TS 利用者にとっての補完・コンパイル時検出（生 JS には無害な範囲で）

## ステータス凡例

- `未着手` / `検討中` / `設計合意` / `実装中` / `完了` / `決定（現状維持）`

---

## テーマ2: 型付き defines / Component ヘルパー

- **影響:** 大（TS 利用時） / **コスト:** 中 / **互換性:** ◎（実行時不変。TS のみ厳格化） / **ステータス:** 完了（フェーズ1+2、index signature 削除）
- **ブランチ:** `v0.8/typed-defines`

### 現状

`Unit` は `[key: string]: any`（[src/core/unit.ts](../src/core/unit.ts)）。
コンポーネントが返す defines は unit のプロパティになるが、`xnew(Component)` の戻り値では
すべて `any` に潰れる。

```js
const panel = xnew(Panel);   // panel.group / panel.range … すべて any
unit.canvas;                 // Screen の defines。型なし
unit.on('input', ({ value }) => …);  // value: any
```

コンポーネント作者は毎回プロパティ型を手書きキャストしている
（例: [src/basics/Panel.ts](../src/basics/Panel.ts) `({ value }: { value: number })`）。

### 問題

- `xnew(Panel, { wrong: 1 })` のような props 誤用がコンパイル時に検出されない。
- defines（コンポーネントの公開 API）に補完が効かない。

### 提案（段階的・後方互換）

作者向け型ヘルパーを公開し、`xnew` をジェネリック化して defines を戻り値に合成する。

```ts
// 公開する型ヘルパー
export type Component<P = {}, A = {}> = (unit: Unit, props: P) => A | void;

// xnew が defines を合成して返す
function xnew<A>(Component: Component<any, A>, props?: object): Unit & A;
```

これで `const panel = xnew(Panel)` の `panel.group(...)` が型付きになり、誤用が
コンパイル時に出る。生 JS ユーザーには実行時不変で無害。

### 実装結果（フェーズ1+2）

- **型ヘルパーを追加**（[src/core/unit.ts](../src/core/unit.ts)）: `Component<P, A>` / `DefinesOf<C>` / `PropsOf<C>`。
- **index signature を削除**（方針 A）。`Unit` の `[key: string]: any` を撤去し、内部の動的アクセス2箇所のみ `(unit as any)[key]` に。
  → 未宣言プロパティ・タイポはコンパイルエラーになる。
- **`xnew(...)` をオーバーロード化**（[src/core/xnew.ts](../src/core/xnew.ts) の `XnewBase`）:
  `xnew(Component, props?)` / `xnew(target, Component, props?)` は `Unit & DefinesOf<C>` を返す。
  テキスト/素要素/親指定/無引数の形も型付け。
- **`extend` / `server` / `client` の戻り値**を `DefinesOf<C>` に。`props?` は `PropsOf<C>`。
- **型を公開**（[src/index.ts](../src/index.ts)）: `xnew.Component<P, A>` / `xnew.Mode` / `xnew.Status`。
- src/basics の fallout 修正: `OpenAndClose` は自分の defines を `unit.open()` でなく局所 `api.open()` で呼ぶよう変更、
  `Panel.Group` は `xnew.extend(OpenAndClose)` の戻り値経由で `toggle()` を呼ぶよう変更（いずれも挙動不変）。
- テスト追加: [test/core/xnew/typed-defines.test.ts](../test/core/xnew/typed-defines.test.ts)（`@ts-expect-error` でタイポ検出も検証）。
  既存 `context.test.ts` の `as Unit` キャストを `Unit & { … }` に更新。
- `npm run build` で `dist` / `examples/dist`（型定義含む）を再生成。全 27 suites / 204 tests 合格、`tsc` クリーン。

### 残課題（任意・将来）

- props 必須化: 現状 `props?`（任意）。必須 props を強制するかは将来検討。
- `xnew.context` / `xnew.find` の戻り値型付け（現状 `any` / `Unit[]`）。テーマ1と連動可。
- `Unit & A` のプロパティ名衝突（A が `on`/`element` 等を含む場合）は現状未ガード。

---

## テーマ1: イベントのタイポ検出 + イベントカタログ

- **影響:** 大 / **コスト:** 中 / **互換性:** ◎ / **ステータス:** 未着手

### 現状

イベントの意味がすべて文字列に埋め込まれている。

- システム: `'start' / 'update' / 'render' / 'stop' / 'finalize'`
- 修飾子付き: `'click.outside'`、`'window.keydown.wasd'`、`'pointerdown.outside'`
- emit 接頭辞: `'+global'`（ブロードキャスト） / `'-local'`（自分のみ）

### 問題

`unit.on('updaet', …)` や `on('window.keydwon', …)` は **例外も警告も出ず無音で無効化** される
（[src/core/unit.ts](../src/core/unit.ts) の `on` は未知の type をそのまま受理し、
DOM の `addEventListener` は任意文字列を黙って受ける）。
ソースを読まないと正しいイベント名を発見できず、デバッグが難しい。

### 提案

- **イベントカタログを定数で公開**（`xnew.events.update`, `xnew.events.click.outside` 等）。
  生 JS でも補完が効く。
- **dev ビルド時、xnew 独自記法のタイポを `console.warn`**。
  少なくとも修飾子付き（`xxx.outside`, `window.xxx.wasd` 等）の未知パターンは検出可能。
- **TS 向けにイベント名 → ペイロード型のマップ**を用意し、`on` のリスナー引数を型付け
  （テーマ2と連動）。

### 検討事項

- DOM 任意イベント（`'mycustomevent'` 等）を許容しつつ、既知の xnew 記法のタイポだけ警告する境界の引き方。
- 警告は dev のみ（本番バンドルでは除去）にする手段（`process.env.NODE_ENV` 依存は CDN 利用と相性が悪い点に注意）。

---

## テーマ6: 小さな型・既定値の不整合

- **影響:** 小（確実） / **コスト:** 小 / **互換性:** ◎ / **ステータス:** 未着手

### 項目

- **`unit.element` の型が実体と食い違う。** 実際は null になりうる
  （[src/core/unit.ts](../src/core/unit.ts) `null as unknown as DomElement`）のに
  型は `DomElement`。`DomElement | null` が正直。
- **`interval` の duration に既定値がない。** `timeout` / `transition` は `= 0`
  なのに [src/core/xnew.ts](../src/core/xnew.ts) の `interval(callback, duration, …)` だけ必須。揃える。
- **`event.ts` 全域が `event: any`。** 最低限の型付け余地あり。

### 検討事項

- `element` を `| null` にすると、依存コード（basics 等）で null チェック追加が必要になる範囲の確認。

---

## テーマ3: emit の `+` / `-` 接頭辞（スコープを両側で宣言する設計）

- **影響:** 中 / **コスト:** 小 / **互換性:** ◎ / **ステータス:** 決定（現状維持＝`+`/`-` を継続）

### 背景: 現行プレフィックスは3つの役割を兼ねる

`+` / `-` は次を担っている。

1. **「DOMイベントではない」印** — `on` は `/^[A-Za-z]/` で始まる type だけ `addEventListener` する
   （[src/core/unit.ts](../src/core/unit.ts)）。記号始まりは DOM バインドされない。
   DOM は任意文字列を受理する（`new CustomEvent('x')` も合法）ため、**カスタムイベントには何らかの印が構造的に必須**。
2. **スコープ** — `-` = 自分のみ / `+` = ブロードキャスト（protect 境界尊重）。
   発行側・購読側の **両方** が宣言する（`+x` と `-x` は別チャンネル）。
3. **システム / DOM イベントとの名前空間分離**。

### 検討の経緯

当初は「`+`/`-` が難読」という点から、印を `:` 1種類に統一し、スコープは発行側メソッド
（`emit`=local / `broadcast`=global）で決める案（コロン記法）を試作した
（ブランチ `v0.8/emit-colon`、後に **破棄**）。

しかし実装・移行を通じて、**購読側でもスコープを宣言できること自体に価値がある** と判明した：

- **購読側の意図が読める** — `on('+gameover')`=外向き / `on('-fadeout')`=内向き が一目で分かる。
  実装時点で受け取るスコープは確定していることが多く、宣言できる方が読みやすい。
- **クロストークしない** — `+x` と `-x` は別チャンネルなので、global 発行が local 購読を誤発火させない。
- **対称性** — `on('+x')` ↔ `emit('+x')` と文字列が一致する。

直接の証拠として、コロン統一案では `examples/.../102_originalevent` の local(`-myclick`) と
global(`+myclick`) が同一チャンネルに潰れてクロストークし、別名へ改名せざるを得なかった。
これは「2チャンネルが実際に情報を担っていた」ことを示す。

### 決定

- **`+` / `-` の2チャンネル設計を維持する。** スコープを発行側・購読側の両方で宣言できる利点
  （可読性・衝突安全・対称性）が、コロン統一の利点（どう来ても受けられる／発行側で変えやすい）を
  上回る。後者2つは実利用でほとんど必要にならない。
- コロン記法（`:` + `emit`/`broadcast`）は採用しない。試作ブランチ `v0.8/emit-colon` は破棄。

### 残課題（任意・将来）

- 当初の不満「`+`/`-` がどっちか分かりにくい」への緩和は、**記法は変えずドキュメントで語呂を明記**
  する程度に留める（`+` = 外へ広がる / global、`−` = 内に留まる / local）。

---

## テーマ5: mode / sync の操作系（命名・脱グローバル）

- **影響:** 中 / **コスト:** 大 / **互換性:** △（破壊的の可能性） / **ステータス:** 一部着手

### 現状・問題

- ~~mode 選択の唯一の公開口が `xnew.boot('server', …)` で発見しにくい。~~
  → boot は `xnew.sync.boot({ io / socket })` に集約し、server/client は実行環境（Node/browser）で自動判定する方式へ移行済み。
- ~~`xnew.server()` / `xnew.client()` は名前がゲッターのようだが、実体は「extend 風の条件実行ブロック」。~~
  → マルチプレイ API として `xnew.sync.server()` / `xnew.sync.client()` へ移動済み（[src/core/sync.ts](../src/core/sync.ts)）。
  boot がすでに `xnew.sync` 配下だったため、その companion を同じ名前空間へ寄せて整合させた。
  「ゲッターのように見える」問題自体は残る（必要なら `onServer` / `onClient` への動詞化を別途検討）。
- グローバル可変状態だった `Unit.config.mode` は廃止済み（実行環境ベース判定へ）。

### 残課題

- `xnew.sync.server` / `xnew.sync.client` の動詞化（`onServer` / `onClient`）を行うか。
- 破壊的変更になるため、旧 API のエイリアス期間／メジャーバージョン方針。

---

## テーマ4: ライフサイクル登録経路（`on` 一本 vs defines 糖衣）

- **影響:** 中 / **コスト:** 中 / **互換性:** ◎ / **ステータス:** 未着手

### 現状

毎フレーム処理（`update`/`render`）も DOM イベント（`click` 等）も、同じ `unit.on(...)` で登録する。
直感的だが、「`on('update')` はフレームループ」「`on('click')` は DOM」という二重の意味を
型もドキュメントも区別していない。

### 提案（任意）

- defines の予約キー `start/update/...` を返したら自動でシステムイベント登録、という糖衣を検討。
- ただし現行の一貫性（全部 `on`）を壊すので、まずはドキュメント明確化だけでも可。

---

## テーマ7: README / 公開型がコンシューマ向けに薄い

- **影響:** 小 / **コスト:** 小 / **互換性:** ◎ / **ステータス:** 未着手

### 現状

npm の README はインストール手順のみ。`Component` 型・イベントペイロード型・`Mode` / `Status` 等が
未公開で、TS 導入のハードルが高い（テーマ1・2と連動）。

### 提案

- 主要な型（`Component`, イベントペイロード, `Mode`, `Status`）を `index.ts` から公開。
- README にコンセプトと最小コンポーネント例を追記。

---

## 維持すべき良い設計（壊さないこと）

- **`Unit.scope`** による「async hop 後もコンポーネント文脈で再入する」仕組み。
  promise / timer / event がすべてこれに一貫して乗っている。
- **protect 境界**による find / emit のスコープ制御。
- **`+` / `-` の2チャンネルイベント**（スコープを発行側・購読側の両方で宣言できる。テーマ3参照）。
- **ランタイム非依存**（rAF / setTimeout フォールバック）で Node でも動く。

---

## 優先度サマリ

| テーマ | 影響 | コスト | 後方互換 | ステータス |
|---|---|---|---|---|
| 2 型付き defines/Component | 大 | 中 | ◎ | 完了（フェーズ1+2） |
| 1 イベントのタイポ検出+カタログ | 大 | 中 | ◎ | 未着手 |
| 6 小さな型/既定値の不整合 | 小 | 小 | ◎ | 未着手 |
| 3 emit `+`/`-` スコープ設計 | 中 | 小 | ◎ | 決定（現状維持） |
| 5 mode/sync 命名・脱グローバル | 中 | 大 | △ | 未着手 |
| 4 ライフサイクル糖衣 | 中 | 中 | ◎ | 未着手 |
| 7 README/型公開 | 小 | 小 | ◎ | 未着手 |
