# キー付き `xnew.promise` と `collect` 廃止 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `xnew.promise` を `xnew.promise(key?, promise)` のキー付きに拡張し、`xnew.then` がキー付き promise の最終値を `{ key: value }` で渡せるようにする。`xnew.collect` と `Unit._.results` を廃止する。

**Architecture:** 結果を蓄積状態（`_.results`）に貯めるのをやめ、全 promise の settle 後にキー付き `UnitPromise` から結果オブジェクトを導出する。`UnitPromise.then` が同一オブジェクトを in-place 連結する既存設計により、キーは「`.then` チェーンの最終値」に自動で紐づく。`xnew.defer` もキー対応する。

**Tech Stack:** TypeScript 5 / Jest 29 + ts-jest。テストは `packages/xnew` 配下で `npx jest <path>` 実行（host で動作確認済み）。

**設計スペック:** [docs/superpowers/specs/2026-06-12-keyed-promise-design.md](../specs/2026-06-12-keyed-promise-design.md)

---

## ファイル構成

- Modify: `src/core/unit.ts` — `UnitPromise` に `key` フィールドと `results()` static を追加。`Unit._` 型と init から `results` を削除。
- Modify: `src/core/xnew.ts` — `promise` をキー付きに、`then` を `UnitPromise.results` ベースに、`defer` をキー対応に変更。`collect` を削除。ファイルヘッダの `collect` 記述を削除。
- Modify: `test/core/xnew/promise.test.ts` — `collect` の describe を削除し、キー付き promise / defer のテストへ置き換え。
- Modify: `examples/2_extends/three_mog/script.js` — キー付きへ書き換え（`collect` 撤去）。

すべて `cd packages/xnew` を起点とする相対パス。

---

### Task 1: キー付き `xnew.promise` と キー付き `xnew.then` 結果（`collect` / `_.results` 廃止）

**Files:**
- Modify: `src/core/unit.ts`（`UnitPromise` クラス、`Unit._` の型 `:74`、init `:150`）
- Modify: `src/core/xnew.ts`（ヘッダ `:10`、`promise` `:72-83`、`then` `:86-89`、`collect` `:127-130`）
- Test: `test/core/xnew/promise.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`test/core/xnew/promise.test.ts` の末尾の `describe('xnew.collect', ...)` ブロック（`:153-181`）を**丸ごと削除**し、代わりに次の describe を追加する:

```ts
    describe('keyed xnew.promise', () => {
        it('passes keyed promise values to then under their key', async () => {
            const done = jest.fn();
            xnew(() => {
                xnew.promise('a', Promise.resolve(1));
                xnew.promise('b', Promise.resolve(2));
                xnew.then(done);
            });

            await jest.advanceTimersByTimeAsync(0);

            expect(done).toHaveBeenCalledWith({ a: 1, b: 2 });
        });

        it('excludes keyless promises from the results object', async () => {
            const done = jest.fn();
            xnew(() => {
                xnew.promise('a', Promise.resolve(1));
                xnew.promise(Promise.resolve('ignored'));
                xnew.then(done);
            });

            await jest.advanceTimersByTimeAsync(0);

            expect(done).toHaveBeenCalledWith({ a: 1 });
        });

        it('binds the key to the final value of a then-chain', async () => {
            const done = jest.fn();
            xnew(() => {
                xnew.promise('a', Promise.resolve(1)).then((v: number) => v + 10).then((v: number) => v * 2);
                xnew.then(done);
            });

            await jest.advanceTimersByTimeAsync(0);

            expect(done).toHaveBeenCalledWith({ a: 22 });
        });

        it('lets a later duplicate key win', async () => {
            const done = jest.fn();
            xnew(() => {
                xnew.promise('a', Promise.resolve('first'));
                xnew.promise('a', Promise.resolve('second'));
                xnew.then(done);
            });

            await jest.advanceTimersByTimeAsync(0);

            expect(done).toHaveBeenCalledWith({ a: 'second' });
        });

        it('collects a child unit keyed results when registered with a key', async () => {
            const done = jest.fn();
            xnew(() => {
                const child = xnew(() => {
                    xnew.promise('x', Promise.resolve(7));
                });
                xnew.promise('child', child);
                xnew.then(done);
            });

            await jest.advanceTimersByTimeAsync(0);

            expect(done).toHaveBeenCalledWith({ child: { x: 7 } });
        });
    });
