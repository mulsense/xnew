# xnew.interval

`xnew.interval` は自動クリーンアップに対応した `setInterval` です。所属する unit が finalize されると interval は自動停止します。ID を保持して `clearInterval` を呼ぶ必要はありません。

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

### カウンター

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

unit が finalize されると、その unit に紐づくすべての interval が自動でキャンセルされます。

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
親 unit の finalize 時にすべての interval が自動でクリーンアップされるため、メモリリークやリソースの取りこぼしを心配する必要はありません。
:::
