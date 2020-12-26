'use strict';

import express from 'express';
const app = express();
import path from 'path';

import * as routes from './routes/index';
/*
import { ImageMagick } from './services/image-magick';
(async () => {
    new ImageMagick().generate();
})();
*/

// Static paths
app.use(express.static(path.resolve(__dirname, '../static')));

// Body parser middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.set('view engine', 'ejs');
app.set('views', path.resolve(__dirname, 'views'));

// Routing endpoints
app.get('/', routes.getRoot);
app.get('/styles', routes.getStyles);

app.get('/tile/:style/:z/:x/:y/:scale/:format', routes.getTile);
app.get('/static/:style/:lat/:lon/:zoom/:width/:height/:scale/:format', routes.getStatic);

app.get('/staticmap/:template', routes.getStaticMapTemplate);
app.post('/staticmap/:template', routes.postStaticMapTemplate);

app.get('/staticmap', routes.getStaticMap);
app.post('/staticmap', routes.postStaticMap);

app.get('/multistaticmap/:template', routes.getMultiStaticMapTemplate);
app.post('/multistaticmap', routes.postMultiStaticMap);

export default app;