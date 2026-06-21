import * as PIXI from 'pixi.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import voxelkit from 'voxelkit';
import xnew from '@mulsense/xnew';
import xpixi from '@mulsense/xnew/addons/xpixi';
import xthree from '@mulsense/xnew/addons/xthree';
import { WIDTH, HEIGHT, DROP_Y, WIN_SCORE, SCALES, BOWL } from './shared.js';

//----------------------------------------------------------------------------------------------------
// tohoku_drop_multiplay（client 側）— ロビー / ルームで対戦相手と同室し、three/pixi で描画する。
//   物理・勝敗は server（server.js / matter-js）が権威。client は同期 state（Status / Ball）を受け取って
//   描画するだけで、入力（move / drop）を server へ送る。sync は「レジストリ名」で同期するため、
//   server とは別実装の Status / Ball を同じ名前で登録する。
//
//   Lobby / Room の配線は multi-client サンプルと同じ（basics.Lobby / basics.Room）。Room が ClientGame を
//   boot し、ClientGame が描画パイプライン（three→pixi）と盤面・カーソル・HUD を組み立てる。
//----------------------------------------------------------------------------------------------------

function App() {
    const statusEl = document.getElementById('status');
    xnew(Lobby, { socket: window.io({ forceNew: true }) });
    return {
        setStatus(text, ok) { statusEl.textContent = text; statusEl.className = ok ? 'text-green-600' : 'text-red-500'; },
    };
}
xnew(document.getElementById('app'), App);

//----------------------------------------------------------------------------------------------------
// Lobby / Room — ルーム作成・一覧・入室（multi-client と同じ作り。中身が ClientGame なだけ）
//----------------------------------------------------------------------------------------------------

function Lobby(unit, { socket }) {
    xnew.extend(xnew.basics.Scene);
    const app = xnew.context(App);
    xnew.extend(xnew.basics.Lobby, { socket });

    let rooms = [];

    xnew.nest('<div class="max-w-md flex flex-col gap-3">');
    xnew('<form class="flex gap-2">', (form) => {
        const nameInput = xnew('<input class="flex-1 px-2.5 py-1.5 rounded border border-gray-300 text-sm" type="text" maxlength="16" placeholder="新しいルーム名">');
        xnew('<button class="px-3 py-1.5 rounded border-0 bg-emerald-500 hover:bg-emerald-600 text-white text-sm cursor-pointer" type="submit">', '作成');
        form.on('submit', ({ event }) => {
            event.preventDefault();
            const name = nameInput.element.value.trim();
            if (!name) { return; }
            unit.create(name);
            nameInput.element.value = '';
        });
    });
    const listEl = xnew('<ul class="flex flex-col gap-2">');
    const hintEl = xnew('<p class="m-0 text-xs text-gray-400">', '同じルームに 2 人入ると対戦開始。別タブ / 別ブラウザでもう 1 人入ってください。');

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
                        xnew('<span class="font-medium text-gray-700">', room.name);
                        xnew('<span class="text-xs text-gray-400 ml-2">', `(${room.memberCount}人)`);
                    });
                    const enter = xnew('<button class="px-3 py-1 rounded border-0 bg-blue-500 hover:bg-blue-600 text-white text-sm cursor-pointer">', '入室');
                    enter.on('click', () => unit.change(Room, { socket: window.io({ query: { room: room.id }, forceNew: true }) }));
                });
            }
        });
    }

    unit.on('-connect', () => app.setStatus('ロビー', true));
    unit.on('-disconnect', () => app.setStatus('切断', false));
    unit.on('-update', ({ rooms: list }) => { rooms = list; render(); });
    unit.on('-created', ({ room }) => unit.change(Room, { socket: window.io({ query: { room: room.id }, forceNew: true }) }));
    unit.on('-rejected', ({ message }) => { hintEl.element.textContent = message; });

    render();
}

