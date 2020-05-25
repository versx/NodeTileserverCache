'use strict';

import { Drawable } from './drawable';
import * as utils from '../services/utils';

export class Marker implements Drawable {
    public url: string;
    public height: number;
    public width: number;
    public latitude: number;
    public longitude: number;
    public x_offset: number;
    public y_offset: number;

    public hashString: string;

    constructor(url = '', height = 0, width = 0, latitude = 0, longitude = 0, x_offset = 0, y_offset = 0) {
        this.url = url;
        this.height = height;
        this.width = width;
        this.latitude = latitude;
        this.longitude = longitude;
        this.x_offset = x_offset || 0;
        this.y_offset = y_offset || 0;
        this.hashString = 'M' + utils.getHashCode(this);
    }
}