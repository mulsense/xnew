# xnew.group（キー付き子コレクション）設計

- 日付: 2026-06-08
- 対象: `packages/xnew`（サブモジュール）のコア API
- 関連: [src/core/xnew.ts](../../../src/core/xnew.ts)、[src/core/unit.ts](../../../src/core/unit.ts)、[examples/6_network/multi-client/game.js](../../../examples/6_network/multi-client/game.js)

## 背景と目的

`World` のように「キーで識別される子ユニット群」を保持し、外部の状態（参加者集合など）に
合わせて **居なければ生成 / 余れば破棄** するパターンは今後よく使う。現状は手書きで、
`Map` と二重ループを管理している:

```js
const players = new Map();   // clientId → Player unit
unit.on('update', () => {
    for (const clientId of joined) {
        if (!players.has(clientId)) { players.set(clientId, xnew(Player, { clientId })); }
    }
    for (const [clientId, player] of [...players.entries()]) {
        if (!joined.has(clientId)) { player.finalize(); players.delete(clientId); }
    }
});
```

既存の `xnew.find(Component)` では代替できない:

- **キー検索ができない**（その clientId の Player を引けない）
- **検索範囲が全体**（グローバル登録表 `component2units` を protect 境界だけで絞る）
- **ライフサイクル管理がない**（spawn/despawn は手書きのまま）

本機能は、現ユニットが所有する **キー付き子コレクション** を返すヘルパー `xnew.group(Component)`
を追加し、上記の痛みを解消する。

## 確定した仕様判断

1. **方向性**: キー付き子コレクションのマネージャを追加する（`find` 拡張や宣言的リストは採らない。
   宣言的リストは将来このマネージャの上に薄く乗せられる）。
2. **API 名**: `xnew.group`（`xnew.find` / `xnew.context` と並ぶトップレベル）。
3. **実行モデル**: `reconcile`（pull）を主軸にしつつ `spawn` / `delete`（push）も提供する。
   生成/破棄は **update tick 中** に適用する。tick 外（socket の `on` ハンドラ等）から呼ばれた
   場合は **次 update へ自動遅延** して安全に適用する。
4. **スコープ**: `get` / `has` などはそのグループが作った子だけを見る（= 所有ユニットの子の一部）。
   グローバル検索の `find` とは別物。
5. **1 グループ 1 コンポーネント**: `xnew.group(Component)` は単一コンポーネント専用。複数種類が要る
   場合はグループを複数持つ。

## API サーフェス

`xnew.group(Component)` は現在のユニット（`Unit.currentUnit`）を所有者として束縛し、マネージャを返す。
`xnew.find` / `xnew.context` と同様、コンポーネント本体またはそのブロック（`xnew.server` 等）内で呼ぶ。

```
get(key)             → Unit | undefined   このグループの子をキーで引く
has(key)             → boolean
size                 → number             件数
keys()               → Iterator<key>
values()             → Iterator<Unit>
[Symbol.iterator]()  → Iterator<[key, Unit]>
spawn(key, props?)   → Unit | undefined   居なければ生成し key で索引。冪等（既存なら生成せずそれを返す）
delete(key)          → boolean            子を finalize して索引から除去。無ければ false
reconcile(keys, propsFn?)                  目標キー集合へ突き合わせ。missing=spawn / extra=delete
clear()                                    全件 delete
```

- `keys` は `Iterable`（`Set` / 配列 / `Map.keys()` など）。
- `propsFn` は `(key) => props`。省略時は `{}` で生成。
- `spawn` の戻り値は、即時適用時は生成された `Unit`、遅延時は `undefined`。

生成される子は **所有ユニットの本物の子** であり、tick / render / finalize に通常どおり参加する。

## ライフサイクルと tick 安全性

- **自動 prune**: 各子の `finalize` を購読し、子が（delete 経由でも外部からでも）finalize されたら
  索引から自動的に外す。索引除去はこの finalize ハンドラに一元化する。
