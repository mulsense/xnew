//----------------------------------------------------------------------------------------------------
// 6_network — ブラウザエントリ (xnew + socket.io クライアント)
//
// サーバー権威モデルのクライアント側。画面は xnew.basics.Scene を継承した 3 シーンで構成:
//   JoinScene(名前) → LobbyScene(ルーム選択) → GameScene(プレイ)。
//
// 接続は 2 本:
//   - lobbySocket : room クエリ無し → サーバーはロビー扱い (ルーム一覧/作成)
//   - gameSocket  : query{room} 付き → サーバーはそのルームへ join させる (プレイ)
// どちらも同一ポート(:3000)。ルームを変えると gameSocket を張り直す。
//----------------------------------------------------------------------------------------------------

import xnew from '@mulsense/xnew';

// ロビー用接続。room を付けないのでサーバーはロビー接続として扱う。
const lobbySocket = io({ transports: ['websocket'] });

xnew(document.querySelector('#app'), App);

//----------------------------------------------------------------------------------------------------
// App — 接続状態と共有 state を持つルートコンポーネント
//----------------------------------------------------------------------------------------------------

function App(unit) {
    const statusEl = document.getElementById('status');

    // この同じ参照が各シーンへ受け渡される。
    const state = {
        name: '',
        rooms: [],                       // ロビーのルーム一覧 [{id,name,memberCount}]
        // ゲーム中の状態
        selfId: null,
        field: { w: 800, h: 600 },
        roomId: null,
    };

    const setStatus = (text, ok) => {
        statusEl.textContent = text;
        statusEl.classList.toggle('text-emerald-400', ok);
        statusEl.classList.toggle('text-red-400', !ok);
    };
    // すでに接続済みなら即反映 (connect イベントを取り逃すケースの保険)。
    if (lobbySocket.connected) { setStatus('ロビー接続済み', true); }

    lobbySocket.on('connect', () => setStatus('ロビー接続済み', true));
    lobbySocket.on('disconnect', () => setStatus('切断されました', false));
    // 接続できない理由を画面に出す (websocket がプロキシ等で弾かれている場合など)。
    lobbySocket.on('connect_error', (err) => setStatus(`接続エラー: ${err.message}`, false));

    xnew(JoinScene, { state });
}

//----------------------------------------------------------------------------------------------------
// JoinScene — 名前入力 (Scene 継承)。送信で LobbyScene へ遷移。
//----------------------------------------------------------------------------------------------------

function JoinScene(unit, { state }) {
    xnew.extend(xnew.basics.Scene);

    xnew.nest('<div class="absolute inset-0 flex items-center justify-center bg-slate-900/85 z-10">');

    let input;
    const form = xnew('<form class="flex flex-col gap-2.5 py-7 px-8 bg-slate-800 border border-slate-700 rounded-xl text-center">', () => {
        xnew('<h2 class="m-0 text-xl font-semibold">', 'ネットワークサンプル');
        xnew('<p class="m-0 text-sm text-slate-400">', '名前を入力してください');
        input = xnew('<input class="px-2.5 py-2 rounded-md border border-slate-600 bg-slate-900 text-slate-200 text-sm" type="text" maxlength="12" placeholder="あなたの名前">');
        xnew('<button class="px-2.5 py-2 rounded-md border-0 bg-blue-500 hover:bg-blue-600 text-white text-sm cursor-pointer" type="submit">', 'ロビーへ');
    });

    input.element.focus();

    form.on('submit', ({ event }) => {
        event.preventDefault();
        state.name = input.element.value.trim() || 'guest';
        unit.change(LobbyScene, { state });
    });
}

//----------------------------------------------------------------------------------------------------
// LobbyScene — ルーム作成 / 選択 (Scene 継承)
//
// ルームは動的。デフォルトは 0 個で、誰かが作成すると lobby:rooms で全員に一覧が届く。
// 作成すると room:created で自分の入るべき roomId が返るので、そのまま GameScene へ遷移する。
//----------------------------------------------------------------------------------------------------

