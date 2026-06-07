//----------------------------------------------------------------------------------------------------
// map utilities
//
// MapSet / MapMap are Map subclasses keyed by two levels, used for indexes such as
// the Unit listener table (type → listener → meta) and the Component / Context
// reverse lookups. They auto-create the inner collection on insert and auto-remove
// the outer entry when the inner collection becomes empty, so callers do not have to
// manage the nested structure by hand.
//
// BiMap is a 1:1 bidirectional map: every pair is unique on both sides, so either
// element can be used as the key to look up the other. It keeps forward / backward
// indexes in sync and preserves the bijection on overwrite (re-pairing one side
// drops the conflicting old pairing). e.g. the sync registry's name ⇄ Component lookup.
//
// - MapSet<Key, Value>        : wraps Map<Key, Set<Value>>
// - MapMap<Key1, Key2, Value> : wraps Map<Key1, Map<Key2, Value>>
// - BiMap<Left, Right>        : 1:1 bidirectional map (look up by either side)
//----------------------------------------------------------------------------------------------------

//----------------------------------------------------------------------------------------------------
// map set
//----------------------------------------------------------------------------------------------------

export class MapSet<Key, Value> extends Map<Key, Set<Value>> {

    /**
     * Tests membership at either level.
     * - has(key)        : whether the outer map contains the key.
     * - has(key, value) : whether the inner Set at the key contains the value.
     * @returns true if the queried entry exists, false otherwise.
     */
    public has(key: Key): boolean;
    public has(key: Key, value: Value): boolean;
    public has(key: Key, value?: Value): boolean {
        if (value === undefined) {
            return super.has(key);
        } else {
            return super.get(key)?.has(value) ?? false;
        }
    }

    /**
     * Adds a value to the inner Set at the given key.
     * Creates and stores a new Set on the first insert for that key.
     * @returns the MapSet itself, for chaining.
     */
    public add(key: Key, value: Value): MapSet<Key, Value> {
        let set = super.get(key);
        if (set === undefined) {
            set = new Set<Value>();
            super.set(key, set);
        }
        set.add(value);
        return this;
    }

    /**
     * Iterates either level.
     * - keys()    : iterates outer keys of the map.
     * - keys(key) : iterates values held by the inner Set at the key.
     * @returns an iterator over the requested level, or an empty iterator when the key is absent.
     */
    public keys(): IterableIterator<Key>;
    public keys(key: Key): IterableIterator<Value>;
    public keys(key?: Key): IterableIterator<Key> | IterableIterator<Value> {
        if (key === undefined) {
            return super.keys();
        } else {
            return super.get(key)?.values() ?? [].values();
        }
    }

    /**
     * Removes entries at either level.
     * - delete(key)        : removes the whole entry at the key.
     * - delete(key, value) : removes the value from the inner Set at the key,
     *                        and additionally removes the outer entry once
     *                        the inner Set becomes empty.
     * @returns true if something was actually removed, false otherwise.
     */
    public delete(key: Key): boolean;
    public delete(key: Key, value: Value): boolean;
    public delete(key: Key, value?: Value): boolean {
        if (value === undefined) {
            return super.delete(key);
        } else {
            const set = super.get(key);
            if (set === undefined) {
                return false;
            } else {
                const ret = set.delete(value);
                if (set.size === 0) {
                    super.delete(key);
                }
                return ret;
            }
        }
    }
}

//----------------------------------------------------------------------------------------------------
// map map
//----------------------------------------------------------------------------------------------------

export class MapMap<Key1, Key2, Value> extends Map<Key1, Map<Key2, Value>> {

    /**
     * Tests membership at either level.
     * - has(key1)       : whether the outer map contains key1.
     * - has(key1, key2) : whether the inner Map at key1 contains key2.
     * @returns true if the queried entry exists, false otherwise.
     */
    public has(key1: Key1): boolean;
    public has(key1: Key1, key2: Key2): boolean;
    public has(key1: Key1, key2?: Key2): boolean {
        if (key2 === undefined) {
            return super.has(key1);
        } else {
            return super.get(key1)?.has(key2) ?? false;
        }
    }

    /**
     * Stores an entry at either level.
     * - set(key1, value)       : assigns the given inner Map at key1 directly,
     *                            overwriting any existing inner Map.
     * - set(key1, key2, value) : assigns value under (key1, key2),
     *                            creating the inner Map on the first insert.
     * @returns the MapMap itself, for chaining.
     */
    public set(key1: Key1, value: Map<Key2, Value>): this;
    public set(key1: Key1, key2: Key2, value: Value): this;
    public set(key1: Key1, key2OrValue: Key2 | Map<Key2, Value>, value?: Value): this {
        if (value === undefined) {
            // 2 args: assign the inner Map directly
            super.set(key1, key2OrValue as Map<Key2, Value>);
        } else {
            // 3 args: assign a nested value
            let inner = super.get(key1);
            if (inner === undefined) {
                inner = new Map<Key2, Value>();
                super.set(key1, inner);
            }
            inner.set(key2OrValue as Key2, value);
        }
        return this;
    }

