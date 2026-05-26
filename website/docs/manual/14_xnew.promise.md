# xnew.promise

`xnew.promise` は標準の Promise をラップし、その `.then()` / `.catch()` ハンドラが現在の xnew コンポーネントスコープ内で実行されるようにします。Promise が解決される前にコンポーネントが finalize された場合、ハンドラは静かに破棄されます。古いコールバックも、クラッシュもありません。

## 使い方

```js
const wrappedPromise = xnew.promise(promise);
```

**パラメータ:**
- `promise`: 標準の Promise オブジェクトまたは unit

**戻り値:**
- 現在の `xnew` スコープ内でハンドラを実行するラップされた Promise

## なぜ xnew.promise を使うのか？

通常の `Promise` は非同期で解決されます。`.then()` が実行される頃には、リクエストを開始したコンポーネントが既に消えている可能性があります。追加の管理コードがない場合、古い DOM への書き込み、要素の欠落、微妙なバグなどを引き起こす可能性があります。

`xnew.promise` は Promise をコンポーネントに結び付けます。unit が finalize されると、保留中のハンドラは自動的に破棄されます。

## 例

### 基本的な使い方

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
一般的な Promise の処理には `xnew.promise` を使用してください。HTTP リクエストに特化した、より便利な API を提供する `xnew.fetch` も利用できます。
:::