function LobbyScene(unit, { state }) {
    xnew.extend(xnew.basics.Scene);

    const statusEl = document.getElementById('status');
    if (lobbySocket.connected) { statusEl.textContent = 'ロビー'; }

    xnew.nest('<div class="absolute inset-0 flex items-center justify-center p-4">');

    let list;
    let hint;
    xnew('<div class="w-full max-w-md flex flex-col gap-4">', () => {
        xnew('<h2 class="m-0 text-xl font-semibold text-center">', `ロビー (${state.name})`);

        xnew('<form class="flex gap-2">', (unit) => {
            const cnameInput = xnew('<input class="flex-1 px-2.5 py-2 rounded-md border border-slate-600 bg-slate-900 text-slate-200 text-sm" type="text" maxlength="16" placeholder="新しいルーム名">');
            xnew('<button class="px-3 py-2 rounded-md border-0 bg-emerald-500 hover:bg-emerald-600 text-white text-sm cursor-pointer" type="submit">', '作成');
            unit.on('submit', ({ event }) => {
                event.preventDefault();
                const name = cnameInput.element.value.trim();
                if (!name) { return; }
                lobbySocket.emit('room:create', { name });
                cnameInput.element.value = '';
            });
        });


        list = xnew('<ul class="flex flex-col gap-2">');
        hint = xnew('<p class="m-0 text-xs text-slate-500 text-center">', 'ルームを作成 / 入室してアバターを動かそう');
    });

    // ルーム一覧は受信のたびに作り直す。前回ぶんの行 unit を finalize してから再生成する
    // （xnew がライフサイクルを管理するので innerHTML クリアは不要）。
    let rows = null;
    function render() {
        rows?.finalize();
        rows = xnew(list, () => {
            if (state.rooms.length === 0) {
                xnew('<li class="text-center text-slate-500 text-sm py-4">', 'まだルームがありません。上から作成してください。');
                return;
            }
            for (const room of state.rooms) {
                xnew('<li class="flex items-center justify-between gap-3 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg">', () => {
                    xnew('<div>', () => {
                        xnew('<span class="font-medium">', room.name);   // textContent = ユーザー入力名を安全に表示
                        xnew('<span class="text-xs text-slate-400 ml-2">', `(${room.memberCount}人)`);
                    });
                    const enter = xnew('<button class="px-3 py-1.5 rounded-md border-0 bg-blue-500 hover:bg-blue-600 text-white text-sm cursor-pointer">', '入室');
                    enter.on('click', () => unit.change(GameScene, { state, roomId: room.id }));
                });
            }
        });
    }

    const onRooms = ({ rooms }) => { state.rooms = rooms; render(); };
    const onCreated = ({ roomId }) => unit.change(GameScene, { state, roomId });
    const onError = ({ message }) => { hint.element.textContent = message; };
    lobbySocket.on('lobby:rooms', onRooms);
    lobbySocket.on('room:created', onCreated);
    lobbySocket.on('room:error', onError);
    unit.on('finalize', () => {
        lobbySocket.off('lobby:rooms', onRooms);
        lobbySocket.off('room:created', onCreated);
        lobbySocket.off('room:error', onError);
    });

    lobbySocket.emit('lobby:enter');
    render(); // 既に state.rooms があれば即描画
}

//----------------------------------------------------------------------------------------------------
// GameScene — client ツリー(xnew.sync) でアバターを描画 + 入力送信 (Scene 継承)
//
// welcome で受け取った gameType の共有モジュールを動的 import し、xnew.boot('client', World) で
// このシーン配下に client ツリーを mount。サーバーからの 'sync'(state tree) を apply で差分反映する。
// 描画はグローバルティッカーが回す(手動 render ループ無し)。入力は従来どおり emit('input')。
//----------------------------------------------------------------------------------------------------

function GameScene(unit, { state, roomId }) {
    xnew.extend(xnew.basics.Scene);

    const statusEl = document.getElementById('status');

    // ゲーム用接続。query.room でサーバーはそのルームへ join させる。forceNew で lobbySocket と分離。
    const gameSocket = io({ query: { room: roomId }, transports: ['websocket'], forceNew: true });

    // フィールドを内包する wrapper。
    xnew.nest('<div class="absolute inset-0 overflow-hidden">');

    // ロビーに戻るボタン（wrapper の中に自動で nest される）。
    const back = xnew('<button class="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-md border-0 bg-slate-700 hover:bg-slate-600 text-white text-sm cursor-pointer">', 'ロビーに戻る');
    back.on('click', () => unit.change(LobbyScene, { state }));

    let clientWorld = null;   // 受信ツリーを apply する client ルート(World)

    gameSocket.on('welcome', async ({ id, field, roomId: rid, roomName, gameType }) => {
        state.selfId = id;
        state.field = field;
        state.roomId = rid;
        statusEl.textContent = roomName || rid;

        // gameType の共有モジュールを動的ロードし、client ツリーをこのシーン配下に mount。
        const mod = await import(`/games/${gameType}.js`);
        clientWorld = xnew.boot('client', unit, mod.World, { selfId: id, field });

        gameSocket.emit('join', { name: state.name });
    });

    // サーバーからの state tree を client ツリーへ差分反映。
    gameSocket.on('sync', (tree) => {
        if (clientWorld) { xnew.sync.apply(clientWorld, tree); }
    });

    // ルームが既に無い場合はロビーへ戻す。
    gameSocket.on('room:notfound', () => unit.change(LobbyScene, { state }));

    unit.on('finalize', () => {
        clientWorld?.finalize();
        gameSocket.close();
    });

    // ---- 入力: xnew の window イベントで方向ベクトルを取得して送信(sync は server→client のみ) ----
    unit.on('window.keydown.arrow window.keyup.arrow window.keydown.wasd window.keyup.wasd', ({ event, vector }) => {
        const el = event.target;
        if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) { return; }
        event.preventDefault();
        gameSocket.emit('input', vector);
    });
    unit.on('window.blur', () => gameSocket.emit('input', { x: 0, y: 0 }));
}
