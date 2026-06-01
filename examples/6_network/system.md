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
                               │        ③ 30Hz で io.to(rX) に state を配信   │
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
[ブラウザ]  キー入力 → 方向ベクトル {x,y} ──(input)──▶ [サーバー: そのルームの game]
                                                        │ 毎フレーム位置を計算
                                                        │ (サーバーが本当の位置を持つ)
[ブラウザ]  canvas に描画 ◀──(state: そのルーム全員の位置)── 30Hz ┘
```

- 入力は「変わったときだけ」送る（押しっぱなしは 1 回送れば十分）。
- 位置は整数に丸めて配信（帯域節約）。

---

## 4. 論理ルーム（socket.io の room 機能）

ルームを別プロセスに分けず、**socket.io の room** で区切ります。

- ゲーム接続は、ハンドシェイクの `?room=rX` を見て `socket.join('rX')` でそのルームに入る。
- 配信は `io.to('rX').emit('state', …)` とすると、**そのルームに join 済みの socket にだけ**届く。
- だから別ルームのプレイヤーは互いに見えない（同じプロセス内でも配信先が分かれる）。

```
io.to('r1').emit('state', …)   → r1 に居る人だけに届く
io.to('r2').emit('state', …)   → r2 に居る人だけに届く
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
ネット層(汎用)                         ゲームプラグイン (games/*.js)
─────────────                         ──────────────────────────
index.js   接続の振り分け / ロビー        id / name / create()
registry.js ルーム台帳                   create() が返すインスタンス:
room.js    Room: 参加管理 + ループ駆動 ─▶   onJoin / onLeave / onInput
           （xnew の update）              update(dt) / snapshot() / welcome()
```

- **プラグインの契約**（`games/*.js` が export）：`id` / `name` / `create()`。`create()` の返すインスタンスが `onJoin` / `onInput` / `update(dt)` / `snapshot()` などを実装する（フレームワーク非依存）。**ゲームを増やすのは `games/` にファイルを足すだけ**。
- **ループは xnew**：`room.js` の `RoomLoop` が xnew の `update` で毎フレーム `game.update(dt)` を呼び、30Hz に間引いて `game.snapshot()` をそのルームへ配信する。
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
5. プレイ          キー ──(input {x,y})──▶ rX の game（位置計算） ──(state 30Hz)──▶ io.to('rX')
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
| S→C(room) | `welcome` | `{id, field, roomId, roomName}` | 自分の id・フィールド・ルーム |
| C→S(room) | `join` | `{name}` | 参加します |
| C→S(room) | `input` | `{x, y}` | 方向（各軸 -1/0/+1） |
| S→C(room) | `state` | `{players:[{id,name,color,x,y}]}` | そのルーム全員の位置（30Hz）|

---

## 10. まとめ

- **サーバー権威**：位置はサーバーが計算、ブラウザは送る／描くだけ。
- **論理ルーム**：ルームは socket.io の room。配信を `io.to(roomId)` で絞るので別ルームは混ざらない。
- **プラグイン方式**：ゲーム固有ロジックは `games/*.js` に分離（差し込み）。ネット層はゲーム非依存。
- **単一プロセス**：express + socket.io + 全ルームの Room(xnew ループ)＋game が 1 プロセスで動く（シンプル）。
- **xnew で統一**：サーバー（位置計算）もブラウザ（描画）も、同じ xnew の仕組みでループを回す。

> 規模が大きくなったら、この単一プロセスを複数台に増やし「ルーム → インスタンス」を振り分ける
> 構成へ広げられます（1 ルームは 1 インスタンスに閉じるので、跨ぎ配信は不要）。
