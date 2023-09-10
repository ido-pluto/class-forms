import {UseMiddlewareCallback, UseMiddlewareOptions} from '../base-layout.js';
import formidableMiddleware from './formidable-middleware.js';
import bodyParser from 'body-parser';

export default function formsBodyParser<T, K>(use: UseMiddlewareCallback<T, K>, formsBodyParser: UseMiddlewareOptions['bodyParser'], encodeFormType: 'form-data' | 'urlencoded') {
    if (!formsBodyParser) return encodeFormType;
    const getOptions = (options: any) => options === true ? undefined : options;


    if (formsBodyParser.formData) {
        encodeFormType = 'form-data';
        use(formidableMiddleware(getOptions(formsBodyParser.formData)));
    }

    if (formsBodyParser.json) {
        use(bodyParser.json(getOptions(formsBodyParser.json)));
    }

    if (formsBodyParser.urlencoded) {
        encodeFormType = 'urlencoded';
        use(bodyParser.urlencoded({
            extended: true,
            ...getOptions(formsBodyParser.urlencoded)
        }));
    }

    if (formsBodyParser.text) {
        use(bodyParser.text(getOptions(formsBodyParser.text)));
    }

    if (formsBodyParser.raw) {
        use(bodyParser.raw(getOptions(formsBodyParser.raw)));
    }

    return encodeFormType;
}
