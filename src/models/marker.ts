'use strict';

import { GenericsExtensions } from '../extensions/generics';
import { Drawable } from '../interfaces/drawable';
import { IMarker } from '../interfaces/imarker';
import * as utils from '../services/utils';

export class Marker implements Drawable {
    public url: string;
    public height: number;
    public width: number;
    public latitude: number;
    public longitude: number;
    public x_offset: number;
    public y_offset: number;

    public hash: string;

    constructor(args: IMarker) {
        this.url = args?.url;
        this.height = args?.height;
        this.width = args?.width;
        this.latitude = args?.latitude;
        this.longitude = args?.longitude;
        this.x_offset = args?.x_offset || 0;
        this.y_offset = args?.y_offset || 0;
        this.hash = 'M' + utils.getHashCode(this);
    }

    public static parse(query: string): Marker[] {
        return GenericsExtensions.parse<Marker>(query);
    }
}