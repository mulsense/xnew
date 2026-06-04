# 6_state-sync — 仕組み解説

xnew の状態同期システム(`xnew.config.mode` / `xnew.server` / `xnew.client` / `xnew.sync.*`)の
仕組みを、`loopback/` サンプル(Mover → Enemy)を例に解説する。

> 設計の背景・スコープは [packages/xnew/docs/multiplayer-state-sync-design.md](../../docs/multiplayer-state-sync-design.md) を参照。

## 0. いちばん大きな絵

ポイントは **「ツリーが 2 つある」** こと。

```
[サーバー側] server ツリー          [ブラウザ側] client ツリー
  Mover (ロジック実行)                        Mover (描画だけ)
   └ Enemy (位置を更新)        ───同期──▶      └ Enemy (位置を描画)
```

- **server ツリー** = 「本物」。ゲームロジック(`update`)が動き、状態を持つ。
- **client ツリー** = 「影」。描画(`render`)だけ。状態はサーバーからコピーされてくる。
- この 2 つを毎フレーム **capture(撮影)→ apply(反映)** で繋ぐ。

`loopback/` ではテスト/デモの都合で**両方を 1 つのブラウザ内に同居**させているが、本番では
server がサーバー、client がブラウザに分かれる。仕組みは同じ。

## 1. mode — そのツリーが「本物」か「影」か

各 unit は `_.mode`(`'server'` / `'client'` / `null`)を持つ。設定は
`xnew.config.mode` を**生成前にセット**するだけ:

```js
xnew.config.mode = 'server';
const server = xnew(Mover);                 // この Mover とその子孫 = server
xnew.config.mode = 'client';
const client = xnew(view, View);            // これ以下 = client
xnew.config.mode = null;
```

継承ルール:

```
mode = 親があれば「親の mode ?? config.mode ?? null」、ルートなら null
```

- トップレベルの unit(`server` / `client`)は **その時の `config.mode` を採用**。
- その子孫は **親の mode を継承**(config を後で null に戻しても影響されない)。

だから後から spawn される Enemy も、親 Mover が server なら server になる。

## 2. xnew.server / xnew.client — 1 つの関数で両対応

設計の肝。コンポーネント関数の中を、実行先で分けて書く。

```js
function Enemy(unit, props = {}) {
  const state = xnew.sync.state({ x: 0, y: props.y ?? 0 });  // 【共有】両方で動く

  xnew.server(() => {                       // 【server でだけ動く】
    unit.on('update', () => { state.x += 3; });   // ロジック
    xnew.timeout(() => unit.finalize(), 3000);    // 寿命
  });

  xnew.client(() => {                       // 【client でだけ動く】
    const el = xnew.nest('<div>');                // DOM 生成
    unit.on('render', () => { el.style.left = `${state.x}px`; }); // 描画
  });
}
```

`xnew.server(cb)` / `xnew.client(cb)` の正体は **「mode を見て実行するか決める `xnew.extend`」**:

- `xnew.server`: mode が `'client'` でなければ実行(server か null)
- `xnew.client`: mode が `'server'` でなければ実行(client か null)
- mode=null(単体アプリ)は **両方実行**

**重要な帰結:** server の Enemy は `xnew.server` だけ走る → `update` ハンドラだけ登録され、
DOM は作られない。client の Enemy は `xnew.client` だけ走る → DOM と `render` だけ登録され、
`update` は無い。

→ **エンジン(`Unit`)側は mode で一切分岐していない。** `update` も `render` も全 unit で普通に
回るが、「そのモードに不要なハンドラはそもそも登録されていない」ので何も起きないだけ。
これにより、スプライト等の任意オブジェクト生成を `xnew.client` ブロックに閉じ込められる
(サーバーでは実行されないので仮想化が要らない)。

## 3. xnew.sync.state — 同期される状態

```js
const state = xnew.sync.state({ x: 0, y: 0 });
```

- これが **同期対象の状態オブジェクト**(`unit._.syncState`)。single source of truth。
- server 側では `update` がこれを書き換える(`state.x += 3`)。
- client 側では capture/apply がここに値を**流し込む**。`render` はこれを読んで描く。
- 同じ参照を返すので、`render` のクロージャが掴んだ `state` と apply が書き込む先は同一オブジェクト。

## 4. xnew.sync.register — 「同期する種類」の登録

```js
xnew.sync.register({ Enemy, Mover });   // 名前 ⇄ コンポーネントのマップで一括登録
```

- 名前 ⇄ コンポーネント関数 の対応表(レジストリ)に登録。キー(`'Enemy'`)が同期名、値が関数。
- オブジェクトのショートハンド `{ Enemy }` を使えば、変数名がそのまま同期名になる(名前と関数のズレが起きない)。
- **登録済みコンポーネントから作られた unit だけが「同期対象」**。
- 未登録の unit(`View` / `Driver` / DOM ラッパ)は同期されない = ローカル専用。
- サーバー/ブラウザ**両方で同じ register を呼ぶ**(名前から復元するため)。

