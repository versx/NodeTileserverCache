'use strict';

import { GenericsExtensions } from '../extensions/generics';
import { Drawable } from '../interfaces/drawable';
import { IPolygon } from '../interfaces/ipolygon';
import * as utils from '../services/utils';

export class Polygon implements Drawable {
    public fill_color: string;
    public stroke_color: string;
    public stroke_width: number;
    public path: string;

    public hash: string;

    constructor(args: IPolygon) {
        this.fill_color = args?.fill_color || '';
        this.stroke_color = args?.stroke_color || '';
        this.stroke_width = args?.stroke_width || 0;
        this.path = args?.path || '';
        this.hash = 'P' + utils.getHashCode(this);
    }

    public static parse(query: string): Polygon[] {
        return GenericsExtensions.parse<Polygon>(query);
    }
}