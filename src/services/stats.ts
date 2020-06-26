'use strict';

export class HitStats {
    public static tileHitRatio: Dictionary = {};
    public static staticHitRatio: Dictionary = {};
    public static staticMarkerHitRatio: Dictionary = {};
    public static markerHitRatio: Dictionary = {};

    public static tileHit(style: string, isNew: boolean) {
        if (this.tileHitRatio[style]) {
            if (isNew) {
                this.tileHitRatio[style].miss++;
            } else {
                this.tileHitRatio[style].hit++;
            }
        } else {
            this.tileHitRatio[style] = {
                hit: isNew ? 0 : 1,
                miss: isNew ? 1 : 0
            };
        }
    }

    public static staticHit(style: string, isNew: boolean) {
        if (this.staticHitRatio[style]) {
            if (isNew) {
                this.staticHitRatio[style].miss++;
            } else {
                this.staticHitRatio[style].hit++;
            }
        } else {
            this.staticHitRatio[style] = {
                hit: isNew ? 0 : 1,
                miss: isNew ? 1 : 0
            };
        }
    }

    public static staticMarkerHit(style: string, isNew: boolean) {
        if (this.staticMarkerHitRatio[style]) {
            if (isNew) {
                this.staticMarkerHitRatio[style].miss++;
            } else {
                this.staticMarkerHitRatio[style].hit++;
            }
        } else {
            this.staticMarkerHitRatio[style] = {
                hit: isNew ? 0 : 1,
                miss: isNew ? 1 : 0
            };
        }
    }

    public static markerHit(style: string, isNew: boolean) {
        if (this.markerHitRatio[style]) {
            if (isNew) {
                this.markerHitRatio[style].miss++;
            } else {
                this.markerHitRatio[style].hit++;
            }
        } else {
            this.markerHitRatio[style] = {
                hit: isNew ? 0 : 1,
                miss: isNew ? 1 : 0
            };
        }
    }
}

interface Dictionary {
    [key: string]: HitRatio;
}

interface HitRatio {
    hit: number;
    miss: number;
}