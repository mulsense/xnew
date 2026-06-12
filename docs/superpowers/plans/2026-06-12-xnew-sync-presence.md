# xnew.sync presence (client / clients) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `xnew.sync.clientId` with `xnew.sync.client` (`{ id, name }`) and add `xnew.sync.clients` (the room's presence roster), with the client name set at room entry via `xnew(xnew.basics.Room, { ..., name })` / `xnew.sync.boot({ mode: 'client', ..., name })`.

**Architecture:** Each boot root holds a `RootInfo { socket, name, roster }`. Presence is wired automatically in `bootSyncRoot` via two reserved events: a client announces its name with `sync:hello` as soon as it is connected; the server keeps an authoritative `roster: Map<id, {id,name}>` (add on connect, set name on hello, remove on disconnect) and broadcasts the full roster as `sync:roster` on every change; clients mirror it. Name travels via this presence handshake (not the socket.io connection handshake), so it is single-source and identical across loopback and socket.io. The roster is per-boot-root, so multi-room servers stay isolated. Reserved `sync:`-prefixed events are never delivered to app units.

**Tech Stack:** TypeScript 5, Rollup 3, Jest 29 + ts-jest, jsdom. Tests/build run **on the host**: `npx jest`, `npm run build`. Branch: `v0.8/sync-presence` (in the `packages/xnew` submodule).

---

## Background facts (verified against current code)

