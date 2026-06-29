import { xnew } from '@mulsense/xnew';

//----------------------------------------------------------------------------------------------------
// ChatView — 全シーン共通のルームチャット。server/client 両方で Game 直下に常駐し、内部で分岐する。
//   - server: client の '+chat' を受けて整形し、送信者 id を添えてルーム全員へ再ブロードキャストする中継器。
//   - client: 表示 + 入力。xnew.sync.emit('+chat', { text }) で送信し、中継された { id, text } を 1 行ずつ積む。
//   名前は client 側で nameOf に解決する。
//----------------------------------------------------------------------------------------------------

// clientId → 表示名。台帳（sync.clients の name）に無ければ id 先頭を出す。client 側でのみ使う。
const nameOf = (id) => xnew.sync.clients.find((c) => c.id === id)?.name || (id ? id.slice(0, 4) : '');

export function ChatView(unit) {
    // server: client の '+chat' を受けてルーム全員へ中継（'+' ブロードキャスト＝root 内の全 unit へ届く）。
    // 送信者 id は data に詰め直す（client 側の dispatch では injected id が undefined のため spread で復元）。
    xnew.sync.server(() => {
        unit.on('+chat', ({ id, text }) => {
            const message = String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, 200);

            if (!message) {
                return;
            }

            xnew.sync.emit('+chat', { id, text: message });
        });
    });

    // client: ルームチャットの表示 + 入力。
    xnew.sync.client(() => {
        xnew.nest('<div class="w-56 h-80 flex flex-col border border-gray-300 rounded bg-white">');
        xnew('<div class="px-3 py-2 border-b border-gray-200 text-sm font-bold text-gray-700">', 'チャット');
        const log = xnew('<div class="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1">');

        xnew('<form class="flex gap-1 p-2 border-t border-gray-200">', (form) => {
            const input = xnew('<input class="flex-1 min-w-0 px-2 py-1 rounded border border-gray-300 text-sm" type="text" maxlength="200" placeholder="メッセージ">');
            xnew('<button type="submit" class="px-2 py-1 rounded border-0 bg-emerald-500 hover:bg-emerald-600 text-white text-sm cursor-pointer">', '送信');
            form.on('submit', ({ event }) => {
                event.preventDefault();
                const text = input.element.value.trim();

                if (!text) {
                    return;
                }

                xnew.sync.emit('+chat', { text });   // server が中継して全員（自分含む）へ返る
                input.element.value = '';
            });
        });

        const myId = xnew.sync.myself.id;
        // server が中継した '+chat'（{ id, text }）を 1 行追加する。名前は client 側で nameOf に解決。
        unit.on('+chat', ({ id, text }) => {
            const mine = id === myId;
            xnew(log, '<div class="text-sm leading-snug break-words">', () => {
                xnew(`<span class="font-bold ${mine ? 'text-emerald-600' : 'text-gray-700'}">`, nameOf(id));
                xnew('<span class="ml-1 text-gray-600">', text);
            });
            log.element.scrollTop = log.element.scrollHeight;
        });
    });
}
