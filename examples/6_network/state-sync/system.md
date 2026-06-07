# 6_state-sync — 仕組み解説

xnew の状態同期システム(`xnew.sync.boot` / `xnew.server` / `xnew.client` / `xnew.sync.*`)の
仕組みを、`loopback/` サンプル(Mover → Enemy、Enemy は基底 Actor を `xnew.extend`)を例に解説する。

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
**`xnew.sync.boot(mode, ...args)`** で行う(mode を選ぶ唯一の公開手段)。その mode で `xnew(...args)` を
生成し、終わると mode が前の値へ自動で戻る:

```js
const server = xnew.sync.boot('server', Main);   // この Main とその子孫 = server
const client = xnew.sync.boot('client', Main);   // この Main とその子孫 = client
```

同じ `Main` を mode を切り替えて 2 回生成する。`Main` 自身は同期対象ではなく、各ツリーの
ローカルなルートで、中で `xnew.server`/`xnew.client` に分岐する(server ではロジックツリーを
生成、client では描画先 `#view` を用意するだけ)。

```js
function Main() {
  xnew.server(() => { xnew(Mover); });                       // server: ロジックツリー
  xnew.client(() => { xnew.nest(document.getElementById('view')); });  // client: 描画先
}
```

```js
function Main() {
  xnew.server(() => { xnew(Mover); });                       // server: ロジックツリー
  xnew.client(() => { xnew.nest(document.getElementById('view')); });  // client: 描画先
}
```

継承ルール:

```
mode = 親があれば「親の mode ?? 現在の mode ?? null」、ルートなら null
```

- トップレベルの unit(`server` / `client` の両 `Main`)は **`xnew.sync.boot` が適用中の mode を採用**。
- その子孫は **親の mode を継承**(boot を抜けて mode が戻っても影響されない)。

だから後から spawn される Enemy も、親 Mover(さらに親 Main)が server なら server になる。

## 2. xnew.server / xnew.client — 1 つの関数で両対応

設計の肝。コンポーネント関数の中を、実行先で分けて書く。サンプルでは共有部分(位置と描画)を
基底 `Actor` に切り出し、`Enemy` が `xnew.extend(Actor)` で取り込む(→ §3a)。

```js
// 基底: 位置 {x,y} を宣言し、client で要素を nest して位置を反映する共有部分
function Actor(unit, props = {}) {
  const pos = xnew.sync.state({ x: 0, y: props.y ?? 0 });   // 【共有】両方で動く

  xnew.client(() => {                       // 【client でだけ動く】
    const el = xnew.nest('<div>');                          // DOM 生成
    unit.on('render', () => {                               // 位置の反映は基底の責務
      el.style.left = `${pos.x}px`; el.style.top = `${pos.y}px`;
    });
  });
}

// 拡張: Actor を取り込み、自分の synced state(hp) と挙動を足す
function Enemy(unit, props = {}) {
  xnew.extend(Actor, props);                  // 基底: 位置 {x,y} の宣言 + 描画
  const state = xnew.sync.state({ hp: 3 });   // 拡張: hp を追加宣言(返り値は merged な _.state = {x,y,hp})

  xnew.server(() => {                         // 【server でだけ動く】
    unit.on('update', () => { state.x += 3; });             // 位置(基底が宣言)を更新
    xnew.interval(() => { if (--state.hp <= 0) unit.finalize(); }, 1000);  // hp(拡張が宣言)を更新
  });

  xnew.client(() => {                         // 【client でだけ動く】
    const el = unit.element;                                // 基底 Actor が nest した要素
    unit.on('render', () => { el.style.background = ['#888','#e33','#f90','#3c3'][state.hp] ?? '#888'; });  // 緑=3→橙=2→赤=1
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

- これが **同期対象の状態オブジェクト**(`unit._.state`)。single source of truth。
- server 側では `update` がこれを書き換える(`state.x += 3`)。
- client 側では capture/apply がここに値を**流し込む**。`render` はこれを読んで描く。
- 同じ参照を返すので、`render` のクロージャが掴んだ `state` と apply が書き込む先は同一オブジェクト。

**初期化の振る舞いは server / client で異なる:**

- **server / standalone(`mode=null`)**: 引数の初期値(`{ x: 0, y: 0 }`)で初期化する。
- **client**: 引数の初期値は**使わない**。`apply` が生成直前に注入したサーバー状態で初期化する。

これにより、client のコンポーネント本体は**実行時点でサーバーの正しい状態を参照できる**
(例: 生成位置やチーム色を state から決めてスプライトを作る)。仕組みは、`apply` の create が
本体実行の直前にサーバー状態を一時スロット(`Unit.injectedSlot`)へ置き、**Unit が構築開始時に
それを `_.injected` へ退避して即クリアする**、というもの。`xnew.sync.state` は `_.injected` を
**消費せず**読み、宣言キーごとに「注入が有れば注入値、無ければ初期値」を採る。即クリアにより
注入はその unit に限定され、本体内で生成される子 unit へ漏れない。

## 3a. base + extend の合成 — 複数宣言を 1 つの state にマージ

`xnew.sync.state` は `unit._.state`(unit ごとに 1 つの平坦なオブジェクト)を読み書きする。
`xnew.extend(Actor)` は**同じ unit** の上で Actor 本体を実行するので、Actor と Enemy が
それぞれ `xnew.sync.state` を呼ぶと、両者のキーが**同じ `_.state` にマージ**される。

```
Actor: xnew.sync.state({ x, y })   ┐
Enemy: xnew.sync.state({ hp })     ┘→  _.state = { x, y, hp }（1 つの SyncNode）
```

- 返り値は常に同一の `_.state` 参照。Enemy 側の `const state = xnew.sync.state({ hp })` は
  `{ x, y, hp }` を含むので、`state.x += 3`(基底が宣言した位置)もそのまま書ける。
- client では §3 の通り `_.injected` が**消費されない**ため、Actor の宣言も Enemy の宣言も
  ともに構築時点でサーバー値を読める(どちらが先でも正しくハイドレートされる)。
- 基底 `Actor` も**登録してよい**(単独利用もあり得るため)。同期名は `unit._.Components`(=
  `[Actor, Enemy]`、extend した基底ほど先頭)の**最も派生した = 末尾側の登録名**を採るので、
  `Actor`/`Enemy` 両方を登録しても `Enemy` が選ばれる。unit は 1 つの SyncNode として
  `{ x, y, hp }` を同期し、client は `Enemy` を再生成する(`Enemy` が内部で `Actor` を extend)。
  - もし先頭一致だと基底 `Actor` に化け、client が hp や挙動を失った“ただの Actor”を作ってしまう。
- **同名キーを 2 宣言すると `console.warn`**(last-write-wins)。名前空間は分けないので衝突に注意。

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
  { id: 2, name: 'Enemy', parentId: 1,    state: { x: 30, y: 26, hp: 2 } },  // Actor(x,y) + Enemy(hp) がマージ
  { id: 3, name: 'Enemy', parentId: 1,    state: { x: 9,  y: 8,  hp: 3 } },
]
```

