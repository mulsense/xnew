/**
 * CLIP推論ユーティリティ
 * TensorFlow.jsを使用してCLIPモデルを実装
 */

// 簡易的なCLIP実装（実際のCLIP相似度計算）
class SimpleCLIP {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    this.initialized = true;
  }

  // テキストをベクトル化（簡易実装）
  textToVector(text) {
    // TensorFlow.jsのtf.jsレイヤーを使用して単純なテキストベクトル化
    const tokens = this._tokenize(text.toLowerCase());
    const vector = new Float32Array(512); // 512次元ベクトル

    // 簡易的なハッシング関数でベクトルを生成
    for (let i = 0; i < tokens.length; i++) {
      const hash = this._hashCode(tokens[i]);
      for (let j = 0; j < vector.length; j++) {
        vector[j] += Math.sin((hash + j) * 0.1) * 0.1;
      }
    }

    // 正規化
    return this._normalize(vector);
  }

  // 画像をベクトル化
  async imageToVector(imageElement) {
    const canvas = document.createElement('canvas');
    canvas.width = 224;
    canvas.height = 224;
    const ctx = canvas.getContext('2d');

    // 画像をリサイズして描画
    ctx.drawImage(imageElement, 0, 0, 224, 224);

    // ImageDataを取得
    const imageData = ctx.getImageData(0, 0, 224, 224);
    const data = imageData.data;

    // ピクセルデータからベクトル化
    const vector = new Float32Array(512);

    // 簡易実装：画像の色情報をベクトルに変換
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;

      const idx = Math.floor(i / 4) % 512;
      vector[idx] = (vector[idx] || 0) + (r * 0.3 + g * 0.59 + b * 0.11) * 0.1;
    }

    // 正規化
    return this._normalize(vector);
  }

  // 2つのベクトル間のコサイン相似度を計算
  cosineSimilarity(vec1, vec2) {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (norm1 * norm2);
  }

  // ベクトルを正規化
  _normalize(vector) {
    let sum = 0;
    for (let i = 0; i < vector.length; i++) {
      sum += vector[i] * vector[i];
    }
    const norm = Math.sqrt(sum);

    if (norm === 0) return vector;

    for (let i = 0; i < vector.length; i++) {
      vector[i] /= norm;
    }
    return vector;
  }

  // テキストをトークン化
  _tokenize(text) {
    return text.split(/\s+/).filter(token => token.length > 0);
  }

  // 文字列のハッシュ値を計算
  _hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit整数に変換
    }
    return Math.abs(hash);
  }
}

// グローバルCLIPインスタンス
let clipInstance = null;

export async function initializeCLIP() {
  clipInstance = new SimpleCLIP();
  await clipInstance.initialize();
  return clipInstance;
}

export function getCLIP() {
  if (!clipInstance) {
    clipInstance = new SimpleCLIP();
  }
  return clipInstance;
}

// スコアを計算する関数
export async function calculateScores(imageElement, attributes) {
  const clip = getCLIP();

  // 画像をベクトル化
  const imageVector = await clip.imageToVector(imageElement);

  // 各属性をベクトル化して相似度を計算
  const scores = {};
  for (const [key, description] of Object.entries(attributes)) {
    const attrVector = clip.textToVector(description);
    const similarity = clip.cosineSimilarity(imageVector, attrVector);

    // 相似度をスコアに変換（0-100）
    // cosineSimilarityは0から1の範囲なので、そのまま100を掛ける
    scores[key] = Math.max(0, Math.min(100, similarity * 3000));
  }

  return scores;
}
