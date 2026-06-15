
# case 1

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
