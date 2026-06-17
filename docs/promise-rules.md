
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

A, Bの様に、keyなしでしている場合、Cで受け取るときは、keyを持つオブジェクトではなく、リザルトの配列になる。A,Bのどちらかで、key指定されている場合、そのkeyだけを持つオブジェクトが、Cを受け取る仕様。

xnew.promise(unit)で、unitのpromiseを集約すると、上記のリザルトはリセットされる。この例では、xnew.promise(unit)ではkey指定はしていないので、以降、xnew.promise(unit).thenで得られる情報はリザルトの配列となる


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
・ネスト集約も case 2 の shape ルールに従う（子側が全 key なしなら、その値は配列になる）。


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