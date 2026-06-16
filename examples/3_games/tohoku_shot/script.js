import xnew from '@mulsense/xnew';
import xpixi from '@mulsense/xnew/addons/xpixi';
import xthree from '@mulsense/xnew/addons/xthree';
import * as PIXI from 'pixi.js';
import * as THREE from 'three';
import html2canvas from 'html2canvas-pro';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// id: 0=zundamon 1=kiritan 2=zunko 3=itako（ずんだ因子＝敵）
const ENEMY_FILES = ['zundamon.vrm', 'kiritan.vrm', 'zunko.vrm', 'itako.vrm'];
// 自機は中国うさぎ（体内の免疫システム）。後ろ向きに表示する。
const PLAYER_FILE = 'usagi.vrm';

// このサンプルのアセットは examples/assets/ 配下（importmap と同じ相対基準）。
const asset = (name) => `../../assets/${name}`;

// その wave で主役になる敵 id（wave1→0 … wave4 以降はイタコ=3 で頭打ち）。
const enemyIdForWave = (wave) => Math.min(wave - 1, ENEMY_FILES.length - 1);

// ベイク設定。フレーム数を減らすほど GPU 常駐テクスチャと起動時負荷が減る（その分コマが粗くなる）。
// 再生周期は 360 枚時代（60fps で約6秒/ループ）を保つよう BAKE_ANIMATION_SPEED で補正する。
const BAKE_FRAMES = 120;
const BAKE_ANIMATION_SPEED = BAKE_FRAMES / 360;
const BAKE_FRAME_SIZE = 96; // ベイク1フレームの解像度(px)

// 画面右端のイラスト用スペース幅(px)。ゲーム領域は x ∈ [0, PLAY_RIGHT]。
// HTML 側の 25cqw（= 200/800）と一致させること。
const PANEL_W = 200;
const PLAY_RIGHT = 800 - PANEL_W;

// 自機⇄敵の当たり判定半径。中心間距離 < PLAYER_HIT_R + ENEMY_HIT_R で被弾。
// それぞれの半径でうっすら円を描き、円が重なる＝被弾と分かるようにする。
const PLAYER_HIT_R = 14;
const ENEMY_HIT_R = 10;

// 各 wave のメインカラー（wave1:黄緑 / 2:明るいこげ茶 / 3:緑 / 4:白）。endless は最後の色。
const WAVE_COLORS = [0x9BE53C, 0xC8923C, 0x3FD96B, 0xFFFFFF];
const waveColor = (wave) => WAVE_COLORS[Math.min(wave - 1, WAVE_COLORS.length - 1)];
const cssHex = (n) => '#' + n.toString(16).padStart(6, '0');

// 敵 id ごとのサイバーな識別コード（ターゲット表示／警告画面の「謎文字」に使う）
const ENEMY_CODES = ['ZD-0x01', 'KT-0x02', 'ZK-0x03', 'IT-0x04'];
// ランダムな16進文字列（len 桁）。解析中っぽい流れる数字に使う。
const randHex = (len) => Math.floor(Math.random() * 16 ** len).toString(16).toUpperCase().padStart(len, '0');
// chars からランダムに n 文字。流れる解析ストリームの中身に使う。
const randStream = (chars, n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

// wave 色を初期適用し、以降 +wave で追従させる。apply は wave 番号を受け取り自前で色を引く（waveColor(1) === WAVE_COLORS[0]）。
const followWave = (unit, apply) => { apply(1); unit.on('+wave', ({ wave }) => apply(wave)); };

// ベイク済みテクスチャの AnimatedSprite を共通設定で生成（再生開始・scale は呼び出し側）。
const bakedSprite = (textures) => {
  const sprite = new PIXI.AnimatedSprite(textures);
  sprite.anchor.set(0.5);
  sprite.animationSpeed = BAKE_ANIMATION_SPEED;
  return sprite;
};

// 丸枠アイコン: 外周の円 + 中央70%に path 群。Camera / ArrowUturnLeft で共有。
function RingIcon(_unit, { paths }) {
  xnew('<div style="position: absolute; inset: 0; margin: auto; width: 100%; height: 100%;">', () => {
    xnew.extend(xnew.basics.SVG, { viewBox: '0 0 24 24', stroke: 'currentColor' });
    xnew('<circle cx="12" cy="12" r="11">');
  });
  xnew('<div style="position: absolute; inset: 0; margin: auto; width: 70%; height: 70%;">', () => {
    xnew.extend(xnew.basics.SVG, { viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 1.5 });
    for (const d of paths) xnew(`<path d="${d}">`);
  });
}

xnew(document.querySelector('#main'), Main);

function Main(unit) {
  const [width, height] = [800, 600];
  xnew.extend(xnew.basics.Screen, { width, height });

  xpixi.initialize({ canvas: unit.canvas });
  unit.on('render', () => xpixi.renderer.render(xpixi.scene));
  xnew(Contents);
}

function Contents(unit) {
  const assets = xnew(BakedCharacters);
  xnew.promise(assets).then(() => {
    xnew(TitleScene);
  });
}

// ---- Character baking (VRM -> AnimatedSprite textures) ----
//
// 焼き機（WebGL + EffectComposer + SSAO + ライト + カメラ）を1セットだけ作り、VRM を順に差し替えて
// 逐次ベイクする。キャラ毎に焼き機を立てて並列に焼く旧実装は GPU 圧迫の主因だった（DEVNOTES §5）。
// 逐次化でピーク GPU を VRM 1体分に抑える（起動は数百ms 長くなる）。

// VRM を読み込むだけ（シーンには追加しない）。GPU アップロードはベイク時まで遅延させる。
function loadVrm(url) {
  return new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load(url, (gltf) => {
      const vrm = gltf.userData.vrm;
      vrm.scene.scale.set(0.8, 0.8, 0.8);
      vrm.scene.position.y = -0.8;
      vrm.scene.position.z = -0.4;
      vrm.scene.rotation.x = +Math.PI * 20 / 180;
      resolve(vrm);
    });
  });
}

// 1フレームぶんのポーズを当てる。model = { vrm, threeObject }。spin=true: 回る敵 / false: 後ろ向き固定の自機。
// t は 1 周期 [0, 3π) を BAKE_FRAMES 等分。回転・ボーンの sin(t×偶数) は t=3π で開始位相へ戻りシームレスに
// ループする（回転/ボーン係数を変えるなら t=3π で元に戻るか要確認）。
function poseFrame(model, t, spin) {
  if (spin) {
    model.threeObject.rotation.y = t * 4 / 3;
    model.threeObject.rotation.z = t * 2 / 3;
  } else {
    model.threeObject.rotation.x = 60 * Math.PI / 180; // 後ろ向きから少し見下ろす角度に
    model.threeObject.rotation.y = Math.PI; // 後ろ向き固定（自機）
    model.threeObject.rotation.z = 0;
  }
  const g = (name) => model.vrm.humanoid.getNormalizedBoneNode(name);
  g('neck').rotation.x          = Math.sin(t * 8)  *  0.02;
  g('chest').rotation.x         = Math.sin(t * 12) *  0.05;
  g('hips').position.z          = Math.sin(t * 12) *  0.05;
  g('leftUpperArm').rotation.z  = Math.sin(t * 12) *  0.7;
  g('leftUpperArm').rotation.x  = Math.sin(t * 6)  *  0.8;
  g('rightUpperArm').rotation.z = Math.sin(t * 12) * -0.7;
  g('rightUpperArm').rotation.x = Math.sin(t * 6)  *  0.8;
  g('leftUpperLeg').rotation.z  = Math.sin(t * 8)  *  0.2;
  g('leftUpperLeg').rotation.x  = Math.sin(t * 12) *  0.7;
  g('rightUpperLeg').rotation.z = Math.sin(t * 8)  * -0.2;
  g('rightUpperLeg').rotation.x = Math.sin(t * 12) * -0.7;
  model.vrm.update(t);
}

function BakedCharacters(unit) {
  // --- 焼き機（共有部分）を1セットだけ構築する ---
  const camera = new THREE.OrthographicCamera(-1, +1, +1, -1, 0.1, 10);
  xthree.initialize({ camera, canvas: new OffscreenCanvas(BAKE_FRAME_SIZE, BAKE_FRAME_SIZE) });
  xthree.camera.position.set(0, -0.1, 2.5);

  const composer = new EffectComposer(xthree.renderer);
  composer.addPass(new RenderPass(xthree.scene, xthree.camera));
  const ssaoPass = new SSAOPass(xthree.scene, xthree.camera, xthree.canvas.width, xthree.canvas.height);
  // OrthographicCamera 用: シェーダーのデフォルト PERSPECTIVE_CAMERA=1 を両マテリアルで上書き
  for (const material of [ssaoPass.ssaoMaterial, ssaoPass.depthRenderMaterial]) {
    material.defines['PERSPECTIVE_CAMERA'] = 0;
    material.needsUpdate = true;
  }
  ssaoPass.kernelRadius = 0.15;   // サンプリング半径
  ssaoPass.minDistance = 0.001;   // 最小距離（linearized depth 0〜1 スケール）
  ssaoPass.maxDistance = 0.02;    // 最大距離
  composer.addPass(ssaoPass);
  composer.addPass(new OutputPass());

  // ライトは scene 直下に兄弟として並べる（nest だと2個目が前のオブジェクト配下に入れ子に
  // なってしまうため add を使う）。
  xthree.add(new THREE.AmbientLight(0xFFFFFF, 1.2));
  const dirLight = xthree.add(new THREE.DirectionalLight(0xFFFFFF, 1.7));
  dirLight.position.set(2, 5, 10);

  // 焼くジョブ: 敵4体（spin）→ 自機（固定）。
  const jobs = [
    ...ENEMY_FILES.map((file) => ({ url: asset(file), spin: true })),
    { url: asset(PLAYER_FILE), spin: false },
  ];

  // 全フレームを個別テクスチャにせず、1枚のアトラス canvas に敷き詰めて
  // 「キャラ1体 = GPU テクスチャ1枚」にする（source 共有でスプライトのバッチ描画も効く）。
  // フレーム i のアトラス内左上座標は paste と PIXI sub-texture 切り出しで共有する。
  const cols = Math.ceil(Math.sqrt(BAKE_FRAMES));
  const rows = Math.ceil(BAKE_FRAMES / cols);
  const framePos = (i) => [(i % cols) * BAKE_FRAME_SIZE, Math.floor(i / cols) * BAKE_FRAME_SIZE];

  // 各 VRM のロードを登録（解決値は下の then の vrms に入る）。
  jobs.forEach((job) => xnew.promise('vrms[]', loadVrm(job.url)));

  // 全 VRM ロード後に unit scope 内でベイク（xthree.add/remove が効く）。内部で xnew.promise を立て、全キャラ
  // 焼き終えたら resolve()。この完了は unit に畳まれ、Contents は焼き上がりまで待つ。
  xnew.promise(unit).then(({ vrms }) => {
    const { resolve } = xnew.promise();
    // VRM をマウントする回転リグ（scene 直下に1つだけ）。各キャラを付け外ししながら焼く。
    const wrapper = xthree.add(new THREE.Object3D());

    const BATCH = 20; // 1 render tick で焼くフレーム数（大きいほど早いが GPU スパイク大）
    let jobIndex = 0;
    let frameIndex = 0;
    let atlas = null;

    // 次キャラの焼成準備（VRM を wrapper にマウントし貼り込み先アトラスを用意）。全キャラ終了後は GPU を解放。
    function startJob() {
      if (jobIndex >= jobs.length) {
        // 後段パスを解放し、xthree.finalize で Root（renderer + WebGL コンテキスト）を畳む。
        composer.dispose();
        ssaoPass.dispose();
        xthree.finalize();
        resolve();
        return;
      }
      wrapper.add(vrms[jobIndex].scene);
      const atlasCanvas = document.createElement('canvas');
      [atlasCanvas.width, atlasCanvas.height] = [cols * BAKE_FRAME_SIZE, rows * BAKE_FRAME_SIZE];
      atlas = xnew.image.from(atlasCanvas);
      frameIndex = 0;
    }
    startJob();

    // 1台の焼き機で VRM を差し替えつつ render tick ごとに少しずつ焼く（ピーク GPU を 1体分に保つ）。
    unit.on('render', () => {
      if (jobIndex >= jobs.length) return;
      const job = jobs[jobIndex];
      const vrm = vrms[jobIndex];

      for (let f = frameIndex; f < Math.min(frameIndex + BATCH, BAKE_FRAMES); f++) {
        poseFrame({ vrm, threeObject: wrapper }, f * (Math.PI / BAKE_FRAMES * 3), job.spin);
        composer.render();
        // OffscreenCanvas は CanvasImageSource なので render 直後の canvas を直接貼り込む（中間 ImageBitmap なし）
        atlas.paste(xthree.canvas, ...framePos(f));
      }
      frameIndex += BATCH;
      if (frameIndex < BAKE_FRAMES) return;

      // アトラスを唯一の GPU テクスチャとし、各フレームは source 共有の sub-texture として切り出す
      const source = PIXI.Texture.from(atlas.canvas).source;
      job.textures = Array.from({ length: BAKE_FRAMES }, (_, f) => {
        const [x, y] = framePos(f);
        return new PIXI.Texture({ source, frame: new PIXI.Rectangle(x, y, BAKE_FRAME_SIZE, BAKE_FRAME_SIZE) });
      });

      // wrapper から外して GPU リソースを解放してから次へ（ピークを VRM 1体分に保つ）
      xthree.remove(vrm.scene);
      jobIndex++;
      startJob();
    });
  });

  return {
    get texturesList() { return jobs.slice(0, ENEMY_FILES.length).map((job) => job.textures); },
    get playerTextures() { return jobs[jobs.length - 1].textures; },
  };
}

