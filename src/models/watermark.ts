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

    constructor(text: string, fillColor: string, strokeColor: string, strokeWidth: number = 1, size: number = 14, location: string = 'southeast', font: string = 'Arial') {
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