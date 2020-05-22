'use strict';

export class HitStats {
    static tileHitRatio: Dictionary = {};
    static staticHitRatio: Dictionary = {};
    static staticMarkerHitRatio: Dictionary = {};
    static markerHitRatio: Dictionary = {};
}

interface Dictionary {
    [key: string]: { hit: number, miss: number };
}