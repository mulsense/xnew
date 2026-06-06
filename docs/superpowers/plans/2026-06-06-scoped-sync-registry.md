# スコープ付き sync レジストリ 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** sync の同期対象登録を、グローバル一括登録から「各コンポーネントが直接の同期子を宣言するスコープ付きレジストリ」へ変更する。

**Architecture:** 各 `Unit` に `_.syncRegistry` を持たせる。あるユニットの同期可否・登録名は **直接の親ユニットのレジストリ** で解決する（capture）。apply は SyncNode を **復元済み親ユニットのレジストリ** で名前→コンポーネント解決して生成する。グローバルレジストリ（`nameToComponent`/`componentToName`）と関連関数は廃止。

**Tech Stack:** TypeScript 5 / Rollup 3 / Jest 29 + jsdom / ts-jest。作業ディレクトリは `packages/xnew`（git サブモジュール、ブランチ `fix/network-sync`）。テストは `npx jest <path>`、ビルドは `npm run build`。

設計: [docs/superpowers/specs/2026-06-06-scoped-sync-registry-design.md](../specs/2026-06-06-scoped-sync-registry-design.md)

---

## File Structure

- `src/core/unit.ts` — `_.syncRegistry` フィールド追加（型定義 + 初期化 `null`）
- `src/core/sync.ts` — レジストリをユニットスコープ化。`SyncRegistry` 型 / `registerOnUnit` / `getSyncName`(親参照) を提供し、グローバル 2 マップと `registerComponent`/`getRegisteredName`/`getRegisteredComponent`/`resetRegistry` を削除。`applyStateTree` の名前解決を親レジストリ経由に。ファイルヘッダ更新
- `src/core/xnew.ts` — `sync.register` を `registerOnUnit(Unit.currentUnit, ...)` 経由に。`import` 文更新
- `test/core/sync/capture.test.ts` — registry/capture テストをスコープ方式へ移植
- `test/core/sync/composed-state.test.ts` — register をラッパ/クライアントルートへ移動
- `test/core/sync/spawn-hierarchy.test.ts` — 同上
- `test/core/sync/loopback.test.ts` — 同上
- `test/core/sync/reconcile.test.ts` — `makeView` がルートで register、`Box` は自己 register
- `test/core/sync/scope.test.ts` — **新規**: スコープ分離 + 未登録子は非同期
- `examples/6_network/state-sync/index.js` — 一括 register を `Main`/`Mover` 内へ分散

---

## Task 1: Unit に syncRegistry フィールドを追加

**Files:**
- Modify: `src/core/unit.ts:88-90`（型定義）, `src/core/unit.ts:159`（初期化）
- Modify: `src/core/unit.ts`（先頭 import 群）

- [ ] **Step 1: `SyncRegistry` 型を sync.ts から type-only import する**

`src/core/unit.ts` の先頭 import 群（`import` 行が並ぶ箇所）に追記する。型のみの import なので実行時の循環依存は発生しない。

```ts
import type { SyncRegistry } from './sync';
```

- [ ] **Step 2: `_` の型定義にフィールドを追加**

`src/core/unit.ts:88-89` の `syncId` / `injected` の宣言に続けて 1 行追加する。変更後はこの並びになる:

```ts
        syncId: number | null;
        injected: Record<string, any> | null;   // server state injected by apply during construction (null otherwise)
        syncRegistry: SyncRegistry | null;   // このユニットが直接の同期子として許可する {name ⇄ Component}（未登録なら null）
```

- [ ] **Step 3: コンストラクタの `this._ = { ... }` に初期化を追加**

`src/core/unit.ts:162-163` の `injected: Unit.injectedSlot,` の直後に 1 行追加する:

```ts
            injected: Unit.injectedSlot,
            syncRegistry: null,
```

- [ ] **Step 4: 型チェックが通ることを確認**

Run: `cd packages/xnew && npx tsc --noEmit -p tsconfig.json`
Expected: `SyncRegistry` 未定義によるエラーのみ（次タスクで sync.ts に追加するため一時的に出る）。`unit.ts` 自体の構文エラーが無ければ OK。`tsconfig.json` が無い場合はこの確認をスキップし、Task 3 完了後の Task 8 ビルドで検証する。

- [ ] **Step 5: コミット（Task 2 とまとめて行うため、ここでは未コミットのまま次へ）**

このタスク単体では `SyncRegistry` 未定義で型が通らないため、Task 2 完了後にまとめてコミットする。

