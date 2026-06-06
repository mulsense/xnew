import { test } from 'node:test';
import assert from 'node:assert/strict';
import { step, FIELD, PLAYER_RADIUS, PLAYER_SPEED } from '../server/games/metaverse.js';

test('step: 軸入力で速度×dt だけ進む', () => {
    const next = step({ x: 100, y: 100 }, { x: 1, y: 0 }, 1);
    assert.equal(next.x, 100 + PLAYER_SPEED);   // 300
    assert.equal(next.y, 100);
});

test('step: 斜めは 1/√2 で正規化される', () => {
    const next = step({ x: 100, y: 100 }, { x: 1, y: 1 }, 1);
    const d = PLAYER_SPEED / Math.SQRT2;
    assert.ok(Math.abs(next.x - (100 + d)) < 1e-9);
    assert.ok(Math.abs(next.y - (100 + d)) < 1e-9);
});

test('step: 入力 0 なら動かない', () => {
    const next = step({ x: 100, y: 100 }, { x: 0, y: 0 }, 1);
    assert.deepEqual(next, { x: 100, y: 100 });
});

test('step: フィールド端で clamp される', () => {
    const right = step({ x: 790, y: 100 }, { x: 1, y: 0 }, 1);
    assert.equal(right.x, FIELD.w - PLAYER_RADIUS);   // 784
    const left = step({ x: 20, y: 100 }, { x: -1, y: 0 }, 1);
    assert.equal(left.x, PLAYER_RADIUS);              // 16
});
