//----------------------------------------------------------------------------------------------------
// type check
//----------------------------------------------------------------------------------------------------

export function isPlaneObject(value: any): boolean {
    return value !== null && typeof value === 'object' && value.constructor === Object;
}
