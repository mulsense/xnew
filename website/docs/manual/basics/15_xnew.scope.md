# xnew.scope

`xnew.scope` は現在のコンポーネントコンテキストを取り込み、呼び出し時にそのコンテキストを復元するラッパー関数を返します。素の `setTimeout` / `setInterval` やネイティブの `addEventListener` の中で xnew API を呼び出したいときに使用します。これらの内部では通常、xnew のスコープが失われています。

ほとんどの場面では出番がありません。`xnew.timeout` / `xnew.interval` / `unit.on` はスコープを自動で保持します。`xnew.scope` はブラウザ API を直接使う場合のエスケープハッチとして用意されています。

## 使い方

```js
xnew.scope(callback);
```

**パラメータ:**
- `callback` — スコープを保持して実行する関数

**戻り値:**
- スコープを保持したラップ関数

## 用途

`setTimeout` やネイティブのイベントリスナーといった非同期処理の内部では、xnew のコンポーネントコンテキストが失われます。`xnew.scope` はこれらのコールバック内で正しいスコープを保持するためのものです。

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

### イベントリスナーでの利用

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

- 非同期処理やイベントハンドラの内部で `xnew.on` などの xnew API を使う場合は、コールバックを `xnew.scope` でラップしてください。
- 既に正しいスコープにいる場合、`xnew.scope` は不要です。
