
# case 1 (old)

function Parent(unit) {
    // scope 1
    const unit = xnew(Child);

    xnew.promise(unit).then(({ key1, key2, key3 }) => { // E
        // scope 1 
    });
}

function Child(unit) {
    // scope 2

    xnew.promise('key1', ...); // A
    xnew.promise('key2', ...); // B

    xnew.promise('key3', unit).then(({ key1, key2 }) => { // C
        // scope 2
        xnew.promise(...); // D
    });
}

C: A,Bが解決したらスタート
E: A,B,C,Dが解決したらスタート

Eのxnew.promise内は、Parentのスコープで実行される


# case 1 (new)

function Parent(unit) {
    // scope 1
    const unit = xnew(Child);

    xnew.promise(unit).then(({ key3 }) => { // E
        // scope 1 
    });
}

function Child(unit) {
    // scope 2

    xnew.promise('key1', ...); // A
    xnew.promise('key2', ...); // B

    xnew.promise('key3', unit).then(({ key1, key2 }) => { // C
        // ここまで貯まっていたリザルト{ key1, key2 }は、thenで呼び出したことでリセットされる

        // scope 2
        xnew.promise(...); // D　NG

        return data; // as key3
    });
}

C: A,Bが解決したらスタート
E: A,B,C,Dが解決したらスタート

Eのxnew.promise内は、Parentのスコープで実行される

case 1 (old) との差分
・xnew.promise(key?, unit)を呼び出して、結果を集約すると内部保持されているリザルトはリセットされる。
・thenの中で、promiseをしたい場合は、return new Promiseを使う　（Dの様な使い方は想定しない）


# case 2

function Parent(unit) {
    // scope 1
    const unit = xnew(Child);

    xnew.promise(unit).then((results2) => { // E
        // scope 1 
    });
}

function Child(unit) {
    // scope 2

    xnew.promise(...); // A
    xnew.promise(...); // B

    xnew.promise(unit).then((results1) => { // C
        // ここまで貯まっていたリザルト{ key1, key2 }は、thenで呼び出したことでリセットされる

        return data;
    });
}

C: A,Bが解決したらスタート
E: A,B,Cが解決したらスタート

集約結果は常にオブジェクト。key付きはそのkeyのプロパティ、keyなしは results 配列（登録順）にまとめる。混在可。
results キーは常に存在する（keyなしが無ければ []）。
- 全てkeyなし → { results: [v1, v2] }
- 混在        → { key1, ..., results: [keyなしの値] }
- 全てkey付き → { key1, ..., results: [] }

A, B のように key なしで登録した値は、C で受け取るとき results 配列に入る。A,B のどちらかで key 指定がある場合、
その key はオブジェクトのプロパティに、key なしは results に入る。

xnew.promise(unit)で、unitのpromiseを集約すると、上記のリザルトはリセットされる。

注意: 予約キー results をユーザーキー（xnew.promise('results', ...)）に使うと衝突する。


## case 2 - key付き集約のネスト

xnew.promise('key', unit) のように key 付きで他 unit を集約すると、その unit の集約結果が
key の値としてネストされる。集約なので対象 unit のプールは消費（リセット）される。

function Parent(unit) {
    // scope 1
    const child = xnew(Child);

    xnew.promise('child', child); // F  子の集約結果を 'child' キーで親に登録（Child のプールは消費）

    xnew.promise(unit).then(({ child }) => { // G
        // child = { key1, key2 }  ← Child の key 付き結果がネストされる
    });
}

function Child(unit) {
    // scope 2
    xnew.promise('key1', ...); // A
    xnew.promise('key2', ...); // B
}

F: A,B を { key1, key2 } に集約し、key 'child' で Parent のプールに登録する。
G: A,B が解決したらスタート。results は { child: { key1, key2 } }。

・孫→子→親と多段にネストできる（Child で xnew.promise('grand', grand)、Parent で
  xnew.promise('child', child) → { child: { grand: { x } } }）。
・ネスト集約も case 2 の shape ルールに従う（子側が全 key なしなら { child: { results: [...] } }）。
・どの集約オブジェクトにも results キーは必ず付く（上の例では簡潔さのため省略している。
  実際は { child: { key1, key2, results: [] }, results: [] } のようになる）。


### case 1（then の return 継続）と組み合わせたとき

function Parent(unit) {
    const child = xnew(Child);

    xnew.promise('child', child); // F

    xnew.promise(unit).then(({ child }) => { // G
        // child = { key3 }  ← key1, key2 は C で消費済みなので入らない
    });
}

function Child(unit) {
    xnew.promise('key1', ...); // A
    xnew.promise('key2', ...); // B

    xnew.promise('key3', unit).then(({ key1, key2 }) => { // C
        return new Promise(...); // as key3 (D)
    });
}

C: A,B が解決したらスタート
F: 集約時点の Child プールは [C(key3)]（A,B は C が消費済み）→ { key3 } を 'child' で登録
G: A,B,C(return = D) が解決したらスタート。results は { child: { key3 } }