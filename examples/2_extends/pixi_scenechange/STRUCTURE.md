# pixi_scenechange — 構造図

対象: [`script.js`](./script.js)

---

# Scene1

## シーン内の構造

```mermaid
flowchart TD
    Scene1 -->|xnew| Text["Text: 'Scene1'"]
    Scene1 -->|xnew| Box["Box: 赤 0xff2266"]
```

## シーン遷移の条件

画面を `pointerdown`（タップ／クリック）すると `Scene2` へ遷移する。

---

# Scene2

## シーン内の構造

```mermaid
flowchart TD
    Scene2 -->|xnew| Text["Text: 'Scene2'"]
    Scene2 -->|xnew| Box["Box: 青 0x6622ff"]
```

## シーン遷移の条件

画面を `pointerdown`（タップ／クリック）すると `Scene1` へ遷移する。
