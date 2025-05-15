import { MapSet, MapMap, MapMapMap } from '../src/core/map';

describe('map set', () => {
    it('add', () => {
        const mapSet = new MapSet<string, any>();
        mapSet.add('key', 1);
        expect(mapSet.has('key')).toBe(true);
        expect(mapSet.has('key', 1)).toBe(true);
    });
    it('delete', () => {
        const mapSet = new MapSet<string, any>();
        mapSet.add('key', 1);
        mapSet.delete('key', 1);
        expect(mapSet.has('key')).toBe(false);
        expect(mapSet.has('key', 1)).toBe(false);
    });
});

describe('map map', () => {
    it('set', () => {
        const mapMap = new MapMap<string, string, any>();
        mapMap.set('key1', 'key2', 1);
        expect(mapMap.has('key1', 'key2')).toBe(true);
        expect(mapMap.get('key1', 'key2')).toBe(1);
    });

    it('delete', () => {
        const mapMap = new MapMap<string, string, any>();
        mapMap.set('key1', 'key2', 1);
        mapMap.delete('key1', 'key2');
        expect(mapMap.has('key1', 'key2')).toBe(false);
        expect(mapMap.get('key1', 'key2')).toBe(undefined);
    });
});

describe('map map map', () => {
    it('set', () => {
        const mapMapMap = new MapMapMap<string, string, string, any>();
        mapMapMap.set('key1', 'key2', 'key3', 1);
        expect(mapMapMap.has('key1', 'key2', 'key3')).toBe(true);
        expect(mapMapMap.get('key1', 'key2', 'key3')).toBe(1);
    });

    it('delete', () => {
        const mapMapMap = new MapMapMap<string, string, string, any>();
        mapMapMap.set('key1', 'key2', 'key3', 1);
        mapMapMap.delete('key1', 'key2', 'key3');
        expect(mapMapMap.has('key1', 'key2', 'key3')).toBe(false);
        expect(mapMapMap.get('key1', 'key2', 'key3')).toBe(undefined);
    });
});