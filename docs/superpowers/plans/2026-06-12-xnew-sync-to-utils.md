# Move sync from core to utils (attach like audio/image) — Implementation Plan

> **For agentic workers:** This is an ATOMIC refactor (file move + facade relocation). There are no intermediate green states — apply the whole change, then verify with the full suite. Steps use checkbox (`- [ ]`).

**Goal:** Move `src/core/sync.ts` → `src/utils/sync.ts` and relocate the `xnew.sync` facade out of `core/xnew.ts`, attaching it at the assembly layer (`index.ts`) via `Object.assign(base, { basics, audio, image, sync })`, exactly like `audio`/`image`. Core becomes sync-free; behavior and public API (`xnew.sync.*`) are unchanged.

**Architecture:** Today `core/xnew.ts` is the only core file importing sync (the inline `sync` facade). Moving that facade into `utils/sync.ts` (colocated with the engine) and attaching it in `index.ts` makes `core/` fully sync-agnostic. `xnew.server`/`xnew.client` stay in core (they read `Unit._.mode` only, no sync-code dependency). Consumers that used `xnew.sync` via the core object must instead reach the facade where it now lives: `basics/Room.ts` imports `sync` from `utils/sync` directly (the established pattern — `Volume.ts` already imports `master` from `utils/audio`), and the sync tests import the assembled default `xnew` from `src/index` (so the `Object.assign`-attached `.sync` is present; audio.ts is jsdom-safe — it guards AudioContext, so importing index in tests is safe).

**Tech Stack:** TypeScript 5, Rollup 3, Jest 29 + ts-jest, jsdom. Host commands: `npx jest`, `npm run build`. Branch: `v0.8/sync-to-utils`.

---

## Verified facts

