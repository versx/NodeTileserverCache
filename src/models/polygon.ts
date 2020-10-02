'use strict';

import { Drawable } from './drawable';
import * as utils from '../services/utils';

export class Polygon implements Drawable {
    public fill_color: string;
    public stroke_color: string;
    public stroke_width: number;
    public path: string;
    public hashString: string;

    constructor(fillColor = '', strokeColor = '', strokeWidth = 0, path = '') {
        this.fill_color = fillColor;
        this.stroke_color = strokeColor;
        this.stroke_width = strokeWidth;
        this.path = path;
        this.hashString = 'P' + utils.getHashCode(this);
    }

    public static parse(polygonsQuery: string): Polygon[] {
        const list: Polygon[] = [];
        const polygonsJson = (polygonsQuery || '')?.replace(/%22/g, '"');
        if (polygonsJson) {
            const polygons = JSON.parse(polygonsJson);
            if (polygons.length > 0) {
                polygons.forEach((polygon: Polygon) => {
                    //console.log('Polygon:', polygon);
                    list.push(Object.assign(new Polygon(), polygon));
                });
            }
        }
        return list;
    }
}