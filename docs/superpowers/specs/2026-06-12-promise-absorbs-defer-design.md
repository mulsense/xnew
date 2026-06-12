# `xnew.defer` を `xnew.promise` に統合（defer 廃止）設計

- 日付: 2026-06-12
- 対象: `packages/xnew`（サブモジュール）のコア API
- 関連: [src/core/xnew.ts](../../../src/core/xnew.ts)、[test/core/xnew/promise.test.ts](../../../test/core/xnew/promise.test.ts)、[examples/2_extends/pixi_three_prerender/script.js](../../../examples/2_extends/pixi_three_prerender/script.js)、[examples/3_games/tohoku_shot/script.js](../../../examples/3_games/tohoku_shot/script.js)
- 前提: [2026-06-12-keyed-promise-design.md](./2026-06-12-keyed-promise-design.md)（キー付き `xnew.promise` と `collect` 廃止）の続き。
- 経緯: 「キー付き promise」化に続き、概念をさらに減らすため `xnew.defer` を独立 API として残さず、`xnew.promise` に **promise 実引数を渡さない呼び方** として吸収する（案A: 戻り型をオーバーロードで正直に2つにする）。

## 背景と目的

現状は登録系の `xnew.promise` と手動 settle 系の `xnew.defer` が別 API。両者は「unit に promise を1つ登録する」点で同じで、違いは「既存 promise を渡すか／自分で後から settle するか」だけ。これを `xnew.promise` 一つに畳み、`defer` という名前を消す（xnew の「極力シンプル」方針）。

```js
// Before
const { resolve } = xnew.defer('textures');
// After
const { resolve } = xnew.promise('textures');
```

## モード判別ルール（衝突なし）

`xnew.promise` の動作は「**promise / 関数 / Unit の実引数が在るか**」だけで決まる:

| 呼び方 | モード | 戻り値 |
| --- | --- | --- |
| `xnew.promise()` | deferred（キー無し） | `{ resolve, reject }` |
| `xnew.promise('a')` | deferred（キー `'a'`） | `{ resolve, reject }` |
| `xnew.promise(p)` | 登録（p = Promise/関数/Unit） | `UnitPromise` |
| `xnew.promise('a', p)` | 登録 | `UnitPromise` |

`string` は promise になり得ないので、「キーのみ／引数なし」＝ deferred、「promise 実引数あり」＝ 登録、が一意に切れる。executor 形式 `xnew.promise((resolve) => {...})` は従来どおり「登録」（関数実引数あり）として共存する。

## 確定した仕様判断

1. **`xnew.defer` を削除**。手動 settle は `xnew.promise()` / `xnew.promise(key)` が担う。
2. **戻り型は引数で変わる（案A）**: promise 実引数があれば `UnitPromise`、無ければ `{ resolve, reject }`。`string` は `Function | Promise | Unit` に代入不可なので、deferred 系と登録系のオーバーロードは重ならない。
3. **deferred の挙動は現 `defer` と同一**: unit に登録、キー付きなら settle 値が `xnew.then` 結果にそのキーで入る。`resolve(value?)` / `reject(reason?)` は値を取り、2回目以降の settle は無視（冪等）。
4. **throw ガードを arity ベースに変更**: 旧ガードは `xnew.promise('key')`（promise 無し）を無条件に例外にしていたが、本変更ではこれが deferred の正規呼び出しになる。代わりに「**2 引数で呼ばれたのに promise が undefined**」(`arguments.length >= 2 && promise === undefined`、例: `xnew.promise('key', undefinedVar)`) だけを誤用として throw する。これは「登録のつもりで promise を渡し忘れて never-resolve な promise が静かに登録される」footgun を防ぐためで、`xnew.promise()` / `xnew.promise('key')`（1 引数以下）の deferred 正規呼び出しには当たらない。（実装中のコードレビューで追加した安全策。）
5. **判別は `promise === undefined` で行う**: 正規化後 `promise`（= 実 promise 引数）が `undefined` なら deferred、そうでなければ登録。

## 実装（[src/core/xnew.ts](../../../src/core/xnew.ts)）

`promise` を「deferred 分岐を先頭に追加し、登録分岐は現行ロジックを維持」する形にする。正確なコード（型付け含む）は次節「型付け方法（検証済み）」のブロックを唯一の正とする。要点:
- 引数正規化: 第1引数が string ならキー、実 promise は `maybePromise`／そうでなければ第1引数。
- `promise === undefined`（実 promise 無し）→ deferred モード（現 `defer` と同一の `{ resolve, reject }` を返す）。
- それ以外 → 登録モード（`Unit` / `Promise` / 関数 executor の現行3分岐そのまま）。

