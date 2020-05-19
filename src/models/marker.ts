'use strict';

import { Drawable } from './drawable';
import * as utils from '../utils';

export class Marker implements Drawable {
    url: string;
    height: number;
    width: number;
    latitude: number;
    longitude: number;
    x_offset: number = 0;
    y_offset: number = 0;

    hashString: string;

    constructor(url: string = '', height: number = 0, width: number = 0, latitude: number = 0, longitude: number = 0, x_offset: number = 0, y_offset: number = 0) {
        this.url = url;
        this.height = height;
        this.width = width;
        this.latitude = latitude;
        this.longitude = longitude;
        this.x_offset = x_offset;
        this.y_offset = y_offset;
        this.hashString = 'M' + utils.getHashCode(this);//`M${Math.random()}`;
    }
}

/*
Object.defineProperty(String.prototype, 'hashCode', {
    value: function() {
      var hash = 0, i, chr;
      for (i = 0; i < this.length; i++) {
        chr   = this.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
      }
      return hash;
    }
});

function getHashCode(obj) {
    var hash = 0;
    for (var i = 0; i < this.length; i++) {
        var character = this.charCodeAt(i);
        hash = ((hash << 5) - hash) + character;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}
*/