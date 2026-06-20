import xnew from '@mulsense/xnew';
import { World } from './game.js';

//----------------------------------------------------------------------------------------------------
// multi-client（client 側）— ロビーでルームを作成 / 入室してプレイする。
//   各シーンが自分の socket.io 接続を所有する（サーバーは query.room の有無で lobby/game を判別）:
//     - Lobby : window.io()（room 無し）→ ロビー（ルーム一覧 / 作成）
//     - Room  : window.io({ query:{room}, forceNew }) → そのルームに参加
//   ゲーム本体 game.js は World が clientId/emit('-join')/move を処理する（boot へ socket.io の socket を渡すだけ）。
//----------------------------------------------------------------------------------------------------

// App — #app を要素に持つコンテナ。ステータス表示(setStatus)を公開し、最初のシーンを mount する。
//   各シーン（Lobby/Game）はこの App の子として相互にスワップする（Scene.change が unit.parent の下へ
//   次シーンを mount → finalize するため、共通の親が要る。シーンを直接 #app に張ると親が engineRoot に
//   なり #app の外へ出てしまう）。シーンからは xnew.context(App).setStatus(...) で表示を更新する。
function App() {
    const statusEl = document.getElementById('status');
    xnew(Lobby);
    return {
        setStatus(text, ok) { statusEl.textContent = text; statusEl.className = ok ? 'text-green-600' : 'text-red-500'; },
    };
}
xnew(document.getElementById('app'), App);

//----------------------------------------------------------------------------------------------------
// Lobby — ルーム作成 / 一覧 / 入室
//   ルームは動的。誰かが作成すると '-rooms' で全員へ一覧が届く。作成すると '-created' で自分の
//   入るべき roomId が返るので、そのまま Room へ遷移する。
//----------------------------------------------------------------------------------------------------

function Lobby(unit) {
    xnew.extend(xnew.basics.Scene);
    const app = xnew.context(App);   // ステータス表示はコンテナ App が持つ

    // ロビー接続（room 無し = サーバーはロビー接続として扱う。forceNew で独立）。
    // Lobby が受信イベントを unit.on('-event') へ転送し、finalize で socket を切断する。
    const lobbySocket = window.io({ forceNew: true });
    xnew.extend(xnew.basics.Lobby, { socket: lobbySocket });

    let rooms = [];
    let listEl;
    let hintEl;

    xnew('<div class="max-w-md flex flex-col gap-3">', () => {
        // 作成フォーム
        xnew('<form class="flex gap-2">', (form) => {
            const nameInput = xnew('<input class="flex-1 px-2.5 py-1.5 rounded border border-gray-300 text-sm" type="text" maxlength="16" placeholder="新しいルーム名">');
            xnew('<button class="px-3 py-1.5 rounded border-0 bg-emerald-500 hover:bg-emerald-600 text-white text-sm cursor-pointer" type="submit">', '作成');
            form.on('submit', ({ event }) => {
                event.preventDefault();
                const name = nameInput.element.value.trim();
                if (!name) { return; }
                unit.create(name);   // Lobby が公開（内部で 'create' を emit）
                nameInput.element.value = '';
            });
        });
        listEl = xnew('<ul class="flex flex-col gap-2">');
        hintEl = xnew('<p class="m-0 text-xs text-gray-400">', 'ルームを作成 / 入室して、別タブでも同じルームに入ると互いの自機が見えます。');
    });

    // 一覧は受信のたびに作り直す（前回ぶんの行 unit を finalize → 再生成。innerHTML クリア不要）。
    let rowsUnit = null;
    function render() {
        rowsUnit?.finalize();
        rowsUnit = xnew(listEl, () => {
            if (rooms.length === 0) {
                xnew('<li class="text-sm text-gray-400 py-2">', 'まだルームがありません。上から作成してください。');
                return;
            }
            for (const room of rooms) {
                xnew('<li class="flex items-center justify-between gap-3 px-3 py-2 bg-white border border-gray-200 rounded">', () => {
                    xnew('<div>', () => {
                        xnew('<span class="font-medium text-gray-700">', room.name);   // textContent でユーザー入力名を安全に表示
                        xnew('<span class="text-xs text-gray-400 ml-2">', `(${room.memberCount}人)`);
                    });
                    const enter = xnew('<button class="px-3 py-1 rounded border-0 bg-blue-500 hover:bg-blue-600 text-white text-sm cursor-pointer">', '入室');
                    enter.on('click', () => unit.change(Room, { roomId: room.id }));
                });
            }
        });
    }

    // 受信イベントは Lobby が '-event' で転送する（finalize の切断も Lobby が担う。一覧は接続時に自動で届く）。
    unit.on('-connect', () => app.setStatus('ロビー', true));
    unit.on('-disconnect', () => app.setStatus('切断', false));
    unit.on('-rooms', ({ rooms: list }) => { rooms = list; render(); });
    unit.on('-created', ({ roomId }) => unit.change(Room, { roomId }));
    unit.on('-rejected', ({ message }) => { hintEl.element.textContent = message; });

    render();   // 初期描画（一覧は -rooms 受信で更新）
}

//----------------------------------------------------------------------------------------------------
// Room — そのルームへ接続し、client ツリー(World) を 1 ペイン mount してプレイ
//   gameSocket は query{room} 付きで張る（forceNew で独立接続）。socket の用意と HTML
//   （戻るボタン・ペインの mount 先）だけを持ち、room 関連の配線（boot / socket 所有）は
//   xnew.basics.Room に委ねる。Room へ { socket: gameSocket } を渡すと、基本イベント
//   （connect / disconnect / notfound）を '-event' でこの Room の unit.on へ転送するので、接続まわりは
//   ここで受け取れる（browser 実行なので mode は client に自動判定）。
//----------------------------------------------------------------------------------------------------

function Room(unit, { roomId }) {
    xnew.extend(xnew.basics.Scene);
    const app = xnew.context(App);   // ステータス表示はコンテナ App が持つ

    const gameSocket = window.io({ query: { room: roomId }, forceNew: true });

    const back = xnew('<button class="px-3 py-1 mb-2 rounded border-0 bg-gray-500 hover:bg-gray-600 text-white text-sm cursor-pointer">', '← ロビーに戻る');
    back.on('click', () => unit.change(Lobby));
    xnew.nest('<div class="flex gap-4">');   // 自機ペインの mount 先（World の client が pane を nest する）

    // room 関連の配線は Room が引き受ける（boot(World)、finalize で client 畳み + socket 切断）。
    // socket は boot へ渡され、基本イベントは Room が '-event' でこの Room の unit.on へ転送する。
    xnew.extend(xnew.basics.Room, { socket: gameSocket, Component: World });

    unit.on('-connect', () => app.setStatus(`ルーム ${roomId}: ${gameSocket.id}`, true));
    unit.on('-disconnect', () => app.setStatus('切断', false));
    unit.on('-notfound', () => unit.change(Lobby));   // 消滅ルームへ来たらロビーへ
}
