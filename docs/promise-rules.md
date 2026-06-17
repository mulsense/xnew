
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