// ---- Scenes ----

// skipStory: リザルトから戻ってきたときは true。ストーリーを飛ばして直接ゲームへ。
function TitleScene(unit, { skipStory = false } = {}) {
  xnew.extend(xnew.basics.Scene);

  xnew(Background);
  xnew(TitleCharacters); // 中央のうさぎ + 周囲で蠢く敵4キャラ（背景の上・HTMLテキストの下）

  xnew(TitleText);
  xnew(TouchMessage);
  xnew(VolumeControl);

  unit.on('pointerdown window.keydown.space', ({ event }) => {
    event.preventDefault();
    unit.change(skipStory ? GameScene : StoryScene);
  });
}

// タイトル画面の主役表示：中央に中国うさぎ（usagi03、下1/3は画面外）、その周囲で敵4キャラが蠢く。
function TitleCharacters(_unit) {
  const stage = xpixi.nest(new PIXI.Container());
  const tl = xnew.context(BakedCharacters).texturesList;

  // 周囲の敵4キャラ（id 0..3）。うさぎより先に追加して背面に置く。
  const spots = [
    { id: 1, x: 300, y: 360, s: 0.85 }, // 左上
    { id: 2, x: 500, y: 380, s: 0.90 }, // 右上
    { id: 0, x: 250, y: 490, s: 1.00 }, // 左
    { id: 3, x: 555, y: 475, s: 1.05 }, // 右
  ];
  for (const spot of spots) xnew(TitleFactor, { tl, ...spot });

  // 中央の中国うさぎ（下1/3が画面下に隠れるよう中心を下げる）
  xpixi.load(asset('usagi03.png')).then((texture) => {
    const usagi = new PIXI.Sprite(texture);
    usagi.anchor.set(0.5);
    const H = 456;                               // 表示する高さ(px)（元の 380 の約1.2倍）
    usagi.scale.set(H / texture.height);
    usagi.position.set(400, 600 - H / 6);        // 下1/3 (=H/3) が y=600 より下に出る
    stage.addChild(usagi);
  });
}

// タイトル用：定位置の周りで蠢く敵1体（ポップイン → 漂い + 拡縮ゆらぎ + 回転）。StoryFactor の定位置版。
function TitleFactor(unit, { tl, id, x, y, s }) {
  xpixi.nest(new PIXI.Container()); // 自前のコンテナを enclosing nest に積む（finalize で自動破棄＝後始末不要）
  const textures = tl[id];
  const sprite = bakedSprite(textures);
  sprite.gotoAndPlay(Math.floor(Math.random() * textures.length));
  sprite.position.set(x, y);
  sprite.scale.set(0);
  xpixi.add(sprite); // テクスチャは共有なので温存（xpixi の remove は children のみ破棄）

  const phx = Math.random() * Math.PI * 2, phy = Math.random() * Math.PI * 2;
  let pop = 0;
  unit.on('update', ({ count: t }) => {
    pop = Math.min(1, pop + 0.05);                       // ポップイン
    const squirm = 1 + Math.sin(t * 0.09 + phx) * 0.1;   // 蠢く拡縮
    sprite.scale.set(s * pop * squirm);
    sprite.x = x + Math.sin(t * 0.02 + phx) * 22;
    sprite.y = y + Math.sin(t * 0.025 + phy) * 18;
    sprite.rotation = Math.sin(t * 0.04 + phy) * 0.12;
  });
}

// ゲーム前の導入寸劇（2ページ）。タップで送り、最後のページからゲームへ。
//  1: 中国うさぎがずんだアローに被弾（コミカル）
//  2: 体内で増殖するずんだ因子（4キャラ）が蠢く
function StoryScene(unit) {
  xnew.extend(xnew.basics.Scene);

  xnew(Background);   // 体内背景を流用（タイトル/ゲームと連続感）
  xnew(CameraShake);  // 被弾時のシェイク演出用
  xnew(VolumeControl);
  xnew(StoryTheater); // 下部の黒帯（セリフはこの上に表示）。pages より先に作り、テキストの背面に置く

  const pages = [StoryPageHit, StoryPageSwarm];
  let index = 0;
  let page = xnew(pages[0]);

  let busy = false;
  const advance = () => {
    if (busy) return;
    busy = true;
    const next = index + 1;
    if (next >= pages.length) {
      unit.change(GameScene);
      return;
    }
    page.finalize();
    index = next;
    page = xnew(pages[index]);
    xnew.timeout(() => { busy = false; }, 300); // 連打での飛ばし過ぎを防ぐ
  };
  unit.on('pointerdown', advance);
  unit.on('window.keydown.space', ({ event }) => { event.preventDefault(); advance(); });
}

// 下部の黒帯（シアターモード風）。ストーリーのセリフはこの帯の上に載せて読ませる。
// 高さ 26cqw（≒208px）。上端は短いグラデでぼかし、細いピンクのアクセントラインを引く。
function StoryTheater(_unit) {
  xnew.nest('<div class="absolute inset-0 pointer-events-none">');
  // 帯の上にせり出すフェザー（境界をやわらかく、キャラの足元と馴染ませる）
  xnew('<div class="absolute left-0 right-0 bottom-[26cqw] h-[7cqw]" style="background: linear-gradient(to top, rgba(4,3,7,0.9), rgba(4,3,7,0));">');
  // 黒帯本体
  xnew('<div class="absolute left-0 right-0 bottom-0 h-[26cqw]" style="background: rgba(4,3,7,0.9);">');
  // CRT 走査線（サイバーな質感）
  xnew('<div class="absolute left-0 right-0 bottom-0 h-[26cqw]" style="background: repeating-linear-gradient(0deg, transparent 0 0.4cqw, rgba(0,0,0,0.22) 0.4cqw 0.8cqw);">');
  // 上端のアクセントライン（うっすら発光）
  xnew('<div class="absolute left-0 right-0 bottom-[26cqw] h-[0.28cqw]" style="background: linear-gradient(90deg, transparent, rgba(255,143,163,0.75) 18%, rgba(255,143,163,0.75) 82%, transparent); box-shadow: 0 0 1.4cqw rgba(255,143,163,0.55);">');
}

// ストーリーのセリフをサイバーな字幕フレームで表示する（黒帯の上に重ねる）。
// build でテキスト本文（SVGText 群）を構築。accent=アクセント色 / tag=見出しラベル / bottomCqw=下端位置。
// ヘッダー（点滅 ● ＋ ▶TAG ＋ 流れる hex ＋ 装飾ライン）／四隅ブラケット＋発光／流れる解析フッター を付与。
function StoryDialog(unit, { accent, tag, bottomCqw, build }) {
  xnew.nest(`<div class="absolute left-0 right-0 flex flex-col items-center pointer-events-none" style="bottom:${bottomCqw}cqw; font-family: monospace;">`);

  // ヘッダー: [線] ● ▶ TAG [線]
  let blink;
  xnew('<div class="flex items-center mb-[1cqw] font-bold tracking-[0.3em]" style="font-size:1.8cqw;">', () => {
    const lineL = xnew('<div class="mr-[1cqw]" style="width:6cqw; height:0.18cqw;">');
    lineL.element.style.background = `linear-gradient(90deg, transparent, ${accent})`;
    blink = xnew('<div class="mr-[0.8cqw]">', '●');
    const lbl = xnew('<div class="mr-[1cqw]">', `▶ ${tag}`);
    const lineR = xnew('<div style="width:6cqw; height:0.18cqw;">');
    lineR.element.style.background = `linear-gradient(90deg, ${accent}, transparent)`;
    for (const e of [blink, lbl]) e.element.style.color = accent;
  });

  // 本文（四隅ブラケットで囲む。drop-shadow でうっすら発光）
  const wrap = xnew('<div class="relative px-[4cqw] py-[0.6cqw] text-center font-bold leading-tight" style="color:#ffffff;">', () => {
    build();
  });
  wrap.element.style.filter = `drop-shadow(0 0 0.7cqw ${accent}88)`;
  for (const [pos, css] of [
    ['top-0 left-0', 'border-top:0.25cqw solid; border-left:0.25cqw solid;'],
    ['top-0 right-0', 'border-top:0.25cqw solid; border-right:0.25cqw solid;'],
    ['bottom-0 left-0', 'border-bottom:0.25cqw solid; border-left:0.25cqw solid;'],
    ['bottom-0 right-0', 'border-bottom:0.25cqw solid; border-right:0.25cqw solid;'],
  ]) {
    const b = xnew(`<div class="absolute ${pos} w-[2.2cqw] h-[2.2cqw]" style="${css} opacity:0.85;">`);
    b.element.style.color = accent; // border は currentColor
  }

  // ● の点滅のみ（読みやすさ優先で、流れる謎文字は出さない）
  unit.on('update', ({ count: t }) => {
    blink.element.style.opacity = Math.floor(t / 16) % 2 ? '1' : '0.2';
  });
}

