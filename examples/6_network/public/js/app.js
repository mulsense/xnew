//----------------------------------------------------------------------------------------------------
// 6_network — ブラウザエントリ (xnew + socket.io クライアント)
//
// サーバー権威モデルのクライアント側。自分の位置は計算せず、押しているキー状態だけを送り、
// サーバーから来る 'state' スナップショットをそのまま描画する。画面は xnew コンポーネントで
// 構成する: JoinScreen (名前入力オーバーレイ) → GameScreen (canvas 描画 + 入力送信)。
//
// サーバーと同じく、毎フレームの処理は xnew の 'render' / 'update' イベントで回す。
//----------------------------------------------------------------------------------------------------

import xnew from '@mulsense/xnew';

// 引数なしの io() は現在のホスト / ポートに接続する。
const socket = io();

xnew(document.querySelector('#app'), App);

//----------------------------------------------------------------------------------------------------
// App — 接続管理と画面構成のルートコンポーネント
//
// socket からの 'welcome' / 'state' を受けて共有 state を更新するだけ。描画は GameScreen が
// 毎フレーム state を読みに来る一方通行。JoinScreen で参加するとオーバーレイが消える。
//----------------------------------------------------------------------------------------------------

function App(unit) {
    const statusEl = document.getElementById('status');

    // クライアント全体の「唯一の真実」。各ハンドラはここを更新するだけ。
    const state = {
        selfId: null,
        field: { w: 800, h: 600 },
        players: [],
    };

    socket.on('connect', () => {
        statusEl.textContent = `接続済み (${socket.id.slice(0, 6)})`;
        statusEl.classList.add('connected');
    });
    socket.on('disconnect', () => {
        statusEl.textContent = '切断されました';
        statusEl.classList.remove('connected');
    });
    socket.on('welcome', ({ id, field }) => {
        state.selfId = id;
        state.field = field;
    });
    // サーバーから一定レートで来る位置スナップショット。上書きするだけで描画に反映される。
    socket.on('state', (snapshot) => {
        state.players = snapshot.players;
    });

    // ゲーム画面は常駐 (state が来れば描画される)。その上に参加フォームを重ねる。
    xnew(GameScreen, { state });
    xnew(JoinScreen, { onJoin: (name) => socket.emit('join', { name }) });
}

//----------------------------------------------------------------------------------------------------
// JoinScreen — 名前入力オーバーレイ
//
// 送信すると onJoin を呼び、自身を finalize してオーバーレイを消す
// (xnew.nest で作った要素は finalize で自動的に DOM から除去される)。
//----------------------------------------------------------------------------------------------------

function JoinScreen(unit, { onJoin }) {
    const overlay = xnew.nest('<div class="overlay">');
    overlay.innerHTML = `
        <form class="join-form">
            <h2>ネットワークサンプル</h2>
            <p>名前を入力して参加してください</p>
            <input class="name-input" type="text" maxlength="12" placeholder="あなたの名前" />
            <button type="submit">参加する</button>
        </form>`;

    const form = overlay.querySelector('form');
    const input = overlay.querySelector('input');
    input.focus();

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        onJoin(input.value.trim());
        unit.finalize();
    });
}

//----------------------------------------------------------------------------------------------------
// GameScreen — canvas 描画 + キー入力送信
//
// 入力は「状態が変わったときだけ」送る (60Hz の連続送信は無駄)。描画は 'render' で毎フレーム
// state.players をそのまま円として描く。自分だけ白枠でハイライトする。
//----------------------------------------------------------------------------------------------------

function GameScreen(unit, { state }) {
    const PLAYER_RADIUS = 16;

    // Screen(Aspect) は親いっぱい (height:100%) に広がる前提。#app は flex 子なので
    // パーセンテージ高さが解決できない (= 0 になる)。絶対配置で #app を埋める wrapper を
    // 1 枚かませ、definite な高さを与えてから Screen を載せる。
    xnew.nest('<div style="position: absolute; inset: 0;">');

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
