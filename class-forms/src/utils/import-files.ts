import {resolve} from 'import-meta-resolve';

export const FILE_PROTOCOL = 'file:';

export function findFileImport(fullPath: string, parent: string) {
    const url = new URL(fullPath, parent);
    if (url.protocol === FILE_PROTOCOL) {
        return new URL(resolve(fullPath, parent));
    }

    return url;
}
