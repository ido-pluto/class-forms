import type BaseLayout from '../base-layout.js';

export const routes: { [key: string]: typeof BaseLayout } = {};
export const files: { [key: string]: string } = {};

/**
 * Register a page to the app
 * @param layout
 */
export default function registerPage(layout: any) {
    routes[layout.path] = layout;
}
