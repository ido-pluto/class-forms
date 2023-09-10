import {ClassFormsApp} from 'class-forms';
import './pages/index.js';

const app = new ClassFormsApp();
await app.init();

app.listen();
