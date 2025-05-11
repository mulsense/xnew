//----------------------------------------------------------------------------------------------------
// map set
//----------------------------------------------------------------------------------------------------

export class MapSet<Key, Value> {
    private map: Map<Key, Set<Value>> = new Map;

    public get size(): number {
        return this.map.size;
    }

    public has(key: Key, value?: Value): boolean {
        if (value === undefined) {
            return this.map.has(key);
        } else {
            return this.map.get(key)?.has(value) ?? false;
        }
    }

    public get(key: Key): Set<Value> | undefined {
        return this.map.get(key);
    }

    public add(key: Key, value: Value): MapSet<Key, Value> {
        this.map.set(key, (this.map.get(key) ?? new Set<Value>).add(value));
        return this;
    }

    public delete(key: Key, value?: Value): boolean {
        let ret: boolean = false;
        if (value === undefined) {
            ret = (this.map.get(key)?.size === 0) ? this.map.delete(key) : false;
        } else {
            ret = this.map.get(key)?.delete(value) ?? false;
            (this.map.get(key)?.size === 0) && this.map.delete(key);
        }
        return ret;
    }
}

//----------------------------------------------------------------------------------------------------
// map map
//----------------------------------------------------------------------------------------------------

export class MapMap<Key1, Key2, Value> {
    private map: Map<Key1, Map<Key2, Value>> = new Map;

    public get size(): number {
        return this.map.size;
    }

    public has(key1: Key1, key2?: Key2): boolean {
        if (key2 === undefined) {
            return this.map.has(key1);
        } else {
            return this.map.get(key1)?.has(key2) ?? false;
        }
    }

    public set(key1: Key1, key2: Key2, value: Value): MapMap<Key1, Key2, Value> {
        this.map.set(key1, (this.map.get(key1) ?? new Map<Key2, Value>).set(key2, value));
        return this;
    }

    public get(key1: Key1, key2?: Key2): Map<Key2, Value> | Value | undefined {
        if (key2 === undefined) {
            return this.map.get(key1);
        } else {
            return this.map.get(key1)?.get(key2);
        }
    }

    public delete(key1: Key1, key2?: Key2): boolean {
        let ret: boolean = false;
        if (key2 === undefined) {
            ret = (this.map.get(key1)?.size === 0) ? this.map.delete(key1) : false;
        } else {
            ret = this.map.get(key1)?.delete(key2) ?? false;
            (this.map.get(key1)?.size === 0) && this.map.delete(key1);
        }
        return ret;
    }
}

//----------------------------------------------------------------------------------------------------
// map map map
//----------------------------------------------------------------------------------------------------

export class MapMapMap<Key1, Key2, Key3, Value> {
    private map: Map<Key1, MapMap<Key2, Key3, Value>> = new Map;

    public get size(): number {
        return this.map.size;
    }

    has(key1: Key1, key2?: Key2, key3?: Key3): boolean {
        if (key2 === undefined) {
            return this.map.has(key1);
        } else {
            return this.map.get(key1)?.has(key2, key3) ?? false;
        }
    }

    set(key1: Key1, key2: Key2, key3: Key3, value: Value): MapMapMap<Key1, Key2, Key3, Value> {
        this.map.set(key1, (this.map.get(key1) ?? new MapMap<Key2, Key3, Value>).set(key2, key3, value));
        return this;
    }

    public get(key1: Key1, key2?: Key2, key3?: Key3): MapMap<Key2, Key3, Value> | Map<Key3, Value> | Value | undefined {
        if (key2 === undefined) {
            return this.map.get(key1);
        } else {
            return this.map.get(key1)?.get(key2, key3);
        }
    }

    public delete(key1: Key1, key2?: Key2, key3?: Key3): boolean {
        let ret: boolean = false;
        if (key2 === undefined) {
            ret = (this.map.get(key1)?.size === 0) ? this.map.delete(key1) : false;
        } else {
            ret = this.map.get(key1)?.delete(key2, key3) ?? false;
            (this.map.get(key1)?.size === 0) && this.map.delete(key1);
        }
        return ret;
    }
}


