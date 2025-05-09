//----------------------------------------------------------------------------------------------------
// map set
//----------------------------------------------------------------------------------------------------

export class MapSet extends Map {
    has(key, value) {
        if (value === undefined) {
            return super.has(key);
        } else {
            return super.has(key) && super.get(key).has(value);
        }
    }

    get(key) {
        if (this.has(key) === false) {
            return new Set();
        } else {
            return super.get(key);
        }
    }

    add(key, value) {
        if (this.has(key) === false) {
            this.set(key, new Set());
        }
        this.get(key).add(value);
    }

    delete(key, value) {
        if (this.has(key, value) === false) {
            return;
        }
        this.get(key).delete(value);
        if (this.get(key).size === 0) {
            super.delete(key);
        }
    }
}

//----------------------------------------------------------------------------------------------------
// map map
//----------------------------------------------------------------------------------------------------

export class MapMap extends Map {
    has(key1, key2) {
        if (key2 === undefined) {
            return super.has(key1);
        } else {
            return super.has(key1) && super.get(key1).has(key2);
        }
    }

    set(key1, key2, value) {
        if (super.has(key1) === false) {
            super.set(key1, new Map());
        }
        super.get(key1).set(key2, value);
    }

    get(key1, key2) {
        if (super.has(key1) === false) {
            super.set(key1, new Map());
        }
        if (key2 === undefined) {
            return super.get(key1);
        } else {
            return super.get(key1).get(key2);
        }
    }

    delete(key1, key2) {
        if (super.has(key1) === false) {
            return;
        }
        super.get(key1).delete(key2);
        if (super.get(key1).size === 0) {
            super.delete(key1);
        }
    }
}

//----------------------------------------------------------------------------------------------------
// map map map
//----------------------------------------------------------------------------------------------------

export class MapMapMap extends Map {
    has(key1, key2, key3) {
        if (key2 === undefined) {
            return super.has(key1);
        } else {
            return super.has(key1) && super.get(key1).has(key2, key3);
        }
    }

    set(key1, key2, key3, value) {
        if (super.has(key1) === false) {
            super.set(key1, new MapMap());
        }
        super.get(key1).set(key2, key3, value);
    }

    get(key1, key2, key3) {
        if (super.has(key1) === false) {
            super.set(key1, new MapMap());
        }
        if (key2 === undefined) {
            return super.get(key1);
        } else {
            return super.get(key1).get(key2, key3);
        }
    }

    delete(key1, key2, key3) {
        if (super.has(key1) === false) {
            return;
        }
        super.get(key1).delete(key2, key3);
        if (super.get(key1).size === 0) {
            super.delete(key1);
        }
    }
}


