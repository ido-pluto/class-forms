import express from 'express';
import {routes} from './register.js';
import {EvalPage} from './eval-page.js';

export default function createApp(app = express(), listenPORT: number | null = 3000) {
    for (const [route, cls] of Object.entries(routes)) {
        app.all(route, async (req, res, next) => {
            const evalPage = new EvalPage(req, res, next, cls as any);
            await evalPage.flow();
        });
    }

    if (listenPORT) {
        app.listen(listenPORT, () => {
            console.log(`App listening on port ${listenPORT}`);
        });
    }

    return app;
}
