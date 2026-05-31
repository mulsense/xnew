//----------------------------------------------------------------------------------------------------
// 6_network — ブラウザエントリ (xnew + socket.io クライアント)
//
// サーバー権威モデルのクライアント側。画面は xnew.basics.Scene を継承した 3 シーンで構成:
//   JoinScene(名前) → LobbyScene(ルーム選択) → GameScene(プレイ)。
//
// 接続は 2 本:
//   - lobbySocket : room クエリ無し → master が lobby ワーカーへ振り分け (ルーム一覧/人数)
//   - gameSocket  : query{room} 付き → master が該当ルームワーカーへ振り分け (プレイ)
// どちらも同一ポート(:3000)。ルームを変えると gameSocket を張り直して別プロセスに着地する。
//----------------------------------------------------------------------------------------------------

import xnew from '@mulsense/xnew';

// ロビー用接続。room を付けないので lobby ワーカーへ振り分けられる。
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
        pid: null,
        players: [],
    };

    lobbySocket.on('connect', () => {
        statusEl.classList.remove('text-red-400');
        statusEl.classList.add('text-emerald-400');
        statusEl.textContent = 'ロビー接続済み';
    });
    lobbySocket.on('disconnect', () => {
        statusEl.classList.remove('text-emerald-400');
        statusEl.classList.add('text-red-400');
        statusEl.textContent = '切断されました';
    });

    xnew(JoinScene, { state });
}

//----------------------------------------------------------------------------------------------------
// JoinScene — 名前入力 (Scene 継承)。送信で LobbyScene へ遷移。
//----------------------------------------------------------------------------------------------------

function JoinScene(unit, { state }) {
    xnew.extend(xnew.basics.Scene);

    const overlay = xnew.nest('<div class="absolute inset-0 flex items-center justify-center bg-slate-900/85 z-10">');
    overlay.innerHTML = `
        <form class="flex flex-col gap-2.5 py-7 px-8 bg-slate-800 border border-slate-700 rounded-xl text-center">
            <h2 class="m-0 text-xl font-semibold">ネットワークサンプル</h2>
            <p class="m-0 text-sm text-slate-400">名前を入力してください</p>
            <input class="px-2.5 py-2 rounded-md border border-slate-600 bg-slate-900 text-slate-200 text-sm" type="text" maxlength="12" placeholder="あなたの名前" />
            <button class="px-2.5 py-2 rounded-md border-0 bg-blue-500 hover:bg-blue-600 text-white text-sm cursor-pointer" type="submit">ロビーへ</button>
        </form>`;

    const form = overlay.querySelector('form');
    const input = overlay.querySelector('input');
    input.focus();

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        state.name = input.value.trim() || 'guest';
        unit.change(LobbyScene, { state });
    });
}

//----------------------------------------------------------------------------------------------------
// LobbyScene — ルーム選択 (Scene 継承)。lobby:rooms を購読して一覧を描き、選択で GameScene へ。
//----------------------------------------------------------------------------------------------------

function LobbyScene(unit, { state }) {
    xnew.extend(xnew.basics.Scene);

    const statusEl = document.getElementById('status');
    if (lobbySocket.connected) { statusEl.textContent = 'ロビー'; }

    const wrap = xnew.nest('<div class="absolute inset-0 flex items-center justify-center p-4">');
    wrap.innerHTML = `
        <div class="w-full max-w-md flex flex-col gap-3">
            <h2 class="m-0 text-xl font-semibold text-center">ルームを選択 (<span class="who"></span>)</h2>
            <ul class="rooms flex flex-col gap-2"></ul>
            <p class="m-0 text-xs text-slate-500 text-center">各ルームは別プロセスで動いています</p>
        </div>`;
    wrap.querySelector('.who').textContent = state.name;
    const listEl = wrap.querySelector('.rooms');

    function render() {
        listEl.innerHTML = '';
        for (const room of state.rooms) {
            const li = document.createElement('li');
            li.className = 'flex items-center justify-between gap-3 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg';

            const label = document.createElement('div');
            label.innerHTML = `<span class="font-medium">${room.name}</span> <span class="text-xs text-slate-400">(${room.memberCount}人)</span>`;

            const btn = document.createElement('button');
            btn.className = 'px-3 py-1.5 rounded-md border-0 bg-blue-500 hover:bg-blue-600 text-white text-sm cursor-pointer';
            btn.textContent = '参加';
            btn.addEventListener('click', () => unit.change(GameScene, { state, roomId: room.id }));

            li.append(label, btn);
            listEl.appendChild(li);
        }
    }

    const onRooms = ({ rooms }) => { state.rooms = rooms; render(); };
    lobbySocket.on('lobby:rooms', onRooms);
    unit.on('finalize', () => lobbySocket.off('lobby:rooms', onRooms));

    lobbySocket.emit('lobby:enter');
    render(); // 既に state.rooms があれば即描画
}

