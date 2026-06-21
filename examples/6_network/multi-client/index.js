import xnew from '@mulsense/xnew';
import { Game } from './game.js';

//----------------------------------------------------------------------------------------------------
// multi-client（client 側）— ロビーでルームを作成 / 入室してプレイする。
//   socket.io 接続は呼び出し側が用意してシーンへ渡す（どちらも forceNew で独立。サーバーは query.room の
//   有無で lobby/game を判別）:
//     - Lobby : window.io({ forceNew })（room 無し）→ ロビー（ルーム一覧 / 作成）
//     - Room  : window.io({ query:{room}, forceNew }）→ そのルームに参加
//   各シーンは渡された socket を basics.Lobby / basics.Room に委ね、finalize で切断される。
//   ゲーム本体 game.js は Game が Title→Setup→World のシーン遷移を同期で処理する（boot へ socket を渡すだけ）。
//----------------------------------------------------------------------------------------------------

// App — #app を要素に持つコンテナ。ステータス表示(setStatus)を公開し、最初のシーンを mount する。
//   各シーン（Lobby/Game）はこの App の子として相互にスワップする（Scene.change が unit.parent の下へ
//   次シーンを mount → finalize するため、共通の親が要る。シーンを直接 #app に張ると親が engineRoot に
//   なり #app の外へ出てしまう）。シーンからは xnew.context(App).setStatus(...) で表示を更新する。
function App() {
    const statusEl = document.getElementById('status');
    xnew(Lobby, { socket: window.io({ forceNew: true }) });
    return {
        setStatus(text, ok) { statusEl.textContent = text; statusEl.className = ok ? 'text-green-600' : 'text-red-500'; },
    };
}
xnew(document.getElementById('app'), App);

//----------------------------------------------------------------------------------------------------
// Lobby — ルーム作成 / 一覧 / 入室
//   ルームは動的。誰かが作成すると '-update' で全員へ一覧が届く。作成すると '-created' で自分の
//   入るべき roomId が返るので、そのまま Room へ遷移する。
//----------------------------------------------------------------------------------------------------

function Lobby(unit, { socket }) {
    xnew.extend(xnew.basics.Scene);
    const app = xnew.context(App);   // ステータス表示はコンテナ App が持つ

    // socket は呼び出し側が用意（room 無し = サーバーはロビー接続として扱う）。
    // Lobby が受信イベントを unit.on('-event') へ転送し、finalize で socket を切断する。
    xnew.extend(xnew.basics.Lobby, { socket });

    let rooms = [];

    xnew.nest('<div class="max-w-md flex flex-col gap-3">');
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
    const listEl = xnew('<ul class="flex flex-col gap-2">');
    const hintEl = xnew('<p class="m-0 text-xs text-gray-400">', 'ルームを作成 / 入室して、別タブでも同じルームに入ると互いの自機が見えます。');

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
                    enter.on('click', () => unit.change(Room, { socket: window.io({ query: { room: room.id }, forceNew: true }) }));
                });
            }
        });
    }

    // 受信イベントは Lobby が '-event' で転送する（finalize の切断も Lobby が担う。一覧は接続時に自動で届く）。
    unit.on('-connect', () => app.setStatus('ロビー', true));
    unit.on('-disconnect', () => app.setStatus('切断', false));
    unit.on('-update', ({ rooms: list }) => { rooms = list; render(); });
    unit.on('-created', ({ room }) => unit.change(Room, { socket: window.io({ query: { room: room.id }, forceNew: true }) }));
    unit.on('-rejected', ({ message }) => { hintEl.element.textContent = message; });

    render();   // 初期描画（一覧は -update 受信で更新）
}

//----------------------------------------------------------------------------------------------------
// Room — 渡された socket でそのルームへ接続し、client ツリー(Game) を mount してプレイ
//   socket は呼び出し側が query{room} 付きで用意する（roomId は表示用に socket の query から取り出す）。
//   HTML（戻るボタン・シーンの mount 先）だけを持ち、room 関連の配線（boot / socket 所有 / 基本イベント
//   connect・disconnect・notfound の '-event' 転送）は xnew.basics.Room に委ねる（mode は client に自動判定）。
//----------------------------------------------------------------------------------------------------

function Room(unit, { socket }) {
    xnew.extend(xnew.basics.Scene);
    const app = xnew.context(App);   // ステータス表示はコンテナ App が持つ

    const roomId = socket.io?.opts?.query?.room;   // 表示用（socket 作成時の query から取り出す）

    const back = xnew('<button class="px-3 py-1 mb-2 rounded border-0 bg-gray-500 hover:bg-gray-600 text-white text-sm cursor-pointer">', '← ロビーに戻る');
    back.on('click', () => unit.change(Lobby, { socket: window.io({ forceNew: true }) }));
    xnew.nest('<div class="flex gap-4">');   // シーンの mount 先（Game の client が Title/Setup/World を nest する）

    // room 関連の配線は Room が引き受ける（boot(Game)、finalize で client 畳み + socket 切断）。
    // socket は boot へ渡され、基本イベントは Room が '-event' でこの Room の unit.on へ転送する。
    xnew.extend(xnew.basics.Room, { socket, Component: Game });

    unit.on('-connect', () => app.setStatus(`ルーム ${roomId}: ${socket.id}`, true));
    unit.on('-disconnect', () => app.setStatus('切断', false));
    unit.on('-notfound', () => unit.change(Lobby, { socket: window.io({ forceNew: true }) }));   // 消滅ルームへ来たらロビーへ
}