// ページ1: 中国うさぎがずんだアローに被弾する寸劇
function StoryPageHit(unit) {
  const CX = 400, CY = 215;          // 中国うさぎの中心（黒帯の上・画面中央寄りに配置）
  const impactX = CX, impactY = CY - 30; // 矢の着弾点（体の中央やや上）
  const stage = xpixi.nest(new PIXI.Container());

  // 着弾フラッシュ（シェイクで端が抜けないよう広め）
  const flashG = new PIXI.Graphics().rect(-40, -40, 880, 680).fill(0xFFFFFF);
  flashG.alpha = 0;

  let usagi = null, arrow = null;
  const usagiUrl = asset('usagi03.png'), arrowUrl = asset('zunda_arrow.png');
  xnew.promise(PIXI.Assets.load([usagiUrl, arrowUrl])).then((loaded) => {
    usagi = new PIXI.Sprite(loaded[usagiUrl]);
    usagi.anchor.set(0.5);
    usagi.scale.set(340 / usagi.texture.height); // やや大きめに
    usagi.position.set(CX, CY);

    arrow = new PIXI.Sprite(loaded[arrowUrl]);
    arrow.anchor.set(0.86, 0.5); // 先端（ずんだ玉）側を基準に
    arrow.scale.set(200 / arrow.texture.width);
    arrow.position.set(-220, impactY);

    stage.addChild(usagi, arrow, flashG);
  });

  // セリフ（黒帯の中・サイバー字幕）。被弾の驚きをコミカルに。補足は着弾後にフェードイン。
  let sub;
  xnew(StoryDialog, { accent: '#FF8FA3', tag: 'ALERT', bottomCqw: 4.5, build: () => {
    xnew('<div style="color:#FF8FA3;">', () => { xnew(xnew.basics.SVGText, { text: 'ずんだアローに当たってしまった！', fontSize: '5.2cqw', stroke: '#0a1830', strokeWidth: '0.25cqw', className: 'inline-block' }); });
    sub = xnew('<div class="mt-[0.6cqw]" style="color:#FCEFA0; opacity:0;">', () => {
      xnew(xnew.basics.SVGText, { text: '（ずんだアローに当たると、ずんだ餅にされてしまう…）', fontSize: '2.5cqw', stroke: '#0a1830', strokeWidth: '0.2cqw', className: 'inline-block' });
    });
  } });

  const FLY = 40; // 飛来フレーム数（約0.7秒）
  let frame = 0, impacted = false, hitT = 0;
  unit.on('update', () => {
    if (arrow === null) return;
    if (!impacted) {
      frame++;
      const p = Math.min(1, frame / FLY);
      const e = p * p; // 加速して突き刺さる
      arrow.x = -220 + (impactX + 220) * e;
      if (p >= 1) {
        impacted = true;
        xnew.emit('+shake', { amount: 0.7 });
        xnew(HitBurst, { x: impactX + 28, y: impactY, power: 2.4 });
        flashG.alpha = 0.85;
        xnew.transition(({ value }) => { sub.element.style.opacity = `${value}`; }, 500, 'ease');
      }
    } else {
      hitT++;
      flashG.alpha = Math.max(0, flashG.alpha - 0.08);
      const damp = Math.exp(-hitT * 0.05);     // 揺れの減衰
      const wob = Math.sin(hitT * 0.8) * damp;
      usagi.rotation = wob * 0.16;              // ぷるぷる
      usagi.x = CX + wob * 9;
      arrow.x = impactX + wob * 9;              // 刺さったまま一緒に揺れる
      arrow.rotation = wob * 0.08;
    }
  });
}

// ページ2: 体内で増殖するずんだ因子（4キャラ）が蠢く様子
function StoryPageSwarm(_unit) {
  xpixi.nest(new PIXI.Container());
  const tl = xnew.context(BakedCharacters).texturesList;

  // 少しずつ湧いて増えていく（増殖感）
  let n = 0;
  const MAX = 12;
  const adder = xnew.interval(() => {
    xnew(StoryFactor, { tl });
    if (++n >= MAX) adder.clear();
  }, 200);

  xnew(StoryDialog, { accent: '#9BE53C', tag: 'MISSION', bottomCqw: 5, build: () => {
    xnew('<div class="mb-[0.6cqw]">', () => { xnew(xnew.basics.SVGText, { text: '体内の免疫キャラを操作し、', fontSize: '4cqw', stroke: '#0a1830', strokeWidth: '0.22cqw', className: 'inline-block' }); });
    xnew('<div style="color:#9BE53C;">', () => { xnew(xnew.basics.SVGText, { text: 'ずんだ因子の増殖を食い止めろ！', fontSize: '4.4cqw', stroke: '#0a1830', strokeWidth: '0.25cqw', className: 'inline-block' }); });
  } });
}

// 蠢くずんだ因子1体（ポップイン → 漂い + 拡縮ゆらぎ）
function StoryFactor(unit, { tl }) {
  xpixi.nest(new PIXI.Container()); // 自前のコンテナ（finalize で自動破棄＝後始末不要）
  const id = Math.floor(Math.random() * tl.length);
  const textures = tl[id];
  const sprite = bakedSprite(textures);
  sprite.gotoAndPlay(Math.floor(Math.random() * textures.length));

  const baseScale = 0.5 + Math.random() * 0.5;
  const bx = 90 + Math.random() * 620;  // 黒帯より上（テキスト帯に被らない領域）に散らす
  const by = 90 + Math.random() * 270;
  sprite.position.set(bx, by);
  sprite.scale.set(0);
  xpixi.add(sprite); // テクスチャ共有のため温存（xpixi の remove は children のみ破棄）

  const phx = Math.random() * Math.PI * 2, phy = Math.random() * Math.PI * 2;
  const sx = 0.5 + Math.random(), sy = 0.5 + Math.random();
  let pop = 0;
  unit.on('update', ({ count: t }) => {
    pop = Math.min(1, pop + 0.08);                       // ポップイン
    const squirm = 1 + Math.sin(t * 0.12 + phx) * 0.08;  // 蠢く拡縮
    sprite.scale.set(baseScale * pop * squirm);
    sprite.x = bx + Math.sin(t * 0.03 * sx + phx) * 16;
    sprite.y = by + Math.sin(t * 0.035 * sy + phy) * 14;
    sprite.rotation = Math.sin(t * 0.05 + phy) * 0.12;
  });
}

function GameScene(unit) {
  xnew.extend(xnew.basics.Scene);

  xnew(Background);
  xnew(CameraShake);
  xnew(SoundFX);
  xnew(SidePanel);
  xnew(Controller);
  const scoreManager = xnew(ScoreManager);
  const waveManager = xnew(WaveManager);
  xnew(ScoreGauge);
  xnew(ShotEnergy);
  xnew(Player);
  xnew(VolumeControl);

  const bgm = xnew(() => {
    xnew.audio.load(asset('maou_bgm_cyber31.mp3')).then((music) => music.play({ fade: 1000, loop: true }));
  });

  unit.on('+gameover', () => {
    unit.off('+gameover');
    bgm.finalize(); // ゲームオーバーで BGM 停止
    const score = scoreManager.score;
    const wave = waveManager.wave;
    const kills = [...scoreManager.kills];
    // 最終 wave(4) のゲージを 100% 到達済みなら「クリア」扱い（wave4 は次へ進まないので waveScore で判定）
    const cleared = wave >= WAVE_GOALS.length && scoreManager.waveScore >= WAVE_GOALS[WAVE_GOALS.length - 1];
    const image = xpixi.renderer.extract.base64({ target: xpixi.scene, frame: new PIXI.Rectangle(0, 0, xpixi.canvas.width, xpixi.canvas.height) });
    xnew(GameOverText);
    xnew.timeout(() => unit.change(ResultScene, { image, score, wave, kills, cleared }), 2000);
  });
}

function ResultScene(unit, { image, score, wave, kills, cleared }) {
  xnew.extend(xnew.basics.Scene);

  xnew.audio.load(asset('st005.mp3')).then((music) => music.play({ fade: 1, loop: true }));

  // popup
  xnew.nest(`<div class="absolute inset-0 size-full">`);
  xnew.transition(({ value }) => {
    Object.assign(unit.element.style, { opacity: value, transform: `scale(${0.8 + value * 0.2})` });
  }, 500, 'ease');

  xnew(ResultBackground);
  xnew(ResultImage, { image });
  xnew(ResultDetail, { score, wave, kills, cleared });
  xnew(ResultFooter);

  // スペースキーでもタイトルへ戻る（戻った先はストーリーを飛ばす）
  unit.on('window.keydown.space', ({ event }) => { event.preventDefault(); unit.change(TitleScene, { skipStory: true }); });
}

// ---- Wave system ----

// wave1..4 の「その wave 内」で稼ぐ目標スコア（index = wave-1）。各 wave は 0 から貯め、
// waveScore がこの値に達すると次 wave へ。wave4 はゲージは満タンになるが次へは進まない（エンドレス）。
const WAVE_GOALS = [1024, 2048, 3072, 4096];

function WaveManager(unit) {
  let wave = 0;
  let transitioning = false;

  function startWave(n) {
    wave = n;
    xnew.emit('+wave', { wave });
  }

  function nextWave() {
    transitioning = true;
    const next = wave + 1;
    // 現在の画面内の敵を一旦フェードアウト（得点は入らない）
    for (const enemy of xnew.find(Enemy)) enemy.fadeOut();
    // 警告 → 次 wave への切替表示
    xnew.context(xnew.basics.Scene).add(WaveTransition, { wave: next });
    xnew.timeout(() => { startWave(next); transitioning = false; }, 2800);
  }

  // wave 1 も警告画面（WaveTransition）を出してから開始する（初回も同じ導入演出にする）。
  // wave は即 1 にする（0 のままだと ScoreGauge のしきい値計算が NaN になり恒久的に壊れる）。
  // 敵の湧きは transitioning フラグで演出が終わるまで止める。
  startWave(1);
  transitioning = true;
  xnew.context(xnew.basics.Scene).add(WaveTransition, { wave: 1 });
  xnew.timeout(() => { transitioning = false; }, 2800);

  let tick = 0;
  const spawn = xnew.interval(() => {
    if (transitioning) return;
    // その wave の目標スコアに達したら次の wave へ（wave4 は到達してもエンドレスで移行しない）
    if (wave < 4 && xnew.context(ScoreManager).waveScore >= WAVE_GOALS[wave - 1]) {
      nextWave();
      return;
    }
    tick++;

    const scene = xnew.context(xnew.basics.Scene);
    // 自動出現はその wave のキャラ1種のみ。下位キャラは被弾時の分裂で登場する。
    const id = enemyIdForWave(wave);
    if (id === 0) {
      // wave1 は分裂しないので多めに出す
      scene.add(Enemy, { id: 0 });
      if (tick % 2 === 0) scene.add(Enemy, { id: 0 });
    } else {
      // 高い wave ほど分裂で増えるのでスポーン間隔を空ける
      if (tick % (id + 1) === 0) scene.add(Enemy, { id });
    }
  }, 200);

  unit.on('+gameover', () => spawn.clear());

  return { get wave() { return wave; } };
}

