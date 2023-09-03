import {Request, Response} from 'express';
import type BaseLayout from '../base-layout.js';
import {type UseMiddlewareCallback} from '../base-layout.js';
import {NextFunction} from 'connect';
import {renderToString} from 'react-dom/server';
import {generateErrorMessage} from 'zod-error';
import {ZodError} from 'zod';

export class EvalPage {
    protected page: BaseLayout;

    public constructor(protected req: Request, protected res: Response, protected next: NextFunction, pageConstructor: new(req: any, res: any) => BaseLayout) {
        this.page = new pageConstructor(req, res);
    }

    private static _checkReactElement(value: any): boolean {
        return value && typeof value === 'object' && '$$typeof' in value && value.$$typeof == Symbol.for('react.element');
    }

    public async flow() {
        try {
            await this.page.onInit();
            await this._connectMiddleware();
            await this._render();
        } catch (error: any) {
            console.error('Request error', error);
        } finally {
            await this.page.onFinished();
        }
    }

    private async _connectMiddleware() {
        const middlewares: (Parameters<UseMiddlewareCallback<any, any>>[0])[] = [];
        await this.page.useMiddleware(func => middlewares.push(func));

        try {
            for (const middleware of middlewares) {
                const error = await new Promise(res => {
                    const promise = middleware(this.req, this.res, res);
                    if (promise instanceof Promise) {
                        promise.catch(res);
                    }
                });
                if (error) throw error;
            }
        } catch (error: any) {
            return this._parseError(error);
        }
    }

    private async _render() {
        try {
            const response = await this.page.render(async () => {
                return {} as any;
            });

            if (EvalPage._checkReactElement(response)) {
                this.res.type('html');
                this.res.send(
                    `<!DOCTYPE html>${renderToString(response as any)}`
                );
                return;
            }

            if (typeof response === 'string') {
                this.res.type('text');
                this.res.send(response);
            }

            if (response && typeof response === 'object') {
                this.res.json(response);
            }

        } catch (error: any) {
            return this._parseError(error);
        }
    }

    private _parseError(error: any) {
        if (error instanceof ZodError) {
            error = generateErrorMessage(error.issues);
            this.res.statusCode = 400;
            this.res.type('text');
            this.res.send(error);
            throw error;
        }

        if (typeof error === 'string') {
            this.res.statusCode = 400;
            this.res.type('text');
            this.res.send(error);
            throw error;
        }

        if (error instanceof Error) {
            this.res.statusCode = 500;
            this.res.type('text');
            this.res.send(error.message);
            throw error;
        }

        this.res.sendStatus(500);
        throw error;
    }
}
