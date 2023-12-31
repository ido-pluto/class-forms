import express from 'express';
import {files, routes} from './register.js';
import {EvalPage} from './eval-page.js';

export type ClassFormsAppOptions = {
    listenPORT: number;
}
export default class ClassFormsApp {

    public constructor(public app = express(), public options: ClassFormsAppOptions = {listenPORT: 3000}) {
    }

    public async init() {
        // init static files
        this.app.use((req, res, next) => {
            files[req.path] ? res.sendFile(files[req.path]) : next();
        });

        // init routes
        for (const [route, cls] of Object.entries(routes)) {
            this.app.all(route, async (req, res, next) => {
                const evalPage = new EvalPage(req, res, next, cls as any);
                await evalPage.flow();
            });
        }
    }

    public staticDirectory(name = 'public', path = '/') {
        this.app.use(path, express.static(name));
    }

    public listen() {
        this.app.listen(this.options.listenPORT, () => {
            console.log(`App listening on port ${this.options.listenPORT}`);
        });
    }
}
