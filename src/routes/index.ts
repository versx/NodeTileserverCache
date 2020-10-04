'use strict';

import path from 'path';
import { Request, Response } from 'express';

import * as globals from '../data/globals';
import { Marker } from '../models/marker';
import { MultiStaticMap } from '../models/multi-staticmap';
import { Polygon } from '../models/polygon';
import { StaticMap } from '../models/staticmap';
import { HitStats } from '../services/stats';
import { Template } from '../services/template';
import * as utils from '../services/utils';

/**
 * GET /
 */
export const getRoot = (req: Request, res: Response): void => {
    let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8"/>
        <title>NodeTileserverCache</title>

        <link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.1.3/css/bootstrap.min.css" integrity="sha256-eSi1q2PG6J7g7ib17yAaWMcrr5GrtohYChqibrV7PBE=" crossorigin="anonymous" />
        <script type="text/javascript" src="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js" crossorigin="anonymous"></script>
    </head>
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
        <div class="navbar-header">
            <a class="navbar-brand" href="/">NodeTileserverCache</a>        
        </div>
    </nav>
    <br><br><br>
    <body class="w-75" style="float: none; margin: 0 auto;">
        <h4 class="text-center"><b>Tile Cache Hit-Rate</b></h4>
        <div class="card-body">
            <table id="table" class="table table-striped table-bordered table-hover dt-responsive nowrap" style="position: center; width:100%">
                <thead class="thead-dark">
                    <tr>
                        <th>Style</th>
                        <th>Hits</th>
                        <th>Total</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
        `;
        const tileHitKeys = Object.keys(HitStats.tileHitRatio);
        if (tileHitKeys) {
            tileHitKeys.forEach((key: string) => {
                const style = HitStats.tileHitRatio[key];
                const hit = style.hit;
                const total = style.miss + style.hit;
                const percentage = Math.round(hit / total * 100);
                //html += `<div class="list-group-item">${key}: ${hit}/${total} (${percentage}%)</div>`;
                html += `
                <tr>
                    <td>${key}</td>
                    <td>${hit}</td>
                    <td>${total}</td>
                    <td>${percentage}%</td>
                </tr>
                `;
            });
        }
        html += `
                </tbody>
            </table>
        </div>
        <h4 class="text-center"><b>Static Map Cache Hit-Rate</b></h4>
        <div class="card-body">
            <table id="table" class="table table-striped table-bordered table-hover dt-responsive nowrap" style="position: center; width:100%">
                <thead class="thead-dark">
                    <tr>
                        <th>Style</th>
                        <th>Hits</th>
                        <th>Total</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
        `;
        const staticHitKeys = Object.keys(HitStats.staticHitRatio);
        if (staticHitKeys) {
            staticHitKeys.forEach((key: string) => {
                const style = HitStats.staticHitRatio[key];
                const hit = style.hit;
                const total = style.miss + style.hit;
                const percentage = Math.round(hit / total * 100);
                html += `
                <tr>
                    <td>${key}</td>
                    <td>${hit}</td>
                    <td>${total}</td>
                    <td>${percentage}%</td>
                </tr>
                `;
            });
        }
        html += `
                </tbody>
            </table>
        </div>
        <h4 class="text-center"><b>Static Map with Marker Cache Hit-Rate</b></h4>
        <div class="card-body">
            <table id="table" class="table table-striped table-bordered table-hover dt-responsive nowrap" style="position: center; width:100%">
                <thead class="thead-dark">
                    <tr>
                        <th>Style</th>
                        <th>Hits</th>
                        <th>Total</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
        `;
        const staticMarkerHitKeys = Object.keys(HitStats.staticMarkerHitRatio);
        if (staticMarkerHitKeys) {
            staticMarkerHitKeys.forEach((key: string) => {
                const style = HitStats.staticMarkerHitRatio[key];
                const hit = style.hit;
                const total = style.miss + style.hit;
                const percentage = Math.round(hit / total * 100);
                html += `
                <tr>
                    <td>${key}</td>
                    <td>${hit}</td>
                    <td>${total}</td>
                    <td>${percentage}%</td>
                </tr>
                `;
            });
        }
        html += `
                </tbody>
            </table>
        </div>
        <h4 class="text-center"><b>Marker Cache Hit-Rate</b></h4>
        <div class="card-body">
            <table id="table" class="table table-striped table-bordered table-hover dt-responsive nowrap" style="position: center; width:100%">
                <thead class="thead-dark">
                    <tr>
                        <th>Style</th>
                        <th>Hits</th>
                        <th>Total</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
        `;
        const markerHitKeys = Object.keys(HitStats.markerHitRatio);
        if (markerHitKeys) {
            markerHitKeys.forEach((key: string) => {
                const style = HitStats.markerHitRatio[key];
                const hit = style.hit;
                const total = style.miss + style.hit;
                const percentage = Math.round(hit / total * 100);
                html += `
                <tr>
                    <td>${key}</td>
                    <td>${hit}</td>
                    <td>${total}</td>
                    <td>${percentage}%</td>
                </tr>
                `;
            });
        }
        html += `
                </tbody>
            </table>
        </div>
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
    // TODO: Use styles model/interface instead of Record<string, unknown>
    //const list = obj.map((x: Record<string, unknown>) => x.id);
    res.json(data);
};

