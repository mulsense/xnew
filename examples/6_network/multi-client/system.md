# multi-client — 仕組み解説（2 client + 1 server / socket.io 互換チャンネル）

各 client が自機を操作する擬似マルチプレイ。通信は **socket.io 互換の transport** だけに依存して書くので、
**同じゲーム本体のまま 2 通りの起動**ができる：

| 版 | エントリ | transport | server の場所 | 起動 |
|---|---|---|---|---|
| **browser-only** | `index-browser-only.html` | `xnew.sync.loopback()` | ブラウザ内（擬似） | ファイルを開くだけ |
| **socket.io（実ネット）** | `index.html` + `server.js` | socket.io アダプタ | Node プロセス | `npm install && npm start` → 複数タブで開く |

**共有ファイル（両版で無改変）**: `game.js`（`World`/`Player`）だけ。socket.io アダプタはライブラリ同梱
（`xnew.sync.socketio(io/socket)`）なので例には無い。
**差し替え点はただ 1 つ**: `boot` に渡す socket の出どころ transport（`xnew.sync.loopback()` か `xnew.sync.socketio(...)`。server は `transport.server`、client は `transport.connect()` を渡す）（と、server を同一プロセスで boot するか別プロセスにするか）。

> server→client 同期（`xnew.sync.boot` / `xnew.server` / `xnew.client` / `xnew.sync.state|register|capture|apply`）
> の基礎は [../state-sync/system.md](../state-sync/system.md) を参照。

## 0. 全体像 — 2 本のチャンネルを transport が運ぶ

```
[server World]                              [client World]（×人数）
  presence(on join / disconnect)             自分のペインを生成 / init で emit('join')
  → Player を spawn/despawn                   描画（render）
  Player: on('move')→vel / update で移動 ──sync(下り) = capture→apply──▶ apply
                         ▲
                         └────move(上り)──── 選択中ペインが emit('move', vector)
```

- **入力の上り** … 自機（`state.clientId === xnew.sync.clientId`）の `Player`(client) がキー入力を方向ベクトルにし、
  所属ペインが選択中のときだけ `xnew.sync.emit('-move', { vector })` を送る。server の `Player` は
  `xnew.sync.on('-move', ({ vector }) => ...)` で速度を更新し `update` で積分（権威）。`-move` は **同一 syncId 宛て**
  なので、client replica ↔ server で syncId が一致する「自分の Player」にだけ届く（clientId 判定が要らない）。
- **状態の下り** … `xnew.sync.boot(socket, World)` に socket（server=`transport.server` / client=`transport.connect()`）を渡すと、boot が自動で配線する。
  server なら毎 update で capture→broadcast、client なら受信して apply（`capture`/`apply`/`'sync'` の合成は隠蔽）。
- **接続管理** … client は init で `emit('join')`、`World`(server) は `on('join'/'disconnect')` の集合を見て `update` 内で
  Player を spawn/despawn（生の接続でなく明示 join。後述の理由で幽霊プレイヤーを防ぐ）。
- これら（move / sync / connect）の実体は transport が運ぶ。loopback なら同一プロセス内、socket.io なら実ネット。

## 1. イベントチャンネル API（socket.io 互換 transport）

| API | 場所 | socket.io 対応 | 役割 |
|---|---|---|---|
| `xnew.sync.loopback()` | 起動コード | （socket.io 本体に差し替え） | `{ server, connect(clientId?) }` を返すインメモリ transport |
| `xnew.sync.socketio(io/socket)` | 起動コード | io / io() をラップ | socket.io を Transport 形へ橋渡し（実ネット用。import 依存なし） |
| `xnew.sync.boot(socket, ...)` | 起動コード | （io / io() の用意） | socket（`transport.server`/`transport.connect()`）を渡すと自動バインドし、状態の下り(capture→broadcast / apply)も自動配線 |
| `xnew.sync.clientId` | client コンポーネント | `socket.id` | このルートの自動発番 id（手動で渡さない）。server では undefined |
| `xnew.sync.emit(event, payload)` | コンポーネント / handler | `socket.emit(event, payload)` | 送信。payload はオブジェクト。送信ユニットの syncId を自動付与。`-`=同一コンポーネント宛て / `+`・無印=全体 |
| `unit.on(event, handler)` | コンポーネント init | `socket.on(event, cb)` | **受信は unit.on に統一**（受信 unit を明示）。handler は `{ type, id, ...payload }`（id=送信元 clientId）。`-event` は送信元と同じ syncId のときだけ発火。socket→unit.on の橋渡しは boot が配線 |

