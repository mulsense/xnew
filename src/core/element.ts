//----------------------------------------------------------------------------------------------------
// DOM element utilities shared by core modules
//
// The single place that decides what counts as a DOM element in xnew, so the boundary between
// xnew and the platform stays narrow and SSR-safe (globalThis is checked before instanceof).
//
// - DomElement          : type alias for the element kinds xnew can host (HTML or SVG)
// - isDomElement(value) : HTMLElement | SVGElement type guard, SSR-safe
//----------------------------------------------------------------------------------------------------

export type DomElement = HTMLElement | SVGElement;

export function isDomElement(value: unknown): value is DomElement {
    return (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) || (typeof SVGElement !== 'undefined' && value instanceof SVGElement);
}
