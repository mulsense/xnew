# 6_network — 仕組み解説

このサンプルが「どう動いているか」を、図とともになるべくやさしく説明します。
使い方は [manual.md](manual.md) を参照。

---

## 1. 一言でいうと

> **サーバーが正しい位置を計算し、ブラウザはそれを描くだけ**。
> ルームは socket.io の「room（部屋分け）」機能で表現し、**1 つの Node プロセス**が複数ルームを捌く。

「ブラウザは入力を送る／結果を描く」「サーバーが本当の状態を持つ」分担を
**サーバー権威モデル**と呼びます。チート耐性が高く、全員の画面が一致しやすいのが利点です。

---

## 2. 全体像

ルームは **動的**。起動直後は 0 個で、ロビーで作成すると増え、空室になると破棄されます。
すべて 1 プロセスの中の「論理ルーム」です。

```
   ブラウザ                         サーバー（1 つの Node プロセス :3000）
 ┌───────────┐                ┌──────────────────────────────────────────┐
 │  画面(xnew) │                │  express（静的配信: HTML/JS/CSS）           │
 │           │  ① 接続(ロビー) │  socket.io                                 │
 │ lobbySocket├───────────────▶│   ├─ "lobby"  … ルーム一覧 / 作成           │
 │           │                │   ├─ room "r1" ── Room(xnew) ── game(plugin) │
 │ gameSocket ├───────────────▶│   ├─ room "r2" ── Room(xnew) ── game(plugin) │
 └───────────┘  ② 接続(room=rX) │   └─ room "r3" ── Room(xnew) ── game(plugin) │
                               │        各 Room を 1 つのティッカーで更新       │
                               │        ③ 30Hz で io.to(rX) に sync を配信    │
                               └──────────────────────────────────────────┘
```

- **express**：HTML / JS / CSS（と xnew・Tailwind）を配信。
- **socket.io**：接続を「ロビー」か「あるルーム」に振り分ける（同じプロセス内の room 機能）。
- **Room（xnew）＋ game プラグイン**：ルーム 1 つ分。Room がループを回し、game プラグイン（`games/*.js`）がプレイヤーの状態と位置計算を持つ。

---

## 3. サーバー権威モデル（位置の流れ）

ブラウザは「押している方向」だけを送り、位置計算はしません。サーバーが毎フレーム位置を更新し、
一定間隔でそのルームの全員に配る。届いた位置をブラウザはそのまま描きます。

```
[ブラウザ]  キー入力 → 方向ベクトル {x,y} ──(input)──▶ [サーバー: そのルームの server ツリー]
                                                        │ Player unit が毎フレーム位置を計算
                                                        │ (サーバーが本当の位置を持つ)
                                                        │ xnew.sync.capture(World) で state tree 化
[ブラウザ]  client ツリーに apply して描画 ◀──(sync: state tree)── 30Hz ┘
```

- 入力は「変わったときだけ」送る（押しっぱなしは 1 回送れば十分）。
- 状態は xnew の同期システム（`xnew.sync.*`）で運ぶ。サーバーが `capture` した state tree を配り、
  ブラウザは `apply` で差分反映する（仕組みは [state-sync サンプル](../state-sync/system.md) と同型で、
  ループバックではなく socket.io が橋渡しする）。

---

## 4. 論理ルーム（socket.io の room 機能）

ルームを別プロセスに分けず、**socket.io の room** で区切ります。

- ゲーム接続は、ハンドシェイクの `?room=rX` を見て `socket.join('rX')` でそのルームに入る。
- 配信は `io.to('rX').emit('state', …)` とすると、**そのルームに join 済みの socket にだけ**届く。
- だから別ルームのプレイヤーは互いに見えない（同じプロセス内でも配信先が分かれる）。

```
io.to('r1').emit('sync', …)   → r1 に居る人だけに届く
io.to('r2').emit('sync', …)   → r2 に居る人だけに届く
```

ロビーも 1 つの room（`"lobby"`）として扱い、ルーム一覧の更新を `io.to('lobby')` で配信します。

---

## 5. ルームの動的な作成 / 破棄

- ロビーで `room:create` → サーバーが台帳（`roomId → Room`）に 1 件追加し、その都度 Room（＋game プラグイン）を生成。作成者へ `room:created {roomId}` を返す。
- ルームの人数 = そのルームに参加中のプレイヤー数。
- 最後の 1 人が抜けて **空室**になったら、その Room を破棄（xnew ループを finalize）して台帳から削除。
- 作成直後に誰も入らない部屋は、一定時間（grace）後に掃除（最初の接続で解除）。

---

## 6. ゲームはプラグイン、ループは xnew

ゲーム固有ロジックは **プラグイン**として分離し、ネット層（汎用）から差し込みます。

```
ネット層(汎用)                         ゲームプラグイン (games/*.js, server/browser 共有)
─────────────                         ──────────────────────────────────────────
index.js   接続の振り分け / ロビー        id / name / create()
registry.js ルーム台帳                   create() が返すインスタンス:
room.js    Room: 参加管理 + ループ駆動 ─▶   onJoin / onLeave / onInput
           （xnew の update）              capture() / dispose() / welcome()
                                          共有コンポーネント: World / Player
```

