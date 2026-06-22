//----------------------------------------------------------------------------------------------------
// UMD entry for xpixi — exposes the named `xpixi` export as the global `xpixi`
//
// ESM (xpixi.ts) exposes `xpixi` as a *named* export (`import { xpixi } from '@mulsense/xnew/addons/xpixi'`).
// The UMD/global build needs the global `xpixi` to be that object directly, so this wrapper
// re-exports it as the default export.
//
// - default : the `xpixi` addon object
//----------------------------------------------------------------------------------------------------

import { xpixi } from './xpixi';

export default xpixi;