- `xnew.sync` object: [src/core/xnew.ts:178-230](../../../src/core/xnew.ts#L178-L230). `clientId` getter at 204-211; `emit` uses `getRootSocket`.
- `syncRoots` WeakMap + `registerSyncRoot` (exported) + `getRootSocket` (exported): [src/core/sync.ts:180-216](../../../src/core/sync.ts#L180-L216). `registerSyncRoot` is used ONLY inside `bootSyncRoot` (same file) — safe to make internal.
- `BootOptions`: [src/core/sync.ts:219-223](../../../src/core/sync.ts#L219-L223).
- `bootSyncRoot`: [src/core/sync.ts:255-277](../../../src/core/sync.ts#L255-L277). Server connect/disconnect already deliver `{ id: clientId }`.
- `dispatchSync`: [src/core/sync.ts:280-303](../../../src/core/sync.ts#L280-L303). Called from server/client `onAny` for every received event.
- loopback `connect()` returns a ClientSocket whose `.id` is set immediately (so `(client as any).id` is truthy under loopback). socket.io client `.id` is empty until connected.
- `xnew.sync.clientId` readers to migrate: `examples/6_network/multi-client/game.js:45` (and a comment at :12), `test/core/sync/boot-api.test.ts:13-14`, `test/core/sync/channel.test.ts:78,81,100`.
- Event handlers run with `Unit.currentUnit` set (the `emit` error text "outside a component or its handlers" confirms), so `xnew.sync.clients` is readable inside `on('update')` handlers.

---

## File structure

- **Modify** `src/core/sync.ts` — add `ClientInfo` (exported) + internal `RootInfo`; `rootInfoOf` (internal) + `getRootSocket`/`getRootClient`/`getRootClients` (exported); make `registerSyncRoot` internal; `BootOptions.name`; `dispatchSync` reserved-event guard; presence wiring in `bootSyncRoot`; header update.
- **Modify** `src/core/xnew.ts` — replace `clientId` getter with `client` + `clients`; imports; doc.
- **Modify** `src/basics/Room.ts` — accept `name`.
- **Create** `test/core/sync/presence.test.ts`.
- **Modify** migration readers: `game.js`, `boot-api.test.ts`, `channel.test.ts`.

---

### Task 1: Core presence API (sync.ts + xnew.ts)

**Files:**
- Create: `test/core/sync/presence.test.ts`
- Modify: `src/core/sync.ts` (header; 180-216; 219-223; bootSyncRoot 255-277; dispatchSync 280-283)
- Modify: `src/core/xnew.ts` (imports 19-20; doc 175; clientId getter 204-211)

- [ ] **Step 1: Write the failing test** — create `test/core/sync/presence.test.ts`:

```ts
import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/core/xnew';
import { loopbackHub } from '../../../src/core/sync';

describe('xnew.sync.client / clients (presence)', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); });
    afterEach(() => { Unit.engineRoot?.finalize(); jest.useRealTimers(); });

    it('exposes own id and name via xnew.sync.client', () => {
        xnew.sync.boot({ mode: 'server' }, function Server() {});
        let me: any;
        xnew.sync.boot({ mode: 'client', name: 'Alice' }, function C(unit: Unit) {
            xnew.client(() => { me = xnew.sync.client; });
        });
        expect(me).toEqual({ id: 'c1', name: 'Alice' });
    });

    it('shares the roster across all clients and the server', () => {
        let serverRoster: any[] = [];
        xnew.sync.boot({ mode: 'server' }, function Server(unit: Unit) {
            xnew.server(() => { unit.on('update', () => { serverRoster = [...xnew.sync.clients]; }); });
        });
        let aRoster: any[] = [];
        let bRoster: any[] = [];
        xnew.sync.boot({ mode: 'client', name: 'Alice' }, function A(unit: Unit) {
            xnew.client(() => { unit.on('update', () => { aRoster = [...xnew.sync.clients]; }); });
        });
        xnew.sync.boot({ mode: 'client', name: 'Bob' }, function B(unit: Unit) {
            xnew.client(() => { unit.on('update', () => { bRoster = [...xnew.sync.clients]; }); });
        });
        Unit.start(Unit.engineRoot);
        Unit.update(Unit.engineRoot);
        const names = (r: any[]) => r.map((c) => c.name).sort();
        expect(names(aRoster)).toEqual(['Alice', 'Bob']);
        expect(names(bRoster)).toEqual(['Alice', 'Bob']);
        expect(names(serverRoster)).toEqual(['Alice', 'Bob']);
    });

    it('removes a client from the roster on disconnect', () => {
        let roster: any[] = [];
        xnew.sync.boot({ mode: 'server' }, function Server(unit: Unit) {
            xnew.server(() => { unit.on('update', () => { roster = [...xnew.sync.clients]; }); });
        });
        const raw = loopbackHub().connect('cX');     // raw client joins on the shared hub
        raw.emit('sync:hello', { name: 'Zoe' });
        Unit.start(Unit.engineRoot); Unit.update(Unit.engineRoot);
        expect(roster.map((c) => c.name)).toEqual(['Zoe']);
        raw.disconnect();
        Unit.start(Unit.engineRoot); Unit.update(Unit.engineRoot);
        expect(roster).toEqual([]);
    });

    it('does not deliver reserved sync: events to app units', () => {
        const seen: string[] = [];
        xnew.sync.boot({ mode: 'server' }, function Server(unit: Unit) {
            xnew.server(() => { unit.on('sync:hello', () => seen.push('leaked')); });
        });
        xnew.sync.boot({ mode: 'client', name: 'Alice' }, function C() {});
        expect(seen).toEqual([]);
    });
});
```

- [ ] **Step 2: Run the test — expect FAIL**

Run: `npx jest test/core/sync/presence.test.ts`
Expected: FAIL — `xnew.sync.client` / `xnew.sync.clients` / `name` option / roster do not exist yet.

- [ ] **Step 3: `src/core/sync.ts` — replace the syncRoots / registerSyncRoot / getRootSocket region**

Replace [src/core/sync.ts:179-216](../../../src/core/sync.ts#L179-L216) (from `/** boot ルート → 関連情報（socket）。...` through the end of `getRootSocket`) with:

```ts
/** 1 接続者の公開情報（presence のエントリ／自分自身）。 */
export interface ClientInfo {
    id: string | undefined;
    name: string | undefined;
}

/** boot ルートに紐づく内部情報。socket・自分の name・presence 名簿を持つ。 */
interface RootInfo {
    socket: RootSocket | null;
    name: string | undefined;            // この client 自身の name（server では undefined）
    roster: Map<string, ClientInfo>;     // presence（server が権威、client は mirror）
}

/** boot ルート → 関連情報。findSyncRoot / getRootSocket / getRootClient(s) がこれを引く。 */
const syncRoots: WeakMap<Unit, RootInfo> = new WeakMap();

/** boot ルートを登録する（bootSyncRoot から呼ぶ。file 内部専用）。 */
function registerSyncRoot(root: Unit, info: RootInfo): void {
    syncRoots.set(root, info);
}

// 接続まわりの「基本イベント」。dispatchSync（root 配下へ）とは別に、boot を呼んだ親ユニットの
// unit.on(event) へ配る対象。
const BASIC_EVENTS = ['connect', 'disconnect', 'room:notfound'] as const;

/** 基本イベントを boot ルートの「外」にいる親ユニット 1 つだけに配る。 */
function dispatchBasicEvent(parent: Unit | null, event: string, payload?: any): void {
    if (parent === null || parent._.status === 'finalized') {
        return;
    }
    const props = (payload !== null && typeof payload === 'object') ? payload : {};
    parent._.listeners.get(event)?.forEach((item) => item.execute(props));
}

/** unit から遡って最も近い boot ルートを返す（無ければ null）。 */
export function findSyncRoot(unit: Unit): Unit | null {
    for (let u: Unit | null = unit; u !== null; u = u._.parent) {
        if (syncRoots.has(u)) { return u; }
    }
    return null;
}

/** caller の sync ルートの内部情報を返す（socket 未バインドなら throw）。 */
function rootInfoOf(unit: Unit): RootInfo {
    const root = findSyncRoot(unit);
    const info = root !== null ? syncRoots.get(root) : undefined;
    if (info === undefined || info.socket === null) {
        throw new Error('no socket bound to this root; create it with xnew.sync.boot({ mode }, ...).');
    }
    return info;
}

/** Resolves the socket bound to the caller's sync-tree root（無ければ throw）. */
export function getRootSocket(unit: Unit): RootSocket {
    return rootInfoOf(unit).socket as RootSocket;
}

/** この client 自身の identity（{ id, name }）。server では id/name とも undefined。 */
export function getRootClient(unit: Unit): ClientInfo {
    const info = rootInfoOf(unit);
    return { id: (info.socket as any).id, name: info.name };
}

/** 同じ room の全接続者（presence 名簿のスナップショット）。 */
export function getRootClients(unit: Unit): ClientInfo[] {
    return [...rootInfoOf(unit).roster.values()];
}
```

Note: this moves `BASIC_EVENTS`, `dispatchBasicEvent`, and `findSyncRoot` to keep them adjacent — make sure you do NOT leave duplicate copies of them further down the file (they previously sat at lines 187-206; the replacement above re-includes them, so the original 187-206 block must be the part you replaced — it is, since the replaced range 179-216 covers them).

- [ ] **Step 4: `src/core/sync.ts` — add `name` to `BootOptions`**

Replace [src/core/sync.ts:219-223](../../../src/core/sync.ts#L219-L223):

```ts
export interface BootOptions {
    mode: 'server' | 'client';
    socket?: any;        // socket.io の io（server）/ socket（client）。省略時は loopback。
    room?: string;       // server + socket.io のときだけ意味を持つ（接続を query.room で絞る）。
}
```

with:

```ts
export interface BootOptions {
    mode: 'server' | 'client';
    socket?: any;        // socket.io の io（server）/ socket（client）。省略時は loopback。
    room?: string;       // server + socket.io のときだけ意味を持つ（接続を query.room で絞る）。
    name?: string;       // この client の表示名（presence に載り、xnew.sync.client.name で読める）。
}
```

- [ ] **Step 5: `src/core/sync.ts` — replace `bootSyncRoot` body with presence wiring**

Replace [src/core/sync.ts:255-277](../../../src/core/sync.ts#L255-L277) (the whole `export function bootSyncRoot(...) { ... }`) with:

```ts
export function bootSyncRoot(opts: BootOptions, parent: Unit | null, ...args: any[]): Unit {
    const mode = opts.mode;
    const socket = resolveRootSocket(opts);
    // socket / name / roster は unit に保持せず、setup フックで syncRoots へ登録する。
    const info: RootInfo = { socket, name: opts.name, roster: new Map() };
    const root = new Unit({ mode, setup: (unit) => registerSyncRoot(unit, info) }, parent, ...args);

    if (mode === 'server') {
        const server = socket as ServerSocket;
        // presence: connect/disconnect/sync:hello で名簿を更新し、変化のたびに全員へ配る。
        const broadcastRoster = () => server.emit('sync:roster', { clients: [...info.roster.values()] });
        root.on('update', () => server.emit('sync', captureStateTree(root)));
        server.onAny((event, clientId, message) => dispatchSync(root, event, clientId, message));
        server.on('connect', (clientId) => {
            info.roster.set(clientId, { id: clientId, name: undefined });
            broadcastRoster();
            dispatchSync(root, 'connect', clientId, undefined);
            dispatchBasicEvent(parent, 'connect', { id: clientId });
        });
        server.on('disconnect', (clientId) => {
            info.roster.delete(clientId);
            broadcastRoster();
            dispatchSync(root, 'disconnect', clientId, undefined);
            dispatchBasicEvent(parent, 'disconnect', { id: clientId });
        });
        server.on('sync:hello', (clientId, payload) => {
            const name = (payload !== null && typeof payload === 'object') ? payload.name : undefined;
            info.roster.set(clientId, { id: clientId, name });
            broadcastRoster();
        });
    } else {
        const client = socket as ClientSocket;
        const handler = (tree: StateTree) => applyStateTree(root, tree);
        client.on('sync', handler);
        root.on('finalize', () => client.off('sync', handler));
        client.onAny((event, message) => dispatchSync(root, event, undefined, message));
        // socket.io の onAny は connect/disconnect を含まないため、基本イベントは明示的に拾う。
        BASIC_EVENTS.forEach((event) => client.on(event, (payload: any) => dispatchBasicEvent(parent, event, payload)));
        // presence: 受け取った名簿を mirror し、自分の name を hello で申告する。
        client.on('sync:roster', (payload: any) => {
            info.roster.clear();
            const list = (payload !== null && typeof payload === 'object' && Array.isArray(payload.clients)) ? payload.clients : [];
            for (const c of list) { info.roster.set(c.id, { id: c.id, name: c.name }); }
        });
        const sendHello = () => client.emit('sync:hello', { name: info.name });
        if ((client as any).id) { sendHello(); }   // 接続済み（loopback / 既接続 socket.io）なら即申告
        client.on('connect', sendHello);           // socket.io の初回 / 再接続で申告
    }
    return root;
}
```

- [ ] **Step 6: `src/core/sync.ts` — guard reserved events in `dispatchSync`**

Replace [src/core/sync.ts:280-283](../../../src/core/sync.ts#L280-L283):

```ts
function dispatchSync(root: Unit, event: string, id: string | undefined, message: any): void {
    if (root._.status === 'finalized') {
        return;
    }
```

with:

```ts
function dispatchSync(root: Unit, event: string, id: string | undefined, message: any): void {
    if (root._.status === 'finalized') {
        return;
    }
    if (event.startsWith('sync:')) {
        return;   // 'sync:hello' / 'sync:roster' などの予約イベントは app ユニットへ配らない
    }
```

- [ ] **Step 7: `src/core/sync.ts` — update the file-header inventory**

Replace [src/core/sync.ts:12](../../../src/core/sync.ts#L12):

```ts
// - registerSyncRoot / findSyncRoot / getRootSocket : boot ルートの登録と解決
```

with:

```ts
// - findSyncRoot / getRootSocket / getRootClient / getRootClients : boot ルートの解決と client/presence 取得
// - ClientInfo : 1 接続者の {id, name}（xnew.sync.client / clients が返す）
```

- [ ] **Step 8: `src/core/xnew.ts` — imports**

Replace [src/core/xnew.ts:19-20](../../../src/core/xnew.ts#L19-L20):

```ts
import { syncOf, registerOnUnit, captureStateTree, applyStateTree, getRootSocket, bootSyncRoot } from './sync';
import type { BootOptions } from './sync';
```

with:

```ts
import { syncOf, registerOnUnit, captureStateTree, applyStateTree, getRootSocket, getRootClient, getRootClients, bootSyncRoot } from './sync';
import type { BootOptions, ClientInfo } from './sync';
```

- [ ] **Step 9: `src/core/xnew.ts` — replace the `clientId` getter with `client` + `clients`**

Replace [src/core/xnew.ts:204-211](../../../src/core/xnew.ts#L204-L211):

```ts
            /** この client の id（= socket.id）。server では undefined。 */
            get clientId(): string | undefined {
                const unit = Unit.currentUnit;
                if (unit === null) {
                    throw new Error('xnew.sync.clientId can not be read outside a component.');
                }
                return (getRootSocket(unit) as any).id;
            },
```

with:

```ts
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
```

- [ ] **Step 10: `src/core/xnew.ts` — update the sync doc comment**

Replace [src/core/xnew.ts:175](../../../src/core/xnew.ts#L175):

```ts
         * - emit / clientId  : イベント送信（'+event'=全体 / '-event'=同一 syncId のみ。受信は unit.on）/ 自 client id
```

with:

```ts
         * - emit / client / clients : イベント送信（'+event'=全体 / '-event'=同一 syncId のみ。受信は unit.on）/ 自分の {id,name} / 同 room の全接続者
```

- [ ] **Step 11: Run the presence test — expect PASS**

Run: `npx jest test/core/sync/presence.test.ts`
Expected: PASS (4 tests). Do NOT run the full suite yet (boot-api/channel still read `clientId`, migrated in Task 3).

- [ ] **Step 12: Commit**

```bash
git add src/core/sync.ts src/core/xnew.ts test/core/sync/presence.test.ts
git commit -m "feat(xnew/sync): add client/clients presence (replaces clientId)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Room accepts `name`

**Files:** `src/basics/Room.ts`

- [ ] **Step 1: Add `name` to the Room signature and forward it to boot**

Replace [src/basics/Room.ts:29-31](../../../src/basics/Room.ts#L29-L31):

```ts
export function Room(unit: Unit, { mode, socket, room, component }: Pick<BootOptions, 'mode' | 'socket' | 'room'> & { component: Function }) {
    // boot へ mode/socket/room を渡す（下りと基本イベントは boot が自動配線）。socket 省略時は loopback。
    const client = xnew.sync.boot({ mode, socket, room }, component) as Unit & { select?: () => void };
```

with:

```ts
export function Room(unit: Unit, { mode, socket, room, name, component }: Pick<BootOptions, 'mode' | 'socket' | 'room' | 'name'> & { component: Function }) {
    // boot へ mode/socket/room/name を渡す（下りと基本イベントは boot が自動配線）。socket 省略時は loopback。
    const client = xnew.sync.boot({ mode, socket, room, name }, component) as Unit & { select?: () => void };
```

- [ ] **Step 2: Update the Room header inventory + client example to mention `name`**

Replace [src/basics/Room.ts:11](../../../src/basics/Room.ts#L11):

```ts
// - Room(unit, { mode, socket?, room?, component }) : 上記の配線を行い `{ client }`（boot ルート unit）を返す
```

with:

```ts
// - Room(unit, { mode, socket?, room?, name?, component }) : 上記の配線を行い `{ client }`（boot ルート unit）を返す
```

Replace [src/basics/Room.ts:16-17](../../../src/basics/Room.ts#L16-L17):

```ts
//   const socket = io({ query: { room: roomId }, forceNew: true });
//   xnew.extend(xnew.basics.Room, { mode: 'client', socket, component: World });
```

with:

```ts
//   const socket = io({ query: { room: roomId }, forceNew: true });
//   xnew.extend(xnew.basics.Room, { mode: 'client', socket, name: 'Alice', component: World });
```

- [ ] **Step 3: Verify the Room test still passes (no behavioral change for existing tests)**

Run: `npx jest test/basics/Room.test.ts`
Expected: PASS (Room tests don't pass `name`; it's optional → `undefined`, unchanged behavior).

- [ ] **Step 4: Commit**

```bash
git add src/basics/Room.ts
git commit -m "feat(xnew/Room): accept optional name and forward to boot

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Migrate `clientId` → `client.id` readers

**Files:** `test/core/sync/boot-api.test.ts`, `test/core/sync/channel.test.ts`, `examples/6_network/multi-client/game.js`

- [ ] **Step 1: `boot-api.test.ts`**

Replace every occurrence of the exact string `xnew.sync.clientId` with `xnew.sync.client.id` in `test/core/sync/boot-api.test.ts`. (Two occurrences, lines 13-14.)

- [ ] **Step 2: `channel.test.ts`**

Replace every occurrence of the exact string `xnew.sync.clientId` with `xnew.sync.client.id` in `test/core/sync/channel.test.ts`. (Three occurrences, lines 78, 81, 100.)

- [ ] **Step 3: `game.js` — code + comment**

Replace [examples/6_network/multi-client/game.js:45](../../../examples/6_network/multi-client/game.js#L45):

```js
        if (state.clientId === xnew.sync.clientId) {
```

with:

```js
        if (state.clientId === xnew.sync.client.id) {
```

Replace [examples/6_network/multi-client/game.js:12](../../../examples/6_network/multi-client/game.js#L12):

```js
//       client: 描画＋（自機なら）入力(WASD/矢印)→emit('-move')。自機判定は state.clientId === xnew.sync.clientId。
```

with:

```js
//       client: 描画＋（自機なら）入力(WASD/矢印)→emit('-move')。自機判定は state.clientId === xnew.sync.client.id。
```

- [ ] **Step 4: Verify no `clientId` API references remain**

Run: `grep -rn "sync\.clientId" src test examples --include="*.ts" --include="*.js" | grep -v "/dist/"`
Expected: no matches.

- [ ] **Step 5: Run the affected suites**

Run: `npx jest test/core/sync/boot-api.test.ts test/core/sync/channel.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add test/core/sync/boot-api.test.ts test/core/sync/channel.test.ts examples/6_network/multi-client/game.js
git commit -m "refactor(xnew): migrate clientId readers to client.id

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Full verification + rebuild examples bundle

**Files:** `examples/dist/*` (regenerated build output — tracked).

- [ ] **Step 1: Full test suite**

Run: `npx jest`
Expected: all suites pass (the 32 existing suites + the new `presence` suite; ~252 passing + a few todo).

- [ ] **Step 2: Build (type-checks src/ and regenerates bundles)**

Run: `npm run build`
Expected: success, no TypeScript errors.

- [ ] **Step 3: Stage the regenerated examples bundle only**

The package `dist/` is gitignored; `examples/dist/xnew.{js,mjs,d.ts}` is tracked and the project commits it on API changes.

Run: `git status -s`
Then stage ONLY the example bundle (not the gitignored package `dist/`):

```bash
git add examples/dist/xnew.js examples/dist/xnew.mjs examples/dist/xnew.d.ts
```

- [ ] **Step 4: Final old-API sweep**

Run: `grep -rn "sync\.clientId\|getRootSocket(unit) as any).id" src test examples --include="*.ts" --include="*.js" | grep -v "/dist/"`
Expected: no matches.

- [ ] **Step 5: Commit the bundle (or note clean tree if no bundle change)**

```bash
git commit -m "build(xnew): regenerate examples bundle for client/clients presence

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

If `git status` shows the plan `.md` untracked, leave it (committed separately or left for the user).

---

## Self-Review

**Spec coverage:**
- `xnew.sync.client` = `{ id, name }`, replaces `clientId` → Task 1 (getter) + Task 3 (migration). ✓
- `xnew.sync.clients` = roster array → Task 1 (getter + presence wiring) + presence.test. ✓
- name set at room entry via `xnew(xnew.basics.Room, { ..., name })` and `boot({ mode:'client', ..., name })` → Task 1 (`BootOptions.name`) + Task 2 (Room). ✓
- name shared between players (reaches server, visible to all) → presence handshake (`sync:hello`/`sync:roster`) in Task 1; verified by the "shares the roster" test. ✓
- roster retrieval function → `xnew.sync.clients` getter. ✓
- presence always automatic → wired unconditionally in `bootSyncRoot`. ✓
- reserved events not leaked to app → `dispatchSync` `sync:` guard + the "does not deliver reserved" test. ✓

**Type consistency:** `ClientInfo { id, name }` defined+exported in sync.ts (Task 1), imported by xnew.ts (Task 1 Step 8). `getRootClient`/`getRootClients` exported (Task 1 Step 3) and imported (Step 8). `BootOptions.name` (Task 1 Step 4) consumed by `bootSyncRoot` (Step 5) and Room (Task 2). `registerSyncRoot` made internal — only caller is `bootSyncRoot` (same file). `RootInfo` stays internal (no exported function returns it; `getRootClient`/`getRootClients` return `ClientInfo`).

**Placeholder scan:** none — exact strings/commands throughout.

**Risk notes:** loopback clients announce `sync:hello` synchronously at boot (server must boot first — already the required order). socket.io clients announce on `connect`. The roster is per-boot-root, so socket.io multi-room servers stay isolated; loopback shares one hub per engineRoot (single-room only, consistent with the existing loopback limitation).
