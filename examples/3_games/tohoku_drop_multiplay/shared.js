//----------------------------------------------------------------------------------------------------
// shared — server / client 共有の定数とルール（環境依存 import を持たない）
//
// server.js（matter 物理）と index.js（three/pixi 描画）の両方から読む。sync は「レジストリ名（文字列）」
// で同期するため server/client のコンポーネント実装は別物でよいが、盤面サイズ・玉の大きさ・勝敗ルールは
// 両者で一致している必要がある。その「契約」をこの 1 ファイルに集約する。
//
// - WIDTH / HEIGHT : 盤面（描画バッファ）サイズ
// - DROP_Y         : 玉を構える高さ
// - WIN_SCORE      : このスコアに先に到達した方が勝ち
// - KINDS          : 合体できる id 上限（id < KINDS で id+1 へ合体）
// - DROP_KINDS     : 落とせる玉の種類（小さい数種）
// - SCALES         : id ごとのモデル/物理スケール
// - BOWL           : 皿（受け）のジオメトリ
// - ballRadius(id) : id の物理半径
// - points(id)     : id のスコア（落とす / 合体で加点、あふれで減点）
// - clampX(x)      : 投下 x を皿の開口内へ丸める
//----------------------------------------------------------------------------------------------------

export const WIDTH = 800;
export const HEIGHT = 600;
export const DROP_Y = 60;
export const WIN_SCORE = 200;  // 先取で勝利
export const KINDS = 7;        // id 0..6 が合体対象（合体結果は最大 id 7）
export const DROP_KINDS = 3;   // 落とせるのは id 0,1,2
export const SCALES = [0.7, 1.0, 1.3, 1.4, 1.6, 1.8, 1.9, 1.9, 1.9];
export const BOWL = { cx: 400, cy: 360, rx: 240, ry: 200, wall: 12 };

export function ballRadius(id) {
    return 35 + Math.pow(3.0, SCALES[id] * 2.0);
}

export function points(id) {
    return Math.pow(2, id);   // id 0,1,2,…,7 → 1,2,4,…,128
}

export function clampX(x) {
    return Math.max(BOWL.cx - 190, Math.min(BOWL.cx + 190, x));
}
