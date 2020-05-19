'use strict';

import * as fs from 'fs';
import * as path from 'path';
import express, { Request, Response } from 'express';
const app = express();
const btoa = require('btoa');

import { CacheCleaner } from './cache-cleaner';
import { Drawable } from './models/drawable';
import { Marker as _Marker, Marker } from './models/marker';
import { Polygon as _Polygon, Polygon } from './models/polygon';
import * as utils from './utils';

//import { StaticMap } from './models/staticmap';

require('dotenv').config({ path: './src/.env' });

// TODO: Test tiles
// TODO: Templates
// TODO: Multi static map
// TODO: Change to post requests containing static map template data
// TODO: Cleanup code
// TODO: Eslint

// Cache directory paths
const CacheDir = path.resolve(__dirname, '../Cache');
const TileCacheDir = path.resolve(CacheDir, 'Tile');
const StaticCacheDir = path.resolve(CacheDir, 'Static');
const StaticWithMarkersCacheDir = path.resolve(CacheDir, 'StaticWithMarkers');
const MarkerCacheDir = path.resolve(CacheDir, 'Marker');

// Statistics
const tileHitRatio: Dictionary = {};
const staticHitRatio: Dictionary = {};
const staticMarkerHitRatio: Dictionary = {};
const markerHitRatio: Dictionary = {};

const validFormats = [ 'png', 'jpg' ];

interface Dictionary {
    [key: string]: { hit: number, miss: number };
}

// Create cache directories
createDirectories();

// Start cache file cleaners
startCacheCleaners();

// Start web server
startHttpServer();

function startHttpServer() {
    // View engine
    //app.set('view engine', 'mustache');
    //app.set('views', path.resolve(__dirname, 'views'));
    //app.engine('mustache', mustacheExpress());

    // Body parser middlewares
    app.use(express.json());
    app.use(express.urlencoded({ extended: false, limit: '50mb' }));

    // Routing endpoints
    app.get('/', getRoot);
    app.get('/styles', getStyles);
    app.get('/tile/:style/:z/:x/:y/:scale/:format', async (req, res) => await getTile(req, res));
    app.get('/static/:style/:lat/:lon/:zoom/:width/:height/:scale/:format', async (req, res) => await getStatic(req, res));

    // Start listener
    const host: any = process.env.INTERFACE || '0.0.0.0';
    const port: any = process.env.PORT || 43200;
    app.listen(port, host, () => console.log(`Listening on port ${port}...`));
}

