# 6_network — 使い方メモ

xnew + socket.io のリアルタイム対戦サンプル。サーバー権威モデルで、**1 つの Node プロセス**が
socket.io の room 機能で複数の「論理ルーム」を捌く。仕組みの詳しい解説は [system.md](system.md) を参照。

## できること

- 名前入力 → ロビーで **ルームを作成**（名前を指定）。デフォルトはルーム 0 個
- 誰かが作ったルームはロビー一覧に表示され、**入室**できる
- フィールド上の自キャラを矢印キー / WASD で移動（位置はサーバーが計算して全員へ配信）
- ルームは動的（作成で増え、空室になると破棄。別ルームは互いに見えない）

## 起動

```bash
cd packages/xnew/examples/6_network/socket.io-simple
npm install      # 初回のみ（express / socket.io / @mulsense/xnew は file: でローカル参照）
npm start        # http://localhost:3000
npm test         # 移動計算 step() のユニットテスト（node --test）
# 開発中は npm run dev（--watch でファイル変更時に自動再起動）
```

> `@mulsense/xnew` はこのリポジトリの xnew パッケージを `package.json` の `file:` 依存で参照する。
> サーバー・ブラウザ（importmap）とも同一ビルド `dist/xnew.mjs` を使うため、共有ゲームモジュール
> （`server/games/metaverse.js`）を両ランタイムで import できる。xnew 本体（`src/`）を変更した場合は
> `packages/xnew` で `npm run build` して dist を再生成すること。

起動ログ:

```
[xnew/6_network] listening on http://localhost:3000
[xnew/6_network] single process, logical rooms (broadcast=30Hz)
```

> サーバー側（`server/**`）を変更したら **再起動が必要**（静的ファイル `public/**` はリロードのみで反映）。

## 遊び方（1 人でブラウザ 2 窓 = 2 名想定）

キー入力は **フォーカスのある窓だけ** が受け取る。1 人で試すときは「片方を操作 → もう片方で動きを観察」を交互に行う。

1. 2 つの窓（タブで可）で `http://localhost:3000` を開く
2. それぞれ名前を入力（例: A / B）
3. 窓1 でルーム名を入れて **作成** → 窓1 はそのルームに入る。窓2 のロビー一覧にそのルームが現れる
4. 窓2 でそのルームに **入室** → 同じルームに 2 人
5. 窓1 をクリックしてフォーカス → 矢印 / WASD で A を移動 → **窓2 を見ると A がリアルタイムで動く**（＝同期の確認）
6. 窓2 をクリック → A は自動停止（フォーカスを失うと入力 0 を送る）→ B を移動 → 窓1 で B が動く
7. 「ロビーに戻る」ボタンで再選択へ（全員が抜けたルームは自動で消える）

## 確認ポイント

- **同期**: 一方を動かすと、もう一方の画面でも同じ位置に動く（自分の位置はクライアントで計算しない）
- **ルーム分離**: 別々のルームに入ると互いに見えない（配信はそのルームの socket.io ルームにだけ）
- **動的なルーム**: ロビーの各ルームに人数 `(n人)` が表示され、参加/退出で増減。全員退出でルームは消える

## 構成

```
6_network/socket.io-simple/
├── server/
│   ├── index.js      # express(静的配信) + socket.io + ロビー/ゲームの配線
│   ├── config.js     # ネット足回りの設定 (PORT / BROADCAST_HZ / 上限・grace)
│   ├── registry.js   # ルーム台帳 (roomId→Room) と変化通知
│   ├── room.js       # Room: 参加管理・ループ駆動(xnew)・配信。ゲームは plugin に委譲
│   └── games/        # ★ゲームプラグイン (ファイルを足すだけで増やせる)
│       ├── index.js  #   *.js を動的読込 → gameType レジストリ
│       └── metaverse.js  # 最初のプラグイン: アバター移動
└── public/
    ├── index.html # Tailwind(ブラウザ版) + importmap(xnew)
    ├── app.js     # xnew シーン: JoinScene → LobbyScene → GameScene
    └── style は使わず全て Tailwind クラス
```

### 仕組みの要点

- **単一プロセス**: express の静的配信と socket.io が同じプロセス・同じポート(:3000)。
- **論理ルーム**: ルームは socket.io の room。ゲーム接続は `socket.join(roomId)` でそのルームに入り、配信は `io.to(roomId).emit('sync', …)` でそのルームだけに届く。
- **状態同期は xnew.sync**: ルームごとに server ツリー（`xnew.sync.boot(socket, World)`）と client ツリー（ブラウザの `xnew.sync.boot(socket, World)`）を持つ。`Player` は **server/client 共有の1コンポーネント**で、`xnew.server` ブロックが移動を計算し `xnew.client` ブロックが `<div>` アバターを描く。サーバーは `xnew.sync.capture(World)` した state tree を配り、ブラウザは `xnew.sync.apply(clientWorld, tree)` で差分反映する。
- **プラグイン方式**: ゲーム固有ロジックは `games/*.js` に分離（契約: `id`/`name`/`create()` → `onJoin/onLeave/onInput/capture/dispose/welcome`）。ネット層（`room.js`/`registry.js`/`index.js`）はゲーム非依存。共有モジュールは server が直接 import し、ブラウザは `/games/<gameType>.js` を動的 import する。ゲームを増やす＝`games/` にファイルを足すだけ。
- **ループは xnew**: プレイヤーの位置更新は server の Player unit がグローバルティッカーの `update` で自走。`room.js` の `RoomLoop` は `BROADCAST_HZ`(30Hz) に間引いて `capture` → `sync` 配信するだけ。
- **ルームは動的**: `room:create` で台帳に追加（その都度プラグインの `create()` を生成）、空室になったら破棄。
- ルーム人数 = そのルームに参加中のプレイヤー数。

## プロトコル

| 方向 | event | payload | 用途 |
| --- | --- | --- | --- |
| C→S(lobby) | `lobby:enter` | — | ルーム一覧を要求 |
| C→S(lobby) | `room:create` | `{name}` | ルーム作成 |
| S→C(lobby) | `lobby:rooms` | `{rooms:[{id,name,memberCount}]}` | ルーム一覧/人数 |
| S→C(lobby) | `room:created` | `{roomId}` | 作成者へ、入るべきルーム id |
| S→C(lobby) | `room:error` | `{message}` | 作成失敗（上限超過など） |
| S→C(room) | `welcome` | `{id, field, roomId, roomName, gameType}` | 自分の id・フィールド・ルーム・ゲーム種別 |
| C→S(room) | `join` | `{name}` | フィールドに参加 |
| C→S(room) | `input` | `{x, y}` | 方向ベクトル（各軸 -1/0/+1） |
| S→C(room) | `sync` | `SyncNode[]`（state tree） | `xnew.sync.capture` した状態ツリー（30Hz）。ブラウザは `apply` で反映 |

## つまずいたら

- 何も出ない / Tailwind が効かない → サーバーを再起動（`server/**` 変更後は必須）。`/thirdparty/tailwindcss/playcdn.js` が 200 か確認。
- 動かない → 右上 status が緑（接続済み）か、ブラウザ開発者ツール Console のエラーを確認。
- ポート変更 → `PORT=4000 npm start`。
