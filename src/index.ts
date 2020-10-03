'use strict';

require('dotenv').config({ path: './src/.env' });
import app from './app';
import cluster from 'cluster';

// TODO: Test tiles
// TODO: Fix combineImagesGrid
// TODO: Cleanup code, separate into classes

if (cluster.isMaster) {
    console.log(`[Cluster] Master ${process.pid} is running`);

    // Fork workers
    const clusters = parseInt(process.env.CLUSTERS || '2');
    for (let i = 0; i < clusters; i++) {
        cluster.fork();
    }

    // If worker gets disconnected, start new one. 
    cluster.on('disconnect', function (worker) {
        console.error(`[Cluster] Worker disconnected with id ${worker.id}`);
        const newWorker = cluster.fork();
        console.log('[Cluster] New worker started with process id %s', newWorker.process.pid);
    });

    cluster.on('online', function (worker) {
        console.log(`[Cluster] New worker online with id ${worker.id}`);
    });

    cluster.on('exit', (worker, code, signal) => {
        console.log(`[Cluster] Worker ${worker.process.pid} died with error code ${code}`);
    });
} else {
    // Start listener
    const host: string = process.env.INTERFACE || '0.0.0.0';
    const port: number = parseInt(process.env.PORT || '43200');
    app.listen(port, host, () => console.log(`Listening on port ${port}...`));
}