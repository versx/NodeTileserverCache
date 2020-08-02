'use strict';

import ejs from 'ejs';
import * as fs from 'fs';
import * as path from 'path';
import request from 'request';
import SphericalMercator from '@mapbox/sphericalmercator';
import * as crypto from 'crypto';
import btoa from 'btoa';

import { exec } from './spawn';
import { Grid } from '../models/grid';
import { Marker } from '../models/marker';
import { Polygon } from '../models/polygon';
import { CombineDirection } from '../data/combine-direction';

const TemplatesDir = path.resolve(__dirname, '../../templates');


export const fileExists = async (path: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        try {
            fs.exists(path, (exists: boolean) => {
                resolve(exists);
            });
        } catch (e) {
            return reject(e);
        }
    });
};

export const fileLastModifiedTime = async (path: string): Promise<Date> => {
    return new Promise((resolve, reject) => {
        try {
            fs.stat(path, (err, stats) => {
                if (err) {
                    return reject(err);
                }
                resolve(stats.mtime);
            });
        } catch (e) {
            return reject(e);
        }
    });
};

export const fileRead = async (path: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        try {
            fs.readFile(path, 'utf-8', (err, data: string) => {
                if (err) {
                    return reject(err);
                }
                resolve(data);
            });
        } catch (e) {
            return reject(e);
        }
    });
};

export const getData = async (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        try {
            request(url, (err, res, body) => {
                if (err) {
                    return reject(err);
                }
                resolve(body);
            });
        } catch (e) {
            return reject(e);
        }
    });
};

export const downloadFile = (from: string, to: string): Promise<void> => {
    console.log(`DownloadFile [From: ${from} To: ${to}]`);
    return new Promise((resolve, reject) => {
        try {
            request.head(from, (err, res, body) => {
                if (err) {
                    return reject(err);
                }
                request(from)
                    .pipe(fs.createWriteStream(to))
                    .on('close', () => {
                        resolve();
                    });
            });
        } catch (e) {
            return reject(e);
        }
    });
};

export const md5 = (data: string): string => {
    const hash = crypto
        .createHash('md5')
        .update(data)
        .digest('hex');
    return hash;
};

// TODO: Review unknown (any value) or Record<string, unknown> (any object)
export const getHashCode = (obj: unknown): string => {
    const json = JSON.stringify(obj);
    const base64 = btoa(json).replace('/', '_');
    const hash = md5(base64);
    return hash;
};

export const touch = (fileName: string): void => {
    try {
        const time = new Date();
        fs.utimesSync(fileName, time, time);
    } catch (err) {
        fs.closeSync(fs.openSync(fileName, 'w'));
    }
};

export const combineImagesGrid = async (grids: Array<Grid>, destinationPath: string): Promise<void> => {
    console.log(`Combine Images Grid [Grids: ${grids}, DestinationPath: ${destinationPath}]`);
    const args = Array<string>();
    for (let i = 0; i < grids.length; i++) {
        const grid = grids[i];
        args.push('\\(');
        args.push(grid.firstPath);
        //for (let j = 0; j < grid.images.length; j++) {
        grid.images.forEach((image: any) => {
            args.push(image.path);
            if (image.direction === CombineDirection.Bottom) {
                args.push('-append');
            } else {
                args.push('+append');
            }
        });
        args.push('\\)');
        if (grid.direction === CombineDirection.Bottom) {
            args.push('-append');
        } else {
            args.push('+append');
        }
    }
    args.push(destinationPath);

    //console.log('Grid Args:', args);
    try {
        const shell = await exec('/usr/local/bin/convert', args);
        console.log('Magick CombineImagesGrid:', shell);
    } catch (e) {
        console.error('Failed to run magick:', e);
    }
};

