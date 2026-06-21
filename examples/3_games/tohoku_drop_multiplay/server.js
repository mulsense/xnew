//----------------------------------------------------------------------------------------------------
// tohoku_drop_multiplay（server 側）— 物理(matter-js) と勝敗ロジックを持つ権威サーバー。
//   ロビー / ルームの汎用配線は xnew.basics.Lobby / Room に任せ、部屋の中身に ServerGame を据える。
//   ServerGame は matter-js で皿と玉を回し、同期 state（Status / Ball）に位置・ターン・失敗数を書く。
//   描画は一切しない（three/pixi は client 側 index.js が担当）。sync は「レジストリ名」で同期するので、
//   client は別実装の Status / Ball を同じ名前で登録すればよい（関数の同一性は不要）。
//
//   ルール: 共有の皿に 2 人が交互にドロップ。同種が接触すると合体（id+1）。スコアは「落とした玉」
//   「合体で生まれた玉」を現在の手番に加点し、「あふれて落ちた玉」を現在の手番から減点する。
//   ドロップ後に皿が静まったら手番を交代し、先に WIN_SCORE（200）へ到達した方が勝ち。
//----------------------------------------------------------------------------------------------------

import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import express from 'express';
import { Server as IOServer } from 'socket.io';
import Matter from 'matter-js';
import xnew from '@mulsense/xnew';
import xmatter from '@mulsense/xnew/addons/xmatter';
import { WIDTH, HEIGHT, DROP_Y, WIN_SCORE, KINDS, DROP_KINDS, BOWL, ballRadius, points, clampX } from './shared.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3002;

// ---- HTTP + 静的配信 ----
const app = express();
app.use(express.static(__dirname));                                                 // index.html / index.js / shared.js / background.jpg
app.use('/xnew', express.static(join(__dirname, '..', '..', '..', 'dist')));        // ブラウザ用 @mulsense/xnew（addons 含む）
app.use('/thirdparty', express.static(join(__dirname, '..', '..', 'thirdparty')));  // pixi / three / voxelkit / tailwind
app.use('/assets', express.static(join(__dirname, '..', '..', 'assets')));          // 3D モデル(.mog) など

const httpServer = createServer(app);
const io = new IOServer(httpServer);

// ---- ロビー + 動的ルーム（basics を extend し、部屋の中身だけ与える） ----
function Lobby(unit) {
    xnew.extend(xnew.basics.Lobby, { io, Room });
}

function Room(unit, { io, room }) {
    xnew.extend(xnew.basics.Room, { io, room, Component: ServerGame });
}

xnew(Lobby);

httpServer.listen(PORT, () => {
    console.log(`[tohoku_drop_multiplay] server on http://localhost:${PORT}/index-multiframe.html`);
    console.log('[tohoku_drop_multiplay] 同じルームに 2 人入ると対戦開始。交互にドロップし、先に 200 点で勝ち');
});

//----------------------------------------------------------------------------------------------------
// ServerGame — matter エンジンと皿を用意し、同期ノード Status / Ball をぶら下げる booted ルート
//----------------------------------------------------------------------------------------------------

function ServerGame(unit) {
    xnew.sync.register({ Status: ServerStatus, Ball: ServerBall });   // 同期対象（client は同名で別実装を登録）

    xmatter.initialize();   // この unit 配下に matter Root を作る（以降の子は context で engine/world を引ける）
    unit.on('update', () => Matter.Engine.update(xmatter.engine));

    // 皿（受け）の静的ボディ。描画はしない（client が同じジオメトリで見た目を描く）。
    for (let a = 10; a <= 170; a++) {
        const x = BOWL.cx + Math.cos((a * Math.PI) / 180) * BOWL.rx;
        const y = BOWL.cy + Math.sin((a * Math.PI) / 180) * BOWL.ry;
        Matter.Composite.add(xmatter.world, Matter.Bodies.circle(x, y, BOWL.wall, { isStatic: true }));
    }

    xnew(ServerStatus);   // ゲームの共有状態 + 入力処理（Status は 1 つ）
}

//----------------------------------------------------------------------------------------------------
// ServerStatus — 共有状態（フェーズ / プレイヤー / ターン / スコア / カーソル）と入力・スコア処理
//----------------------------------------------------------------------------------------------------

