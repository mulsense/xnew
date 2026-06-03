import xnew from '../../dist/xnew.mjs';

// 1 関数で server(update)/browser(描画) ブロックに分けて記述する単一コンポーネント
function Mover(unit) {
    const state = xnew.state.initialize({ x: 0 });
    xnew.server(() => {
        unit.on('update', () => { state.x = (state.x + 2) % 300; }); // authoritative のみ
    });
    xnew.browser(() => {
        const el = xnew.nest('<div>');
        el.style.cssText = 'position:absolute;width:20px;height:20px;background:#39f;top:40px;border-radius:4px;';
        unit.on('render', () => { el.style.left = `${state.x}px`; }); // replica のみ
    });
}
xnew.state.register('Mover', Mover);

// 起動前に config でモード設定 → サブツリー生成 → config を戻す
xnew.config.mode = 'authoritative';
const server = xnew(function Server() { xnew(Mover); }); // 擬似サーバー
xnew.config.mode = 'replica';
const client = xnew(document.getElementById('view'), function View() {}); // 表示
xnew.config.mode = null;

// 毎フレーム capture→apply（実ネットワークの代わりにインメモリで反映）
xnew(function Driver(unit) {
    unit.on('update', () => {
        xnew.state.apply(client, xnew.state.capture(server));
    });
});