```

さらに既存の `'passes the unit results object to the callback'`（`:43-55`）のコメントを次へ更新（アサーション `{}` は据え置き、文言のみ）:

```ts
            // then receives an object of keyed results; nothing keyed here, so it is empty
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `cd packages/xnew && npx jest test/core/xnew/promise.test.ts`
Expected: FAIL。`keyed xnew.promise` の各 it が `Expected: {"a": 1, "b": 2}` 等に対し `Received: {}`（キー未対応のため）で落ちる。

- [ ] **Step 3: `UnitPromise` に `key` と `results()` を追加（`src/core/unit.ts`）**

`UnitPromise` クラスを次に置き換える（`all` は `catch`/`finally` 用に残す）:

```ts
export class UnitPromise {
    private promise: Promise<any>;
    public key?: string;
    constructor(promise: Promise<any>, key?: string) { this.promise = promise; this.key = key; }

    public then(callback: Function): UnitPromise { return this.wrap('then', callback); }
    public catch(callback: Function): UnitPromise { return this.wrap('catch', callback); }
    public finally(callback: Function): UnitPromise { return this.wrap('finally', callback); }

    public static all(promises: UnitPromise[]): UnitPromise {
        return new UnitPromise(Promise.all(promises.map(p => p.promise)));
    }

    // キー付き promise だけを { key: 最終チェーン値 } に集約した UnitPromise を返す。
    public static results(promises: UnitPromise[]): UnitPromise {
        return new UnitPromise(
            Promise.all(promises.map(p => p.promise)).then((values) => {
                const out: Record<string, any> = {};
                promises.forEach((p, i) => {
                    if (p.key !== undefined) { out[p.key] = values[i]; }
                });
                return out;
            })
        );
    }

    private wrap(key: 'then' | 'catch' | 'finally', callback: Function): UnitPromise {
        const snapshot = Unit.snapshot(Unit.currentUnit);
        this.promise = (this.promise[key] as Function)((...args: any[]) => Unit.scope(snapshot, callback, ...args));
        return this;
    }
}
```

続けて `Unit._` から `results` を除去する。型定義（`:74`）の行を削除:

```ts
        promises: UnitPromise[];
        defines: Record<string, any>;
```

init（`:149-151`）の `results: {},` 行を削除:

```ts
            promises: [],
            Components: [],
```

- [ ] **Step 4: `xnew.promise` / `then` をキー対応にし `collect` を削除（`src/core/xnew.ts`）**

ファイルヘッダ（`:10`）から `collect` を削る:

```ts
// - xnew.promise / then / catch / finally / defer : Unit に紐づく promise 管理
```

`promise`（`:71-83`）を次に置き換える:

```ts
        /** Registers a promise（Promise / async 関数 / Unit）to the current unit。第1引数が string ならキー。 */
        promise(keyOrPromise: string | Function | Promise<any> | Unit, maybePromise?: Function | Promise<any> | Unit): UnitPromise {
            const key = typeof keyOrPromise === 'string' ? keyOrPromise : undefined;
            const promise = (typeof keyOrPromise === 'string' ? maybePromise : keyOrPromise)!;
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
        },
```

`then`（`:85-89`）を次に置き換える:

```ts
        /** Runs callback(results) after all registered promises resolve（results はキー付き promise の最終値）。 */
        then(callback: Function): UnitPromise {
            return UnitPromise.results(Unit.currentUnit._.promises).then(callback);
        },
```

`collect`（`:127-130`、直前の空行・JSDoc 含む）を**丸ごと削除**する。`catch` / `finally` / `defer` / `scope` は変更しない。

- [ ] **Step 5: テストと型チェックを実行して合格を確認**

