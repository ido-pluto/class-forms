import {Request, Response} from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import {NextFunction} from 'connect';
import cookieSession from 'cookie-session';
import {v4 as uuid} from 'uuid';
import morgan from 'morgan';
import formidable, {File} from 'formidable';
import z, {ZodError} from 'zod';
import fs from 'fs-extra';
import React, {ReactElement} from 'react';
import {generateErrorMessage} from 'zod-error';
import helmet, {HelmetOptions} from 'helmet';
import formsBodyParser from './middleware/forms-body-parser.js';
import csrfMiddleware, {CsrfMiddlewareOptions} from './middleware/csrf-middleware.js';
import ReflectFormData, {ReflectFormDataOptions} from './render/reflect-form-data.js';
import stringHash from 'string-hash';
import {files} from './app/register.js';
import {resolve} from 'import-meta-resolve';
import {fileURLToPath} from 'url';

export type DefaultExtendedRequest = { [key: string]: any }
export type DefaultExtendedResponse = { [key: string]: any }

export type FormFrameworkRequest<T = DefaultExtendedRequest> = Request & {
    files: { [key: string]: File | File[] | undefined },
    csrfToken?: { name: string, value: string }
} & DefaultExtendedRequest & T;
export type FormFrameworkResponse<T = DefaultExtendedResponse> = Response & DefaultExtendedResponse & T;

export type UseMiddlewareCallback<T, K> = (func: (req: FormFrameworkRequest<T>, res: FormFrameworkResponse<K>, next: NextFunction) => any) => any;

export type UseMiddlewareOptions = {
    bodyParser?: {
        json?: bodyParser.OptionsJson | boolean
        urlencoded?: bodyParser.OptionsUrlencoded | boolean,
        text?: bodyParser.OptionsText | boolean,
        raw?: bodyParser.Options | boolean,
        formData?: formidable.Options | boolean
    } | false,
    cookieParser?: boolean,
    cookieSession?: CookieSessionInterfaces.CookieSessionOptions | boolean,
    logger?: boolean
    helmet?: HelmetOptions | boolean
    csrfValidation?: CsrfMiddlewareOptions | boolean
};

type GetChildrenReturnType = { title?: string, head?: string, content: React.ReactNode };

export const DEFAULT_COOKIE_SESSION_OPTIONS: CookieSessionInterfaces.CookieSessionOptions = {
    name: 'session',
    secret: uuid(),
    maxAge: 24 * 60 * 60 * 1000,
};

export const DEFAULT_MIDDLEWARE_OPTIONS: UseMiddlewareOptions = {
    bodyParser: {urlencoded: true},
    cookieParser: true,
    cookieSession: true,
    logger: true,
    helmet: true,
    csrfValidation: true
};

const DEFAULT_FILED_VALIDATION = z.string().min(1, 'Field is required').max(100, 'Field is too long');
const DEFAULT_FILE_VALIDATION = z.object({size: z.number().min(1, 'File is required')});

export default abstract class BaseLayout<T = DefaultExtendedRequest, K = DefaultExtendedResponse> {
    /**
     * The path of the page (express route)
     * Can include params, for example: `/user/:id`
     */
    public static path: string;
    /**
     * The type of encoding to use for the form, will be automatically set by the `bodyParser` middleware
     */
    protected encodeFormType: 'urlencoded' | 'form-data' = 'urlencoded';
    /**
     * The error message that you get from internal errors, such as validation errors from `connectClick`
     */
    protected error = '';
    /**
     * Reflect form data on post, meaning that the form will be filled with the data that was sent
     * use `data-reflect` attribute to enable it on a specific element
     * use `data-reflect="false"` to disable it on a specific element
     */
    protected reflectFormData: ReflectFormDataOptions | false = {noReflectByDefault: true};
    private _activeUseMiddleware?: UseMiddlewareCallback<T, K>;

    private pageMeta: { style: ReactElement[], script: ReactElement[] } = {style: [], script: []};

    public constructor(protected req: FormFrameworkRequest<T>, protected res: FormFrameworkResponse<K>) {
    }

