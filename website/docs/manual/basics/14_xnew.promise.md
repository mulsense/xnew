# xnew.promise

`xnew.promise` は標準の Promise をラップし、`.then()` / `.catch()` のハンドラを現在の xnew コンポーネントスコープで実行できるようにします。Promise が解決される前にコンポーネントが finalize された場合、ハンドラは破棄されます。古いコールバックの発火や、それに伴うクラッシュは発生しません。

## 使い方

```js
const wrappedPromise = xnew.promise(promise);
```

**パラメータ:**
- `promise`: 標準の Promise オブジェクトまたは unit

**戻り値:**
- 現在の xnew スコープでハンドラを実行するラップ済み Promise

## 用途

通常の `Promise` は非同期に解決されるため、`.then()` が呼び出される時点で、リクエストを発行したコンポーネントが既に破棄されていることがあります。何も対策しないと、破棄済み DOM への書き込みや要素消失などの不具合につながります。

`xnew.promise` は Promise をコンポーネントに紐付けます。unit が finalize されると、保留中のハンドラは破棄されます。

## 例

### 基本

```js
xnew((unit) => {
  xnew.promise(new Promise((resolve, reject) => {
    xnew.timeout(() => resolve('Success!'), 1000);
  }))
  .then((result) => {
    console.log(result); // "Success!"
    // This handler runs within the current xnew scope
  })
  .catch((error) => {
    console.error(error);
    // This handler also runs within the current xnew scope
  });
});
```

:::tip
汎用的な Promise 処理には `xnew.promise` を使ってください。HTTP リクエスト向けには専用の `xnew.fetch` も利用できます。
:::