### 型付け方法（検証済み）

TS のオブジェクトリテラルの**メソッド短縮記法**はオーバーロード宣言を持てない（前回 keyed-promise で throw ガードに切り替えた理由）。そこで `promise` を**メソッド短縮記法ではなく「関数式をオーバーロード呼び出しシグネチャ型へキャストしたプロパティ」**として書く。`xnew` は `Object.assign(fn, { ...methods })` で組まれており（[xnew.ts:32](../../../src/core/xnew.ts#L32)）、このプロパティ型はそのまま最終 `xnew.promise` の型になる:

```ts
        promise: (function (keyOrPromise?: any, maybePromise?: any): any {
            const key = typeof keyOrPromise === 'string' ? keyOrPromise : undefined;
            const promise = typeof keyOrPromise === 'string' ? maybePromise : keyOrPromise;
            if (promise === undefined) {
                // deferred モード（現 defer と同一挙動）
                let settled = false;
                let resolve!: (value?: unknown) => void;
                let reject!: (reason?: unknown) => void;
                const unitPromise = new UnitPromise(new Promise((res, rej) => { resolve = res; reject = rej; }));
                unitPromise.key = key;
                Unit.currentUnit._.promises.push(unitPromise);
                return {
                    resolve(value?: unknown) { if (settled) return; settled = true; resolve(value); },
                    reject(reason?: unknown) { if (settled) return; settled = true; reject(reason); },
                };
            }
            // 登録モード（現行どおり）
            let unitPromise: UnitPromise;
            if (promise instanceof Unit) {
                unitPromise = UnitPromise.results(promise._.promises);
            } else if (promise instanceof Promise) {
                unitPromise = new UnitPromise(promise);
            } else {
                unitPromise = new UnitPromise(new Promise(xnew.scope(promise)));
            }
            unitPromise.key = key;
            Unit.currentUnit._.promises.push(unitPromise);
            return unitPromise;
        }) as {
            (): { resolve: (value?: unknown) => void; reject: (reason?: unknown) => void };
            (key: string): { resolve: (value?: unknown) => void; reject: (reason?: unknown) => void };
            (promise: Function | Promise<any> | Unit): UnitPromise;
            (key: string, promise: Function | Promise<any> | Unit): UnitPromise;
        },
```

この型付けは独立した tsc プローブで検証済み: `const { resolve } = xnew.promise('x')` と `xnew.promise('x', p).then(...)` が両方通り、かつ `xnew.promise('x').then(...)`（deferred に `.then`）と `xnew.promise('x', p).resolve`（登録結果に `.resolve`）は型エラーになる。`tsc --noEmit` のクリーンは実装の必須条件。

- `defer` メソッドを削除。
- ファイルヘッダ（helper 一覧）から `defer` を削除し `// - xnew.promise / then / catch / finally : Unit に紐づく promise 管理` にする。

## 影響範囲

- **src**: `xnew.defer` の利用は無し（定義のみ）。削除して `promise` に統合。
- **examples（コード）**: `xnew.defer` は2ファイル・5箇所のみ。すべて `xnew.promise` に置換:
  - `examples/2_extends/pixi_three_prerender/script.js`: `xnew.defer('textures')`→`xnew.promise('textures')`、`xnew.defer()`→`xnew.promise()`。
  - `examples/3_games/tohoku_shot/script.js`: `xnew.defer()`×2 と `xnew.defer('textures')` を `xnew.promise(...)` に置換。
- **examples/dist（追跡済みバンドル）**: API 変更のため `npm run build` で再生成・コミット。
- 過去スペック/プラン（`2026-06-12-keyed-promise*.md`）は履歴記録なので変更しない。

## テスト（[test/core/xnew/promise.test.ts](../../../test/core/xnew/promise.test.ts)）

- 現 `describe('xnew.defer', ...)` を `describe('xnew.promise (deferred mode)', ...)` にリネームし、`xnew.defer(...)` 呼び出しを `xnew.promise(...)` に置換。テスト内容（resolve() で settle / 冪等 / キー付き値が then に入る）は維持。
- 追加: `xnew.promise()`（引数なし・キー無し deferred）が `{ resolve, reject }` を返し、settle で `xnew.then` を発火させる（結果には現れない）ことを検証。
- 既存のキー付き登録テスト群（`keyed xnew.promise`）はそのまま。
- 旧 throw ガードのテストは存在しない（前回は追加していない）ので削除不要。

## 非対象（YAGNI）

- 案C（常に UnitPromise を返し resolve/reject を生やす）は採らない。
- `xnew.then` / `catch` / `finally` の挙動は不変。