// wave 切替時のサイバーな警告画面（プレイ領域）。HUDフレーム + グリッチした WAVE 表示 +
// 流れる謎文字（hex）+ 脅威解析バー で「敵を検知して解析している」感を出す。
function WaveTransition(unit, { wave }) {
  const color = cssHex(waveColor(wave));
  const code = ENEMY_CODES[enemyIdForWave(wave)];
  xnew.nest('<div class="absolute left-0 right-[25cqw] top-0 bottom-0 overflow-hidden pointer-events-none" style="font-family: monospace;">');
  unit.element.style.color = color; // 文字はすべて wave 色を継承

  // 暗幕 + 色フラッシュ + 走査線オーバーレイ
  const flash = xnew('<div class="absolute inset-0">');
  flash.element.style.background = color;
  xnew('<div class="absolute inset-0" style="background: rgba(2,4,8,0.4);">');
  xnew('<div class="absolute inset-0" style="background: repeating-linear-gradient(0deg, transparent 0 0.35cqw, rgba(0,0,0,0.28) 0.35cqw 0.7cqw);">');

  // 斜めの警告ストライプ（上下）
  const stripe = `repeating-linear-gradient(45deg, ${color} 0, ${color} 1cqw, transparent 1cqw, transparent 2.2cqw)`;
  for (const edge of ['top-0', 'bottom-0']) {
    const s = xnew(`<div class="absolute ${edge} left-0 right-0 h-[2.4cqw]" style="opacity:0.45;">`);
    s.element.style.background = stripe;
  }

  // HUD コーナーブラケット（四隅）
  const corners = [
    ['top-[2cqw] left-[2cqw]', 'border-top:0.4cqw solid; border-left:0.4cqw solid;'],
    ['top-[2cqw] right-[2cqw]', 'border-top:0.4cqw solid; border-right:0.4cqw solid;'],
    ['bottom-[2cqw] left-[2cqw]', 'border-bottom:0.4cqw solid; border-left:0.4cqw solid;'],
    ['bottom-[2cqw] right-[2cqw]', 'border-bottom:0.4cqw solid; border-right:0.4cqw solid;'],
  ];
  for (const [pos, border] of corners) {
    xnew(`<div class="absolute ${pos} w-[5cqw] h-[5cqw]" style="${border} opacity:0.8;">`);
  }

  // 縦に流れる走査ライン
  const scan = xnew('<div class="absolute left-0 right-0 h-[0.35cqw]" style="top:0;">');
  scan.element.style.background = color;
  scan.element.style.boxShadow = `0 0 1.6cqw ${color}`;

  // 上部の謎文字（左：システムアラート / 右：流れる hex）
  xnew('<div class="absolute left-[3.5cqw] top-[5.5cqw] text-[1.9cqw] tracking-[0.3em] font-bold">', '▚ SYSTEM ALERT ▚');
  const hexTop = xnew('<div class="absolute right-[3.5cqw] top-[5.8cqw] text-[1.5cqw] tracking-[0.2em]" style="opacity:0.7;">', '');

  // 中央：WARNING（点滅）+ WAVE N（グリッチ）+ 脅威情報
  let warn, label;
  xnew('<div class="absolute inset-0 flex flex-col items-center justify-center text-center">', () => {
    warn = xnew('<div class="text-[5.5cqw] font-bold tracking-[0.4em]">', '⚠ WARNING ⚠');
    label = xnew('<div class="text-[13cqw] font-bold leading-none">', `WAVE ${wave}`);
    xnew('<div class="text-[2.2cqw] tracking-[0.25em] mt-[1.2cqw]" style="opacity:0.9;">', `THREAT Lv.${wave}　ENTITY ${code}`);
  });

  // 下部：脅威解析バー + 流れる hex
  let pctEl, bar, streamEl;
  xnew('<div class="absolute left-[3.5cqw] right-[3.5cqw] bottom-[5cqw]">', () => {
    xnew('<div class="flex justify-between text-[1.5cqw] tracking-[0.2em] mb-[0.5cqw]" style="opacity:0.9;">', () => {
      xnew('<div>', '▶ ANALYZING THREAT');
      pctEl = xnew('<div>', '0%');
    });
    xnew('<div class="relative w-full h-[1.5cqw]" style="border:0.15cqw solid; box-shadow:0 0 1cqw currentColor;">', () => {
      bar = xnew('<div class="absolute inset-y-0 left-0" style="width:0%;">');
      bar.element.style.background = color;
    });
    streamEl = xnew('<div class="text-[1.2cqw] mt-[0.6cqw] tracking-[0.15em] whitespace-nowrap overflow-hidden" style="opacity:0.6;">', '');
  });

  const streamChars = '0123456789ABCDEF<>/\\|=+*#░▒▓';
  const VISIBLE = 126; // フェード前のおおよそのフレーム数（解析バーをこの間にちょうど満たす）
  unit.on('update', ({ count: t }) => {
    flash.element.style.opacity = `${(Math.sin(t * 0.08) * 0.5 + 0.5) * 0.1 + 0.03}`; // ゆったり明滅
    warn.element.style.opacity = `${Math.floor(t / 18) % 2 ? 1 : 0.25}`;

    // WAVE N グリッチ：たまに横ズレ + 色収差シャドウ
    const jump = Math.random() < 0.12 ? (Math.random() * 2 - 1) * 0.7 : 0;
    label.element.style.transform = `translateX(${jump}cqw)`;
    label.element.style.textShadow = `0 0 2cqw ${color}, ${0.25 + jump}cqw 0 rgba(255,40,90,0.55), ${-0.25}cqw 0 rgba(40,200,255,0.55)`;

    // 縦走査ライン（上→下を繰り返す）
    scan.element.style.top = `${(t * 1.1) % 100}%`;

    // 流れる謎文字
    if (t % 4 === 0) {
      hexTop.element.textContent = Array.from({ length: 6 }, () => randHex(2)).join(' ');
    }
    if (t % 2 === 0) {
      streamEl.element.textContent = '> ' + randStream(streamChars, 40);
    }

    // 脅威解析バー（0→100% を VISIBLE フレームで満たす）
    const p = Math.min(1, t / VISIBLE);
    bar.element.style.width = `${p * 100}%`;
    pctEl.element.textContent = `${Math.round(p * 100)}%`;
  });

  xnew.transition(({ value }) => { unit.element.style.opacity = value; }, 450);
  xnew.timeout(() => {
    xnew.transition(({ value }) => { unit.element.style.opacity = 1 - value; }, 450).timeout(() => unit.finalize());
  }, 2100);
}

// 右パネル上部の "Wave N" 表示（wave のメインカラーに追従）
function WaveLabel(unit) {
  xnew.nest('<div class="absolute top-[1.5cqw] right-0 w-[25cqw] text-center font-bold text-lime-400">');
  const text = xnew(xnew.basics.SVGText, { text: 'Wave 1', fontSize: '6cqw', stroke: '#102008', strokeWidth: '0.2cqw', className: 'inline-block' });
  followWave(unit, (wave) => {
    text.element.textContent = `Wave ${wave}`;
    unit.element.style.color = cssHex(waveColor(wave)); // SVGText の fill=currentColor が追従
  });
}

// 次の wave までの進捗を示す「解析メーター」（画面左上）。色は wave のメインカラー。
function ScoreGauge(unit) {
  xnew.nest('<div class="absolute top-[2cqw] left-[2cqw] right-[44cqw]" style="font-family: monospace;">');

  let labelEl, pctEl, fill, frame;
  // 見出し行（ラベル + パーセント）
  xnew('<div class="flex justify-between items-end mb-[0.4cqw] text-[1.5cqw] tracking-[0.2em]">', () => {
    labelEl = xnew('<div>', 'ANALYSIS');
    pctEl = xnew('<div>', '0%');
  });
  // メーター本体（セグメント風）
  frame = xnew('<div class="relative w-full h-[2.4cqw] bg-black/50" style="border: 0.2cqw solid; overflow: hidden;">', () => {
    fill = xnew('<div class="absolute inset-y-0 left-0" style="width: 0%;">');
    // セグメントの隙間を上に重ねてブロック分割に見せる
    xnew('<div class="absolute inset-0" style="background: repeating-linear-gradient(90deg, transparent 0 1.4cqw, rgba(0,0,0,0.6) 1.4cqw 1.8cqw);">');
    // 走査ハイライト（うっすら左右に動く）
    fill.scan = xnew('<div class="absolute inset-y-0 w-[3cqw]" style="left:0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);">');
  });

  function applyColor(c) {
    fill.element.style.background = c;
    frame.element.style.borderColor = c;
    labelEl.element.style.color = c;
    pctEl.element.style.color = c;
  }
  followWave(unit, (wave) => applyColor(cssHex(waveColor(wave))));

  let shown = 0;
  unit.on('update', ({ count: t }) => {
    const wave = xnew.context(WaveManager).wave;
    const waveScore = xnew.context(ScoreManager).waveScore;

    // その wave の目標スコアに対する達成率（0..1）。wave4 以降も同様に貯まり、満タンで頭打ち。
    const goal = WAVE_GOALS[Math.min(Math.max(wave, 1), WAVE_GOALS.length) - 1];
    const target = wave < 1 ? 0 : Math.max(0, Math.min(1, waveScore / goal));

    if (!Number.isFinite(shown)) shown = 0; // NaN に陥っても自己回復する保険
    shown += (target - shown) * 0.15; // イージング（wave 切替時に滑らかにリセット）
    fill.element.style.width = `${shown * 100}%`;
    pctEl.element.textContent = `${Math.round(shown * 100)}%`;
    fill.scan.element.style.left = `${(Math.sin(t * 0.04) * 0.5 + 0.5) * Math.max(0, shown * 100 - 3)}%`;
  });
}

// ---- Game Components ----

// 右端のイラストパネル。上=Wave / 中=駆逐対象(ターゲット表示) / 下=中国うさぎ（敵数で表情切替）
function SidePanel(_unit) {
  xnew(PanelBackdrop);     // pixi: 半透明パネル背景 + 区切り線
  xnew(WaveEnemyDisplay);  // pixi: その wave で登場する敵キャラ
  xnew(TargetReticle);     // pixi: 敵キャラを囲うターゲットレティクル
  xnew(WaveLabel);         // html: 上部の "Wave N"
  xnew(TargetInfo);        // html: "TARGET" + サイバーなパラメータ
  xnew(UsagiFace);         // html: 下部のうさぎ（敵数で表情クロスフェード）
}

// 半透明（約50%）のパネル背景 + 区切り線（区切り線は wave のメインカラーに追従）
function PanelBackdrop(unit) {
  const container = xpixi.nest(new PIXI.Container());
  container.addChild(new PIXI.Graphics().rect(PLAY_RIGHT, 0, PANEL_W, 600).fill({ color: 0x05121A, alpha: 0.5 }));

  const divider = new PIXI.Graphics();
  container.addChild(divider);
  const drawDivider = (color) => {
    divider.clear();
    divider.moveTo(PLAY_RIGHT, 0).lineTo(PLAY_RIGHT, 600).stroke({ color, width: 2, alpha: 0.55 });
  };
  followWave(unit, (wave) => drawDivider(waveColor(wave)));
}

// その wave で登場する敵キャラを表示（wave1:ずんだもん 2:きりたん 3:ずん子 4:イタコ）
const TARGET_Y = 148; // ターゲット表示(敵キャラ+レティクル)の中心 y

function WaveEnemyDisplay(unit) {
  const container = xpixi.nest(new PIXI.Container({ position: { x: PLAY_RIGHT + PANEL_W / 2, y: TARGET_Y } }));
  const tl = xnew.context(BakedCharacters).texturesList;
  let current = null;

  unit.on('+wave', ({ wave }) => {
    const id = enemyIdForWave(wave); // wave4 以降はイタコ固定
    const sprite = bakedSprite(tl[id]);
    sprite.scale.set(0.82);
    sprite.play();
    sprite.alpha = 0;
    container.addChild(sprite);

    const old = current;
    current = sprite;
    xnew.transition(({ value }) => {
      sprite.alpha = value;
      if (old) old.alpha = 1 - value;
    }, 400).timeout(() => { if (old) container.removeChild(old); });
  });
}

