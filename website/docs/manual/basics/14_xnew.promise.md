# xnew.promise

`xnew.promise` は標準の Promise をコンポーネントに紐付け、`.then()` / `.catch()` のハンドラを現在のコンポーネントスコープで実行します。Promise の解決前にコンポーネントが破棄された場合、保留中のハンドラも破棄されるため、破棄済み DOM への書き込みなどの不具合が起きません。

## 使い方

```js
const wrappedPromise = xnew.promise(promise);
```

**パラメータ:**
- `promise`: 標準の Promise オブジェクトまたは unit

**戻り値:**
- 現在の xnew スコープでハンドラを実行するラップ済み Promise

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
