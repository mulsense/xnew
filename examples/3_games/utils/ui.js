//----------------------------------------------------------------------------------------------------
// 3_games 共通 UI キット
//
// tohoku_shot / tohoku_drop など 3_games の各サンプルで共通して使う UI 部品をまとめる。
// ゲーム固有の差分（色・文言・戻り先・画像枠サイズ）は props / コールバックで吸収し、
// ゲーム固有のロジック（スコア集計の ResultDetail 等）は各 script.js 側に残す。
//
// - Camera / ArrowUturnLeft : 丸枠アイコン（リザルトのフッターボタン用）
// - ScreenShot              : #main を白フェードで撮影して画像保存
// - ResultFooter            : 「画面を保存」＋「戻る」フッター（onBack で戻り先を指定）
// - ResultBackground        : リザルト背景（グラデ + 漂う/瞬く白丸 + "Result"）
// - ResultImage             : リザルトのキャプチャ画像枠（boxClass で位置/サイズ指定）
// - TitleText / TouchMessage: タイトルの見出し + 点滅する操作案内
// - GameOverText            : 中央に降りてくる "Game Over"
// - VolumeControl           : 右下の音量コントローラ
//
// 各 index.html の importmap に @mulsense/xnew と html2canvas-pro が必要（既存サンプルは充足済み）。
//----------------------------------------------------------------------------------------------------

import { xnew } from '@mulsense/xnew';
import html2canvas from 'html2canvas-pro';

// 丸枠アイコン: 外周の円 + 中央70%に path 群。Camera / ArrowUturnLeft で共有。
function RingIcon(unit, { paths }) {
  xnew('<div style="position: absolute; inset: 0; margin: auto; width: 100%; height: 100%;">', () => {
    xnew.extend(xnew.basics.SVG, { viewBox: '0 0 24 24', stroke: 'currentColor' });
    xnew('<circle cx="12" cy="12" r="11">');
  });
  xnew('<div style="position: absolute; inset: 0; margin: auto; width: 70%; height: 70%;">', () => {
    xnew.extend(xnew.basics.SVG, { viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 1.5 });
    for (const d of paths) {
      xnew(`<path d="${d}">`);
    }
  });
}

export function Camera(_unit) {
  xnew.extend(RingIcon, { paths: [
    'M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23q-.57.08-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a48 48 0 0 0-1.134-.175a2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.19 2.19 0 0 0-1.736-1.039a49 49 0 0 0-5.232 0a2.19 2.19 0 0 0-1.736 1.039z',
    'M16.5 12.75a4.5 4.5 0 1 1-9 0a4.5 4.5 0 0 1 9 0m2.25-2.25h.008v.008h-.008z',
  ] });
}

export function ArrowUturnLeft(_unit) {
  xnew.extend(RingIcon, { paths: ['M9 15L3 9m0 0l6-6M3 9h12a6 6 0 0 1 0 12h-3'] });
}

// #main を白で覆ってからフェードアウトしつつ撮影し、PNG をダウンロードする。
export function ScreenShot(unit) {
  xnew.nest(document.querySelector('#main'));
  const cover = xnew('<div class="absolute inset-0 size-full z-10 bg-white">');
  xnew.transition(({ value }) => cover.element.style.opacity = 1 - value, 1000)
    .timeout(() => {
      html2canvas(unit.element, { scale: 2, logging: false, useCORS: true }).then((canvas) => {
        // 下部 13% のフッターを除いた領域を切り出して PNG としてダウンロードする。
        const [width, height] = [canvas.width, Math.floor(canvas.height * 0.87)];
        const cropped = document.createElement('canvas');
        [cropped.width, cropped.height] = [width, height];
        cropped.getContext('2d').drawImage(canvas, 0, 0, width, height, 0, 0, width, height);
        const link = document.createElement('a');
        link.download = 'image.png';
        link.href = cropped.toDataURL('image/png');
        link.click();
      });
      unit.finalize();
    });
}