export const combineImages = async (staticPath: string, markerPath: string, destinationPath: string, marker: Marker, scale: number, centerLat: number, centerLon: number, zoom: number): Promise<void> => {
    //console.log(`Combine Images [StaticPath: ${staticPath}, MarkerPath: ${markerPath}, DestinationPath: ${destinationPath}, Marker: ${marker}, Scale: ${scale}, CenterLat: ${centerLat}, CenterLon: ${centerLon}, Zoom: ${zoom}]`);
    const realOffset = getRealOffset(
        { latitude: marker.latitude, longitude: marker.longitude },
        { latitude: centerLat, longitude: centerLon },
        zoom,
        scale,
        marker.x_offset,
        marker.y_offset
    );
    const realOffsetXPrefix = realOffset.x >= 0 ? '+' : '';
    const realOffsetYPrefix = realOffset.y >= 0 ? '+' : '';
    const shell = await exec('/usr/local/bin/convert', [
        staticPath,
        '(', markerPath, '-resize', `${marker.width * scale}x${marker.height * scale}`, ')',
        '-gravity', 'Center',
        '-geometry', `${realOffsetXPrefix}${realOffset.x}${realOffsetYPrefix}${realOffset.y}`,
        '-composite',
        destinationPath
    ]);
    console.log('Magick CombineImages:', shell);
};

export const drawPolygon = async (staticPath: string, destinationPath: string, polygon: Polygon, scale: number, centerLat: number, centerLon: number, zoom: number, width: number, height: number): Promise<void> => {
    const points = [];
    const polygons = JSON.parse(polygon.path);
    for (let i = 0; i < polygons.length; i++) {
        const coord = polygons[i];
        if (coord.length !== 2) {
            console.error('[ERROR] Polygon coordinates don\'t match up, aborting...');
            return;
        }
        const point = getRealOffset(
            { latitude: coord[0], longitude: coord[1] },
            { latitude: centerLat, longitude: centerLon },
            zoom,
            scale,
            0,
            0
        );
        points.push({
            x: point.x + width / 2 * scale,
            y: point.y + height / 2 * scale
        });
    }

    let polygonPath = points.map((value) => `${value.x},${value.y} `).join('');
    polygonPath = polygonPath.slice(0, polygonPath.length - 1);
    const shell = await exec('/usr/local/bin/convert', [
        staticPath,
        '-strokewidth', polygon.stroke_width?.toString(),
        '-fill', polygon.fill_color,
        '-stroke', polygon.stroke_color,
        '-gravity', 'Center',
        '-draw', `polygon ${polygonPath}`,
        destinationPath 
    ]);
    console.log('Magick DrawPolygon:', shell);
};

export const getRealOffset = (at: { latitude: number, longitude: number }, relativeTo: { latitude: number, longitude: number }, zoom: number, scale: number, extraX: number, extraY: number): { x: number, y: number} => {
    let realOffsetX: number;
    let realOffsetY: number;
    if (relativeTo.latitude === at.latitude && relativeTo.longitude === at.longitude) {
        realOffsetX = 0;
        realOffsetY = 0;
    } else {
        const options = {};
        const px1 = new SphericalMercator(options).px([relativeTo.latitude, relativeTo.longitude], 20);
        const px2 = new SphericalMercator(options).px([at.latitude, at.longitude], 20);
        const pxScale = Math.pow(2, zoom - 20);
        realOffsetX = (px2[0] - px1[0]) * pxScale * scale;
        realOffsetY = (px2[1] - px1[1]) * pxScale * scale;
        if (!(px1 && px2)) {
            realOffsetX = 0;
            realOffsetY = 0;
        }
    }
    return {
        x: realOffsetX + extraX * scale,
        y: realOffsetY + extraY * scale
    };
};

export const renderTemplate = (name: string, data: ejs.Data): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        try {
            const filePath = path.resolve(TemplatesDir, name);
            if (!await fileExists(filePath)) {
                console.error('[ERROR] Template', filePath, 'does not exist!');
                return;
            }
            ejs.renderFile(filePath, data, (err, str) => {
                if (err) {
                    return reject(err);
                }
                resolve(str);
            })
        } catch (e) {
            return reject(e);
        }
    });
};