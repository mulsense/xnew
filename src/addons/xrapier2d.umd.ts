//----------------------------------------------------------------------------------------------------
// UMD entry for xrapier2d — exposes the named `xrapier2d` export as the global `xrapier2d`
//
// ESM (xrapier2d.ts) exposes `xrapier2d` as a *named* export (`import { xrapier2d } from '@mulsense/xnew/addons/xrapier2d'`).
// The UMD/global build needs the global `xrapier2d` to be that object directly, so this wrapper
// re-exports it as the default export.
//
// - default : the `xrapier2d` addon object
//----------------------------------------------------------------------------------------------------

import { xrapier2d } from './xrapier2d';

export default xrapier2d;
