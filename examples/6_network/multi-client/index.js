import xnew from '@mulsense/xnew';
import { World } from './game.js';

//----------------------------------------------------------------------------------------------------
// multi-client（socket.io 版・client 側）— ロビーでルームを作成 / 入室してプレイする。
//   接続は 2 本（サーバーは query.room の有無で判別）:
//     - lobbySocket : room 無し → ロビー（ルーム一覧 / 作成）
//     - gameSocket  : query{room} 付き → そのルームに参加（入室のたびに張り直す）
//   ★ browser-only 版との違いは「boot へ渡す socket.io の socket」と「ロビー経由で
//      ルームを選ぶ」点だけ。ゲーム本体 game.js は無改変（World が clientId/emit('-join')/move を処理）。
//----------------------------------------------------------------------------------------------------

const lobbySocket = window.io();   // room 無し → サーバーはロビー接続として扱う
const statusEl = document.getElementById('status');
const setStatus = (text, ok) => { statusEl.textContent = text; statusEl.className = ok ? 'text-green-600' : 'text-red-500'; };

if (lobbySocket.connected) { setStatus('ロビー', true); }
lobbySocket.on('connect', () => setStatus('ロビー', true));
lobbySocket.on('disconnect', () => setStatus('切断', false));

// App は #app を要素に持つ親。各シーン（Lobby/Game）はこの App の子として相互にスワップする
// （Scene.change は unit.parent の下へ次シーンを mount するため、共通の親が要る）。
xnew(document.getElementById('app'), function App() { xnew(LobbyScene); });

//----------------------------------------------------------------------------------------------------
// LobbyScene — ルーム作成 / 一覧 / 入室
//   ルームは動的。誰かが作成すると lobby:rooms で全員へ一覧が届く。作成すると room:created で自分の
//   入るべき roomId が返るので、そのまま GameScene へ遷移する。
//----------------------------------------------------------------------------------------------------

function LobbyScene(unit) {
    xnew.extend(xnew.basics.Scene);
    if (lobbySocket.connected) { setStatus('ロビー', true); }

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
                lobbySocket.emit('room:create', { name });
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
                    enter.on('click', () => unit.change(GameScene, { roomId: room.id }));
                });
            }
        });
    }

    const onRooms = ({ rooms: list }) => { rooms = list; render(); };
    const onCreated = ({ roomId }) => unit.change(GameScene, { roomId });
    const onError = ({ message }) => { hintEl.element.textContent = message; };
    lobbySocket.on('lobby:rooms', onRooms);
    lobbySocket.on('room:created', onCreated);
    lobbySocket.on('room:error', onError);
    unit.on('finalize', () => {
        lobbySocket.off('lobby:rooms', onRooms);
        lobbySocket.off('room:created', onCreated);
        lobbySocket.off('room:error', onError);
    });

    lobbySocket.emit('lobby:enter');
    render();   // 既に rooms があれば即描画
}

//----------------------------------------------------------------------------------------------------
// GameScene — そのルームへ接続し、client ツリー(World) を 1 ペイン mount してプレイ
//   gameSocket は query{room} 付きで張る（forceNew で lobbySocket と分離）。socket の用意と HTML
//   （戻るボタン・ペインの mount 先）だけを持ち、room 関連の配線（boot / select / socket 所有）は
//   xnew.basics.Room に委ねる。Room へ { mode:'client', socket: gameSocket } を渡すと、boot は基本
//   イベント（connect / disconnect / room:notfound）を boot を呼んだ親ユニット（= この GameScene）の
//   unit.on へ配るので、接続まわりはここで受け取れる。
//----------------------------------------------------------------------------------------------------

function GameScene(unit, { roomId }) {
    xnew.extend(xnew.basics.Scene);

    const gameSocket = window.io({ query: { room: roomId }, forceNew: true });

    const back = xnew('<button class="px-3 py-1 mb-2 rounded border-0 bg-gray-500 hover:bg-gray-600 text-white text-sm cursor-pointer">', '← ロビーに戻る');
    back.on('click', () => unit.change(LobbyScene));
    xnew.nest('<div class="flex gap-4">');   // 自機ペインの mount 先（World の client が pane を nest する）

    // room 関連の配線は Room が引き受ける（boot(World)→select、finalize で client 畳み + socket 切断）。
    // socket は boot へ渡され、基本イベントは boot 親（この GameScene）の unit.on へ届く。
    xnew.extend(xnew.basics.Room, { mode: 'client', socket: gameSocket, component: World });

    unit.on('connect', () => setStatus(`ルーム ${roomId}: ${gameSocket.id}`, true));
    unit.on('disconnect', () => setStatus('切断', false));
    unit.on('room:notfound', () => unit.change(LobbyScene));   // 消滅ルームへ来たらロビーへ
}
