# キー付き `xnew.promise` と `collect` 廃止 設計

- 日付: 2026-06-12
- 対象: `packages/xnew`（サブモジュール）のコア API
- 関連: [src/core/xnew.ts](../../../src/core/xnew.ts)、[src/core/unit.ts](../../../src/core/unit.ts)、[test/core/xnew/promise.test.ts](../../../test/core/xnew/promise.test.ts)、[examples/2_extends/three_mog/script.js](../../../examples/2_extends/three_mog/script.js)
- 経緯: 「複数アセットを並列ロードして全部揃ってから処理する」ユースケース（`three_mog` 等）が、
  `xnew.promise` / `xnew.collect` / `xnew.then` の3関数と2つの暗黙の蓄積状態
  （promise のリストと `_.results` 辞書）に分散していた。`async/await` 化（`xnew.async`）も
  検討したが、ブラウザに `AsyncContext` が無く `await` 越しにグローバル `Unit.currentUnit` を
  自動追従させられないため見送り。代わりに既存プリミティブ `xnew.promise` を**キー付き**に拡張し、
  `collect` を廃止する方針に決定した。

## 背景と目的

現状の `three_mog` の書き方:

```js
xnew.promise(load(mog)).then(convert).then(parse).then((vrm) => xnew.collect({ vrm }));
xnew.promise(loadVRMA(path)).then((vrma) => xnew.collect({ vrma }));
xnew.then(({ vrm, vrma }) => { /* 使う */ });
```

末尾の `.then(v => xnew.collect({ v }))` は「結果に名前を付け直す儀式」であり、
`collect`（書き込み）と `then`（読み出し）が `_.results` を介して間接的に繋がっている。
これを、名前を**登録地点**に移すことで解消する:

```js
xnew.promise('vrm', load(mog)).then(convert).then(parse);
xnew.promise('vrma', loadVRMA(path));
xnew.then(({ vrm, vrma }) => { /* 使う */ });
```

関数は実質 `promise` / `then`（+ `catch` / `finally` / `defer`）に縮み、`collect` という
独自概念と `_.results` 蓄積状態が消える。

## なぜキー付けが既存設計に綺麗にハマるか

`UnitPromise.then()` は新しいオブジェクトを返さず、**同一オブジェクトを in-place で書き換えて
`this` を返す**（[unit.ts](../../../src/core/unit.ts) の `UnitPromise.wrap`）。`xnew.promise` は
登録した `UnitPromise` の参照を `_.promises[]` に push する。両者は同一参照なので、
ユーザが後から `.then` を連結しても、登録済み `UnitPromise` の最終解決値は
**チェーンの最終値**になる。したがってキーは「登録時の生 promise」ではなく
「`.then` チェーンの最終値」に自動で紐づく — これがまさに欲しい挙動。

## 確定した仕様判断

1. **`xnew.promise(key?, promise)`**: 第1引数が `string` ならキー、それ以外は従来の
   `Function | Promise | Unit`。promise も Component 関数も Unit も string になり得ないので
   オーバーロード判定は安全。戻り値は従来どおり `UnitPromise`（`.then` チェーン可）。

2. **キー無しは従来どおり動く**: `xnew.promise(promise)` は単体の promise として機能する。
   タイミング（`then` / `catch` / `finally` の待ち合わせ）には参加するが、名前が無いので
   `xnew.then` の結果オブジェクトには**現れない**。

3. **`xnew.then(cb)` の結果はキー付き promise のみ**: `cb` が受け取るのは
   `{ key: チェーン最終値 }` のオブジェクト。キー付き promise だけを集める。
   - キー無しだけ／promise 無しなら `{}`。

4. **`xnew.collect` を廃止**。`Unit._.results` フィールドも廃止。結果は蓄積せず、
   全 settle 後にキー付き promise から導出する。

5. **`xnew.defer(key?)` もキー対応**: deferred も「名前付き promise」の一種なので一貫させる。
   `resolve(value?)` に拡張し、`value` がキー（指定時）に紐づいて `xnew.then` に入る。
   `reject(reason?)` も値を取れるよう拡張。2回目以降の settle を無視する冪等性は維持。

6. **重複キーは後勝ち**: 同一キーで複数登録した場合、登録順で `Object.assign` 相当となり
   後のものが勝つ。警告は出さない（`xnew.find` の重複キー方針と揃える）。

