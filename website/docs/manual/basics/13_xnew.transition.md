# xnew.transition

`xnew.transition` は指定期間にわたり値を `0` から `1` まで変化させ、フレームごとにコールバックを呼び出します。この値を不透明度・位置・スケール・色などのプロパティに渡せば、1 回の呼び出しで滑らかなアニメーションが得られます。

連鎖呼び出しに対応しており、timeout や transition をネストせずにシーケンス化できます。

## 使い方

```js
const transition = xnew.transition(callback, interval, easing);
```

**パラメータ:**
- `callback({ value })`: 進捗値 (0.0 〜 1.0) を引数にフレームごとに呼び出される関数
- `duration`: アニメーション期間 (ミリ秒、デフォルト: 0)
- `easing`: イージング関数名 (デフォルト: 'linear')

**戻り値:**
- 次のプロパティを持つ transition オブジェクト:
  - `clear()`: transition をキャンセル
  - `timeout(callback, interval)`: 別の timeout を連鎖
  - `transition(callback, interval, easing)`: 別の transition を連鎖

## イージング関数一覧

- `'linear'` — 一定速度
- `'ease'` — 始点と終点はゆっくり、中間は速い
- `'ease-in'` — 始点がゆっくり
- `'ease-out'` — 終点がゆっくり
- `'ease-in-out'` — 始点と終点がゆっくり

## 例

### フェードイン

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

unit の finalize 時に、その unit に紐づくすべての transition が自動でクリアされます。

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
親 unit の finalize 時にすべての transition が自動でクリーンアップされます。破棄後にアニメーションが残り続けることを防ぎます。
:::
