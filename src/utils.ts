'use strict';

import * as fs from 'fs';
import request from 'request';
import SphericalMercator from '@mapbox/sphericalmercator';
import * as crypto from 'crypto';
const btoa = require('btoa');

import { exec } from './spawn';
import { Marker as _Marker, Marker } from './models/marker';
import { Polygon as _Polygon, Polygon } from './models/polygon';

async function fileExists(path: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        try {
            fs.exists(path, (exists: boolean) => {
                resolve(exists);
            });
        } catch (e) {
            return reject(e);
        }
    });
}

async function fileLastModifiedTime(path: string): Promise<Date> {
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
}

async function getData(url: string): Promise<string> {
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
}

async function downloadFile(from: string, to: string): Promise<void> {
    console.log(`DownloadFile [From: ${from} To: ${to}]`);
    // TODO: Validate paths
    return new Promise((resolve, reject) => {
        try {
            request.head(from, (err, res, body) => {
                request(from)
                .pipe(fs.createWriteStream(to))
                .on('close', () => {
                    resolve();
                })
            });
        } catch (e) {
            return reject(e);
        }
    });
}

function md5(data: string) {
    const md5 = crypto.createHash('md5').update(data).digest("hex");
    return md5;
}

function getHashCode(obj: any) {
    const json = JSON.stringify(obj);
    const base64 = btoa(json).replace('/', '_');
    const hash = md5(base64);
    return hash;
}

function touch(fileName: string) {
    try {
        const time = new Date();
        fs.utimesSync(fileName, time, time);
    } catch (err) {
        fs.closeSync(fs.openSync(fileName, 'w'));
    }
}

async function combineImages(staticPath: string, markerPath: string, destinationPath: string, marker: Marker, scale: number, centerLat: number, centerLon: number, zoom: number) {
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
}

async function drawPolygon(staticPath: string, destinationPath: string, polygon: Polygon, scale: number, centerLat: number, centerLon: number, zoom: number, width: number, height: number) {
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
        '-strokewidth', polygon.stroke_width,
        '-fill', polygon.fill_color,
        '-stroke', polygon.stroke_color,
        '-gravity', 'Center',
        '-draw', `polygon ${polygonPath}`,
        destinationPath 
    ]);
    console.log('Magick DrawPolygon:', shell);
}

function getRealOffset(at: { latitude: number, longitude: number }, relativeTo: { latitude: number, longitude: number }, zoom: number, scale: number, extraX: number, extraY: number) {
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
}

export {
    fileExists,
    fileLastModifiedTime,
    getData,
    downloadFile,
    md5,
    getHashCode,
    touch,
    combineImages,
    drawPolygon
};