//----------------------------------------------------------------------------------------------------
// UMD entry for xmatter — exposes the named `xmatter` export as the global `xmatter`
//
// ESM (xmatter.ts) exposes `xmatter` as a *named* export (`import { xmatter } from '@mulsense/xnew/addons/xmatter'`).
// The UMD/global build needs the global `xmatter` to be that object directly, so this wrapper
// re-exports it as the default export.
//
// - default : the `xmatter` addon object
//----------------------------------------------------------------------------------------------------

import { xmatter } from './xmatter';

export default xmatter;