---

## Task 2: sync.ts をユニットスコープ・レジストリへ書き換え

**Files:**
- Modify: `src/core/sync.ts`（全面）

- [ ] **Step 1: ファイルヘッダ（1-11 行目）を新 API に合わせて書き換え**

`src/core/sync.ts:1-11` を以下に置換する:

```ts
//----------------------------------------------------------------------------------------------------
// sync — server→client 状態同期エンジン（スコープ付きレジストリ）
//
// server ツリーの同期対象状態を SyncNode 列(state tree)として捕捉し、client ツリーへ
// 差分適用(create/update/remove)する。実ネットワークは扱わず、捕捉物の生成と再構成のみを担う。
//
// 同期対象の型は「各コンポーネントが自分の直接の子として登録した型」だけ。登録は Unit 単位で
// 保持し（_.syncRegistry）、ある unit の同期可否・登録名は「直接の親ユニットのレジストリ」で解決する。
//
// - SyncRegistry / registerOnUnit : ユニット単位の {name ⇄ Component} レジストリと追記
// - getSyncName        : unit が同期対象なら、直接の親のレジストリ上の登録名(最派生一致)を返す
// - captureStateTree   : server サブツリー → SyncNode[](全量)
// - applyStateTree     : SyncNode[] → client サブツリーへ差分適用。node.name は親ユニットの
//                        レジストリで解決し、create 前に Unit.injectedSlot へサーバー状態を注入
//----------------------------------------------------------------------------------------------------
```

- [ ] **Step 2: グローバルレジストリと旧関数を、ユニットスコープ版へ置換**

`src/core/sync.ts:18-49`（`const nameToComponent` 〜 `getSyncName` 末尾の `}`）をまるごと以下に置換する:

```ts
export interface SyncRegistry {
    byName: Map<string, Function>;
    byComponent: Map<Function, string>;
}

/** 呼び出しユニットのレジストリへ {name: Component} を追記する（無ければ生成）。 */
export function registerOnUnit(unit: Unit, components: Record<string, Function>): void {
    if (unit._.syncRegistry === null) {
        unit._.syncRegistry = { byName: new Map(), byComponent: new Map() };
    }
    for (const [name, Component] of Object.entries(components)) {
        unit._.syncRegistry.byName.set(name, Component);
        unit._.syncRegistry.byComponent.set(Component, name);
    }
}

export function getSyncName(unit: Unit): string | undefined {
    // 同期可否・登録名は「直接の親ユニットのレジストリ」で決まる。
    // _.Components は [基底..., 実際にインスタンス化した Component] の順なので、最も派生した
    // （= 末尾側の）一致を採る（基底に化けない / extend は最派生名で 1 SyncNode）。
    const registry = unit._.parent?._.syncRegistry;
    if (registry === undefined || registry === null) {
        return undefined;
    }
    for (let i = unit._.Components.length - 1; i >= 0; i--) {
        const name = registry.byComponent.get(unit._.Components[i]);
        if (name !== undefined) {
            return name;
        }
    }
    return undefined;
}
```

- [ ] **Step 3: `applyStateTree` の create 部で名前解決を親レジストリ経由に変更**

`src/core/sync.ts` の create ブロック（現状 96-108 行目相当、`if (existing === undefined) {` 〜 `map.set(node.id, unit);`）を以下に置換する。親ユニットを先に確定し、その `_.syncRegistry` で `node.name` を解決する点が変更点:

```ts
        if (existing === undefined) {
            // create
            const parent = node.parentId === null ? root : map.get(node.parentId);
            if (parent === undefined) { continue; }
            const Component = parent._.syncRegistry?.byName.get(node.name);
            if (Component === undefined) { continue; }   // 親が許可していない型は無視
            Unit.injectedSlot = node.state;      // 本体実行前に注入（Unit 構築開始時に _.injected へ退避）
            const unit = new Unit(parent, Component);   // mode は親(client)を継承する
            Unit.injectedSlot = null;            // 退避されなかった場合の漏れ防止（保険）
            unit._.syncId = node.id;
            if (unit._.state === null) { unit._.state = {}; }
            Object.assign(unit._.state, node.state);   // 状態を宣言しない型・欠落キーへの保険
            map.set(node.id, unit);
        } else {
```

- [ ] **Step 4: 旧シンボルの参照が残っていないか確認**

