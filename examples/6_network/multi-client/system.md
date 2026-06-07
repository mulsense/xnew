# multi-client — 仕組み解説（2 client + 1 server / socket.io 互換チャンネル）

各 client が自機を操作する擬似マルチプレイ。通信は **socket.io 互換の transport** だけに依存して書くので、
**同じゲーム本体のまま 2 通りの起動**ができる：

| 版 | エントリ | transport | server の場所 | 起動 |
|---|---|---|---|---|
| **browser-only** | `index-browser-only.html` | `xnew.sync.loopback()` | ブラウザ内（擬似） | ファイルを開くだけ |
| **socket.io（実ネット）** | `index.html` + `server.js` | socket.io アダプタ | Node プロセス | `npm install && npm start` → 複数タブで開く |

**共有ファイル（両版で無改変）**: `game.js`（`World`/`Player`）だけ。socket.io アダプタはライブラリ同梱
（`xnew.sync.socketio(io/socket)`）なので例には無い。
**差し替え点はただ 1 つ**: `xnew.sync.use(...)` に渡す transport（と、server を同一プロセスで boot するか別プロセスにするか）。

> server→client 同期（`xnew.sync.boot` / `xnew.server` / `xnew.client` / `xnew.sync.state|register|mirror`）
> の基礎は [../state-sync/system.md](../state-sync/system.md) を参照。

## 0. 全体像 — 2 本のチャンネルを transport が運ぶ

```
[server World]                              [client World]（×人数）
  presence(on join / disconnect)             自分のペインを生成 / init で emit('join')
  → Player を spawn/despawn                   描画（render）
  Player: on('move')→vel / update で移動 ──sync(下り) = mirror──▶ apply
                         ▲
                         └────move(上り)──── 選択中ペインが emit('move', vector)
```

- **入力の上り** … client は `unit.on('window.keydown.wasd' ...)` でキー入力を方向ベクトルにし、
  **クリックで選択中のペイン**だけが `xnew.sync.emit('move', vector)` を送る。server の `Player` は
  `xnew.sync.on('move', ...)` で速度を更新し、`update` で積分して動く（権威）。
- **状態の下り** … `World` で `xnew.sync.mirror(unit)` を 1 回呼ぶだけ。server なら毎 update で capture→broadcast、
  client なら受信して apply、を mirror が中で配線する（`capture`/`apply`/`'sync'` の合成は隠蔽）。
- **接続管理** … client は init で `emit('join')`、`World`(server) は `on('join'/'disconnect')` の集合を見て `update` 内で
  Player を spawn/despawn（生の接続でなく明示 join。後述の理由で幽霊プレイヤーを防ぐ）。
- これら（move / sync / connect）の実体は transport が運ぶ。loopback なら同一プロセス内、socket.io なら実ネット。

## 1. イベントチャンネル API（socket.io 互換 transport）

| API | 場所 | socket.io 対応 | 役割 |
|---|---|---|---|
| `xnew.sync.loopback()` | 起動コード | （socket.io 本体に差し替え） | `{ server, connect(clientId?) }` を返すインメモリ transport |
| `xnew.sync.socketio(io/socket)` | 起動コード | io / io() をラップ | socket.io を Transport 形へ橋渡し（実ネット用。import 依存なし） |
| `xnew.sync.use(transport)` | 起動コード | （io / io() の用意） | 以後の `boot` が socket を自動バインドする transport を登録 |
| `xnew.sync.mirror(unit)` | コンポーネント body | （`io.emit` / `socket.on`） | 状態の下りを 1 行で配線（server=capture→broadcast / client=apply） |
| `xnew.sync.clientId` | client コンポーネント | `socket.id` | このルートの自動発番 id（手動で渡さない）。server では undefined |
| `xnew.sync.emit(event, payload)` | client（init / handler） | `socket.emit(event, payload)` | server へ送信（server 側で呼ぶと broadcast） |
| `xnew.sync.on(event, handler)` | コンポーネント init | `socket.on(event, cb)` | 受信。server は `(clientId, payload)`、client は `(payload)`。1 イベントに複数登録可（unit finalize で自動 off） |

`xnew.sync.state` / `register`（同期する state と種類の宣言）と、`capture` / `apply`（mirror を使わず手動配信する低レベル）は
[../state-sync/system.md](../state-sync/system.md) 参照。このサンプルでは下りは `mirror` に任せる。

