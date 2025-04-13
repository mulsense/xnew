//----------------------------------------------------------------------------------------------------
// error 
//----------------------------------------------------------------------------------------------------

export function error(name, text, target = undefined)
{
    const message = name + (target !== undefined ? ` [${target}]` : '') + ': ' + text;
    console.error(message);
}

//----------------------------------------------------------------------------------------------------
// type check
//----------------------------------------------------------------------------------------------------

export function isString(value)
{
    return typeof value === 'string';
}

export function isFunction(value)
{
    return typeof value === 'function';
}

export function isNumber(value)
{
    return Number.isFinite(value);
}

export function isObject(value)
{
    return value !== null && typeof value === 'object' && value.constructor === Object;
}

//----------------------------------------------------------------------------------------------------
// create element from attributes
//----------------------------------------------------------------------------------------------------

export function createElement(attributes, parentElement = null)
{
    const tagName = (attributes.tagName ?? 'div').toLowerCase();
    let element = null;

    let nsmode = false;
    if (tagName === 'svg') {
        nsmode = true;
    } else {
        while (parentElement) {
            if (parentElement.tagName.toLowerCase() === 'svg') {
                nsmode = true;
                break;
            }
            parentElement = parentElement.parentElement;
        }
    }

    if (nsmode === true) {
        element = document.createElementNS('http://www.w3.org/2000/svg', tagName);
    } else {
        element = document.createElement(tagName);
    }
    
    Object.keys(attributes).forEach((key) => {
        const value = attributes[key];
        if (key === 'tagName') {
        } else if (key === 'insert') {
        } else if (key === 'className') {
            if (isString(value) === true && value !== '') {
                element.classList.add(...value.trim().split(/\s+/));
            }
        } else if (key === 'style') {
            if (isString(value) === true) {
                element.style = value;
            } else if (isObject(value) === true){
                Object.assign(element.style, value);
            }
        } else {
            const snake = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            if (element[key] === true || element[key] === false) {
                element[key] = value;
            } else {
                setAttribute(element, key, value);
            }
            
            function setAttribute(element, key, value) {
                if (nsmode === true) {
                    element.setAttributeNS(null, key, value);
                } else {
                    element.setAttribute(key, value);
                }
            }
        }
    });

    return element;
}