Run: `cd packages/xnew && grep -rn "registerComponent\|getRegisteredName\|getRegisteredComponent\|resetRegistry\|nameToComponent\|componentToName" src`
Expected: 出力なし（すべて削除済み）。

- [ ] **Step 5: コミット（src 側のみ／テストはまだ未更新なので失敗状態）**

```bash
cd packages/xnew
git add src/core/unit.ts src/core/sync.ts
git commit -m "feat(sync): レジストリをユニットスコープ化（親レジストリで名前解決）"
```

---

## Task 3: xnew.ts の sync.register をスコープ登録へ

**Files:**
- Modify: `src/core/xnew.ts:28`（import）, `src/core/xnew.ts:436-440`（register 本体）, `src/core/xnew.ts:413`（JSDoc 1 行）

- [ ] **Step 1: import 文を更新**

`src/core/xnew.ts:28` を以下に置換する:

```ts
import { registerOnUnit, captureStateTree, applyStateTree } from './sync';
```

- [ ] **Step 2: `register` の実装をスコープ登録へ置換**

`src/core/xnew.ts:436-440` の `register(components: ...) { ... }` ブロックを以下に置換する。`extend`/`server`/`client` と同じ try/catch スタイルに揃える:

```ts
            register(components: Record<string, Function>): void {
                try {
                    if (Unit.currentUnit === null) {
                        throw new Error('xnew.sync.register can not be called outside a component.');
                    }
                    registerOnUnit(Unit.currentUnit, components);
                } catch (error: unknown) {
                    console.error('xnew.sync.register(components: Object): ', error);
                    throw error;
                }
            },
```

- [ ] **Step 3: register の JSDoc 行を更新**

`src/core/xnew.ts:413` の register 説明行を以下に置換する:

```ts
         * - register : 現在のコンポーネントの「直接の同期子」を名前マップ `{ Name: Component }` で宣言（server/client 共通 body で呼ぶ）
```

- [ ] **Step 4: src 全体の型チェック / 残存参照確認**

Run: `cd packages/xnew && grep -rn "registerComponent\|getRegisteredComponent\|getRegisteredName\|resetRegistry" src`
Expected: 出力なし。

- [ ] **Step 5: コミット**

```bash
cd packages/xnew
git add src/core/xnew.ts
git commit -m "feat(sync): xnew.sync.register をスコープ登録に変更（コンポーネント外はエラー）"
```

---

## Task 4: capture.test.ts をスコープ方式へ移植

**Files:**
- Modify: `test/core/sync/capture.test.ts`（全面）

- [ ] **Step 1: テストを新方式へ書き換え**

`test/core/sync/capture.test.ts` の内容をまるごと以下に置換する。`getRegisteredComponent`/`resetRegistry` の import を外し、register を親コンポーネント内へ移す。`registry` describe は `getSyncName` がスコープで解決されることを確認する形に変更:

```ts
import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/core/xnew';
import { getSyncName } from '../../../src/core/sync';

function Player() {}

describe('registry (scoped)', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); Unit.config.mode = null; });
    afterEach(() => { Unit.rootUnit?.finalize(); Unit.config.mode = null; jest.useRealTimers(); });

    it('a child is synced under the name its parent registered', () => {
        const root = xnew(function Root() { xnew.sync.register({ Player }); xnew(Player); });
        const player = root._.children[0];
        expect(getSyncName(player)).toBe('Player');
    });

    it('a child whose parent did not register it is not synced', () => {
        const root = xnew(function Root() { xnew(Player); });   // register していない
        const player = root._.children[0];
        expect(getSyncName(player)).toBeUndefined();
    });

    it('a unit with no parent is not synced', () => {
        const unit = xnew((u: Unit) => {});
        expect(getSyncName(unit)).toBeUndefined();
    });
});

describe('captureStateTree', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); Unit.config.mode = null; });
    afterEach(() => { Unit.rootUnit?.finalize(); Unit.config.mode = null; jest.useRealTimers(); });

    function World(unit: Unit) { xnew.sync.register({ Child }); xnew.sync.state({ tick: 0 }); xnew(Child); }
    function Child(unit: Unit) { xnew.sync.state({ position: 5 }); }

    it('captures a synced unit; parentId is null when no synced ancestor exists', () => {
        const root = xnew(function Root() { xnew.sync.register({ World }); xnew(World); });
        const tree = xnew.sync.capture(root);
        const worldNode = tree.find(n => n.name === 'World')!;
        expect(worldNode).toBeDefined();
        expect(worldNode.parentId).toBeNull();
        expect(worldNode.state).toEqual({ tick: 0 });
    });

    it('sets a child parentId to the nearest synced ancestor id', () => {
        const root = xnew(function Root() { xnew.sync.register({ World }); xnew(World); });
        const tree = xnew.sync.capture(root);
        const worldNode = tree.find(n => n.name === 'World')!;
        const childNode = tree.find(n => n.name === 'Child')!;
        expect(childNode.parentId).toBe(worldNode.id);
    });

    it('assigns stable ids and reflects mutated state on later captures', () => {
        const root = xnew(function Root() { xnew.sync.register({ Child }); xnew(Child); });
        const first = xnew.sync.capture(root)[0];
        root._.children[0]._.state!.position = 9;
        const second = xnew.sync.capture(root)[0];
        expect(second.id).toBe(first.id);
        expect(second.state).toEqual({ position: 9 });
    });
});
```