- **cascade**: 所有ユニットが finalize されれば子も既存の cascade で finalize され、グループの
  update リスナも一緒に外れる。保留中の操作は破棄される。
- **適用タイミング**:
  - **update tick 中**（`reconcile` を update ハンドラから呼ぶ、など）→ **即時適用**。
  - **tick 外**（socket の `on('join')` 等）→ 保留キューに積み、所有者の **次 update で flush**。
- **tick 判定**: コアに最小フラグ `Unit.duringUpdate`（update 走査中だけ true）を追加する。
  グループは「`duringUpdate` なら即時、さもなくば所有者の `update` に一度だけ仕込んだ flush で適用」。
- **遅延の癖（仕様として明記）**: tick 外で `spawn` した直後の `get(key)` は次 update まで
  `undefined`。`spawn` の戻り値も遅延時は `undefined`。

### エッジケース

| ケース | 挙動 |
|---|---|
| 同じ key で再 `spawn` | 冪等。既存ユニットを返し、新しい props は無視（再生成しない） |
| 存在しない key の `delete` | no-op、`false` を返す |
| `propsFn` 省略の `reconcile` / `spawn` | `{}` で生成 |
| key の型 | 任意（string / number / object）。内部 `Map` がそのまま扱う |
| 所有者 finalize 中 | cascade で子も消滅、保留キューは破棄 |

## World への効果

reconcile 版（pull・tick 内）:

```js
xnew.server(() => {
    const players = xnew.group(Player);
    const joined = new Set();
    xnew.sync.on('join',       (id) => joined.add(id));
    xnew.sync.on('disconnect', (id) => joined.delete(id));
    unit.on('update', () => players.reconcile(joined, (id) => ({ clientId: id })));
});
```

push 版（遅延適用により `joined` Set も update ループも不要）:

```js
xnew.server(() => {
    const players = xnew.group(Player);
    xnew.sync.on('join',       (id) => players.spawn(id, { clientId: id }));
    xnew.sync.on('disconnect', (id) => players.delete(id));
});
```

例（multi-client）は **push 版を正** とする（最も短く、遅延適用の価値が分かる）。

## ファイル配置

- 新規: `src/core/group.ts` … `createGroup(owner, Component)` とマネージャ実装。
- 変更: `src/core/xnew.ts` … `xnew.group(Component)` を配線（`Unit.currentUnit` を所有者に）。
- 変更: `src/core/unit.ts` … `Unit.duringUpdate` フラグを update 走査の入口で true/false。
- 変更: `examples/6_network/multi-client/game.js` … World を `xnew.group` 化（push 版）。
- 型: `xnew.group<C>(Component: C)` はマネージャ型を返す（`get` 等は `Unit` を返す）。

## テスト

`test/core/group.test.ts`:

- `get` / `has` / `size` / 反復が、そのグループの子だけを返す
- `spawn` が冪等（同 key 再呼びで再生成しない）
- `delete` が子を finalize し索引から除去、戻り値が正しい
- `reconcile` が missing を spawn・extra を despawn する
- tick 外から `spawn` / `delete` した操作が次 update で flush される（`Unit.duringUpdate` の遅延）
- 子を外部 `finalize()` したとき索引から自動除去される
- 所有者 finalize で子が cascade finalize される

統合確認:

- multi-client World を `xnew.group` 化し、既存の socket.io スモーク（2 join→2 players、move 反映、
  退出→1）が通る。
- `npx tsc --noEmit`、全 jest スイート、`npm run build` が通る。

## 非目標（YAGNI）

- 宣言的キー付きリスト（`xnew.each` 等）。本マネージャの上に後から乗せられる。
- 1 グループでの複数コンポーネント混在。
- `spawn` の `replace`（既存を作り直す）オプション。
- `find` 側のスコープ/キー拡張。
