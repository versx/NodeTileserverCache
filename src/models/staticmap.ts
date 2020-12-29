'use strict';

import path from 'path';

import { Circle } from './circle';
import { HitStats } from './hit-stats';
import { Marker } from './marker';
import { Polygon } from './polygon';
import { Watermark } from './watermark';
import * as globals from '../data/globals';
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
    public markers?: Marker[] = [];
    public polygons?: Polygon[] = [];
    public circles?: Circle[] = [];
    public watermarks?: Watermark[] = [];

    public hash: string;

    public regeneratable = false;

    /* eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types */
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
        if (typeof args?.markers === 'object') {
            this.markers = args?.markers || [];
        } else {
            this.markers = Marker.parse(args?.markers?.toString());
        }
        if (typeof args?.polygons === 'object') {
            this.polygons = args?.polygons || [];
        } else {
            this.polygons = Polygon.parse(args?.polygons?.toString());
        }
        if (typeof args?.circles === 'object') {
            this.circles = args?.circles || [];
        } else {
            this.circles = Circle.parse(args?.circles?.toString());
        }
        if (typeof args?.watermarks === 'object') {
            this.watermarks = args?.watermarks || [];
        } else {
            this.watermarks = Watermark.parse(args?.watermarks?.toString());
        }
        this.regeneratable = args?.regeneratable !== undefined && args?.regeneratable !== false;
        this.hash = 'SM' + utils.getHashCode(this);
    }

    public async generate(): Promise<string> {
        if (!this.scale || this.scale <= 0 && !globals.ValidFormats.includes(this.format || '')) {
            return '';
        }
        const fileName = path.resolve(globals.StaticCacheDir, `${this.style}-${this.latitude}-${this.longitude}-${this.zoom}-${this.width}-${this.height}-${this.scale}.${this.format}`);
        // Valid format, check if static file already exists
        if (await utils.fileExists(fileName)) {
            // Static file exists, update last modified time
            await utils.touch(fileName);
            HitStats.staticHit(this.style, false);
        } else {
            // Static file does not exist, download from tileserver
            const scaleString = this.scale == 1 ? '' : `@${this.scale}x`;
            const tileUrl = `${process.env.TILE_SERVER_URL}/styles/${this.style}/static/${this.longitude},${this.latitude},${this.zoom}/${this.width}x${this.height}${scaleString}.${this.format}`;
            await utils.downloadFile(tileUrl, fileName);
            HitStats.staticHit(this.style, true);
        }

        // If regeneratable staticmap, store for later use
        if (this.regeneratable) {
            const id = await utils.storeRegenerable<StaticMap>(this);
            return id;
        }

        // Hash all of the hashStrings for smaller filenames
        const fileNameWithMarker = path.resolve(globals.StaticWithMarkersCacheDir, `${this.hash}.${this.format}`);
        if (await utils.fileExists(fileNameWithMarker)) {
            // Static with marker file exists, touch for last modified timestamp.
            await utils.touch(fileName);
            HitStats.staticMarkerHit(this.style, false);
        } else {
            const args = await imageMagick.buildArguments(this, fileName, fileNameWithMarker);
            await imageMagick.generate(args);
        }
        // Serve static file
        return fileNameWithMarker;
    }
}