- `id`: 同期 unit に一意採番(初回 capture 時に付与し以降固定)。
- `parentId`: **最も近い同期祖先の id**(間のローカル unit は飛ばす)。これで木構造を表現。
- `state`: `state`(同期状態)の浅いコピー。
- **pre-order(親が先)** なのが apply で効く。

## 6. xnew.sync.apply(reconcile)— client ツリーを「差分で」更新

```js
xnew.sync.apply(client, tree);
```

client ルートごとに `Map<id, Unit>` を保持し、受け取った `tree` と突き合わせて差分だけ適用:

- **create**: map に無い id → `name` からコンポーネントを引き、**本体実行前にサーバー状態を一時スロットへ注入**してから
  `parentId` の client unit の下に `xnew()` で生成(本体内の `xnew.sync.state` が注入値で初期化)→ 念のため
  state を再度流し込む → map に登録。(pre-order なので親が必ず先に存在)
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
  update : ・server の Enemy → state.x += 3 / 毎秒 state.hp -= 1（ロジック）
           ・Driver → capture(server) → apply(client)（同期）
  render : ・client の Enemy → 位置(基底 Actor)と色(拡張 Enemy)を state から反映（描画）
           （server の Enemy は render ハンドラが無いので何もしない）
```

## 8. Mover → Enemy を追ってみる

1. 起動: `server = xnew(Main)`(server)。Main の `xnew.server` が `xnew(Mover)` を生成し、Mover の `xnew.server` が `xnew.interval` をセット。
2. ある frame の update で interval 発火 → server に Enemy 生成。Enemy は `xnew.extend(Actor)` で位置 {x,y} を、自身で hp を宣言し、`update`(移動) と `interval`(hp 減少→寿命) を持つ(DOM 無し)。
3. 同 frame の Driver.update で `capture(server)` → Mover + Enemy の SyncNode 配列。Enemy の state は `{ x, y, hp }`(Actor + Enemy のマージ)。
4. `apply(client)` → client 側に Mover の下へ Enemy を生成。基底 Actor の `xnew.client` が要素を nest し、拡張 Enemy がそれを着色する(両 render を持つ)。`_.injected` から x,y,hp すべてがハイドレート。
5. 以降の frame: server Enemy が `state.x` を増やし hp を減らす → capture に乗る → apply で client Enemy の state 更新 → render が位置と色を更新。
6. hp が 0 になると server Enemy が `finalize` → capture から消える → apply が client Enemy を finalize。画面から消える。

## 9. まとめ

| 要素 | 役割 |
|---|---|
| `xnew.sync.boot(mode, ...args)` | その mode で xnew(...args) を生成(server/client を選ぶ) |
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
  `render` が 1 回遅れる。これにより、DOM 要素は本体で挿入済みなのに `left/top` を設定する `render`
  が走らず、Enemy 生成時に赤丸が一瞬 (0,0) に出てから所定位置へ移ることがある。
  - **解消済みの片側**: 「本体実行時点で state が既定値(0,0)」だった問題は、`apply` が本体実行前に
    サーバー状態を注入する方式(§3)で解決済み。本体・初回 `render` ともに正しい state を見る。
  - **残る片側**: 生成 frame で `render` がスキップされる点。`client` ブロック内で初期 `left/top` を
    直接セットする/生成 frame で初期描画する等で対処予定。