- Only `core/xnew.ts` imports sync in `core/` (lines 19-20 + the inline `sync` facade); `core/unit.ts` does NOT depend on sync.
- `xnew.server`/`client` ([core/xnew.ts:150-168](../../../src/core/xnew.ts#L150-L168)) read `Unit.currentUnit._.mode` only — keep in core.
- `basics/Room.ts` is the ONLY basics file using `xnew.sync` (`xnew.sync.boot`, [Room.ts:31](../../../src/basics/Room.ts#L31)). `Volume.ts` imports `master` from `../utils/audio` directly — the pattern Room should follow.
- 12 sync test files in `test/core/sync/` import `{ xnew } from '../../../src/core/xnew'` and use `xnew.sync.*`; some also import engine names from `'../../../src/core/sync'`. All also import `{ Unit } from '../../../src/core/unit'`.
- `utils/audio.ts` guards AudioContext (`typeof AudioContextCtor === 'function' ? new ... : null`) → importing `src/index` under jsdom is safe. `utils/image.ts` has no load-time side effects.
- `Object.assign(base, …)` mutates `base` (the core `xnew`). So after the move, `xnew.sync` exists ONLY once `index.ts` has run — hence tests import the index default.
- `sync.ts` only imports `import { Unit } from './unit';` at the top (becomes `'../core/unit'`).

---

### Task 1: Move the engine file and relocate the facade (atomic)

**Files:** move `src/core/sync.ts`→`src/utils/sync.ts`; modify `src/core/xnew.ts`, `src/index.ts`, `src/basics/Room.ts`.

- [ ] **Step 1: Move the file with git**

```bash
git mv src/core/sync.ts src/utils/sync.ts
```

- [ ] **Step 2: Fix `utils/sync.ts` internal import**

In `src/utils/sync.ts`, change:
```ts
import { Unit } from './unit';
```
to:
```ts
import { Unit } from '../core/unit';
```
Also, in the `utils/sync.ts` file-header comment, replace any self-reference path `core/sync.ts` with `utils/sync.ts` if present (the header's role description; do not change behavior).

- [ ] **Step 3: Append the `sync` facade to `utils/sync.ts`**

The facade currently lives inside `core/xnew.ts` as the `sync: { ... }` property of the big `Object.assign`. Read it from `core/xnew.ts` (the JSDoc `State synchronization API …` block immediately followed by `sync: { state(...) … boot(...) … },`). Append an equivalent **exported const** at the END of `src/utils/sync.ts` (all referenced names — `syncOf`, `registerOnUnit`, `captureStateTree`, `applyStateTree`, `getRootSocket`, `getRootClient`, `getRootClients`, `bootSyncRoot`, `Unit`, `BootOptions`, `ClientInfo` — are already in this module, so no new imports are needed):

```ts
//----------------------------------------------------------------------------------------------------
// xnew.sync facade — index.ts が xnew へ attach する（audio / image と同じ後付けパターン）。
// 各メソッドは暗黙の Unit.currentUnit に作用するため、Component 関数 / ハンドラの中から呼ぶ。
//
// - state / register : 同期 state の宣言 / 直接の同期子 {Name: Component} の登録
// - capture / apply  : 手動同期用（boot の自動 mirror を使わない場合）
// - emit / client / clients : イベント送信 / 自分の {id,name} / 同 room の全接続者
// - boot             : socket をバインドしたルート生成（mode で server/client を指定）
//----------------------------------------------------------------------------------------------------

export const sync = {
    state(initial: Record<string, any> = {}): Record<string, any> {
        const data = syncOf(Unit.currentUnit);
        if (data.state === null) {
            data.state = {};
        }
        // 既存キーは尊重し、無いキーだけ initial で埋める（apply のプリシードや先行宣言を優先）。
        for (const key of Object.keys(initial)) {
            if ((key in data.state) === false) {
                data.state[key] = initial[key];
            }
        }
        return data.state;
    },
    register(components: Record<string, Function>): void {
        if (Unit.currentUnit == null || Unit.currentUnit._.status !== 'invoked') {
            throw new Error('xnew.sync.register can not be called outside a component.');
        }
        registerOnUnit(Unit.currentUnit, components);
    },
    capture(root: Unit): ReturnType<typeof captureStateTree> {
        return captureStateTree(root);
    },
    apply(root: Unit, tree: Parameters<typeof applyStateTree>[1]): void {
        applyStateTree(root, tree);
    },
    /** この client 自身の identity（{ id, name }）。server では id/name とも undefined。 */
    get client(): ClientInfo {
        const unit = Unit.currentUnit;
        if (unit === null) {
            throw new Error('xnew.sync.client can not be read outside a component.');
        }
        return getRootClient(unit);
    },
    /** 同じ room の全接続者（presence 名簿。name は入室時に boot / Room の name で設定）。 */
    get clients(): ReadonlyArray<ClientInfo> {
        const unit = Unit.currentUnit;
        if (unit === null) {
            throw new Error('xnew.sync.clients can not be read outside a component.');
        }
        return getRootClients(unit);
    },
    emit(event: string, payload: Record<string, any> = {}): void {
        const unit = Unit.currentUnit;
        if (unit === null) {
            throw new Error('xnew.sync.emit can not be called outside a component or its handlers.');
        }
        // 送信ユニットの syncId を載せる（受信側の '-event' ルーティング用）。
        getRootSocket(unit).emit(event, { syncId: syncOf(unit).id, data: payload });
    },
    /**
     * Creates a root Unit for `opts.mode`（'server'|'client'）。transport は opts.socket の有無で決まる
     * （省略 = in-memory loopback / 指定 = socket.io。server は opts.room で接続を絞れる）。残りの引数は
     * xnew(...) へ転送。下り mirror と dispatcher の配線は bootSyncRoot が行う。
     */
    boot(opts: BootOptions, ...args: any[]): Unit {
        if (Unit.engineRoot === undefined) { Unit.reset(); }
        return bootSyncRoot(opts, Unit.currentUnit, ...args);
    },
};
```

- [ ] **Step 4: Remove the facade + sync imports from `core/xnew.ts`**

In `src/core/xnew.ts`:
1. Delete the two import lines:
```ts
import { syncOf, registerOnUnit, captureStateTree, applyStateTree, getRootSocket, getRootClient, getRootClients, bootSyncRoot } from './sync';
import type { BootOptions, ClientInfo } from './sync';
```
2. Delete the file-header bullet line:
```ts
// - xnew.sync.*                          : server→client 状態同期（core/sync.ts）
```
3. Delete the entire `sync` facade property: the JSDoc block starting `/**\n         * State synchronization API（server→client 状態同期。詳細は core/sync.ts）。` through the `sync: { … },` object's closing `},`. After deletion, the preceding `client(…) { … },` method is immediately followed by the closing `}` of the `Object.assign` second argument and `);`. A trailing comma before `}` is valid — leave the `client` method's trailing comma intact.

Verify `core/xnew.ts` no longer contains the substring `sync` except inside unrelated identifiers (there should be none referring to the sync facade).

- [ ] **Step 5: Update `src/basics/Room.ts` to use the facade from utils**

Replace [src/basics/Room.ts:25-27](../../../src/basics/Room.ts#L25-L27):
```ts
import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';
import { BootOptions } from '../core/sync';
```
with:
```ts
import { Unit } from '../core/unit';
import { sync, BootOptions } from '../utils/sync';
```

Replace [src/basics/Room.ts:31](../../../src/basics/Room.ts#L31):
```ts
    const client = xnew.sync.boot({ mode, socket, room, name }, component) as Unit & { select?: () => void };
```
with:
```ts
    const client = sync.boot({ mode, socket, room, name }, component) as Unit & { select?: () => void };
```

(Room's body uses no other `xnew.*`, so dropping the `xnew` import is correct. Confirm with `grep -n "xnew" src/basics/Room.ts` — only comment/example mentions should remain; if any code uses `xnew`, keep the import.)

- [ ] **Step 6: Wire the facade at `src/index.ts`**

In `src/index.ts`:
1. Change the type re-export path:
```ts
export type { ClientSocket, ServerSocket, RootSocket, BootOptions } from './core/sync';
```
to:
```ts
export type { ClientSocket, ServerSocket, RootSocket, BootOptions, ClientInfo } from './utils/sync';
```
2. Add an import for the facade (near the other `utils` imports):
```ts
import { sync } from './utils/sync';
```
3. Change the final assembly:
```ts
const xnew = Object.assign(base, { basics, audio, image });
```
to:
```ts
const xnew = Object.assign(base, { basics, audio, image, sync });
```

- [ ] **Step 7: Type-check / build**

Run: `npm run build`
Expected: success, no TS errors. (`xnew.sync.*` is now typed via the attached `sync` const.)

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(xnew): move sync core→utils, attach xnew.sync at index like audio/image

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Relocate sync tests to test/utils/sync and fix imports

**Files:** move `test/core/sync/` → `test/utils/sync/`; fix imports in all 12 `*.test.ts`.

- [ ] **Step 1: Move the directory**

```bash
git mv test/core/sync test/utils/sync
```

- [ ] **Step 2: In every `test/utils/sync/*.test.ts`, fix the xnew import**

Replace the line:
```ts
import { xnew } from '../../../src/core/xnew';
```
with:
```ts
import xnew from '../../../src/index';
```
(The relative depth is unchanged — `test/utils/sync/x.test.ts` is still 3 levels from `src/`. This imports the assembled default `xnew`, which has `.sync` attached.)

- [ ] **Step 3: In every `test/utils/sync/*.test.ts`, fix engine imports**

Replace every occurrence of the path `'../../../src/core/sync'` with `'../../../src/utils/sync'`. (Affects `boot-api`, `capture`, `channel`, `composed-state`, `loopback`, `presence`, `reconcile`, `scope`, `spawn-hierarchy`, `state`.) Leave `'../../../src/core/unit'` imports unchanged.

- [ ] **Step 4: Run the full suite**

Run: `npx jest`
Expected: ALL suites pass (33 suites, ~252 passing + a few todo). If a sync test fails to resolve `xnew.sync.*`, confirm Step 2 changed it to the `src/index` default import.

- [ ] **Step 5: Verify no stale `core/sync` references remain**

Run: `grep -rn "core/sync" src test --include="*.ts" | grep -v "/dist/"`
Expected: no matches.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test(xnew): move sync tests to test/utils/sync and import assembled xnew

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Verification + rebuild examples bundle

- [ ] **Step 1: Full suite + build**

Run: `npx jest` (expect all pass) and `npm run build` (expect success).

- [ ] **Step 2: Sweep for stale references**

Run: `grep -rn "core/sync\|from './sync'" src test --include="*.ts" | grep -v "/dist/"`
Expected: no matches.

- [ ] **Step 3: Stage the regenerated examples bundle (tracked) only**

```bash
git add examples/dist/xnew.js examples/dist/xnew.mjs examples/dist/xnew.d.ts
git status -s
```
(Do NOT stage the gitignored package `dist/`.)

- [ ] **Step 4: Commit**

```bash
git commit -m "build(xnew): regenerate examples bundle after sync core→utils move

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- `core/sync.ts` → `utils/sync.ts`: Task 1 Step 1. ✓
- Facade attached at index like audio/image: Task 1 Steps 3-4-6. ✓
- `xnew.server`/`client` stay in core: untouched. ✓
- Tests → `test/utils/sync`: Task 2. ✓
- Default bundle (sync attached in index's `Object.assign`): Task 1 Step 6. ✓

**Consumer breakage handled:** `Room` (Task 1 Step 5) and tests (Task 2 Steps 2-3) — the only `xnew.sync` consumers reachable via the core object — are repointed to the relocated facade / assembled xnew.

**Type consistency:** `sync` const exported from `utils/sync.ts` (Task 1 Step 3); imported by `index.ts` (Step 6) and `basics/Room.ts` (Step 5). `ClientInfo`/`BootOptions` types live in `utils/sync.ts` and are re-exported from `index.ts`. `core/xnew.ts` no longer references any sync symbol.

**Risk:** importing `src/index` in tests pulls `utils/audio` — verified jsdom-safe (guarded AudioContext). No circular import: `utils/sync → core/unit` (one-way); `index → core/xnew, basics, utils`.
