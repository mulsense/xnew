# xnew.sync.boot({ mode }) API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `xnew.sync.boot(socket, ...)` with `xnew.sync.boot({ mode, socket?, room? }, ...)`, where transport is chosen by the options object (no socket = in-memory loopback, socket present = socket.io), and remove `xnew.sync.loopback` / `xnew.sync.socketio` from the public surface.

**Architecture:** `boot` now takes an explicit `mode: 'server'|'client'`. When `socket` is omitted, server and client roots share an internal in-memory loopback hub keyed by `Unit.engineRoot` (auto-recreated on `Unit.reset()`, so nothing leaks into `unit.ts`). When `socket` is present, it is wrapped via the existing `socketio()` adapter, picking the server/client side by `mode`. Server connect/disconnect basic events now carry `{ id: clientId }` so a host unit can keep a member ledger without holding a transport handle.

**Tech Stack:** TypeScript 5, Rollup 3 (ESM/CJS/d.ts), Jest 29 + ts-jest, jsdom. Tests and build run **on the host** (`npx jest`, `npm run build`) — not Sail.

---

## Background facts (verified against current code)

- `xnew.sync.boot` is defined in [src/core/xnew.ts:226-229](../../../src/core/xnew.ts#L226-L229); it imports `bootSyncRoot, loopback, socketio` at [src/core/xnew.ts:19](../../../src/core/xnew.ts#L19) and exposes `loopback`/`socketio` on `xnew.sync` at [src/core/xnew.ts:231-233](../../../src/core/xnew.ts#L231-L233).
- `bootSyncRoot` infers mode via `'to' in socket` at [src/core/sync.ts:226-247](../../../src/core/sync.ts#L226-L247).
- Server basic events do **not** pass clientId today: [src/core/sync.ts:235-236](../../../src/core/sync.ts#L235-L236).
- `Unit.engineRoot` is a static recreated by `Unit.reset()` ([src/core/unit.ts:339-349](../../../src/core/unit.ts#L339-L349)). We key the shared loopback hub by it.
- `loopback`/`socketio` are hoisted `export function`s at the bottom of sync.ts, so earlier code may reference them.
- Call sites to migrate: `src/basics/Room.ts`; tests `test/core/sync/{scope,composed-state,reconcile,channel}.test.ts`, `test/basics/Room.test.ts`; examples `examples/6_network/multi-client/{index-browser-only.js,index.js,server.js}`.

---

## File structure

- **Modify** `src/core/sync.ts` — add `BootOptions`, `loopbackHub()`, `resolveRootSocket()`; change `bootSyncRoot` signature to `(opts, parent, ...args)`; pass `{ id: clientId }` on server connect/disconnect. Keep `loopback`/`socketio` exported (internal use + tests).
- **Modify** `src/core/xnew.ts` — `boot(opts, ...)`; drop `loopback`/`socketio` from `xnew.sync` and imports.
- **Modify** `src/basics/Room.ts` — accept `{ mode, socket?, room?, component }`; branch on `mode`; disconnect the raw `socket` on client finalize.
- **Modify** `src/index.ts` — export `BootOptions` type (additive).
- **Create** `test/core/sync/boot-api.test.ts` — new-contract spec.
- **Modify** the test + example call sites listed above.

---

### Task 1: Core API in sync.ts + xnew.ts (new contract spec)

**Files:**
- Create: `test/core/sync/boot-api.test.ts`
- Modify: `src/core/sync.ts` (header, `bootSyncRoot` block ~226-247, error string ~213)
- Modify: `src/core/xnew.ts:19-20`, `:222-233`

- [ ] **Step 1: Write the failing test**

Create `test/core/sync/boot-api.test.ts`:

```ts
import { Unit } from '../../../src/core/unit';
import { xnew } from '../../../src/core/xnew';
import { loopbackHub } from '../../../src/core/sync';

describe('xnew.sync.boot({ mode }) — loopback (no socket)', () => {
    beforeEach(() => { jest.useFakeTimers({ now: 0 }); Unit.reset(); });
    afterEach(() => { Unit.engineRoot?.finalize(); jest.useRealTimers(); });

    it('boots server + client on a shared in-memory hub and auto-numbers clientId', () => {
        xnew.sync.boot({ mode: 'server' }, function Server() {});
        let id1: string | undefined;
        let id2: string | undefined;
        xnew.sync.boot({ mode: 'client' }, function C1() { xnew.client(() => { id1 = xnew.sync.clientId; }); });
        xnew.sync.boot({ mode: 'client' }, function C2() { xnew.client(() => { id2 = xnew.sync.clientId; }); });
        expect(id1).toBe('c1');
        expect(id2).toBe('c2');
    });

    it('delivers connect to the boot-parent unit.on with the clientId', () => {
        const seen: string[] = [];
        xnew(function Host(unit: Unit) {
            xnew.sync.boot({ mode: 'server' }, function Server() {});
            unit.on('connect', ({ id }: any) => seen.push(id));
        });
        loopbackHub().connect('cX');   // a fresh client connects on the same shared hub
        expect(seen).toEqual(['cX']);
    });

    it('mode selects the root engine mode', () => {
        const s = xnew.sync.boot({ mode: 'server' }, function S() {});
        const c = xnew.sync.boot({ mode: 'client' }, function C() {});
        expect(s._.mode).toBe('server');
        expect(c._.mode).toBe('client');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest test/core/sync/boot-api.test.ts`
Expected: FAIL — `loopbackHub` is not exported and `boot` rejects an options object.

- [ ] **Step 3: Edit `src/core/sync.ts` — replace the whole `bootSyncRoot` definition**

Replace [src/core/sync.ts:226-247](../../../src/core/sync.ts#L226-L247) (from `export function bootSyncRoot(socket: RootSocket, parent: Unit | null, ...args: any[]): Unit {` through its closing `}`) with:

```ts
/** xnew.sync.boot の入力。mode は必須、socket を渡すと socket.io 経由・省略で in-memory loopback。 */
export interface BootOptions {
    mode: 'server' | 'client';
    socket?: any;        // socket.io の io（server）/ socket（client）。省略時は loopback。
    room?: string;       // server + socket.io のときだけ意味を持つ（接続を query.room で絞る）。
}

// 同一 engineRoot 配下で socket 省略の boot が共有する in-memory hub。reset で engineRoot が変わると
// WeakMap がミスして作り直されるので、明示リセットは不要（unit.ts は sync を一切知らないまま）。
const loopbackHubs: WeakMap<Unit, Transport> = new WeakMap();

/** 現在の engineRoot に紐づく共有 loopback hub を返す（無ければ生成）。テストが生 socket を得るのにも使う。 */
export function loopbackHub(): Transport {
    let hub = loopbackHubs.get(Unit.engineRoot);
    if (hub === undefined) { loopbackHubs.set(Unit.engineRoot, hub = loopback()); }
    return hub;
}

/** BootOptions を RootSocket へ解決する（socket 有り = socket.io / 無し = 共有 loopback）。 */
function resolveRootSocket(opts: BootOptions): RootSocket {
    if (opts.socket !== undefined) {
        const transport = socketio(opts.socket, opts.room !== undefined ? { room: opts.room } : {});
        return opts.mode === 'server' ? transport.server : transport.connect();
    }
    const hub = loopbackHub();
    return opts.mode === 'server' ? hub.server : hub.connect();
}

export function bootSyncRoot(opts: BootOptions, parent: Unit | null, ...args: any[]): Unit {
    const mode = opts.mode;
    const socket = resolveRootSocket(opts);
    // socket は unit に保持せず、setup フックで syncRoots へ登録する。
    const root = new Unit({ mode, setup: (unit) => registerSyncRoot(unit, { socket }) }, parent, ...args);

    if (mode === 'server') {
        const server = socket as ServerSocket;
        root.on('update', () => server.emit('sync', captureStateTree(root)));
        server.onAny((event, clientId, message) => dispatchSync(root, event, clientId, message));
        server.on('connect', (clientId) => { dispatchSync(root, 'connect', clientId, undefined); dispatchBasicEvent(parent, 'connect', { id: clientId }); });
        server.on('disconnect', (clientId) => { dispatchSync(root, 'disconnect', clientId, undefined); dispatchBasicEvent(parent, 'disconnect', { id: clientId }); });
    } else {
        const client = socket as ClientSocket;
        const handler = (tree: StateTree) => applyStateTree(root, tree);
        client.on('sync', handler);
        root.on('finalize', () => client.off('sync', handler));
        client.onAny((event, message) => dispatchSync(root, event, undefined, message));
        // socket.io の onAny は connect/disconnect を含まないため、基本イベントは明示的に拾う。
        BASIC_EVENTS.forEach((event) => client.on(event, (payload: any) => dispatchBasicEvent(parent, event, payload)));
    }
    return root;
}
```

- [ ] **Step 4: Edit `src/core/sync.ts` — update the boot doc-comment + error string + header inventory**

Replace the boot JSDoc at [src/core/sync.ts:218-225](../../../src/core/sync.ts#L218-L225) (`/**` … `*/` directly above the old `bootSyncRoot`) with:

```ts
/**
 * BootOptions から boot ルートを生成し、mode 別に一括配線して返す。
 * transport は opts.socket の有無で決まる（無し = 共有 loopback / 有り = socketio で socket.io をラップ）。
 * 配線は 3 つ:
 * (1) 状態の下り mirror : server は毎 update で capture → broadcast、client は on('sync') → apply
 * (2) dispatcher        : 受信イベントを root 配下の unit.on(event) へ（'-event'=同一 syncId / '+'・無印=全体）
 * (3) 基本イベント       : connect / disconnect / room:notfound を boot を呼んだ親ユニットの unit.on へ
 *     （server では connect/disconnect を root 配下にも配り、親へは { id: clientId } を渡す）
 */
```

Change the error string at [src/core/sync.ts:213](../../../src/core/sync.ts#L213) from:

```ts
        throw new Error('no socket bound to this root; create it with xnew.sync.boot(socket, ...).');
```

to:

```ts
        throw new Error('no socket bound to this root; create it with xnew.sync.boot({ mode }, ...).');
```

Update the file-header inventory line at [src/core/sync.ts:13](../../../src/core/sync.ts#L13) from:

```ts
// - bootSyncRoot : socket バインドのルート生成 + 配線（下り mirror / dispatcher / 基本イベント）
```

to:

```ts
// - BootOptions / bootSyncRoot / loopbackHub : boot 入力・ルート生成 + 配線・共有 loopback hub
```

- [ ] **Step 5: Edit `src/core/xnew.ts` — imports**

Replace [src/core/xnew.ts:19-20](../../../src/core/xnew.ts#L19-L20):

```ts
import { syncOf, registerOnUnit, captureStateTree, applyStateTree, getRootSocket, bootSyncRoot, loopback, socketio } from './sync';
import type { RootSocket } from './sync';
```

with:

```ts
import { syncOf, registerOnUnit, captureStateTree, applyStateTree, getRootSocket, bootSyncRoot } from './sync';
import type { BootOptions } from './sync';
```

- [ ] **Step 6: Edit `src/core/xnew.ts` — boot method + drop transport exports**

Replace [src/core/xnew.ts:221-234](../../../src/core/xnew.ts#L221-L234) (the boot JSDoc, the `boot(...)` method, and the `// transport …` block with `loopback,` / `socketio,`) with:

```ts
            /**
             * Creates a root Unit for `opts.mode`（'server'|'client'）。transport は opts.socket の有無で決まる
             * （省略 = in-memory loopback / 指定 = socket.io。server は opts.room で接続を絞れる）。残りの引数は
             * xnew(...) へ転送。下り mirror と dispatcher の配線は bootSyncRoot が行う。
             */
            boot(opts: BootOptions, ...args: any[]): Unit {
                if (Unit.engineRoot === undefined) { Unit.reset(); }
                return bootSyncRoot(opts, Unit.currentUnit, ...args);
            },
```

(The `loopback` / `socketio` properties are removed by this replacement.)

- [ ] **Step 7: Run the new test to verify it passes**

Run: `npx jest test/core/sync/boot-api.test.ts`
Expected: PASS (3 tests). Other suites still reference removed APIs and are migrated in later tasks — do not run the full suite yet.

- [ ] **Step 8: Commit**

```bash
git add src/core/sync.ts src/core/xnew.ts test/core/sync/boot-api.test.ts
git commit -m "feat(xnew/sync): boot takes { mode, socket?, room? }; loopback transport is internal

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Room.ts + Room.test.ts migration

**Files:**
- Modify: `src/basics/Room.ts:27`, `:29-39`
- Modify: `test/basics/Room.test.ts` (Room invocations)

- [ ] **Step 1: Edit `src/basics/Room.ts` — drop RootSocket import**

Replace [src/basics/Room.ts:27](../../../src/basics/Room.ts#L27):

```ts
import { RootSocket } from '../core/sync';
```

with:

```ts
import { BootOptions } from '../core/sync';
```

- [ ] **Step 2: Edit `src/basics/Room.ts` — rewrite the component body**

Replace [src/basics/Room.ts:29-39](../../../src/basics/Room.ts#L29-L39):

```ts
export function Room(unit: Unit, { socket, component }: { socket: RootSocket; component: Function }) {
    // socket は xnew.sync.boot へ直接投入する（mode は socket から判定。下りと基本イベントは boot が自動配線）。
    const client = xnew.sync.boot(socket, component) as Unit & { select?: () => void };

    if ('to' in socket) {
        // server: select / disconnect は無い。部屋掃除で booted root を畳むだけ。
        unit.on('finalize', () => client.finalize());
    } else {
        client.select?.();   // client: 単一ペインを即操作可に（Selectable を持たない component では no-op）
        unit.on('finalize', () => { client.finalize(); socket.disconnect(); });
    }
```

with:

```ts
export function Room(unit: Unit, { mode, socket, room, component }: Pick<BootOptions, 'mode' | 'socket' | 'room'> & { component: Function }) {
    // boot へ mode/socket/room を渡す（下りと基本イベントは boot が自動配線）。socket 省略時は loopback。
    const client = xnew.sync.boot({ mode, socket, room }, component) as Unit & { select?: () => void };

    if (mode === 'server') {
        // server: select / disconnect は無い。部屋掃除で booted root を畳むだけ。
        unit.on('finalize', () => client.finalize());
    } else {
        client.select?.();   // client: 単一ペインを即操作可に（Selectable を持たない component では no-op）
        unit.on('finalize', () => { client.finalize(); socket?.disconnect?.(); });   // 生 socket.io 接続を閉じる
    }
```

- [ ] **Step 3: Edit `src/basics/Room.ts` — refresh the header examples**

Replace [src/basics/Room.ts:15-22](../../../src/basics/Room.ts#L15-L22):

```ts
// Example (client):
//   const socket = xnew.sync.socketio(io({ query: { room: roomId }, forceNew: true })).connect();
//   xnew.extend(xnew.basics.Room, { socket, component: World });
//   unit.on('connect', () => setStatus(`room ${roomId}: ${socket.id}`));
//   unit.on('room:notfound', () => unit.change(LobbyScene));
// Example (server):
//   const transport = xnew.sync.socketio(io, { room: roomId });
//   const roomUnit = xnew(xnew.basics.Room, { socket: transport.server, component: World });   // 空室掃除で roomUnit.finalize()
```

with:

```ts
// Example (client):
//   const socket = io({ query: { room: roomId }, forceNew: true });
//   xnew.extend(xnew.basics.Room, { mode: 'client', socket, component: World });
//   unit.on('connect', () => setStatus(`room ${roomId}: ${socket.id}`));
//   unit.on('room:notfound', () => unit.change(LobbyScene));
// Example (server):
//   const roomUnit = xnew(xnew.basics.Room, { mode: 'server', socket: io, room: roomId, component: World });
//   roomUnit.on('connect', ({ id }) => members.add(id));   // 空室掃除で roomUnit.finalize()
```

Also update the role line [src/basics/Room.ts:5](../../../src/basics/Room.ts#L5) from `server / client の別は socket の形（'to' を持つ = ServerSocket = server）で判定する（boot と同じ規約。` to `server / client の別は mode で指定する（boot と同じ規約。`.

- [ ] **Step 4: Edit `test/basics/Room.test.ts` — client-mode Room calls**

There are three `Room` calls that pass a mock client socket. Add `mode: 'client'`. Run replace-all on the exact string:

Replace every occurrence of:

```ts
xnew.extend(Room, { socket, component: World })
```

with:

```ts
xnew.extend(Room, { mode: 'client', socket, component: World })
```

- [ ] **Step 5: Edit `test/basics/Room.test.ts` — server-mode Room test**

Replace [test/basics/Room.test.ts:75-78](../../../test/basics/Room.test.ts#L75-L78):

```ts
    it('boots in server mode (to-socket) without disconnecting, and finalizes on finalize', () => {
        const transport = xnew.sync.loopback();   // transport.server は 'to' を持つ ServerSocket
        let client: any;
        const scene = xnew(function Scene(_: Unit) {
            ({ client } = xnew(Room, { socket: transport.server, component: World }) as any);
        });
```

with:

```ts
    it('boots in server mode without disconnecting, and finalizes on finalize', () => {
        let client: any;
        const scene = xnew(function Scene(_: Unit) {
            ({ client } = xnew(Room, { mode: 'server', component: World }) as any);
        });
```

- [ ] **Step 6: Run Room test to verify it passes**

Run: `npx jest test/basics/Room.test.ts`
Expected: PASS (all Room tests).

- [ ] **Step 7: Commit**

```bash
git add src/basics/Room.ts test/basics/Room.test.ts
git commit -m "refactor(xnew/Room): accept { mode, socket?, room? } and branch on mode

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Migrate sync test suites (scope / composed-state / reconcile)

These three files share one mechanical transform. **Do all three.**

**Files:** `test/core/sync/scope.test.ts`, `test/core/sync/composed-state.test.ts`, `test/core/sync/reconcile.test.ts`

- [ ] **Step 1: In each of the three files, remove the transport plumbing**

Delete every line that declares the transport (exact strings, one per occurrence):

```ts
    let transport: ReturnType<typeof xnew.sync.loopback>;
```

And in each `beforeEach`, drop the `transport = …` assignment — replace:

```ts
Unit.reset(); transport = xnew.sync.loopback();
```

with:

```ts
Unit.reset();
```

In `composed-state.test.ts` the `beforeEach` is multi-line; replace [test/core/sync/composed-state.test.ts:26-31](../../../test/core/sync/composed-state.test.ts#L26-L31):

```ts
    beforeEach(() => {
        jest.useFakeTimers({ now: 0 });
        Unit.reset();
        clientReadAtConstruction = {};
        transport = xnew.sync.loopback();
    });
```

with:

```ts
    beforeEach(() => {
        jest.useFakeTimers({ now: 0 });
        Unit.reset();
        clientReadAtConstruction = {};
    });
```

- [ ] **Step 2: In each file, rewrite the boot calls (replace-all)**

Replace every occurrence of:

```ts
xnew.sync.boot(transport.server, 
```

with:

```ts
xnew.sync.boot({ mode: 'server' }, 
```

and every occurrence of:

```ts
xnew.sync.boot(transport.connect(), 
```

with:

```ts
xnew.sync.boot({ mode: 'client' }, 
```

(These cover: scope.test L29/L34; composed-state L34/L35/L65/L66/L82/L110/L111; reconcile L19/L52/L73/L90.)

- [ ] **Step 3: Run the three suites to verify they pass**

Run: `npx jest test/core/sync/scope.test.ts test/core/sync/composed-state.test.ts test/core/sync/reconcile.test.ts`
Expected: PASS (all tests). The shared-hub keying by engineRoot gives fresh `c1` numbering per `Unit.reset()`.

- [ ] **Step 4: Commit**

```bash
git add test/core/sync/scope.test.ts test/core/sync/composed-state.test.ts test/core/sync/reconcile.test.ts
git commit -m "test(xnew/sync): migrate scope/composed-state/reconcile to boot({ mode })

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Migrate channel.test.ts (mixed raw-transport + boot)

`channel.test.ts` both tests the transport in isolation and boots roots. Isolated-transport tests use `loopback()` directly; boot tests use the new API; the one raw-envelope test grabs a raw socket from the shared hub via `loopbackHub()`.

**Files:** `test/core/sync/channel.test.ts`

- [ ] **Step 1: Update the import line**

Replace [test/core/sync/channel.test.ts:3](../../../test/core/sync/channel.test.ts#L3):

```ts
import { syncOf, getRootSocket, ClientSocket } from '../../../src/core/sync';
```

with:

```ts
import { syncOf, getRootSocket, ClientSocket, loopback, loopbackHub } from '../../../src/core/sync';
```

- [ ] **Step 2: Isolated-transport tests — use `loopback()` directly**

In the four isolated tests (no boot), replace each:

```ts
const hub = xnew.sync.loopback();
```

with:

```ts
const hub = loopback();
```

(Occurrences at channel.test L17, L30, L46, L58.)

- [ ] **Step 3: Rewrite "binds the socket and auto-generates clientId"**

Replace [test/core/sync/channel.test.ts:69-94](../../../test/core/sync/channel.test.ts#L69-L94):

```ts
    it('boot(transport): binds the socket and auto-generates clientId', () => {
        const transport = xnew.sync.loopback();   // boot に渡すと socket を自動バインド

        const received: Array<[string, any]> = [];
        const server = xnew.sync.boot(transport.server, function Server(unit: Unit) {
            xnew.server(() => { unit.on('move', ({ id, x }: any) => received.push([id, { x }])); });
        });

        let id1: string | undefined;
        let id2: string | undefined;
        xnew.sync.boot(transport.connect(), function Client(unit: Unit) {
            xnew.client(() => { id1 = xnew.sync.clientId; unit.on('update', () => xnew.sync.emit('move', { x: 1 })); });
        });
        xnew.sync.boot(transport.connect(), function Client(unit: Unit) {
            xnew.client(() => { id2 = xnew.sync.clientId; });
        });

        expect(id1).toBe('c1');   // 自動発番（手動 clientId 不要）
        expect(id2).toBe('c2');

        Unit.start(Unit.engineRoot);
        Unit.update(Unit.engineRoot);   // c1 の client が emit（手動 bind 無しで届く）

        expect(received).toEqual([['c1', { x: 1 }]]);
        expect(server).toBeDefined();
    });
```

with:

```ts
    it('boot({ mode }): shares an in-memory hub and auto-generates clientId', () => {
        const received: Array<[string, any]> = [];
        const server = xnew.sync.boot({ mode: 'server' }, function Server(unit: Unit) {
            xnew.server(() => { unit.on('move', ({ id, x }: any) => received.push([id, { x }])); });
        });

        let id1: string | undefined;
        let id2: string | undefined;
        xnew.sync.boot({ mode: 'client' }, function Client(unit: Unit) {
            xnew.client(() => { id1 = xnew.sync.clientId; unit.on('update', () => xnew.sync.emit('move', { x: 1 })); });
        });
        xnew.sync.boot({ mode: 'client' }, function Client(unit: Unit) {
            xnew.client(() => { id2 = xnew.sync.clientId; });
        });

        expect(id1).toBe('c1');   // 自動発番（手動 clientId 不要）
        expect(id2).toBe('c2');

        Unit.start(Unit.engineRoot);
        Unit.update(Unit.engineRoot);   // c1 の client が emit（手動 bind 無しで届く）

        expect(received).toEqual([['c1', { x: 1 }]]);
        expect(server).toBeDefined();
    });
```

- [ ] **Step 4: Rewrite "binds the transport even on the very first call"**

Replace [test/core/sync/channel.test.ts:96-107](../../../test/core/sync/channel.test.ts#L96-L107):

```ts
    it('boot(transport): binds the transport even on the very first call (engine root not yet created)', () => {
        // 回帰: 初回 xnew で reset が走るとエンジンルートが socket を消費してしまっていた問題（node 起動時に発覚）。
        // boot がルートを先に用意し、socket を options で boot ルートに直接渡すことで解消。
        (Unit as any).engineRoot = undefined;   // 「まだ何も生成されていない」状態を再現
        const transport = xnew.sync.loopback();
        let id: string | undefined;
        xnew.sync.boot(transport.connect(), function Client() {
            xnew.client(() => { id = xnew.sync.clientId; });
        });
        expect(id).toBe('c1');   // socket がバインドされ clientId が解決できる（throw しない）
    });
```

with:

```ts
    it('boot({ mode }): binds the transport even on the very first call (engine root not yet created)', () => {
        // 回帰: 初回 xnew で reset が走るとエンジンルートが socket を消費してしまっていた問題（node 起動時に発覚）。
        // boot がルートを先に用意し、共有 loopback hub を engineRoot に紐づけることで解消。
        (Unit as any).engineRoot = undefined;   // 「まだ何も生成されていない」状態を再現
        let id: string | undefined;
        xnew.sync.boot({ mode: 'client' }, function Client() {
            xnew.client(() => { id = xnew.sync.clientId; });
        });
        expect(id).toBe('c1');   // socket がバインドされ clientId が解決できる（throw しない）
    });
```

- [ ] **Step 5: Rewrite "updates state directly on message receipt" (needs a raw socket)**

Replace [test/core/sync/channel.test.ts:109-126](../../../test/core/sync/channel.test.ts#L109-L126):

```ts
    it('updates state directly on message receipt (no polling) via closure', () => {
        const hub = xnew.sync.loopback();
        let state: Record<string, any> = {};
        xnew.sync.boot(hub.server, function Server(unit: Unit) {
            xnew.server(() => {
                state = xnew.sync.state({ x: 0 });
                // 受信時に closure の state を直接更新（inbox 不要）。unit 生成等はしない。
                unit.on('move', ({ dx }: any) => { state.x += dx; });
            });
        });

        const socket = hub.connect();
        // 生 socket から送るときも xnew.sync.emit と同じ封筒 { syncId, data } で送る。
        socket.emit('move', { data: { dx: 5 } });
        socket.emit('move', { data: { dx: 2 } });
        expect(state.x).toBe(7);
    });
```

with:

```ts
    it('updates state directly on message receipt (no polling) via closure', () => {
        let state: Record<string, any> = {};
        xnew.sync.boot({ mode: 'server' }, function Server(unit: Unit) {
            xnew.server(() => {
                state = xnew.sync.state({ x: 0 });
                // 受信時に closure の state を直接更新（inbox 不要）。unit 生成等はしない。
                unit.on('move', ({ dx }: any) => { state.x += dx; });
            });
        });

        const socket = loopbackHub().connect();   // boot と同じ engineRoot 共有 hub の生 client
        // 生 socket から送るときも xnew.sync.emit と同じ封筒 { syncId, data } で送る。
        socket.emit('move', { data: { dx: 5 } });
        socket.emit('move', { data: { dx: 2 } });
        expect(state.x).toBe(7);
    });
```

- [ ] **Step 6: Rewrite the "full loopback" test's boot calls**

Replace [test/core/sync/channel.test.ts:163-168](../../../test/core/sync/channel.test.ts#L163-L168):

```ts
        const hub = xnew.sync.loopback();
        const view1 = document.createElement('div');
        const view2 = document.createElement('div');

        const server = xnew.sync.boot(hub.server, World);                  // on('connect') を登録
        const client1 = xnew.sync.boot(hub.connect(), World, { view: view1 }); // connect → presence に c1
        const client2 = xnew.sync.boot(hub.connect(), World, { view: view2 }); // connect → presence に c2
```

with:

```ts
        const view1 = document.createElement('div');
        const view2 = document.createElement('div');

        const server = xnew.sync.boot({ mode: 'server' }, World);                  // on('connect') を登録
        const client1 = xnew.sync.boot({ mode: 'client' }, World, { view: view1 }); // connect → presence に c1
        const client2 = xnew.sync.boot({ mode: 'client' }, World, { view: view2 }); // connect → presence に c2
```

- [ ] **Step 7: Run channel test to verify it passes**

Run: `npx jest test/core/sync/channel.test.ts`
Expected: PASS (all tests).

- [ ] **Step 8: Commit**

```bash
git add test/core/sync/channel.test.ts
git commit -m "test(xnew/sync): migrate channel tests to boot({ mode }) + loopbackHub

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Migrate examples + export BootOptions

**Files:** `examples/6_network/multi-client/index-browser-only.js`, `…/index.js`, `…/server.js`, `src/index.ts`

- [ ] **Step 1: `index-browser-only.js` — loopback pattern**

Replace [examples/6_network/multi-client/index-browser-only.js:12-18](../../../examples/6_network/multi-client/index-browser-only.js#L12-L18):

```js
const transport = xnew.sync.loopback();          // ← transport を差し替えれば実ネットワークになる
const stage = document.getElementById('stage');

// 状態のやり取りは boot が配線する: server=capture→broadcast / client=apply（transport バインド時に自動）。
const server = xnew.sync.boot(transport.server, World);     // 擬似サーバー（1 つ）
const left = xnew.sync.boot(transport.connect(), stage, World); // 擬似クライアント（左ペイン）
xnew.sync.boot(transport.connect(), stage, World);             // 擬似クライアント（右ペイン）
```

with:

```js
const stage = document.getElementById('stage');

// 状態のやり取りは boot が配線する: server=capture→broadcast / client=apply。socket 省略で in-memory loopback。
const server = xnew.sync.boot({ mode: 'server' }, World);     // 擬似サーバー（1 つ）
const left = xnew.sync.boot({ mode: 'client' }, stage, World); // 擬似クライアント（左ペイン）
xnew.sync.boot({ mode: 'client' }, stage, World);             // 擬似クライアント（右ペイン）
```

Update the header note at [examples/6_network/multi-client/index-browser-only.js:5-8](../../../examples/6_network/multi-client/index-browser-only.js#L5-L8) — replace:

```js
//   transport に loopback を使うだけ。server も client も同一プロセスで boot し、入力の上り（move）と
//   状態の下り（sync）は loopback がインメモリで配線する。
//   ★ これを socket.io 版に切り替えるには：loopback の代わりに xnew.sync.socketio(socket) を boot へ渡し、
//      server を別プロセス(node)に出すだけ。ゲーム本体 game.js は無改変（→ index.js / server.js 参照）。
```

with:

```js
//   socket を渡さず boot するだけ（in-memory loopback）。server も client も同一プロセスで boot し、入力の
//   上り（move）と状態の下り（sync）はインメモリで配線される。
//   ★ socket.io 版に切り替えるには：boot に { mode, socket } で socket.io の socket を渡し、server を別
//      プロセス(node)に出すだけ。ゲーム本体 game.js は無改変（→ index.js / server.js 参照）。
```

- [ ] **Step 2: `index.js` (client) — pass the raw socket to Room**

Replace [examples/6_network/multi-client/index.js:107-116](../../../examples/6_network/multi-client/index.js#L107-L116):

```js
    const gameSocket = window.io({ query: { room: roomId }, forceNew: true });
    const transport = xnew.sync.socketio(gameSocket);
    const socket = transport.connect();   // xnew.sync.boot へ渡す ClientSocket（server の transport.server と対称）

    const back = xnew('<button class="px-3 py-1 mb-2 rounded border-0 bg-gray-500 hover:bg-gray-600 text-white text-sm cursor-pointer">', '← ロビーに戻る');
    back.on('click', () => unit.change(LobbyScene));
    xnew.nest('<div class="flex gap-4">');   // 自機ペインの mount 先（World の client が pane を nest する）

    // room 関連の配線は Room が引き受ける（boot(World)→select、finalize で client 畳み + socket 切断）。
    // socket は xnew.sync.boot へ直接渡され、基本イベントは boot 親（この GameScene）の unit.on へ届く。
    xnew.extend(xnew.basics.Room, { socket, component: World });
```

with:

```js
    const gameSocket = window.io({ query: { room: roomId }, forceNew: true });

    const back = xnew('<button class="px-3 py-1 mb-2 rounded border-0 bg-gray-500 hover:bg-gray-600 text-white text-sm cursor-pointer">', '← ロビーに戻る');
    back.on('click', () => unit.change(LobbyScene));
    xnew.nest('<div class="flex gap-4">');   // 自機ペインの mount 先（World の client が pane を nest する）

    // room 関連の配線は Room が引き受ける（boot(World)→select、finalize で client 畳み + socket 切断）。
    // socket は boot へ渡され、基本イベントは boot 親（この GameScene）の unit.on へ届く。
    xnew.extend(xnew.basics.Room, { mode: 'client', socket: gameSocket, component: World });
```

- [ ] **Step 3: `server.js` — pass io+room to Room, count via unit.on**

Replace [examples/6_network/multi-client/server.js:47-69](../../../examples/6_network/multi-client/server.js#L47-L69):

```js
    // room スコープ transport を作り、その server socket で World を Room として boot する。
    // Room（server 分岐）が transport.server を xnew.sync.boot へ渡し、auto-mirror がこのルームへ broadcast する。
    const transport = xnew.sync.socketio(io, { room: id });
    const unit = xnew(xnew.basics.Room, { socket: transport.server, component: World });
    const room = { id, name, transport, unit, members: new Set(), graceTimer: null };

    const scheduleCleanup = () => {
        if (room.graceTimer !== null) { clearTimeout(room.graceTimer); }
        room.graceTimer = setTimeout(() => { if (room.members.size === 0) { removeRoom(id); } }, GRACE_MS);
    };
    // 接続 / 切断で人数を数える（spawn/despawn は boot のディスパッチャが配るので、ここは台帳だけ）。
    transport.server.on('connect', (clientId) => {
        if (!rooms.has(id)) { return; }   // 掃除済みルームへの stale 接続は無視
        if (room.graceTimer !== null) { clearTimeout(room.graceTimer); }
        room.members.add(clientId);
        notifyLobby();
    });
    transport.server.on('disconnect', (clientId) => {
        if (!rooms.has(id)) { return; }
        room.members.delete(clientId);
        notifyLobby();
        if (room.members.size === 0) { scheduleCleanup(); }
    });
```

with:

```js
    // room スコープで World を Room として boot する（boot 内部で io を room=id に絞った socketio へ橋渡し）。
    // auto-mirror がこのルームへ broadcast し、connect/disconnect は Room unit.on へ { id } 付きで届く。
    const unit = xnew(xnew.basics.Room, { mode: 'server', socket: io, room: id, component: World });
    const room = { id, name, unit, members: new Set(), graceTimer: null };

    const scheduleCleanup = () => {
        if (room.graceTimer !== null) { clearTimeout(room.graceTimer); }
        room.graceTimer = setTimeout(() => { if (room.members.size === 0) { removeRoom(id); } }, GRACE_MS);
    };
    // 接続 / 切断で人数を数える（spawn/despawn は boot のディスパッチャが配るので、ここは台帳だけ）。
    unit.on('connect', ({ id: clientId }) => {
        if (!rooms.has(id)) { return; }   // 掃除済みルームへの stale 接続は無視
        if (room.graceTimer !== null) { clearTimeout(room.graceTimer); }
        room.members.add(clientId);
        notifyLobby();
    });
    unit.on('disconnect', ({ id: clientId }) => {
        if (!rooms.has(id)) { return; }
        room.members.delete(clientId);
        notifyLobby();
        if (room.members.size === 0) { scheduleCleanup(); }
    });
```

Also update the file-header line [examples/6_network/multi-client/server.js:3-5](../../../examples/6_network/multi-client/server.js#L3-L5) — replace `部屋ごとに room スコープの transport を` … `ここでは server socket（transport.server）を渡して server ツリーを起こす。` with: `部屋ごとに Room を { mode:'server', socket: io, room } で boot し、共有 component World の server ツリーを起こす。`

- [ ] **Step 4: `src/index.ts` — export BootOptions (additive)**

Replace [src/index.ts:5](../../../src/index.ts#L5):

```ts
export type { ClientSocket, ServerSocket, RootSocket } from './core/sync';
```

with:

```ts
export type { ClientSocket, ServerSocket, RootSocket, BootOptions } from './core/sync';
```

- [ ] **Step 5: Build to verify examples + types compile**

Run: `npm run build`
Expected: Rollup completes, emits `dist/` with no TypeScript errors. (Examples are plain JS and not type-checked, but `npm run build` type-checks `src/`.)

- [ ] **Step 6: Commit**

```bash
git add examples/6_network/multi-client/index-browser-only.js examples/6_network/multi-client/index.js examples/6_network/multi-client/server.js src/index.ts
git commit -m "refactor(xnew/examples): migrate multi-client to boot({ mode, socket?, room? })

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the entire test suite**

Run: `npx jest`
Expected: PASS — all suites green, including `boot-api`, `channel`, `scope`, `composed-state`, `reconcile`, `Room`.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success, `dist/xnew.js` / `dist/xnew.mjs` / `d.ts` regenerated with no errors.

- [ ] **Step 3: Grep for any leftover removed APIs in source/tests**

Run: `grep -rn "sync\.loopback\|sync\.socketio\|transport\.server\|transport\.connect" src test examples --include="*.ts" --include="*.js" | grep -v "/dist/"`
Expected: no matches (the `dist/` bundles are gitignored build output and may still contain old strings until rebuilt — ignore them).

- [ ] **Step 4: Commit any incidental cleanup, or note clean tree**

```bash
git status
```
Expected: clean (all changes already committed in Tasks 1–5). If the build regenerated tracked files, do not commit `dist/` (it is build output); confirm only intended source is staged.

---

## Self-Review

**Spec coverage:**
- Pattern 1 (browser, no socket.io) → `boot({ mode })` with internal loopback: Task 1 (impl) + boot-api test; examples Task 5. ✓
- Pattern 2 (browser + socket.io) → `boot({ mode: 'client', socket })`: Room.ts Task 2, client example Task 5. ✓
- Pattern 3 (server + socket.io) → `boot({ mode: 'server', socket, room })`: Room.ts Task 2, server example Task 5. ✓
- Remove `xnew.sync.loopback` / `xnew.sync.socketio`: Task 1 Step 6. ✓
- (3) server member ledger without transport handle → `{ id: clientId }` on basic events: Task 1 Step 3, server example Task 5 Step 3. ✓
- No changes to `unit.ts`: shared hub keyed by `Unit.engineRoot` via WeakMap in sync.ts. ✓

**Type consistency:** `BootOptions { mode, socket?, room? }` defined in sync.ts (Task 1), imported by xnew.ts (Task 1) and Room.ts (Task 2), re-exported from index.ts (Task 5). `loopbackHub(): Transport` used in boot-api.test and channel.test. `bootSyncRoot(opts, parent, ...args)` matches the single caller in xnew.ts. ✓

**Placeholder scan:** none — every step has exact strings/commands. ✓
