# xnew.timeout

`xnew.timeout` は 2 つの拡張を加えた `setTimeout` です。コールバックは正しい xnew スコープで実行され、所有する unit の finalize 時に自動でキャンセルされます。timeout と transition を連鎖させて、コールバックをネストせずに多段シーケンスを構築できます。

## 使い方

```js
const timeout = xnew.timeout(callback, interval);
```

**パラメータ:**
- `callback`: 遅延後に実行する関数
- `duration`: 実行までの時間 (ミリ秒)

**戻り値:**
- 次のプロパティを持つ transition オブジェクト:
  - `clear()`: transition をキャンセル
  - `timeout(callback, duration)`: 別の timeout を連鎖
  - `transition(callback, duration, easing)`: 別の transition を連鎖

## 例

### 基本的な遅延実行

```js
xnew('<div>', (unit) => {
  unit.element.textContent = 'Click me!';

  unit.on('click', () => {
    unit.element.textContent = 'Clicked! Resetting in 2 seconds...';

    xnew.timeout(() => {
      unit.element.textContent = 'Click me!';
    }, 2000);
  });
});
```

### timeout のキャンセル

```js
xnew('<button>', (unit) => {
  unit.element.textContent = 'Start countdown';

  let timeout;

  unit.on('click', () => {
    // Cancel previous timeout if exists
    if (timeout) {
      timeout.clear();
    }

    unit.element.textContent = 'Countdown started...';

    timeout = xnew.timeout(() => {
      unit.element.textContent = 'Done!';
    }, 3000);
  });
});
```

## 自動クリーンアップ

unit の finalize 時に、その unit に紐づくすべての timeout が自動でクリアされます。

```js
const unit = xnew((unit) => {
  xnew.timeout(() => {
    console.log('This will never execute');
  }, 5000);

  // Finalize after 1 second
  xnew.timeout(() => {
    unit.finalize(); // Automatically clears the 5-second timeout
  }, 1000);
});
```

:::tip
親 unit の finalize 時にすべての timeout が自動でクリーンアップされます。メモリリークを防ぎ、破棄後のコールバック実行を抑止します。
:::
