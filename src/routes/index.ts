'use strict';

import * as fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';

import * as globals from '../data/globals';
import { HitStatistics } from '../interfaces/hit-statistics';
import { HitStats } from '../models/hit-stats';
import { MultiStaticMap } from '../models/multi-staticmap';
import { StaticMap } from '../models/staticmap';
import { Style } from '../models/style';
import { Template } from '../services/template';
import * as utils from '../services/utils';

/**
 * Route controller class
 */
export class RouteController {
    /**
     * GET /
     */
    async getRoot(req: Request, res: Response): Promise<void> {
        const tileHits: HitStatistics[] = [];
        for (const style in HitStats.tileHitRatio) {
            const stats = HitStats.tileHitRatio[style];
            const total = stats.miss + stats.hit;
            tileHits.push({
                style,
                hit: stats.hit,
                total,
                percentage: Math.round(stats.hit / total * 100)
            });
        }
        const staticHits: HitStatistics[] = [];
        for (const style in HitStats.staticHitRatio) {
            const stats = HitStats.staticHitRatio[style];
            const total = stats.miss + stats.hit;
            staticHits.push({
                style,
                hit: stats.hit,
                total,
                percentage: Math.round(stats.hit / total * 100)
            });
        }
        const staticMarkerHits: HitStatistics[] = [];
        for (const style in HitStats.staticMarkerHitRatio) {
            const stats = HitStats.staticMarkerHitRatio[style];
            const total = stats.miss + stats.hit;
            staticMarkerHits.push({
                style,
                hit: stats.hit,
                total,
                percentage: Math.round(stats.hit / total * 100)
            });
        }
        const markerHits: HitStatistics[] = [];
        for (const style in HitStats.markerHitRatio) {
            const stats = HitStats.markerHitRatio[style];
            const total = stats.miss + stats.hit;
            markerHits.push({
                style,
                hit: stats.hit,
                total,
                percentage: Math.round(stats.hit / total * 100)
            });
        }
        const url = `${process.env.TILE_SERVER_URL}/styles.json`;
        const styles = await utils.getData(url);
        const data = {
            styles,
            tileHits,
            staticHits,
            staticMarkerHits,
            markerHits,
        };
        res.render('stats', data);
    }

    /**
     * GET /styles
     */
    async getStyles(req: Request, res: Response): Promise<void> {
        const url = `${process.env.TILE_SERVER_URL}/styles.json`;
        const data = await utils.getData(url);
        const styles = Object.assign(new Array<Style>(), data);
        res.json(styles);
    }

    /**
     * GET /tile
     */
    async getTile(req: Request, res: Response): Promise<void> {
        //console.debug('Tile:', req.params);
        const style = req.params.style;
        const z = parseInt(req.params.z);
        const x = parseFloat(req.params.x);
        const y = parseFloat(req.params.y);
        const scale = parseInt(req.params.scale);
        const format = req.params.format;
        const fileName = path.resolve(globals.TileCacheDir, `${style}-${z}-${x}-${y}-${scale}.${format}`);
        if (!scale || scale <= 0 || !globals.ValidFormats.includes(format)) {
            // Failed
            return sendErrorResponse(res, 'No scale value or invalid format provided'); // Bad request
        }
        if (await utils.fileExists(fileName)) {
            await utils.touch(fileName);
            HitStats.tileHit(style, false);
        } else {
            const scaleString = scale === 1 ? '' : `@${scale}x`;
            const tileUrl = `${process.env.TILE_SERVER_URL}/styles/${style}/${z}/${x}/${y}/${scaleString}.${format}`;
            await utils.downloadFile(tileUrl, fileName);
            HitStats.tileHit(style, true);
        }
        console.info(`Serving Tile: ${style}-${z}-${x}-${y}-${scale}.${format}`);
        sendResponse(res, fileName);
    }

