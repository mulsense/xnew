# xnew マルチプレイ状態同期 — 設計 spec（v2: server/browser ブロック方式）

- 日付: 2026-06-03
- ステータス: 設計確定（実装前）
- 作業ブランチ: `v0.8/state-sync`（xnew submodule、`v0.8/main` から分岐）

## 1. 目的

複数プレイヤーのゲームで、ゲームロジック（`update`）はサーバー、描画（`render`）はブラウザで
実行される。本来 1 つであるべき `Player` を `PlayerLogic`/`PlayerRender` の 2 ファイルに割らずに、
**1 つのコンポーネント関数**に両方を書き、権威状態をサーバー → ブラウザへ同期する。

## 2. 方式（v1 のエンジンゲート方式からの変更）

コンポーネント関数内で、環境別コードを **`xnew.server` / `xnew.browser` ブロック**に分ける。

```js
function Mover(unit) {
    const state = xnew.state.initialize({ x: 0 });   // 共有（両環境で実行）

    xnew.server(() => {                              // authoritative でのみ実行
        unit.on('update', () => { state.x += 2; });  // ゲームロジック
        return { /* defines */ };
    });

    xnew.browser(() => {                            // replica でのみ実行
        const el = xnew.nest('<div>');               // 描画要素・スプライト等の生成
        unit.on('render', () => { el.style.left = `${state.x}px`; });
        return { /* defines */ };
    });
}
xnew.state.register('Mover', Mover);
```

### なぜこの方式か（v1 ゲート方式の問題）
v1 は「本体で全部書き、エンジンが authoritative では `update`/`nest` 等を抑止」する方式だった。
しかしゲーム開発では本体でスプライト・3D オブジェクト等**多数の外部オブジェクトへ代入**する。
それら全てを仮想化（no-op 化）するのは不可能。`xnew.browser` ブロックに閉じ込めれば、
**そもそもサーバーで実行されない**ので仮想化不要。結果としてエンジン側に条件分岐が要らない。

## 3. 公開 API

| API | 役割 |
| --- | --- |
| `xnew.config` | グローバルなエンジン設定オブジェクト（`Unit.config` と同一実体）。`xnew.config.mode = 'authoritative' \| 'replica' \| null` |
| `xnew.server(callback, props?)` | `xnew.extend` 同様、init 中に `callback` を実行し defines を返す。ただし `Unit.currentUnit._.mode !== 'replica'`（= authoritative または null）のときだけ実行。 |
| `xnew.browser(callback, props?)` | 同上だが `mode !== 'authoritative'`（= replica または null）のときだけ実行。 |
| `xnew.state.initialize(initial)` | 同期される状態を現在の unit に宣言（single source of truth）。 |
| `xnew.state.register(name, Component)` | 同期エンティティ型を名前で登録（両ランタイムで呼ぶ）。 |
| `xnew.state.capture(root)` | authoritative サブツリーを `SyncNode[]`（state tree）として捕捉。 |
| `xnew.state.apply(root, tree)` | replica サブツリーへ差分適用（create/update/remove）。 |

### `xnew.server` / `xnew.browser` の意味
- `callback` は `xnew.extend` のコールバック相当（`(unit) => defines`。返した defines は unit にマージ）。
- 判定は **`Unit.currentUnit._.mode`**（グローバル `config.mode` ではない）。
  reconcile が config を null に戻した後に作る replica unit も、親から `'replica'` を継承しているため
  正しく `xnew.browser` のみ実行される。
- `mode === null`（スタンドアロン）では **両方実行**（従来の単体 xnew アプリ互換）。

## 4. モード制御（サブツリー単位・継承）

- `Unit.config = { mode: null }`（static）。`xnew.config` は同一実体。
- unit の mode 解決: `parent ? (parent._.mode ?? Unit.config.mode ?? null) : null`。
  - engine root は null。サブツリーのルート（親が null-mode）が `config.mode` を採用し、
    ネストした子は親の非 null mode を継承。
- **`Unit.reset()` は `config.mode` をクリアしない**（初回 `xnew()` が自動 reset を走らせるため、
  クリアすると設定済み config.mode が生成前に消える）。利用側が `xnew.config.mode = null` で戻す。
- 本番: サーバープロセスは全体 authoritative、ブラウザは全体 replica。ローカル模擬では両サブツリーを
  1 プロセスに同居（§7）。

## 5. エンジン（Unit）への影響 — 最小

追加するのみ。**条件分岐は足さない。**
- `_.mode` / `_.syncState` / `_.syncId` フィールド、`Unit.config`、`Unit.syncIdCounter`（reset で 1 に）。
- mode 継承（上記）。
- `Unit.update` / `Unit.render` / `Unit.nest` / `Unit.on` は**変更しない**。
  - update ハンドラは `xnew.server` 内でのみ登録 → サーバーにしか存在しない。
  - nest・描画系・render ハンドラは `xnew.browser` 内でのみ実行 → ブラウザにしか存在しない。
  - よってゲートも no-op も不要。

## 6. データモデル / capture / reconcile

- **SyncNode** = `{ id, name, parentId, state }`。`StateTree = SyncNode[]`。
- **id**: authoritative 側で synced unit に安定採番（`Unit.syncIdCounter++`、capture が lazy 付与）。
- **parentId**: 最も近い synced 祖先の id（間のローカル unit は同期トポロジに含めない）。
- **capture**（`xnew.state.capture`）: authoritative サブツリーを pre-order DFS し `SyncNode[]` を全量返す。
- **reconcile**（`xnew.state.apply`）: root ごとの `Map<id, Unit>`(WeakMap) を保持し、
  - create: 未知 id → `getRegisteredComponent(name)` → `xnew(parent, Component)`（mode は親 replica を継承）→ state 適用 → map 登録（pre-order なので親が先）。
  - update: 既知 id → 変更フィールドのみ書込（キー削除は非対応 = v1 の割り切り）。
  - remove: incoming に無い id → `unit.finalize()` + map から削除。

## 7. ローカル模擬（1 ユーザー / 1 サーバー）

ブラウザのみで擬似サーバーを同居させ、毎フレーム `capture → apply` で反映:

```js
xnew.config.mode = 'authoritative';
const server = xnew(function Server() { xnew(Mover); });
xnew.config.mode = 'replica';
const client = xnew(document.getElementById('view'), function View() {});
xnew.config.mode = null;

xnew(function Driver(unit) {
    unit.on('update', () => { xnew.state.apply(client, xnew.state.capture(server)); });
});
```

## 8. スコープ外 / v1 の割り切り

- 実ネットワーク転送（WebSocket 等）。サーバーロジックのクライアント非配布（チート対策）。
- mechanism B（サーバー側 diff）。再親子化（reparent）。client→server 入力。
- state は直列化可能な flat 値前提。update でのキー削除は反映しない。

## 9. 用語

- **state tree**: 同期対象ツリーの捕捉物（`SyncNode[]`）。内部 `Unit.snapshot` と衝突するため「snapshot」は使わない。
- **authoritative / replica**: 権威（サーバー）/ 複製（ブラウザ）モード。
