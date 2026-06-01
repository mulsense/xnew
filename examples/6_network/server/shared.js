//----------------------------------------------------------------------------------------------------
// 6_network — マスター / ロビー / ルームワーカーで共有する定数とルーム定義
//
// プロセスを跨いで同じ値を使うため 1 箇所に集約する (定数のズレ防止)。FIELD はクライアントへ
// welcome で通知する。ルームは動的に作成され、その台帳の正本は master が保持する。
//
// - FIELD / PLAYER_RADIUS / PLAYER_SPEED / BROADCAST_HZ / COLORS : ゲーム物理・配信の定数
// - clamp : 範囲クランプのユーティリティ
//----------------------------------------------------------------------------------------------------

export const FIELD = { w: 800, h: 600 };
export const PLAYER_RADIUS = 16;
export const PLAYER_SPEED = 200; // px / sec
export const BROADCAST_HZ = 30;

export const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#eab308'];

export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
