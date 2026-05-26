# xnew.promise

`xnew.promise` は標準の Promise をラップし、`.then()` / `.catch()` ハンドラが現在の xnew コンポーネントスコープ内で実行されるようにします。Promise が解決される前にコンポーネントが finalize された場合、ハンドラは破棄されます。古いコールバックの実行やクラッシュは発生しません。

## 使い方

```js
const wrappedPromise = xnew.promise(promise);
```

**パラメータ:**
- `promise`: 標準の Promise オブジェクトまたは unit

**戻り値:**
- 現在の `xnew` スコープ内でハンドラを実行するラップ済み Promise

## 用途

通常の `Promise` は非同期で解決されます。`.then()` の実行時点で、リクエストを開始したコンポーネントが既に破棄されていることがあります。何も対策しないと、破棄済みの DOM への書き込みや要素の欠落といった不具合の原因になります。

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
汎用的な Promise の処理には `xnew.promise` を使用してください。HTTP リクエストには専用 API の `xnew.fetch` も利用できます。
:::