- [ ] **Step 2: テスト実行**

Run: `cd packages/xnew && npx jest test/core/sync/capture.test.ts`
Expected: 全 6 件 PASS。

- [ ] **Step 3: コミット**

```bash
cd packages/xnew
git add test/core/sync/capture.test.ts
git commit -m "test(sync): capture テストをスコープ登録方式へ移植"
```

---

## Task 5: composed-state.test.ts を移植

**Files:**
- Modify: `test/core/sync/composed-state.test.ts`

各テストの「server ラッパ」と「client ルート」に register を入れる。`resetRegistry` の import と全呼び出しを削除する。

- [ ] **Step 1: import と beforeEach を修正**

`test/core/sync/composed-state.test.ts:3` の import 行を削除する:

```ts
import { resetRegistry, StateTree } from '../../../src/core/sync';
```
は composed-state.test.ts には無い。実際の 3 行目:
```ts
import { resetRegistry } from '../../../src/core/sync';
```
→ この行をまるごと削除する（このファイルは sync から何も import しなくなる）。

`test/core/sync/composed-state.test.ts:24-29` の beforeEach を以下に置換（`resetRegistry()` と トップレベル register を除去）:

```ts
    beforeEach(() => {
        jest.useFakeTimers({ now: 0 });
        Unit.reset(); Unit.config.mode = null;
        clientReadAtConstruction = {};
    });
```

- [ ] **Step 2: 1 件目テストの server/client を register 付きへ**

`test/core/sync/composed-state.test.ts:33-37` の server/client 生成部を以下に置換:

```ts
        Unit.config.mode = 'server';
        const server = xnew(function Server() { xnew.sync.register({ Enemy }); xnew(Enemy); });
        Unit.config.mode = 'client';
        const client = xnew(function ClientRoot() { xnew.sync.register({ Enemy }); });
        Unit.config.mode = null;
```

- [ ] **Step 3: leak テスト（Host）を register 付きへ**

`test/core/sync/composed-state.test.ts:70-76` を以下に置換（トップレベル register を削り、ラッパ/ルートで register）:

```ts

        Unit.config.mode = 'server';
        const server = xnew(function Server() { xnew.sync.register({ Host }); xnew(Host); });
        Unit.config.mode = 'client';
        const client = xnew(function ClientRoot() { xnew.sync.register({ Host }); });
        Unit.config.mode = null;
```

（注: 70 行目の `resetRegistry(); xnew.sync.register({ Host });` 行は上記置換で消える。）

- [ ] **Step 4: most-derived テストを register 付きへ**

`test/core/sync/composed-state.test.ts:92-96` を以下に置換。ラッパ S が基底 `ActorBase` と派生 `EnemyDerived` の両方を register する:

```ts
        resetRegistry();   // ← この行ごと次の置換対象。下記で置き換える
```
具体的には 92-96 行:
```ts
        resetRegistry(); xnew.sync.register({ ActorBase, EnemyDerived });   // 基底も登録

        Unit.config.mode = 'server';
        const server = xnew(function S() { xnew(EnemyDerived, { y: 8 }); });
        Unit.config.mode = null;
```
を以下に置換:
```ts
        Unit.config.mode = 'server';
        const server = xnew(function S() { xnew.sync.register({ ActorBase, EnemyDerived }); xnew(EnemyDerived, { y: 8 }); });
        Unit.config.mode = null;
```

