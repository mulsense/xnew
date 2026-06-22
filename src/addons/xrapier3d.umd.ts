//----------------------------------------------------------------------------------------------------
// UMD entry for xrapier3d — exposes the named `xrapier3d` export as the global `xrapier3d`
//
// ESM (xrapier3d.ts) exposes `xrapier3d` as a *named* export (`import { xrapier3d } from '@mulsense/xnew/addons/xrapier3d'`).
// The UMD/global build needs the global `xrapier3d` to be that object directly, so this wrapper
// re-exports it as the default export.
//
// - default : the `xrapier3d` addon object
//----------------------------------------------------------------------------------------------------

import { xrapier3d } from './xrapier3d';

export default xrapier3d;
