//----------------------------------------------------------------------------------------------------
// config — サーバーの設定値 (1 箇所に集約)
//
// ゲーム固有の定数 (フィールドサイズ・速度など) はゲームプラグイン側 (games/*.js) が持つ。
// ここはネットワーク足回りの設定だけ。
//----------------------------------------------------------------------------------------------------

export const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
export const BROADCAST_HZ = Number(process.env.BROADCAST_HZ) || 30;

export const ROOM_NAME_MAX = 16;
export const MAX_ROOMS = Number(process.env.MAX_ROOMS) || 32;
export const ROOM_GRACE_MS = Number(process.env.ROOM_GRACE_MS) || 30000; // 作成後この時間誰も来なければ破棄