- [ ] **Step 5: example-mirror テスト（Sprite）を register 付きへ**

`test/core/sync/composed-state.test.ts:124-130` を以下に置換:

```ts
        Unit.config.mode = 'server';
        const server = xnew(function Server() { xnew.sync.register({ Sprite }); xnew(Sprite, { y: 8 }); });
        Unit.config.mode = 'client';
        const client = xnew(function ClientRoot() { xnew.sync.register({ Sprite }); });
        Unit.config.mode = null;
```

（124 行目の `resetRegistry(); xnew.sync.register({ Sprite });` はこの置換で消える。）

- [ ] **Step 6: テスト実行**

Run: `cd packages/xnew && npx jest test/core/sync/composed-state.test.ts`
Expected: 全 5 件 PASS。`duplicate key` テスト（register 不要）と leak テストの `childState.value === -1` も維持。

- [ ] **Step 7: コミット**

```bash
cd packages/xnew
git add test/core/sync/composed-state.test.ts
git commit -m "test(sync): composed-state テストをスコープ登録方式へ移植"
```

---

## Task 6: spahn-hierarchy / loopback テストを移植

**Files:**
- Modify: `test/core/sync/spawn-hierarchy.test.ts`
- Modify: `test/core/sync/loopback.test.ts`

- [ ] **Step 1: spawn-hierarchy の import / beforeEach を修正**

`test/core/sync/spawn-hierarchy.test.ts:3` の `import { resetRegistry } from '../../../src/core/sync';` を削除する。

`Mover` が `Enemy` を register するよう、`test/core/sync/spawn-hierarchy.test.ts:20-21` を以下に置換:

```ts
function Mover(unit: Unit) {
    xnew.sync.register({ Enemy });
    const state = xnew.sync.state({ spawned: 0 });
```

`test/core/sync/spawn-hierarchy.test.ts:31-37` の beforeEach を以下に置換（`resetRegistry()` とトップレベル register を除去）:

```ts
    beforeEach(() => {
        jest.useFakeTimers({ now: 0 });
        Unit.reset();
        Unit.config.mode = null;
    });
```

- [ ] **Step 2: spawn-hierarchy の 2 テストの server/client 生成を register ラッパ付きへ**

`test/core/sync/spawn-hierarchy.test.ts:45-49`（1 件目）を以下に置換:

```ts
        Unit.config.mode = 'server';
        const server = xnew(function Root() { xnew.sync.register({ Mover }); xnew(Mover); });
        Unit.config.mode = 'client';
        const client = xnew(function ClientRoot() { xnew.sync.register({ Mover }); });
        Unit.config.mode = null;
```

1 件目はこのあと `tree.find(n => n.name === 'Mover')`、`moverNode.parentId` を見る。Mover の親は Root（register 済み）→ Mover 同期、parentId は最も近い同期祖先が無いので null。`server._.children[0]` は Root の子 = Mover。テストは `server` を capture root に渡しているので、`xnew.sync.capture(server)` の `server` は **Root** を指す必要がある。変数名は `server` のままで可（Root ユニット）。

`test/core/sync/spawn-hierarchy.test.ts:74-78`（2 件目）も同様に以下へ置換:

```ts
        Unit.config.mode = 'server';
        const server = xnew(function Root() { xnew.sync.register({ Mover }); xnew(Mover); });
        Unit.config.mode = 'client';
        const client = xnew(function ClientRoot() { xnew.sync.register({ Mover }); });
        Unit.config.mode = null;
```

注意: 2 件目の 83 行目 `const replicaMover = client._.children[0];` は client（ClientRoot）の子 = replica Mover で従来どおり成立。1 件目の 66-68 行 `client._.children[0]` も同様。

- [ ] **Step 3: spawn-hierarchy テスト実行**

Run: `cd packages/xnew && npx jest test/core/sync/spawn-hierarchy.test.ts`
Expected: 全 2 件 PASS。

- [ ] **Step 4: loopback の import / beforeEach / Mover を修正**

`test/core/sync/loopback.test.ts:3` の `import { resetRegistry } from '../../../src/core/sync';` を削除する。

`Mover` 自体は子を持たないので register 不要だが、各テストのルートで register が要る。`test/core/sync/loopback.test.ts:18` の beforeEach を以下に置換:

```ts
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); Unit.config.mode = null; });
```

- [ ] **Step 5: loopback 1 件目（server/client ラッパ）を register 付きへ**