7. **ネストした `xnew.promise(unit)` はキー付き結果を解決する**: 第1引数が Unit のとき、
   解決値は対象ユニットのキー付き結果オブジェクト（`_.results` ではなく導出値）になる。
   `xnew.promise('child', childUnit)` で子の結果をキー付きで束ねられる。

## API

```
xnew.promise(promise)            従来どおり（キー無し）。then の結果には入らない
xnew.promise(key, promise)       キー付き。then の結果に { key: 最終値 } として入る
xnew.then(({ ...keyed }) => ...) 全 promise を待ち、キー付き結果オブジェクトを渡す
xnew.catch(reason => ...)        従来どおり（_.promises 全体のいずれかが reject）
xnew.finally(() => ...)          従来どおり（_.promises 全体が settle）
xnew.defer(key?)                 キー付き deferred。{ resolve(value?), reject(reason?) }
```

`xnew.collect` は削除。

## 実装

### `src/core/unit.ts` — `UnitPromise`

- `public key?: string` を追加（`xnew.promise` / `defer` 側でセット）。
- 結果導出の static を追加（`all` を置き換え or 併設）。キー付きだけ集めたオブジェクトに解決する:

```ts
static results(promises: UnitPromise[]): UnitPromise {
    return new UnitPromise(
        Promise.all(promises.map((p) => p.promise)).then((values) => {
            const out: Record<string, any> = {};
            promises.forEach((p, i) => {
                if (p.key !== undefined) { out[p.key] = values[i]; }
            });
            return out;
        })
    );
}
```

- `catch` / `finally` 用にタイミングだけ待つ `all`（値を捨てる現行版）は残してよい。
- `Unit._` から `results: Record<string, any>` フィールドを削除（[unit.ts](../../../src/core/unit.ts) の型定義と init）。

### `src/core/xnew.ts`

- `promise(keyOrPromise, maybePromise?)`: 先頭 string 判定でキーを取り出し、生成した
  `UnitPromise` に `key` を設定してから push。Unit 分岐は `UnitPromise.results(unit._.promises)` に変更。
- `then(callback)`: `UnitPromise.results(currentUnit._.promises).then(callback)` に変更
  （スコープ復元は `UnitPromise.then` の `wrap` が担う）。
- `catch` / `finally`: 現行どおり（`_.promises` 全体待ち）。
- `defer(key?)`: 生成した `UnitPromise` に `key` を設定。返す `resolve` / `reject` を
  `resolve(value?)` / `reject(reason?)` に拡張し、内部 resolver にそのまま渡す。冪等性維持。
- `collect` を削除。

## 影響範囲

- **addons（xpixi / xthree / xrapier2d / xrapier3d / xmatter）と `src/index.ts`**: いずれも
  キー無し `xnew.promise(...)` と `.then` チェーンのみ使用。`xnew.then(results)` や `collect` には
  依存しないため**変更不要**（キー無しの後方互換で動く）。
- **`examples/2_extends/three_mog/script.js`**: キー付きへ書き換え（`collect` 撤去）。

## テスト（[test/core/xnew/promise.test.ts](../../../test/core/xnew/promise.test.ts)）

- `xnew.collect` の describe（2件）を**削除**し、キー付き promise のテスト群に置き換える:
  - キー付き promise の最終チェーン値が `then` の結果に `{ key: value }` で入る。
  - キー無し promise は待つが結果に現れない（`{}`）。
  - 複数キーが合流する（`{ a, b }`）。
  - キー付き promise の `.then` 連結後の**最終値**が入る（in-place 連結の検証）。
  - 重複キーは後勝ち。
- 「passes the unit results object to the callback」を更新: キー無しのみ → `{}`、
  キー付き → `{ key: value }`。
- `xnew.defer`: `resolve(value)` がキーに紐づいて `then` 結果に入る／キー無し defer は
  結果に現れない／冪等性は従来テスト維持。
- `catch` / `finally` の既存テストは不変。

## 非対象（YAGNI）

- `xnew.async`（async/await・ジェネレータ）は今回スコープ外。将来 `AsyncContext` 普及時に再検討。
- サブツリー限定の結果スコープや重複キー警告は導入しない。
- キー無し promise を位置（配列）で受け取る仕組みは導入しない。
