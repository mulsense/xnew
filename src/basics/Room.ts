//----------------------------------------------------------------------------------------------------
// Room — 同期された「1部屋」を server/client 対称に配線する component（boot ＋ socket 所有）
//
// xnew.sync.boot へ直接渡せる socket を受け取り、その socket で共有 component（World 等）を boot する。
// server / client の別は mode で指定する（boot と同じ規約。
// 実行環境 = ブラウザ / Node の判定はしない）。client では単一ペインを選択し、finalize で socket を切断する。
// server では select / disconnect は無く、finalize で booted root を畳むだけ。
// socket の基本イベント（connect / disconnect / room:notfound）は boot が **boot を呼んだ親ユニット**の
// `unit.on(event)` へ配るので、host 側でそのまま受け取れる。
//
// - Room(unit, { mode, socket?, room?, name?, component }) : 上記の配線を行い `{ client }`（boot ルート unit）を返す
//
// 使い分け: socket の生成・roomId 解決・ロビー / 部屋管理は利用側（client は Scene、server は io 配線）の責務。
//
// Example (client):
//   const socket = io({ query: { room: roomId }, forceNew: true });
//   xnew.extend(xnew.basics.Room, { mode: 'client', socket, name: 'Alice', component: World });
//   unit.on('connect', () => setStatus(`room ${roomId}: ${socket.id}`));
//   unit.on('room:notfound', () => unit.change(LobbyScene));
// Example (server):
//   const roomUnit = xnew(xnew.basics.Room, { mode: 'server', socket: io, room: roomId, component: World });
//   roomUnit.on('connect', ({ id }) => members.add(id));   // 空室掃除で roomUnit.finalize()
//----------------------------------------------------------------------------------------------------

import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';
import { BootOptions } from '../core/sync';

export function Room(unit: Unit, { mode, socket, room, name, component }: Pick<BootOptions, 'mode' | 'socket' | 'room' | 'name'> & { component: Function }) {
    // boot へ mode/socket/room/name を渡す（下りと基本イベントは boot が自動配線）。socket 省略時は loopback。
    const client = xnew.sync.boot({ mode, socket, room, name }, component) as Unit & { select?: () => void };

    if (mode === 'server') {
        // server: select / disconnect は無い。部屋掃除で booted root を畳むだけ。
        unit.on('finalize', () => client.finalize());
    } else {
        client.select?.();   // client: 単一ペインを即操作可に（Selectable を持たない component では no-op）
        unit.on('finalize', () => { client.finalize(); socket?.disconnect?.(); });   // 生 socket.io 接続を閉じる
    }

    // extend の define は関数 / getter のみ許可されるため、boot ルートは getter で公開する。
    return {
        get client(): Unit { return client; },
    };
}