`test/core/sync/loopback.test.ts:22-26` を以下に置換:

```ts
        Unit.config.mode = 'server';
        const server = xnew(function Server() { xnew.sync.register({ Mover }); xnew(Mover); });
        Unit.config.mode = 'client';
        const client = xnew(function ClientRoot() { xnew.sync.register({ Mover }); });
        Unit.config.mode = null;
```

- [ ] **Step 6: loopback 2 件目（共有 Main）を register 付きへ**

`test/core/sync/loopback.test.ts:51-54` の `Main` を以下に置換（共通 body で register。server/client 両ランタイムが同じ登録を持つ）:

```ts
        function Main() {
            xnew.sync.register({ Mover });               // server/client 共通: Mover を直接の同期子として宣言
            xnew.server(() => { xnew(Mover); });        // server: ロジックツリー
            xnew.client(() => { xnew.nest(view); });    // client: 既存要素を描画先にする
        }
```

- [ ] **Step 7: loopback 3 件目（動的 spawn/despawn）を register 付きへ**

`test/core/sync/loopback.test.ts:88-101` を以下に置換。`Server` が `Mover` を register し、client ルートも register する:

```ts
        function Server(unit: Unit) {
            xnew.sync.register({ Mover });
            let spawned = false; let child: Unit | null = null;
            xnew.server(() => {
                unit.on('update', () => {
                    if (!spawned) { child = xnew(Mover) as unknown as Unit; spawned = true; }
                    else if (child) { child.finalize(); child = null; }
                });
            });
        }
        Unit.config.mode = 'server';
        const server = xnew(Server);
        Unit.config.mode = 'client';
        const client = xnew(function ClientRoot() { xnew.sync.register({ Mover }); });
        Unit.config.mode = null;
```

- [ ] **Step 8: loopback テスト実行**

Run: `cd packages/xnew && npx jest test/core/sync/loopback.test.ts`
Expected: 全 3 件 PASS。

- [ ] **Step 9: コミット**

```bash
cd packages/xnew
git add test/core/sync/spawn-hierarchy.test.ts test/core/sync/loopback.test.ts
git commit -m "test(sync): spawn-hierarchy / loopback テストをスコープ登録方式へ移植"
```

---

## Task 7: reconcile.test.ts を移植 + scope.test.ts を新規追加

**Files:**
- Modify: `test/core/sync/reconcile.test.ts`
- Create: `test/core/sync/scope.test.ts`

- [ ] **Step 1: reconcile の import を修正**

`test/core/sync/reconcile.test.ts:3` を以下に置換（`resetRegistry` を外し `StateTree` のみ残す）:

```ts
import { StateTree } from '../../../src/core/sync';
```

- [ ] **Step 2: `Box` を自己 register に変更**

apply のネストテストで Box の下に Box を作るため、Box は自分自身を直接の同期子として register する。`test/core/sync/reconcile.test.ts:5-11` を以下に置換:

```ts
function Box(unit: Unit) {
    xnew.sync.register({ Box });   // Box は自分を直接の同期子として許可（ネスト用）
    const state = xnew.sync.state({ value: 0 });
    xnew.client(() => {
        const el = xnew.nest('<div>');
        unit.on('render', () => { (el as HTMLElement).textContent = String(state.value); });
    });
}
```

- [ ] **Step 3: 各 describe の beforeEach と makeView を修正**

4 つの beforeEach（`test/core/sync/reconcile.test.ts:14, 47, 68, 84`）から `resetRegistry();` と トップレベル `xnew.sync.register({...});` を除去する。具体的には:

`:14` を:
```ts
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); Unit.config.mode = null; });
```
`:47` を:
```ts
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); Unit.config.mode = null; observed = null; });
```
`:68` と `:84` をそれぞれ:
```ts
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); Unit.config.mode = null; });
```

そして 3 つの `makeView()`（`:17, :70, :86`）— apply のルートが `Box` を register する必要があるので以下に置換:
```ts
    function makeView() { Unit.config.mode = 'client'; const v = xnew(function View() { xnew.sync.register({ Box }); }); Unit.config.mode = null; return v; }
```

Probe describe（`:49`）の `makeView` は `Probe` を register する別物にする:
```ts
    function makeView() { Unit.config.mode = 'client'; const v = xnew(function View() { xnew.sync.register({ Probe }); }); Unit.config.mode = null; return v; }
```

- [ ] **Step 4: Probe の read-once テストを register スコープ内へ**

