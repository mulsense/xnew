# xnew.timeout

`xnew.timeout` は 2 つの改善が加えられた `setTimeout` です。コールバックは正しい xnew のスコープで実行され、所有する unit が finalize されると自動的にキャンセルされます。timeout と transition を連鎖させて、コールバックをネストせずに複数ステップのシーケンスを構築することもできます。

## 使い方

```js
const timeout = xnew.timeout(callback, interval);
```

**パラメータ:**
- `callback`: 遅延後に実行する関数
- `duration`: 実行までの時間（ミリ秒）

**戻り値:**
- 以下を持つ transition オブジェクト：
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

unit が finalize されると、そのすべての timeout が自動的にクリアされます：

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
すべての timeout は親 unit が finalize されたときに自動的にクリーンアップされます。これによりメモリリークを防止し、コンポーネント破棄後にコールバックが実行されないことを保証します。
:::
