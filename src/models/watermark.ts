'use strict';

import { GenericsExtensions } from '../extensions/generics';
import * as utils from '../services/utils';

export class Watermark {
    public text: string;
    public fill_color: string;
    public stroke_color: string;
    public stroke_width: number;
    public size: number;
    public location: string;
    public font: string;

    public hash: string;

    constructor(text: string, fillColor: string, strokeColor: string, strokeWidth = 1, size = 14, location = 'southeast', font = 'Arial') {
        this.text = text;
        this.fill_color = fillColor;
        this.stroke_color = strokeColor;
        this.stroke_width = strokeWidth;
        this.size = size;
        this.location = location;
        this.font = font;
        this.hash = 'W' + utils.getHashCode(this);
    }

    public static parse(query: string): Watermark[] {
        return GenericsExtensions.parse<Watermark>(query);
    }
}