`test/core/sync/reconcile.test.ts:57-64`（`does not leak ... read-once`）の `xnew(Probe);` は親が register していないと生成後 capture されないが、このテストは「注入が消費済みで local 初期値になる」ことだけ見る。Probe を register したルート配下で生成する必要がある。`:61-62` を以下に置換:

```ts
        Unit.config.mode = null;
        xnew(function Holder() { xnew.sync.register({ Probe }); xnew(Probe); });   // apply 経由でない生成
```

（`observed` は最後に生成された Probe の本体実行スナップショット。Holder 配下の Probe が local 初期値 `{value:0, who:'local'}` を読むことを確認する。）

- [ ] **Step 5: reconcile テスト実行**

Run: `cd packages/xnew && npx jest test/core/sync/reconcile.test.ts`
Expected: 全 6 件 PASS（create×2, injection×2, update×1, remove×1）。

- [ ] **Step 6: スコープ分離テストを新規作成**

`test/core/sync/scope.test.ts` を新規作成する。同名 `Child` を 2 つの親が別コンポーネントとして登録し、それぞれの配下で別物として capture/apply されることを検証する:

```ts
import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/core/xnew';
import { getSyncName } from '../../../src/core/sync';

describe('scoped registry isolation', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); Unit.config.mode = null; });
    afterEach(() => { Unit.rootUnit?.finalize(); Unit.config.mode = null; jest.useRealTimers(); });

    // 同名 'Child' を 2 つの親がそれぞれ別の実体で登録する
    function ChildA(unit: Unit) { xnew.sync.state({ kind: 'A' }); }
    function ChildB(unit: Unit) { xnew.sync.state({ kind: 'B' }); }
    function ParentA(unit: Unit) { xnew.sync.register({ Child: ChildA }); xnew(ChildA); }
    function ParentB(unit: Unit) { xnew.sync.register({ Child: ChildB }); xnew(ChildB); }

    it('resolves the same name to different components per scope (capture)', () => {
        const root = xnew(function Root() {
            xnew.sync.register({ ParentA, ParentB });
            xnew(ParentA);
            xnew(ParentB);
        });
        const tree = xnew.sync.capture(root);
        const childNodes = tree.filter(n => n.name === 'Child');
        expect(childNodes).toHaveLength(2);
        expect(childNodes.map(n => n.state.kind).sort()).toEqual(['A', 'B']);
    });

    it('apply re-creates each Child with the component its reconciled parent registered', () => {
        Unit.config.mode = 'server';
        const server = xnew(function Root() {
            xnew.sync.register({ ParentA, ParentB });
            xnew(ParentA);
            xnew(ParentB);
        });
        Unit.config.mode = 'client';
        const client = xnew(function ClientRoot() { xnew.sync.register({ ParentA, ParentB }); });
        Unit.config.mode = null;

        xnew.sync.apply(client, xnew.sync.capture(server));

        const replicaA = client._.children.find(c => getSyncName(c) === 'ParentA')!;
        const replicaB = client._.children.find(c => getSyncName(c) === 'ParentB')!;
        expect(replicaA._.children[0]._.Components.includes(ChildA)).toBe(true);
        expect(replicaB._.children[0]._.Components.includes(ChildB)).toBe(true);
        expect(replicaA._.children[0]._.state).toEqual({ kind: 'A' });
        expect(replicaB._.children[0]._.state).toEqual({ kind: 'B' });
    });

    it('a child not registered by its parent is omitted from capture', () => {
        function Loose(unit: Unit) { xnew.sync.state({ v: 1 }); }
        const root = xnew(function Root() { xnew(Loose); });   // Root は Loose を register しない
        const tree = xnew.sync.capture(root);
        expect(tree).toHaveLength(0);
    });
});
```

- [ ] **Step 7: scope テスト実行**

Run: `cd packages/xnew && npx jest test/core/sync/scope.test.ts`
Expected: 全 3 件 PASS。

- [ ] **Step 8: コミット**

```bash
cd packages/xnew
git add test/core/sync/reconcile.test.ts test/core/sync/scope.test.ts
git commit -m "test(sync): reconcile を移植しスコープ分離テストを追加"
```

---

## Task 8: 全テスト + ビルド検証、サンプル更新

**Files:**
- Modify: `examples/6_network/state-sync/index.js`

- [ ] **Step 1: 全テスト実行**

