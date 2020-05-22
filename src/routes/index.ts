import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import Mustache from 'mustache';

import { CacheCleaner } from '../cache-cleaner';
import { HitStats } from '../stats';
import * as utils from '../utils';
import { CombineDirection } from '../data/combine-direction';
import { Drawable } from '../models/drawable';
import { Grid } from '../models/grid';
import { Marker } from '../models/marker';
import { MultiStaticMap } from '../models/multi-staticmap';
import { Polygon } from '../models/polygon';
import { StaticMap } from '../models/staticmap';

const ValidFormats = [ 'png', 'jpg' ];

// Cache directory paths
const CacheDir = path.resolve(__dirname, '../../Cache');
const TileCacheDir = path.resolve(CacheDir, 'Tile');
const StaticCacheDir = path.resolve(CacheDir, 'Static');
const StaticMultiCacheDir = path.resolve(CacheDir, 'StaticMulti');
const StaticWithMarkersCacheDir = path.resolve(CacheDir, 'StaticWithMarkers');
const MarkerCacheDir = path.resolve(CacheDir, 'Marker');

const TemplatesDir = path.resolve(__dirname, '../../templates');

/**
 * GET /
 */
export const getRoot = (req: Request, res: Response): void => {
    let tileCacheHtml = '';
    const tileHitKeys = Object.keys(HitStats.tileHitRatio);
    if (tileHitKeys) {
        tileHitKeys.forEach((key: string) => {
            const style = HitStats.tileHitRatio[key];
            const hit = style.hit;
            const total = style.miss + style.hit;
            const percentage = Math.round(hit / total * 100);
            tileCacheHtml += `<h3 align="center">${key}: ${hit}/${total} (${percentage}%)</h3>`;
        });
    }
    let staticCacheHtml = '';
    const staticHitKeys = Object.keys(HitStats.staticHitRatio);
    if (staticHitKeys) {
        staticHitKeys.forEach((key: string) => {
            const style = HitStats.staticHitRatio[key];
            const hit = style.hit;
            const total = style.miss + style.hit;
            const percentage = Math.round(hit / total * 100);
            staticCacheHtml += `<h3 align="center">${key}: ${hit}/${total} (${percentage}%)</h3>`;
        });
    }
    let staticMarkerHtml = '';
    const staticMarkerHitKeys = Object.keys(HitStats.staticMarkerHitRatio);
    if (staticMarkerHitKeys) {
        staticMarkerHitKeys.forEach((key: string) => {
            const style = HitStats.staticMarkerHitRatio[key];
            const hit = style.hit;
            const total = style.miss + style.hit;
            const percentage = Math.round(hit / total * 100);
            staticMarkerHtml += `<h3 align="center">${key}: ${hit}/${total} (${percentage}%)</h3>`;
        });
    }
    let markerCacheHtml = '';
    const markerHitKeys = Object.keys(HitStats.markerHitRatio);
    if (markerHitKeys) {
        markerHitKeys.forEach((key: string) => {
            const style = HitStats.markerHitRatio[key];
            const hit = style.hit;
            const total = style.miss + style.hit;
            const percentage = Math.round(hit / total * 100);
            markerCacheHtml += `<h3 align="center">${key}: ${hit}/${total} (${percentage}%)</h3>`;
        });
    }
    const html = `
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
};

/**
 * GET /styles
 */
export const getStyles = async (req: Request, res: Response): Promise<void> => {
    const url = process.env.TILE_SERVER_URL + '/styles.json';
    const data = await utils.getData(url);
    const obj = JSON.parse(data);
    // TODO: Use styles model/interface instead of Record<string, unknown>
    const list = obj.map((x: Record<string, unknown>) => x.id);
    res.json(list);
};

/**
 * GET /tile
 */
export const getTile = async (req: Request, res: Response): Promise<void> => {
    console.log('Tile:', req.params);
    const style = req.params.style;
    const z = req.params.z;
    const x = parseFloat(req.params.x);
    const y = parseFloat(req.params.y);
    const scale = parseInt(req.params.scale);
    const format = req.params.format;
    const fileName = path.resolve(TileCacheDir, `${style}-${z}-${x}-${y}-${scale}.${format}`);
    if (scale >= 1 && ValidFormats.includes(format)) {
        if (await utils.fileExists(fileName)) {
            utils.touch(fileName);
            //tileHitRatio[style].hit++;
            if (HitStats.tileHitRatio[style]) {
                HitStats.tileHitRatio[style].hit++;
            } else { 
                HitStats.tileHitRatio[style] = {
                    hit: 1,
                    miss: 0
                };
            }
        } else {
            const scaleString = scale === 1 ? '' : `@${scale}x`;
            const tileUrl = `${process.env.TILE_SERVER_URL}/styles/${style}/${z}/${x}/${y}/${scaleString}.${format}`;
            await utils.downloadFile(tileUrl, fileName);
            //tileHitRatio[style].miss++;
            if (HitStats.tileHitRatio[style]) {
                HitStats.tileHitRatio[style].miss++;
            } else { 
                HitStats.tileHitRatio[style] = {
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

    console.log('[STATS] Tile:', HitStats.tileHitRatio);
};

//http://10.0.0.2:43200/static/klokantech-basic/34.01/-117.01/15/300/175/1/png
//http://tiles.example.com:8080/static/klokantech-basic/{0}/{1}/15/300/175/1/png
//http://10.0.0.2:43200/static/basic-preview/47.404041/8.539621/15/300/175/1/png?markers=[{%22url%22:%22https://s.gravatar.com/avatar/c492b68b9ec45b29d257bd8a57ffc7f8%22,%22height%22:32,%22width%22:32,%22x_offset%22:0,%22y_offset%22:0,%22latitude%22:47.404041,%22longitude%22:8.539621}]
//http://10.0.1.55:43200/static/klokantech-basic/8.68641/47.52305/15/300/175/1/png?markers=[{"url":"https://s.gravatar.com/avatar/c492b68b9ec45b29d257bd8a57ffc7f8","height":32,"width":32,"x_offset":0,"y_offset":0,"latitude":47.52305,"longitude":8.686411}]&polygons=[{"fill_color":"rgba(100.0%,0.0%,0.0%,0.5)","stroke_color":"black","stroke_width":1,"path":"[[8.685018,47.523804],[8.685686,47.522246],[8.687436,47.522314],[8.686919,47.523887],[8.685018,47.523804]]"}]
//http://127.0.0.1:43200/static/klokantech-basic/47.52305/8.68641/15/300/175/1/png?markers=[{%22url%22:%22https://s.gravatar.com/avatar/c492b68b9ec45b29d257bd8a57ffc7f8%22,%22height%22:32,%22width%22:32,%22x_offset%22:0,%22y_offset%22:0,%22latitude%22:47.52305,%22longitude%22:8.686411}]&polygons=[{%22fill_color%22:%22rgba(100.0%,0.0%,0.0%,0.5)%22,%22stroke_color%22:%22black%22,%22stroke_width%22:1,%22path%22:%22[[47.523804,8.685018],[47.522246,8.685686],[47.522314,8.687436],[47.523887,8.686919],[47.523804,8.685018]]%22}]
/**
 * GET /static
 */
/*
export const getStatic = async (req: Request, res: Response) => {
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
            if (HitStats.staticHitRatio[style]) {
                HitStats.staticHitRatio[style].hit++;
            } else {
                HitStats.staticHitRatio[style] = {
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
            if (HitStats.staticHitRatio[style]) {
                HitStats.staticHitRatio[style].miss++;
            } else {
                HitStats.staticHitRatio[style] = {
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
                if (HitStats.staticMarkerHitRatio[style]) {
                    HitStats.staticMarkerHitRatio[style].hit++;
                } else {
                    HitStats.staticMarkerHitRatio[style] = {
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
                        if (HitStats.staticMarkerHitRatio[style]) {
                            HitStats.staticMarkerHitRatio[style].hit++;
                        } else {
                            HitStats.staticMarkerHitRatio[style] = {
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
                                if (HitStats.markerHitRatio[style]) {
                                    HitStats.markerHitRatio[style].hit++;
                                } else {
                                    HitStats.markerHitRatio[style] = {
                                        hit: 1,
                                        miss: 0
                                    };
                                }
                            } else {
                                // Download marker to cache for future use.
                                console.log(`Loading Marker: ${marker.url}`);
                                await utils.downloadFile(marker.url, markerFileName);
                                //markerHitRatio[style].miss++;
                                if (HitStats.markerHitRatio[style]) {
                                    HitStats.markerHitRatio[style].miss++;
                                } else {
                                    HitStats.markerHitRatio[style] = {
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
                        if (HitStats.staticMarkerHitRatio[style]) {
                            HitStats.staticMarkerHitRatio[style].miss++;
                        } else {
                            HitStats.staticMarkerHitRatio[style] = {
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

    console.log('[STATS] Static:', HitStats.staticHitRatio, 'Static Marker:', HitStats.staticMarkerHitRatio);
}
*/
export const getStatic = async (req: Request, res: Response): Promise<void> => {
    console.log('Static:', req.params);
    const style = req.params.style;
    const lat = parseFloat(req.params.lat);
    const lon = parseFloat(req.params.lon);
    const zoom = parseInt(req.params.zoom);
    const width = parseInt(req.params.width);
    const height = parseInt(req.params.height);
    const scale = parseInt(req.params.scale);
    const format = req.params.format;
    const bearing = parseInt(req.params.bearing || '0');
    const pitch = parseInt(req.params.pitch || '0');
    const polygons: Polygon[] = parsePolygons(req.query.polygons?.toString() || '');
    const markers: Marker[] = parseMarkers(req.query.markers?.toString() || '');
    const staticMap = new StaticMap(style, lat, lon, zoom, width, height, scale, format, bearing, pitch, markers, polygons);
    console.log('Static map:', staticMap);

    let fileName: string;
    try {
        fileName = await generateStaticMap(staticMap);
    } catch (e) {
        console.error('[ERROR] Failed to generate staticmap:', e);
        return res.send(e)
            .status(405)
            .end();
    }

    res.setHeader('Cache-Control', 'max-age=604800, must-revalidate');
    console.log(`Serving Static: ${style}-${lat}-${lon}-${zoom}-${width}-${height}-${scale}.${format}`);
    res.sendFile(fileName, (err: Error) => {
        if (err) {
            console.error('[ERROR] Failed to send static file:', err);
            return;
        }
    });

    console.log('[STATS] Static:', HitStats.staticHitRatio, 'Static Marker:', HitStats.staticMarkerHitRatio);
};

/**
 * GET /staticmap/:template
 */
//http://127.0.0.1:43200/staticmap/staticmap.example.json?lat=34.01&lon=-117.01&id=131&form=00
export const getStaticMapTemplate = async (req: Request, res: Response): Promise<void> => {
    const name = req.params.template;
    const templatePath = path.resolve(TemplatesDir, name);
    if (!await utils.fileExists(templatePath)) {
        console.error('[ERROR] StaticMap template', templatePath, 'does not exist!');
        return;
    }
    const templateData = await utils.fileRead(templatePath);
    const template = Mustache.render(templateData, req.query);
    const tplObj = JSON.parse(template);
    const staticMap = Object.assign(new StaticMap(), tplObj);
    //console.log('StaticMap:', staticMap);

    let fileName: string;
    try {
        fileName = await generateStaticMap(staticMap);
    } catch (e) {
        console.error('[ERROR] Failed to generate staticmap from template:', e);
        return res.send(e)
            .status(405)
            .end();
    }

    res.setHeader('Cache-Control', 'max-age=604800, must-revalidate');
    console.log(`Serving Static: ${fileName}`);
    res.sendFile(fileName, (err: Error) => {
        if (err) {
            console.error('[ERROR] Failed to send static file:', err);
            return;
        }
    });
};

/**
 * GET /staticmap
 */
export const getStaticMap = async (req: Request, res: Response): Promise<void> => {
    const style = req.query.style?.toString();
    const lat = parseFloat(req.query.latitude?.toString() || req.query.lat?.toString());
    const lon = parseFloat(req.query.longitude?.toString() || req.query.lon?.toString());
    const zoom = parseInt(req.query.zoom?.toString());
    const width = parseInt(req.query.width?.toString());
    const height = parseInt(req.query.height?.toString());
    const scale = parseInt(req.query.scale?.toString());
    const format = req.query.format?.toString() || 'png';
    const bearing = parseInt(req.query.bearing?.toString() || '0');
    const pitch = parseInt(req.query.pitch?.toString() || '0');
    const polygons: Polygon[] = parsePolygons(req.query.polygons?.toString() || '');
    const markers: Marker[] = parseMarkers(req.query.markers?.toString() || '');
    const staticMap = new StaticMap(style, lat, lon, zoom, width, height, scale, format, bearing, pitch, markers, polygons);
    console.log('Static map:', staticMap);

    let fileName: string;
    try {
        fileName = await generateStaticMap(staticMap);
    } catch (e) {
        console.error('[ERROR] Failed to generate staticmap:', e);
        return res.send(e)
            .status(405)
            .end();
    }

    res.setHeader('Cache-Control', 'max-age=604800, must-revalidate');
    console.log(`Serving Static: ${style}-${lat}-${lon}-${zoom}-${width}-${height}-${scale}.${format}`);
    res.sendFile(fileName, (err: Error) => {
        if (err) {
            console.error('[ERROR] Failed to send static file:', err);
            return;
        }
    });
};

/**
 * POST /staticmap
 */
export const postStaticMap = async (req: Request, res: Response): Promise<void> => {
    const style = req.body.style;
    const lat = parseFloat(req.body.latitude || req.body.lat);
    const lon = parseFloat(req.body.longitude || req.body.lon);
    const zoom = parseInt(req.body.zoom);
    const width = parseInt(req.body.width);
    const height = parseInt(req.body.height);
    const scale = parseInt(req.body.scale);
    const format = req.body.format || 'png';
    const bearing = parseInt(req.body.bearing || '0');
    const pitch = parseInt(req.body.pitch || '0');
    const polygons: Polygon[] = parsePolygons(req.body.polygons);
    const markers: Marker[] = parseMarkers(req.body.markers);
    const staticMap = new StaticMap(style, lat, lon, zoom, width, height, scale, format, bearing, pitch, markers, polygons);
    console.log('Static map:', staticMap);

    let fileName: string;
    try {
        fileName = await generateStaticMap(staticMap);
    } catch (e) {
        console.error('[ERROR] Failed to generate staticmap:', e);
        return res.send(e)
            .status(405)
            .end();
    }

    res.setHeader('Cache-Control', 'max-age=604800, must-revalidate');
    console.log(`Serving Static: ${style}-${lat}-${lon}-${zoom}-${width}-${height}-${scale}.${format}`);
    res.sendFile(fileName, (err: Error) => {
        if (err) {
            console.error('[ERROR] Failed to send static file:', err);
            return;
        }
    });
};

/**
 * GET /multistaticmap/:template
 */
//http://127.0.0.1:43200/multistaticmap/multistaticmap.example.json?lat=34.01&lon=-117.01&id=131&form=00
export const getMultiStaticMapTemplate = async (req: Request, res: Response): Promise<void> => {
    const name = req.params.template;
    const templatePath = path.resolve(TemplatesDir, name);
    if (!await utils.fileExists(templatePath)) {
        console.error('[ERROR] MultiStaticMap template', templatePath, 'does not exist!');
        return;
    }
    const templateData = await utils.fileRead(templatePath);
    const template = Mustache.render(templateData, req.query);
    const tplObj = JSON.parse(template);
    const multiStaticMap = Object.assign(new MultiStaticMap(), tplObj);
    //console.log('MultiStaticMap:', multiStaticMap);

    let fileName: string;
    try {
        fileName = await generateMultiStaticMap(multiStaticMap);
    } catch (e) {
        console.error('[ERROR] Failed to generate multi staticmap:', e);
        return res.send(e)
            .status(405)
            .end();
    }

    res.setHeader('Cache-Control', 'max-age=604800, must-revalidate');
    console.log(`Serving MultiStatic: ${fileName}`);
    res.sendFile(fileName, (err: Error) => {
        if (err) {
            console.error('[ERROR] Failed to send static file:', err);
            return;
        }
    });
};

/**
 * POST /multistaticmap
 */
export const postMultiStaticMap = async (req: Request, res: Response): Promise<void> => {
    let fileName: string;
    try {
        const grid = req.body.grid;
        const multiStaticMap = new MultiStaticMap(grid);
        console.log('Multi Static map:', multiStaticMap);
        fileName = await generateMultiStaticMap(multiStaticMap);
    } catch (e) {
        console.error('[ERROR] Failed to generate multi staticmap:', e);
        return res.send(e)
            .status(405)
            .end();
    }

    res.setHeader('Cache-Control', 'max-age=604800, must-revalidate');
    console.log(`Serving MultiStatic: ${fileName}`);
    res.sendFile(fileName, (err: Error) => {
        if (err) {
            console.error('[ERROR] Failed to send static file:', err);
            return;
        }
    });
};


// Map Generators
const generateStaticMap = async (staticMap: StaticMap): Promise<string> => {
    if (staticMap.scale >= 1 && ValidFormats.includes(staticMap.format || '')) {
        const fileName = path.resolve(StaticCacheDir, `${staticMap.style}-${staticMap.latitude}-${staticMap.longitude}-${staticMap.zoom}-${staticMap.width}-${staticMap.height}-${staticMap.scale}.${staticMap.format}`);
        // Valid format, check if static file already exists
        if (await utils.fileExists(fileName)) {
            // Static file exists, update last modified time
            utils.touch(fileName);
            if (HitStats.staticHitRatio[staticMap.style]) {
                HitStats.staticHitRatio[staticMap.style].hit++;
            } else {
                HitStats.staticHitRatio[staticMap.style] = {
                    hit: 1,
                    miss: 0
                };
            }
        } else {
            // Static file does not exist, download from tileserver
            const scaleString = staticMap.scale === 1 ? '' : `@${staticMap.scale}x`;
            const tileUrl = `${process.env.TILE_SERVER_URL}/styles/${staticMap.style}/static/${staticMap.longitude},${staticMap.latitude},${staticMap.zoom}/${staticMap.width}x${staticMap.height}${scaleString}.${staticMap.format}`;
            await utils.downloadFile(tileUrl, fileName);
            if (HitStats.staticHitRatio[staticMap.style]) {
                HitStats.staticHitRatio[staticMap.style].miss++;
            } else {
                HitStats.staticHitRatio[staticMap.style] = {
                    hit: 0,
                    miss: 1
                };
            }
        }

        const drawables: Array<Drawable> = [];
        if (staticMap.markers && staticMap.markers.length > 0) {
            staticMap.markers.forEach((marker: Marker) =>  drawables.push(marker));
        }
        if (staticMap.polygons && staticMap.polygons.length > 0) {
            staticMap.polygons.forEach((polygon: Polygon) => drawables.push(polygon));
        }

        console.log('Drawable Objects:', drawables);
        if (drawables.length > 0) {
            const hashes = drawables.map(drawable => drawable.hashString);
            const fileNameWithMarker = path.resolve(StaticWithMarkersCacheDir, `${staticMap.style}-${staticMap.latitude}-${staticMap.longitude}-${staticMap.zoom}-${staticMap.width}-${staticMap.height}-${hashes.join(',')}-${staticMap.scale}.${staticMap.format}`);
            if (await utils.fileExists(fileNameWithMarker)) {
                utils.touch(fileName);
                if (HitStats.staticMarkerHitRatio[staticMap.style]) {
                    HitStats.staticMarkerHitRatio[staticMap.style].hit++;
                } else {
                    HitStats.staticMarkerHitRatio[staticMap.style] = {
                        hit: 1,
                        miss: 0
                    };
                }
            } else {
                let hashes = '';
                let fileNameWithMarkerFull = fileName;
                for (let i = 0; i < drawables.length; i++) {
                    const drawable = drawables[i];
                    hashes += drawable.hashString;
                    const fileNameWithMarker = path.resolve(StaticWithMarkersCacheDir, `${staticMap.style}-${staticMap.latitude}-${staticMap.longitude}-${staticMap.zoom}-${staticMap.width}-${staticMap.height}-${hashes}-${staticMap.scale}.${staticMap.format}`);
                    if (await utils.fileExists(fileNameWithMarker)) {
                        // Static with marker file exists, touch for last modified timestamp.
                        utils.touch(fileName);
                        if (HitStats.staticMarkerHitRatio[staticMap.style]) {
                            HitStats.staticMarkerHitRatio[staticMap.style].hit++;
                        } else {
                            HitStats.staticMarkerHitRatio[staticMap.style] = {
                                hit: 1,
                                miss: 0
                            };
                        }
                    } else {
                        // Static with marker file does not exist, check if marker downloaded.
                        console.log(`Building Static: ${staticMap.style}-${staticMap.latitude}-${staticMap.longitude}-${staticMap.zoom}-${staticMap.width}-${staticMap.height}-${hashes}-${staticMap.scale}.${staticMap.format}`);
                        if (drawable instanceof Marker) {
                            const marker = Object.assign(new Marker(), drawable);
                            const markerUrlEncoded = utils.md5(marker.url);
                            const markerFileName = path.resolve(MarkerCacheDir, markerUrlEncoded);
                            if (await utils.fileExists(markerFileName)) {
                                // Marker already downloaded, touch for last modified timestamp.
                                utils.touch(fileName);
                                if (HitStats.markerHitRatio[staticMap.style]) {
                                    HitStats.markerHitRatio[staticMap.style].hit++;
                                } else {
                                    HitStats.markerHitRatio[staticMap.style] = {
                                        hit: 1,
                                        miss: 0
                                    };
                                }
                            } else {
                                // Download marker to cache for future use.
                                console.log(`Loading Marker: ${marker.url}`);
                                await utils.downloadFile(marker.url, markerFileName);
                                if (HitStats.markerHitRatio[staticMap.style]) {
                                    HitStats.markerHitRatio[staticMap.style].miss++;
                                } else {
                                    HitStats.markerHitRatio[staticMap.style] = {
                                        hit: 0,
                                        miss: 1
                                    };
                                }
                            }
                            try {
                                await utils.combineImages(fileNameWithMarkerFull, markerFileName, fileNameWithMarker, marker, staticMap.scale, staticMap.latitude, staticMap.longitude, staticMap.zoom);
                            } catch (e) {
                                console.error('[ERROR]', e);
                            }
                        } else if (drawable instanceof Polygon) {
                            const polygon = Object.assign(new Polygon(), drawable);
                            await utils.drawPolygon(fileNameWithMarkerFull, fileNameWithMarker, polygon, staticMap.scale, staticMap.latitude, staticMap.longitude, staticMap.zoom, staticMap.width, staticMap.height);
                        }
                        if (HitStats.staticMarkerHitRatio[staticMap.style]) {
                            HitStats.staticMarkerHitRatio[staticMap.style].miss++;
                        } else {
                            HitStats.staticMarkerHitRatio[staticMap.style] = {
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
            return fileNameWithMarker;
        } else {
            // Serve static file
            return fileName;
        }
    } else {
        return '';
    }
};

const generateMultiStaticMap = async (multiStaticMap: MultiStaticMap): Promise<string> => {
    if (multiStaticMap.grid.length <= 0) {
        console.error('At least one grid is required');
        return '';
    }
    console.log('Grid[0].Direction:', multiStaticMap.grid[0].direction);
    if (multiStaticMap.grid[0].direction !== CombineDirection.First) {
        console.error('First grid requires direction: "first"');
        return '';
    }
    for (let i = 1; i < multiStaticMap.grid.length - 1; i++) {
        if (multiStaticMap.grid[i].direction === CombineDirection.First) {
            console.error('Only first gird is allowed to be direction: "first"');
            return '';
        }
    }
    for (let i = 0; i < multiStaticMap.grid.length; i++) {
        const grid = multiStaticMap.grid[i];
        if (grid.maps[0].direction !== CombineDirection.First) {
            console.error('First map in grid requires direction: "first"');
            return '';
        }
        for (let j = 1; j < grid.maps.length - 1; j++) {
            const map = grid.maps[j];
            if (map.direction === CombineDirection.First) {
                console.error('Only first map in grid is allowed to be direction: "first"');
            }
        }
    }

    const grids = Array<Grid>();
    const fileNameWithMarker = `${StaticMultiCacheDir}/${multiStaticMap.hashString}.png`;
    if (await utils.fileExists(fileNameWithMarker)) {
        console.log('Serving MutliStatic:', multiStaticMap);
        return fileNameWithMarker;
    } else {
        for (let i = 0; i < multiStaticMap.grid.length; i++) {
            let firstMapUrl = '';
            const grid = multiStaticMap.grid[i];
            const images: Array<{ direction: CombineDirection, path: string }> = [];
            for (let j = 0; j < grid.maps.length; j++) {
                const map = grid.maps[i];
                const url = await generateStaticMap(map.map);
                if (map.direction === CombineDirection.First) {
                    firstMapUrl = url;
                } else {
                    images.push({ direction: map.direction, path: url });
                }
            }
            
            grids.push({ firstPath: firstMapUrl, direction: grid.direction, images: images });
        }
        console.log('Generating MutliStatic:', multiStaticMap);
        utils.combineImagesGrid(grids, fileNameWithMarker);
        console.log('Serving MutliStatic:', multiStaticMap);
        return fileNameWithMarker;
    }
};


// TODO: Make generics method
const parseMarkers = (markersQuery: string): Marker[] => {
    const list: Marker[] = [];
    const markersJson = (markersQuery || '')?.replace(/%22/g, '"');
    if (markersJson) {
        const markers = JSON.parse(markersJson);
        if (markers.length > 0) {
            markers.forEach((marker: Marker) => {
                console.log('Marker:', marker);
                list.push(Object.assign(new Marker(), marker));
            });
        }
    }
    return list;
};

const parsePolygons = (polygonsQuery: string): Polygon[] => {
    const list: Polygon[] = [];
    const polygonsJson = (polygonsQuery || '')?.replace(/%22/g, '"');
    if (polygonsJson) {
        const polygons = JSON.parse(polygonsJson);
        if (polygons.length > 0) {
            polygons.forEach((polygon: Polygon) => {
                //console.log('Polygon:', polygon);
                list.push(Object.assign(new Polygon(), polygon));
            });
        }
    }
    return list;
};

// Utilities
const createDirectories = () => {
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
    if (!fs.existsSync(StaticMultiCacheDir)) {
        fs.mkdir(StaticMultiCacheDir, (err) => {
            if (err) {
                console.error('[ERROR] Failed to create directory:', StaticMultiCacheDir);
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
};

export const startCacheCleaners = (): void => {
    // Create cache directories
    createDirectories();

    // Start cache cleaners
    new CacheCleaner(TileCacheDir,
        parseInt(process.env.TILE_CACHE_MAX_AGE_MINUTES || '10080'),
        parseInt(process.env.TILE_CACHE_DELAY_SECONDS || '3600')
    );
    new CacheCleaner(StaticCacheDir,
        parseInt(process.env.STATIC_CACHE_MAX_AGE_MINUTES || '10080'),
        parseInt(process.env.STATIC_CACHE_DELAY_SECONDS || '3600')
    );
    new CacheCleaner(StaticMultiCacheDir,
        parseInt(process.env.STATIC_MULTI_CACHE_MAX_AGE_MINUTES || '10080'),
        parseInt(process.env.STATIC_MULTI_CACHE_DELAY_SECONDS || '3600'));
    new CacheCleaner(StaticWithMarkersCacheDir,
        parseInt(process.env.STATIC_MARKER_CACHE_MAX_AGE_MINUTES || '10080'),
        parseInt(process.env.STATIC_MARKER_CACHE_DELAY_SECONDS || '3600')
    );
    new CacheCleaner(MarkerCacheDir,
        parseInt(process.env.MARKER_CACHE_MAX_AGE_MINUTES || '10080'),
        parseInt(process.env.MARKER_CACHE_DELAY_SECONDS || '3600')
    );
};