'use strict';

require('dotenv').config({ path: './src/.env' });
import app from './app';

// TODO: Test tiles
// TODO: Templates
// TODO: Multi static map
// TODO: Change to post requests containing static map template data
// TODO: Cleanup code
// TODO: Eslint

// Start listener
const host: any = process.env.INTERFACE || '0.0.0.0';
const port: any = process.env.PORT || 43200;
app.listen(port, host, () => console.log(`Listening on port ${port}...`));