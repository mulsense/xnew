# Room basic component — 設計

## 背景 / 目的

`examples/6_network/multi-client/index.js` の `GameScene` は、ルーム入室時の
「socket → transport → boot(World) → select」「socket ライフサイクルの購読」
「finalize での後始末」を直書きしている。これらの **room 関連処理を再利用可能な
basic コンポーネント `xnew.basics.Room` に切り出す**。HTML（戻るボタン・ペインの
nest・status 表示）は `GameScene` に残す。

利用イメージ:

```js
function GameScene(unit, { roomId }) {
    xnew.extend(xnew.basics.Scene);
    const gameSocket = window.io({ query: { room: roomId }, forceNew: true });
    // ...html...
    const { client } = xnew.extend(xnew.basics.Room, { socket: gameSocket, component: World });
    client.on('connect', ...); client.on('disconnect', ...); client.on('room:notfound', ...);
}
```

## 決定事項

- **socket は呼び出し側が生成して渡す**（`{ socket }`）。Room が `socket.close()` まで所有する。
- **boot 対象は props で渡す**（`{ component }`）。
- **イベントは `unit.emit` を新設せず、bootSyncRoot のディスパッチャ経由で `unit.on` に中継**する。
  中継先は boot ルート配下の unit なので、リスナは Room が返す boot ルート（`client`）に張る
  （`dispatchSync` は `findSyncRoot(unit) === root` の unit にしか配らず、親の Scene unit には届かない）。

## 変更点

### 1. `src/core/sync.ts` — bootSyncRoot の client 分岐に connect/disconnect 中継を追加

server 側は既に connect/disconnect を `dispatchSync` へ流しているが、client 側は流していない
（socket.io の `onAny` は connect/disconnect を含まないため）。server 側にミラーする:

```ts
client.on('connect', () => dispatchSync(root, 'connect', undefined, undefined));
client.on('disconnect', () => dispatchSync(root, 'disconnect', undefined, undefined));
```

`room:notfound` 等のアプリイベントは既存の `onAny → dispatchSync` 経由で中継済み（追加不要）。
ヘッダ doc も「client も connect/disconnect を中継」に更新。

### 2. `src/basics/Room.ts`（新規）

```ts
export function Room(unit, { socket, component }) {
    const transport = xnew.sync.socketio(socket);
    const client = xnew.sync.boot(transport.connect(), component);
    client.select?.();   // 単一ペインを即操作可に（Selectable を持たない component では no-op）
    unit.on('finalize', () => { client.finalize(); socket.close(); });
    return { client };
}
```

- `socket` は最小構造型（`id` / `on` / `off` / `onAny` / `emit` / `disconnect` / `close`）。
- ヘッダコメントは `src/` 規約（Role / Why / Public API / Example）に従う。

### 3. `src/index.ts`

`basics` に `Room` を登録。

### 4. `examples/6_network/multi-client/index.js`

`GameScene` を Room 利用形へ書き換え。`client.on('connect'/'disconnect'/'room:notfound')` で
status 表示・ロビー遷移を行う。socket 生成・戻るボタン・ペイン nest は残置。

## テスト

- `test/core/sync/channel.test.ts`（または近傍）に **client boot が connect/disconnect を
  `unit.on` へ中継する**回帰テストを追加（mock ClientSocket で `connect`/`disconnect` を発火）。
- `test/basics/Room.test.ts`（新規）: mock socket を渡し、
  1. `connect` / `disconnect` / `room:notfound` 発火 → boot ルート `client.on(...)` が発火
  2. component が client ツリーとして boot される（`select()` で `selected === true`）
  3. `finalize` で `socket.close()` が呼ばれ、`client` が finalized になる

## 非対象 (YAGNI)

- `unit.emit` 公開インスタンスメソッドの新設（不採用）。
- socket 生成・roomId 解決・status 文言の組み立て（呼び出し側の責務）。
