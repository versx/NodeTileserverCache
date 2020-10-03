'use strict';

import * as fs from 'fs';
import * as os from 'os';
import SphericalMercator from '@mapbox/sphericalmercator';
import axios from 'axios';
import * as crypto from 'crypto';
import btoa from 'btoa';

import { exec } from './spawn';
import { Grid } from '../models/grid';
import { Marker } from '../models/marker';
import { Polygon } from '../models/polygon';
import { CombineDirection } from '../data/combine-direction';

const ImageMagickPath = os.platform() === 'win32'
    ? 'convert'
    : '/usr/local/bin/convert';

export const fileExists = async (path: string): Promise<boolean> => {
    return await fs.promises.access(path, fs.constants.F_OK)
        .then(() => true)
        .catch(err => {
            return false;
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

export const getData = async (url: string): Promise<string> => {
    const response = await axios.get(url);
    return response.data;
};

export const downloadFile = async (from: string, to: string): Promise<void> => {
    console.log(`DownloadFile [From: ${from} To: ${to}]`);
    const writer = fs.createWriteStream(to);
    const response = await axios.get(from, {
        responseType: 'stream'
    });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
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

export const touch = async (fileName: string): Promise<void> => {
    try {
        const time = new Date();
        await fs.promises.utimes(fileName, time, time);
    } catch (err) {
        const handle = await fs.promises.open(fileName, 'w');
        fs.close(handle.fd, () => {});
    }
};

export const combineImagesGrid = async (grids: Array<Grid>, destinationPath: string): Promise<void> => {
    console.log(`Combine Images Grid [Grids: ${grids}, DestinationPath: ${destinationPath}]`);
    const args = Array<string>();
    for (let i = 0; i < grids.length; i++) {
        const grid = grids[i];
        args.push('(');
        args.push(grid.firstPath);
        for (let j = 0; j < grid.images.length; j++) {
            const image = grid.images[j];
            args.push(image.path);
            if (image.direction === CombineDirection.Bottom) {
                args.push('-append');
            } else {
                args.push('+append');
            }
        }
        args.push(')');
        if (grid.direction === CombineDirection.Bottom) {
            args.push('-append');
        } else {
            args.push('+append');
        }
    }
    args.push(destinationPath);

    //console.log('Grid Args:', args);
    try {
        const shell = await exec(ImageMagickPath, args);
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
    const shell = await exec(ImageMagickPath, [
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
    const shell = await exec(ImageMagickPath, [
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