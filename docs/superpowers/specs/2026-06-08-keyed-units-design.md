# key 付きユニットと find(key) 設計

- 日付: 2026-06-08
- 対象: `packages/xnew`（サブモジュール）のコア API
- 関連: [src/core/unit.ts](../../../src/core/unit.ts)、[src/core/xnew.ts](../../../src/core/xnew.ts)、[examples/6_network/multi-client/game.js](../../../examples/6_network/multi-client/game.js)
- 経緯: 当初は専用マネージャ `xnew.group` を検討したが、新概念を増やさず既存プリミティブ
  （`xnew` / `xnew.find`）を拡張する方針に変更した（group は破棄）。

## 背景と目的

「キーで識別される子ユニットを生成し、後でキーで引いて破棄する」パターン（例: World が
clientId ごとに Player を持つ）を、専用 API を増やさずに書けるようにする。

```js
xnew.sync.on('join',       (clientId) => xnew(Player, { key: clientId, clientId }));
xnew.sync.on('disconnect', (clientId) => xnew.find(Player, { key: clientId })[0]?.finalize());
```

`xnew.find(Component)` 単体では「キーで引けない」点が不足だった。これを `key` で補う。

## 確定した仕様判断

1. **`key` は予約 prop**: `xnew(Component, { key, ...props })` の `key` をユニットに保持する。
   props からは抜き取らない（コンポーネントが読みたければ読める）。未指定なら `null`。
2. **`find` はグローバルのまま + key で絞る**: 探索範囲は従来どおり全ユニット。`key` 指定時は
   `unit.key === key` で絞る。**key はグローバル一意の想定**（例: clientId = socket.id）なので、
   全体検索でも一意に引ける。サブツリー限定スコープは導入しない。
3. **重複 key は不問**: 同じ key で再度 `xnew` しても常に新規生成（`xnew` の意味を変えない）。
   警告も出さない。`find(...)[0]` で先頭を採る。
4. **`xnew.sync.on` のハンドラを登録元ユニットのスコープで実行する**（必須の付随修正）。
   従来は生ハンドラを socket に登録しており、発火時 `Unit.currentUnit` が stale だった。これを
   登録元のスナップショットで `Unit.scope` 実行することで、ハンドラ内の `xnew(Player)` が
   正しい親（そのユニット）の子として生成される。`Unit.scope` は対象が finalize 済みなら
   早期 return するので安全。
5. **遅延適用はしない**: ユニット生成は tick 外でも構造的に問題なし（次 tick の start/update が拾う）。
   finalize も socket の on ハンドラ（走査中でない）からなら安全。よって専用の遅延機構は持たない。

## API

```
xnew(Component, { key, ...props })   key を持つ子ユニットを生成（key 以外は従来どおり props）
unit.key                             読み取り専用。未指定なら null
xnew.find(Component)                 従来どおり（全件・protect 可視性で絞る）
xnew.find(Component, { key })        さらに key 一致で絞る → [unit] / []
```

## 実装

- `src/core/unit.ts`
  - `Unit._` に `key: any` を追加。コンストラクタで props から `key`（`?? null`）を取り出して保持。
  - 公開 getter `get key()`。
  - `Unit.find(Component, key?)` に key フィルタを追加（`key !== undefined && unit._.key !== key` を除外）。
- `src/core/xnew.ts`
  - `xnew.find(Component, opts?: { key?: any })` で `Unit.find(Component, opts?.key)` を呼ぶ。
  - `xnew.sync.on` を `Unit.snapshot(unit)` + `Unit.scope(...)` でラップ（スコープ実行）。
- `examples/6_network/multi-client/game.js`
  - World server を上記 join/disconnect 形に。
- 破棄: `src/core/group.ts`、`test/core/group.test.ts`、`Unit.duringUpdate`、group 設計 doc。

## 注意点（replica との両立）

client 側の Player replica は `applyStateTree` が `new Unit(parent, Component)` で生成し、`key` は
付かない（`null`）。よって `find(Player, { key })` は **権威 Player（key 付き）だけ**に一致し、replica を
誤って拾わない。browser-only でも server/client が同一ツリーに同居するが、この性質で区別できる。

## テスト

`test/core/key.test.ts`（新規）:

- `xnew(C, { key })` でユニットに `key` が乗り、`unit.key` で読める
- `xnew.find(C, { key })` が一致ユニットだけを返す／不一致は空
- `key` 無しユニットは `find(C, { key })` に出ない
- `xnew.find(C)`（従来形）は全件返す（key 無視）

`test/core/sync/channel.test.ts`（追記）:

- `xnew.sync.on` のハンドラ内で `xnew(Child)` すると、登録元ユニットの子として生成される（スコープ確認）

統合確認:

- multi-client World を本方式にして socket.io スモーク（2 join→2 players、move 反映、退出→1）。
- `npx tsc --noEmit`、全 jest、`npm run build`。

## 非目標（YAGNI）

- reconcile / 冪等 spawn / 自動 prune の“束”（必要なら呼び出し側で組む）。
- find のサブツリー限定スコープ・key のスコープ一意性。