function Room(unit, { socket }) {
    xnew.extend(xnew.basics.Scene);
    const app = xnew.context(App);
    const roomId = socket.io?.opts?.query?.room;

    const back = xnew('<button class="px-3 py-1 mb-2 rounded border-0 bg-gray-500 hover:bg-gray-600 text-white text-sm cursor-pointer">', '← ロビーに戻る');
    back.on('click', () => unit.change(Lobby, { socket: window.io({ forceNew: true }) }));
    xnew.nest('<div class="relative w-[90vmin] max-w-[800px] aspect-[4/3]">');   // ClientGame（Screen）の mount 先（高さを確定させる）

    xnew.extend(xnew.basics.Room, { socket, Component: ClientGame });

    unit.on('-connect', () => app.setStatus(`ルーム ${roomId}: ${socket.id}`, true));
    unit.on('-disconnect', () => app.setStatus('切断', false));
    unit.on('-notfound', () => unit.change(Lobby, { socket: window.io({ forceNew: true }) }));
}

//----------------------------------------------------------------------------------------------------
// ClientGame — 描画パイプライン（three→pixi）と盤面・カーソル・HUD を組み立てる booted ルート
//   同期ノード Status / Ball（server の別実装）を同名で登録し、それらの replica が描画を担う。
//----------------------------------------------------------------------------------------------------

function ClientGame(unit) {
    xnew.extend(xnew.basics.Screen, { width: WIDTH, height: HEIGHT });
    xnew.sync.register({ Status: ClientStatus, Ball: ClientBall });

    // three（3D モデルを OffscreenCanvas に描画）
    xthree.initialize({ canvas: new OffscreenCanvas(WIDTH, HEIGHT) });
    xthree.renderer.shadowMap.enabled = true;
    xthree.camera.position.set(0, 0, 10);
    unit.on('render', () => xthree.renderer.render(xthree.scene, xthree.camera));

    // pixi（背景・皿・カーソル + three の描画をテクスチャとして重ねる）
    xpixi.initialize({ canvas: unit.canvas });
    const threeTexture = PIXI.Texture.from(xthree.canvas);
    unit.on('render', () => { threeTexture.source.update(); xpixi.renderer.render(xpixi.scene); });

    // 盤面（pixi の描画順 = 重なり順）
    xnew(Background);
    xnew(ShadowPlane);
    xnew(DirectionalLight, { x: 2, y: 5, z: 10 });
    xnew(AmbientLight);
    xnew(BowlVisual);
    xnew(Cursor, { player: 1, color: 0xE84A57 });   // P1 = 赤
    xnew(Cursor, { player: 2, color: 0x3B82F6 });   // P2 = 青
    xnew(QueuePreview, { player: 1 });   // 各プレイヤーの次に落とすキャラ（1 体）の予告
    xnew(QueuePreview, { player: 2 });
    xnew(ThreeTexture);   // three の描画（玉/カーソル/予告のモデル）を最前面に合成
    xnew(HUD);
}

//----------------------------------------------------------------------------------------------------
// ClientStatus — server の共有 state を受け取り、毎フレーム '+status' として盤面へ配る
//----------------------------------------------------------------------------------------------------

function ClientStatus(unit) {
    const state = xnew.sync.state({
        phase: 'waiting', p1: null, p2: null,
        turn: 1, cursor1X: WIDTH / 2, cursor2X: WIDTH / 2, queue1: [], queue2: [], dropping: false,
        score1: 0, score2: 0, winner: 0,
    });
    const myId = xnew.sync.status.id;

    unit.on('render', () => {
        const myNo = myId === state.p1 ? 1 : myId === state.p2 ? 2 : 0;
        xnew.emit('+status', {
            phase: state.phase, myNo, turn: state.turn, dropping: state.dropping,
            cursor1X: state.cursor1X, cursor2X: state.cursor2X,
            queue1: state.queue1, queue2: state.queue2,
            score1: state.score1, score2: state.score2, winner: state.winner,
        });
    });
}

