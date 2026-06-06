//----------------------------------------------------------------------------------------------------
// RoomRegistry — 現在あるルームの台帳 (in-memory) と「変化の通知」フィード
//
// ルーム一覧 (ロビー表示) と roomId → Room の参照を持つ。変化があれば onChange 購読者へ最新一覧を
// 流す (= ロビーへの再配信トリガ)。1 ルームは 1 プロセスに閉じる前提なので、将来複数台へ広げる
// ときはここを共有ストア化 + room→インスタンス振り分けに差し替えればよい (Room はローカルのまま)。
//----------------------------------------------------------------------------------------------------

export class RoomRegistry {
    constructor() {
        this.rooms = new Map(); // roomId -> Room
        this.listeners = new Set();
    }

    onChange(fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    notifyChange() {
        const list = this.list();
        for (const fn of this.listeners) { fn(list); }
    }

    list() {
        return [...this.rooms.values()].map((room) => ({
            id: room.id,
            name: room.name,
            gameType: room.gameType,
            memberCount: room.memberCount(),
        }));
    }

    size() { return this.rooms.size; }
    has(id) { return this.rooms.has(id); }
    get(id) { return this.rooms.get(id); }

    add(room) {
        this.rooms.set(room.id, room);
        this.notifyChange();
    }

    remove(id) {
        const room = this.rooms.get(id);
        if (!room) { return; }
        this.rooms.delete(id);
        room.dispose();
        this.notifyChange();
    }
}