    //http://127.0.0.1:43200/static/klokantech-basic/8.68641/47.52305/15/300/175/1/png?markers=[{"url":"https://s.gravatar.com/avatar/c492b68b9ec45b29d257bd8a57ffc7f8","height":32,"width":32,"x_offset":0,"y_offset":0,"latitude":47.52305,"longitude":8.686411}]&polygons=[{"fill_color":"rgba(100.0%,0.0%,0.0%,0.5)","stroke_color":"black","stroke_width":1,"path":"[[8.685018,47.523804],[8.685686,47.522246],[8.687436,47.522314],[8.686919,47.523887],[8.685018,47.523804]]"}]
    //http://127.0.0.1:43200/static/klokantech-basic/47.52305/8.68641/15/300/175/1/png?markers=[{%22url%22:%22https://s.gravatar.com/avatar/c492b68b9ec45b29d257bd8a57ffc7f8%22,%22height%22:32,%22width%22:32,%22x_offset%22:0,%22y_offset%22:0,%22latitude%22:47.52305,%22longitude%22:8.686411}]&polygons=[{%22fill_color%22:%22rgba(100.0%,0.0%,0.0%,0.5)%22,%22stroke_color%22:%22black%22,%22stroke_width%22:1,%22path%22:%22[[47.523804,8.685018],[47.522246,8.685686],[47.522314,8.687436],[47.523887,8.686919],[47.523804,8.685018]]%22}]
    /**
     * GET /static
     */
    async getStatic(req: Request, res: Response): Promise<void> {
        //console.debug('Static:', req.params);
        const staticMap = new StaticMap(Object.assign(req.params, req.query));
        //console.debug('Static map:', staticMap);

        let fileName: string;
        try {
            fileName = await staticMap.generate();
        } catch (e) {
            console.error('Failed to generate staticmap:', e);
            return sendErrorResponse(res, e);
        }
        console.info(`Serving Static: ${fileName}`);
        sendResponse(res, fileName, !staticMap.regeneratable, staticMap.regeneratable);
    }

    /**
     * GET /staticmap/:template
     */
    //http://127.0.0.1:43200/staticmap/staticmap.example.json?lat=34.01&lon=-117.01&id=131&form=00
    async getStaticMapTemplate(req: Request, res: Response): Promise<void> {
        const name = req.params.template;
        const template = new Template(name);
        const templateData = await template.render(req.query);
        const tplObj = JSON.parse(templateData);
        const staticMap = new StaticMap(tplObj);
        //console.debug('Template StaticMap:', staticMap);

        let fileName: string;
        try {
            fileName = await staticMap.generate();
        } catch (e) {
            console.error('Failed to generate staticmap from template:', e);
            return sendErrorResponse(res, e);
        }
        console.info(`Serving Static: ${fileName}`);
        sendResponse(res, fileName, !staticMap.regeneratable, staticMap.regeneratable);
    }

    /**
     * POST /staticmap/:template
     */
    //http://127.0.0.1:43200/staticmap/staticmap.example.json
    async postStaticMapTemplate(req: Request, res: Response): Promise<void> {
        const name = req.params.template;
        const template = new Template(name);
        const templateDatas = Object.assign(req.body, req.query, req.params);
        const templateData = await template.render(templateDatas);
        const tplObj = JSON.parse(templateData);
        const staticMap = new StaticMap(tplObj);

        let fileName: string;
        try {
            fileName = await staticMap.generate();
        } catch (e) {
            console.error('Failed to generate staticmap from template:', e);
            return sendErrorResponse(res, e);
        }
        console.info(`Serving Static: ${fileName}`);
        const regen = req.query.regeneratable === 'true';
        if (regen) {
            const id = await utils.storeRegenerable(staticMap);
            sendResponse(res, id, !regen, regen);
        } else {
            sendResponse(res, fileName, !regen, regen);
        }
    }

    /**
     * GET /staticmap
     */
    //http://127.0.0.1:43200/staticmap?style=dark-matter&latitude=34.01&longitude=-117.01&width=300&height=175&scale=1&format=png
    async getStaticMap(req: Request, res: Response): Promise<void> {
        const staticMap = new StaticMap(req.query);
        //console.debug('Static map:', staticMap);

        let fileName: string;
        try {
            fileName = await staticMap.generate();
        } catch (e) {
            console.error('Failed to generate staticmap:', e);
            return sendErrorResponse(res, e);
        }
        console.info(`Serving Static: ${fileName}`);
        sendResponse(res, fileName, !staticMap.regeneratable, staticMap.regeneratable);
    }

    /**
     * POST /staticmap
     */
    async postStaticMap(req: Request, res: Response): Promise<void> {
        const staticMap = new StaticMap(req.body);
        //console.debug('Static map:', staticMap);

        let fileName: string;
        try {
            fileName = await staticMap.generate();
        } catch (e) {
            console.error('Failed to generate staticmap:', e);
            return sendErrorResponse(res, e);
        }
        console.info(`Serving Static: ${fileName}`);
        sendResponse(res, fileName, !staticMap.regeneratable, staticMap.regeneratable);
    }