ポイント:
- `emit` は **`Unit.currentUnit` が立っている場所**（コンポーネント本体や `unit.on(...)` のハンドラ内）で呼ぶと、
  ルートにバインドした socket を自動解決する（ハンドラ実行中は `Unit.scope` が currentUnit を復元するため）。
  だから入力送信は `unit.on('window.keydown.wasd' ..., () => xnew.sync.emit(...))` のように xnew のイベントハンドラ内に置ける。
- **キー入力は xnew の window イベントで受ける**: `unit.on('window.keydown.wasd window.keyup.wasd window.keydown.arrow
  window.keyup.arrow', ({ event, vector }) => ...)`。`vector` は `{x,y} ∈ {-1,0,1}`（WASD と矢印で同じ形）。
  socket.io-simple の `public/app.js` と同じ書き方。
- **`on`（sync）のハンドラは tick の外で走る**（loopback では emit 中、本物の socket.io ではネットワークコールバック）。
  なので中で **unit 生成/finalize はしない**。`xnew.sync.state`/closure で掴んだ変数を更新するに留める。
  `xnew.sync.on` は登録元の unit が finalize されると自動で off される。

## 2. 2 つの起動 — 切り替えは transport だけ

共有コード（`game.js`）は bare specifier `@mulsense/xnew` を import する。
ブラウザは importmap（`<script type="importmap">` で `@mulsense/xnew` → ローカルビルド）、Node は `node_modules`
が解決する。だから**同じ `game.js` がブラウザでも Node でも動く**（socket.io-simple と同じやり方）。
DOM は xnew 記法（`xnew.nest('<div class>')` / `xnew('<div class>', ...)`）＋ Tailwind（Play CDN）。

**browser-only（`index-browser-only.js`）**: loopback を use して server も client も同一プロセスで boot。
```js
import { World } from './game.js';
xnew.sync.use(xnew.sync.loopback());            // ← transport = loopback
xnew.sync.boot('server', World);                     // 擬似サーバー
xnew.sync.boot('client', stage, World);              // 擬似クライアント（左）
xnew.sync.boot('client', stage, World);              // 擬似クライアント（右）
```

**socket.io（実ネット）**: transport を `xnew.sync.socketio(...)` に差し替えるだけ。
```js
// client（index.js / ブラウザ）: 接続後に use → client を boot
const socket = window.io();
socket.once('connect', () => {
  xnew.sync.use(xnew.sync.socketio(socket));   // ← transport だけ差し替え
  xnew.sync.boot('client', stage, World);           // World は無改変
});

// server（server.js / Node）
xnew.sync.use(xnew.sync.socketio(io));         // ← transport だけ差し替え
xnew.sync.boot('server', World);                    // World は無改変
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

// World の共通 body（server/client 両方で実行）: 状態の下りはこの 1 行だけ
xnew.sync.mirror(unit);   // server なら capture→broadcast、client なら受信→apply を中で配線

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

## 5. 自機の強調表示

client は **全 Player** を描く。「自機（この view の持ち主）」だけ黒枠にするため、`World` の client ブロックが
`unit.viewerId = xnew.sync.clientId` をルートに刻み、`Player` の render が
`unit.parent?.viewerId === state.clientId` で判定する（Player は同期で client ルート直下に作られる）。

## 6. まとめ（state-sync からの差分）

| 追加要素 | 役割 |
|---|---|
| `xnew.sync.loopback` / `socketio` | transport（擬似 / 実 socket.io）。`use()` に渡すものを変えるだけで切り替え |
| `xnew.sync.use` | transport を登録 → `boot` が socket を自動バインド・clientId を自動発番 |
| `xnew.sync.mirror` | 状態の下りを 1 行で配線（server=broadcast / client=apply。capture/apply を隠蔽） |
| `xnew.sync.clientId` | 自動発番された自分の id（手動で渡さない） |
| `xnew.sync.emit` / `on` | client→server / server→client のイベント（socket.io と同名・同形、複数 on 可・自動 off） |
| キー入力 | `unit.on('window.keydown.wasd' ...)` で方向ベクトルを取得（WASD/矢印共通、socket.io-simple と同じ書き方） |
| 速度モデル | Player が `on('move')` で速度を更新し、update(tick)で積分（押しっぱなしで移動） |
| presence ベースの spawn | client の `emit('join')` ＋ server の `on('join'/'disconnect')` を見て update で生成/破棄（幽霊回避） |

芯は変わらず **「エンジンは分岐しない。server/client ブロックで必要なハンドラだけ登録する」**。
通信は socket.io と同形のチャンネルに寄せ、コンポーネントを変えずに実ネットワークへ移せる形にした。
