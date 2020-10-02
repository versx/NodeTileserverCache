'use strict';

import path from 'path';

import { Drawable } from './drawable';
import { Marker } from './marker';
import { Polygon } from './polygon';
import * as globals from '../data/globals';
import { HitStats } from '../services/stats';
import * as utils from '../services/utils';

export class StaticMap {
    public style: string;
    public latitude: number;
    public longitude: number;
    public zoom: number;
    public width: number;
    public height: number;
    public scale: number;
    public format?: string;
    public bearing?: number;
    public pitch?: number;
    public markers?: Marker[];
    public polygons?: Polygon[];

    constructor(style = '', latitude = 0, longitude = 0, zoom = 14, width = 0, height = 0,
        scale = 1, format = 'png', bearing = 0, pitch = 0, markers: Marker[] = [], polygons: Polygon[] = []) {
        this.style = style;
        this.latitude = latitude;
        this.longitude = longitude;
        this.zoom = zoom;
        this.width = width;
        this.height = height;
        this.scale = scale;
        this.format = format;
        this.bearing = bearing;
        this.pitch = pitch;
        this.markers = markers;
        this.polygons = polygons;
    }

    public async generate(): Promise<string> {
        if (this.scale >= 1 && globals.ValidFormats.includes(this.format || '')) {
            const fileName = path.resolve(globals.StaticCacheDir, `${this.style}-${this.latitude}-${this.longitude}-${this.zoom}-${this.width}-${this.height}-${this.scale}.${this.format}`);
            // Valid format, check if static file already exists
            if (await utils.fileExists(fileName)) {
                // Static file exists, update last modified time
                utils.touch(fileName);
                HitStats.staticHit(this.style, false);
            } else {
                // Static file does not exist, download from tileserver
                const scaleString = this.scale === 1 ? '' : `@${this.scale}x`;
                const tileUrl = `${process.env.TILE_SERVER_URL}/styles/${this.style}/static/${this.longitude},${this.latitude},${this.zoom}/${this.width}x${this.height}${scaleString}.${this.format}`;
                await utils.downloadFile(tileUrl, fileName);
                HitStats.staticHit(this.style, true);
            }
    
            const drawables: Array<Drawable> = [];
            if (this.markers && this.markers.length > 0) {
                this.markers.forEach((marker: Marker) => drawables.push(Object.assign(new Marker(), marker)));
            }
            if (this.polygons && this.polygons.length > 0) {
                this.polygons.forEach((polygon: Polygon) => drawables.push(Object.assign(new Polygon(), polygon)));
            }
    
            //console.log('Drawable Objects:', drawables);
            if (drawables.length > 0) {
                const hashes = drawables.map(drawable => drawable.hashString);
                const fileNameWithMarker = path.resolve(globals.StaticWithMarkersCacheDir, `${this.style}-${this.latitude}-${this.longitude}-${this.zoom}-${this.width}-${this.height}-${hashes.join(',')}-${this.scale}.${this.format}`);
                if (await utils.fileExists(fileNameWithMarker)) {
                    utils.touch(fileName);
                    HitStats.staticMarkerHit(this.style, false);
                } else {
                    let hashes = '';
                    let fileNameWithMarkerFull = fileName;
                    for (let i = 0; i < drawables.length; i++) {
                        const drawable = drawables[i];
                        //console.log('Hash:', drawable.hashString);
                        hashes += drawable.hashString;
                        const fileNameWithMarker = path.resolve(globals.StaticWithMarkersCacheDir, `${this.style}-${this.latitude}-${this.longitude}-${this.zoom}-${this.width}-${this.height}-${hashes}-${this.scale}.${this.format}`);
                        if (await utils.fileExists(fileNameWithMarker)) {
                            // Static with marker file exists, touch for last modified timestamp.
                            utils.touch(fileName);
                            HitStats.staticMarkerHit(this.style, false);
                        } else {
                            // Static with marker file does not exist, check if marker downloaded.
                            console.log(`Building Static: ${this.style}-${this.latitude}-${this.longitude}-${this.zoom}-${this.width}-${this.height}-${hashes}-${this.scale}.${this.format}`);
                            if (drawable instanceof Marker) {
                                const marker = Object.assign(new Marker(), drawable);
                                const markerUrlEncoded = utils.md5(marker.url);
                                const markerFileName = path.resolve(globals.MarkerCacheDir, markerUrlEncoded);
                                if (await utils.fileExists(markerFileName)) {
                                    // Marker already downloaded, touch for last modified timestamp.
                                    utils.touch(fileName);
                                    HitStats.markerHit(this.style, false);
                                } else {
                                    // Download marker to cache for future use.
                                    await utils.downloadFile(marker.url, markerFileName);
                                    HitStats.markerHit(this.style, true);
                                }
                                try {
                                    await utils.combineImages(fileNameWithMarkerFull, markerFileName, fileNameWithMarker, marker, this.scale, this.latitude, this.longitude, this.zoom);
                                } catch (e) {
                                    console.error('[ERROR]', e);
                                }
                            } else if (drawable instanceof Polygon) {
                                const polygon = Object.assign(new Polygon(), drawable);
                                await utils.drawPolygon(fileNameWithMarkerFull, fileNameWithMarker, polygon, this.scale, this.latitude, this.longitude, this.zoom, this.width, this.height);
                            }
                            HitStats.staticMarkerHit(this.style, true);
                        }
                        hashes += ',';
                        fileNameWithMarkerFull = fileNameWithMarker;
                    }
                }
                // Serve static file
                return fileNameWithMarker;
            }
            // Serve static file
            return fileName;
        }
        return '';
    }
}