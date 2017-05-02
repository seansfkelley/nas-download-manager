// Stripped down version of https://github.com/dashed/shallowequal
// Copied here because the combination of Typescript, ES6 and Rollup is a
// disaster: we have to output ES6 for Rollup, but we can't import exports-
// as-functions when we're targeting ES6 and EVERY SINGLE STANDALONE MODULE
// FOR THIS module.exports = A FUNCTION. ARGH.

export function shallowEqual(objA: any, objB: any) {
    if (objA === objB) {
        return true;
    }

    if (typeof objA !== 'object' || objA === null ||
        typeof objB !== 'object' || objB === null) {
        return false;
    }

    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    const len = keysA.length;
    if (len !== keysB.length) {
        return false;
    }

    // Test for A's keys different from B.
    const bHasOwnProperty = Object.prototype.hasOwnProperty.bind(objB);
    for (let i = 0; i < len; i++) {
        const key = keysA[i];
        if (!bHasOwnProperty(key)) {
            return false;
        }
        const valueA = objA[key];
        const valueB = objB[key];

        if (valueA !== valueB) {
            return false;
        }
    }

    return true;
};