// 敵キャラを囲うサイバーなターゲットレティクル。色は wave 連動。
// 多重リング（逆回転）+ 回転するレーダー掃引 + 呼吸するロックオンブラケット +
// 周回する解析ブリップ で「ロックして解析している」感を出す。
function TargetReticle(unit) {
  const container = xpixi.nest(new PIXI.Container({ position: { x: PLAY_RIGHT + PANEL_W / 2, y: TARGET_Y } }));
  const R = 46;

  // 独立回転させる層（container の子に直接 rotation を持たせる）
  const outer = new PIXI.Container();   // 外周リング（CW）
  const mid = new PIXI.Container();     // 中アーク（CCW）
  const sweepC = new PIXI.Container();  // レーダー掃引（速い CW）
  const blips = new PIXI.Container();   // 周回ブリップ
  const brackets = new PIXI.Graphics(); // ロックオンブラケット（呼吸）
  const cross = new PIXI.Graphics();
  const outerG = new PIXI.Graphics(); outer.addChild(outerG);
  const midG = new PIXI.Graphics(); mid.addChild(midG);
  const sweepG = new PIXI.Graphics(); sweepC.addChild(sweepG);
  container.addChild(sweepC, outer, mid, cross, brackets, blips);

  // 周回ブリップ（ランダムな半径/角速度）
  const dots = [];
  for (let i = 0; i < 6; i++) {
    const g = new PIXI.Graphics();
    blips.addChild(g);
    dots.push({ g, radius: 24 + Math.random() * 26, ang: Math.random() * Math.PI * 2, spd: (0.01 + Math.random() * 0.03) * (Math.random() < 0.5 ? 1 : -1), size: 1.1 + Math.random() * 1.4 });
  }

  let color = WAVE_COLORS[0];

  function draw(c) {
    color = c;

    // 外周リング + 目盛り（15°刻み、45°ごとに長い）
    outerG.clear();
    outerG.circle(0, 0, R).stroke({ color: c, width: 1.5, alpha: 0.5 });
    for (let a = 0; a < 360; a += 15) {
      const rad = a * Math.PI / 180;
      const long = a % 45 === 0;
      outerG.moveTo(Math.cos(rad) * (R - (long ? 7 : 4)), Math.sin(rad) * (R - (long ? 7 : 4)))
            .lineTo(Math.cos(rad) * (R + 2), Math.sin(rad) * (R + 2));
    }
    outerG.stroke({ color: c, width: 1, alpha: 0.45 });

    // 中アーク（4本の90°弧に隙間）+ 内側の細い円
    midG.clear();
    const rM = 36;
    for (let k = 0; k < 4; k++) {
      const a0 = k * Math.PI / 2 + 0.2, a1 = (k + 1) * Math.PI / 2 - 0.2;
      midG.moveTo(Math.cos(a0) * rM, Math.sin(a0) * rM).arc(0, 0, rM, a0, a1); // moveTo で弧同士をつなぐ弦を防ぐ
    }
    midG.stroke({ color: c, width: 2, alpha: 0.8 });
    midG.circle(0, 0, 27).stroke({ color: c, width: 1, alpha: 0.3 });

    // レーダー掃引（先端へ向かって濃くなる扇）
    sweepG.clear();
    const SEG = 16, SPAN = 1.0;
    for (let i = 0; i < SEG; i++) {
      const a0 = -(i / SEG) * SPAN, a1 = -((i + 1) / SEG) * SPAN;
      sweepG.moveTo(0, 0).lineTo(Math.cos(a0) * R, Math.sin(a0) * R).lineTo(Math.cos(a1) * R, Math.sin(a1) * R).lineTo(0, 0)
            .fill({ color: c, alpha: (1 - i / SEG) * 0.16 });
    }
    sweepG.moveTo(0, 0).lineTo(R, 0).stroke({ color: c, width: 1.5, alpha: 0.7 }); // 先端ライン

    // クロスヘア + 中心点
    cross.clear();
    cross.moveTo(-R - 5, 0).lineTo(-R + 11, 0).moveTo(R - 11, 0).lineTo(R + 5, 0)
         .moveTo(0, -R - 5).lineTo(0, -R + 11).moveTo(0, R - 11).lineTo(0, R + 5)
         .stroke({ color: c, width: 1, alpha: 0.45 });
    cross.circle(0, 0, 2).fill({ color: c, alpha: 0.85 });

    // ブリップの点を原点に描いておく（位置は update で動かす）
    for (const d of dots) {
      d.g.clear();
      d.g.circle(0, 0, d.size).fill({ color: c, alpha: 0.85 });
    }
  }

  followWave(unit, (wave) => draw(waveColor(wave)));

  unit.on('update', ({ count: t }) => {
    outer.rotation += 0.006;
    mid.rotation -= 0.014;
    sweepC.rotation = t * 0.05;

    // ロックオンブラケット：呼吸（拡縮）+ うっすら明滅
    const breathe = 40 * (1 + Math.sin(t * 0.06) * 0.06);
    const len = 13;
    brackets.clear();
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      brackets.moveTo(sx * breathe - sx * len, sy * breathe).lineTo(sx * breathe, sy * breathe).lineTo(sx * breathe, sy * breathe - sy * len);
    }
    brackets.stroke({ color, width: 2, alpha: 0.7 + 0.25 * Math.sin(t * 0.1) });

    // 周回ブリップ
    for (const d of dots) {
      d.ang += d.spd;
      d.g.position.set(Math.cos(d.ang) * d.radius, Math.sin(d.ang) * d.radius);
      d.g.alpha = 0.4 + 0.5 * Math.abs(Math.sin(t * 0.08 + d.ang));
    }
  });
}

// レティクル周辺に「解析中っぽい」謎文字をごちゃごちゃ表示する HUD。色は wave 連動。
// ヘッダー / 四隅の座標ラベル / 円の左右を流れる hex レール / 下部の解析リードアウト。
function TargetInfo(unit) {
  xnew.nest('<div class="absolute right-0 top-0 bottom-0 w-[25cqw] pointer-events-none" style="font-family: monospace; color:#9BE53C;">');

  // ヘッダー
  xnew('<div class="absolute w-full text-center text-[2cqw] tracking-[0.35em] font-bold" style="top: 8cqw;">', '◤ TARGET ◢');

  // レティクル四隅の微小ラベル（座標・ロック状態っぽい謎文字）
  const cTL = xnew('<div class="absolute text-[1.15cqw]" style="top: 11.5cqw; left: 2cqw; opacity:0.65;">', 'LAT +00.0');
  const cTR = xnew('<div class="absolute text-[1.15cqw] text-right" style="top: 11.5cqw; right: 2cqw; opacity:0.65;">', 'LON +00.0');
  const cBL = xnew('<div class="absolute text-[1.15cqw]" style="top: 23cqw; left: 2cqw; opacity:0.65;">', 'LOCK ▮');
  const cBR = xnew('<div class="absolute text-[1.15cqw] text-right" style="top: 23cqw; right: 2cqw; opacity:0.65;">', '0x0000');

  // 円の左右を縦に流れる hex レール（解析ダンプ）
  const leftRail = [];
  xnew('<div class="absolute flex flex-col gap-[0.25cqw] text-[1.1cqw] leading-none" style="top: 14cqw; left: 1.4cqw; opacity:0.5;">', () => {
    for (let i = 0; i < 6; i++) leftRail.push(xnew('<div>', randHex(2)));
  });
  const rightRail = [];
  xnew('<div class="absolute flex flex-col items-end gap-[0.25cqw] text-[1.1cqw] leading-none" style="top: 14cqw; right: 1.4cqw; opacity:0.5;">', () => {
    for (let i = 0; i < 6; i++) rightRail.push(xnew('<div>', '··'));
  });

  // 下部の解析リードアウト（自機の上に薄い暗幕を敷いて読ませる）
  let idLine, syncBar, syncPct, stream;
  xnew('<div class="absolute left-[1.5cqw] right-[1.5cqw] flex flex-col items-center leading-tight gap-[0.3cqw] py-[0.6cqw] rounded-[0.6cqw]" style="top: 25cqw; background: rgba(2,8,4,0.4);">', () => {
    idLine = xnew('<div class="text-[1.6cqw]">', 'ID ZD-0x01 ▮');
    xnew('<div class="flex items-center gap-[0.5cqw] text-[1.4cqw]">', () => {
      xnew('<div style="opacity:0.7;">', 'SYNC');
      syncBar = xnew('<div>', '▰▰▰▱▱');
      syncPct = xnew('<div>', '60%');
    });
    stream = xnew('<div class="text-[1.2cqw] tracking-[0.1em]" style="opacity:0.7;">', '> 8A F2 1C 04');
  });

  function applyWave(wave) {
    const id = enemyIdForWave(wave);
    idLine.element.textContent = `ID ${ENEMY_CODES[id]} ${'▮'.repeat(id + 1)}`;
    unit.element.style.color = cssHex(waveColor(wave)); // 全テキストが継承
  }
  followWave(unit, applyWave);

  const streamChars = '0123456789ABCDEF<>/\\|=+*░▒▓';
  const rightTokens = ['OK', '!!', 'ACK', '▮▮', '·▮·', 'SYN'];
  unit.on('update', ({ count: t }) => {
    // hex レールを数フレームごとに1行スクロール（流れる解析ダンプ）
    if (t % 5 === 0) {
      for (let i = 0; i < leftRail.length - 1; i++) leftRail[i].element.textContent = leftRail[i + 1].element.textContent;
      leftRail[leftRail.length - 1].element.textContent = randHex(2);
      for (let i = 0; i < rightRail.length - 1; i++) rightRail[i].element.textContent = rightRail[i + 1].element.textContent;
      rightRail[rightRail.length - 1].element.textContent = Math.random() < 0.5 ? `${Math.floor(Math.random() * 100)}%` : rightTokens[Math.floor(Math.random() * rightTokens.length)];
    }

    // 四隅ラベル
    cTL.element.textContent = 'LAT ' + (Math.sin(t * 0.03) * 45).toFixed(1).padStart(5, '+');
    cTR.element.textContent = 'LON ' + (Math.cos(t * 0.027) * 90).toFixed(1).padStart(5, '+');
    cBL.element.textContent = 'LOCK ' + (Math.floor(t / 15) % 2 ? '▮' : '▯');
    cBR.element.textContent = '0x' + randHex(4);

    // SYNC バー
    const s = Math.floor((Math.sin(t * 0.05) * 0.5 + 0.5) * 5);
    syncBar.element.textContent = '▰'.repeat(s) + '▱'.repeat(5 - s);
    syncPct.element.textContent = `${Math.floor((Math.sin(t * 0.05) * 0.5 + 0.5) * 99)}%`;

    // データストリーム
    if (t % 3 === 0) {
      stream.element.textContent = '> ' + randStream(streamChars, 9);
    }
  });
}

// パネル下部の中国うさぎ。画面内の敵数に応じて表情をクロスフェードで切り替える。
// （pixi スプライトで描画＝リザルトのキャプチャにも含まれる）
function UsagiFace(unit) {
  const container = xpixi.nest(new PIXI.Container({ position: { x: PLAY_RIGHT + PANEL_W / 2, y: 596 } }));
  const urls = [0, 1, 2].map((i) => asset(`usagi0${i}.png`));

  let back = null, front = null, current = 0;

  xnew.promise(PIXI.Assets.load(urls)).then((loaded) => {
    const textures = urls.map((u) => loaded[u]);
    const fit = (s, t) => {
      s.texture = t;
      s.anchor.set(0.5, 1.0); // 下端中央
      s.scale.set(Math.min((PANEL_W * 1.12) / t.width, 380 / t.height));
    };
    back = new PIXI.Sprite(); fit(back, textures[0]);
    front = new PIXI.Sprite(); fit(front, textures[0]);
    container.addChild(back, front);

    // 0:余裕(〜20) 1:普通(〜40) 2:焦り(40〜)
    unit.on('update', () => {
      const count = xnew.find(Enemy).length;
      const idx = count <= 30 ? 0 : (count <= 60 ? 1 : 2);
      if (idx === current) return;

      fit(back, textures[current]); back.alpha = 1;
      fit(front, textures[idx]); front.alpha = 0;
      current = idx;
      xnew.transition(({ value }) => { front.alpha = value; }, 400, 'ease');
    });
  });
}

// 背景: zunda_background.png をやや暗めに加工 + 浮遊粒子（パララックス） + 薄い鼓動
function Background(_unit) {
  xnew(BackgroundBase);
  for (let i = 0; i < 80; i++) xnew(Mote);
  xnew(PulseGlow);
}

