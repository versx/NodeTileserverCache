'use strict';

import express from 'express';
const app = express();
import path from 'path';

import { RouteController } from './routes/index';

// Static paths
app.use(express.static(path.resolve(__dirname, '../static')));

// Body parser middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Template engine
app.set('view engine', 'ejs');
app.set('views', path.resolve(__dirname, 'views'));

// Routing endpoints
const router = new RouteController();
app.get('/', router.getRoot);
app.get('/styles', router.getStyles);

app.get('/tile/:style/:z/:x/:y/:scale/:format', router.getTile);
app.get('/static/:style/:lat/:lon/:zoom/:width/:height/:scale/:format', router.getStatic);

app.get('/staticmap/:template', router.getStaticMapTemplate);
app.post('/staticmap/:template', router.postStaticMapTemplate);

app.get('/staticmap', router.getStaticMap);
app.post('/staticmap', router.postStaticMap);
app.get('/staticmap/pregenerated/:id', router.getPregeneratedStaticMap);

app.get('/multistaticmap/:template', router.getMultiStaticMapTemplate);
app.post('/multistaticmap', router.postMultiStaticMap);
app.get('/multistaticmap/pregenerated/:id', router.getPregeneratedMultiStaticMap);

export default app;