//----------------------------------------------------------------------------------------------------
// GameScene — canvas 描画 + 入力送信 (Scene 継承)
//
// 選んだルーム専用の接続 (gameSocket) を張り、welcome 後に join。離脱(ロビーに戻る/finalize)で
// gameSocket を閉じる。ルーム毎にプロセスが違うことを示すため、status に room と pid を表示する。
//----------------------------------------------------------------------------------------------------

function GameScene(unit, { state, roomId }) {
    xnew.extend(xnew.basics.Scene);

    const PLAYER_RADIUS = 16;
    const statusEl = document.getElementById('status');

    // ゲーム用接続。query.room で master が該当ルームワーカーへ振り分ける。
    // forceNew: lobbySocket とは別の物理接続にする。
    const gameSocket = io({ query: { room: roomId }, transports: ['websocket'], forceNew: true });

    gameSocket.on('welcome', ({ id, field, roomId: rid, pid }) => {
        state.selfId = id;
        state.field = field;
        state.roomId = rid;
        state.pid = pid;
        statusEl.textContent = `room ${rid} · pid ${pid}`;
        gameSocket.emit('join', { name: state.name });
    });
    gameSocket.on('state', (snapshot) => { state.players = snapshot.players; });

    unit.on('finalize', () => gameSocket.close());

    // ---- 画面: フィールドを埋める wrapper の中に Screen(canvas) を載せる ----
    const root = xnew.nest('<div class="absolute inset-0">');
    const screen = xnew.extend(xnew.basics.Screen, { width: state.field.w, height: state.field.h, fit: 'contain' });
    const ctx = screen.canvas.getContext('2d');

    // ロビーに戻るボタン (canvas の上に重ねる)。
    const back = document.createElement('button');
    back.className = 'absolute top-3 left-3 z-10 px-3 py-1.5 rounded-md border-0 bg-slate-700 hover:bg-slate-600 text-white text-sm cursor-pointer';
    back.textContent = 'ロビーに戻る';
    back.addEventListener('click', () => unit.change(LobbyScene, { state }));
    root.appendChild(back);

    // ---- 入力: xnew の window イベントで方向ベクトルを取得して送信 ----
    unit.on('window.keydown.arrow window.keyup.arrow window.keydown.wasd window.keyup.wasd', ({ event, vector }) => {
        const el = event.target;
        if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) { return; }
        event.preventDefault();
        gameSocket.emit('input', vector);
    });
    unit.on('window.blur', () => gameSocket.emit('input', { x: 0, y: 0 }));

    // ---- 描画: 毎フレーム state を読みに来る ----
    unit.on('render', () => {
        const { width, height } = ctx.canvas;

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 40) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
        }
        for (let y = 0; y < height; y += 40) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
        }

        for (const player of state.players) {
            ctx.fillStyle = player.color;
            ctx.beginPath();
            ctx.arc(player.x, player.y, PLAYER_RADIUS, 0, Math.PI * 2);
            ctx.fill();

            if (player.id === state.selfId) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            ctx.fillStyle = '#e2e8f0';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(player.name, player.x, player.y - 22);
        }
    });
}
