import React from 'react';
import {checkReactElement} from './react-utils.js';

export type ReflectFormDataOptions = {
    ignoreFields?: string[];
    noReflectByDefault?: boolean;
}

const DO_REFLECT = 'data-reflect';

export default class ReflectFormData {
    private _indexBodyArray: { [key: string]: number } = {};

    constructor(private _body: any, private _options: ReflectFormDataOptions) {
    }

    public injectRender(value: any) {
        value = Object.assign({}, value);
        value.props = Object.assign({}, value.props);
        this._injectRender(value);
        return value;
    }

    private _injectRender(value: any) {
        const body = this._getBody(value.props.name);

        const allowReflectByDefault = !this._options.noReflectByDefault && value.props[DO_REFLECT] !== false;
        const allowReflect = this._options.noReflectByDefault && value.props[DO_REFLECT];
        if ((allowReflectByDefault || allowReflect) && value.props.value == null) {
            this._reflectData(value, body);
        }

        this._reflectDataDefaultValue(value);
        delete value.props[DO_REFLECT];
        delete value.props.defaultValue;

        if (!value.props.children) return;
        value.props.children = React.Children.toArray(value.props.children).map(child => {
            if (!checkReactElement(child)) return child;
            const clone = Object.assign({}, child) as React.ReactElement;
            clone.props = Object.assign({}, clone.props);
            this._injectRender(clone);
            return clone;
        });

    }

    private _reflectData(value: any, body: any) {
        switch (value.props.type) {
            case 'checkbox':
            case 'radio':
                value.props.checked ??= body === (value.props.value ?? 'on');
                break;
            default:
                value.props.value ??= body;
                break;
        }
    }

    private _reflectDataDefaultValue(value: any) {
        switch (value.props.type) {
            case 'checkbox':
            case 'radio':
                value.props.checked ??= value.props.defaultValue;
                break;
            default:
                value.props.value ??= value.props.defaultValue;
                break;
        }
    }

    private _getBody(name: string) {
        if (this._body[name] instanceof Array) {
            this._indexBodyArray[name] ??= 0;
            return this._body[name][this._indexBodyArray[name]++]?.toString();
        }

        return this._body[name]?.toString();
    }
}