function BackgroundBase(_unit) {
  const container = xpixi.nest(new PIXI.Container());

  // 下地（カメラシェイクで端が露出しても黒く抜けないよう少し広めに）
  container.addChild(new PIXI.Graphics().rect(-40, -40, 880, 680).fill(0x0A0306));

  xnew.promise(PIXI.Assets.load(asset('zunda_background.png'))).then((texture) => {
    const sprite = new PIXI.Sprite(texture);
    sprite.scale.set(800 / texture.width, 600 / texture.height); // canvas にフィット
    container.addChild(sprite);

    // やや暗め＆コントラスト緩和の暗幕 + 周辺減光を一枚のテクスチャに
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(8, 4, 10, 0.42)'; // 全体を暗くしてコントラストを抑える
    ctx.fillRect(0, 0, 800, 600);

    const vignette = ctx.createRadialGradient(400, 300, 210, 400, 300, 540);
    vignette.addColorStop(0.0, 'rgba(0, 0, 0, 0.0)');
    vignette.addColorStop(1.0, 'rgba(0, 0, 0, 0.55)'); // 周辺減光で視線を中央へ
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, 800, 600);

    container.addChild(new PIXI.Sprite(PIXI.Texture.from(canvas)));
  });
}

// 奥行きのある浮遊粒子。下方向ドリフトで前進感、奥ほど小さく遅く暗い。
function Mote(unit) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(Math.random() * 800, Math.random() * 600);

  const depth = Math.random(); // 0:奥 〜 1:手前
  const size = 1 + depth * 4;
  const baseAlpha = 0.08 + depth * 0.22;
  const color = [0xFF6E8A, 0xFFA7B6, 0xE8506A, 0xFFC0CB][Math.floor(Math.random() * 4)];
  object.addChild(new PIXI.Graphics().circle(0, 0, size).fill(color));

  const vy = 0.2 + depth * 0.9;
  const vx = (Math.random() - 0.5) * 0.3;
  let phase = Math.random() * Math.PI * 2;

  unit.on('update', () => {
    object.x += vx;
    object.y += vy;
    phase += 0.03;
    object.alpha = baseAlpha * (0.6 + 0.4 * Math.sin(phase)); // またたき

    if (object.y > 610) { object.y = -10; object.x = Math.random() * 800; }
    if (object.x < -10) object.x = 810;
    if (object.x > 810) object.x = -10;
  });
}

// ごく薄い鼓動グロー（体内感を残す）
function PulseGlow(unit) {
  const g = xpixi.nest(new PIXI.Graphics().rect(0, 0, 800, 600).fill(0xFF1733));
  unit.on('update', ({ count: tick }) => {
    g.alpha = (Math.max(0, Math.sin(tick * 0.05)) ** 8) * 0.06;
  });
}

function Controller(unit) {
  unit.on('touchstart contextmenu wheel window.keydown', (e) => e.event?.preventDefault());

  xnew(() => {
    xnew.nest('<div class="absolute left-0 right-0 bottom-0 w-full h-[30%] pointer-events-none" style="container-type: size;">');
    xnew.nest('<div class="absolute left-0 top-0 bottom-0 w-[100cqh] h-full">');
    const dpad = xnew('<div class="absolute inset-[5cqh]">', xnew.basics.DPad, {});
    dpad.on('-down -move -up', ({ vector }) => xnew.emit('+move', { vector }));
    dpad.on('pointerdown', ({ event }) => event.stopPropagation());
  });

  unit.on('pointerdown', () => xnew.emit('+shot'));
  unit.on('window.keydown.arrow window.keyup.arrow window.keydown.wasd window.keyup.wasd', ({ vector }) => xnew.emit('+move', { vector }));
  unit.on('window.keydown.space', () => xnew.emit('+shot'));
}

function ScoreManager(unit) {
  // 画面右上にスコアをコンピュータの解析表示風（等幅・ゼロ埋め）で表示。色は wave 連動。
  xnew.nest('<div class="absolute top-[1.6cqw] right-[26cqw] text-right" style="font-family: monospace;">');
  const label = xnew('<div class="text-[1.5cqw] tracking-[0.3em]">', 'SCORE');
  const text = xnew('<div class="text-[4.2cqw] leading-none font-bold">', '000000');

  function applyColor(c) {
    label.element.style.color = c;
    text.element.style.color = c;
    text.element.style.textShadow = `0 0 0.8cqw ${c}, 0 0.1cqw 0.1cqw rgba(0,0,0,0.6)`;
  }
  let sum = 0;        // 合計スコア（リザルト表示用）
  let waveScore = 0;  // 現在の wave 内で稼いだスコア（wave 開始ごとに 0 リセット）
  const kills = [0, 0, 0, 0]; // 敵 id 別の撃破数

  followWave(unit, (wave) => applyColor(cssHex(waveColor(wave))));
  unit.on('+wave', () => { waveScore = 0; }); // wave 開始ごとに wave 内スコアをリセット

  return {
    get score() { return sum; },
    get waveScore() { return waveScore; },
    get kills() { return kills; },
    add(score, id) {
      sum += score;
      waveScore += score;
      if (id !== undefined) kills[id]++;
      text.element.textContent = String(sum).padStart(6, '0');
    }
  };
}

function GameOverText(unit) {
  xnew.nest('<div class="absolute left-0 right-[25cqw] text-center text-red-400 font-bold">');
  xnew(xnew.basics.SVGText, { text: 'Game Over', fontSize: '12cqw', stroke: '#EEEEEE', strokeWidth: '0.2cqw', className: 'inline-block' });
  xnew.transition(({ value }) => {
    Object.assign(unit.element.style, { opacity: value, top: `${10 + value * 15}cqw` });
  }, 1000, 'ease');
}

function Player(unit) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(PLAY_RIGHT / 2, 500);

  // 自機＝中国うさぎ（後ろ向きベイク）
  const sprite = bakedSprite(xnew.context(BakedCharacters).playerTextures);
  sprite.scale.set(0.7);
  sprite.play();
  object.addChild(sprite);

  // 当たり判定を可視化する円（キャラの上に重ねて表示）
  const hitRing = new PIXI.Graphics()
    .circle(0, 0, PLAYER_HIT_R).fill({ color: 0x33FFFF, alpha: 0.18 })
    .circle(0, 0, PLAYER_HIT_R).stroke({ color: 0x33FFFF, width: 2.5, alpha: 0.9 });
  object.addChild(hitRing);

  let alive = true;
  let velocity = { x: 0, y: 0 };
  unit.on('+move', ({ vector }) => velocity = vector);
  unit.on('+shot', () => {
    if (!alive) return;
    if (!xnew.context(ShotEnergy).tryConsume()) return; // エネルギー不足なら撃てない
    xnew.context(xnew.basics.Scene).add(Shot, { x: object.x, y: object.y });
    xnew.context(SoundFX).shot();
  });
  unit.on('+gameover', () => {
    if (!alive) return;
    alive = false;
    sprite.visible = false; // 自機を消して
    hitRing.visible = false;
    xnew.context(xnew.basics.Scene).add(PlayerExplosion, { x: object.x, y: object.y }); // 爆発
  });

  unit.on('update', ({ count }) => {
    if (!alive) return;
    object.x = Math.min(Math.max(object.x + velocity.x * 3, 30), PLAY_RIGHT - 30);
    object.y = Math.min(Math.max(object.y + velocity.y * 3, 30), 570);

    hitRing.alpha = 0.7 + 0.3 * Math.sin(count * 0.1); // うっすら明滅

    for (const enemy of xnew.find(Enemy)) {
      if (enemy.isVulnerable && enemy.distance(object) < PLAYER_HIT_R + ENEMY_HIT_R) {
        xnew.emit('+gameover');
        return;
      }
    }
  });
}

// 星のテクスチャ（白）を一度だけ生成してキャッシュする。
// 「くっきりした不透明の星」＋「少しのブラーをかけた淡いグロー」で、形がはっきり読めてコントラストの高い見た目に
// （以前の加算合成オンリーは形が滲んで分かりにくかった）。各星は同一テクスチャ + tint の Sprite なのでバッチ描画が効く。
const STAR_TEX_R = 13; // テクスチャ内の星の基準半径。スケールは wantR / STAR_TEX_R。
let _starTexture = null;
function starTexture() {
  if (_starTexture === null) {
    const c = new PIXI.Container();
    // 下：少しブラーをかけた淡いグロー
    const glow = new PIXI.Graphics().star(0, 0, 5, STAR_TEX_R * 1.2, STAR_TEX_R * 0.55).fill({ color: 0xFFFFFF, alpha: 0.55 });
    glow.filters = [new PIXI.BlurFilter({ strength: 4 })];
    // 上：くっきりした不透明の星（元のデザインと同じ 5 角・内半径 0.45）＋ コントラスト用の縁取り
    const body = new PIXI.Graphics()
      .star(0, 0, 5, STAR_TEX_R, STAR_TEX_R * 0.45).fill({ color: 0xFFFFFF })
      .star(0, 0, 5, STAR_TEX_R, STAR_TEX_R * 0.45).stroke({ color: 0x3A2A12, width: 1.5 });
    c.addChild(glow, body);
    _starTexture = xpixi.renderer.generateTexture({ target: c, resolution: 2, antialias: true });
    c.destroy();
  }
  return _starTexture;
}
// 星スプライト（tint で色付け、通常合成で形をくっきり出す）。共有テクスチャなので破棄時に texture を消さないこと。
function starSprite(color) {
  const s = new PIXI.Sprite(starTexture());
  s.anchor.set(0.5);
  s.tint = color;
  return s;
}

function Shot(unit, { x, y }) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(x, y);

  const color = 0x66FFFF;
  const baseR = 18;

  // くっきりした星（回転 + 脈動）
  const star = starSprite(color);
  object.addChild(star);

  unit.on('update', ({ count: t }) => {
    object.y -= 8;
    star.rotation += 0.15;
    star.scale.set((baseR / STAR_TEX_R) * (1 + Math.sin(t * 0.6) * 0.12)); // キラッと脈動

    if (object.y < 0) { unit.finalize(); return; }

    for (const enemy of xnew.find(Enemy)) {
      if (enemy.distance(object) < 30) {
        enemy.clash(ENEMY_DATA[enemy.id].score, { x: 0, y: -1 }); // ショットは上方向
        unit.finalize();
        return;
      }
    }
  });

  return { get pixiObject() { return object; } };
}

// ---- Enemy system ----

// splitTo: 被弾時に分裂するキャラのid（nullなら分裂しない）
const ENEMY_DATA = [
  { score: 1,  splitTo: null },
  { score: 2,  splitTo: 0   },
  { score: 4,  splitTo: 1   },
  { score: 8,  splitTo: 2   },
];

