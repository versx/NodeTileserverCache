'use strict';

export class HitStats {
    public static tileHitRatio: Dictionary = {};
    public static staticHitRatio: Dictionary = {};
    public static staticMarkerHitRatio: Dictionary = {};
    public static markerHitRatio: Dictionary = {};

    public static tileHit(style: string, isNew: boolean): void {
        if (!this.tileHitRatio[style]) {
            this.tileHitRatio[style] = {
                hit: isNew ? 0 : 1,
                miss: isNew ? 1 : 0
            };
            return;
        }
        if (isNew) {
            this.tileHitRatio[style].miss++;
        } else {
            this.tileHitRatio[style].hit++;
        }
    }

    public static staticHit(style: string, isNew: boolean): void {
        if (!this.staticHitRatio[style]) {
            this.staticHitRatio[style] = {
                hit: isNew ? 0 : 1,
                miss: isNew ? 1 : 0
            };
            return;
        }
        if (isNew) {
            this.staticHitRatio[style].miss++;
        } else {
            this.staticHitRatio[style].hit++;
        }
    }

    public static staticMarkerHit(style: string, isNew: boolean): void {
        if (!this.staticMarkerHitRatio[style]) {
            this.staticMarkerHitRatio[style] = {
                hit: isNew ? 0 : 1,
                miss: isNew ? 1 : 0
            };
            return;
        }
        if (isNew) {
            this.staticMarkerHitRatio[style].miss++;
        } else {
            this.staticMarkerHitRatio[style].hit++;
        }
    }

    public static markerHit(style: string, isNew: boolean): void {
        if (!this.markerHitRatio[style]) {
            this.markerHitRatio[style] = {
                hit: isNew ? 0 : 1,
                miss: isNew ? 1 : 0
            };
            return;
        }
        if (isNew) {
            this.markerHitRatio[style].miss++;
        } else {
            this.markerHitRatio[style].hit++;
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