import {Request, Response} from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import {NextFunction} from 'connect';
import cookieSession from 'cookie-session';
import {v4 as uuid} from 'uuid';
import morgan from 'morgan';
import formidableMiddleware from './middleware/formidable-middleware.js';
import formidable, {File} from 'formidable';
import z from 'zod';
import fs from 'fs-extra';
import React from 'react';

export type DefaultExtendedRequest = { [key: string]: any }
export type DefaultExtendedResponse = { [key: string]: any }

export type FormFrameworkRequest<T = DefaultExtendedRequest> = Request & { files: { [key: string]: File | File[] | undefined } } & T;
export type FormFrameworkResponse<T = DefaultExtendedResponse> = Response & T;

export type UseMiddlewareCallback<T, K> = (func: (req: FormFrameworkRequest<T>, res: FormFrameworkResponse<K>, next: NextFunction) => any) => any;

export type UseMiddlewareOptions = {
    bodyParser?: 'json' | 'urlencoded' | 'form-data' | 'text' | 'raw' | false,
    cookieParser?: boolean,
    cookieSession?: {
        name?: string,
        keys?: string[],
        secret?: string,
        maxAge?: number,
    } | false,
    logger?: boolean
    formidableOptions?: formidable.Options
};

type GetChildrenReturnType = { title?: string, head?: string, content: React.ReactNode };

export const DEFAULT_COOKIE_SESSION_OPTIONS: UseMiddlewareOptions['cookieSession'] = {
    name: 'session',
    secret: uuid(),
    maxAge: 24 * 60 * 60 * 1000,
};

const DEFAULT_FILED_VALIDATION = z.string().min(1, 'Field is required').max(100, 'Field is too long');
const DEFAULT_File_VALIDATION = z.object({size: z.number().min(1, 'File is required')});

export default abstract class BaseLayout<T = DefaultExtendedRequest, K = DefaultExtendedResponse> {
    public static path: string;
    protected encodeFormType: 'urlencoded' | 'form-data' = 'urlencoded';
    private _activeUseMiddleware?: UseMiddlewareCallback<T, K>;

    public constructor(protected req: FormFrameworkRequest<T>, protected res: FormFrameworkResponse<K>) {
    }

    public useMiddleware(use: UseMiddlewareCallback<T, K>, options: UseMiddlewareOptions = {
        bodyParser: 'urlencoded',
        cookieParser: true,
        cookieSession: DEFAULT_COOKIE_SESSION_OPTIONS,
        logger: true
    }) {
        this._activeUseMiddleware = use;
        switch (options.bodyParser) {
            case 'json':
                use(bodyParser.json());
                break;
            case 'urlencoded':
                this.encodeFormType = 'urlencoded';
                use(bodyParser.urlencoded({extended: true}));
                break;
            case 'text':
                use(bodyParser.text());
                break;
            case 'raw':
                use(bodyParser.raw());
                break;
            case 'form-data':
                this.encodeFormType = 'form-data';
                use(formidableMiddleware(options.formidableOptions));
                break;
        }

        if (options.cookieParser)
            use(cookieParser());

        if (options.cookieSession)
            use(cookieSession(options.cookieSession));

        if (options.logger)
            use(morgan('tiny'));
    }

    public async render(getChildren: () => Promise<GetChildrenReturnType> | GetChildrenReturnType): Promise<any> {
        const children = await getChildren();
        const encType = this.encodeFormType === 'form-data' ? 'multipart/form-data' : 'application/x-www-form-urlencoded';

        return <html>
        <head>
            {children.title && <title>{children.title}</title>}
            <meta charSet="utf-8"/>
            <meta name="viewport" content="width=device-width, initial-scale=1"/>
            {children.head}
        </head>
        <body>
        <form method="post" encType={encType} id="root">
            {children.content}
        </form>
        </body>
        </html>;
    }

    public async onInit() {
        // override this method
    }

    public async onFinished() {
        for (const file of Object.values(this.req.files || {})) {
            if (file instanceof Array) {
                for (const f of file) {
                    await fs.remove(f.filepath);
                }
            } else if (file) {
                await fs.remove(file.filepath);
            }
        }
    }

    protected async getFiled(name: string, validate: z.ZodType = DEFAULT_FILED_VALIDATION): Promise<string> {
        return await validate.parseAsync(this.req.body[name], {path: ['body', name]});
    }

    protected async getFile(name: string, validate: z.ZodType = DEFAULT_File_VALIDATION): Promise<File> {
        return await validate.parseAsync(this.req.files?.[name], {path: ['files', name]});
    }

    protected connectClick(func: () => any, name = func.name) {
        if (!this._activeUseMiddleware)
            throw new Error('You must call useMiddleware before connectClick');

        const thisFunc = func.bind(this);
        return this._activeUseMiddleware(async (req: FormFrameworkRequest<T>, res: FormFrameworkResponse<K>, next: NextFunction) => {
            if (req.body?.['click'] === name)
                await thisFunc();
            next();
        });
    }
}
