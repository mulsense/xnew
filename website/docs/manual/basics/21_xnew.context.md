# xnew.context

`xnew.context` を使うと、子孫コンポーネントから祖先の共有データを取得できます。中間の各層を介して props を渡す必要はありません。xnew における prop-drilling への対処法です。

状態を保持する「プロバイダー」コンポーネントをルート付近で 1 度生成しておけば、深くネストされた子孫からも名前で取得できます。

## 使い方

### コンテキスト値の取得
```js
const value = xnew.context(component);
```

**パラメータ:**
- `component`: コンテキストを表すコンポーネント関数

**戻り値:**
- コンテキスト値。見つからない場合は `undefined`

## 動作

- コンテキスト値は親 unit から子 unit に継承されます。
- 子 unit はコンテキスト値をローカルで上書きできます。
- 子側の上書きは親の値に影響しません。
- コンテキストの検索は、値が見つかるまで unit 階層を上方向に辿ります。

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

### ネストされたコンテキストの上書き

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

`xnew.context` は次のような用途に適しています。

- **テーマ / 設定** — ルートに `Theme` を 1 つ置き、配下のどこからでも参照
- **ゲーム状態** — スコア・レベル・プレイヤーデータをシーンツリー全体で共有
- **シーン管理** — `Flow` コントローラを props を介さず子シーンに渡す
- **依存性注入** — オーディオや入力など、多くのコンポーネントが必要とするサービス

:::tip
`xnew.context` は一致するプロバイダーが見つかるまで unit 階層を遡ります。子側で同じコンポーネントのプロバイダーを生成すれば、他の枝に影響を与えずに親の値をローカルで上書きできます。
:::
