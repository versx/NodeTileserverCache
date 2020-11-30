'use strict';

require('dotenv').config({ path: './src/.env' });
import app from './app';
import fs from 'fs';
import cluster from 'cluster';

import * as globals from './data/globals';
import { CacheCleaner } from './services/cache-cleaner';
import './services/logger';

// TODO: Test tiles
// TODO: Cleanup code, separate into classes

const createDirectories = () => {
    if (!fs.existsSync(globals.CacheDir)) {
        fs.mkdir(globals.CacheDir, (err) => {
            if (err) {
                console.error('Failed to create directory:', globals.CacheDir);
            }
        });
    }
    if (!fs.existsSync(globals.TileCacheDir)) {
        fs.mkdir(globals.TileCacheDir, (err) => {
            if (err) {
                console.error('Failed to create directory:', globals.TileCacheDir);
            }
        });
    }
    if (!fs.existsSync(globals.StaticCacheDir)) {
        fs.mkdir(globals.StaticCacheDir, (err) => {
            if (err) {
                console.error('Failed to create directory:', globals.StaticCacheDir);
            }
        });
    }
    if (!fs.existsSync(globals.StaticMultiCacheDir)) {
        fs.mkdir(globals.StaticMultiCacheDir, (err) => {
            if (err) {
                console.error('Failed to create directory:', globals.StaticMultiCacheDir);
            }
        });
    }
    if (!fs.existsSync(globals.StaticWithMarkersCacheDir)) {
        fs.mkdir(globals.StaticWithMarkersCacheDir, (err) => {
            if (err) {
                console.error('Failed to create directory:', globals.StaticWithMarkersCacheDir);
            }
        });
    }
    if (!fs.existsSync(globals.MarkerCacheDir)) {
        fs.mkdir(globals.MarkerCacheDir, (err) => {
            if (err) {
                console.error('Failed to create directory:', globals.MarkerCacheDir);
            }
        });
    }
};

if (cluster.isMaster) {
    console.info(`[Cluster] Master ${process.pid} is running`);

    // Fork workers
    const clusters = parseInt(process.env.CLUSTERS || '2');
    for (let i = 0; i < clusters; i++) {
        cluster.fork();
    }

    // If worker gets disconnected, start new one. 
    cluster.on('disconnect', function (worker) {
        console.error(`[Cluster] Worker disconnected with id ${worker.id}`);
        const newWorker = cluster.fork();
        console.info('[Cluster] New worker started with process id %s', newWorker.process.pid);
    });

    cluster.on('online', function (worker) {
        console.info(`[Cluster] New worker online with id ${worker.id}`);
    });

    cluster.on('exit', (worker, code, signal) => {
        console.warn(`[Cluster] Worker ${worker.process.pid} died with error code ${code}`);
    });

    // Create cache directories
    createDirectories();

    // Start cache cleaners
    new CacheCleaner(globals.TileCacheDir,
        parseInt(process.env.TILE_CACHE_MAX_AGE_MINUTES || '10080'),
        parseInt(process.env.TILE_CACHE_DELAY_SECONDS || '3600')
    );
    new CacheCleaner(globals.StaticCacheDir,
        parseInt(process.env.STATIC_CACHE_MAX_AGE_MINUTES || '10080'),
        parseInt(process.env.STATIC_CACHE_DELAY_SECONDS || '3600')
    );
    new CacheCleaner(globals.StaticMultiCacheDir,
        parseInt(process.env.STATIC_MULTI_CACHE_MAX_AGE_MINUTES || '10080'),
        parseInt(process.env.STATIC_MULTI_CACHE_DELAY_SECONDS || '3600')
    );
    new CacheCleaner(globals.StaticWithMarkersCacheDir,
        parseInt(process.env.STATIC_MARKER_CACHE_MAX_AGE_MINUTES || '10080'),
        parseInt(process.env.STATIC_MARKER_CACHE_DELAY_SECONDS || '3600')
    );
    new CacheCleaner(globals.MarkerCacheDir,
        parseInt(process.env.MARKER_CACHE_MAX_AGE_MINUTES || '10080'),
        parseInt(process.env.MARKER_CACHE_DELAY_SECONDS || '3600')
    );
} else {
    // Start listener
    const host: string = process.env.INTERFACE || '0.0.0.0';
    const port: number = parseInt(process.env.PORT || '43200');
    app.listen(port, host, () => console.info(`Listening on port ${port}...`));
}