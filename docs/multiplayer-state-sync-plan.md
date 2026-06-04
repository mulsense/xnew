# xnew マルチプレイ状態同期 実装プラン（v2: server/client ブロック方式）

> **For agentic workers:** subagent-driven-development で task ごとに実装。各 task は TDD（失敗テスト→実装→pass→commit）。

**Goal:** 1 つのコンポーネント関数に `xnew.server`/`xnew.client` ブロックで環境別コードを分けて書き、server ツリーの状態をクライアントへ差分同期する。エンジンは mode で条件分岐しない。

**設計 spec:** [multiplayer-state-sync-design.md](multiplayer-state-sync-design.md)。作業ブランチ `v0.8/state-sync`。テストは `npx jest`、ビルドは `npm run build`（Sail 不使用）。

---

## 契約（全 task 共通）

```ts
// src/core/unit.ts — Unit._ 追加: mode/syncState/syncId。static: Unit.config = { mode: null }, Unit.syncIdCounter。
//   mode 解決: parent ? (parent._.mode ?? Unit.config.mode ?? null) : null
//   ★ Unit.update/render/nest/on は変更しない（ゲートなし）。Unit.reset は syncIdCounter のみ初期化（config は触らない）。

// src/core/sync.ts
export interface SyncNode { id: number; name: string; parentId: number | null; state: Record<string, any>; }
export type StateTree = SyncNode[];
export function registerComponent(name: string, Component: Function): void;
export function getRegisteredName(Component: Function): string | undefined;
export function getRegisteredComponent(name: string): Function | undefined;
export function resetRegistry(): void;
export function getSyncName(unit: Unit): string | undefined;   // _.Components の登録名（最初の一致）
export function captureStateTree(root: Unit): StateTree;
export function applyStateTree(root: Unit, tree: StateTree): void;

// src/core/xnew.ts に追加:
//   xnew.config（= Unit.config）
//   xnew.server(callback, props?)  : mode !== 'client' のとき Unit.extend 相当で callback 実行（null も実行）
//   xnew.client(callback, props?)  : mode !== 'server' のとき実行（null も実行）
//   xnew.sync = { state, register, capture, apply }
```

## ファイル構成
- Modify: `src/core/unit.ts`（フィールド・config・counter・mode 継承のみ）
- Create: `src/core/sync.ts`
- Modify: `src/core/xnew.ts`（config / server / client / state 名前空間）
- Create: `test/core/sync/{mode,server-client,state,capture,reconcile,loopback}.test.ts`
- Create: `examples/6_state-sync/loopback/{index.html,index.js}`

---

## Task 1: エンジン core（mode/config、ゲートなし）

`src/core/unit.ts`:
- `public _` 型に `mode: string | null; syncState: Record<string, any> | null; syncId: number | null;`
- `this._` リテラルに `mode: parent ? (parent._.mode ?? Unit.config.mode ?? null) : null, syncState: null, syncId: null,`
- static 追加: `static config: { mode: string | null } = { mode: null };` `static syncIdCounter: number = 1;`
- `static reset()` 先頭で `Unit.syncIdCounter = 1;`（config は触らない）
- **update/render/nest/on は一切変更しない。**

テスト `test/core/sync/mode.test.ts`: ① config.mode を設定して作った top-level unit がその mode を持つ ② 子は親 mode を継承し config.mode 変更の影響を受けない ③ config.mode=null の既定で mode=null ④ 既存 test/core/unit・xnew が非回帰。

各 describe の beforeEach に `Unit.reset(); xnew.config.mode = null;`、afterEach に `xnew.config.mode = null;`。

## Task 2: xnew.config / xnew.server / xnew.client

`src/core/xnew.ts` helpers に追加:
```ts
config: Unit.config,
server(callback: Function, props?: Object): { [key: string]: any } {
    if (Unit.currentUnit._.mode !== 'client') {
        return Unit.extend(Unit.currentUnit, callback, props);
    }
    return {};
},
client(callback: Function, props?: Object): { [key: string]: any } {
    if (Unit.currentUnit._.mode !== 'server') {
        return Unit.extend(Unit.currentUnit, callback, props);
    }
    return {};
},
```
（`Unit.extend(unit, Component, props)` は既存。callback を Component として実行し defines をマージして返す。）

テスト `test/core/sync/server-client.test.ts`:
- server: server ブロック実行 / client ブロック未実行（client 内の副作用が起きない）
- client: client 実行 / server 未実行
- null: 両方実行
- server/client が返す defines が unit にマージされる
- client ブロック内の `xnew.nest('<div>')` が実 DOM を作る（client）/ server では client 自体が走らないので nest も呼ばれない

## Task 3: sync.ts レジストリ + xnew.sync.state/register

`src/core/sync.ts` 新規（registry / getSyncName / SyncNode / StateTree）。ヘッダは src/core 規約に従う。
`src/core/xnew.ts` に `xnew.sync` 名前空間を追加（この task では state/register を実装、capture/apply は次 task で追加）:
```ts
sync: {
    state(initial: Record<string, any> = {}): Record<string, any> {
        const unit = Unit.currentUnit;
        if (unit._.syncState === null) { unit._.syncState = {}; }
        Object.assign(unit._.syncState, initial);
        return unit._.syncState;
    },
    register(components: Record<string, Function>): void {
        for (const [name, Component] of Object.entries(components)) { registerComponent(name, Component); }
    },
    // capture / apply は Task 4/5 で追加
},
```
テスト `test/core/sync/state.test.ts`（state: 同一参照・マージ）、`test/core/sync/capture.test.ts` の `describe('registry')`（register 双方向、getSyncName）。

## Task 4: captureStateTree + xnew.sync.capture

`sync.ts` に pre-order DFS の `captureStateTree`（lazy id 付与、parentId=最近 synced 祖先、state は shallow copy）。`xnew.sync.capture` を追加。テストは `capture.test.ts` に `describe('captureStateTree')`。

## Task 5: applyStateTree + xnew.sync.apply

`sync.ts` に reconcile（WeakMap、create/update/remove）。`xnewChild(parent, Component) = (xnew as any)(parent, Component)`（mode を渡さない＝親 client を継承）。`xnew.sync.apply` を追加。循環 import（xnew↔sync）はランタイム安全。テスト `reconcile.test.ts`（create/update/remove）。

## Task 6: ローカル模擬 往復テスト

`test/core/sync/loopback.test.ts`: `Mover` を server/client ブロックで定義し、server サブツリー + client サブツリーを 1 プロセスに同居。cycle で start→update→apply(capture)→start→render。client の `state` と **DOM 反映**（`element.style.left`）を assert。spawn/despawn 反映も検証。

## Task 7: example + ヘッダ + 全体ビルド

`examples/6_state-sync/loopback/index.js`（`index2.js` 相当、import は `../../dist/xnew.mjs`）と `index.html`。`xnew.ts` ヘッダ inventory に config/server/client/state.* を追記。`npm test` 全 pass、`npm run build` 成功（循環 dep 警告は許容）を確認。

---

## 完了条件
- `npm test` 全 pass、既存挙動（mode 未指定）は不変。
- `xnew.server`/`xnew.client` で環境別コードが分離され、エンジンに mode 分岐がない。
- loopback テストで capture→apply 往復・DOM 反映・spawn/despawn を確認。
- example がブラウザのみで動作。