`xnew.sync.state` / `register`（同期する state と種類の宣言）と、`capture` / `apply`（自動配線を使わず手動配信する低レベル）は
[../state-sync/system.md](../state-sync/system.md) 参照。このサンプルでは下りは boot の自動配線に任せる。

ポイント:
- `emit` は **`Unit.currentUnit` が立っている場所**（コンポーネント本体や `unit.on(...)` のハンドラ内）で呼ぶと、
  ルートにバインドした socket を自動解決する（ハンドラ実行中は `Unit.scope` が currentUnit を復元するため）。
  だから入力送信は `unit.on('window.keydown.wasd' ..., () => xnew.sync.emit(...))` のように xnew のイベントハンドラ内に置ける。
- **キー入力は xnew の window イベントで受ける**: `unit.on('window.keydown.wasd window.keyup.wasd window.keydown.arrow
  window.keyup.arrow', ({ event, vector }) => ...)`。`vector` は `{x,y} ∈ {-1,0,1}`（WASD と矢印で同じ形）。
  socket.io-simple の `public/app.js` と同じ書き方。
- **sync イベントの受信は `unit.on(event, …)` に統一**（送信は `xnew.emit`(ローカル) と `xnew.sync.emit`(ネット)で区別）。
  socket で届いた同期イベントを対象 unit のリスナへ橋渡しするディスパッチャを boot が設置する。受信 unit が
  finalize されればリスナも自動で消える。なお `unit.on('-move')` は **ローカルの `xnew.emit('-move')` でも発火**する
  （受信側は送信元を区別しない）。
- ハンドラは tick の外で走る場合がある（socket 受信時）が、`unit.on` は登録元 unit のスコープで実行されるので、
  ハンドラ内の `xnew(...)` は正しい親（その unit）の子として生成できる。

## 2. 2 つの起動 — 切り替えは transport だけ

共有コード（`game.js`）は bare specifier `@mulsense/xnew` を import する。
ブラウザは importmap（`<script type="importmap">` で `@mulsense/xnew` → ローカルビルド）、Node は `node_modules`
が解決する。だから**同じ `game.js` がブラウザでも Node でも動く**（socket.io-simple と同じやり方）。
DOM は xnew 記法（`xnew.nest('<div class>')` / `xnew('<div class>', ...)`）＋ Tailwind（Play CDN）。

**browser-only（`index-browser-only.js`）**: loopback を boot へ渡して server も client も同一プロセスで boot。
```js
import { World } from './game.js';
const transport = xnew.sync.loopback();              // ← transport = loopback
xnew.sync.boot(transport.server, World);          // 擬似サーバー
xnew.sync.boot(transport.connect(), stage, World);   // 擬似クライアント（左）
xnew.sync.boot(transport.connect(), stage, World);   // 擬似クライアント（右）
```

**socket.io（実ネット）**: transport を `xnew.sync.socketio(...)` に差し替えるだけ。
```js
// client（index.js / ブラウザ）: 接続後に socketio transport を boot へ渡す
const socket = window.io();
socket.once('connect', () => {
  const transport = xnew.sync.socketio(socket);    // ← transport だけ差し替え
  xnew.sync.boot(transport.connect(), stage, World);    // World は無改変
});

// server（server.js / Node）
const transport = xnew.sync.socketio(io);          // ← transport だけ差し替え
xnew.sync.boot(transport.server, World);             // World は無改変
```

`xnew.sync.socketio` が socket.io（server は `io`、client は `socket`）を Transport 形
（`server` / `connect()` / `emit` / `on` / `to(id).emit` / connect・disconnect、id 採番）に合わせる。
**`World` / `Player`（game.js）は一切変えずに**ローカル擬似↔実ネットワークを行き来できる、というのが狙い。

## 3. 入力が反映されるまで（キー → emit → 速度 → 移動）

