export function checkReactElement(value: any): boolean {
    return value && typeof value === 'object' && '$$typeof' in value && value.$$typeof == Symbol.for('react.element');
}
