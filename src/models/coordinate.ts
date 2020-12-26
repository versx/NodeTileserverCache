'use strict';

export class Coordinate {
    public latitude: number;
    public longitude: number;

    constructor(latitude: number, longitude: number) {
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public coordinate(radiusDistance: number, facingDirection: number) {
        const distance = radiusDistance / 6_373_000.0;
        const direction = facingDirection;
        const latitude = this.latitude * Math.PI / 180.0;
        const longitude = this.longitude * Math.PI / 180.0;
        const otherLatitude = Math.asin(
            Math.sin(latitude) * Math.cos(distance)
                + Math.cos(latitude)
                * Math.sin(distance) * Math.cos(direction)
        );
        const otherLongitude = longitude + Math.atan2(
            Math.sin(direction) * Math.sin(distance) * Math.cos(latitude),
            Math.cos(distance) - Math.sin(latitude) * Math.sin(otherLatitude)
        );
        return  new Coordinate(
            otherLatitude * 180.0 / Math.PI,
            otherLongitude * 180.0 / Math.PI,
        );
    }
};