```js
// client: World の client ブロック（ペイン生成・選択判定も World 内。socket は boot が自動バインド済み）
const clientId = xnew.sync.clientId;                       // ① 自動発番された自分の id
const pane = xnew.nest('<div>'); /* style... */           // ② 画面(ペイン)を World 自身が生成
unit.on('click', () => { session.selected = clientId; });                  // ③ クリックで自分を選択
unit.on('update', () => { /* session.selected === clientId で枠を強調（選択判定は World 内）*/ });
unit.on('window.keydown.wasd window.keyup.wasd window.keydown.arrow window.keyup.arrow', ({ event, vector }) => {
    if (session.selected !== clientId) return;             // ④ 選択中ペインだけ送る
    event.preventDefault();
    xnew.sync.emit('move', vector);                        //    方向ベクトル {x,y} を送信
});

// server: Player の server ブロック（移動ロジックは Player が持つ）
const vel = { x: 0, y: 0 };
xnew.sync.on('move', (clientId, vector) => {               // ④ 受信時に速度を更新（closure を書くだけ）
    if (clientId !== state.clientId) return;
    vel.x = Math.sign(vector.x); vel.y = Math.sign(vector.y);
});
unit.on('update', () => {                                  // ⑤ tick で速度を積分（押しっぱなしで動き続ける）
    state.x += vel.x * SPEED; state.y += vel.y * SPEED;    //    （権威）
});

// World の共通 body（server/client 両方で実行）: 状態の下りは記述不要
// boot(socket, World) に socket（server=transport.server / client=transport.connect()）を渡すと、capture→broadcast / 受信→apply を boot が自動配線する

// client: World の client ブロック（init で参加を通知）
xnew.sync.emit('join');

// server: World の server ブロック（接続管理だけ）
const joined = new Set();
xnew.sync.on('join',       (clientId) => joined.add(clientId));
xnew.sync.on('disconnect', (clientId) => joined.delete(clientId));
unit.on('update', () => { /* joined を見て Player を spawn/despawn（tick 内） */ });
```

キー押下/離しのたびに「方向ベクトル(速度)」を送り、server は受信時に `vel` を更新、tick で積分する
（socket.io-simple の `step(pos, input, dt)` と同じ速度モデル）。`on` ハンドラ内では unit 生成をせず、
`vel` の更新に留める。spawn/despawn だけ update(tick)で行う。ペイン切替時は旧ペインへ `{x:0,y:0}` を送って停止する。

## 4. 接続（presence）— なぜ「生の接続」でなく `join` か

- client は init で `xnew.sync.emit('join')`、`World`(server) は `on('join')` で参加集合（`Set<clientId>`）に加え、
  `on('disconnect')` で除く。update で Player を spawn/despawn する。
- **なぜ `connect` でなく `join` か**: socket.io の websocket は upgrade/probe の過程で、client が使わない
  **idle な接続**を 1 本余分に張ることがある（環境次第。`io.on('connection')` が 2 回発火し片方は切断されない）。
  presence を「生の接続」基準にすると、その idle 接続が**幽霊プレイヤー**になる。`join`（client が自分の
  実ソケットでだけ送る）を基準にすれば、idle/probe 接続は join しないので Player にならない。socket.io-simple も同様に join 方式。

## 5. まとめ（state-sync からの差分）

| 追加要素 | 役割 |
|---|---|
| `xnew.sync.loopback` / `socketio` | transport（擬似 / 実 socket.io）。`boot` に渡すものを変えるだけで切り替え |
| `xnew.sync.boot(socket, ...)` | socket（`transport.server`/`transport.connect()`）を渡すと自動バインド・clientId を自動発番し、状態の下り(capture→broadcast / apply)も自動配線 |
| `xnew.sync.clientId` | 自動発番された自分の id（手動で渡さない） |
| `xnew.sync.emit` / `on` | client→server / server→client のイベント（socket.io と同名・同形、複数 on 可・自動 off） |
| キー入力 | `unit.on('window.keydown.wasd' ...)` で方向ベクトルを取得（WASD/矢印共通、socket.io-simple と同じ書き方） |
| 速度モデル | Player が `on('move')` で速度を更新し、update(tick)で積分（押しっぱなしで移動） |
| presence ベースの spawn | client の `emit('join')` ＋ server の `on('join'/'disconnect')` を見て update で生成/破棄（幽霊回避） |

芯は変わらず **「エンジンは分岐しない。server/client ブロックで必要なハンドラだけ登録する」**。
通信は socket.io と同形のチャンネルに寄せ、コンポーネントを変えずに実ネットワークへ移せる形にした。
