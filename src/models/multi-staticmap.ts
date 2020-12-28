'use strict';

import { Drawable } from '../interfaces/drawable';
import { Grid } from '../interfaces/grid';
import { StaticMap } from './staticmap';
import { CombineDirection } from '../data/combine-direction';
import * as globals from '../data/globals';
import { ImageMagick } from '../services/image-magick';
import * as utils from '../services/utils';

const imagemagick = new ImageMagick();

export class MultiStaticMap implements Drawable {
    public grid: DirectionedMultiStaticMap[];
    public hash: string;
    public regeneratable = false;

    constructor(grid: DirectionedMultiStaticMap[] = [], regeneratable = false) {
        this.grid = grid;
        this.hash = 'MS' + utils.getHashCode(this);
        this.regeneratable = regeneratable !== undefined && regeneratable !== false;
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
        for (const grid of this.grid) {
            if (grid.maps[0].direction !== CombineDirection.First) {
                console.error('First map in grid requires direction: "First"');
                return '';
            }
            // TODO: Use .shift()
            for (let i = 1; i < grid.maps.length - 1; i++) {
                const map = grid.maps[i];
                if (map.direction === CombineDirection.First) {
                    console.error('Only first map in grid is allowed to be direction: "First"');
                    return '';
                }
            }
        }

        if (this.regeneratable) {
            const id = await utils.storeRegenerable<MultiStaticMap>(this);
            return id;
        }
    
        const grids = Array<Grid>();
        const newHash = 'MS' + utils.getHashCode(this);
        const fileNameWithMarker = `${globals.StaticMultiCacheDir}/${newHash}.png`;
        if (this.hash === newHash && await utils.fileExists(fileNameWithMarker)) {
            //console.debug('Serving MultiStatic:', this);
            return fileNameWithMarker;
        }
        
        for (const grid of this.grid) {
            let firstMapUrl = '';
            const images: Array<{ direction: CombineDirection, path: string }> = [];
            for (const map of grid.maps) {
                const staticMap = Object.assign(new StaticMap({}), map.map);
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