//----------------------------------------------------------------------------------------------------
// ClientBall — 同期された玉 1 個を 3D モデルで描画（位置/角度は server 由来）
//----------------------------------------------------------------------------------------------------

function ClientBall(unit) {
    const state = xnew.sync.state({ x: 0, y: 0, angle: 0, id: 0 });
    const model = xnew(Model, { id: state.id, scale: SCALES[state.id] });

    unit.on('update', () => {
        const p = convert3d(state.x, state.y);
        model.threeObject?.position.set(p.x, p.y, p.z);
        if (model.threeObject) { model.threeObject.rotation.z = -state.angle; }
    });
}

//----------------------------------------------------------------------------------------------------
// Cursor — プレイヤーごとの十字カーソル（P1=赤 / P2=青）。常時表示で、自分のカーソルだけ操作できる。
//          構え玉プレビューは「現在の手番プレイヤーのカーソル」に収束後だけ出す。位置は server 権威。
//----------------------------------------------------------------------------------------------------

function Cursor(unit, { player, color }) {
    const object = xpixi.nest(new PIXI.Container({ position: { x: WIDTH / 2, y: DROP_Y } }));
    const graphics = new PIXI.Graphics();
    graphics.moveTo(-24, 0).lineTo(24, 0).stroke({ color, width: 12 });
    graphics.moveTo(0, -24).lineTo(0, 24).stroke({ color, width: 12 });
    object.addChild(graphics);

    let iControl = false;   // 自分がこの player か（= このカーソルを動かせる）
    let canDrop = false;    // 自分の手番＆収束後のみドロップ
    let model = null;
    let currentId = -1;

    unit.on('+status', ({ phase, myNo, turn, cursor1X, cursor2X, queue1, queue2, dropping }) => {
        const playing = phase === 'playing';
        object.x = player === 1 ? cursor1X : cursor2X;   // 自分のカーソル位置（server 権威）
        iControl = playing && myNo === player;
        const isTurn = turn === player;
        canDrop = iControl && isTurn && !dropping;
        // 構え玉は手番側カーソルに、収束後だけ出す。
        const aiming = playing && isTurn && !dropping;
        const dropId = (player === 1 ? queue1 : queue2)?.[0];
        if (aiming && dropId !== undefined) {
            if (currentId !== dropId) {   // 構え玉が変わったら作り直す
                currentId = dropId;
                model?.finalize();
                model = xnew(Model, { id: dropId, scale: 0.5 });
            }
        } else if (model !== null) {
            model.finalize();
            model = null;
            currentId = -1;
        }
    });

    // 自分のカーソルだけ動かせる（手番でなくても自分のぶんは動かせる。ドロップは手番＆収束後のみ）。
    unit.on('pointermove pointerdown', ({ position }) => {
        if (!iControl) { return; }
        xnew.sync.emit('move', { x: position.x * xpixi.canvas.width / xpixi.canvas.clientWidth });
    });
    unit.on('pointerdown', () => { if (canDrop) { xnew.sync.emit('drop'); } });

    unit.on('update', () => {
        object.rotation += 0.02;
        if (model !== null) {
            const p = convert3d(object.x, DROP_Y + 50);
            model.threeObject?.position.set(p.x, p.y, p.z);
        }
    });
}

//----------------------------------------------------------------------------------------------------
// HUD — 左上に P1・右上に P2 のスコアを表示し、手番のプレイヤーを強調（pointer は透過）
//----------------------------------------------------------------------------------------------------