Run: `cd packages/xnew && npm test`
Expected: 全 suite PASS（sync 以外の既存テストも緑のまま）。

- [ ] **Step 2: ビルド実行**

Run: `cd packages/xnew && npm run build`
Expected: 成功。循環依存の警告が出ても許容（既存方針）。`dist/xnew.mjs` が更新される。

- [ ] **Step 3: サンプルの register を分散**

`examples/6_network/state-sync/index.js` を編集する。

(a) `Mover` 関数の本体先頭に register を追加する。`function Mover(unit) {` の直後の行（現状 `const state = xnew.sync.state({ spawned: 0 });`）の前に挿入:

```js
function Mover(unit) {
    xnew.sync.register({ Enemy });   // Mover が直接生成する同期子
    const state = xnew.sync.state({ spawned: 0 });
```

(b) `Main` 関数の本体先頭に register を追加する。`function Main() {` の直後に挿入:

```js
function Main() {
    xnew.sync.register({ Mover });   // server/client 共通: Main の直接の同期子は Mover
    xnew.server(() => {
        xnew(Mover);   // server: ロジックツリー（Mover → Enemy）を生成
    });
```

(c) ファイル末尾付近のグローバル一括登録行を削除する。現状:
```js
// 同期する種類をまとめて登録（名前 ⇄ コンポーネントの対応表）。
// Actor は基底だが単独利用もあり得るので登録しておく。Enemy は Actor を extend するが、
// 同期名は「最も派生した登録名」＝ Enemy が採られる（基底 Actor に化けない）ので 1 SyncNode のまま。
xnew.sync.register({ Actor, Enemy, Mover });
```
の 4 行（コメント 3 行 + register 1 行）をまるごと削除する。

（注: `Actor` は `Enemy` が extend する基底で、単独では子として生成されないため register 不要。`Enemy` が最派生名で同期される。）

- [ ] **Step 4: サンプルのトップレベルコメント（同期対象の説明）を更新**

`examples/6_network/state-sync/index.js` の冒頭ブロックコメント内、`xnew.sync.register` でまとめて登録する旨の記述があれば、「各コンポーネントが直接の同期子を register する」方針へ 1 行直す。該当が無ければスキップ。

- [ ] **Step 5: ビルド再実行（サンプルは dist を参照するため build 済みで動作確認可能）**

Run: `cd packages/xnew && npm run build`
Expected: 成功。

- [ ] **Step 6: コミット**

```bash
cd packages/xnew
git add examples/6_network/state-sync/index.js
git commit -m "example(sync): register を Main/Mover 内のスコープ登録へ分散"
```

---

## Task 9: 親リポジトリのサブモジュールポインタ更新

**Files:**
- Modify: `packages/xnew`（親リポジトリのサブモジュール参照）

- [ ] **Step 1: 親リポジトリでサブモジュール更新をコミット**

```bash
cd /Users/furihata/Documents/GitHub/mulpia
git add packages/xnew
git commit -m "chore: xnew サブモジュールを更新（sync スコープ付きレジストリ）"
```

- [ ] **Step 2: 最終確認**

Run: `cd /Users/furihata/Documents/GitHub/mulpia && git -C packages/xnew log --oneline -8 && git status`
Expected: サブモジュールに本変更の各コミットが並び、親リポジトリの作業ツリーがクリーン。

---

## Self-Review メモ

- **Spec カバレッジ**: スコープ限定（Task 2 getSyncName 親参照）/ 直接の子のみ（親レジストリ参照）/ グローバル登録エラー化（Task 3）/ グローバル関数廃止（Task 2 Step 4 grep）/ apply 親レジストリ解決（Task 2 Step 3）/ テスト全面移植（Task 4-7）/ スコープ分離テスト（Task 7）/ サンプル分散（Task 8）/ ファイルヘッダ更新（Task 2 Step 1）— すべて対応。
- **型整合**: `SyncRegistry { byName: Map<string,Function>; byComponent: Map<Function,string> }` を Task 2 で定義し Task 1 で `import type`。`registerOnUnit(unit, components)` / `getSyncName(unit)` のシグネチャは Task 2/3/テストで一貫。
- **注意点（実装者向け）**: `npx jest`/`npx tsc` がサンドボックス環境で失敗する場合は、CLAUDE.md の方針に従い Sail 経由（`./vendor/bin/sail npm test` 等）に読み替える。本プランの Run コマンドはサブモジュール単体での素の実行を想定。
