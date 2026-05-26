# xnew.scope

`xnew.scope` は現在のコンポーネントコンテキストをキャプチャし、呼び出された際にそれを復元するラッパーを返します。raw な `setTimeout`、`setInterval`、ネイティブの `addEventListener` の中で xnew API を呼び出す必要がある場合に使用します。これらの場所では本来 xnew スコープが失われてしまいます。

ほとんどの場合、これは必要ありません。`xnew.timeout`、`xnew.interval`、`unit.on` はすべて自動的にスコープを保持します。`xnew.scope` はブラウザ API を直接使用する場合のためのエスケープハッチです。

## 基本的な使い方

```js
xnew.scope(callback);
```

**パラメータ:**
- `callback` - スコープを保持して実行する関数

**戻り値:**
- スコープが保持されたラップ関数

## なぜ必要なのか

`setTimeout` やイベントリスナーなどの非同期処理では、通常 xnew のコンポーネントコンテキストが失われます。`xnew.scope` はこれらの非同期コールバック内で正しいコンポーネントスコープが維持されることを保証します。

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

- 非同期処理やイベントハンドラの内部で `xnew.on` などの xnew API を使用する場合は、必ずコールバックを `xnew.scope` でラップしてください
- すでに正しいスコープにいる場合は `xnew.scope` は不要です
