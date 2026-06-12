# `xnew.defer` を `xnew.promise` に統合 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `xnew.defer` を削除し、`xnew.promise` に「promise 実引数を渡さない呼び方（deferred モード）」として吸収する。

**Architecture:** `xnew.promise` を、promise 実引数の有無でモードを切り替える単一 API にする。実引数なし→ deferred（`{ resolve, reject }` を返す＝現 defer 挙動）、あり→ 登録（`UnitPromise`）。戻り型の多態は、`promise` を「関数式をオーバーロード呼び出しシグネチャ型へキャストしたプロパティ」として書くことで型レベルで表現する（tsc 検証済み）。

**Tech Stack:** TypeScript 5 / Jest 29 + ts-jest / Rollup 3。テスト・型・ビルドはホストで `cd packages/xnew && npx jest|npx tsc|npm run build`（Sail 不要）。

**設計スペック:** [docs/superpowers/specs/2026-06-12-promise-absorbs-defer-design.md](../specs/2026-06-12-promise-absorbs-defer-design.md)

---

## ファイル構成

- Modify: `src/core/xnew.ts` — `promise` をプロパティ＋キャスト形に置換（deferred 分岐追加・throw ガード撤去）、`defer` 削除、ヘッダの helper 一覧から `defer` 除去。
- Modify: `test/core/xnew/promise.test.ts` — `xnew.defer` の describe を deferred-mode の `xnew.promise` テストへ置換＋キーレス deferred テスト追加。
- Modify: `examples/2_extends/pixi_three_prerender/script.js`、`examples/3_games/tohoku_shot/script.js` — `xnew.defer(...)` → `xnew.promise(...)`。
- Regenerate: `examples/dist/xnew.{js,mjs,d.ts}` — `npm run build`。

すべて `cd packages/xnew` 起点。

---

### Task 1: `xnew.promise` に deferred モードを吸収し `xnew.defer` を削除

**Files:**
- Modify: `src/core/xnew.ts`（ヘッダ `:10`、`promise` `:71-89`、`defer` `:106-131`）
- Test: `test/core/xnew/promise.test.ts`（`describe('xnew.defer', ...)`）

- [ ] **Step 1: 失敗するテストを書く**

`test/core/xnew/promise.test.ts` の `describe('xnew.defer', () => { ... })` ブロック**全体**を、次の `describe` に置き換える（呼び出しを `xnew.promise` に変え、キーレス deferred テストを追加。中身の意味は維持）:

