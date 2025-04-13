//----------------------------------------------------------------------------------------------------
// map set
//----------------------------------------------------------------------------------------------------

export class MapSet extends Map
{
    has(key, value)
    {
        if (value === undefined) {
            return super.has(key);
        } else {
            return super.has(key) && super.get(key).has(value);
        }
    }

    add(key, value)
    {
        if (this.has(key) === false) {
            this.set(key, new Set());
        }
        this.get(key).add(value);
    }

    delete(key, value)
    {
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

export class MapMap extends Map
{
    has(key, subkey)
    {
        if (subkey === undefined) {
            return super.has(key);
        } else {
            return super.has(key) && super.get(key).has(subkey);
        }
    }

    set(key, subkey, value)
    {
        if (super.has(key) === false) {
            super.set(key, new Map());
        }
        super.get(key).set(subkey, value);
    }

    get(key, subkey)
    {
        if (subkey === undefined) {
            return super.get(key);
        } else {
            return super.get(key)?.get(subkey);
        }
    }

    delete(key, subkey)
    {
        if (this.has(key) === false) {
            return;
        }
        this.get(key).delete(subkey);
        if (this.get(key).size === 0) {
            super.delete(key);
        }
    }
}
