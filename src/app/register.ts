import type BaseLayout from '../base-layout.js';

export const routes: { [key: string]: typeof BaseLayout } = {};

export default function registerPage(layout: any) {
    routes[layout.path] = layout;
}
