# xnew.interval

`xnew.interval` は自動クリーンアップ機能を備えた `setInterval` です。所有する unit が finalize されると interval は自動的に停止します。ID を保持して `clearInterval` を手動で呼び出す必要はありません。

## 使い方

```js
const interval = xnew.interval(callback, delay);
```

**パラメータ:**
- `callback`: 各 interval で実行する関数
- `duration`: 実行間隔（ミリ秒）

**戻り値:**
- interval を停止する `clear()` メソッドを持つ interval オブジェクト

## 例

### 基本的なカウンター

```js
xnew('<div>', (unit) => {
  let count = 0;
  unit.element.textContent = count;

  xnew.interval(() => {
    count++;
    unit.element.textContent = count;
  }, 1000); // Update every second
});
```

### interval のキャンセル

```js
xnew('<div>', (unit) => {
  let count = 0;
  unit.element.textContent = 'Starting countdown...';

  const interval = xnew.interval(() => {
    count++;
    unit.element.textContent = `Count: ${count}`;

    // Stop after 10 iterations
    if (count >= 10) {
      interval.clear();
      unit.element.textContent = 'Countdown complete!';
    }
  }, 500);
});
```

## 自動クリーンアップ

unit が finalize されると、そのすべての interval が自動的にクリアされます：

```js
const unit = xnew((unit) => {
  xnew.interval(() => {
    console.log('This will stop when unit is finalized');
  }, 1000);
});

// Finalize after 5 seconds - interval automatically stops
xnew.timeout(() => {
  unit.finalize();
}, 5000);
```

:::tip
すべての interval は親 unit が finalize されたときに自動的にクリーンアップされます。これによりメモリリークを防止し、適切なリソース管理を実現します。
:::
