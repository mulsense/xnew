//----------------------------------------------------------------------------------------------------
// Room — socket.io ルーム入室の配線をまとめる component（boot ＋ socket 所有）
//
// xnew.sync.boot へ直接渡せる socket を受け取り、その socket で client ツリー（World 等）を boot して
// 単一ペインを選択状態にする。socket の基本イベント（connect / disconnect / room:notfound）は boot が
// **boot を呼んだ親ユニット A（= この extend 先）** の `unit.on(event)` へ配るので、host 側でそのまま
// `unit.on('connect')` 等で受け取れる。socket は Room が所有し、finalize で client を畳んで socket を切断する。
//
// - Room(unit, { socket, component }) : 上記の配線を行い `{ client }`（boot ルート unit）を返す
//
// 使い分け: socket の生成・roomId 解決・status 文言の組み立て・ロビー遷移は利用側の責務。
//
// Example:
//   const socket = xnew.sync.socketio(io({ query: { room: roomId }, forceNew: true })).connect();
//   xnew.extend(xnew.basics.Room, { socket, component: World });   // socket = boot へ渡す ClientSocket
//   unit.on('connect', () => setStatus(`room ${roomId}: ${socket.id}`));
//   unit.on('room:notfound', () => unit.change(LobbyScene));
//----------------------------------------------------------------------------------------------------

import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';
import { ClientSocket } from '../core/sync';

export function Room(unit: Unit, { socket, component }: { socket: ClientSocket; component: Function }) {
    // socket は xnew.sync.boot へ直接投入する（mode は socket から判定。下りと基本イベントは boot が自動配線）。
    const client = xnew.sync.boot(socket, component) as Unit & { select?: () => void };
    client.select?.();   // 単一ペインを即操作可に（Selectable を持たない component では no-op）

    unit.on('finalize', () => {
        client.finalize();
        socket.disconnect();
    });

    // extend の define は関数 / getter のみ許可されるため、boot ルートは getter で公開する。
    return {
        get client(): Unit { return client; },
    };
}
