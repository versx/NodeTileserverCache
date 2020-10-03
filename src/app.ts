'use strict';

import express from 'express';
const app = express();

import * as routes from './routes/index';

// Body parser middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Routing endpoints
app.get('/', routes.getRoot);
app.get('/styles', routes.getStyles);

app.get('/tile/:style/:z/:x/:y/:scale/:format', async (req, res) => await routes.getTile(req, res));
app.get('/static/:style/:lat/:lon/:zoom/:width/:height/:scale/:format', async (req, res) => await routes.getStatic(req, res));

app.get('/staticmap/:template', routes.getStaticMapTemplate);
app.post('/staticmap/:template', routes.postStaticMapTemplate);

app.get('/staticmap', routes.getStaticMap);
app.post('/staticmap', routes.postStaticMap);

app.get('/multistaticmap/:template', routes.getMultiStaticMapTemplate);
app.post('/multistaticmap', routes.postMultiStaticMap);

export default app;