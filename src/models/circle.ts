'use strict';

import { Drawable } from './drawable';
import * as utils from '../services/utils';

export class Circle implements Drawable {
    public latitude: number;
    public longitude: number;
    public radius: number;
    public fill_color: string;
    public stroke_color: string;
    public stroke_width: number;

    public hashString: string;

    constructor(latitude = 0, longitude = 0, radius = 0, fill_color = '', stroke_color = '', stroke_width = 0) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.radius = radius;
        this.fill_color = fill_color;
        this.stroke_color = stroke_color;
        this.stroke_width = stroke_width;
        this.hashString = 'C' + utils.getHashCode(this);
    }

    public static parse(circlesQuery: string): Circle[] {
        const list: Circle[] = [];
        const circlesJson = (circlesQuery || '')?.replace(/%22/g, '"');
        if (circlesJson) {
            return JSON.parse(circlesJson);
        }
        return list;
    }
}