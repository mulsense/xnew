//----------------------------------------------------------------------------------------------------
// UMD entry for xthree — exposes the named `xthree` export as the global `xthree`
//
// ESM (xthree.ts) exposes `xthree` as a *named* export (`import { xthree } from '@mulsense/xnew/addons/xthree'`).
// The UMD/global build needs the global `xthree` to be that object directly, so this wrapper
// re-exports it as the default export.
//
// - default : the `xthree` addon object
//----------------------------------------------------------------------------------------------------

import { xthree } from './xthree';

export default xthree;
