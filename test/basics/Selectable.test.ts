import { Unit } from '../../src/core/unit';
import { xnew } from '../../src/core/xnew';
import { Selectable } from '../../src/basics/Selectable';

// click は要素自身、click.outside は document 経由（要素が含まない target のとき発火）。
// xnew のイベント登録は listen() の setTimeout(0) 後に addEventListener されるため、各生成後に timer を進める。
describe('Selectable', () => {
    beforeEach(() => { jest.useFakeTimers(); Unit.reset(); });
    afterEach(() => { Unit.rootUnit?.finalize(); jest.useRealTimers(); document.body.innerHTML = ''; });

    const click = (el: Element) => el.dispatchEvent(new Event('click', { bubbles: true }));

    it('raises selected on inside click, lowers it on outside click, and emits -select/-deselect', () => {
        const view = document.createElement('div');
        document.body.appendChild(view);
        const item = xnew(view, Selectable);
        const events: string[] = [];
        item.on('-select', () => events.push('select'));
        item.on('-deselect', () => events.push('deselect'));
        jest.advanceTimersByTime(0);   // listen() の setTimeout(0) を消化

        expect(item.selected).toBe(false);

        click(view);                                   // 内側 → 選択
        expect(item.selected).toBe(true);
        expect(events).toEqual(['select']);

        click(view);                                   // 内側 再クリックは選択のまま（トグルしない・再 emit なし）
        expect(item.selected).toBe(true);
        expect(events).toEqual(['select']);

        const outside = document.createElement('div');
        document.body.appendChild(outside);
        click(outside);                                // 外側 → 解除
        expect(item.selected).toBe(false);
        expect(events).toEqual(['select', 'deselect']);
    });

    it('select() / deselect() control the flag programmatically (idempotent)', () => {
        const view = document.createElement('div');
        document.body.appendChild(view);
        const item = xnew(view, Selectable);
        const events: string[] = [];
        item.on('-select', () => events.push('select'));
        item.on('-deselect', () => events.push('deselect'));
        jest.advanceTimersByTime(0);

        item.select();
        item.select();                                 // 2 回目は no-op
        expect(item.selected).toBe(true);
        item.deselect();
        expect(item.selected).toBe(false);
        expect(events).toEqual(['select', 'deselect']);
    });

    it('honors the initial { selected: true } without emitting', () => {
        const view = document.createElement('div');
        document.body.appendChild(view);
        const item = xnew(view, Selectable, { selected: true });
        const events: string[] = [];
        item.on('-select', () => events.push('select'));
        jest.advanceTimersByTime(0);

        expect(item.selected).toBe(true);
        expect(events).toEqual([]);   // 初期値では emit しない
    });
});
