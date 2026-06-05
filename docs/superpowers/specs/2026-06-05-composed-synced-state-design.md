# 設計: base + extend 合成での synced state サポート

- 日付: 2026-06-05
- 対象: `packages/xnew`（submodule, branch `feat/sync-composed-state`）
- 関連: [src/core/sync.ts](../../../src/core/sync.ts), [src/core/xnew.ts](../../../src/core/xnew.ts), [src/core/unit.ts](../../../src/core/unit.ts)

## 背景 / 問題

`xnew.sync.state` は Unit ごとに1つの `unit._.state` を読み書きする。`xnew.extend(Base)`
は同じ Unit の上で Base 本体を実行するため、Base と拡張側コンポーネントが両方
`xnew.sync.state` を呼ぶと、現状は次の理由で正しく機能しない。

1. **client 側の注入が read-once** — `takeInjectedState()` が一度読むと注入スロットを
   null 化するため、2回目以降の `xnew.sync.state` は注入されたサーバー状態を受け取れず、
   ローカルの `initial` で初期化してしまう（構築後の保険 `Object.assign` で結果的には
   直るが、本体実行中の読み取りはローカル初期値のまま）。
2. **`injected ?? initial` がバッグ単位の択一** — キー単位ではなくバッグ全体で
   注入 or initial を選ぶため、合成時に破綻する。

## 決定事項（合意済み）

- **状態モデル: フラット共有バッグ** — `unit._.state` は Unit ごとに1つの平坦な
  オブジェクトのまま。複数の `xnew.sync.state` は自分の宣言キーを同じバッグへマージする。
- **同名キー衝突: dev 警告 + last-write-wins** — 別宣言が既に同じキーを持つ場合は
  `console.warn` を出す。動作は後勝ち。
- **実装アプローチ: 案A（注入を Unit 単位フィールドへ退避）。**

## 設計

### 1. Unit に `_.injected` を追加

[src/core/unit.ts](../../../src/core/unit.ts) の内部状態 `_` に
`injected: Record<string, any> | null`（既定 `null`）を追加する。

### 2. 構築開始時に注入スロットを Unit へ退避

注入スロットは `Unit.injectedSlot`（Unit の static）に置く。sync.ts は既に `Unit` を
import しているため、ここに書き込めば unit.ts → sync.ts の **循環 import を新設せずに**
済む（直近で「sync 循環依存解消」を行っているため、この向きの依存は足さない）。
Unit コンストラクタは `_` 構築時に `Unit.injectedSlot` を `this._.injected` へ退避し、
本体実行（`Unit.extend`）より前に `Unit.injectedSlot` を即 `null` 化する。

- 注入は **この Unit に限定**され、本体内でインライン生成された子 Unit へ漏れない
  （read-once が担っていた漏れ防止を per-unit スコープで代替する）。
- ネストした子 Unit はそれぞれ自分の `_.injected`（= `null`）を持つ。

### 3. `xnew.sync.state` をキー単位マージに

[src/core/xnew.ts](../../../src/core/xnew.ts) の `state()` を以下に書き換える。

```js
state(initial = {}) {
    const unit = Unit.currentUnit;
    if (unit._.state === null) unit._.state = {};
    const injected = unit._.injected;          // 消費しない（複数回読める）
    for (const key of Object.keys(initial)) {
        if (key in unit._.state) {             // 別の sync.state が既に宣言 = 衝突
            console.warn(`xnew.sync.state: duplicate key "${key}" across declarations`);
        }
        unit._.state[key] = (injected && key in injected) ? injected[key] : initial[key];
    }
    return unit._.state;
}
```

- client: 注入されたサーバー値をキー単位で優先。
- server / standalone: 注入が無いので `initial` を採用。
- 呼び出し順に依存しない（注入はサーバー値で常に上書きされる）。

### 4. sync.ts の調整

- read-once の `takeInjectedState` とモジュールローカルの `injectedState` を削除。
  `apply` は `Unit.injectedSlot = node.state` → `new Unit(...)` → `Unit.injectedSlot = null`
  の囲みで注入する（コンストラクタが構築開始時に取り込む）。
- 構築後の保険 `Object.assign(unit._.state, node.state)` は、client が宣言しないキー用に残す。

### 5. 無変更

- `captureStateTree` / `getSyncName` は変更しない。フラットバッグなので単一 `_.state` を
  そのまま捕捉し、`_.Components` 先頭一致での同期名解決も従来通り。

## テスト（Jest / `test/core/sync/`）

1. `Base`（synced state を宣言）を `xnew.extend(Base)` する `Enemy` を用意し、
   capture → apply で client 側 `_.state` に **Base と Enemy 両方のキーがサーバー値で**
   入ることを検証。
2. 同名キーを2宣言したとき `console.warn` が出ること。
3. 親 Unit の注入が、本体内でインライン生成した非 synced 子 Unit の
   `xnew.sync.state` に漏れないこと。
4. 既存テスト（`state.test.ts` / `loopback.test.ts` など）が引き続き通ること。

## 非対象（YAGNI）

- コンポーネント単位の名前空間化（階層 state）。フラット共有バッグの選択により不要。
- サーバー側で state からキーを「消す」運用のサポート（v1 の割り切りを踏襲）。
