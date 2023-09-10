import {NextFunction} from 'connect';
import Tokens from 'csrf';
import type {FormFrameworkRequest, FormFrameworkResponse} from '../base-layout.js';

export type CsrfMiddlewareOptions = Tokens.Options & {
    bodyFiledName?: string;
}
export default function csrfMiddleware({bodyFiledName = 'requestValidation', ...options}: CsrfMiddlewareOptions = {}) {
    const tokens = new Tokens(options);
    return async (req: FormFrameworkRequest, res: FormFrameworkResponse, next: NextFunction) => {
        if (!req.session) {
            throw new Error('Session middleware must be used before csrf middleware');
        }

        req.session.scrdSecret ??= await tokens.secret();
        req.csrfToken = {
            name: bodyFiledName,
            value: tokens.create(req.session.scrdSecret)
        };

        if (req.method === 'GET')
            return next();

        const csrfToken = req.body?.[bodyFiledName];
        if (!csrfToken || !tokens.verify(req.session.scrdSecret, csrfToken)) {
            throw new Error('Invalid csrf token');
        }

        next();
    };
}