/**
 * GET /tile
 */
export const getTile = async (req: Request, res: Response): Promise<void> => {
    //console.debug('Tile:', req.params);
    const style = req.params.style;
    const z = parseInt(req.params.z);
    const x = parseFloat(req.params.x);
    const y = parseFloat(req.params.y);
    const scale = parseInt(req.params.scale);
    const format = req.params.format;
    const fileName = path.resolve(globals.TileCacheDir, `${style}-${z}-${x}-${y}-${scale}.${format}`);
    if (scale >= 1 && globals.ValidFormats.includes(format)) {
        if (await utils.fileExists(fileName)) {
            await utils.touch(fileName);
            HitStats.tileHit(style, false);
        } else {
            const scaleString = scale === 1 ? '' : `@${scale}x`;
            const tileUrl = `${process.env.TILE_SERVER_URL}/styles/${style}/${z}/${x}/${y}/${scaleString}.${format}`;
            await utils.downloadFile(tileUrl, fileName);
            HitStats.tileHit(style, true);
        }
    } else {
        // Failed
        res.send('Error'); // Bad request
    }

    res.setHeader('Cache-Control', 'max-age=604800, must-revalidate');
    console.info(`Serving Tile: ${style}-${z}-${x}-${y}-${scale}.${format}`);
    res.sendFile(fileName, (error: Error) => {
        if (error) {
            console.error('Failed to serve tile:', error);
            return;
        }
    });

    console.debug('Tile:', HitStats.tileHitRatio);
};

//http://10.0.0.2:43200/static/klokantech-basic/34.01/-117.01/15/300/175/1/png
//http://tiles.example.com:8080/static/klokantech-basic/{0}/{1}/15/300/175/1/png
//http://10.0.0.2:43200/static/basic-preview/47.404041/8.539621/15/300/175/1/png?markers=[{%22url%22:%22https://s.gravatar.com/avatar/c492b68b9ec45b29d257bd8a57ffc7f8%22,%22height%22:32,%22width%22:32,%22x_offset%22:0,%22y_offset%22:0,%22latitude%22:47.404041,%22longitude%22:8.539621}]
//http://10.0.1.55:43200/static/klokantech-basic/8.68641/47.52305/15/300/175/1/png?markers=[{"url":"https://s.gravatar.com/avatar/c492b68b9ec45b29d257bd8a57ffc7f8","height":32,"width":32,"x_offset":0,"y_offset":0,"latitude":47.52305,"longitude":8.686411}]&polygons=[{"fill_color":"rgba(100.0%,0.0%,0.0%,0.5)","stroke_color":"black","stroke_width":1,"path":"[[8.685018,47.523804],[8.685686,47.522246],[8.687436,47.522314],[8.686919,47.523887],[8.685018,47.523804]]"}]
//http://127.0.0.1:43200/static/klokantech-basic/47.52305/8.68641/15/300/175/1/png?markers=[{%22url%22:%22https://s.gravatar.com/avatar/c492b68b9ec45b29d257bd8a57ffc7f8%22,%22height%22:32,%22width%22:32,%22x_offset%22:0,%22y_offset%22:0,%22latitude%22:47.52305,%22longitude%22:8.686411}]&polygons=[{%22fill_color%22:%22rgba(100.0%,0.0%,0.0%,0.5)%22,%22stroke_color%22:%22black%22,%22stroke_width%22:1,%22path%22:%22[[47.523804,8.685018],[47.522246,8.685686],[47.522314,8.687436],[47.523887,8.686919],[47.523804,8.685018]]%22}]
/**
 * GET /static
 */
export const getStatic = async (req: Request, res: Response): Promise<void> => {
    //console.debug('Static:', req.params);
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
    const polygons: Polygon[] = Polygon.parse(req.query.polygons?.toString() || '');
    const markers: Marker[] = Marker.parse(req.query.markers?.toString() || '');
    const staticMap = new StaticMap(style, lat, lon, zoom, width, height, scale, format, bearing, pitch, markers, polygons);
    //console.debug('Static map:', staticMap);

    let fileName: string;
    try {
        fileName = await staticMap.generate();
    } catch (e) {
        console.error('Failed to generate staticmap:', e);
        return res.send(e)
            .status(405)
            .end();
    }

    res.setHeader('Cache-Control', 'max-age=604800, must-revalidate');
    console.info(`Serving Static: ${style}-${lat}-${lon}-${zoom}-${width}-${height}-${scale}.${format}`);
    res.sendFile(fileName, (err: Error) => {
        if (err) {
            console.error('Failed to send static file:', err);
            return;
        }
    });

    console.debug('Static:', HitStats.staticHitRatio, 'Static Marker:', HitStats.staticMarkerHitRatio);
};

