# スコープ付き sync レジストリ 設計

- 日付: 2026-06-06
- 対象: `packages/xnew`（サブモジュール）の状態同期エンジン
- 関連: [2026-06-05-composed-synced-state-design.md](./2026-06-05-composed-synced-state-design.md)、[src/core/sync.ts](../../../src/core/sync.ts)

## 背景と目的

現状 `xnew.sync.register({ Actor, Enemy, Mover })` は、アプリ起動時にすべての同期対象
コンポーネントを **グローバルな単一レジストリ**（`nameToComponent` / `componentToName`）へ
一括登録するルールになっている。全コンポーネントを 1 か所で列挙する必要があり、
モジュール性が低い。

本変更では、登録を **各コンポーネント関数に分散** させる。各コンポーネントは
「自分の **直接の子** として同期されうるコンポーネント」だけを宣言する。

```js
function Main() {
    xnew.sync.register({ Mover });   // Main が直接生成する同期子
    // ...
}
function Mover(unit) {
    xnew.sync.register({ Enemy });   // Mover が直接生成する同期子
    // ...
}
```

## 確定した仕様判断

1. **本当にスコープ限定**: あるコンポーネントで登録した型は、そのスコープ内でのみ
   同期できる。スコープが違えば同名でも別コンポーネントとして扱える。
2. **直接の子のみ**: 登録は「登録したユニットの **直接の子ユニット**」にのみ効く。
   サブツリー全体への継承はしない。`Enemy` を `Mover` 配下で使うなら `Mover` が
   `Enemy` を登録する必要がある。
3. **グローバル登録は廃止・エラー化**: コンポーネント外（`Unit.currentUnit === null`）で
   `xnew.sync.register` を呼んだ場合は、既存の `xnew.extend` / `server` / `client` と
   同様に例外を投げる。

## アーキテクチャ（案A: 親ユニットにレジストリを持たせる）

### データ構造

各 `Unit` に登録表を持たせる。

```ts
// unit.ts の _ に追加
syncRegistry: { byName: Map<string, Function>; byComponent: Map<Function, string> } | null;
```

初期値 `null`（register が一度も呼ばれなければ作らない）。

### register

`xnew.sync.register(components)` は `Unit.currentUnit` のレジストリに追記する。

- `Unit.currentUnit === null` の場合は例外（コンポーネント外呼び出し）。
- `server` / `client` ブロックの **外**（共通 body）で呼ぶ運用とする。これにより
  server ランタイムと client ランタイムの両方が同じ登録を持つ。
- 同じ register を複数回呼んだ場合は単純に追記（マージ）。

### 同期可否・名前解決（capture）

ユニット U が同期対象か＝**U の直接の親ユニット** `U._.parent` のレジストリに、
U のコンポーネント（`U._.Components` を最派生＝末尾側から探索）が登録されているか。

- 一致した登録名を SyncNode の `name` に使う。
- 親が `null`、または親にレジストリが無い／一致しなければ U は非同期。
  ルート（`Main` 等）は誰にも登録されないので非同期のまま（現状維持）。
- `extend` は同一ユニットなので、最派生の登録名が採られる（基底に化けない）。
  従来どおりだが、探索対象が「親レジストリ」に変わる。

`captureStateTree` の `parentId` は従来どおり「最も近い同期済み祖先の syncId」。
本変更でも `Main → Mover → Enemy` のように直接親子が同期される構成では従来と同じ
tree 形状になる。

### 復元（apply）

`applyStateTree` が SyncNode から子ユニットを生成するとき、`node.name` を
**復元済みの親ユニットのレジストリ** から引いてコンポーネントを決定する。

- `node.parentId === null` のノードは `root`（呼び出し側が渡した client サブツリー
  ルート）のレジストリで解決。
- 親ユニット生成 → その body が `register(...)` 実行 → 次階層の子を解決可能、と
  top-down に連鎖する。apply が親を先に作る pre-order 前提と整合する。
- 名前が親レジストリに無ければ従来どおり skip（`continue`）。

### sync.ts のエクスポート変更

- 廃止: `registerComponent` / `getRegisteredName` / `getRegisteredComponent` /
  `resetRegistry`（グローバルな 2 マップごと削除）。
- `getSyncName(unit)`: `unit._.parent` のレジストリを参照する実装へ変更。
- apply 内の `getRegisteredComponent(node.name)` は「親ユニットのレジストリ引き」に変更。
- register 本体（currentUnit への追記ロジック）を sync.ts 側のヘルパとして用意し、
  xnew.ts の `sync.register` から呼ぶ。

## 影響範囲

- `src/core/unit.ts`: `_.syncRegistry` フィールド追加。
- `src/core/sync.ts`: レジストリのグローバル→ユニットスコープ化、`getSyncName` /
  apply の名前解決変更、register ヘルパ追加。
- `src/core/xnew.ts`: `sync.register` を新ヘルパ経由に。`xnew.ts` ヘッダ inventory 更新。
- `test/core/sync/*.test.ts`: 全テストがトップレベルで `xnew.sync.register` +
  `resetRegistry` を使っているため書き換え必須。register をコンポーネント内へ移し、
  `resetRegistry` 呼び出しを削除（`Unit.reset()` のみで十分）。
  `getRegisteredComponent` / `getSyncName` を直接 import している箇所も追従。
- `examples/6_network/state-sync/index.js`: 一括 register を `Main`/`Mover` 内へ分散。
- ファイルヘッダ（`sync.ts` の overview コメント）を新 API に合わせて更新。

## テスト方針

- 既存テストを新方式へ移植して全 pass を維持。
- 追加: **スコープ分離**の検証 — 同名 `Child` を 2 つの異なる親が別コンポーネントとして
  登録し、それぞれの配下で別物として capture/apply されること。
- 追加: 親が登録していない子は同期されない（capture に現れない）こと。
- `npm test` 全 pass、`npm run build` 成功（循環 dep 警告は許容）。

## 非目標

- サブツリー継承（祖先の登録を子孫が引き継ぐ）は実装しない。
- 名前の衝突検出やバリデーションの強化は行わない（スコープ分離で自然に解決）。