function Enemy(unit, { id, x, y, invincible = false, knockback = null }) {
  const object = xpixi.nest(new PIXI.Container());
  // 自動出現は画面上部 20%（y ∈ [20,120]）のエリアに湧く。分裂はその場（x,y 指定）に出す。
  object.position.set(x ?? (20 + Math.random() * (PLAY_RIGHT - 40)), y ?? (20 + Math.random() * 100));

  // ベイクテクスチャでスプライト表示
  const tl = xnew.context(BakedCharacters).texturesList;
  const sprite = bakedSprite(tl[id]);
  sprite.scale.set(0); // スケール0から pop-in（下の update で 0→1 に拡大）
  sprite.play();
  sprite.currentFrame = Math.floor(Math.random() * tl[id].length);
  object.addChild(sprite);

  // 当たり判定を可視化する円（キャラの上に重ねる・スケール変動の影響を受けない object 直下）
  const hitRing = new PIXI.Graphics()
    .circle(0, 0, ENEMY_HIT_R).fill({ color: 0xFF3355, alpha: 0.2 })
    .circle(0, 0, ENEMY_HIT_R).stroke({ color: 0xFF3355, width: 2, alpha: 0.85 });
  object.addChild(hitRing);

  // 出現時の pop-in（0→1 に拡大）＋ スケールの時間変動（生きている＝蠢く感じ）。
  // どちらもストーリー2ページ目の StoryFactor と同じ手法。
  const squirmPhase = Math.random() * Math.PI * 2;
  let pop = 0;

  // 無敵時間（分裂直後は半透明）
  let vulnerable = !invincible;
  if (invincible) {
    object.alpha = 0.5;
    xnew.timeout(() => { vulnerable = true; object.alpha = 1.0; }, 500);
  }

  // ランダムな速度（下向き成分を持つ）
  const speed = 0.7 + Math.random() * 1.4;
  const angle = Math.PI * (0.25 + Math.random() * 0.5); // 45~135度（下向き）
  const vel = { x: Math.cos(angle) * speed * (Math.random() < 0.5 ? 1 : -1), y: Math.sin(angle) * speed };

  // 被弾時のノックバック（着弾点から弾け、徐々に減速）
  const kb = { x: knockback?.x ?? 0, y: knockback?.y ?? 0 };

  let fading = false; // wave 切替で退場中（得点・当たり判定なし）

  unit.on('update', ({ count }) => {
    // pop-in（0→1）× y座標に応じた遠近感 × 時間で蠢く拡縮
    pop = Math.min(1, pop + 0.08);
    const squirm = 1 + Math.sin(count * 0.12 + squirmPhase) * 0.08;
    sprite.scale.set((0.4 + id * 0.2 + object.y * 0.0008) * squirm * pop);

    if (object.x < 15)             vel.x =  Math.abs(vel.x);
    if (object.x > PLAY_RIGHT - 15) vel.x = -Math.abs(vel.x);
    if (object.y < 15)  vel.y =  Math.abs(vel.y);
    if (object.y > 585) vel.y = -Math.abs(vel.y);
    object.position.set(object.x + vel.x + kb.x, object.y + vel.y + kb.y);
    kb.x *= 0.82;
    kb.y *= 0.82;
  });

  return {
    get id() { return id; },
    get isVulnerable() { return vulnerable && !fading; },

    distance(target) {
      const dx = target.x - object.x;
      const dy = target.y - object.y;
      return Math.sqrt(dx * dx + dy * dy);
    },

    // wave 切替時：得点を入れずにフェードアウトして退場
    fadeOut() {
      if (fading) return;
      fading = true;
      vulnerable = false;
      xnew.transition(({ value }) => { object.alpha = 1 - value; }, 500).timeout(() => unit.finalize());
    },

    // direction: 当たった方向の単位ベクトル（弾の進行方向）。fromStar: 星チェーン由来か。
    clash(score, direction = { x: 0, y: -1 }, fromStar = false) {
      if (fading) return; // 退場中は得点なし
      if (fromStar && !vulnerable) return; // 星チェーンは無敵中スキップ

      const data = ENEMY_DATA[id];
      const scene = xnew.context(xnew.basics.Scene);
      const baseAngle = Math.atan2(direction.y, direction.x); // 当たった方向

      // 撃破エフェクト：衝撃バースト + 撃破音。カメラシェイクは自機ショット命中時のみ。
      scene.add(HitBurst, { x: object.x, y: object.y, power: 1 + id * 0.5 });
      xnew.context(SoundFX).defeat(id);
      if (!fromStar) xnew.emit('+shake', { amount: 0.16 + id * 0.13 });

      // 倒された敵自身：半透明に薄れながら当たった方向へノックバックして消える
      scene.add(EnemyCorpse, {
        id, x: object.x, y: object.y, scale: sprite.scale.x, frame: sprite.currentFrame,
        direction, power: 6 + id * 1.5,
      });

      // 分裂（ノックバック方向を軸に小さくランダム微変動して弾ける）
      if (data.splitTo !== null) {
        for (let i = 0; i < 2; i++) {
          const dir = baseAngle + (Math.random() - 0.5) * 0.6;
          const power = 7 + id * 2;
          scene.add(Enemy, {
            id: data.splitTo, x: object.x, y: object.y, invincible: true,
            knockback: { x: Math.cos(dir) * power, y: Math.sin(dir) * power },
          });
        }
      }
      // 星（チェーンショット）— 当たった方向へ扇状に、敵が大きいほど多く
      const starCount = 3 + id;
      for (let i = 0; i < starCount; i++) {
        const angle = baseAngle + (Math.random() - 0.5) * 1.4;
        scene.add(Star, { x: object.x, y: object.y, score, angle });
      }
      scene.add(ScorePopup, { x: object.x, y: object.y, score });
      xnew.context(ScoreManager).add(score, id);
      unit.finalize();
    },
  };
}

function Star(unit, { x, y, score, angle = Math.random() * Math.PI * 2 }) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(x, y);

  const baseR = (9 + Math.random() * 7) * 1.5;
  const color = [0xFFF066, 0xFFD700, 0xFFA53C, 0xFFFFFF, 0xFF8FD0, 0x9BE5FF][Math.floor(Math.random() * 6)];
  const star = starSprite(color);
  object.addChild(star);

  const speed = 2 + Math.random() * 3;
  let vx = Math.cos(angle) * speed;
  let vy = Math.sin(angle) * speed;
  const spin = (Math.random() < 0.5 ? 1 : -1) * (0.12 + Math.random() * 0.2);

  xnew.timeout(() => unit.finalize(), 900);

  unit.on('update', ({ count }) => {
    object.x += vx;
    object.y += vy;
    const p = count / 60;
    star.rotation += spin;
    object.alpha = 1 - p;
    const twinkle = 1 + Math.sin(count * 0.5) * 0.22;          // キラキラ点滅
    star.scale.set((baseR / STAR_TEX_R) * (1 - p * 0.35) * twinkle); // 縮みながら瞬く

    // 別の敵に当たると得点倍増（星の進行方向にノックバック/分裂）
    for (const enemy of xnew.find(Enemy)) {
      if (enemy.isVulnerable && enemy.distance(object) < 28) {
        const len = Math.hypot(vx, vy) || 1;
        enemy.clash(score + 2, { x: vx / len, y: vy / len }, true);
        unit.finalize();
        return;
      }
    }
  });
}

function ScorePopup(unit, { x, y, score }) {
  const object = xpixi.nest(new PIXI.Text({ text: `+${score}`, style: { fontSize: 22, fill: 0xFFFF44, fontWeight: 'bold' } }));
  object.position.set(x, y);
  object.anchor.set(0.5);

  xnew.timeout(() => unit.finalize(), 900);
  unit.on('update', ({ count }) => {
    object.y = y - 40 * (count / 60);
    object.alpha = 1 - count / 60;
  });
}

// 倒された敵のノックバック表現：薄れながら当たった方向へ飛んで消える
function EnemyCorpse(unit, { id, x, y, scale, frame = 0, direction, power }) {
  const object = xpixi.nest(new PIXI.Container({ position: { x, y } }));

  const tl = xnew.context(BakedCharacters).texturesList;
  const sprite = bakedSprite(tl[id]); // コープスは再生せず1フレーム固定
  sprite.scale.set(scale);
  sprite.currentFrame = Math.min(frame, tl[id].length - 1);
  object.addChild(sprite);

  const angle = Math.atan2(direction.y, direction.x);
  let vx = Math.cos(angle) * power;
  let vy = Math.sin(angle) * power;
  const spin = (Math.random() - 0.5) * 0.3;

  const DURATION = 26;
  unit.on('update', ({ count }) => {
    object.x += vx;
    object.y += vy;
    vx *= 0.86;
    vy *= 0.86;
    object.rotation += spin;
    object.alpha = Math.max(0, 1 - count / DURATION); // 半透明に薄れる
    if (count >= DURATION - 1) unit.finalize();
  });
}

// 自機被弾時の爆発エフェクト：白フラッシュ + 広がるリング + 飛び散る破片
function PlayerExplosion(unit, { x, y }) {
  const container = xpixi.nest(new PIXI.Container({ position: { x, y } }));

  const flash = new PIXI.Graphics().circle(0, 0, 30).fill({ color: 0xFFFFFF, alpha: 1 });
  const ring = new PIXI.Graphics().circle(0, 0, 18).stroke({ color: 0x66E0FF, width: 6, alpha: 1 });
  container.addChild(flash, ring);

  const palette = [0x9CF0FF, 0xFFFFFF, 0x66E0FF, 0xCFFBFF];
  const shards = [];
  for (let i = 0; i < 18; i++) {
    const g = new PIXI.Graphics().circle(0, 0, 3 + Math.random() * 4).fill(palette[Math.floor(Math.random() * palette.length)]);
    container.addChild(g);
    const a = Math.random() * Math.PI * 2;
    const sp = 3 + Math.random() * 6;
    shards.push({ g, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp });
  }

  const DURATION = 36;
  unit.on('update', ({ count }) => {
    const p = count / DURATION;
    flash.scale.set(1 + p * 1.5);
    flash.alpha = Math.max(0, 1 - p * 2);
    ring.scale.set(1 + p * 3.5);
    ring.alpha = Math.max(0, 1 - p);
    for (const s of shards) {
      s.g.x += s.vx;
      s.g.y += s.vy;
      s.vx *= 0.92;
      s.vy = s.vy * 0.92 + 0.15; // 減速 + 重力
      s.g.alpha = Math.max(0, 1 - p);
    }
    if (count >= DURATION - 1) unit.finalize();
  });
}

// 撃破時の衝撃エフェクト：白フラッシュ + 広がるシアンのリング
function HitBurst(unit, { x, y, power = 1 }) {
  const container = xpixi.nest(new PIXI.Container({ position: { x, y } }));

  const flash = new PIXI.Graphics().circle(0, 0, 16 * power).fill({ color: 0xFFFFFF, alpha: 0.9 });
  const ring = new PIXI.Graphics().circle(0, 0, 10 * power).stroke({ color: 0x66E0FF, width: 4, alpha: 0.9 });
  container.addChild(flash, ring);

  const DURATION = 16;
  unit.on('update', ({ count }) => {
    const p = count / DURATION;
    flash.scale.set(1 + p * 0.6);
    flash.alpha = 0.9 * (1 - p);
    ring.scale.set(1 + p * 2.4);
    ring.alpha = 0.9 * (1 - p);
    if (count >= DURATION - 1) unit.finalize();
  });
}

// カメラシェイク：トラウマ値を撃破時に加算し、二乗で減衰しながら scene を揺らす
function CameraShake(unit) {
  let trauma = 0;
  unit.on('+shake', ({ amount = 0.3 }) => { trauma = Math.min(1, trauma + amount); });
  unit.on('update', () => {
    if (trauma > 0) {
      const shake = trauma * trauma;
      const max = 14;
      xpixi.scene.position.set((Math.random() * 2 - 1) * max * shake, (Math.random() * 2 - 1) * max * shake);
      trauma = Math.max(0, trauma - 0.06);
    } else if (xpixi.scene.x !== 0 || xpixi.scene.y !== 0) {
      xpixi.scene.position.set(0, 0);
    }
  });
  unit.on('finalize', () => xpixi.scene.position.set(0, 0));
}

