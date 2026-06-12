# xnew.promise

`xnew.promise` は Promise をコンポーネントに紐付け、`.then()` / `.catch()` のハンドラを現在のコンポーネントスコープで実行します。Promise の解決前にコンポーネントが破棄された場合、保留中のハンドラも破棄されるため、破棄済み DOM への書き込みなどの不具合が起きません。

## 使い方

```js
const promise = xnew.promise(source);
```

**パラメータ:**
- `source`: 標準の Promise、または unit（その unit に登録された全 promise の集約）

**戻り値:**
- 現在の xnew スコープでハンドラを実行するラップ済み Promise

## 例

### Promise のラップ

```js
xnew((unit) => {
  xnew.promise(fetch('/api/data'))
    .then((res) => unit.element.textContent = 'loaded')
    .catch((err) => unit.element.textContent = 'error');
});
```

### deferred（手動で解決）

引数なしで呼ぶと `{ resolve, reject }` を返し、任意のタイミングで解決できます。

```js
function Loader(unit) {
  const deferred = xnew.promise();

  unit.on('click', () => deferred.resolve('done'));

  return { ready: () => unit.promise };
}
```

### unit への集約

unit に登録した promise は `unit.promise` でまとめて待てます。

```js
const unit = xnew((u) => {
  xnew.promise(loadImage());
  xnew.promise(loadSound());
});

unit.promise.then(() => console.log('all assets ready'));
```
