import xnew from '@mulsense/xnew';
import { initializeCLIP, calculateScores } from './clip-utils.js';

// 属性定義（スコア計算用）
const attributes = {
  'おいしさ': 'delicious tasty appetizing savory rich flavor',
  '美しさ': 'beautiful gorgeous attractive colorful vibrant elegant',
  '新鮮さ': 'fresh crisp wholesome healthy natural vibrant',
};

// アプリケーション初期化
xnew('#main', Main);

function Main(unit) {
  // アプリケーション状態
  const state = {
    currentImage: null,
    scores: null,
    clipReady: false,
  };

  // CLIPを初期化
  initializeCLIP().then(() => {
    console.log('CLIP model is ready.');
    state.clipReady = true;
  });

  // UI構造を作成
  xnew.nest('<div class="w-full h-full flex flex-col bg-gradient-to-b from-orange-100 to-yellow-50">');

  // ヘッダー
  xnew(() => {
    xnew.nest('<div class="bg-gradient-to-r from-orange-400 to-yellow-400 text-white p-6 shadow-lg">');
    xnew('<h1 class="text-4xl font-bold text-center">', '🍚 ごはんスカウター 🍚');
    xnew('<p class="text-center mt-2 opacity-90">', 'ごはんの画像をアップロードして、その「おいしさ」を測定！');
  });

  // メインコンテンツ
  xnew(() => {
    xnew.nest('<div class="flex-1 overflow-y-auto p-8">');
    xnew.nest('<div class="max-w-2xl mx-auto">');

    // 画像アップロードエリア
    xnew(ImageUploadArea, { state });

    let result = null;
    unit.on('+imageLoaded', () => {
      result?.finalize();
      result = xnew(ResultsArea, { state });
    });
  });
}

function ImageUploadArea(unit, { state }) {
  xnew.nest('<div class="bg-white rounded-lg shadow-md p-8 mb-8 border-2 border-dashed border-orange-300">');

  const input = xnew('<input type="file" id="image-input" accept="image/*" class="hidden">');
  const button = xnew('<button class="w-full bg-gradient-to-r from-orange-400 to-yellow-400 hover:from-orange-500 hover:to-yellow-500 text-white font-bold py-4 px-6 rounded-lg cursor-pointer transition duration-200 text-lg">', '📸 画像を選択する');
  button.on('click', () => input.element.click());

  input.on('change', async (e) => {
    const target = e.target;
    if (target instanceof HTMLInputElement && target.files) {
      const file = target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const img = new Image();
          img.onload = async () => {
            state.currentImage = img;
            state.imageDataUrl = event.target.result;

            // スコアを計算
            const scores = await calculateScores(img, attributes);
            state.scores = scores;

            // UIを更新
            unit.emit('+imageLoaded');
          };
          if (event.target instanceof FileReader && typeof event.target.result === 'string') {
            img.src = event.target.result;
          }
        };
        reader.readAsDataURL(file);
      }
    }
  });

  // 画像プレビュー表示
  if (state.currentImage) {
    xnew.nest('<div class="mt-6">');
    xnew('<p class="text-sm text-gray-600 mb-3">', 'プレビュー');
    const img = xnew('<img class="w-full h-auto max-h-80 object-cover rounded-lg">');
    img.element.src = state.imageDataUrl;
  }
}

function ResultsArea(unit, { state }) {

  xnew.nest('<div class="space-y-6">');

  // スコア表示
  xnew(() => {
    xnew.nest('<div class="bg-white rounded-lg shadow-md p-8">');
    xnew('<h2 class="text-2xl font-bold mb-6 text-orange-600">', '📊 ごはん評価スコア');

    xnew.nest('<div class="space-y-4">');

    for (const [key, _] of Object.entries(attributes)) {
      const score = Math.round(state.scores[key] || 0);
      const percentage = score;
      xnew('<div>', () => {
        xnew('<div class="flex justify-between items-center mb-2">', () => {
          xnew('<label class="font-semibold text-gray-700">', key);
          xnew('<span class="text-2xl font-bold text-orange-600">', score);
        });
        xnew('<div class="w-full bg-gray-200 rounded-full h-8 overflow-hidden">', () => {
          const bar = xnew(`<div class="bg-gradient-to-r from-orange-400 to-yellow-400 h-full transition-all duration-500 flex items-center justify-center">`);
          bar.element.style.width = percentage + '%';
          xnew('<span class="text-xs font-bold text-white">', percentage > 10 ? percentage + '%' : '');
        });
      });
    }
  });

  // 評価コメント
  const totalScore = Math.round(
    Object.values(state.scores).reduce((a, b) => a + b, 0) / Object.keys(state.scores).length
  );

  let comment = '';
  if (totalScore >= 80) {
    comment = '🌟 これは素晴らしいごはんです！完璧なおいしさが検出されました！';
  } else if (totalScore >= 60) {
    comment = '😋 なかなかのごはんですね！食欲がそそられます！';
  } else if (totalScore >= 40) {
    comment = '🍚 まあまあのごはんです。及第点ですね。';
  } else {
    comment = '🤔 う〜ん、どのようなごはんでしょうか？';
  }

  xnew('<div class="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg shadow-md p-6 border-l-4 border-orange-400">', () => {
    xnew(`<p class="text-lg font-semibold text-orange-700 mb-2">`, `総合評価: ${totalScore}点`);
    xnew(`<p class="text-gray-700 text-center">`, `${comment}`);
  });
}
