import {fileURLToPath} from 'url';
import {resolve} from 'import-meta-resolve';

const FILE_PROTOCOL = 'file:';

export function findFileImport(fullPath: string, parent: string) {
    const url = new URL(fullPath, parent);
    if (url.protocol === FILE_PROTOCOL) {
        return fileURLToPath(resolve(fullPath, parent));
    }
    return url.href;
}
