//----------------------------------------------------------------------------------------------------
// 6_network — ブラウザエントリ (xnew + socket.io クライアント)
//
// サーバー権威モデルのクライアント側。自分の位置は計算せず、押しているキー状態だけを送り、
// サーバーから来る 'state' スナップショットをそのまま描画する。画面は xnew.basics.Scene を
// 継承した 2 つのシーンで構成する: JoinScene (名前入力) → unit.change(GameScene) で遷移。
//
// サーバーと同じく、毎フレームの処理は xnew の 'render' / 'update' イベントで回す。
//----------------------------------------------------------------------------------------------------

import xnew from '@mulsense/xnew';

// 引数なしの io() は現在のホスト / ポートに接続する。
const socket = io();

xnew(document.querySelector('#app'), App);

//----------------------------------------------------------------------------------------------------
// App — 接続管理と共有 state を持つルートコンポーネント
//
// socket からの 'welcome' / 'state' を受けて共有 state を更新するだけ。state は子シーンに
// 渡され、描画は GameScene が毎フレーム読みに来る一方通行。最初のシーンとして JoinScene を置く。
//----------------------------------------------------------------------------------------------------

function App(unit) {
    const statusEl = document.getElementById('status');

    // クライアント全体の「唯一の真実」。各ハンドラはここを更新するだけ。
    // この同じ参照が JoinScene → GameScene へ受け渡される。
    const state = {
        selfId: null,
        field: { w: 800, h: 600 },
        players: [],
    };

    socket.on('connect', () => {
        statusEl.textContent = `接続済み (${socket.id.slice(0, 6)})`;
        statusEl.classList.replace('text-red-400', 'text-emerald-400');
    });
    socket.on('disconnect', () => {
        statusEl.textContent = '切断されました';
        statusEl.classList.replace('text-emerald-400', 'text-red-400');
    });
    socket.on('welcome', ({ id, field }) => {
        state.selfId = id;
        state.field = field;
    });
    // サーバーから一定レートで来る位置スナップショット。上書きするだけで描画に反映される。
    socket.on('state', (snapshot) => {
        state.players = snapshot.players;
    });

    xnew(JoinScene, { state });
}

//----------------------------------------------------------------------------------------------------
// JoinScene — 名前入力シーン (Scene を継承)
//
// 送信すると join を通知し、unit.change(GameScene) で GameScene へ遷移する
// (Scene.change が親に GameScene を生成して自身を finalize。nest した要素も自動で除去される)。
//----------------------------------------------------------------------------------------------------

function JoinScene(unit, { state }) {
    xnew.extend(xnew.basics.Scene);

    const overlay = xnew.nest('<div class="absolute inset-0 flex items-center justify-center bg-slate-900/85 z-10">');
    overlay.innerHTML = `
        <form class="flex flex-col gap-2.5 py-7 px-8 bg-slate-800 border border-slate-700 rounded-xl text-center">
            <h2 class="m-0 text-xl font-semibold">ネットワークサンプル</h2>
            <p class="m-0 text-sm text-slate-400">名前を入力して参加してください</p>
            <input class="px-2.5 py-2 rounded-md border border-slate-600 bg-slate-900 text-slate-200 text-sm" type="text" maxlength="12" placeholder="あなたの名前" />
            <button class="px-2.5 py-2 rounded-md border-0 bg-blue-500 hover:bg-blue-600 text-white text-sm cursor-pointer" type="submit">参加する</button>
        </form>`;

    const form = overlay.querySelector('form');
    const input = overlay.querySelector('input');
    input.focus();

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        socket.emit('join', { name: input.value.trim() });
        unit.change(GameScene, { state });
    });
}

//----------------------------------------------------------------------------------------------------
// GameScene — canvas 描画 + キー入力送信 (Scene を継承)
//
// join 後に JoinScene からの unit.change で生成される。描画は 'render' で毎フレーム
// state.players をそのまま円として描く。自分だけ白枠でハイライトする。
//----------------------------------------------------------------------------------------------------

function GameScene(unit, { state }) {
    xnew.extend(xnew.basics.Scene);

    const PLAYER_RADIUS = 16;

    // Screen(Aspect) は親いっぱい (height:100%) に広がる前提。#app は flex 子なので
    // パーセンテージ高さが解決できない (= 0 になる)。絶対配置で #app を埋める wrapper を
    // 1 枚かませ、definite な高さを与えてから Screen を載せる。
    xnew.nest('<div class="absolute inset-0">');

    const screen = xnew.extend(xnew.basics.Screen, { width: state.field.w, height: state.field.h, fit: 'contain' });
    const ctx = screen.canvas.getContext('2d');

    // ---- 入力: xnew の window イベントで方向ベクトルを取得して送信 ----
    // window.keydown/keyup.arrow / .wasd は { vector: { x, y } } を渡してくれる
    // (各軸 -1 / 0 / +1)。矢印キーと WASD の両方に対応。キーが変わるたびに発火するので
    // そのままサーバーへ送る。これらは preventDefault しないため名前入力とも競合しない。
    // (window リスナーは unit の finalize で自動的に解除される)
    unit.on('window.keydown.arrow window.keyup.arrow window.keydown.wasd window.keyup.wasd', ({ event, vector }) => {
        // 名前入力など編集中のフォームにフォーカスがある間は何もしない (文字入力を邪魔しない)。
        const el = event.target;
        if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) { return; }
        // 矢印キーでのページスクロールを抑止。
        event.preventDefault();
        socket.emit('input', vector);
    });
    // フォーカスが外れたら停止 (押しっぱなし暴走の防止)。
    unit.on('window.blur', () => {
        socket.emit('input', { x: 0, y: 0 });
    });

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
