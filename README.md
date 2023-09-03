<div align="center">
    <img alt="Logo" src="docs/freedom.jpg" width="360px"/>
    <h1>Class Forms</h1>
</div>

<div align="center">

[![Build](https://github.com/ido-pluto/class-forms/actions/workflows/build.yml/badge.svg)](https://github.com/ido-pluto/class-forms/actions/workflows/build.yml)
[![License](https://badgen.net/badge/color/MIT/green?label=license)](https://www.npmjs.com/package/class-forms)
[![License](https://badgen.net/badge/color/TypeScript/blue?label=types)](https://www.npmjs.com/package/class-forms)
[![Version](https://badgen.net/npm/v/class-forms)](https://www.npmjs.com/package/class-forms)

</div>
<br />

> Simple express base framework for building forms easily and quickly.

## Example Usage

`src/pages/index.tsx`

```tsx
class IndexPage extends BaseLayout {
    static override path = '/';
    showMessage = '';

    override useMiddleware(use: UseMiddlewareCallback<DefaultExtendedRequest, DefaultExtendedResponse>) {
        super.useMiddleware(use);

        this.connectClick(this.buttonClicked);
    }

    buttonClicked() {
        this.showMessage = 'Hello World';
        this.req.session!.counter ??= 0;
        this.req.session!.counter++;
    }

    override render(): Promise<any> {
        return super.render(async () => ({
            title: 'Home',
            content: <>
                {this.showMessage}
                {this.req.session!.counter}
                <button name="click" value="buttonClicked">show info</button>
            </>
        }));
    }
}

registerPage(IndexPage);
```

`src/index.ts`

```ts
import {createApp} from 'class-forms';
import './pages/index.js';

createApp();
```
