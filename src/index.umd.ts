//----------------------------------------------------------------------------------------------------
// UMD entry — keeps the global `xnew` a callable function
//
// ESM (index.ts) exposes `xnew` as a *named* export, so consumers write `import { xnew } from 'xnew'`.
// The UMD/global build (`<script src="dist/xnew.js">`) instead needs the global `xnew` itself to be
// the callable function, not a `{ xnew }` namespace object. This wrapper re-exports the named `xnew`
// as the default export so Rollup assigns the function directly to `window.xnew`.
//
// The self-reference (`xnew.xnew = xnew`) lets addon UMD bundles — which import the *named* `xnew`
// and therefore reference `window.xnew.xnew` — resolve it back to the same function. It exists only
// in the UMD distribution; the ESM build (index.ts) stays free of it.
//
// - default : the `xnew` function (with attached basics / audio / image / sync)
//----------------------------------------------------------------------------------------------------

import { xnew } from './index';

(xnew as any).xnew = xnew;

export default xnew;