// ショットエネルギー：連射を抑制（満タンから2発、約2.4秒で全回復）。右下にサイバーな表示。
function ShotEnergy(unit) {
  const MAX = 100;
  const COST = 50;            // 1発の消費（満タンから約2発）
  const RECOVER = MAX / 144;  // 1フレームあたり（60fps で約2.4秒に全回復）。色はショットと同じ #22FFFF
  let energy = MAX;

  xnew.nest('<div class="absolute bottom-[2.5cqw] right-[27cqw] w-[24cqw] pointer-events-none" style="font-family: monospace;">');

  // ラベル行（SHOT ENERGY + ステータス）
  let statusEl;
  xnew('<div class="flex justify-between items-end text-[1.4cqw] tracking-[0.2em] mb-[0.3cqw]" style="color:#22FFFF; text-shadow:0 0 0.5cqw rgba(34,255,255,0.6);">', () => {
    xnew('<div>', '◣ SHOT ENERGY');
    statusEl = xnew('<div class="text-[1.3cqw]">', 'READY');
  });

  // メーター本体（枠＋グロー＋セグメント＋走査＋目盛り）
  let fill, scan;
  xnew('<div class="relative w-full h-[2cqw] bg-black/55" style="outline:0.15cqw solid #22FFFF; box-shadow:0 0 1.2cqw rgba(34,255,255,0.45), inset 0 0 0.6cqw rgba(34,255,255,0.25);">', () => {
    fill = xnew('<div class="absolute inset-y-0 left-0" style="width:100%; background:linear-gradient(180deg,#bdffff,#22FFFF 55%,#0aacac);">');
    scan = xnew('<div class="absolute inset-y-0 w-[2cqw]" style="left:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.75),transparent);">');
    xnew('<div class="absolute inset-0" style="background:repeating-linear-gradient(90deg, transparent 0 2cqw, rgba(0,0,0,0.6) 2cqw 2.5cqw);">'); // セグメント隙間
    xnew('<div class="absolute top-0 left-0 right-0 h-[0.4cqw]" style="background:repeating-linear-gradient(90deg, #22FFFF 0 0.15cqw, transparent 0.15cqw 1cqw); opacity:0.5;">'); // 上辺の目盛り
  });

  unit.on('update', ({ count: t }) => {
    energy = Math.min(MAX, energy + RECOVER);
    const pct = energy / MAX;
    const ready = energy >= COST;

    fill.element.style.width = `${pct * 100}%`;
    fill.element.style.opacity = ready ? '1' : '0.45';
    scan.element.style.left = `${(Math.sin(t * 0.05) * 0.5 + 0.5) * Math.max(0, pct * 100 - 8)}%`; // 充填内を走査
    statusEl.element.textContent = ready ? 'READY' : 'CHARGE';
    statusEl.element.style.color = ready ? '#22FFFF' : '#ff5577';
    statusEl.element.style.opacity = ready ? '1' : `${Math.floor(t / 12) % 2 ? 1 : 0.3}`; // CHARGE 中は点滅
  });

  return {
    tryConsume() {
      if (energy < COST) return false;
      energy -= COST;
      return true;
    },
  };
}

// 効果音：ショット音と撃破音（ピン、というピアノ風のシンセ音）
function SoundFX(_unit) {
  // ショット：高めで少し下がるピッ
  const shotSynth = xnew.audio.synthesizer({
    oscillator: { type: 'triangle', envelope: { amount: -7, ADSR: [0, 90, 0, 0] } },
    filter: { type: 'lowpass', cutoff: 3500 },
    amp: { envelope: { amount: 0.3, ADSR: [0, 110, 0, 0] } },
  });
  // 撃破：ピン（ピアノ風の余韻のある短い音）。敵 id ごとに音程を変える。
  const pinSynth = xnew.audio.synthesizer({
    oscillator: { type: 'triangle' },
    filter: { type: 'lowpass', cutoff: 5000 },
    amp: { envelope: { amount: 0.8, ADSR: [2, 350, 0, 0] } },
    reverb: { time: 1000, mix: 0.25 },
  });
  const pinNotes = ['C5', 'E5', 'G5', 'C6'];

  let lastShot = 0;
  let lastDefeat = 0;
  return {
    shot() {
      const now = Date.now();
      if (now - lastShot < 60) return;
      lastShot = now;
      shotSynth.press('A5', 60);
    },
    defeat(id) {
      const now = Date.now();
      if (now - lastDefeat < 35) return; // 連鎖の音被りを軽減
      lastDefeat = now;
      pinSynth.press(pinNotes[Math.min(id, pinNotes.length - 1)], 200);
    },
  };
}

// ---- Result screen ----

function ResultBackground(unit) {
  xnew.nest(`<div class="relative size-full bg-linear-to-br from-slate-900 to-blue-950">`);
  xnew('<div class="absolute top-0 left-[4cqw] text-[14cqw] text-blue-800">', 'Result');

  // ランダム配置した白丸を sin で明滅させる。transform は種類ごとに変える（浮遊 / きらめき）。
  function floatingCircle(sizeCqw, transform) {
    const [x, y] = [Math.random() * 100, Math.random() * 100];
    const circle = xnew(`<div class="absolute rounded-full bg-white" style="width: ${sizeCqw}cqw; height: ${sizeCqw}cqw; left: ${x}%; top: ${y}%; opacity: 0.2;">`);
    circle.on('update', ({ count }) => {
      const p = count * 0.02;
      Object.assign(circle.element.style, { opacity: Math.sin(p) * 0.1 + 0.2, transform: transform(p) });
    });
  }

  for (let i = 0; i < 20; i++) floatingCircle(Math.random() * 2 + 2, (p) => `translateY(${Math.sin(p) * 20}px)`);
  for (let i = 0; i < 30; i++) floatingCircle(1, (p) => `scale(${1 + Math.sin(p) * 0.1})`);
}

function ResultImage(unit, { image }) {
  // キャプチャは 800x600(4:3) なので、表示枠も 4:3 にして全体を表示する
  xnew.nest('<div class="absolute bottom-[14cqw] left-[2cqw] w-[56cqw] aspect-4/3 rounded-[1cqw] overflow-hidden" style="box-shadow: 0 10px 30px rgba(0,0,0,0.3)">');
  const img = xnew('<img class="absolute inset-0 size-full object-cover">');
  image?.then((src) => img.element.src = src);
}

function ResultDetail(unit, { score, wave, kills = [0, 0, 0, 0], cleared = false }) {
  xnew.nest('<div class="absolute bottom-[10cqw] right-[2cqw] w-[38cqw] bg-gray-100 px-[1.5cqw] py-[2.5cqw] rounded-[1cqw] font-bold" style="box-shadow: 0 8px 20px rgba(0,0,0,0.2);">');
  xnew('<div class="text-[3.5cqw] text-center text-red-400 mb-[1.5cqw]">', '🦠 駆逐した数 🦠');

  // 敵キャラ別の撃破数（ベイク先頭フレーム＝正面のアイコン × 撃破数）を2列で
  const tl = xnew.context(BakedCharacters).texturesList;
  xnew('<div class="grid grid-cols-2 gap-x-[1cqw] gap-y-[1.5cqw]">', () => {
    for (let i = 0; i < tl.length; i++) {
      xnew('<div class="flex items-center justify-center gap-x-[1cqw]">', () => {
        const icon = xnew('<img class="w-[7cqw] h-[7cqw] object-contain">');
        xpixi.renderer.extract.base64(new PIXI.Sprite(tl[i][0])).then((src) => icon.element.src = src);
        xnew('<div class="text-[3.5cqw] text-cyan-700">', `× ${kills[i] ?? 0}`);
      });
    }
  });

  xnew('<div class="mx-[1cqw] my-[2cqw] border-t-[0.4cqw] border-dashed border-cyan-600">');
  if (cleared) {
    xnew('<div class="text-[3.2cqw] text-center text-amber-500 mb-[1cqw]">', '🏆 達成 Wave 4 CLEAR 🏆');
  } else {
    xnew('<div class="text-[2.8cqw] text-center text-cyan-600 mb-[1cqw]">', `到達 Wave ${wave}`);
  }
  xnew('<div class="text-[3.4cqw] text-center text-yellow-500 mb-[1.5cqw]">', `⭐ スコア ${score} ⭐`);

  // 凄さを言葉で（3択。スコアで強調を切替）
  xnew('<div class="flex justify-center items-center gap-x-[2cqw]">', () => {
    const tiers = [{ label: 'まだ弱い', min: 0 }, { label: 'ふつう', min: 1024 * 3 }, { label: 'すごい', min: 1024 * 6 }];
    let reached = 0;
    tiers.forEach((tier, i) => { if (score >= tier.min) reached = i; });
    tiers.forEach((tier, i) => {
      xnew(i === reached ? '<div class="text-[3.2cqw] text-blue-500">' : '<div class="text-[2cqw] opacity-20">', tier.label);
    });
  });
}

function ResultFooter(unit) {
  xnew.nest(`<div class="absolute bottom-0 w-full h-[13cqh] px-[2cqw] flex justify-between text-stone-500">`);
  xnew('<div class="flex items-center gap-x-[2cqw]">', () => {
    const button = xnew('<div class="relative size-[9cqw] cursor-pointer hover:scale-110">', Camera);
    button.on('click', () => xnew(ScreenShot));
    xnew('<div class="text-[3cqw] font-bold">', '画面を保存');
  });

  xnew('<div class="flex items-center gap-x-[2cqw]">', () => {
    xnew('<div class="text-[3cqw] font-bold">', '戻る');
    const button = xnew('<div class="relative size-[9cqw] cursor-pointer hover:scale-110">', ArrowUturnLeft);
    button.on('click', () => xnew.context(xnew.basics.Scene).change(TitleScene, { skipStory: true }));
  });
}

function ScreenShot(unit) {
  xnew.nest(xnew.context(Main).element);
  const cover = xnew('<div class="absolute inset-0 size-full z-10 bg-white">');
  xnew.transition(({ value }) => cover.element.style.opacity = 1 - value, 1000)
  .timeout(() => {
    html2canvas(unit.element, { scale: 2, logging: false, useCORS: true }).then((canvas) => {
      xnew.image.from(canvas).crop(0, 0, canvas.width, Math.floor(canvas.height * 0.87)).download('image.png');
    });
    unit.finalize();
  });
}

// ---- UI Helpers ----

function VolumeControl(_unit) {
  xnew('<div class="absolute right-[2cqw] bottom-[2cqw] size-[6cqw] text-stone-300 z-10">',
    xnew.basics.VolumeController, { anchor: 'left' });
}

function TitleText(_unit) {
  xnew.nest('<div class="absolute w-full top-[16cqw] text-center text-blue-600 font-bold">');
  xnew(xnew.basics.SVGText, { text: 'とーほくショット', fontSize: '10cqw', stroke: '#EEEEEE', strokeWidth: '0.2cqw', className: 'inline-block' });
}

function TouchMessage(unit) {
  xnew.nest('<div class="absolute w-full top-[30cqw] text-center text-blue-600 font-bold">');
  xnew(xnew.basics.SVGText, { text: 'touch start', fontSize: '6cqw', stroke: '#EEEEEE', strokeWidth: '0.2cqw', className: 'inline-block' });
  unit.on('update', ({ count }) => unit.element.style.opacity = 0.6 + Math.sin(count * 0.08) * 0.4);
}

function Camera(_unit) {
  xnew.extend(RingIcon, { paths: [
    'M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23q-.57.08-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a48 48 0 0 0-1.134-.175a2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.19 2.19 0 0 0-1.736-1.039a49 49 0 0 0-5.232 0a2.19 2.19 0 0 0-1.736 1.039z',
    'M16.5 12.75a4.5 4.5 0 1 1-9 0a4.5 4.5 0 0 1 9 0m2.25-2.25h.008v.008h-.008z',
  ] });
}

function ArrowUturnLeft(_unit) {
  xnew.extend(RingIcon, { paths: ['M9 15L3 9m0 0l6-6M3 9h12a6 6 0 0 1 0 12h-3'] });
}
