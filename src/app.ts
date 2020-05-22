'use strict';

import express from 'express';
const app = express();

import * as routes from './routes/index';

// View engine
//app.set('view engine', 'mustache');
//app.set('views', path.resolve(__dirname, 'views'));
//app.engine('mustache', mustacheExpress());

// Body parser middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Routing endpoints
app.get('/', routes.getRoot);
app.get('/styles', routes.getStyles);
app.get('/tile/:style/:z/:x/:y/:scale/:format', async (req, res) => await routes.getTile(req, res));
app.get('/static/:style/:lat/:lon/:zoom/:width/:height/:scale/:format', async (req, res) => await routes.getStatic(req, res));

// Start cache cleaners
routes.startCacheCleaners();

export default app;