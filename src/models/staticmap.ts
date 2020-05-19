/*
'use strict';

import { Marker } from './marker';
import { Polygon } from './polygon';

class StaticMap {
    public style: string;
    public latitude: number;
    public longitude: number;
    public zoom: number;
    public width: number;
    public height: number;
    public scale: number;
    public format: string;
    public bearing?: number;
    public pitch?: number;
    public markers?: Marker[];
    public polygons?: Polygon[];

    constructor() {
        this.style = '';
        this.latitude = 0;
        this.longitude = 0;
        this.zoom = 14;
        this.width = 0;
        this.height = 0;
        this.scale = 1;
        this.format = 'png';
        //this.bearing = 0;
        //this.pitch = 0;
        this.markers = [];
        this.polygons = [];
    }
}

export {
    StaticMap
};
*/