- **プラグインの契約**（`games/*.js` が export）：`id` / `name` / `create()` と、共有コンポーネント `World` / `Player`。`create()` は server ツリーを `xnew.boot('server', World)` でブートし、`onJoin`（Player を spawn）/ `onInput`（入力 ref を更新）/ `onLeave`（finalize）/ `capture()`（`xnew.sync.capture`）/ `dispose()` を実装する。**ゲームを増やすのは `games/` にファイルを足すだけ**。
- **共有コンポーネント**：`Player` は1つの関数で `xnew.server`（移動計算）と `xnew.client`（`<div>` アバター描画）を書き分ける。server は直接 import、ブラウザは `/games/<gameType>.js` を動的 import して同じ `Player` を `register` する（名前から復元するため両ランタイムで同名登録）。
- **ループは xnew**：プレイヤー位置は server の Player unit がグローバルティッカーの `update` で自走する。`room.js` の `RoomLoop` は 30Hz に間引いて `game.capture()` をそのルームへ `sync` 配信するだけ。ブラウザは受信した state tree を `xnew.sync.apply(clientWorld, tree)` で差分反映する。
- 最初のプラグイン `games/metaverse.js` がアバター移動（方向ベクトル → 位置計算）を実装している。

全ルームの `RoomLoop` は **1 つのグローバルティッカー**で更新されます（単一プロセス）。

> サーバーもブラウザも、毎フレームの処理は同じ xnew の `update` / `render` イベントで回しています
> （サーバー = ループ駆動・位置計算、ブラウザ = 描画）。

---

## 7. なぜ接続が 2 本あるのか

ブラウザは socket を 2 本張ります（どちらも同じ :3000）。

| 接続 | 役割 |
| --- | --- |
| `lobbySocket`（room 無し） | ルーム一覧・人数の受信、ルーム作成 |
| `gameSocket`（`?room=rX`） | そのルームでの入力送信・位置受信 |

サーバーは接続時の `?room=` の有無で「ロビー扱い」か「ゲーム（room へ join）」かを決めます。
ルームを変えるときは `gameSocket` を張り直します。

---

## 8. 通しの流れ（作成〜参加〜移動）

```
1. ページを開く     ブラウザ ──GET /──▶ express（HTML 等を返す）
2. 名前入力 → ロビー  lobbySocket ──▶ "lobby" に join ──(lobby:rooms)──▶ ルーム一覧（最初は空）
3. ルーム作成       lobbySocket ──(room:create)──▶ Room(＋game) を生成・台帳に追加
                    ──(room:created: roomId)──▶ 作成者へ。一覧は lobby に再配信
4. ルームに入る     gameSocket(?room=rX) ──▶ socket.join('rX') ──(welcome)──▶ join 送信
5. プレイ          キー ──(input {x,y})──▶ rX の game（位置計算） ──(sync: state tree 30Hz)──▶ io.to('rX')
6. 退出（ロビーへ）  gameSocket を閉じる → プレイヤー除去 → 空室なら Room を破棄して台帳から削除
```

ブラウザ側の画面遷移（xnew の Scene）：

```
JoinScene（名前）── unit.change ──▶ LobbyScene（作成/選択）── unit.change ──▶ GameScene（プレイ）
```

---

## 9. イベント早見

| 方向 | event | payload | 意味 |
| --- | --- | --- | --- |
| C→S(lobby) | `lobby:enter` | — | ルーム一覧をください |
| C→S(lobby) | `room:create` | `{name}` | ルームを作成して |
| S→C(lobby) | `lobby:rooms` | `{rooms:[{id,name,memberCount}]}` | ルーム一覧・人数 |
| S→C(lobby) | `room:created` | `{roomId}` | 作成者へ、入るべきルーム id |
| S→C(lobby) | `room:error` | `{message}` | 作成失敗（上限超過など） |
| S→C(room) | `welcome` | `{id, field, roomId, roomName, gameType}` | 自分の id・フィールド・ルーム・ゲーム種別 |
| C→S(room) | `join` | `{name}` | 参加します |
| C→S(room) | `input` | `{x, y}` | 方向（各軸 -1/0/+1） |
| S→C(room) | `sync` | `SyncNode[]`（state tree） | `xnew.sync.capture` した状態ツリー（30Hz）。ブラウザは `apply` で反映 |

---

## 10. まとめ

- **サーバー権威**：位置はサーバーが計算、ブラウザは送る／描くだけ。
- **状態同期は xnew.sync**：サーバーが `capture` した state tree を `sync` で配り、ブラウザは `apply` で差分反映。`Player` は server/client 共有の1コンポーネント（state-sync 思想を socket.io 上で実証）。
- **論理ルーム**：ルームは socket.io の room。配信を `io.to(roomId)` で絞るので別ルームは混ざらない。
- **プラグイン方式**：ゲーム固有ロジックは `games/*.js` に分離（差し込み）。ネット層はゲーム非依存。
- **単一プロセス**：express + socket.io + 全ルームの Room(xnew ループ)＋game が 1 プロセスで動く（シンプル）。
- **xnew で統一**：サーバー（位置計算）もブラウザ（描画）も、同じ xnew の仕組みでループを回す。

> 規模が大きくなったら、この単一プロセスを複数台に増やし「ルーム → インスタンス」を振り分ける
> 構成へ広げられます（1 ルームは 1 インスタンスに閉じるので、跨ぎ配信は不要）。
