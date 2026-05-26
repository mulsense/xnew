# xnew.context

`xnew.context` は、子孫コンポーネントが祖先から共有データを読み取れるようにします。中間の各層を経由してデータを渡す必要はありません。xnew における prop-drilling への解答です。

状態を保持する「プロバイダー」コンポーネントを設定し、ルート付近で 1 度だけ生成すれば、深くネストされた子孫を含むあらゆる子孫から名前で取得できます。

## 使い方

### コンテキスト値の取得
```js
const value = xnew.context(component);
```

**パラメータ:**
- `component`: コンテキストプロパティを表すコンポーネント関数

**戻り値:**
- 取得時: コンテキスト値、見つからない場合は `undefined`

## 動作の仕組み

- コンテキスト値は親 unit から子 unit に継承されます
- 子 unit はコンテキスト値をローカルでオーバーライドできます
- 子でのオーバーライドは親の値に影響しません
- コンテキスト検索は値が見つかるまで unit 階層を上方向に探索します

## 例

### データの共有

```js
xnew((unit) => {
  xnew(Data, { value: 1 });
  xnew(Child);
});

function Data(unit, { value }) {
  return {
    get value() { return value; }
  }
}

function Child(unit) {
  const data = xnew.context(Data);
  
  // data.value
}

```

### ネストされたコンテキストのオーバーライド

```js
xnew((unit) => {
  xnew(Data, { value: 1 });
  xnew(Child1);
});

function Data(unit, { value }) {
  return {
    get value() { return value; }
  }
}

function Child1(unit) {
  const data = xnew.context(Data);
  // data.value == 1
  
  xnew(Data, { value: 2 });
  xnew(Child2);
}

function Child2(unit) {
  const data = xnew.context(Data);
  
  // data.value == 2
}
```

## ユースケース

`xnew.context` は特に以下の用途に有用です：

- **テーマ / 設定** — ルートに 1 つの `Theme` コンポーネントを置き、その下のどこからでも利用
- **ゲーム状態** — スコア、レベル、プレイヤーデータをシーンツリー全体で共有
- **シーン管理** — `Flow` コントローラを明示的な props なしで子シーンに渡す
- **依存性注入** — オーディオや入力など、多くのコンポーネントが必要とするサービス

:::tip
`xnew.context` は一致するプロバイダーが見つかるまで unit 階層を遡って検索します。子は同じコンポーネントで独自のプロバイダーを作成して、他の枝に影響を与えずに親の値をローカルでシャドウできます。
:::