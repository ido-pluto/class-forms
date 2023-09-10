import {BaseLayout, DefaultExtendedRequest, DefaultExtendedResponse, registerPage, UseMiddlewareCallback} from 'class-forms';
import React from 'react';

class IndexPage extends BaseLayout {
    static override path = '/';
    showMessage = '';

    override useMiddleware(use: UseMiddlewareCallback<DefaultExtendedRequest, DefaultExtendedResponse>) {
        super.useMiddleware(use);

        this.connectClick(this.buttonClicked);
    }

    async buttonClicked() {
        const showText = await this.getFiled('showText');
        this.showMessage = `You clicked the button! ${showText}`;
        this.req.session!.counter ??= 0;
        this.req.session!.counter++;
        if (Math.random() > 0.8) {
            throw new Error('Random error');
        }
    }

    override render(): Promise<any> {
        return super.render(async () => ({
            title: 'Home',
            content: <>
                <p>Welcome to the home page!</p>
                <p>{this.showMessage}</p>

                <p>click count: {this.req.session!.counter}</p>

                {this.error && <p style={{color: 'red'}}>{this.error}</p>}

                <input type="text" name="showText" placeholder="Add text" autoFocus data-reflect={true}/>
                <input type="checkbox" name="checkThis" data-reflect={true}/>
                <button name="click" value="buttonClicked">show info</button>
            </>
        }));
    }
}

registerPage(IndexPage);
