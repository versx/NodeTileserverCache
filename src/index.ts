'use strict';

require('dotenv').config({ path: './src/.env' });
import app from './app';

// TODO: Test tiles
// TODO: Cleanup code, separate into classes

// Start listener
const host: string = process.env.INTERFACE || '0.0.0.0';
const port: number = parseInt(process.env.PORT || '43200');
app.listen(port, host, () => console.log(`Listening on port ${port}...`));