    /**
     * Retrieves an entry at either level.
     * - get(key1)       : returns the inner Map at key1.
     * - get(key1, key2) : returns the nested value at (key1, key2).
     * @returns the requested inner Map or value, or undefined when the entry is absent.
     */
    public get(key1: Key1): Map<Key2, Value> | undefined;
    public get(key1: Key1, key2: Key2): Value | undefined;
    public get(key1: Key1, key2?: Key2): Map<Key2, Value> | Value | undefined {
        if (key2 === undefined) {
            return super.get(key1);
        } else {
            return super.get(key1)?.get(key2);
        }
    }

    /**
     * Iterates either level.
     * - keys()     : iterates outer keys of the map.
     * - keys(key1) : iterates keys of the inner Map at key1.
     * @returns an iterator over the requested level, or an empty iterator when key1 is absent.
     */
    public keys(): IterableIterator<Key1>;
    public keys(key1: Key1): IterableIterator<Key2>;
    public keys(key1?: Key1): IterableIterator<Key1> | IterableIterator<Key2> {
        if (key1 === undefined) {
            return super.keys();
        } else {
            return super.get(key1)?.keys() ?? [].values();
        }
    }

    /**
     * Removes entries at either level.
     * - delete(key1)       : removes the whole entry at key1.
     * - delete(key1, key2) : removes the nested entry at (key1, key2),
     *                        and additionally removes the outer entry once
     *                        the inner Map becomes empty.
     * @returns true if something was actually removed, false otherwise.
     */
    public delete(key1: Key1): boolean;
    public delete(key1: Key1, key2: Key2): boolean;
    public delete(key1: Key1, key2?: Key2): boolean {
        if (key2 === undefined) {
            return super.delete(key1);
        } else {
            const inner = super.get(key1);
            if (inner === undefined) {
                return false;
            } else {
                const ret = inner.delete(key2);
                if (inner.size === 0) {
                    super.delete(key1);
                }
                return ret;
            }
        }
    }
}

//----------------------------------------------------------------------------------------------------
// bi map
//----------------------------------------------------------------------------------------------------

export class BiMap<Left, Right> {

    private readonly forward: Map<Left, Right> = new Map<Left, Right>();
    private readonly backward: Map<Right, Left> = new Map<Right, Left>();

    /** Number of pairs held (forward and backward are always equal in size). */
    public get size(): number {
        return this.forward.size;
    }

    /**
     * Pairs left ⇄ right, preserving the 1:1 invariant.
     * If either side is already paired with something else, that old pairing is
     * dropped first, so a value never appears on the same side twice.
     * @returns the BiMap itself, for chaining.
     */
    public set(left: Left, right: Right): this {
        if (this.forward.has(left)) {
            this.backward.delete(this.forward.get(left) as Right);
        }
        if (this.backward.has(right)) {
            this.forward.delete(this.backward.get(right) as Left);
        }
        this.forward.set(left, right);
        this.backward.set(right, left);
        return this;
    }

    /**
     * Looks up the right element paired with the given left element.
     * @returns the paired right element, or undefined when the left element is absent.
     */
    public getRight(left: Left): Right | undefined {
        return this.forward.get(left);
    }

    /**
     * Looks up the left element paired with the given right element.
     * @returns the paired left element, or undefined when the right element is absent.
     */
    public getLeft(right: Right): Left | undefined {
        return this.backward.get(right);
    }

    /** @returns true if the given left element is present. */
    public hasLeft(left: Left): boolean {
        return this.forward.has(left);
    }

    /** @returns true if the given right element is present. */
    public hasRight(right: Right): boolean {
        return this.backward.has(right);
    }

    /**
     * Removes the pair addressed by its left element.
     * @returns true if a pair was removed, false when the left element was absent.
     */
    public deleteLeft(left: Left): boolean {
        if (!this.forward.has(left)) {
            return false;
        }
        this.backward.delete(this.forward.get(left) as Right);
        return this.forward.delete(left);
    }

    /**
     * Removes the pair addressed by its right element.
     * @returns true if a pair was removed, false when the right element was absent.
     */
    public deleteRight(right: Right): boolean {
        if (!this.backward.has(right)) {
            return false;
        }
        this.forward.delete(this.backward.get(right) as Left);
        return this.backward.delete(right);
    }

    /** Removes every pair. */
    public clear(): void {
        this.forward.clear();
        this.backward.clear();
    }

    /** @returns an iterator over the left elements. */
    public lefts(): IterableIterator<Left> {
        return this.forward.keys();
    }

    /** @returns an iterator over the right elements. */
    public rights(): IterableIterator<Right> {
        return this.backward.keys();
    }

    /** @returns an iterator over [left, right] pairs. */
    public entries(): IterableIterator<[Left, Right]> {
        return this.forward.entries();
    }

    public [Symbol.iterator](): IterableIterator<[Left, Right]> {
        return this.forward.entries();
    }
}
