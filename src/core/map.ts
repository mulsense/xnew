//----------------------------------------------------------------------------------------------------
// map set
//----------------------------------------------------------------------------------------------------

export class MapSet<Key, Value> extends Map<Key, Set<Value>> {

    // has overload
    public has(key: Key): boolean;
    public has(key: Key, value: Value): boolean;
    public has(key: Key, value?: Value): boolean {
        if (value === undefined) {
            return super.has(key);
        } else {
            return super.get(key)?.has(value) ?? false;
        }
    }

    public add(key: Key, value: Value): MapSet<Key, Value> {
        super.set(key, (super.get(key) ?? new Set<Value>).add(value));
        return this;
    }

    // keys overload
    public keys(): IterableIterator<Key>;
    public keys(key: Key): IterableIterator<Value>;
    public keys(key?: Key): IterableIterator<Key> | IterableIterator<Value> {
        if (key === undefined) {
            return super.keys();
        } else {
            return super.get(key)?.values() ?? [].values();
        }
    }

    // delete overload
    public delete(key: Key): boolean;
    public delete(key: Key, value: Value): boolean;
    public delete(key: Key, value?: Value): boolean {
        let ret: boolean = false;
        if (value === undefined) {
            ret = (super.get(key)?.size === 0) ? super.delete(key) : false;
        } else {
            ret = super.get(key)?.delete(value) ?? false;
            (super.get(key)?.size === 0) && super.delete(key);
        }
        return ret;
    }
}

//----------------------------------------------------------------------------------------------------
// map map
//----------------------------------------------------------------------------------------------------

export class MapMap<Key1, Key2, Value> extends Map<Key1, Map<Key2, Value>> {

    // has overload
    public has(key1: Key1): boolean;
    public has(key1: Key1, key2: Key2): boolean;
    public has(key1: Key1, key2?: Key2): boolean {
        if (key2 === undefined) {
            return super.has(key1);
        } else {
            return super.get(key1)?.has(key2) ?? false;
        }
    }

    // set overload
    public set(key1: Key1, value: Map<Key2, Value>): this;
    public set(key1: Key1, key2: Key2, value: Value): this;
    public set(key1: Key1, key2OrValue: Key2 | Map<Key2, Value>, value?: Value): this {
        if (value === undefined) {
            // 2 args: directly set Map<Key2, Value>
            super.set(key1, key2OrValue as Map<Key2, Value>);
        } else {
            // 3 args: set nested value
            super.set(key1, (super.get(key1) ?? new Map<Key2, Value>).set(key2OrValue as Key2, value));
        }
        return this;
    }

    // get overload
    public get(key1: Key1): Map<Key2, Value> | undefined;
    public get(key1: Key1, key2: Key2): Value | undefined;
    public get(key1: Key1, key2?: Key2): Map<Key2, Value> | Value | undefined {
        if (key2 === undefined) {
            return super.get(key1);
        } else {
            return super.get(key1)?.get(key2);
        }
    }

    // keys overload
    public keys(): IterableIterator<Key1>;
    public keys(key1: Key1): IterableIterator<Key2>;
    public keys(key1?: Key1): IterableIterator<Key1> | IterableIterator<Key2> {
        if (key1 === undefined) {
            return super.keys();
        } else {
            return super.get(key1)?.keys() ?? [].values();
        }
    }

    // delete overload
    public delete(key1: Key1): boolean;
    public delete(key1: Key1, key2: Key2): boolean;
    public delete(key1: Key1, key2?: Key2): boolean {
        let ret: boolean = false;
        if (key2 === undefined) {
            ret = (super.get(key1)?.size === 0) ? super.delete(key1) : false;
        } else {
            ret = super.get(key1)?.delete(key2) ?? false;
            (super.get(key1)?.size === 0) && super.delete(key1);
        }
        return ret;
    }
}