Run: `cd packages/xnew && npx jest test/core/xnew/promise.test.ts`
Expected: PASS（`keyed xnew.promise` 5件 + 既存 then/catch/finally/defer すべて green、`collect` describe は消えている）。

Run: `cd packages/xnew && npx tsc --noEmit -p tsconfig.json`
Expected: 型エラー無し（`collect` 参照や `_.results` 参照が残っていれば失敗するので、その場合は修正）。

- [ ] **Step 6: コミット**

```bash
cd packages/xnew && git add src/core/unit.ts src/core/xnew.ts test/core/xnew/promise.test.ts && git commit -m "feat(core): キー付き xnew.promise / then を実装し collect を廃止

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `xnew.defer(key?)` のキー対応

**Files:**
- Modify: `src/core/xnew.ts`（`defer` `:101-125`）
- Test: `test/core/xnew/promise.test.ts`（`xnew.defer` describe）

- [ ] **Step 1: 失敗するテストを書く**

`test/core/xnew/promise.test.ts` の `describe('xnew.defer', ...)` 内の末尾に次の it を追加する:

```ts
        it('passes a keyed defer value to then under its key', async () => {
            const done = jest.fn();
            let defer!: { resolve: (value?: unknown) => void; reject: (reason?: unknown) => void };
            xnew(() => {
                defer = xnew.defer('ready');
                xnew.then(done);
            });

            await jest.advanceTimersByTimeAsync(0);
            expect(done).not.toHaveBeenCalled();

            defer.resolve(42);
            await jest.advanceTimersByTimeAsync(0);

            expect(done).toHaveBeenCalledWith({ ready: 42 });
        });
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `cd packages/xnew && npx jest test/core/xnew/promise.test.ts -t "keyed defer"`
Expected: FAIL。`xnew.defer('ready')` の引数が無視され、`resolve(42)` の値も結果に入らず `Received: {}`。

- [ ] **Step 3: `defer` をキー対応に変更（`src/core/xnew.ts`）**

`defer`（`:101-125`）を次に置き換える:

```ts
        /** Registers a deferred promise; key を付けると then 結果に入る。{ resolve, reject } で外から settle（2 回目以降は無視）。 */
        defer(key?: string): { resolve: (value?: unknown) => void; reject: (reason?: unknown) => void } {
            let settled = false;
            let resolve!: (value?: unknown) => void;
            let reject!: (reason?: unknown) => void;

            const unitPromise = new UnitPromise(new Promise((res, rej) => {
                resolve = res;
                reject = rej;
            }));
            unitPromise.key = key;
            Unit.currentUnit._.promises.push(unitPromise);

            return {
                resolve(value?: unknown) {
                    if (settled) return;
                    settled = true;
                    resolve(value);
                },
                reject(reason?: unknown) {
                    if (settled) return;
                    settled = true;
                    reject(reason);
                },
            };
        },
```

- [ ] **Step 4: テストと型チェックを実行して合格を確認**

Run: `cd packages/xnew && npx jest test/core/xnew/promise.test.ts`
Expected: PASS（新規 `keyed defer` + 既存 `xnew.defer` 2件含む全件 green）。

Run: `cd packages/xnew && npx tsc --noEmit -p tsconfig.json`
Expected: 型エラー無し。

- [ ] **Step 5: コミット**

```bash
cd packages/xnew && git add src/core/xnew.ts test/core/xnew/promise.test.ts && git commit -m "feat(core): xnew.defer をキー対応にし resolve/reject が値を取れるよう拡張

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `three_mog` サンプルをキー付きへ書き換え

**Files:**
- Modify: `examples/2_extends/three_mog/script.js`（`:101-146`）

- [ ] **Step 1: `Model` 内の promise フローをキー付きへ書き換える**

`examples/2_extends/three_mog/script.js` の 1本目のチェーン末尾（`:113-115`）を次へ変更し、`xnew.collect({ vrm })` を撤去:

```js
  }).then((vrm) => {
    return vrm;
  });