```ts
    describe('xnew.promise (deferred mode)', () => {
        it('returns a settle handle and resolves via resolve()', async () => {
            const done = jest.fn();
            let defer!: { resolve: (value?: unknown) => void; reject: (reason?: unknown) => void };
            xnew(() => {
                defer = xnew.promise();
                xnew.then(done);
            });

            await jest.advanceTimersByTimeAsync(0);
            expect(done).not.toHaveBeenCalled();

            defer.resolve();
            await jest.advanceTimersByTimeAsync(0);

            expect(done).toHaveBeenCalledTimes(1);
        });

        it('ignores subsequent settle calls (idempotent)', async () => {
            const done = jest.fn();
            const caught = jest.fn();
            let defer!: { resolve: (value?: unknown) => void; reject: (reason?: unknown) => void };
            xnew(() => {
                defer = xnew.promise();
                xnew.then(done);
                xnew.catch(caught);
            });

            defer.resolve();
            // a later reject after the first settle must be a no-op
            defer.reject();
            await jest.advanceTimersByTimeAsync(0);

            expect(done).toHaveBeenCalledTimes(1);
            expect(caught).not.toHaveBeenCalled();
        });

        it('passes a keyed deferred value to then under its key', async () => {
            const done = jest.fn();
            let defer!: { resolve: (value?: unknown) => void; reject: (reason?: unknown) => void };
            xnew(() => {
                defer = xnew.promise('ready');
                xnew.then(done);
            });

            await jest.advanceTimersByTimeAsync(0);
            expect(done).not.toHaveBeenCalled();

            defer.resolve(42);
            await jest.advanceTimersByTimeAsync(0);

            expect(done).toHaveBeenCalledWith({ ready: 42 });
        });

        it('excludes a keyless deferred value from the results object', async () => {
            const done = jest.fn();
            let defer!: { resolve: (value?: unknown) => void; reject: (reason?: unknown) => void };
            xnew(() => {
                defer = xnew.promise();
                xnew.then(done);
            });

            defer.resolve('ignored');
            await jest.advanceTimersByTimeAsync(0);

            expect(done).toHaveBeenCalledWith({});
        });
    });
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `cd packages/xnew && npx jest test/core/xnew/promise.test.ts`
Expected: FAIL。`xnew.promise()`（引数なし）は現状 throw ガードに当たらない（keyOrPromise が undefined）ものの、登録モードへ進み `xnew.scope(undefined)` で実行時エラー、または `xnew.promise('ready')` が throw ガードで例外になり、deferred 系テストが落ちる。

- [ ] **Step 3: `promise` をプロパティ＋キャスト形に置換し `defer` を削除（src/core/xnew.ts）**

ヘッダ `:10` を変更（`defer` を除去）:
```ts
// - xnew.promise / then / catch / finally : Unit に紐づく promise 管理
```

`promise(...)` メソッド（`:71-89`）を次の**プロパティ形**に置き換える（throw ガード撤去、deferred 分岐を先頭に追加）:
```ts
        /** Registers a promise to the current unit。第1引数が string ならキー。promise を渡さなければ deferred（{ resolve, reject } を返す）。 */
        promise: (function (keyOrPromise?: any, maybePromise?: any): any {
            const key = typeof keyOrPromise === 'string' ? keyOrPromise : undefined;
            const promise = typeof keyOrPromise === 'string' ? maybePromise : keyOrPromise;
            if (promise === undefined) {
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

`defer(...)` メソッド（`:106-131`、直前の JSDoc コメントと空行も含む）を**丸ごと削除**する。`then` / `catch` / `finally` は変更しない。

注意: `promise` は今やメソッド短縮記法ではなく `promise: (function(){...}) as {...},` というプロパティ。末尾のカンマを忘れない（後続に `then` メソッドが続く）。

- [ ] **Step 4: テストと型チェックを実行して合格を確認**

Run: `cd packages/xnew && npx jest test/core/xnew/promise.test.ts`
Expected: PASS（`xnew.promise (deferred mode)` 4件 + 既存の `keyed xnew.promise` / `then` / `catch` / `finally` すべて green）。

Run: `cd packages/xnew && npx tsc --noEmit -p tsconfig.json`
Expected: 型エラー無し。`defer` 参照が残っていれば失敗するので修正。

- [ ] **Step 5: 既存の登録モード呼び出しが壊れていないか型で確認**

Run: `cd packages/xnew && grep -rn "xnew.defer" src/`
Expected: 出力なし（`defer` は全廃）。

- [ ] **Step 6: コミット**

```bash
cd packages/xnew && git add src/core/xnew.ts test/core/xnew/promise.test.ts && git commit -m "feat(core): xnew.defer を廃止し xnew.promise の deferred モードに統合

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: example の `xnew.defer` を `xnew.promise` に置換

**Files:**
- Modify: `examples/2_extends/pixi_three_prerender/script.js`（`:109`、`:152`）
- Modify: `examples/3_games/tohoku_shot/script.js`（`:37`、`:82`、`:123`）

- [ ] **Step 1: pixi_three_prerender を置換**

`examples/2_extends/pixi_three_prerender/script.js`:
- `const { resolve } = xnew.defer('textures');` → `const { resolve } = xnew.promise('textures');`
- `const { resolve } = xnew.defer();` → `const { resolve } = xnew.promise();`

（`xnew.defer('textures')` は1箇所、`xnew.defer()` は1箇所。両方置換。）

- [ ] **Step 2: tohoku_shot を置換**

`examples/3_games/tohoku_shot/script.js`:
- `const { resolve } = xnew.defer('textures');` → `const { resolve } = xnew.promise('textures');`（1箇所）
- `const { resolve } = xnew.defer();` → `const { resolve } = xnew.promise();`（2箇所）

- [ ] **Step 3: 残骸が無いことを確認**

Run: `cd packages/xnew && grep -rn "xnew.defer" examples/ | grep -v examples/dist`
Expected: 出力なし。

- [ ] **Step 4: コミット**

```bash
cd packages/xnew && git add examples/2_extends/pixi_three_prerender/script.js examples/3_games/tohoku_shot/script.js && git commit -m "example: xnew.defer を xnew.promise に置換

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: バンドル再生成とフルスイート回帰

**Files:**
- Regenerate: `examples/dist/xnew.{js,mjs,d.ts}`

- [ ] **Step 1: バンドル再生成**

Run: `cd packages/xnew && npm run build`
Expected: エラーなく完了。

- [ ] **Step 2: バンドルが新 API を反映し defer が消えたことを確認**

Run: `cd packages/xnew && grep -c "defer" examples/dist/xnew.js; grep -n "resolve(value)" examples/dist/xnew.js | head -2`
Expected: `defer` の出現数 0、deferred 分岐の `resolve(value)` が存在。

- [ ] **Step 3: フルスイート + 型 + 残骸最終確認**

Run: `cd packages/xnew && npx jest`
Expected: 全 suite PASS。

Run: `cd packages/xnew && npx tsc --noEmit -p tsconfig.json`
Expected: 型エラー無し。

Run: `cd packages/xnew && grep -rIn "xnew\.defer\|\bdefer(" src examples test | grep -v examples/dist | grep -v node_modules`
Expected: 出力なし（`defer` 定義・呼び出しともに全廃）。

- [ ] **Step 4: コミット**

```bash
cd packages/xnew && git add examples/dist/xnew.js examples/dist/xnew.mjs examples/dist/xnew.d.ts && git commit -m "build: defer 廃止後の xnew バンドルを再生成

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## 自己レビュー結果

- **スペック網羅**: defer 削除＋promise への deferred 吸収（Task1）/ throw ガード撤去（Task1 Step3）/ オーバーロード型付け（Task1 Step3 のキャスト）/ deferred 挙動の維持・キー付き/キーレス（Task1 テスト）/ example 置換（Task2）/ バンドル再生成（Task3）/ ヘッダ更新（Task1 Step3）— すべてタスクに対応。
- **プレースホルダ**: 無し。各コードステップは実コード。
- **型整合**: `promise` のプロパティ＋キャスト型はスペックの検証済みブロックと一致。`then`/`catch`/`finally` は不変。