## 5. xnew.sync.capture — server ツリーを「撮影」

```js
const tree = xnew.sync.capture(server);
```

server ツリーを深さ優先で歩いて、同期 unit ごとに **SyncNode** を作り配列で返す:

```js
[
  { id: 1, name: 'Mover', parentId: null, state: { spawned: 5 } },
  { id: 2, name: 'Enemy', parentId: 1,    state: { x: 30, y: 26 } },
  { id: 3, name: 'Enemy', parentId: 1,    state: { x: 9,  y: 8  } },
]
```

- `id`: 同期 unit に一意採番(初回 capture 時に付与し以降固定)。
- `parentId`: **最も近い同期祖先の id**(間のローカル unit は飛ばす)。これで木構造を表現。
- `state`: `syncState` の浅いコピー。
- **pre-order(親が先)** なのが apply で効く。

## 6. xnew.sync.apply(reconcile)— client ツリーを「差分で」更新

```js
xnew.sync.apply(client, tree);
```

client ルートごとに `Map<id, Unit>` を保持し、受け取った `tree` と突き合わせて差分だけ適用:

- **create**: map に無い id → `name` からコンポーネントを引き、`parentId` の client unit の下に
  `xnew()` で生成 → state を流し込む → map に登録。(pre-order なので親が必ず先に存在)
- **update**: map にある id → 変わったフィールドだけ state に上書き。
- **remove**: 今回の tree に無い id → その client unit を `finalize()` して map から削除。

→ **ゼロから作り直すのではなく増分のみ**。サーバーで Enemy が消えれば次の capture から外れ、
apply が client からも消す。create で作る client unit は **mode を渡さない**(親 client を継承)
ので、自動的に `xnew.client` だけが走り DOM が作られる。

## 7. 毎フレームの流れ(全体)

`loopback/` の Driver:

```js
xnew(function Driver(unit) {
  unit.on('update', () => {
    const tree = xnew.sync.capture(server);  // ① 本物を撮影
    xnew.sync.apply(client, tree);           // ② 影に反映
  });
});
```

xnew のティッカーは毎フレーム `start → update → render` を全ツリーに回す:

```
1 フレーム:
  start  : 新しい unit を started にする
  update : ・server の Enemy → state.x += 3（ロジック）
           ・Driver → capture(server) → apply(client)（同期）
  render : ・client の Enemy → state を読んで el を配置（描画）
           （server の Enemy は render ハンドラが無いので何もしない）
```

## 8. Mover → Enemy を追ってみる

1. 起動: `server = xnew(Mover)`(server)。Mover の `xnew.server` が `xnew.interval` をセット。
2. ある frame の update で interval 発火 → server に Enemy 生成(update=移動 と timeout=寿命 を持つ。DOM 無し)。
3. 同 frame の Driver.update で `capture(server)` → Mover + Enemy の SyncNode 配列。
4. `apply(client)` → client 側に Mover の下へ Enemy を生成(DOM と render を持つ)。state も流し込み。
5. 以降の frame: server Enemy が `state.x` を増やす → capture に乗る → apply で client Enemy の state 更新 → render が右へ動かす。
6. 3 秒後: server Enemy の timeout が `finalize` → capture から消える → apply が client Enemy を finalize。画面から消える。

## 9. まとめ

| 要素 | 役割 |
|---|---|
| `xnew.config.mode` | これから作るツリーが server か client か |
| `_.mode`(継承) | 各 unit が自分はどちら側かを知る |
| `xnew.server` / `xnew.client` | 1 関数の中で実行先別にコードを分ける(mode 条件付き extend) |
| `xnew.sync.state` | 同期される状態(single source of truth) |
| `xnew.sync.register` | 同期する種類を名前登録(両ランタイム) |
| `xnew.sync.capture` | server ツリー → SyncNode 配列(撮影) |
| `xnew.sync.apply` | SyncNode 配列 → client ツリーへ差分反映 |

設計の芯は **「エンジンは分岐しない。`server`/`client` ブロックで”その環境に必要なハンドラだけ
登録する”ことで、update はサーバーだけ・render はクライアントだけに自然に分かれる」** という点。

## 既知の課題（未対処）

- **生成フレームの 1 フレーム遅延**: client unit は生成された frame ではまだ `'started'` でないため
  `render` が 1 回遅れる。さらに reconcile は「本体実行 → state 適用」の順なので、本体実行時点の
  state は既定値(0,0)。この 2 つが重なり、Enemy 生成時に赤丸が一瞬 (0,0) に出てから所定位置へ移る。
  （対処は後日。`apply` で本体実行前に state を渡す/生成 frame で初期描画する等が候補。）
