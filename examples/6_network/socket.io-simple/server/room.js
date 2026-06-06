//----------------------------------------------------------------------------------------------------
// Room — 1 ルームのネットワーク足回り。ゲームロジックは差し込まれた game プラグインに委譲する。
//
// 役割分担:
//   - Room (ここ)     : 参加者の管理 / ループ駆動 / そのルームへの配信 (汎用・ゲーム非依存)
//   - game プラグイン  : 参加/入力/1tick更新/配信スナップショット (ゲーム固有。games/*.js)
//
// ループは xnew で回す (サーバーもブラウザと同じ xnew の 'update')。全ルームの Room ユニットが
// 1 つのグローバルティッカーで更新される。配信は BROADCAST_HZ に間引き、そのルームの socket.io
// ルームにだけ送る。
//----------------------------------------------------------------------------------------------------

import xnew from '@mulsense/xnew';
import { BROADCAST_HZ, ROOM_GRACE_MS } from './config.js';

export class Room {
    constructor({ id, name, gameType, game, io, onMembersChanged, onEmpty }) {
        this.id = id;
        this.name = name;
        this.gameType = gameType;
        this.game = game;       // game プラグインのインスタンス
        this.io = io;
        this.players = new Set(); // socketId
        this.onMembersChanged = onMembersChanged;
        this.onEmpty = onEmpty;

        // 作成直後に誰も来ない空き部屋を掃除する (最初の join で解除)。
        this.graceTimer = setTimeout(() => {
            if (this.players.size === 0) { this.onEmpty?.(this.id); }
        }, ROOM_GRACE_MS);

        // ループ (xnew の update) を駆動するユニット。
        this.unit = xnew(RoomLoop, { room: this });
    }

    welcomeData() {
        return this.game.welcome ? this.game.welcome() : {};
    }

    join(socketId, info) {
        clearTimeout(this.graceTimer);
        this.players.add(socketId);
        this.game.onJoin?.(socketId, info ?? {});
        this.onMembersChanged?.(this.id);
    }

    leave(socketId) {
        if (!this.players.delete(socketId)) { return; }
        this.game.onLeave?.(socketId);
        if (this.players.size === 0) {
            this.onEmpty?.(this.id);
        } else {
            this.onMembersChanged?.(this.id);
        }
    }

    input(socketId, message) {
        this.game.onInput?.(socketId, message);
    }

    memberCount() { return this.players.size; }

    dispose() {
        clearTimeout(this.graceTimer);
        this.unit.finalize();
        this.game.dispose?.();
    }
}

//----------------------------------------------------------------------------------------------------
// RoomLoop — このルームの配信ループ (xnew コンポーネント)
//
// プレイヤーの位置更新は game 側の synced unit が同じグローバルティッカーの 'update' で自走する。
// ここは BROADCAST_HZ に間引いて capture → そのルームへ 'sync' 配信するだけ。
// 不変条件: createRoom で game.create()(server World ブート) が new Room(RoomLoop 生成) より先に
// 評価されるため、毎フレーム「Player の update(移動) → RoomLoop の capture」の順になる。
//----------------------------------------------------------------------------------------------------

function RoomLoop(unit, { room }) {
    let lastAt = Date.now();
    let accMs = 0;
    const intervalMs = 1000 / BROADCAST_HZ;

    unit.on('update', () => {
        const now = Date.now();
        accMs += now - lastAt;
        lastAt = now;

        if (accMs >= intervalMs) {
            accMs -= intervalMs;
            room.io.to(room.id).emit('sync', room.game.capture());
        }
    });
}