// リザルトのフッター。「画面を保存」(ScreenShot) と「戻る」(onBack) の2ボタン。
export function ResultFooter(unit, { onBack }) {
  xnew.nest('<div class="absolute bottom-0 w-full h-[13cqh] px-[2cqw] flex justify-between text-stone-500">');
  xnew('<div class="flex items-center gap-x-[2cqw]">', () => {
    const button = xnew('<div class="relative size-[9cqw] cursor-pointer hover:scale-110">', Camera);
    button.on('click', () => xnew(ScreenShot));
    xnew('<div class="text-[3cqw] font-bold">', '画面を保存');
  });

  xnew('<div class="flex items-center gap-x-[2cqw]">', () => {
    xnew('<div class="text-[3cqw] font-bold">', '戻る');
    const button = xnew('<div class="relative size-[9cqw] cursor-pointer hover:scale-110">', ArrowUturnLeft);
    button.on('click', () => onBack());
  });
}

// リザルト背景：斜めグラデ + 大きな "Result" + 漂う/瞬く白丸。
// gradient="from-... to-..."（bg-linear-to-br 用）/ textColor="text-..."。
export function ResultBackground(unit, { gradient, textColor }) {
  xnew.nest(`<div class="relative size-full bg-linear-to-br ${gradient}">`);
  xnew(`<div class="absolute top-0 left-[4cqw] text-[14cqw] ${textColor}">`, 'Result');

  // ランダム配置した白丸を sin で明滅させる。transform は種類ごとに変える（浮遊 / きらめき）。
  function floatingCircle(sizeCqw, transform) {
    const [x, y] = [Math.random() * 100, Math.random() * 100];
    const circle = xnew(`<div class="absolute rounded-full bg-white" style="width: ${sizeCqw}cqw; height: ${sizeCqw}cqw; left: ${x}%; top: ${y}%; opacity: 0.2;">`);
    circle.on('update', ({ count }) => {
      const p = count * 0.02;
      Object.assign(circle.element.style, { opacity: Math.sin(p) * 0.1 + 0.2, transform: transform(p) });
    });
  }

  for (let i = 0; i < 20; i++) {
    floatingCircle(Math.random() * 2 + 2, (p) => `translateY(${Math.sin(p) * 20}px)`);
  }
  for (let i = 0; i < 30; i++) {
    floatingCircle(1, (p) => `scale(${1 + Math.sin(p) * 0.1})`);
  }
}

// リザルトのキャプチャ画像枠。boxClass で位置・サイズ・アスペクトを指定する。
export function ResultImage(unit, { image, boxClass }) {
  xnew.nest(`<div class="absolute ${boxClass} rounded-[1cqw] overflow-hidden" style="box-shadow: 0 10px 30px rgba(0,0,0,0.3)">`);
  const img = xnew('<img class="absolute inset-0 size-full object-cover">');
  image?.then((src) => img.element.src = src);
}

// タイトルの見出し（縁取り SVGText）。text=文言 / color="text-..."。
export function TitleText(unit, { text, color }) {
  xnew.nest(`<div class="absolute w-full top-[16cqw] text-center ${color} font-bold">`);
  xnew(xnew.basics.SVGText, { text, fontSize: '10cqw', stroke: '#EEEEEE', strokeWidth: '0.2cqw', className: 'inline-block' });
}

// 点滅する "touch start"。color="text-..."。
export function TouchMessage(unit, { color }) {
  xnew.nest(`<div class="absolute w-full top-[30cqw] text-center ${color} font-bold">`);
  xnew(xnew.basics.SVGText, { text: 'touch start', fontSize: '6cqw', stroke: '#EEEEEE', strokeWidth: '0.2cqw', className: 'inline-block' });
  unit.on('update', ({ count }) => unit.element.style.opacity = 0.6 + Math.sin(count * 0.08) * 0.4);
}

// 中央に降りてくる "Game Over"。className で横位置を調整（既定は全幅中央）。
export function GameOverText(unit, { className = 'w-full' }) {
  xnew.nest(`<div class="absolute ${className} text-center text-red-400 font-bold">`);
  xnew(xnew.basics.SVGText, { text: 'Game Over', fontSize: '12cqw', stroke: '#EEEEEE', strokeWidth: '0.2cqw', className: 'inline-block' });
  xnew.transition(({ value }) => {
    Object.assign(unit.element.style, { opacity: value, top: `${10 + value * 15}cqw` });
  }, 1000, 'ease');
}

// 右下の音量コントローラ。className で文字色等を調整。
export function VolumeControl(unit, { className = 'text-stone-300 z-10' } = {}) {
  xnew(`<div class="absolute right-[2cqw] bottom-[2cqw] size-[6cqw] ${className}">`,
    xnew.basics.VolumeController, { anchor: 'left' });
}
