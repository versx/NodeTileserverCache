'use strict';

import { Drawable } from './drawable';
import { Grid } from './grid';
import { StaticMap } from './staticmap';
import { CombineDirection } from '../data/combine-direction';
import * as globals from '../data/globals';
import { ImageMagick } from '../services/image-magick';
import * as utils from '../services/utils';

const imagemagick = new ImageMagick();

export class MultiStaticMap implements Drawable {
    public grid: DirectionedMultiStaticMap[];
    public hashString: string;

    constructor(grid: DirectionedMultiStaticMap[] = []) {
        this.grid = grid;
        this.hashString = 'SM' + utils.getHashCode(this);
    }

    public async generate(): Promise<string> {
        if (this.grid.length <= 0) {
            console.error('At least one grid is required');
            return '';
        }
        if (this.grid[0].direction !== CombineDirection.First) {
            console.error('First grid requires direction: "First"');
            return '';
        }
        for (let i = 1; i < this.grid.length - 1; i++) {
            if (this.grid[i].direction === CombineDirection.First) {
                console.error('Only first grid is allowed to be direction: "First"');
                return '';
            }
        }
        for (let i = 0; i < this.grid.length; i++) {
            const grid = this.grid[i];
            if (grid.maps[0].direction !== CombineDirection.First) {
                console.error('First map in grid requires direction: "First"');
                return '';
            }
            for (let j = 1; j < grid.maps.length - 1; j++) {
                const map = grid.maps[j];
                if (map.direction === CombineDirection.First) {
                    console.error('Only first map in grid is allowed to be direction: "First"');
                    return '';
                }
            }
        }
    
        const grids = Array<Grid>();
        const fileNameWithMarker = `${globals.StaticMultiCacheDir}/${this.hashString}.png`;
        if (await utils.fileExists(fileNameWithMarker)) {
            //console.debug('Serving MutliStatic:', this);
            return fileNameWithMarker;
        }
        
        for (let i = 0; i < this.grid.length; i++) {
            let firstMapUrl = '';
            const grid = this.grid[i];
            const images: Array<{ direction: CombineDirection, path: string }> = [];
            for (let j = 0; j < grid.maps.length; j++) {
                const map = grid.maps[j];
                const staticMap = Object.assign(new StaticMap(), map.map);
                //const staticMap = new StaticMap(map.map.style, map.map.latitude, map.map.longitude, map.map.zoom, map.map.width, map.map.height, map.map.scale, map.map.format, map.map.bearing, map.map.pitch, map.map.markers, map.map.polygons);
                const url = await staticMap.generate();
                if (map.direction === CombineDirection.First) {
                    firstMapUrl = url;
                } else {
                    images.push({ direction: map.direction, path: url });
                }
            }
            grids.push({ firstPath: firstMapUrl, direction: grid.direction, images: images });
        }
        await imagemagick.combineImagesGrid(grids, fileNameWithMarker);
        //console.debug('Serving MutliStatic:', this);
        return fileNameWithMarker;
    }
}

export class DirectionedMultiStaticMap {
    public direction: CombineDirection;
    public maps: Array<DirectionedStaticMap>;

    constructor(direction: CombineDirection, maps: Array<DirectionedStaticMap>) {
        this.direction = direction;
        this.maps = maps;
    }
}

export class DirectionedStaticMap {
    public direction: CombineDirection;
    public map: StaticMap;

    constructor(direction: CombineDirection, map: StaticMap) {
        this.direction = direction;
        this.map = map;
    }
}