function getRoot(req: Request, res: Response) {
    let tileCacheHtml = '';
    const tileHitKeys = Object.keys(tileHitRatio);
    if (tileHitKeys) {
        tileHitKeys.forEach((key: string) => {
            const style = tileHitRatio[key];
            const hit = style.hit;
            const total = style.miss + style.hit;
            const percentage = Math.round(hit / total * 100);
            tileCacheHtml += `<h3 align="center">${key}: ${hit}/${total} (${percentage}%)</h3>`;
        });
    }
    let staticCacheHtml = '';
    const staticHitKeys = Object.keys(staticHitRatio);
    if (staticHitKeys) {
        staticHitKeys.forEach((key: string) => {
            const style = staticHitRatio[key];
            const hit = style.hit;
            const total = style.miss + style.hit;
            const percentage = Math.round(hit / total * 100);
            staticCacheHtml += `<h3 align="center">${key}: ${hit}/${total} (${percentage}%)</h3>`;
        });
    }
    let staticMarkerHtml = '';
    const staticMarkerHitKeys = Object.keys(staticMarkerHitRatio);
    if (staticMarkerHitKeys) {
        staticMarkerHitKeys.forEach((key: string) => {
            const style = staticMarkerHitRatio[key];
            const hit = style.hit;
            const total = style.miss + style.hit;
            const percentage = Math.round(hit / total * 100);
            staticMarkerHtml += `<h3 align="center">${key}: ${hit}/${total} (${percentage}%)</h3>`;
        });
    }
    let markerCacheHtml = '';
    const markerHitKeys = Object.keys(markerHitRatio);
    if (markerHitKeys) {
        markerHitKeys.forEach((key: string) => {
            const style = markerHitRatio[key];
            const hit = style.hit;
            const total = style.miss + style.hit;
            const percentage = Math.round(hit / total * 100);
            markerCacheHtml += `<h3 align="center">${key}: ${hit}/${total} (${percentage}%)</h3>`;
        });
    }
    let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8"/>
        <title>NodeTileserver Cache</title>
    </head>
    <body>
        <h1 align="center">Node Tileserver Cache</h1><br>
        <br><h2 align="center">Tiles Cache Hit-Rate (since restart)</h2>
        ${tileCacheHtml}
        <br><h2 align="center">Static Map Cache Hit-Rate (since restart)</h2>
        ${staticCacheHtml}
        <br><h2 align="center">Static Map with Marker Cache Hit-Rate (since restart)</h2>
        ${staticMarkerHtml}
        <br><h2 align="center">Marker Cache Hit-Rate (since restart)</h2>
        ${markerCacheHtml}
    </body>
    `;
    res.send(html);
}

async function getStyles(req: Request, res: Response) {
    const url = process.env.TILE_SERVER_URL + '/styles.json';
    const data = await utils.getData(url);
    const obj = JSON.parse(data);
    const list = obj.map((x: any) => x.id);
    res.json(list);
}

async function getTile(req: Request, res: Response) {
    console.log('Tile:', req.params);
    const style = req.params.style;
    const z = req.params.z;
    const x = parseFloat(req.params.x);
    const y = parseFloat(req.params.y);
    const scale = parseInt(req.params.scale);
    const format = req.params.format;
    const fileName = path.resolve(TileCacheDir, `${style}-${z}-${x}-${y}-${scale}.${format}`);
    if (scale >= 1 && validFormats.includes(format)) {
        if (await utils.fileExists(fileName)) {
            utils.touch(fileName);
            //tileHitRatio[style].hit++;
            if (tileHitRatio[style]) {
                tileHitRatio[style].hit++;
            } else { 
                tileHitRatio[style] = {
                    hit: 1,
                    miss: 0
                };
            }
        } else {
            const scaleString = scale === 1 ? '' : `@${scale}x`;
            const tileUrl = `${process.env.TILE_SERVER_URL}/styles/${style}/${z}/${x}/${y}/${scaleString}.${format}`;
            await utils.downloadFile(tileUrl, fileName);
            //tileHitRatio[style].miss++;
            if (tileHitRatio[style]) {
                tileHitRatio[style].miss++;
            } else { 
                tileHitRatio[style] = {
                    hit: 0,
                    miss: 1
                };
            }
        }
    } else {
        // Failed
        res.send('Error'); // Bad request
    }

    res.setHeader('Cache-Control', 'max-age=604800, must-revalidate');
    console.log(`Serving Tile: ${style}-${z}-${x}-${y}-${scale}.${format}`);
    res.sendFile(fileName, (error: Error) => {
        if (error) {
            console.error('[ERROR] Failed to serve tile:', error);
            return;
        }
    });

    console.log('[STATS] Tile:', tileHitRatio);
}

//http://10.0.0.2:43200/static/klokantech-basic/34.01/-117.01/15/300/175/1/png
//http://tiles.example.com:8080/static/klokantech-basic/{0}/{1}/15/300/175/1/png
//http://10.0.0.2:43200/static/basic-preview/47.404041/8.539621/15/300/175/1/png?markers=[{%22url%22:%22https://s.gravatar.com/avatar/c492b68b9ec45b29d257bd8a57ffc7f8%22,%22height%22:32,%22width%22:32,%22x_offset%22:0,%22y_offset%22:0,%22latitude%22:47.404041,%22longitude%22:8.539621}]
//http://10.0.1.55:43200/static/klokantech-basic/8.68641/47.52305/15/300/175/1/png?markers=[{"url":"https://s.gravatar.com/avatar/c492b68b9ec45b29d257bd8a57ffc7f8","height":32,"width":32,"x_offset":0,"y_offset":0,"latitude":47.52305,"longitude":8.686411}]&polygons=[{"fill_color":"rgba(100.0%,0.0%,0.0%,0.5)","stroke_color":"black","stroke_width":1,"path":"[[8.685018,47.523804],[8.685686,47.522246],[8.687436,47.522314],[8.686919,47.523887],[8.685018,47.523804]]"}]
//http://127.0.0.1:43200/static/klokantech-basic/47.52305/8.68641/15/300/175/1/png?markers=[{%22url%22:%22https://s.gravatar.com/avatar/c492b68b9ec45b29d257bd8a57ffc7f8%22,%22height%22:32,%22width%22:32,%22x_offset%22:0,%22y_offset%22:0,%22latitude%22:47.52305,%22longitude%22:8.686411}]&polygons=[{%22fill_color%22:%22rgba(100.0%,0.0%,0.0%,0.5)%22,%22stroke_color%22:%22black%22,%22stroke_width%22:1,%22path%22:%22[[47.523804,8.685018],[47.522246,8.685686],[47.522314,8.687436],[47.523887,8.686919],[47.523804,8.685018]]%22}]
async function getStatic(req: Request, res: Response) {
    console.log('Static:', req.params);
    const style = req.params.style;
    const lat = parseFloat(req.params.lat);
    const lon = parseFloat(req.params.lon);
    const zoom = parseInt(req.params.zoom);
    const width = parseInt(req.params.width);
    const height = parseInt(req.params.height);
    const scale = parseInt(req.params.scale);
    const format = req.params.format;
    const fileName = path.resolve(StaticCacheDir, `${style}-${lat}-${lon}-${zoom}-${width}-${height}-${scale}.${format}`);
    //const staticMap = Object.assign(new StaticMap(), req.params);
    //console.log("StaticMap Object:", staticMap);
    if (scale >= 1 && validFormats.includes(format)) {
        // Valid format, check if static file already exists
        if (await utils.fileExists(fileName)) {
            // Static file exists, update last modified time
            utils.touch(fileName);
            //staticHitRatio[style].hit++;
            if (staticHitRatio[style]) {
                staticHitRatio[style].hit++;
            } else {
                staticHitRatio[style] = {
                    hit: 1,
                    miss: 0
                };
            }
        } else {
            // Static file does not exist, download from tileserver
            const scaleString = scale === 1 ? '' : `@${scale}x`;
            const tileUrl = `${process.env.TILE_SERVER_URL}/styles/${style}/static/${lon},${lat},${zoom}/${width}x${height}${scaleString}.${format}`;
            await utils.downloadFile(tileUrl, fileName);
            //staticHitRatio[style].miss++;
            if (staticHitRatio[style]) {
                staticHitRatio[style].miss++;
            } else {
                staticHitRatio[style] = {
                    hit: 0,
                    miss: 1
                };
            }
        }

        let drawables: Array<Drawable> = [];
        console.log("Query:", req.query);
        parseMarkers(req.query.markers?.toString())
            .forEach((marker: Marker) =>  drawables.push(marker));
        parsePolygons(req.query.polygons?.toString())
            .forEach((polygon: Polygon) => drawables.push(polygon));

        console.log("Drawable Objects:", drawables);
        if (drawables.length > 0) {
            const hashes = drawables.map(drawable => drawable.hashString);
            const fileNameWithMarker = path.resolve(StaticWithMarkersCacheDir, `${style}-${lat}-${lon}-${zoom}-${width}-${height}-${hashes.join(',')}-${scale}.${format}`);
            if (await utils.fileExists(fileNameWithMarker)) {
                utils.touch(fileName);
                //staticMarkerHitRatio[style].hit++;
                if (staticMarkerHitRatio[style]) {
                    staticMarkerHitRatio[style].hit++;
                } else {
                    staticMarkerHitRatio[style] = {
                        hit: 1,
                        miss: 0
                    };
                }
            } else {
                let hashes = '';
                let fileNameWithMarkerFull = fileName;
                for (var i = 0; i < drawables.length; i++) {
                    const drawable = drawables[i];
                    hashes += drawable.hashString;
                    const fileNameWithMarker = path.resolve(StaticWithMarkersCacheDir, `${style}-${lat}-${lon}-${zoom}-${width}-${height}-${hashes}-${scale}.${format}`);
                    if (await utils.fileExists(fileNameWithMarker)) {
                        // Static with marker file exists, touch for last modified timestamp.
                        utils.touch(fileName);
                        //staticMarkerHitRatio[style].hit++;
                        if (staticMarkerHitRatio[style]) {
                            staticMarkerHitRatio[style].hit++;
                        } else {
                            staticMarkerHitRatio[style] = {
                                hit: 1,
                                miss: 0
                            };
                        }
                    } else {
                        // Static with marker file does not exist, check if marker downloaded.
                        console.log(`Building Static: ${style}-${lat}-${lon}-${zoom}-${width}-${height}-${hashes}-${scale}.${format}`);
                        if (drawable instanceof Marker) {
                            const marker = Object.assign(new Marker(), drawable);
                            const markerUrlEncoded = utils.md5(marker.url);
                            const markerFileName = path.resolve(MarkerCacheDir, markerUrlEncoded);
                            if (await utils.fileExists(markerFileName)) {
                                // Marker already downloaded, touch for last modified timestamp.
                                utils.touch(fileName);
                                //markerHitRatio[style].hit++;
                                if (markerHitRatio[style]) {
                                    markerHitRatio[style].hit++;
                                } else {
                                    markerHitRatio[style] = {
                                        hit: 1,
                                        miss: 0
                                    };
                                }
                            } else {
                                // Download marker to cache for future use.
                                console.log(`Loading Marker: ${marker.url}`);
                                await utils.downloadFile(marker.url, markerFileName);
                                //markerHitRatio[style].miss++;
                                if (markerHitRatio[style]) {
                                    markerHitRatio[style].miss++;
                                } else {
                                    markerHitRatio[style] = {
                                        hit: 0,
                                        miss: 1
                                    };
                                }
                            }
                            try {
                                await utils.combineImages(fileNameWithMarkerFull, markerFileName, fileNameWithMarker, marker, scale, lat, lon, zoom);
                            } catch (e) {
                                console.error('[ERROR]', e);
                            }
                        } else if (drawable instanceof Polygon) {
                            const polygon = Object.assign(new Polygon(), drawable);
                            await utils.drawPolygon(fileNameWithMarkerFull, fileNameWithMarker, polygon, scale, lat, lon, zoom, width, height);
                        }
                        //staticMarkerHitRatio[style].miss++;
                        if (staticMarkerHitRatio[style]) {
                            staticMarkerHitRatio[style].miss++;
                        } else {
                            staticMarkerHitRatio[style] = {
                                hit: 0,
                                miss: 1
                            };
                        }
                    }
                    hashes += ',';
                    fileNameWithMarkerFull = fileNameWithMarker;
                }
            }
            // Serve static file
            res.setHeader('Cache-Control', 'max-age=604800, must-revalidate');
            console.log(`Serving Static: ${style}-${lat}-${lon}-${zoom}-${width}-${height}-${scale}.${format}`);
            res.sendFile(fileNameWithMarker, (err: Error) => {
                if (err) {
                    console.error('[ERROR] Failed to send static file:', err);
                    return;
                }
            });
        } else {
            // Serve static file
            res.setHeader('Cache-Control', 'max-age=604800, must-revalidate');
            console.log(`Serving Static: ${style}-${lat}-${lon}-${zoom}-${width}-${height}-${scale}.${format}`);
            res.sendFile(fileName, (err: Error) => {
                if (err) {
                    console.error('[ERROR] Failed to send static file:', err);
                    return;
                }
            });
        }
    } else {
        // TODO: Throw error;
        res.send('Error');
        return;
    }

    console.log('[STATS] Static:', staticHitRatio, 'Static Marker:', staticMarkerHitRatio);
}

// TODO: Make generics method
function parseMarkers(markersQuery: string): Marker[] {
    const list: Marker[] = [];
    const markersJson = (markersQuery || '')?.replace(/%22/g, '"');
    if (markersJson) {
        const markers = JSON.parse(markersJson);
        if (markers.length > 0) {
            markers.forEach((marker: Marker) => {
                list.push(Object.assign(new Marker(), marker));
            });
        }
    }
    return list;
}

function parsePolygons(polygonsQuery: string): Polygon[] {
    const list: Polygon[] = [];
    const polygonsJson = (polygonsQuery || '')?.replace(/%22/g, '"');
    if (polygonsJson) {
        const polygons = JSON.parse(polygonsJson);
        if (polygons.length > 0) {
            polygons.forEach((polygon: Polygon) => {
                list.push(Object.assign(new Polygon(), polygon));
            });
        }
    }
    return list;
}

// Utilities
function createDirectories() {
    if (!fs.existsSync(CacheDir)) {
        fs.mkdir(CacheDir, (err) => {
            if (err) {
                console.error('[ERROR] Failed to create directory:', CacheDir);
            }
        });
    }
    if (!fs.existsSync(TileCacheDir)) {
        fs.mkdir(TileCacheDir, (err) => {
            if (err) {
                console.error('[ERROR] Failed to create directory:', TileCacheDir);
            }
        });
    }
    if (!fs.existsSync(StaticCacheDir)) {
        fs.mkdir(StaticCacheDir, (err) => {
            if (err) {
                console.error('[ERROR] Failed to create directory:', StaticCacheDir);
            }
        });
    }
    if (!fs.existsSync(StaticWithMarkersCacheDir)) {
        fs.mkdir(StaticWithMarkersCacheDir, (err) => {
            if (err) {
                console.error('[ERROR] Failed to create directory:', StaticWithMarkersCacheDir);
            }
        });
    }
    if (!fs.existsSync(MarkerCacheDir)) {
        fs.mkdir(MarkerCacheDir, (err) => {
            if (err) {
                console.error('[ERROR] Failed to create directory:', MarkerCacheDir);
            }
        });
    }
}

function startCacheCleaners() {
    const tileCacheCleaner = new CacheCleaner(TileCacheDir,
        parseInt(process.env.TILE_CACHE_MAX_AGE_MINUTES || '10080'),
        parseInt(process.env.TILE_CACHE_DELAY_SECONDS || '3600'));
    const staticCacheCleaner = new CacheCleaner(StaticCacheDir,
        parseInt(process.env.STATIC_CACHE_MAX_AGE_MINUTES || '10080'),
        parseInt(process.env.STATIC_CACHE_DELAY_SECONDS || '3600'));
    const staticMarkerCacheCleaner = new CacheCleaner(StaticWithMarkersCacheDir,
        parseInt(process.env.STATIC_MARKER_CACHE_MAX_AGE_MINUTES || '10080'),
        parseInt(process.env.STATIC_MARKER_CACHE_DELAY_SECONDS || '3600'));
    const markerCacheCleaner = new CacheCleaner(MarkerCacheDir,
        parseInt(process.env.MARKER_CACHE_MAX_AGE_MINUTES || '10080'),
        parseInt(process.env.MARKER_CACHE_DELAY_SECONDS || '3600'));
}