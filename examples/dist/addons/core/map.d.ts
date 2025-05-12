export declare class MapSet<Key, Value> {
    private map;
    get size(): number;
    has(key: Key, value?: Value): boolean;
    get(key: Key): Set<Value> | undefined;
    add(key: Key, value: Value): MapSet<Key, Value>;
    delete(key: Key, value?: Value): boolean;
}
export declare class MapMap<Key1, Key2, Value> {
    private map;
    get size(): number;
    has(key1: Key1, key2?: Key2): boolean;
    set(key1: Key1, key2: Key2, value: Value): MapMap<Key1, Key2, Value>;
    get(key1: Key1, key2?: Key2): Map<Key2, Value> | Value | undefined;
    delete(key1: Key1, key2?: Key2): boolean;
}
export declare class MapMapMap<Key1, Key2, Key3, Value> {
    private map;
    get size(): number;
    has(key1: Key1, key2?: Key2, key3?: Key3): boolean;
    set(key1: Key1, key2: Key2, key3: Key3, value: Value): MapMapMap<Key1, Key2, Key3, Value>;
    get(key1: Key1, key2?: Key2, key3?: Key3): MapMap<Key2, Key3, Value> | Map<Key3, Value> | Value | undefined;
    delete(key1: Key1, key2?: Key2, key3?: Key3): boolean;
}
