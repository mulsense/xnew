# xnew.find

`xnew.find` は、特定のコンポーネント関数で生成され、現在アクティブなすべての unit を返します。手動で配列を管理することなく、すべての敵にブロードキャストしたり、すべてのカウンターを同期したり、移動するすべてのオブジェクトと衝突判定を行ったりする最も簡単な方法です。

## 使い方

```js
const units = xnew.find(Component);
```

**パラメータ:**
- `Component`: 検索対象のコンポーネント関数

**戻り値:**
- 指定したコンポーネント関数で生成されたすべての unit の配列

## 例

### 基本的な使い方

```js
function Counter(unit) {
  xnew.nest('<div>');
  let count = 0;
  unit.element.textContent = count;

  return {
    increment() {
      count++;
      unit.element.textContent = count;
    }
  };
}

// Create multiple counters
const counter1 = xnew(Counter);
const counter2 = xnew(Counter);
const counter3 = xnew(Counter);

// Find all Counter units
const allCounters = xnew.find(Counter);
console.log(allCounters.length); // 3

// Increment all counters at once
allCounters.forEach(counter => counter.increment());
```

### 複数インスタンスの管理

```js
function Player(unit, { name }) {
  xnew.nest('<div>');
  unit.element.textContent = `Player: ${name}`;

  let score = 0;

  return {
    addScore(points) {
      score += points;
      unit.element.textContent = `Player: ${name} - Score: ${score}`;
    },
    getScore() {
      return score;
    }
  };
}

// Create players
xnew(Player, { name: 'Alice' });
xnew(Player, { name: 'Bob' });
xnew(Player, { name: 'Charlie' });

// Find all players
const players = xnew.find(Player);

// Add points to all players
players.forEach(player => player.addScore(10));

// Calculate total score
const totalScore = players.reduce((sum, player) => sum + player.getScore(), 0);
console.log('Total score:', totalScore); // 30
```

## ユースケース

`xnew.find` は特に以下の用途に有用です：

- **複数インスタンスの連携**: 特定のコンポーネントタイプのすべてのインスタンスを更新または制御
- **状態の同期**: 複数コンポーネントを同期状態に保つ
- **ブロードキャスト**: すべてのインスタンスにメッセージやイベントを送信
- **クリーンアップ操作**: コンポーネントのすべてのインスタンスを検索して削除
- **統計と監視**: アクティブなコンポーネントの数を数えたり分析したりする
- **フィルタリングと選択**: 条件に基づいた特定のインスタンスの検索

:::tip
`xnew.find` は現在アクティブな unit のみを返します。finalize された unit は結果に含まれません。
:::