/**
 * GET /staticmap/:template
 */
//http://127.0.0.1:43200/staticmap/staticmap.example.json?lat=34.01&lon=-117.01&id=131&form=00
export const getStaticMapTemplate = async (req: Request, res: Response): Promise<void> => {
    const name = req.params.template;
    const template = await Template.render(name, req.query);
    const tplObj = JSON.parse(template);
    const staticMap = Object.assign(new StaticMap(), tplObj);
    //console.debug('Template StaticMap:', staticMap);

    let fileName: string;
    try {
        fileName = await staticMap.generate();
    } catch (e) {
        console.error('Failed to generate staticmap from template:', e);
        return res.send(e)
            .status(405)
            .end();
    }

    res.setHeader('Cache-Control', 'max-age=604800, must-revalidate');
    console.info(`Serving Static: ${fileName}`);
    res.sendFile(fileName, (err: Error) => {
        if (err) {
            console.error('Failed to send static file:', err);
            return;
        }
    });
};

/**
 * POST /staticmap/:template
 */
//http://127.0.0.1:43200/staticmap/staticmap.example.json
export const postStaticMapTemplate = async (req: Request, res: Response): Promise<void> => {
    const name = req.params.template;
    const template = await Template.render(name, req.body);
    const tplObj = JSON.parse(template);
    const staticMap = Object.assign(new StaticMap(), tplObj);
    //console.debug('Template StaticMap:', staticMap);

    let fileName: string;
    try {
        fileName = await staticMap.generate();
    } catch (e) {
        console.error('Failed to generate staticmap from template:', e);
        return res.send(e)
            .status(405)
            .end();
    }

    res.setHeader('Cache-Control', 'max-age=604800, must-revalidate');
    console.info(`Serving Static: ${fileName}`);
    res.sendFile(fileName, (err: Error) => {
        if (err) {
            console.error('Failed to send static file:', err);
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
    const polygons: Polygon[] = Polygon.parse(req.query.polygons?.toString() || '');
    const markers: Marker[] = Marker.parse(req.query.markers?.toString() || '');
    const staticMap = new StaticMap(style, lat, lon, zoom, width, height, scale, format, bearing, pitch, markers, polygons);
    //console.debug('Static map:', staticMap);

    let fileName: string;
    try {
        fileName = await staticMap.generate();
    } catch (e) {
        console.error('Failed to generate staticmap:', e);
        return res.send(e)
            .status(405)
            .end();
    }

    res.setHeader('Cache-Control', 'max-age=604800, must-revalidate');
    console.info(`Serving Static: ${style}-${lat}-${lon}-${zoom}-${width}-${height}-${scale}.${format}`);
    res.sendFile(fileName, (err: Error) => {
        if (err) {
            console.error('Failed to send static file:', err);
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
    const polygons: Polygon[] = Polygon.parse(req.body.polygons);
    const markers: Marker[] = Marker.parse(req.body.markers);
    const staticMap = new StaticMap(style, lat, lon, zoom, width, height, scale, format, bearing, pitch, markers, polygons);
    //console.debug('Static map:', staticMap);

    let fileName: string;
    try {
        fileName = await staticMap.generate();
    } catch (e) {
        console.error('Failed to generate staticmap:', e);
        return res.send(e)
            .status(405)
            .end();
    }

    res.setHeader('Cache-Control', 'max-age=604800, must-revalidate');
    console.info(`Serving Static: ${style}-${lat}-${lon}-${zoom}-${width}-${height}-${scale}.${format}`);
    res.sendFile(fileName, (err: Error) => {
        if (err) {
            console.error('Failed to send static file:', err);
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
    const template = await Template.render(name, req.query);
    const tplObj = JSON.parse(template);
    const multiStaticMap = Object.assign(new MultiStaticMap(), tplObj);
    //console.debug('MultiStaticMap:', multiStaticMap);

    let fileName: string;
    try {
        fileName = await multiStaticMap.generate();
    } catch (e) {
        console.error('Failed to generate multi staticmap:', e);
        return res.send(e)
            .status(405)
            .end();
    }

    res.setHeader('Cache-Control', 'max-age=604800, must-revalidate');
    console.info(`Serving MultiStatic: ${fileName}`);
    res.sendFile(fileName, (err: Error) => {
        if (err) {
            console.error('Failed to send static file:', err);
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
        console.debug('Multi Static map:', multiStaticMap);
        fileName = await multiStaticMap.generate();
    } catch (e) {
        console.error('Failed to generate multi staticmap:', e);
        return res.send(e)
            .status(405)
            .end();
    }

    res.setHeader('Cache-Control', 'max-age=604800, must-revalidate');
    console.info(`Serving MultiStatic: ${fileName}`);
    res.sendFile(fileName, (err: Error) => {
        if (err) {
            console.error('Failed to send static file:', err);
            return;
        }
    });
};