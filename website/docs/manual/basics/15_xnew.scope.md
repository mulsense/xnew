# xnew.scope

`xnew.scope` は現在のコンポーネントコンテキストをキャプチャし、呼び出し時にそのコンテキストを復元するラッパー関数を返します。素の `setTimeout`・`setInterval`・ネイティブの `addEventListener` の中で xnew API を呼び出したいときに使用します。これらの内部では通常 xnew スコープが失われます。

ほとんどの場合は不要です。`xnew.timeout`・`xnew.interval`・`unit.on` はスコープを自動的に保持します。`xnew.scope` はブラウザ API を直接使う場合のためのエスケープハッチです。

## 使い方

```js
xnew.scope(callback);
```

**パラメータ:**
- `callback` — スコープを保持して実行する関数

**戻り値:**
- スコープを保持したラップ関数

## 用途

`setTimeout` やイベントリスナーなどの非同期処理では、xnew のコンポーネントコンテキストが失われます。`xnew.scope` はこれらのコールバック内で正しいコンポーネントスコープを維持します。

## 例

### setTimeout でのスコープ保持

```js
function Timer(unit) {
  xnew.nest('<div>', 'Timer Component');

  setTimeout(xnew.scope(() => {
    // The Timer component scope is preserved in this callback
    console.log('Timeout executed');
  }), 1000);
}
```

### イベントリスナーでの使用

```js
function Button(unit) {
  const el = xnew.nest('<button>', 'Click me');

  el.addEventListener('click', xnew.scope(() => {
    // The Button component scope is preserved on click
    console.log('Button clicked');
  }));
}
```

## 注意

- 非同期処理やイベントハンドラの内部で `xnew.on` などの xnew API を使用する場合は、コールバックを `xnew.scope` でラップしてください。
- すでに正しいスコープにいる場合、`xnew.scope` は不要です。