function ServerStatus(unit) {
    // phase: waiting（2 人待ち）→ playing → over。dropping=ドロップ後に皿が静まるのを待っている間。
    // queue1/queue2 は各プレイヤーが次に落とすキャラ列。先頭が次の 1 体で、先頭から 2 体を盤面に予告表示する。
    const state = xnew.sync.state({
        phase: 'waiting', p1: null, p2: null,
        turn: 1, cursor1X: WIDTH / 2, cursor2X: WIDTH / 2, queue1: [], queue2: [], dropping: false,
        score1: 0, score2: 0, winner: 0,
    });

    const QUEUE_LEN = 3;   // 先頭 2 体を予告表示し、1 体ぶんの余裕を持たせる
    const idOfTurn = () => (state.turn === 1 ? state.p1 : state.p2);
    const randDrop = () => Math.floor(Math.random() * DROP_KINDS);
    const newQueue = () => Array.from({ length: QUEUE_LEN }, randDrop);

    // 収束判定のしきい値: 速度がこの値未満の状態が連続したら静止とみなして交代する。
    const SETTLE_SPEED = 0.4;   // これ未満なら静止
    const SETTLE_HOLD = 24;     // 連続静止フレーム数（約 0.4s）で収束
    const SETTLE_MAX = 360;     // 念のための上限（約 6s）で強制交代
    let settleTicks = 0;
    let dropTicks = 0;

    const startTurn = (turn) => {
        state.turn = turn;
        state.dropping = false;
        settleTicks = 0;
        dropTicks = 0;
    };

    // 現在の手番のスコアへ加減点（落とす / 合体 = 加点、あふれ = 減点）。先取で勝敗確定。
    function addScore(delta) {
        if (state.phase !== 'playing') { return; }
        if (state.turn === 1) { state.score1 = Math.max(0, state.score1 + delta); }
        else { state.score2 = Math.max(0, state.score2 + delta); }
        if (state.score1 >= WIN_SCORE) { state.phase = 'over'; state.winner = 1; }
        else if (state.score2 >= WIN_SCORE) { state.phase = 'over'; state.winner = 2; }
    }

    // 接続: 空いている枠へ割り当て、2 人そろったら対戦開始。3 人目以降は観戦。
    unit.on('sync.connect', ({ id }) => {
        if (!state.p1) { state.p1 = id; }
        else if (!state.p2) { state.p2 = id; }
        if (state.p1 && state.p2 && state.phase === 'waiting') {
            state.queue1 = newQueue();
            state.queue2 = newQueue();
            state.phase = 'playing';
            startTurn(1);
        }
    });

    // 切断: 対戦中にプレイヤーが抜けたら相手の勝ち。枠は空ける。
    unit.on('sync.disconnect', ({ id }) => {
        if (state.phase === 'playing' && (id === state.p1 || id === state.p2)) {
            state.phase = 'over';
            state.winner = id === state.p1 ? 2 : 1;
        }
        if (id === state.p1) { state.p1 = null; }
        if (id === state.p2) { state.p2 = null; }
    });

    // カーソル移動: 各プレイヤーが自分のカーソル（P1=cursor1X / P2=cursor2X）を動かす。
    // 手番でなくても自分のぶんは動かせる（ドロップは下の drop ハンドラで手番＆収束後のみ）。
    unit.on('move', ({ id, x }) => {
        if (state.phase !== 'playing') { return; }
        if (id === state.p1) { state.cursor1X = clampX(x); }
        else if (id === state.p2) { state.cursor2X = clampX(x); }
    });
    unit.on('drop', ({ id }) => {
        if (state.phase !== 'playing' || state.dropping || id !== idOfTurn()) { return; }
        const queue = state.turn === 1 ? state.queue1 : state.queue2;
        const dropId = queue[0];
        const cursorX = state.turn === 1 ? state.cursor1X : state.cursor2X;   // 手番側のカーソル位置に落とす
        xnew(unit.parent, ServerBall, { x: cursorX, y: DROP_Y, id: dropId });
        addScore(points(dropId));         // 落としたキャラのポイントを現手番へ加点
        // この手番のキューを 1 つ進める（先頭を消費し、末尾へ新しい玉を補充）。
        const advanced = queue.slice(1);
        advanced.push(randDrop());
        if (state.turn === 1) { state.queue1 = advanced; } else { state.queue2 = advanced; }
        state.dropping = true;            // 以降は収束まで入力を止める
        settleTicks = 0;
        dropTicks = 0;
    });

    // 収束判定: ドロップ後、皿が静まったら（または上限に達したら）手番を交代する。
    unit.on('update', () => {
        if (state.phase !== 'playing' || !state.dropping) { return; }
        dropTicks++;
        const balls = xnew.find(ServerBall);
        const maxSpeed = balls.reduce((m, b) => Math.max(m, b.speed), 0);
        if (balls.length === 0 || maxSpeed < SETTLE_SPEED) { settleTicks++; } else { settleTicks = 0; }
        if (settleTicks >= SETTLE_HOLD || dropTicks >= SETTLE_MAX) { startTurn(state.turn === 1 ? 2 : 1); }
    });

    return {
        addScore,   // ServerBall（合体 = 加点 / あふれ = 減点）が現在手番へ反映するのに使う
    };
}

//----------------------------------------------------------------------------------------------------
// ServerBall — matter ボディ 1 個。位置/角度を同期 state に書き、合体・あふれを判定する
//----------------------------------------------------------------------------------------------------

function ServerBall(unit, { x, y, id }) {
    const radius = ballRadius(id);
    const state = xnew.sync.state({ x, y, angle: 0, id });   // client が描画に使う

    const body = Matter.Bodies.circle(x, y, radius, { restitution: 0.1, friction: 0.5 });
    Matter.Composite.add(xmatter.world, body);
    unit.on('finalize', () => Matter.Composite.remove(xmatter.world, body));

    unit.on('update', () => {
        state.x = body.position.x;
        state.y = body.position.y;
        state.angle = body.angle;

        // あふれ: 画面下へ抜けたら現在手番から減点して撤去。
        if (body.position.y > HEIGHT + radius) {
            xnew.context(ServerStatus)?.addScore(-points(id));
            unit.finalize();
            return;
        }

        // 合体: 同 id が接触したら両者を撤去し id+1 を中点に生成。生まれた玉のポイントを現在手番へ加点。
        if (id < KINDS) {
            for (const other of xnew.find(ServerBall)) {
                if (other === unit || other.id !== id) { continue; }
                const dist = Math.hypot(state.x - other.x, state.y - other.y);
                if (dist < radius + ballRadius(other.id)) {
                    xnew(unit.parent, ServerBall, { x: (state.x + other.x) / 2, y: (state.y + other.y) / 2, id: id + 1 });
                    xnew.context(ServerStatus)?.addScore(points(id + 1));
                    other.finalize();
                    unit.finalize();
                    return;
                }
            }
        }
    });

    return {
        get id() { return id; },
        get x() { return state.x; },
        get y() { return state.y; },
        get speed() { return body.speed; },
    };
}
