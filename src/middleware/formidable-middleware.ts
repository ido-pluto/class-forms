import {NextFunction} from 'connect';
import formidable, {Fields, File, Files} from 'formidable';

const BODY_METHODS = ['POST', 'PUT', 'PATCH'];
const CONTENT_TYPE = 'multipart/form-data';
export default function formidableMiddleware(options: formidable.Options = {}) {
    return async (req: any, res: any, next: NextFunction) => {
        if (!BODY_METHODS.includes(req.method) || req.header('content-type')?.toLowerCase() !== CONTENT_TYPE) {
            return next();
        }
        const form = formidable(options);

        try {
            const [fields, files] = await form.parse(req);
            const parsed = easyFormidableParse(fields, files);
            req.body = parsed.fields;
            req.files = parsed.files;
        } catch (err: any) {
            console.error(err);
            res.writeHead(err.httpCode || 400, {'Content-Type': 'text/plain'});
            res.end(String(err));
            return;
        }
    };
}

function easyFormidableParse(fields: Fields<string>, files: Files<string>) {
    const fieldsObject: { [key: string]: string | string[] | undefined } = {};
    const filesObject: { [key: string]: File | File[] | undefined } = {};

    for (const [key, value] of Object.entries(fields)) {
        if (value?.length === 1) {
            fieldsObject[key] = value[0];
            continue;
        }
        fieldsObject[key] = value;
    }

    for (const [key, value] of Object.entries(files)) {
        if (value?.length === 1) {
            filesObject[key] = value[0];
            continue;
        }
        filesObject[key] = value;
    }

    return {
        fields: fieldsObject,
        files: filesObject
    };
}