function HUD(unit) {
    xnew.nest('<div class="absolute inset-0 pointer-events-none">');
    const boxClass = 'absolute top-[2cqw] px-[1.6cqw] py-[0.8cqw] rounded-[1cqw] font-bold text-[3.2cqw] leading-tight';
    const p1box = xnew(`<div class="${boxClass} left-[2cqw] text-left">`);
    const p2box = xnew(`<div class="${boxClass} right-[2cqw] text-right">`);
    const center = xnew('<div class="absolute inset-0 flex items-center justify-center font-bold text-[6cqw] text-red-500" style="text-shadow:0 0 0.6cqw #fff;">');

    // 手番のプレイヤーは緑背景＋枠で強調、そうでない方は淡色にする。
    const paint = (box, label, score, active, mine) => {
        box.element.innerHTML = `${label}${mine ? '<span class="text-[2cqw]">（あなた）</span>' : ''}<br>${score} <span class="text-[2cqw]">/ ${WIN_SCORE}</span>`;
        box.element.style.background = active ? '#16a34a' : 'rgba(255,255,255,0.75)';
        box.element.style.color = active ? '#ffffff' : '#15803d';
        box.element.style.boxShadow = active ? '0 0 0 0.5cqw #bbf7d0' : 'none';
        box.element.style.opacity = active ? '1' : '0.8';
    };

    unit.on('+status', ({ phase, myNo, turn, score1, score2, winner }) => {
        const playing = phase === 'playing';
        paint(p1box, 'P1', score1, playing && turn === 1, myNo === 1);
        paint(p2box, 'P2', score2, playing && turn === 2, myNo === 2);
        if (phase === 'waiting') {
            center.element.textContent = '相手の参加を待っています…';
        } else if (phase === 'over') {
            const youWin = myNo !== 0 && myNo === winner;
            center.element.textContent = myNo === 0 ? `Player ${winner} の勝ち！` : (youWin ? 'あなたの勝ち！' : 'あなたの負け…');
        } else {
            center.element.textContent = '';
        }
    });
}

//----------------------------------------------------------------------------------------------------
// QueuePreview — プレイヤーごとの「次に落とすキャラ」1 体を 3D モデルで予告（tohoku_drop の Queue 相当）
//   P1 は左、P2 は右の上隅。キューが進む（= そのプレイヤーがドロップした）たびに、新しい予告キャラを
//   画面外から定位置へスライドインさせる。
//----------------------------------------------------------------------------------------------------

function QueuePreview(unit, { player }) {
    const targetX = player === 1 ? 58 : 742;            // 画面内の定位置
    const offX = player === 1 ? -140 : WIDTH + 140;     // スライド開始（画面外）
    const y = 175;
    const rotation = { x: (18 / 180) * Math.PI, y: ((player === 1 ? 40 : -40) / 180) * Math.PI, z: 0 };
    let key = '';
    let model = null;
    let anim = null;

    unit.on('+status', ({ phase, queue1, queue2 }) => {
        const queue = (player === 1 ? queue1 : queue2) || [];
        const playing = phase === 'playing' && queue.length > 0;
        const nextKey = playing ? JSON.stringify(queue) : '';   // キューが進んだときだけ作り直す
        if (nextKey === key) { return; }
        key = nextKey;
        anim?.clear();
        anim = null;
        model?.finalize();
        model = null;
        if (!playing) { return; }

        // 先頭の予告キャラを画面外から定位置へスライドインさせる。
        model = xnew(Model, { id: queue[0], position: convert3d(offX, y), rotation, scale: 0.5 });
        const target = model;
        anim = xnew.transition(({ value }) => {
            const p = convert3d(offX + (targetX - offX) * value, y);
            target.threeObject?.position.set(p.x, p.y, p.z);
        }, 400, 'ease-out');
    });
}

//----------------------------------------------------------------------------------------------------
// 見た目の部品（three / pixi）— tohoku_drop と同じ作り
//----------------------------------------------------------------------------------------------------

function Background(unit) {
    const object = xpixi.nest(new PIXI.Container());
    xnew.promise(PIXI.Assets.load('./background.jpg')).then((texture) => {
        const sprite = new PIXI.Sprite(texture);
        sprite.scale.set(xpixi.canvas.width / texture.frame.width, xpixi.canvas.height / texture.frame.height);
        object.addChild(sprite);
    });
}

function ThreeTexture(unit) {
    xpixi.nest(new PIXI.Sprite(PIXI.Texture.from(xthree.canvas)));
}

