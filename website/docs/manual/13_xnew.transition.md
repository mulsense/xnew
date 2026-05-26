# xnew.transition

`xnew.transition` は値を指定された期間にわたって `0` から `1` まで変化させ、フレームごとにコールバックを呼び出します。その値を任意のプロパティ（不透明度、位置、スケール、色）に渡せば、1 つの関数呼び出しでなめらかなアニメーションが得られます。

また連鎖可能で、コールバックをネストせずに timeout と transition をシーケンス化できます。

## 使い方

```js
const transition = xnew.transition(callback, interval, easing);
```

**パラメータ:**
- `callback({ value })`: 進捗値（0.0 〜 1.0）と共にフレームごとに呼び出される関数
- `duration`: アニメーション期間（ミリ秒、デフォルト: 0）
- `easing`: イージング関数名（デフォルト: 'linear'）

**戻り値:**
- 以下を持つ transition オブジェクト：
  - `clear()`: transition をキャンセル
  - `timeout(callback, interval)`: 別の timeout を連鎖
  - `transition(callback, interval, easing)`: 別の transition を連鎖

## 利用可能なイージング関数

- `'linear'` - 一定速度
- `'ease'` - 始点と終点はゆっくり、中間は速い
- `'ease-in'` - 始点がゆっくり
- `'ease-out'` - 終点がゆっくり
- `'ease-in-out'` - 始点と終点がゆっくり

## 例

### フェードインアニメーション

```js
xnew('<div>', (unit) => {
  unit.element.textContent = 'Fading in...';
  unit.element.style.opacity = '0';

  xnew.transition(({ value }) => {
    unit.element.style.opacity = value;
  }, 2000, 'ease-in');
});
```
### transition のキャンセル

```js
xnew('<div>', (unit) => {
  unit.element.textContent = 'Click to stop animation';

  const transition = xnew.transition(({ value }) => {
    unit.element.style.opacity = 1 - value;
  }, 5000, 'linear');

  unit.on('click', () => {
    transition.clear();
    unit.element.textContent = 'Animation stopped';
  });
});
```

## 自動クリーンアップ

unit が finalize されると、そのすべての transition が自動的にクリアされます：

```js
const unit = xnew((unit) => {
  xnew.transition(({ value }) => {
    console.log('Progress:', value);
  }, 5000, 'linear');
});

// Finalize after 2 seconds - transition automatically stops
xnew.timeout(() => {
  unit.finalize();
}, 2000);
```

:::tip
すべての transition は親 unit が finalize されたときに自動的にクリーンアップされます。これによりコンポーネント破棄後もアニメーションが継続することを防ぎます。
:::
