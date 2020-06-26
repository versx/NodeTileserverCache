'use strict';

import { Drawable } from './drawable';
import { StaticMap } from './staticmap';
import { CombineDirection } from '../data/combine-direction';
import * as utils from '../services/utils';

export class MultiStaticMap implements Drawable {
    public grid: DirectionedMultiStaticMap[];
    public hashString: string;

    constructor(grid: DirectionedMultiStaticMap[] = []) {
        this.grid = grid;
        this.hashString = 'SM' + utils.getHashCode(this);
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