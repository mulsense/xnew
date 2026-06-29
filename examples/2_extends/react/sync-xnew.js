//----------------------------------------------------------------------------------------------------
// sync-xnew — ローカルの @mulsense/xnew ビルドをこのサンプルの node_modules へ同期する。
//
//   このサンプルは Vite が node_modules/@mulsense/xnew を解決して xnew を読む。`npm install`（file:
//   依存のコピー）は install 時点のビルドで止まるため、その後 packages/xnew 側で `npm run build` しても
//   反映されない。本スクリプトで最新 dist をコピーして一致させる。predev / prebuild で自動実行される。
//   （packages/xnew で未ビルドなら先に `npm run build` を実行すること）
//----------------------------------------------------------------------------------------------------

import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', '..', '..', 'dist');                       // packages/xnew/dist
const destPkg = join(here, 'node_modules', '@mulsense', 'xnew');
const dest = join(destPkg, 'dist');

if (!existsSync(src)) {
    console.error(`[sync-xnew] build not found: ${src}\n  → run \`npm run build\` in packages/xnew first.`);
    process.exit(1);
}
if (!existsSync(destPkg)) {
    console.error(`[sync-xnew] ${destPkg} not found\n  → run \`npm install\` in this sample first.`);
    process.exit(1);
}

rmSync(dest, { recursive: true, force: true });   // --delete 相当（消えたファイルを残さない）
cpSync(src, dest, { recursive: true });
console.log('[sync-xnew] synced packages/xnew/dist → node_modules/@mulsense/xnew/dist');
