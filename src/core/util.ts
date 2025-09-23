
//----------------------------------------------------------------------------------------------------
// type check
//----------------------------------------------------------------------------------------------------

export function isPlainObject(object: any): boolean {
    return object !== null && typeof object === 'object' && object.constructor === Object;
}

export function isSVGElement(element: any) {
    return element instanceof Element && element.namespaceURI === 'http://www.w3.org/2000/svg';
}

//----------------------------------------------------------------------------------------------------
// element
//----------------------------------------------------------------------------------------------------

export function createElementFromAttributes(attributes: Record<string, any>): HTMLElement {

    const tagName = (attributes.tag ?? attributes.tagName ?? 'div').toLowerCase();
    const element = document.createElement(tagName);

    Object.keys(attributes).forEach((key) => {
        const value = attributes[key];
        if (key === 'tagName' || key === 'class') {
            // Skip
        } else if (key === 'className') {
            if (typeof value === 'string' && value !== '') {
                element.classList.add(...value.trim().split(/\s+/));
            }
        } else if (key === 'style') {
            if (typeof value === 'string') {
                (element as HTMLElement).style.cssText = value;
            } else if (isPlainObject(value) === true) {
                Object.assign((element as HTMLElement).style, value);
            }
        } else {
            const snake = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            if (element[key as keyof Element] === true || element[key as keyof Element] === false) {
                (element as any)[key] = value;
            } else {
                element.setAttribute(key, value);
            }
        }
    });

    return element
}


export function createElementNSFromAttributes(attributes: Record<string, any>): SVGElement {

    const tagName = (attributes.tag ?? attributes.tagName ?? 'div').toLowerCase();
    const element = document.createElementNS('http://www.w3.org/2000/svg', tagName);

    Object.keys(attributes).forEach((key) => {
        const value = attributes[key];
        if (key === 'tagName' || key === 'class') {
            // Skip
        } else if (key === 'className') {
            if (typeof value === 'string' && value !== '') {
                element.classList.add(...value.trim().split(/\s+/));
            }
        } else if (key === 'style') {
            if (typeof value === 'string') {
                (element as HTMLElement).style.cssText = value;
            } else if (isPlainObject(value) === true) {
                Object.assign((element as HTMLElement).style, value);
            }
        } else {
            const snake = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            if (element[key as keyof Element] === true || element[key as keyof Element] === false) {
                (element as any)[key] = value;
            } else {
                element.setAttributeNS(null, key, value);
            }
        }
    });

    return element
}