```

を、チェーンの先頭にキーを付ける形へ。具体的には `:101` を次に変更:

```js
  xnew.promise('vrm', voxelkit.load(mogPath))
```

そして `:113-115` の `.then((vrm) => { xnew.collect({ vrm }); });` を削除（チェーンの最終値がそのまま `vrm` キーになるため、`parse` 結果を返す `.then` で終端させる）。`:106-112` の VRM 生成 `.then` が `vrm` を resolve しているので、その後の `.then((vrm) => { xnew.collect({ vrm }); })` ブロックは丸ごと削除する。

2本目のチェーン（`:117-123`）を次へ変更し、`xnew.collect({ vrma })` を撤去:

```js
  xnew.promise('vrma', new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
    loader.load(vrmaPath, (gltf) => resolve(gltf.userData.vrmAnimations[0]));
  }));
```

`xnew.then(({ vrm, vrma }) => { ... })`（`:125-146`）は**変更不要**（キー付き結果をそのまま受け取れる）。

書き換え後の該当部分の最終形:

```js
  xnew.promise('vrm', voxelkit.load(mogPath))
  .then((composits) => {
    return voxelkit.convertVRM(composits[0]);
  })
  .then((arrayBuffer) => {
    return xnew.promise((resolve) => {
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));
      loader.parse(arrayBuffer.buffer, '', (gltf) => resolve(gltf.userData.vrm), (error) => {
        console.error('Failed to load VRM:', error);
      });
    });
  });

  xnew.promise('vrma', new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
    loader.load(vrmaPath, (gltf) => resolve(gltf.userData.vrmAnimations[0]));
  }));

  xnew.then(({ vrm, vrma }) => {
    // ...（既存のまま）
  });
```

注意: 内側の `xnew.promise((resolve) => {...})`（`:106`）はキー無しのまま。これは親 unit に登録されるが `then` の結果には現れず、`.then` チェーンの戻り値として外側 `'vrm'` チェーンに合流する。挙動は従来どおり。

- [ ] **Step 2: 型/Lint で壊れていないことを確認**

このサンプルは Jest 対象外。`xnew.collect` 参照が残っていないことを grep で確認:

Run: `cd packages/xnew && grep -rn "xnew.collect" examples/ src/`
Expected: 出力なし（collect は全廃）。

- [ ] **Step 3: コミット**

```bash
cd packages/xnew && git add examples/2_extends/three_mog/script.js && git commit -m "example(three_mog): キー付き xnew.promise に書き換え collect を撤去

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: フルスイート回帰確認

**Files:** なし（検証のみ）

- [ ] **Step 1: xnew の全テストを実行**

Run: `cd packages/xnew && npx jest`
Expected: 全 suite PASS。`collect` 関連の旧テストは存在せず、`keyed xnew.promise` / `keyed defer` が green。

- [ ] **Step 2: 型チェック全体**

Run: `cd packages/xnew && npx tsc --noEmit -p tsconfig.json`
Expected: 型エラー無し。

- [ ] **Step 3: `collect` / `_.results` の残骸が無いことを最終確認**

Run: `cd packages/xnew && grep -rn "collect\|_.results\|results:" src/ examples/`
Expected: `UnitPromise.results` 定義と `results` ローカル変数以外に、`xnew.collect` / `_.results` フィールド参照が残っていないこと。残っていれば該当タスクへ戻って修正。

---

## 自己レビュー結果

- **スペック網羅**: キー付き promise（Task1）/ キー無し後方互換（Task1 test）/ then 結果導出（Task1）/ collect・`_.results` 廃止（Task1）/ defer キー対応（Task2）/ 重複キー後勝ち（Task1 test）/ ネスト Unit（Task1 test）/ 例更新（Task3）/ addons 無変更（検証は Task4 grep で担保）— すべてタスクに対応。
- **プレースホルダ**: 無し。各コードステップは実コードを記載。
- **型整合**: `UnitPromise.results` / `key` / `promise(keyOrPromise, maybePromise?)` / `defer(key?)` の名称はタスク間で一致。`all` は catch/finally 用に残置。
