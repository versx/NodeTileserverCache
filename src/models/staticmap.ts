'use strict';

import path from 'path';

import { Drawable } from './drawable';
import { Circle } from './circle';
import { Marker } from './marker';
import { Polygon } from './polygon';
import * as globals from '../data/globals';
import { HitStats } from '../services/stats';
import { ImageMagick } from '../services/image-magick';
import * as utils from '../services/utils';

const imagemagick = new ImageMagick();

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
    public circles?: Circle[];

    constructor(style = '', latitude = 0, longitude = 0, zoom = 14,
        width = 0, height = 0, scale = 1, format = 'png', bearing = 0, pitch = 0,
        markers: Marker[] = [], polygons: Polygon[] = [], circles: Circle[] = []) {
        this.style = style;
        this.latitude = latitude;
        this.longitude = longitude;
        this.zoom = zoom || 14;
        this.width = width;
        this.height = height;
        this.scale = scale || 1;
        this.format = format || 'png';
        this.bearing = bearing || 0;
        this.pitch = pitch || 0;
        this.markers = markers || [];
        this.polygons = polygons || [];
        this.circles = circles || [];
    }

    public async generate(): Promise<string> {
        if (this.scale >= 1 && globals.ValidFormats.includes(this.format || '')) {
            const fileName = path.resolve(globals.StaticCacheDir, `${this.style}-${this.latitude}-${this.longitude}-${this.zoom}-${this.width}-${this.height}-${this.scale}.${this.format}`);
            // Valid format, check if static file already exists
            if (await utils.fileExists(fileName)) {
                // Static file exists, update last modified time
                await utils.touch(fileName);
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
                this.markers.forEach((marker: Marker) => drawables.push(
                    new Marker(marker.url, marker.height, marker.width, marker.latitude, marker.longitude, marker.x_offset, marker.y_offset)));
            }
            if (this.polygons && this.polygons.length > 0) {
                this.polygons.forEach((polygon: Polygon) => drawables.push(
                    new Polygon(polygon.fill_color, polygon.stroke_color, polygon.stroke_width, polygon.path)));
            }
            if (this.circles && this.circles.length > 0) {
                this.circles.forEach((circle: Circle) => drawables.push(
                    new Circle(circle.latitude, circle.longitude, circle.radius, circle.fill_color, circle.stroke_color, circle.stroke_width)));
            }
    
            //console.debug('Drawable Objects:', drawables);
            if (drawables.length === 0) {
                // Serve static file without any drawable objects
                return fileName;
            }

            // Hash all of the hashStrings for smaller filenames
            const hashes = utils.getHashCode(drawables.map(drawable => drawable.hashString).join(','));
            //console.debug('hashes:', hashes);
            const fileNameWithMarker = path.resolve(globals.StaticWithMarkersCacheDir, `${this.style}-${this.latitude}-${this.longitude}-${this.zoom}-${this.width}-${this.height}-${hashes}-${this.scale}.${this.format}`);
            if (await utils.fileExists(fileNameWithMarker)) {
                // Static with marker file exists, touch for last modified timestamp.
                await utils.touch(fileName);
                HitStats.staticMarkerHit(this.style, false);
            } else {
                let fileNameWithMarkerFull = fileName;
                for (const drawable of drawables) {
                    // Static with marker file does not exist, check if marker downloaded.
                    console.info(`Building Static: ${this.style}-${this.latitude}-${this.longitude}-${this.zoom}-${this.width}-${this.height}-${hashes}-${this.scale}.${this.format}`);
                    if (drawable instanceof Marker) {
                        const markerUrlEncoded = utils.md5(drawable.url);
                        const markerFileName = path.resolve(globals.MarkerCacheDir, markerUrlEncoded);
                        if (await utils.fileExists(markerFileName)) {
                            // Marker already downloaded, touch for last modified timestamp.
                            await utils.touch(fileName);
                            HitStats.markerHit(this.style, false);
                        } else {
                            // Download marker to cache for future use.
                            await utils.downloadFile(drawable.url, markerFileName);
                            HitStats.markerHit(this.style, true);
                        }
                        try {
                            await imagemagick.combineImages(fileNameWithMarkerFull, markerFileName, fileNameWithMarker, drawable, this);
                        } catch (e) {
                            console.error('Failed to combine images:', e);
                        }
                    } else if (drawable instanceof Polygon) {
                        await imagemagick.drawPolygon(fileNameWithMarkerFull, fileNameWithMarker, drawable, this);
                    }/* else if (drawable instanceof Circle) {
                        await imagemagick.drawCircle(fileNameWithMarkerFull, fileNameWithMarker, drawable, this);
                    }*/
                    HitStats.staticMarkerHit(this.style, true);
                    fileNameWithMarkerFull = fileNameWithMarker;
                }
            }
            // Serve static file
            return fileNameWithMarker;
        }
        return '';
    }
}