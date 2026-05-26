# xnew.interval

`xnew.interval` は自動クリーンアップ付きの `setInterval` です。所有する unit の finalize 時に interval は自動停止します。ID を保持して `clearInterval` を呼ぶ必要はありません。

## 使い方

```js
const interval = xnew.interval(callback, delay);
```

**パラメータ:**
- `callback`: 各 interval で実行する関数
- `duration`: 実行間隔 (ミリ秒)

**戻り値:**
- `clear()` メソッドを持つ interval オブジェクト

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

unit の finalize 時に、その unit に紐づくすべての interval が自動でクリアされます。

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
親 unit の finalize 時にすべての interval が自動でクリーンアップされます。メモリリークを防ぎ、リソースを安全に管理できます。
:::
