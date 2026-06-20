//----------------------------------------------------------------------------------------------------
// Room — 同期された「1部屋」を server/client 対称に配線する component（boot ＋ socket 所有）
//
// xnew.sync.boot へ直接渡せる socket を受け取り、その socket で共有 component（World 等）を boot する。
// server / client の別は boot が実行環境から自動判定する（Node=server / browser=client）。Room は
// その結果（booted root の mode）を見て後始末を分ける。client では finalize で socket を切断する。
// server では finalize で booted root を畳むだけ。
// socket の基本イベント（connect / disconnect / room:notfound）は boot が **boot を呼んだ親ユニット**の
// `unit.on(event)` へ配るので、host 側でそのまま受け取れる。
//
// - Room(unit, { socket, room?, name?, Component }) : 上記の配線を行い `{ client }`（boot ルート unit）を返す
//
// 使い分け: socket の生成・roomId 解決・ロビー / 部屋管理は利用側（client は Scene、server は io 配線）の責務。
//
// Example (client / ブラウザ):
//   const socket = io({ query: { room: roomId }, forceNew: true });
//   xnew.extend(xnew.basics.Room, { socket, name: 'Alice', Component: World });
//   unit.on('connect', () => setStatus(`room ${roomId}: ${socket.id}`));
//   unit.on('room:notfound', () => unit.change(LobbyScene));
// Example (server / Node):
//   const roomUnit = xnew(xnew.basics.Room, { socket: io, room: roomId, Component: World });
//   roomUnit.on('connect', ({ id }) => members.add(id));   // 空室掃除で roomUnit.finalize()
//----------------------------------------------------------------------------------------------------

import { Unit } from '../core/unit';
import { getEnvironment } from '../core/env';
import { sync, BootOptions } from '../utils/sync';

export function Room(unit: Unit, { socket, room, name, Component }: Pick<BootOptions, 'socket' | 'room' | 'name'> & { Component: Function }) {
    // boot へ socket/room/name を渡す（server/client は実行環境から自動判定。下りと基本イベントは boot が自動配線）。
    const client = sync.boot({ socket, room, name }, Component);

    if (getEnvironment() === 'server') {
        // server: 部屋掃除で booted root を畳むだけ。
        unit.on('finalize', () => client.finalize());
    } else {
        unit.on('finalize', () => { client.finalize(); socket?.disconnect?.(); });   // 生 socket.io 接続を閉じる
    }

    // extend の define は関数 / getter のみ許可されるため、boot ルートは getter で公開する。
    return {
        get client(): Unit { return client; },
    };
}
