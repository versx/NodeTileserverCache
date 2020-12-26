'use strict';

import { GenericsExtensions } from '../extensions/generics';
import { Drawable } from '../interfaces/drawable';
import * as utils from '../services/utils';

export class Circle implements Drawable {
    public latitude: number;
    public longitude: number;
    public radius: number;
    public fill_color: string;
    public stroke_color: string;
    public stroke_width: number;

    public hash: string;

    constructor(args: any) {
        this.latitude = args?.latitude;
        this.longitude = args?.longitude;
        this.radius = args?.radius;
        this.fill_color = args?.fill_color;
        this.stroke_color = args?.stroke_color;
        this.stroke_width = args?.stroke_width;
        this.hash = 'C' + utils.getHashCode(this);
    }

    public static parse(query: string): Circle[] {
        return GenericsExtensions.parse<Circle>(query);
    }
}