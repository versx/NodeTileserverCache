'use strict';

import { Drawable } from './drawable';
import * as utils from '../utils';

export class Polygon implements Drawable {
    fill_color: string;
    stroke_color: string;
    stroke_width: number;
    path: string;
    
    hashString: string;

    constructor(fillColor: string = '', strokeColor: string = '', strokeWidth: number = 0, path: string = '') {
        this.fill_color = fillColor;
        this.stroke_color = strokeColor;
        this.stroke_width = strokeWidth;
        this.path = path;
        this.hashString = 'P' + utils.getHashCode(this);//`P${Math.random()}`;
    }
}