'use strict';

export class GenericsExtensions {
    public static parse<T>(json: string): T[] {
        if (!json) return [];
        const list: T[] = [];
        json = (json || '')?.toString()?.replace(/%22/g, '"');
        if (json) {
            return JSON.parse(json);
        }
        return list || [];
    }
}