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
}