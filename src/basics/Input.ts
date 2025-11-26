import { xnew } from '../core/xnew';
import { Unit } from '../core/unit';

function setAttributes(element: HTMLElement, attrs: Object) {
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else if (key === 'className' && typeof value === 'string') {
      element.className = value;
    } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      element.setAttribute(key, value.toString());
    }
  }
}
export function InputRange(frame: Unit, {
    value = 0,
    min = 0,
    max = 100,
    step = 1,
    ...attributes
}: { 
    value?: number | string,
    min?: number | string,
    max?: number | string,
    step?: number | string,
    attributes?: Object
} = {}) {

    const input = xnew.nest(`<input type="range" value="${value}" min="${min}" max="${max}" step="${step}">`) as HTMLInputElement;

    if (attributes !== undefined) {
        setAttributes(input, attributes);
    }
}