//----------------------------------------------------------------------------------------------------
// games — ゲームプラグインの読み込み
//
// このディレクトリの *.js (index.js 以外) を「ゲームモジュール」として動的 import し、
// gameType -> { id, name, create } のレジストリを作る。ゲームを増やす＝ここにファイルを足すだけ。
//
// ゲームモジュールの契約 (各 *.js が export するもの):
//   - id: string                         … gameType (一意)
//   - name: string                       … 表示名
//   - create(): GameInstance             … ルーム 1 つ分のゲーム状態を作る
//
// GameInstance (ネット層 Room から呼ばれる。フレームワーク非依存):
//   - welcome?(): object                 … welcome に混ぜる初期情報 (例 { field })
//   - onJoin(playerId, info)             … 参加
//   - onLeave?(playerId)                 … 退出
//   - onInput?(playerId, message)        … 入力
//   - update?(dt)                        … 1 フレーム進める (サーバー権威)
//   - snapshot(): object                 … 配信する状態
//   - dispose?()                         … 後始末
//----------------------------------------------------------------------------------------------------

import { readdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadGames() {
    const files = (await readdir(__dirname)).filter((f) => f.endsWith('.js') && f !== 'index.js');
    const games = new Map();
    for (const file of files) {
        const mod = await import(pathToFileURL(join(__dirname, file)).href);
        if (mod.id && typeof mod.create === 'function') {
            games.set(mod.id, { id: mod.id, name: mod.name ?? mod.id, create: mod.create });
        } else {
            console.warn(`[games] skipped ${file}: must export { id, create }`);
        }
    }
    return games;
}
