'use strict';

import path from 'path';

import { Drawable } from '../interfaces/drawable';
import { Circle } from './circle';
import { Marker } from './marker';
import { Polygon } from './polygon';
import * as globals from '../data/globals';
import { HitStats } from '../services/stats';
import { ImageMagick } from '../services/image-magick';
import * as utils from '../services/utils';

const imageMagick = new ImageMagick();

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

    constructor(args: any) {
        this.style = args?.style;
        this.latitude = args?.latitude || args?.lat;
        this.longitude = args?.longitude || args?.lon;
        this.zoom = args?.zoom || 14;
        this.width = args?.width;
        this.height = args?.height;
        this.scale = args?.scale || 1;
        this.format = args?.format || 'png';
        this.bearing = args?.bearing || 0;
        this.pitch = args?.pitch || 0;
        this.markers = Marker.parse(args?.markers?.toString());
        this.polygons = Polygon.parse(args?.polygons?.toString());
        this.circles = Circle.parse(args?.circles?.toString());
    }

    public async generate(): Promise<string> {
        if (!this.scale || !globals.ValidFormats.includes(this.format || '')) {
            return '';
        }
        const tileFileName = path.resolve(globals.StaticCacheDir, `${this.style}-${this.latitude}-${this.longitude}-${this.zoom}-${this.width}-${this.height}-${this.scale}.${this.format}`);
        // Valid format, check if static file already exists
        if (await utils.fileExists(tileFileName)) {
            // Static file exists, update last modified time
            await utils.touch(tileFileName);
            HitStats.staticHit(this.style, false);
        } else {
            // Static file does not exist, download from tileserver
            const scaleString = this.scale === 1 ? '' : `@${this.scale}x`;
            const tileUrl = `${process.env.TILE_SERVER_URL}/styles/${this.style}/static/${this.longitude},${this.latitude},${this.zoom}/${this.width}x${this.height}${scaleString}.${this.format}`;
            await utils.downloadFile(tileUrl, tileFileName);
            HitStats.staticHit(this.style, true);
        }

        // Build drawables array
        const drawables: Array<Drawable> = [];
        if (this.markers && this.markers.length > 0) {
            this.markers.forEach((marker: Marker) => drawables.push(new Marker(marker)));
        }
        if (this.polygons && this.polygons.length > 0) {
            this.polygons.forEach((polygon: Polygon) => drawables.push(new Polygon(polygon)));
        }
        if (this.circles && this.circles.length > 0) {
            this.circles.forEach((circle: Circle) => drawables.push(new Circle(circle)));
        }

        if (drawables.length === 0) {
            // Serve static file without any drawable objects
            return tileFileName;
        }

        // Hash all of the hashStrings for smaller filenames
        const hashes = utils.getHashCode(drawables.map(drawable => drawable.hash).join(','));
        //console.debug('hashes:', hashes);
        const fileNameWithMarker = path.resolve(globals.StaticWithMarkersCacheDir, `${this.style}-${this.latitude}-${this.longitude}-${this.zoom}-${this.width}-${this.height}-${hashes}-${this.scale}.${this.format}`);
        if (await utils.fileExists(fileNameWithMarker)) {
            // Static with marker file exists, touch for last modified timestamp.
            await utils.touch(tileFileName);
            HitStats.staticMarkerHit(this.style, false);
            return fileNameWithMarker;
        }

        // Does not exist, create
        const staticMapFilePath = await this.build(drawables, fileNameWithMarker, tileFileName, hashes);
        return staticMapFilePath;
    }

    private async build(drawables: Drawable[], fileNameWithMarker: string, fileName: string, hashes: string): Promise<string> {
        let fileNameWithMarkerFull: string = '';
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
                    await imageMagick.combineImages(fileNameWithMarkerFull, markerFileName, fileNameWithMarker, drawable, this);
                } catch (e) {
                    console.error('Failed to combine images:', e);
                }
            } else if (drawable instanceof Polygon) {
                await imageMagick.drawPolygon(fileNameWithMarkerFull, fileNameWithMarker, drawable, this);
            } else if (drawable instanceof Circle) {
                await imageMagick.drawCircle(fileNameWithMarkerFull, fileNameWithMarker, drawable, this);
            }
            HitStats.staticMarkerHit(this.style, true);
            fileNameWithMarkerFull = fileNameWithMarker;
        }
        return fileNameWithMarkerFull;
    }
}