function BowlVisual(unit) {
    const object = xpixi.nest(new PIXI.Container());
    const graphics = new PIXI.Graphics();
    for (let a = 10; a <= 170; a++) {
        const x = BOWL.cx + Math.cos((a * Math.PI) / 180) * BOWL.rx;
        const y = BOWL.cy + Math.sin((a * Math.PI) / 180) * BOWL.ry;
        graphics.circle(x, y, BOWL.wall).fill(0x99AAAA);
    }
    object.addChild(graphics);
}

function DirectionalLight(unit, { x, y, z }) {
    const object = xthree.nest(new THREE.DirectionalLight(0xFFFFFF, 1.7));
    object.position.set(x, y, z);
    object.castShadow = true;
}

function AmbientLight(unit) {
    xthree.nest(new THREE.AmbientLight(0xFFFFFF, 1.2));
}

function ShadowPlane(unit) {
    const geometry = new THREE.PlaneGeometry(16, 14);
    const material = new THREE.ShadowMaterial({ opacity: 0.25 });
    const plane = xthree.nest(new THREE.Mesh(geometry, material));
    plane.receiveShadow = true;
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(0.0, -2.9, -2.0);
}

function Model(unit, { id = 0, position = null, rotation = null, scale }) {
    const object = xthree.nest(new THREE.Object3D());
    if (position) { object.position.set(position.x, position.y, position.z); }
    if (rotation) { object.rotation.set(rotation.x, rotation.y, rotation.z); }

    const list = ['zundamon.mog', 'usagi.mog', 'kiritan.mog', 'metan.mog', 'zunko.mog', 'sora.mog', 'itako.mog'];
    const path = '/assets/' + (id < 7 ? list[id] : list[0]);

    xnew.promise(voxelkit.load(path, { scale: 100 }))
        .then((composits) => voxelkit.convertVRM(composits[0]))
        .then((arrayBuffer) => new Promise((resolve) => {
            const loader = new GLTFLoader();
            loader.register((parser) => new VRMLoaderPlugin(parser));
            loader.parse(arrayBuffer.buffer, '', (gltf) => resolve(gltf));
        }))
        .then((gltf) => {
            const vrm = gltf.userData.vrm;
            vrm.scene.traverse((object) => {
                if (object.isMesh) { object.castShadow = object.receiveShadow = true; }
            });
            vrm.scene.position.y = -scale;
            vrm.scene.scale.set(scale, scale, scale);
            object.add(vrm.scene);

            const random = Math.random() * 10;
            let count = 0;
            unit.on('update', () => {
                const t = (count + random) * 0.03;
                const g = (name) => vrm.humanoid.getNormalizedBoneNode(name);
                g('neck').rotation.x = Math.sin(t * 6) * +0.1;
                g('chest').rotation.x = Math.sin(t * 12) * +0.1;
                g('hips').position.z = Math.sin(t * 12) * 0.1;
                g('leftUpperArm').rotation.z = Math.sin(t * 12 + random) * +0.7;
                g('leftUpperArm').rotation.x = Math.sin(t * 6 + random) * +0.8;
                g('rightUpperArm').rotation.z = Math.sin(t * 12) * -0.7;
                g('rightUpperArm').rotation.x = Math.sin(t * 6) * +0.8;
                g('leftUpperLeg').rotation.z = Math.sin(t * 8) * +0.2;
                g('leftUpperLeg').rotation.x = Math.sin(t * 12) * +0.7;
                g('rightUpperLeg').rotation.z = Math.sin(t * 8) * -0.2;
                g('rightUpperLeg').rotation.x = Math.sin(t * 12) * -0.7;
                vrm.update(t);
                count++;
            });
        });

    return { get id() { return id; } };
}

// 2D 盤面座標(0..WIDTH, 0..HEIGHT) → three のワールド座標へ変換
function convert3d(x, y, z = 0) {
    return { x: (x - WIDTH / 2) / 70, y: -(y - HEIGHT / 2) / 70, z };
}