    /**
     * Connect express middleware or use built in middleware
     *
     * `super.useMiddleware` register built in middleware, you can configure it by providing options
     */
    public useMiddleware(use: UseMiddlewareCallback<T, K>, options: UseMiddlewareOptions = {}) {
        options = Object.assign({}, DEFAULT_MIDDLEWARE_OPTIONS, options);
        this._activeUseMiddleware = use;
        const getOptions = (options: any) => options === true ? undefined : options;

        if (options.helmet)
            use(helmet(getOptions(options.helmet)));

        this.encodeFormType = formsBodyParser(use, options.bodyParser, this.encodeFormType);

        if (options.cookieParser)
            use(cookieParser());

        if (options.cookieSession)
            use(cookieSession(getOptions(options.cookieSession) ?? DEFAULT_COOKIE_SESSION_OPTIONS));

        if (options.logger)
            use(morgan('tiny'));

        if (options.csrfValidation)
            use(csrfMiddleware(getOptions(options.csrfValidation)));
    }

    /**
     * Render the page
     *
     * call `super.render` to use the parent layout
     *
     * @returns {BaseLayout|string|object} Class that extends `BaseLayout`, it will be rendered instead of the current page (render as GET)
     *
     * `object`, it will respond with json
     *
     * `string`, it will respond with text
     *
     * @throws Any error that is thrown will be caught and rendered as text with the error message and status code 400/500
     */
    public async render(getChildren: () => Promise<GetChildrenReturnType> | GetChildrenReturnType): Promise<any> {
        const children = await getChildren();
        const encType = this.encodeFormType === 'form-data' ? 'multipart/form-data' : 'application/x-www-form-urlencoded';

        const renderContent = <html>
        <head>
            {children.title && <title>{children.title}</title>}
            <meta charSet="utf-8"/>
            <meta name="viewport" content="width=device-width, initial-scale=1"/>
            {children.head}
            {this.pageMeta.script}
            {this.pageMeta.style}
        </head>
        <body>
        <form method="post" encType={encType} id="root">
            {this.req.csrfToken && <input type="hidden" name={this.req.csrfToken.name} value={this.req.csrfToken.value}/>}
            {children.content}
        </form>
        </body>
        </html>;

        if (!this.reflectFormData) {
            return renderContent;
        }

        return new ReflectFormData(this.req.body, this.reflectFormData).injectRender(renderContent);
    }

    /**
     * Called after all middlewares are registered
     */
    public async onInit() {
        // override this method
    }

    /**
     * Called after the `render` is finished
     */

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

    /**
     * Get a field from the request body
     */
    protected async getFiled(name: string, validate: z.ZodType = DEFAULT_FILED_VALIDATION): Promise<string> {
        return await validate.parseAsync(this.req.body?.[name], {path: ['body', name]});
    }

    /**
     * Get a file from the request body
     */
    protected async getFile(name: string, validate: z.ZodType = DEFAULT_FILE_VALIDATION): Promise<File> {
        return await validate.parseAsync(this.req.files?.[name], {path: ['files', name]});
    }

    /**
     * Connect a click event to a function
     * @param func - the function to call
     * @param name - the name of the click event (default to the function name)
     * @param catchErrors - catch errors and set the `this.error` to the error message
     * @example
     * // in useMiddleware
     * this.connectClick(this.buttonClicked);

     * // in render
     * <button name="click" value="buttonClicked">show info</button>
     */
    protected connectClick(func: () => any, {name = func.name, catchErrors = true} = {}) {
        if (!this._activeUseMiddleware)
            throw new Error('You must call useMiddleware before connectClick');

        const thisFunc = func.bind(this);
        return this._activeUseMiddleware(async (req: FormFrameworkRequest<T>, res: FormFrameworkResponse<K>, next: NextFunction) => {
            try {
                if (req.body?.['click'] === name)
                    await thisFunc();
            } catch (error: any) {
                if (!catchErrors) throw error;

                if (error instanceof ZodError) {
                    this.error = generateErrorMessage(error.issues);
                    return;
                }

                if (error instanceof Error) {
                    this.error = error.message;
                    return;
                }

                this.error = error.toString();
            } finally {
                next();
            }
        });
    }

    protected importStyle(fullPath: string, parent: string, options?: HTMLLinkElement) {
        fullPath = fileURLToPath(resolve(fullPath, parent));
        const href = `/${stringHash(fullPath)}.css`;
        this.pageMeta.style.push(
            <link rel="stylesheet" href={href} {...options}/>
        );
        files[href] = fullPath;
    }

    protected importScript(fullPath: string, parent: string, options: HTMLScriptElement = {type: 'module'}) {
        fullPath = fileURLToPath(resolve(fullPath, parent));
        const src = `/${stringHash(fullPath)}.js`;
        this.pageMeta.script.push(
            <script src={src} {...options}></script>
        );
        files[src] = fullPath;
    }
}
