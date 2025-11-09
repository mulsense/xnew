import { MapSet, MapMap } from '../src/core/map';

describe('MapSet', () => {
    it('should add and check values', () => {
        const mapSet = new MapSet<string, number>();
        mapSet.add('key1', 1);
        mapSet.add('key1', 2);
        mapSet.add('key2', 3);

        expect(mapSet.has('key1')).toBe(true);
        expect(mapSet.has('key1', 1)).toBe(true);
        expect(mapSet.has('key1', 2)).toBe(true);
        expect(mapSet.has('key1', 3)).toBe(false);
        expect(mapSet.has('key2')).toBe(true);
        expect(mapSet.has('key2', 3)).toBe(true);
        expect(mapSet.has('key3')).toBe(false);
    });

    it('should delete values', () => {
        const mapSet = new MapSet<string, number>();
        mapSet.add('key1', 1);
        mapSet.add('key1', 2);

        expect(mapSet.delete('key1', 1)).toBe(true);
        expect(mapSet.has('key1', 1)).toBe(false);
        expect(mapSet.has('key1', 2)).toBe(true);
        expect(mapSet.has('key1')).toBe(true);
    });

    it('should auto-cleanup empty sets', () => {
        const mapSet = new MapSet<string, number>();
        mapSet.add('key1', 1);
        mapSet.delete('key1', 1);

        expect(mapSet.has('key1')).toBe(false);
        expect(mapSet.size).toBe(0);
    });

    it('should iterate keys', () => {
        const mapSet = new MapSet<string, number>();
        mapSet.add('key1', 1);
        mapSet.add('key2', 2);

        const keys = [...mapSet.keys()];
        expect(keys).toEqual(['key1', 'key2']);
    });

    it('should iterate values for a key', () => {
        const mapSet = new MapSet<string, number>();
        mapSet.add('key1', 1);
        mapSet.add('key1', 2);
        mapSet.add('key1', 3);

        const values = [...mapSet.keys('key1')];
        expect(values.sort()).toEqual([1, 2, 3]);
    });

    it('should return empty iterator for non-existent key', () => {
        const mapSet = new MapSet<string, number>();
        const values = [...mapSet.keys('nonexistent')];
        expect(values).toEqual([]);
    });

    it('should support size and forEach from Map', () => {
        const mapSet = new MapSet<string, number>();
        mapSet.add('key1', 1);
        mapSet.add('key2', 2);

        expect(mapSet.size).toBe(2);

        const collected: string[] = [];
        mapSet.forEach((value, key) => {
            collected.push(key);
        });
        expect(collected.sort()).toEqual(['key1', 'key2']);
    });
});

describe('MapMap', () => {
    it('should set and get nested values', () => {
        const mapMap = new MapMap<string, string, number>();
        mapMap.set('key1', 'subA', 1);
        mapMap.set('key1', 'subB', 2);
        mapMap.set('key2', 'subC', 3);

        expect(mapMap.get('key1', 'subA')).toBe(1);
        expect(mapMap.get('key1', 'subB')).toBe(2);
        expect(mapMap.get('key2', 'subC')).toBe(3);
        expect(mapMap.get('key1', 'subC')).toBe(undefined);
    });

    it('should check nested keys with has', () => {
        const mapMap = new MapMap<string, string, number>();
        mapMap.set('key1', 'subA', 1);

        expect(mapMap.has('key1')).toBe(true);
        expect(mapMap.has('key1', 'subA')).toBe(true);
        expect(mapMap.has('key1', 'subB')).toBe(false);
        expect(mapMap.has('key2')).toBe(false);
        expect(mapMap.has('key2', 'subA')).toBe(false);
    });

    it('should get nested Map', () => {
        const mapMap = new MapMap<string, string, number>();
        mapMap.set('key1', 'subA', 1);
        mapMap.set('key1', 'subB', 2);

        const nested = mapMap.get('key1');
        expect(nested).toBeInstanceOf(Map);
        expect(nested?.get('subA')).toBe(1);
        expect(nested?.get('subB')).toBe(2);
    });

    it('should set Map directly', () => {
        const mapMap = new MapMap<string, string, number>();
        const nested = new Map<string, number>();
        nested.set('subA', 1);
        nested.set('subB', 2);

        mapMap.set('key1', nested);
        expect(mapMap.get('key1', 'subA')).toBe(1);
        expect(mapMap.get('key1', 'subB')).toBe(2);
    });

    it('should delete nested values', () => {
        const mapMap = new MapMap<string, string, number>();
        mapMap.set('key1', 'subA', 1);
        mapMap.set('key1', 'subB', 2);

        expect(mapMap.delete('key1', 'subA')).toBe(true);
        expect(mapMap.has('key1', 'subA')).toBe(false);
        expect(mapMap.has('key1', 'subB')).toBe(true);
    });

    it('should auto-cleanup empty nested maps', () => {
        const mapMap = new MapMap<string, string, number>();
        mapMap.set('key1', 'subA', 1);
        mapMap.delete('key1', 'subA');

        expect(mapMap.has('key1')).toBe(false);
        expect(mapMap.size).toBe(0);
    });

    it('should iterate all keys', () => {
        const mapMap = new MapMap<string, string, number>();
        mapMap.set('key1', 'subA', 1);
        mapMap.set('key2', 'subB', 2);

        const keys = [...mapMap.keys()];
        expect(keys.sort()).toEqual(['key1', 'key2']);
    });

    it('should iterate sub-keys for a key', () => {
        const mapMap = new MapMap<string, string, number>();
        mapMap.set('key1', 'subA', 1);
        mapMap.set('key1', 'subB', 2);
        mapMap.set('key1', 'subC', 3);

        const subKeys = [...mapMap.keys('key1')];
        expect(subKeys.sort()).toEqual(['subA', 'subB', 'subC']);
    });

    it('should return empty iterator for non-existent key', () => {
        const mapMap = new MapMap<string, string, number>();
        const subKeys = [...mapMap.keys('nonexistent')];
        expect(subKeys).toEqual([]);
    });
});
