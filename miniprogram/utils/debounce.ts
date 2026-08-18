export function debounce(fn: Function, delay: number) {
    let st: number = 0;
    return (...params: any) => {
        st && clearTimeout(st);
        st = setTimeout(() => {
            fn(...params);
        }, delay);
    }
}