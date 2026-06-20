---
name: xnew-structure
description: Visualize the structure of an xnew program — analyze a script/example that uses xnew() / xnew.extend() / unit.change() and produce a simple, human-readable Markdown file with one Mermaid flowchart per component (scene). Use when the user wants to understand or document how the component functions of an xnew program relate to each other.
---

# xnew structure visualizer

xnew のプログラム（`script.js` など）を読み取り、**コンポーネント関数ごとの内部構造**を
シンプルな Markdown + Mermaid 図に変換するためのスキル。

xnew は「コンポーネント指向」ライブラリで、アプリは小さなコンポーネント関数 `(unit, props) => {...}`
を組み合わせて構成される。このスキルは、各コンポーネント（とくに Scene）が `xnew()` で
**どの子コンポーネントを生成するか**を、1コンポーネント＝1図として描く。

## 出力イメージ（これがゴール）

```markdown
# pixi_scenechange — 構造図

対象: [`script.js`](./script.js)

---

# Scene1

## シーン内の構造

​```mermaid
flowchart TD
    Scene1 -->|xnew| Text["Text: 'Scene1'"]
    Scene1 -->|xnew| Box["Box: 赤 0xff2266"]
​```

## シーン遷移の条件

画面を `pointerdown`（タップ／クリック）すると `Scene2` へ遷移する。

---

# Scene2

## シーン内の構造

​```mermaid
flowchart TD
    Scene2 -->|xnew| Text["Text: 'Scene2'"]
    Scene2 -->|xnew| Box["Box: 青 0x6622ff"]
​```

## シーン遷移の条件

画面を `pointerdown`（タップ／クリック）すると `Scene1` へ遷移する。
```

## 何を抽出するか（xnew の語彙 → 図の対応）

対象プログラムを読み、各コンポーネント関数の本体から以下を拾う。

| コードのパターン | 意味 | 図での扱い |
| --- | --- | --- |
| `function Foo(unit, props) {}` | コンポーネント関数の定義 | 1つの図（`# Foo` 見出し） |
| `xnew(Child, props)` / `xnew(unit, Child)` 等 | 親が子 unit を生成（**合成**） | `Foo -->\|xnew\| Child` のエッジ |
| `xnew.extend(Base)` | 機能の取り込み（拡張） | **省略する**（下記ルール参照） |
| `unit.change(Other)` | scene 遷移 | 図には描かず、図の下に文章で説明する（下記ルール参照） |

### 重要なルール

1. **`xnew.basics.*` の extend は図に描かない。**
   `xnew.extend(xnew.basics.Scene)` のような組み込みの拡張は、どのシーンにも自明に含まれる前提なので
   ノードにもエッジにもしない。図には `xnew()` で生成する**子コンポーネントだけ**を出す。
2. **1コンポーネント＝1図、`# コンポーネント名` 見出しで分ける。**
   とくに `unit.change()` で相互に切り替わるシーン（`Scene1` ⇄ `Scene2`）は絶対に1枚にまとめない。
   各シーンを独立した図にして、子（`Text`/`Box` 等）が図をまたいで共有されないようにする。
3. **子ノードのラベルには区別に必要な props だけ添える。**
   同じコンポーネント（例 `Text`/`Box`）が複数のシーンに出るときは、違いが分かるよう
   主要な prop を短く付す（例: `Text: 'Scene1'`、`Box: 赤 0xff2266`）。色などは日本語の通称を併記してよい。
4. **各シーンは `# シーン名` の下を 2 つの `##` 小見出しで構成する。**
   - `## シーン内の構造` … `flowchart` を置く（`xnew()` で生成する子だけ）。
   - `## シーン遷移の条件` … 別シーンへの遷移条件を**文章で**書く（Mermaid に入れない）。
     「どの操作・イベント（`unit.on('pointerdown', ...)` など）でどのシーンへ `change` するか」を一文で。
     遷移先が複数あれば箇条書き。遷移が無いシーンは「遷移なし」と書くか小見出しごと省略してよい。

## 解析手順

1. 対象ファイル（と import される関連ファイル）を読み、コンポーネント関数（第1引数が `unit`）を列挙する。
2. シーン的な主役コンポーネント（`xnew.extend(xnew.basics.Scene)` を持つ、または `unit.change` の対象に
   なっているもの）を中心に、それぞれの本体から `xnew(Child, props)` 呼び出しを抽出する。
3. 各コンポーネントについて `# 名前` 見出し＋ `flowchart TD` を1つ作り、`親 -->|xnew| 子` のエッジを並べる。
4. 子ラベルには、シーン間の違いが分かる prop（テキスト・色など）だけを短く添える。
5. 変数経由の動的な `xnew(variable)` など読み取れない関係は、推測で確定せず注記にとどめる。

## 出力ファイル

- 対象と同じディレクトリに `STRUCTURE.md`（名前は対象に合わせてよい）を作成する。
- 先頭に `# <例名> — 構造図` と `対象: [\`script.js\`](./script.js)` を置く。
- 以降、主役コンポーネントごとに `---` 区切りで `# 名前` + flowchart を並べる。
- `Text`/`Box` のように末端の表示部品しか持たない単純なアプリでは、Scene 単位の図だけで十分。
  より複雑な構成（多段の合成や遷移）では、必要に応じてコンポーネントを追加で図にする。

## 仕上げ

- Mermaid は GitHub / VSCode プレビューで描画される前提。ラベル中で `()` `{}` を多用しない。
- 生成後、ファイルパスと「各コンポーネントの内部構造（生成する子）を図にした」ことを2〜3行で報告する。
