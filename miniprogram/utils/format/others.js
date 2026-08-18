export function deepCopy(obj, hash = new WeakMap()) {
    if (obj == null) return obj;

    if (typeof obj !== 'object') return obj;

    if (hash.has(obj)) return hash.get(obj);

    let target = Array.isArray(obj) ? [] : {};

    hash.set(obj, target);

    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            target[key] = deepCopy(obj[key], hash);
        }
    }

    return target;
}