    /**
     * GET /static/pregenerated/:id
     */
    async getPregeneratedStaticMap(req: Request, res: Response): Promise<void> {
        const id = req.params.id;
        const regenFileName = path.resolve(globals.RegeneratableCacheDir, id) + '.json';
        if (!await utils.fileExists(regenFileName)) {
            return sendErrorResponse(res, 'Pregenerated staticmap does not exist with id: ' + id);
        }
        const fileData = fs.readFileSync(regenFileName, { encoding: 'utf8' });
        const obj = JSON.parse(fileData);
        const staticMap = new StaticMap(obj);
        staticMap.regeneratable = false;

        let fileName: string;
        try {
            fileName = await staticMap.generate();
        } catch (e) {
            console.error('Failed to generate pregenerated staticmap:', e);
            return sendErrorResponse(res, e);
        }
        console.info(`Serving Pregenerated Static: ${fileName}`);
        sendResponse(res, fileName);
    }

    /**
     * GET /multistaticmap/:template
     */
    //http://127.0.0.1:43200/multistaticmap/multistaticmap.example.json?lat=34.01&lon=-117.01&id=131&form=00
    async getMultiStaticMapTemplate(req: Request, res: Response): Promise<void> {
        const name = req.params.template;
        const template = new Template(name);
        const templateData = await template.render(req.query);
        const tplObj = JSON.parse(templateData);
        const multiStaticMap: MultiStaticMap = Object.assign(new MultiStaticMap(), tplObj);
        //console.debug('MultiStaticMap:', multiStaticMap);

        let fileName: string;
        try {
            fileName = await multiStaticMap.generate();
        } catch (e) {
            console.error('Failed to generate multi staticmap:', e);
            return sendErrorResponse(res, e);
        }
        console.info(`Serving MultiStatic: ${fileName}`);
        sendResponse(res, fileName);
    }

    /**
     * POST /multistaticmap
     */
    async postMultiStaticMap(req: Request, res: Response): Promise<void> {
        let fileName: string;
        try {
            const grid = req.body.grid;
            const multiStaticMap = new MultiStaticMap(grid);
            //console.debug('Multi Static map:', multiStaticMap);
            fileName = await multiStaticMap.generate();
        } catch (e) {
            console.error('Failed to generate multi staticmap:', e);
            return sendErrorResponse(res, e);
        }
        console.info(`Serving MultiStatic: ${fileName}`);
        sendResponse(res, fileName);
    }

    /**
     * GET /multistaticmap/pregenerated/:id
     */
    async getPregeneratedMultiStaticMap(req: Request, res: Response): Promise<void> {
        const id = req.params.id;
        const regenFileName = path.resolve(globals.StaticMultiCacheDir, id) + '.json';
        if (!await utils.fileExists(regenFileName)) {
            return sendErrorResponse(res, 'Pregenerated multi staticmap does not exist with id: ' + id);
        }
        const fileData = fs.readFileSync(regenFileName, { encoding: 'utf8' });
        const obj = JSON.parse(fileData);
        const multiStaticMap: MultiStaticMap = Object.assign(new MultiStaticMap(), obj);
        multiStaticMap.regeneratable = false;

        let fileName: string;
        try {
            fileName = await multiStaticMap.generate();
        } catch (e) {
            console.error('Failed to generate pregenerated multi staticmap:', e);
            return sendErrorResponse(res, e);
        }
        console.info(`Serving Pregenerated Multi Static: ${fileName}`);
        sendResponse(res, fileName);
    }
}

const sendResponse = (res: Response, filePath: string, setCacheControl = true, regeneratable = false): void => {
    if (setCacheControl && !regeneratable) {
        res.setHeader('Cache-Control', 'max-age=604800, must-revalidate');
    }
    if (regeneratable) {
        res.setHeader('content-type', 'text/html');
        const fileName = path.basename(filePath);
        res.send(fileName);
    } else {
        res.sendFile(filePath, (err: Error) => {
            if (err) {
                console.error('Failed to send static file:', err);
                return;
            }
        });
    }
};

const sendErrorResponse = (res: Response, err: any): void => {
    return res.send(err)
        .status(405)
        .end();
};