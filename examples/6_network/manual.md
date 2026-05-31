# 6_network — 使い方メモ

xnew + socket.io のリアルタイム対戦サンプル。サーバー権威モデルで、**ロビーで選んだルーム毎に別プロセス**がゲームを処理する。仕組みの詳しい解説は [system.md](system.md) を参照。

## できること

- 名前入力 → ロビーで 4 つのルームから 1 つ選んで参加
- フィールド上の自キャラを矢印キー / WASD で移動（位置はサーバーが計算して全員へ配信）
- ルーム毎に独立したプロセスでゲームが動く（別ルームは互いに見えない）

## 起動

```bash
cd packages/xnew/examples/6_network
npm install      # 初回のみ（express / socket.io / @socket.io/sticky）
npm start        # http://localhost:3000
# 開発中は npm run dev（--watch でファイル変更時に自動再起動）
```

起動ログの目安（master + lobby + room×4 の 6 プロセス）:

```
master listening on http://localhost:3000 (pid=...)
rooms=[r1, r2, r3, r4] — each room runs in its own process
lobby worker ready (pid=...)
room worker 'r1' ready (pid=...) ...
```

> サーバー側（`server/**`）を変更したら **再起動が必要**（静的ファイル `public/**` はリロードのみで反映）。

## 遊び方（1 人でブラウザ 2 窓 = 2 名想定）

キー入力は **フォーカスのある窓だけ** が受け取る。1 人で試すときは「片方を操作 → もう片方で動きを観察」を交互に行う。

1. 2 つの窓（タブで可）で `http://localhost:3000` を開く
2. それぞれ名前を入力（例: A / B）→ ロビーで **同じルーム** を選択
3. 窓1 をクリックしてフォーカス → 矢印 / WASD で A を移動 → **窓2 を見ると A がリアルタイムで動く**（＝同期の確認）
4. 窓2 をクリック → A は自動停止（フォーカスを失うと入力 0 を送る）→ B を移動 → 窓1 で B が動く
5. 「ロビーに戻る」ボタンで再選択へ

## 確認ポイント

- **同期**: 一方を動かすと、もう一方の画面でも同じ位置に動く（自分の位置はクライアントで計算しない）
- **ルーム = 別プロセス**: 右上 status の `room rX · pid N`。同じルームの 2 窓は **同じ pid**、別ルームを選ぶと **別 pid**
- **ルーム分離**: A=ルーム1 / B=ルーム2 では互いに見えない。ロビーの各ルームに人数 `(n人)` が表示され、参加/退出で増減

プロセスを目視したい場合（別ターミナル）:

```bash
pgrep -fl "examples/6_network/server/index.js"   # 6 行（master / lobby / room×4）
```

## 構成

```
6_network/
├── server/
│   ├── index.js   # cluster の分岐点（primary→master / worker→lobby or room）
│   ├── master.js  # :3000 を listen。接続を ?room= で該当ワーカーへ振り分け（ハンドオフ）
│   ├── lobby.js   # 静的配信 + ロビー（ルーム一覧/人数）の socket.io
│   ├── room.js    # ルーム専用 socket.io + xnew（Arena/Player）
│   └── shared.js  # 共通定数・ROOMS 定義
└── public/
    ├── index.html # Tailwind(ブラウザ版) + importmap(xnew)
    ├── js/app.js  # xnew シーン: JoinScene → LobbyScene → GameScene
    └── style は使わず全て Tailwind クラス
```

### 仕組みの要点

- **単一ポート**: 受けるのは master だけ。master は接続確立時に 1 回だけ、ソケットハンドルごと担当ワーカーへ委譲し、以降のフレームには関与しない（フレーム中継なし）。
- **接続は 2 本**（同一ポート）: `lobbySocket`（room 無し→lobby ワーカー）/ `gameSocket`（`query.room` 付き→該当ルームワーカー、`forceNew`）。
- **ゲームロジックは xnew**: room ワーカー内の `Arena` 配下に `Player` を動的ユニットとして追加。各 Player が自分の `update` で移動し、`Arena` が `BROADCAST_HZ`(30Hz) で `state` を配信。
- ルーム人数は room ワーカー → master → lobby ワーカーへ低頻度で通知（フレーム毎ではない）。

## プロトコル

| 方向 | event | payload | 用途 |
| --- | --- | --- | --- |
| C→S(lobby) | `lobby:enter` | — | ルーム一覧を要求 |
| S→C(lobby) | `lobby:rooms` | `{rooms:[{id,name,memberCount}]}` | ルーム一覧/人数 |
| S→C(room) | `welcome` | `{id, field, roomId, pid}` | 自分の id・フィールド・担当プロセス |
| C→S(room) | `join` | `{name}` | フィールドに参加 |
| C→S(room) | `input` | `{x, y}` | 方向ベクトル（各軸 -1/0/+1） |
| S→C(room) | `state` | `{players:[{id,name,color,x,y}]}` | 位置スナップショット（30Hz） |

## つまずいたら

- 何も出ない / Tailwind が効かない → サーバーを再起動（`server/**` 変更後は必須）。`/thirdparty/tailwindcss/playcdn.js` が 200 か確認。
- 動かない → 右上 status が緑（接続済み）か、ブラウザ開発者ツール Console のエラーを確認。
- ポート変更 → `PORT=4000 npm start`。
