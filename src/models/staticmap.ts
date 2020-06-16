'use strict';

import { Marker } from './marker';
import { Polygon } from './polygon';

export class StaticMap {
    public style: string;
    public latitude: number;
    public longitude: number;
    public zoom: number;
    public width: number;
    public height: number;
    public scale: number;
    public format?: string;
    public bearing?: number;
    public pitch?: number;
    public markers?: Marker[];
    public polygons?: Polygon[];

    constructor(style = '', latitude = 0, longitude = 0, zoom = 14, width = 0, height = 0,
        scale = 1, format = 'png', bearing = 0, pitch = 0, markers: Marker[] = [], polygons: Polygon[] = []) {
        this.style = style;
        this.latitude = latitude;
        this.longitude = longitude;
        this.zoom = zoom;
        this.width = width;
        this.height = height;
        this.scale = scale;
        this.format = format;
        this.bearing = bearing;
        this.pitch = pitch;
        this.markers = markers;
        this.polygons = polygons;
    }
}